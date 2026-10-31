-- Migration 007: Phase 4 multisig and release request columns

ALTER TABLE release_requests ADD COLUMN IF NOT EXISTS proof_id UUID REFERENCES proofs(id) ON DELETE SET NULL;
ALTER TABLE release_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE release_requests ADD COLUMN IF NOT EXISTS requested_amount NUMERIC(14,2);

-- Update status constraint to allow READY_TO_RELEASE and RELEASE_SUBMITTED
ALTER TABLE release_requests DROP CONSTRAINT IF EXISTS release_requests_status_check;
ALTER TABLE release_requests ADD CONSTRAINT release_requests_status_check CHECK (
    status IN ('AWAITING_MULTISIG', 'READY_TO_RELEASE', 'READY_FOR_RELEASE', 'RELEASE_SUBMITTED', 'RELEASED', 'REJECTED', 'FAILED')
);

-- Backfill requested_amount from amount
UPDATE release_requests SET requested_amount = amount WHERE requested_amount IS NULL;

-- Add multisig_approvals fields
ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS approver_role VARCHAR(50);
ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS approval_type VARCHAR(50) DEFAULT '2_OF_3_MULTISIG';
ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED';
ALTER TABLE multisig_approvals ALTER COLUMN milestone_id DROP NOT NULL;
ALTER TABLE multisig_approvals ALTER COLUMN signer_id DROP NOT NULL;
ALTER TABLE multisig_approvals ALTER COLUMN signer_role DROP NOT NULL;

-- Sync approver_id from signer_id if needed
UPDATE multisig_approvals SET approver_id = signer_id WHERE approver_id IS NULL AND signer_id IS NOT NULL;
UPDATE multisig_approvals SET approver_role = signer_role WHERE approver_role IS NULL AND signer_role IS NOT NULL;
