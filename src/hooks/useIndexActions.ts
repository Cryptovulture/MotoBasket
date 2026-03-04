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

type ActionState = 'idle' | 'approving' | 'waiting-approve' | 'simulating' | 'sending';

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

      if (needsApproval) {
        // Approve a large amount (1M MOTO) so future invests don't need approval.
        // Must wait for on-chain confirmation before invest simulation can see it.
        const approveAmount = 1_000_000n * 10n ** 18n;
        console.log('[invest] Simulating approve (1M MOTO)...');
        const approveSim = await (motoContract as any).increaseAllowance(indexAddr, approveAmount);
        if (approveSim.revert) throw new Error(`Approval failed: ${approveSim.revert}`);

        console.log('[invest] Sending approve TX...');
        toast('Approving MOTO — please confirm in wallet', 'info');

        const approveReceipt = await approveSim.sendTransaction({
          signer: null,
          mldsaSigner: null,
          refundTo: walletAddr,
          maximumAllowedSatToSpend: 100_000n,
          network: NETWORK,
        });

        if (!approveReceipt?.transactionId) throw new Error('Approval TX failed — no txid');
        console.log('[invest] Approve TX:', approveReceipt.transactionId);

        // Wait for approval to be mined before simulating invest.
        // The invest simulation reads on-chain allowance — it MUST be confirmed first.
        setState('waiting-approve');
        toast('Waiting for approval to confirm (~30s)...', 'info');
        console.log('[invest] Waiting for approve to mine...');

        const startBlock = await provider.getBlockNumber();
        const deadline = Date.now() + 180_000; // 3 min max wait
        let confirmed = false;

        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000));
          const currentBlock = await provider.getBlockNumber();
          if (currentBlock > startBlock) {
            confirmed = true;
            console.log('[invest] Approve confirmed at block', currentBlock);
            break;
          }
        }

        if (!confirmed) {
          throw new Error('Approval TX did not confirm in time — try investing again in a minute');
        }

        toast('Approval confirmed! Investing...', 'success');
      }

      // Now simulate invest — allowance is on-chain (either pre-existing or just confirmed)
      setState('simulating');
      toast('Simulating invest...', 'info');

      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);

      console.log('[invest] Simulating invest...');
      const investSim = await (indexContract as any).invest(motoAmount, minSharesOut);
      if (investSim.revert) throw new Error(`Invest simulation failed: ${investSim.revert}`);
      console.log('[invest] Simulation passed!');

      setState('sending');
      toast('Sending invest TX — please confirm in wallet', 'info');

      const txResult = await investSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

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
        toast('Investment submitted!', 'success');
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
