import { useEffect, useRef, useState, useCallback } from 'react';
import { useProvider } from './useProvider';
import { RPC_URL } from '../config/contracts';

interface BlockInfo {
  blockNumber: number | null;
  secondsUntilBlock: number;
  networkName: string;
  isConnected: boolean;
}

const POLL_INTERVAL = 5_000;
// OPNet testnet (Signet fork) targets ~10 min blocks, regtest ~30s
const BLOCK_TIME_SECONDS = RPC_URL.includes('testnet') ? 600 : 30;

export function useBlockInfo(): BlockInfo {
  const { provider } = useProvider();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [lastBlockTime, setLastBlockTime] = useState<number>(Date.now());
  const [secondsUntilBlock, setSecondsUntilBlock] = useState(BLOCK_TIME_SECONDS);
  const [isConnected, setIsConnected] = useState(false);
  const prevBlock = useRef<number | null>(null);

  // Derive network name from the RPC URL — not the Network object
  const networkName = RPC_URL.includes('testnet')
    ? 'Testnet'
    : RPC_URL.includes('regtest')
      ? 'Regtest'
      : 'Mainnet';

  const fetchBlock = useCallback(async () => {
    try {
      const num = await provider.getBlockNumber();
      const n = typeof num === 'bigint' ? Number(num) : Number(num);
      setIsConnected(true);

      if (prevBlock.current === null || n > prevBlock.current) {
        setLastBlockTime(Date.now());
        prevBlock.current = n;
      }
      setBlockNumber(n);
    } catch {
      setIsConnected(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchBlock();
    const id = setInterval(fetchBlock, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBlock]);

  // Countdown to next expected block
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastBlockTime) / 1000);
      const remaining = Math.max(0, BLOCK_TIME_SECONDS - elapsed);
      setSecondsUntilBlock(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [lastBlockTime]);

  return { blockNumber, secondsUntilBlock, networkName, isConnected };
}
