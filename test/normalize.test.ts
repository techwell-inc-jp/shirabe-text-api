import { describe, it, expect } from "vitest";
import { normalizeText } from "../src/normalize.js";

describe("normalizeText", () => {
  describe("default (no options)", () => {
    it("returns input unchanged with empty changes", () => {
      const r = normalizeText("ＡＢＣ あいうえお アイウエオ");
      expect(r.normalized).toBe("ＡＢＣ あいうえお アイウエオ");
      expect(r.changes).toEqual([]);
    });
  });

  describe("width", () => {
    it("half: ASCII fullwidth → halfwidth + fullwidth space → halfwidth space", () => {
      const r = normalizeText("ＡＢＣ１２３　Ｘ", { width: "half" });
      expect(r.normalized).toBe("ABC123 X");
      expect(r.changes).toHaveLength(1);
      expect(r.changes[0]?.type).toBe("width");
    });

    it("full: ASCII halfwidth → fullwidth + halfwidth space → fullwidth space", () => {
      const r = normalizeText("ABC 123", { width: "full" });
      expect(r.normalized).toBe("ＡＢＣ　１２３");
    });

    it("preserve: no transformation", () => {
      const r = normalizeText("ＡＢＣ", { width: "preserve" });
      expect(r.normalized).toBe("ＡＢＣ");
      expect(r.changes).toEqual([]);
    });

    it("does not touch non-ASCII (kana stays as-is)", () => {
      const r = normalizeText("ＡＢあいう", { width: "half" });
      expect(r.normalized).toBe("ABあいう");
    });

    it("noop case (already halfwidth) emits no change entry", () => {
      const r = normalizeText("ABC", { width: "half" });
      expect(r.normalized).toBe("ABC");
      expect(r.changes).toEqual([]);
    });
  });

  describe("kana", () => {
    it("katakana: hiragana → katakana", () => {
      const r = normalizeText("あいうえお", { kana: "katakana" });
      expect(r.normalized).toBe("アイウエオ");
    });

    it("hiragana: katakana → hiragana", () => {
      const r = normalizeText("アイウエオ", { kana: "hiragana" });
      expect(r.normalized).toBe("あいうえお");
    });

    it("ゔ ↔ ヴ", () => {
      expect(normalizeText("ゔ", { kana: "katakana" }).normalized).toBe("ヴ");
      expect(normalizeText("ヴ", { kana: "hiragana" }).normalized).toBe("ゔ");
    });

    it("preserves long sound mark ー (only katakana char)", () => {
      const r = normalizeText("ラーメン", { kana: "hiragana" });
      expect(r.normalized).toBe("らーめん");
    });

    it("does not touch ASCII / kanji", () => {
      const r = normalizeText("Hello 漢字 あいう", { kana: "katakana" });
      expect(r.normalized).toBe("Hello 漢字 アイウ");
    });
  });

  describe("spaces", () => {
    it("single: collapses runs of spaces (incl. tab and 全角) to one halfwidth space", () => {
      const r = normalizeText("a   b\t\tc　　d", { spaces: "single" });
      expect(r.normalized).toBe("a b c d");
    });

    it("trim: collapses + strips leading/trailing", () => {
      const r = normalizeText("  hello   world  ", { spaces: "trim" });
      expect(r.normalized).toBe("hello world");
    });

    it("preserve: no change", () => {
      const r = normalizeText("a   b", { spaces: "preserve" });
      expect(r.normalized).toBe("a   b");
      expect(r.changes).toEqual([]);
    });
  });

  describe("halfwidth_kana", () => {
    it("expand: 半角カナ → 全角カタカナ(基本マッピング)", () => {
      const r = normalizeText("ｱｲｳｴｵ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("アイウエオ");
      expect(r.changes).toHaveLength(1);
      expect(r.changes[0]?.type).toBe("halfwidth_kana");
    });

    it("expand: 濁点合成 ｶﾞ → ガ", () => {
      const r = normalizeText("ｶﾞｷﾞｸﾞｹﾞｺﾞ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("ガギグゲゴ");
    });

    it("expand: 半濁点合成 ﾊﾟ → パ", () => {
      const r = normalizeText("ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("パピプペポ");
    });

    it("expand: ｳﾞ → ヴ(濁点合成の特殊例)", () => {
      const r = normalizeText("ｳﾞ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("ヴ");
    });

    it("expand: 句読点 ｡｢｣､･ → 。「」、・", () => {
      const r = normalizeText("ｱｲｳ｡｢ｲｳｴ｣", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("アイウ。「イウエ」");
    });

    it("expand: 小書き仮名 ｧｨｩｪｫｬｭｮｯ", () => {
      const r = normalizeText("ｷｬｯﾄ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("キャット");
    });

    it("expand: ｦ → ヲ + 長音 ｰ → ー", () => {
      const r = normalizeText("ｺｰﾋｰｦ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("コーヒーヲ");
    });

    it("expand: 単独の ﾞ ﾟ は U+309B / U+309C へ変換", () => {
      const r = normalizeText("Aﾞ Aﾟ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("A゛ A゜");
    });

    it("expand: 半角カナ範囲外(漢字 / ひらがな / ASCII)は不変", () => {
      const r = normalizeText("漢字ABCあいうｱｲｳ", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("漢字ABCあいうアイウ");
    });

    it("preserve: 半角カナを変換しない", () => {
      const r = normalizeText("ｱｲｳ", { halfwidth_kana: "preserve" });
      expect(r.normalized).toBe("ｱｲｳ");
      expect(r.changes).toEqual([]);
    });

    it("default(option 未指定)では半角カナを変換しない(後方互換性)", () => {
      const r = normalizeText("ｱｲｳ");
      expect(r.normalized).toBe("ｱｲｳ");
      expect(r.changes).toEqual([]);
    });

    it("noop case(半角カナ不在)で change なし", () => {
      const r = normalizeText("hello 漢字", { halfwidth_kana: "expand" });
      expect(r.normalized).toBe("hello 漢字");
      expect(r.changes).toEqual([]);
    });

    it("expand + kana=hiragana: 半角カナ → カタカナ → ひらがな", () => {
      const r = normalizeText("ｶﾞｯｺｳ", { halfwidth_kana: "expand", kana: "hiragana" });
      expect(r.normalized).toBe("がっこう");
      expect(r.changes.map((c) => c.type)).toEqual(["halfwidth_kana", "kana"]);
    });
  });

  describe("combined", () => {
    it("scoping doc example: width=half + kana=katakana + spaces=single", () => {
      const r = normalizeText("ＡＢＣ１２３ あいうえお アイウエオ", {
        width: "half",
        kana: "katakana",
        spaces: "single",
      });
      expect(r.normalized).toBe("ABC123 アイウエオ アイウエオ");
      expect(r.changes.map((c) => c.type)).toEqual(["width", "kana"]);
    });

    it("emits changes in order: width → kana → spaces", () => {
      const r = normalizeText("Ａ   あ", {
        width: "half",
        kana: "katakana",
        spaces: "single",
      });
      expect(r.normalized).toBe("A ア");
      expect(r.changes.map((c) => c.type)).toEqual(["width", "kana", "spaces"]);
    });
  });

  describe("edge cases", () => {
    it("empty string", () => {
      const r = normalizeText("", {
        width: "half",
        kana: "katakana",
        spaces: "trim",
      });
      expect(r.normalized).toBe("");
      expect(r.changes).toEqual([]);
    });

    it("string with only spaces and trim", () => {
      const r = normalizeText("   ", { spaces: "trim" });
      expect(r.normalized).toBe("");
    });

    it("emoji passes through untouched", () => {
      const r = normalizeText("hello 🎉 world", {
        width: "full",
        kana: "katakana",
      });
      expect(r.normalized).toBe("ｈｅｌｌｏ　🎉　ｗｏｒｌｄ");
    });
  });
});
