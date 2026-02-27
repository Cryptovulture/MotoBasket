import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useExpertIndex } from '../hooks/useExpertIndex';
import { useBasketComponents } from '../hooks/useBasketComponents';
import type { BasketSummary } from '../hooks/useExpertIndex';
import { BASKET_DISPLAY_NAMES, EXPERT_BASKETS } from '../config/contracts';
import { MOCK_OFFICIAL_INDEXES, MOCK_EXPERT_INDEXES } from '../config/mockIndexes';

// Token color map for badges
const TOKEN_COLORS: Record<string, string> = {
  // Base
  MOTO: 'from-green-500 to-emerald-500',
  // On-chain
  NEBL: 'from-blue-500 to-cyan-500',
  CPHR: 'from-purple-500 to-indigo-500',
  VRTX: 'from-orange-500 to-red-500',
  // AI
  NRNA: 'from-violet-500 to-purple-500',
  SYNP: 'from-cyan-500 to-blue-500',
  CRTX: 'from-indigo-500 to-violet-500',
  DPLR: 'from-blue-400 to-indigo-500',
  // Meme
  PEEP: 'from-green-400 to-lime-500',
  DGEN: 'from-yellow-500 to-orange-500',
  BONQ: 'from-orange-400 to-amber-500',
  SHBA: 'from-red-400 to-orange-500',
  // DeFi
  LNDB: 'from-teal-500 to-cyan-500',
  YLDP: 'from-emerald-500 to-teal-500',
  SWPX: 'from-sky-500 to-blue-500',
  // Food
  MNGO: 'from-orange-400 to-yellow-500',
  APPL: 'from-red-500 to-green-500',
  AVDO: 'from-green-500 to-lime-500',
  BERY: 'from-purple-500 to-pink-500',
};

