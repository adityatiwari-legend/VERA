-- Government fund application workflow + contractor assignment flow for Hisaab.

CREATE TABLE IF NOT EXISTS fund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department TEXT NOT NULL,
  requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
  sanctioned_amount NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','SANCTIONED','REJECTED')),
  gov_reference_no TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fund_request_reports (
  fund_request_id UUID NOT NULL REFERENCES fund_requests(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES pothole_reports(id) ON DELETE CASCADE,
  PRIMARY KEY (fund_request_id, report_id)
);

CREATE TABLE IF NOT EXISTS contractor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES pothole_reports(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'OFFERED'
    CHECK (status IN ('OFFERED','ACCEPTED','DECLINED','REPLACED','COMPLETED')),
  note TEXT,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, contractor_id)
);

ALTER TABLE hisaab_escrows ADD COLUMN IF NOT EXISTS contractor_user_id UUID REFERENCES users(id);
ALTER TABLE hisaab_escrows ADD COLUMN IF NOT EXISTS funder_type TEXT NOT NULL DEFAULT 'GOV_GRANT';
ALTER TABLE hisaab_escrows DROP CONSTRAINT IF EXISTS hisaab_escrows_funder_type_check;
ALTER TABLE hisaab_escrows ADD CONSTRAINT hisaab_escrows_funder_type_check
  CHECK (funder_type IN ('GOV_GRANT','CORPORATE_CSR','PLATFORM'));
ALTER TABLE hisaab_escrows ADD COLUMN IF NOT EXISTS fund_request_id UUID REFERENCES fund_requests(id);
ALTER TABLE hisaab_escrows ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES contractor_assignments(id);
ALTER TABLE hisaab_escrows ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT FALSE;
