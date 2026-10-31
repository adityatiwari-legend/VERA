"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Wallet } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * MultisigApprovalWidget — design-system.md (Composed on Surface elevated)
 * Transparent visualization of the 2-of-3 multisig authorization consensus.
 */

export interface Signer {
  role: string;
  name: string;
  address: string;
  signed: boolean;
  eligible?: boolean;
}

export interface MultisigApprovalWidgetProps {
  signers: Signer[];
  required: number;
  onSign?: () => void;
  className?: string;
}

export function MultisigApprovalWidget({
  signers,
  required,
  onSign,
  className,
}: MultisigApprovalWidgetProps) {
  const signedCount = signers.filter((s) => s.signed).length;
  const reached = signedCount >= required;
  const pct = (signedCount / required) * 100;
  const canSign = signers.some((s) => s.eligible && !s.signed);

  return (
    <Surface variant="elevated" padding="lg" rounded="2xl" className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-ink">
            Multisig Consensus
          </h3>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
            {required}-of-{signers.length} Authorization
          </p>
        </div>
        <Badge
          variant={reached ? "emerald" : "amber"}
          size="sm"
          dot
          pulse={!reached}
          label={reached ? "Quorum Reached" : "Awaiting Signatures"}
        />
      </div>

      {/* Signature progress */}
      <div>
        <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
          <span className="uppercase tracking-wider text-faint">Signatures</span>
          <span className={cn("tabular-nums", reached ? "text-ok" : "text-warn")}>
            {signedCount}/{required}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-mist">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              reached ? "bg-ok" : "bg-warn"
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Signers list */}
      <div className="space-y-2">
        {signers.map((s) => (
          <div
            key={s.role}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5",
              s.signed
                ? "border-ok/20 bg-ok-soft"
                : "border-line bg-white"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
                  s.signed
                    ? "border-ok/20 bg-white text-ok"
                    : "border-line bg-mist text-mute"
                )}
              >
                {s.signed ? <Check className="h-4 w-4" /> : s.name.slice(0, 1)}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="truncate text-sm text-ink">{s.name}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    {s.role}
                  </span>
                  <HashDisplay hash={s.address} type="address" className="!text-[10px]" />
                </div>
              </div>
            </div>
            {s.signed ? (
              <Badge variant="emerald" size="xs" icon={<Check className="h-3 w-3" />} label="Signed" />
            ) : (
              <Badge variant="amber" size="xs" dot pulse icon={<Clock className="h-3 w-3" />} label="Pending" />
            )}
          </div>
        ))}
      </div>

      {/* Action */}
      {canSign && onSign && (
        <Button variant="primary" size="md" fullWidth leftIcon={<Wallet className="h-4 w-4" />} onClick={onSign}>
          Sign with Wallet
        </Button>
      )}
    </Surface>
  );
}

export default MultisigApprovalWidget;
