"use client"

import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import createGlobe from "cobe"

interface CdnMarker {
  id: string
  location: [number, number]
  region: string
}

interface CdnArc {
  id: string
  from: [number, number]
  to: [number, number]
}

interface GlobeCdnProps {
  markers?: CdnMarker[]
  arcs?: CdnArc[]
  className?: string
  speed?: number
  /** Format the live traffic chip; default renders VERA escrow volume (₹ lakh). */
  formatTraffic?: (value: number) => string
}

/**
 * VERA trust-network globe (cobe v2 + CSS anchor-positioned labels).
 *
 * Performance notes (60fps):
 *  - The WebGL globe is initialized once; effect deps are stable JSON keys, so
 *    parent re-renders never re-create the WebGL context.
 *  - The live traffic chips live in a child component with its own interval,
 *    so the ticking state never reconciles the globe subtree.
 *  - Rotation pauses while the user drags; devicePixelRatio is capped at 2.
 */

// VERA trust network: escrow hubs and settlement corridors (illustrative).
const defaultMarkers: CdnMarker[] = [
  { id: "vera-jai", location: [26.91, 75.79], region: "JAI·HQ" },
  { id: "vera-del", location: [28.61, 77.21], region: "DEL·ESC" },
  { id: "vera-bom", location: [19.08, 72.88], region: "BOM·ESC" },
  { id: "vera-blr", location: [12.97, 77.59], region: "BLR·ESC" },
  { id: "vera-sin", location: [1.35, 103.82], region: "SIN·SETTLE" },
  { id: "vera-dxb", location: [25.2, 55.27], region: "DXB·ESC" },
  { id: "vera-lon", location: [51.5, -0.12], region: "LON·AUDIT" },
  { id: "vera-nyc", location: [40.71, -74.01], region: "NYC·ESC" },
  { id: "vera-sfo", location: [37.62, -122.38], region: "SFO·DEV" },
  { id: "vera-syd", location: [-33.87, 151.21], region: "SYD·ESC" },
]

const defaultArcs: CdnArc[] = [
  { id: "vera-arc-1", from: [26.91, 75.79], to: [19.08, 72.88] },
  { id: "vera-arc-2", from: [28.61, 77.21], to: [1.35, 103.82] },
  { id: "vera-arc-3", from: [19.08, 72.88], to: [51.5, -0.12] },
  { id: "vera-arc-4", from: [12.97, 77.59], to: [25.2, 55.27] },
  { id: "vera-arc-5", from: [40.71, -74.01], to: [26.91, 75.79] },
  { id: "vera-arc-6", from: [1.35, 103.82], to: [-33.87, 151.21] },
]

const defaultTrafficSeed = [420, 380, 290, 185, 156, 134]

function formatEscrowVolume(value: number): string {
  return `₹${(value / 100).toFixed(1)}L in escrow`
}

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = "",
  speed = 0.003,
  formatTraffic = formatEscrowVolume,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)

  // Stable keys: inline marker/arc arrays from callers must not re-init WebGL.
  const markersKey = useMemo(() => JSON.stringify(markers), [markers])
  const arcsKey = useMemo(() => JSON.stringify(arcs), [arcs])
  const memoMarkers = useMemo(() => markers, [markersKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const memoArcs = useMemo(() => arcs, [arcsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        // VERA palette: accent-blue markers, violet arcs, cool paper glow.
        markerColor: [0.145, 0.388, 0.922],
        glowColor: [0.87, 0.9, 0.99],
        markerElevation: 0.02,
        markers: memoMarkers.map((m) => ({ location: m.location, size: 0.03, id: m.id })),
        arcs: memoArcs.map((a) => ({ from: a.from, to: a.to, id: a.id })),
        arcColor: [0.486, 0.227, 0.929],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.7,
      })

      function animate() {
        if (!isPausedRef.current) phi += speed
        const theta = 0.2 + thetaOffsetRef.current + dragOffset.current.theta
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          // keep the pole from flipping over the top
          theta: Math.max(-0.55, Math.min(0.95, theta)),
        })
        animationId = requestAnimationFrame(animate)
      }
      animate()
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [memoMarkers, memoArcs, speed])

  const pyramidFaceStyle = (nth: number): React.CSSProperties => {
    const transforms = [
      "rotateY(0deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(120deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(240deg) translateZ(4px) rotateX(19.5deg)",
      "rotateX(-90deg) rotateZ(60deg) translateY(4px)",
    ]
    const colors = ["#1E40AF", "#2563EB", "#7C3AED", "#312E81"]
    return {
      position: "absolute", left: -0.5, top: 0,
      width: 0, height: 0,
      borderLeft: "6.5px solid transparent",
      borderRight: "6.5px solid transparent",
      borderBottom: `13px solid ${colors[nth]}`,
      transformOrigin: "center bottom",
      transform: transforms[nth],
    }
  }

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <style>{`
        @keyframes pyramid-spin {
          0% { transform: rotateX(20deg) rotateY(0deg); }
          100% { transform: rotateX(20deg) rotateY(360deg); }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%", height: "100%", cursor: "grab", opacity: 0,
          transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none",
        }}
      />
      {memoMarkers.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            positionAnchor: `--cobe-${m.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 0",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 6,
            pointerEvents: "none" as const,
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
            transition: "opacity 0.3s, filter 0.3s",
          }}
        >
          <div style={{
            width: 12, height: 12, position: "relative",
            transformStyle: "preserve-3d" as const,
            animation: "pyramid-spin 4s linear infinite",
          }}>
            {[0, 1, 2, 3].map((n) => (
              <div key={n} style={pyramidFaceStyle(n)} />
            ))}
          </div>
          <span style={{
            fontFamily: "var(--font-mono, monospace)", fontSize: "0.55rem", color: "#1E40AF",
            background: "#fff", padding: "2px 6px", borderRadius: 3,
            border: "1px solid #DBEAFE",
            letterSpacing: "0.05em", whiteSpace: "nowrap" as const,
            boxShadow: "0 1px 3px rgba(37,99,235,0.15)",
          }}>{m.region}</span>
        </div>
      ))}
      <TrafficLabels arcs={memoArcs} format={formatTraffic} />
    </div>
  )
}

/**
 * Live escrow-volume chips. Isolated so its 250ms interval never re-renders
 * the globe subtree — the canvas keeps a clean 60fps frame loop.
 */
function TrafficLabels({
  arcs,
  format,
}: {
  arcs: CdnArc[]
  format: (value: number) => string
}) {
  const [traffic, setTraffic] = useState(() =>
    arcs.map((a, i) => ({ id: a.id, value: defaultTrafficSeed[i] || 100 }))
  )

  useEffect(() => {
    setTraffic(arcs.map((a, i) => ({ id: a.id, value: defaultTrafficSeed[i] || 100 })))
  }, [arcs])

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic((data) =>
        data.map((t) => ({
          ...t,
          value: Math.max(50, t.value + Math.floor(Math.random() * 21) - 10),
        }))
      )
    }, 250)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {traffic.map((t) => (
        <div
          key={t.id}
          style={{
            position: "absolute",
            positionAnchor: `--cobe-arc-${t.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 0",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.5rem",
            color: "#fff",
            background: "linear-gradient(135deg, #1E40AF, #7C3AED)",
            padding: "3px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap" as const,
            pointerEvents: "none" as const,
            opacity: `var(--cobe-visible-arc-${t.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-arc-${t.id}, 0)) * 8px))`,
            transition: "opacity 0.3s, filter 0.3s",
          }}
        >
          {format(t.value)}
        </div>
      ))}
    </>
  )
}

export default GlobeCdn
