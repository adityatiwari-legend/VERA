<div align="center">

# 🛡️ VERA — Verifiable Evidence & Real Auditing

### *End-to-end civic accountability: from a pothole photo to a verified, on-chain payout.*

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](#-tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#-tech-stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-raw%20SQL-4169E1?logo=postgresql&logoColor=white)](#-tech-stack)
[![Solidity](https://img.shields.io/badge/Solidity-EVM%20Escrow-363636?logo=solidity&logoColor=white)](#-dual-blockchain-architecture)
[![Solana](https://img.shields.io/badge/Solana-Anchor%20Devnet-9945FF?logo=solana&logoColor=white)](#-dual-blockchain-architecture)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20Vision-4285F4?logo=googlegemini&logoColor=white)](#-ai-verification-engine)
[![TigerData](https://img.shields.io/badge/TigerData-Hackathon-3043C6?logo=tigerdata&logoColor=white)](#-tech-stack)
[![Vultr](https://img.shields.io/badge/Vultr-Cloud-00B0F4?logo=vultr&logoColor=white)](#-tech-stack)

<br/>

| 📱 **Companion Android App** | 🎥 **Presentation** | 🌐 **Live Demo** |
|:---:|:---:|:---:|
| [**➡️ RoadProof Mobile Repo**](https://github.com/vineetm1204-m/MLH-RoadProofxVera) <br/> *(Flutter — click to open)* | [**▶️ View Slides**](https://drive.google.com/file/d/1YVqdf17rr34flARb1uczy3JVG23WRZmX/view?usp=sharing) | [**🚀 Try it Live**](https://vera-one-nu.vercel.app) |


</div>

---

## 🧭 Quick Navigation

> Click any link to jump straight to that section.

[🚨 Problem](#-problem-statement) · [💡 Solution](#-our-solution) · [🎬 Presentation](#-presentation) · [👥 Team](#-team) · [✨ Features](#-key-features) · [🏗️ Architecture](#️-system-architecture) · [⛓️ Blockchain](#-dual-blockchain-architecture) · [🤖 AI](#-ai-verification-engine) · [🔐 Roles](#-roles--access) · [⚡ Setup](#-getting-started) · [🔌 API](#-api-overview)

---

## 🚨 Problem Statement

Public money and charitable donations disappear into **black boxes**.

| ❌ The Problem | 💥 The Impact |
|---|---|
| Road defects are reported, ignored, and never verifiably fixed | Accidents, vehicle damage, and zero citizen trust |
| Contractors get paid without independent proof of completed work | Fraud, inflated invoices, and sub-standard repairs |
| Donors and taxpayers can't trace where their money actually went | Eroded trust in NGOs, CSR programs, and civic bodies |
| Audit records live in private databases that can be edited quietly | No tamper-proof history; accountability is optional |

**The core question we set out to answer:**
> *How can anyone — a citizen, a donor, an auditor — independently **prove** that a complaint was real, the work was done, and the money went to the right place?*

---

## 💡 Our Solution

**VERA** combines **AI vision**, **citizen consensus**, and **dual-blockchain escrow** so that money moves **only when evidence says it should**.

1. 📸 **Citizens report** — photo + GPS + accelerometer roughness, fingerprinted with **SHA-256**.
2. 🤖 **Gemini AI inspects** — rejects fake or irrelevant images, classifies severity.
3. 🗳️ **3-citizen consensus** — a defect is confirmed on-chain only after 3 independent votes.
4. 🔒 **Funds are escrowed** — locked in smart contracts, released in milestones.
5. ✅ **Proof gates payment** — AI before/after comparison + **2-of-3 multisig** (NGO + Lead + Auditor).
6. 🌍 **Everything is public** — an unauthenticated, hash-chained audit ledger anyone can verify.

<div align="center">

```mermaid
flowchart LR
    A[📸 Citizen Report<br/>Photo + GPS + Sensor] --> B[🤖 Gemini Vision<br/>Defect Check]
    B --> C[🗳️ 3-Citizen<br/>Consensus]
    C --> D[🔒 Escrow Locked<br/>On-Chain]
    D --> E[🔧 Contractor<br/>Repairs]
    E --> F[🤖 Before/After<br/>AI Verification]
    F --> G[✍️ 2-of-3 Multisig<br/>Approval]
    G --> H[💸 Milestone<br/>Payout]
    H --> I[🌍 Public Audit<br/>Ledger]
```

</div>

---

## 🎬 Presentation

<div align="center">

[![Watch the Presentation](https://img.shields.io/badge/▶_Watch_Presentation-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://YOUR_PRESENTATION_LINK)
[![View Slides](https://img.shields.io/badge/📊_View_Slides-F4B400?style=for-the-badge)](https://YOUR_SLIDES_LINK)

</div>

<!-- Optional: embed a thumbnail that links to your video
[![Demo Video](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://YOUR_PRESENTATION_LINK)
-->

---

## 👥 Team

<div align="center">

| | Member 1 | Member 2 | Member 3 |
|:---:|:---:|:---:|:---:|
| **Avatar** | <img src="https://github.com/adityatiwari-legend.png" width="90" style="border-radius:50%"/> | <img src="https://github.com/vineetm1204-m.png" width="90" style="border-radius:50%"/> | <img src="https://github.com/kushbansal2005.png" width="90" style="border-radius:50%"/> |
| **Name** | **Aditya Tiwari**         | **Vineet Mittal**           | **Kush Bansal** |
| **Role** | Blockchain / Full-Stack     | Mobile (Flutter) / AI     | Research / Testing |
| **GitHub** | [@adityatiwari-legend](https://github.com/adityatiwari-legend) | [@vineetm1204-m](https://github.com/vineetm1204-m) | [@kushbansal2005](https://github.com/kushbansal2005) |
| **LinkedIn** | [Profile](https://www.linkedin.com/in/aditya-tiwari-3715a6338/) | [Profile](https://www.linkedin.com/in/vineet-mittal-52b5901b3/) | [Profile](https://www.linkedin.com/in/kush-bansal-310b08375/) |
</div>

<sub>Avatars load automatically from each member's GitHub username.</sub>

---

## ✨ Key Features

<table>
<tr>
<td width="50%" valign="top">

### 🚧 RoadProof (Civic Layer)
- Geotagged photo reports with tamper-evident SHA-256 hashes
- Accelerometer-based road roughness telemetry
- Real-time Gemini defect classification (Hinglish explanations 🇮🇳)
- 3-citizen on-chain confirmation consensus
- Contractor assignments & before/after repair proof

</td>
<td width="50%" valign="top">

### 💰 VERA (Funding Layer)
- Earmarked campaign escrow — funds can't be redirected
- Milestone budgets with hard caps
- **2-of-3 multisig** release (NGO + Lead + Auditor)
- AI invoice OCR with discrepancy detection
- Dispute freeze + automatic donor refund protection

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔍 Transparency
- Public, no-login audit explorer
- SHA-256 hash-chained ledger with `verify-chain`
- "Trace My Donation" donor journey
- Explorer-linked on-chain transactions

</td>
<td width="50%" valign="top">

### 📱 Mobile + Web
- Flutter app with **Mock Mode** for 100% offline demos
- Role-gated navigation (5 roles)
- Idempotent, retry-safe financial requests
- Dual auth: cookie (web) + Bearer token (mobile)

</td>
</tr>
</table>

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients
        W[🌐 Next.js Web Portal]
        M[📱 Flutter Mobile App]
    end

    subgraph Backend["⚙️ Next.js API Layer"]
        API[REST API /api & /api/v1]
        AUTH[Auth: JWT Cookie + Bearer Token]
        GEM[Gemini Service<br/>with Model Failover]
    end

    subgraph Data
        PG[(PostgreSQL)]
        LEDGER[(Hash-Chained<br/>Audit Log)]
    end

    subgraph Chains["⛓️ Blockchains"]
        EVM[Solidity VERA.sol<br/>Campaign Escrow + Multisig]
        SOL[Solana Anchor 'hisaab'<br/>Reports + Repair Escrow]
    end

    W --> API
    M --> API
    API --> AUTH
    API --> GEM
    API --> PG
    API --> LEDGER
    API --> EVM
    API --> SOL
```

<details>
<summary><b>📂 Repository Structure (click to expand)</b></summary>

```text
VERA/
├── app/                  # Next.js 14 App Router
│   ├── (public)/         # Landing, campaign discovery, audit dashboards
│   ├── admin/            # Complaints, escrows, users, login audits
│   ├── auditor/          # Verification queues & multisig reviews
│   ├── contractor/       # Job portal & proof submissions
│   ├── donor/            # Dashboard & "Trace My Donation"
│   ├── org/              # NGO campaigns & milestone proofs
│   └── api/              # REST endpoints
├── components/           # React UI primitives
├── contracts/
│   ├── VERA.sol          # EVM multi-milestone escrow & multisig
│   └── hisaab/           # Solana Anchor program
├── db/migrations/        # Sequential raw SQL migrations
├── lib/                  # db, auth, gemini, solana, hisaab services
└── scripts/              # Admin & deployment scripts
```

</details>

---

## ⛓️ Dual-Blockchain Architecture

Two chains, each chosen for its job.

<details open>
<summary><b>🔷 EVM — <code>VERA.sol</code> (Charity & Milestone Escrow)</b></summary>

- **Earmarked escrow** — donations locked to a `campaignId`
- **Milestone budget caps** enforced on-chain
- **2-of-3 multisig** — NGO Admin + Project Lead + Certified Auditor
- **Non-reentrant** release (OpenZeppelin `ReentrancyGuard` + `Pausable`)
- **Automatic proportional refunds** if a campaign is cancelled or disputes go unresolved

</details>

<details open>
<summary><b>🟣 Solana — <code>hisaab</code> Anchor Program (Civic Repairs)</b></summary>

Every database report maps 1:1 to on-chain state via a deterministic 16-byte seed.

| PDA | Seeds | Purpose |
|---|---|---|
| Report | `["report", seed16]` | GPS, severity, photo hash, confirmations, status |
| Confirmation | `["confirm", seed16, confirmer]` | One vote per wallet — duplicates impossible |
| Escrow | `["escrow", seed16]` | Funder, contractor, oracle, 3-stage amounts |
| Vault | `["vault", seed16]` | Program-owned funds, released only via CPI |

**3-Stage Payout Lifecycle**

```mermaid
stateDiagram-v2
    [*] --> OPEN: init_report
    OPEN --> CONFIRMED: 3 citizen confirmations
    CONFIRMED --> ESCALATED: init_escrow (funds locked)
    ESCALATED --> VERIFIED: Stage 1 · 40% · AI verifies repair
    VERIFIED --> VERIFIED: Stage 2 · 30% · 30-day durability hold
    VERIFIED --> PAID: Stage 3 · 30% · Final audit + community sign-off
    PAID --> [*]
```

</details>

---

## 🤖 AI Verification Engine

Powered by **Google Gemini** with an automatic model-failover chain (`gemini-3.5-flash → gemini-3.1-flash-lite → gemini-2.5-flash`) that survives quota (429) and not-found (404) errors.

| Workflow | What it does |
|---|---|
| 🧾 **Invoice Auditing** | OCR extracts vendor, amount, date, invoice no.; cross-checks against the milestone claim to catch inflation |
| 🔄 **Before / After Comparison** | Judges surface texture, fill material, edge fractures → `repaired: true/false` with confidence |
| 🛣️ **Road Defect Inspection** | Structured JSON: damage type, severity, size estimate, safety risk, confidence |

> **🚫 No Fake Reviews Rule:** a photo of a wall, a shoe, or an undamaged road returns `damage_detected: false` and is flagged — never rubber-stamped.

<details>
<summary><b>📄 Sample AI output (click to expand)</b></summary>

```json
{
  "damage_detected": true,
  "damage_type": "Asphalt Cavity / Pothole",
  "severity": "HIGH",
  "size_estimate_cm": 45.0,
  "surface_type": "asphalt",
  "description_hinglish": "Sadak par gehra pothole hai jisme asphalt cavity aur aggregate loss dikh raha hai.",
  "safety_risk": "High — Severe rim damage hazard for two-wheelers",
  "confidence": 0.94,
  "assessment_status": "PASS"
}
```

</details>

---

## 🔐 Roles & Access

| Role | Who | What they can do | Registration |
|---|---|---|---|
| 🧑 **Citizen / Donor** | Public | Report defects, vote, donate, view audit trails | Self-signup |
| 🏢 **Organization / NGO** | Non-profits, CSR, RWAs | Create campaigns, upload proofs, request releases | Self-signup |
| 👷 **Contractor** | Repair vendors | Accept jobs, submit start/completion evidence | Self-signup |
| 🕵️ **Auditor** | Certified reviewers | Review proofs, sign multisig releases | **Invite-only** |
| 🛠️ **Admin** | Platform operators | Approve users, invite auditors, resolve disputes | **Bootstrap-only** |

---

## ⚡ Getting Started

### Prerequisites
`Node.js 18+` · `PostgreSQL` · `A Gemini API key` · (optional) `Solana CLI / Anchor`

### 1️⃣ Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/VERA.git
cd VERA
npm install
```

### 2️⃣ Configure environment
Create `.env.local` in the project root:
```env
DATABASE_URL=postgres://user:pass@localhost:5432/vera
JWT_SECRET=your-secret
GEMINI_API_KEY=your-gemini-key
DEMO_MODE=true
```

### 3️⃣ Set up the database & admin
```bash
npm run db:migrate
ADMIN_EMAIL=admin@vera.org ADMIN_PASSWORD=ChangeMe123! npm run admin:bootstrap
```

### 4️⃣ Run the blockchain + app
```bash
npm run chain              # local Hardhat node
npm run deploy:contracts   # deploy VERA.sol
npm run dev                # http://localhost:3000
```

### 5️⃣ Verify everything
```bash
npm run type-check
npm run test:all
```

<details>
<summary><b>📱 Run the mobile app</b></summary>

See the **[Android / Flutter repository](https://github.com/vineetm1204-m/MLH-RoadProofxVera)** for full instructions. Quick start:

```bash
flutter pub get
flutter run --dart-define=VERA_USE_MOCK=true                   # offline demo
flutter run --dart-define=VERA_API_URL=https://<host>/api      # live backend
```

</details>

---

## 🔌 API Overview

<details>
<summary><b>🔑 Authentication</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login → cookie + `vera_…` bearer token |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/logout` | End session |

</details>

<details>
<summary><b>🚧 RoadProof / Hisaab</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/hisaab/reports` | List / submit defect reports (multipart) |
| `POST` | `/api/hisaab/analyze` | Run live Gemini Vision on a photo |
| `POST` | `/api/hisaab/reports/:id/confirm` | Confirm on-chain (3rd vote escalates) |
| `POST` | `/api/hisaab/reports/:id/vote` | `CONFIRM` / `REJECT` / `FLAG` |
| `GET` | `/api/hisaab/assignments` | Contractor job list |
| `POST` | `/api/hisaab/repairs/:id/submit` | Submit repair proof |

</details>

<details>
<summary><b>💰 Campaigns & Multisig</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns` | Public campaign list |
| `POST` | `/api/campaigns/:id/donate` | Donate into escrow |
| `POST` | `/api/milestones/:id/proofs` | Upload invoice / proof |
| `POST` | `/api/proofs/:id/approve` · `/reject` | Auditor decision |
| `POST` | `/api/milestones/:id/release-request` | Request fund release |
| `POST` | `/api/release-requests/:id/sign` | Add multisig signature |
| `POST` | `/api/release-requests/:id/execute` | Execute at 2-of-3 |
| `POST` | `/api/milestones/:id/dispute` | Freeze a release |

</details>

<details>
<summary><b>🌍 Audit & Health</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit/ledger` | Public chronological ledger |
| `GET` | `/api/audit/verify-chain` | Prove no record was tampered with |
| `GET` | `/api/health` | Service health |

</details>

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Web** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API routes, raw parameterized SQL via `pg` |
| **Database** | PostgreSQL (sequential migrations) |
| **Smart Contracts** | Solidity + Hardhat + ethers v6 · Rust + Anchor (Solana Devnet) |
| **AI** | Google Gemini (Vision + OCR) with failover |
| **Mobile** | Flutter 3, Dart 3, Riverpod, GoRouter, Dio, Material 3 |

---

## 🛡️ Security Highlights

- 🔒 **No blind retries** on financial mutations — uncertain timeouts trigger ledger reconciliation instead
- 🔑 **Idempotency keys** on every mutating request
- 🧬 **SHA-256 evidence fingerprints** for every photo and document
- ⛓️ **Hash-chained audit log** — any edit breaks the chain and is detectable
- 🚫 **On-chain duplicate-vote prevention** via PDA seeds

---

## 🗺️ Roadmap

- [ ] Mainnet-ready contract audits
- [ ] Municipal API integrations for auto-assignment
- [ ] iOS build of the mobile app
- [ ] Multi-language AI explanations
- [ ] Payment gateway integration for fiat donations

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-idea`
3. Commit: `git commit -m "Add amazing idea"`
4. Push and open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">

### 🌟 If VERA resonates with you, give us a star!

**Built with ❤️ for transparent, accountable public infrastructure.**

[📱 Android App](https://github.com/vineetm1204-m/MLH-RoadProofxVera) · [🎥 Presentation](https://drive.google.com/file/d/1YVqdf17rr34flARb1uczy3JVG23WRZmX/view?usp=sharing) · [🚨 Problem](#-problem-statement) · [👥 Team](#-theycalluscoders)

</div>