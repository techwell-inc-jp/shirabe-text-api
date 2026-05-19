/**
 * S1 計測基盤: Analytics Engine 記録ミドルウェア(text API 版)
 *
 * 全ルートのレスポンス後に 1req = 1 書込で Analytics Engine
 * (`shirabe_text_events` Dataset、wrangler.toml binding ANALYTICS)に記録する。
 * AE 書込失敗時はレスポンスに影響させない(計測 = 副作用、本流の挙動に影響不可)。
 *
 * 2026-05-19 起票背景:
 *   text API 5/18 soft launch までに AE binding 未設定 = conversion 観測経路ゼロ
 *   状態が判明(`shirabe-assets/knowledge/20260519-conversion-funnel-audit-recipe.md`
 *   Finding 1)。MRR ¥0 打破の bottleneck 診断のため、暦・住所 API と同型の
 *   instrumentation を移植して 5/20 Trigger 評価以降の funnel 観測を可能にする。
 *
 * 記録スキーマ(暦・住所 API と blob 順序揃え、text API 固有 fields なし):
 *   blobs(順序固定、SQL 上は blob1 〜 blob10 に対応):
 *     0: UA category           ai/human/bot
 *     1: AI vendor             openai/anthropic/perplexity/...
 *     2: Referrer type         ai_search/other
 *     3: Referrer vendor       perplexity/chatgpt/claude/... or none
 *     4: Endpoint kind         api_call/openapi_view/docs_view/health/webhook/checkout/internal/other
 *     5: Normalized pathname
 *     6: Plan                  free/starter/pro/enterprise/anonymous
 *     7: API key id hash       16 文字 hex または "none"
 *     8: Tool hint             gpts/langchain/dify/llamaindex/none
 *     9: Content platform      qiita/zenn/github/devto/medium/note/other/none
 *   doubles:
 *     0: HTTP status
 *     1: Success flag          (2xx なら 1、それ以外 0)
 *     2: Response time (ms)
 *   indexes: [endpoint_kind]
 *
 * 暦 API の `/internal/stats` SQL(`blob1 AS ua_category, ... blob5 AS endpoint_kind,
 * blob7 AS plan, blob9 AS tool_hint`)と完全互換のため、text 用 stats endpoint を
 * 別 PR で起票する際は同 SQL を流用可能。
 */
import type { Context, Next } from "hono";
import type { AppEnv, AnalyticsEngineDataset } from "../types/env.js";
import {
  categorizeUserAgent,
  detectAIVendor,
  categorizeReferrer,
  detectReferrerVendor,
  categorizeEndpoint,
  normalizePath,
  detectToolHint,
  detectContentPlatform,
} from "../analytics/classifier.js";

/** 有効なプラン値(暦 / 住所 API と完全同型) */
const VALID_PLANS = new Set(["free", "starter", "pro", "enterprise"]);

/**
 * 計測ミドルウェア。計測失敗はユーザーに影響させない。
 */
export async function analyticsMiddleware(c: Context<AppEnv>, next: Next) {
  const startedAt = Date.now();
  await next();

  try {
    const dataset = c.env.ANALYTICS;
    if (!dataset || typeof dataset.writeDataPoint !== "function") {
      return;
    }
    recordDataPoint(c, dataset, Date.now() - startedAt);
  } catch (err) {
    console.error("[analytics] writeDataPoint failed", err);
  }
}

function recordDataPoint(
  c: Context<AppEnv>,
  dataset: AnalyticsEngineDataset,
  elapsedMs: number
): void {
  const ua = c.req.header("User-Agent") ?? null;
  const referrer = c.req.header("Referer") ?? c.req.header("Referrer") ?? null;
  const xSource = c.req.header("X-Source") ?? null;
  const xClient = c.req.header("X-Client") ?? null;

  const url = new URL(c.req.url);
  const pathNormalized = normalizePath(url.pathname);

  const uaCategory = categorizeUserAgent(ua);
  const aiVendor = detectAIVendor(ua);
  const refType = categorizeReferrer(referrer);
  const refVendor = detectReferrerVendor(referrer);
  const endpointKind = categorizeEndpoint(pathNormalized);
  const toolHint = detectToolHint({ userAgent: ua, xSource, xClient });
  const contentPlatform = detectContentPlatform(referrer);

  const rawPlan = c.get("plan");
  const plan =
    typeof rawPlan === "string" && VALID_PLANS.has(rawPlan) ? rawPlan : "anonymous";
  const rawIdHash = c.get("apiKeyIdHash");
  const apiKeyIdHash =
    typeof rawIdHash === "string" && rawIdHash.length > 0 ? rawIdHash : "none";

  const status = c.res.status;
  const success = status >= 200 && status < 300 ? 1 : 0;

  dataset.writeDataPoint({
    blobs: [
      uaCategory,
      aiVendor,
      refType,
      refVendor,
      endpointKind,
      pathNormalized,
      plan,
      apiKeyIdHash,
      toolHint,
      contentPlatform,
    ],
    doubles: [status, success, elapsedMs],
    indexes: [endpointKind],
  });
}
