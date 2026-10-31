import io

# --- report page: honest localnet badge + in-app chain state panel ---
p = 'app/hisaab/report/[id]/page.tsx'
with io.open(p, encoding='utf-8') as f:
    src = f.read()

old = '''          {report.solana_report_pda && (
            <a
              href={explorerAccountUrl(report.solana_report_pda)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-mute shadow-card transition hover:border-line-strong hover:text-ink"
              title={cluster === 'localnet' ? 'Opens the Solana Explorer pointed at your local validator' : 'View on Solana Explorer'}
            >
              {cluster === 'localnet' ? 'On-chain (localnet)' : 'On-chain'} <ArrowUpRight className="h-3 w-3" />
            </a>
          )}'''
new = '''          {report.solana_report_pda && cluster !== 'localnet' && (
            <a
              href={explorerAccountUrl(report.solana_report_pda) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-mute shadow-card transition hover:border-line-strong hover:text-ink"
            >
              On-chain <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {report.solana_report_pda && cluster === 'localnet' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-[11px] text-mute"
              title="Anchored on your local validator — see the live chain state panel below"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> On-chain &middot; localnet
            </span>
          )}'''
assert old in src, 'on-chain button'
src = src.replace(old, new, 1)

old2 = '''  const [roughness, roughnessLive, auditRes] = await Promise.all([
    getRoughnessReadings(params.id),
    getRoughnessSummary(params.id),'''
new2 = '''  const onChainReport = await fetchReportOnChain(params.id);
  const onChainEscrow = await fetchEscrowState(params.id);
  const [roughness, roughnessLive, auditRes] = await Promise.all([
    getRoughnessReadings(params.id),
    getRoughnessSummary(params.id),'''
assert old2 in src, 'fetch block'
src = src.replace(old2, new2, 1)

old3 = "import { getPotholeReport, getRoughnessSummary, listAssignments, listContractors, listFundRequests } from '@/lib/hisaab';"
new3 = """import { getPotholeReport, getRoughnessSummary, listAssignments, listContractors, listFundRequests } from '@/lib/hisaab';
import { fetchReportOnChain, fetchEscrowState, lamportsToInr } from '@/lib/solana';"""
assert old3 in src, 'imports'
src = src.replace(old3, new3, 1)

old4 = '          {roughness.rows.length > 0 && ('
new4 = '''          {onChainReport && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
                  <Link2 className="h-4 w-4 text-accent" /> Live chain state
                </p>
                <span className="font-mono text-[11px] text-faint">
                  {cluster === 'localnet' ? 'read from your local validator' : 'read from chain'}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-faint">
                report PDA {report.solana_report_pda?.slice(0, 16)}&hellip; &middot; decoded live from the Solana program &mdash;
                this is what auditors verify, not a database copy
              </p>
              <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Status</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {['OPEN', 'CONFIRMED', 'ESCALATED', 'PAID'][onChainReport.status] ?? onChainReport.status}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Confirmations</p>
                  <p className="mt-0.5 font-medium text-ink">{String(onChainReport.confirmations)}/3</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Severity</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {['LOW', 'MEDIUM', 'HIGH'][onChainReport.severity] ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Coordinates</p>
                  <p className="mt-0.5 font-mono text-xs text-mute">
                    {(Number(onChainReport.latMicro) / 1e6).toFixed(4)}, {(Number(onChainReport.lngMicro) / 1e6).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Media hash</p>
                  <p className="mt-0.5 font-mono text-xs text-mute">
                    {Buffer.from(onChainReport.mediaHash ?? []).toString('hex').slice(0, 16)}&hellip;
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Anchored at</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {new Date(Number(onChainReport.createdAt) * 1000).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {onChainEscrow && (
                <div className="mt-4 rounded-xl border border-line bg-mist p-4">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
                    Escrow account
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Released</p>
                      <p className="mt-0.5 font-medium text-ink">{String(onChainEscrow.releasedStage)}/3 stages</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Stage amounts</p>
                      <p className="mt-0.5 font-medium text-ink">
                        {onChainEscrow.stageAmounts.map((l: bigint) => `₹${lamportsToInr(l).toLocaleString('en-IN')}`).join(' / ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Hold until</p>
                      <p className="mt-0.5 text-xs text-mute">
                        {onChainEscrow.holdUntil ? new Date(Number(onChainEscrow.holdUntil) * 1000).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Contractor</p>
                      <p className="mt-0.5 font-mono text-xs text-mute">
                        {String(onChainEscrow.contractor).slice(0, 8)}…{String(onChainEscrow.contractor).slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {roughness.rows.length > 0 && ('''
assert old4 in src, 'chain state card'
src = src.replace(old4, new4, 1)

old5 = "import { Sparkles, ArrowUpRight, ScrollText, ShieldCheck } from 'lucide-react';"
new5 = "import { Sparkles, ArrowUpRight, ScrollText, ShieldCheck, Link2 } from 'lucide-react';"
assert old5 in src, 'icon import'
src = src.replace(old5, new5, 1)
with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('report page: chain state panel + honest localnet badge')

# --- hisaab index page: guard null explorer url ---
p2 = 'app/hisaab/page.tsx'
with io.open(p2, encoding='utf-8') as f:
    src2 = f.read()
old6 = '                  href={explorerAccountUrl(solana.programId)}'
new6 = '                  href={explorerAccountUrl(solana.programId) ?? "#"}'
assert old6 in src2, 'hisaab index link'
src2 = src2.replace(old6, new6, 1)
with io.open(p2, 'w', encoding='utf-8', newline='') as f:
    f.write(src2)
print('hisaab index guarded')

# --- AdminFundPanel: localnet -> inline text instead of dead link ---
p3 = 'components/hisaab/AdminFundPanel.tsx'
with io.open(p3, encoding='utf-8') as f:
    src3 = f.read()
old7 = '''          {escrow.solana_tx_hash && (
            <a
              href={explorerTxUrlFor('http://localhost:8899', escrow.solana_tx_hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-300 hover:text-blue-200"
            >
              {cluster === 'localnet' ? 'Explorer (localnet)' : 'Explorer'}{' '}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}'''
new7 = '''          {escrow.solana_tx_hash && explorerTxUrlFor('http://localhost:8899', escrow.solana_tx_hash) && (
            <a
              href={explorerTxUrlFor('http://localhost:8899', escrow.solana_tx_hash) as string}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-300 hover:text-blue-200"
            >
              Explorer <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {escrow.solana_tx_hash && !explorerTxUrlFor('http://localhost:8899', escrow.solana_tx_hash) && (
            <span className="font-mono text-night-dim">tx {escrow.solana_tx_hash.slice(0, 10)}… · localnet</span>
          )}'''
assert old7 in src3, 'adminfundpanel link'
src3 = src3.replace(old7, new7, 1)
with io.open(p3, 'w', encoding='utf-8', newline='') as f:
    f.write(src3)
print('AdminFundPanel localnet inline text')
