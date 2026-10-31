# VERA Blockchain Architecture — What We Use and Why

VERA runs on **two blockchains**, each chosen for a specific job:

| | **EVM (Hardhat / Ethereum testnets)** | **Solana (devnet)** |
|---|---|---|
| Module | VERA Core (donation escrow) | Hisaab of the Road (pothole repair escrow) |
| Contract | `VERA.sol` (Solidity 0.8.20) | `hisaab` Anchor program (Rust, Anchor 0.30.1) |
| Program ID | `0x5FbDB2315678afecb367f032d93F642f64180aa3` (local) | `AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw` |
| Trust mechanism | 2-of-3 human multisig release | Oracle-gated 3-stage release + on-chain confirmation dedupe |
| Client library | ethers.js v6 (`lib/blockchain.ts`) | `@solana/web3.js` + `@coral-xyz/anchor` (`lib/solana.ts`) |
| Explorer | Etherscan (testnets) / built-in `/explorer/tx/[hash]` (local) | Solana Explorer (`?cluster=devnet`) |

Both chains serve the same thesis from opposite directions: **money is locked by code, not by a company's promise, and every state transition is publicly verifiable.**

---

## 1. Why Blockchain At All

A normal app can implement escrow with a database column. Blockchain buys four properties a database cannot:

1. **Neutral custody.** Escrowed funds live in contract/vault accounts that no team member can move arbitrarily. `VERA.sol` releases only on 2-of-3 signatures; the Hisaab vault pays out only through its program's instructions. "Trust us" becomes "verify the program."
2. **Tamper-evident ordering.** Donations, releases, refunds and report confirmations are appended to a public ledger with timestamps nobody can rewrite retroactively — the audit trail outlives our servers.
3. **Public verifiability.** Any donor, citizen or judge can click an explorer link and confirm the release actually happened, without an account on our platform.
4. **Rules without administrators.** Allocation caps (`totalAllocated ≤ target`), double-release prevention and confirmation dedupe are enforced by program logic, not by our backend behaving well.

### What blockchain does **not** solve (stated honestly everywhere in the product)

- **The oracle problem.** On-chain code executes what it is told. Hisaab's stage releases are pushed by our server keypair after Gemini + citizen verification — that oracle is a trust assumption, not eliminated by the chain.
- **Sybil resistance.** Distinct keypairs ≠ distinct humans.
- **Physical reality.** The chain proves money moved and evidence was recorded; it cannot inspect asphalt. Human auditors (VERA Core) and before/after vision (Hisaab) cover that layer.
- **Performance needs.** Our transaction volume is tiny; we use chains for *trust properties*, not throughput.

---

## 2. Why Two Chains

**VERA Core stayed on EVM** because its requirements are exactly what Ethereum tooling is best at: a stateful multisig escrow contract (`require`-based invariants, mapping-backed approvals), mature Hardhat test coverage (21 contract tests), ethers.js relayer integration, and a clean path to mainnet-grade L2s (Base, Polygon) later.

**Hisaab chose Solana** for three concrete reasons:

1. **Micro-transactions.** Citizen confirmations and report anchors must be effectively free — a pothole report triggers several on-chain writes per user. Solana's fee model (fractions of a cent) fits; Ethereum mainnet gas does not (devnet/testnet EVM would work technically, but devnet Solana also gives a *public* explorer trail).
2. **The PDA vault pattern fits milestone escrow natively.** Program-Derived Accounts give us a vault no keypair owns — funds move only through program logic with signed seeds. Three-stage release + refund are ~100 lines of Anchor.
3. **Sponsor-track alignment and the demo story.** Native Solana Explorer links for every report, confirmation and release make the public-verifiability claim visible in seconds.

**The honest cost:** two toolchains (Hardhat + Anchor/WSL), two keypair systems, two integration layers. We accepted it because each module's requirements genuinely differ — this is documented, not hidden.

---

## 3. EVM Side — `VERA.sol` (VERA Core)

### 3.1 State

