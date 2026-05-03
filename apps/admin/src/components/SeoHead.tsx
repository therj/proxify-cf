import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { PUBLIC_DEMO_ORIGIN } from '../lib/publicDemoOrigin';

const BRAND = 'Proxify CF';

const DEFAULT_DESCRIPTION =
  'Proxify CF is a Cloudflare Worker reverse proxy with D1-backed routing, JWT access, and an admin console. Configure hosts, upstreams, clients, keys, and grants from one place.';

const OG_IMAGE_PATH = '/og-image.svg';

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname || '/';
}

function canonicalHref(pathname: string, search: string): string {
  const origin = PUBLIC_DEMO_ORIGIN.replace(/\/$/, '');
  const path = normalizePathname(pathname);
  const pathPart = path === '/' ? '/' : path;
  return `${origin}${pathPart === '/' ? '/' : pathPart}${search}`;
}

function documentTitle(pathname: string): string {
  const p = normalizePathname(pathname);
  if (p === '/') return `${BRAND} - Route traffic with confidence`;
  if (p === '/docs') return `Documentation · ${BRAND}`;
  if (p === '/health') return `Health · ${BRAND}`;
  if (matchPath({ path: '/admin/clients/:clientId', end: true }, p)) return `Client · ${BRAND}`;
  if (matchPath({ path: '/admin/routes/:routeId', end: true }, p)) return `Route · ${BRAND}`;
  if (p === '/admin') return `Dashboard · ${BRAND}`;
  if (p === '/admin/clients') return `Clients · ${BRAND}`;
  if (p === '/admin/routes') return `Routes · ${BRAND}`;
  if (p === '/admin/keys') return `Keys & tokens · ${BRAND}`;
  if (p === '/admin/grants') return `Route grants · ${BRAND}`;
  if (p === '/admin/access') return `Access logs · ${BRAND}`;
  if (p === '/admin/audit') return `Audit log · ${BRAND}`;
  return `${BRAND}`;
}

function metaDescription(pathname: string): string {
  const p = normalizePathname(pathname);
  if (p === '/docs') {
    return 'Configure routes, clients, signing keys, JWTs, and grants on Proxify CF - documentation and API overview.';
  }
  if (p === '/health') {
    return 'Read-only worker health checks for D1 and KV bindings on Proxify CF.';
  }
  if (p.startsWith('/admin')) {
    return 'Proxify CF admin console: manage reverse-proxy routes, clients, keys, grants, and review access and audit activity.';
  }
  return DEFAULT_DESCRIPTION;
}

function setMetaContent(attr: 'name' | 'property', key: string, content: string): void {
  const safe = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const selector = attr === 'name' ? `meta[name="${safe}"]` : `meta[property="${safe}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-seo-managed', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalHref(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('data-seo-managed', '1');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Keeps title, description, Open Graph / Twitter fields, and canonical URL aligned
 * with the SPA route. Canonical host is always PUBLIC_DEMO_ORIGIN (demo site),
 * even when the app is served from another deployment.
 */
export function SeoHead(): null {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const title = documentTitle(pathname);
    const description = metaDescription(pathname);
    const url = canonicalHref(pathname, search);
    const ogImage = `${PUBLIC_DEMO_ORIGIN.replace(/\/$/, '')}${OG_IMAGE_PATH}`;

    document.title = title;
    setCanonicalHref(url);

    setMetaContent('name', 'description', description);
    setMetaContent('property', 'og:title', title);
    setMetaContent('property', 'og:description', description);
    setMetaContent('property', 'og:url', url);
    setMetaContent('property', 'og:image', ogImage);
    setMetaContent('name', 'twitter:title', title);
    setMetaContent('name', 'twitter:description', description);
    setMetaContent('name', 'twitter:image', ogImage);
  }, [pathname, search]);

  return null;
}
