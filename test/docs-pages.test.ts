import { describe, it, expect } from "vitest";
import { renderTextTokenizeDocPage } from "../src/pages/docs-text-tokenize.js";
import { renderTextNormalizeDocPage } from "../src/pages/docs-text-normalize.js";
import { renderTextFuriganaDocPage } from "../src/pages/docs-text-furigana.js";
import { renderTextNameSplitDocPage } from "../src/pages/docs-text-name-split.js";
import { renderTextNameReadingDocPage } from "../src/pages/docs-text-name-reading.js";
import { renderTextPricingDocPage } from "../src/pages/docs-text-pricing.js";

const PAGES = [
  {
    name: "tokenize",
    render: renderTextTokenizeDocPage,
    canonical: "https://shirabe.dev/docs/text-tokenize",
    titleMarker: "tokenize",
    contentMarker: "形態素解析",
    operationId: "tokenizeText",
  },
  {
    name: "normalize",
    render: renderTextNormalizeDocPage,
    canonical: "https://shirabe.dev/docs/text-normalize",
    titleMarker: "normalize",
    contentMarker: "Sudachi",
    operationId: "normalizeText",
  },
  {
    name: "furigana",
    render: renderTextFuriganaDocPage,
    canonical: "https://shirabe.dev/docs/text-furigana",
    titleMarker: "furigana",
    contentMarker: "ふりがな",
    operationId: "addFurigana",
  },
  {
    name: "name-split",
    render: renderTextNameSplitDocPage,
    canonical: "https://shirabe.dev/docs/text-name-split",
    titleMarker: "name-split",
    contentMarker: "姓名分割",
    operationId: "splitName",
  },
  {
    name: "name-reading",
    render: renderTextNameReadingDocPage,
    canonical: "https://shirabe.dev/docs/text-name-reading",
    titleMarker: "name-reading",
    contentMarker: "読み推定",
    operationId: "readName",
  },
  {
    name: "pricing",
    render: renderTextPricingDocPage,
    canonical: "https://shirabe.dev/docs/text-pricing",
    titleMarker: "料金",
    contentMarker: "Free",
    operationId: null, // pricing は WebAPI ではなく AggregateOffer
  },
];

describe("Text API docs pages — smoke tests", () => {
  for (const page of PAGES) {
    describe(page.name, () => {
      const html = page.render();

      it("returns non-empty HTML", () => {
        expect(html.length).toBeGreaterThan(1000);
        expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      });

      it("has correct canonical URL", () => {
        expect(html).toContain(`<link rel="canonical" href="${page.canonical}">`);
      });

      it("contains title marker", () => {
        expect(html).toContain(page.titleMarker);
      });

      it("contains content marker", () => {
        expect(html).toContain(page.contentMarker);
      });

      it("includes JSON-LD scripts", () => {
        expect(html).toMatch(/<script type="application\/ld\+json">/);
      });

      it("has hero, sections, related links structure", () => {
        expect(html).toContain('class="hero"');
        expect(html).toContain('class="section"');
      });

      it("links to Multi-AI Landscape narrative", () => {
        expect(html).toContain("llms-full.txt");
      });

      it("links to OpenAPI spec", () => {
        expect(html).toContain("https://shirabe.dev/api/v1/text/openapi.yaml");
      });
    });
  }
});

describe("Text API docs pages — JSON-LD coverage", () => {
  it("each page has at least 3 JSON-LD blocks (TechArticle / NewsArticle / FAQPage minimum)", () => {
    for (const page of PAGES) {
      const html = page.render();
      const ldMatches = html.match(/<script type="application\/ld\+json">/g) ?? [];
      expect(ldMatches.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("normalize docs include SudachiAttribution license info", () => {
    const html = renderTextNormalizeDocPage();
    expect(html).toContain("SudachiDict-small");
    expect(html).toContain("Apache-2.0");
  });

  it("name-split / name-reading docs mention IPAdic only MVP accuracy", () => {
    for (const f of [renderTextNameSplitDocPage, renderTextNameReadingDocPage]) {
      const html = f();
      expect(html).toContain("IPAdic only MVP");
      expect(html).toMatch(/80-90%/);
    }
  });

  it("name-reading explicitly mentions JMnedict integration in June 2026", () => {
    const html = renderTextNameReadingDocPage();
    expect(html).toContain("JMnedict");
    expect(html).toMatch(/2026-06|6 月/);
  });

  it("pricing docs include all 4 plans with prices", () => {
    const html = renderTextPricingDocPage();
    for (const plan of ["Free", "Starter", "Pro", "Enterprise"]) {
      expect(html).toContain(plan);
    }
    expect(html).toContain("¥0.05");
    expect(html).toContain("¥0.03");
    expect(html).toContain("¥0.01");
  });
});

describe("Text API docs pages — cross-linking", () => {
  it("each page links to text-pricing", () => {
    for (const page of PAGES) {
      if (page.name === "pricing") continue;
      const html = page.render();
      expect(html).toContain("https://shirabe.dev/docs/text-pricing");
    }
  });

  it("pricing page links to all 5 endpoint docs", () => {
    const html = renderTextPricingDocPage();
    for (const ep of ["text-tokenize", "text-normalize", "text-furigana", "text-name-split", "text-name-reading"]) {
      expect(html).toContain(`https://shirabe.dev/docs/${ep}`);
    }
  });
});

describe("Text API docs pages — Phase A hub narrative (cross-pollination hub)", () => {
  it("each page contains hub-narrative section", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain('id="hub-narrative"');
      expect(html).toContain("shirabe API ファミリー横断利用");
      expect(html).toContain("B2B 4 大 identifier セット");
    }
  });

  it("each page contains related-shirabe-apis section (replaces legacy related)", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain('id="related-shirabe-apis"');
      expect(html).toContain("関連 shirabe API ファミリー");
    }
  });

  it("each page links to all 3 live shirabe APIs (rokuyo / address / text family)", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain("https://shirabe.dev/docs/rokuyo-api");
      expect(html).toContain("https://shirabe.dev/docs/address-normalize");
      expect(html).toContain("https://shirabe.dev/docs/text-tokenize");
    }
  });

  it("each page mentions 4th API (法人番号) as future release (no URL)", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain("法人番号 API");
      expect(html).toMatch(/6 月後半リリース予定/);
    }
  });

  it("each page links to llms.txt or llms-full.txt for hub narrative", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain("https://shirabe.dev/llms-full.txt");
    }
  });

  it("each page mentions cross-pollination hub design pattern", () => {
    for (const page of PAGES) {
      const html = page.render();
      expect(html).toContain("cross-pollination hub");
    }
  });
});
