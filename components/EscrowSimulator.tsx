"use client";

import React, { useState } from "react";
import {
  Lock,
  UploadCloud,
  Cpu,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Coins,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function EscrowSimulator() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fraudSimulation, setFraudSimulation] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Trigger next step
  const handleNextStep = () => {
    if (currentStep < 5) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const next = currentStep + 1;
        setCurrentStep(next);

        // If reaching final release step without fraud, trigger celebratory confetti
        if (next === 5 && !fraudSimulation) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#00F59B", "#FFFFFF", "#10B981"],
          });
        }
      }, 600);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFraudSimulation(false);
  };

  return (
    <section id="escrow-simulator" className="py-20 bg-[#0C0C0E] border-b border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs text-[#00F59B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
              <span>INTERACTIVE PROTOCOL SANDBOX</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Simulate a Milestone Escrow Lifecycle
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFraudSimulation((prev) => !prev);
                setCurrentStep(1);
              }}
              className={`px-3 py-1.5 font-mono text-xs border transition-all ${
                fraudSimulation
                  ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                  : "bg-white/[0.04] border-white/[0.1] text-zinc-400 hover:text-white"
              }`}
            >
              {fraudSimulation ? "SIMULATING FRAUD ATTEMPT" : "TEST FRAUD ATTEMPT"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Indicator Progression */}
        <div className="grid grid-cols-5 gap-2 mb-8 font-mono text-[11px]">
          {[
            { num: 1, title: "LOCK FUNDS", icon: Lock },
            { num: 2, title: "SUBMIT PROOF", icon: UploadCloud },
            { num: 3, title: "AI OCR SCAN", icon: Cpu },
            { num: 4, title: "AUDITOR SIGN", icon: KeyRound },
            { num: 5, title: "RELEASE TRANCHE", icon: Coins },
          ].map((item) => {
            const Icon = item.icon;
            const isCompleted = currentStep > item.num;
            const isCurrent = currentStep === item.num;

            return (
              <div
                key={item.num}
                className={`p-3 border transition-all ${
                  isCurrent
                    ? "bg-[#14141A] border-[#00F59B] text-white"
                    : isCompleted
                    ? "bg-[#101014] border-white/[0.16] text-[#00F59B]"
                    : "bg-[#0A0A0C] border-white/[0.05] text-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500">0{item.num}</span>
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-[#00F59B]" : ""}`} />
                </div>
                <div className="font-semibold tracking-wider text-[10px] truncate">
                  {item.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Simulation Sandbox Frame */}
        <div className="bg-[#0E0E12] border border-white/[0.1] p-6 sm:p-10 crosshair-corner relative">
          {/* Active Step Panel */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F59B] uppercase">
                  STEP 01 // CAPITAL PLEDGE & MILESTONE ALLOCATION
                </span>
                <span className="font-mono text-[10px] text-zinc-500">ESCROW_INIT_0x992</span>
              </div>

              <div className="max-w-2xl space-y-3">
                <h3 className="text-2xl text-white font-normal">
                  Locking ₹2,50,000 into Milestone #02 Vault
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The donor commits capital to the &quot;Rural High School Smart Lab&quot; initiative. VERA takes custody in an immutable programmatic escrow contract. The capital cannot be reclaimed or diverted without trigger conditions.
                </p>
              </div>

              <div className="p-4 bg-black/60 border border-white/[0.08] font-mono text-xs space-y-2 max-w-xl">
                <div className="flex justify-between text-zinc-400">
                  <span>CAMPAIGN:</span>
                  <span className="text-white">Govt High School Smart STEM Lab #42</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>MILESTONE:</span>
                  <span className="text-white">Tranche 2: 25 Workstations & Power Inverters</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>LOCKED CAPITAL:</span>
                  <span className="text-[#00F59B] font-bold">₹2,50,000.00</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isProcessing}
                className="px-6 py-3 bg-[#00F59B] hover:bg-[#00F59B]/90 text-black font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
              >
                <span>{isProcessing ? "INITIALIZING ESCROW..." : "LOCK FUNDS & PROCEED TO EVIDENCE"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F59B] uppercase">
                  STEP 02 // CONTRACTOR PHYSICAL PROOF SUBMISSION
                </span>
                <span className="font-mono text-[10px] text-zinc-500">EVIDENCE_ANCHOR</span>
              </div>

              <div className="max-w-2xl space-y-3">
                <h3 className="text-2xl text-white font-normal">
                  Contractor Submits Invoices & Geo-Tagged Photographs
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Work on site is finished. The civil contractor uploads vendor GST invoices, delivery challans, and 4k site photos embedded with GPS coordinates and timestamps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl font-mono text-xs">
                <div className="p-3 bg-black/50 border border-white/[0.08] space-y-2">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold text-[11px]">
                    <FileCheck className="w-4 h-4 text-[#00F59B]" />
                    <span>TAX_INVOICE_GST_8829.PDF</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    <div>Vendor: Dell Compute India Pvt Ltd</div>
                    <div>Claimed Amount: ₹2,50,000</div>
                    <div>Items: 25x Ryzen 5 Terminals</div>
                  </div>
                </div>

                <div className="p-3 bg-black/50 border border-white/[0.08] space-y-2">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                    <span>GPS_GEOTAGGED_PHOTOS.RAW</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    <div>Coordinates: 12.9716° N, 77.5946° E</div>
                    <div>Timestamp: 2026-09-11 09:30 UTC</div>
                    <div>EXIF Authenticated: Yes</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isProcessing}
                className="px-6 py-3 bg-[#00F59B] hover:bg-[#00F59B]/90 text-black font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
              >
                <span>{isProcessing ? "ANCHORING TO SHA-256..." : "ANCHOR PROOF & RUN AI OCR"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F59B] uppercase">
                  STEP 03 // AUTOMATED AI OCR DISCREPANCY AUDIT
                </span>
                <span className="font-mono text-[10px] text-zinc-500">OCR_ENGINE_V3</span>
              </div>

              <div className="max-w-2xl space-y-3">
                <h3 className="text-2xl text-white font-normal">
                  Computer Vision Audits Line Items & Signatures
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The automated AI OCR engine extracts line items, compares vendor rates with market benchmarks, and cross-verifies against the approved milestone budget.
                </p>
              </div>

              {fraudSimulation ? (
                <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 font-mono text-xs space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 text-[#EF4444] font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>FRAUD DETECTED // INVOICE INFLATION (+28.4%)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Vendor invoice totals ₹1,94,600, but contractor claimed ₹2,50,000 in escrow release. OCR detected invoice digital tampering.
                  </p>
                  <div className="text-[10px] text-[#EF4444]">
                    TRANCHE HARD LOCKED // FRAUD REPORT LOGGED TO MAINNET
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#00F59B]/10 border border-[#00F59B]/30 font-mono text-xs space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 text-[#00F59B] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ZERO DISCREPANCY CONFIRMED (0.00% VARIANCE)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    All 25 line items, serial numbers, and tax calculations match the vendor purchase order. SHA-256 evidence bundle verified.
                  </p>
                  <div className="text-[10px] text-zinc-400">
                    SHA-256: 0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!fraudSimulation ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-[#00F59B] hover:bg-[#00F59B]/90 text-black font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
                  >
                    <span>{isProcessing ? "TRANSMITTING TO AUDITOR..." : "NOTIFY AUDITOR MULTI-SIG"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
                  >
                    <span>RESET SIMULATION</span>
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F59B] uppercase">
                  STEP 04 // MULTI-SIG AUDITOR SIGN-OFF
                </span>
                <span className="font-mono text-[10px] text-zinc-500">QUORUM: 2/3 REQUIRED</span>
              </div>

              <div className="max-w-2xl space-y-3">
                <h3 className="text-2xl text-white font-normal">
                  Auditor Quorum Signs Cryptographic Release
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Independent certified civil auditors review the SHA-256 photo hash and AI OCR verification report. Signing with their private keys unlocks the smart contract execution gate.
                </p>
              </div>

              <div className="space-y-2 max-w-xl font-mono text-xs">
                <div className="p-3 bg-black/50 border border-white/[0.08] flex items-center justify-between">
                  <span className="text-zinc-300">Site Inspector (Key: 0x892a...981c)</span>
                  <span className="text-[#00F59B] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SIGNED [2026-09-11 09:41]
                  </span>
                </div>
                <div className="p-3 bg-black/50 border border-white/[0.08] flex items-center justify-between">
                  <span className="text-zinc-300">AI Oracle Oracle Signer (Key: 0x11ab...67de)</span>
                  <span className="text-[#00F59B] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    AUTONOMOUS SIGNATURE ATTESTED
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isProcessing}
                className="px-6 py-3 bg-[#00F59B] hover:bg-[#00F59B]/90 text-black font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
              >
                <span>{isProcessing ? "EXECUTING SMART CONTRACT..." : "EXECUTE SMART CONTRACT RELEASE"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F59B] uppercase">
                  STEP 05 // CAPITAL RELEASED & IMMUTABLY MINTED
                </span>
                <span className="font-mono text-[10px] text-[#00F59B]">SUCCESS // LEDGER MINTED</span>
              </div>

              <div className="max-w-2xl space-y-3">
                <h3 className="text-2xl text-white font-normal flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#00F59B]" />
                  ₹2,50,000 Transferred to Verified Beneficiary
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The milestone is finalized! Funds move directly into the vendor settlement account. A public, tamper-evident audit receipt is permanently stamped on the ledger for all donors to see.
                </p>
              </div>

              <div className="p-4 bg-black/70 border border-[#00F59B]/40 font-mono text-xs space-y-2 max-w-xl">
                <div className="flex justify-between text-zinc-400">
                  <span>TRANSACTION HASH:</span>
                  <span className="text-white">0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>FINAL DISCREPANCY:</span>
                  <span className="text-[#00F59B] font-bold">0.00% AUDIT PASS</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>STATUS:</span>
                  <span className="text-[#00F59B] font-semibold">FUNDS RELEASED & AUDITED</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-mono uppercase flex items-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>SIMULATE ANOTHER MILESTONE</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
