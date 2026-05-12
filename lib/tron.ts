// TRC-20 USDT helpers for CaribPredict Phase 2.
// - Read operations: plain TronGrid REST (no SDK needed)
// - Write operations: TronWeb signed with the master hot-wallet private key
//
// All amounts are stored as integer cents of USDT (1 USDT = 100 cents)
// for safe integer math. On-chain USDT has 6 decimals, so 1 USDT = 1_000_000
// sun-equivalent units; conversion helpers live below.

const TRONGRID_HOST = process.env.TRONGRID_HOST || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || '';
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const HOT_WALLET_ADDRESS = process.env.TRON_HOT_WALLET_ADDRESS || '';
const HOT_WALLET_KEY = process.env.TRON_HOT_WALLET_PRIVATE_KEY || '';

// USDT TRC-20 has 6 decimals on-chain. We display in cents (2 decimals).
const USDT_DECIMALS = 6;
const ONCHAIN_PER_CENT = 10 ** (USDT_DECIMALS - 2); // 1 cent = 10000 onchain units

export function centsToOnchain(cents: number): string {
  return (BigInt(Math.round(cents)) * BigInt(ONCHAIN_PER_CENT)).toString();
}
export function onchainToCents(onchain: string | number): number {
  const big = BigInt(onchain);
  return Number(big / BigInt(ONCHAIN_PER_CENT));
}
export function centsToUsdtFloat(cents: number): number {
  return cents / 100;
}

export function isValidTronAddress(addr: string): boolean {
  if (typeof addr !== 'string') return false;
  if (!addr.startsWith('T')) return false;
  if (addr.length !== 34) return false;
  // base58check rough validation; full validation happens at TronGrid call time
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
}

export interface TronTransferEvent {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountCents: number;
  blockTimestamp: number;     // ms epoch
  confirmed: boolean;
}

interface TrongridFetchInit extends RequestInit { timeoutMs?: number }

async function trongrid(path: string, init: TrongridFetchInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  if (TRONGRID_API_KEY) headers['TRON-PRO-API-KEY'] = TRONGRID_API_KEY;
  const ctrl = new AbortController();
  const timeoutMs = init.timeoutMs ?? 15000;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${TRONGRID_HOST}${path}`, { ...init, headers, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Recent USDT TRC-20 transfers to `address`. Polls TronGrid's events endpoint.
 * `minBlockTimestamp` is in ms epoch; pass last-seen timestamp to incrementally poll.
 */
export async function getRecentUsdtTransfersTo(
  address: string,
  minBlockTimestamp: number = Date.now() - 6 * 60 * 60 * 1000, // default last 6 hours
  limit: number = 50,
): Promise<TronTransferEvent[]> {
  if (!HOT_WALLET_ADDRESS && !address) {
    throw new Error('No Tron address configured');
  }
  const target = address || HOT_WALLET_ADDRESS;
  // TronGrid TRC20 transfer history for an account.
  // https://developers.tron.network/reference/account-trc20-tx
  const params = new URLSearchParams({
    only_to: 'true',
    contract_address: USDT_CONTRACT,
    min_timestamp: String(minBlockTimestamp),
    limit: String(Math.min(200, limit)),
  });
  const res = await trongrid(`/v1/accounts/${target}/transactions/trc20?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TronGrid TRC20 fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const rows: any[] = json.data || [];
  return rows.map((r): TronTransferEvent => ({
    txHash: r.transaction_id,
    fromAddress: r.from,
    toAddress: r.to,
    amountCents: onchainToCents(r.value),
    blockTimestamp: r.block_timestamp,
    confirmed: !!r.confirmed,
  }));
}

/**
 * Send USDT from the master hot wallet to `toAddress`. Requires the private key
 * env var to be set. Returns the broadcasted transaction hash.
 */
export async function sendUsdtFromHotWallet(toAddress: string, amountCents: number): Promise<string> {
  if (!HOT_WALLET_ADDRESS) throw new Error('TRON_HOT_WALLET_ADDRESS env var is not set');
  if (!HOT_WALLET_KEY) throw new Error('TRON_HOT_WALLET_PRIVATE_KEY env var is not set');
  if (!isValidTronAddress(toAddress)) throw new Error('Invalid destination address');
  if (amountCents <= 0) throw new Error('Amount must be positive');

  // Dynamic import keeps tronweb out of the static client bundle.
  // tronweb has CJS exports that vary by version.
  const TronWeb: any = (await import('tronweb')).default || (await import('tronweb'));
  const tronWeb = new TronWeb({
    fullHost: TRONGRID_HOST,
    headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : undefined,
    privateKey: HOT_WALLET_KEY,
  });

  const contract = await tronWeb.contract().at(USDT_CONTRACT);
  const onchain = centsToOnchain(amountCents);
  const tx = await contract.transfer(toAddress, onchain).send({
    feeLimit: 100_000_000, // 100 TRX cap
    callValue: 0,
    shouldPollResponse: false,
  });
  if (typeof tx !== 'string') throw new Error('Unexpected send response');
  return tx; // tx hash
}

export const TronEnv = {
  host: TRONGRID_HOST,
  contract: USDT_CONTRACT,
  hotWalletAddress: HOT_WALLET_ADDRESS,
  hasPrivateKey: !!HOT_WALLET_KEY,
  hasApiKey: !!TRONGRID_API_KEY,
};
