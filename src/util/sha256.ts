/**
 * SHA-256 ハッシュを 16 進文字列で返す共通ユーティリティ(全 64 文字)
 *
 * G-A Phase 1 cross-API correlation で email を hash 化するために使用。
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
