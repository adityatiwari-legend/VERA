'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, AlertCircle, Loader2, ShieldCheck, FileCheck, Eye } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

type RegisterRole = 'USER' | 'ORGANIZATION' | 'CONTRACTOR';

const ORG_TYPES = [
  { value: 'NGO', label: 'NGO' },
  { value: 'TRUST', label: 'Trust' },
  { value: 'CSR', label: 'Corporate CSR' },
  { value: 'SCHOOL', label: 'School' },
  { value: 'RWA', label: 'RWA / Community' },
  { value: 'OTHER', label: 'Other' },
];

const ROLE_META: Record<RegisterRole, { title: string; blurb: string }> = {
  USER: {
    title: 'Citizen',
    blurb: 'Donate, report road issues, confirm complaints, trace every rupee.',
  },
  ORGANIZATION: {
    title: 'Organization',
    blurb: 'Raise funds for campaigns under public, evidence-first audit.',
  },
  CONTRACTOR: {
    title: 'Contractor',
    blurb: 'Take assigned road-repair jobs and get paid from on-chain escrow.',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('USER');
  const [orgType, setOrgType] = useState('NGO');
  const [orgRegistrationNo, setOrgRegistrationNo] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, string> = { name, email, password, role };
      if (role === 'ORGANIZATION') {
        payload.org_type = orgType;
        if (orgRegistrationNo.trim()) payload.org_registration_no = orgRegistrationNo.trim();
      }
      if (role === 'CONTRACTOR' && serviceArea.trim()) {
        payload.service_area = serviceArea.trim();
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/login?registered=1');
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
              One network. Every role accountable.
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-mute">
              Citizens report and fund. Organizations raise under audit.
              Contractors build. Auditors verify. Every rupee traceable.
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
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Join VERA</h1>
            <p className="text-sm text-mute">
              One login for every role on the trust network
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-bad/20 bg-bad-soft p-3 text-xs text-bad">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <span className="label-text">Account Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_META) as RegisterRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-2 py-2 font-mono text-xs font-semibold transition-all ${
                      role === r
                        ? 'border-accent bg-accent-faint text-accent-deep'
                        : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    {ROLE_META[r].title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-mute">{ROLE_META[role].blurb}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-name" className="label-text">
                {role === 'ORGANIZATION' ? 'Organization Name' : 'Full Name'}
              </label>
              <input
                id="register-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'ORGANIZATION' ? 'e.g. Clean Earth Foundation' : 'e.g. Aarav Sharma'}
                className="input"
              />
            </div>

            {role === 'ORGANIZATION' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="register-org-type" className="label-text">
                    Organization Type
                  </label>
                  <select
                    id="register-org-type"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="input"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="register-org-reg" className="label-text">
                    Registration / Darpan No. <span className="text-mute">(optional)</span>
                  </label>
                  <input
                    id="register-org-reg"
                    type="text"
                    value={orgRegistrationNo}
                    onChange={(e) => setOrgRegistrationNo(e.target.value)}
                    placeholder="e.g. RJ/2019/0123456"
                    className="input"
                  />
                </div>
              </>
            )}

            {role === 'CONTRACTOR' && (
              <div className="space-y-1.5">
                <label htmlFor="register-service-area" className="label-text">
                  Service Area <span className="text-mute">(optional)</span>
                </label>
                <input
                  id="register-service-area"
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Jaipur — Zone 3, roads & potholes"
                  className="input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="register-email" className="label-text">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                className="input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-password" className="label-text">
                Password (min 6 characters)
              </label>
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
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
                  <UserPlus className="h-4 w-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-mute">
            Already registered?{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
