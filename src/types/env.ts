/**
 * Cloudflare Workers 環境変数・バインディングの型定義(text API)
 */

export type AnalyticsEngineDataPoint = {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
};

export type AnalyticsEngineDataset = {
  writeDataPoint: (point: AnalyticsEngineDataPoint) => void;
};

export type Env = {
  /** APIキーのハッシュ → プラン情報(暦・住所と同一 namespace) */
  API_KEYS: KVNamespace;
  /** レート制限カウンター(text API 専用) */
  RATE_LIMITS: KVNamespace;
  /** 利用量ログ(text API 専用) */
  USAGE_LOGS: KVNamespace;
  /** R2 上の IPAdic 辞書 bucket(8 ファイル / 55 MB) */
  DICT: R2Bucket;
  /** Analytics Engine データセット(AI/人間分離計測) */
  ANALYTICS?: AnalyticsEngineDataset;
  /** API バージョン */
  API_VERSION: string;
  /** Stripe Secret Key(Secrets で管理) */
  STRIPE_SECRET_KEY?: string;
  /** Stripe Webhook Secret(Secrets で管理) */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Stripe Price ID — Starter */
  STRIPE_PRICE_STARTER?: string;
  /** Stripe Price ID — Pro */
  STRIPE_PRICE_PRO?: string;
  /** Stripe Price ID — Enterprise */
  STRIPE_PRICE_ENTERPRISE?: string;
  /** Basic 認証ユーザー名(internal endpoints、暦・住所と同 credential 想定、5/31 リリース時 secret 投入) */
  INTERNAL_STATS_USER?: string;
  /** Basic 認証パスワード(internal endpoints) */
  INTERNAL_STATS_PASS?: string;
  /**
   * enrich 内部 subrequest(案 X)識別トークン。calendar の enrich endpoint と共有する
   * 共有シークレット。`X-Shirabe-Internal` がこの値と一致する subrequest は課金対象外
   * (非計上)とする。未設定時は honor しない(fail-closed)。
   */
  INTERNAL_ENRICH_TOKEN?: string;
};

export type AppVariables = {
  plan: string;
  customerId: string;
  apiKeyHash: string;
  apiKeyIdHash: string;
};

export type AppEnv = {
  Bindings: Env;
  Variables: AppVariables;
};
