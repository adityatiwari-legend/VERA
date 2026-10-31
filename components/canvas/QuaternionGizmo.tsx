"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GizmoProps {
  quaternion: [number, number, number, number];
  onReset: () => void;
  onDragOffset?: (offset: { x: number; y: number }) => void;
}

function MiniTrackball({ quat }: { quat: [number, number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetQuat = useRef(new THREE.Quaternion());

  useFrame(() => {
    if (!groupRef.current) return;
    targetQuat.current.set(quat[0], quat[1], quat[2], quat[3]);
    groupRef.current.quaternion.slerp(targetQuat.current, 0.2);
  });

  return (
    <group ref={groupRef}>
      {/* Outer Pitch, Yaw, Roll circular guide rings */}
      {/* Yaw Ring (Horizontal, XZ plane) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.92, 0.024, 12, 48]} />
        <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>

      {/* Roll Ring (Frontal, XY plane) */}
      <mesh>
        <torusGeometry args={[0.92, 0.024, 12, 48]} />
        <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>

      {/* Pitch Ring (Profile, YZ plane) */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.92, 0.024, 12, 48]} />
        <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>

      {/* Spatial Axis Nodes: Red (X), Green (Y), Blue (Z) */}
      {/* Red: +X */}
      <mesh position={[0.92, 0, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Green: +Y */}
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      {/* Blue: +Z */}
      <mesh position={[0, 0, 0.92]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Negative Axis Micro-Ticks for Spatial Depth */}
      <mesh position={[-0.92, 0, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ef4444" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, -0.92, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#10b981" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0, -0.92]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
      </mesh>
    </group>
  );
}

export default function QuaternionGizmo({
  quaternion,
  onReset,
  onDragOffset,
}: GizmoProps) {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });

  // Format real-time quaternion readout matching the exact Alche specification:
  // [ .02, -.01, -.00, 1.0 ]
  const formatComponent = (v: number) => {
    const fixed = v.toFixed(2);
    if (Math.abs(v) < 0.005) return " .00";
    if (v >= 0) {
      if (Math.abs(v - 1.0) < 0.005) return " 1.0";
      return fixed.startsWith("0.") ? " " + fixed.slice(1) : " " + fixed;
    } else {
      if (Math.abs(v + 1.0) < 0.005) return "-1.0";
      return fixed.startsWith("-0.") ? "-" + fixed.slice(2) : fixed;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !onDragOffset) return;
    const dx = (e.clientX - dragStart.current.x) * 0.015;
    const dy = (e.clientY - dragStart.current.y) * 0.015;
    dragStart.current = { x: e.clientX, y: e.clientY };
    currentOffset.current.x += dx;
    currentOffset.current.y += dy;
    onDragOffset({ ...currentOffset.current });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleResetClick = () => {
    currentOffset.current = { x: 0, y: 0 };
    onReset();
  };

  return (
    <div className="flex flex-col items-end gap-1.5 font-mono select-none">
      <div className="flex items-center gap-3.5 bg-black/40 backdrop-blur-md border border-white/[0.08] px-3 py-2 rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        {/* Monospace telemetry header readout */}
        <div className="text-right leading-tight">
          <span className="block text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
            VERA Quaternion Q:
          </span>
          <span className="text-[11px] text-zinc-200 tracking-wider">
            [{formatComponent(quaternion[0])}, {formatComponent(quaternion[1])},{" "}
            {formatComponent(quaternion[2])}, {formatComponent(quaternion[3])} ]
          </span>
        </div>

        {/* 36px Interactive Euler/Quaternion Sphere Trackball */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag to orbit quaternion"
          className="relative h-9 w-9 cursor-grab active:cursor-grabbing rounded-full border border-white/[0.15] bg-[#0c0c10] shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] overflow-hidden transition-transform hover:scale-105 active:scale-95"
        >
          <Canvas
            camera={{ position: [0, 0, 2.7], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            className="w-full h-full pointer-events-none"
          >
            <ambientLight intensity={1.6} />
            <MiniTrackball quat={quaternion} />
          </Canvas>
        </div>
      </div>

      {/* Reset Quaternion Action */}
      <button
        type="button"
        onClick={handleResetClick}
        className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 hover:text-[#00F59B] transition-colors underline underline-offset-4 cursor-pointer font-medium"
      >
        Reset Quaternion
      </button>
    </div>
  );
}