export default function RoughnessSparkline({ values }: { values: number[] }) {
  if (!values.length) return null;

  const w = 560;
  const h = 90;
  const max = Math.max(...values.map(Math.abs), 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;

  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h / 2 - (v / max) * (h / 2 - 6)).toFixed(1)}`)
    .join(' ');

  const score = values.reduce((a, b) => a + Math.abs(b), 0) / values.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-mute">Road roughness</p>
        <p className="font-mono text-xs text-faint">
          score {score.toFixed(2)} · {values.length} samples
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-24 w-full rounded-xl border border-line bg-mist">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="#E5E7EB" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
