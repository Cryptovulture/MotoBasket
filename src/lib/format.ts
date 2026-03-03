// Formatting utilities for token amounts, numbers, and display

const DECIMALS_18 = 10n ** 18n;

// Format a bigint token amount (18 decimals) to a display string
export function formatTokenAmount(amount: bigint, decimals: number = 18, precision: number = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;

  if (frac === 0n) return whole.toLocaleString();

  const fracStr = frac.toString().padStart(decimals, '0').slice(0, precision);
  // Trim trailing zeros
  const trimmed = fracStr.replace(/0+$/, '');
  if (!trimmed) return whole.toLocaleString();
  return `${whole.toLocaleString()}.${trimmed}`;
}

// Parse a user-entered string to bigint (18 decimals)
export function parseTokenInput(input: string, decimals: number = 18): bigint {
  const cleaned = input.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '.') return 0n;

  const parts = cleaned.split('.');
  const whole = BigInt(parts[0] || '0');
  let frac = 0n;
  if (parts[1]) {
    const fracStr = parts[1].slice(0, decimals).padEnd(decimals, '0');
    frac = BigInt(fracStr);
  }
  return whole * 10n ** BigInt(decimals) + frac;
}

// Format a number with compact notation (1.2K, 3.4M, etc.)
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 2 : 0);
}

// Format basis points as percentage (2500 -> "25%")
export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

// Bigint to float (for display math only, not for on-chain)
export function toFloat(amount: bigint, decimals: number = 18): number {
  return Number(amount) / Number(10n ** BigInt(decimals));
}

// Float to bigint
export function toBigInt(amount: number, decimals: number = 18): bigint {
  return BigInt(Math.floor(amount * Number(10n ** BigInt(decimals))));
}

// Shorten an address for display
export function shortenAddress(addr: string, chars: number = 6): string {
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}
