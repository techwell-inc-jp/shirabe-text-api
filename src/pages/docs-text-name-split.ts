/**
 * B-1 AI 検索向け SEO ページ: Text API name-split エンドポイント
 *
 * GET /docs/text-name-split
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-name-split";
const KEYWORDS = [
  "姓名分割 API",
  "Japanese name split API",
  "人名 family given API",
  "日本人名 構造化",
  "氏名 分割 API",
  "name parser Japan",
  "AIエージェント 人名処理",
  "GPT Actions Japanese name",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API name-split — 日本語人名の姓名分割エンドポイント",
  alternativeHeadline: "Shirabe Text API name-split — Japanese personal name splitter",
  description:
    "POST /api/v1/text/name-split は日本語人名(例: 「吉川良介」)を family / given に分割。Lindera + IPAdic 人名タグ(姓 / 名)+ 空白区切り + 長さベース heuristic の 5 戦略 fallback。confidence (0-1) と warning=\"low_confidence\" を AI agent ergonomics として同梱。",
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
  name: "Shirabe Text API — name-split",
  description: "Split a Japanese personal name into family/given parts.",
  url: "https://shirabe.dev/api/v1/text/name-split",
  documentation: CANONICAL,
  provider: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  potentialAction: {
    "@type": "ConsumeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://shirabe.dev/api/v1/text/name-split",
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
      name: "name-split の精度は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAdic only MVP の精度想定: 著名人 80-90% / 一般 50-70% / 稀有 10-30%。IPAdic に登録された人名タグ(姓 / 名)を持つ人名で confidence 0.97。タグなしは空白 / 長さベース heuristic にフォールバック、confidence 0.4-0.7。2026-06 のモノレポ化時に JMnedict 統合予定(精度向上 = unilateral good news)。",
      },
    },
    {
      "@type": "Question",
      name: "判定経路 (matched_by) の意味は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "5 戦略: dictionary_both(隣接 姓+名 タグペア、0.97)/ dictionary_family_only(姓のみタグ、0.7)/ dictionary_given_only(名のみタグ、0.7)/ whitespace(空白区切り、0.6)/ heuristic(長さベース 1+1/2+1/2+残、0.4 + warning)。confidence < 0.5 で warning=\"low_confidence\" 同梱。",
      },
    },
    {
      "@type": "Question",
      name: "外国人名や旧字体も対応しますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "外国人名(カタカナ表記)は IPAdic に登録なければ heuristic fallback で 1+1 / 2+残 split、confidence 0.4。旧字体(高 ⇄ 髙、邊 ⇄ 辺)はそのまま処理されますが、辞書登録されていない可能性が高く matched_by=heuristic になりがち。確実性が必要な場合は warning と confidence をチェック。",
      },
    },
    {
      "@type": "Question",
      name: "name-reading との違いは?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "name-split は family / given の分割のみ(string 2 つ + confidence)。name-reading は分割 + 各部分の読み(family_reading / given_reading)を返す。読みが必要なら name-reading、分割のみでよければ name-split が軽量。両者とも内部で同じ Lindera + 5 戦略を使用。",
      },
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API name-split: IPAdic only MVP で 5/18 リリース、6 月に JMnedict 統合",
  alternativeHeadline: "Text API name-split: IPAdic only MVP for 5/18, JMnedict integration in June",
  description:
    "Lindera + IPAdic v3.0.7 の人名タグ + 空白 + 長さ heuristic の 5 戦略 fallback で姓名分割。confidence + warning narrative を AI agent ergonomics として同梱。2026-06 のモノレポ化時に JMnedict user dictionary 統合で精度向上予定。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

export function renderTextNameSplitDocPage(): string {
  const body = `
<div class="hero">
  <h1>name-split — 日本語人名の姓名分割エンドポイント</h1>
  <p class="tagline">POST /api/v1/text/name-split</p>
  <p class="desc">
    日本語人名(例: 「吉川良介」)を <code>family</code> / <code>given</code> に分割。
    IPAdic 人名タグ + 空白 + 長さ heuristic の <strong>5 戦略 fallback</strong>。
    <code>confidence</code> (0-1) と <code>warning</code> を AI agent ergonomics として同梱。
  </p>
</div>

<section class="section">
  <h2 id="endpoint">エンドポイント</h2>
  <pre><code>POST https://shirabe.dev/api/v1/text/name-split
X-API-Key: shrb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (省略可、匿名 Free 枠 10,000 回/月)
Content-Type: application/json</code></pre>
</section>

<section class="section">
  <h2 id="request">リクエスト / Request</h2>
  <pre><code>{
  "name": "吉川良介"
}</code></pre>
  <ul>
    <li><code>name</code> (string, required): 分割対象の日本語人名</li>
  </ul>
</section>

<section class="section">
  <h2 id="response">レスポンス / Response</h2>
  <pre><code>{
  "name": "吉川良介",
  "family": "吉川",
  "given": "良介",
  "confidence": 0.97,
  "matched_by": "dictionary_both",
  "timing": { "tokenize_ms": 4, "setup_ms": 187, "cold_start": true, "...": "..." },
  "attribution": {
    "dictionary": "IPAdic v3.0.7",
    "license": "BSD 3-Clause",
    "source": "https://github.com/lindera/lindera",
    "notes": "IPAdic only MVP. Accuracy: well-known names 80-90%, ordinary 50-70%, rare 10-30%. JMnedict integration planned for monorepo phase (June 2026) to improve coverage."
  }
}</code></pre>
  <p>
    <code>confidence < 0.5</code> 時は <code>warning: "low_confidence"</code> 同梱、
    空入力時は <code>warning: "empty_input"</code>。
  </p>
</section>

<section class="section">
  <h2 id="strategies">5 判定戦略 / 5 matching strategies</h2>
  <table>
    <thead>
      <tr><th>matched_by</th><th>条件</th><th>confidence</th><th>例</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>dictionary_both</code></td>
        <td>隣接する 姓+名 タグペア</td>
        <td>0.97</td>
        <td>吉川 (姓) + 良介 (名) → 吉川 / 良介</td>
      </tr>
      <tr>
        <td><code>dictionary_family_only</code></td>
        <td>姓 タグのみ + 後続 token を given 扱い</td>
        <td>0.7</td>
        <td>山田 (姓) + 獏 (unknown) → 山田 / 獏</td>
      </tr>
      <tr>
        <td><code>dictionary_given_only</code></td>
        <td>名 タグのみ + 先行 token を family 扱い</td>
        <td>0.7</td>
        <td>珍奇 (unknown) + 良介 (名) → 珍奇 / 良介</td>
      </tr>
      <tr>
        <td><code>whitespace</code></td>
        <td>空白区切り 2 セグメント</td>
        <td>0.6</td>
        <td>"珍奇 変人" → 珍奇 / 変人</td>
      </tr>
      <tr>
        <td><code>heuristic</code></td>
        <td>長さベース split: 2 文字 = 1+1、3 文字 = 2+1、4 文字以上 = 2+残</td>
        <td>0.4 + warning</td>
        <td>"珍奇変人" → 珍奇 / 変人</td>
      </tr>
    </tbody>
  </table>
  <p>
    <code>confidence < 0.5</code> で <code>warning: "low_confidence"</code> 同梱、
    AI agent は warning の有無で「再確認が必要な人名」を即判定可能。
  </p>
</section>

<section class="section">
  <h2 id="examples">コード例 / Code examples</h2>

  <h3>curl</h3>
  <pre><code>curl -X POST https://shirabe.dev/api/v1/text/name-split \\
  -H "Content-Type: application/json" \\
  -d '{"name": "吉川良介"}'</code></pre>

  <h3>TypeScript(警告チェック)</h3>
  <pre><code>const res = await fetch("https://shirabe.dev/api/v1/text/name-split", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.SHIRABE_API_KEY!,
  },
  body: JSON.stringify({ name: "吉川良介" }),
});
const result = await res.json();
if (result.warning === "low_confidence") {
  console.warn(\`分割信頼度低: \${result.name} → \${result.family}/\${result.given} (\${result.confidence})\`);
} else {
  console.log(\`姓: \${result.family}, 名: \${result.given}\`);
}
// → 姓: 吉川, 名: 良介</code></pre>

  <h3>Python(バッチ処理)</h3>
  <pre><code>import os, requests
names = ["吉川良介", "山田太郎", "佐藤健", "未知奇人"]
for n in names:
    r = requests.post(
        "https://shirabe.dev/api/v1/text/name-split",
        json={"name": n},
        headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
        timeout=10,
    )
    d = r.json()
    flag = "⚠️" if d.get("warning") == "low_confidence" else "✓"
    print(f"{flag} {n} → {d['family']} / {d['given']} ({d['confidence']:.2f}, {d['matched_by']})")</code></pre>
</section>

<section class="section">
  <h2 id="accuracy">精度 / Accuracy</h2>
  <ul>
    <li><strong>著名人 / 一般的な姓名</strong>: 80-90%(IPAdic 人名タグ hit、confidence 0.97)</li>
    <li><strong>一般的でない姓名</strong>: 50-70%(片方タグ hit + 反対側 fallback、confidence 0.7)</li>
    <li><strong>稀有 / 外国人名</strong>: 10-30%(タグなし、heuristic fallback、confidence 0.4 + warning)</li>
  </ul>
  <p>
    AI agent には warning + confidence で「人手確認が必要かどうか」を判定させる運用が安全。
    確実性が要求される業務(金融 KYC、行政申請等)では <code>confidence ≥ 0.9</code> を閾値とすることを推奨。
  </p>
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
    OpenAPI 3.1 仕様で operationId: <code>splitName</code>。AI agent が name-split を呼ぶと
    confidence + warning が response に含まれるため、<strong>「自動処理 vs 人手確認」の判定が
    AI agent 側で完結</strong>できる(post-hoc の error handling 不要)。
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
    本エンドポイント(<code>POST /api/v1/text/name-split</code>)の典型 hub use case =
    <strong>氏名を姓・名に分割</strong>し、住所 API の世帯主名処理や法人番号 API(6 月後半リリース予定)の
    代表者名処理に連結。B2B 顧客 master の人名カラム正規化で最も呼出頻度が高く、
    name-split → name-reading の連続呼出で姓名 identifier セットを完成させます。
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

  <h3>2026-05-09: name-split + name-reading IPAdic only MVP 実装完了</h3>
  <p>
    Option C(ハイブリッド)経営判断確定により、5/18 リリース時は IPAdic only MVP で投入、
    2026-06 のモノレポ化時に JMnedict user dictionary 統合で精度底上げ
    (<a href="https://github.com/techwell-inc-jp/shirabe-text-api/pull/5">PR #5</a>、
    scoping 5/13-5/18 比 +4 日先行)。
  </p>

  <h3>2026-05-18: 正式リリース</h3>
  <p>本番 routes 活性化、Free 枠で利用開始。1+ 年変更なし約束。</p>

  <h3>2026-06: JMnedict 統合(計画)</h3>
  <p>
    SudachiDict と同じ self-contained 経路(offline build + R2 配信)で JMnedict 派生マップを生成、
    人名タグなしのケースで matched_by を強化。精度向上は <strong>unilateral good news</strong>
    (Free 枠拡張・値下げと同様、課金プラン変更なし、既存呼出に破壊的影響なし)。
  </p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では 4 大 AI に同じ人名クエリを投げる独自測定を継続実施しています。
    AI が自前で姓名分割を行うとフォーマット・粒度が分裂しますが、name-split なら
    全 AI で同一の <code>{family, given, confidence, matched_by, warning}</code> 構造が返り、
    下流処理を統一できます。
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
        <a href="https://shirabe.dev/docs/text-furigana">furigana</a> /
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
    <li><a href="https://www.edrdg.org/jmdict/edict_doc.html">JMnedict (CC BY-SA 4.0、6 月統合予定)</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "name-split エンドポイント — Shirabe Text API | 日本語人名の姓名分割",
    description:
      "POST /api/v1/text/name-split は日本語人名を family / given に分割。Lindera + IPAdic 人名タグ + 空白 + 長さ heuristic の 5 戦略 fallback。confidence + warning narrative を AI agent ergonomics として同梱。匿名 Free 枠 10,000 回/月。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, WEBAPI_LD, FAQ_LD, NEWS_LD],
  });
}
