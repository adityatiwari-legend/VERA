"use client";

import React, { useState } from "react";
import { ArrowDownRight, ShieldCheck, Play, ExternalLink, ArrowDown } from "lucide-react";
import PhysicsCanvas from "./PhysicsCanvas";
import AuditorWalletModal from "./AuditorWalletModal";
import SlotButton from "./SlotButton";
import ScrambleText from "./ScrambleText";

export default function Hero() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  return (
    <section
      id="hero-top"
      className="relative w-full pt-6 pb-16 lg:pt-10 lg:pb-24 border-b border-white/[0.08] overflow-hidden bg-gradient-to-b from-[#09090B] via-[#0A0A0D] to-[#09090B]"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#00F59B]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Micro Eyebrow */}
        <div className="flex flex-wrap items-center gap-3 mb-6 font-mono text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
            <span>SYS // PROTOCOL V2.4 ARCHITECTURE</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">/</span>
          <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
            SHA-256 PROOF-LOCKED ESCROWS
          </span>
        </div>

        {/* Two-Column Grid: Editorial Left & Physics Canvas Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Content */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-[-0.04em] text-white leading-[1.06]">
              Every rupee traceable. <br />
              <span className="text-zinc-400">Audited before it moves.</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl">
              VERA binds capital to verified physical progress. Tamper-evident escrows,
              automated evidence verification, and real-time public audit trails.
            </p>

            {/* CTAs using Alche SlotButton */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <SlotButton
                href="#audit-ledger"
                variant="primary"
                icon={<ArrowDownRight className="w-4 h-4" />}
                className="shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                EXPLORE AUDIT LEDGERS
              </SlotButton>

              <SlotButton
                onClick={() => setIsWalletModalOpen(true)}
                variant="secondary"
                icon={<ExternalLink className="w-3.5 h-3.5 text-zinc-400" />}
              >
                CAMPAIGN CONSOLE
              </SlotButton>

              <a
                href="#escrow-simulator"
                className="px-4 py-3 text-zinc-400 hover:text-[#00F59B] font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-[#00F59B]" />
                <span><ScrambleText text="SIMULATE UNLOCK" /></span>
              </a>
            </div>

            {/* Protocol Metrics Bar */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">SECURED CAPITAL</div>
                <div className="text-lg font-bold text-white tracking-tight">₹48.2 Cr</div>
                <div className="text-[9px] text-[#00F59B] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% ESCROWED</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">MISALLOCATION</div>
                <div className="text-lg font-bold text-[#00F59B] tracking-tight">0.00%</div>
                <div className="text-[9px] text-zinc-400">ZERO DRIFT</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">VERIFIED TRANCHES</div>
                <div className="text-lg font-bold text-white tracking-tight">3,812</div>
                <div className="text-[9px] text-zinc-400">MULTI-SIG SIGNED</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">PROOF ANCHOR</div>
                <div className="text-lg font-bold text-zinc-300 tracking-tight">SHA-256</div>
                <div className="text-[9px] text-zinc-400">IMMUTABLE ROOT</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Physics Canvas Arena */}
          <div id="physics-arena" className="lg:col-span-6">
            <div className="relative">
              <div className="absolute -top-3 left-3 z-20 font-mono text-[9px] text-zinc-500 bg-[#09090B] px-2 py-0.5 border border-white/[0.08]">
                CANVAS_ID // MATTE_SANDBOX_01
              </div>
              <PhysicsCanvas />
            </div>
          </div>
        </div>

        {/* Alche Studio signature "scroll to explore →" indicator */}
        <div className="pt-12 flex items-center justify-center">
          <a
            href="#protocol-bento"
            className="flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-white transition-colors tracking-widest uppercase group"
          >
            <span>scroll to explore</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#00F59B] group-hover:translate-y-1 transition-transform animate-bounce" />
          </a>
        </div>
      </div>

      <AuditorWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </section>
  );
}
