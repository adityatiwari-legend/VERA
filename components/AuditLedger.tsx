"use client";

import React, { useState, useEffect } from "react";
import { Search, Eye, ShieldCheck, ShieldAlert, Inbox } from "lucide-react";
import { AuditTransaction } from "@/lib/types";
import TxDetailModal from "./TxDetailModal";

const FILTERS = ["ALL", "RELEASED", "ESCROW_LOCKED", "RECORDED", "REFUNDED"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLES: Record<string, string> = {
  RELEASED: "bg-ok-soft text-ok border-ok/20",
  ESCROW_LOCKED: "bg-lav-soft text-lav-deep border-lav-deep/20",
  RECORDED: "bg-accent-faint text-accent-deep border-accent/20",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AuditLedger() {
  const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
  const [integrityValid, setIntegrityValid] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [selectedTx, setSelectedTx] = useState<AuditTransaction | null>(null);

  // Real ledger entries from the backend — no simulated stream.
  useEffect(() => {
    fetch('/api/audit/ledger')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
        if (data?.integrity && typeof data.integrity.valid === 'boolean') {
          setIntegrityValid(data.integrity.valid);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.txHash || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "ALL") return matchesSearch;
    return matchesSearch && tx.status === activeFilter;
  });

  return (
    <section id="audit-ledger" className="relative">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <span className="eyebrow">Public ledger</span>
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Recorded fund movements
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {integrityValid === true && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/20 bg-ok-soft px-3 py-1 font-mono text-[11px] font-medium text-ok">
              <ShieldCheck className="h-3.5 w-3.5" />
              HASH CHAIN VALID
            </span>
          )}
          {integrityValid === false && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/20 bg-bad-soft px-3 py-1 font-mono text-[11px] font-medium text-bad">
              <ShieldAlert className="h-3.5 w-3.5" />
              CHAIN CHECK FAILED
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Filter by campaign, TX, or hash…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input !py-2 !pl-9 !text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                activeFilter === filter
                  ? "border-accent/25 bg-accent-faint font-semibold text-accent-deep"
                  : "border-line bg-white text-mute hover:border-line-strong hover:text-ink"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger table */}
      <div className="card overflow-hidden">
        {loaded && filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox className="h-7 w-7 text-faint" />
            <h3 className="text-sm font-semibold text-ink">
              {transactions.length === 0 ? "No fund movements recorded yet" : "No entries match this filter"}
            </h3>
            <p className="max-w-sm text-xs text-mute">
              {transactions.length === 0
                ? "Donations, escrow locks and releases will appear here the moment they are recorded on the ledger."
                : "Try a different search term or status filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Campaign &amp; tranche</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">TX hash</th>
                  <th className="px-4 py-3 text-right font-medium">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {!loaded
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="vera-skeleton h-5 w-full rounded" />
                        </td>
                      </tr>
                    ))
                  : filteredTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="cursor-pointer bg-white transition-colors hover:bg-accent-faint/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="font-medium text-ink">{formatTime(tx.timestamp)}</span>
                          <div className="font-mono text-[10px] text-faint">{tx.id}</div>
                        </td>

                        <td className="max-w-xs px-4 py-3.5 sm:max-w-md">
                          <div className="truncate font-medium text-ink">{tx.campaign}</div>
                          <div className="truncate text-[11px] text-mute">{tx.milestone}</div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold text-ink">
                          {tx.currency}
                          {tx.amount.toLocaleString("en-IN")}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
                              STATUS_STYLES[tx.status] || "border-line bg-mist text-mute"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {tx.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="hidden whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-mute md:table-cell">
                          {tx.txHash
                            ? `${tx.txHash.substring(0, 10)}…${tx.txHash.substring(tx.txHash.length - 6)}`
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 font-mono text-[10px] uppercase text-mute transition-colors hover:border-accent/40 hover:text-accent"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer strip */}
      <div className="mt-3 flex flex-col items-center justify-between px-1 font-mono text-[11px] text-faint sm:flex-row">
        <div>SHOWING {filteredTransactions.length} LEDGER ENTRIES</div>
        <div>EVERY ENTRY IS CHAINED BY SHA-256 — DELETES ARE BLOCKED AT THE DATABASE</div>
      </div>

      {/* Inspector modal */}
      <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </section>
  );
}
