export type UserRole = 'USER' | 'ORGANIZATION' | 'CONTRACTOR' | 'AUDITOR' | 'ADMIN';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type MilestoneStatus =
  | 'LOCKED'
  | 'IN_PROGRESS'
  | 'PROOF_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'RELEASED'
  | 'REJECTED'
  | 'FAILED';

export type FundTransactionType = 'DONATION' | 'LOCK' | 'RELEASE' | 'SPEND' | 'REFUND';

export type ProofStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type AIStatus = 'PASS' | 'FLAG' | 'FAIL' | 'MANUAL_REVIEW' | 'ERROR';

export interface User {
  id: string;
  name: string;
  email: string;
  wallet_address: string | null;
  role: UserRole;
  org_type?: string | null;
  org_status?: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | null;
  org_registration_no?: string | null;
  contractor_status?: 'PENDING' | 'APPROVED' | 'SUSPENDED' | null;
  service_area?: string | null;
  solana_pubkey?: string | null;
  account_status?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithPasswordHash extends User {
  password_hash: string;
}

export type BlockchainStatus = 'NOT_SUBMITTED' | 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export type ReleaseRequestStatus =
  | 'AWAITING_MULTISIG'
  | 'READY_TO_RELEASE'
  | 'RELEASE_SUBMITTED'
  | 'RELEASED'
  | 'REJECTED'
  | 'FAILED';

export interface Campaign {
  id: string;
  ngo_id: string;
  title: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  released_amount: number;
  beneficiary: string;
  status: CampaignStatus;
  blockchain_campaign_id: string | null;
  blockchain_network?: string | null;
  blockchain_contract_address?: string | null;
  blockchain_status?: BlockchainStatus;
  created_at: string;
  updated_at: string;
  ngo_name?: string;
  ngo_email?: string;
  milestones_count?: number;
  donors_count?: number;
}

export interface Milestone {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  amount: number;
  sequence: number;
  status: MilestoneStatus;
  proof_required: boolean;
  blockchain_milestone_id?: string | null;
  blockchain_status?: BlockchainStatus;
  created_at: string;
  updated_at: string;
  active_proof_id?: string;
  active_proof_status?: ProofStatus;
  release_request?: ReleaseRequest | null;
}

export interface Donation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  purpose: string | null;
  status: DonationStatus;
  reference: string;
  transaction_hash: string | null;
  blockchain_tx_hash?: string | null;
  blockchain_status?: BlockchainStatus;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
  donor_name?: string;
  campaign_title?: string;
  beneficiary?: string;
}

export interface FundTransaction {
  id: string;
  campaign_id: string;
  milestone_id: string | null;
  donation_id: string | null;
  type: FundTransactionType;
  amount: number;
  reference: string;
  transaction_hash: string | null;
  blockchain_tx_hash?: string | null;
  blockchain_block_number?: number | null;
  blockchain_status?: BlockchainStatus;
  recipient_address?: string | null;
  created_at: string;
  milestone_title?: string;
}

export interface ReleaseRequest {
  id: string;
  campaign_id: string;
  milestone_id: string;
  proof_id: string | null;
  requested_amount: number;
  requested_by: string;
  status: ReleaseRequestStatus;
  required_approvals: number;
  current_approvals: number;
  blockchain_tx_hash: string | null;
  blockchain_status: BlockchainStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  milestone_title?: string;
  campaign_title?: string;
  requested_by_name?: string;
  approvals?: MultisigApproval[];
}

export interface MultisigApproval {
  id: string;
  release_request_id: string;
  approver_id: string;
  approver_role: string;
  approval_type: string;
  status: 'APPROVED' | 'REJECTED';
  comment: string | null;
  blockchain_tx_hash: string | null;
  created_at: string;
  approver_name?: string;
  approver_email?: string;
}

export interface ProofFile {
  id: string;
  proof_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  integrity_failed?: boolean;
  uploaded_at: string;
}

