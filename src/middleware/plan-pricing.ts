/**
 * プラン別料金 / 上限情報と「次のプラン」マップ(text API)。
 *
 * AI agent が 429 response から 1 hop で「次に upgrade すべきプラン名 / 料金 /
 * checkout URL」を取得できるようにする(C-1 paid 突破経路 ergonomics)。
 *
 * 価格は **Phase 1 stable**(暦・住所 API と完全同型、2026-05-06 経営判断確定):
 * Free 10k / Starter 500k×¥0.05 / Pro 5M×¥0.03 / Enterprise 無制限×¥0.01
 *
 * 1+ 年変更しない約束(memory `feedback_no_implicit_plan_change.md`):
 * - 課金モデル / 月間上限 / 単価 / billing schema は launch 時点で 1+ 年 stable
 * - 上方調整のみ許可(Free 枠拡張、値下げ、新エンドポイント追加 = unilateral good news)
 * - 禁止調整(Free 縮小、値上げ、機能別差別単価導入 = 既存顧客の billing 動線破壊)
 * - 4.3 倍 volume 想定(text 月 65 万 / calendar 月 15 万)= master-plan v1.04 baked-in
 *
 * canonical = `shirabe-assets/knowledge/text-api-pricing-research.md` §9 / §10
 */

export type PlanName = "free" | "starter" | "pro" | "enterprise";

export type CurrentPlanSummary = {
  name: PlanName;
  monthly_limit: number;
  monthly_used: number;
};

export type NextPlanSummary = {
  name: PlanName;
  monthly_limit: number;
  price_per_request_jpy: number;
  monthly_price_example_jpy: number;
  example_monthly_requests: number;
  checkout_path: string;
};

export const PRICING_URL = "https://shirabe.dev/docs/text-pricing";
export const UPGRADE_URL = "https://shirabe.dev/upgrade";

/**
 * プラン別の月間上限(canonical、docs と完全一致)。
 * rate-limit.ts と usage-check.ts はこの map を single source of truth として参照。
 */
export const PLAN_MONTHLY_LIMITS: Record<PlanName, number> = {
  free: 10_000,
  starter: 500_000,
  pro: 5_000_000,
  enterprise: -1,
} as const;

/**
 * 次のプラン map。Enterprise には next_plan なし。
 */
export const NEXT_PLAN_MAP: Partial<Record<PlanName, NextPlanSummary>> = {
  free: {
    name: "starter",
    monthly_limit: 500_000,
    price_per_request_jpy: 0.05,
    monthly_price_example_jpy: 25_000,
    example_monthly_requests: 500_000,
    checkout_path: "/upgrade?plan=starter&from=429&api=text",
  },
  starter: {
    name: "pro",
    monthly_limit: 5_000_000,
    price_per_request_jpy: 0.03,
    monthly_price_example_jpy: 150_000,
    example_monthly_requests: 5_000_000,
    checkout_path: "/upgrade?plan=pro&from=429&api=text",
  },
  pro: {
    name: "enterprise",
    monthly_limit: -1,
    price_per_request_jpy: 0.01,
    monthly_price_example_jpy: 100_000,
    example_monthly_requests: 10_000_000,
    checkout_path: "/upgrade?plan=enterprise&from=429&api=text",
  },
} as const;

/** 翌月 1 日 UTC 0 時(月次 reset 時刻)を返す。 */
export function getMonthlyResetDate(now: Date = new Date()): Date {
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  return new Date(year, month, 1);
}

/** 月次 reset までの残秒数(`Retry-After` header 用)。 */
export function secondsUntilMonthlyReset(now: Date = new Date()): number {
  const reset = getMonthlyResetDate(now);
  return Math.max(0, Math.ceil((reset.getTime() - now.getTime()) / 1000));
}
