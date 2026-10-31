# VERA — UI Component Architecture & Design System Specification (`component.md`)

> **Document Version:** 1.0.0  
> **Target Framework:** Next.js 14 App Router, React 18, Tailwind CSS v3.4, Lucide Icons  
> **Status:** Approved Blueprint for Next-Gen UI Redesign  
> **Scope:** Design Tokens, Core Foundational Components, Domain Components, Composition Matrix, and Implementation Roadmap.

---

## 1. Executive Summary & Design Vision

### 1.1 The Objective
The objective of this specification is to transform **VERA (Verifiable Evidence & Real Auditing)** from a functional prototype into a **visually stunning, institutional-grade, hyper-transparent Web3/FinTech platform**.

Donors, NGOs, certified Auditors, and the public must immediately feel:
1. **Unquestioned Cryptographic Trust:** Every financial claim, milestone, and invoice is visually linked to verifiable SHA-256 hashes and on-chain blockchain confirmations.
2. **Visual Magnetism ("The WOW Factor"):** Sleek dark/light hybrid aesthetics, translucent glassmorphism (`backdrop-blur`), refined gradients (Deep Obsidian Slate, Luminous Emerald, Cyber Cyan, and Trust Indigo), and smooth micro-interactions.
3. **Ergonomic Coherence:** Elimination of ad-hoc inline styles across pages by enforcing a strict **Base Component Hierarchy** where every single card, panel, modal, and widget is composed from a universal foundational component.

---

## 2. "The All-Important Component" Architecture

To eliminate inconsistency and duplicated UI code across the application, the entire component tree is anchored by one foundational, all-important architectural building block:

### 🌟 The Core Linchpin: `Surface` / `GlassCard`
```text
┌────────────────────────────────────────────────────────────────────────┐
│                        THE ALL-IMPORTANT COMPONENT                     │
│                           <Surface variant="...">                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Polymorphic Tag ('div' | 'section' | 'article' | 'button')     │  │
│  │ 2. Glassmorphism & Elevation System (glass, elevated, glow, flat) │  │
│  │ 3. Ambient Dynamic Border (Emerald on verified, Amber on warning)│  │
│  │ 4. Built-in Micro-interaction (hover hover:translate-y-[-2px])    │  │
│  │ 5. Unified Padding, Radii (rounded-2xl) & Dark-Mode Compatibility│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
 ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 │ CampaignCard  │           │ MilestoneCard │           │ StatCard      │
 └───────────────┘           └───────────────┘           └───────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
 ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 │ AuditTimeline │           │ EvidenceModal │           │ DonationTrace │
 └───────────────┘           └───────────────┘           └───────────────┘
```

Every container, card, modal dialog, dashboard widget, timeline node, and financial summary **MUST** inherit from `Surface`. No component is permitted to craft raw `div className="bg-white border rounded..."` wrappers.

In addition to the structural linchpin, the **Domain Linchpin** is the **`AuditBadge` / `VerificationBadge`**, which provides a universal cryptographic proof indicator embedded across every campaign, milestone, donation, and invoice.

---

## 3. Design System Tokens & Foundations

### 3.1 Color Palette
The new UI utilizes an institutional, high-contrast palette built on deep obsidian tones accented by luminous cyber-trust hues:

| Token Name | Hex Code | Purpose |
|---|---|---|
| **`surface-base`** | `#0B0F19` | Deep Obsidian background for high-tech pages & hero sections |
| **`surface-card-dark`** | `rgba(15, 23, 42, 0.75)` | Translucent glass surface (`backdrop-blur-xl`) with subtle border |
| **`surface-card-light`** | `#FFFFFF` | Clean, crisp, high-legibility card surface for dense data |
| **`brand-emerald-500`** | `#10B981` | Core verified status, confirmed releases, cryptographic validity |
| **`brand-emerald-glow`** | `rgba(16, 185, 129, 0.25)` | Luminous drop shadow and ambient edge glow for trusted elements |
| **`cyber-cyan-500`** | `#06B6D4` | Blockchain transactions, explorer links, smart contract signatures |
| **`trust-indigo-500`** | `#6366F1` | Certified Auditor actions, OCR/AI verification metrics, multisig keys |
| **`alert-amber-500`** | `#F59E0B` | Pending approvals, AI discrepancies, escrow locks |
| **`danger-rose-500`** | `#F43F5E` | Rejections, budget overruns, cryptographic tampering alerts |
| **`border-subtle`** | `rgba(226, 232, 240, 0.8)` (light) / `rgba(255, 255, 255, 0.08)` (dark) | Hairline borders for refined depth |

