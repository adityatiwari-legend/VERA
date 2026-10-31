"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Lock, FileCheck, Eye, Check, Coins, ArrowRight } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * EscrowMilestoneTracker — design-system.md (Composed on Surface)
 * Sleek, interactive, step-by-step milestone progress.
 */

export type MilestoneStatus =
  | "LOCKED"
  | "PROOF_SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "RELEASED";

export interface EscrowMilestone {
  id: number;
  title: string;
  budget: number;
  status: MilestoneStatus;
  signers: number;
  requiredSigners: number;
  txHash?: string;
}

export interface EscrowMilestoneTrackerProps {
  milestones: EscrowMilestone[];
  onAction?: (milestone: EscrowMilestone, action: string) => void;
  className?: string;
}

const statusMeta: Record<
  MilestoneStatus,
  {
    variant: "amber" | "emerald" | "slate";
    className?: string;
    label: string;
    icon: React.ReactNode;
    nodeClass: string;
  }
> = {
  LOCKED: {
    variant: "slate",
    className: "bg-lav-soft border-lav-deep/20 text-lav-deep",
    label: "Locked",
    icon: <Lock className="h-3 w-3" />,
    nodeClass: "bg-mist border border-line-strong text-mute",
  },
  PROOF_SUBMITTED: {
    variant: "amber",
    label: "Proof Submitted",
    icon: <FileCheck className="h-3 w-3" />,
    nodeClass: "bg-warn-soft border border-warn/40 text-warn",
  },
  UNDER_REVIEW: {
    variant: "amber",
    label: "Under Review",
    icon: <Eye className="h-3 w-3" />,
    nodeClass: "bg-warn-soft border border-warn/40 text-warn",
  },
  APPROVED: {
    variant: "emerald",
    label: "Approved",
    icon: <Check className="h-3 w-3" />,
    nodeClass: "bg-ok-soft border border-ok/40 text-ok",
  },
  RELEASED: {
    variant: "emerald",
    label: "Released",
    icon: <Coins className="h-3 w-3" />,
    nodeClass: "bg-ok border border-ok text-white",
  },
};

function actionFor(status: MilestoneStatus): string | null {
  switch (status) {
    case "LOCKED":
      return "Request Release";
    case "PROOF_SUBMITTED":
      return "Sign Approval";
    case "UNDER_REVIEW":
      return "Execute Release";
    case "APPROVED":
      return "Execute Release";
    default:
      return null;
  }
}

export function EscrowMilestoneTracker({
  milestones,
  onAction,
  className,
}: EscrowMilestoneTrackerProps) {
  const releasedCount = milestones.filter((m) => m.status === "RELEASED").length;
  const totalBudget = milestones.reduce((s, m) => s + m.budget, 0);

  return (
    <Surface variant="default" padding="lg" rounded="2xl" className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            Escrow Milestone Pipeline
          </h3>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
            {releasedCount} of {milestones.length} released · ₹{totalBudget.toLocaleString("en-IN")} total
          </p>
        </div>
        <Badge variant="slate" size="sm" dot label="Multisig Governed" />
      </div>

      {/* Pipeline */}
      <div className="space-y-3">
        {milestones.map((m, idx) => {
          const meta = statusMeta[m.status];
          const action = actionFor(m.status);
          const isReleased = m.status === "RELEASED";
          return (
            <div key={m.id} className="relative">
              <div className="flex items-stretch gap-4">
                {/* Node + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
                      isReleased
                        ? "border-ok bg-ok text-white"
                        : meta.nodeClass
                    )}
                  >
                    {isReleased ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  {idx < milestones.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-line" />
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 pb-2">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-ink">{m.title}</div>
                      <div className="font-mono text-[11px] text-faint">
                        ₹{m.budget.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <Badge
                      variant={meta.variant}
                      className={meta.className}
                      size="xs"
                      dot
                      pulse={m.status === "UNDER_REVIEW"}
                      icon={meta.icon}
                      label={meta.label}
                    />
                  </div>

                  {/* Sub-row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                        Multisig
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          m.signers >= m.requiredSigners
                            ? "text-ok"
                            : "text-warn"
                        )}
                      >
                        {m.signers}/{m.requiredSigners}
                      </span>
                      {m.txHash && <HashDisplay hash={m.txHash} type="tx" />}
                    </div>
                    {action && (
                      <Button
                        variant="outline"
                        size="xs"
                        rightIcon={<ArrowRight className="h-3 w-3" />}
                        onClick={() => onAction?.(m, action)}
                      >
                        {action}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

export default EscrowMilestoneTracker;
