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
   This creates your local SQLite D1 database.
   ```bash
   cd apps/worker
   npx wrangler d1 migrations apply proxify-db --local
   ```
3. **Configure Environment**
   Ensure `apps/worker/.dev.vars` exists with a development KEK (Key Encryption Key):
   ```
   KEK="local-dev-dummy-kek-32-chars-long"
   ```

## Running Locally
Start the Wrangler worker and **`vite build --watch`** for the admin app (keeps `apps/admin/dist` updated for the worker’s static assets — **no Vite dev server / port 5173** unless you opt in):
```bash
pnpm dev
```
- **Worker** (API + home + admin SPA from `dist`): **`http://localhost:8787`** — use **`http://localhost:8787/admin/`** for the admin UI during normal dev.
- **Public home**: `http://localhost:8787/`

Admin sources are rebuilt on save; refresh the browser on `:8787` to see changes (or use optional HMR below).

**Optional — Vite dev server with HMR on port 5173** (runs the watch build in parallel):

```bash
pnpm --filter admin dev:hmr
```

Then open `http://localhost:5173/admin/` for fast refresh; the worker on `:8787` still serves the same app after each watch rebuild.
