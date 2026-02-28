import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
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
  fetchAllowance,
  simulateAndGetRevert,
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
  const [motoAllowance, setMotoAllowance] = useState(0n);
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
          const [motoBal, allowance] = await Promise.all([
            fetchMotoBalance(wallet.senderAddress),
            fetchAllowance(MOTO_TOKEN_ADDRESS, wallet.senderAddress, EXPERT_INDEX_ADDRESS),
          ]);
          setMotoBalance(motoBal);
          setMotoAllowance(allowance);
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

  // ---------------------------------------------------------------------------
  // invest() — TX-chained approve + invest in one click
  //
  // Follows the OPNet TX Chaining pattern:
  //   1. Simulate increaseAllowance → send → capture newUTXOs + accessList
  //   2. Forward accessList to ExpertIndex contract via setAccessList()
  //   3. Simulate invest (now sees the pending allowance)
  //   4. Send invest with utxos from step 1 (UTXO dependency chain)
  //
  // If the user already has sufficient on-chain allowance, skip straight to
  // the invest simulation (single TX, no chaining needed).
  // ---------------------------------------------------------------------------

  const invest = useCallback(async (motoAmount: bigint): Promise<string | null> => {
    if (!contract || !baseTokenContract || !wallet.isConnected) {
      setError('Wallet not connected');
      return null;
    }
    setLoading(true);
    setError(null);

    try {
      const params = txParams();
      const needsApprove = motoAllowance < motoAmount;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let approveNewUTXOs: any[] | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let approveAccessList: any;

      // ── STEP 1: Approve (if needed) ─────────────────────────────────
      if (needsApprove) {
        setLoadingStep('Approving MOTO...');
        const expertIndexAddr = Address.fromString(EXPERT_INDEX_ADDRESS);
        const approveAmount = motoAmount > 2n ** 128n - 1n ? motoAmount : 2n ** 128n - 1n;

        const approveSim = await baseTokenContract.increaseAllowance(expertIndexAddr, approveAmount);
        if (approveSim.revert) throw new Error(`Approval reverted: ${approveSim.revert}`);

        const approveReceipt = await approveSim.sendTransaction(params);
        approveNewUTXOs = approveReceipt.newUTXOs;
        approveAccessList = approveSim.accessList;
      }

      // ── STEP 2: Pre-flight raw RPC simulation ───────────────────────
      // The SDK throws a buffer error instead of surfacing the revert when
      // WASM aborts (env_exit → 1-byte result). Use raw RPC to check first
      // and get the actual revert message if the invest would fail.
      setLoadingStep('Simulating invest...');

      const senderHex = wallet.senderAddress;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const senderLegacy = (() => { try { return (senderAddr as any)?.tweakedToHex?.(); } catch { return undefined; } })();

      const encU256 = (v: bigint) => v.toString(16).padStart(64, '0');
      // invest(uint256,uint256,uint256) — SHA256 selector
      const investCalldata = 'a478629a' + encU256(basketId) + encU256(motoAmount) + encU256(0n);

      const revertMsg = await simulateAndGetRevert(
        EXPERT_INDEX_ADDRESS,
        investCalldata,
        senderHex,
        senderLegacy,
        needsApprove ? {
          simulatedTransaction: { inputs: [], outputs: [] },
          accessList: approveAccessList,
        } : undefined,
      );

      if (revertMsg) {
        // Surface the actual revert reason instead of a cryptic buffer error
        setError(`Contract reverted: ${revertMsg.slice(0, 250)}`);
        return null;
      }

      // ── STEP 3: SDK simulation + send ───────────────────────────────
      setLoadingStep('Investing...');

      // Forward approve state to SDK simulation
      if (needsApprove) {
        if (approveAccessList) contract.setAccessList(approveAccessList);
        contract.setTransactionDetails({ inputs: [], outputs: [] });
      }

      const minShares = 0n;
      const investSim = await contract.invest(basketId, motoAmount, minShares);
      if (investSim.revert) throw new Error(`Invest reverted: ${investSim.revert}`);

      // Chain UTXOs from approve TX if we did one
      const investParams = { ...params };
      if (approveNewUTXOs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (investParams as any).utxos = approveNewUTXOs;
      }

      const investReceipt = await investSim.sendTransaction(investParams);
      await fetchData();
      return investReceipt.transactionId;
    } catch (err) {
      console.error('[invest] ERROR:', err);
      const raw = (err as Error).message;
      if (raw.includes('buffer') || raw.includes('beyond')) {
        // SDK threw buffer error despite pre-flight — extract what we can
        setError('Transaction failed. The contract reverted but the error details could not be decoded.');
      } else if (raw.includes('Insufficient') || raw.includes('allowance')) {
        setError('Insufficient MOTO balance or allowance issue.');
      } else if (raw.includes('Legacy public key')) {
        setError('Wallet missing legacy public key. Disconnect and reconnect.');
      } else if (raw.includes('revert') || raw.includes('Reverted') || raw.includes('calling function')) {
        setError(`Transaction reverted: ${raw.slice(0, 200)}`);
      } else {
        setError(raw.length > 200 ? raw.slice(0, 200) + '...' : raw);
      }
      return null;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [contract, baseTokenContract, wallet, senderAddr, network, basketId, motoAllowance, fetchData, txParams]);

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
    motoAllowance,
    loading, loadingStep, initialLoading, error,
    invest, withdraw,
    scheduleRebalance, executeRebalance, collectPerfFee, returnCreatorLock,
    refresh: fetchData,
  };
}
