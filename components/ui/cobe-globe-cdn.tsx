"use client"

import { useEffect, useRef, useCallback, useMemo } from "react"
import createGlobe from "cobe"

interface CdnMarker {
  id: string
  location: [number, number]
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
}

/**
 * VERA decorative globe (cobe v2). Abstract network dots and arcs — it
 * intentionally renders NO data; every real figure on the page comes from
 * the ledger queries.
 *
 * Performance notes (60fps):
 *  - The WebGL globe is initialized once; effect deps are stable JSON keys, so
 *    parent re-renders never re-create the WebGL context.
 *  - The live traffic chips live in a child component with its own interval,
 *    so the ticking state never reconciles the globe subtree.
 *  - Rotation pauses while the user drags; devicePixelRatio is capped at 2.
 */

// Decorative network geometry — markers and arcs carry no data claims.
const defaultMarkers: CdnMarker[] = [
  { id: "vera-jai", location: [26.91, 75.79] },
  { id: "vera-del", location: [28.61, 77.21] },
  { id: "vera-bom", location: [19.08, 72.88] },
  { id: "vera-blr", location: [12.97, 77.59] },
  { id: "vera-sin", location: [1.35, 103.82] },
  { id: "vera-dxb", location: [25.2, 55.27] },
  { id: "vera-lon", location: [51.5, -0.12] },
  { id: "vera-nyc", location: [40.71, -74.01] },
  { id: "vera-sfo", location: [37.62, -122.38] },
  { id: "vera-syd", location: [-33.87, 151.21] },
]

const defaultArcs: CdnArc[] = [
  { id: "vera-arc-1", from: [26.91, 75.79], to: [19.08, 72.88] },
  { id: "vera-arc-2", from: [28.61, 77.21], to: [1.35, 103.82] },
  { id: "vera-arc-3", from: [19.08, 72.88], to: [51.5, -0.12] },
  { id: "vera-arc-4", from: [12.97, 77.59], to: [25.2, 55.27] },
  { id: "vera-arc-5", from: [40.71, -74.01], to: [26.91, 75.79] },
  { id: "vera-arc-6", from: [1.35, 103.82], to: [-33.87, 151.21] },
]

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = "",
  speed = 0.003,
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

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%", height: "100%", cursor: "grab", opacity: 0,
          transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none",
        }}
      />
    </div>
  )
}

export default GlobeCdn
