import { describe, it, expect } from 'vitest';
import { buildUpstreamRequestUrl } from '../src/proxy/upstream';
import { Route } from '@proxify-cf/shared';

describe('buildUpstreamRequestUrl', () => {
  const baseRoute: Route = {
    id: 'r1',
    host: 'proxy.com',
    path_prefix: '/api',
    upstream_url: 'https://upstream.com/service',
    preserve_path: 1,
    preserve_query: 1,
    preserve_method: 1,
    forward_body: 1,
    timeout_ms: 10000,
    match_subpaths: 1,
    strip_prefix: 1,
    created_at: Date.now(),
    disabled_at: null,
  };

  it('strips prefix correctly when path matches exactly', () => {
    const url = new URL('https://proxy.com/api');
    const result = buildUpstreamRequestUrl(baseRoute, url);
    expect(result.toString()).toBe('https://upstream.com/service/');
  });

  it('strips prefix correctly when path has sub-path', () => {
    const url = new URL('https://proxy.com/api/v1/users');
    const result = buildUpstreamRequestUrl(baseRoute, url);
    expect(result.toString()).toBe('https://upstream.com/service/v1/users');
  });

  it('does NOT strip prefix if strip_prefix is 0', () => {
    const noStripRoute = { ...baseRoute, strip_prefix: 0 };
    const url = new URL('https://proxy.com/api/v1/users');
    const result = buildUpstreamRequestUrl(noStripRoute, url);
    // upstream is /service, path is /api/v1/users -> /service/api/v1/users
    expect(result.toString()).toBe('https://upstream.com/service/api/v1/users');
  });

  it('handles root path_prefix correctly', () => {
    const rootRoute = { ...baseRoute, path_prefix: '/' };
    const url = new URL('https://proxy.com/some/path');
    const result = buildUpstreamRequestUrl(rootRoute, url);
    expect(result.toString()).toBe('https://upstream.com/service/some/path');
  });

  it('avoids partial word prefix stripping', () => {
    // If route is /api, and request is /apifoo
    const url = new URL('https://proxy.com/apifoo');
    const result = buildUpstreamRequestUrl(baseRoute, url);
    // Should NOT strip /api from /apifoo. 
    // In actual worker, findRouteForRequest would have rejected this, 
    // but buildUpstreamRequestUrl should be robust.
    expect(result.toString()).toBe('https://upstream.com/service/apifoo');
  });

  it('preserves query params if configured', () => {
    const url = new URL('https://proxy.com/api/users?id=123');
    const result = buildUpstreamRequestUrl(baseRoute, url);
    expect(result.toString()).toBe('https://upstream.com/service/users?id=123');
  });

  it('strips query params if preserve_query is 0', () => {
    const noQueryRoute = { ...baseRoute, preserve_query: 0 };
    const url = new URL('https://proxy.com/api/users?id=123');
    const result = buildUpstreamRequestUrl(noQueryRoute, url);
    expect(result.toString()).toBe('https://upstream.com/service/users');
  });
});
