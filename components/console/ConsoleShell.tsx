'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import {
  MapPin,
  Plus,
  ShieldCheck,
  LogIn,
  LogOut,
  Compass,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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

function NavItem({
  href,
  name,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? name : undefined}
      className={`group relative flex items-center gap-3 rounded-lg font-mono text-[11.5px] tracking-wide transition-all duration-150 ${
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
      } ${
        active
          ? 'bg-white/[0.08] font-semibold text-white ring-1 ring-inset ring-white/[0.07]'
          : 'text-night-mute hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      {active && (
        <span className="nav-bar-accent absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
      )}
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? 'text-blue-400' : 'text-night-dim group-hover:text-blue-300'
        }`}
      />
      {!collapsed && <span className="truncate">{name}</span>}
    </Link>
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
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const i = health?.integrations ?? {};
  const userInitial = (user?.name ?? 'V').trim().charAt(0).toUpperCase();

  const sidebarWidth = collapsed ? 68 : 244;

  const sidebar = (
    <aside
      className="theme-night sidebar-night fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/[0.08] transition-[width] duration-200 lg:flex"
      style={{ width: sidebarWidth }}
    >
      {/* Brand + console label + collapse */}
      <div
        className={`flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3.5 ${
          collapsed ? 'flex-col gap-2 px-2' : ''
        }`}
      >
        <Link href="/" className="shrink-0 rounded-lg shadow-[0_0_18px_rgba(37,99,235,0.35)]" title="VERA">
          <BrandMark size={32} />
        </Link>
        {!collapsed && (
          <Link href="/" className="min-w-0 flex-1 leading-none">
            <span className="block text-sm font-semibold tracking-tight text-white">VERA</span>
            <span className="mt-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-night-dim">
              Hisaab console
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`shrink-0 rounded-lg p-1.5 text-night-mute transition-colors hover:bg-white/[0.06] hover:text-white ${
            collapsed ? '' : 'ml-auto'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className={`flex-1 space-y-5 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-dim">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  name={item.name}
                  icon={item.icon}
                  active={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Cross-module links into VERA Core */}
        <div>
          {!collapsed && (
            <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-dim">
              VERA Core
            </p>
          )}
          <div className="space-y-0.5">
            <NavItem
              href="/campaigns"
              name="Browse campaigns"
              icon={Compass}
              active={pathname.startsWith('/campaigns')}
              collapsed={collapsed}
            />
            {user?.role === 'ADMIN' && (
              <NavItem
                href="/admin"
                name="Admin console"
                icon={ShieldCheck}
                active={pathname.startsWith('/admin')}
                collapsed={collapsed}
              />
            )}
          </div>
        </div>
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-dim">
            Network status
          </p>
          <Dot ok={Boolean(i.solana_program)} label={solanaLabel(health)} />
          <Dot ok={Boolean(i.gemini_vision)} label="Gemini vision" />
          <Dot ok={Boolean(i.tiger_data)} label="Tiger Data" />
        </div>
      )}

      <div className="border-t border-white/[0.06] p-3">
        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-blue-300 ring-1 ring-accent/25"
                title={user.name}
              >
                {userInitial}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-night-mute transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-blue-300 ring-1 ring-accent/25">
                {userInitial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">
                  {user.name}
                </span>
                <span className="block font-mono text-[9.5px] uppercase tracking-wider text-night-dim">
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-lg p-1.5 text-night-mute transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )
        ) : (
          <Link
            href="/login"
            className={`flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 font-mono text-[11.5px] text-night-mute transition hover:bg-white/[0.05] hover:text-white ${
              collapsed ? 'px-0' : ''
            }`}
            title={collapsed ? 'Sign in' : undefined}
          >
            <LogIn className="h-4 w-4" /> {!collapsed && 'Sign in'}
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-mist font-sans text-ink">
      {sidebar}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size={28} />
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
          <Link
            href="/campaigns"
            className="rounded-lg border border-line bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-mute transition-colors hover:border-line-strong hover:text-ink"
          >
            Campaigns
          </Link>
        </div>
      </div>

      <main className={collapsed ? 'lg:pl-[68px]' : 'lg:pl-60'}>
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
