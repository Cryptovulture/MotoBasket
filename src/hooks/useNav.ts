import { useMemo } from 'react';
import { type IndexConfig } from '../config/indexes';
import { calculateNAV, type IndexNAV, type ComponentData } from '../lib/nav';

interface UseNavResult {
  nav: IndexNAV | null;
}

export function useNav(
  config: IndexConfig,
  components: ComponentData[],
  totalSupply: bigint,
): UseNavResult {
  const nav = useMemo(() => {
    if (components.length === 0) return null;
    return calculateNAV(config, components, totalSupply);
  }, [config, components, totalSupply]);

  return { nav };
}
