import { describe, it, expect } from "vitest";
import {
  sudachiNormalize,
  type SudachiTokenLike,
} from "../src/sudachi-normalize.js";

/** synthetic map(SudachiDict-derived の代表パターンを抜粋)。 */
const MAP: Record<string, string> = {
  // 送り仮名統一
  "行なう": "行う",
  "取りあげる": "取り上げる",
  "申しこむ": "申し込む",
  // カタカナ表記揺れ(長音 / バ⇄ヴ)
  "コンピュータ": "コンピューター",
  "サーバ": "サーバー",
  "ユーザ": "ユーザー",
  "デヴィルズ": "デビルズ",
  "クエート": "クウェート",
  // 異体字
  "卓れる": "優れる",
};

function tok(surface: string, is_unknown = false): SudachiTokenLike {
  return { surface, is_unknown };
}

describe("sudachiNormalize — basic transforms", () => {
  it("送り仮名統一: 行なう → 行う", () => {
    const r = sudachiNormalize([tok("行なう")], MAP);
    expect(r.normalized).toBe("行う");
    expect(r.changes).toEqual([{ type: "sudachi", before: "行なう", after: "行う" }]);
  });

  it("カタカナ長音正規化: コンピュータ → コンピューター", () => {
    const r = sudachiNormalize([tok("コンピュータ")], MAP);
    expect(r.normalized).toBe("コンピューター");
    expect(r.changes).toHaveLength(1);
  });

  it("異体字統一: 卓れる → 優れる", () => {
    const r = sudachiNormalize([tok("卓れる")], MAP);
    expect(r.normalized).toBe("優れる");
  });

  it("複数 token 連結: 私はサーバを管理する → 私はサーバーを管理する", () => {
    const tokens = [
      tok("私"),
      tok("は"),
      tok("サーバ"),
      tok("を"),
      tok("管理"),
      tok("する"),
    ];
    const r = sudachiNormalize(tokens, MAP);
    expect(r.normalized).toBe("私はサーバーを管理する");
    expect(r.changes).toEqual([
      { type: "sudachi", before: "サーバ", after: "サーバー" },
    ]);
  });

  it("複数 hit を全て記録", () => {
    const tokens = [tok("コンピュータ"), tok("と"), tok("サーバ")];
    const r = sudachiNormalize(tokens, MAP);
    expect(r.normalized).toBe("コンピューターとサーバー");
    expect(r.changes).toHaveLength(2);
    expect(r.changes[0]).toEqual({
      type: "sudachi",
      before: "コンピュータ",
      after: "コンピューター",
    });
    expect(r.changes[1]).toEqual({
      type: "sudachi",
      before: "サーバ",
      after: "サーバー",
    });
  });
});

describe("sudachiNormalize — pass-through cases", () => {
  it("map に無い token は surface のまま", () => {
    const r = sudachiNormalize([tok("吉田"), tok("です")], MAP);
    expect(r.normalized).toBe("吉田です");
    expect(r.changes).toEqual([]);
  });

  it("空 token 配列 → 空文字列、changes なし", () => {
    const r = sudachiNormalize([], MAP);
    expect(r.normalized).toBe("");
    expect(r.changes).toEqual([]);
  });

  it("既に normalized form と一致する surface はスキップ(map は同値エントリ持たない想定)", () => {
    const r = sudachiNormalize([tok("行う"), tok("コンピューター")], MAP);
    expect(r.normalized).toBe("行うコンピューター");
    expect(r.changes).toEqual([]);
  });

  it("surface == normalized の defensive check(map に self-mapping があっても変更扱いしない)", () => {
    const selfMap = { ...MAP, "X": "X" };
    const r = sudachiNormalize([tok("X")], selfMap);
    expect(r.normalized).toBe("X");
    expect(r.changes).toEqual([]);
  });
});

describe("sudachiNormalize — unknown token handling", () => {
  it("is_unknown=true の token は map 一致しても置換しない", () => {
    // 例えば 行なう が未知語 fallback の場合(基本ありえないが防御)
    const r = sudachiNormalize([tok("行なう", true)], MAP);
    expect(r.normalized).toBe("行なう");
    expect(r.changes).toEqual([]);
  });

  it("既知語 + 未知語混在 → 既知語のみ正規化", () => {
    const tokens = [
      tok("コンピュータ"),
      tok("xyz珍奇", true),
      tok("サーバ"),
    ];
    const r = sudachiNormalize(tokens, MAP);
    expect(r.normalized).toBe("コンピューターxyz珍奇サーバー");
    expect(r.changes).toHaveLength(2);
  });
});

describe("sudachiNormalize — change shape", () => {
  it("changes[].type は常に 'sudachi'", () => {
    const tokens = [tok("行なう"), tok("取りあげる")];
    const r = sudachiNormalize(tokens, MAP);
    expect(r.changes.every((c) => c.type === "sudachi")).toBe(true);
  });

  it("changes は token 単位で記録(連続 hit を集約しない)", () => {
    const tokens = [tok("コンピュータ"), tok("サーバ")];
    const r = sudachiNormalize(tokens, MAP);
    expect(r.changes).toHaveLength(2);
  });
});
