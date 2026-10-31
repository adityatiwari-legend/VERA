import React from "react";
import { cn } from "@/lib/utils";
import { Download, Eye, Wallet } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/financial/ProgressBar";
import { BlockchainBadge } from "./BlockchainBadge";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * CampaignHero — design-system.md (Composed on Surface)
 * High-impact hero header across Campaign Details and Public Audit pages.
 */

export interface CampaignHeroProps {
  title: string;
  ngo: string;
  category: string;
  raised: number;
  target: number;
  escrowLocked: number;
  released: number;
  contractAddress: string;
  txHash: string;
  onDonate?: () => void;
  onAudit?: () => void;
  className?: string;
}

export function CampaignHero({
  title,
  ngo,
  category,
  raised,
  target,
  escrowLocked,
  released,
  contractAddress,
  txHash,
  onDonate,
  onAudit,
  className,
}: CampaignHeroProps) {
  const pct = target > 0 ? (raised / target) * 100 : 0;

  return (
    <Surface
      as="header"
      variant="default"
      padding="xl"
      rounded="2xl"
      className={cn("relative overflow-hidden", className)}
    >
      <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: identity + actions */}
        <div className="space-y-6 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="slate" size="sm" label={category} />
            <Badge
              variant={escrowLocked > 0 ? "emerald" : "slate"}
              size="sm"
              label={escrowLocked > 0 ? "Escrow Active" : "No Escrow Funds"}
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="font-mono text-sm text-mute">
              Operated by{" "}
              <span className="text-accent">{ngo}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="primary" size="md" leftIcon={<Wallet className="h-4 w-4" />} onClick={onDonate}>
              Donate Now
            </Button>
            <Button variant="secondary" size="md" leftIcon={<Eye className="h-4 w-4" />} onClick={onAudit}>
              View Public Audit
            </Button>
            <Button variant="ghost" size="md" leftIcon={<Download className="h-4 w-4" />}>
              Export PDF Report
            </Button>
          </div>
        </div>

        {/* Right: financial summary */}
        <div className="space-y-4 lg:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <SummaryPill label="Raised" value={`₹${raised.toLocaleString("en-IN")}`} accent="emerald" />
            <SummaryPill label="Released" value={`₹${released.toLocaleString("en-IN")}`} accent="emerald" />
            <SummaryPill label="Escrow Locked" value={`₹${escrowLocked.toLocaleString("en-IN")}`} accent="amber" />
            <SummaryPill label="Target" value={`₹${target.toLocaleString("en-IN")}`} accent="slate" />
          </div>
          <ProgressBar value={pct} accent="emerald" showLabel label="Funding" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2">
            <BlockchainBadge txHash={txHash} confirmed />
            <HashDisplay hash={contractAddress} type="address" label="Contract" />
          </div>
        </div>
      </div>
    </Surface>
  );
}

function SummaryPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "cyan" | "amber" | "slate";
}) {
  const accentText = {
    emerald: "text-ok",
    cyan: "text-accent",
    amber: "text-warn",
    slate: "text-mute",
  }[accent];
  return (
    <div className="rounded-xl border border-line bg-mist px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
        {label}
      </div>
      <div className={cn("mt-1 font-mono font-semibold tabular-nums text-base", accentText)}>
        {value}
      </div>
    </div>
  );
}

export default CampaignHero;
