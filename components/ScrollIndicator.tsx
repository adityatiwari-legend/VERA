"use client";

import React, { useState, useEffect } from "react";
import { playTechSound } from "./SoundToggle";

interface SectionItem {
  id: string;
  label: string;
  subsections?: string[];
}

const SECTIONS: SectionItem[] = [
  { id: "hero-top", label: "TOP" },
  { id: "protocol-bento", label: "PROTOCOL" },
  { id: "escrow-simulator", label: "ESCROW" },
  { id: "audit-ledger", label: "LEDGER" },
];

export default function ScrollIndicator() {
  const [activeSection, setActiveSection] = useState<string>("hero-top");
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;

      // Check section offsets
      for (const sec of SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= windowHeight * 0.4 && rect.bottom >= windowHeight * 0.2) {
            setActiveSection(sec.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    playTechSound("click");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed left-4 lg:left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-6 pointer-events-auto mix-blend-difference select-none">
      {SECTIONS.map((sec, index) => {
        const isActive = activeSection === sec.id;
        const isHovered = hoveredSection === sec.id;

        return (
          <div
            key={sec.id}
            className="flex flex-col gap-3 group cursor-pointer"
            onClick={() => scrollTo(sec.id)}
            onMouseEnter={() => {
              setHoveredSection(sec.id);
              playTechSound("hover");
            }}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {/* Main Section Line & Label */}
            <div className="flex items-center gap-3 relative">
              <div
                className={`h-[1px] transition-all duration-300 ${
                  isActive
                    ? "w-8 bg-[#00F59B]"
                    : isHovered
                    ? "w-6 bg-white"
                    : "w-4 bg-white/40"
                }`}
              />

              <div
                className={`absolute left-10 font-mono text-[9px] tracking-widest uppercase transition-all duration-300 ${
                  isActive
                    ? "text-[#00F59B] opacity-100 translate-x-0 font-semibold"
                    : isHovered
                    ? "text-white opacity-100 translate-x-0"
                    : "text-zinc-500 opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0"
                }`}
              >
                0{index + 1} {sec.label}
              </div>
            </div>

            {/* Micro Subsection Ticks (Alche Studio style) */}
            <div className="flex flex-col gap-1.5 pl-1">
              <div
                className={`w-1 h-[1px] transition-colors ${
                  isActive ? "bg-[#00F59B]/60" : "bg-white/20"
                }`}
              />
              <div
                className={`w-1 h-[1px] transition-colors ${
                  isActive ? "bg-[#00F59B]/40" : "bg-white/10"
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
