/**
 * Price layer for all index tokens.
 *
 * On mainnet: replace with MotoSwap pool reserve queries.
 * Price = reserve1 / reserve0 from Factory.getPool() -> Pool.getReserves()
 */

/** True on testnet where prices are simulated, false on mainnet with live feeds. */
export const PRICES_ARE_SIMULATED = true;

// Symbol -> USD price
const SYMBOL_PRICES: Record<string, number> = {
  // Base
  MOTO: 1.85,

  // On-chain tokens (live baskets)
  NEBL: 0.0185,
  CPHR: 0.0185,
  VRTX: 0.0185,

  // AI Sector
  NRNA: 0.42,
  SYNP: 0.31,
  CRTX: 0.27,
  DPLR: 0.18,

  // Meme Sector
  PEEP: 0.0067,
  DGEN: 0.0043,
  BONQ: 0.0031,
  SHBA: 0.0019,

  // DeFi Sector
  LNDB: 0.74,
  YLDP: 0.53,
  SWPX: 0.38,

  // Food Sector
  MNGO: 0.12,
  APPL: 0.15,
  AVDO: 0.09,
  BERY: 0.11,
};

// Token decimals by symbol
const SYMBOL_DECIMALS: Record<string, number> = {
  MOTO: 18,
  NEBL: 18,
  CPHR: 18,
  VRTX: 18,
  NRNA: 18,
  SYNP: 18,
  CRTX: 18,
  DPLR: 18,
  PEEP: 18,
  DGEN: 18,
  BONQ: 18,
  SHBA: 18,
  LNDB: 18,
  YLDP: 18,
  SWPX: 18,
  MNGO: 18,
  APPL: 18,
  AVDO: 18,
  BERY: 18,
};

export function getSymbolPriceUSD(symbol: string): number {
  return SYMBOL_PRICES[symbol] ?? 0;
}

export function getSymbolDecimals(symbol: string): number {
  return SYMBOL_DECIMALS[symbol] ?? 18;
}

/** Convert a raw bigint token amount to USD using mock prices. */
export function tokenToUSD(rawAmount: bigint, symbol: string): number {
  const decimals = getSymbolDecimals(symbol);
  const human = Number(rawAmount) / 10 ** decimals;
  return human * getSymbolPriceUSD(symbol);
}

/** Format USD value for display. */
export function formatUSD(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd > 0) return `$${usd.toFixed(4)}`;
  return '$0.00';
}
