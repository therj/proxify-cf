# Proxify CF

A robust, secure Cloudflare Worker-based reverse proxy that routes traffic based on host mappings defined in a D1 database. 

## Architecture
- **Admin UI**: React + Vite application served from `proxify.rjoshi.net`.
- **API/Proxy**: Cloudflare Worker using Hono.
- **Database**: Cloudflare D1 (source of truth).
- **Cache**: Cloudflare Workers KV (for fast proxy routing).

## Features
- **Host & Path Routing**: Dynamically route requests to upstream URLs.
- **JWT Authentication**: Issue tokens or require client-signed tokens using `ES256`.
- **Zero Trust**: Admin panel is protected via Cloudflare Access.
- **Audit Logs**: Built-in tracking of administrative actions.

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup and [DEPLOY.md](./DEPLOY.md) for production deployment.
