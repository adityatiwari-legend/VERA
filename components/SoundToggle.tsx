"use client";

import React, { useState } from "react";

export function playTechSound(type: "click" | "hover" | "release" | "alarm") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "hover") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "click") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "release") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

export default function SoundToggle() {
  const [isSoundOn, setIsSoundOn] = useState(false);

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    if (next) {
      playTechSound("click");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleSound}
      onMouseEnter={() => isSoundOn && playTechSound("hover")}
      className="flex items-center gap-2 px-2.5 py-1.5 bg-[#121215] border border-white/[0.08] hover:border-[#00F59B]/50 transition-all font-mono text-[10px] text-zinc-400 hover:text-white group"
      aria-label="Toggle sound"
      title="Toggle Audio Feedback"
    >
      <span className="hidden sm:inline">SOUND</span>
      <div className="flex items-end gap-[2px] h-3 w-3.5">
        <span
          className={`w-[2px] bg-[#00F59B] transition-all duration-300 ${
            isSoundOn ? "h-3 animate-pulse" : "h-1 opacity-40"
          }`}
        />
        <span
          className={`w-[2px] bg-[#00F59B] transition-all duration-300 ${
            isSoundOn ? "h-2 animate-pulse [animation-delay:150ms]" : "h-1.5 opacity-40"
          }`}
        />
        <span
          className={`w-[2px] bg-[#00F59B] transition-all duration-300 ${
            isSoundOn ? "h-3.5 animate-pulse [animation-delay:300ms]" : "h-1 opacity-40"
          }`}
        />
      </div>
      <span className="text-[9px] text-[#00F59B]">{isSoundOn ? "ON" : "OFF"}</span>
    </button>
  );
}
