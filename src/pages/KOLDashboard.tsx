import { Link } from 'react-router-dom';
import { MOCK_EXPERT_INDEXES } from '../config/mockIndexes';

const formatUSD = (num: number) => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num}`;
};

const formatPercentage = (num: number) => {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

export default function ExpertDashboard() {
  const totalTVL = MOCK_EXPERT_INDEXES.reduce((s, e) => s + e.tvl, 0);
  const totalInvestors = MOCK_EXPERT_INDEXES.reduce((s, e) => s + e.investors, 0);

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
            <div className="text-2xl font-display font-bold text-white">{MOCK_EXPERT_INDEXES.length}</div>
            <div className="text-dark-500 text-xs mt-1">Experts</div>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">{formatUSD(totalTVL)}</div>
            <div className="text-dark-500 text-xs mt-1">Total TVL</div>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">{totalInvestors.toLocaleString()}</div>
            <div className="text-dark-500 text-xs mt-1">Total Investors</div>
          </div>
        </div>
      </div>

      {/* Expert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_EXPERT_INDEXES.map((expert) => {
          const isLive = Boolean(expert.onChainBasketId);
          const linkTo = isLive ? `/index/${expert.onChainBasketId}` : `/index/expert-${expert.id}`;

          return (
            <Link
              key={expert.id}
              to={linkTo}
              className="block group"
            >
              <div className={`bg-dark-800 border rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 ${
                isLive ? 'border-green-500/30' : 'border-dark-700'
              }`}>
                {/* Expert Header with PFP */}
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={expert.avatar}
                    alt={expert.creator}
                    className="w-14 h-14 rounded-full object-cover border-2 border-bitcoin-500/30 group-hover:border-bitcoin-500 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors truncate">
                        {expert.name}
                      </h3>
                      {isLive ? (
                        <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20 shrink-0">
                          Live
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-dark-600 text-dark-400 text-xs font-medium rounded border border-dark-600 shrink-0">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-bitcoin-500 text-sm font-medium">{expert.creator}</p>
                  </div>
                  <div className={`text-xl font-bold ${expert.performance.month >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(expert.performance.month)}
                  </div>
                </div>

                <p className="text-dark-300 text-sm mb-4">{expert.description}</p>

                {/* Component pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {expert.components.map((comp) => (
                    <span key={comp.symbol} className="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded font-mono">
                      {comp.symbol} {comp.weight}%
                    </span>
                  ))}
                </div>

                {/* Performance row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: '24H', val: expert.performance.day },
                    { label: '7D', val: expert.performance.week },
                    { label: '30D', val: expert.performance.month },
                    { label: '1Y', val: expert.performance.year },
                  ].map((p) => (
                    <div key={p.label} className="text-center">
                      <div className="text-dark-500 text-xs">{p.label}</div>
                      <div className={`text-sm font-mono font-semibold ${p.val >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercentage(p.val)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-dark-700">
                  <div>
                    <div className="text-dark-500 text-xs">TVL</div>
                    <div className="text-white font-semibold text-sm">{formatUSD(expert.tvl)}</div>
                  </div>
                  <div>
                    <div className="text-dark-500 text-xs">Perf Fee</div>
                    <div className="text-white font-semibold text-sm">{expert.performanceFee}%</div>
                  </div>
                  <div>
                    <div className="text-dark-500 text-xs">Investors</div>
                    <div className="text-white font-semibold text-sm">{expert.investors}</div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
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
