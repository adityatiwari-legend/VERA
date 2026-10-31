"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface StudioBackgroundProps {
  showSolidVera?: boolean;
  className?: string;
}

export default function StudioBackground({
  showSolidVera = true,
  className = "",
}: StudioBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== "undefined") {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const { width, height } = dimensions;
    const dpr = Math.min(window.devicePixelRatio, 2);

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const fov = 50;
    const fovRad = THREE.MathUtils.degToRad(fov);
    const cameraZ = height / 2 / Math.tan(fovRad / 2);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 1, cameraZ * 4.0);
    camera.position.set(0, 0, cameraZ);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x050508, 1.0);

    // 4. Concave spherical dome mesh
    const stageW = width * 2.4;
    const stageH = height * 2.4;
    const stageGeo = new THREE.PlaneGeometry(stageW, stageH, 128, 128);
    const posAttr = stageGeo.attributes.position;

    const maxR = Math.sqrt(Math.pow(stageW * 0.5, 2) + Math.pow(stageH * 0.5, 2));
    const sphereRadius = maxR * 1.12;
    const centerDepth = -340.0;
    const zCenter = centerDepth + sphereRadius;

    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const r = Math.sqrt(px * px + py * py);
      const clampedR = Math.min(r, sphereRadius * 0.98);
      const sagitta = Math.sqrt(sphereRadius * sphereRadius - clampedR * clampedR);
      posAttr.setZ(i, zCenter - sagitta);
    }
    stageGeo.computeVertexNormals();

    // GLSL Shader: Dark LED Video Wall with Large Square Panels, Diagonal Light Beams, Halftone Dots
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec2 vScreenUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        vScreenUv = (gl_Position.xy / gl_Position.w) * 0.5 + 0.5;
      }
    `;

    const fragmentShader = `
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec2 vScreenUv;
      varying vec3 vNormal;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // Smooth noise for light beam modulation
      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 centerUv = vScreenUv - 0.5;
        float distCenter = length(centerUv);
        vec2 worldP = vWorldPos.xy;

        // ========================================
        // BASE: Deep dark void (#050508 → #0a0b14)
        // ========================================
        vec3 baseColor = mix(vec3(0.020, 0.020, 0.032), vec3(0.038, 0.042, 0.078), vUv.y * 0.6 + 0.2);

        // ========================================
        // LAYER 1: LARGE SQUARE LED PANEL GRID
        // Thick dark lines forming big square panels like an LED video wall
        // ========================================
        float panelSize = 120.0; // Large square panels
        vec2 panelCoord = worldP / panelSize;
        vec2 panelFract = abs(fract(panelCoord) - 0.5);
        vec2 panelDeriv = fwidth(panelCoord);

        // Thick panel border lines (dark gaps between LED panels)
        float panelLineThick = 2.8;
        vec2 panelBorder = smoothstep(panelDeriv * panelLineThick, vec2(0.0), panelFract);
        float panelGrid = max(panelBorder.x, panelBorder.y);

        // Each panel has a slightly different base brightness (LED panel variation)
        vec2 panelId = floor(panelCoord);
        float panelBrightness = hash(panelId) * 0.06 + 0.02;

        // Sub-grid: finer lines within each panel (subtle pixel grid of the LED screen)
        float subSize = panelSize / 6.0;
        vec2 subCoord = worldP / subSize;
        vec2 subFract = abs(fract(subCoord) - 0.5);
        vec2 subDeriv = fwidth(subCoord);
        vec2 subLine = smoothstep(subDeriv * 1.0, vec2(0.0), subFract);
        float subGrid = max(subLine.x, subLine.y);

        // Panel colors: dark charcoal panels with subtle grid
        vec3 panelSurface = baseColor + vec3(panelBrightness);
        // Dark gap lines between panels
        vec3 panelGapColor = vec3(0.012, 0.012, 0.018);
        vec3 gridLayer = mix(panelSurface, panelGapColor, panelGrid * 0.85);
        // Add subtle sub-grid
        gridLayer = mix(gridLayer, gridLayer * 0.82, subGrid * 0.3);

        // ========================================
        // LAYER 2: SHARP DIAGONAL PROJECTED LIGHT STRIPES
        // Defined diagonal band stripes like projected light from studio rigs
        // ========================================
        vec2 beamOrigin = vec2(uMouse.x * 160.0, uMouse.y * 100.0);
        vec2 bp = worldP - beamOrigin;

        // Helper: creates a sharp-edged stripe band from rotated coordinates
        // Returns 0 outside the band, ramps up to 1 inside
        float beamTotal = 0.0;

        // Beam Group A: ~42° angle — 3 parallel stripes (main + 2 flanking)
        float a1 = 0.733;
        float ca1 = cos(a1); float sa1 = sin(a1);
        float r1 = bp.x * ca1 - bp.y * sa1;
        // Main wide stripe
        float stripe1 = smoothstep(18.0, 12.0, abs(mod(r1 + uTime * 12.0, 350.0) - 175.0)) * 0.38;
        // Flanking thin stripes
        float stripe1b = smoothstep(6.0, 2.0, abs(mod(r1 + 60.0 + uTime * 12.0, 350.0) - 175.0)) * 0.22;
        float stripe1c = smoothstep(6.0, 2.0, abs(mod(r1 - 55.0 + uTime * 12.0, 350.0) - 175.0)) * 0.18;

        // Beam Group B: ~-38° angle — 2 stripes
        float a2 = -0.663;
        float ca2 = cos(a2); float sa2 = sin(a2);
        float r2 = bp.x * ca2 - bp.y * sa2;
        float stripe2 = smoothstep(14.0, 8.0, abs(mod(r2 - uTime * 8.0, 400.0) - 200.0)) * 0.30;
        float stripe2b = smoothstep(5.0, 1.5, abs(mod(r2 + 80.0 - uTime * 8.0, 400.0) - 200.0)) * 0.16;

        // Beam Group C: near-horizontal — 2 wide bands
        float r3 = bp.y;
        float stripe3 = smoothstep(22.0, 14.0, abs(mod(r3 + uTime * 6.0, 500.0) - 250.0)) * 0.24;
        float stripe3b = smoothstep(8.0, 3.0, abs(mod(r3 + 120.0 + uTime * 6.0, 500.0) - 250.0)) * 0.14;

        beamTotal = stripe1 + stripe1b + stripe1c + stripe2 + stripe2b + stripe3 + stripe3b;
        beamTotal *= smoothstep(0.88, 0.30, distCenter); // fade towards edges

        // Beam color: cool white
        vec3 beamColor = vec3(0.90, 0.92, 0.96);

        // Apply beams onto panels (beams illuminate the LED panels)
        vec3 litPanels = gridLayer + beamColor * beamTotal;

        // ========================================
        // LAYER 3: ATMOSPHERIC EDGE GLOW
        // Deep indigo/violet/blue glow around the periphery
        // ========================================
        float pulseT = sin(uTime * 0.6) * 0.5 + 0.5;

        // Blue-violet atmospheric glow at edges
        vec3 edgeGlowColor = mix(
          vec3(0.06, 0.04, 0.22),  // Deep indigo
          vec3(0.03, 0.08, 0.28),  // Dark blue
          pulseT
        );

        // Edge glow: stronger at the periphery, fading towards center
        float edgeGlow = smoothstep(0.20, 0.72, distCenter) * 0.85;
        // Top and bottom edge emphasis
        float topBottomGlow = pow(abs(centerUv.y) * 1.8, 2.0) * 0.5;
        // Side edge emphasis
        float sideGlow = pow(abs(centerUv.x) * 1.5, 2.5) * 0.35;

        vec3 atmosphereLayer = edgeGlowColor * (edgeGlow + topBottomGlow + sideGlow);

        // Subtle center glow (dimmer, deep behind the V shape)
        vec3 centerGlowColor = mix(vec3(0.02, 0.04, 0.12), vec3(0.06, 0.03, 0.14), pulseT);
        float centerSpot = exp(-distCenter * 3.0) * 0.25;
        atmosphereLayer += centerGlowColor * centerSpot;

        // ========================================
        // LAYER 4: HALFTONE DOT MATRIX (LED SCREEN TEXTURE)
        // Fine dot pattern across the entire surface giving it LED screen feel
        // ========================================
        vec2 dotCoord = gl_FragCoord.xy / 3.0;
        vec2 dotFract = fract(dotCoord) - 0.5;
        float dotDist = length(dotFract);

        // Dot brightness scales with the underlying panel brightness
        float surfaceLuma = dot(litPanels + atmosphereLayer, vec3(0.299, 0.587, 0.114));
        float dotRadius = 0.32 + surfaceLuma * 0.12;
        float dotMask = smoothstep(dotRadius, dotRadius - 0.12, dotDist);

        // Halftone darkening: areas between dots are slightly darker
        float halftoneFactor = mix(0.88, 1.0, dotMask);

        // Subtle scanlines
        float scanline = sin(gl_FragCoord.y * 3.14159 * 0.667) * 0.5 + 0.5;
        float scanFactor = 1.0 - (1.0 - pow(scanline, 2.0)) * 0.035;

        // ========================================
        // LAYER 5: VIGNETTE & FILM GRAIN
        // ========================================
        float vignette = smoothstep(0.92, 0.30, length(centerUv * vec2(1.0, 1.2)));
        float grain = (hash(gl_FragCoord.xy + vec2(uTime * 11.0, uTime * 7.0)) - 0.5) * 0.025;

        // ========================================
        // FINAL COMPOSITE
        // ========================================
        vec3 finalColor = litPanels + atmosphereLayer;
        finalColor *= halftoneFactor * scanFactor * vignette;
        finalColor += vec3(grain);

        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
      }
    `;

    const stageMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      depthWrite: true,
    });

    const stageMesh = new THREE.Mesh(stageGeo, stageMaterial);
    stageMesh.position.set(0, 0, -80);
    scene.add(stageMesh);

    // 5. Interactive mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseRef.current.targetX = (e.clientX - halfW) / halfW;
      mouseRef.current.targetY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 6. Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // 3D parallax rotation of the concave dome
      stageMesh.rotation.y = mouseRef.current.x * 0.08;
      stageMesh.rotation.x = -mouseRef.current.y * 0.06;
      stageMesh.position.x = mouseRef.current.x * 22.0;
      stageMesh.position.y = -mouseRef.current.y * 16.0;

      stageMaterial.uniforms.uTime.value = elapsedTime;
      stageMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      stageGeo.dispose();
      stageMaterial.dispose();
      renderer.dispose();
    };
  }, [dimensions]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#050508] ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* LAYER 6: Telemetry Watermarks */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 font-mono text-[9px] tracking-[0.22em] text-zinc-500 uppercase select-none opacity-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-pulse" />
            <span>STAGE // PROTOCOL ESCROW LEDGER</span>
          </div>
          <div className="flex items-center gap-6">
            <span>INTERACTIVE 3D PRISM · MOVE MOUSE</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
              [ ENTER SITE // ESC ]
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center text-[7px]">N</span>
            <span>26.9124° N // LON: 75.7873° E</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#00F59B]">STATUS: TAMPER_EVIDENT // LIVE</span>
          </div>
        </div>
      </div>

      {/* SOLID WHITE "VERA" TYPOGRAPHY LAYER */}
      {showSolidVera && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <h1
            className="text-[19vw] md:text-[230px] lg:text-[280px] font-black text-white tracking-[0.06em] leading-none select-none text-center transform -translate-y-2 drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            V E R A
          </h1>
        </div>
      )}
    </div>
  );
}
