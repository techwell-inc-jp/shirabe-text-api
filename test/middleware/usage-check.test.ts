/**
 * usage-check middleware のテスト(text API)。
 *
 * usage-logger が書き込む `usage-monthly:{customerId}:{YYYY-MM}` を読み、
 * プラン上限到達時に 429 USAGE_LIMIT_EXCEEDED を返すことを検証する。
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  usageCheckMiddleware,
  getMonthlyUsageKey,
} from "../../src/middleware/usage-check.js";
import { PLAN_MONTHLY_LIMITS } from "../../src/middleware/plan-pricing.js";
import type { AppEnv } from "../../src/types/env.js";
import { createMockEnv } from "../helpers/mock-kv.js";

function buildApp(plan: string, customerId: string): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("plan", plan);
    c.set("customerId", customerId);
    c.set("apiKeyHash", "");
    c.set("apiKeyIdHash", "");
    await next();
  });
  app.use("*", usageCheckMiddleware);
  app.get("/ok", (c) => c.json({ ok: true }));
  return app;
}

describe("usageCheckMiddleware", () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
  });

  it("月間カウントが上限未満なら通過", async () => {
    const app = buildApp("free", "cust_a");
    await env.USAGE_LOGS.put(getMonthlyUsageKey("cust_a"), "5000");
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.status).toBe(200);
  });

  it("Free 上限到達で 429 USAGE_LIMIT_EXCEEDED", async () => {
    const app = buildApp("free", "cust_b");
    await env.USAGE_LOGS.put(
      getMonthlyUsageKey("cust_b"),
      String(PLAN_MONTHLY_LIMITS.free)
    );
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string; current_plan: { name: string }; next_plan?: { name: string } } };
    expect(body.error.code).toBe("USAGE_LIMIT_EXCEEDED");
    expect(body.error.current_plan.name).toBe("free");
    expect(body.error.next_plan?.name).toBe("starter");
  });

  it("Starter 上限到達で 429 + next_plan=pro", async () => {
    const app = buildApp("starter", "cust_c");
    await env.USAGE_LOGS.put(
      getMonthlyUsageKey("cust_c"),
      String(PLAN_MONTHLY_LIMITS.starter)
    );
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { next_plan?: { name: string } } };
    expect(body.error.next_plan?.name).toBe("pro");
  });

  it("Enterprise(無制限)は到達しないので常に通過", async () => {
    const app = buildApp("enterprise", "cust_d");
    await env.USAGE_LOGS.put(getMonthlyUsageKey("cust_d"), "999999999");
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.status).toBe(200);
  });

  it("plan / customerId 未設定ならスルー", async () => {
    const app = new Hono<AppEnv>();
    app.use("*", usageCheckMiddleware);
    app.get("/ok", (c) => c.json({ ok: true }));
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.status).toBe(200);
  });

  it("429 レスポンスに Retry-After header が付く", async () => {
    const app = buildApp("free", "cust_e");
    await env.USAGE_LOGS.put(
      getMonthlyUsageKey("cust_e"),
      String(PLAN_MONTHLY_LIMITS.free)
    );
    const res = await app.fetch(new Request("http://localhost/ok"), env);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });
});