function LiveBasketCard({ basket, index }: { basket: BasketSummary; index: number }) {
  const components = useBasketComponents(basket.basketId, basket.compCount);
  const expertMeta = EXPERT_BASKETS[basket.basketId.toString()];

  const displayName = BASKET_DISPLAY_NAMES[basket.basketId.toString()] || `Index ${basket.basketId}`;

  const formatNAV = (value: bigint): string => {
    const num = Number(value) / 1e8;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <Link
      to={`/index/${basket.basketId}`}
      className="block group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {expertMeta && (
              <img
                src={expertMeta.avatar}
                alt={expertMeta.creator}
                className="w-10 h-10 rounded-full object-cover border-2 border-bitcoin-500/30 group-hover:border-bitcoin-500 transition-colors"
              />
            )}
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-2xl font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors">
                  {displayName}
                </h3>
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20">
                  Live
                </span>
                {expertMeta && (
                  <span className="px-2 py-1 bg-bitcoin-500/10 text-bitcoin-500 text-xs font-medium rounded border border-bitcoin-500/20">
                    Expert
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-sm font-mono">
                {expertMeta ? `by ${expertMeta.creator}` : basket.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {formatNAV(basket.nav)}
            </div>
            <div className="text-xs text-dark-500">NAV (MOTO)</div>
          </div>
        </div>

        {/* Token composition badges */}
        {components.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {components.map((comp) => {
              const pct = totalWeight > 0 ? Math.round((comp.weight / totalWeight) * 100) : 0;
              const gradient = TOKEN_COLORS[comp.symbol] || 'from-gray-500 to-gray-600';
              return (
                <span
                  key={comp.token}
                  className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 text-dark-200 text-xs rounded-lg font-mono hover:bg-dark-600 transition-colors"
                >
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[8px] font-bold text-white`}>
                    {comp.symbol[0]}
                  </div>
                  {comp.symbol} {pct}%
                </span>
              );
            })}
          </div>
        )}

        {/* Weight bar */}
        {components.length > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-dark-700">
            {components.map((comp, i) => {
              const pct = totalWeight > 0 ? (comp.weight / totalWeight) * 100 : 0;
              const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
              return (
                <div
                  key={comp.token}
                  className={`${colors[i % colors.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

        <p className="text-dark-300 text-sm mb-4">
          {basket.compCount.toString()} tokens &middot; {basket.investorCount.toString()} investors
        </p>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-700">
          <div>
            <div className="text-dark-500 text-xs mb-1">TVL</div>
            <div className="text-white font-semibold">{formatNAV(basket.nav)} MOTO</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs mb-1">Perf Fee</div>
            <div className="text-white font-semibold">{(Number(basket.perfFeeBps) / 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs mb-1">Investors</div>
            <div className="text-white font-semibold">{basket.investorCount.toString()}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num}`;
};

const formatPercentage = (num: number) => {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

function SectorIndexCard({ index: idx, i }: { index: typeof MOCK_OFFICIAL_INDEXES[number]; i: number }) {
  return (
    <Link
      to={`/index/${idx.slug}`}
      className="block group"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-2xl font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors">
                {idx.name}
              </h3>
              <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20">
                Live
              </span>
            </div>
            <p className="text-dark-400 text-sm">{idx.fullName}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{idx.tvl > 0 ? formatNumber(idx.tvl) : '--'}</div>
            <div className="text-xs text-dark-500">TVL</div>
          </div>
        </div>

        <p className="text-dark-300 text-sm mb-4">{idx.description}</p>

        {/* Component pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {idx.components.map((c) => {
            const gradient = TOKEN_COLORS[c.symbol] || 'from-gray-500 to-gray-600';
            return (
              <span key={c.symbol} className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 text-dark-200 text-xs rounded-lg font-mono">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[8px] font-bold text-white`}>
                  {c.symbol[0]}
                </div>
                {c.symbol} {c.weight}%
              </span>
            );
          })}
        </div>

        {/* Performance row — only show when there's real data */}
        {(idx.performance.day !== 0 || idx.performance.week !== 0 || idx.performance.month !== 0 || idx.performance.year !== 0) && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: '24H', val: idx.performance.day },
              { label: '7D', val: idx.performance.week },
              { label: '30D', val: idx.performance.month },
              { label: '1Y', val: idx.performance.year },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <div className="text-dark-500 text-xs">{p.label}</div>
                <div className={`text-sm font-mono font-semibold ${p.val >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercentage(p.val)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-700">
          <div>
            <div className="text-dark-500 text-xs mb-1">TVL</div>
            <div className="text-white font-semibold">{idx.tvl > 0 ? formatNumber(idx.tvl) : '--'}</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs mb-1">Fee</div>
            <div className="text-white font-semibold">{idx.fee}%</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs mb-1">Investors</div>
            <div className="text-white font-semibold">{idx.investors > 0 ? idx.investors.toLocaleString() : '--'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExpertCard({ expert, i }: { expert: typeof MOCK_EXPERT_INDEXES[number]; i: number }) {
  const isLive = Boolean(expert.onChainBasketId);
  // Live experts link to on-chain detail; mock experts link to mock detail
  const linkTo = isLive ? `/index/${expert.onChainBasketId}` : `/index/expert-${expert.id}`;

  return (
    <Link
      to={linkTo}
      className="block group"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-center space-x-4 mb-4">
          <img
            src={expert.avatar}
            alt={expert.creator}
            className="w-12 h-12 rounded-full object-cover border-2 border-bitcoin-500/30 group-hover:border-bitcoin-500 transition-colors"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors truncate">
                {expert.name}
              </h3>
              <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20 shrink-0">
                Live
              </span>
            </div>
            <p className="text-bitcoin-500 text-sm font-medium">{expert.creator}</p>
          </div>
          <div className={`text-xl font-bold ${expert.performance.month >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {expert.performance.month !== 0 ? formatPercentage(expert.performance.month) : '--'}
          </div>
        </div>

        <p className="text-dark-300 text-sm mb-4">{expert.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {expert.components.map((c) => (
            <span key={c.symbol} className="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded font-mono">
              {c.symbol} {c.weight}%
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-dark-700">
          <div>
            <div className="text-dark-500 text-xs">TVL</div>
            <div className="text-white font-semibold text-sm">{expert.tvl > 0 ? formatNumber(expert.tvl) : '--'}</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs">Perf Fee</div>
            <div className="text-white font-semibold text-sm">{expert.performanceFee}%</div>
          </div>
          <div>
            <div className="text-dark-500 text-xs">Investors</div>
            <div className="text-white font-semibold text-sm">{expert.investors > 0 ? expert.investors : '--'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'sectors' | 'experts' | 'live'>('sectors');
  const { baskets, platformStats, loading, error } = useExpertIndex();

  const liveBaskets = baskets.filter(b => b.active !== 0n);
  const totalInvestors = baskets.reduce((s, b) => s + Number(b.investorCount), 0);

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-dark-800 to-dark-900 border-b border-dark-700">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-0 -left-4 w-72 sm:w-96 h-72 sm:h-96 bg-bitcoin-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" />
          <div className="absolute top-0 -right-4 w-72 sm:w-96 h-72 sm:h-96 bg-bitcoin-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-8 left-20 w-72 sm:w-96 h-72 sm:h-96 bg-bitcoin-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-bitcoin-500/10 border border-bitcoin-500/20 mb-8 animate-fade-in">
              <span className="text-bitcoin-500 text-sm font-medium">Diversified Index Investing on Bitcoin L1</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 animate-slide-up">
              Stop Guessing.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bitcoin-400 to-bitcoin-600">
                Start Investing.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Buy sector indexes or follow expert-curated baskets.
              <br />
              One click. Complete exposure. Powered by MOTO.
            </p>

            <div className="flex justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => {
                  document.getElementById('indexes')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-gradient-to-r from-bitcoin-500 to-bitcoin-600 hover:from-bitcoin-600 hover:to-bitcoin-700 text-white font-medium rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-bitcoin-500/30"
              >
                Browse Indexes
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {MOCK_OFFICIAL_INDEXES.length}
                </div>
                <div className="text-sm text-dark-400">Sector Indexes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {MOCK_EXPERT_INDEXES.length}
                </div>
                <div className="text-sm text-dark-400">Expert Indexes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {liveBaskets.length}
                </div>
                <div className="text-sm text-dark-400">On-Chain</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div id="indexes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex space-x-4 border-b border-dark-800">
          <button
            onClick={() => setActiveTab('sectors')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'sectors' ? 'text-bitcoin-500' : 'text-dark-400 hover:text-white'
            }`}
          >
            Sector Indexes
            <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs rounded">
              {MOCK_OFFICIAL_INDEXES.length}
            </span>
            {activeTab === 'sectors' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bitcoin-500" />}
          </button>
          <button
            onClick={() => setActiveTab('experts')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'experts' ? 'text-bitcoin-500' : 'text-dark-400 hover:text-white'
            }`}
          >
            Expert Indexes
            <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs rounded">
              {MOCK_EXPERT_INDEXES.length}
            </span>
            {activeTab === 'experts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bitcoin-500" />}
          </button>
          {liveBaskets.length > 0 && (
            <button
              onClick={() => setActiveTab('live')}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === 'live' ? 'text-bitcoin-500' : 'text-dark-400 hover:text-white'
              }`}
            >
              On-Chain
              <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 text-xs rounded">
                {liveBaskets.length}
              </span>
              {activeTab === 'live' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bitcoin-500" />}
            </button>
          )}
        </div>
      </div>

      {/* Index Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTab === 'sectors' && (
            <>
              {MOCK_OFFICIAL_INDEXES.map((idx, i) => (
                <SectorIndexCard key={idx.slug} index={idx} i={i} />
              ))}
            </>
          )}

          {activeTab === 'experts' && (
            <>
              {MOCK_EXPERT_INDEXES.map((expert, i) => (
                <ExpertCard key={expert.id} expert={expert} i={i} />
              ))}
            </>
          )}

          {activeTab === 'live' && (
            <>
              {liveBaskets.map((basket, i) => (
                <LiveBasketCard key={basket.basketId.toString()} basket={basket} index={i} />
              ))}

              {loading && (
                <div className="col-span-2 text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-dark-400 mt-4">Loading on-chain indexes...</p>
                </div>
              )}

              {!loading && error && liveBaskets.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <p className="text-red-400 text-sm mb-2 font-mono">RPC Error: {error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
