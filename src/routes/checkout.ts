/**
 * Stripe Checkout + API キー自動発行(text API、Phase 3 scaffold)
 *
 * POST /api/v1/text/checkout
 *   - リクエスト: { email: string, plan: "starter" | "pro" | "enterprise" }
 *   - 処理: バリデーション → API キー生成 → SHA-256 ハッシュ → Stripe Checkout Session 作成
 *           → KV 一時保存(checkout-pending、TTL 1h)→ checkout URL 返却
 *
 * 暦 / 住所 API と同型(`shirabe-calendar/src/routes/checkout.ts`)。Price ID は
 * 環境変数(STRIPE_PRICE_STARTER / PRO / ENTERPRISE)、Stripe Secret Key は
 * Cloudflare Secret(STRIPE_SECRET_KEY)で管理。
 *
 * Stripe SDK は使わず fetch で REST API 直接呼出(Workers 互換性)。
 */
import { Hono } from "hono";
import type { AppEnv } from "../types/env.js";

const checkout = new Hono<AppEnv>();

const VALID_PLANS = ["starter", "pro", "enterprise"] as const;
type PaidPlan = (typeof VALID_PLANS)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const PENDING_TTL = 3600;

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let key = "shrb_";
  for (let i = 0; i < 32; i++) {
    key += CHARSET[bytes[i] % CHARSET.length];
  }
  return key;
}

function getPriceId(plan: PaidPlan, env: AppEnv["Bindings"]): string | undefined {
  const map: Record<PaidPlan, string | undefined> = {
    starter: env.STRIPE_PRICE_STARTER,
    pro: env.STRIPE_PRICE_PRO,
    enterprise: env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[plan];
}

async function createStripeCheckoutSession(params: {
  priceId: string;
  apiKeyHash: string;
  plan: string;
  email: string;
  stripeSecretKey: string;
}): Promise<{ url: string }> {
  const body = new URLSearchParams();
  body.append("mode", "subscription");
  body.append("line_items[0][price]", params.priceId);
  // metered 価格(usage_type=metered)では quantity 指定不可。
  // 数量は Billing Meter Events から自動算出。
  body.append("customer_email", params.email);
  body.append("metadata[apiKeyHash]", params.apiKeyHash);
  body.append("metadata[plan]", params.plan);
  body.append("metadata[api]", "text");
  body.append(
    "success_url",
    "https://shirabe.dev/checkout/success?session_id={CHECKOUT_SESSION_ID}&api=text"
  );
  body.append("cancel_url", "https://shirabe.dev/checkout/cancel?api=text");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(params.stripeSecretKey + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe API error (${res.status}): ${err}`);
  }

  const session = (await res.json()) as { url: string };
  return { url: session.url };
}

checkout.post("/", async (c) => {
  let body: { email?: string; plan?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Request body must be valid JSON with email and plan.",
        },
      },
      400
    );
  }

  const { email, plan } = body;

  if (!email || !EMAIL_PATTERN.test(email)) {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "A valid email address is required.",
        },
      },
      400
    );
  }

  if (!plan || !VALID_PLANS.includes(plan as PaidPlan)) {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: `plan must be one of: ${VALID_PLANS.join(", ")}`,
        },
      },
      400
    );
  }

  const paidPlan = plan as PaidPlan;

  const priceId = getPriceId(paidPlan, c.env);
  if (!priceId) {
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Stripe Price ID is not configured for this plan.",
        },
      },
      500
    );
  }

  const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Payment system is not configured.",
        },
      },
      500
    );
  }

  const apiKey = generateApiKey();
  const apiKeyHash = await sha256Hex(apiKey);

  let checkoutUrl: string;
  try {
    const session = await createStripeCheckoutSession({
      priceId,
      apiKeyHash,
      plan: paidPlan,
      email,
      stripeSecretKey,
    });
    checkoutUrl = session.url;
  } catch (err) {
    console.error("Stripe Checkout Session creation failed (text API):", err);
    return c.json(
      {
        error: {
          code: "CHECKOUT_FAILED",
          message: "Failed to create checkout session. Please try again.",
        },
      },
      502
    );
  }

  // KV 一時保存(/checkout/success ページが pending から API キー平文を取得)
  const pendingKey = `checkout-pending:${apiKeyHash}`;
  const pendingData = JSON.stringify({
    apiKey,
    plan: paidPlan,
    email,
    api: "text",
  });
  await c.env.USAGE_LOGS.put(pendingKey, pendingData, {
    expirationTtl: PENDING_TTL,
  });

  return c.json({ checkout_url: checkoutUrl });
});

export { checkout, generateApiKey, sha256Hex };
