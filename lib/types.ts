export interface AuditTransaction {
  id: string;
  timestamp: string;
  campaign: string;
  milestone: string;
  amount: number;
  currency: string;
  type: string;
  status: "RELEASED" | "ESCROW_LOCKED" | "RECORDED" | "REFUNDED";
  txHash: string | null;
  evidenceHash: string | null;
  ngoName: string;
  ocrDiscrepancy: number | null;
}

export interface EscrowMilestone {
  id: number;
  title: string;
  budget: number;
  released: number;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  evidenceCount: number;
  hash: string;
  signers: number;
  requiredSigners: number;
}

// Re-export core domain types for compatibility
export * from '@/types';
