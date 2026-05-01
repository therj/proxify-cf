-- Denormalized keys for filtering audit rows without JSON scans (keys, grants, routes).
ALTER TABLE audit_log ADD COLUMN kid TEXT;
ALTER TABLE audit_log ADD COLUMN route_id TEXT;

CREATE INDEX idx_audit_log_kid ON audit_log(kid);
CREATE INDEX idx_audit_log_route_id ON audit_log(route_id);
CREATE INDEX idx_audit_log_client_route ON audit_log(client_id, route_id);
