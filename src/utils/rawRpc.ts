/**
 * Raw RPC utility — bypasses the opnet SDK to call the ExpertIndex contract
 * directly via fetch(). This avoids any browser-specific SDK issues.
 */

import { RPC_URL, EXPERT_INDEX_ADDRESS, BASKET_TOKEN_ADDRESS, MOTO_TOKEN_ADDRESS, MOTOSWAP_ROUTER_ADDRESS } from '../config/contracts';

const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;

// Pre-computed SHA256-based selectors (OPNet uses SHA256, NOT keccak256)
const SEL = {
  getStats: 'add8852a',
  getBasketInfo: '722ba4e7',
  getBasketName: 'c60aab24',
  getBasketNAV: '7d6bd3b4',
  getComponent: '05584029',
  getInvestorPosition: 'b3c9bc4c',
} as const;

// OP20 selectors (lowercase types: SHA256("methodName(type,...)")[:4])
const OP20_SEL = {
  balanceOf: '5b46f8f6',
  allowance: 'd864b7ca', // SHA256("allowance(address,address)")[:4]
} as const;

// MotoSwap Router selectors
const ROUTER_SEL = {
  getAmountsOut: 'a8e365fa', // SHA256("getAmountsOut(uint256,address[])")[:4]
} as const;

/** Encode a bigint as a 32-byte big-endian hex string */
function encodeU256(val: bigint): string {
  return val.toString(16).padStart(64, '0');
}

