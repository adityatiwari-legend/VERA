"use client";

import { useEffect, useRef } from 'react';

/**
 * RibbonField — the 21st.dev "Ribbon Field" gradient, rebuilt as a live canvas.
 *
 * A stripe field along `angle`: each stripe is sized by its `pos`, edges are
 * feathered by `softness`, and `wave` bends the bands with a cross-axis sine
 * offset of `(wave / 100) * 0.35 * sin(cross * 2.4 * 2π + clock)`.
 * A CSS linear-gradient is exact only when `wave` is zero — the exported CSS
 * stop table below IS that zero-wave baseline, so the defaults reproduce the
 * 21st.dev export (softness 24 is baked into the exported gap widths; the
 * `softness` prop rescales those gaps around their centres).
 *
 * Motion (per the 21st.dev motion contract):
 *   ph    = t * (speed / 100)          — elapsed-seconds clock (speed 100 → 1.0)
 *   spin  = ph * dir
 *   angle = angle + sin(spin * 0.6) * 28 * amt      (hard bands sway, never spin;
 *          amt defaults to 0.00 → the sway term is exactly 0 at ph = 0)
 *   clock = 20.75 + ph * 1.2            — the wave clock advances the bend
 * No animated value is ever quantised (no Math.round on angle/centre/stops) —
 * rounding per frame is what makes the motion visibly step. Every modulation
 * is exactly 0 at ph = 0, so the gradient never snaps when motion starts.
 *
 * Performance: renders to a small offscreen buffer (default 320px wide) and
 * upscales — the feathered/undulating look wants softness, not resolution.
 * The loop pauses offscreen (IntersectionObserver) and on hidden tabs, and
 * renders a single static frame under prefers-reduced-motion.
 *
 * Palette / params (21st.dev export, JSON seed 174074637):
 *   White #FFFFFF @18 · Sky blue #78B8F9 @57 · Ultramarine #5667FF @60 ·
 *   Iris #4D2FF9 @100 · angle 32 · softness 24 · wave 14 · grain 42 ·
 *   backdrop #0B1220 (count/spread/fade/envelope are already folded into the
 *   band table below; with a white backdrop the field matches the light CSS
 *   export exactly).
 */

const TWO_PI = Math.PI * 2; // eslint-disable-line -- reused across every frame

/** Band table transcribed from the 21st.dev CSS export (wave = 0 baseline). */
const RAMP_BAND = { color: [255, 255, 255], rampTo: 4.32 } as const; // White — ramps in from the backdrop (envelope: ramp)
const TRANSITIONS = [
  { color: [120, 184, 249], from: 33.18, to: 37.86 }, // → Sky blue #78B8F9 @57
  { color: [86, 103, 255], from: 58.14, to: 58.86 }, // → Ultramarine #5667FF @60
  { color: [77, 47, 249], from: 79.64, to: 80.0 }, // → Iris #4D2FF9 @100
] as const;

const NOISE_DATA_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.210'/%3E%3C/svg%3E\")";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface RibbonFieldProps {
  /** Positioning/size classes for the wrapper, e.g. "absolute inset-0". */
  className?: string;
  /** Extra inline styles for the wrapper (masks, etc.). */
  style?: React.CSSProperties;
  /** Overall wrapper opacity. */
  opacity?: number;
  /** Colour behind the stripe field (21st.dev `backdrop`). */
  backdrop?: string;
  /** Gradient angle in degrees (CSS convention: 0 = up, clockwise). */
  angle?: number;
  /** Stripe edge feathering, 0–100 (21st.dev `softness`; 24 = the export). */
  softness?: number;
  /** Cross-axis sine bend, 0–100 (21st.dev `wave`). */
  wave?: number;
  /** Animation speed %: ph = t * speed/100. */
  speed?: number;
  /** Angle-sway amount 0–1 (21st.dev `motionAmount`; 0 = bands sway not spin). */
  motionAmount?: number;
  /** Wave-clock phase (spec: 20.75) and rate (spec: 1.2/s). */
  clockPhase?: number;
  clockRate?: number;
  /** Offscreen render-buffer width in px (upscaled — soft by design). */
  bufferWidth?: number;
  /** Render exactly one frame at ph = 0 (also forced by prefers-reduced-motion). */
  staticFrame?: boolean;
}