### 3.2 Typography & Numerical Formatting
- **Headings & Body:** Inter or Outfit (`sans-serif`), featuring optical kerning (`font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`).
- **Cryptographic & Financial Data:** JetBrains Mono (`font-mono`) for wallet addresses, transaction hashes, SHA-256 checksums, and currency amounts.
- **Currency Standard:** All fiat values must use standard Indian Rupee formatting (`₹1,50,000`), right-aligned or baseline-aligned with unit indicators.

### 3.3 Elevations & Glassmorphism Rules
```css
/* Glassmorphism Class Standards */
.glass-panel-dark {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-panel-light {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}

.glow-emerald {
  box-shadow: 0 0 24px -4px rgba(16, 185, 129, 0.3);
}

.glow-cyan {
  box-shadow: 0 0 24px -4px rgba(6, 182, 212, 0.3);
}
```

---

## 4. Component Taxonomy & Detailed Specifications

### Layer 1: Core Atomic Primitives (`components/ui/`)

#### 1.1 `Surface` — The Universal Base Component (THE ALL-IMPORTANT COMPONENT)
- **File:** `components/ui/Surface.tsx`
- **Purpose:** Foundation for all cards, dialogs, timeline nodes, and panels in the application.
- **Props Interface:**
  ```typescript
  export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: 'div' | 'section' | 'article' | 'aside' | 'header';
    variant?: 'default' | 'glass-dark' | 'glass-light' | 'elevated' | 'outline' | 'glow-emerald' | 'glow-cyan';
    interactive?: boolean; // Adds hover lift (-translate-y-1) and cursor-pointer
    glowOnHover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
    children: React.ReactNode;
  }
  ```
- **Behavior:** Ensures consistent radii, border opacity, background blur, and shadow across every component on every page.

#### 1.2 `Button`
- **File:** `components/ui/Button.tsx`
- **Purpose:** Consistent, accessible action button with loading states, icon support, and tactile feedback.
- **Props Interface:**
  ```typescript
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow' | 'subtle';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    loading?: boolean;
    loadingText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
  }
  ```

#### 1.3 `Badge` / `StatusPill`
- **File:** `components/ui/Badge.tsx`
- **Purpose:** Unified status representation for campaigns, milestones, proofs, multisig approvals, and blockchain events.
- **Props Interface:**
  ```typescript
  export interface BadgeProps {
    variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
    size?: 'xs' | 'sm' | 'md';
    dot?: boolean;
    pulse?: boolean;
    icon?: React.ReactNode;
    label: string;
    className?: string;
  }
  ```

#### 1.4 `Modal` / `Dialog`
- **File:** `components/ui/Modal.tsx`
- **Purpose:** Accessible overlay dialog with blurred backdrop, Escape key handling, and animated entry.
- **Props Interface:**
  ```typescript
  export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    footer?: React.ReactNode;
  }
  ```

#### 1.5 `Drawer` / `SlideOver`
- **File:** `components/ui/Drawer.tsx`
- **Purpose:** Slide-in sheet from the right side for deep inspection of invoices, OCR line-item details, and multisig history without leaving the active screen.
- **Props Interface:**
  ```typescript
  export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    width?: 'md' | 'lg' | 'xl';
  }
  ```

#### 1.6 `Tabs` & `SegmentedControl`
- **File:** `components/ui/Tabs.tsx`
- **Purpose:** Tabbed navigation and filters (e.g., Campaign status filters: All, Active, Completed, Paused).

#### 1.7 `Tooltip` & `HashPopover`
- **File:** `components/ui/Tooltip.tsx`
- **Purpose:** Instant hover explanation for technical terms (e.g., "Non-reentrant Smart Contract", "2-of-3 Multisig Consensus", "OCR Confidence").

#### 1.8 `SkeletonLoader`
- **File:** `components/ui/SkeletonLoader.tsx`
- **Purpose:** Shimmering animated placeholders for async DB/blockchain queries to eliminate layout shifts.

---

### Layer 2: Data Visualization & Financial Display (`components/financial/`)

#### 2.1 `StatCard` (Upgraded)
- **File:** `components/financial/StatCard.tsx` (Composed on `Surface`)
- **Purpose:** KPI displays (Total Raised, Released, Escrow Locked, Active Milestones, Reputation Index).
- **Props Interface:**
  ```typescript
  export interface StatCardProps {
    label: string;
    value: string | number;
    subtext?: string;
    icon?: React.ReactNode;
    trend?: { value: string; positive: boolean };
    variant?: 'glass' | 'white' | 'dark' | 'gradient';
    accentColor?: 'emerald' | 'cyan' | 'indigo' | 'amber';
  }
  ```

