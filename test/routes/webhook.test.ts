/**
 * webhook route のテスト(text API)。
 * 署名検証 / dedupe / apis.text 専用イベントハンドラを verify する。
 * 暦 / 住所 webhook と同型 spec を保証。
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { webhook, verifyStripeSignature } from "../../src/routes/webhook.js";
import type { AppEnv } from "../../src/types/env.js";
import type { AggregatedApiKeyInfo } from "../../src/types/api-key.js";
import { createMockEnv } from "../helpers/mock-kv.js";

const SECRET = "whsec_test_secret";

async function signPayload(payload: string, secret = SECRET, ts?: number): Promise<string> {
  const t = ts ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${t}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${t},v1=${hex}`;
}

function buildApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.route("/webhook/stripe/text", webhook);
  return app;
}

async function post(
  app: Hono<AppEnv>,
  env: ReturnType<typeof createMockEnv>,
  body: string,
  signature: string | null
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["Stripe-Signature"] = signature;
  return app.fetch(
    new Request("http://localhost/webhook/stripe/text", {
      method: "POST",
      headers,
      body,
    }),
    env
  );
}

function withSecret(env: ReturnType<typeof createMockEnv>) {
  return { ...env, STRIPE_WEBHOOK_SECRET: SECRET };
}

describe("verifyStripeSignature", () => {
  it("有効署名は true", async () => {
    const body = '{"id":"evt_x"}';
    const sig = await signPayload(body);
    expect(await verifyStripeSignature(body, sig, SECRET)).toBe(true);
  });

  it("改竄 body は false", async () => {
    const body = '{"id":"evt_x"}';
    const sig = await signPayload(body);
    expect(await verifyStripeSignature('{"id":"evt_y"}', sig, SECRET)).toBe(false);
  });

  it("古い timestamp(>5min)は false", async () => {
    const body = '{"id":"evt_x"}';
    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const sig = await signPayload(body, SECRET, oldTs);
    expect(await verifyStripeSignature(body, sig, SECRET)).toBe(false);
  });

  it("ヘッダー不正は false", async () => {
    expect(await verifyStripeSignature("body", "garbage", SECRET)).toBe(false);
  });
});

describe("webhook route — 401/500/400", () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
  });

  it("STRIPE_WEBHOOK_SECRET 未設定なら 500", async () => {
    const res = await post(buildApp(), env, "{}", "t=1,v1=00");
    expect(res.status).toBe(500);
  });

  it("Stripe-Signature ヘッダーなしは 401", async () => {
    const res = await post(buildApp(), withSecret(env), "{}", null);
    expect(res.status).toBe(401);
  });

  it("署名不正は 401", async () => {
    const res = await post(buildApp(), withSecret(env), '{"id":"evt_x"}', "t=1,v1=00");
    expect(res.status).toBe(401);
  });

  it("有効署名 + 無効 JSON は 400", async () => {
    const body = "not json";
    const sig = await signPayload(body);
    const res = await post(buildApp(), withSecret(env), body, sig);
    expect(res.status).toBe(400);
  });
});

describe("checkout.session.completed handler", () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
  });

  async function fireEvent(opts: {
    eventId?: string;
    apiKeyHash: string;
    plan?: string;
    customer?: string;
    subscription?: string;
    api?: string;
  }) {
    const event = {
      id: opts.eventId ?? "evt_co_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            apiKeyHash: opts.apiKeyHash,
            plan: opts.plan ?? "starter",
            ...(opts.api ? { api: opts.api } : {}),
          },
          customer: opts.customer ?? "cus_x",
          subscription: opts.subscription ?? "sub_x",
        },
      },
    };
    const body = JSON.stringify(event);
    const sig = await signPayload(body);
    return post(buildApp(), withSecret(env), body, sig);
  }

  it("pending あり → apis.text に登録 + stripe-reverse + email key", async () => {
    const hash = "a".repeat(64);
    await env.USAGE_LOGS.put(
      `checkout-pending:${hash}`,
      JSON.stringify({ apiKey: "shrb_test", plan: "starter", email: "u@example.com" })
    );

    const res = await fireEvent({ apiKeyHash: hash });
    expect(res.status).toBe(200);

    const stored = JSON.parse(
      (await env.API_KEYS.get(hash)) ?? "{}"
    ) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.plan).toBe("starter");
    expect(stored.apis.text?.status).toBe("active");
    expect(stored.stripeCustomerId).toBe("cus_x");

    expect(await env.USAGE_LOGS.get("stripe-reverse:cus_x")).toContain(hash);
    expect(await env.USAGE_LOGS.get("email:u@example.com")).toBe(hash);
  });

  it("既存 apis.calendar を破壊せず apis.text を merge", async () => {
    const hash = "b".repeat(64);
    const existing: AggregatedApiKeyInfo = {
      customerId: "cust_existing",
      stripeCustomerId: "cus_old",
      createdAt: "2026-05-01T00:00:00Z",
      apis: {
        calendar: { plan: "pro", status: "active" },
      },
    };
    await env.API_KEYS.put(hash, JSON.stringify(existing));
    await env.USAGE_LOGS.put(
      `checkout-pending:${hash}`,
      JSON.stringify({ apiKey: "shrb_x", plan: "starter", email: "u@e.com" })
    );

    await fireEvent({ apiKeyHash: hash, customer: "cus_new" });

    const stored = JSON.parse(
      (await env.API_KEYS.get(hash)) ?? "{}"
    ) as AggregatedApiKeyInfo;
    expect(stored.apis.calendar?.plan).toBe("pro");
    expect(stored.apis.text?.plan).toBe("starter");
    expect(stored.stripeCustomerId).toBe("cus_new");
  });

  it("metadata.api が text 以外ならスキップ", async () => {
    const hash = "c".repeat(64);
    await env.USAGE_LOGS.put(
      `checkout-pending:${hash}`,
      JSON.stringify({ apiKey: "shrb_x", plan: "starter", email: "u@e.com" })
    );
    await fireEvent({ apiKeyHash: hash, api: "calendar" });
    expect(await env.API_KEYS.get(hash)).toBeNull();
  });

  it("dedupe: 同じ event.id 2 回目は処理されない", async () => {
    const hash = "d".repeat(64);
    await env.USAGE_LOGS.put(
      `checkout-pending:${hash}`,
      JSON.stringify({ apiKey: "shrb_x", plan: "starter", email: "u@e.com" })
    );
    await fireEvent({ apiKeyHash: hash, eventId: "evt_dup" });
    // 2 回目: pending を別 plan に書き換えても apis.text は変わらない(dedupe)
    await env.USAGE_LOGS.put(
      `checkout-pending:${hash}`,
      JSON.stringify({ apiKey: "shrb_x", plan: "pro", email: "u@e.com" })
    );
    const res2 = await fireEvent({ apiKeyHash: hash, eventId: "evt_dup", plan: "pro" });
    const body = (await res2.json()) as { deduped?: boolean };
    expect(body.deduped).toBe(true);

    const stored = JSON.parse(
      (await env.API_KEYS.get(hash)) ?? "{}"
    ) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.plan).toBe("starter");
  });
});

describe("payment_failed / payment_succeeded / subscription.deleted", () => {
  let env: ReturnType<typeof createMockEnv>;
  const HASH = "e".repeat(64);

  async function setupActiveText() {
    env = createMockEnv();
    const initial: AggregatedApiKeyInfo = {
      customerId: "cust_e",
      stripeCustomerId: "cus_e",
      createdAt: "2026-05-01T00:00:00Z",
      apis: { text: { plan: "starter", status: "active", stripeSubscriptionId: "sub_e" } },
    };
    await env.API_KEYS.put(HASH, JSON.stringify(initial));
    await env.USAGE_LOGS.put("stripe-reverse:cus_e", `cust_e,${HASH}`);
    await env.USAGE_LOGS.put(
      "stripe:customer-map",
      JSON.stringify({ cust_e: { stripeCustomerId: "cus_e" } })
    );
  }

  async function fire(type: string, eventId: string) {
    const event = {
      id: eventId,
      type,
      data: { object: { customer: "cus_e" } },
    };
    const body = JSON.stringify(event);
    const sig = await signPayload(body);
    return post(buildApp(), withSecret(env), body, sig);
  }

  it("invoice.payment_failed → apis.text.status=suspended", async () => {
    await setupActiveText();
    await fire("invoice.payment_failed", "evt_pf_1");
    const stored = JSON.parse((await env.API_KEYS.get(HASH))!) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.status).toBe("suspended");
  });

  it("invoice.payment_succeeded で suspended → active 復帰", async () => {
    await setupActiveText();
    await fire("invoice.payment_failed", "evt_pf_2");
    await fire("invoice.payment_succeeded", "evt_ps_2");
    const stored = JSON.parse((await env.API_KEYS.get(HASH))!) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.status).toBe("active");
  });

  it("customer.subscription.deleted → apis.text=free 降格 + stripe bindings 削除", async () => {
    await setupActiveText();
    await fire("customer.subscription.deleted", "evt_sd_1");
    const stored = JSON.parse((await env.API_KEYS.get(HASH))!) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.plan).toBe("free");
    expect(stored.stripeCustomerId).toBeUndefined();
    expect(await env.USAGE_LOGS.get("stripe-reverse:cus_e")).toBeNull();
  });

  it("subscription.deleted で他 API が有償なら stripe bindings 保持", async () => {
    env = createMockEnv();
    const initial: AggregatedApiKeyInfo = {
      customerId: "cust_e",
      stripeCustomerId: "cus_e",
      createdAt: "2026-05-01T00:00:00Z",
      apis: {
        text: { plan: "starter", status: "active" },
        calendar: { plan: "pro", status: "active" },
      },
    };
    await env.API_KEYS.put(HASH, JSON.stringify(initial));
    await env.USAGE_LOGS.put("stripe-reverse:cus_e", `cust_e,${HASH}`);

    await fire("customer.subscription.deleted", "evt_sd_3");
    const stored = JSON.parse((await env.API_KEYS.get(HASH))!) as AggregatedApiKeyInfo;
    expect(stored.apis.text?.plan).toBe("free");
    expect(stored.apis.calendar?.plan).toBe("pro");
    expect(stored.stripeCustomerId).toBe("cus_e");
    expect(await env.USAGE_LOGS.get("stripe-reverse:cus_e")).not.toBeNull();
  });
});
