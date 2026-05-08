/**
 * Shirabe Text API — テキスト正規化(pure 関数、Lindera 不要)。
 *
 * Phase 1 範囲:
 *   - width: ASCII 全角 ↔ 半角(U+FF01-U+FF5E ↔ U+0021-U+007E、U+3000 ↔ U+0020)
 *   - kana:  平仮名 ↔ 片仮名(U+3041-U+3096 ↔ U+30A1-U+30F6、ゔ ↔ ヴ)
 *   - spaces: 連続空白 → 単一空白 / trim
 *
 * Phase 2(本ファイル、pure 関数で済む範囲):
 *   - halfwidth_kana: 半角カナ → 全角カタカナ(濁点・半濁点合成、句読点)
 *
 * Phase 3 deferred(Lindera 連携必要、別 PR):
 *   - Sudachi 表記正規化(送り違い / 異体字 / 縮約)
 */

export type WidthMode = "half" | "full" | "preserve";
export type KanaMode = "hiragana" | "katakana" | "preserve";
export type SpacesMode = "single" | "trim" | "preserve";
export type HalfwidthKanaMode = "expand" | "preserve";
/** Phase 3: SudachiDict normalized_form 適用(Lindera tokenize 必要)。 */
export type SudachiMode = "apply" | "preserve";

export interface NormalizeOptions {
  width?: WidthMode;
  kana?: KanaMode;
  spaces?: SpacesMode;
  halfwidth_kana?: HalfwidthKanaMode;
  sudachi?: SudachiMode;
}

export interface NormalizeChange {
  type: "width" | "kana" | "spaces" | "halfwidth_kana" | "sudachi";
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

/**
 * 半角カタカナ U+FF61-U+FF9D → 全角カタカナの基本マッピング。
 * 濁点 (ﾞ U+FF9E) / 半濁点 (ﾟ U+FF9F) は次の DAKU_MAP / HANDAKU_MAP で
 * 1 文字目との合成として処理する。
 */
const HALF_TO_FULL_KANA: Readonly<Record<string, string>> = {
  "｡": "。",
  "｢": "「",
  "｣": "」",
  "､": "、",
  "･": "・",
  ｦ: "ヲ",
  ｧ: "ァ",
  ｨ: "ィ",
  ｩ: "ゥ",
  ｪ: "ェ",
  ｫ: "ォ",
  ｬ: "ャ",
  ｭ: "ュ",
  ｮ: "ョ",
  ｯ: "ッ",
  ｰ: "ー",
  ｱ: "ア",
  ｲ: "イ",
  ｳ: "ウ",
  ｴ: "エ",
  ｵ: "オ",
  ｶ: "カ",
  ｷ: "キ",
  ｸ: "ク",
  ｹ: "ケ",
  ｺ: "コ",
  ｻ: "サ",
  ｼ: "シ",
  ｽ: "ス",
  ｾ: "セ",
  ｿ: "ソ",
  ﾀ: "タ",
  ﾁ: "チ",
  ﾂ: "ツ",
  ﾃ: "テ",
  ﾄ: "ト",
  ﾅ: "ナ",
  ﾆ: "ニ",
  ﾇ: "ヌ",
  ﾈ: "ネ",
  ﾉ: "ノ",
  ﾊ: "ハ",
  ﾋ: "ヒ",
  ﾌ: "フ",
  ﾍ: "ヘ",
  ﾎ: "ホ",
  ﾏ: "マ",
  ﾐ: "ミ",
  ﾑ: "ム",
  ﾒ: "メ",
  ﾓ: "モ",
  ﾔ: "ヤ",
  ﾕ: "ユ",
  ﾖ: "ヨ",
  ﾗ: "ラ",
  ﾘ: "リ",
  ﾙ: "ル",
  ﾚ: "レ",
  ﾛ: "ロ",
  ﾜ: "ワ",
  ﾝ: "ン",
};

/** 濁点合成: 全角清音カタカナ → 全角濁音カタカナ */
const DAKU_MAP: Readonly<Record<string, string>> = {
  ウ: "ヴ",
  カ: "ガ",
  キ: "ギ",
  ク: "グ",
  ケ: "ゲ",
  コ: "ゴ",
  サ: "ザ",
  シ: "ジ",
  ス: "ズ",
  セ: "ゼ",
  ソ: "ゾ",
  タ: "ダ",
  チ: "ヂ",
  ツ: "ヅ",
  テ: "デ",
  ト: "ド",
  ハ: "バ",
  ヒ: "ビ",
  フ: "ブ",
  ヘ: "ベ",
  ホ: "ボ",
};

/** 半濁点合成: 全角清音カタカナ(ハ行)→ 全角半濁音カタカナ */
const HANDAKU_MAP: Readonly<Record<string, string>> = {
  ハ: "パ",
  ヒ: "ピ",
  フ: "プ",
  ヘ: "ペ",
  ホ: "ポ",
};

const HALFWIDTH_DAKUTEN = "ﾞ"; // ﾞ
const HALFWIDTH_HANDAKUTEN = "ﾟ"; // ﾟ
const STANDALONE_DAKUTEN = "゛"; // ゛
const STANDALONE_HANDAKUTEN = "゜"; // ゜

/**
 * 半角カナ → 全角カタカナ変換。濁点 / 半濁点は前文字と合成して 1 文字に畳む。
 *
 * - 単独の `ﾞ` `ﾟ` は U+309B / U+309C(独立濁点 / 半濁点)に変換
 * - 半角カナ範囲外(漢字・ひらがな・ASCII 等)は不変
 * - kana option(hiragana/katakana 変換)とは独立。本処理後にひらがな化したい場合は
 *   `halfwidth_kana: "expand"` + `kana: "hiragana"` を併用する
 */
export function expandHalfwidthKana(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; ) {
    const ch = s[i] ?? "";
    const mapped = HALF_TO_FULL_KANA[ch];
    if (mapped) {
      const next = s[i + 1];
      if (next === HALFWIDTH_DAKUTEN && DAKU_MAP[mapped]) {
        out += DAKU_MAP[mapped];
        i += 2;
        continue;
      }
      if (next === HALFWIDTH_HANDAKUTEN && HANDAKU_MAP[mapped]) {
        out += HANDAKU_MAP[mapped];
        i += 2;
        continue;
      }
      out += mapped;
      i++;
      continue;
    }
    if (ch === HALFWIDTH_DAKUTEN) {
      out += STANDALONE_DAKUTEN;
      i++;
      continue;
    }
    if (ch === HALFWIDTH_HANDAKUTEN) {
      out += STANDALONE_HANDAKUTEN;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function applyHalfwidthKana(text: string, mode: HalfwidthKanaMode): string {
  if (mode === "expand") return expandHalfwidthKana(text);
  return text;
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
  const halfwidthKana = options.halfwidth_kana ?? "preserve";

  const changes: NormalizeChange[] = [];
  let current = text;

  // 順序: width(ASCII)→ halfwidth_kana(半角カナ→全角)→ kana(ひら/カタ変換)→ spaces
  // halfwidth_kana を kana の前に置くのは、半角カナを全角化してから
  // 「全 hiragana へ揃える」「全 katakana を保つ」が連結できるようにするため。
  const afterWidth = applyWidth(current, width);
  if (afterWidth !== current) {
    changes.push({ type: "width", before: current, after: afterWidth });
    current = afterWidth;
  }

  const afterHalfKana = applyHalfwidthKana(current, halfwidthKana);
  if (afterHalfKana !== current) {
    changes.push({ type: "halfwidth_kana", before: current, after: afterHalfKana });
    current = afterHalfKana;
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
