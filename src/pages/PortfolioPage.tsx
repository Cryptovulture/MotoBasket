import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { INDEX_CONFIGS } from '../config/indexes';
import { fetchBalanceOf } from '../utils/rawRpc';
import { formatToken } from '../hooks/useIndexToken';
import { INDEX_DECIMALS } from '../config/contracts';

interface HeldIndex {
  symbol: string;
  name: string;
  address: string;
  balance: bigint;
  componentCount: number;
}

export default function PortfolioPage() {
  const { isConnected, senderAddress } = useWallet();
  const [held, setHeld] = useState<HeldIndex[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !senderAddress) {
      setHeld([]);
      return;
    }

    const deployed = INDEX_CONFIGS.filter(c => c.address);
    if (deployed.length === 0) {
      setHeld([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const balances = await Promise.all(
        deployed.map(c => fetchBalanceOf(c.address, senderAddress)),
      );

      if (cancelled) return;

      const results: HeldIndex[] = [];
      for (let i = 0; i < deployed.length; i++) {
        if (balances[i] > 0n) {
          results.push({
            symbol: deployed[i].symbol,
            name: deployed[i].name,
            address: deployed[i].address,
            balance: balances[i],
            componentCount: deployed[i].components.length,
          });
        }
      }
      setHeld(results);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isConnected, senderAddress]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Your Portfolio
          </h1>
          <p className="text-dark-400 mb-8">
            Track your index token holdings across all MotoBasket indexes.
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-dark-800 border border-dark-700 rounded-lg">
            <svg className="w-5 h-5 text-bitcoin-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-white font-medium">Connect Wallet to View</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-white mb-8">Your Portfolio</h1>

      {loading && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 mt-4">Loading your positions...</p>
        </div>
      )}

      {!loading && held.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg mb-4">No positions yet.</p>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">
            Browse Indexes
          </Link>
        </div>
      )}

      {!loading && held.length > 0 && (
        <div className="space-y-4">
          {held.map((idx) => (
            <Link
              key={idx.address}
              to={`/index/${encodeURIComponent(idx.address)}`}
              className="block bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-white">{idx.symbol}</h3>
                  <p className="text-dark-400 text-sm mt-1">{idx.name}</p>
                  <span className="text-dark-500 text-xs">{idx.componentCount} tokens</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-bold text-white">
                    {formatToken(idx.balance, INDEX_DECIMALS)}
                  </div>
                  <div className="text-xs text-dark-500">{idx.symbol} tokens</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
