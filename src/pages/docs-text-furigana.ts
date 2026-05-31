/**
 * B-1 AI 検索向け SEO ページ: Text API furigana エンドポイント
 *
 * GET /docs/text-furigana
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-furigana";
const KEYWORDS = [
  "ふりがな付与 API",
  "Japanese furigana API",
  "ルビ付与 API",
  "漢字 読み 推定 API",
  "形態素解析 ふりがな",
  "Lindera furigana",
  "AIエージェント ふりがな",
  "GPT Actions Japanese reading",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API furigana — 日本語ふりがな付与エンドポイント",
  alternativeHeadline: "Shirabe Text API furigana — Japanese furigana annotation endpoint",
  description:
    "POST /api/v1/text/furigana は Lindera + IPAdic v3.0.7 で形態素解析後、各トークンの details[7](読み、片仮名)を抽出して {surface, reading} 配列で返す。options.kana で hiragana(default)/ katakana 選択、漢字を含まないトークン / 未知語は surface fallback。",
  inLanguage: ["ja", "en"],
  url: CANONICAL,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  keywords: KEYWORDS,
  articleSection: "API Documentation",
};

const WEBAPI_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebAPI",
  name: "Shirabe Text API — furigana",
  description: "Furigana (reading) annotation for Japanese text via Lindera + IPAdic v3.0.7.",
  url: "https://shirabe.dev/api/v1/text/furigana",
  documentation: CANONICAL,
  provider: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  potentialAction: {
    "@type": "ConsumeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://shirabe.dev/api/v1/text/furigana",
      httpMethod: "POST",
      contentType: "application/json",
    },
  },
};

const FAQ_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "ふりがな付与の精度は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAdic v3.0.7 ベースで一般的な漢字語の読み付与精度は 95%+。固有名詞(人名 / 地名)は IPAdic の語彙範囲に依存。複数読みがある漢字(例: 「行く」いく/ゆく)は IPAdic の単一読みに収束、複数候補は提供されない(将来の JMnedict 統合で改善予定)。",
      },
    },
    {
      "@type": "Question",
      name: "options.kana の挙動は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "default は hiragana(IPAdic 提供のカタカナ読みを ひらがなに変換)。katakana 指定で IPAdic そのままの片仮名読みを返す。漢字を含まないトークン(数字 / 記号 / ASCII)や未知語は details[7] が空 / *、surface fallback で kana 変換は行わない。",
      },
    },
    {
      "@type": "Question",
      name: "辞書未登録の漢字を含むトークンはどうなりますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "未知語(is_unknown=true)または details[7] が * / 空のトークンは surface(漢字のまま)を reading として返します。AI agent は token 単位で reading が漢字のまま残っている場合に「未推定」と判定可能。",
      },
    },
    {
      "@type": "Question",
      name: "tokenize エンドポイントとの違いは?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "tokenize は 9 列の details(品詞 / 活用 / 読み / 発音)全て + byte position 等を返す詳細版。furigana は ふりがな表示用途に絞り、{surface, reading} の配列のみ返す軽量版。AI 経由でルビ振り表示するアプリには furigana が向く。",
      },
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API furigana: Lindera + IPAdic で 5/18 リリース",
  alternativeHeadline: "Text API furigana: launching 5/18 with Lindera + IPAdic",
  description:
    "Cloudflare Workers 単層構成、Lindera-wasm + IPAdic v3.0.7 で形態素解析後の details[7] からふりがな抽出。options.kana で hiragana / katakana 切替。匿名 Free 枠 10,000 回/月。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

export function renderTextFuriganaDocPage(): string {
  const body = `
<div class="hero">
  <h1>furigana — 日本語ふりがな付与エンドポイント</h1>
  <p class="tagline">POST /api/v1/text/furigana</p>
  <p class="desc">
    Lindera + IPAdic v3.0.7 で形態素解析後、各トークンの読み(片仮名)を抽出して
    <code>{surface, reading}</code> 配列で返す。<code>options.kana</code> で hiragana(default)/
    katakana 選択。漢字を含まないトークン / 未知語は surface fallback。
  </p>
</div>

<section class="section">
  <h2 id="endpoint">エンドポイント</h2>
  <pre><code>POST https://shirabe.dev/api/v1/text/furigana
X-API-Key: shrb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (省略可、匿名 Free 枠 10,000 回/月)
Content-Type: application/json</code></pre>
</section>

<section class="section">
  <h2 id="request">リクエスト / Request</h2>
  <pre><code>{
  "text": "東京都港区六本木で打ち合わせをしました",
  "options": {
    "kana": "hiragana"
  }
}</code></pre>
  <ul>
    <li><code>text</code> (string, required): ふりがな付与する日本語テキスト</li>
    <li><code>options.kana</code> (enum, default <code>hiragana</code>): <code>hiragana</code> | <code>katakana</code></li>
  </ul>
</section>

<section class="section">
  <h2 id="response">レスポンス / Response</h2>
  <pre><code>{
  "text": "東京都港区六本木で打ち合わせをしました",
  "tokens": [
    { "surface": "東京", "reading": "とうきょう" },
    { "surface": "都", "reading": "と" },
    { "surface": "港区", "reading": "みなとく" },
    { "surface": "六本木", "reading": "ろっぽんぎ" },
    { "surface": "で", "reading": "で" },
    { "surface": "打ち合わせ", "reading": "うちあわせ" },
    { "surface": "を", "reading": "を" },
    { "surface": "し", "reading": "し" },
    { "surface": "まし", "reading": "まし" },
    { "surface": "た", "reading": "た" }
  ],
  "timing": { "tokenize_ms": 4, "setup_ms": 187, "cold_start": true, "...": "..." },
  "attribution": {
    "dictionary": "IPAdic v3.0.7",
    "license": "BSD 3-Clause",
    "source": "https://github.com/lindera/lindera"
  }
}</code></pre>
  <p>
    <code>options.kana="katakana"</code> 指定時は IPAdic 提供のカタカナ読みをそのまま返す
    (例: <code>{"surface": "東京", "reading": "トウキョウ"}</code>)。
  </p>
</section>

<section class="section">
  <h2 id="examples">コード例 / Code examples</h2>

  <h3>curl</h3>
  <pre><code>curl -X POST https://shirabe.dev/api/v1/text/furigana \\
  -H "Content-Type: application/json" \\
  -d '{"text": "明日は晴れでしょう"}'</code></pre>

  <h3>TypeScript(ルビ表示)</h3>
  <pre><code>const res = await fetch("https://shirabe.dev/api/v1/text/furigana", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.SHIRABE_API_KEY!,
  },
  body: JSON.stringify({ text: "明日は晴れでしょう" }),
});
const { tokens } = await res.json();
const html = tokens.map((t) =&gt;
  /[\\u4e00-\\u9faf]/.test(t.surface)
    ? \`&lt;ruby&gt;\${t.surface}&lt;rt&gt;\${t.reading}&lt;/rt&gt;&lt;/ruby&gt;\`
    : t.surface
).join("");
// → &lt;ruby&gt;明日&lt;rt&gt;あした&lt;/rt&gt;&lt;/ruby&gt;は&lt;ruby&gt;晴れ&lt;rt&gt;はれ&lt;/rt&gt;&lt;/ruby&gt;でしょう</code></pre>

  <h3>Python(カタカナ読み)</h3>
  <pre><code>import os, requests
r = requests.post(
    "https://shirabe.dev/api/v1/text/furigana",
    json={"text": "明日は晴れでしょう", "options": {"kana": "katakana"}},
    headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
    timeout=10,
)
for t in r.json()["tokens"]:
    print(f"{t['surface']} → {t['reading']}")
# → 明日 → アシタ
# → は → ハ
# → 晴れ → ハレ ...</code></pre>
</section>

<section class="section">
  <h2 id="reading-source">読み抽出の仕組み</h2>
  <p>
    IPAdic v3.0.7 の各エントリは固定 9 列の details を持ち、
    <strong>index 7 が読み(片仮名)</strong>、index 8 が発音(片仮名)。furigana エンドポイントは
    index 7 を採用、<code>options.kana="hiragana"</code> 指定時に Unicode 表で hiragana に変換。
  </p>
  <ul>
    <li><strong>有効値の判定</strong>: <code>details[7]</code> が <code>*</code> または空文字列以外なら使用</li>
    <li><strong>fallback</strong>: 未知語 / details 短縮 / details[7] 無効 → surface(漢字のまま)を reading に採用</li>
    <li><strong>kana 変換</strong>: surface fallback の場合は変換しない(漢字のまま)、IPAdic 由来の読みのみ変換対象</li>
  </ul>
</section>

<section class="section">
  <h2 id="use-cases">想定ユースケース</h2>
  <ul>
    <li><strong>ルビ振り Web ページ</strong>: 教育コンテンツ / 学習アプリで漢字に <code>&lt;ruby&gt;</code> 自動付与</li>
    <li><strong>音声合成前処理</strong>: TTS エンジンに渡す前に読みを正規化、未読 / 誤読を低減</li>
    <li><strong>姓名以外の固有名詞読み推定</strong>: 地名 / 商品名 / 組織名の読み付与(name-split / name-reading は人名特化)</li>
    <li><strong>検索インデックス</strong>: 全文検索で漢字と仮名表記の同等性を担保するための reading インデックス</li>
  </ul>
</section>

<section class="section">
  <h2 id="rate-limit">レート制限 / Rate limit</h2>
  <p>
    全エンドポイント均一(<a href="https://shirabe.dev/docs/text-pricing">料金プラン</a>):
    Free 月 10,000 回 / 1 req/s、Starter 月 50 万回 / 30 req/s、Pro 月 500 万回 / 100 req/s、
    Enterprise 無制限 / 500 req/s。
  </p>
</section>

<section class="section">
  <h2 id="ai-integration">AI エージェント統合</h2>
  <p>
    OpenAPI 3.1 仕様(<a href="https://shirabe.dev/api/v1/text/openapi.yaml">本家</a>)で
    operationId: <code>addFurigana</code>。GPT Builder / Claude Tool Use / LangChain で自動 discover 可能。
  </p>
</section>

<section class="section">
  <h2 id="hub-narrative">shirabe API ファミリー横断利用 — B2B 4 大 identifier セット</h2>
  <p>
    Shirabe は <strong>住所 + 姓名 + 法人 + 暦</strong> の B2B 4 大 identifier を 1 vendor で完結できる
    <strong>cross-pollination hub</strong> として設計されています。顧客 master 取込パイプラインで
    住所正規化 →(姓名分割 / ふりがな付与)→ 法人番号付与(6 月後半リリース予定)→
    営業日判定(暦)を 1 つの OpenAPI 3.1 で繋ぐ使い方が想定 use case です。
  </p>
  <p>
    本エンドポイント(<code>POST /api/v1/text/furigana</code>)の典型 hub use case =
    <strong>人名 / 地名 / 商品名にふりがなを付与</strong>し、name-reading や住所 API の検索精度を高める。
    AI agent が日本語 ground truth を読み上げ可能な surface に変換する hub-narrative の中核機能で、
    name-split → name-reading → furigana の連続呼出で姓名正規化を完了させる pattern が頻出です。
  </p>
  <ul>
    <li><a href="https://shirabe.dev/docs/address-normalize">住所正規化 API</a> —
        表記ゆれ正規化 + JIS code / lg_code / machiaza_id の 3 種 identifier を 1 レスポンスで同梱</li>
    <li><a href="https://shirabe.dev/docs/text-tokenize">日本語テキスト処理 API</a>(本エンドポイントを含む 5 endpoint:
        tokenize / normalize / furigana / name-split / name-reading)</li>
    <li><a href="https://shirabe.dev/docs/rokuyo-api">暦 API</a> —
        六曜 + 暦注 + 干支 + 二十四節気の canonical 出典</li>
    <li><strong>法人番号 API</strong>(6 月後半リリース予定、B2B 4 大 identifier 完成)</li>
  </ul>
  <p>
    全 API は OpenAPI 3.1 完備、同一 API キー(<code>X-API-Key</code>)で全 4 API 利用可能、
    Stripe Billing で従量課金 1 本化。LLM 経由 hub narrative の詳細は
    <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a> を参照。
  </p>
</section>

<section class="section">
  <h2 id="updates">更新履歴 / Updates</h2>

  <h3>2026-05-07: /furigana エンドポイント実装完了</h3>
  <p>
    Lindera tokenize + IPAdic details[7] 抽出 + ひらがな化を 1 リクエストで完結
    (<a href="https://github.com/techwell-inc-jp/shirabe-text-api/pull/2">PR #2</a>、scoping 5/19-5/25 比 +12 日先行)。
  </p>

  <h3>2026-05-18: 正式リリース</h3>
  <p>本番 routes 活性化、Free 枠で利用開始。1+ 年変更なし約束。</p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では <strong>ChatGPT / Claude / Perplexity / Gemini</strong> の 4 大 AI に
    同じクエリを投げる独自測定(週次 4 AI × 5 query)を継続実施しています。
    AI が日本語の読み推定を自前で行うとフォーマットが分裂しますが、furigana エンドポイントなら
    全 AI で同一の <code>{surface, reading}</code> 配列が返り、下流処理を統一できます。
  </p>
  <p>詳細は <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a> を参照。</p>
</section>

<section class="section">
  <h2 id="related-shirabe-apis">関連 shirabe API ファミリー / Related Shirabe APIs</h2>
  <p>
    shirabe API ファミリー全 4 本(暦 + 住所 + text + 法人番号)と本エンドポイントの隣接機能・出典・統合経路への関連 link をまとめます。
  </p>
  <h3>shirabe API ファミリー(B2B 4 大 identifier hub)</h3>
  <ul>
    <li><a href="https://shirabe.dev/docs/rokuyo-api">暦 API</a>(本番稼働中、2026-04-13〜)</li>
    <li><a href="https://shirabe.dev/docs/address-normalize">住所正規化 API</a>(本番稼働中、2026-05-01〜)</li>
    <li>テキスト処理 API:
        <a href="https://shirabe.dev/docs/text-tokenize">tokenize</a> /
        <a href="https://shirabe.dev/docs/text-normalize">normalize</a> /
        <a href="https://shirabe.dev/docs/text-name-split">name-split</a> /
        <a href="https://shirabe.dev/docs/text-name-reading">name-reading</a></li>
    <li><strong>法人番号 API</strong>(6 月後半リリース予定、B2B 4 大 identifier 完成)</li>
    <li><a href="https://shirabe.dev/docs/text-pricing">料金プラン(4 API 共通)</a></li>
    <li><a href="https://shirabe.dev/llms.txt">llms.txt(全 API 統合 LLM 向け概要)</a> /
        <a href="https://shirabe.dev/llms-full.txt">llms-full.txt(詳細版)</a></li>
  </ul>
  <h3>本エンドポイント関連</h3>
  <ul>
    <li><a href="https://shirabe.dev/api/v1/text/openapi.yaml">OpenAPI 3.1 仕様(本家)</a> /
        <a href="https://shirabe.dev/api/v1/text/openapi-gpts.yaml">GPTs 短縮版</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "furigana エンドポイント — Shirabe Text API | 日本語ふりがな付与",
    description:
      "POST /api/v1/text/furigana は Lindera + IPAdic v3.0.7 で形態素解析後、{surface, reading} 配列を返す。options.kana で hiragana / katakana 選択、漢字を含まないトークン / 未知語は surface fallback。匿名 Free 枠 10,000 回/月。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, WEBAPI_LD, FAQ_LD, NEWS_LD],
  });
}
