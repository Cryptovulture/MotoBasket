import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'motobasket_txs';
const MAX_TXS = 100;

export interface TrackedTx {
  txid: string;
  type: 'invest' | 'redeem' | 'rebalance';
  indexAddress: string;
  amount: string;
  timestamp: number;
  confirmed?: boolean;
}

function loadTxs(): TrackedTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTxs(txs: TrackedTx[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.slice(0, MAX_TXS)));
}

export function useTxTracker() {
  const [txs, setTxs] = useState<TrackedTx[]>(loadTxs);

  useEffect(() => {
    saveTxs(txs);
  }, [txs]);

  const addTx = useCallback((tx: TrackedTx) => {
    setTxs((prev) => [tx, ...prev]);
  }, []);

  const markConfirmed = useCallback((txid: string) => {
    setTxs((prev) =>
      prev.map((tx) => (tx.txid === txid ? { ...tx, confirmed: true } : tx)),
    );
  }, []);

  const getTxsForIndex = useCallback(
    (indexAddress: string) => txs.filter((tx) => tx.indexAddress === indexAddress),
    [txs],
  );

  return { txs, addTx, markConfirmed, getTxsForIndex };
}
