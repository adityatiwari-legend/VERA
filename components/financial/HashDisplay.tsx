"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * HashDisplay — Truncated display for SHA-256 hashes, wallet addresses, and tx hashes.
 * One-click copy + explorer jump link. Light .chip styling.
 */

export interface HashDisplayProps {
  hash: string;
  type?: "tx" | "address" | "sha256";
  explorerUrl?: string;
  showFull?: boolean;
  className?: string;
  label?: string;
}

const prefixMap: Record<NonNullable<HashDisplayProps["type"]>, string> = {
  tx: "0x",
  address: "0x",
  sha256: "",
};

function truncate(hash: string) {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function HashDisplay({
  hash,
  type = "tx",
  explorerUrl,
  showFull = false,
  className,
  label,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);
  const display = showFull ? hash : truncate(hash);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {label && (
        <span className="font-mono text-faint uppercase tracking-wider text-[10px]">
          {label}
        </span>
      )}
      <Tooltip content={hash}>
        <span className="chip !text-[11px] !text-ink">
          {prefixMap[type]}{display}
        </span>
      </Tooltip>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy hash"
        className="p-1 rounded text-faint hover:text-accent transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-ok" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on explorer"
          className="p-1 rounded text-faint hover:text-accent-deep transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export default HashDisplay;
