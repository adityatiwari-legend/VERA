/**
 * Application-wide constants for VERA
 */

/** Application metadata */
export const APP_NAME = 'VERA';
export const APP_DESCRIPTION = 'Verifiable Evidence & Real Auditing';
export const APP_VERSION = '0.2.0';

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** File upload limits */
export const MAX_UPLOAD_SIZE_MB = 50;
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
];

/** Milestone statuses */
export const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PROOF_SUBMITTED: 'proof_submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  RELEASED: 'released',
} as const;

/** Campaign statuses */
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/** Multisig approval threshold */
export const MULTISIG_THRESHOLD = 2;
export const MULTISIG_TOTAL_SIGNERS = 3;
