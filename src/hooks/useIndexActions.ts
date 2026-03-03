import { useState, useCallback } from 'react';
import { getContract, JSONRpcProvider, OP_20_ABI } from 'opnet';
import { useWallet } from './useWallet';
import { MOTO_ADDRESS } from '../config/tokens';
import { INDEX_TOKEN_ABI } from '../config/abi';
import { hexToAddress } from '../lib/address';
import { NETWORK, RPC_URL } from '../config/network';
import { useToast } from '../components/ui/Toast';
import { useTxTracker } from './useTxTracker';

type ActionState = 'idle' | 'approving' | 'confirming' | 'simulating' | 'sending';

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

// Poll for TX confirmation instead of blind sleep
async function waitForConfirmation(
  txId: string,
  maxAttempts = 40,
  intervalMs = 5000,
): Promise<void> {
  const provider = getProvider();
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txId);
      if (receipt) return;
    } catch {
      // Not confirmed yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Approval confirmation timed out. Try again.');
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

      // Step 1: Approve MOTO spend on the index contract
      setState('approving');
      const motoContract = getContract(motoAddr, OP_20_ABI, provider, NETWORK, senderAddress);
      const approveSim = await (motoContract as any).increaseAllowance(indexAddr, motoAmount);
      if (approveSim.revert) throw new Error(`Approval simulation failed: ${approveSim.revert}`);

      const approveReceipt = await approveSim.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: walletAddr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });

      const approveTxId = approveReceipt?.transactionId;
      if (!approveTxId) throw new Error('Approval TX failed — no transaction ID returned');

      toast('Approval sent. Waiting for confirmation...', 'info');

      // Step 2: Wait for approval TX to confirm on-chain
      setState('confirming');
      await waitForConfirmation(approveTxId);

      toast('Approval confirmed. Investing...', 'info');

      // Step 3: Invest
      setState('simulating');
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const investSim = await (indexContract as any).invest(motoAmount, minSharesOut);
      if (investSim.revert) throw new Error(`Invest simulation failed: ${investSim.revert}`);

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

      const indexAddr = hexToAddress(indexAddress);
      const indexContract = getContract(indexAddr, INDEX_TOKEN_ABI, provider, NETWORK, senderAddress);
      const redeemSim = await (indexContract as any).redeem(shareAmount, minMotoOut);
      if (redeemSim.revert) throw new Error(`Redeem simulation failed: ${redeemSim.revert}`);

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
  }, [connected, walletAddr, senderAddress, toast, addTx]);

  return { invest, redeem, state, error };
}
