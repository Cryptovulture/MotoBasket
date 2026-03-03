// AMM math — MotoSwap 0.5% fee (995/1000)

const FEE_NUM = 995n;
const FEE_DEN = 1000n;

// Calculate output amount for a swap
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * FEE_NUM;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * FEE_DEN + amountInWithFee;
  return numerator / denominator;
}

// Calculate input amount needed for a desired output
export function getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  if (amountOut >= reserveOut) return 0n; // impossible
  const numerator = reserveIn * amountOut * FEE_DEN;
  const denominator = (reserveOut - amountOut) * FEE_NUM;
  return numerator / denominator + 1n;
}

// Spot price of tokenA in terms of tokenB (as a float for display)
export function spotPrice(reserveA: bigint, reserveB: bigint): number {
  if (reserveA <= 0n || reserveB <= 0n) return 0;
  return Number(reserveB) / Number(reserveA);
}

// Price impact of a swap (percentage, 0-100)
export function priceImpact(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 0;
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
  const idealOut = (amountIn * reserveOut) / reserveIn;
  if (idealOut <= 0n) return 0;
  return Number((idealOut - amountOut) * 10000n / idealOut) / 100;
}
