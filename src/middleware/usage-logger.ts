/**
 * 利用量ログミドルウェア(text API)
 *
 * リクエストごとに Cloudflare KV に利用量を記録する。
 * `usage-check` が読む `usage-monthly:{customerId}:{YYYY-MM}` をここで書き込む。
 * このミドルウェアが middleware chain の最後に位置することで、
 * 認証・上限チェック・レート制限を全て通過した正常リクエストのみカウントする。
 *
 * 暦・住所 API の usage-logger と同型(2026-05-10 移植)。
 */
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/env.js";

/** 日次利用量カウント:`usage:{customerId}:{YYYY-MM-DD}`(日次バッチで Stripe 報告)。 */
function getUsageKey(customerId: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `usage:${customerId}:${date}`;
}

/** 日付インデックス:`usage-index:{YYYY-MM-DD}`(その日アクセスした customerId 集合)。 */
function getIndexKey(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `usage-index:${date}`;
}

/** 月間利用量カウント:`usage-monthly:{customerId}:{YYYY-MM}`(usage-check 用)。 */
function getMonthlyUsageKey(customerId: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `usage-monthly:${customerId}:${ym}`;
}

const DAILY_TTL_SEC = 7 * 24 * 60 * 60;
const MONTHLY_TTL_SEC = 35 * 24 * 60 * 60;

export async function usageLoggerMiddleware(c: Context<AppEnv>, next: Next) {
  await next();

  if (c.res.status < 200 || c.res.status >= 400) return;

  const customerId = c.get("customerId") as string | undefined;
  if (!customerId) return;

  const usageKV = c.env.USAGE_LOGS;
  const usageKey = getUsageKey(customerId);
  const monthlyKey = getMonthlyUsageKey(customerId);
  const indexKey = getIndexKey();

  const recordUsage = async () => {
    const dailyStr = await usageKV.get(usageKey);
    const dailyCurrent = dailyStr ? parseInt(dailyStr, 10) : 0;
    await usageKV.put(usageKey, String(dailyCurrent + 1), {
      expirationTtl: DAILY_TTL_SEC,
    });

    const monthlyStr = await usageKV.get(monthlyKey);
    const monthlyCurrent = monthlyStr ? parseInt(monthlyStr, 10) : 0;
    await usageKV.put(monthlyKey, String(monthlyCurrent + 1), {
      expirationTtl: MONTHLY_TTL_SEC,
    });

    const indexStr = await usageKV.get(indexKey);
    const customerIds = indexStr ? new Set(indexStr.split(",")) : new Set<string>();
    if (!customerIds.has(customerId)) {
      customerIds.add(customerId);
      await usageKV.put(indexKey, Array.from(customerIds).join(","), {
        expirationTtl: DAILY_TTL_SEC,
      });
    }
  };

  try {
    const ctx = c.executionCtx;
    if (ctx && "waitUntil" in ctx) {
      ctx.waitUntil(recordUsage());
    } else {
      await recordUsage();
    }
  } catch {
    await recordUsage();
  }
}

export { getUsageKey, getIndexKey, getMonthlyUsageKey };
