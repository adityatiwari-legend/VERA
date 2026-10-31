"use client";

import React, { useState, useEffect } from "react";

export default function LoadingOverlay() {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoaded(true), 400);
          setTimeout(() => setShouldRemove(true), 1200);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15 + 8);
      });
    }, 45);

    return () => clearInterval(timer);
  }, []);

  if (shouldRemove) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[#09090B] text-white select-none transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        isLoaded ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between font-mono text-[10px] text-zinc-500 tracking-widest">
        <span>VERA PROTOCOL // INITIALIZING TRUST LAYER</span>
        <span>MAINNET v2.4</span>
      </div>

      {/* Center Animated Logo & Motto */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-lg">
        {/* Geometric Rotating Prism */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border border-white/20 animate-spin [animation-duration:8s]" />
          <div className="absolute inset-2 border border-[#00F59B]/50 rotate-45 animate-spin [animation-duration:6s] [animation-direction:reverse]" />
          <span className="w-2.5 h-2.5 bg-[#00F59B] rounded-full shadow-[0_0_12px_#00F59B] animate-pulse" />
        </div>

        {/* Motto */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-normal tracking-[-0.02em] text-white">
            Architect trust that moves capital.
          </h2>
          <p className="font-mono text-xs text-zinc-400">
            Every rupee traceable. Audited before it moves.
          </p>
        </div>
      </div>

      {/* Bottom Counter Bar */}
      <div className="w-full flex items-center justify-between font-mono text-xs border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-ping" />
          <span>CRYPTOGRAPHIC EVIDENCE MATRIX</span>
        </div>
        <div className="text-right">
          <span className="text-[#00F59B] font-bold text-sm tracking-widest">
            {Math.min(progress, 100).toString().padStart(3, "0")}%
          </span>
        </div>
      </div>
    </div>
  );
}
