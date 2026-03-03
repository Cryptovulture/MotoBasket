import { useState } from 'react';
import { Card, CardBody } from '../components/ui/Card';
import { useWallet } from '../hooks/useWallet';
import { useTxTracker, type TrackedTx } from '../hooks/useTxTracker';
import { getIndexByAddress } from '../config/indexes';
import { EXPLORER_TX_URL } from '../config/network';
import { clsx } from 'clsx';

type Filter = 'all' | 'invest' | 'redeem';

export function HistoryPage() {
  const { connected } = useWallet();
  const { txs } = useTxTracker();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? txs : txs.filter((tx) => tx.type === filter);

  if (!connected) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-3">Transaction History</h1>
        <p className="text-dark-400">Connect your wallet to view transaction history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">Transaction History</h1>
        <div className="flex rounded-lg bg-dark-800 p-1 text-sm">
          {(['all', 'invest', 'redeem'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-md capitalize transition-colors',
                filter === f ? 'bg-dark-600 text-white' : 'text-dark-400',
              )}
            >
              {f === 'all' ? 'All' : f === 'invest' ? 'Buys' : 'Sells'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-dark-400">
            No transactions yet.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <TxRow key={tx.txid} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: TrackedTx }) {
  const index = getIndexByAddress(tx.indexAddress);
  return (
    <Card className="px-5 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              tx.type === 'invest' ? 'bg-emerald-500' : 'bg-red-400',
            )}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">{tx.type}</span>
              {index && (
                <span className="text-xs text-dark-400">{index.symbol}</span>
              )}
            </div>
            <a
              href={`${EXPLORER_TX_URL}${tx.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-dark-500 hover:text-dark-300"
            >
              {tx.txid.slice(0, 16)}...
            </a>
          </div>
        </div>
        <div className="text-right text-xs text-dark-500">
          {new Date(tx.timestamp).toLocaleString()}
        </div>
      </div>
    </Card>
  );
}
