import { Address } from '@btc-vision/transaction';
import { NETWORK } from '../config/network';

// Cache for hex -> p2op conversions (expensive, so memoize)
const p2opCache = new Map<string, string>();

// Convert a raw 0x hex contract address to P2OP format for the opnet SDK
export function hexToP2OP(hex: string): string {
  const cached = p2opCache.get(hex);
  if (cached) return cached;

  const addr = Address.fromString(hex);
  const p2op = addr.p2op(NETWORK);
  p2opCache.set(hex, p2op);
  return p2op;
}
