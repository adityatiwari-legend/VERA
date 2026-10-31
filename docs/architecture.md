# VERA System Architecture

VERA (**Verifiable Evidence & Real Auditing**) is a transparent charitable donation and fund-tracking platform built on an immutable verification pipeline.

```
DONOR
  ↓
DONATION
  ↓
EARMARKED CAMPAIGN
  ↓
LOCKED ESCROW
  ↓
MILESTONE
  ↓
PROOF SUBMITTED
  ↓
AI VERIFICATION
  ↓
HUMAN AUDITOR
  ↓
2-OF-3 MULTISIG
  ↓
BLOCKCHAIN RELEASE
  ↓
BENEFICIARY SPEND
  ↓
PUBLIC AUDIT TRAIL
```

---

## 1. System Overview

Traditional non-profit giving suffers from a fundamental "black box" dilemma: once donors contribute capital, they have no programmatic visibility into how their money is divided, when deliverables are completed, or whether claimed costs match genuine vendor invoices.

VERA solves this by chaining:
1. **PostgreSQL Atomic Escrow**: Contributions are earmarked to specific campaigns and locked in database accounting transactions.
2. **Milestone Delivery Tracking**: Work is segmented into verifiable milestones with explicit financial ceilings.
3. **Cryptographic Proof Hashing**: Evidence documents (invoices, receipts, completion photos) are fingerprinted with SHA-256 hashes.
4. **AI/OCR Discrepancy Screening**: Automated line-item extraction flags mathematical discrepancies between claimed amounts and invoice receipts.
5. **Certified Human Review**: Discretionary human auditors review AI findings and approve or reject submissions.
6. **2-of-3 Multi-Signature Consensus**: Smart contract fund release requires multiple authorized signers (NGO Admin, Campaign Owner, Auditor) to prevent unilateral embezzlement.
7. **Smart Contract Settlement**: Capital is disbursed on-chain with immutable transaction receipts.
8. **Public Audit Explorer**: Anyone can inspect financial summaries, discrepancy registers, multisig approvals, and block explorer links without authenticating.

---

## 2. Component Hierarchy

```
                                  [ INTERNET ]
                                       │
                                       ▼
                       [ NGINX REVERSE PROXY / TLS ]
                                       │
                                       ▼
                     [ NEXT.JS FULL-STACK APPLICATION ]
                     ├── App Router (SSR & Dynamic Pages)
                     │   ├── / (Landing Page & How It Works)
                     │   ├── /campaigns (Discovery & Search)
                     │   ├── /campaigns/:id/audit (Public Audit Dashboard)
                     │   ├── /campaigns/:id/report (Printable Report)
                     │   ├── /donor/donations/:id/trace (Trace My Donation)
                     │   └── /ngos/:id (Public NGO Profile & Reputation)
                     │
                     ├── Server-Side Domain Libraries
                     │   ├── lib/fund_transactions.ts (Accounting Engine)
                     │   ├── lib/reputation.ts (Deterministic Scoring)
                     │   ├── lib/audit_timeline.ts (Timeline Normalization)
                     │   ├── lib/verification.ts (AI / OCR Inspection)
                     │   ├── lib/blockchain.ts (Ethers.js Smart Contract Driver)
                     │   └── lib/storage.ts (Cryptographic Evidence Storage)
                     │
                     └── REST API Handlers (/api/*)
                                       │
                 ┌─────────────────────┴──────────────────────┐
                 ▼                                            ▼
      [ POSTGRESQL 16 (vera-db) ]                 [ TESTNET RPC NODE ]
      ├── users (RBAC)                            ├── VERA.sol Smart Contract
      ├── campaigns (Escrow)                      ├── 2-of-3 Multisig Engine
      ├── donations (Earmarks)                    └── On-Chain Event Logs
      ├── milestones (Deliverables)
      ├── proofs (SHA-256 Hashed Evidence)
      ├── verification_results (OCR Discrepancies)
      ├── release_requests (Multisig State)
      ├── multisig_approvals (Signer Ledger)
      ├── fund_transactions (Double-Entry Ledger)
      └── audit_logs (Immutable Audit Trail)
```

---

## 3. Database Schema & Invariants

All financial operations are governed by transactional ACID guarantees:

### Core Financial Invariants:
1. `raised_amount >= locked_amount`
2. `raised_amount >= released_amount`
3. `released_amount <= raised_amount`
4. `locked_amount = raised_amount - released_amount - refunded_amount`
5. `milestones_total <= campaign_target`
6. `released_amount <= milestone_allocated_amount`
7. `zero negative balances`

### Schema Relationship Graph:
```
users (NGO, DONOR, AUDITOR, ADMIN)
  │
  ├── campaigns
  │     │
  │     ├── milestones
  │     │     │
  │     │     └── proofs
  │     │           ├── proof_files (SHA-256)
  │     │           └── verification_results (AI/OCR Analysis)
  │     │
  │     ├── donations
  │     ├── fund_transactions (DONATION, LOCK, RELEASE, REFUND)
  │     ├── release_requests (Multisig Orchestration)
  │     │     └── multisig_approvals (Individual Signatures)
  │     └── audit_logs (System-Wide Immutable Events)
```

---

## 4. Multi-Tenant Role-Based Access Control (RBAC)

- **DONOR**: View campaigns, make contributions, access personal receipts, follow "Trace My Donation" journey. Cannot modify campaigns, approve proofs, or authorize releases.
- **NGO**: Launch campaigns, define milestones, upload evidence proofs. Cannot approve own proofs, cannot unilaterally release funds.
- **AUDITOR**: Inspect submitted proofs, review AI discrepancy screening, approve or reject milestones, sign multisig releases.
- **ADMIN**: Platform management, dispute oversight, compliance maintenance.
- **PUBLIC**: Inspect public campaign discovery, explore Public Audit Dashboards, view complete fund timelines, verify blockchain hashes and NGO reputation scores without authentication.

---

## 5. Security & Isolation Model

- **Private Key Isolation**: Blockchain private keys are strictly server-side environment variables. Never stored in PostgreSQL, never serialized to client bundles, and never returned in API payloads.
- **MIME & Traversal Validation**: Uploaded evidence files are sanitized against path traversal and validated against a strict MIME whitelist (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
- **Parameterized SQL**: All database operations use parameter bindings via `pg` pool to prevent SQL injection.
- **Auditor Isolation**: Proof approvals require certified auditor credentials; NGOs attempting to sign off on their own claims are blocked with HTTP 403 Forbidden.
