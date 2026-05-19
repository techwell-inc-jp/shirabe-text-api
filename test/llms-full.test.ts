import { describe, it, expect } from "vitest";
import { renderTextLlmsFullTxt } from "../src/pages/llms-full.js";

describe("renderTextLlmsFullTxt — /api/v1/text/llms-full.txt content", () => {
  const body = renderTextLlmsFullTxt();

  it("llmstxt.org 仕様: H1 タイトルで開始", () => {
    expect(body.startsWith("# Shirabe Text API")).toBe(true);
  });

  it("blockquote summary 直後配置(llmstxt.org spec)", () => {
    const lines = body.split("\n");
    const h1Index = lines.findIndex((l) => l.startsWith("# "));
    const firstBlockquote = lines.findIndex((l, i) => i > h1Index && l.startsWith("> "));
    expect(firstBlockquote).toBeGreaterThan(h1Index);
    expect(firstBlockquote).toBeLessThan(h1Index + 5);
  });

  it("5 endpoint 全列挙(tokenize / normalize / furigana / name-split / name-reading)", () => {
    expect(body).toContain("POST /api/v1/text/tokenize");
    expect(body).toContain("POST /api/v1/text/normalize");
    expect(body).toContain("POST /api/v1/text/furigana");
    expect(body).toContain("POST /api/v1/text/name-split");
    expect(body).toContain("POST /api/v1/text/name-reading");
  });

  it("5 endpoint 全てに curl 例 inline", () => {
    const curlCount = (body.match(/curl -X POST https:\/\/shirabe\.dev\/api\/v1\/text\//g) || []).length;
    expect(curlCount).toBe(5);
  });

  it("料金プラン(Plan-α stable 4 段階)を完全に明示", () => {
    expect(body).toContain("Free");
    expect(body).toContain("10,000");
    expect(body).toContain("Starter");
    expect(body).toContain("500,000");
    expect(body).toContain("Pro");
    expect(body).toContain("5,000,000");
    expect(body).toContain("Enterprise");
  });

  it("ChatGPT GPTs / Claude Tool Use / Gemini Function Calling 統合経路を明示", () => {
    expect(body).toContain("ChatGPT GPTs");
    expect(body).toContain("Claude Tool Use");
    expect(body).toContain("Gemini Function Calling");
  });

  it("OpenAPI 3.1 spec URL 2 件(本家 + GPTs 短縮版)", () => {
    expect(body).toContain("https://shirabe.dev/api/v1/text/openapi.yaml");
    expect(body).toContain("https://shirabe.dev/api/v1/text/openapi-gpts.yaml");
  });

  it("運営会社(株式会社テックウェル)+ GitHub URL 明示", () => {
    expect(body).toContain("株式会社テックウェル");
    expect(body).toContain("https://github.com/techwell-inc-jp/shirabe-text-api");
  });

  it("プラットフォーム統合版 llms.txt への back-link", () => {
    expect(body).toContain("https://shirabe.dev/llms.txt");
  });

  it("Multi-AI capability gap evidence セクション(2026-05-18 Week 4 観測)", () => {
    expect(body).toContain("4 AI capability gap");
    expect(body).toContain("Gemini");
    expect(body).toContain("Claude");
  });

  it("cross-pollination central hub narrative(Bing AI 7D citations evidence)", () => {
    expect(body).toContain("cross-pollination");
    expect(body).toContain("Bing AI");
  });

  it("429 response shape(C-1 paid 突破経路 ergonomics)を明示", () => {
    expect(body).toContain("RATE_LIMIT_EXCEEDED");
    expect(body).toContain("USAGE_LIMIT_EXCEEDED");
    expect(body).toContain("upgrade_url");
    expect(body).toContain("next_plan");
  });

  it("Lindera-wasm + IPAdic v3.0.7 + R2 配信 architecture 明示", () => {
    expect(body).toContain("Lindera-wasm");
    expect(body).toContain("IPAdic v3.0.7");
    expect(body).toContain("Cloudflare R2");
  });
});
