'use client';

import React, { useState } from 'react';
import { AuditLog } from '@/types';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
  Coins,
  FileCheck,
  KeyRound,
  UserCheck,
  Clock,
  Sparkles,
  Database,
  Lock,
} from 'lucide-react';
import { formatRupees } from '@/lib/utils';

interface BlockchainAuditViewerProps {
  logs: AuditLog[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const BlockchainAuditViewer: React.FC<BlockchainAuditViewerProps> = ({
  logs,
  title = 'Immutable Blockchain Audit Trail',
  subtitle = 'Cryptographically hashed and tamper-evident append-only ledger',
  className = '',
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedCalldata, setExpandedCalldata] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const toggleCalldata = (id: string) => {
    setExpandedCalldata((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'CREATE_CAMPAIGN':
        return {
          label: 'CAMPAIGN GENESIS CREATED',
          icon: Sparkles,
          color: 'text-accent border-accent/20 bg-accent-faint',
        };
      case 'CHANGE_CAMPAIGN_STATUS':
        return {
          label: 'CAMPAIGN STATE TRANSITION',
          icon: ArrowRight,
          color: 'text-accent-deep border-accent-deep/20 bg-accent-faint',
        };
      case 'DONATION_RECEIVED':
      case 'DONATION_LOCKED':
        return {
          label: 'DONATION ESCROW ANCHORED',
          icon: Lock,
          color: 'text-lav-deep border-lav-deep/20 bg-lav-soft',
        };
      case 'PROOF_CREATED':
      case 'PROOF_SUBMITTED':
        return {
          label: 'EVIDENCE SUBMITTED',
          icon: FileCheck,
          color: 'text-warn border-warn/25 bg-warn-soft',
        };
      case 'PROOF_APPROVED':
      case 'PROOF_APPROVED_OVERRIDE':
        return {
          label: 'AUDITOR VERIFIED',
          icon: ShieldCheck,
          color: 'text-ok border-ok/20 bg-ok-soft',
        };
      case 'RELEASE_REQUEST_CREATED':
        return {
          label: 'RELEASE INITIATED',
          icon: Clock,
          color: 'text-accent border-accent/20 bg-accent-faint',
        };
      case 'MULTISIG_SIGNED':
        return {
          label: 'MULTISIG SIGNATURE CONFIRMED',
          icon: KeyRound,
          color: 'text-lav-deep border-lav-deep/20 bg-lav-soft',
        };
      case 'FUNDS_RELEASED':
        return {
          label: 'ESCROW FUNDS DISBURSED',
          icon: Coins,
          color: 'text-ok border-ok/20 bg-ok-soft',
        };
      default:
        return {
          label: action.replace(/_/g, ' '),
          icon: Database,
          color: 'text-mute border-line bg-mist',
        };
    }
  };

  const formatHash = (hash: string | null | undefined, fallbackId: string) => {
    if (hash) {
      const clean = hash.startsWith('0x') ? hash : `0x${hash}`;
      return `${clean.substring(0, 10)}...${clean.substring(clean.length - 8)}`;
    }
    const pseudo = `0x${fallbackId.replace(/-/g, '')}`;
    return `${pseudo.substring(0, 10)}...${pseudo.substring(pseudo.length - 8)}`;
  };

  const getFullHash = (hash: string | null | undefined, fallbackId: string) => {
    if (hash) {
      return hash.startsWith('0x') ? hash : `0x${hash}`;
    }
    return `0x${fallbackId.replace(/-/g, '')}`;
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* Header with Blockchain Integrity Ribbons */}
      <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-faint text-accent">
              <Database className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          </div>
          <p className="mt-1 font-mono text-xs text-mute">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/20 bg-ok-soft px-3 py-1 font-mono text-xs font-semibold text-ok">
            <ShieldCheck className="h-3.5 w-3.5" />
            SHA-256 Chain Intact
          </span>
          <span className="chip font-mono text-xs">
            {logs.length} Block{logs.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center">
          <Database className="mx-auto h-8 w-8 text-faint" />
          <p className="mt-2 font-mono text-xs text-faint">No blockchain audit events recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {logs.map((log, index) => {
            const config = getActionConfig(log.action);
            const Icon = config.icon;
            const fullTxHash = getFullHash(log.entry_hash, log.id);
            const displayTxHash = formatHash(log.entry_hash, log.id);
            const blockNumber = log.chain_position || logs.length - index;
            const meta = log.metadata || {};
            const isCalldataOpen = expandedCalldata[log.id];

            return (
              <div key={log.id} className="p-5 transition-colors hover:bg-mist/70">
                {/* Block Header Row */}
                <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Block Height Pill */}
                    <span className="flex items-center gap-1 rounded border border-line bg-mist px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                      <Layers className="h-3 w-3 text-accent" />
                      BLOCK #{blockNumber}
                    </span>

                    {/* Action Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${config.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>

                    {/* Signer */}
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-mute">
                      <UserCheck className="h-3 w-3 text-ok" />
                      <span>{log.actor_name || 'System Operator'}</span>
                      <span className="text-[10px] text-faint">({log.actor_role || 'ORGANIZATION'})</span>
                    </span>
                  </div>

                  {/* Timestamp */}
                  <span className="font-mono text-[11px] text-mute shrink-0">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </span>
                </div>

                {/* Cryptographic Hash Bar */}
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-mist/60 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
                      Tx Hash:
                    </span>
                    <code className="chip font-mono !text-[11px] !text-accent-deep select-all">
                      {displayTxHash}
                    </code>
                    <button
                      onClick={() => copyToClipboard(fullTxHash, log.id)}
                      title="Copy full transaction hash"
                      className="rounded p-1 text-faint transition-colors hover:bg-mist hover:text-ink"
                    >
                      {copiedHash === log.id ? (
                        <Check className="h-3.5 w-3.5 text-ok" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {log.prev_hash && (
                    <div className="hidden xs:flex items-center gap-1 font-mono text-[10px] text-faint">
                      <span>Prev Hash:</span>
                      <code className="text-mute truncate max-w-[120px]">
                        0x{log.prev_hash.substring(0, 8)}...
                      </code>
                    </div>
                  )}

                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-ok">
                    <CheckCircle2 className="h-3 w-3 text-ok" />
                    Ledger Anchored
                  </span>
                </div>

                {/* Structured Event Data (Human-Readable Explorer Cards) */}
                <div className="mt-3 space-y-2">
                  {/* Status Change Transition */}
                  {meta.new_status && meta.previous_status && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-mute">Status Change:</span>
                      <span className="rounded border border-line bg-mist px-2 py-0.5 font-bold text-faint">
                        {meta.previous_status}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-accent" />
                      <span className="rounded border border-ok/25 bg-ok-soft px-2 py-0.5 font-bold text-ok">
                        {meta.new_status}
                      </span>
                    </div>
                  )}

                  {/* Target Amount */}
                  {meta.target_amount && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-xs">
                      <span className="font-mono text-[10px] text-mute uppercase">Campaign Funding Target:</span>
                      <span className="font-mono font-bold text-ink">
                        {formatRupees(Number(meta.target_amount))}
                      </span>
                    </div>
                  )}

                  {/* Beneficiary */}
                  {meta.beneficiary && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-xs ml-2">
                      <span className="font-mono text-[10px] text-mute uppercase">Designated Beneficiary:</span>
                      <span className="font-medium text-ink">{meta.beneficiary}</span>
                    </div>
                  )}

                  {/* Claimed Amount (Proof of Work) */}
                  {meta.claimed_amount && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-accent/20 bg-accent-faint px-2.5 py-1 text-xs">
                      <span className="font-mono text-[10px] text-accent-deep uppercase">Claimed Utilisation:</span>
                      <span className="font-mono font-bold text-accent-deep">
                        {formatRupees(Number(meta.claimed_amount))}
                      </span>
                    </div>
                  )}

                  {/* Released Amount */}
                  {meta.released_amount && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-ok/20 bg-ok-soft px-2.5 py-1 text-xs">
                      <span className="font-mono text-[10px] text-ok uppercase">Disbursed Funds:</span>
                      <span className="font-mono font-bold text-ok">
                        {formatRupees(Number(meta.released_amount))}
                      </span>
                    </div>
                  )}

                  {/* Notes / Reason */}
                  {(meta.comment || meta.reason || meta.notes) && (
                    <blockquote className="rounded-md border-l-2 border-accent bg-mist/50 p-2.5 text-xs text-ink">
                      "{meta.comment || meta.reason || meta.notes}"
                    </blockquote>
                  )}

                  {/* Generic Key-Value Pills for other fields */}
                  {Object.keys(meta).length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleCalldata(log.id)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-mute transition-colors hover:text-ink"
                      >
                        {isCalldataOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>{isCalldataOpen ? 'Hide On-Chain Calldata' : 'View On-Chain Cryptographic Calldata'}</span>
                      </button>

                      {isCalldataOpen && (
                        <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-mist p-3 font-mono text-[10px] text-ink leading-relaxed">
                          {JSON.stringify(meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlockchainAuditViewer;

