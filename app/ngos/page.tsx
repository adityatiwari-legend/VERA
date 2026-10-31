import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import { getNgoReputationScore } from '@/lib/reputation';
import { Building2, ArrowRight, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NgoDirectoryPage() {
  const ngosRes = await query<{
    id: string;
    name: string;
    email: string;
    created_at: string;
  }>(
    `SELECT id, name, email, created_at
     FROM users
     WHERE role = 'ORGANIZATION'
     ORDER BY created_at ASC`
  );

  const ngosWithScores = await Promise.all(
    ngosRes.rows.map(async (ngo) => {
      const reputation = await getNgoReputationScore(ngo.id);
      return {
        ...ngo,
        reputation,
      };
    })
  );

  const gradeColors: Record<string, string> = {
    'A+': 'bg-ok-soft text-ok border-ok/20',
    'A': 'bg-ok-soft text-ok border-ok/20',
    'B': 'bg-accent-faint text-accent-deep border-accent/20',
    'C': 'bg-warn-soft text-warn border-warn/25',
    'D': 'bg-bad-soft text-bad border-bad/20',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-3">
        <span className="eyebrow">VERA Registry</span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Verified NGO Directory
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mute">
          Non-profit organizations subject to deterministic, open audit metrics, verified
          evidence milestones, and multi-signature governance.
        </p>
      </div>

      {/* NGO Cards List */}
      {ngosWithScores.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 rounded-xl p-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-mute">
            <Building2 className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-ink">No NGOs registered yet</h2>
          <p className="max-w-sm text-xs text-mute">
            Registered organizations will appear here once onboarded to the VERA registry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {ngosWithScores.map((ngo) => {
            const { score, grade, badge, stats } = ngo.reputation;

            return (
              <Link
                key={ngo.id}
                href={`/ngos/${ngo.id}`}
                className="card card-hover group block rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-mist text-accent transition-colors group-hover:bg-accent-faint">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
                        {ngo.name}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-faint">
                        <Calendar className="h-3 w-3" />
                        Since{' '}
                        {new Date(ngo.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs font-bold ${gradeColors[grade] || 'border-line bg-mist text-mute'}`}
                  >
                    {grade} ({score}/100)
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                  <div className="rounded-lg border border-line bg-mist p-3 text-center">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                      Campaigns
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-ink">
                      {stats.totalCampaigns}
                    </span>
                  </div>
                  <div className="rounded-lg border border-line bg-mist p-3 text-center">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                      Milestones
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-ink">
                      {stats.milestonesCompleted} done
                    </span>
                  </div>
                  <div className="rounded-lg border border-line bg-mist p-3 text-center">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                      Approval
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-accent-deep">
                      {stats.approvalRatePercent}%
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-mute">{badge}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-accent transition-transform group-hover:translate-x-0.5">
                    View Profile <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
