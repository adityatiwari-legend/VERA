"use client";

import React, { useState } from "react";
import { X, ShieldCheck, CheckCircle2, Lock, Terminal, Cpu } from "lucide-react";

interface AuditorWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditorWalletModal({ isOpen, onClose }: AuditorWalletModalProps) {
  const [selectedRole, setSelectedRole] = useState<"auditor" | "contractor" | "donor">("auditor");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setActiveAddress("Local demo signer session (no on-chain address bound)");
    }, 1100);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setActiveAddress(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <div className="card relative w-full max-w-lg p-6 shadow-lift">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-ink font-semibold tracking-wider uppercase">AUDITOR KEYSTORE ACCESS</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close keystore access modal"
            className="p-1 text-mute hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-4">
          <p className="text-xs text-mute leading-relaxed">
            Connect an authorized cryptographic multi-sig signer to review milestone proofs, inspect SHA-256 evidence bundles, and release locked escrow tranches.
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-mist p-1 font-mono text-[11px]">
            {(["auditor", "contractor", "donor"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`py-1.5 rounded-md uppercase transition-colors ${
                  selectedRole === role
                    ? "bg-white text-ink font-semibold shadow-sm"
                    : "text-mute hover:text-ink"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {!isConnected ? (
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnect()}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-faint/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-mist text-accent">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-ink font-medium">
                      HARDWARE SIGNER (HSM / YUBIKEY)
                    </div>
                    <div className="text-[10px] text-faint">FIPS 140-2 Level 3 Secure Enclave</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold text-accent">RECOMMENDED</span>
              </button>

              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnect()}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-faint/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-mist text-warn">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-ink font-medium">
                      WEB3 SIGNER (METAMASK / RABBY)
                    </div>
                    <div className="text-[10px] text-faint">Browser Extension Multi-sig</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-mute">WEB3</span>
              </button>

              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnect()}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-faint/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-mist text-accent-deep">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-ink font-medium">
                      LOCAL AUDITOR DEMO KEY
                    </div>
                    <div className="text-[10px] text-faint">Ephemeral Ed25519 Sandbox Identity</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold text-accent">1-CLICK</span>
              </button>

              {isConnecting && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-accent/25 bg-accent-faint p-3 font-mono text-xs text-accent-deep">
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>NEGOTIATING CRYPTOGRAPHIC HANDSHAKE...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-ok/25 bg-ok-soft p-3 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs text-ok">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    AUTHENTICATED AUDITOR
                  </span>
                  <span className="text-[10px] uppercase">PERMISSION: LEVEL 4</span>
                </div>
                <div className="break-all rounded-md border border-line bg-white p-2 font-mono text-xs text-ink">
                  {activeAddress}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-mist/60 p-3 font-mono text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-mute uppercase tracking-wider">ESCROWS UNDER REVIEW:</span>
                  <span className="text-ink font-semibold">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute uppercase tracking-wider">PENDING TRANCHES:</span>
                  <span className="text-ink font-semibold">—</span>
                </div>
                <p className="pt-1 text-[10px] text-faint">
                  Live escrow figures load in the auditor dashboard once a signer session is active.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="btn-secondary flex-1 !py-2 !text-xs font-mono uppercase"
                >
                  DISCONNECT
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary flex-1 !py-2 !text-xs font-mono uppercase"
                >
                  PROCEED TO AUDIT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] text-faint">
          <span>VERA PROTOCOL V2.4</span>
          <span>MULTI-SIG ENCLAVE ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
