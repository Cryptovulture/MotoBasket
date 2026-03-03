import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { hexToP2OP } from '../lib/address';
import { NETWORK } from '../config/network';
import { useToast } from '../components/ui/Toast';

export function useRebalance() {
  const provider = useProvider();
  const { signer } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const triggerRebalance = useCallback(async (indexAddress: string) => {
    if (!signer) {
      toast('Wallet not connected', 'error');
      return;
    }

    try {
      setLoading(true);
      const contract = getContract(hexToP2OP(indexAddress), provider, NETWORK);
      const sim = await contract.rebalance();
      if (!sim.result) throw new Error('Rebalance simulation failed');

      await signer.sendTransaction(sim, {
        signer: null,
        mldsaSigner: null,
      });

      toast('Rebalance submitted!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rebalance failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, signer, toast]);

  const updateWeights = useCallback(async (indexAddress: string, weights: bigint[]) => {
    if (!signer) return;

    try {
      setLoading(true);
      const contract = getContract(hexToP2OP(indexAddress), provider, NETWORK);
      const sim = await contract.updateWeights(BigInt(weights.length), ...weights);
      if (!sim.result) throw new Error('Update weights simulation failed');

      await signer.sendTransaction(sim, {
        signer: null,
        mldsaSigner: null,
      });

      toast('Weights updated!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Weight update failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, signer, toast]);

  return { triggerRebalance, updateWeights, loading };
}
