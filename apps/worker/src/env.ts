export type Env = {
  DB: D1Database;
  KV_BINDING: KVNamespace;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  LOCAL_ADMIN_EMAIL: string;
  KEK: string;
  ASSETS: Fetcher;
};
