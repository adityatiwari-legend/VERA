-- 005_create_phase3_tables.sql
-- VERA Phase 3: Proofs, Proof Files, and Verification Results

-- 1. Proofs Table
CREATE TABLE IF NOT EXISTS proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    claimed_amount NUMERIC(14,2) NOT NULL CHECK (claimed_amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proofs_milestone_id ON proofs(milestone_id);
CREATE INDEX IF NOT EXISTS idx_proofs_submitted_by ON proofs(submitted_by);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON proofs(status);
CREATE INDEX IF NOT EXISTS idx_proofs_submitted_at ON proofs(submitted_at DESC);

-- 2. Proof Files Table
CREATE TABLE IF NOT EXISTS proof_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proof_files_proof_id ON proof_files(proof_id);
CREATE INDEX IF NOT EXISTS idx_proof_files_sha256_hash ON proof_files(sha256_hash);

-- 3. Verification Results Table
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    ai_status VARCHAR(50) NOT NULL CHECK (ai_status IN ('PASS', 'FLAG', 'FAIL', 'MANUAL_REVIEW', 'ERROR')),
    confidence NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    extracted_amount NUMERIC(14,2),
    extracted_date DATE,
    extracted_vendor VARCHAR(255),
    extracted_invoice_number VARCHAR(100),
    duplicate_detected BOOLEAN NOT NULL DEFAULT false,
    discrepancy_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    raw_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_results_proof_id ON verification_results(proof_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_ai_status ON verification_results(ai_status);
