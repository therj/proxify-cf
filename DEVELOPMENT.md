# Local Development

**Repository:** [github.com/therj/proxify-cf](https://github.com/therj/proxify-cf)

## Prerequisites
- Node.js & pnpm
- Wrangler CLI (`npm install -g wrangler`)

## Setup
1. **Install Dependencies**
   ```bash
   pnpm install
   ```
2. **Wrangler config (`apps/worker/wrangler.jsonc`)**
   Set D1 **`database_id`** and KV **`id`** inside **`env.dev`** and **`env.production`**. IDs come from **`wrangler d1 create … --env …`** / **`wrangler kv namespace create … --env …`** or the Dashboard — there is **no** separate bindings env file in this repo.
3. **Apply Local Database Migrations**
   Before first run or after pulling schema changes: **`pnpm --filter worker db:migrate:local`**, or **`pnpm run setup`** for a fuller bootstrap.
4. **Copy remote D1 data into local (optional)**  
   Requires **`wrangler login`** and local schema already applied (**`pnpm --filter worker db:migrate:local`** or **`db:migrate:local:production`** for the env you mirror). From repo root (or `pnpm --filter worker …` from `apps/worker`):

   | Step | Command (production example) |
   |------|------------------------------|
   | Export remote DB (no schema) | **`pnpm db:export:remote:production`** → **`apps/worker/d1-export/production.raw.sql`** |
   | Strip `d1_migrations` / `sqlite_sequence` lines | **`pnpm db:filter:dump -- d1-export/production.raw.sql d1-export/production.sql`** (paths relative to **`apps/worker`**) |
   | Import into **local** Miniflare D1 | **`pnpm db:import:local:production`** (reads **`d1-export/production.sql`**) |

   For **dev** remote → local: **`pnpm db:export:remote:dev`**, then filter **`d1-export/dev.raw.sql`** → **`d1-export/dev.sql`**, then **`pnpm db:import:local:dev`**.

   **One-shot (production only):** **`pnpm db:pull:remote`** runs export → filter → import with the default production paths above.

   Database names and default paths live in **[`scripts/d1-constants.mjs`](scripts/d1-constants.mjs)**; keep them in sync with **`database_name`** in **`wrangler.jsonc`** if you rename D1 databases.
5. **Configure Environment (secrets)**
   In **`apps/worker/`**, copy [`.dev.vars.example`](apps/worker/.dev.vars.example) to **`.dev.vars`** and set **`KEK`**. Wrangler reads `.dev.vars` next to **`wrangler.jsonc`** (optional: `.dev.vars.dev` / `.dev.vars.production` for per-env dev files).

## Running Locally

The **landing page** (`/`) and **admin console** (`/admin/*`) are one **Vite + React SPA**. Wrangler serves the same built files from `apps/admin/dist` on **`http://localhost:8787`** (`/` and `/admin/…`). Hot reload still requires the Vite dev server.

### Recommended — Vite HMR + Worker API (single command)

```bash
pnpm dev:hmr
```

This starts:

- **Worker** on **`http://localhost:8787`** (API, proxy, full SPA from `dist` — **no HMR**; refresh to see changes).
- **Vite** (`pnpm --filter admin dev:hmr`): dev server on **`http://localhost:5173`** plus `vite build --watch`.

**Open the UI from Vite for HMR:**

- **Home:** **`http://localhost:5173/`**
- **Admin console:** **`http://localhost:5173/admin`**
- **Health (HTML):** **`http://localhost:5173/health`** — same SPA shell; it loads **`GET /api/health`** (proxied to the worker as **`http://127.0.0.1:8787/api/health`**).

[`apps/admin/vite.config.ts`](apps/admin/vite.config.ts) proxies **`/admin/api/v1`** and **`/api`** (prefix) to **`http://127.0.0.1:8787`**. API calls are same-origin on `:5173`; Vite forwards them to the worker.

**Documentation** in the app (`/docs`) renders **README.md**, **DEVELOPMENT.md**, and **DEPLOY.md** from the repo root; edit those files to change what operators see on the site.

### Alternative — Watch build only (refresh `:8787` after saves)

```bash
pnpm dev
```

- **`http://localhost:8787/`** — landing page (same SPA).
- **`http://localhost:8787/admin`** — admin shell.

Rebuild runs on save (`vite build --watch`); **refresh** the browser to see changes.

### Manual two-terminal HMR

```bash
pnpm --filter worker dev
pnpm --filter admin dev:hmr
```

Same URLs as above on port **5173**.

## KV caching (local)

**`wrangler dev --env dev`** (Miniflare) binds **`KV_BINDING`** like production. On cacheable code paths the Worker **reads KV first**, then D1 on miss. Admin list **GET** endpoints and proxy auth metadata share the same **`v1:meta:cfg_epoch`** invalidation as in prod (TTL is **4 hours** as a backstop only).

After changing routes, keys, or grants, the app bumps the epoch on relevant mutations; you can also call **`POST /admin/api/v1/cache/purge`** with `{"scope":"all"}` if you need a manual reset. To wipe **all** local Worker state (D1 + KV files under Miniflare), delete **`apps/worker/.wrangler/`** and run **`pnpm --filter worker db:migrate:local`** again before **`pnpm dev`** / **`pnpm dev:hmr`**.

### Access logs (local)

Traffic through the proxy writes **`access_log`** rows into **local D1** (same as production schema). **`GET /admin/api/v1/access`** reads straight from D1 with no KV cache. Exercise proxied routes against **`localhost:8787`** (or your dev hostname) and inspect **Access logs** in the admin UI or query local SQLite under Miniflare if needed.

## Advanced (usually unnecessary)

Routing the worker’s **`/`** through port **5173** for a single URL adds Wrangler proxy complexity. Using **5173 for the UI** and **8787 for the API** is the usual Vite pattern.
