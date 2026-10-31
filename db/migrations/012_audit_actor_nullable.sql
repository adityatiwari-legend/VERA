-- 012_audit_actor_nullable.sql
-- Hisaab records system-actor audit entries (oracle releases,
-- merchant gates) where no human user is involved.

ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;
