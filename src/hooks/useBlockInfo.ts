import { useState, useEffect, useRef } from 'react';
import { getBlockNumber } from '../lib/rpc';

const POLL_INTERVAL = 15_000; // 15 seconds

interface BlockInfo {
  blockNumber: number;
  loading: boolean;
}

// Shared state across all consumers
let sharedBlock = 0;
let listeners: Array<() => void> = [];

function notifyAll() {
  for (const fn of listeners) fn();
}

export function useBlockInfo(): BlockInfo {
  const [blockNumber, setBlockNumber] = useState(sharedBlock);
  const [loading, setLoading] = useState(sharedBlock === 0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const update = () => {
      if (mounted.current) setBlockNumber(sharedBlock);
    };
    listeners.push(update);

    // Only start polling if we're the first listener
    let interval: ReturnType<typeof setInterval> | null = null;
    if (listeners.length === 1) {
      const poll = async () => {
        try {
          const bn = await getBlockNumber();
          if (bn > 0) {
            sharedBlock = bn;
            notifyAll();
          }
        } catch {
          // silent
        }
      };
      poll();
      interval = setInterval(poll, POLL_INTERVAL);
    }

    if (sharedBlock > 0) setLoading(false);

    return () => {
      mounted.current = false;
      listeners = listeners.filter((fn) => fn !== update);
      if (interval && listeners.length === 0) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (blockNumber > 0) setLoading(false);
  }, [blockNumber]);

  return { blockNumber, loading };
}
