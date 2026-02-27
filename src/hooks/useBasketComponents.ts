import { useState, useEffect } from 'react';
import { fetchComponent, u256ToAddress } from '../utils/rawRpc';
import { TOKEN_META } from '../config/contracts';

export interface ComponentInfo {
  token: string; // hex address
  symbol: string;
  weight: number; // percentage (0-100)
}

/** Fetch components for a basket and resolve token symbols */
export function useBasketComponents(basketId: bigint | undefined, compCount: bigint | undefined) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);

  useEffect(() => {
    if (basketId === undefined || compCount === undefined || compCount === 0n) return;

    let cancelled = false;

    async function load() {
      const results: ComponentInfo[] = [];
      for (let i = 0n; i < compCount!; i++) {
        try {
          const comp = await fetchComponent(basketId!, i);
          const tokenHex = u256ToAddress(comp.token);
          const meta = TOKEN_META[tokenHex];
          results.push({
            token: tokenHex,
            symbol: meta?.symbol || tokenHex.slice(0, 10) + '...',
            weight: Number(comp.weight),
          });
        } catch (err) {
          console.error(`[useBasketComponents] basket ${basketId} comp ${i}:`, err);
        }
      }
      if (!cancelled) setComponents(results);
    }

    load();
    return () => { cancelled = true; };
  }, [basketId, compCount]);

  return components;
}

/** Non-hook version: fetch components for display */
export async function getBasketComponents(basketId: bigint, compCount: bigint): Promise<ComponentInfo[]> {
  const results: ComponentInfo[] = [];
  for (let i = 0n; i < compCount; i++) {
    try {
      const comp = await fetchComponent(basketId, i);
      const tokenHex = u256ToAddress(comp.token);
      const meta = TOKEN_META[tokenHex];
      results.push({
        token: tokenHex,
        symbol: meta?.symbol || tokenHex.slice(0, 10) + '...',
        weight: Number(comp.weight),
      });
    } catch {
      // skip failed components
    }
  }
  return results;
}
