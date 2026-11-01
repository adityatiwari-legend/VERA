import { z } from 'zod';
import { CampaignStatus, UserRole, MilestoneStatus } from '../types';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
    email: z.string().trim().email('Invalid email address').max(100, 'Email cannot exceed 100 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
    // Self-serve roles only. AUDITOR is invite-only and ADMIN is seed-only;
    // privileged roles must never be registrable from the public API.
    role: z.enum(['USER', 'ORGANIZATION', 'CONTRACTOR'] as const).default('USER'),
    org_type: z
      .union([
        z.enum(['NGO', 'TRUST', 'CSR', 'SCHOOL', 'RWA', 'OTHER']),
        // Legacy value the mobile app still sends — normalized to NGO.
        z.literal('ORGANIZATION').transform(() => 'NGO' as const),
      ])
      .optional(),
    org_registration_no: z.string().trim().max(80).optional().nullable(),
    service_area: z.string().trim().max(160).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'ORGANIZATION' && !data.org_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['org_type'],
        message: 'Organization type is required',
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  target_amount: z.coerce
    .number()
    .positive('Target amount must be strictly greater than 0')
    .max(1000000000, 'Target amount exceeds maximum limit'),
  beneficiary: z
    .string()
    .trim()
    .min(2, 'Beneficiary must be at least 2 characters')
    .max(200, 'Beneficiary cannot exceed 200 characters'),
  status: z
    .enum(['DRAFT', 'ACTIVE'] as const)
    .default('DRAFT'),
});

export const updateCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional(),
  target_amount: z.coerce
    .number()
    .positive('Target amount must be strictly greater than 0')
    .max(1000000000, 'Target amount exceeds maximum limit')
    .optional(),
  beneficiary: z
    .string()
    .trim()
    .min(2, 'Beneficiary must be at least 2 characters')
    .max(200, 'Beneficiary cannot exceed 200 characters')
    .optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const),
});

export const createDonationSchema = z.object({
  tx_hash: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid transaction hash')
    .optional(),
  amount: z.coerce
    .number()
    .positive('Donation amount must be strictly greater than 0')
    .min(1, 'Minimum donation amount is ₹1')
    .max(10000000, 'Donation amount exceeds single transaction limit')
    .optional(),
  purpose: z
    .string()
    .trim()
    .max(255, 'Purpose cannot exceed 255 characters')
    .optional()
    .nullable(),
});

export const createMilestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title cannot exceed 255 characters'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description cannot exceed 2000 characters'),
  amount: z.coerce
    .number()
    .positive('Milestone amount must be strictly greater than 0')
    .max(1000000000, 'Milestone amount exceeds limit'),
  sequence: z.coerce
    .number()
    .int('Sequence must be an integer')
    .positive('Sequence must be >= 1')
    .optional(),
  proof_required: z.boolean().optional(),
});

export const updateMilestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title cannot exceed 255 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  amount: z.coerce
    .number()
    .positive('Milestone amount must be strictly greater than 0')
    .optional(),
  sequence: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  proof_required: z.boolean().optional(),
});

export const changeMilestoneStatusSchema = z.object({
  status: z.enum(['LOCKED', 'IN_PROGRESS', 'PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const),
});

export const submitProofSchema = z.object({
  claimed_amount: z.coerce
    .number()
    .positive('Claimed amount must be strictly greater than 0'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),
});

export const auditorDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT'] as const),
  comment: z.string().trim().max(2000).optional().nullable(),
}).refine((data) => {
  if (data.decision === 'REJECT' && (!data.comment || data.comment.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Comment is required when rejecting proof evidence',
  path: ['comment'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type ChangeMilestoneStatusInput = z.infer<typeof changeMilestoneStatusSchema>;
export type SubmitProofInput = z.infer<typeof submitProofSchema>;
export type AuditorDecisionInput = z.infer<typeof auditorDecisionSchema>;

// ---------------------------------------------------------------------------
// Hisaab of the Road
// ---------------------------------------------------------------------------

export const createReportSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address_label: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().min(5).max(2000),
  // Client-supplied triage hints; used as fallback when Gemini triage is
  // unavailable or returns nothing (Gemini result wins when present).
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  size_estimate_cm: z.coerce.number().positive().max(10000).optional().nullable(),
  // Idempotency key from mobile clients; accepted and ignored.
  client_submission_id: z.string().trim().max(120).optional().nullable(),
});

export const createEscrowSchema = z.object({
  report_id: z.string().uuid(),
  funder_label: z.string().trim().min(2).max(120),
  contractor_id: z.string().uuid(),
  stage1_amount: z.coerce.number().positive().max(100000000),
  stage2_amount: z.coerce.number().positive().max(100000000),
  stage3_amount: z.coerce.number().positive().max(100000000),
  funder_type: z.enum(['GOV_GRANT', 'CORPORATE_CSR', 'PLATFORM']).default('GOV_GRANT'),
  fund_request_id: z.string().uuid().optional().nullable(),
});

export const createFundRequestSchema = z.object({
  title: z.string().trim().min(4, 'Title must be at least 4 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000),
  department: z.string().trim().min(2, 'Department is required').max(120),
  requested_amount: z.coerce.number().positive().max(1000000000),
  report_ids: z.array(z.string().uuid()).max(50).default([]),
});

export const updateFundRequestStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'SANCTIONED', 'REJECTED']),
  sanctioned_amount: z.coerce.number().positive().optional(),
  gov_reference_no: z.string().trim().max(80).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const createAssignmentSchema = z.object({
  report_id: z.string().uuid(),
  contractor_id: z.string().uuid(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const roughnessReadingSchema = z.object({
  accel_z: z.coerce.number(),
  speed_kmh: z.coerce.number().min(0).max(200).nullish(),
  recorded_at: z.string().datetime().nullish(),
});

export const submitRoughnessSchema = z.object({
  report_id: z.string().uuid(),
  device_label: z.string().trim().max(120).default('phone'),
  readings: z.array(roughnessReadingSchema).min(1).max(5000),
});

export const fastForwardSchema = z.object({
  stage: z.coerce.number().int().min(1).max(3),
});