#### 2.2 `FundDistributionBar`
- **File:** `components/financial/FundDistributionBar.tsx`
- **Purpose:** Multi-segmented visual breakdown of campaign funds (Released vs Locked in Escrow vs Remaining Goal vs Refunded).
- **Props Interface:**
  ```typescript
  export interface FundDistributionBarProps {
    total: number;
    released: number;
    locked: number;
    refunded?: number;
    showLegend?: boolean;
    height?: 'sm' | 'md' | 'lg';
  }
  ```

#### 2.3 `TrustScoreGauge`
- **File:** `components/financial/TrustScoreGauge.tsx`
- **Purpose:** Dynamic circular SVG gauge visualizing NGO Reputation Index (0–100) and letter grades (A+, A, B, C, D).
- **Props Interface:**
  ```typescript
  export interface TrustScoreGaugeProps {
    score: number; // 0 to 100
    grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
  }
  ```

#### 2.4 `HashDisplay`
- **File:** `components/financial/HashDisplay.tsx`
- **Purpose:** Truncated display for SHA-256 hashes, wallet addresses, and Ethereum transaction hashes with one-click copy to clipboard, visual confirmation tooltip, and explorer jump link.

---

### Layer 3: VERA Domain Components (`components/domain/`)

#### 3.1 `CampaignCard`
- **File:** `components/domain/CampaignCard.tsx` (Composed on `Surface`)
- **Purpose:** Reusable campaign card for Home page, Browse Explorer (`/campaigns`), and NGO Dashboard.
- **Features:**
  - Trust score indicator badge
  - NGO affiliation with link
  - Target vs Raised progress bar
  - Milestone release counter (`3 of 5 released`)
  - Status badge (Active, Paused, Completed)
  - Interactive hover glow

#### 3.2 `CampaignHero`
- **File:** `components/domain/CampaignHero.tsx` (Composed on `Surface variant="glass-dark"`)
- **Purpose:** High-impact hero header across Campaign Details (`/campaigns/[id]`) and Public Audit (`/campaigns/[id]/audit`).
- **Features:**
  - Deep obsidian gradient with subtle glowing ambient mesh
  - Live escrow status pill
  - Rapid action buttons (Donate Now, View Public Audit, Export PDF Report)
  - Real-time financial summary pill cluster

#### 3.3 `EscrowMilestoneTracker`
- **File:** `components/domain/EscrowMilestoneTracker.tsx`
- **Purpose:** Replaces the existing milestone tracker with a sleek, interactive, step-by-step progress component.
- **Features:**
  - Sequence node indicators (Connected pipeline line)
  - Release status pills (Locked, Proof Submitted, Under Review, Approved, Released)
  - Multisig status: `2/3 Signatures Verified`
  - Inline action trigger buttons (e.g., "Request Release", "Sign Approval", "Execute Release")

#### 3.4 `MultisigApprovalWidget`
- **File:** `components/domain/MultisigApprovalWidget.tsx` (Composed on `Surface`)
- **Purpose:** Transparent visualization of the 2-of-3 multi-signature authorization consensus.
- **Features:**
  - Avatars and roles of signers: NGO Lead, Project Admin, Certified Auditor
  - Real-time status (Signed with green check, Pending with amber pulse)
  - Interactive "Sign with Wallet / Role" button for eligible authenticated actors

#### 3.5 `ProofEvidenceInspectorModal`
- **File:** `components/domain/ProofEvidenceInspectorModal.tsx`
- **Purpose:** Interactive modal and drawer allowing donors, auditors, and the public to examine evidence files, SHA-256 verification hashes, and AI discrepancy screening outputs.
- **Features:**
  - SHA-256 Hash verification badge with copy button
  - Image/PDF receipt previewer
  - OCR line-item extraction table (Vendor, Date, Invoice No, Sum)
  - Discrepancy comparison: Claimed ₹50,000 vs Invoice ₹50,000 (Math Validated)
  - Auditor notes and timestamp log

#### 3.6 `BlockchainBadge` (Upgraded)
- **File:** `components/domain/BlockchainBadge.tsx`
- **Purpose:** Unifies on-chain proof display across milestones, donations, and campaign contract registrations.
- **Features:**
  - Hardhat / Sepolia testnet status badge
  - Tx hash truncation with explorer link
  - Block confirmation badge with link to `/tx/[txHash]`

#### 3.7 `AuditTimeline`
- **File:** `components/domain/AuditTimeline.tsx` (Composed on `Surface`)
- **Purpose:** Unified chronological audit trail merging database mutations and smart contract on-chain events.
- **Features:**
  - Filter by event type: All, Donations, Approvals, Releases, Proofs
  - Color-coded event nodes with icons (ShieldCheck, Lock, Coins, FileCheck)
  - Click-to-inspect transaction details

