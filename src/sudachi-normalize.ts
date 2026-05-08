/**
 * Shirabe Text API — Phase 3 Sudachi 正規化(SudachiDict normalized_form の lookup 適用)。
 *
 * Lindera + IPAdic で tokenize 済み token 列を入力に取り、SudachiDict から抽出した
 * `surface → normalized_form` map で各 token を置換、normalize 後のテキストを
 * 連結して返す pure 関数。Lindera 起動なしでテスト可能。
 *
 * ## 設計
 *
 * - **lookup 単位 = IPAdic token surface**(longest-match 再 tokenize は将来検討):
 *   - IPAdic 1 token = SudachiDict 1 entry の対応が成立する surface のみ正規化
 *   - 例: "行なう" → "行う"(完全一致 1 token)
 *   - 例: "コンピュータ" → "コンピューター"(完全一致 1 token)
 *   - IPAdic が "コンピュータ" を分割して tokenize した場合は miss(IPAdic は基本的に
 *     カタカナ語を 1 token として扱うため実害は限定的、5/31 MVP の trade-off)
 *
 * - **changes 出力**: 元 surface と置換後を before/after で記録、AI agent が
 *   何が変わったか観察できる(他の Phase と同じ pattern)。
 *
 * - **license**: SudachiDict は Apache-2.0、attribution 義務を index.ts route の
 *   `attribution.dictionary` で履行。
 */
import type { NormalizeChange } from "./normalize.js";

export type SudachiMode = "apply" | "preserve";

export interface SudachiTokenLike {
  surface: string;
  is_unknown: boolean;
}

export interface SudachiNormalizeResult {
  normalized: string;
  changes: NormalizeChange[];
}

/**
 * tokens を SudachiDict map で lookup → 正規化テキストを連結。
 *
 * - 未知語(is_unknown)はスキップ(SudachiDict が見出し化しても信頼度低)
 * - map に hit しなかった token は surface をそのまま採用
 * - 連続 hit でも 1 changes に集約せず token 単位で記録(差分追跡明示)
 */
export function sudachiNormalize(
  tokens: SudachiTokenLike[],
  map: Readonly<Record<string, string>>
): SudachiNormalizeResult {
  const out: string[] = [];
  const changes: NormalizeChange[] = [];

  for (const t of tokens) {
    const s = t.surface;
    if (t.is_unknown) {
      out.push(s);
      continue;
    }
    const normalized = map[s];
    if (normalized !== undefined && normalized !== s) {
      out.push(normalized);
      changes.push({ type: "sudachi", before: s, after: normalized });
    } else {
      out.push(s);
    }
  }

  return { normalized: out.join(""), changes };
}
