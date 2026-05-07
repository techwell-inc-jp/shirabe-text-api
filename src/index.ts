/**
 * Shirabe Text API — Japanese morphological analysis on Cloudflare Workers.
 *
 * Phase 2 scaffold:
 *   - Hono router with auth + rate-limit + usage-check middleware chain
 *   - GET /health(認証なし、ヘルスチェック)
 *   - POST /api/v1/text/tokenize(認証 + rate-limit + usage-check)
 *   - 5/31 リリース: + /normalize, /furigana, /name-split, /name-reading
 *
 * Tokenizer は R2 上の IPAdic 辞書(8 ファイル / 55 MB)を Worker cold start で
 * 並列 fetch し、モジュールスコープの Promise でグローバルキャッシュする。
 * 同 isolate 内の以降のリクエストは warm <1ms。
 */
import { Hono } from "hono";
import {
  Tokenizer,
  loadDictionaryFromBytes,
  type DictionaryType as Dictionary,
} from "./lindera-glue.js";
import type { AppEnv, Env } from "./types/env.js";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { usageCheckMiddleware } from "./middleware/usage-check.js";
import {
  normalizeText,
  type NormalizeOptions,
  type WidthMode,
  type KanaMode,
  type SpacesMode,
} from "./normalize.js";
import {
  tokensToFurigana,
  type FuriganaKana,
  type TokenLike as FuriganaTokenLike,
} from "./furigana.js";
import openapiYaml from "../docs/openapi.yaml";
import openapiGptsYaml from "../docs/openapi-gpts.yaml";

/** R2 上の IPAdic 辞書ファイル名(順序は loadDictionaryFromBytes の引数順)。 */
const DICT_KEYS = [
  "metadata.json",
  "dict.da",
  "dict.vals",
  "dict.wordsidx",
  "dict.words",
  "matrix.mtx",
  "char_def.bin",
  "unk.bin",
] as const;

type TokenizerInstance = InstanceType<typeof Tokenizer>;

let tokenizerPromise: Promise<{
  tokenizer: TokenizerInstance;
  initMs: number;
  fetchMs: number;
  totalBytes: number;
}> | null = null;

async function getTokenizer(env: Env) {
  if (tokenizerPromise) return tokenizerPromise;

  tokenizerPromise = (async () => {
    const t0 = Date.now();

    const objects = await Promise.all(
      DICT_KEYS.map(async (key) => {
        const obj = await env.DICT.get(key);
        if (!obj) {
          throw new Error(`R2 object not found: ${key}`);
        }
        return new Uint8Array(await obj.arrayBuffer());
      })
    );
    const fetchMs = Date.now() - t0;
    const totalBytes = objects.reduce((s, b) => s + b.byteLength, 0);

    const t1 = Date.now();
    const dict: Dictionary = loadDictionaryFromBytes(
      objects[0],
      objects[1],
      objects[2],
      objects[3],
      objects[4],
      objects[5],
      objects[6],
      objects[7]
    );

    const tokenizer = new Tokenizer(dict);
    const initMs = Date.now() - t1;

    return { tokenizer, initMs, fetchMs, totalBytes };
  })();

  return tokenizerPromise;
}

const app = new Hono<AppEnv>();

/** ヘルスチェック(認証なし)。 */
app.get("/health", (c) =>
  c.json({ status: "ok", api: "shirabe-text-api", version: c.env.API_VERSION })
);

/** ルート(API 概要、認証なし)。 */
app.get("/", (c) =>
  c.json({
    api: "shirabe-text-api",
    version: c.env.API_VERSION,
    docs: "https://shirabe.dev/docs/text-normalize",
    openapi: "https://shirabe.dev/api/v1/text/openapi.yaml",
    openapi_gpts: "https://shirabe.dev/api/v1/text/openapi-gpts.yaml",
    endpoints: {
      health: "GET /health",
      tokenize: "POST /api/v1/text/tokenize",
      normalize: "POST /api/v1/text/normalize",
      furigana: "POST /api/v1/text/furigana",
    },
  })
);

