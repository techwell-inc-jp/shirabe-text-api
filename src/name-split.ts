/**
 * Shirabe Text API — 姓名分割(pure 抽出ロジック)。
 *
 * Lindera で形態素解析後の token 列から、IPAdic v3.0.7 の人名タグ:
 *   details[0]=名詞, [1]=固有名詞, [2]=人名, [3]=姓 / 名
 * を頼りに family / given を抽出する純粋関数。Lindera を起動せずにテスト可能。
 *
 * IPAdic only MVP の精度想定(memory `feedback_no_implicit_plan_change.md` 準拠の
 * 公開 narrative):著名人 80-90% / 一般 50-70% / 稀有 10-30%。
 * 6 月モノレポ化時に JMnedict user dictionary 統合で底上げ予定(unilateral good news)。
 *
 * 戦略(優先順):
 *   1. 隣接する 人名-姓 + 人名-名 token 連 → confidence 0.97
 *   2. 人名-姓 のみ tagged → 後続 token 列を given とみなす(0.7)
 *   3. 人名-名 のみ tagged → 先行 token 列を family とみなす(0.7)
 *   4. 空白区切りで 2 セグメントに分割可能 → 0.6
 *   5. heuristic fallback(2 文字姓 + 残り、ただし 2 文字 = 1+1)→ 0.4 + warning
 *   6. 1 文字 / 空入力 → 0 / 0.3 + warning
 *
 * confidence < 0.5 で warning="low_confidence" を同梱(AI agent ergonomics)。
 */

export interface TokenLike {
  surface: string;
  is_unknown: boolean;
  details: string[];
}

export interface NameSplitResult {
  family: string;
  given: string;
  confidence: number;
  warning?: "low_confidence" | "empty_input";
  /** debug 用、tagged token を直接観察できるようにする(AI agent narrative)。 */
  matched_by: "dictionary_both" | "dictionary_family_only" | "dictionary_given_only" | "whitespace" | "heuristic" | "empty";
}

export const POS_FAMILY: readonly [string, string, string, string] = [
  "名詞",
  "固有名詞",
  "人名",
  "姓",
];
export const POS_GIVEN: readonly [string, string, string, string] = [
  "名詞",
  "固有名詞",
  "人名",
  "名",
];

export function matchesPos(token: TokenLike, target: readonly string[]): boolean {
  if (token.is_unknown) return false;
  for (let i = 0; i < target.length; i++) {
    if (token.details[i] !== target[i]) return false;
  }
  return true;
}

function joinSurface(tokens: TokenLike[]): string {
  return tokens.map((t) => t.surface).join("");
}

/**
 * tokenize 済みの token 列から family / given を抽出する。
 *
 * 入力 token 列の surface 連結 = 元入力 text。空白も token として含まれることに注意。
 */
export function splitName(tokens: TokenLike[]): NameSplitResult {
  // 戦略 1: 隣接する family + given タグペアを探す(最強シグナル)
  for (let i = 0; i < tokens.length - 1; i++) {
    if (matchesPos(tokens[i]!, POS_FAMILY) && matchesPos(tokens[i + 1]!, POS_GIVEN)) {
      return {
        family: tokens[i]!.surface,
        given: tokens[i + 1]!.surface,
        confidence: 0.97,
        matched_by: "dictionary_both",
      };
    }
  }

  const familyIdx = tokens.findIndex((t) => matchesPos(t, POS_FAMILY));
  const givenIdx = tokens.findIndex((t) => matchesPos(t, POS_GIVEN));

  // 戦略 2: family タグのみ → 後続を given として吸収
  if (familyIdx >= 0 && givenIdx < 0) {
    const family = tokens[familyIdx]!.surface;
    const given = joinSurface(tokens.slice(familyIdx + 1)).replace(/^[\s　]+|[\s　]+$/g, "");
    if (given) {
      return { family, given, confidence: 0.7, matched_by: "dictionary_family_only" };
    }
    // family のみで given 無し → 入力が姓のみ
    return {
      family,
      given: "",
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "dictionary_family_only",
    };
  }

  // 戦略 3: given タグのみ → 先行を family として吸収
  if (givenIdx >= 0 && familyIdx < 0) {
    const given = tokens[givenIdx]!.surface;
    const family = joinSurface(tokens.slice(0, givenIdx)).replace(/^[\s　]+|[\s　]+$/g, "");
    if (family) {
      return { family, given, confidence: 0.7, matched_by: "dictionary_given_only" };
    }
    return {
      family: "",
      given,
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "dictionary_given_only",
    };
  }

  // 戦略 4: 空白区切り
  const fullText = joinSurface(tokens);
  const wsMatch = fullText.match(/^([^\s　]+)[\s　]+([^\s　]+)$/);
  if (wsMatch) {
    return {
      family: wsMatch[1]!,
      given: wsMatch[2]!,
      confidence: 0.6,
      matched_by: "whitespace",
    };
  }

  // 戦略 5: heuristic fallback(空白除去後の長さに応じて分割位置決定)
  const compact = fullText.replace(/[\s　]+/g, "");
  if (compact.length === 0) {
    return {
      family: "",
      given: "",
      confidence: 0,
      warning: "empty_input",
      matched_by: "empty",
    };
  }
  if (compact.length === 1) {
    return {
      family: "",
      given: compact,
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "heuristic",
    };
  }
  // 2 文字 = 1+1、3 文字 = 2+1、4 文字以上 = 2+残り(統計的に 2 文字姓が多数派)
  const splitAt = compact.length === 2 ? 1 : 2;
  return {
    family: compact.slice(0, splitAt),
    given: compact.slice(splitAt),
    confidence: 0.4,
    warning: "low_confidence",
    matched_by: "heuristic",
  };
}