export function RibbonField({
  className = '',
  style,
  opacity = 1,
  backdrop = '#0B1220',
  angle = 32,
  softness = 24,
  wave = 14,
  speed = 100,
  motionAmount = 0,
  clockPhase = 20.75,
  clockRate = 1.2,
  bufferWidth = 320,
  staticFrame = false,
}: RibbonFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen buffer — small on purpose; the upscale is the soft look.
    const buf = document.createElement('canvas');
    const bufCtx = buf.getContext('2d');
    if (!bufCtx) return;
    let bufData: ImageData | null = null;

    const backdropRgb: [number, number, number] = [
      parseInt(backdrop.slice(1, 3), 16),
      parseInt(backdrop.slice(3, 5), 16),
      parseInt(backdrop.slice(5, 7), 16),
    ];

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const reduceMotion =
      staticFrame ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      canvas.width = w;
      canvas.height = h;
      const bw = Math.max(8, Math.min(bufferWidth, w));
      const bh = Math.max(1, Math.round((bw * h) / w));
      if (buf.width !== bw || buf.height !== bh) {
        buf.width = bw;
        buf.height = bh;
        bufData = bufCtx.createImageData(bw, bh);
      }
    };

    const renderFrame = (ph: number) => {
      const bw = buf.width;
      const bh = buf.height;
      if (!bufData || bw < 1 || bh < 1) return;

      // Motion contract — every modulation is exactly 0 at ph = 0.
      const spin = ph; // dir = 1
      const angleNow = angle + Math.sin(spin * 0.6) * 28 * motionAmount; // amt = 0 → angle constant
      const clock = clockPhase + ph * clockRate; // 20.75 → 20.75 + ph * 1.2
      const bendAmp = (wave / 100) * 0.35 * 100; // bend offset in position-% units

      const theta = (angleNow * Math.PI) / 180;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      // CSS linear-gradient geometry: the gradient line spans the box at
      // `angle` (0deg = up, clockwise); 0–100% maps linearly along it.
      const axisLen = bw * Math.abs(sinT) + bh * Math.abs(cosT);
      const crossLen = bw * Math.abs(cosT) + bh * Math.abs(sinT);
      // Feather scale: the exported gaps ARE softness 24 — rescale around
      // each gap's centre for other values.
      const softScale = softness / 24;

      const px = bufData.data;
      let i = 0;
      for (let y = 0; y < bh; y++) {
        const dyp = y + 0.5 - bh / 2;
        for (let x = 0; x < bw; x++) {
          const dxp = x + 0.5 - bw / 2;
          // Rotate into gradient space (pixel-space, CSS angle convention).
          const a = dxp * sinT - dyp * cosT;
          const cross = dxp * cosT + dyp * sinT;
          const cross01 = 0.5 + cross / crossLen;
          // The wave bend — cross-axis sine offset of the band positions.
          const offset = bendAmp * Math.sin(cross01 * 2.4 * TWO_PI + clock);
          const p = 50 + (a / axisLen) * 100 + offset;

          // Backdrop → ramp → bands, transcribed from the export stops.
          let r = backdropRgb[0];
          let g = backdropRgb[1];
          let b = backdropRgb[2];
          let wgt = smoothstep(0, RAMP_BAND.rampTo, p);
          r += (RAMP_BAND.color[0] - r) * wgt;
          g += (RAMP_BAND.color[1] - g) * wgt;
          b += (RAMP_BAND.color[2] - b) * wgt;
          for (let k = 0; k < TRANSITIONS.length; k++) {
            const band = TRANSITIONS[k];
            const mid = (band.from + band.to) / 2;
            const half = ((band.to - band.from) / 2) * softScale;
            wgt = smoothstep(mid - half, mid + half, p);
            r += (band.color[0] - r) * wgt;
            g += (band.color[1] - g) * wgt;
            b += (band.color[2] - b) * wgt;
          }

          px[i++] = r;
          px[i++] = g;
          px[i++] = b;
          px[i++] = 255;
        }
      }
      bufCtx.putImageData(bufData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return; // offscreen / hidden tab → skip work
      const t = (now - start) / 1000;
      renderFrame(t * (speed / 100));
    };

    resize();
    renderFrame(0); // ph = 0 — identical to the first animated frame, no snap

    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) renderFrame(0);
    });
    ro.observe(wrap);

    if (!reduceMotion) {
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
        },
        { threshold: 0 }
      );
      io.observe(wrap);
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [angle, backdrop, bufferWidth, clockPhase, clockRate, motionAmount, softness, speed, staticFrame, wave]);

  // Positioning: when the consumer places the field with `absolute`/`fixed`
  // (in className), let their class win — Tailwind emits `.relative` after
  // `.absolute`, so a base `relative` class would override it. Only flow-placed
  // fields get an inline `relative` (needed to contain the grain layer).
  const consumerPositioned = /\b(?:absolute|fixed|sticky)\b/.test(className);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`pointer-events-none isolate overflow-hidden ${className}`}
      style={{
        ...style,
        ...(opacity !== 1 ? { opacity } : {}),
        ...(consumerPositioned ? {} : { position: 'relative' as const }),
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Bitmap grain (21st.dev `grain: 42` → 0.21 overlay), static layer. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_DATA_URL,
          backgroundSize: '120px 120px',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}

export default RibbonField;
