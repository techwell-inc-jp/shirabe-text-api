/**
 * checkout route のバリデーション + 設定不足エラー smoke test。
 * Stripe API への実 fetch は scaffold 段階では verify 対象外(Price ID 経営者発行待ち)。
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { checkout, generateApiKey, sha256Hex } from "../../src/routes/checkout.js";
import type { AppEnv } from "../../src/types/env.js";
import { createMockEnv } from "../helpers/mock-kv.js";

function buildApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.route("/api/v1/text/checkout", checkout);
  return app;
}

async function postJson(app: Hono<AppEnv>, env: ReturnType<typeof createMockEnv>, body: unknown) {
  return app.fetch(
    new Request("http://localhost/api/v1/text/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env
  );
}

describe("checkout route", () => {
  let env: ReturnType<typeof createMockEnv> & { STRIPE_PRICE_STARTER?: string; STRIPE_SECRET_KEY?: string };

  beforeEach(() => {
    env = createMockEnv();
  });

  it("非 JSON body は 400", async () => {
    const app = buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/checkout", {
        method: "POST",
        body: "not json",
      }),
      env
    );
    expect(res.status).toBe(400);
  });

  it("email 不正なら 400", async () => {
    const res = await postJson(buildApp(), env, { email: "not-an-email", plan: "starter" });
    expect(res.status).toBe(400);
  });

  it("plan が VALID_PLANS 外なら 400(free 含む)", async () => {
    const r1 = await postJson(buildApp(), env, { email: "u@example.com", plan: "free" });
    expect(r1.status).toBe(400);
    const r2 = await postJson(buildApp(), env, { email: "u@example.com", plan: "ultra" });
    expect(r2.status).toBe(400);
  });

  it("STRIPE_PRICE_STARTER 未設定なら 500 INTERNAL_ERROR", async () => {
    const res = await postJson(buildApp(), env, { email: "u@example.com", plan: "starter" });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("STRIPE_SECRET_KEY 未設定なら 500 INTERNAL_ERROR", async () => {
    env.STRIPE_PRICE_STARTER = "price_test_starter";
    const res = await postJson(buildApp(), env, { email: "u@example.com", plan: "starter" });
    expect(res.status).toBe(500);
  });
});

describe("API キー生成", () => {
  it("shrb_ + 32 文字英数字", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^shrb_[A-Za-z0-9]{32}$/);
  });

  it("毎回ユニーク", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });
});

describe("sha256Hex", () => {
  it("64 文字 16 進", async () => {
    const h = await sha256Hex("test");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同じ入力 → 同じ出力", async () => {
    expect(await sha256Hex("abc")).toBe(await sha256Hex("abc"));
  });
});
