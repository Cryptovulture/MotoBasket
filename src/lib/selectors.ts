// Pre-computed SHA256 selectors — verified against contract compiler output + on-chain.
// Format: SHA256("methodName(type1,type2,...)")[:4] in hex (no 0x prefix).
// IMPORTANT: OPNet uses SHA256 selectors, NOT Ethereum keccak256.

export const SEL = {
  // ── OP20 standard ─────────────────────────────────────────────────────
  transfer: '3b88ef57',          // transfer(address,uint256)
  transferFrom: '4b6685e7',      // transferFrom(address,address,uint256)
  balanceOf: '5b46f8f6',         // balanceOf(address)
  increaseAllowance: '8d645723', // increaseAllowance(address,uint256)
  allowance: 'd864b7ca',         // allowance(address,address)
  totalSupply: 'a368022e',       // totalSupply()

  // ── MotoSwap pair ─────────────────────────────────────────────────────
  getReserves: '06374bfc',       // getReserves()
  token0: '3c1f365f',            // token0()  — SHA256, NOT keccak256
  token1: '7707e4c7',            // token1()

  // ── MotoSwap factory ──────────────────────────────────────────────────
  getPool: '00bdc06a',           // getPool(address,address)

  // ── IndexToken read methods (from compiler output) ────────────────────
  getComponentCount: '9d33844c', // getComponentCount()
  getComponent: 'b0749109',      // getComponent(uint256)
  getHolding: '69b8232d',        // getHolding(uint256)  — takes component INDEX, not address
  getCurator: 'de18c822',        // getCurator()
  getLastRebalanceBlock: '62d0d079', // getLastRebalanceBlock()
  getMinInvestment: '2ae8acc1',  // getMinInvestment()
  getOwner: '39d26091',          // getOwner()
  getMotoAddress: 'f75a1678',    // getMotoAddress()

  // ── IndexToken write methods (from compiler output) ───────────────────
  invest: '98d5e086',            // invest(uint256,uint256)
  redeem: '6e6437ba',            // redeem(uint256,uint256)
  rebalance: '2919f8cd',         // rebalance()
  updateWeights: '4dc860ea',     // updateWeights(uint256)  — reads weights manually from calldata
  updatePair: 'c02bac38',        // updatePair(uint256,address)
  setMinInvestment: 'fe24d94f',  // setMinInvestment(uint256)
} as const;
