/**
 * Raw RPC utility — calls IndexToken and OP20 contracts directly via fetch().
 * Bypasses the opnet SDK for read operations to avoid browser-specific issues.
 */

import { RPC_URL, MOTO_TOKEN_ADDRESS } from '../config/contracts';

const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;

// Pre-computed SHA256-based selectors (OPNet uses SHA256, NOT keccak256)
// These match the contract's @method selectors from the build output
const INDEX_SEL = {
  getComponentCount: '9d33844c',
  getComponent: 'b0749109',
  getHolding: '69b8232d',
} as const;

const OP20_SEL = {
  balanceOf: '5b46f8f6',
  allowance: 'd864b7ca',
  totalSupply: 'a368022e',
} as const;

const ROUTER_SEL = {
  getAmountsOut: 'a8e365fa',
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
async function contractCall(calldata: string, contractAddress: string): Promise<Uint8Array> {
  const result = await rpcCall('btc_call', [contractAddress, calldata]) as {
    result?: string;
    revert?: string;
    error?: { message: string };
  };

  if (result.revert) throw new Error(`Reverted: ${result.revert}`);
  if (result.error) throw new Error(result.error.message);
  if (!result.result) throw new Error('No result from contract call');

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
 */
export function u256ToAddress(val: bigint): string {
  const hex = val.toString(16).padStart(64, '0');
  const bytes: string[] = [];
  for (let i = 0; i < 64; i += 2) {
    bytes.push(hex.slice(i, i + 2));
  }
  return '0x' + bytes.reverse().join('');
}

/**
 * Encode a canonical 0x-prefixed address as a calldata parameter.
 * No byte reversal — the AS runtime reads raw bytes directly.
 */
function encodeAddressParam(address: string): string {
  return address.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

/**
 * Encode a u16 value as a 2-byte big-endian hex string.
 * OPNet uses u16 BE for array lengths in calldata.
 */
function encodeU16BE(val: number): string {
  return ((val >> 8) & 0xFF).toString(16).padStart(2, '0') +
    (val & 0xFF).toString(16).padStart(2, '0');
}

// ── IndexToken read operations ──────────────────────────────────────

/** Fetch component count for an IndexToken contract */
export async function fetchComponentCount(contractAddress: string): Promise<number> {
  try {
    const buf = await contractCall(INDEX_SEL.getComponentCount, contractAddress);
    return Number(safeReadU256(buf, 0));
  } catch {
    return 0;
  }
}

/** Fetch component (address + weight) at index for an IndexToken contract */
export async function fetchComponent(contractAddress: string, index: number): Promise<{
  tokenAddress: string;
  weight: bigint;
}> {
  const buf = await contractCall(
    INDEX_SEL.getComponent + encodeU256(BigInt(index)),
    contractAddress,
  );
  // First 32 bytes = address as u256 (needs byte reversal)
  const tokenU256 = safeReadU256(buf, 0);
  return {
    tokenAddress: u256ToAddress(tokenU256),
    weight: safeReadU256(buf, 32),
  };
}

/** Fetch contract's holding of component at index */
export async function fetchHolding(contractAddress: string, index: number): Promise<bigint> {
  try {
    const buf = await contractCall(
      INDEX_SEL.getHolding + encodeU256(BigInt(index)),
      contractAddress,
    );
    return safeReadU256(buf, 0);
  } catch {
    return 0n;
  }
}

// ── OP20 read operations ────────────────────────────────────────────

/** Fetch OP20 token balance */
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

/** Fetch MOTO balance */
export async function fetchMotoBalance(ownerAddress: string): Promise<bigint> {
  return fetchBalanceOf(MOTO_TOKEN_ADDRESS, ownerAddress);
}

/** Fetch OP20 allowance */
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

/** Fetch OP20 total supply */
export async function fetchTotalSupply(tokenAddress: string): Promise<bigint> {
  try {
    const buf = await contractCall(OP20_SEL.totalSupply, tokenAddress);
    return safeReadU256(buf, 0);
  } catch {
    return 0n;
  }
}

// ── Simulation ──────────────────────────────────────────────────────

/**
 * Pre-flight simulation — catch reverts BEFORE SDK call.
 * Returns null on success, error message on revert.
 */
export async function simulateAndGetRevert(
  contractAddress: string,
  calldata: string,
  from?: string,
  fromLegacy?: string,
): Promise<string | null> {
  try {
    const params: unknown[] = [contractAddress, calldata];
    params.push(from ?? undefined);
    params.push(fromLegacy ?? undefined);
    params.push(undefined); // height
    params.push(undefined); // simulatedTransaction
    params.push(undefined); // accessList

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
        if (buf.length > 8) {
          return new TextDecoder().decode(buf.slice(8));
        }
        return `Revert: ${result.revert}`;
      } catch {
        return `Revert: ${result.revert}`;
      }
    }
    if (result.result) {
      try {
        const resBinary = atob(result.result);
        if (resBinary.length <= 1) {
          return 'Contract execution crashed (VM abort). May need recompilation.';
        }
      } catch { /* ignore */ }
    }
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

// ── MotoSwap Router ─────────────────────────────────────────────────

/**
 * Check which tokens have LP pools on MotoSwap.
 * Returns addresses that do NOT have pools.
 */
export async function checkMissingPools(
  routerAddress: string,
  componentAddresses: string[],
): Promise<string[]> {
  if (!routerAddress) return [];
  const motoHex = MOTO_TOKEN_ADDRESS.replace(/^0x/, '').toLowerCase();
  const testAmount = encodeU256(1000000000000000000n);
  const pathLen = encodeU16BE(2);

  const missing: string[] = [];
  for (const addr of componentAddresses) {
    const tokenHex = addr.replace(/^0x/, '').toLowerCase();
    const calldata = ROUTER_SEL.getAmountsOut + testAmount + pathLen + motoHex + tokenHex;
    try {
      const result = await rpcCall('btc_call', [routerAddress, calldata]) as {
        result?: string;
        revert?: string;
      };
      if (result.revert) {
        missing.push(addr);
      }
    } catch {
      missing.push(addr);
    }
  }
  return missing;
}

// ── Transaction Receipt ─────────────────────────────────────────────

export interface TxReceipt {
  hash: string;
  gasUsed: bigint;
  events: unknown[];
  revert: string;
}

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
    return null;
  }
}
