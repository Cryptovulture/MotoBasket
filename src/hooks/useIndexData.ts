import { useState, useEffect, useCallback } from 'react';
import { type IndexConfig } from '../config/indexes';
import { TOKENS } from '../config/tokens';
import { btcCall } from '../lib/rpc';
import { SEL } from '../lib/selectors';
import { buildCalldata, encodeU256, decodeU256, decodeAddress } from '../lib/calldata';
import { type ComponentData } from '../lib/nav';
import { useBlockInfo } from './useBlockInfo';

interface IndexData {
  totalSupply: bigint;
  componentCount: number;
  components: ComponentData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useIndexData(config: IndexConfig): IndexData {
  const [totalSupply, setTotalSupply] = useState(0n);
  const [componentCount, setComponentCount] = useState(0);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { blockNumber } = useBlockInfo();

  const fetch = useCallback(async () => {
    if (!config.address) {
      setLoading(false);
      return;
    }

    try {
      // Fetch total supply
      const supplyHex = await btcCall(config.address, SEL.totalSupply);
      const supply = decodeU256(supplyHex);
      setTotalSupply(supply);

      // Fetch component count
      const countHex = await btcCall(config.address, SEL.getComponentCount);
      const count = Number(decodeU256(countHex));
      setComponentCount(count);

      // Fetch each component's data
      const comps: ComponentData[] = [];
      for (let i = 0; i < count; i++) {
        // getComponent(uint256) -> (address, weight, pair)
        const compData = await btcCall(
          config.address,
          buildCalldata(SEL.getComponent, encodeU256(BigInt(i))),
        );
        const tokenAddr = decodeAddress(compData, 0);
        const weight = Number(decodeU256(compData, 32));
        const pairAddr = decodeAddress(compData, 64);

        // getHolding(uint256) -> amount
        const holdingHex = await btcCall(
          config.address,
          buildCalldata(SEL.getHolding, encodeU256(BigInt(i))),
        );
        const holding = decodeU256(holdingHex);

        // getReserves() from pair
        let reserveMoto = 0n;
        let reserveComp = 0n;
        if (pairAddr && pairAddr !== '0x' + '0'.repeat(64)) {
          try {
            const reservesHex = await btcCall(pairAddr, SEL.getReserves);
            const r0 = decodeU256(reservesHex, 0);
            const r1 = decodeU256(reservesHex, 32);

            // Determine which reserve is MOTO by checking token0 from the pair
            const t0Hex = await btcCall(pairAddr, SEL.token0);
            const pairToken0 = decodeAddress(t0Hex, 0);
            // Use the on-chain tokenAddr (not config) for robustness
            const motoIsTok0 = pairToken0.toLowerCase() !== tokenAddr.toLowerCase();

            reserveMoto = motoIsTok0 ? r0 : r1;
            reserveComp = motoIsTok0 ? r1 : r0;
          } catch (e) {
            console.warn(`[useIndexData] Failed to load reserves for component ${i} (pair ${pairAddr}):`, e);
          }
        }

        comps.push({
          address: tokenAddr,
          weightBps: weight,
          holding,
          reserveMoto,
          reserveComp,
        });
      }

      setComponents(comps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch index data');
    } finally {
      setLoading(false);
    }
  }, [config.address]);

  // Refetch on block change
  useEffect(() => {
    if (config.address) fetch();
  }, [fetch, blockNumber]);

  return { totalSupply, componentCount, components, loading, error, refetch: fetch };
}
