-- Role model v2: DONOR/CITIZEN -> USER, NGO -> ORGANIZATION, add CONTRACTOR.
-- Org + contractor verification columns, wallet bindings, account status.

DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c); END IF;
END $$;

UPDATE users SET role = 'USER' WHERE role IN ('DONOR', 'CITIZEN');
UPDATE users SET role = 'ORGANIZATION' WHERE role = 'NGO';

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('USER', 'ORGANIZATION', 'CONTRACTOR', 'AUDITOR', 'ADMIN'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS org_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_status TEXT;
UPDATE users SET org_status = 'VERIFIED' WHERE role = 'ORGANIZATION' AND org_status IS NULL;
ALTER TABLE users ALTER COLUMN org_status SET DEFAULT 'PENDING';

ALTER TABLE users ADD COLUMN IF NOT EXISTS org_registration_no TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS contractor_status TEXT;
UPDATE users SET contractor_status = 'PENDING' WHERE role = 'CONTRACTOR' AND contractor_status IS NULL;
ALTER TABLE users ALTER COLUMN contractor_status SET DEFAULT 'PENDING';

ALTER TABLE users ADD COLUMN IF NOT EXISTS service_area TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS solana_pubkey TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_solana_pubkey_uidx ON users (solana_pubkey) WHERE solana_pubkey IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'ACTIVE';
