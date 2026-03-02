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

// ── Hook return type ────────────────────────────────────────────────

export interface UseIndexTokenReturn {
  components: ComponentState[];
  totalSupply: bigint;
  userBalance: bigint;
  motoBalance: bigint;
  motoAllowance: bigint;
  loading: boolean;
  loadingStep: string;
  /** Current step number during invest (0 = idle, 1 = approving, 2 = investing) */
  currentStep: number;
  /** Total steps for current operation */
  totalSteps: number;
  initialLoading: boolean;
  error: string | null;
  /** Last successful invest TX id */
  lastTxId: string | null;
  invest: (motoAmount: bigint) => Promise<string | null>;
  redeem: (shareAmount: bigint) => Promise<string | null>;
  refresh: () => Promise<void>;
  /** Check if MOTO allowance covers the given amount */
  needsApproval: (amount: bigint) => boolean;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useIndexToken(indexConfig: IndexConfig | null): UseIndexTokenReturn {
  const { provider, network } = useProvider();
  const wallet = useWallet();

  const contractAddress = indexConfig?.address ?? '';

  const senderAddr = useMemo(() => {
    return wallet.senderAddressObj ?? undefined;
  }, [wallet.senderAddressObj]);

  // SDK contract instances (for write operations)
  const indexContract = useMemo((): ReturnType<typeof getContract> | null => {
    if (!contractAddress) return null;
    try {
      return getContract(hexToP2OP(contractAddress), IndexTokenAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [contractAddress, provider, network, senderAddr]);

  const motoContract = useMemo((): ReturnType<typeof getContract> | null => {
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
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
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

  // ── Helper: check if approval needed ─────────────────────────────

  const needsApproval = useCallback((amount: bigint): boolean => {
    return motoAllowance < amount;
  }, [motoAllowance]);

  // ── TX params (frontend: signer=null, wallet signs) ──────────────

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
    setLastTxId(null);

    try {
      const MIN_INVEST = 10n * (10n ** 18n);
      if (motoAmount < MIN_INVEST) {
        setError(`Minimum investment is 10 MOTO. You entered ${formatMoto(motoAmount)}.`);
        return null;
      }

      if (motoBalance < motoAmount) {
        setError(`Insufficient MOTO. Have ${formatMotoDisplay(motoBalance)}, need ${formatMotoDisplay(motoAmount)}.`);
        return null;
      }

      // Check LP pools first
      setLoadingStep('Verifying liquidity pools...');
      setCurrentStep(0);
      setTotalSteps(0);
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

      // Check allowance
      const currentAllowance = await fetchAllowance(
        MOTO_TOKEN_ADDRESS, wallet.senderAddress!, contractAddress,
      );
      const approvalNeeded = currentAllowance < motoAmount;
      const steps = approvalNeeded ? 2 : 1;
      setTotalSteps(steps);

      const params = txParams();

      // Step 1: Approve if needed
      if (approvalNeeded) {
        setCurrentStep(1);
        setLoadingStep('Approve MOTO spending in your wallet...');

        // Create address for the spender param
        const indexAddr = Address.fromString(contractAddress);
        const approveAmount = 2n ** 256n - 1n;

        const approveSim = await (motoContract as any).increaseAllowance(indexAddr, approveAmount);
        if (approveSim && 'error' in approveSim) {
          throw new Error(`Approval simulation failed: ${approveSim.error}`);
        }

        setLoadingStep('Confirm approval in your wallet...');
        await approveSim.sendTransaction(params);

        // Poll until approval is confirmed on-chain
        setLoadingStep('Waiting for approval confirmation...');
        const maxAttempts = 60; // 5 minutes
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
          } catch { /* ignore polling errors */ }
          setLoadingStep(`Waiting for approval... (${i + 1}/${maxAttempts})`);
        }

        if (!confirmed) {
          setError('Approval sent but not yet confirmed on-chain. Please wait for it to confirm, then try again.');
          return null;
        }
      }

      // Step 2: Invest
      setCurrentStep(steps);
      setLoadingStep('Simulating investment...');

      const minShares = 0n;
      const investSim = await (indexContract as any).invest(motoAmount, minShares);
      if (investSim && 'error' in investSim) {
        throw new Error(`Invest simulation failed: ${investSim.error}`);
      }

      setLoadingStep('Confirm investment in your wallet...');
      const receipt = await investSim.sendTransaction(params);
      const txId = receipt.transactionId || receipt.txid || receipt.hash || '';

      setLastTxId(txId);
      setLoadingStep('Investment submitted! Refreshing data...');

      // Refresh balances
      await fetchData();
      return txId;
    } catch (err) {
      console.error('[invest] ERROR:', err);
      const raw = (err as Error).message || String(err);

      if (raw.includes('Legacy public key')) {
        setError('Wallet missing legacy key. Disconnect and reconnect your wallet.');
      } else if (raw.includes('User rejected') || raw.includes('user rejected') || raw.includes('denied')) {
        setError('Transaction was rejected in wallet.');
      } else if (raw.includes('revert') || raw.includes('Reverted') || raw.includes('REVERT')) {
        // Extract meaningful revert reason
        const match = raw.match(/(?:revert(?:ed)?:?\s*)(.*)/i);
        setError(match ? `Contract reverted: ${match[1].slice(0, 200)}` : `Transaction reverted: ${raw.slice(0, 200)}`);
      } else if (raw.includes('insufficient') || raw.includes('Insufficient')) {
        setError('Insufficient balance or gas. Check your MOTO and BTC balances.');
      } else {
        setError(raw.length > 300 ? raw.slice(0, 300) + '...' : raw);
      }
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
      setCurrentStep(0);
      setTotalSteps(0);
    }
  }, [indexContract, motoContract, wallet, contractAddress, motoBalance, components, fetchData, txParams, indexConfig]);

  // ── redeem ────────────────────────────────────────────────────────

  const redeem = useCallback(async (shareAmount: bigint): Promise<string | null> => {
    if (!indexContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setLoadingStep('Simulating redemption...');
    setCurrentStep(1);
    setTotalSteps(1);
    setError(null);
    setLastTxId(null);
    try {
      const result = await (indexContract as any).redeem(shareAmount);

      // Check for simulation errors (SDK returns { error: string } on failure)
      if (result && 'error' in result) {
        throw new Error(`Redeem simulation failed: ${result.error}`);
      }

      setLoadingStep('Confirm redemption in your wallet...');
      const receipt = await result.sendTransaction(txParams());
      const txId = receipt.transactionId || receipt.txid || receipt.hash || '';
      setLastTxId(txId);

      setLoadingStep('Redemption submitted! Refreshing data...');
      await fetchData();
      return txId;
    } catch (err) {
      console.error('[redeem]', err);
      const raw = (err as Error).message || String(err);
      if (raw.includes('User rejected') || raw.includes('denied')) {
        setError('Transaction was rejected in wallet.');
      } else if (raw.includes('Insufficient') || raw.includes('insufficient')) {
        setError('Insufficient shares to redeem.');
      } else {
        setError(raw.length > 200 ? raw.slice(0, 200) + '...' : raw);
      }
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
      setCurrentStep(0);
      setTotalSteps(0);
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
    currentStep,
    totalSteps,
    initialLoading,
    error,
    lastTxId,
    invest,
    redeem,
    refresh: fetchData,
    needsApproval,
  };
}
