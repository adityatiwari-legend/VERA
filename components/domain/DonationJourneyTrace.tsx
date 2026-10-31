"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Wallet, Lock, Layers, ScanLine, ShieldCheck, Coins, Check } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { BlockchainBadge } from "./BlockchainBadge";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * DonationJourneyTrace — Signature donor experience: "Where Did My Money Go?"
 * Light editorial timeline: green nodes = completed stages, blue = current,
 * amber badge = pending.
 */

export interface JourneyStage {
  key: string;
  title: string;
  description: string;
  amount?: number;
  txHash?: string;
  evidenceHash?: string;
}

export interface DonationJourneyTraceProps {
  donationAmount: number;
  campaign: string;
  stages: JourneyStage[];
  currentStageIndex: number;
  className?: string;
}

const stageIcons = [Wallet, Lock, Layers, ScanLine, ShieldCheck, Coins];

export function DonationJourneyTrace({
  donationAmount,
  campaign,
  stages,
  currentStageIndex,
  className,
}: DonationJourneyTraceProps) {
  const [openStage, setOpenStage] = useState<number | null>(null);

  return (
    <Surface
      variant="default"
      padding="lg"
      rounded="lg"
      className={cn("space-y-6", className)}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4 border-b border-line">
          <div className="space-y-1">
            <Badge variant="indigo" size="sm" dot pulse label="Live Trace" />
            <h2 className="text-2xl font-semibold text-ink tracking-tight">
              Where Did My Money Go?
            </h2>
            <p className="font-mono text-xs text-mute">
              {campaign} · ₹{donationAmount.toLocaleString("en-IN")} traced
            </p>
          </div>
        </div>

        {/* Pipeline */}
        <div className="relative">
          {/* connector line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-line" />
          <div
            className="absolute left-[19px] top-2 w-px bg-accent transition-all duration-700"
            style={{ height: `calc(${(currentStageIndex / (stages.length - 1)) * 100}% )` }}
          />

          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const Icon = stageIcons[idx % stageIcons.length];
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isOpen = openStage === idx;
              const clickable = isDone || isCurrent;
              return (
                <div key={stage.key} className="relative flex gap-4">
                  <div
                    className={cn(
                      "shrink-0 z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                      isDone && "bg-ok-soft border-ok text-ok",
                      isCurrent && "bg-accent border-accent text-white ring-4 ring-accent/15",
                      !isDone && !isCurrent && "bg-white border-line-strong text-faint"
                    )}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 pb-2 min-w-0">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && setOpenStage(isOpen ? null : idx)}
                      className={cn(
                        "w-full text-left rounded-xl px-4 py-3 border transition-all",
                        isCurrent
                          ? "bg-accent-faint border-accent/30"
                          : isDone
                          ? "bg-white border-line hover:border-line-strong"
                          : "bg-transparent border-line opacity-60",
                        clickable && "cursor-pointer",
                        !clickable && "cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-medium", isCurrent || isDone ? "text-ink" : "text-mute")}>
                          {stage.title}
                        </span>
                        {isCurrent ? (
                          <Badge variant="indigo" size="xs" dot pulse label="Active" />
                        ) : isDone ? (
                          <Badge variant="emerald" size="xs" label="Done" />
                        ) : (
                          <Badge variant="amber" size="xs" label="Pending" />
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-mute">
                        {stage.description}
                      </p>
                    </button>

                    {isOpen && clickable && (
                      <div className="mt-2 ml-1 px-4 py-3 rounded-xl bg-mist border border-line space-y-2">
                        {typeof stage.amount === "number" && (
                          <div className="font-mono text-sm text-ink">
                            ₹{stage.amount.toLocaleString("en-IN")}
                          </div>
                        )}
                        {stage.txHash && (
                          <div className="flex items-center gap-2">
                            <BlockchainBadge txHash={stage.txHash} variant="compact" />
                          </div>
                        )}
                        {stage.evidenceHash && (
                          <HashDisplay hash={stage.evidenceHash} type="sha256" label="Evidence" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress summary */}
        <div className="pt-2 border-t border-line">
          <ProgressBar
            current={currentStageIndex}
            total={stages.length - 1}
            label="Trace Progress"
            showPercentage
          />
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm">
              Download Trace PDF
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

export default DonationJourneyTrace;
