-- 004_create_phase2_tables.sql
-- VERA Phase 2: Donations, Milestones, and Fund Transactions

-- 1. Donations Table
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    purpose VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    reference VARCHAR(100) UNIQUE NOT NULL,
    transaction_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_reference ON donations(reference);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- 2. Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    sequence INTEGER NOT NULL DEFAULT 1 CHECK (sequence >= 1),
    status VARCHAR(50) NOT NULL DEFAULT 'LOCKED' CHECK (
        status IN ('LOCKED', 'IN_PROGRESS', 'PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RELEASED', 'REJECTED', 'FAILED')
    ),
    proof_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_campaign_milestone_sequence UNIQUE (campaign_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_milestones_campaign_id ON milestones(campaign_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_sequence ON milestones(campaign_id, sequence);

-- 3. Fund Transactions Table
CREATE TABLE IF NOT EXISTS fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('DONATION', 'LOCK', 'RELEASE', 'SPEND', 'REFUND')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reference VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_transactions_campaign_id ON fund_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_milestone_id ON fund_transactions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_donation_id ON fund_transactions(donation_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_type ON fund_transactions(type);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_created_at ON fund_transactions(created_at DESC);
