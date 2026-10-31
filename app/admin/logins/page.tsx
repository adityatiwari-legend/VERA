import Link from 'next/link';
import { LogIn, ShieldAlert, Users } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FILTERS = ['ALL', 'SUCCESS', 'FAILED'] as const;

export default async function AdminLoginsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = FILTERS.includes((searchParams.filter ?? 'ALL') as any)
    ? searchParams.filter ?? 'ALL'
    : 'ALL';

  const [statsRes, eventsRes] = await Promise.all([
    query<{
      logins_24h: string;
      users_24h: string;
      failed_24h: string;
      total: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE success AND created_at > NOW() - INTERVAL '24 hours')::text AS logins_24h,
         COUNT(DISTINCT user_id) FILTER (WHERE success AND created_at > NOW() - INTERVAL '24 hours')::text AS users_24h,
         COUNT(*) FILTER (WHERE NOT success AND created_at > NOW() - INTERVAL '24 hours')::text AS failed_24h,
         COUNT(*)::text AS total
       FROM login_events`
    ),
    query(
      `SELECT e.id, e.email, e.role, e.method, e.success, e.reason, e.ip_address, e.user_agent, e.created_at,
              u.name AS user_name
       FROM login_events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ($1::text = 'ALL' OR ($1::text = 'SUCCESS' AND e.success) OR ($1::text = 'FAILED' AND NOT e.success))
       ORDER BY e.created_at DESC
       LIMIT 200`,
      [filter]
    ),
  ]);

  const stats = statsRes.rows[0];
  const events = eventsRes.rows as any[];

  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · LOGIN AUDIT</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Login activity</h1>
        <p className="mt-1 text-sm text-mute">
          Every login attempt across the web console and the mobile API — successes and failures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Successful logins · 24h"
          value={Number(stats?.logins_24h ?? 0)}
          subtext={`${Number(stats?.users_24h ?? 0)} distinct accounts signed in`}
          icon={<LogIn className="h-4 w-4" />}
          accent="mint"
        />
        <StatCard
          label="Failed attempts · 24h"
          value={Number(stats?.failed_24h ?? 0)}
          subtext="Unknown emails or wrong passwords"
          icon={<ShieldAlert className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Events recorded"
          value={Number(stats?.total ?? 0)}
          subtext="All-time login audit trail"
          icon={<Users className="h-4 w-4" />}
          accent="cyan"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/logins?filter=${f}`}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              filter === f
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-white text-mute hover:border-accent/40 hover:text-accent'
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-mist/60 font-mono text-[10px] uppercase tracking-wider text-mute">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">IP / client</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-mist/50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-mute">
                  {fmtTime(e.created_at)}
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate font-medium text-ink">{e.user_name ?? '—'}</p>
                  <p className="truncate font-mono text-[10px] text-mute">{e.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-mute">{e.role ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      e.method === 'API'
                        ? 'border-lav-deep/25 bg-lav-soft text-lav-deep'
                        : 'border-accent/30 bg-accent-faint text-accent-deep'
                    }`}
                  >
                    {e.method}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {e.success ? (
                    <span className="rounded-full border border-ok/20 bg-ok-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-ok">
                      SUCCESS
                    </span>
                  ) : (
                    <span className="rounded-full border border-bad/25 bg-bad-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-bad">
                      FAILED{e.reason ? ` · ${e.reason}` : ''}
                    </span>
                  )}
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <p className="truncate font-mono text-[10px] text-mute">{e.ip_address ?? '—'}</p>
                  <p className="truncate font-mono text-[10px] text-faint">{e.user_agent ?? ''}</p>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-mute">
                  No login events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
