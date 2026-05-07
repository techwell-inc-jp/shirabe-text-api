/**
 * Shirabe Text API — ふりがな付与の pure 抽出ロジック。
 *
 * Lindera の Tokenizer は別ファイル(index.ts)で起動し、本モジュールは
 * 形態素解析後の各トークンから reading を取り出す純粋関数のみを提供する。
 * これにより Lindera を起動せずに reading 抽出ロジックをテスト可能。
 *
 * IPAdic v3.0.7 の details 配列(順序固定):
 *   [0] 品詞大分類, [1] 品詞中分類, [2] 品詞小分類, [3] 品詞詳細,
 *   [4] 活用型, [5] 活用形, [6] 原形, [7] 読み(片仮名), [8] 発音(片仮名)
 *
 * 漢字を含まないトークン(数字 / 記号 / ASCII)や未知語は details[7] が
 * 欠落 / "*" / 空となるため、surface を読みとして返す。
 */
import { toHiragana } from "./normalize.js";

export type FuriganaKana = "hiragana" | "katakana";

export interface TokenLike {
  surface: string;
  is_unknown: boolean;
  details: string[];
}

export interface FuriganaToken {
  surface: string;
  reading: string;
}

const READING_INDEX = 7;

/**
 * トークンから reading を抽出する。
 *
 * - IPAdic details[7] が有効値なら採用
 * - 未知語、details 欠落、reading が "*" / 空 の場合は surface fallback
 * - kanaMode に応じて hiragana / katakana 変換
 */
export function extractReading(
  token: TokenLike,
  kanaMode: FuriganaKana
): string {
  const raw = token.is_unknown ? "" : token.details[READING_INDEX] ?? "";
  const usable = raw && raw !== "*" ? raw : null;

  // 漢字を含まないトークンで reading が無い場合は surface(数字 / 記号 / ASCII)。
  // 漢字を含むのに reading が無い = 未知語 → surface fallback。
  const reading = usable ?? token.surface;

  // IPAdic reading は片仮名固定。要求が hiragana なら変換。
  // surface fallback の場合は変換不要(平仮名 / 漢字 / その他は触らない)。
  if (usable && kanaMode === "hiragana") {
    return toHiragana(reading);
  }
  return reading;
}

export function tokensToFurigana(
  tokens: TokenLike[],
  kanaMode: FuriganaKana
): FuriganaToken[] {
  return tokens.map((t) => ({
    surface: t.surface,
    reading: extractReading(t, kanaMode),
  }));
}

