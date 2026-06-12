/**
 * 内部 enrich subrequest(案 X)の識別(text API 版)
 *
 * calendar の enrich endpoint(`POST /api/v1/enrich`)は人名(name-split / name-reading)・
 * 住所・法人番号 API を same-zone subrequest で呼び出し、`X-Shirabe-Internal` ヘッダに
 * 共有トークンを載せる。このトークンが downstream 側の `INTERNAL_ENRICH_TOKEN` Secret と
 * 一致するとき、当該リクエストは「課金対象外の internal 扱い」とし、月間利用量カウント・
 * 月間上限ゲートのいずれにも計上しない。
 *
 * 出典: `shirabe-assets/implementation-orders/20260611-hub-enrich-endpoint-scoping.md` §3.2 案 X
 * 送信側: `shirabe-calendar/src/enrich/downstream.ts`(`X-Shirabe-Internal` 送出)
 *
 * fail-closed 設計(課金回避の悪用を防ぐ):
 * - `INTERNAL_ENRICH_TOKEN` 未設定(未 provisioning)→ 常に false(通常どおり計上)。
 * - ヘッダ欠如・トークン不一致 → false。
 *   → 外部クライアントが偽の `X-Shirabe-Internal` を送っても計上回避できない。
 *
 * 定数時間比較(`constantTimeEquals`)で timing attack を回避する。
 */
import type { Context } from "hono";
import type { AppEnv } from "../types/env.js";
import { constantTimeEquals } from "./basic-auth.js";

/** 内部 subrequest 識別ヘッダ名(calendar downstream.ts の `INTERNAL_HEADER` と一致させること)。 */
export const INTERNAL_ENRICH_HEADER = "X-Shirabe-Internal";

/**
 * リクエストが正規の内部 enrich subrequest かを判定する。
 *
 * true の場合のみ呼出側で「非計上(internal 扱い)」とする。
 */
export function isInternalEnrichRequest(c: Context<AppEnv>): boolean {
  const expected = c.env.INTERNAL_ENRICH_TOKEN;
  // 未設定なら honor しない(fail-closed)。空文字も同様。
  if (!expected) return false;
  const provided = c.req.header(INTERNAL_ENRICH_HEADER);
  if (!provided) return false;
  return constantTimeEquals(provided, expected);
}
