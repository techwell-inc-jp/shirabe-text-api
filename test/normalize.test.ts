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
