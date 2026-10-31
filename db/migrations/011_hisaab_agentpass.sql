-- 011_hisaab_agentpass.sql
-- Hisaab of the Road (pothole reports + Solana milestone escrow) and
-- AgentPass (AI-agent identity/reputation on EVM). Also adds the CITIZEN role.

-- ---------------------------------------------------------------------------
-- 1. CITIZEN role
-- ---------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('DONOR', 'NGO', 'AUDITOR', 'ADMIN', 'CITIZEN'));

-- ---------------------------------------------------------------------------
-- 2. Hisaab — pothole reports / confirmations / escrow / repairs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pothole_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  address_label VARCHAR(255),
  severity VARCHAR(10) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  size_estimate_cm NUMERIC(8,1),
  description TEXT,
  gemini_result JSONB,
  gemini_status VARCHAR(20) NOT NULL DEFAULT 'MANUAL_REVIEW'
    CHECK (gemini_status IN ('PASS', 'FLAG', 'FAIL', 'MANUAL_REVIEW', 'ERROR')),
  media_file_name VARCHAR(255),
  media_file_path VARCHAR(500),
  media_mime_type VARCHAR(100),
  media_sha256 VARCHAR(64),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CONFIRMED', 'ESCALATED', 'REPAIR_SUBMITTED', 'VERIFIED', 'PAID', 'REJECTED')),
  solana_report_pda VARCHAR(60),
  solana_tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pothole_reports_status ON pothole_reports (status);
CREATE INDEX IF NOT EXISTS idx_pothole_reports_geo ON pothole_reports (latitude, longitude);

CREATE TABLE IF NOT EXISTS pothole_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES pothole_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  solana_confirm_pda VARCHAR(60),
  solana_tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS hisaab_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE REFERENCES pothole_reports(id) ON DELETE CASCADE,
  funder_label VARCHAR(120) NOT NULL,
  contractor_label VARCHAR(120) NOT NULL,
  contractor_wallet VARCHAR(60),
  stage1_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage2_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage3_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  released_stage SMALLINT NOT NULL DEFAULT 0 CHECK (released_stage BETWEEN 0 AND 3),
  hold_until TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'REFUNDED')),
  solana_escrow_pda VARCHAR(60),
  solana_vault_pda VARCHAR(60),
  solana_tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES pothole_reports(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id),
  after_file_name VARCHAR(255),
  after_file_path VARCHAR(500),
  after_mime_type VARCHAR(100),
  after_sha256 VARCHAR(64),
  gemini_compare JSONB,
  gemini_status VARCHAR(20) NOT NULL DEFAULT 'MANUAL_REVIEW'
    CHECK (gemini_status IN ('PASS', 'FLAG', 'FAIL', 'MANUAL_REVIEW', 'ERROR')),
  roughness_score NUMERIC(8,2),
  roughness_samples INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  solana_tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. AgentPass — AI agent registry + outcomes (EVM side mirrors AgentRegistry.sol)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  agent_type VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN' CHECK (agent_type IN ('LEGIT', 'FRAUD', 'UNKNOWN')),
  spend_cap NUMERIC(14,2) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  merchant_label VARCHAR(120) NOT NULL,
  service VARCHAR(120) NOT NULL,
  success BOOLEAN NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  block_reason TEXT,
  evm_tx_hash VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outcomes_agent ON agent_outcomes (agent_id, created_at DESC);

-- Fallback time-series tables used when Tiger Data is unreachable.
-- When TIGER_DATABASE_URL is configured, the same shapes live there as hypertables.
CREATE TABLE IF NOT EXISTS roughness_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES pothole_reports(id) ON DELETE CASCADE,
  device_label VARCHAR(120),
  accel_z REAL NOT NULL,
  speed_kmh REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roughness_report_time ON roughness_readings (report_id, recorded_at DESC);

-- Per-citizen devnet wallets so confirmations are signed by distinct on-chain
-- identities (devnet demo only; production would use custodial/custody-free wallets).
CREATE TABLE IF NOT EXISTS citizen_wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pubkey VARCHAR(60) NOT NULL,
  keypair_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
