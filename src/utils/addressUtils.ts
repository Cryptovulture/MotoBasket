/**
 * Convert a 0x-prefixed hex contract address to a P2OP bech32m string.
 * getContract() from opnet SDK validates addresses as P2OP or P2PK —
 * raw hex strings cause "Cannot use 'in' operator" errors downstream.
 *
 * Address.fromString() sets the ML-DSA hash (which is our contract address).
 * p2op() only needs the ML-DSA hash (hash160 + witness v16 bech32m),
 * NOT the legacy public key.
 */
import { Address } from '@btc-vision/transaction';
import { NETWORK } from '../config/contracts';

const p2opCache = new Map<string, string>();

export function hexToP2OP(hexAddress: string): string {
  if (!hexAddress) return '';
  const cached = p2opCache.get(hexAddress);
  if (cached) return cached;
  const addr = Address.fromString(hexAddress);
  const p2op = addr.p2op(NETWORK);
  p2opCache.set(hexAddress, p2op);
  return p2op;
}
