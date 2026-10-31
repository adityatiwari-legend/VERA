import React from "react";
import { cn } from "@/lib/utils";

/**
 * ProgressBar — base progress bar used across VERA components.
 * Composed inside CampaignCard, CampaignHero, EscrowMilestoneTracker, etc.
 * Light editorial theme: mist track, hairline border, blue accent fill, no glow.
 */

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  accent?: "emerald" | "cyan" | "indigo" | "amber" | "rose";
  showLabel?: boolean;
  label?: string;
  className?: string;
  glow?: boolean;
}

const sizeClasses: Record<NonNullable<ProgressBarProps["size"]>, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

const accentClasses: Record<NonNullable<ProgressBarProps["accent"]>, string> = {
  emerald: "bg-accent",
  cyan: "bg-accent",
  indigo: "bg-accent",
  amber: "bg-accent",
  rose: "bg-accent",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  accent = "emerald",
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
          <span className="uppercase tracking-wider text-mute">
            {label ?? "Progress"}
          </span>
          <span className="tabular-nums text-ink">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full border border-line bg-mist",
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            accentClasses[accent]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
