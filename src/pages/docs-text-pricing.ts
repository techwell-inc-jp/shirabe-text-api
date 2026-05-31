/**
 * B-1 AI 検索向け SEO ページ: Text API 料金プラン
 *
 * GET /docs/text-pricing
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-pricing";
const KEYWORDS = [
  "日本語形態素解析API 料金",
  "Japanese morphological analysis API pricing",
  "ふりがな付与 API 料金",
  "姓名分割 API 料金",
  "name split API price",
  "Stripe 従量課金 API",
  "OpenAPI 3.1",
  "AIエージェント 日本語処理 API",
  "GPT Actions Japanese text",
  "Lindera IPAdic API",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API 料金プラン — Free / Starter / Pro / Enterprise",
  alternativeHeadline: "Shirabe Text API pricing — Free, Starter, Pro, Enterprise",
  description:
    "日本語形態素解析・正規化・ふりがな付与・姓名分割・人名読み推定 API の料金体系。Free 枠 10,000 回/月、超過分から従量課金(¥0.05〜¥0.01/回)。Stripe Billing の transform_quantity 方式で自動集計・請求。1+ 年変更なし約束。",
  inLanguage: ["ja", "en"],
  url: CANONICAL,
  datePublished: "2026-05-06",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  keywords: KEYWORDS,
  articleSection: "Pricing",
};

const OFFER_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "AggregateOffer",
  priceCurrency: "JPY",
  lowPrice: "0",
  highPrice: "0.05",
  offerCount: 4,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "JPY",
      description: "10,000 requests/month, 1 req/s rate limit. Anonymous access without API key.",
    },
    {
      "@type": "Offer",
      name: "Starter",
      price: "0.05",
      priceCurrency: "JPY",
      description: "500,000 requests/month, 30 req/s, JPY 0.05 per request after 10,000 free calls.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "0.03",
      priceCurrency: "JPY",
      description: "5,000,000 requests/month, 100 req/s, JPY 0.03 per request.",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      price: "0.01",
      priceCurrency: "JPY",
      description: "Unlimited requests, 500 req/s, JPY 0.01 per request.",
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API 料金 Updates: Plan-α stable 確定、1+ 年変更なし(2026-05-06)",
  alternativeHeadline: "Text API pricing Updates: per-request stable for 1+ year",
  description:
    "Shirabe Text API は per-request 課金 + 暦・住所 API と同型 stable で 1+ 年変更なし(2026-05-06 経営判断確定)。AI エージェント統合コードに価格を埋め込んでも長期安定。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-06",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

const FAQ_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Shirabe Text API の料金はいくらですか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free プラン(月 10,000 回まで無料)、Starter(月 50 万回まで、¥0.05/回)、Pro(月 500 万回まで、¥0.03/回)、Enterprise(無制限、¥0.01/回)の 4 プラン。全プラン Free 枠 10,000 回/月、超過分から従量課金。Stripe Billing の transform_quantity 方式で自動集計・請求。",
      },
    },
    {
      "@type": "Question",
      name: "暦 API・住所 API と同じ API キーで使えますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい、使えます。Shirabe Calendar / Address / Text API は 1 キー集約構造を共有しており、同じ API キーで 3 API をそれぞれのプランに従って呼び出せます(暦 Starter + 住所 Free + テキスト Pro などの組み合わせ可)。",
      },
    },
    {
      "@type": "Question",
      name: "tokenize / normalize / furigana / name-split / name-reading で料金は違いますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "違いません。全エンドポイントで 1 リクエスト = 1 カウント、単価はプランごと一律です(Free ¥0、Starter ¥0.05、Pro ¥0.03、Enterprise ¥0.01)。Lindera 起動の重さに依存しないシンプルな課金モデル。",
      },
    },
    {
      "@type": "Question",
      name: "リリース日と Free 枠の利用開始時期はいつですか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "2026 年 5 月 18 日(月)正式リリース。Free 枠は同日から API キー不要で月 10,000 回まで利用可能(レート制限 1 req/s)。Starter 以上は同日から Stripe Checkout で契約開始できます。",
      },
    },
  ],
};

export function renderTextPricingDocPage(): string {
  const body = `
<div class="hero">
  <h1>料金プラン — Shirabe Text API</h1>
  <p class="tagline">Pricing — Free / Starter / Pro / Enterprise</p>
  <p class="desc">
    全プラン Free 枠 <strong>10,000 回/月</strong>、超過分から従量課金。
    Stripe Billing の <code>transform_quantity</code> 方式で自動集計・請求。
    <strong>1+ 年変更なし約束</strong>(Plan-α stable、上方調整のみ)。
  </p>
</div>

<section class="section">
  <h2 id="plans">プラン一覧</h2>
  <table>
    <thead>
      <tr><th>プラン</th><th>月間上限</th><th>単価</th><th>レート制限</th><th>想定利用</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Free</strong></td>
        <td>10,000 回</td>
        <td>¥0</td>
        <td>1 req/s</td>
        <td>個人検証、GPTs / Claude / Gemini の動作確認</td>
      </tr>
      <tr>
        <td><strong>Starter</strong></td>
        <td>500,000 回</td>
        <td>¥0.05/回</td>
        <td>30 req/s</td>
        <td>社内 AI エージェントの日常運用</td>
      </tr>
      <tr>
        <td><strong>Pro</strong></td>
        <td>5,000,000 回</td>
        <td>¥0.03/回</td>
        <td>100 req/s</td>
        <td>SaaS 内部、顧客向け AI 機能の本番運用</td>
      </tr>
      <tr>
        <td><strong>Enterprise</strong></td>
        <td>無制限</td>
        <td>¥0.01/回</td>
        <td>500 req/s</td>
        <td>大規模バッチ、CRM / 名簿クレンジング、本番大規模運用</td>
      </tr>
    </tbody>
  </table>
  <p class="text-muted">
    超過分のみ従量課金。例: Starter で月 50,000 回 = (50,000 - 10,000) × ¥0.05 = ¥2,000。
  </p>
</section>

<section class="section">
  <h2 id="count-model">カウントモデル / Counting model</h2>
  <ul>
    <li><strong>全エンドポイント均一</strong>: <code>/tokenize</code> / <code>/normalize</code> / <code>/furigana</code> / <code>/name-split</code> / <code>/name-reading</code> いずれも 1 リクエスト = 1 カウント</li>
    <li><strong>認証エラー / 400 系エラー</strong>: カウントされない(Free 枠を消費しない)</li>
    <li><strong>503 SERVICE_UNAVAILABLE</strong>: カウントされない(障害時の消費を防ぐ)</li>
    <li><strong>cold start 増加</strong>: <code>/normalize</code> の <code>options.sudachi="apply"</code> 指定時のみ Lindera + 正規化マップを load(課金には影響しない)</li>
  </ul>
</section>

<section class="section">
  <h2 id="keys">API キーの発行 / Obtaining an API key</h2>
  <p>
    匿名 Free 枠(1 req/s、月 10,000 回)は API キーなしで利用できます。より高いレート制限や使用量を必要とする場合は、
    <code>POST /api/v1/text/checkout</code> で Stripe Checkout を開始し、有料プランの契約と同時に
    API キー(プレフィックス <code>shrb_</code>、37 文字)が自動発行されます。
  </p>
  <p>
    暦 API / 住所 API を既に契約済のユーザーは <strong>同一の API キー</strong>で text API を呼び出せます(1 キー集約構造)。
    プランは API ごとに独立です(例: 暦 Starter + 住所 Pro + テキスト Free)。
  </p>
</section>

<section class="section">
  <h2 id="billing">請求と支払い / Billing</h2>
  <ul>
    <li><strong>決済基盤</strong>: Stripe Billing(従量課金、<code>transform_quantity[divide_by]=1000</code>)</li>
    <li><strong>通貨</strong>: 日本円(JPY)</li>
    <li><strong>請求サイクル</strong>: 毎月初(Stripe の請求期間に準拠)</li>
    <li><strong>未払い時</strong>: Webhook <code>invoice.payment_failed</code> 受信で <code>suspended</code> 自動遷移、<code>invoice.payment_succeeded</code> で復帰</li>
    <li><strong>解約</strong>: Customer Portal から即時解約可能、当月末までサービス利用可</li>
  </ul>
</section>

<section class="section">
  <h2 id="scenarios">規模別 月額試算シナリオ / Monthly cost scenarios</h2>
  <table>
    <thead>
      <tr><th>シナリオ</th><th>月間呼出数</th><th>推奨プラン</th><th>従量分</th><th>月額(税抜)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>個人開発 / PoC</td>
        <td>≤ 10,000 回</td>
        <td>Free</td>
        <td>0 円</td>
        <td><strong>0 円</strong></td>
      </tr>
      <tr>
        <td>小規模 SaaS / CRM 名簿クレンジング</td>
        <td>100,000 回</td>
        <td>Starter</td>
        <td>(100,000 - 10,000) × ¥0.05 = ¥4,500</td>
        <td><strong>¥4,500</strong></td>
      </tr>
      <tr>
        <td>中規模 SaaS / 文書処理基盤</td>
        <td>1,000,000 回</td>
        <td>Pro</td>
        <td>(1,000,000 - 10,000) × ¥0.03 = ¥29,700</td>
        <td><strong>¥29,700</strong></td>
      </tr>
      <tr>
        <td>大規模 EC / 全文書ふりがな化</td>
        <td>10,000,000 回</td>
        <td>Enterprise</td>
        <td>(10,000,000 - 10,000) × ¥0.01 = ¥99,900</td>
        <td><strong>¥99,900</strong></td>
      </tr>
    </tbody>
  </table>
</section>

<section class="section">
  <h2 id="hub-narrative">shirabe API ファミリー横断利用 — B2B 4 大 identifier セット</h2>
  <p>
    Shirabe は <strong>住所 + 姓名 + 法人 + 暦</strong> の B2B 4 大 identifier を 1 vendor で完結できる
    <strong>cross-pollination hub</strong> として設計されています。本ページに記載の料金プランは
    <strong>shirabe API 4 本(暦 / 住所 / text / 法人番号)で共通</strong>、同一 API キー
    (<code>X-API-Key</code>)で全 4 API 利用可能、Stripe Billing で従量課金 1 本化されています。
  </p>
  <p>
    <strong>4 API セット契約(顧客 1 社が複数 API を併用)で hub 効果が最大化</strong>されます。
    顧客 master 取込パイプラインで住所正規化 →(姓名分割 / ふりがな付与)→ 法人番号付与
    (6 月後半リリース予定)→ 営業日判定(暦)を 1 つの OpenAPI 3.1 で繋ぐ運用が想定 use case。
    複数 API 併用時も Stripe 請求は 1 本にまとまり、accounting / cost-tracking が簡素化されます。
  </p>
  <ul>
    <li><a href="https://shirabe.dev/docs/address-normalize">住所正規化 API</a>(別料金、本ページとは別単価)</li>
    <li><a href="https://shirabe.dev/docs/text-tokenize">日本語テキスト処理 API</a>(本ページの料金、5 endpoint 均一単価)</li>
    <li><a href="https://shirabe.dev/docs/rokuyo-api">暦 API</a>(別料金、本ページとは別単価)</li>
    <li><strong>法人番号 API</strong>(6 月後半リリース予定、料金は同型 Plan-α stable で構成予定)</li>
  </ul>
  <p>
    全 API は OpenAPI 3.1 完備、同一 API キーで全 4 API 利用可能、
    Plan-α stable(1+ 年変更なし約束)。LLM 経由 hub narrative の詳細は
    <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a> を参照。
  </p>
</section>

<section class="section">
  <h2 id="updates">更新履歴 / Updates</h2>

  <h3>2026-05-09: Phase 3 Sudachi 表記正規化を 5/18 リリースに同梱確定</h3>
  <p>
    SudachiDict 由来の <code>normalized_form</code> マップ(88,622 entries)を R2 配信、
    <code>/normalize</code> の <code>options.sudachi="apply"</code> で送り違い / 異体字 / カタカナ表記揺れを吸収。
    料金プランへの影響なし(全エンドポイント均一単価)。
  </p>

  <h3>2026-05-06: Plan-α stable 採用、1+ 年変更なし約束</h3>
  <p>
    Shirabe API 全体(暦・住所・text)で <strong>per-request flat 課金 + 1+ 年変更なし</strong>を採用
    (経営判断確定)。AI エージェント統合コードに価格を埋め込んでも長期安定。
  </p>
  <ul>
    <li><strong>変更しないこと</strong>: 課金モデル / 月間上限 / 単価 / billing schema</li>
    <li><strong>例外的に許可される「上方調整」</strong>(unilateral good news): Free 枠拡張、Paid 単価値下げ、新エンドポイント追加</li>
    <li><strong>禁止する調整</strong>(既存顧客の billing 動線破壊): Free 枠縮小、単価値上げ、課金モデル変更</li>
  </ul>

  <h3>2026-05-18: 正式リリース</h3>
  <p>
    全 5 エンドポイント(<code>/tokenize</code> / <code>/normalize</code> / <code>/furigana</code> / <code>/name-split</code> / <code>/name-reading</code>)同時リリース。
    Cloudflare Workers 単層構成、Lindera-wasm + IPAdic v3.0.7 + SudachiDict-derived normalization map。
  </p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では 2026-04-19 の暦 API 本番稼働以降、<strong>ChatGPT / Claude / Perplexity / Gemini</strong> の 4 大 AI に
    同じクエリを投げる独自測定(週次 4 AI × 5 query = 20 trial)を継続実施しています。
  </p>
  <ul>
    <li><strong>Week 1</strong>(2026-04-26): citation 0/20、住所 API リリース前 baseline 確立</li>
    <li><strong>Week 2</strong>(2026-05-04): citation 4/20(関連含 6/20)、shirabe.dev/announcements が Perplexity / Gemini で TOP-tier 推奨に到達</li>
    <li><strong>共通観測</strong>: 同一 query で 4 AI が分裂する場面が頻発 → canonical answer source の戦略的必要性</li>
  </ul>
  <p>
    詳細は <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a>(LLM 向け詳細版)を参照。
  </p>
</section>

<section class="section">
  <h2 id="related-shirabe-apis">関連 shirabe API ファミリー / Related Shirabe APIs</h2>
  <p>
    shirabe API ファミリー全 4 本(暦 + 住所 + text + 法人番号)と本ページ(料金プラン)の隣接情報・統合経路への関連 link をまとめます。
  </p>
  <h3>shirabe API ファミリー(B2B 4 大 identifier hub)</h3>
  <ul>
    <li><a href="https://shirabe.dev/docs/rokuyo-api">暦 API</a>(本番稼働中、2026-04-13〜)</li>
    <li><a href="https://shirabe.dev/docs/address-normalize">住所正規化 API</a>(本番稼働中、2026-05-01〜)</li>
    <li>テキスト処理 API:
        <a href="https://shirabe.dev/docs/text-tokenize">tokenize</a> /
        <a href="https://shirabe.dev/docs/text-normalize">normalize</a> /
        <a href="https://shirabe.dev/docs/text-furigana">furigana</a> /
        <a href="https://shirabe.dev/docs/text-name-split">name-split</a> /
        <a href="https://shirabe.dev/docs/text-name-reading">name-reading</a></li>
    <li><strong>法人番号 API</strong>(6 月後半リリース予定、B2B 4 大 identifier 完成)</li>
    <li><a href="https://shirabe.dev/docs/address-pricing">住所 API 料金プラン</a></li>
    <li><a href="https://shirabe.dev/llms.txt">llms.txt(全 API 統合 LLM 向け概要)</a> /
        <a href="https://shirabe.dev/llms-full.txt">llms-full.txt(詳細版)</a></li>
  </ul>
  <h3>本ページ関連</h3>
  <ul>
    <li><a href="https://shirabe.dev/api/v1/text/openapi.yaml">OpenAPI 3.1 仕様(本家)</a> /
        <a href="https://shirabe.dev/api/v1/text/openapi-gpts.yaml">GPTs 短縮版</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "料金プラン — Shirabe Text API | Free / Starter / Pro / Enterprise",
    description:
      "Shirabe Text API の料金プラン。Free 10,000 回/月、Starter ¥0.05/回、Pro ¥0.03/回、Enterprise ¥0.01/回。全エンドポイント(tokenize/normalize/furigana/name-split/name-reading)均一単価、1+ 年変更なし約束。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, OFFER_LD, NEWS_LD, FAQ_LD],
  });
}
