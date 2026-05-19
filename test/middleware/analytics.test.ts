import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { analyticsMiddleware } from "../../src/middleware/analytics.js";
import { MockAnalyticsEngine } from "../helpers/mock-kv.js";
import type { AppEnv } from "../../src/types/env.js";

function makeApp(analytics: MockAnalyticsEngine) {
  const app = new Hono<AppEnv>();
  app.use("*", analyticsMiddleware);

  // auth-less routes (subset of production)
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/api/v1/text/llms.txt", (c) =>
    c.body("# Shirabe Text API", 200, { "Content-Type": "text/markdown; charset=utf-8" })
  );
  app.get("/api/v1/text/openapi.yaml", (c) =>
    c.body("openapi: 3.1.0", 200, { "Content-Type": "application/yaml" })
  );
  app.get("/docs/text-tokenize", (c) => c.html("<html></html>"));
  app.get("/announcements/2026-05-18", (c) => c.html("<html></html>"));

  // authed-like route(plan を context にセットして api_call として記録される条件を再現)
  app.get("/api/v1/text/tokenize", (c) => {
    c.set("plan", "free");
    c.set("apiKeyIdHash", "abcdef0123456789");
    return c.json({ tokens: [] });
  });

  // env binding に analytics を流し込むため、Hono の Bindings を上書き
  const env = {
    ANALYTICS: analytics,
    API_VERSION: "0.1.0-test",
  } as unknown as AppEnv["Bindings"];

  return { app, env };
}

describe("analyticsMiddleware — text API 用記録", () => {
  let analytics: MockAnalyticsEngine;

  beforeEach(() => {
    analytics = new MockAnalyticsEngine();
  });

  it("/health 経由で 1 書込、blob 順序 = [ua_cat, ai_vendor, ref_type, ref_vendor, endpoint_kind, path, plan, api_key_hash, tool_hint, content_platform]", async () => {
    const { app, env } = makeApp(analytics);
    const res = await app.request("/health", {}, env);

    expect(res.status).toBe(200);
    expect(analytics.size).toBe(1);
    const pt = analytics.points[0]!;
    expect(pt.blobs).toHaveLength(10);
    expect(pt.blobs![4]).toBe("health"); // endpoint_kind
    expect(pt.blobs![5]).toBe("/health"); // normalized path
    expect(pt.blobs![6]).toBe("anonymous"); // plan unset → anonymous
    expect(pt.blobs![7]).toBe("none"); // apiKeyIdHash unset → none
    expect(pt.doubles).toEqual([200, 1, expect.any(Number)]);
    expect(pt.indexes).toEqual(["health"]);
  });

  it("/api/v1/text/llms.txt は docs_view 分類で記録", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/api/v1/text/llms.txt", {}, env);

    expect(analytics.size).toBe(1);
    const pt = analytics.points[0]!;
    expect(pt.blobs![4]).toBe("docs_view");
    expect(pt.blobs![5]).toBe("/api/v1/text/llms.txt");
  });

  it("/api/v1/text/openapi.yaml は openapi_view 分類で記録(api_call ではない)", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/api/v1/text/openapi.yaml", {}, env);

    expect(analytics.size).toBe(1);
    expect(analytics.points[0]!.blobs![4]).toBe("openapi_view");
  });

  it("/docs/text-tokenize は docs_view 分類で記録", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/docs/text-tokenize", {}, env);

    expect(analytics.size).toBe(1);
    expect(analytics.points[0]!.blobs![4]).toBe("docs_view");
  });

  it("/announcements/2026-05-18 は docs_view 分類で記録", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/announcements/2026-05-18", {}, env);

    expect(analytics.size).toBe(1);
    expect(analytics.points[0]!.blobs![4]).toBe("docs_view");
  });

  it("/api/v1/text/tokenize は api_call 分類、plan + apiKeyIdHash を Context から拾う", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/api/v1/text/tokenize", {}, env);

    expect(analytics.size).toBe(1);
    const pt = analytics.points[0]!;
    expect(pt.blobs![4]).toBe("api_call");
    expect(pt.blobs![6]).toBe("free");
    expect(pt.blobs![7]).toBe("abcdef0123456789");
    expect(pt.doubles![1]).toBe(1); // success flag
  });

  it("AI クローラー UA を ai 分類 + vendor 検出", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/api/v1/text/llms.txt", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GPTBot/1.0)" },
    }, env);

    expect(analytics.size).toBe(1);
    const pt = analytics.points[0]!;
    expect(pt.blobs![0]).toBe("ai");
    expect(pt.blobs![1]).toBe("openai");
  });

  it("AI 検索 Referrer を ai_search 分類 + vendor 検出", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/docs/text-tokenize", {
      headers: { Referer: "https://chatgpt.com/share/abc" },
    }, env);

    expect(analytics.size).toBe(1);
    const pt = analytics.points[0]!;
    expect(pt.blobs![2]).toBe("ai_search");
    expect(pt.blobs![3]).toBe("chatgpt");
  });

  it("Qiita Referrer を content_platform=qiita で記録(B-2 仮説観測)", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/docs/text-tokenize", {
      headers: { Referer: "https://qiita.com/yosikawa-techwell/items/abc" },
    }, env);

    expect(analytics.size).toBe(1);
    expect(analytics.points[0]!.blobs![9]).toBe("qiita");
  });

  it("Zenn Referrer を content_platform=zenn で記録", async () => {
    const { app, env } = makeApp(analytics);
    await app.request("/docs/text-tokenize", {
      headers: { Referer: "https://zenn.dev/shirabe_dev/articles/abc" },
    }, env);

    expect(analytics.size).toBe(1);
    expect(analytics.points[0]!.blobs![9]).toBe("zenn");
  });

  it("ANALYTICS binding 未設定でも middleware は throw せず request は成功", async () => {
    const { app } = makeApp(analytics);
    // ANALYTICS を含まない env を渡す
    const envWithoutAE = { API_VERSION: "0.1.0-test" } as unknown as AppEnv["Bindings"];
    const res = await app.request("/health", {}, envWithoutAE);

    expect(res.status).toBe(200);
    expect(analytics.size).toBe(0); // 渡された mock には書かれない
  });

  it("writeDataPoint が throw しても request は影響なし(計測失敗 = side effect)", async () => {
    const { app, env } = makeApp(analytics);
    analytics.throwOnWrite = true;

    const res = await app.request("/health", {}, env);

    expect(res.status).toBe(200);
    expect(analytics.size).toBe(0); // throw で push されない
  });
});
