import { useState, useCallback } from 'react';
import { getContract, JSONRpcProvider, OP_20_ABI } from 'opnet';
import { useWallet } from './useWallet';
import { MOTO_ADDRESS } from '../config/tokens';
import { INDEX_TOKEN_ABI } from '../config/abi';
import { hexToAddress } from '../lib/address';
import { NETWORK, RPC_URL } from '../config/network';
import { useToast } from '../components/ui/Toast';
import { useTxTracker } from './useTxTracker';

type ActionState = 'idle' | 'approving' | 'simulating' | 'sending';

interface IndexActions {
  invest: (indexAddress: string, motoAmount: bigint, minSharesOut: bigint) => Promise<void>;
  redeem: (indexAddress: string, shareAmount: bigint, minMotoOut: bigint) => Promise<void>;
  state: ActionState;
  error: string | null;
}

// Singleton RPC provider for contract simulation / reads
let rpcProvider: JSONRpcProvider | null = null;
function getProvider(): JSONRpcProvider {
  if (!rpcProvider) {
    rpcProvider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
  }
  return rpcProvider;
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
      console.log('[invest] MOTO addr:', MOTO_ADDRESS);
      console.log('[invest] Index addr:', indexAddress);
      console.log('[invest] Amount:', motoAmount.toString(), 'MinShares:', minSharesOut.toString());

      const motoContract = getContract(motoAddr, OP_20_ABI, provider, NETWORK, senderAddress);

      // Step 1: Check existing allowance
      setState('approving');
      let needsApproval = true;
      try {
        console.log('[invest] Checking allowance...');
        const allowanceResult = await (motoContract as any).allowance(senderAddress, indexAddr);
        console.log('[invest] Allowance result:', allowanceResult?.properties);
        if (!allowanceResult.revert) {
          const remaining = allowanceResult.properties?.remaining ?? 0n;
          if (remaining >= motoAmount) {
            needsApproval = false;
            console.log('[invest] Allowance sufficient:', remaining.toString());
          } else {
            console.log('[invest] Allowance insufficient:', remaining.toString(), '<', motoAmount.toString());
          }
        }
      } catch (e) {
        console.warn('[invest] Allowance check failed, will request approval:', e);
      }

      if (needsApproval) {
        console.log('[invest] Sending increaseAllowance...');
        const approveSim = await (motoContract as any).increaseAllowance(indexAddr, motoAmount);
        if (approveSim.revert) throw new Error(`Approval simulation failed: ${approveSim.revert}`);
        console.log('[invest] Approval simulation passed, broadcasting...');

        const approveReceipt = await approveSim.sendTransaction({
          signer: null,
          mldsaSigner: null,
          refundTo: walletAddr,
          maximumAllowedSatToSpend: 100_000n,
          network: NETWORK,
        });

        const approveTxId = approveReceipt?.transactionId;
        if (!approveTxId) throw new Error('Approval TX failed — no transaction ID returned');
        console.log('[invest] Approval TX sent:', approveTxId);

        addTx({
          txid: approveTxId,
          type: 'invest',
          indexAddress,
          amount: '0',
          timestamp: Date.now(),
        });
        toast('Approval TX sent! Wait ~30s for confirmation, then click Invest again.', 'info');
        setState('idle');
        return;
      }

      // Step 2: Allowance is sufficient — invest directly
      toast('Allowance confirmed. Simulating invest...', 'info');
      setState('simulating');
      console.log('[invest] Simulating invest call...');
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const investSim = await (indexContract as any).invest(motoAmount, minSharesOut);
      if (investSim.revert) throw new Error(`Invest simulation failed: ${investSim.revert}`);
      console.log('[invest] Simulation passed, broadcasting...');

      setState('sending');
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
