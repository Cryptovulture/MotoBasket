import { Link } from 'react-router-dom';
import { useExpertIndex } from '../hooks/useExpertIndex';
import { useBasketComponents } from '../hooks/useBasketComponents';
import { BASKET_DISPLAY_NAMES, EXPERT_BASKETS } from '../config/contracts';
import type { BasketSummary } from '../hooks/useExpertIndex';

const EXPERT_IDS = new Set([8n, 9n, 10n, 11n, 12n]);

const TOKEN_COLORS: Record<string, string> = {
  MOTO: 'from-green-500 to-emerald-500',
  NEBL: 'from-blue-500 to-cyan-500',
  CPHR: 'from-purple-500 to-indigo-500',
  VRTX: 'from-orange-500 to-red-500',
  NRNA: 'from-violet-500 to-purple-500',
  SYNP: 'from-cyan-500 to-blue-500',
  CRTX: 'from-indigo-500 to-violet-500',
  DPLR: 'from-blue-400 to-indigo-500',
  PEEP: 'from-green-400 to-lime-500',
  DGEN: 'from-yellow-500 to-orange-500',
  BONQ: 'from-orange-400 to-amber-500',
  SHBA: 'from-red-400 to-orange-500',
  LNDB: 'from-teal-500 to-cyan-500',
  YLDP: 'from-emerald-500 to-teal-500',
  SWPX: 'from-sky-500 to-blue-500',
  MNGO: 'from-orange-400 to-yellow-500',
  APPL: 'from-red-500 to-green-500',
  AVDO: 'from-green-500 to-lime-500',
  BERY: 'from-purple-500 to-pink-500',
};

function formatNAV(value: bigint): string {
  const num = Number(value) / 1e8;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  if (num > 0) return num.toFixed(2);
  return '--';
}

function ExpertCard({ basket }: { basket: BasketSummary }) {
  const components = useBasketComponents(basket.basketId, basket.compCount);
  const expertMeta = EXPERT_BASKETS[basket.basketId.toString()];
  const displayName = BASKET_DISPLAY_NAMES[basket.basketId.toString()] || basket.name || `Index #${basket.basketId}`;
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <Link to={`/index/${basket.basketId}`} className="block group">
      <div className="bg-dark-800 border border-green-500/30 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1">
        {/* Expert Header with PFP */}
        <div className="flex items-center space-x-4 mb-4">
          {expertMeta && (
            <img
              src={expertMeta.avatar}
              alt={expertMeta.creator}
              className="w-14 h-14 rounded-full object-cover border-2 border-bitcoin-500/30 group-hover:border-bitcoin-500 transition-colors"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors truncate">
                {displayName}
              </h3>
              <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20 shrink-0">
                Live
              </span>
            </div>
            {expertMeta && (
              <p className="text-bitcoin-500 text-sm font-medium">{expertMeta.creator}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">{formatNAV(basket.nav)}</div>
            <div className="text-xs text-dark-500">NAV</div>
          </div>
        </div>

        {expertMeta && (
          <p className="text-dark-300 text-sm mb-4">{expertMeta.description}</p>
        )}

        {/* Component pills */}
        {components.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {components.map((comp) => {
              const pct = totalWeight > 0 ? Math.round((comp.weight / totalWeight) * 100) : 0;
              const gradient = TOKEN_COLORS[comp.symbol] || 'from-gray-500 to-gray-600';
              return (
                <span
                  key={comp.token}
                  className="flex items-center gap-2 px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded font-mono"
                >
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
                  {comp.symbol} {pct}%
                </span>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-dark-700">
          <div>
            <div className="text-dark-500 text-xs">TVL</div>
            <div className="text-white font-semibold text-sm">{formatNAV(basket.nav)} MOTO</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs">Perf Fee</div>
            <div className="text-white font-semibold text-sm">{(Number(basket.perfFeeBps) / 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs">Investors</div>
            <div className="text-white font-semibold text-sm">{Number(basket.investorCount) > 0 ? basket.investorCount.toString() : '--'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ExpertDashboard() {
  const { baskets, loading, error } = useExpertIndex();
  const expertBaskets = baskets.filter(b => EXPERT_IDS.has(b.basketId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-white mb-2">Expert Indexes</h1>
        <p className="text-dark-400 text-lg mb-8">
          Follow top traders and invest in their curated baskets. One click, instant diversification.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-xl">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">{expertBaskets.length || '--'}</div>
            <div className="text-dark-500 text-xs mt-1">Experts</div>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">
              {expertBaskets.length > 0
                ? formatNAV(expertBaskets.reduce((s, b) => s + b.nav, 0n))
                : '--'}
            </div>
            <div className="text-dark-500 text-xs mt-1">Total TVL (MOTO)</div>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">
              {expertBaskets.length > 0
                ? expertBaskets.reduce((s, b) => s + Number(b.investorCount), 0).toString()
                : '--'}
            </div>
            <div className="text-dark-500 text-xs mt-1">Total Investors</div>
          </div>
        </div>
      </div>

      {loading && expertBaskets.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 mt-4">Loading expert indexes...</p>
        </div>
      )}

      {!loading && error && expertBaskets.length === 0 && (
        <div className="text-center py-16">
          <p className="text-red-400 text-sm mb-2 font-mono">RPC Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Expert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expertBaskets.map((basket) => (
          <ExpertCard key={basket.basketId.toString()} basket={basket} />
        ))}
      </div>

      {/* Bottom info */}
      <div className="mt-12 bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-display font-bold text-white mb-2">Want to become an Expert?</h2>
        <p className="text-dark-400 text-sm max-w-lg mx-auto">
          Create and manage your own expert indexes on MotoBasket.
          Performance fees go directly to the index creator.
        </p>
      </div>
    </div>
  );
}
