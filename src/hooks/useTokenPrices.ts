import { useState, useEffect } from 'react';
import { ALL_INDEXES } from '../config/indexes';
import { MOTO_ADDRESS } from '../config/tokens';
import { btcCall } from '../lib/rpc';
import { SEL } from '../lib/selectors';
import { decodeU256, decodeAddress } from '../lib/calldata';
import { useBlockInfo } from './useBlockInfo';

// MOTO-denominated prices from pair reserves
// Returns a map of token address -> price in MOTO (as float)
export function useTokenPrices(): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const { blockNumber } = useBlockInfo();

  useEffect(() => {
    const fetchPrices = async () => {
      const newPrices: Record<string, number> = {};

      // Collect unique pair addresses from all indexes
      const seen = new Set<string>();
      for (const idx of ALL_INDEXES) {
        if (!idx.address) continue;
        for (let i = 0; i < idx.components.length; i++) {
          const comp = idx.components[i];
          if (seen.has(comp.address)) continue;
          seen.add(comp.address);

          try {
            // We need the pair address — use getComponent from the index
            const compHex = await btcCall(
              idx.address,
              SEL.getComponent + BigInt(i).toString(16).padStart(64, '0'),
            );
            const pairAddr = decodeAddress(compHex, 64);
            if (pairAddr === '0x' + '0'.repeat(64)) continue;

            // Get reserves
            const resHex = await btcCall(pairAddr, SEL.getReserves);
            const r0 = decodeU256(resHex, 0);
            const r1 = decodeU256(resHex, 32);

            // Determine which is MOTO
            const t0Hex = await btcCall(pairAddr, SEL.token0);
            const token0 = decodeAddress(t0Hex, 0);

            const motoIsTok0 = token0.toLowerCase() !== comp.address.toLowerCase();
            const resMoto = motoIsTok0 ? r0 : r1;
            const resComp = motoIsTok0 ? r1 : r0;

            if (resComp > 0n) {
              newPrices[comp.address] = Number(resMoto) / Number(resComp);
            }
          } catch {
            // skip
          }
        }
      }

      setPrices(newPrices);
    };

    fetchPrices();
  }, [blockNumber]);

  return prices;
}
