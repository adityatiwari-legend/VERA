"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ThreeWaterV from "./ThreeWaterV";
import ConstellationGrid from "./ui/constellation-grid";

// =========================================================================
// TIMING CONSTANTS (Exposed at top for easy tuning)
// =========================================================================
export const INTRO_TIMINGS = {
  STAGE_1_GRID_START: 0.0,
  STAGE_1_GRID_DURATION: 0.4,
  STAGE_2_COMPASS_START: 0.2,
  STAGE_2_COMPASS_DURATION: 0.8,
  STAGE_3_BEAMS_START: 0.4,            // 2 sets of 3 lines on each side start drawing from bottom
  STAGE_3_BEAMS_DURATION: 1.4,         // Lines reach the end of the screen at ~1.7s
  STAGE_3_BEAMS_STAGGER: 0.02,
  STAGE_4_BOLD_V_START: 1.7,           // When lines reach screen end -> Outlined bold V draws!
  STAGE_4_BOLD_V_DURATION: 1.2,        // Traces the solid bold V (completes at 2.9s)
  STAGE_5_CIRCLE_FADE_START: 2.95,     // Background lines fade away circularly
  STAGE_5_CIRCLE_FADE_DURATION: 1.1,   // Completes by ~4.05s

  // CLEAR WATER DROPLET BUBBLE: EXPANSION & CONVERGENCE SEQUENCE
  STAGE_6_BUBBLE_SPAWN_START: 4.05,    // Clear water droplet bubble pops out at centre
  STAGE_6_BUBBLE_SPAWN_DURATION: 0.45, // Visibly emerges with natural water droplet wobble
  STAGE_6_BUBBLE_EXPAND_DURATION: 0.85,// Bubble expands outward across the whole screen & expands V
  STAGE_6_BUBBLE_CONVERGE_DURATION: 0.90,// Bubble converges back into the center, V returns to original size
  STAGE_7_HOLD_AFTER_SETTLE: 2.2,      // Hold pristine isolated bold V at original size
  STAGE_8_EXIT_IRIS_DURATION: 1.0,     // Circle shrinks from whole page to center
};

