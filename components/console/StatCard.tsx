import React from 'react';
import { card, toneClasses } from './ui';

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof toneClasses;
}) {
  const t = toneClasses[tone] ?? toneClasses.indigo;
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-mute">{label}</p>
          <p className="mt-2 font-mono text-[26px] font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.box}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {sub && <div className="mt-2 text-xs text-faint">{sub}</div>}
    </div>
  );
}
