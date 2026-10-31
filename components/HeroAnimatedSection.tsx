"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDownRight,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Compass,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Terminal as TerminalIcon,
  Cpu,
  Layers,
  Activity,
  KeyRound,
  FileCheck,
  Play,
  Sparkles,
  Zap,
} from "lucide-react";
import WelcomingAnimation from "./WelcomingAnimation";
import PhysicsCanvas from "./PhysicsCanvas";
import AuditorWalletModal from "./AuditorWalletModal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const ANIMATION_CONFIG = {
  HERO_SCALE_START: 1.05,
  HERO_REVEAL_DURATION: 1.1,
  HEADLINE_STAGGER_DELAY: 0.06,
  HEADLINE_TRANSLATE_Y: 36,
  SCROLL_CUE_BOUNCE_X: 6,
  SCROLL_CUE_DURATION: 1.5,
};

interface HeroAnimatedSectionProps {
  platformStats?: {
    total_campaigns: number;
    total_raised: number;
    total_released: number;
    total_milestones: number;
  };
  demoCampaign?: {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
    beneficiary: string;
    ngo_name: string;
  };
}

export default function HeroAnimatedSection({
  platformStats,
  demoCampaign,
}: HeroAnimatedSectionProps) {
  const [isWelcomingDone, setIsWelcomingDone] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"matrix" | "physics">("matrix");

  // Interactive Multi-Sig Protocol Simulation State
  const [simStep, setSimStep] = useState<1 | 2 | 3 | 4>(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[02:48:10] VERA_NODE_INITIALIZED :: CHAIN_ID 31337 (HARDHAT TESTNET)",
    "[02:48:12] VAULT_ID #0x88BF :: ESCROW ₹10,00,000 LOCKED IN SMART CONTRACT",
    "[02:48:15] INVOICE_INGEST :: SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "[02:48:18] AI OCR AUDITOR :: 0.0% VARIANCE DETECTED (INVOICE MATCH CONFIRMED)",
    "[02:48:21] MULTISIG_STATE :: 2 OF 3 SIGNATURES GATHERED (NGO + AUDITOR)",
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroVisualRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalRaised = Number(platformStats?.total_raised || 1075000);
  const totalReleased = Number(platformStats?.total_released || 285000);
  const totalLocked = Math.max(0, totalRaised - totalReleased);
  const campaignId = demoCampaign?.id || "cccccccc-cccc-cccc-cccc-cccccccccccc";

  // Auto-scroll terminal log to bottom on new messages
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Run interactive simulated escrow release
  const handleTriggerSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    setTerminalLogs((prev) => [
      ...prev,
      `[${now}] USER_ACTION :: TRIGGERING ATOMIC ESCROW VERIFICATION SEQUENCE...`,
    ]);

    setTimeout(() => {
      setSimStep(3);
      setTerminalLogs((prev) => [
        ...prev,
        `[${now}] PROJECT_LEAD_SIGNATURE :: 0x94b2...8c10 VERIFIED ON-CHAIN (3/3 CONSENSUS)`,
      ]);
    }, 900);

    setTimeout(() => {
      setSimStep(4);
      setTerminalLogs((prev) => [
        ...prev,
        `[${now}] SMART_CONTRACT_RELEASE :: TRANCHE ₹2,85,000 EXECUTED VIA NON-REENTRANT VAULT`,
        `[${now}] EVENT :: FundsReleased(tranche=1, recipient=0xVendor99, amount=285000)`,
      ]);
      setIsSimulating(false);
    }, 2000);
  };

  const handleResetSimulation = () => {
    setSimStep(2);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    setTerminalLogs((prev) => [
      ...prev,
      `[${now}] PROTOCOL_RESET :: VAULT RETURNED TO 2-OF-3 CONSENSUS STANDBY`,
    ]);
  };

  // INCOMING & OUTGOING ANIMATION TIMELINE (from HACKX-4.0)
  useEffect(() => {
    if (!isWelcomingDone || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Hero Visual (Right Console) scale-down from 1.05 to 1.0 & fade-in over 1.1s
      if (heroVisualRef.current) {
        gsap.fromTo(
          heroVisualRef.current,
          { scale: ANIMATION_CONFIG.HERO_SCALE_START, opacity: 0 },
          {
            scale: 1.0,
            opacity: 1,
            duration: ANIMATION_CONFIG.HERO_REVEAL_DURATION,
            ease: "power3.out",
          }
        );
      }

      // 2. Display headline splits into lines and animates upward (translateY 36 to 0, staggered)
      if (heroContentRef.current) {
        const eyebrow = heroContentRef.current.querySelector(".hero-eyebrow");
        const lines = heroContentRef.current.querySelectorAll(".hero-headline-line");
        const bodyText = heroContentRef.current.querySelector(".hero-subhead");
        const ctas = heroContentRef.current.querySelector(".hero-ctas");
        const metrics = heroContentRef.current.querySelector(".hero-metrics");
        const trustStrip = heroContentRef.current.querySelector(".hero-trust-strip");

        const tl = gsap.timeline({ delay: 0.1 });

        if (eyebrow) {
          tl.fromTo(
            eyebrow,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
          );
        }

        if (lines.length > 0) {
          tl.fromTo(
            lines,
            { y: ANIMATION_CONFIG.HEADLINE_TRANSLATE_Y, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              stagger: ANIMATION_CONFIG.HEADLINE_STAGGER_DELAY,
              ease: "power3.out",
            },
            "-=0.35"
          );
        }

        if (bodyText) {
          tl.fromTo(
            bodyText,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" },
            "-=0.45"
          );
        }

        if (ctas) {
          tl.fromTo(
            ctas,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
            "-=0.35"
          );
        }

        if (metrics) {
          tl.fromTo(
            metrics,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
            "-=0.3"
          );
        }

        if (trustStrip) {
          tl.fromTo(
            trustStrip,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            "-=0.2"
          );
        }
      }

      // 3. Scroll cue looping bounce/pulse animation (translateX 0 to 6px, yoyo, infinite)
      if (scrollCueRef.current) {
        const arrow = scrollCueRef.current.querySelector(".scroll-arrow");
        gsap.fromTo(
          scrollCueRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.8, ease: "power2.out" }
        );

        if (arrow) {
          gsap.fromTo(
            arrow,
            { x: 0 },
            {
              x: ANIMATION_CONFIG.SCROLL_CUE_BOUNCE_X,
              duration: ANIMATION_CONFIG.SCROLL_CUE_DURATION,
              repeat: -1,
              yoyo: true,
              ease: "power1.inOut",
            }
          );
        }
      }

      // 4. OUTGOING SCROLL ANIMATION (from HACKX-4.0)
      if (heroSectionRef.current) {
        gsap.to(heroSectionRef.current, {
          opacity: 0.15,
          y: -45,
          scale: 0.985,
          ease: "none",
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isWelcomingDone]);

  return (
    <div ref={containerRef} className="w-full relative font-sans">
      {/* 0. Incoming Cinematic Welcoming Animation Overlay */}
      {!isWelcomingDone && (
        <div className="fixed inset-0 z-50">
          <WelcomingAnimation onComplete={() => setIsWelcomingDone(true)} />
          {/* Quick Skip Control */}
          <button
            onClick={() => setIsWelcomingDone(true)}
            className="fixed top-5 right-5 z-[60] px-4 py-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-zinc-300 hover:text-white text-xs font-mono tracking-wider transition-all backdrop-blur-md flex items-center gap-2 group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
            title="Skip Intro (Esc)"
          >
            <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-pulse" />
            <span>SKIP INTRO</span>
            <span className="text-[10px] text-zinc-400 font-mono group-hover:text-white bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/10">ESC</span>
          </button>
        </div>
      )}

      {/* 1. Full-Bleed High-Tech SaaS Hero Section */}
      <section
        ref={heroSectionRef}
        id="hero-top"
        className="relative w-full min-h-[94vh] flex flex-col justify-center border-b border-white/[0.08] overflow-hidden bg-[#09090B] pt-10 pb-16 will-change-transform"
      >
        {/* Architectural Grid & Ambient Backdrops */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-[#00F59B]/10 via-[#06B6D4]/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-[#6366F1]/5 via-[#00F59B]/5 to-transparent blur-[160px] pointer-events-none rounded-full" />

        {/* Precision Telemetry Corner Crosshairs */}
        <div className="absolute top-6 left-6 font-mono text-[10px] text-zinc-600 select-none pointer-events-none hidden md:block">
          + LAT_26.9124°N // LON_75.7873°E // SEED_VAULT_01
        </div>
        <div className="absolute top-6 right-6 font-mono text-[10px] text-zinc-600 select-none pointer-events-none hidden md:block">
          PROTOCOL_REV: 2.4.0-PROD +
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: SaaS Editorial & High-Trust Narrative */}
            <div ref={heroContentRef} className="lg:col-span-6 space-y-6">
              {/* High-Tech Protocol Badge */}
              <div className="hero-eyebrow flex flex-wrap items-center gap-2.5 font-mono text-xs opacity-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#121216] border border-white/[0.12] text-zinc-200 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-ping" />
                  <span className="text-white font-medium tracking-tight">SYS // PROTOCOL V2.4</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-[#00F59B] font-semibold">MAINNET-READY</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] text-zinc-400 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span className="text-[11px] tracking-wider uppercase">SHA-256 PROOF-LOCKED</span>
                </div>
              </div>

              {/* Large Modern SaaS Display Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold tracking-[-0.04em] text-white leading-[1.04]">
                <div className="overflow-hidden">
                  <div className="hero-headline-line will-change-transform opacity-0">
                    Every rupee traceable.
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div className="hero-headline-line will-change-transform opacity-0 text-transparent bg-clip-text bg-gradient-to-r from-[#00F59B] via-[#22D3EE] to-zinc-100">
                    Audited before it moves.
                  </div>
                </div>
              </h1>

              {/* Subheadline: Clear, authoritative value proposition */}
              <p className="hero-subhead text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl opacity-0">
                VERA eliminates philanthropic blind spots by locking earmarked capital in smart contracts, mathematically validating vendor invoices with AI OCR, and releasing tranches through 2-of-3 multi-signature consensus.
              </p>

              {/* CTAs: Premium SaaS Buttons */}
              <div className="hero-ctas flex flex-wrap items-center gap-3.5 pt-2 opacity-0">
                <Link
                  href="/campaigns"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00F59B] via-[#10B981] to-[#06B6D4] hover:from-[#15FFA6] hover:to-[#22D3EE] text-black font-semibold text-sm transition-all duration-300 shadow-[0_0_30px_rgba(0,245,155,0.35)] hover:shadow-[0_0_45px_rgba(0,245,155,0.55)] flex items-center justify-center gap-2.5 active:scale-[0.98] group"
                >
                  <Compass className="w-4 h-4 text-black group-hover:rotate-45 transition-transform duration-300" />
                  <span>Explore Verified Campaigns</span>
                  <ArrowUpRight className="w-4 h-4 text-black" />
                </Link>

                <Link
                  href={`/campaigns/${campaignId}/audit`}
                  className="px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-100 hover:text-white border border-white/[0.12] hover:border-white/[0.25] font-medium text-sm transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00F59B]" />
                  <span>Public Audit Trail</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </Link>

                <button
                  onClick={() => setIsWelcomingDone(false)}
                  className="px-3.5 py-3 rounded-xl bg-transparent hover:bg-white/[0.04] border border-transparent hover:border-white/[0.1] text-zinc-500 hover:text-zinc-300 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Replay cinematic intro animation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>REPLAY</span>
                </button>
              </div>

              {/* Protocol Metrics Grid: 4 Glass Telemetry Cards */}
              <div className="hero-metrics pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono opacity-0">
                {/* Metric 1 */}
                <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-1 backdrop-blur-sm group">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>SECURED CAPITAL</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-pulse" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {formatRupees(totalRaised)}
                  </div>
                  <div className="text-[9px] text-[#00F59B] flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>100% ESCROWED</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-1 backdrop-blur-sm group">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>MISALLOCATION</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[#00F59B] tracking-tight">
                    0.00%
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    ZERO DRIFT
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-1 backdrop-blur-sm group">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>TRANCHES</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {platformStats?.total_milestones || 7} ACTIVE
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    2-OF-3 MULTI-SIG
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-1 backdrop-blur-sm group">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>PROOF ROOT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-zinc-200 tracking-tight">
                    SHA-256
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    IMMUTABLE
                  </div>
                </div>
              </div>

              {/* High-Trust Verification Strip */}
              <div className="hero-trust-strip pt-2 flex flex-wrap items-center gap-5 text-xs font-mono text-zinc-500 opacity-0">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00F59B]" />
                  Zero Platform Commission
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Unauthenticated Public Audits
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#6366F1]" />
                  Cryptographic Integrity Proofs
                </span>
              </div>
            </div>

            {/* Right Column: VERA Smart Protocol Console (SaaS Command Center) */}
            <div
              ref={heroVisualRef}
              className="lg:col-span-6 will-change-transform opacity-0"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0E0E12]/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                {/* Console Top Window Bar */}
                <div className="px-4 py-3 bg-[#131318] border-b border-white/[0.08] flex items-center justify-between">
                  {/* Traffic Light Micro Dots */}
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80 border border-[#EF4444]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80 border border-[#F59E0B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80 border border-[#10B981]" />
                    <span className="ml-2 font-mono text-[11px] text-zinc-400 font-medium">
                      VERA_PROTOCOL // ESCROW KERNEL
                    </span>
                  </div>

                  {/* Mode Tab Switcher: Live Matrix vs Zero-G Sandbox */}
                  <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.08] text-[11px] font-mono">
                    <button
                      onClick={() => setActiveConsoleTab("matrix")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeConsoleTab === "matrix"
                          ? "bg-[#00F59B] text-black font-bold shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ESCROW MATRIX
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab("physics")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeConsoleTab === "physics"
                          ? "bg-[#00F59B] text-black font-bold shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ZERO-G ARENA
                    </button>
                  </div>
                </div>

                {/* TAB 1: Live Interactive Escrow Matrix & Multi-Sig Engine */}
                {activeConsoleTab === "matrix" && (
                  <div className="p-5 space-y-5">
                    {/* Vault Header Stats */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141A] border border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#00F59B]/10 border border-[#00F59B]/30 flex items-center justify-center text-[#00F59B]">
                          {simStep >= 4 ? (
                            <Unlock className="w-5 h-5 text-[#00F59B]" />
                          ) : (
                            <Lock className="w-5 h-5 text-[#00F59B]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white font-semibold">
                              VAULT #0x88BF — JAIPUR SCHOOL INFRA
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#00F59B]/15 text-[#00F59B] rounded border border-[#00F59B]/30">
                              {simStep >= 4 ? "RELEASED" : "ESCROW LOCKED"}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-zinc-400">
                            Locked: {formatRupees(totalLocked)} • Tranche Cap: ₹3,00,000
                          </div>
                        </div>
                      </div>

                      {/* Hardhat Block Indicator */}
                      <div className="text-right font-mono text-[10px] text-zinc-400 hidden sm:block">
                        <div className="flex items-center justify-end gap-1.5 text-[#00F59B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-ping" />
                          <span>BLOCK #1,432</span>
                        </div>
                        <div className="text-zinc-500">LATENCY: 11ms</div>
                      </div>
                    </div>

                    {/* 2-of-3 Multi-Sig Consensus Interactive Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-[#06B6D4]" />
                          <span>2-OF-3 MULTI-SIG CONSENSUS</span>
                        </span>
                        <span className="text-[11px] font-semibold text-[#00F59B]">
                          {simStep >= 3 ? "3 OF 3 SIGNED (100%)" : "2 OF 3 SIGNED (66.7%)"}
                        </span>
                      </div>

                      {/* 3 Signatory Node Badges */}
                      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        {/* Node 1: NGO */}
                        <div className="p-2.5 rounded-lg bg-[#121217] border border-[#00F59B]/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>01 // NGO</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                          </div>
                          <div className="text-[11px] text-white font-medium truncate pt-1">
                            0x71F8...29A1
                          </div>
                          <div className="text-[9px] text-[#00F59B] flex items-center gap-1 pt-1 font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>APPROVED</span>
                          </div>
                        </div>

                        {/* Node 2: Project Lead */}
                        <div
                          className={`p-2.5 rounded-lg transition-all flex flex-col justify-between ${
                            simStep >= 3
                              ? "bg-[#121217] border border-[#00F59B]/40"
                              : "bg-[#121217]/60 border border-white/[0.08]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>02 // LEAD</span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                simStep >= 3 ? "bg-[#00F59B]" : "bg-amber-400 animate-pulse"
                              }`}
                            />
                          </div>
                          <div className="text-[11px] text-white font-medium truncate pt-1">
                            0x94B2...8C10
                          </div>
                          <div
                            className={`text-[9px] flex items-center gap-1 pt-1 font-semibold ${
                              simStep >= 3 ? "text-[#00F59B]" : "text-amber-400"
                            }`}
                          >
                            {simStep >= 3 ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>APPROVED</span>
                              </>
                            ) : (
                              <>
                                <Activity className="w-2.5 h-2.5" />
                                <span>READY TO SIGN</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Node 3: Auditor */}
                        <div className="p-2.5 rounded-lg bg-[#121217] border border-[#00F59B]/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>03 // AUDITOR</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                          </div>
                          <div className="text-[11px] text-white font-medium truncate pt-1">
                            0x1E4F...3B92
                          </div>
                          <div className="text-[9px] text-[#00F59B] flex items-center gap-1 pt-1 font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>CERTIFIED</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Cryptographic Proof Terminal Stream */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <TerminalIcon className="w-3.5 h-3.5 text-[#00F59B]" />
                          <span>AUDIT STREAM // CONTRACT_EVENTS</span>
                        </span>
                        <span className="text-[9px] text-zinc-500">LIVE FEED</span>
                      </div>

                      <div
                        ref={terminalScrollRef}
                        className="h-32 p-3 rounded-lg bg-black/80 border border-white/[0.08] font-mono text-[10.5px] leading-relaxed overflow-y-auto space-y-1 text-zinc-400 selection:bg-[#00F59B] selection:text-black scrollbar-thin scrollbar-thumb-zinc-800"
                      >
                        {terminalLogs.map((log, idx) => {
                          const isSuccess = log.includes("RELEASED") || log.includes("VERIFIED") || log.includes("CONFIRMED");
                          const isAction = log.includes("TRIGGERING") || log.includes("USER_ACTION");
                          return (
                            <div
                              key={idx}
                              className={`transition-colors ${
                                isSuccess
                                  ? "text-[#00F59B]"
                                  : isAction
                                  ? "text-[#22D3EE] font-semibold"
                                  : "text-zinc-400"
                              }`}
                            >
                              {log}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Simulation Controls */}
                    <div className="pt-1 flex items-center justify-between gap-3">
                      {simStep < 4 ? (
                        <button
                          onClick={handleTriggerSimulation}
                          disabled={isSimulating}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#00F59B]/15 hover:bg-[#00F59B]/25 text-[#00F59B] border border-[#00F59B]/40 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(0,245,155,0.2)] disabled:opacity-50"
                        >
                          {isSimulating ? (
                            <>
                              <Activity className="w-3.5 h-3.5 animate-spin" />
                              <span>VERIFYING CRYPTOGRAPHIC EVIDENCE...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>SIMULATE ATOMIC ESCROW RELEASE</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleResetSimulation}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/20 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>RESET SIMULATION STATE</span>
                        </button>
                      )}

                      <Link
                        href={`/campaigns/${campaignId}/audit`}
                        className="py-2.5 px-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] font-mono text-xs flex items-center gap-1.5 transition-colors"
                        title="Open full audit explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">EXPLORER</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* TAB 2: Zero-G Physics Arena (Matter.js from HACKX-4.0) */}
                {activeConsoleTab === "physics" && (
                  <div className="relative">
                    <PhysicsCanvas />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SaaS Scroll Exploration Cue with Animated Bouncing Arrow */}
          <div
            ref={scrollCueRef}
            className="pt-14 flex items-center justify-center font-mono text-xs text-zinc-500 tracking-widest uppercase opacity-0"
          >
            <a
              href="#protocol-metrics"
              className="flex items-center gap-2 hover:text-[#00F59B] transition-colors group cursor-pointer"
            >
              <span className="text-[11px] tracking-[0.2em]">SCROLL TO EXPLORE ARCHITECTURE</span>
              <span className="scroll-arrow inline-block will-change-transform">
                <ArrowRight className="w-3.5 h-3.5 text-[#00F59B]" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Auditor Keystore Modal */}
      <AuditorWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}
