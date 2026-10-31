import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Boxes, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * BlockchainBadge (Upgraded) — design-system.md
 * Unifies on-chain proof display across milestones, donations, and contracts.
 */

export interface BlockchainBadgeProps {
  network?: "Hardhat" | "Sepolia" | "Mainnet";
  txHash?: string;
  explorerUrl?: string;
  blockConfirmations?: number;
  confirmed?: boolean;
  variant?: "compact" | "full";
  className?: string;
}

export function BlockchainBadge({
  network = "Sepolia",
  txHash,
  explorerUrl,
  blockConfirmations,
  confirmed = true,
  variant = "full",
  className,
}: BlockchainBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-mist px-2.5 py-1.5",
        confirmed
          ? "border-accent/25"
          : "border-warn/25",
        className
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          confirmed
            ? "bg-accent-faint text-accent"
            : "bg-warn-soft text-warn"
        )}
      >
        {confirmed ? <ShieldCheck className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
      </span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <Badge variant={confirmed ? "cyan" : "amber"} size="xs" label={network} />
          {typeof blockConfirmations === "number" && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-faint">
              <Link2 className="h-3 w-3" />
              {blockConfirmations} conf
            </span>
          )}
        </div>
        {txHash && variant === "full" && (
          <div className="mt-0.5">
            <HashDisplay hash={txHash} type="tx" explorerUrl={explorerUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockchainBadge;
