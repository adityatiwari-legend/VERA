-- 008_audit_hash_chain.sql
-- Add cryptographic linkage and a database-assigned append position to audit_logs.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS chain_position BIGINT;

CREATE SEQUENCE IF NOT EXISTS audit_logs_chain_position_seq;
ALTER TABLE audit_logs
  ALTER COLUMN chain_position SET DEFAULT nextval('audit_logs_chain_position_seq');

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_chain_position
  ON audit_logs(chain_position);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entry_hash ON audit_logs(entry_hash);

CREATE OR REPLACE FUNCTION vera_prevent_audit_log_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; DELETE is not permitted';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_append_only_delete ON audit_logs;
CREATE TRIGGER audit_logs_append_only_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION vera_prevent_audit_log_delete();
