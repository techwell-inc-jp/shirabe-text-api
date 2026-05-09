/**
 * Stripe Webhook 自動処理(text API、Phase 4 scaffold)
 *
 * POST /webhook/stripe
 * - auth / rate-limit / usage-check / usage-logger 全てバイパス
 * - Stripe 署名検証(Web Crypto API HMAC SHA-256)+ event.id ベース dedupe
 *
 * 処理対象イベント(暦 / 住所 API と同型、対象 nest は `apis.text`):
 * - checkout.session.completed     → apis.text を active で登録
 * - invoice.payment_failed         → apis.text.status を suspended
 * - invoice.payment_succeeded      → suspended からの復帰
 * - customer.subscription.deleted  → apis.text を free に降格
 *
 * 他 API(apis.calendar / apis.address)の状態は破壊しない(Issue #27 同等の防御的 patch)。
 */
import { Hono } from "hono";
import type { AppEnv } from "../types/env.js";
import {
  isAggregatedApiKeyInfo,
  type AggregatedApiKeyInfo,
  type ApiPlanInfo,
  type StoredApiKeyInfo,
} from "../types/api-key.js";

const webhook = new Hono<AppEnv>();

// 既存 KV 値が新フォーマットなら返す。旧フォーマット / parse 失敗 / 未登録は null。
function readExistingAggregated(stored: string | null): AggregatedApiKeyInfo | null {
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as StoredApiKeyInfo;
    return isAggregatedApiKeyInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// 集約フォーマットの apis.text を更新するヘルパ。他 API は保持。
function withTextPlan(
  aggregated: AggregatedApiKeyInfo,
  planInfo: ApiPlanInfo
): AggregatedApiKeyInfo {
  return {
    ...aggregated,
    apis: {
      ...aggregated.apis,
      text: planInfo,
    },
  };
}

// text 以外に有償プラン API があるか判定(stripeCustomerId / reverse の保守的削除に使用)。
function hasOtherPaidApi(aggregated: AggregatedApiKeyInfo): boolean {
  for (const [apiName, planInfo] of Object.entries(aggregated.apis)) {
    if (apiName === "text") continue;
    if (planInfo && planInfo.plan !== "free") return true;
  }
  return false;
}

// ─── Stripe 署名検証 ───────────────────────────────────────

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  return { timestamp, signatures };
}

async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

const SIGNATURE_TOLERANCE_SEC = 300;

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > SIGNATURE_TOLERANCE_SEC) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = await computeHmacSha256(webhookSecret, signedPayload);

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

// ─── イベントハンドラ ───────────────────────────────────────

type StripeEvent = {
  id?: string;
  type: string;
  data: { object: Record<string, unknown> };
};

