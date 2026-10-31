/**
 * Client-safe Solana explorer helpers (NO server-only imports — this module
 * is imported by client components like AdminFundPanel).
 */

const LOCAL_RPC = /localhost|127\.0\.0\.1|::1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|:8899/;

export function getSolanaClusterFromRpc(rpcUrl: string): 'localnet' | 'devnet' | 'custom' {
  if (LOCAL_RPC.test(rpcUrl)) return 'localnet';
  if (rpcUrl.includes('devnet')) return 'devnet';
  if (rpcUrl.includes('mainnet')) return 'custom';
  return 'custom';
}

/**
 * Explorer links. On localnet the data lives in the machine's validator, so we
 * point the public Solana Explorer at the local RPC via cluster=custom — the
 * account/tx then renders exactly like devnet/mainnet instead of dead-ending
 * with "Account does not exist".
 */
/**
 * localnet returns null: the public explorer is an HTTPS page and cannot fetch
 * an HTTP localhost RPC (mixed content), so an out-link would always dead-end.
 * Localnet data is shown in-app via the chain-state panel instead.
 */
export function explorerAccountUrlFor(rpcUrl: string, address: string): string | null {
  const cluster = getSolanaClusterFromRpc(rpcUrl);
  if (cluster === 'localnet') return null;
  const suffix = cluster === 'devnet' ? '?cluster=devnet' : cluster === 'custom' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${suffix}`;
}

export function explorerTxUrlFor(rpcUrl: string, signature: string): string | null {
  const cluster = getSolanaClusterFromRpc(rpcUrl);
  if (cluster === 'localnet') return null;
  const suffix = cluster === 'devnet' ? '?cluster=devnet' : cluster === 'custom' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

// Server-side convenience wrappers that read the configured RPC URL.
// (Client components must use the *For(rpcUrl, ...) forms with a public value.)
export function getCluster(): 'localnet' | 'devnet' | 'custom' {
  return getSolanaClusterFromRpc(process.env.HISAAB_RPC_URL || 'https://api.devnet.solana.com');
}

export function explorerAccountUrl(address: string): string | null {
  return explorerAccountUrlFor(process.env.HISAAB_RPC_URL || 'https://api.devnet.solana.com', address);
}

export function explorerTxUrl(signature: string): string | null {
  return explorerTxUrlFor(process.env.HISAAB_RPC_URL || 'https://api.devnet.solana.com', signature);
}
