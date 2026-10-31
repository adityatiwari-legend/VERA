"use client";

import {
    motion,
    useTransform,
    useReducedMotion,
    useMotionValue,
    useSpring,
    useMotionValueEvent,
    MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import RibbonField from "@/components/ui/ribbon-field";

/**
 * PerspectiveTunnelHero — VERA reveal hero.
 *
 * An immersive 3D tunnel flythrough of the 9-stage verifiable fund trail
 * (the same pipeline documented on the landing page — no invented content).
 * Scroll / swipe drives the camera; every card is an abstract stage visual
 * rendered as inline SVG so the hero works offline and stays on-theme.
 *
 * Integration notes vs. the stock 21st.dev component:
 * - Wheel/touch handlers only consume the gesture while the tunnel can still
 *   move, so the page scrolls naturally once the flythrough completes.
 * - The section is `w-full` (not `w-screen`) to avoid horizontal overflow.
 * - Night-surface theme uses the VERA tokens from docs/design-system.md.
 */

const STAGES = [
    { id: "01", title: "Donation", sub: "Funds recorded & earmarked" },
    { id: "02", title: "Earmarked", sub: "Zero co-mingling" },
    { id: "03", title: "Locked", sub: "Escrow custody" },
    { id: "04", title: "Milestone", sub: "Budget-capped tranches" },
    { id: "05", title: "Evidence", sub: "SHA-256 fingerprinted" },
    { id: "06", title: "Verification", sub: "AI line-item OCR" },
    { id: "07", title: "Approval", sub: "Certified human auditor" },
    { id: "08", title: "Release", sub: "2-of-3 multisig" },
    { id: "09", title: "Audit", sub: "Public ledger anchor" },
] as const;

/* --------------------------------------------------------------------------
   Stage artwork — abstract, on-theme SVG data URIs (no external images).
   -------------------------------------------------------------------------- */

const ART_GRID = (() => {
    let d = "";
    for (let x = 40; x < 320; x += 40) d += `M${x} 0V400`;
    for (let y = 40; y < 400; y += 40) d += `M0 ${y}H320`;
    return `<path d="${d}" stroke="rgba(255,255,255,0.05)" fill="none"/>`;
})();

const B = '#60A5FA'; // blue-400 — primary strokes on night
const L = '#C4B5FD'; // lavender — secondary strokes

const MOTIFS: string[] = [
    // 01 Donation — rupee coin + receipt stub
    `<circle cx="160" cy="168" r="52" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <text x="160" y="184" font-family="monospace" font-size="46" font-weight="700" fill="${B}" text-anchor="middle">₹</text>
     <path d="M108 246h104M120 262h80" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 8"/>`,
    // 02 Earmarked — segregated compartments
    `<rect x="100" y="110" width="120" height="120" rx="10" stroke="${B}" stroke-width="3" fill="none"/>
     <path d="M140 110v120M180 110v120" stroke="${B}" stroke-width="3"/>
     <rect x="100" y="110" width="40" height="120" rx="10" fill="rgba(196,181,253,0.28)" stroke="none"/>
     <path d="M116 258h88" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 8"/>`,
    // 03 Locked — escrow vault padlock
    `<rect x="112" y="164" width="96" height="76" rx="12" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <path d="M132 164v-22a28 28 0 0 1 56 0v22" stroke="${B}" stroke-width="3" fill="none"/>
     <circle cx="160" cy="198" r="10" fill="${L}"/>
     <path d="M160 208v14" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`,
    // 04 Milestone — ascending tranches
    `<path d="M104 250h112" stroke="${B}" stroke-width="3"/>
     <rect x="112" y="216" width="28" height="34" rx="6" stroke="${B}" stroke-width="3" fill="none"/>
     <rect x="148" y="188" width="28" height="62" rx="6" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <rect x="184" y="160" width="28" height="90" rx="6" stroke="${B}" stroke-width="3" fill="none"/>
     <circle cx="126" cy="204" r="5" fill="${L}"/><circle cx="162" cy="176" r="5" fill="${L}"/><circle cx="198" cy="148" r="5" fill="${L}"/>`,
    // 05 Evidence — fingerprinted document
    `<path d="M112 108h72l24 24v148a10 10 0 0 1-10 10h-86a10 10 0 0 1-10-10V118a10 10 0 0 1 10-10z" stroke="${B}" stroke-width="3" fill="none"/>
     <path d="M184 108v24h24" stroke="${B}" stroke-width="3" fill="none"/>
     <path d="M122 170h56M122 190h72M122 210h64M122 230h70" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-dasharray="12 7"/>
     <circle cx="196" cy="252" r="14" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.18)"/>`,
    // 06 Verification — OCR scan frame
    `<path d="M104 128v-24h24M192 104h24v24M216 240v24h-24M128 264h-24v-24" stroke="${B}" stroke-width="3" fill="none"/>
     <path d="M136 184l16 16 32-36" stroke="${L}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
     <path d="M112 184h20M188 184h20" stroke="${B}" stroke-width="3" stroke-dasharray="6 6"/>`,
    // 07 Approval — auditor sign-off
    `<circle cx="160" cy="158" r="40" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <path d="M142 158l13 13 24-27" stroke="${B}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
     <path d="M104 236c14-10 22 10 34 0s22 10 34 0 22 10 34 0" stroke="${L}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    // 08 Release — multisig key through the gate
    `<path d="M112 120v128M208 120v128" stroke="${B}" stroke-width="3" stroke-linecap="round"/>
     <circle cx="140" cy="184" r="18" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <path d="M158 184h58M200 184v14M216 184v12" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
     <path d="M132 248l14 14 14-14" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // 09 Audit — hash-chained public ledger
    `<ellipse cx="128" cy="184" rx="22" ry="14" stroke="${B}" stroke-width="3" fill="none" transform="rotate(-20 128 184)"/>
     <ellipse cx="160" cy="184" rx="22" ry="14" stroke="${B}" stroke-width="3" fill="rgba(37,99,235,0.10)"/>
     <ellipse cx="192" cy="184" rx="22" ry="14" stroke="${B}" stroke-width="3" fill="none" transform="rotate(20 192 184)"/>
     <path d="M148 252l12 12 12-12" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
     <path d="M112 264h96" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 8"/>`,
];

function stageArt(i: number): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect width="320" height="400" fill="#14141B"/>${ART_GRID}<g opacity="0.9">${MOTIFS[i]}</g><text x="272" y="374" font-family="monospace" font-size="42" font-weight="700" fill="rgba(96,165,250,0.20)" text-anchor="middle">${STAGES[i].id}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMAGES = STAGES.map((s, i) => ({ src: stageArt(i), title: s.title, sub: s.sub }));

/* --------------------------------------------------------------------------
   Tunnel geometry (stock golden-angle placement, unchanged)
   -------------------------------------------------------------------------- */

interface TunnelCardData {
    item: { src: string; title: string; sub: string };
    angleCos: number;
    angleSin: number;
    radiusFactorX: number;
    radiusFactorY: number;
    rotationZ: number;
    index: number;
}

const TUNNEL_CARDS: TunnelCardData[] = IMAGES.map((item, i) => {
    const goldenAngle = i * 137.5 * (Math.PI / 180);
    const radiusFactorX = 0.28 + (i % 3) * 0.08;
    const radiusFactorY = 0.26 + (i % 2) * 0.09;

    return {
        item,
        angleCos: Math.cos(goldenAngle),
        angleSin: Math.sin(goldenAngle),
        radiusFactorX,
        radiusFactorY,
        rotationZ: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
        index: i,
    };
});

const SPRING_CONFIG = { stiffness: 60, damping: 25, mass: 0.5 };

interface StageDimensions {
    width: number;
    height: number;
    isMobile: boolean;
}

function useCameraParallax(enabled: boolean) {
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const x = useSpring(rawX, SPRING_CONFIG);
    const y = useSpring(rawY, SPRING_CONFIG);

    useEffect(() => {
        if (!enabled) return;
        const onMove = (e: PointerEvent) => {
            rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
            rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
    }, [enabled, rawX, rawY]);

    return { x, y };
}

interface TunnelCardProps {
    card: TunnelCardData;
    progress: MotionValue<number>;
    pointer: { x: MotionValue<number>; y: MotionValue<number> };
    total: number;
    stage: StageDimensions;
}

function TunnelCard({ card, progress, pointer, total, stage }: TunnelCardProps) {
    const staggerSpan = 0.55;
    const start = (card.index / total) * (1 - staggerSpan);
    const end = start + staggerSpan;

    const localProgress = useTransform(progress, [start, end], [0, 1]);

    const farZ = stage.isMobile ? -1200 : -1700;
    const nearZ = stage.isMobile ? 350 : 500;
    const z = useTransform(localProgress, [0, 1], [farZ, nearZ]);

    const opacity = useTransform(localProgress, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);

    const cardWidth = stage.isMobile
        ? Math.max(130, Math.min(180, stage.width * 0.38))
        : Math.max(180, Math.min(270, stage.width * 0.18));

    const baseX = card.angleCos * (stage.width * card.radiusFactorX);
    const baseY = card.angleSin * (stage.height * card.radiusFactorY);
    const panStrength = stage.isMobile ? 20 : 45;

    const transform = useTransform(
        [z, pointer.x, pointer.y],
        ([currZ, px, py]: number[]) => {
            const offsetX = baseX - px * panStrength;
            const offsetY = baseY - py * panStrength;
            return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${card.rotationZ}deg)`;
        }
    );

    return (
        <motion.div
            style={{
                width: cardWidth,
                transform,
                opacity,
                zIndex: card.index + 1,
            }}
            className="pointer-events-auto absolute left-1/2 top-1/2 aspect-[4/5] will-change-transform select-none cursor-pointer"
        >
            <div className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-night-surface shadow-2xl shadow-black/80 transition-all duration-500 hover:border-accent/60 hover:shadow-[0_24px_64px_-24px_rgba(37,99,235,0.45)]">
                <img
                    src={card.item.src}
                    alt={`Stage ${card.item.title}`}
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent p-4 sm:p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300">
                        Stage {STAGES[card.index].id}
                    </span>
                    <span className="mt-1 text-sm font-semibold tracking-tight text-white sm:text-base">
                        {card.item.title}
                    </span>
                    <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-night-mute">
                        {card.item.sub}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default function PerspectiveTunnelHero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();

    const [stage, setStage] = useState<StageDimensions>({
        width: 1440,
        height: 900,
        isMobile: false,
    });

    useEffect(() => {
        const updateDimensions = () => {
            setStage({
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth < 768,
            });
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Raw motion value controlled directly by mouse wheel / touch / keyboard
    const rawProgress = useMotionValue(0);
    const smoothProgress = useSpring(rawProgress, {
        stiffness: 80,
        damping: 30,
        restDelta: 0.0001,
    });

    // HUD state derived from the smoothed progress
    const [hud, setHud] = useState({ stage: 0, started: false, done: false });
    useMotionValueEvent(smoothProgress, "change", (v) => {
        setHud({
            stage: Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length))),
            started: v > 0.04,
            done: v > 0.985,
        });
    });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const STEP = 0.0008;

        const handleWheel = (e: WheelEvent) => {
            const current = rawProgress.get();
            const movable = (e.deltaY > 0 && current < 1) || (e.deltaY < 0 && current > 0);
            if (movable) e.preventDefault();
            rawProgress.set(Math.min(1, Math.max(0, current + e.deltaY * STEP)));
        };

        // Touch: same contract — swipe drives the tunnel, and the gesture is
        // released to native scroll as soon as the flythrough can no longer move.
        let lastY: number | null = null;
        const TOUCH_STEP = 0.0024;
        const handleTouchStart = (e: TouchEvent) => {
            lastY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (lastY === null) return;
            const y = e.touches[0].clientY;
            const dy = lastY - y; // >0 = swipe up = travel forward
            lastY = y;
            const current = rawProgress.get();
            const movable = (dy > 0 && current < 1) || (dy < 0 && current > 0);
            if (movable) e.preventDefault();
            rawProgress.set(Math.min(1, Math.max(0, current + dy * TOUCH_STEP)));
        };
        const handleTouchEnd = () => {
            lastY = null;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const jumps: Record<string, number> = {
                ArrowDown: 0.12,
                PageDown: 0.3,
                ArrowUp: -0.12,
                PageUp: -0.3,
            };
            const jump = jumps[e.key];
            if (jump === undefined) return;
            const current = rawProgress.get();
            const movable = (jump > 0 && current < 1) || (jump < 0 && current > 0);
            if (!movable) return;
            e.preventDefault();
            rawProgress.set(Math.min(1, Math.max(0, current + jump)));
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: false });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener("wheel", handleWheel);
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [rawProgress]);

    const pointer = useCameraParallax(!reduce);

    const titleScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.08, 1.35]);
    const titleOpacity = useTransform(smoothProgress, [0, 0.55, 0.85, 1], [1, 1, 0.55, 0]);
    const promptOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);

    return (
        <section
            ref={containerRef}
            tabIndex={0}
            aria-label="VERA fund trail — scroll to travel from donation to on-chain release"
            onKeyDown={(e) => {
                const jumps: Record<string, number> = {
                    ArrowDown: 0.12,
                    PageDown: 0.3,
                    ArrowUp: -0.12,
                    PageUp: -0.3,
                };
                const jump = jumps[e.key];
                if (jump === undefined) return;
                const current = rawProgress.get();
                const movable = (jump > 0 && current < 1) || (jump < 0 && current > 0);
                if (!movable) return;
                e.preventDefault();
                rawProgress.set(Math.min(1, Math.max(0, current + jump)));
            }}
            className="theme-night relative flex h-[calc(100svh-96px)] w-full select-none items-center justify-center overflow-hidden bg-night text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            style={{
                perspective: stage.isMobile ? "900px" : "1200px",
                transformStyle: "preserve-3d",
            }}
        >
            {/* Immersive background: ribbon field, fine grid, blue pixel dust, accent glow */}
            <RibbonField
                className="absolute inset-0 opacity-40"
                style={{
                    maskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, black 30%, transparent 88%)",
                    WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, black 30%, transparent 88%)",
                }}
            />
            <div
                aria-hidden
                className="bg-grid-night pointer-events-none absolute inset-0 opacity-80"
                style={{
                    maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 55%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 55%, transparent 100%)",
                }}
            />
            <div
                aria-hidden
                className="bg-dots-night pointer-events-none absolute inset-0 opacity-70"
                style={{
                    maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 95%)",
                    WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 95%)",
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(circle at center, rgba(37,99,235,0.20) 0%, transparent 72%)",
                }}
            />

            {/* Depth ring guides */}
            <div aria-hidden className="pointer-events-none absolute h-[48vmin] w-[48vmin] rounded-full border border-blue-400/15" />
            <div aria-hidden className="pointer-events-none absolute h-[76vmin] w-[76vmin] rounded-full border border-dashed border-white/10" />
            <div aria-hidden className="pointer-events-none absolute h-[104vmin] w-[104vmin] rounded-full border border-lav/10" />

            {/* Central anchor typography */}
            <motion.div
                style={{ scale: titleScale, opacity: titleOpacity }}
                className="pointer-events-none z-0 flex max-w-3xl flex-col items-center px-6 text-center"
            >
                <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.35em] text-blue-400">
                    <span className="block h-[7px] w-[7px] bg-blue-400" />
                    Proof-gated money · Ethereum + Solana
                </p>
                <h1 className="text-4xl font-semibold leading-[1.06] tracking-tightest sm:text-6xl lg:text-[64px]">
                    <span className="block text-white">Every rupee traceable.</span>
                    <span className="block text-blue-400">Audited before it moves.</span>
                </h1>
                <p className="mt-5 max-w-[40ch] text-sm font-light leading-relaxed text-night-mute sm:text-base">
                    Scroll to travel the fund trail — from donation to on-chain release.
                </p>
            </motion.div>

            {/* Scroll prompt */}
            <motion.div
                style={{ opacity: promptOpacity }}
                className="pointer-events-none absolute bottom-8 z-20 flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-night-mute"
            >
                <span>Scroll to travel the trail</span>
                <div className="h-6 w-px bg-gradient-to-b from-blue-400 to-transparent" />
            </motion.div>

            {/* Trail HUD — real pipeline stages, no fabricated metrics */}
            <div className="pointer-events-none absolute bottom-8 left-6 z-20 hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-night-mute sm:flex">
                <span className="text-blue-300">
                    Fund trail · stage {STAGES[hud.stage].id}/09
                </span>
                <span className="hidden md:inline text-night-dim">
                    {STAGES[hud.stage].title}
                </span>
                <span className="relative h-px w-24 overflow-hidden bg-white/15">
                    <motion.span
                        style={{ scaleX: smoothProgress }}
                        className="absolute inset-0 origin-left bg-blue-400"
                    />
                </span>
            </div>

            {/* Continue affordance once the flythrough completes */}
            {hud.done && (
                <button
                    type="button"
                    onClick={() =>
                        document
                            .getElementById("protocol-metrics")
                            ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="btn-dark absolute bottom-8 z-30 !py-2.5 !text-xs animate-rise"
                >
                    Continue to the platform ↓
                </button>
            )}

            {/* 3D Z-space plane */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
            >
                {TUNNEL_CARDS.map((card, i) => (
                    <TunnelCard
                        key={i}
                        card={card}
                        progress={smoothProgress}
                        pointer={pointer}
                        total={TUNNEL_CARDS.length}
                        stage={stage}
                    />
                ))}
            </div>
        </section>
    );
}
