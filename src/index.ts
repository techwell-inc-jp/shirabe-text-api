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
  type HalfwidthKanaMode,
  type NormalizeOptions,
  type WidthMode,
  type KanaMode,
  type SpacesMode,
  type SudachiMode,
} from "./normalize.js";
import {
  tokensToFurigana,
  type FuriganaKana,
  type TokenLike as FuriganaTokenLike,
} from "./furigana.js";
import {
  splitName,
  type TokenLike as NameSplitTokenLike,
} from "./name-split.js";
import {
  readName,
  type TokenLike as NameReadingTokenLike,
} from "./name-reading.js";
import {
  sudachiNormalize,
  type SudachiTokenLike,
} from "./sudachi-normalize.js";
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

/**
 * SudachiDict normalized_form lookup map(Phase 3 Sudachi 正規化)。
 * R2 上 `normalize-map.json` を cold start に 1 回 fetch + parse、以降同 isolate で再利用。
 *
 * map size: ~1.2 MB(small_lex source、93,700 entries)。R2 fetch ~50-100ms + parse ~10-30ms。
 */
const NORMALIZE_MAP_KEY = "normalize-map.json";

let normalizeMapPromise: Promise<{
  map: Readonly<Record<string, string>>;
  fetchMs: number;
  parseMs: number;
  entryCount: number;
}> | null = null;

async function getNormalizeMap(env: Env) {
  if (normalizeMapPromise) return normalizeMapPromise;

  normalizeMapPromise = (async () => {
    const t0 = Date.now();
    const obj = await env.DICT.get(NORMALIZE_MAP_KEY);
    if (!obj) {
      throw new Error(`R2 object not found: ${NORMALIZE_MAP_KEY}`);
    }
    const text = await obj.text();
    const fetchMs = Date.now() - t0;

    const t1 = Date.now();
    const map = JSON.parse(text) as Record<string, string>;
    const parseMs = Date.now() - t1;

    return { map, fetchMs, parseMs, entryCount: Object.keys(map).length };
  })();

  return normalizeMapPromise;
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
      name_split: "POST /api/v1/text/name-split",
      name_reading: "POST /api/v1/text/name-reading",
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
 * Request body: { text: string, options?: { width?, kana?, spaces?, halfwidth_kana?, sudachi? } }
 * Response: { text, normalized, changes[], attribution, timing? }
 *
 * Phase 1+2 (width / kana / spaces / halfwidth_kana) は pure 文字列変換、Lindera 不要。
 * Phase 3 (sudachi="apply") は Lindera tokenize + SudachiDict normalized_form lookup を適用、
 * cold start で R2 から normalize map を取得(~1.2 MB JSON)。
 * 適用順は Phase 1+2 → Phase 3(tokenizer は Phase 1+2 後の文字列に対して実行、精度向上)。
 */
const VALID_WIDTH: readonly WidthMode[] = ["half", "full", "preserve"];
const VALID_KANA: readonly KanaMode[] = ["hiragana", "katakana", "preserve"];
const VALID_SPACES: readonly SpacesMode[] = ["single", "trim", "preserve"];
const VALID_HALFWIDTH_KANA: readonly HalfwidthKanaMode[] = ["expand", "preserve"];
const VALID_SUDACHI: readonly SudachiMode[] = ["apply", "preserve"];

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
  if (rawOptions.halfwidth_kana !== undefined) {
    if (!VALID_HALFWIDTH_KANA.includes(rawOptions.halfwidth_kana as HalfwidthKanaMode)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.halfwidth_kana" must be one of: ${VALID_HALFWIDTH_KANA.join(", ")}.`,
          },
        },
        400
      );
    }
    options.halfwidth_kana = rawOptions.halfwidth_kana as HalfwidthKanaMode;
  }
  if (rawOptions.sudachi !== undefined) {
    if (!VALID_SUDACHI.includes(rawOptions.sudachi as SudachiMode)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.sudachi" must be one of: ${VALID_SUDACHI.join(", ")}.`,
          },
        },
        400
      );
    }
    options.sudachi = rawOptions.sudachi as SudachiMode;
  }

  const phase12 = normalizeText(text, options);
  let normalized = phase12.normalized;
  const changes = [...phase12.changes];

  // Phase 3: Sudachi 正規化(option 指定時のみ Lindera + map を起動)
  let phase3Timing: {
    setup_ms: number;
    cold_start: boolean;
    tokenize_ms: number;
    sudachi_lookup_ms: number;
    map_fetch_ms: number;
    map_parse_ms: number;
    map_entries: number;
  } | undefined;
  if (options.sudachi === "apply") {
    try {
      const t0 = Date.now();
      const [tokenizerCtx, mapCtx] = await Promise.all([
        getTokenizer(c.env),
        getNormalizeMap(c.env),
      ]);
      const setupMs = Date.now() - t0;

      const tokenizeStart = Date.now();
      const tokens = tokenizerCtx.tokenizer.tokenize(normalized) as SudachiTokenLike[];
      const tokenizeMs = Date.now() - tokenizeStart;

      const lookupStart = Date.now();
      const phase3 = sudachiNormalize(tokens, mapCtx.map);
      const lookupMs = Date.now() - lookupStart;

      normalized = phase3.normalized;
      changes.push(...phase3.changes);

      phase3Timing = {
        setup_ms: setupMs,
        cold_start: setupMs > 100,
        tokenize_ms: tokenizeMs,
        sudachi_lookup_ms: lookupMs,
        map_fetch_ms: mapCtx.fetchMs,
        map_parse_ms: mapCtx.parseMs,
        map_entries: mapCtx.entryCount,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[shirabe-text-api] sudachi normalize error:`, msg);
      return c.json(
        { error: { code: "SUDACHI_NORMALIZE_ERROR", message: msg } },
        500
      );
    }
  }

  const includeSudachiAttribution = options.sudachi === "apply";

  return c.json({
    text,
    normalized,
    changes,
    ...(phase3Timing !== undefined && { timing: phase3Timing }),
    attribution: includeSudachiAttribution
      ? {
          service: "shirabe-text-api",
          url: "https://shirabe.dev",
          dictionary: "SudachiDict-small",
          dictionary_license: "Apache-2.0",
          dictionary_source: "https://github.com/WorksApplications/SudachiDict",
          tokenizer: "Lindera + IPAdic v3.0.7",
          tokenizer_license: "MIT (Lindera) / BSD 3-Clause (IPAdic)",
        }
      : { service: "shirabe-text-api", url: "https://shirabe.dev" },
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

/**
 * POST /api/v1/text/name-split
 *
 * Request body: { name: string }
 * Response: { name, family, given, confidence, warning?, matched_by, attribution }
 *
 * Lindera で形態素解析 → IPAdic 人名-姓 / 人名-名 タグを抽出 → fallback heuristic。
 * IPAdic only MVP のため精度は著名人 80-90% / 一般 50-70% / 稀有 10-30%。
 * 6 月モノレポ化時に JMnedict user dictionary 統合で底上げ予定(unilateral good news)。
 *
 * confidence < 0.5 で warning="low_confidence" を同梱(AI agent ergonomics)。
 */
app.post("/api/v1/text/name-split", async (c) => {
  let body: { name?: unknown };
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

  const name = body.name;
  if (typeof name !== "string") {
    return c.json(
      {
        error: {
          code: "MISSING_NAME",
          message: 'Request body must include "name": string.',
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
    const tokens = tokenizer.tokenize(name) as NameSplitTokenLike[];
    const tokenizeMs = Date.now() - tokenizeStart;

    const result = splitName(tokens);

    return c.json({
      name,
      family: result.family,
      given: result.given,
      confidence: result.confidence,
      ...(result.warning !== undefined && { warning: result.warning }),
      matched_by: result.matched_by,
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
        notes:
          "IPAdic only MVP. Accuracy: well-known names 80-90%, ordinary 50-70%, rare 10-30%. JMnedict integration planned for monorepo phase (June 2026) to improve coverage.",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[shirabe-text-api] name-split error:`, msg);
    return c.json(
      { error: { code: "NAME_SPLIT_ERROR", message: msg } },
      500
    );
  }
});

