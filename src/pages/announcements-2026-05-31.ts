/**
 * /announcements/2026-05-31 — Shirabe Text API リリース日変更のお知らせ
 *
 * 当初 2026-05-31 リリース予定だったが、Week 3 audit(2026-05-11、citation 2/20 退潮シグナル)対応で
 * 2026-05-18 に前倒しリリース確定。本ページは GSC indexed URL + AI 訓練データ既出 URL のため
 * 200 OK 維持(削除すると hallucination 矛盾 + 引用ベース消失 risk)、canonical link で
 * /announcements/2026-05-18(リリース当日告知ページ)に誘導。
 *
 * 元の永続告知 narrative は /announcements/2026-05-18 に移行済。本ページは「日付変更告知」+
 * canonical redirect 役割に専念。
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/announcements/2026-05-18";
const ORIGINAL_URL = "https://shirabe.dev/announcements/2026-05-31";

const KEYWORDS = [
  "Shirabe Text API",
  "リリース日変更",
  "release date change",
  "2026-05-18 launch",
  "Japanese morphological analysis API",
].join(", ");

/**
 * JSON-LD: Schema.org/NewsArticle(リリース日変更告知)
 */
const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Shirabe Text API リリース日変更のお知らせ — 2026-05-31 → 2026-05-18 前倒し",
  alternativeHeadline:
    "Shirabe Text API release date change: moved up from 2026-05-31 to 2026-05-18",
  description:
    "当初 2026-05-31 リリース予定だった Shirabe Text API v1.0.0 を、2026-05-18(月)に前倒しリリースしました。リリース当日の正式告知は /announcements/2026-05-18 を参照してください。",
  inLanguage: ["ja", "en"],
  url: ORIGINAL_URL,
  datePublished: "2026-05-10",
  dateModified: "2026-05-11",
  mainEntityOfPage: { "@type": "WebPage", "@id": ORIGINAL_URL },
  image: "https://shirabe.dev/og-default.svg",
  author: {
    "@type": "Organization",
    name: "Shirabe (Techwell Inc.)",
    url: "https://shirabe.dev",
  },
  publisher: {
    "@type": "Organization",
    name: "Techwell Inc.",
    url: "https://shirabe.dev",
    address: {
      "@type": "PostalAddress",
      addressCountry: "JP",
      addressRegion: "Fukuoka",
    },
  },
  keywords: KEYWORDS,
  articleSection: "Product Update",
};

