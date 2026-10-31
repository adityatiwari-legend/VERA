import React from "react";
import { cn } from "@/lib/utils";

/**
 * FundDistributionBar — component.md §2.2
 * Multi-segmented visual breakdown of campaign funds.
 */

export interface FundDistributionBarProps {
  total: number;
  released: number;
  locked: number;
  refunded?: number;
  showLegend?: boolean;
  height?: "sm" | "md" | "lg";
}

const heightClasses: Record<NonNullable<FundDistributionBarProps["height"]>, string> = {
  sm: "h-2",
  md: "h-3.5",
  lg: "h-5",
};

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function FundDistributionBar({
  total,
  released,
  locked,
  refunded = 0,
  showLegend = true,
  height = "md",
}: FundDistributionBarProps) {
  const remaining = Math.max(0, total - released - locked - refunded);
  const segments: Segment[] = [
    { key: "released", label: "Released", value: released, color: "bg-brand-emerald-500" },
    { key: "locked", label: "Escrow Locked", value: locked, color: "bg-alert-amber-500" },
    { key: "refunded", label: "Refunded", value: refunded, color: "bg-trust-indigo-500" },
    { key: "remaining", label: "Remaining Goal", value: remaining, color: "bg-white/[0.08]" },
  ];

  return (
    <div className="w-full space-y-3">
      <div
        className={cn(
          "w-full flex overflow-hidden rounded-full bg-white/[0.04] border border-white/[0.06]",
          heightClasses[height]
        )}
      >
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.key}
              className={cn("h-full transition-all duration-500", seg.color)}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px]">
          {segments.map((seg) => (
            <div key={seg.key} className="inline-flex items-center gap-1.5">
              <span className={cn("w-2.5 h-2.5 rounded-sm", seg.color)} />
              <span className="text-zinc-400 uppercase tracking-wider">{seg.label}</span>
              <span className="text-zinc-300 tabular-nums">
                ₹{seg.value.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FundDistributionBar;