```solidity
struct Campaign {
    bytes32 id; uint256 targetAmount;
    uint256 totalDonated; uint256 totalReleased; uint256 totalAllocated;
    bool active;
    address owner; address ngoAdmin; address campaignOwner; address auditor; // 3 signers
}
struct Milestone {
    bytes32 id; uint256 amount;
    uint256 releasedAmount; uint256 requestedReleaseAmount;
    bool releaseRequested; bool released; bool failed;
}
mapping(bytes32 => Campaign) public campaigns;
mapping(bytes32 => mapping(bytes32 => Milestone)) public milestones;
mapping(bytes32 => mapping(bytes32 => mapping(address => bool))) public releaseApprovals;
mapping(bytes32 => mapping(bytes32 => uint8)) public approvalCounts;
mapping(bytes32 => mapping(address => uint256)) public donorContributions;
address public admin; // deployer — relayer + emergency role only
```

UUIDs in Postgres map deterministically to on-chain ids via `ethers.id(uuid)` (keccak256 → `bytes32`) in `lib/blockchain.ts:44`.

### 3.2 Function reference

| Function | Access | Notes |
|---|---|---|
| `createCampaign(id, target, owner, ngoAdmin, campaignOwner, auditor)` | open | Registers the 3-of-3 signer trio |
| `setSigners(id, …)` | owner/admin | Reassign signers |
| `donate(id)` payable | open | `nonReentrant`; emits `DonationReceived` |
| `createMilestone(id, msId, amount)` | open | Invariant: `totalAllocated + amount ≤ targetAmount` |
| `requestRelease(id, msId, amount)` | owner/admin/ngoAdmin | Amount ≤ milestone allocation |
| `approveRelease(id, msId)` | one of 3 signers | One approval per signer; emits `ReleaseApproved` |
| `approveReleaseFor(id, msId, approver)` | **onlyAdmin** | Relayer signs on behalf of an approver (see §3.3) |
| `releaseFunds(id, msId, recipient)` | — | **Requires `approvalCount ≥ 2`**; `nonReentrant`; emits `FundsReleased` |
| `refund(id, recipient, amount, reason)` | owner/admin | Capped at remaining escrow; emits `RefundIssued` |
| `markMilestoneFailed(id, msId, reason)` | owner/admin/auditor | Blocks release, enables refunds |

Events: `CampaignCreated`, `SignersConfigured`, `DonationReceived`, `MilestoneCreated`, `ReleaseRequested`, `ReleaseApproved`, `FundsReleased`, `RefundIssued`, `MilestoneFailed` — every financial transition is observable.

### 3.3 The server-side relayer pattern

Private keys never touch the browser. `lib/blockchain.ts` exposes:

- `getProvider()` — `BLOCKCHAIN_RPC_URL` (default local Hardhat node, chainId 31337)
- `getSigner()` — `ethers.Wallet(BLOCKCHAIN_PRIVATE_KEY, provider)`; callers may pass a different key for donor-signed demo flows
- `getContract()` — address from `CONTRACT_ADDRESS` or `contracts/deployed.json`
- Write helpers (`onChainCreateCampaign`, `onChainDonate`, `onChainCreateMilestone`, `onChainRequestRelease`, `onChainApproveRelease`, `onChainReleaseFunds`, `onChainRefund`) — each checks `isBlockchainConfigured()`, sends the tx, `tx.wait(1)`, and returns the real receipt.

The key design point is `approveReleaseFor`: auditor multisig approvals happen in the app, and the **backend relayer submits them on-chain** (`onlyAdmin`). The signature policy (2-of-3) is enforced in the database release-request state machine *and* by the contract's approval counter — the chain is the second lock, not the only one. Only genuine `tx.wait(1)` receipts are persisted (`fund_transactions.blockchain_tx_hash / block_number / status`); VERA never fabricates a hash. If the chain is unreachable, the escrow state machine keeps working and `blockchain_status` honestly reads `NOT_SUBMITTED`/`FAILED`.

### 3.4 Explorer mapping

