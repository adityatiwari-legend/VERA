# Deploying VERA + Hisaab on an Ubuntu VPS

Target: any Ubuntu 22.04/24.04 VPS (DigitalOcean / Vultr — the sponsor tracks).
Everything in this stack is Linux-native; the Hisaab Anchor program built in
WSL here is byte-identical to what a VPS build produces.

## 0. Prerequisites on the VPS

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER   # re-login after
```

No Solana validator is needed — Hisaab runs against **Solana devnet**. The EVM
side runs a local **Hardhat node** container (chainId 31337), same as local dev.

## 1. Clone + configure

```bash
git clone <your-repo> vera && cd vera
cp .env.example .env
```

Fill in `.env`:

| Key | How to get it |
|---|---|
| `DATABASE_URL` | Leave the compose default (`vera-db` service) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `TIGER_DATABASE_URL` | Tiger Data Cloud free service → connection string |
| `HISAAB_*` keypairs | Generate on the VPS: `npm install && npm run solana:setup`, paste the printed lines |
| `NEXT_PUBLIC_HISAAB_PROGRAM_ID` | Printed by solana-setup / committed in Anchor.toml |

## 2. Start the stack

```bash
docker compose up -d --build
docker compose exec web npm run db:migrate
# create the first ADMIN (the database starts empty — no demo data):
docker compose exec \
  -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... web npm run admin:bootstrap
```

Services: `web` (Next.js, port 3000), `vera-db` (Postgres 16, internal),
`hardhat-node` (local EVM at 8545).

## 3. Solana program (one-time, devnet)

Two options:

**A. Ship the artifact** (recommended): the repo carries
`contracts/hisaab/target/deploy/hisaab.so` and `hisaab-keypair.json`, so:

```bash
sudo apt install -y solana-cli   # or the Agave release tarball
solana-keygen new --no-bip39-passphrase -o /root/.config/solana/id.json
solana config set --url https://api.devnet.solana.com
solana airdrop 2   # retry a few times, or use the web faucet
cd contracts/hisaab && solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so
```

**B. Build on the VPS**: install Rust + Anchor 0.30.1 (`avm install 0.30.1`) and
run `bash scripts/hisaab-build.sh --deploy` (same script used locally in WSL).

Paste the printed program id into `.env` (`NEXT_PUBLIC_HISAAB_PROGRAM_ID`) and
restart the web container.

## 4. Contracts (EVM, one-time while hardhat-node is up)

```bash
docker compose exec web npx hardhat run scripts/deploy.js --network localhost
```

Paste `CONTRACT_ADDRESS` from `contracts/deployed.json` into `.env` if it
changed, and restart `web`.

## 5. Time-series (Tiger Data)

```bash
docker compose exec web npm run tiger:setup
```

Confirms the `roughness_readings` / `agent_outcomes` hypertables. If the cloud
service is unreachable the app transparently falls back to local Postgres
tables and `/api/health` reports `tiger_data: false`.

## 6. Verify

```bash
curl localhost:3000/api/health   # all integrations should read true
```

Then open:
- `/hisaab` — public street register (map)
- `/register` — create your organization, contractor and citizen accounts

## Demo-day note

Devnet SOL faucets are rate-limited. Run `npm run solana:setup` the night
before; the oracle/funder/contractor keypairs persist in
`contracts/hisaab/keys/` (gitignored). If a faucet fails mid-demo, every
Hisaab feature still works with PG-ledger state — `/api/health` and the
status chips on `/hisaab` honestly show what's on-chain vs ledger-only.
