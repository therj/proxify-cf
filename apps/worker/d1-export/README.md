# D1 export workspace

Part of **[proxify-cf](https://github.com/therj/proxify-cf)**.

- **`pnpm db:export:remote:*`** (via [`scripts/d1-tooling.mjs`](../../../scripts/d1-tooling.mjs)) writes **`*.raw.sql`** here.
- **`pnpm db:filter:dump`** produces the filtered **`*.sql`** used by **`pnpm db:import:local:*`**.
- **`pnpm db:pull:remote`** runs export → filter → import for **production** in one step.

Database names and relative paths are defined in [`scripts/d1-constants.mjs`](../../../scripts/d1-constants.mjs); they must stay aligned with **`database_name`** in [`wrangler.jsonc`](../wrangler.jsonc) for each env.

`*.sql` files here are **gitignored** (see repo `.gitignore`).
