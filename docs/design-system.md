# VERA Design System — Editorial Light (2026-10-30)

This is the **canonical** visual specification for the VERA redesign. It supersedes
`component.md` (historical). The landing page (`app/(public)/page.tsx`), the campaigns
explorer (`app/campaigns/page.tsx`), the ledger (`components/AuditLedger.tsx`) and the
shell (`components/DashboardShell.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`)
are the finished exemplars — match their look.

## 1. Direction

Premium financial-accountability product. Light, typographic, editorial:

- **Guardbase**: oversized confident type, white background, selective blue accent, structured rows with hairline dividers.
- **TARS**: generous whitespace, restrained lavender/blue washes, layered soft geometry.
- **Aeye**: dark "technical" panels as accents only, fine grids, mono micro-labels, thin borders.

Never: neon glows, glassmorphism-everywhere, gradient buttons, crypto-bro dark dashboards.

## 2. Tailwind color tokens (defined in `tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `bg-white` / `paper` | #FFFFFF | Default background |
| `bg-mist` | #F8FAFC | Alternate sections, tracks, icon chips |
| `text-ink` | #111111 | Primary text |
| `text-mute` | #737373 | Secondary text |
| `text-faint` | #A3A3A3 | Tertiary/meta text |
| `border-line` / `line-strong` | #E5E7EB / #D1D5DB | Hairline borders |
| `accent` (#2563EB) + `accent-deep/soft/faint` | blue | Primary actions, active states, links, emphasis |
| `lav` (#C4B5FD) + `lav-deep/soft` | violet | Decorative accents only (rare) |
| `night` + `night-surface/raised/mute/dim/line` | #0B0B10 family | Dark technical panels only |
| `ok` (#15803D) + `ok-soft` | green | Verified / completed / released / money-moved |
| `warn` (#B45309) + `warn-soft` | amber | Pending / under review / waiting on humans |
| `bad` (#B91C1C) + `bad-soft` | red | Rejected / failed / cancelled / destructive |

Shadows: `shadow-card` (rest), `shadow-lift` (hover/modal), `shadow-feature` (hero).
Legacy aliases (`mint`, `brand`, `trust-indigo`, `cyber-cyan`, …) still compile but MUST
NOT be used in new code — replace them when encountered.

## 3. Shared component classes (defined in `globals.css` — prefer these)

- `.card` — white surface, line border, radius-xl, shadow-card. Add `.card-hover` for interactive cards.
- `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-dark` (dark panels only) — sized with `!px-* !py-* !text-*` overrides when needed.
- `.input`, `.label-text` — forms.
- `.eyebrow` — blue mono uppercase section label with square marker: `<span className="eyebrow">Section label</span>`.
- `.chip` — small mono metadata chip (hashes, counts, versions).
- `.panel-night` + `.theme-night` — dark technical section wrapper (bg #0B0B10, white text). Inside dark panels use `text-white`, `text-night-mute`, `text-night-dim`, `border-white/[0.08]`, `bg-white/[0.03]`, `text-blue-300/400`.
- `.bg-grid-fine` (light), `.bg-grid-night` (dark), `.bg-dots-night` (blue pixels), `.wash-hero` (lavender/blue wash).
- **RibbonField** (`components/ui/ribbon-field.tsx`) — the platform's signature animated
  gradient (21st.dev "Ribbon Field": White @18 / Sky blue #78B8F9 @57 / Ultramarine
  #5667FF @60 / Iris #4D2FF9 @100, angle 32, wave 14, grain). Canvas-rendered, rAF-driven,
  pauses offscreen, reduced-motion safe. Use it as an **ambient layer on dark panels**
  (`backdrop #0B1220`, opacity 0.3–0.5, radial mask) or as a **light wash behind featured
  visuals** (`backdrop #FFFFFF`, opacity ≤0.35, radial mask) — never behind body copy on
  white, never as a button/banner fill. In app shells, mount it inside the dark sidebar
  with `zIndex: -1` (the sticky/fixed aside creates the stacking context) and a
  top-anchored mask. Live exemplars: hero + two-chain band + globe section of
  `app/(public)/page.tsx`, and the console sidebars (`DashboardShell.tsx`,
  `console/ConsoleShell.tsx`).
- Animations: `.animate-rise` (+`.delay-1..5`), `.animate-fade-in` (opacity-only — use
  this for wrappers that contain `position:fixed` overlays; a transform-based animation
  would make the wrapper a containing block and break them), `.animate-floaty`,
  `.reveal`/`.is-visible` via `<Reveal>` (`components/landing/Reveal.tsx`),
  `.vera-skeleton`, `.animate-pulse-dot`. All reduced-motion safe.
- **LiquidNavbar** (`components/ui/liquid-glass-navbar.tsx`) — the desktop nav pill
  (WebGL water surface, no dependencies; adapted to `next/link`). Active item is derived
  from `usePathname` (controlled `active`), sound off, `tone="light"` (the header is
  always frosted white — the transparent-over-hero variant was rejected: the sticky
  header sits above main in flow, so it never overlays the hero). Hidden below `lg`;
  the mobile hamburger menu is unchanged.

## 4. Mechanical dark→light dictionary

| Old (dark theme) | New (light theme) |
|---|---|
| `bg-[#09090B]`, `bg-[#0C0C0E]` page/section | `bg-white` (or `bg-mist/60` for alternation) |
| `bg-[#111113]`, `bg-[#121216]`, `bg-[#18181B]` cards | `.card` / `bg-white border border-line` |
| `text-white` on light bg | `text-ink` (keep `text-white` ONLY inside `.panel-night`) |
| `text-zinc-300`, `text-zinc-200` | `text-ink` |
| `text-zinc-400` | `text-mute` |
| `text-zinc-500`, `text-zinc-600` | `text-faint` or `text-mute` |
| `border-white/[0.08]`, `border-white/[0.06]` | `border-line` |
| `hover:border-white/[0.18]` | `hover:border-line-strong` |
| `bg-white/[0.03]`, `bg-white/[0.04]`, `bg-white/[0.06]` | `bg-mist` (or `bg-accent-faint` for accent-tinted) |
| `text-[#00F59B]` (mint accent) | `text-accent` (interactive/accent) or `text-ok` (verified/green semantics) |
| `bg-[#00F59B]` buttons | `bg-accent text-white` → use `.btn-primary` |
| `text-[#06B6D4]` / `text-[#6366F1]` | `text-accent-deep` / `text-accent` |
| `bg-[#00F59B]/10 border-[#00F59B]/25` badges | use `StatusBadge`/`Badge` tokens: `bg-ok-soft text-ok border-ok/20` etc. |
| `bg-black/80` modal backdrops | `bg-ink/60 backdrop-blur-sm` |
| glow shadows (`shadow-glow-*`, mint glows) | `shadow-card` / `shadow-lift` — no neon |

Status colors (semantic, never color-alone — badges always carry text):
green `ok` = APPROVED / RELEASED / CONFIRMED / COMPLETED / PAID; blue `accent` = ACTIVE / IN PROGRESS;
amber `warn` = PENDING / SUBMITTED / UNDER REVIEW / PROOF SUBMITTED / FLAG;
violet = LOCKED (`bg-lav-soft text-lav-deep border-lav-deep/20`); red `bad` = REJECTED / FAILED / CANCELLED;
violet-700 = REFUNDED; gray = PAUSED / DRAFT / OPEN.

## 5. Typography

- Hero/landing display: `text-4xl sm:text-6xl lg:text-[68px] font-semibold tracking-tightest leading-[1.04]`.
- Page titles: `text-3xl sm:text-4xl font-semibold tracking-tight`.
- Section headings: `text-2xl sm:text-4xl font-semibold tracking-tight` (no mono fonts on big headings).
- Card headings: `text-base font-semibold tracking-tight`.
- Body: `text-sm text-mute leading-relaxed` (14–16px).
- Meta/labels: `font-mono text-[11px] uppercase tracking-wider text-mute`.
- Numbers stay `font-mono` (tabular feel) — e.g. amounts, percentages, hashes.

## 6. Layout rules

- Page container: `mx-auto max-w-6xl/7xl px-4 py-10 pb-20 sm:px-6 lg:px-8`.
- Cards radius `rounded-xl` max; buttons `rounded-lg`; badges `rounded-full`.
- Sections separated by `border-b border-line` and generous `py-20`.
- Tables: `card overflow-hidden`, thead `bg-mist font-mono text-[10px] uppercase text-mute`, rows `divide-y divide-line hover:bg-accent-faint/60`.
- Empty states: honest copy + icon chip (see `AuditLedger` empty state).
- Responsive: grids collapse `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; no horizontal overflow; tables scroll in `overflow-x-auto`.

## 7. HARD ENGINEERING RULES

1. **Presentation only.** Do not change props, state, handlers, data fetching, routes, auth, or business logic. Only classNames, markup structure, icons, and (where explicitly noted) copy.
2. **No fake data.** Remove/replace fabricated numbers, hashes, scores, telemetry, tickers. If a component displays mock values, render real ones it already has or an honest placeholder ("—", "No X recorded yet"). Never invent hashes, addresses, percentages or counts.
3. **No new dependencies.** Use lucide-react icons and Tailwind classes only.
4. **Dark panels are accents only** — use `.panel-night` for at most one section per page (or none).
5. **Forms/financial actions** keep their exact behavior — same endpoints, same validation, same states.
6. Do not edit files outside your assigned list. Do not touch dead/cinematic components (CinematicLanding, HeroAnimatedSection, WelcomingAnimation, PhysicsCanvas, BentoGrid, EscrowSimulator, ThreeWaterV, ScrambleText, canvas/*, scroll/*, Hero, EditorialStatement, LoadingOverlay, SlotButton, Sound*) — they are unrouted legacy.
7. Keep accessibility: labels, focus rings (inputs already have them), `aria-label`s on icon buttons, contrast (mute ≥ small text only).