`getExplorerTxUrl(chainId, hash)` maps chain → explorer: Sepolia (11155111) and Holesky (17000) → Etherscan; local Hardhat (31337) → the built-in public `/explorer/tx/[hash]` page, so the demo shows verifiable receipts even on a local node.

---

## 4. Solana Side — the `hisaab` Anchor program

Source: [`contracts/hisaab/programs/hisaab/src/lib.rs`](../contracts/hisaab/programs/hisaab/src/lib.rs) · IDL: `contracts/hisaab/target/idl/hisaab.json`

### 4.1 Accounts (PDAs)

| PDA | Seeds | Purpose |
|---|---|---|
| `Report` | `["report", seed16]` | Reporter pubkey, lat/lng (i64 ×1e6), severity, `media_hash [u8;32]` (SHA-256 of the photo), confirmation count, status, timestamp |
| `Confirmation` | `["confirm", seed16, confirmer_pubkey]` | **One per confirmer — the seed itself makes double-confirmation by the same wallet impossible on-chain** |
| `Escrow` | `["escrow", seed16]` | Funder, contractor, oracle pubkey, `stage_amounts [u64;3]` (lamports), `released_stage` |
| `Vault` | `["vault", seed16]` | Program-owned lamport vault; no keypair controls it — funds move only via program CPI with signed seeds |

`seed16` is the report UUID's 16 bytes (`lib/solana.ts: seedFromId`), so every Postgres report id maps 1:1 to a deterministic on-chain address.

### 4.2 Instructions

| Instruction | Signer | What it enforces |
|---|---|---|
| `init_report(seed, lat, lng, severity, media_hash)` | reporter (relayer) | Anchors the report: geo, severity and the photo's SHA-256 are now immutable public state |
| `confirm_report(seed)` | confirming citizen | Requires `report.seed == seed`; increments confirmations; flips status to CONFIRMED at **3**; PDA dedupe makes repeats fail |
| `init_escrow(seed, oracle, stage_amounts)` | funder | Validates seeds match; transfers the **entire budget** funder → vault in one CPI; sets status ESCALATED |
| `release_stage(stage)` | **oracle only** | Stage must be exactly `released_stage + 1`; vault → contractor CPI signed by `["vault", seed, vault_bump]`; stage 1 = repair verified, stage 2 = 30-day hold passed, stage 3 = final sign-off |
| `refund()` | funder **or** oracle | Drains the vault back to the original funder (rejected repair / failed milestone) |

Error codes: `SeedMismatch(6000)`, `UnauthorizedOracle(6001)`, `UnauthorizedContractor(6002)`, `InvalidStage(6003)`, `NothingToRefund(6004)`, `Overflow(6005)`.

### 4.3 Trust model (the honest part)

The vault is **neutral** — program logic is the only path from vault to contractor, and it can only pay stages in order. The **oracle** (server keypair, `HISAAB_ORACLE_KEYPAIR`) decides *when* evidence thresholds are met: it calls `release_stage` only after Gemini's before/after verdict and roughness telemetry pass, and only stage 3 after the 30-day hold recorded in Postgres. A malicious oracle could withhold payment (funds come back via refund) but can never redirect funds to itself — the contractor is pinned at `init_escrow` and re-validated by the `UnauthorizedContractor` constraint on every release.

### 4.4 Citizen wallets

Each CITIZEN account gets a devnet keypair on first confirmation (`citizen_wallets` table; `lib/hisaab.ts: ensureCitizenWallet`). Confirmations are signed by *distinct* wallets — the on-chain dedupe is real, and the demo honestly labels this devnet-only identity (not proof-of-personhood).

### 4.5 INR ↔ lamports

Demo economics convert rupees to lamports at a fixed `SOL_INR_RATE` (default ₹20,000/SOL): `lamports = amount / rate × 1e9`. Stated in the UI; a real deployment would use USDC or a tokenized rupee.

---

## 5. Integration Architecture — Postgres as source of truth, chains as anchors

