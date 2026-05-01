# Deployment guide

This repo ships **one Worker** that bundles API routes and the **admin SPA** from [`apps/admin/dist`](apps/admin/dist) via Wrangler **[assets](https://developers.cloudflare.com/workers/static-assets/)** ([`apps/worker/wrangler.toml`](apps/worker/wrangler.toml); template with placeholders: [`apps/worker/wrangler.toml.example`](apps/worker/wrangler.toml.example)). You normally **do not** deploy the admin to Cloudflare Pages unless you want a separate hosting setup.

---

## 1. Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/), Workers enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`pnpm exec wrangler` from this repo)
- Node.js **current or Active LTS** (Wrangler 4 does not support Node 16)

---

## 2. Create D1 and KV

Run from the repo root (or `cd apps/worker` and drop `cd apps/worker &&`):

```bash
cd apps/worker
pnpm exec wrangler d1 create proxify-db
pnpm exec wrangler kv namespace create proxify_cache
```

Copy the **database ID** and **KV namespace ID** from the command output.

---

## 3. Configure `wrangler.toml`

Use **[`apps/worker/wrangler.toml.example`](apps/worker/wrangler.toml.example)** as the annotated template (placeholders, comments, optional `[[routes]]` examples). Copy it and edit:

```bash
cd apps/worker
cp wrangler.toml.example wrangler.toml
```

If you already have a filled-in **`wrangler.toml`** for your site, keep it — the example is for new setups or diffing against a safe baseline without real IDs in docs.

1. Set **`database_id`** under `[[d1_databases]]` to your D1 UUID from §2 (or Dashboard).
2. Set **`id`** under `[[kv_namespaces]]` to your KV namespace id from §2.
3. Optionally add **`[[routes]]`** for custom hostnames (see comments in the example); omit routes to use **`*.workers.dev`** only.
4. Add your Cloudflare **account id** (recommended for CI and clarity):

   ```toml
   account_id = "your-cloudflare-account-uuid"
   ```

   You can also rely on the **`CLOUDFLARE_ACCOUNT_ID`** environment variable instead of committing `account_id`.

Do **not** commit secrets such as **`KEK`**; use `wrangler secret put` (see below).

---

## 4. Apply migrations (production D1)

```bash
cd apps/worker
pnpm exec wrangler d1 migrations apply proxify-db --remote
```

Use **`--local`** only for the SQLite database on your machine.

---

## 5. Production secrets

Generate a long random **KEK** (32+ characters) for encrypting server-issued private keys in D1:

```bash
cd apps/worker
pnpm exec wrangler secret put KEK
```

Optional: set [`vars`](apps/worker/wrangler.toml) or secrets for `CF_ACCESS_*`, `LOCAL_ADMIN_EMAIL`, etc., per your Access / SSO setup.

---

## 6. Build admin and deploy the Worker

Wrangler uploads the Worker script plus **`[assets]`** from [`apps/worker/wrangler.toml`](apps/worker/wrangler.toml) (`directory = "../admin/dist"`). You **must** produce a fresh **`apps/admin/dist`** before each deploy so hashed bundles for `/`, `/docs`, and `/admin/*` stay correct.

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
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push to **`main`** or **workflow_dispatch** | Install deps → **`pnpm -r typecheck`** → **`pnpm --filter admin build`** → `cd apps/worker && pnpm run deploy` |

The deploy job sets **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** for the Wrangler step.

### Repository secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret | Required | Purpose |
|--------|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Yes for deploy | Token with **Workers Scripts: Edit** (and D1/KV as needed for your account) |
| `CLOUDFLARE_ACCOUNT_ID` | If not in `wrangler.toml` | Account UUID |

Create an API token under **Cloudflare Dashboard → My Profile → API Tokens** with permissions appropriate for Workers deploy and D1/KV bindings.

### Branch protection

Restrict **`deploy.yml`** to trusted branches (e.g. only `main`) so forks cannot burn your token without secrets.

---

## 8. Cloudflare Access checklist

- [ ] Access application(s) for the Worker hostname (SSO/MFA as needed).
- [ ] Path **exclude** or bypass for **`/health`** (monitors) while **protecting `/admin/*`** with Cloudflare Access as needed (see [`DEVELOPMENT.md`](DEVELOPMENT.md)).
- [ ] Smoke-test **`/`** (landing), **`/docs`**, **`/admin/`** (admin SPA), and **`/admin/api/v1/*`** after deploy.

---

## 9. Data, backups, and recovering from loss

**Why keys, tokens, or audit history can “disappear”**

| Situation | What happened |
|-----------|----------------|
| **Local dev** | The Miniflare D1 database lives under something like `apps/worker/.wrangler/`. Deleting that folder, recloning without copying state, or SQLite **`SQLITE_BUSY`** / corruption during reload can wipe or lock local data. |
| **Production** | Recreating the D1 database, applying migrations to a **new** DB ID, or pointing `wrangler.toml` at wrong IDs creates an **empty** database. |
| **KEK rotated or lost** | Server-issued keys stored encrypted with the old KEK **cannot be decrypted**; issue new keys and revoke old ones. |
| **KV `CACHE`** | Clearing or replacing the namespace drops cached entries only (not your primary D1 rows unless you stored something there intentionally). |

**Backups (production)**

- Periodically export D1: see [D1 export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) (`wrangler d1 export …`). Store exports securely off-git.
- Treat **`KEK`** like a root secret: loss means ciphertext for existing server-issued private keys is unrecoverable.

**After data loss**

1. Confirm **`database_id`** / KV **`id`** in `wrangler.toml` match the DB and namespace you intend to use.
2. Re-run **`wrangler d1 migrations apply proxify-db --remote`** only if the schema is missing (not on a healthy populated DB unless you intend to migrate).
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

Run from **`apps/worker`** (or prefix with `pnpm exec wrangler` from that directory):

| Task | Command |
|------|---------|
| Deploy Worker | `pnpm run deploy` |
| Apply D1 migrations (remote) | `pnpm exec wrangler d1 migrations apply proxify-db --remote` |
| Set `KEK` secret | `pnpm exec wrangler secret put KEK` |

For Wrangler CLI changes after upgrades, run `pnpm exec wrangler --help`.
