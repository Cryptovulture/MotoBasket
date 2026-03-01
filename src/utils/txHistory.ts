/**
 * Shared TX history types, helpers, and localStorage persistence.
 * Used by IndexDetailPage (per-basket) and HistoryPage (all baskets).
 */

import { BASKET_DISPLAY_NAMES } from '../config/contracts';
import { fetchTransactionReceipt } from './rawRpc';

// ── Types ────────────────────────────────────────────────────────────

export type TxStatus = 'pending' | 'confirmed' | 'reverted';

export interface TrackedTx {
  txId: string;
  type: 'invest' | 'withdraw' | 'rebalance' | 'fee';
  amount: string;
  timestamp: number;
  status: TxStatus;
  /** basketId string — set when loading across all baskets */
  basketId?: string;
  /** Revert reason from receipt, if available */
  revertReason?: string;
}

// ── LocalStorage helpers ─────────────────────────────────────────────

const LS_PREFIX = 'motobasket_txhist_';

export function lsKey(basketId: bigint): string {
  return `${LS_PREFIX}${basketId}`;
}

export function loadTxHistory(basketId: bigint): TrackedTx[] {
  try {
    const raw = localStorage.getItem(lsKey(basketId));
    if (!raw) return [];
    return JSON.parse(raw) as TrackedTx[];
  } catch {
    return [];
  }
}

export function saveTxHistory(basketId: bigint, txs: TrackedTx[]) {
  try {
    // Keep last 20
    localStorage.setItem(lsKey(basketId), JSON.stringify(txs.slice(0, 20)));
  } catch { /* quota exceeded */ }
}

/** Scan all localStorage keys to merge TX history across all baskets */
export function loadAllTxHistory(): TrackedTx[] {
  const all: TrackedTx[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LS_PREFIX)) continue;
    const basketId = key.slice(LS_PREFIX.length);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const txs = JSON.parse(raw) as TrackedTx[];
      for (const tx of txs) {
        all.push({ ...tx, basketId });
      }
    } catch { /* skip malformed */ }
  }
  // Sort newest first
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all;
}

// ── Display helpers ──────────────────────────────────────────────────

export function statusBadge(status: TxStatus) {
  switch (status) {
    case 'pending':
      return {
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        dotClass: 'bg-yellow-400 animate-pulse',
        label: 'Pending',
      };
    case 'confirmed':
      return {
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
        dotClass: 'bg-green-400',
        label: 'Confirmed',
      };
    case 'reverted':
      return {
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
        dotClass: 'bg-red-400',
        label: 'Reverted',
      };
  }
}

export function txTypeLabel(type: TrackedTx['type']): string {
  switch (type) {
    case 'invest': return 'Buy';
    case 'withdraw': return 'Sell';
    case 'rebalance': return 'Rebalance';
    case 'fee': return 'Fee';
  }
}

export function basketName(basketId: string): string {
  return BASKET_DISPLAY_NAMES[basketId] || `Index #${basketId}`;
}

/** Human-readable relative time, e.g. "3m ago", "2h ago" */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Max age (ms) before a pending TX is auto-marked as expired */
const PENDING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Re-check all pending TXs: fetch receipt from RPC, update localStorage.
 * TXs pending longer than 30 min with no receipt are marked "reverted" (dropped).
 * Returns the refreshed full list.
 */
export async function refreshPendingTxs(): Promise<TrackedTx[]> {
  const allByKey: Map<string, TrackedTx[]> = new Map();

  // Gather all tx history by localStorage key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LS_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      allByKey.set(key, JSON.parse(raw) as TrackedTx[]);
    } catch { /* skip */ }
  }

  const now = Date.now();

  for (const [key, txs] of allByKey) {
    let changed = false;
    for (let i = 0; i < txs.length; i++) {
      if (txs[i].status !== 'pending') continue;

      // Try RPC receipt
      try {
        const receipt = await fetchTransactionReceipt(txs[i].txId);
        if (receipt) {
          const isConfirmed = receipt.events.length > 0;
          const revertReason = !isConfirmed && receipt.revert ? receipt.revert : undefined;
          txs[i] = {
            ...txs[i],
            status: isConfirmed ? 'confirmed' : 'reverted',
            revertReason: revertReason || txs[i].revertReason,
          };
          changed = true;
          continue;
        }
      } catch { /* ignore */ }

      // No receipt — if older than 30 min, mark expired (TX dropped from mempool)
      if (now - txs[i].timestamp > PENDING_EXPIRY_MS) {
        txs[i] = { ...txs[i], status: 'reverted', revertReason: txs[i].revertReason || 'TX expired (no receipt after 30 min)' };
        changed = true;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(key, JSON.stringify(txs));
      } catch { /* ignore */ }
    }
  }

  // Return merged list
  return loadAllTxHistory();
}
