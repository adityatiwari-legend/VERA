import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, FileCheck, AlertTriangle, Award } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";

/**
 * NgoReputationCard — NGO Public Reputation card with transparent trust metrics.
 * Light editorial theme per docs/design-system.md. The score gauge and tamper bar
 * are rendered inline (light-native) instead of the dark-theme financial primitives.
 */

export interface NgoReputationCardProps {
  name: string;
  trustScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  completedCampaigns: number;
  verifiedInvoices: number;
  tamperScore: number;
  className?: string;
}

// Semantic grade tokens: green = high, blue = mid, amber/red = low.
const gradeStyles: Record<string, { stroke: string; text: string }> = {
  "A+": { stroke: "#15803D", text: "text-ok" },
  "A": { stroke: "#15803D", text: "text-ok" },
  "B": { stroke: "#2563EB", text: "text-accent-deep" },
  "C": { stroke: "#B45309", text: "text-warn" },
  "D": { stroke: "#B91C1C", text: "text-bad" },
};

function gradePhrase(grade: string) {
  switch (grade) {
    case "A+":
    case "A":
      return "Cryptographically Trusted";
    case "B":
      return "Verified — Monitoring";
    case "C":
      return "Conditional Trust";
    default:
      return "High Risk — Review";
  }
}

export function NgoReputationCard({
  name,
  trustScore,
  grade,
  completedCampaigns,
  verifiedInvoices,
  tamperScore,
  className,
}: NgoReputationCardProps) {
  const tamperPct = Math.min(100, tamperScore);
  const tamperSafe = tamperScore === 0;
  const colors = gradeStyles[grade] ?? gradeStyles["B"];

  // Gauge geometry (140px, 12px stroke)
  const dim = 140;
  const strokeW = 12;
  const radius = (dim - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, trustScore));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Surface variant="default" padding="lg" rounded="lg" className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-ok" />
            <h3 className="text-base font-semibold tracking-tight text-ink">{name}</h3>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Public Reputation Profile
          </p>
        </div>
        <Badge variant="emerald" size="sm" dot label="Verified NGO" />
      </div>

      {/* Gauge + metrics */}
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        {/* Light-native SVG score gauge */}
        <div className="inline-flex flex-col items-center gap-3">
          <div className="relative" style={{ width: dim, height: dim }}>
            <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
              <circle
                cx={dim / 2}
                cy={dim / 2}
                r={radius}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth={strokeW}
              />
              <circle
                cx={dim / 2}
                cy={dim / 2}
                r={radius}
                fill="none"
                stroke={colors.stroke}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-mono text-3xl font-bold tabular-nums", colors.text)}>
                {Math.round(clamped)}
              </span>
              <span className={cn("font-mono text-base font-semibold", colors.text)}>{grade}</span>
            </div>
          </div>
          <div className="space-y-0.5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Reputation Index
            </div>
            <div className={cn("font-mono text-xs", colors.text)}>{gradePhrase(grade)}</div>
          </div>
        </div>

        <div className="grid w-full flex-1 grid-cols-2 gap-3">
          <Metric
            icon={<ShieldCheck className="h-4 w-4 text-ok" />}
            label="Completed Campaigns"
            value={completedCampaigns}
          />
          <Metric
            icon={<FileCheck className="h-4 w-4 text-accent" />}
            label="Verified Invoices"
            value={verifiedInvoices}
          />
          <Metric
            icon={
              <AlertTriangle className={cn("h-4 w-4", tamperSafe ? "text-ok" : "text-bad")} />
            }
            label="Tamper Score"
            value={`${tamperScore.toFixed(2)}%`}
            valueClass={tamperSafe ? "text-ok" : "text-bad"}
          />
          <Metric
            icon={<Award className="h-4 w-4 text-accent-deep" />}
            label="Audit Grade"
            value={grade}
            valueClass="text-accent-deep"
          />
        </div>
      </div>

      {/* Tamper bar */}
      <div className="border-t border-line pt-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
          <span className="uppercase tracking-wider text-mute">Tamper-Evidence Index</span>
          <span className="tabular-nums text-ink">{tamperPct.toFixed(1)}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full border border-line bg-mist"
          role="progressbar"
          aria-valuenow={tamperPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              tamperSafe ? "bg-ok" : "bg-bad"
            )}
            style={{ width: `${tamperPct}%` }}
          />
        </div>
      </div>
    </Surface>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-mist px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5">{icon}</div>
      <div className={cn("font-mono text-lg font-semibold tabular-nums text-ink", valueClass)}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-mute">{label}</div>
    </div>
  );
}

export default NgoReputationCard;
