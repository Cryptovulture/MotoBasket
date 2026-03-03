import { useState, useCallback } from 'react';
import { getContract, OP_20_ABI } from 'opnet';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { MOTO_ADDRESS } from '../config/tokens';
import { INDEX_TOKEN_ABI } from '../config/abi';
import { hexToAddress } from '../lib/address';
import { NETWORK } from '../config/network';
import { useToast } from '../components/ui/Toast';
import { useTxTracker } from './useTxTracker';

type ActionState = 'idle' | 'approving' | 'simulating' | 'sending' | 'waiting';

interface IndexActions {
  invest: (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => Promise<void>;
  redeem: (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => Promise<void>;
  state: ActionState;
  error: string | null;
}

export function useIndexActions(): IndexActions {
  const provider = useProvider();
  const { connected, address: walletAddr } = useWallet();
  const { toast } = useToast();
  const { addTx } = useTxTracker();
  const [state, setState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const invest = useCallback(async (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => {
    if (!connected || !walletAddr) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);

      // Step 1: Approve MOTO spend on the index contract
      setState('approving');
      const motoAddr = hexToAddress(MOTO_ADDRESS);
      const indexAddr = hexToAddress(indexAddress);
      const motoContract = getContract(motoAddr, OP_20_ABI, provider, NETWORK);
      const approveSim = await (motoContract as any).increaseAllowance(indexAddr, motoAmount);
      if (approveSim.revert) throw new Error(`Approval reverted: ${approveSim.revert}`);

      const approveReceipt = await approveSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      toast('Approval sent. Waiting for confirmation...', 'info');
      setState('waiting');

      // Wait for block confirmation before invest (OPNet TX chaining doesn't work)
      await new Promise((resolve) => setTimeout(resolve, 35_000));

      // Step 2: Invest
      setState('simulating');
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK);
      const investSim = await (indexContract as any).invest(motoAmount, minSharesOut);
      if (investSim.revert) throw new Error(`Invest reverted: ${investSim.revert}`);

      setState('sending');
      const txResult = await investSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      const txid = txResult?.transactionId ?? '';
      if (txid) {
        addTx({
          txid,
          type: 'invest',
          indexAddress,
          amount: motoAmount.toString(),
          timestamp: Date.now(),
        });
        toast('Investment submitted!', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Investment failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setState('idle');
    }
  }, [provider, connected, walletAddr, toast, addTx]);

  const redeem = useCallback(async (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => {
    if (!connected || !walletAddr) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setState('simulating');

      const indexAddr = hexToAddress(indexAddress);
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK);
      const redeemSim = await (indexContract as any).redeem(shareAmount, minMotoOut);
      if (redeemSim.revert) throw new Error(`Redeem reverted: ${redeemSim.revert}`);

      setState('sending');
      const txResult = await redeemSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      const txid = txResult?.transactionId ?? '';
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
      const msg = err instanceof Error ? err.message : 'Redemption failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setState('idle');
    }
  }, [provider, connected, walletAddr, toast, addTx]);

  return { invest, redeem, state, error };
}