export default function WelcomingAnimation({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const postBlastBgRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isExitingRef = useRef(false);

  // Background lines container (fades away circularly in Stage 5)
  const backgroundLinesGroupRef = useRef<SVGGElement>(null);
  const circleWipeMaskRef = useRef<SVGCircleElement>(null);
  const spotlightCircleRef = useRef<SVGCircleElement>(null);

  // Ending Iris: circle shrinking from whole page to center
  const exitIrisCircleRef = useRef<SVGCircleElement>(null);

  // 1. Scaffolding: 2 sets of 3 lines on each side (12 lines total forming the V construction)
  const outerLeftRefs = useRef<(SVGPathElement | null)[]>([]);
  const innerLeftRefs = useRef<(SVGPathElement | null)[]>([]);
  const outerRightRefs = useRef<(SVGPathElement | null)[]>([]);
  const innerRightRefs = useRef<(SVGPathElement | null)[]>([]);

  // 2. The Solid Outlined Bold V, 3D Water V, and Liquid Wrapper
  const vShapeWrapperRef = useRef<SVGGElement>(null);
  const boldVFullRef = useRef<SVGPathElement>(null);
  const threeVWrapperRef = useRef<HTMLDivElement>(null);

  // Scroll-driven 3D presentation state (anticlockwise V rotation & revolving slides)
  const [scrollProgress, setScrollProgress] = useState(0);
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const hasUserScrolledRef = useRef(false);

  // 3. Clear Transparent Water Droplet Bubble Refs (Center-Locked)
  const bubbleBlastContainerRef = useRef<HTMLDivElement>(null);
  const bubbleWobbleRef = useRef<HTMLDivElement>(null);
  const bubbleRippleRingRef = useRef<SVGCircleElement>(null);
  const watercolorGroupRef = useRef<SVGGElement>(null);
  const watercolorTopLeftRef = useRef<SVGGElement>(null);
  const watercolorBottomRightRef = useRef<SVGGElement>(null);

  // 4. Three horizontal crossbars
  const crossbarRefs = useRef<(SVGPathElement | null)[]>([]);

  // 5. Background architectural elements
  const outerCircleRef = useRef<SVGCircleElement>(null);
  const innerCircleRef = useRef<SVGCircleElement>(null);
  const innerPolyRef = useRef<SVGPolygonElement>(null);
  const radialSpokesGroupRef = useRef<SVGGElement>(null);
  const streamingHorizontalRefs = useRef<(SVGPathElement | null)[]>([]);
  const streamingVerticalRefs = useRef<(SVGPathElement | null)[]>([]);
  const scanBeamRef = useRef<SVGLineElement>(null);
  const cornerTicksRef = useRef<(SVGGElement | null)[]>([]);

  // 6. Brand & status text
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [telemetryCipher, setTelemetryCipher] = useState("PROGRAMMABLE CAPITAL ESCROW PROTOCOL");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll and interaction listeners: allow user to smoothly transition or skip when ready
  useEffect(() => {
    const handleWheel = () => {
      if (!isExitingRef.current) {
        playShrinkingCircleExit(0.8);
      }
    };

    const handleTouchMove = () => {
      if (!isExitingRef.current) {
        playShrinkingCircleExit(0.8);
      }
    };

    const handleClick = () => {
      if (!isExitingRef.current) {
        playShrinkingCircleExit(0.8);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  // Play the cinematic ending: pure, clean circle shrinking from whole page to center
  const playShrinkingCircleExit = (speedMultiplier = 1.0) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    const duration = INTRO_TIMINGS.STAGE_8_EXIT_IRIS_DURATION * speedMultiplier;

    const exitTl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    // 1. Shrink SVG exit iris clip smoothly from whole page down to center
    if (exitIrisCircleRef.current) {
      exitTl.to(
        exitIrisCircleRef.current,
        {
          attr: { r: 0 },
          duration: duration,
          ease: "power3.inOut",
        },
        0
      );
    }

    // 2. Shrink outer container clip-path simultaneously (borderless iris collapse)
    if (containerRef.current) {
      exitTl.fromTo(
        containerRef.current,
        { clipPath: "circle(150% at 50% 50%)" },
        {
          clipPath: "circle(0% at 50% 50%)",
          duration: duration,
          ease: "power3.inOut",
        },
        0
      );

      // Gentle scale into center
      exitTl.to(
        [vShapeWrapperRef.current, threeVWrapperRef.current, textContainerRef.current],
        {
          scale: 0.85,
          opacity: 0.15,
          transformOrigin: "center center",
          duration: duration * 0.9,
          ease: "power2.inOut",
        },
        0
      );
    }
  };

  // Keyboard shortcut (ESC to trigger clean exit if user explicitly wants to leave)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playShrinkingCircleExit(0.6);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [windowSize]);

  // Telemetry status cycling effect
  useEffect(() => {
    const GLYPHS = "0123456789ABCDEF";
    const CIPHER_STRINGS = [
      "PROGRAMMABLE CAPITAL ESCROW PROTOCOL",
      "SHA-256 PROOF-LOCKED // IMMUTABLE LEDGER",
      "PHYSICAL MILESTONE CONVERGENCE // ZERO DRIFT",
      "DUAL-KEY AUDITOR CONSENSUS ACTIVE",
    ];

    let stringIndex = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const currentTarget = CIPHER_STRINGS[stringIndex % CIPHER_STRINGS.length];
      const scrambled = currentTarget
        .split("")
        .map((char) => {
          if (char === " " || char === "/" || char === "%") return char;
          if (Math.random() < 0.2) {
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          return char;
        })
        .join("");

      setTelemetryCipher(scrambled);

      if (step % 45 === 0) {
        stringIndex++;
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Master GSAP Timeline
  useEffect(() => {
    if (windowSize.width === 0) return;

    const { width, height } = windowSize;
    const cx = width / 2;
    const cy = height / 2;

    const ctx = gsap.context(() => {
      // Master timeline: plays the transition and holds indefinitely — the 3D shape and background remain there!
      const tl = gsap.timeline();

      // 1. Prepare 12 scaffolding lines (4 beams of 3 lines)
      const allBeamPaths = [
        ...outerLeftRefs.current,
        ...innerLeftRefs.current,
        ...outerRightRefs.current,
        ...innerRightRefs.current,
      ].filter(Boolean) as SVGPathElement[];

      allBeamPaths.forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: len,
          strokeDashoffset: len,
          opacity: 0.85,
        });
      });

      // 2. Prepare Solid Outlined Bold V & wrapper
      if (boldVFullRef.current) {
        const len = boldVFullRef.current.getTotalLength();
        gsap.set(boldVFullRef.current, {
          strokeDasharray: len,
          strokeDashoffset: len,
          opacity: 1,
        });
      }

      if (vShapeWrapperRef.current) {
        gsap.set(vShapeWrapperRef.current, {
          scale: 1.0,
          svgOrigin: `${cx} ${cy}`,
        });
      }

      // 3. Prepare horizontal crossbars
      const allCrossbars = crossbarRefs.current.filter(Boolean) as SVGPathElement[];
      allCrossbars.forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: len,
          strokeDashoffset: len,
          opacity: 0.6,
        });
      });

      // 4. Prepare background streaming lines
      const allStreaming = [
        ...streamingHorizontalRefs.current,
        ...streamingVerticalRefs.current,
      ].filter(Boolean) as SVGPathElement[];

      allStreaming.forEach((line) => {
        const len = line.getTotalLength();
        gsap.set(line, {
          strokeDashoffset: len,
          opacity: 0,
        });
      });

      // 5. Prepare Plain Circular Water Bubble & Transformed Background
      if (bubbleBlastContainerRef.current) {
        gsap.set(bubbleBlastContainerRef.current, {
          scale: 0,
          opacity: 0,
          transformOrigin: "center center",
        });
      }

      if (postBlastBgRef.current) {
        gsap.set(postBlastBgRef.current, {
          clipPath: "circle(0% at 50% 50%)",
          opacity: 0,
        });
      }

      // 6. Prepare 3D Water V Model
      if (threeVWrapperRef.current) {
        gsap.set(threeVWrapperRef.current, {
          opacity: 0,
          scale: 1.0,
          transformOrigin: "center center",
        });
      }

      // -------------------------------------------------------------
      // STAGE 1 & 2: Background Scaffolding & Crossbars
      // -------------------------------------------------------------
      tl.to(
        allStreaming,
        {
          strokeDashoffset: 0,
          opacity: 1,
          duration: INTRO_TIMINGS.STAGE_1_GRID_DURATION,
          ease: "power2.out",
          stagger: 0.03,
        },
        INTRO_TIMINGS.STAGE_1_GRID_START
      );

      tl.to(
        allCrossbars,
        {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.inOut",
          stagger: 0.05,
        },
        INTRO_TIMINGS.STAGE_2_COMPASS_START
      );

      // -------------------------------------------------------------
      // STAGE 3: The V formation takes place
      // 2 sets of 3 lines on each side act at once, drawing from bottom to top
      // -------------------------------------------------------------
      tl.to(
        allBeamPaths,
        {
          strokeDashoffset: 0,
          duration: INTRO_TIMINGS.STAGE_3_BEAMS_DURATION,
          ease: "power3.inOut",
          stagger: INTRO_TIMINGS.STAGE_3_BEAMS_STAGGER,
        },
        INTRO_TIMINGS.STAGE_3_BEAMS_START
      );

      // Scramble cipher text reveal
      if (textContainerRef.current) {
        tl.fromTo(
          textContainerRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
          2.0
        );
      }

      // -------------------------------------------------------------
      // STAGE 4: When lines reach screen end -> OUTLINED BOLD V DRAWS!
      // -------------------------------------------------------------
      if (boldVFullRef.current) {
        tl.to(
          boldVFullRef.current,
          {
            strokeDashoffset: 0,
            duration: INTRO_TIMINGS.STAGE_4_BOLD_V_DURATION,
            ease: "power2.inOut",
          },
          INTRO_TIMINGS.STAGE_4_BOLD_V_START
        );

        const boldVEndTime = INTRO_TIMINGS.STAGE_4_BOLD_V_START + INTRO_TIMINGS.STAGE_4_BOLD_V_DURATION;
        tl.to(
          boldVFullRef.current,
          {
            filter: "url(#bold-v-surge)",
            duration: 0.35,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut",
          },
          boldVEndTime
        );
      }

      // -------------------------------------------------------------
      // STAGE 5: AFTER BOLD V FORMS -> BACKGROUND LINES FADE AWAY
      // Dissolves circularly in an ultra-subtle, gentle way
      // -------------------------------------------------------------
      const maxRadius = Math.hypot(width, height) * 0.75;

      if (circleWipeMaskRef.current) {
        tl.fromTo(
          circleWipeMaskRef.current,
          { attr: { r: 0 } },
          {
            attr: { r: maxRadius },
            duration: INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_DURATION,
            ease: "power2.inOut",
          },
          INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_START
        );
      }

      if (backgroundLinesGroupRef.current) {
        tl.to(
          backgroundLinesGroupRef.current,
          {
            opacity: 0,
            duration: INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_DURATION,
            ease: "power2.inOut",
          },
          INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_START
        );
      }

      // Fade out tagline text so only the bold V is isolated for the plain bubble blast
      if (textContainerRef.current) {
        tl.to(
          textContainerRef.current,
          {
            opacity: 0,
            y: -8,
            duration: 0.6,
            ease: "power2.inOut",
          },
          INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_START + 0.3
        );
      }

      if (spotlightCircleRef.current) {
        tl.fromTo(
          spotlightCircleRef.current,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 0.15,
            scale: 1,
            duration: INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_DURATION,
            ease: "power2.out",
          },
          INTRO_TIMINGS.STAGE_5_CIRCLE_FADE_START
        );
      }

      // -------------------------------------------------------------
      // STAGE 6: CLEAR TRANSPARENT WATER DROPLET BUBBLE EFFECT
      // 1. A clear transparent water droplet bubble pops out at centre (cx, cy)
      // 2. Bubble EXPANDS outward across the whole screen, affecting the bold V shape:
      //    - Magnifies & expands the bold V shape with liquid wave displacement & glow
      // 3. And after maximum expansion:
      //    - Visible bubble circle fades out smoothly
      //    - Bold V shape converges smoothly back to its original resting size & position
      // -------------------------------------------------------------
      const spawnStart = INTRO_TIMINGS.STAGE_6_BUBBLE_SPAWN_START;
      const spawnDur = INTRO_TIMINGS.STAGE_6_BUBBLE_SPAWN_DURATION;
      const expandStart = spawnStart + spawnDur;
      const expandDur = INTRO_TIMINGS.STAGE_6_BUBBLE_EXPAND_DURATION;
      const convergeStart = expandStart + expandDur;
      const convergeDur = INTRO_TIMINGS.STAGE_6_BUBBLE_CONVERGE_DURATION;

      // 1. Water droplet bubble emerges at center with liquid wobble
      if (bubbleBlastContainerRef.current) {
        tl.fromTo(
          bubbleBlastContainerRef.current,
          { scale: 0, opacity: 0 },
          {
            scale: 1.0,
            opacity: 1,
            duration: spawnDur,
            ease: "back.out(2.0)",
          },
          spawnStart
        );
      }

      // Natural liquid droplet surface-tension wobble during spawn
      if (bubbleWobbleRef.current) {
        tl.fromTo(
          bubbleWobbleRef.current,
          { scaleX: 0.72, scaleY: 1.28 },
          {
            scaleX: 1.0,
            scaleY: 1.0,
            duration: spawnDur,
            ease: "elastic.out(1.2, 0.4)",
          },
          spawnStart
        );
      }

      // Ripple ring expanding gently on spawn
      if (bubbleRippleRingRef.current) {
        tl.fromTo(
          bubbleRippleRingRef.current,
          { attr: { r: 65 }, opacity: 0.8 },
          {
            attr: { r: 104 },
            opacity: 0.2,
            duration: spawnDur,
            ease: "power2.out",
          },
          spawnStart
        );
      }

      // 2. BUBBLE EXPANDS OUTWARD OVER SCREEN & AFFECTS BOLD V
      if (bubbleBlastContainerRef.current) {
        tl.to(
          bubbleBlastContainerRef.current,
          {
            scale: 8.5,
            opacity: 0.95,
            duration: expandDur,
            ease: "power2.inOut",
          },
          expandStart
        );
      }

      // Transformed background spreads across the whole page with the blast wave!
      if (postBlastBgRef.current) {
        tl.fromTo(
          postBlastBgRef.current,
          { clipPath: "circle(0% at 50% 50%)", opacity: 0 },
          {
            clipPath: "circle(150% at 50% 50%)",
            opacity: 1,
            duration: expandDur,
            ease: "power2.inOut",
          },
          expandStart
        );
      }

      // Bright purple watercolor floating & swirling inside the bubble when it blasts
      if (watercolorGroupRef.current) {
        tl.fromTo(
          watercolorGroupRef.current,
          { opacity: 0.2, scale: 0.8 },
          {
            opacity: 0.95,
            scale: 1.2,
            duration: expandDur,
            ease: "power2.out",
          },
          expandStart
        );
      }

      if (watercolorTopLeftRef.current) {
        tl.to(
          watercolorTopLeftRef.current,
          {
            x: -8,
            y: -10,
            rotation: -18,
            duration: expandDur,
            ease: "sine.inOut",
          },
          expandStart
        );
      }

      if (watercolorBottomRightRef.current) {
        tl.to(
          watercolorBottomRightRef.current,
          {
            x: 8,
            y: 10,
            rotation: 20,
            duration: expandDur,
            ease: "sine.inOut",
          },
          expandStart
        );
      }

      // Bold V expands in unison with the water droplet bubble
      if (vShapeWrapperRef.current) {
        tl.to(
          vShapeWrapperRef.current,
          {
            scale: 1.45,
            svgOrigin: `${cx} ${cy}`,
            duration: expandDur,
            ease: "power2.inOut",
          },
          expandStart
        );
      }

      // Quickly switch the bold V shape to the 3D V shape with transparent water effect during the blast!
      const switchTime = expandStart + expandDur * 0.45;
      if (vShapeWrapperRef.current) {
        tl.to(
          vShapeWrapperRef.current,
          {
            opacity: 0,
            duration: 0.22,
            ease: "power2.inOut",
          },
          switchTime
        );
      }

      // 3D Water V emerges seamlessly and converges to original size, remaining there!
      if (threeVWrapperRef.current) {
        tl.fromTo(
          threeVWrapperRef.current,
          { opacity: 0, scale: 1.35 },
          {
            opacity: 1,
            scale: 1.0,
            duration: convergeDur,
            ease: "elastic.out(1.15, 0.48)",
          },
          switchTime + 0.08
        );
      }

      // Fluid liquid wave displacement ripple on V shape
      const dispMap = document.getElementById("waterDispMap");
      if (dispMap) {
        tl.fromTo(
          dispMap,
          { attr: { scale: 0 } },
          {
            attr: { scale: 30 },
            duration: expandDur,
            ease: "sine.inOut",
          },
          expandStart
        );
      }

      // Luminous water droplet caustic glow on bold V
      if (boldVFullRef.current) {
        tl.to(
          boldVFullRef.current,
          {
            filter: "url(#v-water-glow)",
            strokeWidth: "3.4",
            duration: expandDur * 0.7,
            ease: "power2.out",
          },
          expandStart
        );
      }

      // 3. AFTER MAXIMUM EXPANSION -> VISIBLE BUBBLE FADES, BUT EFFECT & ANIMATION REMAIN
      // The visible bubble circle fades out smoothly once it reaches max expansion
      if (bubbleBlastContainerRef.current) {
        tl.to(
          bubbleBlastContainerRef.current,
          {
            opacity: 0,
            duration: 0.35,
            ease: "power2.out",
          },
          convergeStart
        );
      }

      // Bold V shape converges back with the bubble to its original size
      if (vShapeWrapperRef.current) {
        tl.to(
          vShapeWrapperRef.current,
          {
            scale: 1.0,
            svgOrigin: `${cx} ${cy}`,
            duration: convergeDur,
            ease: "elastic.out(1.15, 0.48)",
          },
          convergeStart
        );
      }

      // Liquid wave displacement converges back to flat
      if (dispMap) {
        tl.to(
          dispMap,
          {
            attr: { scale: 0 },
            duration: convergeDur * 0.7,
            ease: "power2.out",
          },
          convergeStart
        );
      }

      // Bold V stroke width and glow settle back to original
      if (boldVFullRef.current) {
        tl.to(
          boldVFullRef.current,
          {
            filter: "url(#bold-v-glow)",
            strokeWidth: "2.8",
            duration: convergeDur * 0.6,
            ease: "power2.out",
          },
          convergeStart
        );
      }

      // -------------------------------------------------------------
      // STAGE 7: HOLD PRISTINE SETTLED V BEFORE EXIT IRIS
      // -------------------------------------------------------------
      tl.to({}, { duration: INTRO_TIMINGS.STAGE_7_HOLD_AFTER_SETTLE });
      tl.call(() => {
        playShrinkingCircleExit(1.0);
      });

      // -------------------------------------------------------------
      // CONTINUOUS BACKGROUND ROTATIONS (Active during construction)
      // -------------------------------------------------------------
      if (outerCircleRef.current) {
        gsap.to(outerCircleRef.current, {
          rotation: 360,
          transformOrigin: "center center",
          duration: 60,
          repeat: -1,
          ease: "none",
        });
      }

      if (innerCircleRef.current) {
        gsap.to(innerCircleRef.current, {
          rotation: -360,
          transformOrigin: "center center",
          duration: 40,
          repeat: -1,
          ease: "none",
        });
      }

      if (innerPolyRef.current) {
        gsap.to(innerPolyRef.current, {
          rotation: 360,
          transformOrigin: "center center",
          duration: 28,
          repeat: -1,
          ease: "none",
        });
      }

      if (radialSpokesGroupRef.current) {
        gsap.to(radialSpokesGroupRef.current, {
          rotation: 360,
          transformOrigin: "center center",
          duration: 85,
          repeat: -1,
          ease: "none",
        });
      }

      streamingHorizontalRefs.current.forEach((line, idx) => {
        if (line) {
          const dir = idx % 2 === 0 ? 1 : -1;
          gsap.to(line, {
            strokeDashoffset: `${dir > 0 ? "+=" : "-="}260`,
            duration: 15 + idx * 2,
            repeat: -1,
            ease: "none",
          });
        }
      });

      streamingVerticalRefs.current.forEach((line, idx) => {
        if (line) {
          gsap.to(line, {
            strokeDashoffset: "-=220",
            duration: 16 + idx * 3,
            repeat: -1,
            ease: "none",
          });
        }
      });

      if (scanBeamRef.current) {
        gsap.fromTo(
          scanBeamRef.current,
          { attr: { y1: 0, y2: 0 }, opacity: 0 },
          {
            attr: { y1: height, y2: height },
            opacity: 0.22,
            duration: 5.0,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          }
        );
      }

      cornerTicksRef.current.forEach((tick, i) => {
        if (tick) {
          gsap.to(tick, {
            rotation: "+=90",
            transformOrigin: "center center",
            duration: 3.5,
            repeat: -1,
            ease: "power2.inOut",
            delay: i * 0.2,
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [windowSize]);

  if (windowSize.width === 0) return null;

  const { width, height } = windowSize;
  const cx = width / 2;
  const cy = height / 2;
  const maxDiagonal = Math.hypot(width, height);

  // =========================================================================
  // V FORMATION GEOMETRY: 2 SETS OF 3 LINES PER SIDE FORMING THE CENTRAL DIAMOND
  // =========================================================================
  const R = Math.min(width * 0.32, height * 0.38, 270);
  const R_inner = R * 0.46;
  const R_poly = R * 0.32;

  // Slopes: ~62° from horizontal
  const beamAngleRad = (62 * Math.PI) / 180;
  const cosA = Math.cos(beamAngleRad);
  const sinA = Math.sin(beamAngleRad);

  // Left beams unit vector (up and left)
  const uLx = -cosA;
  const uLy = -sinA;
  const nLx = -uLy;
  const nLy = uLx;

  // Right beams unit vector (up and right)
  const uRx = cosA;
  const uRy = -sinA;
  const nRx = uRy;
  const nRy = -uRx;

  // Apex crossings for V:
  const apexLowestY = cy + R * 0.94;
  const apexUpperY = cy + R * 0.42;

  // 3-line parameters
  const lineSpacing = 7;
  const lineOffsets = [-1, 0, 1];

  // Vertical bounds for construction lines
  const topY = -40;
  const bottomY = height + 40;

  const computeBeamEndpoints = (anchorX: number, anchorY: number, ux: number, uy: number) => {
    const tTop = (topY - anchorY) / uy;
    const tBottom = (bottomY - anchorY) / uy;

    const startX = anchorX + tBottom * ux;
    const startY = bottomY;
    const endX = anchorX + tTop * ux;
    const endY = topY;

    return { startX, startY, endX, endY };
  };

  // 1. Outer Left Beam (anchored at lowest apex crossing)
  const outerLeftBase = computeBeamEndpoints(cx, apexLowestY, uLx, uLy);

  // 2. Inner Left Beam (anchored at upper diamond crossing)
  const innerLeftBase = computeBeamEndpoints(cx, apexUpperY, uLx, uLy);

  // 3. Outer Right Beam (anchored at lowest apex crossing)
  const outerRightBase = computeBeamEndpoints(cx, apexLowestY, uRx, uRy);

  // 4. Inner Right Beam (anchored at upper diamond crossing)
  const innerRightBase = computeBeamEndpoints(cx, apexUpperY, uRx, uRy);

  // =========================================================================
  // SOLID OUTLINED BOLD V GEOMETRY
  // =========================================================================
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

  const ptTL_outer = { x: xTL_outer, y: yTopBoundary };
  const ptBottom_outer = { x: cx, y: apexLowestY + lineSpacing + 2 };
  const ptTR_outer = { x: xTR_outer, y: yTopBoundary };
  const ptTR_inner = { x: xTR_inner, y: yTopBoundary };
  const ptBottom_inner = { x: cx, y: apexUpperY - lineSpacing - 2 };
  const ptTL_inner = { x: xTL_inner, y: yTopBoundary };

  // Continuous Full Bold V Outline:
  const boldVFullPath = `M ${ptTL_outer.x} ${ptTL_outer.y} L ${ptBottom_outer.x} ${ptBottom_outer.y} L ${ptTR_outer.x} ${ptTR_outer.y} L ${ptTR_inner.x} ${ptTR_inner.y} L ${ptBottom_inner.x} ${ptBottom_inner.y} L ${ptTL_inner.x} ${ptTL_inner.y} Z`;

  // Horizontal crossbars
  const crossbarYs = [cy - R * 0.74, cy - R * 0.67, cy - R * 0.60];

  // Inner Regular Hexagon Points
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    return `${cx + Math.cos(angle) * R_poly},${cy + Math.sin(angle) * R_poly}`;
  }).join(" ");

  // 6-Spoke Compass Wheel Angles (0°, 60°, 120°, 180°, 240°, 300°)
  const spokeAngles = [0, 60, 120, 180, 240, 300];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#09090B] flex items-center justify-center overflow-hidden select-none"
      style={{ clipPath: "circle(150% at 50% 50%)" }}
    >
      {/* 0. Base Architecture Background */}
      <div className="absolute inset-0 bg-[#09090B]" />

      {/* 0B. Transformed Post-Blast Background Layer (Revealed radially by the blast wave) */}
      <div
        ref={postBlastBgRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          clipPath: "circle(0% at 50% 50%)",
        }}
      >
        <ConstellationGrid />
      </div>
      {/* Top Controls: Status & Optional Exit */}
      <div className="absolute top-6 right-8 z-30 flex items-center gap-6">
        <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-500 uppercase hidden sm:inline">
          INTERACTIVE 3D PRISM • MOVE MOUSE
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            playShrinkingCircleExit(0.5);
          }}
          className="font-mono text-[10px] tracking-[0.25em] text-zinc-400 hover:text-white uppercase transition-colors flex items-center gap-2 group cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-[#00F59B] transition-colors" />
          <span>[ ENTER SITE // ESC ]</span>
        </button>
      </div>

      {/* SVG Canvas for High-Craft Architectural Drafting */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="crisp-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.0" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glowing filter for the Solid Bold Outlined V */}
          <filter id="bold-v-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.0" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Surge pulse filter when Bold V settles */}
          <filter id="bold-v-surge" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Luminous Water Drop Caustic Glow during expansion */}
          <filter id="v-water-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5.0" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Liquid Water Drop Displacement Filter on V Shape */}
          <filter id="waterWarp" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              id="waterTurbulence"
              type="fractalNoise"
              baseFrequency="0.02 0.035"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              id="waterDispMap"
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feMerge>
              <feMergeNode in="displaced" />
            </feMerge>
          </filter>

          {/* Soft blur for the circular background dissolve */}
          <filter id="maskBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="55" />
          </filter>

          {/* Very soft ambient spotlight */}
          <radialGradient id="centerSpotlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.008)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <linearGradient id="scanBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* CIRCULAR BACKGROUND DISSOLVE MASK (Stage 5) */}
          <mask id="bgCircleWipeMask">
            <rect x="0" y="0" width={width} height={height} fill="white" />
            <circle
              ref={circleWipeMaskRef}
              cx={cx}
              cy={cy}
              r="0"
              fill="black"
              filter="url(#maskBlur)"
            />
          </mask>

          {/* ENDING IRIS CLIP: Clean borderless aperture shrinking from whole page to center */}
          <clipPath id="exitIrisClip">
            <circle
              ref={exitIrisCircleRef}
              cx={cx}
              cy={cy}
              r={maxDiagonal}
            />
          </clipPath>
        </defs>

        {/* ============================================================= */}
        {/* WRAPPER CLIPPED BY THE ENDING SHRINKING CIRCLE                */}
        {/* ============================================================= */}
        <g clipPath="url(#exitIrisClip)">
          {/* Subtle ambient spotlight behind Bold V */}
          <circle
            ref={spotlightCircleRef}
            cx={cx}
            cy={cy}
            r={Math.min(width, height) * 0.45}
            fill="url(#centerSpotlight)"
            opacity="0"
            className="origin-center"
          />

          {/* BACKGROUND LINES GROUP (Masked to fade away circularly in Stage 5) */}
          <g ref={backgroundLinesGroupRef} mask="url(#bgCircleWipeMask)">
            {/* Vertical Center Axis */}
            <path
              ref={(el) => { if (el) streamingVerticalRefs.current[0] = el; }}
              d={`M ${cx} 0 L ${cx} ${height}`}
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {/* Vertical Framing Lines */}
            <path
              ref={(el) => { if (el) streamingVerticalRefs.current[1] = el; }}
              d={`M ${cx - R * 0.88} 0 L ${cx - R * 0.88} ${height}`}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <path
              ref={(el) => { if (el) streamingVerticalRefs.current[2] = el; }}
              d={`M ${cx + R * 0.88} 0 L ${cx + R * 0.88} ${height}`}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />

            {/* Horizontal Center Axis */}
            <path
              ref={(el) => { if (el) streamingHorizontalRefs.current[0] = el; }}
              d={`M 0 ${cy} L ${width} ${cy}`}
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {/* Horizontal Top Tangent */}
            <path
              ref={(el) => { if (el) streamingHorizontalRefs.current[1] = el; }}
              d={`M 0 ${cy - R * 0.95} L ${width} ${cy - R * 0.95}`}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            {/* Horizontal Intermediate Line */}
            <path
              ref={(el) => { if (el) streamingHorizontalRefs.current[2] = el; }}
              d={`M 0 ${cy + R * 0.48} L ${width} ${cy + R * 0.48}`}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray="6 8"
            />

            {/* Horizontal Bottom Tangent */}
            <path
              ref={(el) => { if (el) streamingHorizontalRefs.current[3] = el; }}
              d={`M 0 ${cy + R * 0.95} L ${width} ${cy + R * 0.95}`}
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />

            {/* Three Parallel Horizontal Crossbars */}
            {crossbarYs.map((y, idx) => (
              <path
                key={`crossbar-${idx}`}
                ref={(el) => { if (el) crossbarRefs.current[idx] = el; }}
                d={`M 0 ${y} L ${width} ${y}`}
                stroke={idx === 1 ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.2)"}
                strokeWidth={idx === 1 ? "1.2" : "1.0"}
                filter="url(#crisp-glow)"
              />
            ))}

            {/* Concentric Dotted Circles & Inner Polygon */}
            <circle
              ref={outerCircleRef}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            <circle
              ref={innerCircleRef}
              cx={cx}
              cy={cy}
              r={R_inner}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            <polygon
              ref={innerPolyRef}
              points={hexPoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />

            {/* Radial Spokes Wheel */}
            <g ref={radialSpokesGroupRef} className="origin-center">
              {spokeAngles.map((angleDeg, i) => {
                const rad = (angleDeg * Math.PI) / 180;
                const x1 = cx - Math.cos(rad) * R;
                const y1 = cy - Math.sin(rad) * R;
                const x2 = cx + Math.cos(rad) * R;
                const y2 = cy + Math.sin(rad) * R;
                return (
                  <line
                    key={`spoke-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1"
                    strokeDasharray="1 4"
                  />
                );
              })}
            </g>

            {/* Corner Ticks / Crosshairs */}
            {[
              { x: cx - R * 0.88, y: cy - R * 0.95 },
              { x: cx + R * 0.88, y: cy - R * 0.95 },
              { x: cx - R * 0.88, y: cy + R * 0.95 },
              { x: cx + R * 0.88, y: cy + R * 0.95 },
            ].map((pt, i) => (
              <g
                key={`tick-${i}`}
                ref={(el) => { if (el) cornerTicksRef.current[i] = el; }}
                transform={`translate(${pt.x}, ${pt.y})`}
              >
                <line x1="-5" y1="0" x2="5" y2="0" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
              </g>
            ))}

            {/* Luminous Vertical Scanning Beam */}
            <line
              ref={scanBeamRef}
              x1="0"
              y1="0"
              x2={width}
              y2="0"
              stroke="url(#scanBeamGrad)"
              strokeWidth="2"
            />

            {/* The 2 Sets of 3 Lines on Each Side (12 Lines Total) */}
            {lineOffsets.map((offset, i) => {
              const ox = offset * lineSpacing * nLx;
              const oy = offset * lineSpacing * nLy;
              return (
                <path
                  key={`outer-left-${i}`}
                  ref={(el) => { if (el) outerLeftRefs.current[i] = el; }}
                  d={`M ${outerLeftBase.startX + ox} ${outerLeftBase.startY + oy} L ${outerLeftBase.endX + ox} ${outerLeftBase.endY + oy}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={offset === 0 ? 1.2 : 0.9}
                  opacity={offset === 0 ? 0.9 : 0.7}
                  filter="url(#crisp-glow)"
                  strokeLinecap="square"
                />
              );
            })}

            {lineOffsets.map((offset, i) => {
              const ox = offset * lineSpacing * nLx;
              const oy = offset * lineSpacing * nLy;
              return (
                <path
                  key={`inner-left-${i}`}
                  ref={(el) => { if (el) innerLeftRefs.current[i] = el; }}
                  d={`M ${innerLeftBase.startX + ox} ${innerLeftBase.startY + oy} L ${innerLeftBase.endX + ox} ${innerLeftBase.endY + oy}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={offset === 0 ? 1.2 : 0.9}
                  opacity={offset === 0 ? 0.9 : 0.7}
                  filter="url(#crisp-glow)"
                  strokeLinecap="square"
                />
              );
            })}

            {lineOffsets.map((offset, i) => {
              const ox = offset * lineSpacing * nRx;
              const oy = offset * lineSpacing * nRy;
              return (
                <path
                  key={`outer-right-${i}`}
                  ref={(el) => { if (el) outerRightRefs.current[i] = el; }}
                  d={`M ${outerRightBase.startX + ox} ${outerRightBase.startY + oy} L ${outerRightBase.endX + ox} ${outerRightBase.endY + oy}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={offset === 0 ? 1.2 : 0.9}
                  opacity={offset === 0 ? 0.9 : 0.7}
                  filter="url(#crisp-glow)"
                  strokeLinecap="square"
                />
              );
            })}

            {lineOffsets.map((offset, i) => {
              const ox = offset * lineSpacing * nRx;
              const oy = offset * lineSpacing * nRy;
              return (
                <path
                  key={`inner-right-${i}`}
                  ref={(el) => { if (el) innerRightRefs.current[i] = el; }}
                  d={`M ${innerRightBase.startX + ox} ${innerRightBase.startY + oy} L ${innerRightBase.endX + ox} ${innerRightBase.endY + oy}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={offset === 0 ? 1.2 : 0.9}
                  opacity={offset === 0 ? 0.9 : 0.7}
                  filter="url(#crisp-glow)"
                  strokeLinecap="square"
                />
              );
            })}
          </g>

          {/* ========================================================= */}
          {/* LIQUID WATER WRAPPER FOR V SHAPE (Expands & Rebounds)     */}
          {/* ========================================================= */}
          <g
            ref={vShapeWrapperRef}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            filter="url(#waterWarp)"
          >
            {/* SOLID OUTLINED BOLD V */}
            <path
              ref={boldVFullRef}
              d={boldVFullPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              filter="url(#bold-v-glow)"
              strokeLinejoin="miter"
              strokeLinecap="square"
              className="drop-shadow-[0_0_15px_rgba(255,255,255,0.45)]"
            />
          </g>
        </g>
      </svg>

      {/* ============================================================= */}
      {/* 3D WATER V SHAPE (THREE.JS WEBGL WITH WATER REFRACTION)       */}
      {/* Replaces the bold 2D V shape quickly during the bubble blast  */}
      {/* ============================================================= */}
      <div
        ref={threeVWrapperRef}
        className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-0"
      >
        <ThreeWaterV width={width} height={height} cx={cx} cy={cy} R={R} scrollProgress={scrollProgress} />
      </div>

      {/* ============================================================= */}
      {/* CLEAR TRANSPARENT WATER DROPLET BUBBLE (CENTER-LOCKED)        */}
      {/* Expands outward affecting the V, then converges back to center */}
      {/* ============================================================= */}
      <div
        ref={bubbleBlastContainerRef}
        className="fixed top-1/2 left-1/2 pointer-events-none z-25 flex items-center justify-center"
        style={{
          width: "220px",
          height: "220px",
          marginLeft: "-110px",
          marginTop: "-110px",
          transformOrigin: "center center",
        }}
      >
        <div
          ref={bubbleWobbleRef}
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformOrigin: "center center" }}
        >
          <svg
            viewBox="-110 -110 220 220"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Ultra-clear liquid water radial gradient */}
              <radialGradient id="waterDropletInterior" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.28)" />
                <stop offset="35%" stopColor="rgba(255, 255, 255, 0.03)" />
                <stop offset="75%" stopColor="rgba(255, 255, 255, 0.07)" />
                <stop offset="94%" stopColor="rgba(255, 255, 255, 0.55)" />
                <stop offset="98%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" />
              </radialGradient>

              {/* Water Caustic Rim Glow */}
              <filter id="waterRimGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Soft Watercolor Pigment Diffusion Filter */}
              <filter id="watercolorDiffusion" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feColorMatrix
                  type="matrix"
                  values="1 0 0 0 0
                          0 1 0 0 0
                          0 0 1 0 0
                          0 0 0 1.25 0"
                />
              </filter>

              {/* Strict Inner Bubble Boundary (Ensures colors stay inside the bubble) */}
              <clipPath id="bubbleInnerClip">
                <circle cx="0" cy="0" r="95" />
              </clipPath>

              {/* Top-Left Bright Purple Watercolor Gradients */}
              <radialGradient id="purpleInkTopLeft" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.95" />
                <stop offset="25%" stopColor="#C084FC" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#A855F7" stopOpacity="0.6" />
                <stop offset="85%" stopColor="#7E22CE" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#581C87" stopOpacity="0.0" />
              </radialGradient>

              <radialGradient id="purpleInkTopLeftSub" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#F0ABFC" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#9333EA" stopOpacity="0.65" />
                <stop offset="80%" stopColor="#6B21A8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3B0764" stopOpacity="0.0" />
              </radialGradient>

              {/* Bottom-Right Bright Purple Watercolor Gradients */}
              <radialGradient id="purpleInkBottomRight" cx="60%" cy="60%" r="65%">
                <stop offset="0%" stopColor="#F5D0FE" stopOpacity="0.95" />
                <stop offset="30%" stopColor="#D946EF" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#9333EA" stopOpacity="0.55" />
                <stop offset="85%" stopColor="#6B21A8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4A044E" stopOpacity="0.0" />
              </radialGradient>

              <radialGradient id="purpleInkBottomRightSub" cx="55%" cy="55%" r="60%">
                <stop offset="0%" stopColor="#E879F9" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#A855F7" stopOpacity="0.6" />
                <stop offset="80%" stopColor="#7E22CE" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3B0764" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Subtle outer water wave ripple ring */}
            <circle
              ref={bubbleRippleRingRef}
              cx="0"
              cy="0"
              r="98"
              fill="none"
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.2"
            />

            {/* Clear Transparent Water Droplet Body */}
            <circle
              cx="0"
              cy="0"
              r="96"
              fill="url(#waterDropletInterior)"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.8"
              filter="url(#waterRimGlow)"
            />

            {/* ========================================================= */}
            {/* WATERCOLORS FLOATING INSIDE THE BUBBLE (CLIPPED TO RIM)   */}
            {/* ========================================================= */}
            <g clipPath="url(#bubbleInnerClip)" ref={watercolorGroupRef}>
              {/* TOP-LEFT BRIGHT PURPLE FLOATING WATERCOLOR */}
              <g ref={watercolorTopLeftRef} style={{ transformOrigin: "-45px -45px" }}>
                <ellipse
                  cx="-46"
                  cy="-46"
                  rx="48"
                  ry="42"
                  fill="url(#purpleInkTopLeft)"
                  filter="url(#watercolorDiffusion)"
                  style={{ mixBlendMode: "screen" }}
                />
                <path
                  d="M -68 -32 C -55 -60 -25 -65 -15 -42 C -5 -20 -35 -15 -52 -18 Z"
                  fill="url(#purpleInkTopLeftSub)"
                  filter="url(#watercolorDiffusion)"
                  opacity="0.85"
                  style={{ mixBlendMode: "screen" }}
                />
                <circle cx="-25" cy="-28" r="7" fill="#C084FC" opacity="0.65" filter="url(#watercolorDiffusion)" />
                <circle cx="-58" cy="-22" r="5" fill="#E9D5FF" opacity="0.8" filter="url(#watercolorDiffusion)" />
              </g>

              {/* BOTTOM-RIGHT BRIGHT PURPLE FLOATING WATERCOLOR */}
              <g ref={watercolorBottomRightRef} style={{ transformOrigin: "45px 45px" }}>
                <ellipse
                  cx="48"
                  cy="48"
                  rx="46"
                  ry="40"
                  fill="url(#purpleInkBottomRight)"
                  filter="url(#watercolorDiffusion)"
                  style={{ mixBlendMode: "screen" }}
                />
                <path
                  d="M 28 62 C 45 35 68 38 65 60 C 60 78 35 75 22 68 Z"
                  fill="url(#purpleInkBottomRightSub)"
                  filter="url(#watercolorDiffusion)"
                  opacity="0.85"
                  style={{ mixBlendMode: "screen" }}
                />
                <circle cx="28" cy="36" r="6" fill="#D946EF" opacity="0.7" filter="url(#watercolorDiffusion)" />
                <circle cx="56" cy="26" r="4.5" fill="#F5D0FE" opacity="0.85" filter="url(#watercolorDiffusion)" />
              </g>
            </g>

            {/* Water Droplet Top-Left Curved Specular Highlight Arc */}
            <path
              d="M -62 -34 A 74 74 0 0 1 34 -62"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.0"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Crisp Specular Glint Dot */}
            <circle
              cx="-28"
              cy="-52"
              r="3.0"
              fill="#FFFFFF"
              opacity="0.95"
            />

            {/* Bottom-Right Soft Caustic Reflection */}
            <path
              d="M -26 70 A 78 78 0 0 0 70 -22"
              fill="none"
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {/* Real-time Water Lens Distortion Backdrop Filter */}
          <div
            className="absolute inset-[4px] rounded-full pointer-events-none"
            style={{
              backdropFilter: "blur(4px) contrast(1.15) brightness(1.12)",
              WebkitBackdropFilter: "blur(4px) contrast(1.15) brightness(1.12)",
              opacity: 0.8,
            }}
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* ARCHITECTURAL CIPHER TEXT (Framed Inside the Upper V)          */}
      {/* ============================================================= */}
      <div
        ref={textContainerRef}
        className="absolute z-20 text-center font-mono opacity-0 pointer-events-none flex flex-col items-center justify-center px-4"
        style={{ top: `${cy - R * 0.38}px` }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[13px] sm:text-[14px] font-semibold tracking-[0.28em] text-white">
            VERA
          </span>
          <span className="text-[11px] text-zinc-500 tracking-[0.2em]">
            //
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 tracking-[0.22em] uppercase font-mono">
            {telemetryCipher}
          </span>
        </div>

        <div className="mt-1.5 text-[8px] sm:text-[9px] text-zinc-500 tracking-[0.35em] uppercase">
          ARCHITECTURAL ESCROW PROTOCOL &bull; SHA-256 VERIFIED &bull; ACTIVE
        </div>
      </div>
    </div>
  );
}
