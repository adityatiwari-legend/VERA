"use client";

import DoodleCrewFooter, {
  type CrewMember,
  type DoodleKind,
  type FooterAction,
  type FooterColumn,
} from "@/components/ui/doodle-crew-footer";

/**
 * The site footer: the "Doodle Crew" sketchbook footer (components/ui/doodle-crew-footer.tsx)
 * configured to VERA's editorial-light theme — white paper, ink #111111, accent blue #2563EB
 * (docs/design-system.md). Mounted globally by DashboardShell on every non-dashboard route.
 *
 * Real routes only, no fake data (design-system rule 2). The playful copy stays honest:
 * every link below resolves, and all chains shown in the app are testnet/devnet.
 */

// The crew lives on the four letters of V-E-R-A. One per seat style where possible:
// yeti leans on the V, bird pecks on the E, ghost peeks over the R, kid sits on the A,
// mushroom and cat share the ground in front.
const CREW: CrewMember[] = [
  { kind: "yeti", letter: 0, seat: "front", offset: -0.14, name: "Bruno", says: "I verify. Then I snack." },
  { kind: "bird", letter: 1, seat: "top", offset: 0, name: "Pip", says: "Every rupee accounted for!" },
  { kind: "mushroom", letter: 2, seat: "front", offset: -0.36, scale: 0.9, name: "Morel", says: "Audited before it moves." },
  { kind: "ghost", letter: 2, seat: "behind", offset: 0.08, name: "Boo", says: "Boo! Can't hide from the ledger." },
  { kind: "kid", letter: 3, seat: "top", offset: -0.08, name: "Juno", says: "Best seat on the chain." },
  { kind: "cat", letter: 3, seat: "front", offset: 0.4, flip: true, name: "Patch", says: "Nine lives, one ledger." },
];

// Proof-of-work vibes only: no flames or snacks — bolts, stars, sparkles, hearts,
// spirals and paper planes drift around the wordmark.
const DOODLES: DoodleKind[] = ["bolt", "star", "sparkle", "heart", "spiral", "plane"];

const COLUMNS: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Explore campaigns", href: "/campaigns" },
      { label: "Organization directory", href: "/ngos" },
      { label: "Hisaab of the Road", href: "/hisaab" },
      { label: "Public explorer", href: "/explorer" },
    ],
  },
  {
    title: "Get involved",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/register" },
      { label: "Report a road issue", href: "/hisaab/report/new" },
      { label: "My donations", href: "/donor/donations" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "How VERA works", href: "/#pipeline" },
      { label: "Live protocol metrics", href: "/#protocol-metrics" },
      { label: "Track a transaction", href: "/explorer" },
    ],
  },
];

const ACTIONS: FooterAction[] = [
  { label: "Explore campaigns", href: "/campaigns", icon: "heart", variant: "solid" },
  { label: "Audit the ledger", href: "/explorer", icon: "bolt", variant: "outline" },
];

// Plain text disclosures (no hrefs) — same disclaimers the old footer carried.
const LEGAL = [
  { label: "All chains testnet / devnet — no real funds move" },
  { label: "SHA-256 audit architecture" },
];

const SOCIALS = [{ label: "GitHub", href: "https://github.com/adityatiwari-legend/VERA" }];

export default function Footer() {
  return (
    <DoodleCrewFooter
      wordmark="VERA"
      brand="VERA"
      logoSrc="/vera-logo.png"
      logoAlt="VERA logo"
      blurb="VERA locks every rupee in audited escrow and releases it only against verified proof — donation campaigns on Ethereum, civic road repairs on Solana."
      tagline="Proof-gated money: every rupee traceable, audited before it moves."
      columns={COLUMNS}
      actions={ACTIONS}
      copyright={`© ${new Date().getFullYear()} VERA — Proof-gated money.`}
      legal={LEGAL}
      socials={SOCIALS}
      crew={CREW}
      doodles={DOODLES}
      doodleCount={10}
      // Editorial-light theme tokens (docs/design-system.md): paper, ink, accent blue.
      preset="auto"
      palette={{ background: "#FFFFFF", ink: "#111111", accent: "#2563EB" }}
      // Inter everywhere — VERA has no serif face; --font-sans resolves for the
      // wordmark's canvas measurement too.
      fontFamily='var(--font-sans), Inter, "Helvetica Neue", Arial, sans-serif'
      serifFamily='var(--font-sans), Inter, "Helvetica Neue", Arial, sans-serif'
      height="700px"
    />
  );
}
