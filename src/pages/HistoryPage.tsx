import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  loadAllTxHistory,
  refreshPendingTxs,
  statusBadge,
  txTypeLabel,
  indexName,
  timeAgo,
  type TrackedTx,
} from '../utils/txHistory';
import { INDEX_CONFIGS } from '../config/indexes';

export default function HistoryPage() {
  const { isConnected } = useWallet();
  const [txs, setTxs] = useState<TrackedTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'invest' | 'withdraw'>('all');

  useEffect(() => {
    setTxs(loadAllTxHistory());
    setLoading(true);
    refreshPendingTxs()
      .then(setTxs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? txs : txs.filter(t => t.type === filter);

  const pendingCount = txs.filter(t => t.status === 'pending').length;

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Transaction History
          </h1>
          <p className="text-dark-400 mb-8">
            View all your MotoBasket transactions across every index.
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-white">History</h1>
          {pendingCount > 0 && (
            <p className="text-yellow-400 text-sm mt-1">
              {pendingCount} pending transaction{pendingCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
          {(['all', 'invest', 'withdraw'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-bitcoin-500/20 text-bitcoin-500'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'invest' ? 'Buys' : 'Sells'}
            </button>
          ))}
        </div>
      </div>

      {loading && txs.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 mt-4">Checking transactions...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg mb-4">No transactions yet.</p>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">
            Browse Indexes to get started
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const badge = statusBadge(tx.status);
            const cfg = INDEX_CONFIGS.find(
              c => c.address === tx.indexKey || c.symbol === tx.indexKey,
            );
            return (
              <div
                key={tx.txId}
                className="bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-dark-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'invest'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'invest' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {txTypeLabel(tx.type)}
                        </span>
                        {cfg && (
                          <Link
                            to={`/index/${encodeURIComponent(cfg.address)}`}
                            className="text-bitcoin-500 hover:text-bitcoin-400 text-sm font-mono"
                          >
                            {cfg.symbol}
                          </Link>
                        )}
                        {!cfg && tx.indexKey && (
                          <span className="text-dark-500 text-sm font-mono">
                            {indexName(tx.indexKey)}
                          </span>
                        )}
                      </div>
                      <div className="text-dark-500 text-xs font-mono mt-0.5">
                        {tx.txId.slice(0, 16)}...{tx.txId.slice(-8)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-white font-mono text-sm">{tx.amount}</div>
                      <div className="text-dark-500 text-xs">{timeAgo(tx.timestamp)}</div>
                    </div>

                    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-medium ${badge.className}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>

                {tx.revertReason && (
                  <div className="mt-2 text-xs text-red-400/80 font-mono bg-red-500/5 rounded px-3 py-1.5">
                    {tx.revertReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
