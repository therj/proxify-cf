export type Env = {
  DB: D1Database;
  KV_BINDING: KVNamespace;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  LOCAL_ADMIN_EMAIL: string;
  KEK: string;
  ASSETS: Fetcher;
  /** Comma-separated hosts: never append access_log for outcome no_route on these hosts. */
  ACCESS_LOG_OMIT_NO_ROUTE_HOSTS?: string;
  /** If set, cron will delete all data older than this many minutes. */
  DEMO_CLEANUP_RETENTION_MINUTES?: string;
};
