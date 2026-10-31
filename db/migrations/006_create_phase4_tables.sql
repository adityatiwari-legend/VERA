-- Migration 006: Phase 4 Blockchain and Advanced Fund Controls

-- 1. Extend campaigns table with blockchain metadata
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(50) DEFAULT 'hardhat';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS blockchain_contract_address VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED';

-- 2. Extend donations table with blockchain transaction hash and status
ALTER TABLE donations ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED';

-- 3. Extend milestones table with blockchain milestone ID, status, and released_amount
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS blockchain_milestone_id VARCHAR(255);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED';
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS released_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (released_amount >= 0);

-- 4. Extend fund_transactions table with block number, tx hash, and blockchain status
ALTER TABLE fund_transactions ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255);
ALTER TABLE fund_transactions ADD COLUMN IF NOT EXISTS blockchain_block_number BIGINT;
ALTER TABLE fund_transactions ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED';

-- 5. Create release_requests table for milestone fund release and multisig orchestration
CREATE TABLE IF NOT EXISTS release_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'AWAITING_MULTISIG' CHECK (
        status IN ('AWAITING_MULTISIG', 'READY_FOR_RELEASE', 'RELEASED', 'REJECTED', 'FAILED')
    ),
    required_approvals INTEGER NOT NULL DEFAULT 2,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    blockchain_tx_hash VARCHAR(255),
    blockchain_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_requests_campaign_id ON release_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_release_requests_milestone_id ON release_requests(milestone_id);
CREATE INDEX IF NOT EXISTS idx_release_requests_status ON release_requests(status);

-- 6. Create multisig_approvals table to record individual signer approvals
CREATE TABLE IF NOT EXISTS multisig_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES release_requests(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    signer_role VARCHAR(50) NOT NULL,
    signer_address VARCHAR(255),
    comment TEXT,
    blockchain_tx_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_signer_per_release UNIQUE (release_request_id, signer_id)
);

CREATE INDEX IF NOT EXISTS idx_multisig_approvals_request_id ON multisig_approvals(release_request_id);
CREATE INDEX IF NOT EXISTS idx_multisig_approvals_signer_id ON multisig_approvals(signer_id);
