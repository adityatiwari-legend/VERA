"use client";

import React, { useState } from "react";
import {
  Lock,
  FileCheck2,
  Users2,
  Fingerprint,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function BentoGrid() {
  // Interactive OCR Discrepancy state
  const [ocrScenario, setOcrScenario] = useState<"clean" | "tampered">("clean");
  
  // Interactive Multi-sig State
  const [signatures, setSignatures] = useState<{ [key: string]: boolean }>({
    auditor1: true,
    auditor2: true,
    auditor3: false,
  });

  const toggleSig = (key: string) => {
    setSignatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalSigs = Object.values(signatures).filter(Boolean).length;
  const isThresholdMet = totalSigs >= 2;

  return (
    <section id="protocol-bento" className="py-20 bg-[#09090B] border-b border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs text-[#00F59B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
              <span>CORE PROTOCOL ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Deterministic accountability. Zero trust required.
            </h2>
          </div>
          <div className="font-mono text-xs text-zinc-500 max-w-sm leading-relaxed">
            Eliminating blind donations through smart contract milestone covenants, automated OCR verification, and distributed multi-sig sign-offs.
          </div>
        </div>

        {/* Bento Grid: 1px continuous borders, zero pillowy curves */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Bento Card 1: 01 / EARMARK (Col-span 7) */}
          <div className="md:col-span-7 bg-[#0E0E12] border border-white/[0.08] p-6 lg:p-8 flex flex-col justify-between crosshair-corner group hover:border-white/[0.16] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-[#00F59B] tracking-wider uppercase flex items-center gap-2">
                  <span className="text-zinc-600">01 /</span>
                  <span>EARMARK</span>
                </div>
                <div className="p-2 bg-[#141418] border border-white/[0.08] text-zinc-300">
                  <Lock className="w-4 h-4 text-[#00F59B]" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-white">
                Cryptographic Donor Allocation
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed">
                When capital is pledged, funds are strictly bound to a designated milestone escrow contract. The recipient NGO cannot divert funds to unapproved overheads or pool capital into opaque general funds.
              </p>

              {/* Interactive Visual Allocation Pipe */}
              <div className="p-4 bg-[#121216] border border-white/[0.06] rounded-none font-mono text-xs space-y-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex justify-between">
                  <span>ESCROW BINDING PIPELINE</span>
                  <span className="text-[#00F59B]">STATE: LOCKED</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 bg-black/50 border border-white/[0.08]">
                    <div className="text-zinc-500 text-[9px]">DONOR PLEDGE</div>
                    <div className="text-white font-bold">₹5,00,000</div>
                    <div className="text-[8px] text-zinc-600">TX: 0x81b...</div>
                  </div>
                  <div className="p-2 bg-[#00F59B]/10 border border-[#00F59B]/30 flex flex-col justify-center">
                    <div className="text-[#00F59B] text-[9px] font-semibold">VERA ESCROW</div>
                    <div className="text-[#00F59B] font-bold">SHA-256 VAULT</div>
                    <div className="text-[8px] text-[#00F59B]/80">IMMUTABLE</div>
                  </div>
                  <div className="p-2 bg-black/50 border border-white/[0.08]">
                    <div className="text-zinc-500 text-[9px]">MILESTONE #02</div>
                    <div className="text-white font-bold">SCHOOL LAB</div>
                    <div className="text-[8px] text-zinc-600">CONDITION PRECEDENT</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                  <span>TRANSFER RESTRICTION:</span>
                  <span className="text-white">HARD FORBIDDEN WITHOUT SIGNED AUDIT</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px] text-zinc-500">
              <span>ALGORITHM: NON-REALLOCATABLE SMART COVENANT</span>
              <span className="text-[#00F59B] group-hover:translate-x-1 transition-transform">EXPLORE SPEC →</span>
            </div>
          </div>

          {/* Bento Card 2: 02 / PROOF with Interactive OCR Discrepancy Inspector (Col-span 5) */}
          <div className="md:col-span-5 bg-[#0E0E12] border border-white/[0.08] p-6 lg:p-8 flex flex-col justify-between crosshair-corner group hover:border-white/[0.16] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-[#00F59B] tracking-wider uppercase flex items-center gap-2">
                  <span className="text-zinc-600">02 /</span>
                  <span>PROOF</span>
                </div>
                <div className="p-2 bg-[#141418] border border-white/[0.08] text-zinc-300">
                  <FileCheck2 className="w-4 h-4 text-[#00F59B]" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-white">
                SHA-256 Evidence & AI OCR Checks
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Invoices, bills of quantity, and geo-tagged site photographs are hashed into the blockchain. Our AI OCR cross-checks contractor submissions against vendor invoices to detect discrepancies instantly.
              </p>

              {/* Interactive OCR Demo Box */}
              <div className="p-4 bg-[#121216] border border-white/[0.06] rounded-none font-mono space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    TEST OCR ENGINE
                  </span>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setOcrScenario("clean")}
                      className={`px-2 py-0.5 ${
                        ocrScenario === "clean"
                          ? "bg-[#00F59B] text-black font-semibold"
                          : "bg-white/[0.04] text-zinc-400"
                      }`}
                    >
                      MATCH 0%
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrScenario("tampered")}
                      className={`px-2 py-0.5 ${
                        ocrScenario === "tampered"
                          ? "bg-[#EF4444] text-white font-semibold"
                          : "bg-white/[0.04] text-zinc-400"
                      }`}
                    >
                      TAMPERED +18%
                    </button>
                  </div>
                </div>

                {ocrScenario === "clean" ? (
                  <div className="p-2.5 bg-black/60 border border-[#00F59B]/30 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-300 text-[11px]">
                      <span>CLAIMED INVOICE:</span>
                      <span className="font-semibold text-white">₹1,45,000</span>
                    </div>
                    <div className="flex justify-between text-zinc-300 text-[11px]">
                      <span>AI OCR PARSED:</span>
                      <span className="font-semibold text-white">₹1,45,000</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[11px] text-[#00F59B]">
                      <span className="flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        DISCREPANCY 0.00%
                      </span>
                      <span>EVIDENCE PASS</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-black/60 border border-[#EF4444]/40 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-300 text-[11px]">
                      <span>CLAIMED INVOICE:</span>
                      <span className="font-semibold text-white">₹1,45,000</span>
                    </div>
                    <div className="flex justify-between text-zinc-300 text-[11px]">
                      <span>AI OCR PARSED:</span>
                      <span className="font-semibold text-[#EF4444]">₹1,18,500 (VENDOR TOTAL)</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[11px] text-[#EF4444]">
                      <span className="flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        DISCREPANCY +18.28%
                      </span>
                      <span>TRANCHE BLOCKED</span>
                    </div>
                  </div>
                )}

                <div className="text-[9px] text-zinc-500 flex items-center justify-between">
                  <span>EVIDENCE HASH:</span>
                  <span className="text-zinc-300 font-mono">e3b0c44298fc...</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.06] font-mono text-[11px] text-zinc-500 flex items-center justify-between">
              <span>ZERO INFLATION VETTING</span>
              <span className="text-[#00F59B]">AI AUDIT ACTIVE</span>
            </div>
          </div>

          {/* Bento Card 3: 03 / RELEASE with Interactive Multi-sig (Col-span 6) */}
          <div className="md:col-span-6 bg-[#0E0E12] border border-white/[0.08] p-6 lg:p-8 flex flex-col justify-between crosshair-corner group hover:border-white/[0.16] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-[#00F59B] tracking-wider uppercase flex items-center gap-2">
                  <span className="text-zinc-600">03 /</span>
                  <span>RELEASE</span>
                </div>
                <div className="p-2 bg-[#141418] border border-white/[0.08] text-zinc-300">
                  <Users2 className="w-4 h-4 text-[#00F59B]" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-white">
                Multi-Sig Auditor Quorum
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Smart contracts require an M-of-N consensus from certified civil inspectors, AI validation oracles, and municipal representatives before a single rupee leaves escrow.
              </p>

              {/* Interactive Signer Dashboard */}
              <div className="p-4 bg-[#121216] border border-white/[0.06] rounded-none font-mono text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>M-OF-N SIGNATURE THRESHOLD: 2/3 REQUIRED</span>
                  <span className={isThresholdMet ? "text-[#00F59B] font-bold" : "text-amber-400 font-bold"}>
                    {totalSigs}/3 SIGNED
                  </span>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSig("auditor1")}
                    className="w-full flex items-center justify-between p-2 bg-black/40 border border-white/[0.06] hover:border-white/[0.2] transition-colors text-left"
                  >
                    <span className="text-zinc-300 text-[11px]">Site Inspector (Civil Engineer)</span>
                    <span className={signatures.auditor1 ? "text-[#00F59B] text-[10px]" : "text-zinc-600 text-[10px]"}>
                      {signatures.auditor1 ? "● SIGNED [0x882A]" : "○ UNSIGNED"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSig("auditor2")}
                    className="w-full flex items-center justify-between p-2 bg-black/40 border border-white/[0.06] hover:border-white/[0.2] transition-colors text-left"
                  >
                    <span className="text-zinc-300 text-[11px]">AI Oracle (Discrepancy Validator)</span>
                    <span className={signatures.auditor2 ? "text-[#00F59B] text-[10px]" : "text-zinc-600 text-[10px]"}>
                      {signatures.auditor2 ? "● VERIFIED [0x11B4]" : "○ UNSIGNED"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSig("auditor3")}
                    className="w-full flex items-center justify-between p-2 bg-black/40 border border-white/[0.06] hover:border-white/[0.2] transition-colors text-left"
                  >
                    <span className="text-zinc-300 text-[11px]">Municipal Community Auditor</span>
                    <span className={signatures.auditor3 ? "text-[#00F59B] text-[10px]" : "text-zinc-600 text-[10px]"}>
                      {signatures.auditor3 ? "● SIGNED [0x99FF]" : "○ CLICK TO SIGN"}
                    </span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">SMART CONTRACT STATUS:</span>
                  <span className={isThresholdMet ? "text-[#00F59B] font-bold" : "text-amber-400 font-bold"}>
                    {isThresholdMet ? "EXECUTION UNLOCKED" : "HOLDING IN ESCROW"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.06] font-mono text-[11px] text-zinc-500 flex items-center justify-between">
              <span>CONSENSUS ENGINE: ED25519 MULTI-PARTY</span>
              <span className="text-[#00F59B]">ACTIVE</span>
            </div>
          </div>

          {/* Bento Card 4: 04 / AUDIT TRAIL with Merkle Tree Verification (Col-span 6) */}
          <div className="md:col-span-6 bg-[#0E0E12] border border-white/[0.08] p-6 lg:p-8 flex flex-col justify-between crosshair-corner group hover:border-white/[0.16] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-[#00F59B] tracking-wider uppercase flex items-center gap-2">
                  <span className="text-zinc-600">04 /</span>
                  <span>INTEGRITY</span>
                </div>
                <div className="p-2 bg-[#141418] border border-white/[0.08] text-zinc-300">
                  <Fingerprint className="w-4 h-4 text-[#00F59B]" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-white">
                Public Merkle Audit Trails
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Every rupee movement, photo upload, and OCR scan is committed to an immutable Merkle tree. Any citizen or donor can independently verify proof without trusting a central database.
              </p>

              {/* Merkle Visual Tree */}
              <div className="p-4 bg-[#121216] border border-white/[0.06] rounded-none font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>ROOT HASH // LATEST EPOCH</span>
                  <span className="text-[#00F59B]">BLOCK 194,821</span>
                </div>

                <div className="bg-black/50 p-2.5 border border-white/[0.06] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-500">MERKLE ROOT:</span>
                    <span className="text-white font-mono text-[10px]">0x7F9A...C4D5</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-1.5 bg-[#16161C] border border-white/[0.05] text-zinc-400">
                      <span>LEAF_L: INVOICE_SHA</span>
                      <div className="text-zinc-200">0xe3b0...98fc</div>
                    </div>
                    <div className="p-1.5 bg-[#16161C] border border-white/[0.05] text-zinc-400">
                      <span>LEAF_R: GPS_GEOTAG</span>
                      <div className="text-zinc-200">22.25°N, 73.18°E</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>ZERO-KNOWLEDGE VERIFIABILITY:</span>
                  <span className="text-[#00F59B]">O(1) CONSTANT TIME PROOF</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.06] font-mono text-[11px] text-zinc-500 flex items-center justify-between">
              <span>ZERO-DRIFT PROTOCOL</span>
              <span className="text-[#00F59B]">PUBLIC LEDGER →</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
