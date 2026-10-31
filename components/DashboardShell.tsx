'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Building2,
  FileCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  User as UserIcon,
  AlertTriangle,
  Landmark,
  HardHat,
  MapPin,
  Eye,
} from 'lucide-react';
import { User, NavCounts } from '@/types';
import { Navbar } from './Navbar';
import Footer from './Footer';

interface DashboardShellProps {
  children: React.ReactNode;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  compass: Compass,
  donations: HeartHandshake,
  report: MapPin,
  map: MapPin,
  campaigns: Building2,
  new: Building2,
  directory: Compass,
  jobs: HardHat,
  review: Eye,
  complaints: AlertTriangle,
  funds: Landmark,
  contractors: HardHat,
  vera: FileCheck,
  audit: ShieldCheck,
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<NavCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Live height of the sticky Navbar header — the sidebar pins below it, and
  // the header condenses on scroll, so the offset must follow it.
  const [chromeH, setChromeH] = useState(57);

  const handleChromeHeight = useCallback((h: number) => {
    setChromeH((prev) => (prev === h ? prev : h));
  }, []);

  // Authenticated dashboard route trees (Hisaab keeps its own console shell)
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/donor') ||
    pathname.startsWith('/org') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auditor') ||
    pathname.startsWith('/contractor');
  const isConsoleRoute = pathname.startsWith('/hisaab');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/auth/me').then((res) => (res.ok ? res.json() : null)).catch(() => null),
      fetch('/api/nav').then((res) => (res.ok ? res.json() : null)).catch(() => null),
    ]).then(([me, navData]) => {
      if (cancelled) return;
      setUser(me?.user ?? null);
      setNav(navData ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
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

  if (isConsoleRoute) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  if (!isDashboardRoute) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <div className="flex-1 w-full">{children}</div>
        <Footer />
      </div>
    );
  }

  const role = user?.role ?? 'USER';
  const items = nav?.items ?? [];
  const isPendingOrg = role === 'ORGANIZATION' && nav?.org_status === 'PENDING';
  const isPendingContractor = role === 'CONTRACTOR' && nav?.contractor_status === 'PENDING';
  const userInitial = (user?.name ?? 'V').trim().charAt(0).toUpperCase();

  const renderItem = (item: NavCounts['items'][number], collapsedSide: boolean) => {
    const Icon = ICONS[item.icon ?? 'dashboard'] ?? LayoutDashboard;
    const isActive =
      item.href === '/dashboard' || item.href === '/admin' || item.href === '/contractor' || item.href === '/auditor/dashboard'
        ? pathname === item.href
        : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        title={collapsedSide ? item.label : undefined}
        className={`group relative flex items-center gap-3 rounded-lg font-mono text-[11.5px] tracking-wide transition-all duration-150 ${
          collapsedSide ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
        } ${
          isActive
            ? 'bg-white/[0.08] font-semibold text-white ring-1 ring-inset ring-white/[0.07]'
            : 'text-night-mute hover:bg-white/[0.05] hover:text-white'
        }`}
      >
        {isActive && (
          <span className="nav-bar-accent absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
        )}
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isActive ? 'text-blue-400' : 'text-night-dim group-hover:text-blue-300'
          }`}
        />
        {!collapsedSide && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsedSide && typeof item.count === 'number' && item.count > 0 && (
          <span className="rounded-md border border-accent/25 bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-300">
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-mist text-ink">
      <Navbar onStickyHeight={handleChromeHeight} />

      <div className="relative flex w-full flex-1">
        {/* Desktop sidebar */}
        <aside
          className="theme-night sidebar-night sticky hidden shrink-0 flex-col border-r border-white/[0.08] transition-[width] duration-200 md:flex"
          style={{ top: chromeH, height: `calc(100vh - ${chromeH}px)`, width: collapsed ? 68 : 244 }}
        >
          {/* Brand + portal label + collapse */}
          <div
            className={`flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3 ${
              collapsed ? 'flex-col gap-2 px-2' : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-[0_0_18px_rgba(37,99,235,0.35)]">
              V
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1 leading-none">
                <p className="text-sm font-semibold tracking-tight text-white">VERA</p>
                <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-night-dim">
                  {role} portal
                </p>
              </div>
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

          <nav className={`flex-1 space-y-0.5 overflow-y-auto py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
            {items.map((item) => renderItem(item, collapsed))}
          </nav>

          {/* Verification / status banner */}
          {!collapsed && (isPendingOrg || isPendingContractor) && (
            <div className="mx-3 mb-2 rounded-lg border border-warn/25 bg-warn/[0.08] p-2.5 text-[10px] leading-relaxed text-warn">
              {isPendingOrg
                ? 'Organization pending verification. You can browse, but raising campaigns needs admin approval.'
                : 'Contractor account pending approval. Job offers arrive after an admin approves you.'}
            </div>
          )}

          {/* User profile & logout */}
          <div className="border-t border-white/[0.06] p-3">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-blue-300 ring-1 ring-accent/25">
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {user ? user.name : 'Session active'}
                  </p>
                  <p className="truncate font-mono text-[9.5px] text-night-dim">
                    {user ? user.email : 'VERA Protocol'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg p-1.5 text-night-mute transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-blue-300 ring-1 ring-accent/25"
                  title={user?.name ?? 'Session active'}
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
            )}
          </div>
        </aside>

        {/* Mobile header bar for dashboard */}
        <div
          className="fixed left-0 right-0 z-30 flex w-full items-center justify-between border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur md:hidden"
          style={{ top: chromeH }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-line bg-mist px-2.5 py-1.5 font-mono text-xs text-ink"
          >
            <Menu className="h-4 w-4 text-accent" />
            <span>{role} MENU</span>
          </button>
          <div className="font-mono text-[11px] text-mute">{user?.name || 'VERA Dashboard'}</div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="theme-night sidebar-night animate-slide-in relative z-10 flex h-full w-72 max-w-[80vw] flex-col border-r border-white/[0.08]">
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                  V
                </span>
                <div className="min-w-0 flex-1 leading-none">
                  <p className="text-sm font-semibold tracking-tight text-white">VERA</p>
                  <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-night-dim">
                    {role} portal
                  </p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-night-mute hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
                {items.map((item) => renderItem(item, false))}
              </nav>

              {nav && (
                <Link
                  href="/notifications"
                  className="group mx-3 mb-2 flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-[11.5px] tracking-wide text-night-mute transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  <Bell className="h-4 w-4 shrink-0 text-night-dim group-hover:text-blue-300" />
                  Notifications
                </Link>
              )}

              <div className="border-t border-white/[0.06] p-3">
                <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-blue-300 ring-1 ring-accent/25">
                    {userInitial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {user ? user.name : 'Session active'}
                    </p>
                    <p className="truncate font-mono text-[9.5px] text-night-dim">
                      {user ? user.email : 'VERA Protocol'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 font-mono text-xs text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main workspace area */}
        <main className="w-full flex-1 overflow-x-hidden p-4 pt-16 sm:p-6 md:pt-6 lg:p-8">
          {/* keyed by route so the entrance animation replays on every navigation */}
          <div key={pathname} className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
