import { useState, useCallback, useMemo } from 'react';
import { getContract } from 'opnet';
import { BinaryWriter } from '@btc-vision/transaction';
import { Address } from '@btc-vision/transaction';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { ExpertIndexAbi } from '../abi/ExpertIndexAbi';
import { MotoTokenAbi } from '../abi/MotoTokenAbi';
import { EXPERT_INDEX_ADDRESS, BASKET_TOKEN_ADDRESS, BASKET_DECIMALS } from '../config/contracts';
import { hexToP2OP } from '../utils/addressUtils';

export const CREATOR_LOCK_AMOUNT = 0n; // Disabled — no lock required for index creation
export const MAX_COMPONENTS = 20;
export const MAX_PERF_FEE_BPS = 2000n; // 20%
export const MIN_WEIGHT_BPS = 100n; // 1%
export const MAX_WEIGHT_BPS = 5000n; // 50%
export const BPS_DENOMINATOR = 10000n; // 100%

export interface ComponentInput {
  token: string; // hex address
  weight: number; // bps (100 = 1%)
}

export interface IndexTemplate {
  name: string;
  description: string;
  perfFeeBps: number;
  components: ComponentInput[];
}

export const INDEX_TEMPLATES: IndexTemplate[] = [
  {
    name: 'BTC Top 10',
    description: 'Top 10 Bitcoin L1 tokens by market capitalization',
    perfFeeBps: 500,
    components: [],
  },
  {
    name: 'DeFi Alpha',
    description: 'Bitcoin L1 DeFi protocols — DEXs, lending, and yield',
    perfFeeBps: 1000,
    components: [],
  },
  {
    name: 'AI Index',
    description: 'Artificial intelligence and machine learning tokens on Bitcoin',
    perfFeeBps: 750,
    components: [],
  },
  {
    name: 'Meme Basket',
    description: 'Top meme and community tokens on Bitcoin L1',
    perfFeeBps: 500,
    components: [],
  },
];

function estimateGas(gas: bigint, gasPerSat: bigint): bigint {
  const exactGas = (gas * gasPerSat) / 1000000000000n;
  const finalGas = (exactGas * 100n) / (100n - 30n);
  return finalGas > 297n ? finalGas : 297n;
}

export function useCreateBasket() {
  const { provider, network } = useProvider();
  const wallet = useWallet();

  // Use the Address object directly from WalletConnect — not reconstructed from string.
  const senderAddr = wallet.senderAddressObj ?? undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = useMemo((): any => {
    if (!EXPERT_INDEX_ADDRESS) return null;
    try {
      return getContract(
        hexToP2OP(EXPERT_INDEX_ADDRESS),
        ExpertIndexAbi,
        provider,
        network,
        senderAddr,
      );
    } catch {
      return null;
    }
  }, [provider, network, senderAddr]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const basketTokenContract = useMemo((): any => {
    if (!BASKET_TOKEN_ADDRESS) return null;
    try {
      return getContract(
        hexToP2OP(BASKET_TOKEN_ADDRESS),
        MotoTokenAbi,
        provider,
        network,
        senderAddr,
      );
    } catch {
      return null;
    }
  }, [provider, network, senderAddr]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBasket = useCallback(async (
    name: string,
    perfFeeBps: bigint,
    components: { token: string; weight: bigint }[],
  ): Promise<string | null> => {
    if (!contract || !basketTokenContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }

    // Validate inputs
    const nameBytes = new TextEncoder().encode(name);
    if (nameBytes.length === 0 || nameBytes.length > 64) {
      setError('Name must be 1-64 characters');
      return null;
    }
    if (perfFeeBps > MAX_PERF_FEE_BPS) {
      setError('Performance fee cannot exceed 20%');
      return null;
    }
    if (components.length === 0 || components.length > MAX_COMPONENTS) {
      setError(`Must have 1-${MAX_COMPONENTS} components`);
      return null;
    }
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0n);
    if (totalWeight !== BPS_DENOMINATOR) {
      setError(`Weights must sum to 100% (10000 bps). Current: ${totalWeight}`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Creator lock is disabled (CREATOR_LOCK_AMOUNT = 0). No approval needed.
      // If re-enabled in the future, uncomment the approval step below:
      // const approveResult = await basketTokenContract.increaseAllowance(
      //   contract.address, CREATOR_LOCK_AMOUNT,
      // );
      // if (approveResult.revert) throw new Error(`Approval failed: ${approveResult.revert}`);
      // await approveResult.sendTransaction({
      //   signer: null, mldsaSigner: null,
      //   refundTo: wallet.p2trAddress, maximumAllowedSatToSpend: 100_000n, network,
      // });

      // Build createBasket calldata manually
      // The ABI only declares nameLen as input, but the contract reads variable-length data.
      // Get base calldata (selector + nameLen) from the ABI encoder
      const nameLen = BigInt(nameBytes.length);
      const baseCalldata: Buffer = contract.encodeCalldata('createBasket', [nameLen]);

      // Build the extra calldata (name bytes + perfFeeBps + compCount + components)
      const extra = new BinaryWriter();
      for (let i = 0; i < nameBytes.length; i++) {
        extra.writeU256(BigInt(nameBytes[i]));
      }
      extra.writeU256(perfFeeBps);
      extra.writeU256(BigInt(components.length));
      for (const comp of components) {
        const addr = Address.fromString(comp.token);
        extra.writeAddress(addr);
        extra.writeU256(comp.weight);
      }

      // Concatenate base + extra
      const extraBuf = Buffer.from(extra.getBuffer());
      const fullCalldata = Buffer.concat([baseCalldata, extraBuf]);

      // Step 3: Call provider with full calldata to simulate
      const response = await provider.call(
        contract.address,
        fullCalldata,
        contract.from,
      );

      if ('error' in response) {
        throw new Error(`CreateBasket failed: ${(response as { error: string }).error}`);
      }

      // Step 4: Configure the CallResult for sendTransaction
      const contractAddr = await contract.contractAddress;
      response.setTo(contract.p2op, contractAddr);
      response.setFromAddress(contract.from);
      response.setCalldata(fullCalldata);

      const gasParameters = await contract.currentGasParameters();
      const gas = estimateGas(response.estimatedGas || 0n, gasParameters.gasPerSat);
      const gasRefunded = estimateGas(response.refundedGas || 0n, gasParameters.gasPerSat);
      response.setBitcoinFee(gasParameters.bitcoin);
      response.setGasEstimation(gas, gasRefunded);

      // Step 5: Send the actual transaction
      const receipt = await response.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: wallet.p2trAddress,
        maximumAllowedSatToSpend: 100_000n,
        network,
      });

      return receipt.transactionId;
    } catch (err) {
      console.error('[createBasket]', err);
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, basketTokenContract, wallet, network, provider]);

  return { createBasket, loading, error };
}
