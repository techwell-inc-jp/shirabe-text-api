/**
 * `*.yaml` をテキストモジュールとして import するための型宣言。
 *
 * Cloudflare Workers (Wrangler) の `[[rules]] type = "Text"` 設定と対になり、
 * バンドル時に YAML ファイルの内容が文字列として default export される。
 */
declare module "*.yaml" {
  const content: string;
  export default content;
}
