/**
 * API キー認証ミドルウェア(text API)
 *
 * - X-API-Key ヘッダーからキーを取得
 * - SHA-256 ハッシュ化して Cloudflare KV(暦・住所と共有 namespace)と照合
 * - キー形式: shrb_ + 32 文字ランダム
 * - ヘッダー未指定の場合は匿名 Free ユーザーとして通す
 * - 形式不正 / 未登録なら 401 INVALID_API_KEY
 * - 認証成功時、text API のプラン情報を c.set() で格納
 */
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/env.js";
import { resolveApiPlan, type StoredApiKeyInfo } from "../types/api-key.js";

const API_KEY_PATTERN = /^shrb_[a-zA-Z0-9]{32}$/;

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 匿名ユーザーの customerId を生成する。
 * `CF-Connecting-IP` を SHA-256 ハッシュ → 先頭 16 文字 + `anon_` プレフィックス。
 */
export async function getAnonymousId(c: Context<AppEnv>): Promise<string> {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const hash = await sha256Hex(ip);
  return `anon_${hash.slice(0, 16)}`;
}

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    c.set("plan", "free");
    c.set("customerId", await getAnonymousId(c));
    c.set("apiKeyHash", "");
    c.set("apiKeyIdHash", "");
    await next();
    return;
  }

  if (!API_KEY_PATTERN.test(apiKey)) {
    return c.json(
      {
        error: {
          code: "INVALID_API_KEY",
          message: "Invalid or missing API key. Include X-API-Key header.",
        },
      },
      401
    );
  }

  const hash = await hashApiKey(apiKey);
  const keyInfoStr = await c.env.API_KEYS.get(hash);

  if (!keyInfoStr) {
    return c.json(
      {
        error: {
          code: "INVALID_API_KEY",
          message: "Invalid or missing API key. Include X-API-Key header.",
        },
      },
      401
    );
  }

  const stored: StoredApiKeyInfo = JSON.parse(keyInfoStr);
  const planInfo = resolveApiPlan(stored, "text");

  // text API のプランが未設定(暦 / 住所のみ契約の顧客が text にアクセス)→ 匿名 Free 扱い
  if (!planInfo) {
    c.set("plan", "free");
    c.set("customerId", stored.customerId);
    c.set("apiKeyHash", hash);
    c.set("apiKeyIdHash", hash.slice(0, 16));
    await next();
    return;
  }

  if (planInfo.status === "suspended") {
    return c.json(
      {
        error: {
          code: "API_KEY_SUSPENDED",
          message:
            "API key suspended due to payment failure. Update payment at: https://shirabe.dev/billing",
        },
      },
      403
    );
  }

  c.set("plan", planInfo.plan);
  c.set("customerId", stored.customerId);
  c.set("apiKeyHash", hash);
  c.set("apiKeyIdHash", hash.slice(0, 16));

  await next();
}

export { hashApiKey };
