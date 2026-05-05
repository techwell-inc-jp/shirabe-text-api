/**
 * KV API_KEYS に保存されるデータ構造定義(text API 側)
 *
 * shirabe-calendar-api / shirabe-address-api と **同一の型定義**。
 * 1 キー集約構造(`apis.{calendar,address,text}`)で 3 API のプラン状態を
 * 同一レコードに集約し、同一 API キーで全 API にアクセス可能にする。
 *
 * canonical: shirabe-calendar/src/types/api-key.ts(暦 API 側、5/5 時点)。
 * 6 月モノレポ化で 1 ファイルに統合予定。
 */

export type ApiPlanInfo = {
  plan: "free" | "starter" | "pro" | "enterprise";
  status?: "active" | "suspended";
  stripeSubscriptionId?: string;
  updatedAt?: string;
};

/** 【新フォーマット】1 キー集約構造 */
export type AggregatedApiKeyInfo = {
  customerId: string;
  stripeCustomerId?: string;
  email?: string;
  createdAt: string;
  apis: {
    calendar?: ApiPlanInfo;
    address?: ApiPlanInfo;
    text?: ApiPlanInfo;
    [apiName: string]: ApiPlanInfo | undefined;
  };
};

/** 【旧フォーマット】暦 API 単独時代のフラット形式 */
export type LegacyApiKeyInfo = {
  plan: "free" | "starter" | "pro" | "enterprise";
  customerId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  email?: string;
  status?: "active" | "suspended";
  createdAt: string;
};

export type StoredApiKeyInfo = AggregatedApiKeyInfo | LegacyApiKeyInfo;

export function isAggregatedApiKeyInfo(
  info: StoredApiKeyInfo
): info is AggregatedApiKeyInfo {
  return "apis" in info && typeof (info as AggregatedApiKeyInfo).apis === "object";
}

/**
 * 旧フォーマット → 新フォーマット への読み取り時変換(in-memory のみ)。
 * 旧フォーマットは暦 API のプランを表していたため、`apis.calendar` のみ map。
 * text API の plan は未設定扱い(= 匿名 Free)。
 */
export function migrateToAggregated(
  legacy: LegacyApiKeyInfo
): AggregatedApiKeyInfo {
  return {
    customerId: legacy.customerId,
    stripeCustomerId: legacy.stripeCustomerId,
    email: legacy.email,
    createdAt: legacy.createdAt,
    apis: {
      calendar: {
        plan: legacy.plan,
        status: legacy.status ?? "active",
        stripeSubscriptionId: legacy.stripeSubscriptionId,
      },
    },
  };
}

/**
 * 特定 API の ApiPlanInfo を取得するヘルパ。
 * 対象 API が未契約なら undefined(呼び出し側で匿名 Free 扱い)。
 */
export function resolveApiPlan(
  stored: StoredApiKeyInfo,
  apiName: "calendar" | "address" | "text"
): ApiPlanInfo | undefined {
  const aggregated = isAggregatedApiKeyInfo(stored)
    ? stored
    : migrateToAggregated(stored);
  return aggregated.apis[apiName];
}

export function getCustomerId(stored: StoredApiKeyInfo): string {
  return stored.customerId;
}