export interface VerificationResult {
  id: string;
  proof_id: string;
  ai_status: AIStatus;
  confidence: number;
  extracted_amount: number | null;
  extracted_date: string | null;
  extracted_vendor: string | null;
  extracted_invoice_number: string | null;
  duplicate_detected: boolean;
  discrepancy_amount: number;
  notes: string | null;
  raw_result: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Proof {
  id: string;
  milestone_id: string;
  submitted_by: string;
  description: string;
  claimed_amount: number;
  status: ProofStatus;
  rejection_reason: string | null;
  submitted_at: string;
  updated_at: string;
  milestone_title?: string;
  milestone_amount?: number;
  campaign_id?: string;
  campaign_title?: string;
  ngo_name?: string;
  files?: ProofFile[];
  verification?: VerificationResult | null;
}

export interface AuditLog {
  id: string;
  campaign_id: string | null;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
  prev_hash?: string | null;
  entry_hash?: string | null;
  chain_position?: number;
  actor_name?: string;
  actor_role?: UserRole;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

// ---------------------------------------------------------------------------
// Hisaab of the Road — pothole reports + Solana milestone escrow
// ---------------------------------------------------------------------------

export type PotholeReportStatus =
  | 'OPEN'
  | 'CONFIRMED'
  | 'ESCALATED'
  | 'REPAIR_SUBMITTED'
  | 'VERIFIED'
  | 'PAID'
  | 'REJECTED';

export interface GeminiPotholeResult {
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  size_estimate_cm: number | null;
  surface_type: string | null;
  description_hinglish: string;
  confidence: number;
}

export interface GeminiCompareResult {
  repaired: boolean;
  confidence: number;
  notes_hinglish: string;
}

export interface PotholeReport {
  id: string;
  reporter_id: string;
  latitude: number;
  longitude: number;
  address_label: string | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  size_estimate_cm: number | null;
  description: string | null;
  gemini_result: GeminiPotholeResult | null;
  gemini_status: AIStatus;
  media_file_path: string | null;
  media_mime_type: string | null;
  media_sha256: string | null;
  status: PotholeReportStatus;
  solana_report_pda: string | null;
  solana_tx_hash: string | null;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
  confirmations_count?: number;
  escrow?: HisaabEscrow | null;
}

export interface PotholeConfirmation {
  id: string;
  report_id: string;
  user_id: string;
  solana_confirm_pda: string | null;
  solana_tx_hash: string | null;
  created_at: string;
  user_name?: string;
}

export interface HisaabEscrow {
  id: string;
  report_id: string;
  funder_label: string;
  funder_type: 'GOV_GRANT' | 'CORPORATE_CSR' | 'PLATFORM';
  fund_request_id: string | null;
  contractor_label: string;
  contractor_user_id: string | null;
  contractor_wallet: string | null;
  assignment_id: string | null;
  demo_mode: boolean;
  stage1_amount: number;
  stage2_amount: number;
  stage3_amount: number;
  released_stage: number;
  hold_until: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'REFUNDED';
  solana_escrow_pda: string | null;
  solana_vault_pda: string | null;
  solana_tx_hash: string | null;
  created_at: string;
}

export interface RepairSubmission {
  id: string;
  report_id: string;
  after_file_path: string | null;
  after_sha256: string | null;
  gemini_compare: GeminiCompareResult | null;
  gemini_status: AIStatus;
  roughness_score: number | null;
  roughness_samples: number | null;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  solana_tx_hash: string | null;
  created_at: string;
  contractor_name?: string;
}

// ---------------------------------------------------------------------------
// Platform v2 — fund requests, contractor assignments, notifications, tokens
// ---------------------------------------------------------------------------

export type FundRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SANCTIONED' | 'REJECTED';

export interface FundRequest {
  id: string;
  admin_id: string;
  title: string;
  description: string;
  department: string;
  requested_amount: number;
  sanctioned_amount: number | null;
  status: FundRequestStatus;
  gov_reference_no: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  admin_name?: string;
  report_ids?: string[];
  reports_count?: number;
}

export type AssignmentStatus = 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'COMPLETED';

export interface ContractorAssignment {
  id: string;
  report_id: string;
  contractor_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  note: string | null;
  offered_at: string;
  responded_at: string | null;
  contractor_name?: string;
  contractor_status?: string | null;
  contractor_pubkey?: string | null;
  report_address_label?: string | null;
  report_status?: PotholeReportStatus;
  assigned_by_name?: string;
  escrow_id?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NavCounts {
  role: UserRole;
  org_status: string | null;
  contractor_status: string | null;
  has_solana_pubkey: boolean;
  items: { label: string; href: string; icon?: string; count?: number }[];
}
