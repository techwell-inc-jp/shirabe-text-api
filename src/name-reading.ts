/**
 * Shirabe Text API — 人名読み推定(pure 抽出ロジック)。
 *
 * Lindera で形態素解析後の token 列から、IPAdic 人名タグ(姓 / 名)が付いた
 * token の details[7](読み、片仮名)を抽出して family / given の読みに合成する。
 *
 * IPAdic only MVP の制約:
 *   - candidates(異読候補)は常に空 array(JMnedict 統合で 6 月以降 populate)
 *   - 人名タグが無い token の読みは surface fallback(精度劣化)
 *   - 著名人 80-90% / 一般 50-70% / 稀有 10-30% の精度想定
 *
 * 戦略は name-split と同型(POS マッチ + heuristic fallback)。
 *   - dictionary_both / family_only / given_only:該当 token の details[7] 採用
 *   - whitespace / heuristic:surface fallback、confidence 低下
 */
import { extractReading, type FuriganaKana, type TokenLike as FuriganaTokenLike } from "./furigana.js";
import { POS_FAMILY, POS_GIVEN, matchesPos, type TokenLike as NameSplitTokenLike } from "./name-split.js";

// furigana / name-split で同型の TokenLike を要求しているため alias で統一。
export type TokenLike = FuriganaTokenLike & NameSplitTokenLike;

export interface NameReadingResult {
  family: string;
  given: string;
  family_reading: string;
  given_reading: string;
  /** family_reading + given_reading の連結。 */
  reading: string;
  /** IPAdic only MVP では常に空 array。JMnedict 統合で 6 月以降 populate 予定。 */
  candidates: never[];
  confidence: number;
  warning?: "low_confidence" | "empty_input";
  matched_by:
    | "dictionary_both"
    | "dictionary_family_only"
    | "dictionary_given_only"
    | "whitespace"
    | "heuristic"
    | "empty";
}

function joinReading(tokens: TokenLike[], kana: FuriganaKana): string {
  return tokens.map((t) => extractReading(t, kana)).join("");
}

function joinSurface(tokens: TokenLike[]): string {
  return tokens.map((t) => t.surface).join("");
}

function trimWhitespaceTokens(tokens: TokenLike[]): TokenLike[] {
  let start = 0;
  let end = tokens.length;
  while (start < end && /^[\s　]+$/.test(tokens[start]!.surface)) start++;
  while (end > start && /^[\s　]+$/.test(tokens[end - 1]!.surface)) end--;
  return tokens.slice(start, end);
}

/**
 * tokenize 済みの token 列から family / given の読みを抽出する。
 *
 * @param kana "hiragana" | "katakana" — IPAdic は片仮名固定なので変換有無を制御
 */
