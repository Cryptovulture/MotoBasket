import { Address } from '@btc-vision/transaction';
import { NETWORK } from '../config/network';

// Cache for hex -> Address object conversions
const addrCache = new Map<string, Address>();
const p2opCache = new Map<string, string>();

// Convert a raw 0x hex contract address to an Address object (for SDK calls)
export function hexToAddress(hex: string): Address {
  const cached = addrCache.get(hex);
  if (cached) return cached;

  const addr = Address.fromString(hex);
  addrCache.set(hex, addr);
  return addr;
}

// Convert a raw 0x hex contract address to P2OP string (for display / getContract 1st param)
export function hexToP2OP(hex: string): string {
  const cached = p2opCache.get(hex);
  if (cached) return cached;

  const addr = hexToAddress(hex);
  const p2op = addr.p2op(NETWORK);
  p2opCache.set(hex, p2op);
  return p2op;
}
