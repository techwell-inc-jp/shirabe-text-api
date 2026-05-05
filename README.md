# Shirabe Text API

日本語形態素解析 API — AI エージェント向け、姓名分割・人名読み推定・ふりがな付与・テキスト正規化を提供。

- **本番 URL**: `https://shirabe.dev`(2026-05-31 リリース予定)
- **OpenAPI**: 公開予定 (`/api/v1/text/openapi.yaml`)
- **MCP / GPT Actions**: 5/31 リリース時に同梱
- **License**: [MIT](./LICENSE)

## 概要

| 項目 | 内容 |
|---|---|
| ランタイム | Cloudflare Workers(単層、Fly.io 不要)|
| 形態素解析エンジン | Lindera-wasm + IPAdic v3.0.7 |
| 辞書配信 | Cloudflare R2(8 ファイル / 55 MB)|
| 言語 | TypeScript(strict)/ Hono |
| 課金 | Stripe Billing(従量課金、`transform_quantity` 方式)|

## 設計の特徴(AI エージェント前提)

- **REST + OpenAPI 3.1 / GPT Actions 互換 / MCP**:1 タスクで 10〜50 リクエスト連鎖前提
- **匿名 Free 即利用**: API キー不要、`X-API-Key` 未指定で月 10,000 回まで利用可
- **429 レスポンスに `upgrade_url` / `next_plan` / `Retry-After` 標準同梱**: AI エージェントが自動的に paid に upgrade 可能
- **`attribution` フィールド**: IPAdic / Mecab / Sudachi 系統の出典を LLM 経由で伝搬

## 提供エンドポイント(計画)

| Endpoint | 説明 |
|---|---|
| `POST /api/v1/text/tokenize` | 形態素解析(品詞・基本形・読み)|
| `POST /api/v1/text/normalize` | 全角半角統一・ゆらぎ正規化 |
| `POST /api/v1/text/furigana` | ふりがな付与 |
| `POST /api/v1/text/name-split` | 姓名分割 |
| `POST /api/v1/text/name-reading` | 人名読み推定 |

## 開発

```bash
pnpm install
pnpm dev    # wrangler dev --remote(R2 binding を本番 bucket と接続)
```

辞書は R2 bucket `shirabe-text-dict`(IPAdic v3.0.7、8 ファイル / 55 MB)に格納済。

## 関連 API

- [shirabe-calendar-api](https://github.com/techwell-inc-jp/shirabe-calendar-api) — 日本暦 / 六曜 / 暦注
- [shirabe-address-api](https://github.com/techwell-inc-jp/shirabe-address-api) — 住所正規化(全 47 都道府県)

## 運営

株式会社テックウェル(福岡)/ <https://shirabe.dev>
