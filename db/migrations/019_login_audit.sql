-- 019_login_audit.sql
-- Login visibility for the admin console: every web and mobile (API) login
-- attempt is recorded, and users carry a last_login_at stamp.

CREATE TABLE IF NOT EXISTS login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role VARCHAR(20),
  method VARCHAR(10) NOT NULL CHECK (method IN ('WEB', 'API')),
  success BOOLEAN NOT NULL,
  reason VARCHAR(40),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_failures ON login_events (created_at DESC) WHERE success = FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