/**
 * POST /api/v1/text/name-reading
 *
 * Request body: { name: string, options?: { kana?: "hiragana" | "katakana" } }
 * Response: { name, family, given, family_reading, given_reading, reading,
 *             candidates, confidence, warning?, matched_by, attribution }
 *
 * Lindera で形態素解析 → IPAdic 人名タグ token の details[7] を抽出 →
 * family / given の読みに合成。candidates は IPAdic only では常に空 array。
 */
const VALID_NAME_READING_KANA: readonly FuriganaKana[] = ["hiragana", "katakana"];

app.post("/api/v1/text/name-reading", async (c) => {
  let body: { name?: unknown; options?: unknown };
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

  const name = body.name;
  if (typeof name !== "string") {
    return c.json(
      {
        error: {
          code: "MISSING_NAME",
          message: 'Request body must include "name": string.',
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
    if (!VALID_NAME_READING_KANA.includes(rawOptions.kana as FuriganaKana)) {
      return c.json(
        {
          error: {
            code: "INVALID_OPTIONS",
            message: `"options.kana" must be one of: ${VALID_NAME_READING_KANA.join(", ")}.`,
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
    const tokens = tokenizer.tokenize(name) as NameReadingTokenLike[];
    const tokenizeMs = Date.now() - tokenizeStart;

    const result = readName(tokens, kanaMode);

    return c.json({
      name,
      family: result.family,
      given: result.given,
      family_reading: result.family_reading,
      given_reading: result.given_reading,
      reading: result.reading,
      candidates: result.candidates,
      confidence: result.confidence,
      ...(result.warning !== undefined && { warning: result.warning }),
      matched_by: result.matched_by,
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
        notes:
          "IPAdic only MVP. candidates is always an empty array; alternative readings will be populated after JMnedict integration in monorepo phase (June 2026). Accuracy: well-known names 80-90%, ordinary 50-70%, rare 10-30%.",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[shirabe-text-api] name-reading error:`, msg);
    return c.json(
      { error: { code: "NAME_READING_ERROR", message: msg } },
      500
    );
  }
});

export default app;