#### 3.8 `DonationJourneyTrace`
- **File:** `components/domain/DonationJourneyTrace.tsx`
- **Purpose:** The signature donor experience on `/donor/donations/[id]/trace` ("Where Did My Money Go?").
- **Features:**
  - 6-stage interactive pipeline: Donation → Escrow Lock → Milestone Allocation → Proof & AI Check → Multisig Signoff → On-Chain Release.
  - Active pulse indicator on current stage
  - Expanded step card displaying exact beneficiary spend invoices

#### 3.9 `NgoReputationCard`
- **File:** `components/domain/NgoReputationCard.tsx` (Composed on `Surface`)
- **Purpose:** NGO Public Profile card displaying transparent trust metrics (Score out of 100, completed campaigns, verified invoices count, tamper score).

---

### Layer 4: Layout & Navigation (`components/layout/`)

#### 4.1 `Navbar` (Upgraded)
- **File:** `components/layout/Navbar.tsx`
- **Purpose:** Sticky header with glassmorphism, responsive navigation, role-based contextual links (Auditor Hub, NGO Hub, My Donations), user profile dropdown, and live system status indicator.

#### 4.2 `Footer` (Upgraded)
- **File:** `components/layout/Footer.tsx`
- **Purpose:** Institutional footer featuring smart contract address, live testnet block height, documentation links, and audit integrity notice.

#### 4.3 `PageHeader`
- **File:** `components/layout/PageHeader.tsx`
- **Purpose:** Standardized page header with breadcrumb navigation, title, descriptive subtitle, and right-aligned action button bar.

#### 4.4 `DashboardShell`
- **File:** `components/layout/DashboardShell.tsx`
- **Purpose:** Unified layout shell for role dashboards (Auditor review queue, NGO campaign manager, Donor donation center) providing consistent navigation and metric ribbons.

---

## 5. Component Composition Matrix

The table below defines how every higher-level component is constructed from the **all-important base components**:

| Domain Component | Inherits `Surface`? | Uses `Badge`? | Uses `Button`? | Uses `ProgressBar`? | Uses `BlockchainBadge`? | Uses `HashDisplay`? |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **`CampaignCard`** | ✅ Yes (`variant="default"`) | ✅ Yes | ✅ Yes | ✅ Yes | Optional | ❌ |
| **`CampaignHero`** | ✅ Yes (`variant="glass-dark"`) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **`EscrowMilestoneTracker`** | ✅ Yes (`variant="default"`) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **`MultisigApprovalWidget`** | ✅ Yes (`variant="elevated"`) | ✅ Yes | ✅ Yes | ❌ | ✅ Yes | ✅ Yes |
| **`ProofEvidenceInspectorModal`** | ✅ Yes (`Modal` uses `Surface`) | ✅ Yes | ✅ Yes | ❌ | ✅ Yes | ✅ Yes |
| **`AuditTimeline`** | ✅ Yes (`variant="default"`) | ✅ Yes | ❌ | ❌ | ✅ Yes | ✅ Yes |
| **`DonationJourneyTrace`** | ✅ Yes (`variant="glass-dark"`) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **`NgoReputationCard`** | ✅ Yes (`variant="default"`) | ✅ Yes | ✅ Yes | ✅ Yes | ❌ | ❌ |
| **`StatCard`** | ✅ Yes (`variant="default"`) | Optional | ❌ | ❌ | ❌ | ❌ |
| **`PageHeader`** | ❌ (Header layout) | ✅ Yes | ✅ Yes | ❌ | ❌ | ❌ |

---

## 6. Page-by-Page Migration & Redesign Blueprint

The new component system will be rolled out across the application's routes systematically:

### 6.1 Public Landing Page (`/`)
- **Current Issue:** Static inline cards, basic styling.
- **Redesign Target:**
  - Hero with animated particle/gradient mesh using `Surface variant="glass-dark"` and glowing CTA buttons.
  - Live Platform KPI ribbon using upgraded `StatCard` cluster with real-time counters.
  - Interactive "9-Step Verifiable Trail" replacing static icon grid with an interactive step visualizer.
  - Featured Initiatives Grid composed entirely with `CampaignCard`.

### 6.2 Initiative Discovery (`/campaigns`)
- **Current Issue:** Inconsistent search form and filter tabs.
- **Redesign Target:**
  - Unified Search & Filter bar powered by `Surface`, `Input`, and `Tabs`.
  - Responsive 3-column grid of `CampaignCard` components with smooth hover lift.
  - Empty state rendered via `EmptyState` component with clear filter reset CTA.

