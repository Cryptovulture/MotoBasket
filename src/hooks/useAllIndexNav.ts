import { useState, useEffect, useCallback } from 'react';
import { ALL_INDEXES } from '../config/indexes';
import { btcCall } from '../lib/rpc';
import { SEL } from '../lib/selectors';
import { buildCalldata, encodeU256, decodeU256, decodeAddress } from '../lib/calldata';
import { type ComponentData, calculateNAV } from '../lib/nav';
import { useBlockInfo } from './useBlockInfo';

export interface IndexNavSummary {
  navPerShare: bigint;
  tvl: bigint;
  componentCount: number;
  loading: boolean;
}

type NavMap = Record<string, IndexNavSummary>;

export function useAllIndexNav(): NavMap {
  const [navMap, setNavMap] = useState<NavMap>({});
  const { blockNumber } = useBlockInfo();

  const fetchAll = useCallback(async () => {
    const results: NavMap = {};

    // Fetch all indexes in parallel
    const promises = ALL_INDEXES.filter((idx) => idx.address).map(async (idx) => {
      try {
        // totalSupply
        const supplyHex = await btcCall(idx.address, SEL.totalSupply);
        const supply = decodeU256(supplyHex);

        // componentCount
        const countHex = await btcCall(idx.address, SEL.getComponentCount);
        const count = Number(decodeU256(countHex));

        // Fetch component data
        const comps: ComponentData[] = [];
        for (let i = 0; i < count; i++) {
          const compData = await btcCall(
            idx.address,
            buildCalldata(SEL.getComponent, encodeU256(BigInt(i))),
          );
          const tokenAddr = decodeAddress(compData, 0);
          const weight = Number(decodeU256(compData, 32));
          const pairAddr = decodeAddress(compData, 64);

          const holdingHex = await btcCall(
            idx.address,
            buildCalldata(SEL.getHolding, encodeU256(BigInt(i))),
          );
          const holding = decodeU256(holdingHex);

          let reserveMoto = 0n;
          let reserveComp = 0n;
          if (pairAddr && pairAddr !== '0x' + '0'.repeat(64)) {
            try {
              const reservesHex = await btcCall(pairAddr, SEL.getReserves);
              const r0 = decodeU256(reservesHex, 0);
              const r1 = decodeU256(reservesHex, 32);
              const t0Hex = await btcCall(pairAddr, SEL.token0);
              const pairToken0 = decodeAddress(t0Hex, 0);
              const motoIsTok0 = pairToken0.toLowerCase() !== tokenAddr.toLowerCase();
              reserveMoto = motoIsTok0 ? r0 : r1;
              reserveComp = motoIsTok0 ? r1 : r0;
            } catch {
              // skip pair errors
            }
          }

          comps.push({ address: tokenAddr, weightBps: weight, holding, reserveMoto, reserveComp });
        }

        const nav = calculateNAV(idx, comps, supply);
        results[idx.address.toLowerCase()] = {
          navPerShare: nav.navPerShare,
          tvl: nav.totalMotoValue,
          componentCount: count,
          loading: false,
        };
      } catch {
        results[idx.address.toLowerCase()] = {
          navPerShare: 0n,
          tvl: 0n,
          componentCount: 0,
          loading: false,
        };
      }
    });

    await Promise.all(promises);
    setNavMap(results);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, blockNumber]);

  return navMap;
}
