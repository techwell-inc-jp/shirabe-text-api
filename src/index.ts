/**
 * shirabe-text-poc Day 3 — Lindera-wasm + R2 IPAdic on Cloudflare Workers.
 *
 * 目的: text API Option A(Workers 単層、Fly.io 不要)成立 verify。
 *
 * Flow:
 *   1. Worker cold start でグローバルな Tokenizer を遅延初期化(モジュールスコープ Promise)
 *   2. R2 binding `DICT` から 8 ファイル並列 fetch → Uint8Array × 8
 *   3. lindera-wasm-bundler の `loadDictionaryFromBytes(8 args)` で Dictionary 構築
 *      → `new Tokenizer(dictionary)` で Tokenizer 構築
 *   4. GET /tokenize?text=xxx で 1 文 tokenize、トークン配列を JSON で返す
 *
 * 検証ポイント:
 *   - lindera-wasm-bundler npm package(wasm 1.88 MB)が Workers 環境で import 可能か
 *   - R2 binding fetch path の動作(OPFS bypass)
 *   - `loadDictionaryFromBytes` 経路が browser-only API を踏まないか
 *   - 全体 script size が 10 MB gzip / 64 MB uncompressed 制約内に収まるか
 */

import {
  Tokenizer,
  loadDictionaryFromBytes,
  type DictionaryType as Dictionary,
} from "./lindera-glue.js";

interface Env {
  DICT: R2Bucket;
}

/** R2 上の IPAdic 辞書ファイル名(順序は loadDictionaryFromBytes の引数順)。 */
const DICT_KEYS = [
  "metadata.json",   // 1. metadata
  "dict.da",         // 2. dict_da (Double-Array Trie)
  "dict.vals",       // 3. dict_vals (word value data)
  "dict.wordsidx",   // 4. dict_words_idx (word details index、ファイル名は wordsidx ノードット)
  "dict.words",      // 5. dict_words (word details、~31 MB 最大)
  "matrix.mtx",      // 6. matrix_mtx (connection cost matrix)
  "char_def.bin",    // 7. char_def (character definitions)
  "unk.bin",         // 8. unk (unknown word dictionary)
] as const;

/**
 * R2 から 8 辞書ファイルを並列 fetch して Tokenizer を 1 度だけ構築する。
 * モジュールスコープの Promise でグローバルキャッシュ(同 isolate 内の以降のリクエストは即時利用)。
 */
let tokenizerPromise: Promise<{
  tokenizer: Tokenizer;
  initMs: number;
  fetchMs: number;
  totalBytes: number;
}> | null = null;

async function getTokenizer(env: Env) {
  if (tokenizerPromise) return tokenizerPromise;

  tokenizerPromise = (async () => {
    const t0 = Date.now();

    // R2 から 8 ファイルを並列 fetch
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
    console.log(
      `[shirabe-text-poc] R2 fetched ${DICT_KEYS.length} files in ${fetchMs}ms, total ${totalBytes} bytes`
    );

    // Dictionary 構築(8 引数を順に展開)
    const t1 = Date.now();
    const dict: Dictionary = loadDictionaryFromBytes(
      objects[0], // metadata
      objects[1], // dict_da
      objects[2], // dict_vals
      objects[3], // dict_words_idx
      objects[4], // dict_words
      objects[5], // matrix_mtx
      objects[6], // char_def
      objects[7]  // unk
    );

    // Tokenizer 構築(mode = "normal" デフォルト)
    const tokenizer = new Tokenizer(dict);
    const initMs = Date.now() - t1;
    console.log(`[shirabe-text-poc] Tokenizer built in ${initMs}ms`);

    return { tokenizer, initMs, fetchMs, totalBytes };
  })();

  return tokenizerPromise;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", phase: "PoC Day 3" });
    }

    if (url.pathname === "/tokenize") {
      const text = url.searchParams.get("text");
      if (!text) {
        return Response.json(
          { error: "Missing ?text=... query parameter" },
          { status: 400 }
        );
      }

      try {
        const t0 = Date.now();
        const { tokenizer, initMs, fetchMs, totalBytes } = await getTokenizer(env);
        const setupMs = Date.now() - t0;

        const tokenizeStart = Date.now();
        const tokens = tokenizer.tokenize(text);
        const tokenizeMs = Date.now() - tokenizeStart;

        // Token は wasm class なので JSON serialize 可能な形に変換
        const tokensJson = tokens.map((t) => ({
          surface: t.surface,
          byte_start: t.byte_start,
          byte_end: t.byte_end,
          position: t.position,
          word_id: t.word_id,
          is_unknown: t.is_unknown,
          details: t.details,
        }));

        return Response.json({
          text,
          tokens: tokensJson,
          token_count: tokensJson.length,
          timing: {
            tokenize_ms: tokenizeMs,
            setup_ms: setupMs, // cold start: r2 fetch + tokenizer build / warm: ~0
            cold_start: setupMs > 100,
            r2_fetch_ms: fetchMs,
            tokenizer_init_ms: initMs,
            dict_total_bytes: totalBytes,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : undefined;
        console.error(`[shirabe-text-poc] error:`, msg, stack);
        return Response.json({ error: msg, stack }, { status: 500 });
      }
    }

    return Response.json({
      message: "shirabe-text-poc Day 3",
      endpoints: {
        health: "/health",
        tokenize: "/tokenize?text=今日は良い天気です",
      },
    });
  },
};
