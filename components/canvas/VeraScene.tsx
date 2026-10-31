"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Float, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

interface VeraSceneProps {
  scrollProgress: number; // tau in [0, 1]
  userOffset: { x: number; y: number };
  onQuaternionUpdate: (q: [number, number, number, number]) => void;
}

// Cubic smooth easing for fluid cinematic keyframing
function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// Analytical Flight Spline & Quaternion Evaluator
function evaluateFlightPipeline(tau: number) {
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const euler = new THREE.Euler();
  let dispersion = 0.09;
  let lightShift = 0; // 0: Indigo (#6366F1), 1: Mint (#00F59B)

  if (tau < 0.2) {
    // Stage 0: Hero / Central Monolith
    const s = smooth(tau / 0.2);
    pos.set(0, 0, 7.2);
    target.set(0, 0, 0);
    euler.set(0, 0, 0);
    dispersion = 0.09;
    lightShift = 0;
  } else if (tau < 0.45) {
    // Transition to Stage 1: Arc sweep to [-2.8, 0.8, 5.5], V rotates +35 deg Y, -12 deg X
    const s = smooth((tau - 0.2) / 0.25);
    // Sweeping arc with radial lift
    const arcX = THREE.MathUtils.lerp(0, -2.8, s);
    const arcY = THREE.MathUtils.lerp(0, 0.8, s);
    const arcZ = THREE.MathUtils.lerp(7.2, 5.5, s) + Math.sin(s * Math.PI) * 0.4;
    pos.set(arcX, arcY, arcZ);

    target.set(THREE.MathUtils.lerp(0, 0.5, s), 0, 0);

    // 3D V Rotates: Y = +35 deg (0.6109 rad), X = -12 deg (-0.2094 rad)
    euler.set(
      THREE.MathUtils.lerp(0, -0.2094, s),
      THREE.MathUtils.lerp(0, 0.6109, s),
      0
    );

    // Internal dispersion spikes as light hits chamfered edges
    dispersion = 0.09 + 0.13 * Math.sin(s * Math.PI);
    lightShift = 0;
  } else if (tau < 0.7) {
    // Transition to Stage 2: Extreme macro dolly to [1.8, -0.4, 3.8] framing beveled edge
    const s = smooth((tau - 0.45) / 0.25);
    pos.set(
      THREE.MathUtils.lerp(-2.8, 1.8, s),
      THREE.MathUtils.lerp(0.8, -0.4, s),
      THREE.MathUtils.lerp(5.5, 3.8, s)
    );
    target.set(
      THREE.MathUtils.lerp(0.5, 0.2, s),
      THREE.MathUtils.lerp(0, -0.2, s),
      0
    );

    // Edge-on facet thickness tilt
    euler.set(
      THREE.MathUtils.lerp(-0.2094, 0.44, s),
      THREE.MathUtils.lerp(0.6109, 1.38, s),
      THREE.MathUtils.lerp(0, -0.15, s)
    );

    dispersion = 0.09;
    // Volumetric stage lighting shifts from deep electric indigo to verification mint (#00F59B)
    lightShift = s;
  } else {
    // Transition to Stage 3: Pull back to [0, 2.5, 8.0] looking slightly down at [0, 0, 0]
    const s = smooth((tau - 0.7) / 0.3);
    pos.set(
      THREE.MathUtils.lerp(1.8, 0, s),
      THREE.MathUtils.lerp(-0.4, 2.5, s),
      THREE.MathUtils.lerp(3.8, 8.0, s)
    );
    target.set(
      THREE.MathUtils.lerp(0.2, 0, s),
      THREE.MathUtils.lerp(-0.2, 0, s),
      0
    );

    // Return to near-equilibrium with subtle inertia
    euler.set(
      THREE.MathUtils.lerp(0.44, -0.24, s),
      THREE.MathUtils.lerp(1.38, 0.12, s),
      THREE.MathUtils.lerp(-0.15, 0, s)
    );

    dispersion = 0.09;
    lightShift = 1;
  }

  return { pos, target, euler, dispersion, lightShift };
}