### 6.3 Public Audit Dashboard (`/campaigns/[id]/audit`)
- **Current Issue:** Long 637-line file with inline cards, duplicated timeline markup, and hardcoded colors.
- **Redesign Target:**
  - Replace top hero with `CampaignHero`.
  - Embed `FundDistributionBar` for visual allocation ratios.
  - Render milestones using `EscrowMilestoneTracker` and `MilestoneCard`.
  - Render evidence verification using `ProofEvidenceInspectorModal` with interactive OCR diff table.
  - Timeline powered by modular `AuditTimeline`.
  - Trust indicators powered by `TrustScoreGauge`.

### 6.4 Donation Trace ("Where Did My Money Go?") (`/donor/donations/[id]/trace`)
- **Current Issue:** Linear text list with basic icons.
- **Redesign Target:**
  - Replace with `DonationJourneyTrace` featuring animated stage transitions, interactive step inspection, and direct links to beneficiary spend evidence.

### 6.5 Auditor Hub (`/auditor/dashboard` & `/auditor/reviews/[id]`)
- **Current Issue:** Table-like cards without quick-action drawers.
- **Redesign Target:**
  - `DashboardShell` with pending/flagged/approved filter pills.
  - Review queue built with `AuditorReviewQueueCard`.
  - Side-by-side evidence inspection drawer powered by `Drawer` and `ProofEvidenceInspectorModal`.
  - One-click approval / rejection with reason modal.

### 6.6 NGO Campaign Management (`/ngo/campaigns/[id]`)
- **Current Issue:** Mixed client components and inline milestone editing.
- **Redesign Target:**
  - Clean tabs for Overview, Milestones, Proof Submissions, and Multisig Releases.
  - Milestone creation form powered by `Input`, `Select`, and `Button`.
  - Multisig status panel using `MultisigApprovalWidget`.

---

## 7. Implementation Roadmap & Technical Verification

To guarantee zero disruption to existing features and maintain 100% test pass rate across all 339 automated tests:

### Step 1: Base Primitives Implementation
1. Create `components/ui/Surface.tsx` (The All-Important Base Component).
2. Create `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/Modal.tsx`, and `components/ui/Drawer.tsx`.
3. Update `tailwind.config.js` with new surface and glow utilities.

### Step 2: Financial & Visualization Primitives
1. Upgrade `components/ProgressBar.tsx` and create `components/financial/FundDistributionBar.tsx`.
2. Create `components/financial/TrustScoreGauge.tsx` and `components/financial/HashDisplay.tsx`.
3. Upgrade `components/StatCard.tsx` to wrap `Surface`.

### Step 3: Domain Components Assembly
1. Create `components/domain/CampaignCard.tsx` and `components/domain/CampaignHero.tsx`.
2. Create `components/domain/MultisigApprovalWidget.tsx` and `components/domain/ProofEvidenceInspectorModal.tsx`.
3. Upgrade `components/MilestoneReleaseTracker.tsx` and `components/BlockchainBadge.tsx`.
4. Create `components/domain/AuditTimeline.tsx` and `components/domain/DonationJourneyTrace.tsx`.

### Step 4: Page Re-composition
1. Migrate `/campaigns` to use `CampaignCard` and new search controls.
2. Migrate `/campaigns/[id]/audit` to use `CampaignHero`, `FundDistributionBar`, and `AuditTimeline`.
3. Migrate `/donor/donations/[id]/trace` to use `DonationJourneyTrace`.
4. Migrate `/auditor/dashboard` to use `DashboardShell`.
5. Upgrade global `Navbar` and `Footer` in `app/layout.tsx`.

### Step 5: Verification & Anti-Tampering Check
1. Run `npm run type-check` (`tsc --noEmit`) to ensure 0 TypeScript errors.
2. Run all test suites:
   - `npm run test:phase1`
   - `npm run test:phase2`
   - `npm run test:phase3`
   - `npm run test:phase4`
   - `npm run test:phase5`
   - `npm run test:tampering`
3. Validate responsive behavior on desktop, tablet, and mobile viewports.

---

## 8. Summary Checklist

- [x] All-Important Base Component defined: `Surface` / `GlassCard`
- [x] Design tokens (Obsidian, Emerald, Cyan, Indigo, Amber, Rose) defined
- [x] Complete TypeScript interfaces for all primitives and domain components
- [x] Composition matrix ensuring 100% inheritance from base components
- [x] Route-by-route migration strategy outlined
- [x] Verification criteria defined (339 tests + TypeScript strict checks)
