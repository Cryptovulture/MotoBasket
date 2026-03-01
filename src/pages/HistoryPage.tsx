import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { EXPLORER_TX_URL } from '../config/contracts';
import {
  refreshPendingTxs,
  statusBadge,
  txTypeLabel,
  basketName,
  timeAgo,
  type TrackedTx,
} from '../utils/txHistory';

export default function HistoryPage() {
  const { isConnected } = useWallet();
  const [txs, setTxs] = useState<TrackedTx[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    let cancelled = false;
    setChecking(true);

    // Re-check pending TXs against RPC, auto-expire stale ones, then load
    refreshPendingTxs().then(all => {
      if (!cancelled) {
        setTxs(all);
        setChecking(false);
      }
    }).catch(() => {
      if (!cancelled) setChecking(false);
    });

    return () => { cancelled = true; };
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Transaction History
          </h1>
          <p className="text-dark-400 mb-8">
            View all your transactions across every index.
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-dark-800 border border-dark-700 rounded-lg">
            <svg className="w-5 h-5 text-bitcoin-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white font-medium">Connect Wallet to View</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-white mb-8">Transaction History</h1>

      {checking && txs.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 mt-4">Checking transaction statuses...</p>
        </div>
      )}

      {!checking && txs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg mb-4">No transactions yet.</p>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">
            Browse Indexes
          </Link>
        </div>
      )}

      {txs.length > 0 && (
        <div className="space-y-2">
          {txs.map((tx) => {
            const badge = statusBadge(tx.status);
            return (
              <div key={tx.txId + tx.timestamp} className="flex items-center justify-between py-3 px-4 bg-dark-800 border border-dark-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    tx.type === 'invest' ? 'bg-green-500/10 text-green-400' :
                    tx.type === 'withdraw' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {txTypeLabel(tx.type)}
                  </span>
                  <span className="text-dark-300 text-sm font-mono">{tx.amount}</span>
                  {tx.basketId && (
                    <Link
                      to={`/index/${tx.basketId}`}
                      className="text-dark-500 text-xs hover:text-bitcoin-500 transition-colors"
                    >
                      {basketName(tx.basketId)}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={EXPLORER_TX_URL + tx.txId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bitcoin-500 text-xs font-mono underline hover:text-bitcoin-400 transition-colors"
                  >
                    {tx.txId.slice(0, 16)}...
                  </a>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}
                    title={tx.revertReason || undefined}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label}
                  </span>
                  {tx.status === 'reverted' && tx.revertReason && (
                    <span className="text-red-400/70 text-xs max-w-[200px] truncate" title={tx.revertReason}>
                      {tx.revertReason}
                    </span>
                  )}
                  <span className="text-dark-400 text-xs whitespace-nowrap" title={new Date(tx.timestamp).toLocaleString()}>
                    {timeAgo(tx.timestamp)}
                  </span>
                  <span className="text-dark-600 text-xs">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
