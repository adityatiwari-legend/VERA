"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Lenis from "lenis";
import VeraScene from "@/components/canvas/VeraScene";
import QuaternionGizmo from "@/components/canvas/QuaternionGizmo";

export default function ScrollStage() {
  const [scrollTau, setScrollTau] = useState(0);
  const [quaternion, setQuaternion] = useState<[number, number, number, number]>([
    0, 0, 0, 1,
  ]);
  const [userOffset, setUserOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const resetAnimRef = useRef<number | null>(null);

  // Initialize Lenis smooth scroll driver with exact damping factor lerp: 0.08, smoothWheel: true
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      infinite: false,
    });
    lenisRef.current = lenis;

    let animId: number;
    function raf(time: number) {
      lenis.raf(time);
      animId = requestAnimationFrame(raf);
    }
    animId = requestAnimationFrame(raf);

    lenis.on("scroll", (e: { progress: number }) => {
      setScrollTau(e.progress);
    });

    return () => {
      cancelAnimationFrame(animId);
      if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);
      lenis.destroy();
    };
  }, []);

  // Smooth Reset Quaternion action: smoothly tweens userOffset back to identity
  const handleResetQuaternion = useCallback(() => {
    if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);

    const startX = userOffset.x;
    const startY = userOffset.y;
    const startTime = performance.now();
    const duration = 450; // ms

    function stepTween(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      // Smooth ease-out curve
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentX = startX * (1 - ease);
      const currentY = startY * (1 - ease);
      setUserOffset({ x: currentX, y: currentY });

      if (progress < 1.0) {
        resetAnimRef.current = requestAnimationFrame(stepTween);
      } else {
        setUserOffset({ x: 0, y: 0 });
        resetAnimRef.current = null;
      }
    }

    resetAnimRef.current = requestAnimationFrame(stepTween);
  }, [userOffset]);

  const handleDragOffset = useCallback((offset: { x: number; y: number }) => {
    setUserOffset(offset);
  }, []);

  // Programmatic smooth scroll to normalized milestone timeline tau
  const scrollToTau = (targetTau: number) => {
    if (!lenisRef.current || !containerRef.current) return;
    const maxScroll = containerRef.current.scrollHeight - window.innerHeight;
    lenisRef.current.scrollTo(targetTau * maxScroll, { duration: 1.2 });
  };

  // Milestone chapters:
  // 0.00 – 0.20: Stage 0 (Hero / Central Monolith)
  // 0.20 – 0.45: Stage 1 (Earmarked Smart Escrow)
  // 0.45 – 0.70: Stage 2 (SHA-256 Proof & AI OCR Inspection)
  // 0.70 – 1.00: Stage 3 (Auditor Consensus & Public Ledger Release)

  // Stage 0 Hero Typography transitions:
  // As tau crosses 0.15, scales up slightly, letter-spacing expands, opacity drops to 0
  const heroProgress = Math.min(1.0, Math.max(0, scrollTau / 0.18));
  const heroOpacity = Math.max(0, 1 - Math.pow(heroProgress, 1.4));
  const heroScale = 1.0 + heroProgress * 0.08;
  const heroLetterSpacing = `${0.06 + heroProgress * 0.16}em`;

  // Slide visibility states with masked reveal transitions
  const isSlide1 = scrollTau >= 0.18 && scrollTau < 0.45;
  const isSlide2 = scrollTau >= 0.45 && scrollTau < 0.70;
  const isSlide3 = scrollTau >= 0.70;

  return (
    <div
      ref={containerRef}
      className="relative h-[550vh] bg-[#09090B] text-zinc-100 overflow-clip"
    >
      {/* ================================================================ */}
      {/* LAYER 0 (z-0): Persistent WebGL Canvas                           */}
      {/* Fixed inset-0 pointer-events-none hosting 3D cylinder & glass V  */}
      {/* ================================================================ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <VeraScene
          scrollProgress={scrollTau}
          userOffset={userOffset}
          onQuaternionUpdate={setQuaternion}
        />
      </div>

      {/* ================================================================ */}
      {/* LAYER 1 (z-10): Fixed UI Telemetry Frame                         */}
      {/* Header, Quaternion Gizmo, Corner Crosshairs, News Ticker, Decals */}
      {/* ================================================================ */}
      <div className="fixed inset-0 z-10 pointer-events-none p-4 sm:p-6 md:p-8 flex flex-col justify-between select-none">
        {/* Top Telemetry Header Bar */}
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-xs text-zinc-400">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#00F59B] animate-pulse" />
              <span className="tracking-[0.18em] uppercase font-semibold text-zinc-200">
                SYS // VERA TRUST LAYER v4.2
              </span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[10px] text-zinc-500 tracking-wider">
              <span>CHAIN: SEPOLIA (11155111)</span>
              <span className="text-zinc-700">|</span>
              <span>ORACLE: SHA-256 DUAL-KEY</span>
            </div>
          </div>

          {/* Top-Right Quaternion Gizmo */}
          <div className="pointer-events-auto">
            <QuaternionGizmo
              quaternion={quaternion}
              onReset={handleResetQuaternion}
              onDragOffset={handleDragOffset}
            />
          </div>
        </div>

        {/* Corner Crosshairs (+) at exactly 16px inset from viewport corners */}
        <span className="fixed top-4 left-4 font-mono text-xs text-zinc-500/80 pointer-events-none select-none">
          +
        </span>
        <span className="fixed top-4 right-4 font-mono text-xs text-zinc-500/80 pointer-events-none select-none">
          +
        </span>
        <span className="fixed bottom-4 left-4 font-mono text-xs text-zinc-500/80 pointer-events-none select-none">
          +
        </span>
        <span className="fixed bottom-4 right-4 font-mono text-xs text-zinc-500/80 pointer-events-none select-none">
          +
        </span>

        {/* Bottom Decals & Milestone Scrubber & Live News Ticker */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Bottom-Left: VERA System Engine // v4.2 Material Indicator */}
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em] leading-relaxed">
            <div className="text-zinc-400 font-semibold">VERA System Engine // v4.2</div>
            <div className="text-[9px] text-zinc-600">
              TRANSMISSION: 1.0 // IOR: 1.62 // THICKNESS: 2.4 // DISPERSION: 0.09→0.22
            </div>
          </div>

          {/* Center: Programmatic Milestone Timeline Scrubber */}
          <div className="pointer-events-auto flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] self-start lg:self-auto bg-black/40 backdrop-blur-md p-1 border border-white/[0.08]">
            {[
              { label: "00 // HERO", tau: 0.0, active: scrollTau < 0.2 },
              { label: "01 // ESCROW", tau: 0.32, active: isSlide1 },
              { label: "02 // PROOF", tau: 0.58, active: isSlide2 },
              { label: "03 // AUDIT", tau: 0.85, active: isSlide3 },
            ].map((step, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToTau(step.tau)}
                className={`px-3 py-1.5 border transition-all cursor-pointer ${
                  step.active
                    ? "border-[#00F59B] bg-[#00F59B]/10 text-[#00F59B] font-semibold"
                    : "border-transparent text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* Bottom-Right: Live Ticker Box with exact Alche date stamp */}
          <div className="font-mono text-right bg-black/40 backdrop-blur-md border border-white/[0.08] px-3.5 py-2">
            <span className="block text-[9px] text-zinc-500 tracking-widest uppercase">
              2026.09.11
            </span>
            <span className="text-[11px] text-[#00F59B] tracking-wider uppercase font-semibold">
              ESCROW TRANCHE #02 CLEARED // JAIPUR SCHOOL AUDIT
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LAYER 2 (z-20): Synchronized DOM Content Layer                   */}
      {/* Pinned sticky viewport stage translating, fading, and masking    */}
      {/* ================================================================ */}
      <div className="sticky top-0 h-screen w-full z-20 pointer-events-none flex items-center justify-center p-6 sm:p-12 md:p-16">
        {/* Stage 0: Hero Typographic Layer (Refracted through Glass "V") */}
        <div
          style={{
            opacity: heroOpacity,
            transform: `scale(${heroScale})`,
            letterSpacing: heroLetterSpacing,
            pointerEvents: heroOpacity > 0.1 ? "auto" : "none",
          }}
          className="text-center transition-transform duration-200 ease-out select-none flex flex-col items-center justify-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-mono text-xs uppercase tracking-[0.2em] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
            <span>Programmable Trust Layer</span>
          </div>

          {/* Giant sans-serif tracking-tighter typography: V E R A */}
          <h1
            className="text-7xl sm:text-9xl md:text-[140px] lg:text-[170px] font-black text-white leading-none tracking-[-0.06em] select-none text-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            V E R A
          </h1>

          <p className="font-mono text-xs sm:text-sm text-zinc-400 tracking-[0.16em] uppercase mt-4 max-w-md">
            Audited Before It Moves.
          </p>
          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 tracking-widest uppercase mt-6 animate-pulse">
            <span>SCROLL TO ENGAGE 3D TELEMETRY FLIGHT</span>
            <span>↓</span>
          </div>
        </div>

        {/* Slide 01: Left-aligned editorial card (tau: 0.20 - 0.45) */}
        {/* Masked reveal with overflow-hidden wrapper translating up from y: 100% to 0% */}
        <div
          className={`absolute left-6 sm:left-12 md:left-20 max-w-lg transition-all duration-700 pointer-events-auto ${
            isSlide1
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`transform transition-transform duration-700 ease-out ${
                isSlide1 ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="border border-white/[0.08] bg-[#0c0c10]/80 backdrop-blur-xl p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
                <span className="font-mono text-xs text-[#00F59B] block uppercase tracking-[0.2em] mb-2 font-medium">
                  01 // ESCROW CORE: Programmable Capital Locking
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-[-0.03em] text-white mb-3">
                  Earmarked Smart Escrow
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6 font-normal">
                  Capital is locked inside immutable smart contracts and cannot be
                  reallocated or diverted. Funds are released strictly against verified,
                  tamper-evident physical progress.
                </p>

                {/* Monospace statistics */}
                <div className="border-t border-white/[0.08] pt-4 font-mono text-xs grid grid-cols-2 gap-3 text-zinc-400">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      ESCROW LOCK
                    </span>
                    <span className="text-white font-bold tracking-tight">
                      LOCKED: ₹10,00,000
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      REALLOCATION DRIFT
                    </span>
                    <span className="text-[#00F59B] font-bold tracking-tight">
                      REALLOCATION: DISABLED
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      DISBURSEMENT
                    </span>
                    <span className="text-zinc-300">TRANCHE #01 MILESTONE</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      SAFETY ENGINE
                    </span>
                    <span className="text-zinc-300">14D AUTO-REFUND GATE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 02: Split-column card (tau: 0.45 - 0.70) */}
        {/* Macro dolly camera frames the sharp beveled edge of the V */}
        <div
          className={`absolute left-6 sm:left-12 md:left-20 lg:left-24 max-w-2xl transition-all duration-700 pointer-events-auto ${
            isSlide2
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`transform transition-transform duration-700 ease-out ${
                isSlide2 ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="border border-white/[0.08] bg-[#0c0c10]/85 backdrop-blur-xl p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
                <span className="font-mono text-xs text-[#00F59B] block uppercase tracking-[0.2em] mb-2 font-medium">
                  02 // EVIDENCE INTEGRITY: SHA-256 Checksums & AI OCR
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-[-0.03em] text-white mb-4">
                  Cryptographic Verification Layer
                </h2>

                {/* Split-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 space-y-3 text-xs text-zinc-400 leading-relaxed font-normal">
                    <p>
                      Every physical vendor invoice, geo-tagged photo, and deliverable
                      receipt is automatically vectorized and analyzed for cross-item
                      discrepancies.
                    </p>
                    <div className="font-mono text-[11px] space-y-1 pt-1">
                      <div className="text-zinc-300">
                        OCR ACCURACY: <span className="text-[#00F59B]">99.4% MATCH</span>
                      </div>
                      <div className="text-zinc-300">
                        GEO-ANCHOR: <span className="text-zinc-100">26.9124°N, 75.7873°E</span>
                      </div>
                      <div className="text-zinc-300">
                        TAMPER LOG: <span className="text-[#00F59B]">ZERO MUTATION</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-6 flex flex-col justify-between border border-white/[0.08] bg-black/60 p-4 font-mono text-[10px] sm:text-[11px] text-zinc-300">
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider block text-[9px] mb-1">
                        LIVE PAYLOAD HASH SNIPPET
                      </span>
                      <div className="break-all text-[#38bdf8] font-mono leading-tight">
                        SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                      </div>
                    </div>

                    <div className="border-t border-white/[0.08] pt-2 mt-3 space-y-0.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>INVOICED AMOUNT:</span>
                        <span className="text-white">₹1,42,850.00</span>
                      </div>
                      <div className="flex justify-between text-[#00F59B]">
                        <span>DISCREPANCY:</span>
                        <span>₹0.00 (PASS)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 03: Right-aligned telemetry card (tau: 0.70 - 1.00) */}
        {/* Pinned to the right with masked reveals */}
        <div
          className={`absolute right-6 sm:right-12 md:right-20 max-w-lg transition-all duration-700 pointer-events-auto ${
            isSlide3
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`transform transition-transform duration-700 ease-out ${
                isSlide3 ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="border border-white/[0.08] bg-[#0c0c10]/85 backdrop-blur-xl p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
                <span className="font-mono text-xs text-[#00F59B] block uppercase tracking-[0.2em] mb-2 font-medium">
                  03 // DUAL-KEY CONSENSUS: Tranche Release Engine
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-[-0.03em] text-white mb-3">
                  Multi-Party Auditor Clearance
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6 font-normal">
                  Neither platform nor recipient can unilateral withdraw capital. Funds
                  unlock only when dual multi-signature consensus keys approve the
                  on-chain audit proof.
                </p>

                {/* Sign-off gates and release triggers */}
                <div className="border border-white/[0.08] bg-black/60 p-4 font-mono text-[11px] space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">KEY #1 [FIELD AUDITOR]:</span>
                    <span className="text-[#00F59B] font-semibold">0x82f...41a9 [SIGNED]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">KEY #2 [OCR ORACLE]:</span>
                    <span className="text-[#00F59B] font-semibold">0x93c...0e1b [SIGNED]</span>
                  </div>
                  <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between">
                    <span className="text-zinc-500 uppercase text-[10px]">CONSENSUS GATE:</span>
                    <span className="text-white font-bold">2/2 DUAL-KEY ACHIEVED</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href="#audit-ledger"
                    className="flex-1 text-center py-3 bg-white text-black font-mono text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#00F59B] transition-colors cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    Inspect Public Ledger ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
