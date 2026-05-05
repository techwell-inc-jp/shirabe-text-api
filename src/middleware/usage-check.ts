/**
 * 月間利用量チェックミドルウェア(text API、Phase 2)
 *
 * 月間利用量が各プランの上限を超えている場合は HTTP 429 を返し、
 * アップグレード導線(upgrade_url)を併せて返却する。
 *
 * 月間カウントは `usage-monthly:{customerId}:{YYYY-MM}` から読み取る。
 * カウントのインクリメントは usage-logger ミドルウェアで実施する(Phase 2 後半)。
 */
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/env.js";
import {
  NEXT_PLAN_MAP,
  PLAN_MONTHLY_LIMITS,
  PRICING_URL,
  UPGRADE_URL,
  secondsUntilMonthlyReset,
  type PlanName,
} from "./plan-pricing.js";

export const MONTHLY_USAGE_LIMITS = PLAN_MONTHLY_LIMITS;

export type UsagePlanType = PlanName;

export { UPGRADE_URL };

export function getMonthlyUsageKey(customerId: string, now: Date = new Date()): string {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `usage-monthly:${customerId}:${ym}`;
}

function buildLimitMessage(plan: UsagePlanType, limit: number): string {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  return `${planLabel} plan limit (${limit.toLocaleString("en-US")} requests/month) reached. Upgrade to continue.`;
}

export async function usageCheckMiddleware(c: Context<AppEnv>, next: Next) {
  const plan = c.get("plan") as UsagePlanType | undefined;
  const customerId = c.get("customerId") as string | undefined;

  if (!plan || !customerId) {
    await next();
    return;
  }

  const limit = MONTHLY_USAGE_LIMITS[plan];

  if (limit < 0) {
    await next();
    return;
  }

  const usageKV = c.env.USAGE_LOGS;
  const key = getMonthlyUsageKey(customerId);
  const currentStr = await usageKV.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= limit) {
    const nextPlan = NEXT_PLAN_MAP[plan];
    c.header("Retry-After", String(secondsUntilMonthlyReset()));
    return c.json(
      {
        error: {
          code: "USAGE_LIMIT_EXCEEDED",
          message: buildLimitMessage(plan, limit),
          upgrade_url: UPGRADE_URL,
          pricing_url: PRICING_URL,
          current_plan: {
            name: plan,
            monthly_limit: limit,
            monthly_used: current,
          },
          ...(nextPlan ? { next_plan: nextPlan } : {}),
        },
      },
      429
    );
  }

  await next();
}
