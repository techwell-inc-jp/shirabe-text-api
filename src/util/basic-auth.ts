/**
 * Basic 認証ユーティリティ(INTERNAL_STATS_USER / INTERNAL_STATS_PASS)
 *
 * G-A Phase 1 /api/v1/text/internal/correlation エンドポイントで使用。
 * 定数時間比較で timing attack を回避。暦・住所 API と同設計。
 */
import type { Env } from "../types/env.js";

export type AuthResult = { ok: true } | { ok: false; message: string };

export function verifyBasicAuth(authHeader: string | undefined, env: Env): AuthResult {
  const expectedUser = env.INTERNAL_STATS_USER;
  const expectedPass = env.INTERNAL_STATS_PASS;
  if (!expectedUser || !expectedPass) {
    return { ok: false, message: "Internal stats credentials not configured" };
  }
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return { ok: false, message: "Missing or invalid Authorization header" };
  }
  const encoded = authHeader.slice("Basic ".length).trim();
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return { ok: false, message: "Invalid base64 in Authorization header" };
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) {
    return { ok: false, message: "Invalid Basic auth format" };
  }
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  const userOk = constantTimeEquals(user, expectedUser);
  const passOk = constantTimeEquals(pass, expectedPass);
  if (userOk && passOk) {
    return { ok: true };
  }
  return { ok: false, message: "Invalid credentials" };
}

export function constantTimeEquals(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
