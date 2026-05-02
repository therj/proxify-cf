-- Proxied request telemetry (separate from audit_log administrative actions)

CREATE TABLE access_log (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  host TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  kid TEXT REFERENCES keys(kid) ON DELETE SET NULL,
  jti TEXT,
  outcome TEXT NOT NULL,
  upstream_status INTEGER,
  latency_ms INTEGER,
  client_ip TEXT,
  detail TEXT
);

CREATE INDEX idx_access_log_ts ON access_log(ts DESC);
CREATE INDEX idx_access_log_client_id ON access_log(client_id);
CREATE INDEX idx_access_log_route_id ON access_log(route_id);
CREATE INDEX idx_access_log_kid ON access_log(kid);
CREATE INDEX idx_access_log_outcome ON access_log(outcome);
