'use client';

import dynamic from 'next/dynamic';
import type { MapReport } from './StreetRegisterMap';

const StreetRegisterMap = dynamic(() => import('./StreetRegisterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-line bg-mist">
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
        Loading street register…
      </p>
    </div>
  ),
});

export default function MapWrapper({ reports }: { reports: MapReport[] }) {
  return <StreetRegisterMap reports={reports} />;
}
