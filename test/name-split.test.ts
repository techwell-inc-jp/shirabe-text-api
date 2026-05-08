import { describe, it, expect } from "vitest";
import { splitName, type TokenLike } from "../src/name-split.js";

/** IPAdic 人名-姓 token を作る。 */
function family(surface: string, reading = surface): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "固有名詞", "人名", "姓", "*", "*", surface, reading, reading],
  };
}

/** IPAdic 人名-名 token を作る。 */
function given(surface: string, reading = surface): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "固有名詞", "人名", "名", "*", "*", surface, reading, reading],
  };
}

/** 一般名詞 token(タグなし)。 */
function noun(surface: string): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["名詞", "一般", "*", "*", "*", "*", surface, surface, surface],
  };
}

/** 未知語 token。 */
function unknown(surface: string): TokenLike {
  return {
    surface,
    is_unknown: true,
    details: ["名詞", "一般", "*", "*", "*", "*", surface, "*", "*"],
  };
}

/** 空白 token。 */
function ws(surface = " "): TokenLike {
  return {
    surface,
    is_unknown: false,
    details: ["記号", "空白", "*", "*", "*", "*", surface, "*", "*"],
  };
}

describe("splitName — strategy 1: dictionary_both (隣接 family + given)", () => {
  it("吉川 + 良介 → confidence 0.97", () => {
    const r = splitName([family("吉川"), given("良介")]);
    expect(r.family).toBe("吉川");
    expect(r.given).toBe("良介");
    expect(r.confidence).toBe(0.97);
    expect(r.matched_by).toBe("dictionary_both");
    expect(r.warning).toBeUndefined();
  });

  it("文中の名前抽出: 私は + 山田 + 太郎 + です → 山田 / 太郎", () => {
    const r = splitName([
      noun("私"),
      noun("は"),
      family("山田"),
      given("太郎"),
      noun("です"),
    ]);
    expect(r.family).toBe("山田");
    expect(r.given).toBe("太郎");
    expect(r.confidence).toBe(0.97);
  });

  it("非隣接(family ... given)は dictionary_both ではなく family_only に落ちる", () => {
    // 戦略 1 は隣接のみ。間に other token が挟まると戦略 2/3 へ。
    const r = splitName([family("田中"), noun("の"), given("太郎")]);
    // family tagged + given tagged 両方ある場合は隣接判定 fail で戦略 2 へ
    // (戦略 2 は family のみ tagged 前提だが、findIndex で familyIdx, givenIdx 両方 >=0
    //  になる → どちらの分岐にも入らず戦略 4 へ)
    // → whitespace match も fail(空白なし)→ heuristic
    expect(r.matched_by).toBe("heuristic");
    expect(r.confidence).toBe(0.4);
  });
});

describe("splitName — strategy 2: dictionary_family_only", () => {
  it("吉川(姓 tagged)+ unknown given → family/given 抽出 confidence 0.7", () => {
    const r = splitName([family("吉川"), unknown("珍奇")]);
    expect(r.family).toBe("吉川");
    expect(r.given).toBe("珍奇");
    expect(r.confidence).toBe(0.7);
    expect(r.matched_by).toBe("dictionary_family_only");
    expect(r.warning).toBeUndefined();
  });

  it("姓 + 空白 + given → 空白 trim", () => {
    const r = splitName([family("山田"), ws(" "), unknown("獏")]);
    expect(r.family).toBe("山田");
    expect(r.given).toBe("獏");
    expect(r.matched_by).toBe("dictionary_family_only");
  });

  it("姓のみ(given 無し)→ confidence 0.3 + warning", () => {
    const r = splitName([family("吉川")]);
    expect(r.family).toBe("吉川");
    expect(r.given).toBe("");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });
});

describe("splitName — strategy 3: dictionary_given_only", () => {
  it("unknown family + 良介(名 tagged)→ confidence 0.7", () => {
    const r = splitName([unknown("珍奇"), given("良介")]);
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("良介");
    expect(r.confidence).toBe(0.7);
    expect(r.matched_by).toBe("dictionary_given_only");
  });

  it("名のみ(family 無し)→ confidence 0.3 + warning", () => {
    const r = splitName([given("良介")]);
    expect(r.family).toBe("");
    expect(r.given).toBe("良介");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });
});

describe("splitName — strategy 4: whitespace split", () => {
  it("半角空白区切り → confidence 0.6", () => {
    const r = splitName([unknown("珍奇"), ws(" "), unknown("変人")]);
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("変人");
    expect(r.confidence).toBe(0.6);
    expect(r.matched_by).toBe("whitespace");
  });

  it("全角空白区切り → confidence 0.6", () => {
    const r = splitName([unknown("珍奇"), ws("　"), unknown("変人")]);
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("変人");
    expect(r.matched_by).toBe("whitespace");
  });
});

describe("splitName — strategy 5: heuristic fallback", () => {
  it("4 文字 unknown → 2+2 split, confidence 0.4 + warning", () => {
    const r = splitName([unknown("珍奇変人")]);
    expect(r.family).toBe("珍奇");
    expect(r.given).toBe("変人");
    expect(r.confidence).toBe(0.4);
    expect(r.warning).toBe("low_confidence");
    expect(r.matched_by).toBe("heuristic");
  });

  it("3 文字 unknown → 2+1 split", () => {
    const r = splitName([unknown("佐藤健")]);
    expect(r.family).toBe("佐藤");
    expect(r.given).toBe("健");
    expect(r.confidence).toBe(0.4);
    expect(r.warning).toBe("low_confidence");
  });

  it("2 文字 unknown → 1+1 split", () => {
    const r = splitName([unknown("鈴木")]);
    expect(r.family).toBe("鈴");
    expect(r.given).toBe("木");
    expect(r.confidence).toBe(0.4);
  });

  it("1 文字 unknown → family 空, given 1 文字, confidence 0.3", () => {
    const r = splitName([unknown("藤")]);
    expect(r.family).toBe("");
    expect(r.given).toBe("藤");
    expect(r.confidence).toBe(0.3);
    expect(r.warning).toBe("low_confidence");
  });

  it("空入力 → confidence 0 + empty_input warning", () => {
    const r = splitName([]);
    expect(r.family).toBe("");
    expect(r.given).toBe("");
    expect(r.confidence).toBe(0);
    expect(r.warning).toBe("empty_input");
    expect(r.matched_by).toBe("empty");
  });

  it("空白のみ → empty_input", () => {
    const r = splitName([ws(" ")]);
    expect(r.confidence).toBe(0);
    expect(r.warning).toBe("empty_input");
  });
});

describe("splitName — order semantics", () => {
  it("given が family より前にある場合は dictionary_both に該当しない", () => {
    // 戦略 1 は family[i] + given[i+1] の順序のみ
    const r = splitName([given("太郎"), family("山田")]);
    // findIndex で両方検出 → 戦略 2/3 の分岐どちらにも入らず → heuristic
    expect(r.matched_by).toBe("heuristic");
  });
});
