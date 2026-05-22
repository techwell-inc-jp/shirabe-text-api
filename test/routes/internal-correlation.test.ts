/**
 * G-A Phase 1: /api/v1/text/internal/correlation エンドポイントのテスト
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { internalCorrelation } from "../../src/routes/internal-correlation.js";
import { verifyBasicAuth, constantTimeEquals } from "../../src/util/basic-auth.js";
import type { AppEnv } from "../../src/types/env.js";
import { createMockEnv } from "../helpers/mock-kv.js";

function makeApp(env: ReturnType<typeof createMockEnv>) {
  const app = new Hono<AppEnv>();
  app.route("/api/v1/text/internal", internalCorrelation);
  return {
    app,
    env: {
      ...env,
      INTERNAL_STATS_USER: "admin",
      INTERNAL_STATS_PASS: "secret",
    },
  };
}

function basicAuth(user: string, pass: string): string {
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

describe("constantTimeEquals", () => {
  it("同一文字列は true", () => {
    expect(constantTimeEquals("abc", "abc")).toBe(true);
  });
  it("異なる文字列は false", () => {
    expect(constantTimeEquals("abc", "abd")).toBe(false);
  });
});

describe("verifyBasicAuth", () => {
  it("Secrets 未設定で全拒否(本番 routes 活性化前 default)", () => {
    const result = verifyBasicAuth("Basic " + btoa("admin:secret"), {} as any);
    expect(result.ok).toBe(false);
  });
  it("正しい credential で ok", () => {
    const result = verifyBasicAuth("Basic " + btoa("admin:secret"), {
      INTERNAL_STATS_USER: "admin",
      INTERNAL_STATS_PASS: "secret",
    } as any);
    expect(result.ok).toBe(true);
  });
});

describe("GET /api/v1/text/internal/correlation — Basic 認証", () => {
  it("Authorization ヘッダー欠落で 401", async () => {
    const { app, env } = makeApp(createMockEnv());
    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation"),
      env
    );
    expect(res.status).toBe(401);
  });

  it("誤資格情報で 401", async () => {
    const { app, env } = makeApp(createMockEnv());
    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation", {
        headers: { Authorization: basicAuth("admin", "wrong") },
      }),
      env
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/text/internal/correlation — エントリ読出", () => {
  let app: Hono<AppEnv>;
  let env: ReturnType<typeof makeApp>["env"];

  beforeEach(() => {
    const made = makeApp(createMockEnv());
    app = made.app;
    env = made.env;
  });

  it("エントリ 0 件で空配列", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation", {
        headers: { Authorization: basicAuth("admin", "secret") },
      }),
      env
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.api).toBe("text");
    expect(body.entries).toEqual([]);
  });

  it("correlation エントリを email_sha256 付きで返す", async () => {
    await (env.USAGE_LOGS as unknown as KVNamespace).put(
      "correlation:hash_text_1",
      JSON.stringify({
        api: "text",
        stripe_customer_id: "cus_text_1",
        plan: "starter",
        status: "active",
        subscribed_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-06-01T10:00:00.000Z",
      })
    );

    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation", {
        headers: { Authorization: basicAuth("admin", "secret") },
      }),
      env
    );
    const body: any = await res.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].email_sha256).toBe("hash_text_1");
    expect(body.entries[0].api).toBe("text");
  });

  it("非 correlation prefix のキーは含まない", async () => {
    await (env.USAGE_LOGS as unknown as KVNamespace).put(
      "correlation:keep",
      JSON.stringify({ api: "text", plan: "free", status: "active", subscribed_at: "t", updated_at: "t" })
    );
    await (env.USAGE_LOGS as unknown as KVNamespace).put("email:user@example.com", "hash");

    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation", {
        headers: { Authorization: basicAuth("admin", "secret") },
      }),
      env
    );
    const body: any = await res.json();
    expect(body.entries).toHaveLength(1);
  });

  it("破損 JSON はスキップ", async () => {
    await (env.USAGE_LOGS as unknown as KVNamespace).put(
      "correlation:good",
      JSON.stringify({ api: "text", plan: "starter", status: "active", subscribed_at: "t", updated_at: "t" })
    );
    await (env.USAGE_LOGS as unknown as KVNamespace).put("correlation:broken", "not-json{");

    const res = await app.fetch(
      new Request("http://localhost/api/v1/text/internal/correlation", {
        headers: { Authorization: basicAuth("admin", "secret") },
      }),
      env
    );
    const body: any = await res.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].email_sha256).toBe("good");
  });
});
