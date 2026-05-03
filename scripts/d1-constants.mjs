/**
 * Single source of truth for D1 remote export / local import paths (apps/worker cwd).
 * Database names must match `database_name` in wrangler.jsonc per env.
 */
export const D1_EXPORT_DIR = "d1-export";

/** @typedef {{ wranglerEnv: 'dev' | 'production'; databaseName: string; rawRelative: string; filteredRelative: string }} D1Profile */

/** @type {Record<'dev' | 'production', D1Profile>} */
export const D1_PROFILE = {
  dev: {
    wranglerEnv: "dev",
    databaseName: "proxify_demo-db",
    rawRelative: `${D1_EXPORT_DIR}/dev.raw.sql`,
    filteredRelative: `${D1_EXPORT_DIR}/dev.sql`,
  },
  production: {
    wranglerEnv: "production",
    databaseName: "proxify-db",
    rawRelative: `${D1_EXPORT_DIR}/production.raw.sql`,
    filteredRelative: `${D1_EXPORT_DIR}/production.sql`,
  },
};

/**
 * @param {string} value
 * @returns {'dev' | 'production'}
 */
export function parseEnvArg(value) {
  if (value === "dev" || value === "production") return value;
  throw new Error(`Invalid --env ${JSON.stringify(value)}: expected dev or production`);
}

/**
 * @param {string[]} argv
 * @returns {{ env: 'dev' | 'production' }}
 */
export function parseEnvFlag(argv) {
  const i = argv.indexOf("--env");
  if (i === -1 || i + 1 >= argv.length) {
    throw new Error("Missing required flag: --env dev|production");
  }
  return { env: parseEnvArg(argv[i + 1]) };
}