async function handleCheckoutCompleted(
  event: StripeEvent,
  apiKeysKV: KVNamespace,
  usageLogsKV: KVNamespace
): Promise<void> {
  const session = event.data.object as {
    metadata?: { apiKeyHash?: string; plan?: string; api?: string };
    customer?: string;
    subscription?: string;
  };
  const apiKeyHash = session.metadata?.apiKeyHash;
  const plan = session.metadata?.plan;
  const stripeCustomerId = session.customer;
  const stripeSubscriptionId = session.subscription;

  if (!apiKeyHash || !plan) {
    console.error("[text webhook] checkout.session.completed: missing metadata");
    return;
  }

  // 他 API 起源の checkout イベント(metadata.api !== "text")はスキップ。
  // 同 webhook endpoint を別 API と共有する将来構成への防御的措置。
  if (session.metadata?.api && session.metadata.api !== "text") return;

  const pendingStr = await usageLogsKV.get(`checkout-pending:${apiKeyHash}`);
  if (!pendingStr) {
    console.error("[text webhook] checkout-pending not found:", apiKeyHash);
    return;
  }
  const pending = JSON.parse(pendingStr) as { apiKey: string; plan: string; email: string };

  const customerId = `cust_${apiKeyHash.slice(0, 16)}`;
  const now = new Date().toISOString();

  const textPlanInfo: ApiPlanInfo = {
    plan: plan as ApiPlanInfo["plan"],
    status: "active",
    stripeSubscriptionId,
    updatedAt: now,
  };

  // 既存値が新フォーマットなら apis.text を merge、それ以外は新フォーマットで作成。
  // 旧フォーマット(暦単独時代の flat plan)は読み取り時に migrateToAggregated される
  // ことを想定するが、書き込みは常に新フォーマットで統一(text API は新規顧客のみ想定)。
  const existingAggregated = readExistingAggregated(await apiKeysKV.get(apiKeyHash));
  if (existingAggregated) {
    const merged: AggregatedApiKeyInfo = {
      ...existingAggregated,
      stripeCustomerId: stripeCustomerId ?? existingAggregated.stripeCustomerId,
      email: pending.email ?? existingAggregated.email,
      apis: {
        ...existingAggregated.apis,
        text: textPlanInfo,
      },
    };
    await apiKeysKV.put(apiKeyHash, JSON.stringify(merged));
  } else {
    const fresh: AggregatedApiKeyInfo = {
      customerId,
      stripeCustomerId,
      email: pending.email,
      createdAt: now,
      apis: { text: textPlanInfo },
    };
    await apiKeysKV.put(apiKeyHash, JSON.stringify(fresh));
  }

  if (stripeCustomerId) {
    const mapStr = await usageLogsKV.get("stripe:customer-map");
    const map = mapStr ? JSON.parse(mapStr) : {};
    map[customerId] = { stripeCustomerId };
    await usageLogsKV.put("stripe:customer-map", JSON.stringify(map));

    await usageLogsKV.put(
      `stripe-reverse:${stripeCustomerId}`,
      `${customerId},${apiKeyHash}`
    );
  }

  if (pending.email) {
    await usageLogsKV.put(`email:${pending.email}`, apiKeyHash);
  }

  // checkout-pending は削除しない(/checkout/success との競合回避、TTL 1h で自動失効)。
}

async function lookupByStripeCustomer(
  stripeCustomerId: string,
  usageLogsKV: KVNamespace
): Promise<{ customerId: string; apiKeyHash: string } | null> {
  const reverseStr = await usageLogsKV.get(`stripe-reverse:${stripeCustomerId}`);
  if (!reverseStr) return null;
  const [customerId, apiKeyHash] = reverseStr.split(",", 2);
  if (!customerId || !apiKeyHash) return null;
  return { customerId, apiKeyHash };
}

async function handlePaymentFailed(
  event: StripeEvent,
  apiKeysKV: KVNamespace,
  usageLogsKV: KVNamespace
): Promise<void> {
  const stripeCustomerId = (event.data.object as { customer?: string }).customer;
  if (!stripeCustomerId) return;

  const lookup = await lookupByStripeCustomer(stripeCustomerId, usageLogsKV);
  if (!lookup) return;

  const keyInfoStr = await apiKeysKV.get(lookup.apiKeyHash);
  if (!keyInfoStr) return;

  const existingAggregated = readExistingAggregated(keyInfoStr);
  if (!existingAggregated || !existingAggregated.apis.text) return;

  const updated = withTextPlan(existingAggregated, {
    ...existingAggregated.apis.text,
    status: "suspended",
    updatedAt: new Date().toISOString(),
  });
  await apiKeysKV.put(lookup.apiKeyHash, JSON.stringify(updated));
}

async function handlePaymentSucceeded(
  event: StripeEvent,
  apiKeysKV: KVNamespace,
  usageLogsKV: KVNamespace
): Promise<void> {
  const stripeCustomerId = (event.data.object as { customer?: string }).customer;
  if (!stripeCustomerId) return;

  const lookup = await lookupByStripeCustomer(stripeCustomerId, usageLogsKV);
  if (!lookup) return;

  const keyInfoStr = await apiKeysKV.get(lookup.apiKeyHash);
  if (!keyInfoStr) return;

  const existingAggregated = readExistingAggregated(keyInfoStr);
  if (!existingAggregated || !existingAggregated.apis.text) return;
  if (existingAggregated.apis.text.status !== "suspended") return;

  const updated = withTextPlan(existingAggregated, {
    ...existingAggregated.apis.text,
    status: "active",
    updatedAt: new Date().toISOString(),
  });
  await apiKeysKV.put(lookup.apiKeyHash, JSON.stringify(updated));
}

