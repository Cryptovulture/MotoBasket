import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { INDEX_TOKEN_ABI } from '../config/abi';
import { hexToAddress } from '../lib/address';
import { NETWORK } from '../config/network';
import { useToast } from '../components/ui/Toast';

export function useRebalance() {
  const provider = useProvider();
  const { address: walletAddr, senderAddress } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const triggerRebalance = useCallback(async (indexAddress: string) => {
    if (!walletAddr || !senderAddress) {
      toast('Wallet not connected', 'error');
      return;
    }

    try {
      setLoading(true);
      const indexAddr = hexToAddress(indexAddress);
      const contract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const sim = await (contract as any).rebalance();
      if (sim.revert) throw new Error(`Rebalance reverted: ${sim.revert}`);

      await sim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      toast('Rebalance submitted!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rebalance failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, walletAddr, senderAddress, toast]);

  const updateWeights = useCallback(async (indexAddress: string, weights: bigint[]) => {
    if (!walletAddr || !senderAddress) return;

    try {
      setLoading(true);
      const indexAddr = hexToAddress(indexAddress);
      const contract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const sim = await (contract as any).updateWeights(BigInt(weights.length), weights);
      if (sim.revert) throw new Error(`Update weights reverted: ${sim.revert}`);

      await sim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      toast('Weights updated!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Weight update failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, walletAddr, senderAddress, toast]);

  return { triggerRebalance, updateWeights, loading };
}
