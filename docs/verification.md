# VERA Evidence Verification & Auditing Pipeline

VERA implements a multi-stage evidence verification architecture combining cryptographic storage, automated AI/OCR consistency checks, and certified human auditor discretion.

---

## 1. Verification Flow

```
[ NGO Submits Proof ]
  ├── Description & Claimed Amount (₹)
  └── Uploads Files (Invoice PDF, Receipts, Photos)
       │
       ▼
[ Storage & Cryptographic Hashing ]
  ├── Path Traversal Sanitization
  ├── MIME Type & Extension Whitelisting
  └── SHA-256 Cryptographic Fingerprint Computed
       │
       ▼
[ Automated AI / OCR Analysis ]
  ├── Vision/OCR extracts Vendor Name, Date, Tax ID
  ├── Extracts itemized line item total
  └── Computes Discrepancy: | Claimed - Detected |
       │
       ├── If Discrepancy > 0: Sets ai_status = 'FLAG'
       └── If Discrepancy = 0: Sets ai_status = 'PASS'
       │
       ▼
[ Certified Human Auditor Review ]
  ├── Auditor inspects original documents
  ├── Reviews AI discrepancy notes
  ├── Approves at actual invoice cost OR Rejects with comment
       │
       ├── APPROVED: Milestone unlocked for multisig release
       └── REJECTED: Milestone returns to NGO for correction/resubmission
```

---

## 2. Cryptographic Evidence Storage (`lib/storage.ts`)

Uploaded evidence documents are protected by multi-layered controls:

1. **Path Traversal Protection**: File names are sanitized with `path.basename()` and stored under unique timestamped UUID filenames.
2. **Strict MIME Whitelist**:
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - Rejects executable files (`.exe`, `.sh`, `.bat`, `.js`).
3. **SHA-256 Fingerprinting**: Each file is streamed through `crypto.createHash('sha256')`. The resulting 64-character hexadecimal digest is recorded in `proof_files.sha256_hash` to detect document tampering or duplicate submissions.
4. **Volume Isolation**: Physical files reside in `/app/storage/proofs` on a persistent Docker volume (`vera_storage`), inaccessible to public unauthenticated requests.

---

## 3. AI / OCR Discrepancy Screening (`lib/verification.ts`)

The AI verification engine inspects documents for invoice integrity:
- Parses invoice headers, vendor names, and GSTIN / Tax identification numbers.
- Sums extracted line items to determine actual documented costs.
- Calculates mathematical discrepancy:
  $$\Delta = |\text{Claimed Amount} - \text{Extracted Amount}|$$
- If $\Delta > 0$, an automated discrepancy record is logged with flag notes for the auditor.

---

## 4. Auditor Discretion & Resubmission

Human auditors retain final authority:
- **No Autonomous AI Release**: The AI cannot release funds. It functions strictly as an automated screener.
- **Auditor Rejection Flow**: Rejections require an explicit, non-empty comment recorded immutably in `proofs.rejection_reason` and `audit_logs`.
- **Historical Preservation**: Rejected proofs are preserved in the database for auditing history. Subsequent resubmissions are tracked as new proof versions.

---

## 5. System Scope & Technical Limitations

VERA documents its boundaries with technical honesty:

### What VERA Proves:
- Funds are locked in database escrow and cannot be silently withdrawn without audited records.
- Document SHA-256 fingerprints ensure evidence is not modified after upload.
- Mathematical discrepancies between claims and receipts are surfaced automatically.
- Multiple independent signers must confirm before smart contract releases capital.
- Financial transactions are recorded immutably on blockchain.

### What VERA Does Not Guarantee:
- Offline physical reality: VERA cannot independently prove whether a vendor delivered genuine or counterfeit goods.
- Physical site inspection: A geotagged photo cannot guarantee the building was not photographed elsewhere without human auditor verification.
- Absolute NGO benevolence: VERA enforces procedural transparency, not moral guarantees.
