/**
 * /announcements/2026-05-18 (リリース当日告知) と /announcements/2026-05-31 (リリース日変更告知)
 * の smoke test。
 *
 * Week 3 audit で 5/31 → 5/18 前倒し確定により、永続告知 narrative は /2026-05-18 に移行、
 * /2026-05-31 は GSC indexed + AI 訓練データ既出 URL 維持目的の「リリース日変更告知」に変更。
 */
import { describe, it, expect } from "vitest";
import { renderAnnouncements20260518Page } from "../src/pages/announcements-2026-05-18.js";
import { renderAnnouncements20260531Page } from "../src/pages/announcements-2026-05-31.js";

describe("announcements 2026-05-18 page (リリース当日告知)", () => {
  const html = renderAnnouncements20260518Page();

  it("HTML として render される", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>");
  });

  it("canonical URL が /announcements/2026-05-18 を指す", () => {
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("https://shirabe.dev/announcements/2026-05-18");
  });

  it("3 種 JSON-LD(NewsArticle / SoftwareApplication / FAQPage)を埋め込む", () => {
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("全 JSON-LD が JSON としてパース可能", () => {
    const matches = Array.from(
      html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    );
    expect(matches.length).toBeGreaterThanOrEqual(3);
    for (const m of matches) {
      expect(() => JSON.parse(m[1] ?? "")).not.toThrow();
    }
  });

  it("5 endpoint 全て名称が含まれる", () => {
    expect(html).toContain("/tokenize");
    expect(html).toContain("/normalize");
    expect(html).toContain("/furigana");
    expect(html).toContain("/name-split");
    expect(html).toContain("/name-reading");
  });

  it("Plan-α stable narrative + 4 プラン料金が含まれる", () => {
    expect(html).toContain("Plan-α stable");
    expect(html).toContain("10,000");
    expect(html).toContain("¥0.05");
    expect(html).toContain("¥0.03");
    expect(html).toContain("¥0.01");
  });

  it("既存 docs(先行公開済 6 ページ)へ cross-link", () => {
    expect(html).toContain("/docs/text-tokenize");
    expect(html).toContain("/docs/text-normalize");
    expect(html).toContain("/docs/text-furigana");
    expect(html).toContain("/docs/text-name-split");
    expect(html).toContain("/docs/text-name-reading");
    expect(html).toContain("/docs/text-pricing");
  });

  it("Week 2 driver pattern 言及(address 同型 NewsArticle + FAQPage 引用 anchor narrative)", () => {
    expect(html).toContain("/announcements/2026-05-01");
    expect(html).toContain("Multi-AI");
  });

  it("GitHub repo + B2B 3 大 identifier narrative を含む", () => {
    expect(html).toContain("https://github.com/techwell-inc-jp/shirabe-text-api");
    expect(html).toContain("identifier");
  });
});

describe("announcements 2026-05-31 page (リリース日変更告知)", () => {
  const html = renderAnnouncements20260531Page();

  it("HTML として render される", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>");
  });

  it("canonical URL が /announcements/2026-05-18(新リリース当日告知ページ)を指す", () => {
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("https://shirabe.dev/announcements/2026-05-18");
  });

  it("リリース日変更 headline + 5/18 前倒し narrative を含む", () => {
    expect(html).toContain("リリース日変更");
    expect(html).toContain("2026-05-18");
    expect(html).toContain("前倒し");
  });

  it("NewsArticle JSON-LD(リリース日変更告知)を埋め込む", () => {
    expect(html).toContain('"@type":"NewsArticle"');
  });

  it("全 JSON-LD が JSON としてパース可能", () => {
    const matches = Array.from(
      html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
    for (const m of matches) {
      expect(() => JSON.parse(m[1] ?? "")).not.toThrow();
    }
  });

  it("リリース当日告知ページへの誘導リンクを含む", () => {
    expect(html).toContain("https://shirabe.dev/announcements/2026-05-18");
  });
});
