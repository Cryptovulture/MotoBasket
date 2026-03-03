import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { MOTO_ADDRESS } from '../config/tokens';
import { hexToP2OP } from '../lib/address';
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
  const { connected, signer } = useWallet();
  const { toast } = useToast();
  const { addTx } = useTxTracker();
  const [state, setState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const invest = useCallback(async (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => {
    if (!connected || !signer) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);

      // Step 1: Approve MOTO spend
      setState('approving');
      const motoP2op = hexToP2OP(MOTO_ADDRESS);
      const motoContract = getContract(motoP2op, provider, NETWORK);
      const approveSim = await motoContract.increaseAllowance(indexAddress, motoAmount);
      if (!approveSim.result) throw new Error('Approval simulation failed');

      const approveTx = await signer.sendTransaction(approveSim, {
        signer: null,
        mldsaSigner: null,
      });

      toast('Approval sent. Waiting for confirmation...', 'info');
      setState('waiting');

      // Wait for block confirmation before invest
      await new Promise((resolve) => setTimeout(resolve, 35_000));

      // Step 2: Invest
      setState('simulating');
      const indexP2op = hexToP2OP(indexAddress);
      const indexContract = getContract(indexP2op, provider, NETWORK);
      const investSim = await indexContract.invest(motoAmount, minSharesOut);
      if (!investSim.result) throw new Error('Invest simulation failed');

      setState('sending');
      const txResult = await signer.sendTransaction(investSim, {
        signer: null,
        mldsaSigner: null,
      });

      const txid = typeof txResult === 'string' ? txResult : txResult?.txid ?? '';
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
  }, [provider, connected, signer, toast, addTx]);

  const redeem = useCallback(async (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => {
    if (!connected || !signer) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setState('simulating');

      const indexP2op = hexToP2OP(indexAddress);
      const indexContract = getContract(indexP2op, provider, NETWORK);
      const redeemSim = await indexContract.redeem(shareAmount, minMotoOut);
      if (!redeemSim.result) throw new Error('Redeem simulation failed');

      setState('sending');
      const txResult = await signer.sendTransaction(redeemSim, {
        signer: null,
        mldsaSigner: null,
      });

      const txid = typeof txResult === 'string' ? txResult : txResult?.txid ?? '';
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
  }, [provider, connected, signer, toast, addTx]);

  return { invest, redeem, state, error };
}
