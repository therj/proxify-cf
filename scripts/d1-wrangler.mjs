/**
 * Run Wrangler from apps/worker so wrangler.jsonc and d1-export/ resolve correctly.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const workerDir = join(repoRoot, "apps", "worker");

const require = createRequire(join(workerDir, "package.json"));
const wranglerPkgDir = dirname(require.resolve("wrangler/package.json"));
const wranglerBin = join(wranglerPkgDir, "bin", "wrangler.js");

/**
 * @param {string[]} wranglerArgs arguments after `wrangler` (e.g. ['d1','export', ...])
 * @returns {never | void}
 */
export function runWrangler(wranglerArgs) {
  if (!fs.existsSync(wranglerBin)) {
    console.error(`d1-wrangler: wrangler CLI not found at ${wranglerBin}`);
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [wranglerBin, ...wranglerArgs], {
    cwd: workerDir,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/**
 * @param {string[]} nodeArgs arguments after `node` for a repo script (e.g. path to .mjs + script args)
 */
export function runNodeScript(scriptPathFromRepoRoot, nodeArgs) {
  const scriptAbs = join(repoRoot, scriptPathFromRepoRoot);
  const r = spawnSync(process.execPath, [scriptAbs, ...nodeArgs], {
    cwd: workerDir,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

export function ensureD1ExportDir() {
  fs.mkdirSync(join(workerDir, "d1-export"), { recursive: true });
}
