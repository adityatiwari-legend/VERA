-- 020_disputes_and_votes.sql
-- Milestone disputes (mobile calls POST /milestones/[id]/dispute + /dispute/resolve)
-- and citizen REJECT/FLAG votes on pothole reports (mobile calls /hisaab/reports/[id]/vote).
-- CONFIRM votes keep using pothole_confirmations; this table only records REJECT/FLAG.

CREATE TABLE IF NOT EXISTS milestone_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one OPEN dispute per milestone (resolved disputes stay as history).
CREATE UNIQUE INDEX IF NOT EXISTS uq_milestone_disputes_open
  ON milestone_disputes (milestone_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_milestone ON milestone_disputes (milestone_id);

CREATE TABLE IF NOT EXISTS pothole_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES pothole_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('REJECT', 'FLAG')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pothole_votes_report ON pothole_votes (report_id);
