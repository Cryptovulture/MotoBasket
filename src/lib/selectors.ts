// Pre-computed SHA256 selectors — verified from contract compiler output.
// Format: SHA256("methodName(type1,type2,...)")[:4] in hex (no 0x prefix).

export const SEL = {
  // ── OP20 standard ─────────────────────────────────────────────────────
  transfer: '3b88ef57',
  transferFrom: '4b6685e7',
  balanceOf: '5b46f8f6',
  increaseAllowance: '8d645723',
  allowance: 'd864b7ca',
  totalSupply: 'a368022e',

  // ── MotoSwap pair ─────────────────────────────────────────────────────
  getReserves: '06374bfc',
  token0: 'ddf25259',

  // ── MotoSwap factory ──────────────────────────────────────────────────
  getPool: '1a7ba6f7',

  // ── IndexToken read methods (from compiler output) ────────────────────
  getComponentCount: '9d33844c',
  getComponent: 'b0749109',
  getHolding: '69b8232d',
  getCurator: 'de18c822',
  getLastRebalanceBlock: '62d0d079',
  getMinInvestment: '2ae8acc1',
  getOwner: '39d26091',
  getMotoAddress: 'f75a1678',

  // ── IndexToken write methods (from compiler output) ───────────────────
  invest: '98d5e086',
  redeem: '6e6437ba',
  rebalance: '2919f8cd',
  updateWeights: '4dc860ea',
  updatePair: 'c02bac38',
  setMinInvestment: 'fe24d94f',
} as const;
