"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";


export default function Footer() {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace("GMT", "UTC"));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'Explore campaigns', href: '/campaigns' },
        { label: 'Organization directory', href: '/ngos' },
        { label: 'Hisaab of the Road', href: '/hisaab' },
      ],
    },
    {
      title: 'Get involved',
      links: [
        { label: 'Sign in', href: '/login' },
        { label: 'Create an account', href: '/register' },
        { label: 'Report a road issue', href: '/hisaab/report/new' },
        { label: 'My donations', href: '/donor/donations' },
      ],
    },
  ];

  return (
    <footer className="theme-night relative border-t border-white/[0.08] bg-night text-night-mute">
      <div className="pointer-events-none absolute inset-0 bg-grid-night opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                V
              </span>
              <span className="font-sans text-lg font-bold tracking-tight text-white">VERA</span>
              <span className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-blue-300">
                PROTOCOL
              </span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed">
              Every rupee traceable. Audited before it moves. VERA locks earmarked capital
              in escrow and releases it only against verified proof — donation campaigns on
              Ethereum, civic road repairs on Solana.
            </p>
            <div className="space-y-1 font-mono text-[10px] uppercase tracking-wider">
              <div className="text-night-dim">SYSTEM TIME (UTC)</div>
              <div className="text-sm font-semibold tracking-wider text-white">
                {currentTime || '· · ·'}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-dim">
                {col.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-night-mute transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Modules */}
          <div className="md:col-span-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-dim">
              Two chains, one standard
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-semibold text-white">VERA CORE</span>
                  <span className="text-blue-300">ETHEREUM</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-night-mute">
                  Milestone escrow · 2-of-3 multisig release · hash-chained audit log
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-semibold text-white">HISAAB</span>
                  <span className="text-blue-300">SOLANA ESCROW</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-night-mute">
                  Pothole escrow · 3-citizen confirmation · durability hold enforced on-chain
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pt-6 font-mono text-[10px] text-night-dim sm:flex-row">
          <div>© {new Date().getFullYear()} VERA — PROOF-GATED MONEY</div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>ALL CHAINS ARE TESTNET / DEVNET — NO REAL FUNDS MOVE</span>
            <span className="hidden sm:inline">•</span>
            <span>SHA-256 AUDIT ARCHITECTURE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
