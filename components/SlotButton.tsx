"use client";

import React from "react";
import { playTechSound } from "./SoundToggle";

interface SlotButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  icon?: React.ReactNode;
}

export default function SlotButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  icon,
}: SlotButtonProps) {
  const baseClasses =
    "relative inline-block overflow-hidden font-mono text-xs tracking-wider uppercase transition-all duration-300 border select-none group";

  let variantClasses = "";
  if (variant === "primary") {
    variantClasses =
      "bg-white text-black border-white hover:bg-[#00F59B] hover:border-[#00F59B] hover:text-black";
  } else if (variant === "secondary") {
    variantClasses =
      "bg-[#141418] text-white border-white/[0.12] hover:border-[#00F59B]/60 hover:bg-[#181820]";
  } else if (variant === "outline") {
    variantClasses =
      "bg-transparent text-zinc-300 border-white/[0.16] hover:border-white hover:text-white";
  }

  const content = (
    <span
      className="relative block h-full px-5 py-3 overflow-hidden"
      onMouseEnter={() => playTechSound("hover")}
    >
      <span className="relative flex items-center justify-center gap-2 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:-translate-y-full">
        <span>{children}</span>
        {icon && <span>{icon}</span>}
      </span>
      <span className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] translate-y-full group-hover:translate-y-0 text-inherit">
        <span>{children}</span>
        {icon && <span>{icon}</span>}
      </span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${variantClasses} ${className}`}
        onClick={() => playTechSound("click")}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        playTechSound("click");
        if (onClick) onClick();
      }}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {content}
    </button>
  );
}