```text
App action (Next.js API)
  ├─▶ PostgreSQL transaction     ← the operational state machine (source of truth)
  │     + audit_logs hash chain  ← sha256(prev + payload), append-only trigger
  └─▶ On-chain anchor (best-effort, server-signed)
        ├─ EVM:    tx receipt → fund_transactions.blockchain_tx_hash
        └─ Solana: signature  → pothole_reports / confirmations / escrows .solana_tx_hash
```

- **If a chain is down**, every flow keeps working from Postgres; status columns and the console sidebar honestly show `ledger-only` / `Off`. The demo never breaks; nothing is ever fabricated as "confirmed."
- **`lib/integrity.ts` — DB↔chain reconciliation.** `runIntegrityChecks()` fetches every stored receipt and verifies: tx status = 1, correct contract address, expected event (`DonationReceived` / `FundsReleased` / `RefundIssued`), and that campaign/milestone ids, amounts and recipients match the database; it also compares campaign and milestone state against on-chain views with double-release detection. Results surface as severity-ranked alerts (`LOW` → `CRITICAL`) on the audit pages.
- **The Postgres audit hash chain** (`sha256(prev_hash ‖ canonical payload)`, advisory-locked appends, DELETE-blocking trigger, `/api/audit/verify-chain`) gives tamper-evidence *inside* the app layer on both modules — the chains anchor the critical financial transitions, the hash chain covers everything else.

---

## 6. Operations

### Environment

| Variable | Side | Purpose |
|---|---|---|
| `BLOCKCHAIN_RPC_URL` | EVM | JSON-RPC endpoint (default `http://127.0.0.1:8545`) |
| `BLOCKCHAIN_PRIVATE_KEY` | EVM | Relayer key (Hardhat account #0 in dev) — server-side only |
| `CONTRACT_ADDRESS` / `NEXT_PUBLIC_CHAIN_ID` | EVM | Deployed `VERA.sol` address + explorer mapping |
| `HISAAB_RPC_URL` | Solana | Default devnet |
| `HISAAB_ORACLE_KEYPAIR` / `HISAAB_FUNDER_KEYPAIR` | Solana | JSON keypair arrays (`npm run solana:setup`) — oracle releases, funder deposits |
| `HISAAB_CONTRACTOR_PUBKEY` | Solana | Repair contractor payout wallet |
| `NEXT_PUBLIC_HISAAB_PROGRAM_ID` | Solana | `AUH7tYQJ…VpxMw` |
| `SOL_INR_RATE` | Solana | Demo ₹→lamports conversion |

### Deploy / verify

```bash
# EVM
npx hardhat node                      # local chain (or docker compose hardhat-node)
npm run deploy:contract               # VERA.sol → writes contracts/deployed.json
npm run test:contracts                # 21 contract tests
npm run test:tampering                # hash-chain tamper detection suite

# Solana (build runs in WSL Ubuntu — see scripts/wsl-toolchain-setup.sh)
npm run solana:setup                  # keypairs + devnet airdrops + prints env lines
npm run build:hisaab                  # anchor build (dependency pins handled in-script)
npm run deploy:hisaab                 # solana program deploy → devnet
```

Explorers: Etherscan for Sepolia/Holesky; the built-in `/explorer/tx/[hash]` for local EVM; `explorer.solana.com/?cluster=devnet` for Hisaab (addresses + every tx linked from the report page).

---

## 7. Security Principles

1. **Zero client-side key exposure** — all signatures happen server-side (EVM relayer wallet, Solana oracle/funder keypairs from env).
2. **Deterministic identifiers** — UUID↔`bytes32` (`ethers.id`) and UUID↔`seed16` keep DB and chain addresses 1:1 reproducible.
3. **Real receipts only** — hashes are stored only from confirmed `tx.wait(1)` / RPC-confirmed signatures; degradation is always explicit.
4. **Least-privilege roles on-chain** — EVM: signer-scoped approvals + `onlyAdmin` relayer; Solana: oracle-only release, contractor-pinned payouts, funder-oracle refunds.
5. **Reentrancy guards** — `nonReentrant` on `donate`, `releaseFunds`, `refund`.
6. **Reconciliation over trust** — the integrity checker re-reads the chain and flags any divergence between what Postgres claims and what the chain shows.