/** OpenAPI 3.1 仕様(認証なし、AI agent / GPT Builder 取込用)。 */
app.get("/api/v1/text/openapi.yaml", (c) => {
  return c.body(openapiYaml, 200, {
    "Content-Type": "application/yaml; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
});

app.get("/api/v1/text/openapi-gpts.yaml", (c) => {
  return c.body(openapiGptsYaml, 200, {
    "Content-Type": "application/yaml; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
});

/** /api/v1/text/* は auth → rate-limit → usage-check の順で適用。 */
app.use("/api/v1/text/*", authMiddleware);
app.use("/api/v1/text/*", rateLimitMiddleware);
app.use("/api/v1/text/*", usageCheckMiddleware);

/**
 * POST /api/v1/text/tokenize
 *
 * Request body: { text: string }
 * Response: { text, tokens[], token_count, timing }
 */
app.post("/api/v1/text/tokenize", async (c) => {
  let body: { text?: string };
  try {
    body = await c.req.json<{ text?: string }>();
  } catch {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON.",
        },
      },
      400
    );
  }

  const text = body.text;
  if (!text || typeof text !== "string") {
    return c.json(
      {
        error: {
          code: "MISSING_TEXT",
          message: 'Request body must include "text": string.',
        },
      },
      400
    );
  }

  try {
    const t0 = Date.now();
    const { tokenizer, initMs, fetchMs, totalBytes } = await getTokenizer(c.env);
    const setupMs = Date.now() - t0;

    const tokenizeStart = Date.now();
    const tokens = tokenizer.tokenize(text);
    const tokenizeMs = Date.now() - tokenizeStart;

    type TokenLike = {
      surface: string;
      byte_start: number;
      byte_end: number;
      position: number;
      word_id: number;
      is_unknown: boolean;
      details: string[];
    };
    const tokensJson = (tokens as TokenLike[]).map((t) => ({
      surface: t.surface,
      byte_start: t.byte_start,
      byte_end: t.byte_end,
      position: t.position,
      word_id: t.word_id,
      is_unknown: t.is_unknown,
      details: t.details,
    }));

    return c.json({
      text,
      tokens: tokensJson,
      token_count: tokensJson.length,
      timing: {
        tokenize_ms: tokenizeMs,
        setup_ms: setupMs,
        cold_start: setupMs > 100,
        r2_fetch_ms: fetchMs,
        tokenizer_init_ms: initMs,
        dict_total_bytes: totalBytes,
      },
      attribution: {
        dictionary: "IPAdic v3.0.7",
        license: "BSD 3-Clause",
        source: "https://github.com/lindera/lindera",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[shirabe-text-api] tokenize error:`, msg);
    return c.json(
      { error: { code: "TOKENIZE_ERROR", message: msg } },
      500
    );
  }
});

/**
 * POST /api/v1/text/normalize
 *
 * Request body: { text: string, options?: { width?, kana?, spaces? } }
 * Response: { text, normalized, changes[], attribution }
 *
 * Pure 文字列変換のみ(Lindera 不要)。Sudachi 表記正規化は Phase 2(別 endpoint or option 追加)。
 */
const VALID_WIDTH: readonly WidthMode[] = ["half", "full", "preserve"];
const VALID_KANA: readonly KanaMode[] = ["hiragana", "katakana", "preserve"];
const VALID_SPACES: readonly SpacesMode[] = ["single", "trim", "preserve"];

app.post("/api/v1/text/normalize", async (c) => {
  let body: { text?: unknown; options?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON.",
        },
      },
      400
    );
  }

  const text = body.text;
  if (typeof text !== "string") {
    return c.json(
      {
        error: {
          code: "MISSING_TEXT",
          message: 'Request body must include "text": string.',
        },
      },
      400
    );
  }

  const rawOptions = (body.options ?? {}) as Record<string, unknown>;
  if (typeof rawOptions !== "object" || rawOptions === null || Array.isArray(rawOptions)) {
    return c.json(
      {
        error: {
          code: "INVALID_OPTIONS",
          message: '"options" must be an object.',
        },
      },
      400
    );
  }

  const options: NormalizeOptions = {};
  if (rawOptions.width !== undefined) {
    if (!VALID_WIDTH.includes(rawOptions.width as WidthMode)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.width" must be one of: ${VALID_WIDTH.join(", ")}.`,
          },
        },
        400
      );
    }
    options.width = rawOptions.width as WidthMode;
  }
  if (rawOptions.kana !== undefined) {
    if (!VALID_KANA.includes(rawOptions.kana as KanaMode)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.kana" must be one of: ${VALID_KANA.join(", ")}.`,
          },
        },
        400
      );
    }
    options.kana = rawOptions.kana as KanaMode;
  }
  if (rawOptions.spaces !== undefined) {
    if (!VALID_SPACES.includes(rawOptions.spaces as SpacesMode)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.spaces" must be one of: ${VALID_SPACES.join(", ")}.`,
          },
        },
        400
      );
    }
    options.spaces = rawOptions.spaces as SpacesMode;
  }

  const { normalized, changes } = normalizeText(text, options);

  return c.json({
    text,
    normalized,
    changes,
    attribution: {
      service: "shirabe-text-api",
      url: "https://shirabe.dev",
    },
  });
});

