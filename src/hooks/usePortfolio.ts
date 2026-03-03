import { useState, useEffect, useCallback } from 'react';
import { ALL_INDEXES, type IndexConfig } from '../config/indexes';
import { btcCall } from '../lib/rpc';
import { SEL } from '../lib/selectors';
import { buildCalldata, encodeAddress, decodeU256 } from '../lib/calldata';
import { useWallet } from './useWallet';
import { useBlockInfo } from './useBlockInfo';

export interface PortfolioPosition {
  index: IndexConfig;
  balance: bigint;
}

interface Portfolio {
  positions: PortfolioPosition[];
  loading: boolean;
  totalIndexes: number;
}

export function usePortfolio(): Portfolio {
  const { address, connected } = useWallet();
  const { blockNumber } = useBlockInfo();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!connected || !address) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      const results: PortfolioPosition[] = [];

      for (const idx of ALL_INDEXES) {
        if (!idx.address) continue;
        try {
          const hex = await btcCall(
            idx.address,
            buildCalldata(SEL.balanceOf, encodeAddress(address)),
          );
          const balance = decodeU256(hex);
          if (balance > 0n) {
            results.push({ index: idx, balance });
          }
        } catch {
          // skip indexes that fail
        }
      }

      setPositions(results);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address, connected]);

  useEffect(() => {
    fetch();
  }, [fetch, blockNumber]);

  return {
    positions,
    loading,
    totalIndexes: positions.length,
  };
}
