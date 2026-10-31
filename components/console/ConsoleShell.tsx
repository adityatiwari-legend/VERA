'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Plus,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { card } from './ui';
import RibbonField from '@/components/ui/ribbon-field';

interface Health {
  integrations: Record<string, boolean>;
  solana_network?: string;
}

function solanaLabel(h: Health | null): string {
  const net = h?.solana_network || '';
  if (/localhost|127\.0\.0\.1/.test(net) || net === 'localnet') return 'Solana localnet';
  if (net.includes('devnet')) return 'Solana devnet';
  if (net.includes('mainnet')) return 'Solana mainnet';
  return net ? `Solana (${net.slice(0, 24)})` : 'Solana';
}

const NAV = [
  {
    section: 'Hisaab',
    items: [
      { name: 'Street Register', href: '/hisaab', icon: MapPin, exact: true },
      { name: 'Report a pothole', href: '/hisaab/report/new', icon: Plus, exact: true },
    ],
  },
];

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-night-mute">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/25'}`}
        />
        <span className={ok ? 'text-night-mute' : 'text-night-dim'}>
          {ok ? 'Live' : 'Off'}
        </span>
      </span>
    </div>
  );
}

export default function ConsoleShell({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  const i = health?.integrations ?? {};

  const sidebar = (
    <aside className="theme-night fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.08] bg-night px-4 py-5 lg:flex">
      {/* Ribbon Field ambient — the platform's signature gradient, fading out
          down the sidebar. Painted behind all content (z -1; the fixed aside
          creates the stacking context). */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: -1 }}>
        <RibbonField
          className="h-full w-full opacity-40"
          style={{
            maskImage: 'radial-gradient(ellipse 130% 42% at 50% 0%, black 30%, transparent 92%)',
            WebkitMaskImage: 'radial-gradient(ellipse 130% 42% at 50% 0%, black 30%, transparent 92%)',
          }}
        />
      </div>
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          V
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">VERA</span>
          <span className="block text-[10px] text-night-dim">Proof-gated money</span>
        </span>
      </Link>

      <nav className="mt-8 flex-1 space-y-6">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-dim">
              {group.section}
            </p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-[11.5px] transition-all ${
                      active
                        ? 'bg-white/[0.09] font-semibold text-white'
                        : 'text-night-mute hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span className="relative flex shrink-0 items-center">
                      <Icon className={`h-4 w-4 ${active ? 'text-blue-400' : ''}`} />
                      {active && (
                        <span className="absolute -left-3 h-4 w-[2px] rounded-r bg-accent" />
                      )}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-dim">
          Network status
        </p>
        <Dot ok={Boolean(i.solana_program)} label={solanaLabel(health)} />
        <Dot ok={Boolean(i.gemini_vision)} label="Gemini vision" />
        <Dot ok={Boolean(i.tiger_data)} label="Tiger Data" />
      </div>

      {user ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/15 text-xs font-semibold text-blue-300">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-white">
              {user.name}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-night-dim">
              {user.role}
            </span>
          </span>
        </div>
      ) : (
        <Link
          href="/login"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 font-mono text-[11.5px] text-night-mute transition hover:bg-white/[0.05] hover:text-white"
        >
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-mist font-sans text-ink">
      {sidebar}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            V
          </span>
          <span className="text-sm font-semibold text-ink">VERA</span>
        </Link>
        <div className="ml-auto flex gap-1.5 overflow-x-auto">
          <Link
            href="/hisaab"
            className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              pathname.startsWith('/hisaab')
                ? 'border-accent/25 bg-accent-faint font-semibold text-accent-deep'
                : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
            }`}
          >
            Hisaab
          </Link>
        </div>
      </div>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-10">
          {/* keyed by route so the entrance animation replays on every navigation */}
          <div key={pathname} className="animate-fade-in">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {breadcrumb && (
                <nav className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                  {breadcrumb.map((b, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="text-line-strong">/</span>}
                      <span className={idx === breadcrumb.length - 1 ? 'text-mute' : ''}>
                        {b}
                      </span>
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mute">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </header>

          <div className="mt-8">{children}</div>

          <footer className="mt-14 flex flex-col gap-2 border-t border-line pt-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <span>VERA Console — every escrow releases only against verified proof.</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Hash-chained audit trail
            </span>
          </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
