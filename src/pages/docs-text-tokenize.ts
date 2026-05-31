/**
 * B-1 AI 検索向け SEO ページ: Text API tokenize エンドポイント
 *
 * GET /docs/text-tokenize
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-tokenize";
const KEYWORDS = [
  "日本語形態素解析 API",
  "Japanese tokenizer API",
  "Lindera API",
  "IPAdic v3.0.7",
  "形態素解析 OpenAPI",
  "AIエージェント 形態素解析",
  "GPT Actions Japanese tokenize",
  "Cloudflare Workers Japanese NLP",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API tokenize — 日本語形態素解析エンドポイント",
  alternativeHeadline: "Shirabe Text API tokenize — Japanese morphological analysis endpoint",
  description:
    "POST /api/v1/text/tokenize は Lindera + IPAdic v3.0.7 で日本語テキストを形態素解析、各トークンの surface / 品詞 / 活用 / 読み(片仮名)を返す。Cloudflare Workers 単層、cold start ~200 ms、warm ~5 ms。",
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
  name: "Shirabe Text API — tokenize",
  description: "Japanese morphological analysis via Lindera + IPAdic v3.0.7.",
  url: "https://shirabe.dev/api/v1/text/tokenize",
  documentation: CANONICAL,
  provider: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  potentialAction: {
    "@type": "ConsumeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://shirabe.dev/api/v1/text/tokenize",
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
      name: "tokenize エンドポイントの精度は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lindera + IPAdic v3.0.7 ベース。一般文書での品詞付与精度は 95%+、固有名詞や専門用語の認識率は IPAdic の語彙範囲に依存。読み(片仮名)抽出は IPAdic details[7] からそのまま採用、未知語は surface fallback。",
      },
    },
    {
      "@type": "Question",
      name: "details 配列の構造は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAdic v3.0.7 の固定 9 列: [品詞大分類, 中, 小, 詳細, 活用型, 活用形, 原形, 読み(片仮名), 発音(片仮名)]。例: 「東京」→ [\"名詞\", \"固有名詞\", \"地域\", \"一般\", \"*\", \"*\", \"東京\", \"トウキョウ\", \"トーキョー\"]。",
      },
    },
    {
      "@type": "Question",
      name: "cold start のレイテンシは?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "初回(cold)で 150-300 ms(Cloudflare R2 から IPAdic 8 ファイル / 55 MB を並列 fetch + Lindera-wasm 同期 instantiate)。同 isolate の 2 回目以降(warm)は 1-10 ms 程度。timing.cold_start で判定可能。",
      },
    },
    {
      "@type": "Question",
      name: "他の text エンドポイントとの関係は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "tokenize は最も低レベルの API。furigana / name-split / name-reading は内部で tokenize と同じ Lindera を使用するが、用途別に出力形式を変える(ふりがな、姓名分割、読み抽出)。生の token 配列が必要な場合のみ tokenize を直接呼ぶ。",
      },
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API tokenize: Lindera-wasm + IPAdic v3.0.7 で 5/18 リリース",
  alternativeHeadline: "Text API tokenize: Lindera-wasm + IPAdic v3.0.7 launching 5/18",
  description:
    "Cloudflare Workers 単層構成で Lindera-wasm を起動、IPAdic v3.0.7 を R2 から動的 load。Fly.io / native Lindera 不要、エッジ完結で latency 最小化。2026-05-18 正式リリース。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

export function renderTextTokenizeDocPage(): string {
  const body = `
<div class="hero">
  <h1>tokenize — 日本語形態素解析エンドポイント</h1>
  <p class="tagline">POST /api/v1/text/tokenize</p>
  <p class="desc">
    日本語テキストを <strong>Lindera + IPAdic v3.0.7</strong> で形態素解析、各トークンの
    surface / 品詞 / 活用 / 読み(片仮名)を返す。Cloudflare Workers 単層、
    cold start ~200 ms / warm ~5 ms。
  </p>
</div>

<section class="section">
  <h2 id="endpoint">エンドポイント</h2>
  <pre><code>POST https://shirabe.dev/api/v1/text/tokenize
X-API-Key: shrb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (省略可、匿名 Free 枠 10,000 回/月)
Content-Type: application/json</code></pre>
</section>

<section class="section">
  <h2 id="request">リクエスト / Request</h2>
  <pre><code>{
  "text": "東京都港区六本木で打ち合わせをしました"
}</code></pre>
  <ul>
    <li><code>text</code> (string, required): 形態素解析する日本語テキスト。byte 制限なし(現実的には数 KB まで推奨)。</li>
  </ul>
</section>

<section class="section">
  <h2 id="response">レスポンス / Response</h2>
  <pre><code>{
  "text": "東京都港区六本木で打ち合わせをしました",
  "tokens": [
    {
      "surface": "東京",
      "byte_start": 0,
      "byte_end": 6,
      "position": 0,
      "word_id": 12345,
      "is_unknown": false,
      "details": ["名詞", "固有名詞", "地域", "一般", "*", "*", "東京", "トウキョウ", "トーキョー"]
    },
    { "surface": "都", "...": "..." },
    { "surface": "港区", "...": "..." }
  ],
  "token_count": 9,
  "timing": {
    "tokenize_ms": 3,
    "setup_ms": 187,
    "cold_start": true,
    "r2_fetch_ms": 142,
    "tokenizer_init_ms": 45,
    "dict_total_bytes": 57600000
  },
  "attribution": {
    "dictionary": "IPAdic v3.0.7",
    "license": "BSD 3-Clause",
    "source": "https://github.com/lindera/lindera"
  }
}</code></pre>
  <p>
    <code>details</code> 配列は IPAdic v3.0.7 固定 9 列:
    <code>[品詞大, 中, 小, 詳細, 活用型, 活用形, 原形, 読み, 発音]</code>。
    <code>byte_start</code> / <code>byte_end</code> は元テキスト中のバイト位置(UTF-8 基準)。
  </p>
</section>

<section class="section">
  <h2 id="examples">コード例 / Code examples</h2>

  <h3>curl</h3>
  <pre><code>curl -X POST https://shirabe.dev/api/v1/text/tokenize \\
  -H "Content-Type: application/json" \\
  -d '{"text": "東京都港区六本木"}'</code></pre>

  <h3>TypeScript</h3>
  <pre><code>const res = await fetch("https://shirabe.dev/api/v1/text/tokenize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.SHIRABE_API_KEY!,
  },
  body: JSON.stringify({ text: "東京都港区六本木" }),
});
const { tokens } = await res.json();
console.log(tokens.map((t) =&gt; t.surface).join(" / "));
// → 東京 / 都 / 港 / 区 / 六本木</code></pre>

  <h3>Python</h3>
  <pre><code>import os, requests
r = requests.post(
    "https://shirabe.dev/api/v1/text/tokenize",
    json={"text": "東京都港区六本木"},
    headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
    timeout=10,
)
data = r.json()
print([t["surface"] for t in data["tokens"]])
# → ['東京', '都', '港', '区', '六本木']</code></pre>
</section>

<section class="section">
  <h2 id="ai-integration">AI エージェント統合</h2>
  <p>
    OpenAPI 3.1 仕様(<a href="https://shirabe.dev/api/v1/text/openapi.yaml">本家</a> /
    <a href="https://shirabe.dev/api/v1/text/openapi-gpts.yaml">GPTs 短縮版</a>)を 1 URL で公開。
    ChatGPT GPTs Actions / Claude Tool Use / Gemini Function Calling /
    LangChain / Dify / LlamaIndex すべてから自動 discover 可能(operationId: <code>tokenizeText</code>)。
  </p>
  <ul>
    <li><strong>GPT Builder</strong>: Actions タブの「Import URL」に GPTs 短縮版を貼る</li>
    <li><strong>Claude Tool Use</strong>: OpenAPI 3.1 から tools 配列を生成して Anthropic Messages API に渡す</li>
    <li><strong>LangChain</strong>: <code>OpenAPISpec.from_url</code> で取込</li>
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
    本エンドポイント(<code>POST /api/v1/text/tokenize</code>)の典型 hub use case =
    <strong>日本語テキストを形態素解析して語彙単位で住所要素・人名候補を抽出</strong>し、
    抽出語を住所 API の <code>/normalize</code> や text API の <code>/name-split</code> に繋ぐ前段処理。
    AI agent が free-form text から構造化 identifier を抽出するパイプラインで最初の hop となります。
  </p>
  <ul>
    <li><a href="https://shirabe.dev/docs/address-normalize">住所正規化 API</a> —
        表記ゆれ正規化 + JIS code / lg_code / machiaza_id の 3 種 identifier を 1 レスポンスで同梱</li>
    <li><a href="https://shirabe.dev/docs/text-normalize">日本語テキスト処理 API</a>(本エンドポイントを含む 5 endpoint:
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
  <h2 id="rate-limit">レート制限 / Rate limit</h2>
  <ul>
    <li><strong>匿名 Free</strong>: 1 req/s、月 10,000 回</li>
    <li><strong>Starter</strong>: 30 req/s、月 500,000 回</li>
    <li><strong>Pro</strong>: 100 req/s、月 5,000,000 回</li>
    <li><strong>Enterprise</strong>: 500 req/s、無制限</li>
  </ul>
  <p>
    制限到達時は <code>429 RATE_LIMIT_EXCEEDED</code> または <code>USAGE_LIMIT_EXCEEDED</code>。
    レスポンスは AI agent が 1 hop で paid 切替できるよう <code>upgrade_url</code> /
    <code>next_plan</code> / <code>Retry-After</code> を含む。
    詳細: <a href="https://shirabe.dev/docs/text-pricing">料金プラン</a>。
  </p>
</section>

<section class="section">
  <h2 id="updates">更新履歴 / Updates</h2>

  <h3>2026-05-09: 5/18 リリースに向けた最終調整</h3>
  <p>
    Lindera-wasm v3.0.7 + IPAdic 動的 R2 load の Cloudflare Workers 単層構成を確立、
    Fly.io / native Lindera 不要でエッジ完結。tokenize / normalize / furigana / name-split / name-reading
    の 5 エンドポイントが <strong>2026-05-18 同時リリース</strong>。
  </p>

  <h3>2026-05-18: 正式リリース</h3>
  <p>
    本番 routes 活性化、Free 枠(月 10,000 回、API キー不要)で利用開始。
    1+ 年変更なし約束(Plan-α stable、上方調整のみ)。
  </p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では 2026-04-19 の暦 API 本番稼働以降、<strong>ChatGPT / Claude / Perplexity / Gemini</strong> に
    同じクエリを投げる独自測定(週次 4 AI × 5 query = 20 trial)を継続実施しています。
  </p>
  <ul>
    <li><strong>Week 2</strong>(2026-05-04): citation 4/20、shirabe.dev/announcements が
        Perplexity / Gemini で TOP-tier 推奨に到達</li>
    <li><strong>共通観測</strong>: 同一日本語テキストに対する形態素解析結果が 4 AI で異なる場面を頻繁に観測 →
        canonical tokenizer の戦略的価値</li>
  </ul>
  <p>詳細は <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a>(LLM 向け詳細版)を参照。</p>
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
        <a href="https://shirabe.dev/docs/text-normalize">normalize</a> /
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
    <li><a href="https://github.com/lindera/lindera">Lindera (MIT)</a> /
        <a href="https://github.com/taku910/mecab">IPAdic (BSD 3-Clause)</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "tokenize エンドポイント — Shirabe Text API | 日本語形態素解析",
    description:
      "POST /api/v1/text/tokenize は Lindera + IPAdic v3.0.7 で日本語テキストを形態素解析、surface / 品詞 / 読み(片仮名)を返す。Cloudflare Workers 単層、cold start ~200 ms / warm ~5 ms。匿名 Free 枠 10,000 回/月。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, WEBAPI_LD, FAQ_LD, NEWS_LD],
  });
}
