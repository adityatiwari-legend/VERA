'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, MapPin, AlertCircle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { card, btnPrimary, input, labelText } from '@/components/console/ui';

export default function ReportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; explorer_url: string | null } | null>(null);

  const pickPhoto = (f: File | null) => {
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not available in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not read GPS — allow location access')
    );
  };

  const submit = async () => {
    if (!photo || !coords || description.trim().length < 5) {
      setError('Photo, GPS location, and a short description are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('photo', photo);
      fd.append('latitude', String(coords.lat));
      fd.append('longitude', String(coords.lng));
      fd.append('description', description.trim());
      if (address.trim()) fd.append('address_label', address.trim());

      const res = await fetch('/api/hisaab/reports', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Report failed');
      } else {
        setResult({ id: data.report.id, explorer_url: data.explorer_url });
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-xl border border-ok/20 bg-ok-soft p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ok/20 bg-white">
            <CheckCircle2 className="h-5 w-5 text-ok" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink">Report filed</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ok/90">
              Gemini analyzed the photo and the report is in the public register. It needs 3
              citizen confirmations before any money can move.
            </p>
            {result.explorer_url && (
              <a
                href={result.explorer_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-[13px] font-medium text-ok underline"
              >
                View transaction on Solana Explorer
              </a>
            )}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => router.push(`/hisaab/report/${result.id}`)}
                className={btnPrimary}
              >
                Open report <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push('/hisaab')}
                className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-card transition hover:bg-mist"
              >
                Back to register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${card} space-y-6 p-6`}>
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <p className={labelText}>Photo evidence</p>
          <span className="font-mono text-[11px] text-faint">JPG, PNG or WEBP · max 50 MB</span>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-2.5 flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-mist transition hover:border-accent/40 hover:bg-accent-faint"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pothole preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-mute">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-faint">
                <Camera className="h-5 w-5 text-accent" />
              </span>
              <span className="text-sm font-medium text-ink">Capture or upload a photo</span>
              <span className="text-xs text-faint">Gemini measures severity and size automatically</span>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className={labelText}>Location</p>
          {coords && (
            <span className="font-mono text-xs text-ok">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          )}
        </div>
        <button
          onClick={locate}
          className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink shadow-card transition hover:bg-mist"
        >
          <MapPin className="h-4 w-4 text-accent" /> {coords ? 'Refresh GPS' : 'Use my location'}
        </button>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address label (e.g. MI Road, near Sanganeri Gate)"
          className={`${input} mt-2.5`}
        />
      </div>

      <div>
        <p className={labelText}>Describe the problem</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What's wrong — depth, traffic risk, since when…"
          className={`${input} mt-2.5 resize-none`}
        />
      </div>

      <button onClick={submit} disabled={loading} className={`${btnPrimary} w-full justify-center`}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Gemini is analyzing…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> File report with Gemini analysis
          </>
        )}
      </button>
    </div>
  );
}
