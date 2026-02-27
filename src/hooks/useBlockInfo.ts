import { useEffect, useRef, useState, useCallback } from 'react';
import { RPC_URL } from '../config/contracts';

interface BlockInfo {
  blockNumber: number | null;
  secondsUntilBlock: number;
  networkName: string;
  isConnected: boolean;
}

const POLL_INTERVAL = 5_000;
const BLOCK_TIME_SECONDS = RPC_URL.includes('testnet') ? 600 : 30;
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;

let rpcId = 1000;

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}`);
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export function useBlockInfo(): BlockInfo {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [blockTimestampMs, setBlockTimestampMs] = useState<number | null>(null);
  const [secondsUntilBlock, setSecondsUntilBlock] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const prevBlock = useRef<number | null>(null);

  const networkName = RPC_URL.includes('testnet')
    ? 'Testnet'
    : RPC_URL.includes('regtest')
      ? 'Regtest'
      : 'Mainnet';

  const fetchBlock = useCallback(async () => {
    try {
      // btc_blockNumber returns hex string like "0x9f3"
      const hex = await rpcCall('btc_blockNumber', []) as string;
      const n = parseInt(hex, 16);
      setIsConnected(true);
      setBlockNumber(n);

      if (prevBlock.current === null || n > prevBlock.current) {
        prevBlock.current = n;
        try {
          // btc_getBlockByNumber returns { time: <milliseconds>, ... }
          const block = await rpcCall('btc_getBlockByNumber', [n.toString(), false]) as {
            time?: number;
          };
          if (block?.time) {
            setBlockTimestampMs(block.time);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchBlock();
    const id = setInterval(fetchBlock, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBlock]);

  useEffect(() => {
    const id = setInterval(() => {
      if (blockTimestampMs === null) {
        setSecondsUntilBlock(0);
        return;
      }
      const elapsedSec = Math.floor((Date.now() - blockTimestampMs) / 1000);
      const remaining = Math.max(0, BLOCK_TIME_SECONDS - elapsedSec);
      setSecondsUntilBlock(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [blockTimestampMs]);

  return { blockNumber, secondsUntilBlock, networkName, isConnected };
}
