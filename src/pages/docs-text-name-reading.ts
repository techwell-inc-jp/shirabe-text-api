/**
 * B-1 AI 検索向け SEO ページ: Text API name-reading エンドポイント
 *
 * GET /docs/text-name-reading
 */
import { renderSEOPage } from "./layout.js";

const CANONICAL = "https://shirabe.dev/docs/text-name-reading";
const KEYWORDS = [
  "人名 読み 推定 API",
  "Japanese name reading API",
  "名前 ふりがな API",
  "氏名 読み API",
  "Japanese name furigana",
  "JMnedict API",
  "AIエージェント 人名読み",
  "GPT Actions name reading",
].join(", ");

const ARTICLE_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shirabe Text API name-reading — 日本語人名の読み推定エンドポイント",
  alternativeHeadline: "Shirabe Text API name-reading — Japanese personal name reading estimator",
  description:
    "POST /api/v1/text/name-reading は日本語人名の読みを推定して family_reading / given_reading / reading(連結)を返す。name-split と同型の 5 戦略で姓名分割した後、IPAdic details[7](片仮名読み)を抽出。candidates は IPAdic only MVP では常に空配列、2026-06 の JMnedict 統合で異読候補 populate 予定。",
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
  name: "Shirabe Text API — name-reading",
  description: "Estimate reading (furigana) for a Japanese personal name.",
  url: "https://shirabe.dev/api/v1/text/name-reading",
  documentation: CANONICAL,
  provider: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  potentialAction: {
    "@type": "ConsumeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://shirabe.dev/api/v1/text/name-reading",
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
      name: "name-reading の精度は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAdic only MVP の精度想定: 著名人 80-90% / 一般 50-70% / 稀有 10-30%。IPAdic 人名タグ付き token から details[7] を抽出するため、辞書 hit 時は確実な読みを返す。タグなし部分は surface fallback で読みが漢字のまま残る場合あり、warning と confidence で AI agent が判定可能。",
      },
    },
    {
      "@type": "Question",
      name: "candidates(異読候補)は何が返りますか?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAdic only MVP では candidates は常に空配列。IPAdic は 1 entry につき単一読みのみ持つため、複数読みのある人名(例: 長 = ちょう/おさむ/たけし)では primary reading のみ返される。2026-06 のモノレポ化時に JMnedict (CC BY-SA 4.0) 統合で異読候補を populate 予定。",
      },
    },
    {
      "@type": "Question",
      name: "options.kana の挙動は?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "default は hiragana(IPAdic 提供のカタカナ読みを ひらがなに変換)。katakana 指定で IPAdic そのままの片仮名読みを返す。surface fallback の場合(辞書未登録)は kana 変換せず surface(漢字)のまま返る。furigana エンドポイントと同じ規約。",
      },
    },
    {
      "@type": "Question",
      name: "name-split との違いは?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "name-split は family / given の string 分割のみ + confidence。name-reading は分割に加え family_reading / given_reading / reading(連結)を返す。読みが必要なら name-reading、分割のみでよければ name-split が軽量(レスポンス bytes 半減)。両者とも同じ 5 戦略 fallback を使用。",
      },
    },
  ],
};

const NEWS_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: "Text API name-reading: IPAdic only MVP で 5/31 リリース、6 月 JMnedict で異読候補追加",
  alternativeHeadline: "Text API name-reading: IPAdic only MVP for 5/31, JMnedict alternates in June",
  description:
    "Lindera + IPAdic v3.0.7 の人名タグ + details[7] で読み推定、5 戦略 fallback で姓名分割と読みを 1 リクエストで返す。candidates は 6 月 JMnedict 統合で populate 予定(unilateral good news、課金プラン変更なし)。",
  inLanguage: ["ja", "en"],
  url: `${CANONICAL}#updates`,
  datePublished: "2026-05-09",
  dateModified: "2026-05-09",
  author: { "@type": "Organization", name: "Shirabe (Techwell Inc.)", url: "https://shirabe.dev" },
  publisher: { "@type": "Organization", name: "Techwell Inc.", url: "https://shirabe.dev" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  articleSection: "Updates",
};

