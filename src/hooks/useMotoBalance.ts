import { useState, useEffect } from 'react';
import { getContract, OP_20_ABI } from 'opnet';
import { MOTO_ADDRESS } from '../config/tokens';
import { hexToAddress } from '../lib/address';
import { NETWORK } from '../config/network';
import { useWallet } from './useWallet';
import { getProvider } from './useProvider';

const POLL_MS = 30_000;

export function useMotoBalance() {
  const { connected, senderAddress } = useWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !senderAddress) {
      setBalance(0n);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const provider = getProvider();
        const moto = getContract(
          hexToAddress(MOTO_ADDRESS),
          OP_20_ABI,
          provider,
          NETWORK,
          senderAddress,
        );
        const result = await (moto as any).balanceOf(senderAddress);
        if (!cancelled) {
          setBalance(result?.properties?.balance ?? 0n);
        }
      } catch (e) {
        console.warn('[useMotoBalance] Error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    fetchBalance();
    const interval = setInterval(fetchBalance, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connected, senderAddress]);

  return { balance, loading };
}
