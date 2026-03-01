import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useExpertIndex } from '../hooks/useExpertIndex';
import { MOTO_DECIMALS, BASKET_DISPLAY_NAMES, BASKET_DECIMALS } from '../config/contracts';
import { fetchInvestorPosition } from '../utils/rawRpc';
import type { RawInvestorPosition } from '../utils/rawRpc';
import type { BasketSummary } from '../hooks/useExpertIndex';

interface HeldBasket {
  basket: BasketSummary;
  position: RawInvestorPosition;
}

export default function PortfolioPage() {
  const { isConnected, senderAddress } = useWallet();
  const { baskets, loading } = useExpertIndex();
  const [held, setHeld] = useState<HeldBasket[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !senderAddress || baskets.length === 0) {
      setHeld([]);
      return;
    }

    let cancelled = false;
    setPositionsLoading(true);

    (async () => {
      const activeBaskets = baskets.filter(b => b.active !== 0n);
      const results: HeldBasket[] = [];

      // Fetch positions in parallel
      const positions = await Promise.all(
        activeBaskets.map(b => fetchInvestorPosition(b.basketId, senderAddress))
      );

      for (let i = 0; i < activeBaskets.length; i++) {
        if (positions[i].shares > 0n) {
          results.push({ basket: activeBaskets[i], position: positions[i] });
        }
      }

      if (!cancelled) {
        setHeld(results);
        setPositionsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isConnected, senderAddress, baskets]);

  const formatNav = (value: bigint): string => {
    const divisor = 10n ** BigInt(MOTO_DECIMALS);
    const whole = value / divisor;
    const frac = value % divisor;
    if (frac === 0n) return whole.toLocaleString();
    return `${whole.toLocaleString()}.${frac.toString().padStart(MOTO_DECIMALS, '0').replace(/0+$/, '')}`;
  };

  const formatShares = (value: bigint): string => {
    const divisor = 10n ** BigInt(BASKET_DECIMALS);
    const whole = value / divisor;
    const frac = value % divisor;
    if (frac === 0n) return whole.toLocaleString();
    return `${whole.toLocaleString()}.${frac.toString().padStart(BASKET_DECIMALS, '0').replace(/0+$/, '')}`;
  };

  const formatBps = (bps: bigint): string => (Number(bps) / 100).toFixed(2) + '%';

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Your Portfolio
          </h1>
          <p className="text-dark-400 mb-8">
            Track your index positions and performance across all your investments.
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

  const isLoading = loading || positionsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-white mb-8">Your Portfolio</h1>

      {isLoading && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 mt-4">Loading your positions...</p>
        </div>
      )}

      {!isLoading && held.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg mb-4">No positions yet.</p>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">
            Browse Indexes
          </Link>
        </div>
      )}

      {!isLoading && held.length > 0 && (
        <div className="space-y-4">
          {held.map(({ basket, position }) => {
            const displayName = BASKET_DISPLAY_NAMES[basket.basketId.toString()] || basket.name;
            return (
              <Link
                key={basket.basketId.toString()}
                to={`/index/${basket.basketId}`}
                className="block bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-display font-bold text-white">{displayName}</h3>
                    <div className="flex gap-3 mt-2">
                      <span className="text-dark-400 text-sm">{basket.compCount.toString()} tokens</span>
                      <span className="text-dark-400 text-sm">Fee: {formatBps(basket.perfFeeBps)}</span>
                      <span className="text-dark-400 text-sm">{basket.investorCount.toString()} investors</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-bold text-white">{formatNav(basket.nav)}</div>
                    <div className="text-xs text-dark-500 mb-2">NAV (MOTO)</div>
                    <div className="text-sm font-mono text-green-500">{formatShares(position.shares)} shares</div>
                    <div className="text-xs text-dark-500">{formatNav(position.costBasis)} MOTO cost basis</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
