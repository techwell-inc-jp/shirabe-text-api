import { describe, it, expect } from "vitest";
import wranglerToml from "../wrangler.toml?raw";

const requiredPatterns = [
  "shirabe.dev/docs/text-*",
  "shirabe.dev/announcements/2026-05-18",
  "shirabe.dev/announcements/2026-05-31",
  "shirabe.dev/webhook/stripe/text",
  "shirabe.dev/api/v1/text/*",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("wrangler.toml routes invariant (I-7 regression guard)", () => {
  for (const pattern of requiredPatterns) {
    it(`must contain uncommented route: ${pattern}`, () => {
      const matcher = new RegExp(
        `^\\s*pattern\\s*=\\s*"${escapeRegex(pattern)}"`,
        "m",
      );
      expect(wranglerToml).toMatch(matcher);
    });
  }

  it("must NOT contain any commented-out [[routes]] block (5/18 launch invariant)", () => {
    const commentedRoute = /^\s*#\s*\[\[routes\]\]/m;
    expect(wranglerToml).not.toMatch(commentedRoute);
  });
});
