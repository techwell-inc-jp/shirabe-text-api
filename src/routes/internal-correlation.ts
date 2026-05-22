/**
 * G-A Phase 1: /api/v1/text/internal/correlation エンドポイント
 *
 * Basic 認証で保護された cross-API correlation 読出 API。
 * shirabe-assets/scripts/cross-api-aggregate.ts(weekly cron)から呼ばれ、
 * text API repo の correlation:* KV エントリを集約。
 *
 * 仕様:
 *   GET /api/v1/text/internal/correlation?cursor={cursor}
 *   - Basic 認証(INTERNAL_STATS_USER / INTERNAL_STATS_PASS、5/31 リリース時に secret 投入)
 *   - KV list prefix "correlation:" を返却
 *   - response: { api: "text", entries: [...], next_cursor?: string }
 */
import { Hono } from "hono";
import type { AppEnv } from "../types/env.js";
import { verifyBasicAuth } from "../util/basic-auth.js";

const internalCorrelation = new Hono<AppEnv>();

const API_NAME = "text";
const PAGE_LIMIT = 1000;

interface CorrelationEntry {
  api: string;
  stripe_customer_id?: string;
  plan: string;
  status: "active" | "suspended" | "canceled";
  subscribed_at: string;
  updated_at: string;
}

interface CorrelationResponse {
  api: string;
  entries: Array<{ email_sha256: string } & CorrelationEntry>;
  next_cursor?: string;
}

internalCorrelation.get("/correlation", async (c) => {
  const authResult = verifyBasicAuth(c.req.header("Authorization"), c.env);
  if (!authResult.ok) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: authResult.message,
        },
      },
      401,
      {
        "WWW-Authenticate": 'Basic realm="internal"',
      }
    );
  }

  const cursor = c.req.query("cursor");

  const listResult = await c.env.USAGE_LOGS.list({
    prefix: "correlation:",
    limit: PAGE_LIMIT,
    cursor: cursor || undefined,
  });

  const entries: CorrelationResponse["entries"] = [];
  for (const key of listResult.keys) {
    const emailHash = key.name.slice("correlation:".length);
    const valueStr = await c.env.USAGE_LOGS.get(key.name);
    if (!valueStr) continue;
    try {
      const entry = JSON.parse(valueStr) as CorrelationEntry;
      entries.push({ email_sha256: emailHash, ...entry });
    } catch {
      // 破損 entry はスキップ
    }
  }

  const response: CorrelationResponse = {
    api: API_NAME,
    entries,
  };

  if (!listResult.list_complete && listResult.cursor) {
    response.next_cursor = listResult.cursor;
  }

  return c.json(response);
});

export { internalCorrelation };
