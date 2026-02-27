import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getContract } from 'opnet';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { ExpertIndexAbi } from '../abi/ExpertIndexAbi';
import { MotoTokenAbi } from '../abi/MotoTokenAbi';
import {
  EXPERT_INDEX_ADDRESS,
  MOTO_TOKEN_ADDRESS,
  BASKET_DECIMALS,
  MOTO_DECIMALS,
  INDEX_BASE_TOKEN,
  INDEX_BASE_DECIMALS,
} from '../config/contracts';
import { hexToP2OP } from '../utils/addressUtils';
import {
  fetchBasketInfo,
  fetchBasketName,
  fetchBasketNAV,
  fetchComponent,
  fetchMotoBalance,
  fetchInvestorPosition,
} from '../utils/rawRpc';
import type { RawComponent } from '../utils/rawRpc';

export interface BasketInfo {
  creator: bigint;
  compCount: bigint;
  totalShares: bigint;
  totalMoto: bigint;
  perfFeeBps: bigint;
  createdAt: bigint;
  lockState: bigint;
  active: bigint;
  investorCount: bigint;
  shareToken: bigint;
}

export interface Component {
  token: bigint;
  weight: bigint;
  holding: bigint;
}

export interface InvestorPosition {
  shares: bigint;
  costBasis: bigint;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

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

export function formatBasket(value: bigint): string {
  return formatToken(value, BASKET_DECIMALS);
}

export function formatMoto(value: bigint): string {
  return formatToken(value, MOTO_DECIMALS);
}

export function formatBaseToken(value: bigint): string {
  return formatToken(value, INDEX_BASE_DECIMALS);
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

export function parseBasketInput(input: string): bigint {
  return parseTokenInput(input, BASKET_DECIMALS);
}

export function parseMotoInput(input: string): bigint {
  return parseTokenInput(input, MOTO_DECIMALS);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBasketDetail(basketId: bigint) {
  const { provider, network } = useProvider();
  const wallet = useWallet();

  // --- SDK contracts (WRITES only) ---

  // Use the Address object directly from WalletConnect (NOT reconstructed from string).
  // Address.fromString(hex) with one param lacks the legacy public key and breaks
  // downstream SDK calls with "Cannot use 'in' operator to search for 'equals'".
  const senderAddr = useMemo(() => {
    return wallet.senderAddressObj ?? undefined;
  }, [wallet.senderAddressObj]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = useMemo((): any => {
    if (!EXPERT_INDEX_ADDRESS) return null;
    try {
      return getContract(hexToP2OP(EXPERT_INDEX_ADDRESS), ExpertIndexAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [provider, network, senderAddr]);

  // Base token contract (MOTO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseTokenContract = useMemo((): any => {
    if (!INDEX_BASE_TOKEN) return null;
    try {
      return getContract(hexToP2OP(INDEX_BASE_TOKEN), MotoTokenAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [provider, network, senderAddr]);

  // --- State ---

  const [info, setInfo] = useState<BasketInfo | null>(null);
  const [name, setName] = useState('');
  const [nav, setNav] = useState(0n);
  const [components, setComponents] = useState<Component[]>([]);
  const [position, setPosition] = useState<InvestorPosition | null>(null);
  const [basketBalance, setBasketBalance] = useState(0n);
  const [motoBalance, setMotoBalance] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Data fetching (raw RPC reads) ---

  const fetchData = useCallback(async () => {
    if (basketId <= 0n) return;
    try {
      const [rawInfo, rawName, rawNav] = await Promise.all([
        fetchBasketInfo(basketId),
        fetchBasketName(basketId),
        fetchBasketNAV(basketId),
      ]);

      const basketInfo: BasketInfo = {
        creator: rawInfo.creator,
        compCount: rawInfo.compCount,
        totalShares: rawInfo.totalShares,
        totalMoto: rawInfo.totalMoto,
        perfFeeBps: rawInfo.perfFeeBps,
        createdAt: rawInfo.createdAt,
        lockState: rawInfo.lockState,
        active: rawInfo.active,
        investorCount: rawInfo.investorCount,
        shareToken: rawInfo.shareToken,
      };
      setInfo(basketInfo);
      setName(rawName);
      setNav(rawNav);

      const count = Number(basketInfo.compCount);
      const fetches: Promise<RawComponent>[] = [];
      for (let i = 0; i < count; i++) {
        fetches.push(fetchComponent(basketId, BigInt(i)));
      }
      const results = await Promise.all(fetches);
      const comps: Component[] = results.map(r => ({
        token: r.token,
        weight: r.weight,
        holding: r.holding,
      }));
      setComponents(comps);

      if (wallet.isConnected && wallet.senderAddress) {
        try {
          const pos = await fetchInvestorPosition(basketId, wallet.senderAddress);
          setPosition({ shares: pos.shares, costBasis: pos.costBasis });
        } catch (err) {
          console.error('[fetchPosition]', err);
        }

        try {
          const motoBal = await fetchMotoBalance(wallet.senderAddress);
          setMotoBalance(motoBal);
        } catch (err) {
          console.error('[fetchBalances]', err);
        }
      }
    } catch (err) {
      console.error('[useBasketDetail]', err);
      setError((err as Error).message);
    } finally {
      setInitialLoading(false);
    }
  }, [contract, baseTokenContract, basketId, wallet.isConnected, wallet.senderAddress]);

  useEffect(() => {
    if (basketId <= 0n) return;
    fetchData();
    intervalRef.current = setInterval(() => {
      fetchData().catch(console.error);
    }, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [basketId, fetchData]);

  // --- Transaction helpers ---

  const txParams = useCallback(() => ({
    signer: null,
    mldsaSigner: null,
    refundTo: wallet.p2trAddress,
    maximumAllowedSatToSpend: 100_000n,
    network,
  }), [wallet, network]);

  // --- Invest with MOTO (TX chaining: approve + invest in one flow) ---
  // Both TXs hit mempool simultaneously. Miner orders via UTXO dependency.

  const invest = useCallback(async (motoAmount: bigint): Promise<string | null> => {
    if (!contract || !baseTokenContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setLoadingStep('Preparing transaction...');
    setError(null);

    try {
      const expertIndexAddr = await contract.contractAddress;

      // TX 1: Approve MOTO spend on ExpertIndex contract
      setLoadingStep('Step 1/2: Approving MOTO...');
      const approve = await baseTokenContract.increaseAllowance(expertIndexAddr, motoAmount);
      if (approve.revert) throw new Error(`Approval failed: ${approve.revert}`);
      const approveReceipt = await approve.sendTransaction(txParams());

      // TX 2: Invest (chained — no block wait)
      setLoadingStep('Step 2/2: Investing...');
      // Forward state so simulation sees the allowance from TX 1
      contract.setTransactionDetails({ inputs: [], outputs: [] });
      const minShares = motoAmount * 95n / 100n;
      const result = await contract.invest(basketId, motoAmount, minShares);
      if (result.revert) throw new Error(`Invest failed: ${result.revert}`);
      // Chain: TX 2 spends TX 1's outputs — forces miner ordering
      const receipt = await result.sendTransaction({
        ...txParams(),
        utxos: approveReceipt.newUTXOs,
      });
      await fetchData();
      return receipt.transactionId;
    } catch (err) {
      console.error('[invest]', err);
      const raw = (err as Error).message;
      if (raw.includes('Insufficient')) setError('Insufficient balance. Check your MOTO balance.');
      else if (raw.includes('allowance')) setError('Token approval failed. Please try again.');
      else if (raw.includes('revert') || raw.includes('Reverted')) setError(`Transaction reverted: ${raw.slice(0, 120)}`);
      else if (raw.includes('buffer')) setError('Contract returned unexpected data. Try again.');
      else setError(raw.length > 150 ? raw.slice(0, 150) + '...' : raw);
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [contract, baseTokenContract, wallet, network, basketId, fetchData, txParams]);

  // --- Withdraw (returns base token MOTO) ---

  const withdraw = useCallback(async (shareAmount: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setLoadingStep('Withdrawing...');
    setError(null);
    try {
      // 5% slippage tolerance on base tokens returned
      const minBaseOut = shareAmount * 95n / 100n;
      const result = await contract.withdraw(basketId, shareAmount, minBaseOut);
      if (result.revert) throw new Error(`Withdraw failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) {
      console.error('[withdraw]', err);
      const raw = (err as Error).message;
      if (raw.includes('Insufficient')) setError('Insufficient shares. Check your share balance.');
      else if (raw.includes('revert') || raw.includes('Reverted')) setError(`Withdrawal reverted: ${raw.slice(0, 120)}`);
      else setError(raw.length > 150 ? raw.slice(0, 150) + '...' : raw);
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [contract, wallet, network, basketId, fetchData, txParams]);

  // --- Creator management ---

  const scheduleRebalance = useCallback(async (id: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) { setError('Wallet not connected'); return null; }
    setLoading(true); setError(null);
    try {
      const result = await contract.scheduleRebalance(id);
      if (result.revert) throw new Error(`Schedule rebalance failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) { console.error('[scheduleRebalance]', err); setError((err as Error).message); return null;
    } finally { setLoading(false); }
  }, [contract, wallet, network, fetchData, txParams]);

  const executeRebalance = useCallback(async (id: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) { setError('Wallet not connected'); return null; }
    setLoading(true); setError(null);
    try {
      const result = await contract.executeRebalance(id);
      if (result.revert) throw new Error(`Execute rebalance failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) { console.error('[executeRebalance]', err); setError((err as Error).message); return null;
    } finally { setLoading(false); }
  }, [contract, wallet, network, fetchData, txParams]);

  const collectPerfFee = useCallback(async (id: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) { setError('Wallet not connected'); return null; }
    setLoading(true); setError(null);
    try {
      const result = await contract.collectPerfFee(id);
      if (result.revert) throw new Error(`Collect fee failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) { console.error('[collectPerfFee]', err); setError((err as Error).message); return null;
    } finally { setLoading(false); }
  }, [contract, wallet, network, fetchData, txParams]);

  const returnCreatorLock = useCallback(async (id: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) { setError('Wallet not connected'); return null; }
    setLoading(true); setError(null);
    try {
      const result = await contract.returnCreatorLock(id);
      if (result.revert) throw new Error(`Return lock failed: ${result.revert}`);
      const receipt = await result.sendTransaction(txParams());
      await fetchData();
      return receipt.transactionId;
    } catch (err) { console.error('[returnCreatorLock]', err); setError((err as Error).message); return null;
    } finally { setLoading(false); }
  }, [contract, wallet, network, fetchData, txParams]);

  return {
    info, name, nav, components, position, basketBalance, motoBalance,
    loading, loadingStep, initialLoading, error,
    invest, withdraw, scheduleRebalance, executeRebalance, collectPerfFee, returnCreatorLock,
    refresh: fetchData,
  };
}
