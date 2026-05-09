/**
 * usage-logger middleware のテスト(text API)。
 * 暦 API と同型 spec、`usage-monthly:` カウンターのインクリメントが
 * usage-check と整合することを保証する。
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  usageLoggerMiddleware,
  getUsageKey,
  getIndexKey,
  getMonthlyUsageKey,
} from "../../src/middleware/usage-logger.js";
import type { AppEnv } from "../../src/types/env.js";
import { MockKV, createMockEnv } from "../helpers/mock-kv.js";

describe("usageLoggerMiddleware", () => {
  let app: Hono<AppEnv>;
  let env: ReturnType<typeof createMockEnv>;
  const mockUsageKV = () => env.USAGE_LOGS as unknown as MockKV;

  beforeEach(() => {
    env = createMockEnv();
    app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("customerId", "cust_test");
      await next();
    });
    app.use("*", usageLoggerMiddleware);
    app.get("/ok", (c) => c.json({ ok: true }));
    app.get("/err", (c) => c.json({ error: "bad" }, 500));
  });

  it("正常レスポンスで日次カウンターが 1 増える", async () => {
    await app.fetch(new Request("http://localhost/ok"), env);
    expect(await env.USAGE_LOGS.get(getUsageKey("cust_test"))).toBe("1");
  });

  it("複数リクエストで日次カウンターが累積する", async () => {
    await app.fetch(new Request("http://localhost/ok"), env);
    await app.fetch(new Request("http://localhost/ok"), env);
    await app.fetch(new Request("http://localhost/ok"), env);
    expect(await env.USAGE_LOGS.get(getUsageKey("cust_test"))).toBe("3");
  });

  it("エラーレスポンスではカウントされない", async () => {
    await app.fetch(new Request("http://localhost/err"), env);
    expect(await env.USAGE_LOGS.get(getUsageKey("cust_test"))).toBeNull();
  });

  it("月間カウンター(usage-check 用)もインクリメントされる", async () => {
    await app.fetch(new Request("http://localhost/ok"), env);
    await app.fetch(new Request("http://localhost/ok"), env);
    const key = getMonthlyUsageKey("cust_test");
    expect(key).toMatch(/^usage-monthly:cust_test:\d{4}-\d{2}$/);
    expect(await env.USAGE_LOGS.get(key)).toBe("2");
  });

  it("エラー時は月間カウンターも増えない", async () => {
    await app.fetch(new Request("http://localhost/err"), env);
    expect(await env.USAGE_LOGS.get(getMonthlyUsageKey("cust_test"))).toBeNull();
  });

  it("日付インデックスに customerId が記録される", async () => {
    await app.fetch(new Request("http://localhost/ok"), env);
    const idx = await env.USAGE_LOGS.get(getIndexKey());
    expect(idx).toContain("cust_test");
  });

  it("customerId 未設定なら何も書かない", async () => {
    const noAuthApp = new Hono<AppEnv>();
    noAuthApp.use("*", usageLoggerMiddleware);
    noAuthApp.get("/ok", (c) => c.json({ ok: true }));
    await noAuthApp.fetch(new Request("http://localhost/ok"), env);
    expect(mockUsageKV().size).toBe(0);
  });
});

describe("usage-logger key generators", () => {
  it("getUsageKey 形式", () => {
    expect(getUsageKey("cust_x")).toMatch(/^usage:cust_x:\d{4}-\d{2}-\d{2}$/);
  });
  it("getIndexKey 形式", () => {
    expect(getIndexKey()).toMatch(/^usage-index:\d{4}-\d{2}-\d{2}$/);
  });
  it("getMonthlyUsageKey 形式", () => {
    expect(getMonthlyUsageKey("cust_x")).toMatch(/^usage-monthly:cust_x:\d{4}-\d{2}$/);
  });
});
