"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Lock, Coins, FileCheck, Gift, ChevronRight } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * AuditTimeline — design-system.md (Composed on Surface)
 * Unified chronological audit trail merging DB mutations and on-chain events.
 */

export type AuditEventType = "Donation" | "Approval" | "Release" | "Proof" | "Lock";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  title: string;
  timestamp: string;
  txHash?: string;
  actor?: string;
  amount?: number;
}

export interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

const eventMeta: Record<
  AuditEventType,
  { variant: "emerald" | "amber" | "indigo" | "cyan" | "rose"; icon: React.ReactNode; iconClass: string }
> = {
  Donation: { variant: "cyan", icon: <Gift className="h-3.5 w-3.5" />, iconClass: "bg-accent-faint text-accent" },
  Approval: { variant: "indigo", icon: <ShieldCheck className="h-3.5 w-3.5" />, iconClass: "bg-accent-faint text-accent-deep" },
  Release: { variant: "emerald", icon: <Coins className="h-3.5 w-3.5" />, iconClass: "bg-ok-soft text-ok" },
  Proof: { variant: "amber", icon: <FileCheck className="h-3.5 w-3.5" />, iconClass: "bg-warn-soft text-warn" },
  Lock: { variant: "amber", icon: <Lock className="h-3.5 w-3.5" />, iconClass: "bg-warn-soft text-warn" },
};

const filterItems = [
  { key: "All", label: "All" },
  { key: "Donation", label: "Donations" },
  { key: "Approval", label: "Approvals" },
  { key: "Release", label: "Releases" },
  { key: "Proof", label: "Proofs" },
];

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    filter === "All" ? events : events.filter((e) => e.type === filter);

  return (
    <Surface variant="default" padding="lg" rounded="2xl" className={cn("space-y-5", className)}>
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-ink">Audit Timeline</h3>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
            {events.length} immutable events
          </p>
        </div>
        <Tabs items={filterItems} activeKey={filter} onChange={setFilter} />
      </div>

      <div className="space-y-1">
        {filtered.map((ev) => {
          const meta = eventMeta[ev.type];
          const isOpen = expanded === ev.id;
          return (
            <div key={ev.id} className="relative">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : ev.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-mist"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    meta.iconClass
                  )}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink">{ev.title}</span>
                    <Badge variant={meta.variant} size="xs" label={ev.type} />
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-faint">
                    {new Date(ev.timestamp).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {ev.actor && <span> · {ev.actor}</span>}
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-faint transition-transform",
                    isOpen && "rotate-90"
                  )}
                />
              </button>
              {isOpen && (
                <div className="mb-2 ml-11 space-y-2 rounded-xl border border-line bg-mist px-4 py-3">
                  {typeof ev.amount === "number" && (
                    <div className="font-mono text-sm text-ink">
                      ₹{ev.amount.toLocaleString("en-IN")}
                    </div>
                  )}
                  {ev.txHash && <HashDisplay hash={ev.txHash} type="tx" label="TX" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

export default AuditTimeline;