/**
 * POST /api/v1/text/furigana
 *
 * Request body: { text: string, options?: { kana?: "hiragana" | "katakana" } }
 * Response: { text, tokens: [{surface, reading}], attribution }
 *
 * Lindera で形態素解析 → 各トークンの IPAdic details[7](読み)を抽出。
 * default kana = "hiragana"。漢字を含まないトークンや未知語は surface fallback。
 */
const VALID_FURIGANA_KANA: readonly FuriganaKana[] = ["hiragana", "katakana"];

app.post("/api/v1/text/furigana", async (c) => {
  let body: { text?: unknown; options?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON.",
        },
      },
      400
    );
  }

  const text = body.text;
  if (typeof text !== "string") {
    return c.json(
      {
        error: {
          code: "MISSING_TEXT",
          message: 'Request body must include "text": string.',
        },
      },
      400
    );
  }

  const rawOptions = (body.options ?? {}) as Record<string, unknown>;
  if (typeof rawOptions !== "object" || rawOptions === null || Array.isArray(rawOptions)) {
    return c.json(
      {
        error: {
          code: "INVALID_OPTIONS",
          message: '"options" must be an object.',
        },
      },
      400
    );
  }

  let kanaMode: FuriganaKana = "hiragana";
  if (rawOptions.kana !== undefined) {
    if (!VALID_FURIGANA_KANA.includes(rawOptions.kana as FuriganaKana)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.kana" must be one of: ${VALID_FURIGANA_KANA.join(", ")}.`,
          },
        },
        400
      );
    }
    kanaMode = rawOptions.kana as FuriganaKana;
  }

  try {
    const t0 = Date.now();
    const { tokenizer, initMs, fetchMs, totalBytes } = await getTokenizer(c.env);
    const setupMs = Date.now() - t0;

    const tokenizeStart = Date.now();
    const tokens = tokenizer.tokenize(text) as FuriganaTokenLike[];
    const tokenizeMs = Date.now() - tokenizeStart;

    const furigana = tokensToFurigana(tokens, kanaMode);

    return c.json({
      text,
      tokens: furigana,
      timing: {
        tokenize_ms: tokenizeMs,
        setup_ms: setupMs,
        cold_start: setupMs > 100,
        r2_fetch_ms: fetchMs,
        tokenizer_init_ms: initMs,
        dict_total_bytes: totalBytes,
      },
      attribution: {
        dictionary: "IPAdic v3.0.7",
        license: "BSD 3-Clause",
        source: "https://github.com/lindera/lindera",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[shirabe-text-api] furigana error:`, msg);
    return c.json(
      { error: { code: "FURIGANA_ERROR", message: msg } },
      500
    );
  }
});

export default app;
