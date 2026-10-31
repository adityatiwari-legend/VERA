# FundTrail — System Architecture

## 1. Project Overview

**FundTrail** is a transparent donation and fund-tracking platform designed around one core promise:

> A donor should be able to trace where their donated money goes, why it was released, what proof was submitted, and what happened to the funds afterward.

Core flow:

**Donor → Earmarked Donation → Locked Funds → Milestone → Proof → Verification → Approval → Fund Release → Beneficiary Spend → Public Audit Trail**

The system uses PostgreSQL as the application's primary data source, while blockchain provides a tamper-evident record of important financial/state transitions.

---

## 2. Problem Statement Requirements

The platform should support:

- Traceability of every rupee from donor to final beneficiary spend
- Earmarked donations tied to a specific campaign/purpose
- Locked funds
- Milestone-based fund releases
- Proof uploads for milestones
- Proof verification
- Public donor/audit dashboard
- Protection against silent fund reallocation
- Campaign-level reporting

Bonus features:

- Multi-signature approval
- Refund path for missed milestones
- NGO reputation score

---

## 3. User Roles

### Donor
- Browse campaigns
- View campaign milestones
- Donate to a specific campaign/purpose
- Track donation status
- View fund movement
- View submitted proofs
- View verification and release history

### NGO / Campaign Manager
- Create campaigns
- Define funding target
- Define milestones
- Submit milestone proofs
- Upload invoices, receipts, photos and documents
- Request milestone release
- View campaign financial status

### Auditor / Verifier
- Review submitted evidence
- Review AI verification results
- Approve or reject milestone proof
- Approve fund release where required
- Flag discrepancies

### Public Viewer
- View public campaigns
- View campaign progress
- View released/spent amounts
- View public audit trail
- Verify blockchain transaction references

---

# 4. High-Level Architecture

```text
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │    NGINX      │
                    │ SSL / Reverse │
                    │     Proxy     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Next.js    │
                    │ TypeScript    │
                    │               │
                    │ UI + API      │
                    │ Auth          │
                    │ Business Logic│
                    └───────┬───────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌──────────────┐
       │ PostgreSQL │ │ VPS File   │ │ AI / OCR API │
       │ Direct SQL │ │  Storage   │ │              │
       └────────────┘ └────────────┘ └──────────────┘
              │
              │
              ▼
       ┌─────────────────┐
       │ Blockchain      │
       │ Smart Contract  │
       │ + ethers.js     │
       └─────────────────┘
```

---

# 5. Architecture Principles

### PostgreSQL = Application Source of Truth

PostgreSQL stores:

- Users
- Campaigns
- Milestones
- Donations
- Fund transactions
- Proof metadata
- Verification results
- Approvals
- Refunds
- Reputation
- Audit logs

### Blockchain = Tamper-Evident Financial/State Layer

Blockchain records important events such as:

- Campaign creation
- Donation
- Fund locking
- Milestone creation
- Release approval
- Fund release
- Refund

The blockchain should not be treated as proof that a real-world event actually happened.

Instead, uploaded evidence and verification establish the application's evidence trail, while blockchain makes recorded financial/state transitions difficult to alter silently.

### VPS Storage = Evidence Storage

Files such as:

- Invoices
- Receipts
- Photos
- Documents

are stored on the VPS during the hackathon.

Each uploaded file should have a SHA-256 hash stored in PostgreSQL.

---

# 6. Technology Stack

## Frontend + Backend

- Next.js
- TypeScript
- Tailwind CSS
- Next.js API Routes / Server Actions

## Database

- PostgreSQL
- `pg` PostgreSQL driver
- Direct SQL queries
- SQL migration files

**No ORM is required.**

## Blockchain

- Solidity
- ethers.js
- Testnet smart contract

## AI / Verification

- LLM / OCR API
- OCR and document extraction
- Amount/date/vendor extraction
- Duplicate evidence detection
- Consistency checks
- Discrepancy detection

AI recommends verification outcomes; it should not independently release funds.

## Storage

- VPS local storage
- Docker volume for persistence

## Infrastructure

- Docker
- Docker Compose
- Nginx
- VPS
- HTTPS / SSL
- GitHub

---

# 7. Database Architecture

## users

```text
id
name
email
wallet_address
role
created_at
```

Roles:

```text
DONOR
NGO
AUDITOR
ADMIN
```

## campaigns

