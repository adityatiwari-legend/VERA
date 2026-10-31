import React from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatCard (Upgraded) — component.md §2.1
 * Composed on Surface. KPI displays for dashboards and platform ribbons.
 */

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  variant?: "glass" | "white" | "dark" | "gradient";
  accentColor?: "emerald" | "cyan" | "indigo" | "amber";
}

const accentText: Record<NonNullable<StatCardProps["accentColor"]>, string> = {
  emerald: "text-brand-emerald-500",
  cyan: "text-cyber-cyan-500",
  indigo: "text-trust-indigo-500",
  amber: "text-alert-amber-500",
};

const accentBg: Record<NonNullable<StatCardProps["accentColor"]>, string> = {
  emerald: "bg-brand-emerald-500/10 border-brand-emerald-500/25",
  cyan: "bg-cyber-cyan-500/10 border-cyber-cyan-500/25",
  indigo: "bg-trust-indigo-500/10 border-trust-indigo-500/25",
  amber: "bg-alert-amber-500/10 border-alert-amber-500/25",
};

const variantMap: Record<
  NonNullable<StatCardProps["variant"]>,
  "default" | "glass-dark" | "glass-light" | "glow-emerald"
> = {
  glass: "glass-dark",
  white: "glass-light",
  dark: "default",
  gradient: "glow-emerald",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  variant = "dark",
  accentColor = "emerald",
}: StatCardProps) {
  return (
    <Surface variant={variantMap[variant]} padding="lg" rounded="2xl" interactive>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            {label}
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight tabular-nums font-mono">
            {value}
          </div>
          {subtext && (
            <div className="text-xs text-zinc-400 font-mono">{subtext}</div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center",
              accentBg[accentColor],
              accentText[accentColor]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
          {trend.positive ? (
            <TrendingUp className="w-3.5 h-3.5 text-brand-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-danger-rose-500" />
          )}
          <span
            className={cn(
              "text-xs font-mono",
              trend.positive ? "text-brand-emerald-500" : "text-danger-rose-500"
            )}
          >
            {trend.value}
          </span>
        </div>
      )}
    </Surface>
  );
}

export default StatCard;
