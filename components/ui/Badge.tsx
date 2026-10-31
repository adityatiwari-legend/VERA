import React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge / StatusPill — unified status representation for campaigns, milestones,
 * proofs, multisig, and chain events.
 */

export interface BadgeProps {
  variant?: "emerald" | "amber" | "rose" | "indigo" | "cyan" | "slate";
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  label: string;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  emerald: "bg-ok-soft border-ok/20 text-ok",
  amber: "bg-warn-soft border-warn/25 text-warn",
  rose: "bg-bad-soft border-bad/20 text-bad",
  indigo: "bg-accent-faint border-accent/20 text-accent-deep",
  cyan: "bg-accent-faint border-accent/20 text-accent",
  slate: "bg-mist border-line text-mute",
};

const dotColor: Record<NonNullable<BadgeProps["variant"]>, string> = {
  emerald: "bg-ok",
  amber: "bg-warn",
  rose: "bg-bad",
  indigo: "bg-accent",
  cyan: "bg-accent",
  slate: "bg-faint",
};

const sizeClasses: Record<NonNullable<BadgeProps["size"]>, string> = {
  xs: "px-2 py-0.5 text-[10px] gap-1",
  sm: "px-2.5 py-1 text-[11px] gap-1.5",
  md: "px-3 py-1.5 text-xs gap-1.5",
};

export function Badge({
  variant = "slate",
  size = "sm",
  dot = false,
  pulse = false,
  icon,
  label,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono uppercase tracking-wider border rounded-full whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotColor[variant],
            pulse && "animate-pulse"
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </span>
  );
}

export default Badge;
