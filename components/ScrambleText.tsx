"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ScrambleTextProps {
  text: string;
  className?: string;
  scrambleOnHover?: boolean;
  autoPlay?: boolean;
}

const GLYPHS = "0123456789ABCDEF_#%&<>[]*+~";

export default function ScrambleText({
  text,
  className = "",
  scrambleOnHover = true,
  autoPlay = false,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const animatingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScramble = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    let iteration = 0;
    const maxIterations = text.length * 3;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration / 3) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );

      if (iteration >= maxIterations) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        animatingRef.current = false;
      }

      iteration += 1;
    }, 25);
  }, [text]);

  useEffect(() => {
    if (autoPlay) {
      startScramble();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, startScramble]);

  return (
    <span
      className={`inline-block cursor-pointer select-none font-mono ${className}`}
      onMouseEnter={scrambleOnHover ? startScramble : undefined}
    >
      {displayText}
    </span>
  );
}
