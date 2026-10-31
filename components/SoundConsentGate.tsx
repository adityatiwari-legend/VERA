"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { Volume2 } from "lucide-react";

interface SoundConsentGateProps {
  onConsent: (soundEnabled: boolean) => void;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export default function SoundConsentGate({
  onConsent,
  fadeInDuration = 0.4,
  fadeOutDuration = 0.6,
}: SoundConsentGateProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fade the banner in from the bottom
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: fadeInDuration, ease: "power2.out", delay: 0.2 }
      );
    }
  }, [fadeInDuration]);

  const handleChoice = (enableSound: boolean) => {
    if (!bannerRef.current) {
      onConsent(enableSound);
      return;
    }

    // Banner slides down and fades out smoothly (transform: translateY(100%))
    gsap.to(bannerRef.current, {
      y: "100%",
      opacity: 0,
      duration: fadeOutDuration,
      ease: "power2.inOut",
      onComplete: () => {
        onConsent(enableSound);
      },
    });
  };

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col md:flex-row items-center justify-between bg-transparent pb-10 px-8 md:px-16 pointer-events-auto"
    >
      {/* Left: Icon and Text */}
      <div className="flex items-center gap-3 mb-6 md:mb-0 text-white font-mono text-xs tracking-widest uppercase">
        <Volume2 className="w-4 h-4 text-[#00F59B]" />
        <span className="opacity-90">EXPERIENTIAL AUDIO AVAILABLE</span>
      </div>

      {/* Right: Options */}
      <div className="flex flex-col sm:flex-row items-center gap-6 font-mono text-xs tracking-wider uppercase">
        <button
          type="button"
          onClick={() => handleChoice(true)}
          className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-[#00F59B] transition-all duration-300 cursor-pointer"
        >
          ENABLE SOUND
        </button>

        <button
          type="button"
          onClick={() => handleChoice(false)}
          className="px-2 py-2.5 bg-transparent text-zinc-400 hover:text-white transition-colors duration-300 cursor-pointer"
        >
          CONTINUE MUTED
        </button>
      </div>
    </div>
  );
}