/** Make a raw JSON-RPC call to the OPNet testnet node */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}`);
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

/** Safely read a u256 — returns 0n if buffer is too short */
function safeReadU256(buf: Uint8Array, offset: number): bigint {
  if (buf.length < offset + 32) return 0n;
  let hex = '';
  for (let i = 0; i < 32; i++) {
    hex += buf[offset + i].toString(16).padStart(2, '0');
  }
  return BigInt('0x' + hex);
}

/** Call a contract method and return the raw result bytes */
async function contractCall(calldata: string, contractAddress: string = EXPERT_INDEX_ADDRESS): Promise<Uint8Array> {
  // btc_call params: [contractAddress, calldataHex, from?, fromLegacy?, height?]
  const result = await rpcCall('btc_call', [contractAddress, calldata]) as {
    result?: string;
    revert?: string;
    error?: { message: string };
  };

  if (result.revert) throw new Error(`Reverted: ${result.revert}`);
  if (result.error) throw new Error(result.error.message);
  if (!result.result) throw new Error('No result from contract call');

  // Result is base64-encoded
  const binary = atob(result.result);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}

/**
 * OPNet stores addresses as u256 using little-endian u256.fromBytes().
 * When read as a bigint, the bytes are reversed vs the canonical hex.
 * This function reverses the byte order to match TOKEN_META addresses.
 */
export function u256ToAddress(val: bigint): string {
  const hex = val.toString(16).padStart(64, '0');
  // Reverse bytes: take pairs of hex chars and reverse the array
  const bytes: string[] = [];
  for (let i = 0; i < 64; i += 2) {
    bytes.push(hex.slice(i, i + 2));
  }
  return '0x' + bytes.reverse().join('');
}

// ── Public API ──────────────────────────────────────────────────────

export interface RawBasket {
  basketId: bigint;
  name: string;
  creator: bigint;
  compCount: bigint;
  totalShares: bigint;
  totalMoto: bigint;
  perfFeeBps: bigint;
  createdAt: bigint;
  lockState: bigint;
  active: bigint;
  investorCount: bigint;
  shareToken: bigint;
  nav: bigint;
}

export interface RawStats {
  nextBasketId: bigint;
  platformFeeBps: bigint;
}

export interface RawComponent {
  token: bigint;
  weight: bigint;
  holding: bigint;
}

export async function fetchStats(): Promise<RawStats> {
  const buf = await contractCall(SEL.getStats);
  return {
    nextBasketId: safeReadU256(buf, 0),
    platformFeeBps: safeReadU256(buf, 32),
  };
}

export async function fetchBasketInfo(basketId: bigint): Promise<{
  creator: bigint;
  compCount: bigint;
  totalShares: bigint;
  totalMoto: bigint;
  perfFeeBps: bigint;
  createdAt: bigint;
  lockState: bigint;
  active: bigint;
  investorCount: bigint;
  shareToken: bigint;
}> {
  const buf = await contractCall(SEL.getBasketInfo + encodeU256(basketId));
  return {
    creator: safeReadU256(buf, 0),
    compCount: safeReadU256(buf, 32),
    totalShares: safeReadU256(buf, 64),
    totalMoto: safeReadU256(buf, 96),
    perfFeeBps: safeReadU256(buf, 128),
    createdAt: safeReadU256(buf, 160),
    lockState: safeReadU256(buf, 192),
    active: safeReadU256(buf, 224),
    investorCount: safeReadU256(buf, 256),
    shareToken: safeReadU256(buf, 288),
  };
}

export async function fetchBasketName(basketId: bigint): Promise<string> {
  try {
    const buf = await contractCall(SEL.getBasketName + encodeU256(basketId));
    if (buf.length < 96) return 'Unnamed';
    const word1 = safeReadU256(buf, 0);
    const word2 = safeReadU256(buf, 32);
    const nameLen = Number(safeReadU256(buf, 64));

    if (nameLen === 0 || nameLen > 64) return 'Unnamed';

    const bytes = new Uint8Array(64);
    for (let i = 0; i < 32; i++) {
      bytes[i] = Number((word1 >> BigInt(i * 8)) & 0xFFn);
    }
    for (let i = 0; i < 32; i++) {
      bytes[32 + i] = Number((word2 >> BigInt(i * 8)) & 0xFFn);
    }
    return new TextDecoder().decode(bytes.slice(0, nameLen));
  } catch {
    return 'Unnamed';
  }
}

export async function fetchBasketNAV(basketId: bigint): Promise<bigint> {
  try {
    const buf = await contractCall(SEL.getBasketNAV + encodeU256(basketId));
    return safeReadU256(buf, 0);
  } catch {
    return 0n;
  }
}

export async function fetchComponent(basketId: bigint, index: bigint): Promise<RawComponent> {
  const buf = await contractCall(
    SEL.getComponent + encodeU256(basketId) + encodeU256(index),
  );
  return {
    token: safeReadU256(buf, 0),
    weight: safeReadU256(buf, 32),
    holding: safeReadU256(buf, 64),
  };
}

/**
 * Encode a canonical 0x-prefixed address as a calldata parameter.
 * The SDK's writeAddress() writes the raw Address bytes (SHA256 hash) in order.
 * No byte reversal — the AS runtime's readAddress() reads raw bytes and creates
 * the Address directly. (Reversal is only needed when decoding u256-stored
 * addresses from contract RESPONSES, which u256ToAddress handles.)
 */
function encodeAddressParam(address: string): string {
  return address.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

export interface RawInvestorPosition {
  shares: bigint;
  costBasis: bigint;
}

/** Fetch OP20 token balance for an address */
export async function fetchBalanceOf(tokenAddress: string, ownerAddress: string): Promise<bigint> {
  try {
    const buf = await contractCall(
      OP20_SEL.balanceOf + encodeAddressParam(ownerAddress),
      tokenAddress,
    );
    return safeReadU256(buf, 0);
  } catch {
    return 0n;
  }
}

/** Fetch MOTO token balance for an address */
export async function fetchMotoBalance(ownerAddress: string): Promise<bigint> {
  return fetchBalanceOf(MOTO_TOKEN_ADDRESS, ownerAddress);
}

/** Fetch OP20 allowance: how much `spender` can spend of `owner`'s tokens */
export async function fetchAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<bigint> {
  try {
    const buf = await contractCall(
      OP20_SEL.allowance + encodeAddressParam(ownerAddress) + encodeAddressParam(spenderAddress),
      tokenAddress,
    );
    return safeReadU256(buf, 0);
  } catch {
    return 0n;
  }
}

/** Fetch investor position for a basket */
export async function fetchInvestorPosition(basketId: bigint, investorAddress: string): Promise<RawInvestorPosition> {
  try {
    const buf = await contractCall(
      SEL.getInvestorPosition + encodeU256(basketId) + encodeAddressParam(investorAddress),
    );
    return {
      shares: safeReadU256(buf, 0),
      costBasis: safeReadU256(buf, 32),
    };
  } catch {
    return { shares: 0n, costBasis: 0n };
  }
}

/**
 * Run a raw contract simulation and return the decoded revert message if any.
 * Returns null if the simulation succeeded (no revert).
 * This bypasses the opnet SDK's response parsing, which can throw buffer errors
 * instead of surfacing the actual revert reason.
 *
 * btc_call params: [contractAddress, calldata, from, fromLegacy, height, simulatedTransaction, accessList]
 */
export async function simulateAndGetRevert(
  contractAddress: string,
  calldata: string,
  from?: string,
  fromLegacy?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts?: { simulatedTransaction?: any; accessList?: any },
): Promise<string | null> {
  try {
    const params: unknown[] = [contractAddress, calldata];
    params.push(from ?? undefined);       // from
    params.push(fromLegacy ?? undefined);  // fromLegacy
    params.push(undefined);               // height
    params.push(opts?.simulatedTransaction ?? undefined);  // simulatedTransaction
    params.push(opts?.accessList ?? undefined);            // accessList

    const result = await rpcCall('btc_call', params) as {
      result?: string;
      revert?: string;
      error?: { message: string };
    };
    if (result.error) return result.error.message;
    if (result.revert) {
      try {
        const binary = atob(result.revert);
        const buf = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
        // OPNet revert format: 4-byte selector + 4-byte padding + UTF-8 message
        if (buf.length > 8) {
          const msgBytes = buf.slice(8);
          return new TextDecoder().decode(msgBytes);
        }
        return `Revert: ${result.revert}`;
      } catch {
        return `Revert: ${result.revert}`;
      }
    }
    // No revert — simulation succeeded (result may be small or empty, that's OK)
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}


/**
 * Encode a u16 value as a 2-byte big-endian hex string.
 * OPNet's binary encoding uses u16 BE for array lengths in calldata.
 */
function encodeU16BE(val: number): string {
  return ((val >> 8) & 0xFF).toString(16).padStart(2, '0') +
    (val & 0xFF).toString(16).padStart(2, '0');
}

/**
 * Check which component tokens have LP pools on MotoSwap.
 * Calls Router.getAmountsOut(1 MOTO, [MOTO, TOKEN]) for each token.
 * Returns the list of token addresses (canonical 0x hex) that do NOT have pools.
 */
export async function checkMissingPools(componentTokens: bigint[]): Promise<string[]> {
  if (!MOTOSWAP_ROUTER_ADDRESS) return [];
  const motoHex = MOTO_TOKEN_ADDRESS.replace(/^0x/, '').toLowerCase();
  const testAmount = encodeU256(1000000000000000000n); // 1 MOTO (10^18)
  // Array length is u16 BE (2 bytes), NOT u256 (32 bytes)
  const pathLen = encodeU16BE(2);

  const missing: string[] = [];
  for (const tokenU256 of componentTokens) {
    const tokenAddr = u256ToAddress(tokenU256);
    const tokenHex = tokenAddr.replace(/^0x/, '').toLowerCase();
    const calldata = ROUTER_SEL.getAmountsOut + testAmount + pathLen + motoHex + tokenHex;
    try {
      const result = await rpcCall('btc_call', [MOTOSWAP_ROUTER_ADDRESS, calldata]) as {
        result?: string;
        revert?: string;
      };
      if (result.revert) {
        missing.push(tokenAddr);
      }
    } catch {
      missing.push(tokenAddr);
    }
  }
  return missing;
}

// ── Transaction Receipt ──────────────────────────────────────────────

export interface TxReceipt {
  hash: string;
  gasUsed: bigint;
  events: unknown[];
  revert: string;
}

/**
 * Fetch a transaction receipt by hash.
 * Returns null if the TX hasn't been mined yet.
 */
export async function fetchTransactionReceipt(txHash: string): Promise<TxReceipt | null> {
  try {
    const result = await rpcCall('btc_getTransactionReceipt', [txHash]) as {
      receipt?: {
        gasUsed?: string;
        events?: unknown[];
        revert?: string;
      } | null;
      hash?: string;
      gasUsed?: string;
      events?: unknown[];
      revert?: string;
    } | null;

    if (!result) return null;

    // The RPC may return the receipt at the top level or nested
    const receipt = result.receipt ?? result;
    if (!receipt) return null;

    const gasHex = (receipt as { gasUsed?: string }).gasUsed ?? '0';
    const events = (receipt as { events?: unknown[] }).events ?? [];
    const revert = (receipt as { revert?: string }).revert ?? '';

    return {
      hash: txHash,
      gasUsed: BigInt(gasHex.startsWith('0x') ? gasHex : '0x' + gasHex),
      events,
      revert,
    };
  } catch {
    // TX not found or RPC error — treat as not yet mined
    return null;
  }
}

/** Fetch everything for all baskets */
export async function fetchAllBaskets(): Promise<{ stats: RawStats; baskets: RawBasket[] }> {
  const stats = await fetchStats();
  const baskets: RawBasket[] = [];

  for (let id = 1n; id < stats.nextBasketId; id++) {
    try {
      const [info, name, nav] = await Promise.all([
        fetchBasketInfo(id),
        fetchBasketName(id),
        fetchBasketNAV(id),
      ]);
      baskets.push({
        basketId: id,
        name,
        ...info,
        nav,
      });
    } catch (err) {
      console.error(`[rawRpc] Failed to fetch basket ${id}:`, err);
    }
  }

  return { stats, baskets };
}
