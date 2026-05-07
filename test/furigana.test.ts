import { describe, it, expect } from "vitest";
import {
  extractReading,
  tokensToFurigana,
  type TokenLike,
} from "../src/furigana.js";

/** IPAdic details の最小再現(reading 位置 = index 7)。 */
function tok(
  surface: string,
  reading: string,
  is_unknown = false
): TokenLike {
  return {
    surface,
    is_unknown,
    details: ["名詞", "一般", "*", "*", "*", "*", surface, reading, reading],
  };
}

describe("extractReading", () => {
  it("kanji token: katakana reading → hiragana when kana=hiragana", () => {
    const t = tok("東京", "トウキョウ");
    expect(extractReading(t, "hiragana")).toBe("とうきょう");
  });

  it("kanji token: keeps katakana when kana=katakana", () => {
    const t = tok("東京", "トウキョウ");
    expect(extractReading(t, "katakana")).toBe("トウキョウ");
  });

  it("ASCII / numeric: details[7] = '*' → surface fallback", () => {
    const t: TokenLike = {
      surface: "ABC",
      is_unknown: false,
      details: ["名詞", "固有", "*", "*", "*", "*", "ABC", "*", "*"],
    };
    expect(extractReading(t, "hiragana")).toBe("ABC");
    expect(extractReading(t, "katakana")).toBe("ABC");
  });

  it("punctuation: details[7] empty → surface fallback", () => {
    const t: TokenLike = {
      surface: "。",
      is_unknown: false,
      details: ["記号", "句点", "*", "*", "*", "*", "。", "", ""],
    };
    expect(extractReading(t, "hiragana")).toBe("。");
  });

  it("unknown token: is_unknown=true → surface fallback even if details has reading", () => {
    const t: TokenLike = {
      surface: "魎魅",
      is_unknown: true,
      details: ["名詞", "一般", "*", "*", "*", "*", "魎魅", "リョウミ", "リョウミ"],
    };
    expect(extractReading(t, "hiragana")).toBe("魎魅");
  });

  it("missing details (short array) → surface fallback", () => {
    const t: TokenLike = {
      surface: "ほげ",
      is_unknown: false,
      details: ["名詞"],
    };
    expect(extractReading(t, "hiragana")).toBe("ほげ");
  });

  it("hiragana surface: details[7] = カタカナ → 変換して同等の hiragana に戻る", () => {
    const t = tok("あい", "アイ");
    expect(extractReading(t, "hiragana")).toBe("あい");
  });
});

describe("tokensToFurigana", () => {
  it("maps multiple tokens preserving order", () => {
    const tokens: TokenLike[] = [
      tok("東京", "トウキョウ"),
      tok("都", "ト"),
      {
        surface: "で",
        is_unknown: false,
        details: ["助詞", "*", "*", "*", "*", "*", "で", "デ", "デ"],
      },
    ];
    expect(tokensToFurigana(tokens, "hiragana")).toEqual([
      { surface: "東京", reading: "とうきょう" },
      { surface: "都", reading: "と" },
      { surface: "で", reading: "で" },
    ]);
  });

  it("empty input → empty output", () => {
    expect(tokensToFurigana([], "hiragana")).toEqual([]);
  });
});