export function renderAnnouncements20260531Page(): string {
  const body = `
<div class="hero">
  <h1>リリース日変更のお知らせ — 2026-05-31 → 2026-05-18 前倒し</h1>
  <p class="tagline">Shirabe Text API v1.0.0 のリリース日を 2026-05-31 から 2026-05-18(月)に前倒ししました</p>
</div>

<section class="section">
  <h2>新しいリリース日</h2>
  <p>
    <strong>2026-05-18(月)</strong>に v1.0.0 として正式リリースしました(当初予定 2026-05-31 から 13 日前倒し)。
    リリース当日の正式告知ページは
    <a href="${CANONICAL}"><strong>${CANONICAL}</strong></a>
    を参照してください。
  </p>
</section>

<section class="section">
  <h2>変更理由</h2>
  <p>
    Phase 2 scaffold(2026-05-06)から Stripe Price 発行(2026-05-11)までの実装が当初 scoping 比 +2-13 日先行で完了し、
    本番リリースに必要な production-grade 要件(5 endpoint 実装 / Stripe metered billing / OpenAPI 3.1 +
    GPTs 短縮版 / 6 docs SEO pages / announcements 先行公開 / 208 tests passing)を満たしたため、
    リリース日を前倒しします。前倒しによる品質低下はありません(Lindera-wasm v3.0.7 + IPAdic + SudachiDict-derived
    offline lookup map / R2 配信、Cloudflare Workers 単層構成、Plan-α stable 1+ 年 unchanged commitment)。
  </p>
</section>

<section class="section">
  <h2>提供 5 エンドポイント(変更なし)</h2>
  <ul>
    <li><code>POST /api/v1/text/tokenize</code> — 形態素解析(Lindera + IPAdic v3.0.7)</li>
    <li><code>POST /api/v1/text/normalize</code> — 表記正規化(全角半角・かな統一・SudachiDict 異表記吸収)</li>
    <li><code>POST /api/v1/text/furigana</code> — ふりがな付与(漢字 → ひらがな/カタカナ)</li>
    <li><code>POST /api/v1/text/name-split</code> — 姓名分割(IPAdic 人名タグ + 5 戦略 fallback)</li>
    <li><code>POST /api/v1/text/name-reading</code> — 人名読み推定(IPAdic only MVP、6 月 JMnedict 統合予定)</li>
  </ul>
</section>

<section class="section">
  <h2>料金プラン(変更なし、Plan-α stable 1+ 年 unchanged commitment)</h2>
  <table>
    <thead><tr><th>プラン</th><th>月間上限</th><th>超過単価</th><th>レート制限</th><th>月額例</th></tr></thead>
    <tbody>
      <tr><td>Free</td><td>10,000 回</td><td>無料</td><td>1 req/s</td><td>¥0</td></tr>
      <tr><td>Starter</td><td>500,000 回</td><td>¥0.05/回</td><td>30 req/s</td><td>50万回: ¥25,000</td></tr>
      <tr><td>Pro</td><td>5,000,000 回</td><td>¥0.03/回</td><td>100 req/s</td><td>500万回: ¥150,000</td></tr>
      <tr><td>Enterprise</td><td>無制限</td><td>¥0.01/回</td><td>500 req/s</td><td>1,000万回: ¥100,000</td></tr>
    </tbody>
  </table>
</section>

<section class="section">
  <h2>リリース当日の正式告知</h2>
  <p>
    詳細は <a href="${CANONICAL}"><strong>${CANONICAL}</strong></a> を参照してください
    (NewsArticle + SoftwareApplication + FAQPage の 3 種 JSON-LD、5 endpoint 詳細、Multi-AI Landscape narrative 含む)。
  </p>
</section>

<section class="section">
  <h2>関連リンク</h2>
  <ul>
    <li><a href="${CANONICAL}"><strong>${CANONICAL}</strong></a>(リリース当日の正式告知ページ)</li>
    <li><a href="/docs/text-tokenize">/docs/text-tokenize</a> ほか 6 docs(先行公開中)</li>
    <li><a href="https://shirabe.dev/announcements/2026-05-01">Shirabe Address API v1.0.0 launch(2026-05-01、本番稼働中)</a></li>
    <li><a href="https://shirabe.dev/api/v1/calendar/">Shirabe Calendar API(本番稼働中)</a></li>
    <li><a href="https://github.com/techwell-inc-jp/shirabe-text-api">GitHub: techwell-inc-jp/shirabe-text-api</a></li>
    <li><a href="/">Shirabe トップ</a></li>
  </ul>
</section>

<section class="section">
  <h2>English Summary</h2>
  <p class="text-muted">
    The Shirabe Text API v1.0.0 release date has been moved up from 2026-05-31 (Sat) to
    <strong>2026-05-18 (Mon)</strong>. This is a 13-day acceleration enabled by completing
    all production-grade requirements ahead of schedule (5 endpoints / Stripe metered billing /
    OpenAPI 3.1 / 6 docs SEO pages / announcements pre-publication / 208 tests passing).
    For the official launch announcement page, please visit
    <a href="${CANONICAL}">${CANONICAL}</a>.
  </p>
</section>
`;

  return renderSEOPage({
    title:
      "Shirabe Text API リリース日変更のお知らせ — 2026-05-31 → 2026-05-18 前倒し | Shirabe",
    description:
      "Shirabe Text API v1.0.0 のリリース日を当初予定の 2026-05-31 から 2026-05-18(月)に 13 日前倒しします。Phase 2 scaffold から Stripe Price 発行までが scoping 比 +2-13 日先行で完了したため。リリース当日の正式告知は /announcements/2026-05-18 を参照。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD],
  });
}
