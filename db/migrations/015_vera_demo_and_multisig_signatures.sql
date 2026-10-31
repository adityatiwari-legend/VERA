-- Demo-fund labeling (honest mode) + per-signer multisig signatures.

ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE fund_transactions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE multisig_approvals ADD COLUMN IF NOT EXISTS signer_wallet TEXT;
