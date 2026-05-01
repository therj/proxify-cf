-- Nullable FK: many audit rows are route/global without a tenant client.
ALTER TABLE audit_log ADD COLUMN client_id TEXT REFERENCES clients(id);

CREATE INDEX idx_audit_log_client_id ON audit_log(client_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_ts ON audit_log(ts DESC);
