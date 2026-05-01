import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  description: z.string().nullable(),
  created_at: z.number(),
  created_by: z.string(),
  disabled_at: z.number().nullable()
});

export const KeySchema = z.object({
  kid: z.string(),
  client_id: z.string(),
  alg: z.enum(['RS256', 'ES256']),
  mode: z.enum(['client_signed', 'server_issued']),
  public_jwk: z.string(),
  private_jwk_encrypted: z.string().nullable(),
  created_at: z.number(),
  expires_at: z.number().nullable(),
  rotated_to_kid: z.string().nullable(),
  revoked_at: z.number().nullable()
});

export const RouteSchema = z.object({
  id: z.string(),
  host: z.string(),
  path_prefix: z.string().default('/'),
  upstream_url: z.string(),
  preserve_path: z.number(),
  preserve_query: z.number(),
  preserve_method: z.number(),
  forward_body: z.number(),
  timeout_ms: z.number(),
  created_at: z.number(),
  disabled_at: z.number().nullable()
});

export const RouteHeaderSchema = z.object({
  route_id: z.string(),
  header_name: z.string(),
  header_value: z.string()
});

export const ClientRouteGrantSchema = z.object({
  client_id: z.string(),
  route_id: z.string(),
  granted_at: z.number(),
  granted_by: z.string()
});

export const IssuedTokenSchema = z.object({
  jti: z.string(),
  kid: z.string(),
  client_id: z.string(),
  issued_at: z.number(),
  expires_at: z.number(),
  revoked_at: z.number().nullable(),
  label: z.string().nullable()
});

export const AuditLogSchema = z.object({
  id: z.string(),
  ts: z.number(),
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  meta: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  kid: z.string().nullable().optional(),
  route_id: z.string().nullable().optional(),
});
