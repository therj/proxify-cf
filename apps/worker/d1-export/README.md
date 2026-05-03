# D1 export workspace

Part of **[proxify-cf](https://github.com/therj/proxify-cf)**.

**Store all D1 SQL backups and filtered dumps in this folder** (not under `apps/worker/` root). Tooling writes predictable names; ad-hoc copies should still live here, e.g. `backup-2026-05-03.raw.sql`.

- **`pnpm db:export:remote:*`** (via [`scripts/d1-tooling.mjs`](../../../scripts/d1-tooling.mjs)) writes **`*.raw.sql`** here.
- **`pnpm db:filter:dump -- <raw.sql> <out.sql>`** (from repo root; paths relative to **`apps/worker`**, e.g. `d1-export/production.raw.sql` → `d1-export/production.sql`) produces the filtered **`*.sql`** used by **`pnpm db:import:local:*`**.
- **`pnpm db:pull:remote`** runs export → filter → import for **production** in one step.

Database names and relative paths are defined in [`scripts/d1-constants.mjs`](../../../scripts/d1-constants.mjs); they must stay aligned with **`database_name`** in [`wrangler.jsonc`](../wrangler.jsonc) for each env.

**Gitignored:** `d1-export/*.sql` and `d1-export/*.raw.sql` (see repo `.gitignore`). Only this README (and migrations under `migrations/`) belong in version control.
