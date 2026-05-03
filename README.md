# Proxify CF

A Cloudflare Worker–based reverse proxy that routes traffic from host/path rules stored in **D1**, with a React admin UI and JWT-based access control.

**Source code:** [github.com/therj/proxify-cf](https://github.com/therj/proxify-cf)

## Architecture

- **Admin UI**: React + Vite SPA, built to `apps/admin/dist` and served as **[static assets](https://developers.cloudflare.com/workers/static-assets/)** by the same Worker as the API (includes **`/docs`** from this repo’s Markdown).
- **API / proxy**: [Hono](https://hono.dev/) on Workers — **`/api/*`** (public JSON, e.g. **`/api/health`**), **`/admin/api/v1/*`** (admin), **`/health`** (same SPA as the site for the status page), and configurable reverse-proxy routes for upstream origins.
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) holds authoritative configuration (routes, clients, keys, grants, audit, etc.).
- **Cache**: [Workers KV](https://developers.cloudflare.com/kv/) (`proxify_cache`) speeds **repeat reads**: JWT verification inputs (keys, grants, route rows, JTI revocation) on the proxy path, and **admin JSON list GET** responses. **D1 remains the source of truth**; cached keys embed a monotonic **`cfg_epoch`** so invalidation does not rely on long TTLs alone (KV entries use a **4-hour** expiration as a safety net). **Upstream origin HTTP responses are not cached.**

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup (**Vite HMR** on `http://localhost:5173/` via `pnpm dev:hmr`; landing + admin share one SPA) and [DEPLOY.md](./DEPLOY.md) for production deployment, D1/KV, and **KV cache / purge** behavior. The in-app **Documentation** page (`/docs`) is built from those same Markdown files at build time.

## Features

- **Host & path routing**: Map incoming host + path prefix to an upstream URL (with optional header injection and method/body rules).
- **JWT authentication**: Mint tokens or verify client-signed JWTs (e.g. **ES256**).
- **Zero Trust**: Protect the admin UI with Cloudflare Access (optional path bypass for **`/api/*`** public probes — e.g. **`/api/health`** — and, if needed, **`/health`** for the HTML status page).
- **Access logs**: Append-only proxied traffic telemetry in D1 (host/path, JWT context, upstream status/latency, outcomes including denied requests). **Not** stored in KV and **not** admin-list cached—fresh reads from D1.
- **Audit logs**: Administrative actions recorded in D1 (separate from access logs).
