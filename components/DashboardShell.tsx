'use client';

import React, { useState, useEffect } from 'react';
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
import RibbonField from '@/components/ui/ribbon-field';

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
        className={`flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-[11.5px] transition-all ${
          isActive
            ? 'bg-white/[0.09] font-semibold text-white'
            : 'text-night-mute hover:bg-white/[0.05] hover:text-white'
        }`}
        title={collapsedSide ? item.label : undefined}
      >
        <span className="relative flex shrink-0 items-center">
          <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} />
          {isActive && <span className="absolute -left-3 h-4 w-[2px] rounded-r bg-accent" />}
        </span>
        {!collapsedSide && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsedSide && typeof item.count === 'number' && item.count > 0 && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-mist text-ink">
      <Navbar />

      <div className="relative flex w-full flex-1">
        {/* Desktop sidebar */}
        <aside
          className={`theme-night sticky top-[57px] hidden h-[calc(100vh-57px)] shrink-0 flex-col border-r border-white/[0.08] bg-night transition-all duration-200 md:flex ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Ribbon Field ambient — the platform's signature gradient, fading
              out down the sidebar. Painted behind all content (z -1; the
              sticky aside creates the stacking context). */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: -1 }}>
            <RibbonField
              className="h-full w-full opacity-40"
              style={{
                maskImage: 'radial-gradient(ellipse 130% 42% at 50% 0%, black 30%, transparent 92%)',
                WebkitMaskImage: 'radial-gradient(ellipse 130% 42% at 50% 0%, black 30%, transparent 92%)',
              }}
            />
          </div>
          <div className="flex items-center justify-between border-b border-white/[0.08] p-3.5">
            {!collapsed && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night-mute">
                {role} portal
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto rounded-lg p-1.5 text-night-mute transition-colors hover:bg-white/[0.06] hover:text-white"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {items.map((item) => renderItem(item, collapsed))}
          </nav>

          {/* Verification / status banner */}
          {!collapsed && (isPendingOrg || isPendingContractor) && (
            <div className="mx-3 mb-2 rounded-lg border border-warn/30 bg-warn-soft/40 p-2.5 text-[10px] leading-relaxed text-warn">
              {isPendingOrg
                ? 'Organization pending verification. You can browse, but raising campaigns needs admin approval.'
                : 'Contractor account pending approval. Job offers arrive after an admin approves you.'}
            </div>
          )}

          {/* User profile & logout */}
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] p-3">
            {!collapsed ? (
              <>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
                    <UserIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {user ? user.name : 'Session active'}
                    </p>
                    <p className="truncate font-mono text-[10px] text-night-mute">
                      {user ? user.email : 'VERA Protocol'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg p-1.5 text-night-mute transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full py-2 text-center text-night-mute transition-colors hover:text-rose-400"
                title="Sign out"
              >
                <LogOut className="mx-auto h-4 w-4" />
              </button>
            )}
          </div>
        </aside>

        {/* Mobile header bar for dashboard */}
        <div className="fixed top-[57px] left-0 right-0 z-30 flex w-full items-center justify-between border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
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
            <div className="theme-night relative z-10 flex h-full w-72 max-w-[80vw] flex-col space-y-4 border-r border-white/[0.08] bg-night p-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  {role} navigation
                </span>
                <button onClick={() => setMobileOpen(false)} className="p-1 text-night-mute hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {items.map((item) => renderItem(item, false))}
              </nav>

              {nav && (
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs text-night-mute hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              )}

              <div className="space-y-3 border-t border-white/[0.08] pt-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 font-mono text-xs text-rose-300"
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
