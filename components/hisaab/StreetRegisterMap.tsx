'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

export interface MapReport {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  severity: string | null;
  address_label: string | null;
  confirmations_count: number;
}

// Marker colors mirror the design-system tokens: warn / accent / lav-deep / violet-700 / ok / bad.
const STATUS_COLORS: Record<string, string> = {
  OPEN: '#B45309',
  CONFIRMED: '#2563EB',
  ESCALATED: '#7C3AED',
  REPAIR_SUBMITTED: '#6D28D7',
  VERIFIED: '#15803D',
  PAID: '#15803D',
  REJECTED: '#B91C1C',
};

export default function StreetRegisterMap({ reports }: { reports: MapReport[] }) {
  const center: [number, number] = reports.length
    ? [Number(reports[0].latitude), Number(reports[0].longitude)]
    : [26.9124, 75.7873]; // Jaipur default

  return (
    <div className="h-[460px] w-full overflow-hidden rounded-xl border border-line">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((r) => (
          <CircleMarker
            key={r.id}
            center={[Number(r.latitude), Number(r.longitude)]}
            radius={8}
            pathOptions={{
              color: STATUS_COLORS[r.status] || '#2563EB',
              fillColor: STATUS_COLORS[r.status] || '#2563EB',
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wide">
                {r.status} · {r.severity ?? '?'}
              </span>
            </Tooltip>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-ink">
                  {r.address_label || 'Pothole report'}
                </p>
                <p className="mt-1 font-mono text-[11px] text-mute">
                  {r.confirmations_count}/3 confirmations · {r.status}
                </p>
                <Link
                  href={`/hisaab/report/${r.id}`}
                  className="mt-1 inline-block font-semibold text-accent underline"
                >
                  Open report →
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