export function renderTextNameReadingDocPage(): string {
  const body = `
<div class="hero">
  <h1>name-reading — 日本語人名の読み推定エンドポイント</h1>
  <p class="tagline">POST /api/v1/text/name-reading</p>
  <p class="desc">
    日本語人名(例: 「吉川良介」)を family / given に分割し、それぞれの読みを推定。
    <strong>family_reading + given_reading + reading(連結)</strong> を返す。
    name-split と同型の 5 戦略で姓名分割、IPAdic details[7] から読み抽出。
  </p>
</div>

<section class="section">
  <h2 id="endpoint">エンドポイント</h2>
  <pre><code>POST https://shirabe.dev/api/v1/text/name-reading
X-API-Key: shrb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (省略可、匿名 Free 枠 10,000 回/月)
Content-Type: application/json</code></pre>
</section>

<section class="section">
  <h2 id="request">リクエスト / Request</h2>
  <pre><code>{
  "name": "吉川良介",
  "options": {
    "kana": "hiragana"
  }
}</code></pre>
  <ul>
    <li><code>name</code> (string, required): 読み推定対象の日本語人名</li>
    <li><code>options.kana</code> (enum, default <code>hiragana</code>): <code>hiragana</code> | <code>katakana</code></li>
  </ul>
</section>

<section class="section">
  <h2 id="response">レスポンス / Response</h2>
  <pre><code>{
  "name": "吉川良介",
  "family": "吉川",
  "given": "良介",
  "family_reading": "よしかわ",
  "given_reading": "りょうすけ",
  "reading": "よしかわりょうすけ",
  "candidates": [],
  "confidence": 0.97,
  "matched_by": "dictionary_both",
  "timing": { "tokenize_ms": 4, "setup_ms": 187, "cold_start": true, "...": "..." },
  "attribution": {
    "dictionary": "IPAdic v3.0.7",
    "license": "BSD 3-Clause",
    "source": "https://github.com/lindera/lindera",
    "notes": "IPAdic only MVP. candidates is always an empty array; alternative readings will be populated after JMnedict integration in monorepo phase (June 2026). Accuracy: well-known names 80-90%, ordinary 50-70%, rare 10-30%."
  }
}</code></pre>
  <p>
    <code>reading</code> は <code>family_reading + given_reading</code> の連結文字列。
    <code>candidates</code> は <strong>IPAdic only MVP では常に空配列</strong>、6 月 JMnedict 統合後に
    異読候補(例: 「長」→ ["ちょう", "おさむ", "たけし"])が populate される。
  </p>
</section>

<section class="section">
  <h2 id="examples">コード例 / Code examples</h2>

  <h3>curl</h3>
  <pre><code>curl -X POST https://shirabe.dev/api/v1/text/name-reading \\
  -H "Content-Type: application/json" \\
  -d '{"name": "吉川良介"}'
# → {"family_reading": "よしかわ", "given_reading": "りょうすけ", "reading": "よしかわりょうすけ", ...}</code></pre>

  <h3>TypeScript(連絡先表示用)</h3>
  <pre><code>const res = await fetch("https://shirabe.dev/api/v1/text/name-reading", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.SHIRABE_API_KEY!,
  },
  body: JSON.stringify({ name: "吉川良介" }),
});
const r = await res.json();
const display = \`\${r.name} (\${r.family_reading} \${r.given_reading})\`;
// → 吉川良介 (よしかわ りょうすけ)
if (r.warning === "low_confidence") {
  console.warn(\`読み信頼度低: \${r.name} (\${r.confidence})\`);
}</code></pre>

  <h3>Python(katakana 出力 + バッチ)</h3>
  <pre><code>import os, requests
names = ["吉川良介", "山田太郎", "鈴木一郎"]
for n in names:
    r = requests.post(
        "https://shirabe.dev/api/v1/text/name-reading",
        json={"name": n, "options": {"kana": "katakana"}},
        headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
        timeout=10,
    )
    d = r.json()
    print(f"{d['name']} → {d['family_reading']} {d['given_reading']} ({d['confidence']:.2f})")
# → 吉川良介 → ヨシカワ リョウスケ (0.97)
# → 山田太郎 → ヤマダ タロウ (0.97)
# → 鈴木一郎 → スズキ イチロウ (0.97)</code></pre>
</section>

<section class="section">
  <h2 id="strategies">5 判定戦略 / 5 matching strategies</h2>
  <p>name-split と同型の 5 戦略 fallback。詳細は <a href="https://shirabe.dev/docs/text-name-split#strategies">name-split docs</a>。</p>
  <table>
    <thead>
      <tr><th>matched_by</th><th>family_reading / given_reading の精度</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>dictionary_both</code> (0.97)</td>
        <td>両方とも IPAdic 由来の確実な読み</td>
      </tr>
      <tr>
        <td><code>dictionary_family_only</code> (0.7)</td>
        <td>family_reading は確実、given_reading は surface fallback(漢字のまま残る場合あり)</td>
      </tr>
      <tr>
        <td><code>dictionary_given_only</code> (0.7)</td>
        <td>given_reading は確実、family_reading は surface fallback</td>
      </tr>
      <tr>
        <td><code>whitespace</code> (0.6)</td>
        <td>各 token の details[7] を採用、辞書登録があれば読み確実、未登録なら surface</td>
      </tr>
      <tr>
        <td><code>heuristic</code> (0.4 + warning)</td>
        <td>family_reading / given_reading は空文字、reading は全 token 連結(surface fallback 多)</td>
      </tr>
    </tbody>
  </table>
</section>

<section class="section">
  <h2 id="candidates">異読候補(candidates)について</h2>
  <p>
    日本人名は同じ漢字でも複数の読みを持つ場合があります(例: 「長」→ ちょう / おさむ / たけし、
    「翔」→ かける / しょう / つばさ)。<strong>IPAdic は単一読みのみ提供</strong>するため、
    name-reading は MVP では primary reading のみ返し、<code>candidates</code> は常に空配列。
  </p>
  <p>
    2026-06 のモノレポ化時に <strong>JMnedict (CC BY-SA 4.0、EDRDG)</strong> を offline build + R2 配信の
    self-contained 経路(SudachiDict と同じ pattern)で統合予定。統合後は:
  </p>
  <ul>
    <li><code>candidates</code> に同漢字の代替読みを populate(例: <code>["ちょう", "おさむ"]</code>)</li>
    <li>matched_by に新戦略 <code>dictionary_jmnedict</code> 追加(confidence 0.9 想定)</li>
    <li>下位互換性維持(既存呼出は破壊せず、空配列が populate される形で改善)</li>
  </ul>
  <p>
    これは <strong>unilateral good news</strong>(Free 枠拡張・値下げと同様)で、
    課金プラン変更なし、AI agent 統合コードを変更する必要なし。
  </p>
</section>

<section class="section">
  <h2 id="use-cases">想定ユースケース</h2>
  <ul>
    <li><strong>連絡先 / CRM 入力支援</strong>: ユーザが氏名を入力 → name-reading で ふりがな自動付与 → 表示用 + 検索インデックス用</li>
    <li><strong>音声合成(TTS)</strong>: 氏名読み上げ前に正確な読みを取得、誤読を低減</li>
    <li><strong>フォーム正規化</strong>: 漢字入力欄 + ひらがな入力欄を分離 → name-reading の出力で 2 欄を自動充填</li>
    <li><strong>銀行 / 行政 / KYC</strong>: 確実性が要求される場面では <code>confidence ≥ 0.9</code> を閾値化、warning ありは人手確認に回す</li>
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
    OpenAPI 3.1 仕様で operationId: <code>readName</code>。warning + confidence narrative により
    AI agent は「自動採用 vs 人手確認」を 1 hop で判定可能。
  </p>
</section>

<section class="section">
  <h2 id="updates">更新履歴 / Updates</h2>

  <h3>2026-05-09: name-reading IPAdic only MVP 実装完了</h3>
  <p>
    name-split と同型の 5 戦略 fallback を実装、IPAdic details[7] からの読み抽出 + 連結 reading 出力
    (<a href="https://github.com/techwell-inc-jp/shirabe-text-api/pull/5">PR #5</a>、
    scoping 5/13-5/18 比 +4 日先行)。
  </p>

  <h3>2026-05-31: 正式リリース予定</h3>
  <p>本番 routes 活性化、Free 枠で利用開始。1+ 年変更なし約束。</p>

  <h3>2026-06: JMnedict 統合(計画)</h3>
  <p>
    JMnedict (CC BY-SA 4.0、EDRDG) を SudachiDict と同じ self-contained 経路(offline build + R2 配信)で
    統合、<code>candidates</code> 異読候補を populate + 新戦略 <code>dictionary_jmnedict</code> 追加。
    精度向上は <strong>unilateral good news</strong>。
  </p>
</section>

<section class="section">
  <h2 id="multi-ai">4 AI 観測の独自データ / Observed Multi-AI Landscape</h2>
  <p>
    Shirabe では 4 大 AI に同じ人名読みクエリを投げる独自測定を継続実施しています。
    AI が自前で読み推定を行うとフォーマット・読み候補の出し方が分裂しますが、name-reading なら
    全 AI で同一の <code>{family_reading, given_reading, reading, candidates, confidence}</code>
    構造が返り、下流処理を統一できます。
  </p>
  <p>詳細は <a href="https://shirabe.dev/llms-full.txt">llms-full.txt</a> を参照。</p>
</section>

<section class="section">
  <h2 id="related">関連リンク / Related</h2>
  <ul>
    <li><a href="https://shirabe.dev/docs/text-name-split">name-split エンドポイント(分割のみ、軽量)</a></li>
    <li><a href="https://shirabe.dev/docs/text-furigana">furigana エンドポイント(全文ふりがな)</a></li>
    <li><a href="https://shirabe.dev/docs/text-tokenize">tokenize エンドポイント(詳細版)</a></li>
    <li><a href="https://shirabe.dev/docs/text-pricing">料金プラン</a></li>
    <li><a href="https://shirabe.dev/api/v1/text/openapi.yaml">OpenAPI 3.1 仕様</a></li>
    <li><a href="https://www.edrdg.org/jmdict/edict_doc.html">JMnedict (CC BY-SA 4.0、6 月統合予定)</a></li>
  </ul>
</section>
`;

  return renderSEOPage({
    title: "name-reading エンドポイント — Shirabe Text API | 日本語人名の読み推定",
    description:
      "POST /api/v1/text/name-reading は日本語人名を family/given に分割 + 各部分の読みを推定。Lindera + IPAdic v3.0.7 で 5 戦略 fallback。candidates は 6 月 JMnedict 統合で populate 予定(unilateral good news)。匿名 Free 枠 10,000 回/月。",
    body,
    canonicalUrl: CANONICAL,
    keywords: KEYWORDS,
    jsonLd: [ARTICLE_LD, WEBAPI_LD, FAQ_LD, NEWS_LD],
  });
}