export function readName(tokens: TokenLike[], kana: FuriganaKana): NameReadingResult {
  // 戦略 1: 隣接 family + given タグペア(IPAdic details[7] が直接使える)
  for (let i = 0; i < tokens.length - 1; i++) {
    if (matchesPos(tokens[i]!, POS_FAMILY) && matchesPos(tokens[i + 1]!, POS_GIVEN)) {
      const family = tokens[i]!.surface;
      const given = tokens[i + 1]!.surface;
      const family_reading = extractReading(tokens[i]!, kana);
      const given_reading = extractReading(tokens[i + 1]!, kana);
      return {
        family,
        given,
        family_reading,
        given_reading,
        reading: family_reading + given_reading,
        candidates: [],
        confidence: 0.97,
        matched_by: "dictionary_both",
      };
    }
  }

  const familyIdx = tokens.findIndex((t) => matchesPos(t, POS_FAMILY));
  const givenIdx = tokens.findIndex((t) => matchesPos(t, POS_GIVEN));

  // 戦略 2: family タグのみ → 後続 token を given として読み合成(タグ無し部分は surface fallback)
  if (familyIdx >= 0 && givenIdx < 0) {
    const familyToken = tokens[familyIdx]!;
    const givenTokens = trimWhitespaceTokens(tokens.slice(familyIdx + 1));
    if (givenTokens.length > 0) {
      const family_reading = extractReading(familyToken, kana);
      const given_reading = joinReading(givenTokens, kana);
      return {
        family: familyToken.surface,
        given: joinSurface(givenTokens),
        family_reading,
        given_reading,
        reading: family_reading + given_reading,
        candidates: [],
        confidence: 0.7,
        matched_by: "dictionary_family_only",
      };
    }
    const family_reading = extractReading(familyToken, kana);
    return {
      family: familyToken.surface,
      given: "",
      family_reading,
      given_reading: "",
      reading: family_reading,
      candidates: [],
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "dictionary_family_only",
    };
  }

  // 戦略 3: given タグのみ → 先行 token を family として読み合成
  if (givenIdx >= 0 && familyIdx < 0) {
    const givenToken = tokens[givenIdx]!;
    const familyTokens = trimWhitespaceTokens(tokens.slice(0, givenIdx));
    if (familyTokens.length > 0) {
      const family_reading = joinReading(familyTokens, kana);
      const given_reading = extractReading(givenToken, kana);
      return {
        family: joinSurface(familyTokens),
        given: givenToken.surface,
        family_reading,
        given_reading,
        reading: family_reading + given_reading,
        candidates: [],
        confidence: 0.7,
        matched_by: "dictionary_given_only",
      };
    }
    const given_reading = extractReading(givenToken, kana);
    return {
      family: "",
      given: givenToken.surface,
      family_reading: "",
      given_reading,
      reading: given_reading,
      candidates: [],
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "dictionary_given_only",
    };
  }

  // 戦略 4: 空白区切り(token 境界が空白 token と一致する場合のみ)
  // family / given 各セグメントの token 列を読みに合成
  const wsIdx = tokens.findIndex((t) => /^[\s　]+$/.test(t.surface));
  if (wsIdx > 0 && wsIdx < tokens.length - 1) {
    const familyTokens = tokens.slice(0, wsIdx);
    const givenTokens = tokens.slice(wsIdx + 1);
    // 残りに空白 token が無いことを確認(2 セグメント分割のみ)
    const hasMoreWs = givenTokens.some((t) => /^[\s　]+$/.test(t.surface));
    if (!hasMoreWs && familyTokens.length > 0 && givenTokens.length > 0) {
      const family_reading = joinReading(familyTokens, kana);
      const given_reading = joinReading(givenTokens, kana);
      return {
        family: joinSurface(familyTokens),
        given: joinSurface(givenTokens),
        family_reading,
        given_reading,
        reading: family_reading + given_reading,
        candidates: [],
        confidence: 0.6,
        matched_by: "whitespace",
      };
    }
  }

  // 戦略 5: heuristic fallback(空白除去後の長さに応じて分割)
  const fullText = joinSurface(tokens);
  const compact = fullText.replace(/[\s　]+/g, "");
  if (compact.length === 0) {
    return {
      family: "",
      given: "",
      family_reading: "",
      given_reading: "",
      reading: "",
      candidates: [],
      confidence: 0,
      warning: "empty_input",
      matched_by: "empty",
    };
  }
  if (compact.length === 1) {
    // 全 token から読み合成(surface fallback 含む)
    const reading = joinReading(tokens, kana);
    return {
      family: "",
      given: compact,
      family_reading: "",
      given_reading: reading,
      reading,
      candidates: [],
      confidence: 0.3,
      warning: "low_confidence",
      matched_by: "heuristic",
    };
  }
  // 全体読みは合成可能だが、family/given 個別の読みは token 境界とずれるため不可
  // → 全体 reading のみ提供、family_reading / given_reading は空 string + warning
  const reading = joinReading(tokens, kana).replace(/[\s　]+/g, "");
  const splitAt = compact.length === 2 ? 1 : 2;
  return {
    family: compact.slice(0, splitAt),
    given: compact.slice(splitAt),
    family_reading: "",
    given_reading: "",
    reading,
    candidates: [],
    confidence: 0.4,
    warning: "low_confidence",
    matched_by: "heuristic",
  };
}
