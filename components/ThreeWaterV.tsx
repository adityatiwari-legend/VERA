"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeWaterVProps {
  width: number;
  height: number;
  cx: number;
  cy: number;
  R: number;
  scrollProgress?: number;
}

// Procedural Liquid Water Caustic Texture for rippling internal light refraction
function createCausticTexture(): THREE.DataTexture {
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  const heightMap = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const ny = (y / size) * Math.PI * 8;
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * Math.PI * 8;
      const s1 = Math.sin(nx * 1.4 + Math.cos(ny * 1.2)) * 0.35;
      const s2 = Math.cos(ny * 1.6 + Math.sin(nx * 0.9)) * 0.30;
      const r1 = Math.sin((nx * 2.0 + ny * 0.8) * 2.2) * 0.18;
      const r2 = Math.cos((nx * 0.8 - ny * 2.5) * 1.6) * 0.15;
      const web = Math.pow(Math.abs(Math.sin(nx * 3.0) * Math.cos(ny * 3.0)), 0.7) * 0.15;
      heightMap[y * size + x] = s1 + s2 + r1 + r2 + web;
    }
  }

  const strength = 3.2;
  for (let y = 0; y < size; y++) {
    const yPrev = (y - 1 + size) % size;
    const yNext = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xPrev = (x - 1 + size) % size;
      const xNext = (x + 1) % size;

      const dhdx = heightMap[y * size + xNext] - heightMap[y * size + xPrev];
      const dhdy = heightMap[yNext * size + x] - heightMap[yPrev * size + x];

      let nx = -dhdx * strength;
      let ny = -dhdy * strength;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.needsUpdate = true;
  return texture;
}

