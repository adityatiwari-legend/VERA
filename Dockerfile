# Multi-stage Dockerfile for VERA Next.js Application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public

# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time.
# Passed via docker compose build.args (sourced from the .env file).
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_CHAIN_ID=31337
ARG NEXT_PUBLIC_HISAAB_PROGRAM_ID=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_HISAAB_PROGRAM_ID=$NEXT_PUBLIC_HISAAB_PROGRAM_ID
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

# Tools image: full source + all node_modules (incl. devDeps) for one-off
# tasks (migrations, seeds) run via `docker compose run --rm migrate`.
# No client build — DATABASE_URL is injected at runtime by compose.
FROM base AS tools
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Local EVM chain (hardhat node, chainId 31337) with the VERA contract deployed
# on boot. Deterministic: first hardhat account deploys first → the contract
# always lands at the same address for a given deploy script.
FROM base AS hardhat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY hardhat.config.ts ./
COPY contracts ./contracts
COPY scripts/deploy.js ./scripts/
COPY deploy/hardhat-entrypoint.sh ./entrypoint.sh
# normalize line endings (dev machines may check out CRLF) then make executable
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh
ENV BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
EXPOSE 8545
ENTRYPOINT ["sh", "./entrypoint.sh"]
