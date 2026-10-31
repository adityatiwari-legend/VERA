'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wrench, Activity, AlertCircle, CheckCircle2, ImagePlus } from 'lucide-react';
import { card, btnPrimary } from '@/components/console/ui';

export default function RepairPanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [samples, setSamples] = useState<number[]>([]);
  const [roughMsg, setRoughMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const startDriveBy = () => {
    setSamples([]);
    setRoughMsg(null);
    let count = 0;
    setCollecting(true);

    const readings: number[] = [];
    const onMotion = (e: DeviceMotionEvent) => {
      const z = e.accelerationIncludingGravity?.z;
      if (z !== null && z !== undefined) {
        readings.push(z);
        count += 1;
        if (count % 10 === 0) setSamples([...readings]);
      }
    };
    window.addEventListener('devicemotion', onMotion);

    setTimeout(() => {
      window.removeEventListener('devicemotion', onMotion);
      setCollecting(false);
      if (count < 20) {
        setRoughMsg(
          'No accelerometer on this device — roughness was skipped. Score it from a phone, or submit without it (AI review gets flagged for manual confirmation).'
        );
        return;
      }
      submitRoughness([...readings]);
    }, 8000);
  };

  const submitRoughness = async (values: number[]) => {
    try {
      const res = await fetch('/api/hisaab/roughness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          device_label: 'phone-drive-by',
          readings: values.map((v, i) => ({
            accel_z: v,
            recorded_at: new Date(Date.now() - (values.length - i) * 500).toISOString(),
          })),
        }),
      });
      const data = await res.json();
      setRoughMsg((m) => {
        const base = m ? m + ' · ' : '';
        return `${base}Stored on ${data.store === 'TIGER_DATA' ? 'Tiger Data' : 'local fallback'}: score ${data.roughness_score?.toFixed(2)} (${data.samples} samples)`;
      });
      router.refresh();
    } catch {
      setRoughMsg('Roughness upload failed');
    }
  };

  const submitRepair = async () => {
    if (!photo) {
      setError('After-repair photo is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('report_id', reportId);
      fd.append('after_photo', photo);
      const res = await fetch('/api/hisaab/repairs', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Repair submission failed');
      else {
        setResult(data);
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${card} p-5`}>
      <p className="text-[13px] font-medium text-mute">Submit repair evidence</p>
      <p className="mt-1 font-mono text-[11px] text-faint">
        Assigned contractor · after-photo + drive-by roughness
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div className="rounded-lg bg-mist p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink">Drive-by roughness</p>
            {collecting && (
              <span className="font-mono text-xs font-medium text-accent">
                recording… {samples.length}
              </span>
            )}
          </div>
          <button
            onClick={startDriveBy}
            disabled={collecting}
            className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink transition hover:border-line-strong hover:bg-mist disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 ${collecting ? 'animate-pulse text-accent' : 'text-faint'}`} />
            {collecting ? 'Recording (8s)…' : 'Record 8s drive-by'}
          </button>
          {roughMsg && <p className="mt-2 text-xs text-mute">{roughMsg}</p>}
        </div>

        {!result ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line-strong bg-mist px-4 py-3 text-left transition hover:border-accent/40 hover:bg-accent-faint"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white shadow-card">
                <ImagePlus className="h-4 w-4 text-accent" />
              </span>
              <span className="text-[13px]">
                <span className="block font-medium text-ink">
                  {photo ? photo.name : 'Attach after-repair photo'}
                </span>
                <span className="block text-xs text-faint">
                  Gemini compares it against the original report
                </span>
              </span>
            </button>
            <button
              onClick={submitRepair}
              disabled={submitting || !photo}
              className={`${btnPrimary} mt-3 w-full justify-center`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit repair for verification
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-ok/20 bg-ok-soft p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ok">
              <CheckCircle2 className="h-4 w-4" />
              {result.verified ? 'Verified — stage 1 released' : 'Submitted — verification did not pass'}
            </p>
            {result.gemini && (
              <p className="mt-1.5 text-xs leading-relaxed text-ok/80">
                “{result.gemini.notes_hinglish}” ({(result.gemini.confidence * 100).toFixed(0)}% confidence)
              </p>
            )}
            {result.explorer_url && (
              <a
                href={result.explorer_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block font-mono text-xs font-medium text-ok underline"
              >
                Stage-1 release on Solana Explorer
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
