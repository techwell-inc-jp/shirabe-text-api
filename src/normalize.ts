/**
 * Shirabe Text API — テキスト正規化(pure 関数、Lindera 不要)。
 *
 * Phase 1 範囲:
 *   - width: ASCII 全角 ↔ 半角(U+FF01-U+FF5E ↔ U+0021-U+007E、U+3000 ↔ U+0020)
 *   - kana:  平仮名 ↔ 片仮名(U+3041-U+3096 ↔ U+30A1-U+30F6、ゔ ↔ ヴ)
 *   - spaces: 連続空白 → 単一空白 / trim
 *
 * Phase 2 deferred(別 PR、Lindera 連携必要):
 *   - Sudachi 表記正規化(送り違い / 異体字 / 縮約)
 *   - 半角カナ → 全角カナ(濁点合成含む NFKC 部分適用)
 */

export type WidthMode = "half" | "full" | "preserve";
export type KanaMode = "hiragana" | "katakana" | "preserve";
export type SpacesMode = "single" | "trim" | "preserve";

export interface NormalizeOptions {
  width?: WidthMode;
  kana?: KanaMode;
  spaces?: SpacesMode;
}

export interface NormalizeChange {
  type: "width" | "kana" | "spaces";
  before: string;
  after: string;
}

export interface NormalizeResult {
  normalized: string;
  changes: NormalizeChange[];
}

const ASCII_FULL_START = 0xff01;
const ASCII_FULL_END = 0xff5e;
const ASCII_OFFSET = 0xfee0; // FF01 - 0021

const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KANA_OFFSET = 0x60; // 30A1 - 3041

const HIRAGANA_VU = 0x3094; // ゔ
const KATAKANA_VU = 0x30f4; // ヴ

function toHalfwidth(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= ASCII_FULL_START && code <= ASCII_FULL_END) {
      out += String.fromCodePoint(code - ASCII_OFFSET);
    } else if (code === 0x3000) {
      out += " ";
    } else {
      out += ch;
    }
  }
  return out;
}

function toFullwidth(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x21 && code <= 0x7e) {
      out += String.fromCodePoint(code + ASCII_OFFSET);
    } else if (code === 0x20) {
      out += "　";
    } else {
      out += ch;
    }
  }
  return out;
}

function toKatakana(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code === HIRAGANA_VU) {
      out += String.fromCodePoint(KATAKANA_VU);
    } else if (code >= HIRAGANA_START && code <= HIRAGANA_END) {
      out += String.fromCodePoint(code + KANA_OFFSET);
    } else {
      out += ch;
    }
  }
  return out;
}

export function toHiragana(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code === KATAKANA_VU) {
      out += String.fromCodePoint(HIRAGANA_VU);
    } else if (code >= KATAKANA_START && code <= KATAKANA_END) {
      out += String.fromCodePoint(code - KANA_OFFSET);
    } else {
      out += ch;
    }
  }
  return out;
}

function applyWidth(text: string, mode: WidthMode): string {
  if (mode === "half") return toHalfwidth(text);
  if (mode === "full") return toFullwidth(text);
  return text;
}

function applyKana(text: string, mode: KanaMode): string {
  if (mode === "katakana") return toKatakana(text);
  if (mode === "hiragana") return toHiragana(text);
  return text;
}

function applySpaces(text: string, mode: SpacesMode): string {
  if (mode === "preserve") return text;
  // 半角空白 / タブ / 全角空白を 1 単位として連続を 1 つに畳む
  const collapsed = text.replace(/[ \t　]+/g, " ");
  if (mode === "trim") return collapsed.trim();
  return collapsed;
}

export function normalizeText(
  text: string,
  options: NormalizeOptions = {}
): NormalizeResult {
  const width = options.width ?? "preserve";
  const kana = options.kana ?? "preserve";
  const spaces = options.spaces ?? "preserve";

  const changes: NormalizeChange[] = [];
  let current = text;

  const afterWidth = applyWidth(current, width);
  if (afterWidth !== current) {
    changes.push({ type: "width", before: current, after: afterWidth });
    current = afterWidth;
  }

  const afterKana = applyKana(current, kana);
  if (afterKana !== current) {
    changes.push({ type: "kana", before: current, after: afterKana });
    current = afterKana;
  }

  const afterSpaces = applySpaces(current, spaces);
  if (afterSpaces !== current) {
    changes.push({ type: "spaces", before: current, after: afterSpaces });
    current = afterSpaces;
  }

  return { normalized: current, changes };
}
