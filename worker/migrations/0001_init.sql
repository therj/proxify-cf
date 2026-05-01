-- Initial D1 Schema

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  disabled_at INTEGER
);

CREATE TABLE keys (
  kid TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  alg TEXT NOT NULL,
  mode TEXT NOT NULL, -- 'client_signed' | 'server_issued'
  public_jwk TEXT NOT NULL, -- JSON text
  private_jwk_encrypted TEXT, -- nullable, only for 'server_issued'
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  rotated_to_kid TEXT,
  revoked_at INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX idx_keys_client_id ON keys(client_id);
CREATE INDEX idx_keys_revoked_at ON keys(revoked_at);

CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  path_prefix TEXT NOT NULL DEFAULT '/',
  upstream_url TEXT NOT NULL,
  preserve_path INTEGER NOT NULL DEFAULT 1,
  preserve_query INTEGER NOT NULL DEFAULT 1,
  preserve_method INTEGER NOT NULL DEFAULT 1,
  forward_body INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  created_at INTEGER NOT NULL,
  disabled_at INTEGER,
  UNIQUE(host, path_prefix)
);

CREATE TABLE route_headers (
  route_id TEXT NOT NULL,
  header_name TEXT NOT NULL,
  header_value TEXT NOT NULL,
  PRIMARY KEY (route_id, header_name),
  FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE client_route_grants (
  client_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  granted_by TEXT NOT NULL,
  PRIMARY KEY (client_id, route_id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (route_id) REFERENCES routes(id)
);
CREATE INDEX idx_client_route_grants_client_id ON client_route_grants(client_id);
CREATE INDEX idx_client_route_grants_route_id ON client_route_grants(route_id);

CREATE TABLE issued_tokens (
  jti TEXT PRIMARY KEY,
  kid TEXT NOT NULL,
  client_id TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  label TEXT,
  FOREIGN KEY (kid) REFERENCES keys(kid),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX idx_issued_tokens_client_id ON issued_tokens(client_id);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  meta TEXT -- JSON text
);
