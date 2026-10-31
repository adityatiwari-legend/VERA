"use client";

import React, { useState, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip & HashPopover — instant hover explanation for technical terms.
 */

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const sideClasses: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={id}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "theme-night pointer-events-none absolute z-[80] w-max max-w-xs rounded-lg px-3 py-1.5",
            "bg-night text-[13px] font-sans leading-relaxed text-white",
            "border border-white/[0.12] shadow-lift",
            sideClasses[side],
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
