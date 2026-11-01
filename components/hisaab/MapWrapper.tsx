'use client';

import { useEffect, useState } from 'react';
import type { MapReport } from './StreetRegisterMap';

export default function MapWrapper({ reports }: { reports: MapReport[] }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ reports: MapReport[] }> | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMap = async (retryCount = 0) => {
      try {
        const mod = await import('./StreetRegisterMap');
        if (active) {
          setMapComponent(() => mod.default);
        }
      } catch (err) {
        console.error('Failed to load StreetRegisterMap chunk:', err);
        if (retryCount < 2) {
          // Retry loading the chunk after a brief pause
          setTimeout(() => {
            if (active) loadMap(retryCount + 1);
          }, 800);
        } else if (active) {
          setHasError(true);
        }
      }
    };

    loadMap();

    return () => {
      active = false;
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex h-[420px] w-full flex-col items-center justify-center rounded-xl border border-line bg-mist p-6 text-center">
        <p className="font-mono text-[12px] text-ink">Unable to load interactive map.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink hover:bg-mist transition-colors"
        >
          Reload Street Register
        </button>
      </div>
    );
  }

  if (!MapComponent) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-line bg-mist">
        <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
          Loading street register…
        </p>
      </div>
    );
  }

  return <MapComponent reports={reports} />;
}
