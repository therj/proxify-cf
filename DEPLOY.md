# Deployment guide

**Repository:** [github.com/therj/proxify-cf](https://github.com/therj/proxify-cf)

This repo ships **one Worker** that bundles API routes and the **admin SPA** from [`apps/admin/dist`](apps/admin/dist) via Wrangler **[assets](https://developers.cloudflare.com/workers/static-assets/)** ([`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc); annotated reference: [`apps/worker/wrangler.jsonc.example`](apps/worker/wrangler.jsonc.example)). You normally **do not** deploy the admin to Cloudflare Pages unless you want a separate hosting setup.

**Wrangler environments:** a single [`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc) defines only **`env.dev`** and **`env.production`** — there is **no** implicit default: every deploy and local **`wrangler dev`** must pass **`--env dev`** or **`--env production`**. Shared fields are **`main`**, compatibility flags, and **`assets`**; routes, D1, KV, and **`vars`** live under each environment object. D1/KV UUIDs live **only in `wrangler.jsonc`** (no repo env-file injection layer).

**Do not** run bare **`wrangler deploy`** or **`wrangler dev`** without **`--env`**: Wrangler will treat that as a separate empty “top-level” environment and you will **not** get D1/KV bindings. Use the **`pnpm`** scripts under [`apps/worker/package.json`](apps/worker/package.json) or always pass **`--env dev`** / **`--env production`**.

---

## 1. Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/), Workers enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — from `apps/worker`, use **`pnpm exec wrangler`** or the **`pnpm`** scripts in [`apps/worker/package.json`](apps/worker/package.json) (they pass **`--env`** where needed).
- Node.js **current or Active LTS** (Wrangler 4 does not support Node 16)

---

## 2. Create D1 and KV

Run from the repo root (or `cd apps/worker` and drop `cd apps/worker &&`):

**Production (`--env production`)**

```bash
cd apps/worker
pnpm exec wrangler d1 create proxify-db
pnpm exec wrangler kv namespace create proxify_cache
```

**Dev (`--env dev`)**

```bash
pnpm exec wrangler d1 create proxify_demo-db
pnpm exec wrangler kv namespace create proxify_cache_dev
```

Copy each **database ID** and **KV namespace ID** into the **`d1_databases`** and **`kv_namespaces`** arrays under **`env.production`** and **`env.dev`** in [`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc). The **`binding`** names (`DB`, `KV_BINDING`) must stay aligned with [`apps/worker/src/env.ts`](apps/worker/src/env.ts).

### KV cache (runtime)

The Worker uses the same namespace for **application cache** (not only connectivity checks):

- **`v1:meta:cfg_epoch`** — single monotonic counter; every cached key embeds this value, so **incrementing** it invalidates **proxy validation caches**, **admin JSON GET caches**, and related entries without prefix-delete (orphan keys expire via per-key TTL).
- **Proxy path** (KV TTL **4 hours**; safety net only): route lookup by host/path, route outbound headers, JWT signing key rows (**public** fields only — never private keys), grant checks, JTI revocation. Mutations bump **`cfg_epoch`** so stale values are not served for long.
- **Admin API** (same **4h** KV TTL): cached list/read **GET** payloads (routes, route headers, clients, keys, tokens, grants). **`/audit`** and **`/access`** stay **D1-only** (high churn / freshness); **`GET /access`** is intentionally **not** wrapped in the admin KV cache so listings stay current. Proxied **upstream** responses are **not** cached.

### Access logs (`access_log` in D1)

Proxied requests append rows to the **`access_log`** table (JWT/upstream outcomes, optional client IP, denied attempts when metadata exists). Storage is **D1 only**, not KV—high write volume and need for time-range scans make KV a poor fit. Plan retention or export externally if you need long-term archives; D1 does not automatically prune old rows.

**`GET /api/health`** probes **`v1:sys:health_probe`** — unrelated to epoch bumps. **`/health`** is the HTML status page in the SPA (it calls the same JSON endpoint in the browser).

**Manual reset** (admin API) — bumps **`cfg_epoch`** (same effect for both scopes below):

```http
POST /admin/api/v1/cache/purge
Content-Type: application/json

{"scope":"all"}
```

`scope` is **`all`** or **`metadata`** (equivalent: one epoch). Response includes **`{ cfg_epoch }`**. Audited as **`CACHE_PURGE`**.

**Automatic reset**: **`bumpAfterProxyMutation`** runs after route/header/grant/key mutations, client create/update, mint/revoke token, etc., so KV stays aligned with D1.

Workers KV is **eventually consistent**; immediately after a purge, a few requests might still see an old cached value until propagation completes.

---

## 3. Configure `wrangler.jsonc`

1. Edit **[`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc)** (or copy from [`apps/worker/wrangler.jsonc.example`](apps/worker/wrangler.jsonc.example)): set **`database_id`** and KV **`id`** inside **`env.production`** and **`env.dev`** as needed. Each environment needs its own **`d1_databases`** and **`kv_namespaces`** arrays.

2. Add **`routes`** arrays under **`env.production`** / **`env.dev`** when you attach hostnames. Each environment sets **`"workers_dev": true`** (see `env.*` in `wrangler.jsonc`) so **`*.workers.dev`** previews work without custom routes.

3. Optional: set **`account_id`** in **`wrangler.jsonc`**, or rely on **`CLOUDFLARE_ACCOUNT_ID`** in the environment (CI sets it).

Do **not** commit secrets such as **`KEK`**; use **`wrangler secret put`** per environment (see §5).

**Dry-run production:**

```bash
cd apps/worker
pnpm exec wrangler deploy --dry-run --env production
```

---

## 4. Apply migrations (remote D1)

**Production** (database name **`proxify-db`**, **`--env production`**):

```bash
cd apps/worker
pnpm exec wrangler d1 migrations apply proxify-db --remote --env production
```

**Dev** (database name must match **`database_name`** under **`env.dev`** in `wrangler.jsonc`, e.g. **`proxify_demo-db`**):

```bash
cd apps/worker
pnpm exec wrangler d1 migrations apply proxify_demo-db --remote --env dev
```

Local Miniflare: **`pnpm --filter worker run db:migrate:local`** (dev) or **`db:migrate:local:production`**.

---

## 5. Secrets (per environment)

Generate a long random **KEK** (32+ characters) for encrypting server-issued private keys in D1. **Secrets are not shared** across environments:

```bash
cd apps/worker
pnpm exec wrangler secret put KEK --env production
pnpm exec wrangler secret put KEK --env dev
```

Optional: edit **`vars`** under **`env.production`** / **`env.dev`** in [`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc) for `CF_ACCESS_*`, `LOCAL_ADMIN_EMAIL`, etc., per your Access / SSO setup.

---

## 6. Build admin and deploy the Worker

Wrangler uploads the Worker script plus the **`assets`** block from [`apps/worker/wrangler.jsonc`](apps/worker/wrangler.jsonc) (`directory = "../admin/dist"`). You **must** produce a fresh **`apps/admin/dist`** before each deploy so hashed bundles for `/`, `/docs`, and `/admin/*` stay correct.

| Target | Command (from repo root, after `pnpm predeploy` or `pnpm --filter admin build`) |
|--------|-----------------------------------------------------------------------------------|
| **Production** | `pnpm deploy` or `pnpm --filter worker run deploy` (runs **`wrangler deploy --env production`**) |
| **Dev** | `pnpm --filter worker run deploy:dev` |

### Root `package.json` scripts

These live at the **repository root** and are the intended automation surface:

| Script | Runs |
|--------|------|
| `pnpm build` | `pnpm --filter admin build` — TypeScript check + Vite production build → `apps/admin/dist` |
| `pnpm predeploy` | `pnpm typecheck` then `pnpm run build` — typecheck all workspaces + admin build (no deploy) |
| `pnpm deploy` | pnpm runs **`predeploy` first** (lifecycle), then `pnpm --filter worker run deploy` |

### Recommended from root

```bash
pnpm install --frozen-lockfile
pnpm deploy
```

`pnpm` executes the **`predeploy`** script before **`deploy`**, so you get typecheck → admin build → Wrangler in one step (same order as CI).

To only typecheck and build without deploying, run **`pnpm predeploy`** by itself.

### Manual equivalent

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm --filter admin build
pnpm --filter worker deploy
```

### Deploy only from `apps/worker`

This **skips** root `predeploy`. Use only after `apps/admin/dist` is up to date (e.g. you already ran `pnpm --filter admin build` or `pnpm predeploy` from the repo root):

```bash
cd apps/worker
pnpm run deploy
```

Running **`pnpm deploy` from the repo root** is safer: it always runs **`predeploy`** first, so you never deploy without a fresh build.

Your admin UI is served from the **same Worker URL** as the JSON API.

### Optional: Cloudflare Pages for the admin only

Not required for the default architecture. If you still want a standalone Pages project:

```bash
cd apps/admin
pnpm run build
pnpm exec wrangler pages deploy ./dist --project-name <your-pages-project>
```

You would then have two URLs (Pages + Worker); the stock config assumes **Worker-only** hosting.

---

## 7. GitHub Actions

Workflows use **Node.js 22**, **pnpm 9**, and **`pnpm install --frozen-lockfile`**.

| Workflow | When | Steps |
|----------|------|--------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Push or PR to **`main`** | Install deps → **`pnpm -r typecheck`** → **`pnpm --filter admin build`** |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push to **`main`** or **workflow_dispatch** | Install deps → **`pnpm -r typecheck`** → **`pnpm --filter admin build`** → **`cd apps/worker && pnpm run deploy`** (**`--env production`**) |

The deploy job sets **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** for the Wrangler step.

### Repository secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret | Required | Purpose |
|--------|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Yes for deploy | Token with **Workers Scripts: Edit** (and D1/KV as needed for your account) |
| `CLOUDFLARE_ACCOUNT_ID` | If not in `wrangler.jsonc` | Account UUID |

Create an API token under **Cloudflare Dashboard → My Profile → API Tokens** with permissions appropriate for Workers deploy and D1/KV bindings.

### Branch protection

Restrict **`deploy.yml`** to trusted branches (e.g. only `main`) so forks cannot burn your token without secrets.

---

## 8. Cloudflare Access checklist

- [ ] Access application(s) for the Worker hostname (SSO/MFA as needed).
- [ ] Path **exclude** or bypass for **`/api/*`** (public JSON, e.g. **`/api/health`** for monitors) while **protecting `/admin/*`** with Cloudflare Access as needed; add **`/health`** too if you want the HTML status page reachable without SSO (see [`DEVELOPMENT.md`](DEVELOPMENT.md)).
- [ ] Smoke-test **`/`** (landing), **`/docs`**, **`/admin/`** (admin SPA), **`/api/health`**, and **`/admin/api/v1/*`** after deploy.

---

## 9. Data, backups, and recovering from loss

**Why keys, tokens, or audit history can “disappear”**

| Situation | What happened |
|-----------|----------------|
| **Local dev** | The Miniflare D1 database lives under something like `apps/worker/.wrangler/`. Deleting that folder, recloning without copying state, or SQLite **`SQLITE_BUSY`** / corruption during reload can wipe or lock local data. |
| **Production** | Recreating the D1 database, applying migrations to a **new** DB ID, or pointing **`wrangler.jsonc`** at the wrong **`database_id`** / KV **`id`** for an environment creates an **empty** database for that Worker. |
| **KEK rotated or lost** | Server-issued keys stored encrypted with the old KEK **cannot be decrypted**; issue new keys and revoke old ones. |
| **KV `proxify_cache`** | Replacing a KV **`id`** for an environment drops cached entries for that Worker (see §2). Does not delete D1 data. |

**Backups (production)**

- Periodically export D1: see [D1 export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) (`wrangler d1 export … --env production` or **`--env dev`**). Store exports securely **off-git** (this repo’s tooling and hand copies belong under **`apps/worker/d1-export/`**; `*.sql` / `*.raw.sql` there are **gitignored** — see [`apps/worker/d1-export/README.md`](apps/worker/d1-export/README.md)). To hydrate **local** Miniflare from remote, see **`pnpm db:export:remote:*`**, **`pnpm db:filter:dump`**, **`pnpm db:import:local:*`** (or **`pnpm db:pull:remote`**) in [`DEVELOPMENT.md`](DEVELOPMENT.md).
- Treat **`KEK`** like a root secret: loss means ciphertext for existing server-issued private keys is unrecoverable.

**After data loss**

1. Confirm **`wrangler.jsonc`** UUIDs match the D1 databases and KV namespaces for each **`--env`** you deploy.
2. Re-run **`pnpm exec wrangler d1 migrations apply proxify-db --remote --env production`** or **`… proxify_demo-db --remote --env dev`** (use each env’s **`database_name`** from `wrangler.jsonc`) only if the schema is missing for that environment.
3. Regenerate **keys** and **tokens** in the admin UI; communicate new credentials to clients.

---

## 10. Command reference

### Workspace (repo root)

| Task | Command |
|------|---------|
| Typecheck all packages | `pnpm typecheck` |
| Build admin SPA only | `pnpm build` |
| Typecheck + build admin (no deploy) | `pnpm predeploy` |
| Typecheck + build + deploy Worker | `pnpm deploy` (`predeploy` runs automatically first) |

### Worker package (`apps/worker`)

Run from **`apps/worker`** (or `pnpm exec wrangler` with **`cwd`** here):

| Task | Command |
|------|---------|
| Deploy production | `pnpm run deploy` |
| Deploy dev | `pnpm run deploy:dev` |
| Apply D1 migrations (remote, production) | `pnpm exec wrangler d1 migrations apply proxify-db --remote --env production` |
| Apply D1 migrations (remote, dev) | `pnpm exec wrangler d1 migrations apply proxify_demo-db --remote --env dev` |
| Set `KEK` secret (production) | `pnpm exec wrangler secret put KEK --env production` |
| Set `KEK` for dev | `pnpm exec wrangler secret put KEK --env dev` |

### Purge KV application cache (HTTP)

Bump **`cfg_epoch`** so all epoch-keyed KV entries become stale (same as **`scope`** `all` / `metadata` in §2). Requires whatever auth your Worker uses for **`/admin/api/v1/*`** (e.g. Cloudflare Access session):

```bash
curl -sS -X POST "https://YOUR_WORKER_HOST/admin/api/v1/cache/purge" \
  -H "Content-Type: application/json" \
  -d '{"scope":"all"}'
```

Example response shape: `{ "data": { "cfg_epoch": 3 } }`.

For Wrangler CLI changes after upgrades, run **`pnpm exec wrangler --help`** from **`apps/worker`**.
