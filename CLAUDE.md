# CLAUDE.md — Shirabe Text API 固有ルール

このファイルは text API(`shirabe-text-api`)の固有ルール。
**親フォルダの `../CLAUDE.md`(全体共通)→ `../shirabe/CLAUDE.md`(Shirabe 固有)を先に読んでから、本ファイルを適用すること。**

---

## 1. プロダクト概要

- **プロダクト名**: Shirabe Text API
- **リポジトリ**: `techwell-inc-jp/shirabe-text-api`(Public)
- **公開 URL**: `https://shirabe.dev/api/v1/text/*`(5/31 リリース予定)
- **状態**: Phase 2 scaffold、Day 4(2026-05-06)起点
- **概要**: 日本語形態素解析(Tokenize / Normalize / Furigana / Name-split / Name-reading)を AI エージェント向けに提供
- **収益目標**: 1 年後 月 65 万円(暦 / 住所と並ぶ第 3 番目 API)

---

## 2. 技術スタック(text API 固有)

親 §4 + Shirabe §4 に加えて:

- **形態素解析エンジン**: Lindera-wasm v3.0.7(Rust → wasm32-unknown-unknown)
- **辞書**: IPAdic v3.0.7(8 ファイル / 55 MB、Cloudflare R2 配信)
- **R2 bucket**: `shirabe-text-dict`(APAC、Standard、無料枠内)
- **アーキテクチャ**: Workers 単層(Fly.io 不要、Day 3 PoC で 100% 確定)
- **Tokenizer 起動**: Worker cold start で R2 8 ファイル並列 fetch + WebAssembly.Instance 同期化(`src/lindera-glue.ts`)

### Workers wasm import の注意(継承)

- lindera-wasm-bundler は webpack 流の `wasm.__wbindgen_start()` 慣習で Workers と非互換
- 自前 init glue(`src/lindera-glue.ts`)で明示 `new WebAssembly.Instance()` + bg を imports に渡して解決
- Phase 2 monorepo 化(6 月)時にも本 pattern を継承

---

## 3. KV namespace 構成

| Binding | 役割 | namespace ID | 共有 |
|---|---|---|---|
| `API_KEYS` | API キーのハッシュ → プラン情報 | `3b6bfff407974b7cbf79ded8e184c1a6` | **暦 / 住所と共有**(1 キー集約構造、`apis.text` フィールド) |
| `RATE_LIMITS` | 秒次 + 月次レート制限カウンター | TBD(5/7 までに作成) | text API 専用 |
| `USAGE_LOGS` | 月間利用量カウント + リクエストログ | TBD(5/7 までに作成) | text API 専用 |

API_KEYS 共有の方針:
- Stripe Webhook で `apis.text` フィールドを set(5/13-5/24 で実装)
- 旧フォーマット(暦のみ flat)の API キーで text にアクセスすると匿名 Free 扱い
- 新フォーマットの API キーで text 未契約なら同様に匿名 Free 扱い

---

## 4. 提供エンドポイント(計画)

| Endpoint | 状態 | 説明 |
|---|---|---|
| `GET /health` | 実装済(scaffold) | ヘルスチェック |
| `POST /api/v1/text/tokenize` | 実装済(scaffold、IPAdic v3.0.7) | 形態素解析 |
| `POST /api/v1/text/normalize` | 5/13-5/24 実装予定 | 全角半角統一・ゆらぎ正規化 |
| `POST /api/v1/text/furigana` | 5/19-5/25 実装予定 | ふりがな付与 |
| `POST /api/v1/text/name-split` | 5/13-5/18 実装予定 | 姓名分割 |
| `POST /api/v1/text/name-reading` | 5/13-5/18 実装予定 | 人名読み推定 |

---

## 5. 料金プラン(暫定、5/24 までに master-plan v1.05+ で確定)

暦 API と同一構造で起動。価格は 5/24 までに再確認。

| プラン | 月間上限 | 単価 | 月額例 | レート制限 |
|---|---|---|---|---|
| Free | 10,000 回 | 無料 | ¥0 | 1 req/s |
| Starter | 500,000 回 | ¥0.05/回 | 50 万回: ¥25,000 | 30 req/s |
| Pro | 5,000,000 回 | ¥0.03/回 | 500 万回: ¥150,000 | 100 req/s |
| Enterprise | 無制限 | ¥0.01/回 | 1,000 万回: ¥100,000 | 500 req/s |

`canonical = src/middleware/plan-pricing.ts` + master-plan(値が drift したら必ず docs を正にする、calendar 5/5 audit 教訓)。

---

## 6. C-1 paid 突破経路 ergonomics(暦・住所と統一)

429 response shape は AI agent が 1 hop で paid 切替できるよう以下を含む:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED" | "USAGE_LIMIT_EXCEEDED",
    "message": "...",
    "upgrade_url": "https://shirabe.dev/upgrade",
    "pricing_url": "https://shirabe.dev/docs/text-pricing",
    "current_plan": { "name": "free", "monthly_limit": 10000, "monthly_used": 10000 },
    "next_plan": { "name": "starter", "monthly_limit": 500000, "checkout_path": "/upgrade?plan=starter&from=429&api=text", ... }
  }
}
```

`Retry-After` header も標準同梱。

---

## 7. ディレクトリ構成(scaffold 時点)

```
shirabe-text-api/
├── src/
│   ├── index.ts                    # Hono router + middleware chain
│   ├── lindera-glue.ts             # 自前 wasm init glue
│   ├── middleware/
│   │   ├── auth.ts                 # API キー認証(共有 API_KEYS)
│   │   ├── plan-pricing.ts         # PLAN_MONTHLY_LIMITS / NEXT_PLAN_MAP
│   │   ├── rate-limit.ts           # 秒次 + 月次
│   │   └── usage-check.ts          # 月間利用量チェック
│   └── types/
│       ├── api-key.ts              # 1 キー集約構造(暦・住所と同型)
│       └── env.ts                  # Env / AppEnv
├── test/                           # vitest(Phase 2 scaffold: plan-pricing + api-key)
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── CLAUDE.md                       # 本ファイル
```

---

## 8. 5/31 リリースまでのマイルストーン

| 日付 | マイルストーン |
|---|---|
| 5/3-5/6 | PoC sprint(完了:Lindera-wasm + R2 verify、Option A 100% 確定)|
| **5/6** | **Phase 2 scaffold + git push(本日)** |
| 5/7-5/12 | 5 endpoint 実装(tokenize 完成、name-split / name-reading 着手)|
| 5/13-5/24 | normalize / furigana 実装 + Stripe 統合 + OpenAPI 3.1 |
| 5/25-5/30 | hardening + IndexNow / Qiita / GPT 公開準備 |
| **5/31(土)** | **正式リリース** + Kill Switch Full Activation 評価 |

---

## 9. 参照ドキュメント

- 親共通: `../../CLAUDE.md`(全プロジェクト共通)
- Shirabe 固有: `../CLAUDE.md`
- マスタープラン: `../shirabe-assets/docs/master-plan.md`(v1.05、text API 5/31 前倒し)
- text API scoping: `../shirabe-assets/implementation-orders/20260427-text-api-scoping.md`(458 行)
- text API PoC 結果: `../shirabe-assets/knowledge/text-api-poc-results.md`(Day 1-3 経過)

---

**親 CLAUDE.md(全体共通)+ Shirabe CLAUDE.md(プロジェクト固有)+ 本ファイル(API 固有)を全て守ること。矛盾時は親が優先。**
