# URL Expansion and Path Rewriting for Proxify CF

## Overview
The current routing logic only proxies **exact** base‑URL matches. To make the platform usable for real‑world APIs we need two complementary features:

1. **Sub‑path (wildcard) matching** – allow a route to match the base path **and any child paths** (e.g. `/users/*`).
2. **Path rewriting** – optionally strip or replace the incoming prefix before forwarding the request to the upstream service.

Both features must be optional per route, configurable from the Admin UI, and fully reflected in the database schema and worker code.

---

## 1. Sub‑Path Matching (Wildcard Routes)

- **Goal**: A route defined as `https://backend.example.com/users` should also proxy `/users/*` (e.g. `/users/123`, `/users/profile/edit`).
- **Implementation**:
  - Use **Hono**’s built‑in wildcard syntax (`/users/*`).
  - When a request matches, preserve the captured sub‑path and append it to the configured upstream URL.
- **UI**:
  - Add a **checkbox** labelled **"Match Sub‑paths"** on the route‑creation/edit form (`apps/admin/src/pages/RouteDetail.tsx`).
- **Database**:
  - Add a boolean column `match_subpaths` to the `routes` table (Drizzle migration `0015_match_subpaths.sql`).
- **Priority**:
  - Exact route definitions take precedence over wildcard matches. The worker should first attempt an exact match before falling back to a wildcard match.

---

## 2. Path Rewriting (Prefix Stripping / Prefix Replacement)

- **Goal**: Allow a route to rewrite the incoming path before proxying. Example:
  - Incoming: `/api/v2/users`
  - Upstream base URL: `https://upstream.example.com/api/v1`
  - Resulting proxy target: `https://upstream.example.com/api/v1/users`
- **Implementation Options** (initial MVP):
  1. **Strip Prefix** – remove the route’s base path before concatenating with the upstream base URL.
  2. **Custom Prefix** – (future) allow a free‑form prefix to be added.
- **UI**:
  - Add a **checkbox** labelled **"Strip Route Prefix"** next to the “Match Sub‑paths” option.
- **Database**:
  - Add a boolean column `strip_prefix` to the `routes` table (migration `0016_strip_prefix.sql`).
- **Worker Logic** (`apps/worker/src/proxy/handler.ts`):
  ```ts
  if (routeConfig.matchSubpaths) {
    const subPath = ctx.req.path.replace(routeConfig.basePath, "");
    const upstreamPath = routeConfig.stripPrefix ? subPath : `${routeConfig.basePath}/${subPath}`;
    target = `${routeConfig.upstreamUrl}${upstreamPath}`;
  } else {
    target = routeConfig.upstreamUrl;
  }
  ```

---

## 3. Project‑Specific Gaps & Checklist

| **Schema migration** | New columns added via migrations 0005 and 0006. | DONE
| **Admin UI components** | `Routes.tsx` and `RouteDetail.tsx` updated with checkboxes. | DONE
| **Worker routing logic** | `findRouteForRequest` and `buildUpstreamRequestUrl` handle wildcard/rewriting. | DONE
| **Testing** | Unit tests added in `apps/worker/tests/proxy.test.ts`. | DONE
| **Documentation** | `README.md` updated with feature details. | DONE
| **Priority handling** | Longest matching `path_prefix` ensures exact/specific routes win. | DONE
| **Error handling** | Guarded against partial word matches and empty sub-paths. | DONE

---

## 4. Acceptance Criteria
1. Admin UI shows two new checkboxes per route.
2. Database schema includes `match_subpaths` and `strip_prefix` (boolean).
3. Worker correctly proxies:
   - Exact match only.
   - Wildcard match preserving sub‑path when “Match Sub‑paths” enabled.
   - Stripped prefix when both options enabled.
4. All existing tests pass; new tests cover the three scenarios above.
5. Documentation updated accordingly.

---

*This prompt is now ready for the implementation team. It ties the feature request to concrete code locations, database migrations, UI components, and testing strategy, ensuring no hidden gaps remain.*
