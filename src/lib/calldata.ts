// Encode/decode helpers for raw btc_call RPC calldata.
// All values are big-endian, no byte reversal.

export function selectorToBytes(sel: string): string {
  return sel; // already hex, no 0x prefix needed for concat
}

// Encode a u256 as 64 hex chars (32 bytes, zero-padded left)
export function encodeU256(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

// Encode an address (32 bytes hex, with or without 0x prefix)
export function encodeAddress(addr: string): string {
  const clean = addr.startsWith('0x') ? addr.slice(2) : addr;
  return clean.padStart(64, '0');
}

// Build calldata: selector + params
export function buildCalldata(selector: string, ...params: string[]): string {
  return selector + params.join('');
}

// Decode a u256 from hex response (32 bytes = 64 chars)
export function decodeU256(hex: string, offset: number = 0): bigint {
  const start = offset * 2;
  const chunk = hex.slice(start, start + 64);
  if (!chunk || chunk.length < 64) return 0n;
  return BigInt('0x' + chunk);
}

// Decode an address from hex response (32 bytes, raw hex, no reversal)
export function decodeAddress(hex: string, offset: number = 0): string {
  const start = offset * 2;
  const chunk = hex.slice(start, start + 64);
  return '0x' + chunk;
}

// Strip 0x prefix if present
export function strip0x(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}
