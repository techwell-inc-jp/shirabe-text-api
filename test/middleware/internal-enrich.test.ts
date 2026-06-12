/**
 * 案 X: 内部 enrich subrequest 非計上の honor テスト(text API 版)
 *
 * calendar の enrich endpoint が same-zone subrequest(name-split / name-reading)に載せる
 * `X-Shirabe-Internal` を `INTERNAL_ENRICH_TOKEN` と照合し、一致時のみ「課金対象外 internal
 * 扱い」とする:
 *   - usageCheckMiddleware: 月間上限ゲートをバイパス(上限超過でも 429 にしない)
 *   - usageLoggerMiddleware: KV カウントを計上しない
 *
 * fail-closed: トークン未設定・ヘッダ欠如・不一致では通常どおり計上する。
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  isInternalEnrichRequest,
  INTERNAL_ENRICH_HEADER,
} from "../../src/util/internal-request.js";
import {
  usageCheckMiddleware,
  getMonthlyUsageKey,
  MONTHLY_USAGE_LIMITS,
} from "../../src/middleware/usage-check.js";
import { usageLoggerMiddleware } from "../../src/middleware/usage-logger.js";
import type { AppEnv } from "../../src/types/env.js";
import { createMockEnv } from "../helpers/mock-kv.js";

const TOKEN = "test-enrich-token";
const FREE_LIMIT = MONTHLY_USAGE_LIMITS.free;

/** INTERNAL_ENRICH_TOKEN を投入した mock env を作る(null で未設定を表す)。 */
function createEnvWithToken(token: string | null = TOKEN) {
  return { ...createMockEnv(), INTERNAL_ENRICH_TOKEN: token ?? undefined };
}

describe("text API isInternalEnrichRequest(案 X)", () => {
  function probeApp() {
    const a = new Hono<AppEnv>();
    a.get("/probe", (c) => c.json({ internal: isInternalEnrichRequest(c) }));
    return a;
  }

  async function probe(env: ReturnType<typeof createEnvWithToken>, headers?: Record<string, string>) {
    const res = await probeApp().fetch(
      new Request("http://localhost/probe", { headers }),
      env as unknown as Record<string, unknown>
    );
    return (await res.json()) as { internal: boolean };
  }

  it("トークン一致で true", async () => {
    const body = await probe(createEnvWithToken(), { [INTERNAL_ENRICH_HEADER]: TOKEN });
    expect(body.internal).toBe(true);
  });

  it("ヘッダ欠如で false", async () => {
    const body = await probe(createEnvWithToken());
    expect(body.internal).toBe(false);
  });

  it("トークン不一致で false", async () => {
    const body = await probe(createEnvWithToken(), { [INTERNAL_ENRICH_HEADER]: "wrong-token" });
    expect(body.internal).toBe(false);
  });

  it("INTERNAL_ENRICH_TOKEN 未設定なら一致ヘッダがあっても false(fail-closed)", async () => {
    const body = await probe(createEnvWithToken(null), { [INTERNAL_ENRICH_HEADER]: TOKEN });
    expect(body.internal).toBe(false);
  });
});

describe("text API usageCheckMiddleware × 案 X バイパス", () => {
  let env: ReturnType<typeof createEnvWithToken>;

  function buildApp() {
    const a = new Hono<AppEnv>();
    a.use("*", async (c, next) => {
      c.set("plan", "free");
      c.set("customerId", "anon_internal");
      await next();
    });
    a.use("*", usageCheckMiddleware);
    a.get("/test", (c) => c.json({ ok: true }));
    return a;
  }

  beforeEach(() => {
    env = createEnvWithToken();
  });

  it("上限到達でも正規 internal ヘッダなら 429 にせず通過(非ゲート)", async () => {
    await env.USAGE_LOGS.put(getMonthlyUsageKey("anon_internal"), String(FREE_LIMIT));
    const res = await buildApp().fetch(
      new Request("http://localhost/test", { headers: { [INTERNAL_ENRICH_HEADER]: TOKEN } }),
      env as unknown as Record<string, unknown>
    );
    expect(res.status).toBe(200);
  });

  it("internal ヘッダなしは従来どおり上限到達で 429", async () => {
    await env.USAGE_LOGS.put(getMonthlyUsageKey("anon_internal"), String(FREE_LIMIT));
    const res = await buildApp().fetch(
      new Request("http://localhost/test"),
      env as unknown as Record<string, unknown>
    );
    expect(res.status).toBe(429);
  });
});

describe("text API usageLoggerMiddleware × 案 X 非計上", () => {
  let env: ReturnType<typeof createEnvWithToken>;

  function buildApp() {
    const a = new Hono<AppEnv>();
    a.use("*", async (c, next) => {
      c.set("plan", "free");
      c.set("customerId", "anon_internal");
      await next();
    });
    a.use("*", usageLoggerMiddleware);
    a.get("/test", (c) => c.json({ ok: true }));
    return a;
  }

  beforeEach(() => {
    env = createEnvWithToken();
  });

  it("正規 internal ヘッダなら月間カウントを増やさない", async () => {
    await buildApp().fetch(
      new Request("http://localhost/test", { headers: { [INTERNAL_ENRICH_HEADER]: TOKEN } }),
      env as unknown as Record<string, unknown>
    );
    const v = await env.USAGE_LOGS.get(getMonthlyUsageKey("anon_internal"));
    expect(v).toBeNull();
  });

  it("internal ヘッダなしは従来どおり月間カウントを 1 加算する", async () => {
    await buildApp().fetch(
      new Request("http://localhost/test"),
      env as unknown as Record<string, unknown>
    );
    const v = await env.USAGE_LOGS.get(getMonthlyUsageKey("anon_internal"));
    expect(v).toBe("1");
  });
});
