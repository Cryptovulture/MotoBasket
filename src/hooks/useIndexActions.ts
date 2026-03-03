import { useState, useCallback } from 'react';
import { getContract, OP_20_ABI } from 'opnet';
import { useWallet } from './useWallet';
import { MOTO_ADDRESS } from '../config/tokens';
import { INDEX_TOKEN_ABI } from '../config/abi';
import { hexToAddress } from '../lib/address';
import { NETWORK } from '../config/network';
import { useToast } from '../components/ui/Toast';
import { useTxTracker } from './useTxTracker';
import { getProvider } from './useProvider';

type ActionState = 'idle' | 'approving' | 'simulating' | 'sending';

interface IndexActions {
  invest: (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => Promise<void>;
  redeem: (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => Promise<void>;
  state: ActionState;
  error: string | null;
}

export function useIndexActions(): IndexActions {
  const { connected, address: walletAddr, senderAddress } = useWallet();
  const { toast } = useToast();
  const { addTx } = useTxTracker();
  const [state, setState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const invest = useCallback(async (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => {
    if (!connected || !walletAddr) {
      toast('Wallet not connected', 'error');
      return;
    }
    if (!senderAddress) {
      toast('Wallet keys not available — reconnect wallet', 'error');
      return;
    }

    try {
      setError(null);
      const provider = getProvider();

      const motoAddr = hexToAddress(MOTO_ADDRESS);
      const indexAddr = hexToAddress(indexAddress);
      console.log('[invest] MOTO:', MOTO_ADDRESS);
      console.log('[invest] Index:', indexAddress);
      console.log('[invest] Amount:', motoAmount.toString());

      const motoContract = getContract(motoAddr, OP_20_ABI, provider, NETWORK, senderAddress);

      // Check existing allowance
      setState('approving');
      let needsApproval = true;
      try {
        const allowanceResult = await (motoContract as any).allowance(senderAddress, indexAddr);
        if (!allowanceResult.revert) {
          const remaining = allowanceResult.properties?.remaining ?? 0n;
          if (remaining >= motoAmount) {
            needsApproval = false;
            console.log('[invest] Allowance sufficient:', remaining.toString());
          } else {
            console.log('[invest] Allowance insufficient:', remaining.toString());
          }
        }
      } catch (e) {
        console.warn('[invest] Allowance check failed:', e);
      }

      let approveNewUTXOs: unknown[] | undefined;

      if (needsApproval) {
        // TX1: Approve MOTO spending
        console.log('[invest] Simulating approve...');
        const approveSim = await (motoContract as any).increaseAllowance(indexAddr, motoAmount);
        if (approveSim.revert) throw new Error(`Approval failed: ${approveSim.revert}`);

        console.log('[invest] Sending approve TX...');
        toast('Sending approval...', 'info');

        const approveReceipt = await approveSim.sendTransaction({
          signer: null,
          mldsaSigner: null,
          refundTo: walletAddr,
          maximumAllowedSatToSpend: 100_000n,
          network: NETWORK,
        });

        if (!approveReceipt?.transactionId) throw new Error('Approval TX failed — no txid');
        console.log('[invest] Approve TX:', approveReceipt.transactionId);

        // Capture UTXOs for chaining
        approveNewUTXOs = approveReceipt.newUTXOs;
        console.log('[invest] Chaining with', approveNewUTXOs?.length ?? 0, 'UTXOs');
      }

      // TX2: Invest (chained immediately — no block wait needed)
      setState('simulating');
      toast('Simulating invest...', 'info');

      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);

      // Forward state from approve TX so simulator sees the allowance
      if (approveNewUTXOs) {
        (indexContract as any).setTransactionDetails({ inputs: [], outputs: [] });
      }

      console.log('[invest] Simulating invest...');
      const investSim = await (indexContract as any).invest(motoAmount, minSharesOut);
      if (investSim.revert) throw new Error(`Invest simulation failed: ${investSim.revert}`);
      console.log('[invest] Simulation passed!');

      setState('sending');
      toast('Sending invest TX...', 'info');

      const sendOpts: Record<string, unknown> = {
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      };

      // Chain UTXO dependency from approve
      if (approveNewUTXOs) {
        sendOpts.utxos = approveNewUTXOs;
      }

      const txResult = await investSim.sendTransaction(sendOpts);
      const txid = txResult?.transactionId ?? '';
      console.log('[invest] TX result:', txid);

      if (txid) {
        addTx({
          txid,
          type: 'invest',
          indexAddress,
          amount: motoAmount.toString(),
          timestamp: Date.now(),
        });
        toast(needsApproval
          ? 'Approve + Invest sent in one go!'
          : 'Investment submitted!',
          'success',
        );
      }
    } catch (err) {
      console.error('[invest] Error:', err);
      const msg = err instanceof Error ? err.message : 'Investment failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setState('idle');
    }
  }, [connected, walletAddr, senderAddress, toast, addTx]);

  const redeem = useCallback(async (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => {
    if (!connected || !walletAddr) {
      toast('Wallet not connected', 'error');
      return;
    }
    if (!senderAddress) {
      toast('Wallet keys not available — reconnect wallet', 'error');
      return;
    }

    try {
      setError(null);
      setState('simulating');
      const provider = getProvider();

      console.log('[redeem] Index:', indexAddress, 'Shares:', shareAmount.toString());
      const indexAddr = hexToAddress(indexAddress);
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const redeemSim = await (indexContract as any).redeem(shareAmount, minMotoOut);
      if (redeemSim.revert) throw new Error(`Redeem simulation failed: ${redeemSim.revert}`);
      console.log('[redeem] Simulation passed, broadcasting...');

      setState('sending');
      const txResult = await redeemSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      const txid = txResult?.transactionId ?? '';
      console.log('[redeem] TX result:', txid);
      if (txid) {
        addTx({
          txid,
          type: 'redeem',
          indexAddress,
          amount: shareAmount.toString(),
          timestamp: Date.now(),
        });
        toast('Redemption submitted!', 'success');
      }
    } catch (err) {
      console.error('[redeem] Error:', err);
      const msg = err instanceof Error ? err.message : 'Redemption failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setState('idle');
    }
  }, [connected, walletAddr, senderAddress, toast, addTx]);

  return { invest, redeem, state, error };
}
