"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownRight, ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";
import WelcomingAnimation from "./WelcomingAnimation";
import SoundConsentGate from "./SoundConsentGate";
import Navbar from "./Navbar";
import PhysicsCanvas from "./PhysicsCanvas";
import BentoGrid from "./BentoGrid";
import EditorialStatement from "./EditorialStatement";
import EscrowSimulator from "./EscrowSimulator";
import AuditLedger from "./AuditLedger";
import VeraSystem from "./domain/VeraSystem";
import { CinematicFooter } from "@/components/ui/motion-footer";
import ScrollIndicator from "./ScrollIndicator";
import SlotButton from "./SlotButton";
import ScrambleText from "./ScrambleText";
import AuditorWalletModal from "./AuditorWalletModal";
import { playTechSound } from "./SoundToggle";

// ==========================================
// ADJUSTABLE ANIMATION TIMING CONSTANTS
// ==========================================
export const ANIMATION_CONFIG = {
  GATE_FADE_IN: 0.4,              // Sound gate entrance fade (seconds)
  GATE_FADE_OUT: 0.6,             // Sound gate exit fade (seconds)
  HERO_SCALE_START: 1.05,         // Initial scale of hero visual
  HERO_REVEAL_DURATION: 1.2,      // Scale-down & fade-in duration of hero visual
  HEADLINE_STAGGER_DELAY: 0.05,   // Delay per headline line
  HEADLINE_TRANSLATE_Y: 40,       // Distance headline lines move up
  SCROLL_CUE_BOUNCE_X: 8,         // Scroll cue horizontal bounce travel
  SCROLL_CUE_DURATION: 1.5,       // Scroll cue loop duration
  SECTION_TRANSITION_Y: 60,       // Distance sections slide up on scroll enter
  SECTION_TRIGGER_VIEWPORT: "80%", // ScrollTrigger entrance position
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CinematicLanding() {
  const [isWelcomingDone, setIsWelcomingDone] = useState(false);
  const [hasGateClosed, setHasGateClosed] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroVisualRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Section references for scroll crossfade handoffs
  const veraSystemSectionRef = useRef<HTMLDivElement>(null);
  const bentoSectionRef = useRef<HTMLDivElement>(null);
  const statementSectionRef = useRef<HTMLDivElement>(null);
  const simulatorSectionRef = useRef<HTMLDivElement>(null);
  const ledgerSectionRef = useRef<HTMLDivElement>(null);

  // Handle sound consent gate choice
  const handleConsentChoice = (enabled: boolean) => {
    setHasGateClosed(true);

    if (enabled) {
      playTechSound("release");
    }
  };

  // Run Hero / KV entrance animations once gate closes
  useEffect(() => {
    if (!hasGateClosed || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Thin Nav fades in after hero sequence starts
      if (navRef.current) {
        gsap.fromTo(
          navRef.current,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.4 }
        );
      }

      // 2. Hero Visual reveals with scale-down from 1.05 to 1.0 & opacity 0 to 1 over 1.2s
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

      // 3. Display headline splits into lines and animates upward (translateY 40 to 0, staggered)
      if (heroContentRef.current) {
        const lines = heroContentRef.current.querySelectorAll(".hero-headline-line");
        const eyebrow = heroContentRef.current.querySelector(".hero-eyebrow");
        const bodyText = heroContentRef.current.querySelector(".hero-subhead");
        const ctas = heroContentRef.current.querySelector(".hero-ctas");
        const metrics = heroContentRef.current.querySelector(".hero-metrics");

        const tl = gsap.timeline({ delay: 0.2 });

        if (eyebrow) {
          tl.fromTo(eyebrow, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
        }

        tl.fromTo(
          lines,
          { y: ANIMATION_CONFIG.HEADLINE_TRANSLATE_Y, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: ANIMATION_CONFIG.HEADLINE_STAGGER_DELAY,
            ease: "power3.out",
          },
          "-=0.3"
        );

        if (bodyText) {
          tl.fromTo(bodyText, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.5");
        }

        if (ctas) {
          tl.fromTo(ctas, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.4");
        }

        if (metrics) {
          tl.fromTo(metrics, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3");
        }
      }

      // 4. Scroll cue looping bounce/pulse animation (translateX 0 to 8px, yoyo, infinite, 1.5s)
      if (scrollCueRef.current) {
        const arrow = scrollCueRef.current.querySelector(".scroll-arrow");
        gsap.fromTo(
          scrollCueRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8, delay: 1.0, ease: "power2.out" }
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

      // 5. Section-based scroll transitions: crossfade and slide-in handoff
      const sections = [
        veraSystemSectionRef.current,
        bentoSectionRef.current,
        statementSectionRef.current,
        simulatorSectionRef.current,
        ledgerSectionRef.current,
      ].filter(Boolean);

      sections.forEach((section) => {
        if (!section) return;

        gsap.fromTo(
          section,
          {
            opacity: 0,
            y: ANIMATION_CONFIG.SECTION_TRANSITION_Y,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: `top ${ANIMATION_CONFIG.SECTION_TRIGGER_VIEWPORT}`,
              end: "bottom 20%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [hasGateClosed]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-[#EDEDED] flex flex-col relative selection:bg-[#00F59B] selection:text-black">
      {/* 0. New Welcoming Animation */}
      {!isWelcomingDone && (
        <WelcomingAnimation onComplete={() => setIsWelcomingDone(true)} />
      )}

      {/* 1. Sound Consent Gate on First Load (After Welcoming Animation) */}
      {isWelcomingDone && !hasGateClosed && (
        <SoundConsentGate
          onConsent={handleConsentChoice}
          fadeInDuration={ANIMATION_CONFIG.GATE_FADE_IN}
          fadeOutDuration={ANIMATION_CONFIG.GATE_FADE_OUT}
        />
      )}

      {/* 2. Alche Vertical Scroll Indicator on Left Edge */}
      <ScrollIndicator />

      {/* Main Content Wrapper (relative z-10) so the fixed footer is revealed as a curtain on scroll */}
      <div className="relative z-10 w-full bg-black border-b border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
        {/* 3. Sticky Navigation Bar */}
        <div ref={navRef} className="sticky top-0 z-40">
          <Navbar />
        </div>

        {/* 4. Full-Bleed Hero / KV Section */}
        <section
          id="hero-top"
          className="relative w-full min-h-[92vh] flex flex-col justify-center border-b border-white/[0.08] overflow-hidden bg-black pt-6 pb-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Typography */}
              <div ref={heroContentRef} className="lg:col-span-6 space-y-6">
                {/* Eyebrow */}
                <div className="hero-eyebrow flex flex-wrap items-center gap-3 font-mono text-xs opacity-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                    <span>SYS // PROTOCOL V2.4 ARCHITECTURE</span>
                  </div>
                  <span className="text-zinc-600 hidden sm:inline">/</span>
                  <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                    SHA-256 PROOF-LOCKED ESCROWS
                  </span>
                </div>

                {/* Large Display Headline (Split into lines for upward staggered reveal) */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-[-0.04em] text-white leading-[1.06]">
                  <div className="overflow-hidden">
                    <div className="hero-headline-line will-change-transform opacity-0">
                      Every rupee traceable.
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div className="hero-headline-line will-change-transform opacity-0 text-zinc-400">
                      Audited before it moves.
                    </div>
                  </div>
                </h1>

                {/* Subheadline */}
                <p className="hero-subhead text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl opacity-0">
                  VERA binds capital to verified physical progress. Tamper-evident escrows,
                  automated evidence verification, and real-time public audit trails.
                </p>

                {/* CTAs with Alche SlotButton */}
                <div className="hero-ctas flex flex-wrap items-center gap-3 pt-2 opacity-0">
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
                    <span className="w-2 h-2 rounded-full bg-[#00F59B]" />
                    <span><ScrambleText text="SIMULATE UNLOCK" /></span>
                  </a>
                </div>

                {/* Metrics Bar */}
                <div className="hero-metrics pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono opacity-0">
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

              {/* Right Column: Full-Bleed Hero Visual (Matter.js Zero-G Arena) */}
              <div
                ref={heroVisualRef}
                className="lg:col-span-6 will-change-transform opacity-0"
              >
                {hasGateClosed ? (
                  <PhysicsCanvas />
                ) : (
                  <div className="w-full h-[520px] bg-[#0C0C0E] border border-white/[0.08] flex items-center justify-center font-mono text-xs text-zinc-600">
                    <span>INITIALIZING ZERO-G CANVAS...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scroll cue with looping subtle bounce/pulse animation (translateX 0 to 8px) */}
            <div
              ref={scrollCueRef}
              className="pt-14 flex items-center justify-center font-mono text-xs text-zinc-500 tracking-widest uppercase opacity-0"
            >
              <a
                href="#protocol-bento"
                className="flex items-center gap-2 hover:text-white transition-colors group cursor-pointer"
              >
                <span>scroll to explore</span>
                <span className="scroll-arrow inline-block will-change-transform">
                  <ArrowRight className="w-3.5 h-3.5 text-[#00F59B]" />
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* 4b. VERA Component Architecture Showcase (component.md) — inserted after hero, hero untouched */}
        <div ref={veraSystemSectionRef} className="will-change-transform">
          <VeraSystem />
        </div>

        {/* 5. Section 2: Works / Protocol Architecture Bento Grid */}
        <div ref={bentoSectionRef} className="will-change-transform">
          <BentoGrid />
        </div>

        {/* 6. Section 3: Typography-Driven Vision/Mission Statement Sections */}
        <div ref={statementSectionRef} className="will-change-transform">
          <EditorialStatement />
        </div>

        {/* 7. Section 4: Interactive Escrow Simulator */}
        <div ref={simulatorSectionRef} className="will-change-transform">
          <EscrowSimulator />
        </div>

        {/* 8. Section 5: Live Monospace Audit Ledger */}
        <div ref={ledgerSectionRef} className="will-change-transform">
          <AuditLedger />
        </div>
      </div>

      {/* 9. Cinematic Curtain-Reveal Motion Footer */}
      <CinematicFooter />

      {/* Auditor Keystore Modal */}
      <AuditorWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}