export default function ThreeWaterV({ width, height, cx, cy, R, scrollProgress }: ThreeWaterVProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current || width === 0 || height === 0) return;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera: 1 Three.js unit at z=0 equals exactly 1 screen pixel
    const fov = 45;
    const fovRad = THREE.MathUtils.degToRad(fov);
    const cameraZ = height / 2 / Math.tan(fovRad / 2);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 1, cameraZ * 3.0);
    camera.position.set(0, 0, cameraZ);

    const dpr = Math.min(window.devicePixelRatio, 2);

    // 3. Renderer with transparent background (sits cleanly at z-10 on top of StudioBackground)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    // 4. Solid 3D V Shape Geometry with Clean, Sharp Chamfered Facets
    const beamAngleRad = (62 * Math.PI) / 180;
    const cosA = Math.cos(beamAngleRad);
    const sinA = Math.sin(beamAngleRad);

    const uLx = -cosA;
    const uLy = -sinA;
    const nLx = -uLy;
    const nLy = uLx;

    const apexLowestY = cy + R * 0.94;
    const apexUpperY = cy + R * 0.42;
    const lineSpacing = 7;
    const yTopBoundary = cy - R * 0.95;

    const oxL_out = -lineSpacing * nLx;
    const oyL_out = -lineSpacing * nLy;
    const tTopL_out = (yTopBoundary - (apexLowestY + oyL_out)) / uLy;
    const xTL_outer = cx + oxL_out + tTopL_out * uLx;

    const oxL_in = lineSpacing * nLx;
    const oyL_in = lineSpacing * nLy;
    const tTopL_in = (yTopBoundary - (apexUpperY + oyL_in)) / uLy;
    const xTL_inner = cx + oxL_in + tTopL_in * uLx;

    const xTR_outer = cx + (cx - xTL_outer);
    const xTR_inner = cx + (cx - xTL_inner);

    const ptTL_outer = { x: xTL_outer - cx, y: -(yTopBoundary - cy) };
    const ptBottom_outer = { x: 0, y: -(apexLowestY + lineSpacing + 2 - cy) };
    const ptTR_outer = { x: xTR_outer - cx, y: -(yTopBoundary - cy) };
    const ptTR_inner = { x: xTR_inner - cx, y: -(yTopBoundary - cy) };
    const ptBottom_inner = { x: 0, y: -(apexUpperY - lineSpacing - 2 - cy) };
    const ptTL_inner = { x: xTL_inner - cx, y: -(yTopBoundary - cy) };

    const shape = new THREE.Shape();
    shape.moveTo(ptTL_outer.x, ptTL_outer.y);
    shape.lineTo(ptBottom_outer.x, ptBottom_outer.y);
    shape.lineTo(ptTR_outer.x, ptTR_outer.y);
    shape.lineTo(ptTR_inner.x, ptTR_inner.y);
    shape.lineTo(ptBottom_inner.x, ptBottom_inner.y);
    shape.lineTo(ptTL_inner.x, ptTL_inner.y);
    shape.closePath();

    // Solid crystal prism with sharp clean chamfer bevels
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 52,
      bevelEnabled: true,
      bevelThickness: 4.6,
      bevelSize: 4.0,
      bevelOffset: 0,
      bevelSegments: 1, // 1 segment = crisp flat angled chamfer catching razor-sharp specular reflection bars!
      steps: 1,
    };

    const rawGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    rawGeometry.center();
    const geometry = rawGeometry.toNonIndexed();
    geometry.computeVertexNormals();
    rawGeometry.dispose();

    const causticTexture = createCausticTexture();

    // 5. Crystal-Clear Transparent Water Droplet Shader with Physical Droplets & Refraction
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vEye;
      varying vec2 vUv;
      varying vec3 vPos;

      void main() {
        vUv = uv;
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vEye = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform sampler2D uBgMap;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;

      varying vec3 vNormal;
      varying vec3 vEye;
      varying vec2 vUv;
      varying vec3 vPos;

      // --- ULTRA-FAST HASH FUNCTIONS ---
      vec2 hash2(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.xx + p3.yz) * p3.zy);
      }

      vec4 hash4(vec2 p) {
        vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
        p4 += dot(p4, p4.wzxy + 33.33);
        return fract((p4.xxyz + p4.yzzw) * p4.zywx);
      }

      void main() {
        // Continuous physical surface coordinates across the 3D V shape (1 unit = 1 pixel)
        vec2 p = vPos.xy;

        // Front face mask (droplets naturally form on front face and bevels)
        float faceFactor = smoothstep(0.25, 0.85, vNormal.z);

        // Light & View vectors for specular glints
        vec3 V = normalize(vEye);
        vec3 L1 = normalize(vec3(-0.60, 0.75, 0.70)); // Primary Key Light
        vec3 H1 = normalize(L1 + V);
        vec3 L2 = normalize(vec3(0.65, -0.40, 0.65)); // Secondary Fill Light
        vec3 H2 = normalize(L2 + V);

        // Accumulators for water droplets
        vec2 accumGrad = vec2(0.0);
        float accumMask = 0.0;
        float accumRim = 0.0;
        float accumSpec = 0.0;

        // =================================================================
        // LAYER 1: STATIC WATER BEADS & CONDENSATION DROPS (Cellular 44px)
        // =================================================================
        float cell1 = 44.0;
        vec2 gUv1 = p / cell1;
        vec2 gId1 = floor(gUv1);

        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cId = gId1 + neighbor;
            vec4 h = hash4(cId);

            // ~68% of cells spawn a distinct water droplet
            if (h.w < 0.32) continue;

            vec2 dropCenter = neighbor + (h.xy - 0.5) * 0.62;
            vec2 diff = (fract(gUv1) - dropCenter) * cell1;

            // Droplet radius between 6.0px and 17.5px
            float radius = mix(6.0, 17.5, h.z);
            float dist = length(diff);

            if (dist < radius) {
              float u = dist / radius;
              // Spherical cap dome profile
              float hDome = sqrt(max(0.001, 1.0 - u * u));
              // Radial gradient normal offset (steepest near edge)
              vec2 grad = -(diff / radius) * (u / max(hDome, 0.20));
              float mask = smoothstep(1.0, 0.86, u);
              float rim = smoothstep(0.70, 0.98, u);

              vec3 dropN = normalize(vec3(grad * 0.85, 1.0));
              float specKey = pow(max(dot(dropN, H1), 0.0), 95.0) * 2.8;
              float specFill = pow(max(dot(dropN, H2), 0.0), 45.0) * 0.6;

              accumGrad += grad * mask * 0.65;
              accumMask = max(accumMask, mask);
              accumRim = max(accumRim, rim * mask);
              accumSpec += (specKey + specFill) * mask;
            }
          }
        }

        // =================================================================
        // LAYER 2: DYNAMIC TRICKLING / SLIDING DROPS (Gravity flow down V)
        // =================================================================
        float colW = 62.0;
        float colH = 150.0;
        float gravitySpeed = 48.0; // Pixels per second downwards

        float colIndex = floor(p.x / colW);
        float colSeed = hash2(vec2(colIndex, 13.41)).x;
        float colSpeed = mix(0.75, 1.35, colSeed);

        // Y decreases downwards in screen, gravity pulls down
        float dropY = p.y + uTime * gravitySpeed * colSpeed;
        vec2 gUv2 = vec2(p.x / colW, dropY / colH);
        vec2 gId2 = floor(gUv2);

        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cId = gId2 + neighbor;
            vec4 h = hash4(cId * 1.47);

            if (h.w < 0.42) continue; // ~58% of stream columns

            // Gentle lateral sway as droplet trickles down
            float sway = sin(uTime * 2.2 + h.x * 6.28) * 0.09;
            vec2 dropCenter = neighbor + vec2((h.x - 0.5) * 0.45 + sway, (h.y - 0.5) * 0.45);
            vec2 diff = (fract(gUv2) - dropCenter) * vec2(colW, colH);

            // Teardrop shape: elongated trailing top
            vec2 shapeDiff = diff;
            if (shapeDiff.y > 0.0) {
              shapeDiff.y *= 0.72; // stretched tail
            }

            float radius = mix(8.5, 18.0, h.z);
            float dist = length(shapeDiff);

            if (dist < radius) {
              float u = dist / radius;
              float hDome = sqrt(max(0.001, 1.0 - u * u));
              vec2 grad = -(shapeDiff / radius) * (u / max(hDome, 0.18));
              float mask = smoothstep(1.0, 0.85, u);
              float rim = smoothstep(0.68, 0.98, u);

              vec3 dropN = normalize(vec3(grad * 0.92, 1.0));
              float specKey = pow(max(dot(dropN, H1), 0.0), 90.0) * 3.0;
              float specFill = pow(max(dot(dropN, H2), 0.0), 40.0) * 0.7;

              accumGrad += grad * mask * 0.75;
              accumMask = max(accumMask, mask);
              accumRim = max(accumRim, rim * mask);
              accumSpec += (specKey + specFill) * mask;
            }

            // Residual micro-droplet trail beads left in the wake of the sliding drop
            if (diff.y > 0.0 && diff.y < 75.0 && abs(diff.x) < 5.0) {
              float trailFade = smoothstep(75.0, 0.0, diff.y);
              float beadSegment = mod(diff.y, 15.0) - 7.5;
              float beadDist = length(vec2(diff.x, beadSegment));
              float beadRad = 2.6;
              if (beadDist < beadRad) {
                float bu = beadDist / beadRad;
                float bMask = smoothstep(1.0, 0.70, bu) * trailFade;
                accumMask = max(accumMask, bMask * 0.7);
                accumRim = max(accumRim, smoothstep(0.60, 0.95, bu) * bMask * 0.8);
                accumGrad += -(diff / beadRad) * bMask * 0.40;
                accumSpec += pow(max(dot(normalize(vec3(-(diff/beadRad)*0.7, 1.0)), H1), 0.0), 60.0) * bMask * 1.5;
              }
            }
          }
        }

        // =================================================================
        // LAYER 3: MICRO-CONDENSATION / DEW MIST (High density, 16px cell)
        // =================================================================
        float cell3 = 16.0;
        vec2 gUv3 = p / cell3;
        vec2 gId3 = floor(gUv3);
        vec4 h3 = hash4(gId3 * 2.19);
        if (h3.w > 0.38) {
          vec2 dropCenter3 = (h3.xy - 0.5) * 0.55;
          vec2 diff3 = (fract(gUv3) - 0.5 - dropCenter3) * cell3;
          float rad3 = mix(1.8, 3.8, h3.z);
          float dist3 = length(diff3);
          if (dist3 < rad3) {
            float u3 = dist3 / rad3;
            float mask3 = smoothstep(1.0, 0.72, u3);
            vec2 grad3 = -(diff3 / rad3) * 0.48;
            accumGrad += grad3 * mask3;
            accumMask = max(accumMask, mask3 * 0.55);
            accumRim = max(accumRim, smoothstep(0.62, 0.96, u3) * mask3 * 0.65);
            vec3 dropN3 = normalize(vec3(grad3 * 0.75, 1.0));
            accumSpec += pow(max(dot(dropN3, H1), 0.0), 65.0) * mask3 * 1.4;
          }
        }

        // =================================================================
        // LAYER 4: RAINDROP IMPACT RIPPLE RINGS
        // =================================================================
        vec2 rippleGrad = vec2(0.0);
        for (int r = 0; r < 3; r++) {
          float fr = float(r);
          vec2 rCenter = vec2(sin(fr * 3.4) * 115.0, cos(fr * 4.6) * 85.0);
          float tCycle = mod(uTime * 1.15 + fr * 1.08, 3.2); // 3.2s recurring period
          float rDist = length(p - rCenter);
          float waveFront = tCycle * 110.0; // wave spreads at 110 px/s
          float waveDist = rDist - waveFront;

          if (rDist < waveFront + 28.0 && tCycle > 0.06) {
            float waveAmp = exp(-tCycle * 1.25) * exp(-rDist * 0.007);
            vec2 rDir = (rDist > 0.01) ? (p - rCenter) / rDist : vec2(0.0);
            rippleGrad += rDir * cos(waveDist * 0.18) * 0.22 * waveAmp * smoothstep(32.0, 0.0, abs(waveDist));
          }
        }

        // =================================================================
        // SILKY WATER NORMAL PERTURBATION & REFRACTION
        // =================================================================
        // Low-frequency gentle liquid wave swell
        float t = uTime * 1.6;
        float w1 = sin(p.y * 0.038 + t) * cos(p.x * 0.031 + t * 0.8);
        float w2 = sin((p.x + p.y) * 0.045 - t * 1.1) * 0.5;
        vec2 waveGrad = vec2(
          cos((p.x + p.y) * 0.045 - t * 1.1) * 0.045 * 0.5,
          cos(p.y * 0.038 + t) * 0.038 * cos(p.x * 0.031 + t * 0.8)
        ) * 0.18;

        // Combined droplet and wave gradient on the surface
        vec2 totalSurfaceGrad = (accumGrad + rippleGrad + waveGrad) * faceFactor;

        // Perturbed 3D surface normal
        vec3 N = normalize(vNormal + vec3(totalSurfaceGrad * 0.45, 0.0));
        float NdotV = max(dot(N, V), 0.0);

        // Screen coordinate for background refraction
        vec2 screenUv = gl_FragCoord.xy / uResolution;

        // Physical lens refraction:
        // Background coordinates bend strongly through the convex dome of each droplet!
        vec2 refractOffset = N.xy * 0.045 - (accumGrad * 0.055 + rippleGrad * 0.025) * faceFactor;
        vec2 refractedUv = clamp(screenUv + refractOffset, 0.001, 0.999);

        // Sample live DOM background canvas (ConstellationGrid)
        vec4 bgRefraction = texture2D(uBgMap, refractedUv);

        // --- PHYSICAL MENISCUS CONTACT RIM (High-contrast droplet edge) ---
        // Grazing angle total internal reflection darkens the outer meniscus boundary of droplets
        float meniscus = accumRim * faceFactor;
        vec3 waterBaseColor = bgRefraction.rgb * (1.0 - meniscus * 0.45);

        // --- INTERNAL DROPLET CAUSTIC GLOW ---
        // Light entering from top focuses at bottom-opposite rim of droplet
        float dropCaustic = pow(max(dot(normalize(accumGrad + vec2(0.001)), -L1.xy), 0.0), 2.2) * accumMask * faceFactor * 0.25;
        waterBaseColor += vec3(dropCaustic);

        // --- PHYSICAL FRESNEL REFLECTION ---
        float F0 = 0.02; // Ultra-clear Water (IOR 1.33)
        float fresnel = F0 + (1.0 - F0) * pow(clamp(1.0 - NdotV, 0.0, 1.0), 4.0);

        // --- DIRECT SPECULAR HIGHLIGHTS ON BEVELS & WATER SURFACE ---
        float specSharp1 = pow(max(dot(N, H1), 0.0), 160.0) * 1.5;
        float specGloss1 = pow(max(dot(N, H1), 0.0), 40.0) * 0.15;
        float specSharp2 = pow(max(dot(N, H2), 0.0), 80.0) * 0.6;
        vec3 surfaceSpecular = vec3(specSharp1 + specGloss1 + specSharp2);

        // --- CRISP BEVEL CHAMFER HIGHLIGHTS ---
        float isBevel = smoothstep(0.95, 0.65, abs(vNormal.z));
        float bevelSpec = pow(max(dot(N, H1), 0.0), 60.0) * 1.2;
        vec3 bevelHighlight = vec3(1.0) * isBevel * (bevelSpec + 0.15);

        // --- ACCUMULATED DROPLET SPECULAR GLINTS ---
        vec3 dropletSpecular = vec3(clamp(accumSpec * faceFactor, 0.0, 3.8));

        // Final composite: completely transparent liquid + dark meniscus rims + glistening droplets
        vec3 finalColor = waterBaseColor + surfaceSpecular + bevelHighlight + dropletSpecular + fresnel * 0.08;

        // Render with alpha=1 so it completely refracts the background canvas
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const waterMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        uBgMap: { value: null },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, waterMaterial);
    scene.add(mesh);

    // 6. Interactive mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseRef.current.targetX = (e.clientX - halfW) / halfW;
      mouseRef.current.targetY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 6.5 Dynamic Background Refraction Texture
    let bgTexture: THREE.CanvasTexture | null = null;
    const updateBgTexture = () => {
      if (!bgTexture) {
        const bgCanvas = document.getElementById("constellation-bg-canvas") as HTMLCanvasElement;
        if (bgCanvas) {
          bgTexture = new THREE.CanvasTexture(bgCanvas);
          bgTexture.minFilter = THREE.LinearFilter;
          waterMaterial.uniforms.uBgMap.value = bgTexture;
        }
      }
      if (bgTexture) {
        bgTexture.needsUpdate = true;
      }
    };

    // 7. Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Update background refraction texture
      updateBgTexture();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Smooth scroll lerp
      const targetScroll = typeof scrollProgress === "number" 
        ? scrollProgress 
        : (typeof window !== "undefined" ? ((window as any).__veraScrollProgress ?? 0) : 0);
      scrollRef.current += (targetScroll - scrollRef.current) * 0.08;
      const sp = scrollRef.current;

      // Gentle floating bob & 3D perspective tilt + ANTICLOCKWISE scroll rotation
      const floatY = Math.sin(elapsedTime * 1.2) * 4.5;
      const antiClockwiseRotation = -sp * Math.PI * 4.0;
      const tiltY = Math.sin(elapsedTime * 0.75) * 0.08 + mouseRef.current.x * 0.18 + antiClockwiseRotation;
      const tiltX = -0.05 + Math.cos(elapsedTime * 0.6) * 0.04 - mouseRef.current.y * 0.14 - sp * 0.12;
      const tiltZ = Math.sin(elapsedTime * 0.45) * 0.015 - sp * 0.18;

      mesh.position.y = floatY;
      mesh.rotation.y = tiltY;
      mesh.rotation.x = tiltX;
      mesh.rotation.z = tiltZ;

      waterMaterial.uniforms.uTime.value = elapsedTime;
      waterMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      geometry.dispose();
      waterMaterial.dispose();
      causticTexture.dispose();
      renderer.dispose();
    };
  }, [width, height, cx, cy, R]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
