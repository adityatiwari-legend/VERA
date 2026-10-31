"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { Sparkles, RefreshCw, Zap, Compass, Move } from "lucide-react";
import { playTechSound } from "./SoundToggle";

interface PhysicsEntity {
  id: string;
  type: "pill" | "badge" | "wireframe" | "crypto";
  label: string;
  sublabel?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  badgeColor?: string;
  glowColor?: string;
  isWireframe?: boolean;
}

export default function PhysicsCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gravityMode, setGravityMode] = useState<"zero" | "lunar" | "earth">("zero");
  const [isDriftActive, setIsDriftActive] = useState<boolean>(true);
  const [interactionCount, setInteractionCount] = useState<number>(0);

  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<Matter.Body, PhysicsEntity>>(new Map());
  const wireframeRotationRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const setupPhysics = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 560;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 1. Create Matter Engine
    const { Engine, World, Bodies, Mouse, MouseConstraint, Runner, Body, Events } = Matter;
    const engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });
    engineRef.current = engine;

    // 2. Create Bounding Walls
    const wallThickness = 120;
    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.95,
      friction: 0.02,
      render: { visible: false },
    };

    const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, wallOptions);
    const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, wallOptions);
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions);
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions);

    wallsRef.current = [ground, ceiling, leftWall, rightWall];
    World.add(engine.world, [ground, ceiling, leftWall, rightWall]);

    // 3. Define the Floating Entities
    const entitiesConfig: PhysicsEntity[] = [
      {
        id: "live-audit",
        type: "badge",
        label: "● LIVE AUDIT",
        sublabel: "NODE_01 :: MAINNET",
        width: 175,
        height: 48,
        x: width * 0.22,
        y: height * 0.26,
        badgeColor: "#00F59B",
        glowColor: "rgba(0, 245, 155, 0.4)",
      },
      {
        id: "sha-256",
        type: "crypto",
        label: "SHA-256: e3b0c44298fc...",
        sublabel: "IMMUTABLE EVIDENCE HASH",
        width: 250,
        height: 52,
        x: width * 0.55,
        y: height * 0.22,
        badgeColor: "#71717A",
      },
      {
        id: "escrow-locked",
        type: "pill",
        label: "₹10,000 ESCROW LOCKED",
        sublabel: "SMART VAULT #088F",
        width: 215,
        height: 50,
        x: width * 0.78,
        y: height * 0.36,
        badgeColor: "#F59E0B",
        glowColor: "rgba(245, 158, 11, 0.3)",
      },
      {
        id: "ai-ocr",
        type: "badge",
        label: "AI OCR: DISCREPANCY 0%",
        sublabel: "INVOICE MATCH CONFIRMED",
        width: 230,
        height: 48,
        x: width * 0.32,
        y: height * 0.62,
        badgeColor: "#00F59B",
        glowColor: "rgba(0, 245, 155, 0.3)",
      },
      {
        id: "milestone-02",
        type: "pill",
        label: "MILESTONE #02: FOUNDATION COMPLETED",
        sublabel: "TRANCHE ALLOCATED",
        width: 290,
        height: 52,
        x: width * 0.7,
        y: height * 0.7,
        badgeColor: "#38BDF8",
      },
      {
        id: "multisig-signers",
        type: "pill",
        label: "MULTI-SIG [2/3] APPROVED",
        sublabel: "THRESHOLD 66%",
        width: 215,
        height: 48,
        x: width * 0.18,
        y: height * 0.76,
        badgeColor: "#A855F7",
      },
      {
        id: "geotag",
        type: "pill",
        label: "GEO-TAG: 28.6139° N, 77.2090° E",
        sublabel: "EXIF VERIFIED SITE",
        width: 240,
        height: 46,
        x: width * 0.5,
        y: height * 0.82,
        badgeColor: "#38BDF8",
      },
      {
        id: "wireframe-poly",
        type: "wireframe",
        label: "ZK_INTEGRITY_PRISM",
        width: 76,
        height: 76,
        x: width * 0.48,
        y: height * 0.45,
        isWireframe: true,
      },
    ];

    const bodiesMap = new Map<Matter.Body, PhysicsEntity>();

    entitiesConfig.forEach((item) => {
      let body: Matter.Body;
      if (item.isWireframe) {
        body = Bodies.polygon(item.x, item.y, 6, item.width / 2, {
          restitution: 0.95,
          frictionAir: 0.012,
          friction: 0.001,
          density: 0.002,
        });
      } else {
        body = Bodies.rectangle(item.x, item.y, item.width, item.height, {
          chamfer: { radius: 4 },
          restitution: 0.9,
          frictionAir: 0.015,
          friction: 0.002,
          density: 0.003,
        });
      }

      // Initial gentle velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.6;
      Body.setVelocity(body, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.012);

      bodiesMap.set(body, item);
      World.add(engine.world, body);
    });

    bodiesRef.current = bodiesMap;

    // 4. Mouse Control with pixelRatio
    const mouse = Mouse.create(canvas);
    mouse.pixelRatio = dpr;

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.25,
        damping: 0.08,
        render: { visible: false },
      },
    });

    World.add(engine.world, mouseConstraint);

    Events.on(mouseConstraint, "startdrag", () => {
      setInteractionCount((prev) => prev + 1);
      playTechSound("click");
    });

    Events.on(mouseConstraint, "enddrag", () => {
      playTechSound("release");
    });

    // Sound on significant collision
    Events.on(engine, "collisionStart", (event) => {
      const pairs = event.pairs;
      for (const pair of pairs) {
        const speedA = Math.hypot(pair.bodyA.velocity.x, pair.bodyA.velocity.y);
        const speedB = Math.hypot(pair.bodyB.velocity.x, pair.bodyB.velocity.y);
        if (speedA > 1.8 || speedB > 1.8) {
          playTechSound("hover");
          break;
        }
      }
    });

    // 5. Runner
    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    // 6. Custom Render Loop
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = (time: number) => {
      // 1. Ambient Brownian motion drift
      if (isDriftActive && engine.world.gravity.scale === 0) {
        bodiesMap.forEach((_, body) => {
          const speed = Math.hypot(body.velocity.x, body.velocity.y);
          if (speed < 0.3) {
            const wanderAngle = time * 0.0008 + body.id * 1.618;
            Body.applyForce(body, body.position, {
              x: Math.cos(wanderAngle) * 0.0001,
              y: Math.sin(wanderAngle) * 0.0001,
            });
          }
        });
      }

      // 2. Cursor magnetic repulsion field (Alche Studio floating behavior)
      if (mousePosRef.current.active) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        bodiesMap.forEach((_, body) => {
          const dx = body.position.x - mx;
          const dy = body.position.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < 130 && dist > 5) {
            const force = (1 - dist / 130) * 0.0008;
            Body.applyForce(body, body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force,
            });
          }
        });
      }

      wireframeRotationRef.current += 0.015;

      // Clear Canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle registration crosshairs inside canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.font = "10px monospace";
      ctx.fillText("+", 12, 18);
      ctx.fillText("+", width - 18, 18);
      ctx.fillText("+", 12, height - 12);
      ctx.fillText("+", width - 18, height - 12);

      // Draw each entity
      bodiesMap.forEach((item, body) => {
        const { x, y } = body.position;
        const angle = body.angle;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (item.isWireframe) {
          const radius = item.width / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(18, 18, 22, 0.85)";
          ctx.fill();
          ctx.strokeStyle = "rgba(0, 245, 155, 0.5)";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Rotating inner geometry
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * 2 * Math.PI) / 3 + wireframeRotationRef.current;
            const px = Math.cos(a) * (radius * 0.55);
            const py = Math.sin(a) * (radius * 0.55);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center coordinate dot
          ctx.fillStyle = "#00F59B";
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const w = item.width;
          const h = item.height;
          const r = 4;

          // Background Fill
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
          ctx.fillStyle = "#121215";
          ctx.fill();

          // Outer Hairline Border
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1;
          ctx.stroke();

          if (item.glowColor) {
            ctx.strokeStyle = item.glowColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          let textStartX = -w / 2 + 16;

          if (item.id === "live-audit") {
            ctx.save();
            ctx.shadowColor = "#00F59B";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "#00F59B";
            ctx.beginPath();
            ctx.arc(-w / 2 + 18, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            textStartX = -w / 2 + 30;
          } else if (item.id === "escrow-locked") {
            ctx.fillStyle = "#F59E0B";
            ctx.beginPath();
            ctx.arc(-w / 2 + 18, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            textStartX = -w / 2 + 28;
          } else if (item.id === "ai-ocr") {
            ctx.fillStyle = "#00F59B";
            ctx.beginPath();
            ctx.arc(-w / 2 + 18, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            textStartX = -w / 2 + 28;
          }

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "600 12px var(--font-mono), monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          if (item.sublabel) {
            ctx.fillText(item.label, textStartX, -7);
            ctx.fillStyle = "#71717A";
            ctx.font = "500 9px var(--font-mono), monospace";
            ctx.fillText(item.sublabel, textStartX, 9);
          } else {
            ctx.fillText(item.label, textStartX, 0);
          }

          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.font = "8px monospace";
          ctx.textAlign = "right";
          ctx.fillText("0x" + body.id.toString(16).padStart(2, "0"), w / 2 - 8, -h / 2 + 11);
        }

        ctx.restore();
      });

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    // Mouse Tracking for Repulsion Field
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !engineRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight || 560;
      const currentDpr = window.devicePixelRatio || 1;

      canvas.width = newW * currentDpr;
      canvas.height = newH * currentDpr;
      canvas.style.width = `${newW}px`;
      canvas.style.height = `${newH}px`;

      if (wallsRef.current.length === 4) {
        const [g, c, l, r] = wallsRef.current;
        Body.setPosition(g, { x: newW / 2, y: newH + wallThickness / 2 });
        Body.setPosition(c, { x: newW / 2, y: -wallThickness / 2 });
        Body.setPosition(l, { x: -wallThickness / 2, y: newH / 2 });
        Body.setPosition(r, { x: newW + wallThickness / 2, y: newH / 2 });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (runnerRef.current) Runner.stop(runnerRef.current);
      if (engineRef.current) {
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
      }
    };
  }, [isDriftActive]);

  useEffect(() => {
    const cleanup = setupPhysics();
    return () => {
      if (cleanup) cleanup();
    };
  }, [setupPhysics]);

  const handleGravityChange = (mode: "zero" | "lunar" | "earth") => {
    setGravityMode(mode);
    playTechSound("click");
    if (!engineRef.current) return;

    if (mode === "zero") {
      engineRef.current.world.gravity.y = 0;
      engineRef.current.world.gravity.scale = 0;
    } else if (mode === "lunar") {
      engineRef.current.world.gravity.y = 0.4;
      engineRef.current.world.gravity.scale = 0.0006;
    } else if (mode === "earth") {
      engineRef.current.world.gravity.y = 1;
      engineRef.current.world.gravity.scale = 0.0015;
    }
  };

  const handleDisperse = () => {
    playTechSound("release");
    if (!engineRef.current) return;
    const { Body } = Matter;
    const container = containerRef.current;
    if (!container) return;

    const centerX = container.clientWidth / 2;
    const centerY = (container.clientHeight || 560) / 2;

    bodiesRef.current.forEach((_, body) => {
      const dx = body.position.x - centerX;
      const dy = body.position.y - centerY;
      const dist = Math.hypot(dx, dy) || 1;
      const forceMag = 0.038;

      Body.applyForce(body, body.position, {
        x: (dx / dist) * forceMag,
        y: (dy / dist) * forceMag,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.14);
    });
    setInteractionCount((prev) => prev + 1);
  };

  const handleReset = () => {
    playTechSound("click");
    setupPhysics();
    handleGravityChange(gravityMode);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] md:h-[580px] lg:h-[640px] rounded-sm bg-[#0C0C0E]/95 border border-white/[0.08] overflow-hidden select-none crosshair-corner shadow-2xl backdrop-blur-sm"
    >
      <div className="absolute inset-0 bg-grid-technical opacity-50 pointer-events-none" />

      {/* Top Header Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-[#0C0C0E]/80 backdrop-blur-md border-b border-white/[0.08]">
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00F59B] animate-pulse" />
          <span className="tracking-wider uppercase text-zinc-200">Matter.js Zero-G Arena</span>
          <span className="hidden sm:inline text-zinc-600">{"//"}</span>
          <span className="hidden sm:inline text-zinc-500 font-mono">BROWNIAN_DRIFT: {isDriftActive ? "ON" : "OFF"}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Move className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden md:inline">GRAB • TOSS • FLICK</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            INTERACTIONS: <span className="text-[#00F59B] font-semibold">{interactionCount}</span>
          </span>
        </div>
      </div>

      {/* Physics Canvas Target */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Bottom Physics Controls Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-[#121215]/90 backdrop-blur-md border border-white/[0.08] rounded-sm">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-zinc-500 mr-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-[#00F59B]" />
            GRAVITY:
          </span>
          {(["zero", "lunar", "earth"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleGravityChange(mode)}
              className={`px-2.5 py-1 uppercase rounded-none transition-all ${
                gravityMode === mode
                  ? "bg-[#00F59B] text-black font-semibold shadow-[0_0_10px_rgba(0,245,155,0.3)]"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {mode}-G
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => {
              playTechSound("click");
              setIsDriftActive((prev) => !prev);
            }}
            className={`px-2.5 py-1 flex items-center gap-1.5 transition-all border ${
              isDriftActive
                ? "border-[#00F59B]/40 text-[#00F59B] bg-[#00F59B]/5"
                : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle subtle organic Brownian motion"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">DRIFT</span>
          </button>

          <button
            type="button"
            onClick={handleDisperse}
            className="px-3 py-1 flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 hover:text-white transition-all active:scale-95"
          >
            <Zap className="w-3 h-3 text-[#00F59B]" />
            <span>DISPERSE</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1 px-2 flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-all active:rotate-180"
            title="Reset Bodies"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
