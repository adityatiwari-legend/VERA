'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, AlertCircle, Loader2, ShieldCheck, FileCheck, Eye } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const registered = searchParams.get('registered');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    registered
      ? 'Account created. Sign in to continue — organizations and contractors start unverified until an admin approves them.'
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // /dashboard re-routes per role (USER portal, org, contractor, auditor, admin).
      router.push(nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-14 sm:py-20">
      <div className="card grid w-full max-w-4xl overflow-hidden shadow-lift lg:grid-cols-2">
        {/* Brand band */}
        <div className="wash-hero bg-grid-fine relative hidden flex-col justify-between gap-10 p-10 lg:flex">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <div className="leading-none">
              <span className="font-sans text-lg font-bold tracking-tight text-ink">VERA</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-mute">
                Proof-gated money
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="max-w-xs text-2xl font-semibold leading-snug tracking-tight text-ink">
              Every rupee traceable. Audited before it moves.
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-mute">
              One account for the whole trust network — citizens, organizations,
              contractors, auditors, and the admin console.
            </p>
          </div>

          <ul className="space-y-2.5 text-xs text-mute">
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
              Milestone-gated escrow releases
            </li>
            <li className="flex items-center gap-2.5">
              <FileCheck className="h-4 w-4 shrink-0 text-accent" />
              SHA-256 evidence chain on every tranche
            </li>
            <li className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 shrink-0 text-accent" />
              Public audit trail — no login required
            </li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="space-y-6 p-6 sm:p-10">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark size={36} />
            <span className="font-sans text-lg font-bold tracking-tight text-ink">VERA</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in to VERA</h1>
            <p className="text-sm text-mute">
              Citizen portal, organization hub, contractor desk, auditor workspace — all from here
            </p>
          </div>

          {info && (
            <div className="flex items-start gap-2.5 rounded-lg border border-ok/20 bg-ok-soft p-3 text-xs text-ok">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-bad/20 bg-bad-soft p-3 text-xs text-bad">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="label-text">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="label-text">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full !py-2.5 !text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-mute">
            New to VERA?{' '}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
