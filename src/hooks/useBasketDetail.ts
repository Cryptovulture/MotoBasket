import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getContract, MOTOSWAP_ROUTER_ABI } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useProvider } from './useProvider';
import { useWallet } from './useWallet';
import { ExpertIndexAbi } from '../abi/ExpertIndexAbi';
import { MotoTokenAbi } from '../abi/MotoTokenAbi';
import {
  EXPERT_INDEX_ADDRESS,
  BASKET_TOKEN_ADDRESS,
  MOTO_TOKEN_ADDRESS,
  BASKET_DECIMALS,
  MOTO_DECIMALS,
  INDEX_BASE_TOKEN,
  INDEX_BASE_DECIMALS,
  MOTOSWAP_ROUTER_ADDRESS,
} from '../config/contracts';
import { hexToP2OP } from '../utils/addressUtils';
import {
  fetchBasketInfo,
  fetchBasketName,
  fetchBasketNAV,
  fetchComponent,
  fetchBalanceOf,
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

/** Whether the contract's base token is already MOTO (true on mainnet). */
const BASE_IS_MOTO = INDEX_BASE_TOKEN.toLowerCase() === MOTO_TOKEN_ADDRESS.toLowerCase();

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

  // MOTO token contract (for MOTO approval when base != MOTO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const motoTokenContract = useMemo((): any => {
    if (BASE_IS_MOTO || !MOTO_TOKEN_ADDRESS) return null;
    try {
      return getContract(hexToP2OP(MOTO_TOKEN_ADDRESS), MotoTokenAbi, provider, network, senderAddr);
    } catch { return null; }
  }, [provider, network, senderAddr]);

  // MotoSwap Router (for MOTO→BASKET swap when base != MOTO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerContract = useMemo((): any => {
    if (BASE_IS_MOTO || !MOTOSWAP_ROUTER_ADDRESS) return null;
    try {
      return getContract(hexToP2OP(MOTOSWAP_ROUTER_ADDRESS), MOTOSWAP_ROUTER_ABI, provider, network, senderAddr);
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

  // --- Invest with MOTO ---
  // If base token IS MOTO: approve MOTO → invest (2 steps)
  // If base token is BASKET: approve MOTO on router → swap → approve BASKET → invest (4 steps)

  const invest = useCallback(async (motoAmount: bigint): Promise<string | null> => {
    if (!contract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setLoadingStep('Preparing transaction...');
    setError(null);

    try {
      if (BASE_IS_MOTO) {
        // Direct path: MOTO is the base token
        setLoadingStep('Step 1/2: Approving MOTO spend...');
        if (!baseTokenContract) throw new Error('MOTO contract not ready');
        const approve = await baseTokenContract.increaseAllowance(contract.address, motoAmount);
        if (approve.revert) throw new Error(`Approval failed: ${approve.revert}`);
        await approve.sendTransaction(txParams());

        setLoadingStep('Step 2/2: Investing in index...');
        // 5% slippage tolerance on shares received
        const minShares = motoAmount * 95n / 100n;
        const result = await contract.invest(basketId, motoAmount, minShares);
        if (result.revert) throw new Error(`Invest failed: ${result.revert}`);
        const receipt = await result.sendTransaction(txParams());
        await fetchData();
        return receipt.transactionId;
      } else {
        // Swap path: MOTO → BASKET → invest
        if (!motoTokenContract || !routerContract || !baseTokenContract) {
          throw new Error('Swap contracts not ready');
        }

        // Step 1: Approve MOTO on MotoSwap Router
        setLoadingStep('Step 1/4: Approving MOTO on DEX...');
        const approveRouter = await motoTokenContract.increaseAllowance(routerContract.address, motoAmount);
        if (approveRouter.revert) throw new Error(`MOTO approval failed: ${approveRouter.revert}`);
        await approveRouter.sendTransaction(txParams());

        // Step 2: Swap MOTO -> BASKET via MotoSwap
        setLoadingStep('Step 2/4: Swapping MOTO to BASKET...');
        const motoAddr = Address.fromString(MOTO_TOKEN_ADDRESS);
        const basketAddr = Address.fromString(BASKET_TOKEN_ADDRESS);
        const path = [motoAddr, basketAddr];
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const toAddr = senderAddr ?? wallet.senderAddressObj;
        // 3% slippage tolerance on swap
        const minSwapOut = motoAmount * 97n / 100n;
        const swap = await routerContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          motoAmount, minSwapOut, path, toAddr, deadline,
        );
        if (swap.revert) throw new Error(`Swap failed: ${swap.revert}`);
        await swap.sendTransaction(txParams());

        // Step 3: Check received BASKET and approve on ExpertIndex
        setLoadingStep('Step 3/4: Approving BASKET for investment...');
        // Fetch updated BASKET balance
        const newBasketBal = await fetchBalanceOf(BASKET_TOKEN_ADDRESS, wallet.senderAddress);
        const approveInvest = await baseTokenContract.increaseAllowance(contract.address, newBasketBal);
        if (approveInvest.revert) throw new Error(`BASKET approval failed: ${approveInvest.revert}`);
        await approveInvest.sendTransaction(txParams());

        // Step 4: Invest BASKET
        setLoadingStep('Step 4/4: Investing in index...');
        // 5% slippage tolerance on shares received
        const minSharesSwap = newBasketBal * 95n / 100n;
        const result = await contract.invest(basketId, newBasketBal, minSharesSwap);
        if (result.revert) throw new Error(`Invest failed: ${result.revert}`);
        const receipt = await result.sendTransaction(txParams());
        await fetchData();
        return receipt.transactionId;
      }
    } catch (err) {
      console.error('[invest]', err);
      const raw = (err as Error).message;
      // Make common errors more readable
      if (raw.includes('Insufficient')) setError('Insufficient balance. Check your MOTO balance.');
      else if (raw.includes('allowance')) setError('Token approval failed. Please try again.');
      else if (raw.includes('Swap failed')) setError('DEX swap failed. Pool may lack liquidity.');
      else if (raw.includes('revert') || raw.includes('Reverted')) setError(`Transaction reverted: ${raw.slice(0, 120)}`);
      else setError(raw.length > 150 ? raw.slice(0, 150) + '...' : raw);
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [contract, baseTokenContract, motoTokenContract, routerContract, wallet, network, basketId, fetchData, txParams]);

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
