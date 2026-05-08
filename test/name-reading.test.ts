import { describe, it, expect } from "vitest";
import { readName, type TokenLike } from "../src/name-reading.js";

function family(surface: string, reading: string): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "固有名詞", "人名", "姓", "*", "*", surface, reading, reading],
  };
}

function given(surface: string, reading: string): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "固有名詞", "人名", "名", "*", "*", surface, reading, reading],
  };
}

function noun(surface: string, reading: string): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "一般", "*", "*", "*", "*", surface, reading, reading],
  };
}

function unknown(surface: string): TokenLike {
  return {
    surface,
    is_unknown: true,
    details: ["名詞", "一般", "*", "*", "*", "*", surface, "*", "*"],
  };
}

function ws(surface = " "): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["記号", "空白", "*", "*", "*", "*", surface, "*", "*"],
  };
}

describe("readName — strategy 1: dictionary_both", () => {
  it("吉川 + 良介 → hiragana reading 合成、confidence 0.97", () => {
    const r = readName([family("吉川", "ヨシカワ"), given("良介", "リョウスケ")], "hiragana");
    expect(r.family).toBe("吉川");
    expect(r.given).toBe("良介");
    expect(r.family_reading).toBe("よしかわ");
    expect(r.given_reading).toBe("りょうすけ");
    expect(r.reading).toBe("よしかわりょうすけ");
    expect(r.confidence).toBe(0.97);
    expect(r.matched_by).toBe("dictionary_both");
    expect(r.candidates).toEqual([]);
  });

  it("katakana オプションで片仮名のまま返る", () => {
    const r = readName([family("吉川", "ヨシカワ"), given("良介", "リョウスケ")], "katakana");
    expect(r.family_reading).toBe("ヨシカワ");
    expect(r.given_reading).toBe("リョウスケ");
    expect(r.reading).toBe("ヨシカワリョウスケ");
  });

  it("文中名前抽出: 田中 + 太郎 が文中で見つかる", () => {
    const r = readName(
      [
        noun("私", "ワタシ"),
        noun("は", "ハ"),
        family("田中", "タナカ"),
        given("太郎", "タロウ"),
        noun("です", "デス"),
      ],
      "hiragana"
    );
    expect(r.family_reading).toBe("たなか");
    expect(r.given_reading).toBe("たろう");
    expect(r.reading).toBe("たなかたろう");
  });
});

describe("readName — strategy 2: dictionary_family_only", () => {
  it("姓 tagged + unknown given → family は dict reading、given は surface fallback", () => {
    const r = readName([family("吉川", "ヨシカワ"), unknown("珍奇")], "hiragana");
    expect(r.family_reading).toBe("よしかわ");
    expect(r.given_reading).toBe("珍奇"); // unknown → surface fallback
    expect(r.reading).toBe("よしかわ珍奇");
    expect(r.confidence).toBe(0.7);
    expect(r.matched_by).toBe("dictionary_family_only");
  });

  it("姓 + 空白 + unknown given → 空白 trim、reading 合成", () => {
    const r = readName([family("山田", "ヤマダ"), ws(" "), unknown("獏")], "hiragana");
    expect(r.family).toBe("山田");
    expect(r.given).toBe("獏");
    expect(r.family_reading).toBe("やまだ");
    expect(r.given_reading).toBe("獏");
  });

  it("姓のみ → confidence 0.3 + warning + family_reading のみ", () => {
    const r = readName([family("吉川", "ヨシカワ")], "hiragana");
    expect(r.family_reading).toBe("よしかわ");
    expect(r.given_reading).toBe("");
    expect(r.reading).toBe("よしかわ");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });
});

describe("readName — strategy 3: dictionary_given_only", () => {
  it("unknown family + 名 tagged → family は surface、given は dict reading", () => {
    const r = readName([unknown("珍奇"), given("良介", "リョウスケ")], "hiragana");
    expect(r.family_reading).toBe("珍奇");
    expect(r.given_reading).toBe("りょうすけ");
    expect(r.reading).toBe("珍奇りょうすけ");
    expect(r.confidence).toBe(0.7);
    expect(r.matched_by).toBe("dictionary_given_only");
  });

  it("名のみ → confidence 0.3 + warning", () => {
    const r = readName([given("良介", "リョウスケ")], "hiragana");
    expect(r.family_reading).toBe("");
    expect(r.given_reading).toBe("りょうすけ");
    expect(r.reading).toBe("りょうすけ");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });
});

describe("readName — strategy 4: whitespace split", () => {
  it("unknown + ws + unknown → surface fallback、confidence 0.6", () => {
    const r = readName([unknown("珍奇"), ws(" "), unknown("変人")], "hiragana");
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("変人");
    expect(r.family_reading).toBe("珍奇");
    expect(r.given_reading).toBe("変人");
    expect(r.reading).toBe("珍奇変人");
    expect(r.confidence).toBe(0.6);
    expect(r.matched_by).toBe("whitespace");
  });

  it("kanji noun + ws + kanji noun → dict reading 取得", () => {
    const r = readName(
      [noun("吉田", "ヨシダ"), ws("　"), noun("太一", "タイチ")],
      "hiragana"
    );
    expect(r.family_reading).toBe("よしだ");
    expect(r.given_reading).toBe("たいち");
    expect(r.reading).toBe("よしだたいち");
  });
});

describe("readName — strategy 5: heuristic fallback", () => {
  it("4 文字 unknown → 2+2 split、family/given_reading は空 + warning", () => {
    const r = readName([unknown("珍奇変人")], "hiragana");
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("変人");
    expect(r.family_reading).toBe("");
    expect(r.given_reading).toBe("");
    expect(r.reading).toBe("珍奇変人"); // 全体は surface fallback
    expect(r.confidence).toBe(0.4);
    expect(r.warning).toBe("low_confidence");
    expect(r.matched_by).toBe("heuristic");
  });

  it("単一の unknown 4 文字でも 全体 reading は surface fallback", () => {
    const r = readName([unknown("珍奇変人")], "katakana");
    expect(r.reading).toBe("珍奇変人");
  });

  it("1 文字 unknown → given_reading に集約", () => {
    const r = readName([unknown("藤")], "hiragana");
    expect(r.family).toBe("");
    expect(r.given).toBe("藤");
    expect(r.given_reading).toBe("藤");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });

  it("空入力 → confidence 0 + empty_input", () => {
    const r = readName([], "hiragana");
    expect(r.reading).toBe("");
    expect(r.confidence).toBe(0);
    expect(r.warning).toBe("empty_input");
    expect(r.matched_by).toBe("empty");
  });
});

describe("readName — IPAdic only MVP 制約", () => {
  it("candidates は常に空 array", () => {
    const cases = [
      readName([family("吉川", "ヨシカワ"), given("良介", "リョウスケ")], "hiragana"),
      readName([unknown("珍奇変人")], "hiragana"),
      readName([], "hiragana"),
    ];
    for (const r of cases) {
      expect(r.candidates).toEqual([]);
    }
  });
});
