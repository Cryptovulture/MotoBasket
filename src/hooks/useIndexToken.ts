import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { IndexTokenAbi } from '../abi/IndexTokenAbi';
import { MotoTokenAbi } from '../abi/MotoTokenAbi';
import {
  MOTO_TOKEN_ADDRESS,
  MOTO_DECIMALS,
  TOKEN_META,
} from '../config/contracts';
import { hexToP2OP } from '../utils/addressUtils';
import {
  fetchComponentCount,
  fetchComponent,
  fetchHolding,
  fetchBalanceOf,
  fetchMotoBalance,
  fetchAllowance,
  fetchTotalSupply,
  simulateAndGetRevert,
  checkMissingPools,
} from '../utils/rawRpc';
import type { IndexConfig } from '../config/indexes';
import { MOTOSWAP_ROUTER_ADDRESS } from '../config/contracts';

export interface ComponentState {
  address: string;
  symbol: string;
  name: string;
  weight: bigint;
  holding: bigint;
}

// ── Formatting helpers ──────────────────────────────────────────────

export function formatToken(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;
  const prefix = negative ? '-' : '';
  if (fraction === 0n) return `${prefix}${whole}`;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${prefix}${whole}.${fractionStr}`;
}

export function formatMoto(value: bigint): string {
  return formatToken(value, MOTO_DECIMALS);
}

export function formatMotoDisplay(value: bigint): string {
  const full = formatMoto(value);
  const dot = full.indexOf('.');
  if (dot === -1) return full;
  return full.slice(0, dot + 5);
}

export function parseTokenInput(input: string, decimals: number): bigint {
  const cleaned = input.trim().replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return 0n;
  const parts = cleaned.split('.');
  if (parts.length > 2) return 0n;
  const whole = parts[0] || '0';
  let fraction = parts[1] ?? '';
  fraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  try {
    return BigInt(whole + fraction);
  } catch {
    return 0n;
  }
}

export function parseMotoInput(input: string): bigint {
  return parseTokenInput(input, MOTO_DECIMALS);
}

// ── Hook ────────────────────────────────────────────────────────────

export function useIndexToken(indexConfig: IndexConfig | null) {
  const { provider, network } = useProvider();
  const wallet = useWallet();

  const contractAddress = indexConfig?.address ?? '';

  const senderAddr = useMemo(() => {
    return wallet.senderAddressObj ?? undefined;
  }, [wallet.senderAddressObj]);

  // SDK contract instances (for write operations)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexContract = useMemo((): any => {
    if (!contractAddress) return null;
    try {
      return getContract(hexToP2OP(contractAddress), IndexTokenAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [contractAddress, provider, network, senderAddr]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const motoContract = useMemo((): any => {
    if (!MOTO_TOKEN_ADDRESS) return null;
    try {
      return getContract(hexToP2OP(MOTO_TOKEN_ADDRESS), MotoTokenAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [provider, network, senderAddr]);

  // ── State ─────────────────────────────────────────────────────────
  const [components, setComponents] = useState<ComponentState[]>([]);
  const [totalSupply, setTotalSupply] = useState(0n);
  const [userBalance, setUserBalance] = useState(0n);
  const [motoBalance, setMotoBalance] = useState(0n);
  const [motoAllowance, setMotoAllowance] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!contractAddress) return;
    try {
      // Fetch component count and total supply in parallel
      const [count, supply] = await Promise.all([
        fetchComponentCount(contractAddress),
        fetchTotalSupply(contractAddress),
      ]);
      setTotalSupply(supply);

      // Fetch all components + holdings in parallel
      const compPromises = [];
      for (let i = 0; i < count; i++) {
        compPromises.push(
          Promise.all([
            fetchComponent(contractAddress, i),
            fetchHolding(contractAddress, i),
          ]),
        );
      }
      const compResults = await Promise.all(compPromises);

      const comps: ComponentState[] = compResults.map(([comp, holding]) => {
        const meta = TOKEN_META[comp.tokenAddress.toLowerCase()] ?? TOKEN_META[comp.tokenAddress];
        return {
          address: comp.tokenAddress,
          symbol: meta?.symbol ?? '???',
          name: meta?.name ?? 'Unknown',
          weight: comp.weight,
          holding,
        };
      });
      setComponents(comps);

      // Fetch user-specific data if connected
      if (wallet.isConnected && wallet.senderAddress) {
        const [userBal, motoBal, allowance] = await Promise.all([
          fetchBalanceOf(contractAddress, wallet.senderAddress),
          fetchMotoBalance(wallet.senderAddress),
          fetchAllowance(MOTO_TOKEN_ADDRESS, wallet.senderAddress, contractAddress),
        ]);
        setUserBalance(userBal);
        setMotoBalance(motoBal);
        setMotoAllowance(allowance);
      }
    } catch (err) {
      console.error('[useIndexToken]', err);
      setError((err as Error).message);
    } finally {
      setInitialLoading(false);
    }
  }, [contractAddress, wallet.isConnected, wallet.senderAddress]);

  useEffect(() => {
    if (!contractAddress) {
      setInitialLoading(false);
      return;
    }
    fetchData();
    intervalRef.current = setInterval(() => {
      fetchData().catch(console.error);
    }, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [contractAddress, fetchData]);

  // ── TX params (frontend: signer=null) ─────────────────────────────

  const txParams = useCallback(() => ({
    signer: null,
    mldsaSigner: null,
    refundTo: wallet.p2trAddress,
    maximumAllowedSatToSpend: 100_000n,
    network,
  }), [wallet, network]);

  // ── invest ────────────────────────────────────────────────────────

  const invest = useCallback(async (motoAmount: bigint): Promise<string | null> => {
    if (!indexContract || !motoContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setError(null);

    try {
      const MIN_INVEST = 10n * (10n ** 18n);
      if (motoAmount < MIN_INVEST) {
        setError(`Minimum investment is 10 MOTO. You entered ${formatMoto(motoAmount)}.`);
        return null;
      }

      if (motoBalance < motoAmount) {
        setError(`Insufficient MOTO. Have ${formatMoto(motoBalance)}, need ${formatMoto(motoAmount)}.`);
        return null;
      }

      // Check LP pools
      setLoadingStep('Checking liquidity pools...');
      const compAddresses = components.map(c => c.address);
      const missingPools = await checkMissingPools(MOTOSWAP_ROUTER_ADDRESS, compAddresses);
      if (missingPools.length > 0) {
        const names = missingPools.map(addr => {
          const meta = TOKEN_META[addr.toLowerCase()] || TOKEN_META[addr];
          return meta ? meta.symbol : addr.slice(0, 10) + '...';
        });
        setError(`No MotoSwap pool for ${names.join(', ')}. Cannot invest.`);
        return null;
      }

      const params = txParams();

      // Check allowance
      setLoadingStep('Checking allowance...');
      const currentAllowance = await fetchAllowance(
        MOTO_TOKEN_ADDRESS, wallet.senderAddress!, contractAddress,
      );
      const needsApprove = currentAllowance < motoAmount;

      // Step 1: Approve if needed
      if (needsApprove) {
        setLoadingStep('Step 1/2: Approving MOTO (one-time)...');
        const indexAddr = Address.fromString(contractAddress);
        // Unlimited approval
        const approveAmount = 2n ** 256n - 1n;

        const approveSim = await motoContract.increaseAllowance(indexAddr, approveAmount);
        if ('error' in approveSim) throw new Error(`Approval failed: ${approveSim.error}`);

        await approveSim.sendTransaction(params);

        // Poll until confirmed
        setLoadingStep('Waiting for approval to confirm...');
        const maxAttempts = 30;
        let confirmed = false;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          try {
            const polled = await fetchAllowance(
              MOTO_TOKEN_ADDRESS, wallet.senderAddress!, contractAddress,
            );
            if (polled >= motoAmount) {
              setMotoAllowance(polled);
              confirmed = true;
              break;
            }
          } catch { /* ignore */ }
          setLoadingStep(`Waiting for approval... (${i + 1})`);
        }

        if (!confirmed) {
          setError('Approval sent but not yet confirmed. Wait and try again.');
          return null;
        }
      }

      // Step 2: SDK simulate + send
      const stepPrefix = needsApprove ? 'Step 2/2: ' : '';
      setLoadingStep(`${stepPrefix}Purchasing ${indexConfig?.symbol ?? 'index'} tokens...`);
      const minShares = 0n;
      const investSim = await indexContract.invest(motoAmount, minShares);
      if ('error' in investSim) throw new Error(`Invest failed: ${investSim.error}`);

      const receipt = await investSim.sendTransaction(params);
      await fetchData();
      return receipt.transactionId;
    } catch (err) {
      console.error('[invest] ERROR:', err);
      const raw = (err as Error).message;
      if (raw.includes('Legacy public key')) {
        setError('Wallet missing legacy key. Disconnect and reconnect.');
      } else if (raw.includes('revert') || raw.includes('Reverted')) {
        setError(`Transaction reverted: ${raw.slice(0, 200)}`);
      } else {
        setError(raw.length > 200 ? raw.slice(0, 200) + '...' : raw);
      }
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [indexContract, motoContract, wallet, contractAddress, motoBalance, components, fetchData, txParams, indexConfig]);

  // ── redeem ────────────────────────────────────────────────────────

  const redeem = useCallback(async (shareAmount: bigint): Promise<string | null> => {
    if (!indexContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setLoadingStep(`Redeeming ${indexConfig?.symbol ?? 'index'} tokens...`);
    setError(null);
    try {
      const result = await indexContract.redeem(shareAmount);
      if (result.revert) throw new Error(`Redeem failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) {
      console.error('[redeem]', err);
      const raw = (err as Error).message;
      if (raw.includes('Insufficient')) setError('Insufficient shares.');
      else setError(raw.length > 150 ? raw.slice(0, 150) + '...' : raw);
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [indexContract, wallet, fetchData, txParams, indexConfig]);

  return {
    components,
    totalSupply,
    userBalance,
    motoBalance,
    motoAllowance,
    loading,
    loadingStep,
    initialLoading,
    error,
    invest,
    redeem,
    refresh: fetchData,
  };
}
