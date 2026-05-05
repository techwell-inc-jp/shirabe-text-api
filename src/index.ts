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
    endpoints: {
      health: "GET /health",
      tokenize: "POST /api/v1/text/tokenize",
    },
  })
);

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

export default app;
