"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  ShieldCheck,
  LogOut,
  Building2,
  Menu,
  X,
  Layers,
  MapPin,
  Bell,
} from "lucide-react";
import { User } from "@/types";
import { BrandMark } from "@/components/BrandMark";
import { LiquidNavbar, type LiquidNavItem } from "@/components/ui/liquid-glass-navbar";

export function Navbar({ onStickyHeight }: { onStickyHeight?: (h: number) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const headerRef = React.useRef<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);
  const [chain, setChain] = useState<{ network: string; blockNumber: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real chain state, fetched once. Nothing here is simulated —
  // if the API can't reach a node, the telemetry simply doesn't render.
  useEffect(() => {
    fetch('/api/blockchain/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.network && data?.blockNumber) {
          setChain({ network: String(data.network).toUpperCase(), blockNumber: Number(data.blockNumber) });
        }
      })
      .catch(() => {});

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch active user session + unread notification count
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          fetch('/api/notifications?unread=true')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setUnread(Number(d?.unread ?? 0)))
            .catch(() => {});
        } else {
          setUser(null);
          setUnread(0);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, [pathname]);

  // Report the sticky header's live height so dashboard sidebars can offset
  // against it (the header condenses on scroll — a fixed offset would leak a gap).
  useEffect(() => {
    if (!onStickyHeight || !headerRef.current) return;
    const el = headerRef.current;
    const report = () => onStickyHeight(Math.round(el.getBoundingClientRect().height));
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onStickyHeight]);

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

  const isPublicPage = pathname === '/';

  const roleLink =
    user?.role === 'ADMIN'
      ? { href: '/admin', label: 'Admin console' }
      : user?.role === 'AUDITOR'
        ? { href: '/auditor/dashboard', label: 'Auditor hub' }
        : user?.role === 'ORGANIZATION'
          ? { href: '/org/campaigns', label: 'Org hub' }
          : user?.role === 'CONTRACTOR'
            ? { href: '/contractor', label: 'Contractor desk' }
            : { href: '/dashboard', label: 'My VERA' };

  /* Desktop water-pill nav — same destinations as the mobile menu. */
  const navItems: LiquidNavItem[] = React.useMemo(() => {
    const base: LiquidNavItem[] = [
      { label: 'Campaigns', href: '/campaigns', icon: <Compass className="h-[18px] w-[18px]" />, fx: 'glow' },
      ...(isPublicPage
        ? [{ label: 'How it works', href: '/#pipeline', icon: <Layers className="h-[18px] w-[18px]" />, fx: 'wave' } as LiquidNavItem]
        : []),
      { label: 'Organizations', href: '/ngos', icon: <Building2 className="h-[18px] w-[18px]" />, fx: 'spin' },
      { label: 'Hisaab', href: '/hisaab', icon: <MapPin className="h-[18px] w-[18px]" />, fx: 'drop' },
    ];
    if (user) {
      base.push({ label: roleLink.label, href: roleLink.href, icon: <ShieldCheck className="h-[18px] w-[18px]" />, fx: 'pop' });
    }
    return base;
  }, [isPublicPage, user, roleLink.href, roleLink.label]);

  const activeIndex = navItems.findIndex(
    (it) => it.href !== '/#pipeline' && pathname.startsWith(it.href ?? '###')
  );

  return (
    <>
      {/* 1. Slim chain-status micro-bar — real state only */}
      <div className="theme-night relative z-40 w-full overflow-hidden border-b border-white/[0.08] bg-night px-4 py-1.5 font-mono text-[10px] tracking-wider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-night-mute">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${chain ? 'bg-blue-400 animate-pulse-dot' : 'bg-night-dim'}`} />
              <span className="font-semibold text-white">{chain ? chain.network : 'VERA PROTOCOL'}</span>
            </span>
            {chain && (
              <>
                <span className="text-night-dim">/</span>
                <span>BLOCK #{chain.blockNumber.toLocaleString('en-US')}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-night-mute">
            <span className="hidden sm:inline">EVERY ESCROW RELEASES ONLY AGAINST VERIFIED PROOF</span>
            <span className="text-blue-400">PUBLIC AUDIT — NO LOGIN REQUIRED</span>
          </div>
        </div>
      </div>

      {/* 2. Main sticky navigation — frosted bar; border, shadow and padding
          condense once the page scrolls (the single scroll animation) */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-30 w-full border-b bg-white/85 backdrop-blur-md transition-all duration-300 ${
          isScrolled ? 'border-line shadow-sm' : 'border-transparent'
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
            isScrolled ? 'py-2' : 'py-3'
          }`}
        >
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-2.5">
            <BrandMark size={32} className="transition-transform group-hover:scale-105" />
            <span className="flex flex-col leading-none">
              <span className="flex items-center gap-1.5">
                <span className="font-sans text-lg font-bold tracking-tight text-ink">
                  VERA
                </span>
                <span className="chip">v0.3</span>
              </span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-mute">
                Proof-gated money
              </span>
            </span>
          </Link>

          {/* Desktop water-pill nav */}
          <div className="hidden lg:block">
            <LiquidNavbar
              items={navItems}
              active={activeIndex}
              tone="light"
            />
          </div>

          {/* Right actions */}
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <div className="flex items-center gap-2.5 border-l border-line pl-3">
                <Link
                  href="/notifications"
                  className="relative rounded-lg p-1.5 text-mute transition-colors hover:bg-mist hover:text-ink"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent-deep ring-1 ring-accent/20">
                  {(user.name ?? 'V').trim().charAt(0).toUpperCase()}
                </span>
                <div className="text-right leading-none">
                  <p className="text-xs font-semibold text-ink">{user.name}</p>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-accent">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="rounded-lg p-1.5 text-mute transition-colors hover:bg-bad-soft hover:text-bad"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              !loadingUser && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 font-mono text-xs font-medium text-mute transition-colors hover:bg-mist hover:text-ink"
                  >
                    Sign in
                  </Link>
                  <Link href="/register" className="btn-primary !px-4 !py-2 !text-xs">
                    Get started
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-mute transition-colors hover:text-ink lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-line bg-white px-4 py-4 lg:hidden">
            <nav className="space-y-1 font-mono text-xs">
              <Link href="/campaigns" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                <Compass className="h-4 w-4 text-accent" />
                <span>Explore campaigns</span>
              </Link>
              <Link href="/ngos" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                <Building2 className="h-4 w-4 text-accent" />
                <span>Organizations</span>
              </Link>
              <Link href="/hisaab" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                <MapPin className="h-4 w-4 text-accent" />
                <span>Hisaab of the Road</span>
              </Link>
              {isPublicPage && (
                <Link href="/#pipeline" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                  <Layers className="h-4 w-4 text-accent" />
                  <span>How VERA works</span>
                </Link>
              )}

              {user && (
                <Link href={roleLink.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>{roleLink.label}</span>
                </Link>
              )}
              {user && (
                <Link href="/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-ink hover:bg-mist">
                  <Bell className="h-4 w-4 text-accent" />
                  <span>Notifications {unread > 0 ? `(${unread})` : ''}</span>
                </Link>
              )}

              {user ? (
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div>
                    <p className="font-semibold text-ink">{user.name}</p>
                    <p className="font-mono text-[10px] text-accent">{user.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 text-bad"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary flex-1 !py-2 !text-xs"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary flex-1 !py-2 !text-xs"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;
