import { describe, it, expect } from "vitest";
import {
  isAggregatedApiKeyInfo,
  migrateToAggregated,
  resolveApiPlan,
  type AggregatedApiKeyInfo,
  type LegacyApiKeyInfo,
} from "../src/types/api-key.js";

describe("api-key", () => {
  describe("isAggregatedApiKeyInfo", () => {
    it("新フォーマット(apis 含む)を true 判定", () => {
      const info: AggregatedApiKeyInfo = {
        customerId: "cus_x",
        createdAt: "2026-05-06",
        apis: { text: { plan: "starter" } },
      };
      expect(isAggregatedApiKeyInfo(info)).toBe(true);
    });

    it("旧フォーマット(plan flat)を false 判定", () => {
      const info: LegacyApiKeyInfo = {
        plan: "starter",
        customerId: "cus_x",
        createdAt: "2026-05-06",
      };
      expect(isAggregatedApiKeyInfo(info)).toBe(false);
    });
  });

  describe("migrateToAggregated", () => {
    it("旧フォーマットを apis.calendar として in-memory 変換", () => {
      const legacy: LegacyApiKeyInfo = {
        plan: "pro",
        customerId: "cus_x",
        stripeSubscriptionId: "sub_y",
        status: "active",
        createdAt: "2026-05-06",
      };
      const aggregated = migrateToAggregated(legacy);
      expect(aggregated.apis.calendar?.plan).toBe("pro");
      expect(aggregated.apis.calendar?.stripeSubscriptionId).toBe("sub_y");
      expect(aggregated.apis.text).toBeUndefined();
    });
  });

  describe("resolveApiPlan", () => {
    it("新フォーマットで text プランを返す", () => {
      const info: AggregatedApiKeyInfo = {
        customerId: "cus_x",
        createdAt: "2026-05-06",
        apis: { text: { plan: "starter" } },
      };
      const result = resolveApiPlan(info, "text");
      expect(result?.plan).toBe("starter");
    });

    it("旧フォーマットで text を要求すると undefined(暦のみ契約)", () => {
      const legacy: LegacyApiKeyInfo = {
        plan: "pro",
        customerId: "cus_x",
        createdAt: "2026-05-06",
      };
      const result = resolveApiPlan(legacy, "text");
      expect(result).toBeUndefined();
    });

    it("旧フォーマットで calendar を要求すると pro を返す", () => {
      const legacy: LegacyApiKeyInfo = {
        plan: "pro",
        customerId: "cus_x",
        createdAt: "2026-05-06",
      };
      const result = resolveApiPlan(legacy, "calendar");
      expect(result?.plan).toBe("pro");
    });

    it("新フォーマットで未契約 API を要求すると undefined", () => {
      const info: AggregatedApiKeyInfo = {
        customerId: "cus_x",
        createdAt: "2026-05-06",
        apis: { calendar: { plan: "starter" } },
      };
      expect(resolveApiPlan(info, "text")).toBeUndefined();
      expect(resolveApiPlan(info, "address")).toBeUndefined();
    });
  });
});
