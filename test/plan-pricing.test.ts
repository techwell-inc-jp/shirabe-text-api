import { describe, it, expect } from "vitest";
import {
  PLAN_MONTHLY_LIMITS,
  NEXT_PLAN_MAP,
  PRICING_URL,
  UPGRADE_URL,
  getMonthlyResetDate,
  secondsUntilMonthlyReset,
} from "../src/middleware/plan-pricing.js";

describe("plan-pricing", () => {
  describe("PLAN_MONTHLY_LIMITS", () => {
    it("Free / Starter / Pro / Enterprise の上限が docs と一致する", () => {
      expect(PLAN_MONTHLY_LIMITS.free).toBe(10_000);
      expect(PLAN_MONTHLY_LIMITS.starter).toBe(500_000);
      expect(PLAN_MONTHLY_LIMITS.pro).toBe(5_000_000);
      expect(PLAN_MONTHLY_LIMITS.enterprise).toBe(-1);
    });
  });

  describe("NEXT_PLAN_MAP", () => {
    it("free → starter の checkout_path に api=text を含む", () => {
      expect(NEXT_PLAN_MAP.free?.name).toBe("starter");
      expect(NEXT_PLAN_MAP.free?.checkout_path).toContain("api=text");
    });

    it("starter → pro の checkout_path に api=text を含む", () => {
      expect(NEXT_PLAN_MAP.starter?.name).toBe("pro");
      expect(NEXT_PLAN_MAP.starter?.checkout_path).toContain("api=text");
    });

    it("pro → enterprise の checkout_path に api=text を含む", () => {
      expect(NEXT_PLAN_MAP.pro?.name).toBe("enterprise");
      expect(NEXT_PLAN_MAP.pro?.checkout_path).toContain("api=text");
    });

    it("enterprise には次のプランがない(undefined)", () => {
      expect(NEXT_PLAN_MAP.enterprise).toBeUndefined();
    });
  });

  describe("URLs", () => {
    it("PRICING_URL は text API 固有(/docs/text-pricing)", () => {
      expect(PRICING_URL).toBe("https://shirabe.dev/docs/text-pricing");
    });

    it("UPGRADE_URL は shirabe.dev 統一導線", () => {
      expect(UPGRADE_URL).toBe("https://shirabe.dev/upgrade");
    });
  });

  describe("getMonthlyResetDate", () => {
    it("月内なら翌月 1 日を返す", () => {
      const now = new Date(2026, 4, 15); // 2026-05-15
      const reset = getMonthlyResetDate(now);
      expect(reset.getFullYear()).toBe(2026);
      expect(reset.getMonth()).toBe(5); // 6 月
      expect(reset.getDate()).toBe(1);
    });

    it("12 月なら翌年 1 月 1 日を返す", () => {
      const now = new Date(2026, 11, 15); // 2026-12-15
      const reset = getMonthlyResetDate(now);
      expect(reset.getFullYear()).toBe(2027);
      expect(reset.getMonth()).toBe(0); // 1 月
      expect(reset.getDate()).toBe(1);
    });
  });

  describe("secondsUntilMonthlyReset", () => {
    it("正の整数を返す", () => {
      const sec = secondsUntilMonthlyReset();
      expect(sec).toBeGreaterThan(0);
      expect(Number.isInteger(sec)).toBe(true);
    });
  });
});
