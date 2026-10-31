"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FileCheck, ImageIcon, FileText, Calculator, ShieldCheck, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BlockchainBadge } from "./BlockchainBadge";
import { HashDisplay } from "@/components/financial/HashDisplay";

/**
 * ProofEvidenceInspectorModal — design-system.md (Modal uses Surface)
 * Examine evidence files, SHA-256 hashes, and AI discrepancy screening.
 */

export interface OcrLineItem {
  vendor: string;
  date: string;
  invoiceNo: string;
  amount: number;
}

export interface ProofEvidenceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: {
    title: string;
    sha256: string;
    txHash: string;
    network?: "Hardhat" | "Sepolia" | "Mainnet";
    claimedAmount: number;
    invoiceAmount: number;
    ocrConfidence: number;
    lineItems: OcrLineItem[];
    auditorNotes?: string;
    verifiedAt?: string;
  };
}

export function ProofEvidenceInspectorModal({
  isOpen,
  onClose,
  evidence,
}: ProofEvidenceInspectorModalProps) {
  const mathValid = evidence.claimedAmount === evidence.invoiceAmount;
  const mathDelta = Math.abs(evidence.claimedAmount - evidence.invoiceAmount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={evidence.title}
      description="Cryptographic evidence inspection · SHA-256 anchored"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="md" leftIcon={<ShieldCheck className="h-4 w-4" />}>
            Mark Verified
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Hash + chain */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
              SHA-256 Evidence Hash
            </div>
            <HashDisplay hash={evidence.sha256} type="sha256" className="!text-sm" />
          </div>
          <BlockchainBadge
            network={evidence.network ?? "Sepolia"}
            txHash={evidence.txHash}
            confirmed
          />
        </div>

        {/* Preview placeholder */}
        <div className="flex h-40 items-center justify-center rounded-xl border border-line bg-mist text-faint">
          <div className="flex flex-col items-center gap-2">
            {evidence.title.match(/\.pdf$/i) ? (
              <FileText className="h-8 w-8" />
            ) : (
              <ImageIcon className="h-8 w-8" />
            )}
            <span className="font-mono text-xs">RECEIPT PREVIEW</span>
          </div>
        </div>

        {/* Discrepancy comparison */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
            mathValid
              ? "border-ok/20 bg-ok-soft"
              : "border-bad/20 bg-bad-soft"
          )}
        >
          <div className="flex items-center gap-2">
            {mathValid ? (
              <ShieldCheck className="h-5 w-5 text-ok" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-bad" />
            )}
            <span className="font-mono text-xs text-ink">Math Validation</span>
          </div>
          <div className="font-mono text-sm">
            <span className="text-mute">Claimed ₹{evidence.claimedAmount.toLocaleString("en-IN")}</span>
            <span className="mx-2 text-faint">vs</span>
            <span className="text-ink">Invoice ₹{evidence.invoiceAmount.toLocaleString("en-IN")}</span>
          </div>
          <Badge
            variant={mathValid ? "emerald" : "rose"}
            size="sm"
            icon={<Calculator className="h-3 w-3" />}
            label={mathValid ? "Validated" : `Δ ₹${mathDelta.toLocaleString("en-IN")}`}
          />
        </div>

        {/* OCR line items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-ink">OCR Line-Item Extraction</h4>
            <Badge variant="indigo" size="xs" label={`Confidence ${evidence.ocrConfidence}%`} />
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-mist uppercase text-[10px] tracking-wider text-mute">
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Invoice No</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {evidence.lineItems.map((item, i) => (
                  <tr key={i} className="bg-white hover:bg-accent-faint/60">
                    <td className="px-3 py-2.5 text-ink">{item.vendor}</td>
                    <td className="px-3 py-2.5 text-mute">{item.date}</td>
                    <td className="px-3 py-2.5 text-mute">{item.invoiceNo}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor notes */}
        {evidence.auditorNotes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-accent" />
              <h4 className="text-sm font-semibold text-ink">Auditor Notes</h4>
            </div>
            <p className="border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-mute">
              {evidence.auditorNotes}
            </p>
            {evidence.verifiedAt && (
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Verified at {evidence.verifiedAt}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ProofEvidenceInspectorModal;
