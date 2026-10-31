import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/financial/ProgressBar";
import { TrustScoreGauge } from "@/components/financial/TrustScoreGauge";

/**
 * CampaignCard — design-system.md (Composed on Surface)
 * Reusable campaign card for Home, Browse Explorer, and NGO Dashboard.
 */

export type CampaignStatus = "Active" | "Paused" | "Completed";

export interface CampaignCardProps {
  title: string;
  ngo: string;
  category: string;
  raised: number;
  target: number;
  milestonesReleased: number;
  milestonesTotal: number;
  status: CampaignStatus;
  trustScore: number;
  trustGrade: "A+" | "A" | "B" | "C" | "D";
  href?: string;
  onDonate?: () => void;
  className?: string;
}

const statusVariant: Record<CampaignStatus, "cyan" | "amber" | "emerald"> = {
  Active: "cyan",
  Paused: "amber",
  Completed: "emerald",
};

export function CampaignCard({
  title,
  ngo,
  category,
  raised,
  target,
  milestonesReleased,
  milestonesTotal,
  status,
  trustScore,
  trustGrade,
  href = "#",
  onDonate,
  className,
}: CampaignCardProps) {
  const pct = target > 0 ? (raised / target) * 100 : 0;

  return (
    <Surface
      as="article"
      variant="default"
      interactive
      glowOnHover
      padding="lg"
      rounded="2xl"
      className={cn("group flex flex-col gap-5", className)}
    >
      {/* Header: category + status */}
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          {category}
        </span>
        <Badge
          variant={statusVariant[status]}
          size="xs"
          dot
          pulse={status === "Active"}
          label={status}
        />
      </div>

      {/* Title + NGO */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-mute">
          <ShieldCheck className="h-3 w-3 text-ok/70" />
          <span>{ngo}</span>
        </div>
      </div>

      {/* Trust gauge + funds */}
      <div className="flex items-center justify-between gap-4 py-1">
        <TrustScoreGauge score={trustScore} grade={trustGrade} size="sm" showDetails={false} />
        <div className="flex-1 space-y-1 text-right">
          <div className="font-mono text-xl font-semibold tabular-nums text-ink">
            ₹{raised.toLocaleString("en-IN")}
          </div>
          <div className="font-mono text-[11px] text-faint">
            of ₹{target.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <ProgressBar value={pct} accent="emerald" size="sm" />

      {/* Milestone counter + CTA */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="font-mono text-[11px] text-mute">
          <span className="text-ink">{milestonesReleased}</span>
          <span className="text-faint"> of {milestonesTotal} released</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-mute transition-all hover:border-line-strong hover:text-ink active:scale-[0.98]"
          >
            Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          {onDonate && (
            <Button size="sm" onClick={onDonate} className="!px-3 !py-1.5">
              Donate
            </Button>
          )}
        </div>
      </div>
    </Surface>
  );
}

export default CampaignCard;
