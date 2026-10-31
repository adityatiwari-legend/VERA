"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrambleText from "./ScrambleText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function EditorialStatement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Animate Mission Statement lines with mask/clip-path reveal from bottom
      if (missionRef.current) {
        const missionLines = missionRef.current.querySelectorAll(".statement-line");
        gsap.fromTo(
          missionLines,
          {
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
            y: 60,
            opacity: 0,
            filter: "blur(8px)",
          },
          {
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: missionRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 2. Animate Vision Statement lines
      if (visionRef.current) {
        const visionLines = visionRef.current.querySelectorAll(".statement-line");
        gsap.fromTo(
          visionLines,
          {
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
            y: 60,
            opacity: 0,
            filter: "blur(8px)",
          },
          {
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: visionRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-black text-white py-24 sm:py-36 border-b border-white/[0.08] overflow-hidden">
      {/* Background Architectural Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] font-bold text-white/[0.015] select-none pointer-events-none font-sans whitespace-nowrap">
        VERA TRUST
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-36 relative z-10">
        {/* Mission Statement */}
        <div ref={missionRef} className="space-y-8 max-w-4xl">
          <div className="flex items-center gap-3 font-mono text-xs text-[#00F59B] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
            <span>01 {"//"} <ScrambleText text="MISSION" /></span>
            <span className="text-zinc-600">{"//"}</span>
            <span className="text-zinc-400">CAPITAL TRACEABILITY</span>
          </div>

          <div className="space-y-3 text-3xl sm:text-5xl md:text-6xl font-light tracking-[-0.03em] leading-[1.12]">
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform">
                Every rupee traceable.
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform text-zinc-400">
                Audited before release.
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform text-white font-normal">
                Covenant-bound disbursement.
              </div>
            </div>
          </div>

          <div className="overflow-hidden pt-4 border-t border-white/[0.08]">
            <p className="statement-line font-mono text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Programmatic accountability where capital is strictly bound to verified physical progress through SHA-256 evidence escrows and AI OCR discrepancy checks.
            </p>
          </div>
        </div>

        {/* Vision Statement */}
        <div ref={visionRef} className="space-y-8 max-w-4xl ml-auto text-right">
          <div className="flex items-center justify-end gap-3 font-mono text-xs text-[#00F59B] uppercase tracking-widest">
            <span className="text-zinc-400">ZERO DIVERSION</span>
            <span className="text-zinc-600">{"//"}</span>
            <span>02 {"//"} <ScrambleText text="VISION" /></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
          </div>

          <div className="space-y-3 text-3xl sm:text-5xl md:text-6xl font-light tracking-[-0.03em] leading-[1.12]">
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform">
                Zero misallocation.
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform text-zinc-400">
                Public on-chain verification.
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="statement-line will-change-transform text-white font-normal">
                Promises replaced with code.
              </div>
            </div>
          </div>

          <div className="overflow-hidden pt-4 border-t border-white/[0.08] flex justify-end">
            <p className="statement-line font-mono text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed text-right">
              Immutable milestone escrows for a zero-diversion world. Mathematical truth replaces institutional promises, allowing any citizen to audit fund flows in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