```text
id
ngo_id
title
description
target_amount
raised_amount
released_amount
beneficiary
status
blockchain_campaign_id
created_at
```

## milestones

```text
id
campaign_id
title
description
amount
sequence
status
proof_required
created_at
```

Statuses:

```text
LOCKED
IN_PROGRESS
PROOF_SUBMITTED
UNDER_REVIEW
APPROVED
RELEASED
REJECTED
FAILED
```

## donations

```text
id
campaign_id
donor_id
amount
purpose
status
transaction_hash
created_at
```

## fund_transactions

```text
id
campaign_id
milestone_id
donation_id
type
amount
reference
transaction_hash
created_at
```

Types:

```text
DONATION
LOCK
RELEASE
SPEND
REFUND
```

## proofs

```text
id
milestone_id
submitted_by
description
claimed_amount
status
submitted_at
```

## proof_files

```text
id
proof_id
file_name
file_path
mime_type
sha256_hash
uploaded_at
```

## verification_results

```text
id
proof_id
ai_status
confidence
extracted_amount
extracted_date
extracted_vendor
discrepancy_amount
duplicate_detected
notes
created_at
```

## approvals

```text
id
milestone_id
approver_id
approval_type
status
comment
created_at
```

## refunds

```text
id
campaign_id
milestone_id
amount
reason
status
transaction_hash
created_at
```

## ngo_reputation

```text
id
ngo_id
score
milestones_completed
milestones_failed
total_funds_handled
updated_at
```

## audit_logs

```text
id
campaign_id
actor_id
action
entity_type
entity_id
metadata
created_at
```

---

# 8. Fund Lifecycle

```text
DONATION
   │
   ▼
EARMARKED TO CAMPAIGN
   │
   ▼
LOCKED
   │
   ▼
MILESTONE STARTED
   │
   ▼
PROOF SUBMITTED
   │
   ▼
AI + RULE CHECKS
   │
   ▼
HUMAN VERIFICATION
   │
   ├──── REJECTED ────► CORRECTION / FAILED
   │
   ▼
APPROVED
   │
   ▼
MULTI-SIGNATURE APPROVAL (optional)
   │
   ▼
FUNDS RELEASED
   │
   ▼
BENEFICIARY SPEND
   │
   ▼
PUBLIC AUDIT TRAIL
```

---

# 9. Evidence Verification Pipeline

```text
Upload Evidence
      │
      ▼
Calculate SHA-256 Hash
      │
      ▼
Store File + Metadata
      │
      ▼
OCR / Metadata Extraction
      │
      ▼
AI Analysis
      │
      ▼
Rule-Based Checks
      │
      ▼
Duplicate / Consistency Checks
      │
      ▼
Discrepancy Detection
      │
      ▼
Human Auditor
      │
 ┌────┴─────┐
 ▼          ▼
APPROVE    REJECT
 │
 ▼
Release Request
```

Example:

```text
Claimed milestone amount: ₹3,000
Invoice amount:            ₹2,850

Discrepancy: ₹150

AI result:
- Invoice detected
- Vendor detected
- Date detected
- Amount extracted
- No duplicate detected
- ₹150 discrepancy found

Final decision:
Human auditor required
```

---

# 10. Smart Contract Architecture

The smart contract should remain intentionally simple for the hackathon.

## Core Functions

```solidity
createCampaign()
donate()
createMilestone()
requestRelease()
approveRelease()
releaseFunds()
refund()
```

## Example Contract State

```text
Campaign
 ├── owner / NGO
 ├── target amount
 ├── total donated
 ├── total released
 ├── active
 └── milestones[]

Milestone
 ├── amount
 ├── status
 ├── proof hash
 └── approvals
```

The contract should enforce:

- Donation is tied to a campaign
- Milestone release cannot exceed its allocated amount
- Released funds cannot be silently reassigned
- Release requires required approval
- Refund can occur when a milestone fails according to contract rules

---

# 11. Blockchain + Database Relationship

```text
              APPLICATION
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   PostgreSQL          Blockchain
        │                   │
        │                   │
Detailed data       Critical state events
        │                   │
        └─────────┬─────────┘
                  ▼
             Audit Trail
```

PostgreSQL stores the complete application record.

Blockchain stores verifiable references to critical financial/state changes.

For evidence:

```text
Evidence File
     │
     ▼
SHA-256 Hash
     │
     ├──► PostgreSQL
     │
     └──► Blockchain reference (optional)
```

