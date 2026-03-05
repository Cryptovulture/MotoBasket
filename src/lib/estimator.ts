// Estimate invest/redeem outputs for preview display

const DECIMALS = 10n ** 18n;

// Estimate shares received for investing MOTO
export function estimateSharesOut(
  motoAmount: bigint,
  totalSupply: bigint,
  totalMotoValue: bigint,
): bigint {
  if (totalSupply === 0n || totalMotoValue === 0n) {
    // First investor — 1:1 minus fee
    return (motoAmount * 995n) / 1000n;
  }
  // shares = motoAmount * totalSupply / totalMotoValue (pre-fee)
  const grossShares = (motoAmount * totalSupply) / totalMotoValue;
  // 0.5% invest fee
  return (grossShares * 995n) / 1000n;
}

// Estimate MOTO returned for redeeming shares
export function estimateMotoOut(
  shareAmount: bigint,
  totalSupply: bigint,
  totalMotoValue: bigint,
): bigint {
  if (totalSupply === 0n) return 0n;
  // moto = shareAmount * totalMotoValue / totalSupply
  const grossMoto = (shareAmount * totalMotoValue) / totalSupply;
  // 0.5% redeem fee
  return (grossMoto * 995n) / 1000n;
}

// Price impact as percentage (0-100)
export function investPriceImpact(
  motoAmount: bigint,
  totalMotoValue: bigint,
): number {
  if (totalMotoValue <= 0n) return 0;
  return Number((motoAmount * 10000n) / totalMotoValue) / 100;
}
