/**
 * B-1 AI 検索向け SEO ページ: Text API normalize エンドポイント
 *
 * GET /docs/text-normalize
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-normalize";
const KEYWORDS = [
  "日本語テキスト正規化 API",
  "Japanese text normalization API",
  "全角半角統一 API",
  "ひらがな カタカナ 変換 API",
  "Sudachi 表記正規化 API",
  "送り仮名統一 API",
  "異体字統一 API",
  "AIエージェント 日本語前処理",
  "GPT Actions normalize Japanese",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API normalize — 日本語表記正規化エンドポイント",
  alternativeHeadline: "Shirabe Text API normalize — Japanese text normalization endpoint",
  description:
    "POST /api/v1/text/normalize は全/半角統一、ひらがな/カタカナ変換、空白正規化、半角カタカナ展開、Sudachi 表記正規化(送り違い / 異体字 / カタカナ表記揺れ)を任意組合せで適用。Phase 1+2 は純文字列処理、Phase 3 は SudachiDict-derived lookup。",
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
  name: "Shirabe Text API — normalize",
  description:
    "Japanese text normalization (fullwidth/halfwidth, hiragana/katakana, whitespace, halfwidth-kana, Sudachi normalized_form).",
  url: "https://shirabe.dev/api/v1/text/normalize",
  documentation: CANONICAL,
  provider: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  potentialAction: {
    "@type": "ConsumeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://shirabe.dev/api/v1/text/normalize",
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
      name: "normalize エンドポイントが扱う表記揺れの種類は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Phase 1+2(純文字列処理): ASCII 全/半角統一(width)、ひらがな/カタカナ変換(kana)、空白正規化(spaces)、半角カタカナ展開(halfwidth_kana、濁点・半濁点合成込み)。Phase 3(sudachi=\"apply\"): SudachiDict 由来の送り違い(行なう→行う)/ 異体字(卓れる→優れる)/ カタカナ表記揺れ(コンピュータ→コンピューター、デヴィルズ→デビルズ)を吸収。",
      },
    },
    {
      "@type": "Question",
      name: "options を何も指定しないとどうなりますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "全 option の default は preserve(変換なし)。入力テキストがそのまま返り、changes は空配列。後方互換性のため、既存呼出は破壊しない設計。",
      },
    },
    {
      "@type": "Question",
      name: "Phase 3 (sudachi=\"apply\") のレイテンシは?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "cold start で +50-200 ms 程度(Lindera tokenizer 起動 + 正規化マップ ~1.2 MB JSON parse)。warm 時は +1-5 ms。Phase 1+2 のみ使用時は Lindera 起動なし、3 ms 以内で完了。",
      },
    },
    {
      "@type": "Question",
      name: "正規化マップの出典 / license は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Phase 3 は SudachiDict-small (Apache-2.0、WorksApplications) の normalized_form 列を抽出した派生マップ(88,622 entries、surface != normalized_form のエントリのみ + ASCII surface 除外)。Lindera (MIT) + IPAdic v3.0.7 (BSD 3-Clause) と同梱、attribution は SudachiAttribution schema で response に含まれる。",
      },
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API normalize: Phase 3 Sudachi 表記正規化を 5/18 リリースに同梱(2026-05-09)",
  alternativeHeadline: "Text API normalize: Phase 3 Sudachi normalization included in 5/18 release",
  description:
    "SudachiDict 由来の lookup map (88,622 entries / 1.13 MB) を R2 配信、options.sudachi=\"apply\" で送り違い / 異体字 / カタカナ表記揺れ吸収。upstream Lindera 変更不要の自己完結経路で実現。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

export function renderTextNormalizeDocPage(): string {
  const body = `
<div class="hero">
  <h1>normalize — 日本語表記正規化エンドポイント</h1>
  <p class="tagline">POST /api/v1/text/normalize</p>
  <p class="desc">
    全/半角統一、ひらがな/カタカナ変換、空白正規化、半角カタカナ展開、
    <strong>Sudachi 表記正規化</strong>(送り違い / 異体字 / カタカナ表記揺れ)を任意組合せで適用。
    Phase 1+2 は純文字列処理、Phase 3 は Lindera + SudachiDict-derived lookup。
  </p>
</div>

<section class="section">
  <h2 id="endpoint">エンドポイント</h2>
  <pre><code>POST https://shirabe.dev/api/v1/text/normalize
X-API-Key: shrb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (省略可、匿名 Free 枠 10,000 回/月)
Content-Type: application/json</code></pre>
</section>

<section class="section">
  <h2 id="options">オプション一覧 / Options</h2>
  <table>
    <thead>
      <tr><th>option</th><th>値</th><th>default</th><th>動作</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>width</code></td>
        <td>half / full / preserve</td>
        <td>preserve</td>
        <td>ASCII 全角(ＡＢＣ)/ 半角(ABC)の統一方向</td>
      </tr>
      <tr>
        <td><code>kana</code></td>
        <td>hiragana / katakana / preserve</td>
        <td>preserve</td>
        <td>ひらがな ↔ カタカナ変換方向</td>
      </tr>
      <tr>
        <td><code>spaces</code></td>
        <td>single / trim / preserve</td>
        <td>preserve</td>
        <td>連続空白 → 単一空白(single)+ 前後除去(trim)</td>
      </tr>
      <tr>
        <td><code>halfwidth_kana</code></td>
        <td>expand / preserve</td>
        <td>preserve</td>
        <td>半角カタカナ ｱｲｳ → 全角 アイウ、濁点・半濁点合成 ｶﾞ → ガ</td>
      </tr>
      <tr>
        <td><code>sudachi</code></td>
        <td>apply / preserve</td>
        <td>preserve</td>
        <td>送り違い(行なう→行う)/ 異体字(卓れる→優れる)/ カタカナ表記揺れ(コンピュータ→コンピューター)を吸収。Lindera tokenize 必要、cold start +50-200 ms</td>
      </tr>
    </tbody>
  </table>
  <p>適用順は <strong>width → kana → spaces → halfwidth_kana → sudachi</strong>。Phase 1+2 後の文字列を tokenizer に渡すため精度が向上する設計。</p>
</section>

<section class="section">
  <h2 id="request">リクエスト / Request</h2>
  <pre><code>{
  "text": "ＡＢＣ１２３ コンピュータと行なう作業",
  "options": {
    "width": "half",
    "sudachi": "apply"
  }
}</code></pre>
</section>

<section class="section">
  <h2 id="response">レスポンス / Response</h2>
  <pre><code>{
  "text": "ＡＢＣ１２３ コンピュータと行なう作業",
  "normalized": "ABC123 コンピューターと行う作業",
  "changes": [
    { "type": "width", "before": "ＡＢＣ１２３ ", "after": "ABC123 " },
    { "type": "sudachi", "before": "コンピュータ", "after": "コンピューター" },
    { "type": "sudachi", "before": "行なう", "after": "行う" }
  ],
  "timing": {
    "setup_ms": 187,
    "cold_start": true,
    "tokenize_ms": 4,
    "sudachi_lookup_ms": 1,
    "map_fetch_ms": 78,
    "map_parse_ms": 35,
    "map_entries": 88622
  },
  "attribution": {
    "service": "shirabe-text-api",
    "url": "https://shirabe.dev",
    "dictionary": "SudachiDict-small",
    "dictionary_license": "Apache-2.0",
    "dictionary_source": "https://github.com/WorksApplications/SudachiDict",
    "tokenizer": "Lindera + IPAdic v3.0.7",
    "tokenizer_license": "MIT (Lindera) / BSD 3-Clause (IPAdic)"
  }
}</code></pre>
  <p>
    <code>timing</code> と <code>attribution</code> の Sudachi 関連 field は
    <code>options.sudachi="apply"</code> 指定時のみ含まれる(Phase 1+2 のみ使用時は ServiceAttribution 単独)。
  </p>
</section>

<section class="section">
  <h2 id="examples">コード例 / Code examples</h2>

  <h3>curl(Phase 1+2 のみ、軽量)</h3>
  <pre><code>curl -X POST https://shirabe.dev/api/v1/text/normalize \\
  -H "Content-Type: application/json" \\
  -d '{"text": "ＡＢＣ１２３", "options": {"width": "half"}}'
# → {"normalized": "ABC123", ...}</code></pre>

  <h3>TypeScript(Phase 3 込み、Sudachi 正規化適用)</h3>
  <pre><code>const res = await fetch("https://shirabe.dev/api/v1/text/normalize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.SHIRABE_API_KEY!,
  },
  body: JSON.stringify({
    text: "コンピュータで行なう作業",
    options: { sudachi: "apply" },
  }),
});
const { normalized } = await res.json();
console.log(normalized);
// → コンピューターで行う作業</code></pre>

  <h3>Python(全 option 同時適用)</h3>
  <pre><code>import os, requests
r = requests.post(
    "https://shirabe.dev/api/v1/text/normalize",
    json={
        "text": "ＡＢＣ ｱｲｳ  ｺﾝﾋﾟｭｰﾀ",
        "options": {
            "width": "half",
            "halfwidth_kana": "expand",
            "spaces": "single",
            "sudachi": "apply",
        },
    },
    headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
    timeout=10,
)
print(r.json()["normalized"])
# → ABC アイウ コンピューター</code></pre>
</section>

<section class="section">
  <h2 id="phase3-detail">Phase 3 Sudachi 正規化の詳細</h2>
  <p>
    SudachiDict-small(Apache-2.0、WorksApplications)の <code>normalized_form</code> 列を抽出した派生マップを
    R2 配信。CI build で抽出条件を厳格化:
  </p>
  <ul>
    <li><strong>surface ≠ normalized_form</strong> のエントリのみ(変更ありエントリ)</li>
    <li><strong>conjugation_form ∈ {"*", "終止形-一般"}</strong>(活用形 drift 排除、行なう→行う を保ち つき→尽きる を排除)</li>
    <li><strong>surface に日本語文字を 1 文字以上含む</strong>(装飾的変換 e.g. "10"→"⑩" を排除)</li>
  </ul>
  <p>
    結果: <strong>88,622 entries / 約 1.13 MB JSON</strong>。AI agent が想定する範囲の正規化のみカバー。
  </p>

  <h3>カバー範囲(代表例)</h3>
  <table>
    <thead>
      <tr><th>カテゴリ</th><th>例</th></tr>
    </thead>
    <tbody>
      <tr><td>送り仮名統一</td><td>行なう → 行う / 取りあげる → 取り上げる / 申しこむ → 申し込む</td></tr>
      <tr><td>カタカナ表記揺れ(長音)</td><td>コンピュータ → コンピューター / サーバ → サーバー / ユーザ → ユーザー</td></tr>
      <tr><td>カタカナ表記揺れ(バ⇄ヴ)</td><td>デヴィルズ → デビルズ / クエート → クウェート</td></tr>
      <tr><td>異体字統一</td><td>卓れる → 優れる / 飾りけ → 飾り気 / 花やぐ → 華やぐ</td></tr>
    </tbody>
  </table>

  <h3>制約 / Limitations</h3>
  <ul>
    <li>lookup 単位 = IPAdic tokenization 境界。IPAdic が複数 token に分割した結果が SudachiDict 単一 entry に該当しない場合は miss</li>
    <li>固有名詞(人名 / 地名)の表記揺れは対象外(name-split / name-reading で別途対応)</li>
    <li>SudachiDict-core / -full への upgrade、JMnedict 統合は 2026-06 のモノレポ化時に検討</li>
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
    OpenAPI 3.1 仕様(<a href="https://shirabe.dev/api/v1/text/openapi.yaml">本家</a> /
    <a href="https://shirabe.dev/api/v1/text/openapi-gpts.yaml">GPTs 短縮版</a>)を 1 URL で公開。
    operationId: <code>normalizeText</code>。
  </p>
  <ul>
    <li><strong>前処理パイプライン</strong>: AI agent でユーザ入力を住所 / 検索 API に渡す前に normalize で表記揺れを吸収すると、後段 API のキャッシュヒット率が向上</li>
    <li><strong>マルチ AI 出力統合</strong>: 4 AI(ChatGPT/Claude/Gemini/Perplexity)からの output を normalize で揃えると下流の DB JOIN が安定</li>
  </ul>
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
    本エンドポイント(<code>POST /api/v1/text/normalize</code>)の典型 hub use case =
    <strong>住所正規化 / 姓名分割の前段で全角半角・カナ・表記ゆれを吸収</strong>し、
    住所 API <code>/normalize</code> や text API <code>/name-split</code> の入力品質を底上げ。
    後段 API の confidence + level スコアおよびキャッシュヒット率向上に寄与します。
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

  <h3>2026-05-09: Phase 3 Sudachi 表記正規化 5/18 リリースに同梱確定</h3>
  <p>
    SudachiDict-small (Apache-2.0) 由来の lookup map (88,622 entries / 1.13 MB) を R2 配信、
    <code>options.sudachi="apply"</code> で送り違い / 異体字 / カタカナ表記揺れ吸収。
    upstream Lindera-wasm が user dict bytes API を提供しないため、自己完結の派生マップ経路で実現。
  </p>

  <h3>2026-05-08: Phase 2 halfwidth_kana 部分先行</h3>
  <p>
    半角カタカナ展開(<code>options.halfwidth_kana</code>)を Phase 2 範囲のうち Lindera 連携不要な部分として
    先行実装(<a href="https://github.com/techwell-inc-jp/shirabe-text-api/pull/4">PR #4</a>)。
  </p>

  <h3>2026-05-18: 正式リリース</h3>
  <p>本番 routes 活性化、Free 枠で利用開始。1+ 年変更なし約束。</p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では <strong>ChatGPT / Claude / Perplexity / Gemini</strong> の 4 大 AI に同じクエリを投げる
    独自測定(週次 4 AI × 5 query)を継続実施しています。
  </p>
  <ul>
    <li><strong>Week 2</strong>(2026-05-04): 同一住所「東京都港区六本木」で <strong>4 AI の出力フォーマット完全分裂</strong>を観測 → AI 経由で table 形式 / 散文 / JSON / 引用脚注 と分岐、後処理で揃えるには normalize による前処理 + 構造化 API への流し込みが direct path</li>
  </ul>
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
        <a href="https://shirabe.dev/docs/text-furigana">furigana</a> /
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
    <li><a href="https://github.com/WorksApplications/SudachiDict">SudachiDict (Apache-2.0)</a></li>
    <li><a href="https://github.com/lindera/lindera">Lindera (MIT)</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "normalize エンドポイント — Shirabe Text API | 日本語表記正規化(全/半角・ひらがな/カタカナ・Sudachi)",
    description:
      "POST /api/v1/text/normalize は全/半角統一、ひらがな/カタカナ変換、空白正規化、半角カタカナ展開、Sudachi 表記正規化(送り違い / 異体字 / カタカナ表記揺れ)を任意組合せで適用。SudachiDict-derived lookup 88,622 entries。匿名 Free 枠 10,000 回/月。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, WEBAPI_LD, FAQ_LD, NEWS_LD],
  });
}