---

# 12. Public Audit Dashboard

Each campaign should expose:

### Campaign Summary

```text
Target:          ₹10,00,000
Raised:          ₹7,50,000
Locked:          ₹4,50,000
Released:        ₹3,00,000
Remaining:       ₹4,50,000
```

### Milestone Timeline

```text
Milestone 1
₹3,00,000
✓ Proof Submitted
✓ Verified
✓ Approved
✓ Released

Milestone 2
₹2,50,000
✓ Proof Submitted
◉ Under Review

Milestone 3
₹4,50,000
○ Locked
```

### Transaction Trail

```text
Donation
   ↓
Lock
   ↓
Milestone Allocation
   ↓
Proof
   ↓
Verification
   ↓
Approval
   ↓
Release
   ↓
Spend
```

Every important transaction should show:

- Amount
- Timestamp
- Actor
- Purpose
- Status
- Transaction hash where applicable

---

# 13. Multi-Signature Approval

Optional bonus feature.

Example approval model:

```text
Release ₹3,00,000
       │
       ├── NGO Admin ✓
       ├── Campaign Owner ✓
       └── Auditor ✓
                │
                ▼
           Release Funds
```

For the MVP, a simple 2-of-3 or 3-of-3 approval flow is sufficient.

---

# 14. Refund Flow

If a milestone fails:

```text
Milestone
    │
    ▼
Deadline / Verification Failure
    │
    ▼
FAILED
    │
    ▼
Refund Eligible
    │
    ▼
Refund Calculation
    │
    ▼
Refund Transaction
    │
    ▼
Donor / Designated Refund Destination
```

Refund rules should be explicitly stored and auditable.

---

# 15. NGO Reputation

Optional bonus feature.

Possible score inputs:

```text
Milestones completed
Milestones failed
Verification success rate
Proof quality
Fund utilisation history
Refund history
Audit flags
```

Example:

```text
NGO Reputation: 87/100

Milestones completed: 24
Milestones failed:     2
Funds handled:         ₹42L
Verification rate:     94%
```

---

# 16. API Structure

```text
/api/campaigns
/api/campaigns/:id
/api/campaigns/:id/donate

/api/milestones
/api/milestones/:id

/api/proofs
/api/proofs/:id

/api/verification
/api/verification/:id

/api/approvals
/api/releases
/api/refunds

/api/donations
/api/donations/:id

/api/audit/:campaignId
/api/reputation/:ngoId
```

All database operations use parameterized SQL queries through `pg`.

Example:

```typescript
const result = await db.query(
  `SELECT * FROM donations
   WHERE campaign_id = $1
   ORDER BY created_at DESC`,
  [campaignId]
);
```

Never concatenate user input directly into SQL.

---

# 17. Project Structure

```text
fundtrail/
│
├── app/
│   ├── (public)/
│   ├── donor/
│   ├── ngo/
│   ├── auditor/
│   └── api/
│
├── components/
│
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── blockchain.ts
│   ├── verification.ts
│   ├── storage.ts
│   └── audit.ts
│
├── db/
│   ├── migrations/
│   ├── schema.sql
│   └── seed.sql
│
├── contracts/
│   └── FundTrail.sol
│
├── public/
│
├── storage/
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

---

# 18. Database Connection

Use a shared PostgreSQL connection pool.

```typescript
import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

Environment variable:

```env
DATABASE_URL=postgresql://user:password@fundtrail-db:5432/fundtrail
```

---

# 19. VPS Architecture

```text
                    INTERNET
                       │
                       ▼
                  ┌─────────┐
                  │  NGINX  │
                  │ HTTPS   │
                  └────┬────┘
                       │
                       ▼
               ┌───────────────┐
               │ fundtrail-app │
               │   Next.js     │
               └───────┬───────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
       ┌────────────┐    ┌─────────────┐
       │fundtrail-db│    │ VPS Storage │
       │ PostgreSQL │    │  Evidence   │
       └────────────┘    └─────────────┘
```

Docker Compose services:

```text
fundtrail-app
fundtrail-db
nginx
```

Evidence storage should use a persistent Docker volume so container recreation does not delete uploaded files.

---

# 20. Environment Variables

```env
DATABASE_URL=
NEXT_PUBLIC_APP_URL=

AI_API_KEY=

BLOCKCHAIN_RPC_URL=
BLOCKCHAIN_PRIVATE_KEY=
CONTRACT_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=

STORAGE_PATH=
```

