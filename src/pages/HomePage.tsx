import { Link } from 'react-router-dom';
import { INDEX_CONFIGS, CATEGORY_META } from '../config/indexes';

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
};

function IndexCard({ config, i }: { config: typeof INDEX_CONFIGS[number]; i: number }) {
  const category = CATEGORY_META[config.category];
  const totalWeight = config.components.reduce((s, c) => s + c.weightBps, 0);
  const isDeployed = Boolean(config.address);

  const linkTo = isDeployed ? `/index/${encodeURIComponent(config.address)}` : '#';

  return (
    <Link
      to={linkTo}
      className={`block group ${!isDeployed ? 'pointer-events-none opacity-60' : ''}`}
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-bitcoin-500/50 transition-all hover:shadow-xl hover:shadow-bitcoin-500/10 transform hover:-translate-y-1 animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-2xl font-display font-bold text-white group-hover:text-bitcoin-500 transition-colors">
                {config.symbol}
              </h3>
              {isDeployed ? (
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20">
                  Live
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded border border-yellow-500/20">
                  Coming Soon
                </span>
              )}
              {category && (
                <span className={`px-2 py-1 bg-gradient-to-r ${category.gradient} bg-opacity-10 text-white text-xs font-medium rounded`}>
                  {category.label}
                </span>
              )}
            </div>
            <p className="text-dark-400 text-sm">{config.name}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{config.components.length}</div>
            <div className="text-xs text-dark-500">tokens</div>
          </div>
        </div>

        <p className="text-dark-300 text-sm mb-4">{config.description}</p>

        {/* Token composition badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {config.components.map((comp) => {
            const pct = totalWeight > 0 ? Math.round((comp.weightBps / totalWeight) * 100) : 0;
            const gradient = TOKEN_COLORS[comp.symbol] || 'from-gray-500 to-gray-600';
            return (
              <span
                key={comp.address}
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

        {/* Weight bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-dark-700">
          {config.components.map((comp, idx) => {
            const pct = totalWeight > 0 ? (comp.weightBps / totalWeight) * 100 : 0;
            const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
            return (
              <div
                key={comp.address}
                className={`${colors[idx % colors.length]} transition-all`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const deployed = INDEX_CONFIGS.filter(c => c.address);
  const upcoming = INDEX_CONFIGS.filter(c => !c.address);

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
              Buy index tokens that hold diversified portfolios.
              <br />
              One click. Complete exposure. Powered by MOTO.
            </p>

            <div className="flex justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => document.getElementById('indexes')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-gradient-to-r from-bitcoin-500 to-bitcoin-600 hover:from-bitcoin-600 hover:to-bitcoin-700 text-white font-medium rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-bitcoin-500/30"
              >
                Browse Indexes
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {INDEX_CONFIGS.length}
                </div>
                <div className="text-sm text-dark-400">Index Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {deployed.length}
                </div>
                <div className="text-sm text-dark-400">Live</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  OP20
                </div>
                <div className="text-sm text-dark-400">Standard Tokens</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Index Grid */}
      <div id="indexes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <h2 className="text-2xl font-display font-bold text-white mb-6">Index Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deployed.map((config, i) => (
            <IndexCard key={config.symbol} config={config} i={i} />
          ))}
          {upcoming.map((config, i) => (
            <IndexCard key={config.symbol} config={config} i={deployed.length + i} />
          ))}
        </div>
      </div>
    </div>
  );
}