async function handleSubscriptionDeleted(
  event: StripeEvent,
  apiKeysKV: KVNamespace,
  usageLogsKV: KVNamespace
): Promise<void> {
  const stripeCustomerId = (event.data.object as { customer?: string }).customer;
  if (!stripeCustomerId) return;

  const lookup = await lookupByStripeCustomer(stripeCustomerId, usageLogsKV);
  if (!lookup) return;

  const keyInfoStr = await apiKeysKV.get(lookup.apiKeyHash);
  if (!keyInfoStr) return;

  const existingAggregated = readExistingAggregated(keyInfoStr);
  if (!existingAggregated || !existingAggregated.apis.text) return;

  let preserveStripeBindings = false;
  const updated = withTextPlan(existingAggregated, {
    plan: "free",
    status: "active",
    updatedAt: new Date().toISOString(),
  });

  if (hasOtherPaidApi(updated)) {
    preserveStripeBindings = true;
  } else {
    delete updated.stripeCustomerId;
  }
  await apiKeysKV.put(lookup.apiKeyHash, JSON.stringify(updated));

  if (!preserveStripeBindings) {
    const mapStr = await usageLogsKV.get("stripe:customer-map");
    if (mapStr) {
      const map = JSON.parse(mapStr) as Record<string, unknown>;
      delete map[lookup.customerId];
      await usageLogsKV.put("stripe:customer-map", JSON.stringify(map));
    }
    await usageLogsKV.delete(`stripe-reverse:${stripeCustomerId}`);
  }
}

// ─── メインハンドラ ─────────────────────────────────────────

const DEDUPE_TTL_SEC = 7 * 24 * 60 * 60;
const DEDUPE_KEY_PREFIX = "webhook-dedupe:";

webhook.post("/", async (c) => {
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[text webhook] STRIPE_WEBHOOK_SECRET not configured");
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook not configured." } },
      500
    );
  }

  const signatureHeader = c.req.header("Stripe-Signature");
  if (!signatureHeader) {
    return c.json(
      { error: { code: "INVALID_SIGNATURE", message: "Missing Stripe-Signature header." } },
      401
    );
  }

  const rawBody = await c.req.text();

  const isValid = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    return c.json(
      { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature." } },
      401
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid JSON body." } },
      400
    );
  }

  const eventId = typeof event.id === "string" ? event.id : undefined;

  // event.id ベース dedupe(Stripe retry / 重複配信を 7 日 TTL で防御)
  if (eventId) {
    const dedupeKey = `${DEDUPE_KEY_PREFIX}${eventId}`;
    const existing = await c.env.USAGE_LOGS.get(dedupeKey);
    if (existing) {
      return c.json({ received: true, deduped: true });
    }
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event, c.env.API_KEYS, c.env.USAGE_LOGS);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event, c.env.API_KEYS, c.env.USAGE_LOGS);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event, c.env.API_KEYS, c.env.USAGE_LOGS);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event, c.env.API_KEYS, c.env.USAGE_LOGS);
      break;
    default:
      // 未対応イベントは 200 で受領のみ
      break;
  }

  // handler 成功後に dedupe key を書く(throw 時は書かれず Stripe retry に委ねる)
  if (eventId) {
    const dedupeKey = `${DEDUPE_KEY_PREFIX}${eventId}`;
    await c.env.USAGE_LOGS.put(dedupeKey, new Date().toISOString(), {
      expirationTtl: DEDUPE_TTL_SEC,
    });
  }

  return c.json({ received: true });
});

export { webhook };