Never commit secrets to GitHub.

---

# 21. Deployment Flow

```text
Developer Machine
       │
       ▼
     GitHub
       │
       ▼
      VPS
       │
       ├── git clone / git pull
       ├── configure .env
       ├── docker compose build
       ├── docker compose up -d
       │
       ▼
     NGINX
       │
       ▼
   HTTPS Domain
```

For subsequent deployments:

```bash
git pull
docker compose up -d --build
```

---

# 22. MVP Priority

## P0 — Must Work

1. Campaign creation
2. Public campaign page
3. Donation
4. Earmarking
5. Locked funds
6. Milestones
7. Proof upload
8. Verification
9. Approval
10. Fund release
11. Public audit trail

## P1 — Should Work

1. Blockchain transaction recording
2. AI proof verification
3. Refund flow

## P2 — Bonus

1. Multi-signature approval
2. NGO reputation
3. Advanced analytics
4. Advanced UI animations

**Rule: Never sacrifice P0 functionality for bonus features.**

---

# 23. Demo Scenario

### Campaign

```text
Government School Classroom — Jaipur

Target: ₹10,00,000
Raised: ₹7,50,000
```

### Donor

```text
Donor contributes: ₹10,000
Purpose: Classroom renovation
```

### Flow

```text
₹10,000 donated
      ↓
Earmarked to campaign
      ↓
Funds locked
      ↓
Milestone: Electrical work
      ↓
NGO uploads invoice + photos
      ↓
AI extracts and checks evidence
      ↓
Auditor reviews
      ↓
Approval
      ↓
₹3,000 released
      ↓
Blockchain transaction recorded
      ↓
Donor sees complete audit trail
```

The demo should make the value proposition obvious:

> “I donated ₹10,000. I can see exactly which milestone it is funding, what evidence was submitted, who verified it, how much was released, and the resulting transaction.”

---

# 24. 14-Hour Hackathon Execution Plan

## Before 5:30 PM

Build the core flow:

```text
Campaign
→ Donation
→ Locked Funds
→ Milestone
→ Proof Upload
→ Verification
→ Approval
→ Release
→ Audit Trail
```

Use the first mentorship to validate:

- Architecture
- Blockchain approach
- MVP scope
- Demo flow

## 6:00 PM – 9:30 PM

Finish the complete MVP.

Target:

**Full donor-to-beneficiary demo working before the second mentorship.**

Deploy early.

## 10:00 PM – 2:00 AM

Add:

1. AI verification
2. Blockchain integration
3. Multi-signature approval
4. Refund
5. NGO reputation

Only continue if the core MVP is stable.

## 2:00 AM – 5:00 AM

- Fix bugs
- Improve UI
- Prepare realistic demo data
- Make the audit trail visually strong
- Test deployment
- Test the complete demo repeatedly

## 5:00 AM – 6:00 AM

Freeze features.

- Final deployment
- Final testing
- Screenshots
- Demo video/pitch if required
- Submission material

## 6:00 AM – 7:00 AM

**Submission only.**

No major development.

---

# 25. Critical Technical Principle

FundTrail should NOT claim:

> “Blockchain proves that the NGO actually spent the money correctly.”

Instead claim:

> “FundTrail makes every recorded fund movement attributable and auditable, ties releases to predefined milestones and submitted evidence, and uses blockchain to provide a tamper-evident record of critical financial/state transitions.”

This distinction keeps the technical claims credible.

---

# 26. Final Architecture Summary

```text
                    ┌─────────────────────┐
                    │       DONOR         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Next.js        │
                    │ UI + API + Auth     │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
       ┌───────────┐    ┌─────────────┐    ┌────────────┐
       │PostgreSQL │    │ VPS Storage │    │ AI / OCR   │
       │ Direct SQL│    │  Evidence   │    │Verification│
       └─────┬─────┘    └─────────────┘    └─────┬──────┘
             │                                    │
             │                                    │
             └────────────────┬───────────────────┘
                              ▼
                       ┌──────────────┐
                       │   Auditor    │
                       │   Approval   │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Blockchain  │
                       │ Smart Contract│
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Fund Release │
                       │ + Audit Trail│
                       └──────────────┘
```

**Architecture decision:** PostgreSQL + `pg` + direct SQL, with no ORM. This keeps the stack lean and reduces setup overhead for the hackathon.
