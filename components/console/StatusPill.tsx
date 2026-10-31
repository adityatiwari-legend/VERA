import { pill, statusPill } from './ui';

export default function StatusPill({ status }: { status: string }) {
  const cls = statusPill[status] ?? 'bg-mist text-mute border-line';
  return <span className={`${pill} ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}
