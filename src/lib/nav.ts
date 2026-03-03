import { type IndexConfig } from '../config/indexes';
import { spotPrice } from './amm';

export interface ComponentData {
  address: string;
  weightBps: number;
  holding: bigint;        // contract's balance of this token
  reserveMoto: bigint;    // MOTO reserve in the pair
  reserveComp: bigint;    // component reserve in the pair
}

export interface IndexNAV {
  totalMotoValue: bigint;  // total value of all holdings in MOTO terms
  navPerShare: bigint;     // MOTO value per index token (18 decimals)
  components: ComponentNAV[];
}

export interface ComponentNAV {
  address: string;
  weightBps: number;
  actualWeightBps: number;  // current weight based on MOTO value
  holding: bigint;
  motoValue: bigint;
  driftBps: number;         // actualWeight - targetWeight (positive = overweight)
  pricePerToken: number;    // MOTO per component token (float for display)
}

// Calculate NAV for an index given on-chain data
export function calculateNAV(
  config: IndexConfig,
  components: ComponentData[],
  totalSupply: bigint,
): IndexNAV {
  // Calculate MOTO value of each component holding
  const componentNavs: ComponentNAV[] = [];
  let totalMotoValue = 0n;

  for (const comp of components) {
    let motoValue = 0n;
    if (comp.holding > 0n && comp.reserveComp > 0n && comp.reserveMoto > 0n) {
      motoValue = (comp.holding * comp.reserveMoto) / comp.reserveComp;
    }
    totalMotoValue += motoValue;

    componentNavs.push({
      address: comp.address,
      weightBps: comp.weightBps,
      actualWeightBps: 0, // computed below
      holding: comp.holding,
      motoValue,
      driftBps: 0,
      pricePerToken: spotPrice(comp.reserveComp, comp.reserveMoto),
    });
  }

  // Compute actual weights and drift
  for (const nav of componentNavs) {
    if (totalMotoValue > 0n) {
      nav.actualWeightBps = Number((nav.motoValue * 10000n) / totalMotoValue);
    }
    nav.driftBps = nav.actualWeightBps - nav.weightBps;
  }

  // NAV per share
  const navPerShare = totalSupply > 0n
    ? (totalMotoValue * (10n ** 18n)) / totalSupply
    : 0n;

  return {
    totalMotoValue,
    navPerShare,
    components: componentNavs,
  };
}

// Maximum absolute drift across all components (for rebalance indicator)
export function maxDrift(nav: IndexNAV): number {
  let max = 0;
  for (const c of nav.components) {
    const abs = Math.abs(c.driftBps);
    if (abs > max) max = abs;
  }
  return max;
}
