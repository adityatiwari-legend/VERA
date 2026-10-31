-- 010_fund_transaction_recipients.sql
-- Persist the expected payout/refund recipient for DB-vs-chain reconciliation.

ALTER TABLE fund_transactions
  ADD COLUMN IF NOT EXISTS recipient_address VARCHAR(255);
