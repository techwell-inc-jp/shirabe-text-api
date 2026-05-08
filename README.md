# Shirabe Text API

[![Production](https://img.shields.io/badge/version-1.0.0--phase3-blue)](https://shirabe.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-orange)](https://shirabe.dev/api/v1/text/openapi.yaml)
[![Cloudflare Workers](https://img.shields.io/badge/Edge-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)

日本語テキストの **形態素解析・正規化・ふりがな付与・姓名分割・人名読み推定** を AI エージェント向けに提供する REST API。Cloudflare Workers 単層構成、Lindera-wasm + IPAdic v3.0.7 + SudachiDict-derived normalization map。

- **本番 URL**: `https://shirabe.dev`(2026-05-31 リリース予定)
- **OpenAPI 3.1**: [`/api/v1/text/openapi.yaml`](https://shirabe.dev/api/v1/text/openapi.yaml)(本家)/ [`/api/v1/text/openapi-gpts.yaml`](https://shirabe.dev/api/v1/text/openapi-gpts.yaml)(GPTs 短縮版)
- **MCP / GPT Actions**: 5/31 リリース時に同梱
- **License**: [MIT](./LICENSE)
- **Documentation**: [`/docs/text-*`](https://shirabe.dev/docs/text-pricing)(5 endpoint + pricing、5/31 活性化)

---

## なぜ Shirabe Text API を使うのか

日本語の形態素解析・読み推定・表記正規化を **LLM に直接やらせる** とフォーマット・粒度・誤情報リスクが各 AI で異なります。Shirabe では 2026-04-19 の暦 API リリース以降、**ChatGPT / Claude / Perplexity / Gemini** の 4 大 AI に同じ日本語処理クエリを投げる独自測定(週次 4 AI × 5 query = 20 trial、B-1 加速スプリント)を継続実施し、**4 AI で出力フォーマットが完全分裂する場面を頻繁に観測** しています。

Shirabe Text API は Lindera + IPAdic ベースで決定的な結果を返し、AI エージェントが何を呼んでも同一スキーマの構造化 output が得られます。OpenAPI 3.1 厳格準拠で GPT Actions / Claude Tool Use / LangChain / Dify からの自動 discover に対応。

---

## 提供エンドポイント

| Endpoint | operationId | 用途 | docs |
|---|---|---|---|
| `POST /api/v1/text/tokenize` | `tokenizeText` | 形態素解析(品詞 / 活用 / 読み) | [text-tokenize](https://shirabe.dev/docs/text-tokenize) |
| `POST /api/v1/text/normalize` | `normalizeText` | 全/半角・ひらがな/カタカナ・空白・半角カナ・**Sudachi 表記正規化** | [text-normalize](https://shirabe.dev/docs/text-normalize) |
| `POST /api/v1/text/furigana` | `addFurigana` | ふりがな付与(hiragana / katakana 切替) | [text-furigana](https://shirabe.dev/docs/text-furigana) |
| `POST /api/v1/text/name-split` | `splitName` | 姓名分割(family / given + confidence) | [text-name-split](https://shirabe.dev/docs/text-name-split) |
| `POST /api/v1/text/name-reading` | `readName` | 人名読み推定(family_reading / given_reading + reading 連結) | [text-name-reading](https://shirabe.dev/docs/text-name-reading) |

---

## 設計の特徴(AI エージェント前提)

### 1. REST + OpenAPI 3.1 / GPT Actions / MCP / LangChain 互換

1 URL で OpenAPI を公開、ChatGPT GPTs / Claude Tool Use / Gemini Function Calling / LangChain / Dify / LlamaIndex から自動 discover。1 タスクで 10〜50 リクエスト連鎖前提の rate limit 設計。

### 2. 匿名 Free 即利用

API キー不要、`X-API-Key` 未指定で **月 10,000 回まで** 利用可(レート制限 1 req/s)。AI agent が動作確認 / 個人 PoC で即試せる。Starter 以上は `shrb_` プレフィックスの 37 文字キーを Stripe Checkout で発行。

### 3. AI agent ergonomics narrative 同梱

- **429 レスポンス**: `upgrade_url` / `next_plan` / `pricing_url` / `current_plan` / `Retry-After` 標準同梱、AI agent が 1 hop で paid 切替可能
- **name-split / name-reading**: `confidence` (0-1) + `warning="low_confidence"`(< 0.5)+ `matched_by` enum で「自動採用 vs 人手確認」を AI 側で判定可
- **attribution field**: IPAdic / Lindera / SudachiDict の出典 / license を全 response に同梱、CC BY 4.0 / Apache-2.0 / BSD 3-Clause / MIT の伝搬を保証(LLM 経由含む)

### 4. 1+ 年変更なし約束(Plan-α stable)

料金プラン・課金モデル・上限値・billing schema は 1+ 年変更なし(2026-05-06 経営判断確定)。**上方調整(Free 枠拡張・Paid 単価値下げ・新エンドポイント追加)のみ許可**、既存 AI 統合コードを変更する必要なし。詳細: [text-pricing](https://shirabe.dev/docs/text-pricing)。

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| ランタイム | **Cloudflare Workers**(単層、Fly.io 不要) |
| 形態素解析エンジン | **Lindera-wasm v3.0.7**(MIT) |
| 主辞書 | **IPAdic v3.0.7**(BSD 3-Clause、55 MB / 8 ファイル、R2 配信) |
| 正規化マップ(Phase 3) | **SudachiDict-small derived**(Apache-2.0、88,622 entries / 1.13 MB JSON、R2 配信) |
| 言語 | TypeScript (strict) / Hono |
| 課金 | **Stripe Billing**(従量課金、`transform_quantity` 方式) |
| KV ストア | Cloudflare KV(API_KEYS / RATE_LIMITS / USAGE_LOGS)|
| 監視 | BetterStack |
| CI/CD | GitHub Actions(`wrangler deploy` は CI のみ) |

### Workers 単層構成の根拠

- **辞書 55 MB は R2 動的 fetch + 同 isolate cache で吸収**: cold start ~200 ms / warm ~5 ms
- **Lindera-wasm の Workers 互換問題**: bundler 流の `__wbindgen_start()` 慣習を [src/lindera-glue.ts](./src/lindera-glue.ts) で明示 instantiate に置き換えて解決
- **upstream user dict bytes API なし**: Phase 3 Sudachi 正規化は SudachiDict CSV → offline build → R2 配信の self-contained 経路で実現(upstream Lindera への依存なし)

---

## 開発 / Development

```bash
pnpm install
pnpm dev      # wrangler dev --remote (R2 binding を本番 bucket と接続)
pnpm test     # vitest run
pnpm tsc      # 型チェックのみ
pnpm deploy:dry  # wrangler deploy --dry-run
```

### Phase 3 normalize map のビルド + R2 アップロード

```bash
# 1. SudachiDict raw CSV を S3 から取得 + 解凍
curl -sLo /tmp/small_lex.zip http://sudachi.s3-website-ap-northeast-1.amazonaws.com/sudachidict-raw/20260428/small_lex.zip
unzip -d /tmp /tmp/small_lex.zip

# 2. lookup map に変換(scripts/build-normalize-map.mjs、CI で実行可)
pnpm build:normalize-map -- --input /tmp/small_lex.csv

# 3. R2 へアップロード(本番 bucket、wrangler 経由)
pnpm upload:normalize-map
```

---

## アーキテクチャ

```
AI エージェント (ChatGPT GPTs / Claude Tool Use / Gemini / LangChain / Dify)
   │
   ↓ HTTPS (shirabe.dev/api/v1/text/*)
Cloudflare Workers (本リポジトリ src/)
   ├─ X-API-Key 認証 / レート制限 / KV キャッシュ
   ├─ Stripe Billing メーター連携 + Webhook idempotency
   ├─ OpenAPI 3.1 配信(本家 + GPTs 短縮版)
   ├─ B-1 SEO docs ページ配信(/docs/text-*)
   └─ Lindera-wasm + R2 動的辞書 load
        ├─ IPAdic v3.0.7(8 ファイル / 55 MB、tokenize / furigana / name-split / name-reading)
        └─ SudachiDict-derived normalize map(1.13 MB JSON、normalize Phase 3)
```

Fly.io / 専用 VM 不要、エッジ完結。住所 API(`shirabe-address-api`)とは異なり、abr-geocoder のようなネイティブモジュール依存がないため Workers 単層が成立。

---

## 統合例

### ChatGPT Custom GPT (Actions)

GPT Builder の「Actions」タブ → 「Import URL」に以下を貼付け:

```
https://shirabe.dev/api/v1/text/openapi-gpts.yaml
```

`Authentication: API Key (Header: X-API-Key)`、Conversation Starters の例:

```
1. 「東京都港区六本木で打ち合わせをしました」を形態素解析して
2. 「コンピュータと行なう作業」を Sudachi 正規化して
3. 「吉川良介」の姓名を分割して読みも推定して
4. 「明日は晴れでしょう」にふりがなを付けて
```

### Claude Tool Use (Anthropic SDK)

```typescript
const tool = {
  name: "split_japanese_name",
  description: "日本人名を family / given に分割し confidence を返す",
  input_schema: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  },
};

async function runTool(name: string) {
  const res = await fetch("https://shirabe.dev/api/v1/text/name-split", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.SHIRABE_API_KEY!,
    },
    body: JSON.stringify({ name }),
  });
  return res.json();
}
```

### LangChain / Python

```python
from langchain.tools import StructuredTool
import requests, os

def normalize_text(text: str, sudachi: bool = False) -> dict:
    """日本語テキストを正規化(全/半角・ひらがな/カタカナ・Sudachi 表記正規化)"""
    r = requests.post(
        "https://shirabe.dev/api/v1/text/normalize",
        json={"text": text, "options": {"width": "half", "sudachi": "apply" if sudachi else "preserve"}},
        headers={"X-API-Key": os.environ["SHIRABE_API_KEY"]},
        timeout=10,
    )
    return r.json()

tool = StructuredTool.from_function(normalize_text)
```

---

## レート制限 / 料金プラン

| プラン | 月間上限 | 単価 | レート制限 |
|---|---|---|---|
| **Free**(API キー不要) | 10,000 回 | ¥0 | 1 req/s |
| **Starter** | 500,000 回 | ¥0.05/回 | 30 req/s |
| **Pro** | 5,000,000 回 | ¥0.03/回 | 100 req/s |
| **Enterprise** | 無制限 | ¥0.01/回 | 500 req/s |

詳細: [text-pricing](https://shirabe.dev/docs/text-pricing)。**1+ 年変更なし約束**(上方調整のみ)。

暦 API / 住所 API と **同一 API キーで利用可能**(1 キー集約構造、`apis.text` フィールド)。プランは API ごとに独立(暦 Starter + 住所 Free + テキスト Pro 等の組合せ可)。

---

## License / Attribution

Shirabe Text API のソースコードは **MIT License**(本リポジトリの [LICENSE](./LICENSE))。

ランタイムレスポンスの `attribution` field で以下の出典を全 AI / LLM 経由で伝搬:

- **IPAdic v3.0.7**: BSD 3-Clause、Lindera 経由で配布
- **Lindera v3.0.7**: MIT (lindera-project)
- **SudachiDict-small**(Phase 3 normalize 適用時のみ): Apache-2.0 (WorksApplications)

---

## 関連 API(Shirabe family)

- [shirabe-calendar-api](https://github.com/techwell-inc-jp/shirabe-calendar-api) — 日本暦 / 六曜 / 暦注 / 干支
- [shirabe-address-api](https://github.com/techwell-inc-jp/shirabe-address-api) — 住所正規化(全 47 都道府県、ABR / abr-geocoder)
- shirabe-text-api(本リポジトリ)— 日本語形態素解析・正規化・ふりがな・人名処理

すべて 1 キー集約構造、shirabe.dev 共通ドメイン、OpenAPI 3.1 / GPT Actions / Claude Tool Use 互換。

---

## 4 AI 観測の独自データ(B-1 加速スプリント)

Shirabe では本番稼働(2026-04-19、暦 API)以降、**ChatGPT / Claude / Perplexity / Gemini** の 4 大 AI に同じクエリを投げる独自測定を週次で実施しています。

- **Week 1**(2026-04-26): citation 0/20、住所 API リリース前 baseline
- **Week 2**(2026-05-04): citation **4/20**(関連含 6/20)、`shirabe.dev/announcements` が Perplexity / Gemini で TOP-tier 推奨に到達
- **共通観測**: 同一日本語処理クエリで 4 AI の出力が分裂する場面が頻発 → canonical structured API の戦略的必要性

詳細: [llms-full.txt](https://shirabe.dev/llms-full.txt)(LLM 向け詳細版)。

---

## 運営

株式会社テックウェル(福岡)/ <https://shirabe.dev> / <https://www.techwell.jp/>

---

## Contributing

Issues / PRs welcome. 本リポジトリは **AI エージェント前提の API 設計** を実証するためのものです。実装方針については [親プロジェクトの CLAUDE.md](https://github.com/techwell-inc-jp/shirabe-calendar-api) を参照。
