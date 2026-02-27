import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchAllBaskets, fetchStats, fetchBasketInfo, fetchBasketName, fetchBasketNAV } from '../utils/rawRpc';
import type { RawBasket } from '../utils/rawRpc';

export type BasketSummary = RawBasket;

export interface PlatformStats {
  nextBasketId: bigint;
  platformFeeBps: bigint;
  totalBaskets: number;
  totalActiveBaskets: number;
  totalValueLocked: bigint;
}

export function useExpertIndex() {
  const [baskets, setBaskets] = useState<BasketSummary[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { stats, baskets: allBaskets } = await fetchAllBaskets();

      const activeCount = allBaskets.filter(b => b.active !== 0n).length;
      const tvl = allBaskets.reduce((sum, b) => sum + b.nav, 0n);

      setPlatformStats({
        nextBasketId: stats.nextBasketId,
        platformFeeBps: stats.platformFeeBps,
        totalBaskets: allBaskets.length,
        totalActiveBaskets: activeCount,
        totalValueLocked: tvl,
      });
      setBaskets(allBaskets);
      setError(null);
    } catch (err) {
      console.error('[useExpertIndex]', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(() => {
      refresh().catch(console.error);
    }, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { baskets, platformStats, loading, error, refresh };
}

// Re-export raw RPC utilities for use elsewhere
export { fetchStats, fetchBasketInfo, fetchBasketName, fetchBasketNAV };
