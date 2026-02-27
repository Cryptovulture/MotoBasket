import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useExpertIndex } from '../hooks/useExpertIndex';
import { useBasketComponents } from '../hooks/useBasketComponents';
import type { BasketSummary } from '../hooks/useExpertIndex';
import { BASKET_DISPLAY_NAMES, EXPERT_BASKETS } from '../config/contracts';

// Token color map for badges
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

// Sector basket IDs (on-chain)
const SECTOR_IDS = new Set([1n, 2n, 3n, 4n, 5n, 6n, 7n]);
// Expert basket IDs (on-chain)
const EXPERT_IDS = new Set([8n, 9n, 10n, 11n, 12n]);

// Descriptions for sector indexes
const SECTOR_DESCRIPTIONS: Record<string, string> = {
  '1': 'Original multi-token basket — NEBL, CPHR, VRTX',
  '2': 'Equal-weight CPHR and VRTX exposure',
  '3': 'Leading AI infrastructure and compute tokens on Bitcoin L1',
  '4': 'Top performing meme coins on Bitcoin L1',
  '5': 'Core DeFi protocols — lending, swaps, and yield',
  '6': 'The tastiest tokens on Bitcoin L1',
  '7': 'Established Bitcoin L1 protocols with proven track records',
};

// Descriptions for expert indexes
const EXPERT_DESCRIPTIONS: Record<string, string> = {
  '8': 'High-conviction AI and DeFi plays from a top Bitcoin trader',
  '9': 'Bitcoin maximalist plays — blue chips and DeFi infrastructure',
  '10': 'High risk, high reward — memes and micro-caps on Bitcoin L1',
  '11': 'Institutional-grade allocations across AI and blue chips',
  '12': 'Contrarian bets — overlooked food tokens and undervalued AI plays',
};

function formatNAV(value: bigint): string {
  const num = Number(value) / 1e8;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  if (num > 0) return num.toFixed(2);
  return '--';
}

// ---------------------------------------------------------------------------
// Sector Index Card — live on-chain data
// ---------------------------------------------------------------------------

function SectorCard({ basket, i }: { basket: BasketSummary; i: number }) {
  const components = useBasketComponents(basket.basketId, basket.compCount);
  const displayName = BASKET_DISPLAY_NAMES[basket.basketId.toString()] || basket.name || `Index ${basket.basketId}`;
  const description = SECTOR_DESCRIPTIONS[basket.basketId.toString()] || '';
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <Link
      to={`/index/${basket.basketId}`}
      className="block group"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-2xl font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors">
                {displayName}
              </h3>
              <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20">
                Live
              </span>
              <span className="px-2 py-1 bg-dark-700 text-dark-400 text-xs font-medium rounded border border-dark-600">
                Sector
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatNAV(basket.nav)}</div>
            <div className="text-xs text-dark-500">NAV (MOTO)</div>
          </div>
        </div>

        {description && <p className="text-dark-300 text-sm mb-4">{description}</p>}

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
            {components.map((comp, idx) => {
              const pct = totalWeight > 0 ? (comp.weight / totalWeight) * 100 : 0;
              const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
              return (
                <div
                  key={comp.token}
                  className={`${colors[idx % colors.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

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
            <div className="text-white font-semibold">{Number(basket.investorCount) > 0 ? basket.investorCount.toString() : '--'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Expert Index Card — live on-chain data
// ---------------------------------------------------------------------------

function ExpertCard({ basket, i }: { basket: BasketSummary; i: number }) {
  const components = useBasketComponents(basket.basketId, basket.compCount);
  const expertMeta = EXPERT_BASKETS[basket.basketId.toString()];
  const displayName = BASKET_DISPLAY_NAMES[basket.basketId.toString()] || basket.name || `Index ${basket.basketId}`;
  const description = EXPERT_DESCRIPTIONS[basket.basketId.toString()] || expertMeta?.description || '';
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <Link
      to={`/index/${basket.basketId}`}
      className="block group"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-center space-x-4 mb-4">
          {expertMeta && (
            <img
              src={expertMeta.avatar}
              alt={expertMeta.creator}
              className="w-12 h-12 rounded-full object-cover border-2 border-bitcoin-500/30 group-hover:border-bitcoin-500 transition-colors"
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
              <span className="px-1.5 py-0.5 bg-bitcoin-500/10 text-bitcoin-500 text-xs font-medium rounded border border-bitcoin-500/20 shrink-0">
                Expert
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

        {description && <p className="text-dark-300 text-sm mb-4">{description}</p>}

        {/* Token composition */}
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
            {components.map((comp, idx) => {
              const pct = totalWeight > 0 ? (comp.weight / totalWeight) * 100 : 0;
              const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
              return (
                <div
                  key={comp.token}
                  className={`${colors[idx % colors.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

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

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'sectors' | 'experts'>('sectors');
  const { baskets, loading, error } = useExpertIndex();

  // Split live on-chain baskets into sector vs expert
  const sectorBaskets = baskets.filter(b => SECTOR_IDS.has(b.basketId));
  const expertBaskets = baskets.filter(b => EXPERT_IDS.has(b.basketId));

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

            {/* Stats — live counts */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {sectorBaskets.length || '--'}
                </div>
                <div className="text-sm text-dark-400">Sector Indexes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {expertBaskets.length || '--'}
                </div>
                <div className="text-sm text-dark-400">Expert Indexes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {baskets.length || '--'}
                </div>
                <div className="text-sm text-dark-400">Live Indexes</div>
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
              {sectorBaskets.length}
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
              {expertBaskets.length}
            </span>
            {activeTab === 'experts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bitcoin-500" />}
          </button>
        </div>
      </div>

      {/* Index Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading && baskets.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-bitcoin-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-dark-400 mt-4">Loading live indexes...</p>
          </div>
        )}

        {!loading && error && baskets.length === 0 && (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTab === 'sectors' && sectorBaskets.map((basket, i) => (
            <SectorCard key={basket.basketId.toString()} basket={basket} i={i} />
          ))}

          {activeTab === 'experts' && expertBaskets.map((basket, i) => (
            <ExpertCard key={basket.basketId.toString()} basket={basket} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
