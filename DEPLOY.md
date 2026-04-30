# Deployment guide

This repo ships **one Worker** that bundles API routes and the **admin SPA** from [`apps/admin/dist`](apps/admin/dist) via Wrangler **[assets](https://developers.cloudflare.com/workers/static-assets/)** ([`apps/worker/wrangler.toml`](apps/worker/wrangler.toml)). You normally **do not** deploy the admin to Cloudflare Pages unless you want a separate hosting setup.

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

Edit [`apps/worker/wrangler.toml`](apps/worker/wrangler.toml):

1. Set **`database_id`** under `[[d1_databases]]` to your D1 UUID (replace `local-dev-id` for production use; keep a separate profile or env if you use one file for both local and remote).
2. Set **`id`** under `[[kv_namespaces]]` to your KV namespace id (replace `local-cache-id`).
3. Add your Cloudflare **account id** (recommended for CI and clarity):

   ```toml
   account_id = "your-cloudflare-account-uuid"
   ```

   You can also rely on the **`CLOUDFLARE_ACCOUNT_ID`** environment variable instead of committing `account_id`.

Do **not** commit secrets such as `KEK`; use `wrangler secret put` (see below).

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

The Worker deploy **must** see a fresh **`apps/admin/dist`** so static assets upload correctly.

From the **repository root**:

```bash
pnpm install --frozen-lockfile
pnpm --filter admin build
pnpm --filter worker deploy
```

Or from `apps/worker` after building admin:

```bash
pnpm run deploy
```

Wrangler uploads the worker **and** the `[assets]` directory (`../admin/dist`). Your admin UI is served from the **same Worker URL** as the API.

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

This repo includes:

| Workflow | When | What it does |
|----------|------|----------------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Push / PR to `main` | Install, `pnpm -r typecheck`, build admin |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push to `main` or **Run workflow** | Typecheck, build admin, **`wrangler deploy`** |

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
- [ ] Smoke-test **`/`** (landing), **`/admin/`** (admin SPA), and **`/admin/api/v1/*`** after deploy.

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

## 10. Command reference (Wrangler 4)

| Task | Command |
|------|---------|
| Deploy worker | `pnpm --filter worker deploy` (from root; build admin first) |
| Remote migrations | `pnpm exec wrangler d1 migrations apply proxify-db --remote` |
| Set secret | `pnpm exec wrangler secret put KEK` |

For CLI changes after upgrades, run `pnpm exec wrangler --help`.