function StudioEnvironment({ lightShift }: { lightShift: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const mintColor = useMemo(() => new THREE.Color("#00F59B"), []);
  const indigoColor = useMemo(() => new THREE.Color("#6366F1"), []);
  const currentColor = useRef(new THREE.Color("#6366F1"));

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    const targetColor = currentColor.current.copy(indigoColor).lerp(mintColor, lightShift);
    lightRef.current.color.lerp(targetColor, 4.0 * delta);
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 8, 6]} intensity={2.4} color="#ffffff" />
      <pointLight ref={lightRef} position={[0, 0, -2.5]} intensity={6.5} distance={18} />
      <pointLight position={[-4, -3, 3]} intensity={3.2} color="#38bdf8" />
      <pointLight position={[3, 3, -1]} intensity={2.0} color="#00F59B" />

      {/* Curved Studio Cylinder Stage Backdrop */}
      <mesh position={[0, 0, -6]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[15, 15, 20, 64, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color="#09090b"
          roughness={0.82}
          metalness={0.18}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

function GlassV({
  scrollProgress,
  userOffset,
  dispersion,
  onQuaternionUpdate,
}: {
  scrollProgress: number;
  userOffset: { x: number; y: number };
  dispersion: number;
  onQuaternionUpdate: (q: [number, number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentQuat = useRef(new THREE.Quaternion());
  const targetQuat = useRef(new THREE.Quaternion());

  // Precision 3D "V" Polygonal Outline with Sharp Chamfer Facets
  const vShape = useMemo(() => {
    const s = new THREE.Shape();
    // Left outer wing
    s.moveTo(-1.65, 2.05);
    s.lineTo(-0.72, 2.05);
    // Center inner apex
    s.lineTo(0.0, -0.65);
    // Right inner wing
    s.lineTo(0.72, 2.05);
    s.lineTo(1.65, 2.05);
    // Right outer apex
    s.lineTo(0.38, -1.85);
    s.lineTo(-0.38, -1.85);
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = useMemo(
    () => ({
      depth: 0.68,
      bevelEnabled: true,
      bevelThickness: 0.24,
      bevelSize: 0.18,
      bevelSegments: 3, // Sharp beveled edges catching crisp specular streaks
    }),
    []
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const { euler } = evaluateFlightPipeline(scrollProgress);

    // Add subtle pointer parallax based on mouse
    const pointerParallaxX = state.pointer.y * 0.15;
    const pointerParallaxY = state.pointer.x * 0.22;

    // Compose Euler orientation with user offset and subtle parallax
    const finalEuler = new THREE.Euler(
      euler.x + userOffset.y + pointerParallaxX,
      euler.y + userOffset.x + pointerParallaxY,
      euler.z,
      "YXZ"
    );

    targetQuat.current.setFromEuler(finalEuler);

    // Spherical Linear Interpolation (slerp) for buttery rotation
    meshRef.current.quaternion.slerp(targetQuat.current, Math.min(1.0, 5.0 * delta));

    // Broadcast live quaternion to telemetry HUD frame
    currentQuat.current.copy(meshRef.current.quaternion);
    onQuaternionUpdate([
      currentQuat.current.x,
      currentQuat.current.y,
      currentQuat.current.z,
      currentQuat.current.w,
    ]);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.2}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <extrudeGeometry args={[vShape, extrudeSettings]} />
        {/* Transmission material configured to exact creative technologist specifications */}
        <MeshTransmissionMaterial
          backside={true}
          samples={16}
          resolution={512}
          transmission={1.0}
          roughness={0.05}
          thickness={2.4}
          ior={1.62}
          chromaticAberration={dispersion}
          distortion={0.32}
          temporalDistortion={0.12}
          color="#ffffff"
          attenuationColor="#38bdf8"
          attenuationDistance={1.5}
        />
      </mesh>
    </Float>
  );
}

function CameraSplineRig({ scrollProgress }: { scrollProgress: number }) {
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 7.2));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const pipeline = evaluateFlightPipeline(scrollProgress);

    targetCamPos.current.copy(pipeline.pos);
    targetLookAt.current.copy(pipeline.target);

    // Smooth camera position dampening along continuous arc
    state.camera.position.lerp(targetCamPos.current, Math.min(1.0, 4.0 * delta));
    state.camera.lookAt(targetLookAt.current);
  });

  return null;
}

export default function VeraScene({
  scrollProgress,
  userOffset,
  onQuaternionUpdate,
}: VeraSceneProps) {
  const { dispersion, lightShift } = useMemo(
    () => evaluateFlightPipeline(scrollProgress),
    [scrollProgress]
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      className="w-full h-full"
    >
      <StudioEnvironment lightShift={lightShift} />
      <CameraSplineRig scrollProgress={scrollProgress} />

      {/* 3D Backdrop Typography behind the glass:
          Physically refracted, magnified and dispersed through the transmission facets */}
      <Text
        position={[0, 0, -2.6]}
        fontSize={3.2}
        letterSpacing={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        V E R A
      </Text>

      <GlassV
        scrollProgress={scrollProgress}
        userOffset={userOffset}
        dispersion={dispersion}
        onQuaternionUpdate={onQuaternionUpdate}
      />

      <Environment preset="city" />
    </Canvas>
  );
}