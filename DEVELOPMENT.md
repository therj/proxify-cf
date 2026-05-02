# Local Development

## Prerequisites
- Node.js & pnpm
- Wrangler CLI (`npm install -g wrangler`)

## Setup
1. **Install Dependencies**
   ```bash
   pnpm install
   ```
2. **Apply Local Database Migrations**
   Before first run or after pulling schema changes: **`pnpm --filter worker db:migrate:local`**, or **`pnpm run setup`** for a fuller bootstrap.
3. **Copy remote D1 data into local (optional)**  
   Requires `wrangler login` and local schema already applied (`db:migrate:local`). Run **`pnpm db:pull:remote`** — exports remote data (excluding bookkeeping inserts that would clash with local `d1_migrations`).
4. **Configure Environment**
   Ensure `apps/worker/.dev.vars` exists with a development KEK (Key Encryption Key):
   ```
   KEK="local-dev-dummy-kek-32-chars-long"
   ```

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

[`apps/admin/vite.config.ts`](apps/admin/vite.config.ts) proxies **`/admin/api/v1`** and **`/health`** to **`http://127.0.0.1:8787`**. API calls are same-origin on `:5173`; Vite forwards them to the worker.

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

`wrangler dev` (Miniflare) binds **`proxify_cache`** like production. On cacheable code paths the Worker **reads KV first**, then D1 on miss. Admin list **GET** endpoints and proxy auth metadata share the same **`v1:meta:cfg_epoch`** invalidation as in prod (TTL is **4 hours** as a backstop only).

After changing routes, keys, or grants, the app bumps the epoch on relevant mutations; you can also call **`POST /admin/api/v1/cache/purge`** with `{"scope":"all"}` if you need a manual reset. To wipe **all** local Worker state (D1 + KV files under Miniflare), delete **`apps/worker/.wrangler/`** and run **`pnpm --filter worker db:migrate:local`** again before **`pnpm dev`** / **`pnpm dev:hmr`**.

### Access logs (local)

Traffic through the proxy writes **`access_log`** rows into **local D1** (same as production schema). **`GET /admin/api/v1/access`** reads straight from D1 with no KV cache. Exercise proxied routes against **`localhost:8787`** (or your dev hostname) and inspect **Access logs** in the admin UI or query local SQLite under Miniflare if needed.

## Advanced (usually unnecessary)

Routing the worker’s **`/`** through port **5173** for a single URL adds Wrangler proxy complexity. Using **5173 for the UI** and **8787 for the API** is the usual Vite pattern.
