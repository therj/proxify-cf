#!/usr/bin/env node
/**
 * D1 remote export / filter / local import helpers. Paths align with apps/worker/package.json docs.
 *
 *   node scripts/d1-tooling.mjs export --env dev|production
 *   node scripts/d1-tooling.mjs import-local --env dev|production
 *   node scripts/d1-tooling.mjs pull-remote
 */
import fs from "node:fs";
import { join } from "node:path";
import { D1_PROFILE, parseEnvFlag } from "./d1-constants.mjs";
import { ensureD1ExportDir, runNodeScript, runWrangler, workerDir } from "./d1-wrangler.mjs";

function usage() {
  console.error(`Usage:
  node scripts/d1-tooling.mjs export --env dev|production
  node scripts/d1-tooling.mjs import-local --env dev|production
  node scripts/d1-tooling.mjs pull-remote`);
  process.exit(1);
}

function main() {
  const [, , subcommand, ...rest] = process.argv;
  if (!subcommand) usage();

  if (subcommand === "export") {
    const { env } = parseEnvFlag(rest);
    const p = D1_PROFILE[env];
    ensureD1ExportDir();
    runWrangler([
      "d1",
      "export",
      p.databaseName,
      "--remote",
      "--env",
      p.wranglerEnv,
      "--no-schema",
      "--output",
      p.rawRelative,
    ]);
    return;
  }

  if (subcommand === "import-local") {
    const { env } = parseEnvFlag(rest);
    const p = D1_PROFILE[env];
    const fileAbs = join(workerDir, p.filteredRelative);
    if (!fs.existsSync(fileAbs)) {
      console.error(
        `d1-tooling: missing ${p.filteredRelative}. Run export, then filter-d1-dump, or use pull-remote.`,
      );
      process.exit(1);
    }
    runWrangler([
      "d1",
      "execute",
      p.databaseName,
      "--local",
      "--env",
      p.wranglerEnv,
      "--file",
      p.filteredRelative,
      "--yes",
    ]);
    return;
  }

  if (subcommand === "pull-remote") {
    const p = D1_PROFILE.production;
    ensureD1ExportDir();
    runWrangler([
      "d1",
      "export",
      p.databaseName,
      "--remote",
      "--env",
      p.wranglerEnv,
      "--no-schema",
      "--output",
      p.rawRelative,
    ]);
    runNodeScript("scripts/filter-d1-dump.mjs", [p.rawRelative, p.filteredRelative]);
    runWrangler([
      "d1",
      "execute",
      p.databaseName,
      "--local",
      "--env",
      p.wranglerEnv,
      "--file",
      p.filteredRelative,
      "--yes",
    ]);
    return;
  }

  usage();
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
