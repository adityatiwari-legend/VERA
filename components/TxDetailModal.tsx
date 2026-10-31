"use client";

import React, { useState } from "react";
import { X, Copy, Check, FileCode, ShieldCheck, ShieldAlert } from "lucide-react";
import { AuditTransaction } from "@/lib/types";

interface TxDetailModalProps {
  tx: AuditTransaction | null;
  onClose: () => void;
}

export default function TxDetailModal({ tx, onClose }: TxDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!tx) return null;

  const handleCopy = (text: string, type: "hash" | "payload") => {
    navigator.clipboard.writeText(text);
    if (type === "hash") {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  const rawJson = JSON.stringify(
    {
      txId: tx.id,
      campaign: tx.campaign,
      milestone: tx.milestone,
      amountInr: tx.amount,
      ledgerType: tx.type,
      txHash: tx.txHash,
      evidenceBundle: {
        algorithm: "SHA-256",
        hash: tx.evidenceHash,
        aiOcrDiscrepancy: tx.ocrDiscrepancy,
      },
      ngo: tx.ngoName,
      recordedAt: tx.timestamp,
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6 shadow-lift">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-faint text-accent">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Ledger entry inspector</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">{tx.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mute transition-colors hover:bg-mist hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 py-5">
          {/* Main info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-mist p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">Campaign</div>
              <div className="truncate text-sm font-semibold text-ink">{tx.campaign}</div>
              <div className="mt-0.5 truncate text-[11px] text-mute">{tx.milestone}</div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
                {tx.status === "ESCROW_LOCKED" ? "Amount locked" : "Amount"}
              </div>
              <div className="font-mono text-sm font-bold text-ink">
                {tx.currency}
                {tx.amount.toLocaleString("en-IN")}
              </div>
              <div className="mt-0.5 text-[11px] text-mute">
                {tx.type} · recorded {new Date(tx.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Hashes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-mute">
              <span>Transaction hash</span>
              {tx.txHash && (
                <button
                  type="button"
                  onClick={() => handleCopy(tx.txHash!, "hash")}
                  className="flex items-center gap-1 text-mute transition-colors hover:text-accent"
                >
                  {copiedHash ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedHash ? "COPIED" : "COPY"}</span>
                </button>
              )}
            </div>
            <div className="break-all rounded-lg border border-line bg-mist px-3 py-2.5 font-mono text-xs text-ink">
              {tx.txHash || (
                <span className="text-mute">Not anchored on-chain yet — recorded in the off-chain ledger first.</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-mute">
              <span>SHA-256 evidence hash</span>
              {tx.evidenceHash && (
                <button
                  type="button"
                  onClick={() => handleCopy(tx.evidenceHash!, "payload")}
                  className="flex items-center gap-1 text-mute transition-colors hover:text-accent"
                >
                  {copiedPayload ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPayload ? "COPIED" : "COPY"}</span>
                </button>
              )}
            </div>
            <div className="break-all rounded-lg border border-accent/20 bg-accent-faint px-3 py-2.5 font-mono text-xs text-accent-deep">
              {tx.evidenceHash || <span className="text-mute">No evidence bundle is linked to this entry.</span>}
            </div>
          </div>

          {/* AI verification */}
          <div className="rounded-lg border border-line p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mute">AI OCR VARIANCE</div>
            {tx.ocrDiscrepancy === null ? (
              <div className="mt-1 text-xs text-mute">No AI verification was run for this entry.</div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className={`font-mono text-sm font-bold ${tx.ocrDiscrepancy <= 0.5 ? "text-ok" : "text-warn"}`}>
                  {tx.ocrDiscrepancy.toFixed(2)}%
                </span>
                <span className="text-[11px] text-mute">
                  {tx.ocrDiscrepancy <= 0.5 ? "within the 0.5% pass threshold" : "above the 0.5% pass threshold"}
                </span>
              </div>
            )}
          </div>

          {/* Raw payload */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-mute">
              <FileCode className="h-3.5 w-3.5" />
              Raw ledger payload (JSON)
            </div>
            <pre className="max-h-36 overflow-x-auto rounded-lg border border-line bg-night p-3 font-mono text-[10px] leading-relaxed text-night-mute">
              {rawJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-mute">
            <ShieldAlert className="h-3.5 w-3.5 text-accent" />
            <span>Verifiable against the hash-chained audit log at any time</span>
          </div>
          <button type="button" onClick={onClose} className="btn-primary !px-4 !py-1.5 !text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
