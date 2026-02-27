import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  useBasketDetail,
  formatBasket,
  formatMoto,
  formatToken,
  parseMotoInput,
  parseBasketInput,
} from '../hooks/useBasketDetail';
import { useWallet } from '../hooks/useWallet';
import { TOKEN_META, BASKET_DISPLAY_NAMES, EXPERT_BASKETS } from '../config/contracts';
import { u256ToAddress } from '../utils/rawRpc';

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
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  if (num > 0) return num.toFixed(4);
  return '--';
}

export default function IndexDetailPage() {
  const { address } = useParams<{ address: string }>();

  // All routes use on-chain basket IDs
  let basketId: bigint;
  try {
    basketId = BigInt(address ?? '0');
    if (basketId <= 0n) throw new Error();
  } catch {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
          &larr; Back to Indexes
        </Link>
        <div className="text-center py-20">
          <h1 className="text-3xl font-display font-bold text-white mb-4">Index Not Found</h1>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">Back to Indexes</Link>
        </div>
      </div>
    );
  }

  return <OnChainIndexDetail basketId={basketId} />;
}

function OnChainIndexDetail({ basketId }: { basketId: bigint }) {
  const wallet = useWallet();
  const isConnected = wallet.isConnected;

  const {
    info, name, nav, components, position, motoBalance,
    loading, loadingStep, initialLoading, error,
    invest, withdraw, scheduleRebalance, executeRebalance, collectPerfFee,
  } = useBasketDetail(basketId);

  const [buyInput, setBuyInput] = useState('');
  const [sellInput, setSellInput] = useState('');
  const [txId, setTxId] = useState<string | null>(null);

  const formatBps = (bps: bigint): string => (Number(bps) / 100).toFixed(2) + '%';
  const shortenAddress = (hex: string): string => {
    if (hex.length <= 14) return hex;
    return `${hex.slice(0, 8)}...${hex.slice(-4)}`;
  };

  const displayName = BASKET_DISPLAY_NAMES[basketId.toString()] || name || `Index #${basketId}`;
  const totalWeight = components.reduce((s, c) => s + Number(c.weight), 0);

  const handleBuy = async () => {
    if (!buyInput) return;
    const amount = parseMotoInput(buyInput);
    if (amount <= 0n) return;
    const tx = await invest(amount);
    if (tx) {
      setTxId(tx);
      setBuyInput('');
    }
  };

  const handleSell = async () => {
    if (!sellInput) return;
    const amount = parseBasketInput(sellInput);
    if (amount <= 0n) return;
    const tx = await withdraw(amount);
    if (tx) {
      setTxId(tx);
      setSellInput('');
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
          &larr; Back to Indexes
        </Link>
        <div className="animate-pulse space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-10 w-64 bg-dark-700 rounded-lg mb-3" />
              <div className="h-4 w-32 bg-dark-800 rounded" />
            </div>
            <div className="text-right">
              <div className="h-10 w-24 bg-dark-700 rounded-lg mb-2" />
              <div className="h-4 w-16 bg-dark-800 rounded" />
            </div>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
            <div className="h-6 w-48 bg-dark-700 rounded mb-4" />
            <div className="h-3 w-full bg-dark-700 rounded-full mb-6" />
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-dark-900 rounded-xl p-4 h-24" />
              <div className="bg-dark-900 rounded-xl p-4 h-24" />
              <div className="bg-dark-900 rounded-xl p-4 h-24" />
            </div>
          </div>
        </div>
        <p className="text-dark-400 text-center mt-8">Loading index...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-3xl font-display font-bold text-white mb-4">Index Not Found</h1>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">
            Back to Indexes
          </Link>
        </div>
      </div>
    );
  }

  const expertMeta = EXPERT_BASKETS[basketId.toString()];
  const creatorHex = '0x' + info.creator.toString(16).padStart(64, '0');
  const isActive = info.active !== 0n;
  const isCreator = wallet.senderAddress && creatorHex.toLowerCase() === wallet.senderAddress.toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
        &larr; Back to Indexes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {expertMeta && (
            <img
              src={expertMeta.avatar}
              alt={expertMeta.creator}
              className="w-16 h-16 rounded-full object-cover border-2 border-bitcoin-500/30"
            />
          )}
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-4xl font-display font-bold text-white">{displayName}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded border ${
                isActive
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {isActive ? 'Live' : 'Inactive'}
              </span>
              {expertMeta && (
                <span className="px-3 py-1 bg-bitcoin-500/10 text-bitcoin-500 text-xs font-medium rounded border border-bitcoin-500/20">
                  Expert
                </span>
              )}
            </div>
            {expertMeta ? (
              <p className="text-dark-400">
                by <span className="text-bitcoin-500 font-medium">{expertMeta.creator}</span>
                <span className="text-dark-500 ml-2">- {expertMeta.description}</span>
              </p>
            ) : (
              <p className="text-dark-500 text-sm font-mono">{name}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display font-bold text-white">
            {formatNAV(nav)} MOTO
          </div>
          <div className="text-sm text-dark-500">NAV</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {txId && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex justify-between items-center">
          <p className="text-green-400 text-sm font-mono">
            TX: {txId.slice(0, 16)}...
            <a
              href={`https://testnet.opnet.org/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-bitcoin-500 hover:text-bitcoin-400 underline"
            >
              View
            </a>
          </p>
          <button onClick={() => setTxId(null)} className="text-dark-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Components */}
      {components.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-white mb-4">
            Portfolio Composition
          </h2>

          {/* Weight bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-6 bg-dark-700">
            {components.map((c, i) => {
              const tokenHex = u256ToAddress(c.token);
              const meta = TOKEN_META[tokenHex];
              const pct = totalWeight > 0 ? (Number(c.weight) / totalWeight) * 100 : 0;
              const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
              return (
                <div
                  key={i}
                  className={`${colors[i % colors.length]} transition-all relative group`}
                  style={{ width: `${pct}%` }}
                  title={`${meta?.symbol ?? '?'} ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Token cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {components.map((c, i) => {
              const tokenHex = u256ToAddress(c.token);
              const meta = TOKEN_META[tokenHex];
              const pct = totalWeight > 0 ? (Number(c.weight) / totalWeight) * 100 : 0;
              const gradient = meta ? (TOKEN_COLORS[meta.symbol] || 'from-gray-500 to-gray-600') : 'from-gray-500 to-gray-600';
              const symbol = meta?.symbol ?? '?';
              const decimals = meta?.decimals ?? 8;
              return (
                <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white`}>
                      {symbol[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{meta?.symbol ?? shortenAddress(tokenHex)}</div>
                      {meta && <div className="text-dark-500 text-xs">{meta.name}</div>}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-green-500 font-mono font-bold text-lg">{pct.toFixed(1)}%</div>
                    <div className="text-right">
                      <div className="text-dark-500 text-xs font-mono">
                        {formatToken(c.holding, decimals)} held
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Total Shares</div>
          <div className="text-white font-mono font-semibold">{formatBasket(info.totalShares)}</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">NAV</div>
          <div className="text-white font-mono font-semibold">{formatNAV(nav)} MOTO</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Perf Fee</div>
          <div className="text-bitcoin-500 font-mono font-semibold">{formatBps(info.perfFeeBps)}</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Investors</div>
          <div className="text-white font-mono font-semibold">{Number(info.investorCount) > 0 ? info.investorCount.toString() : '--'}</div>
        </div>
      </div>

      {/* Buy / Sell */}
      {isConnected && isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Buy Panel */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white mb-4">Buy with MOTO</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">MOTO Balance</span>
                <span className="text-white font-mono">{formatMoto(motoBalance)}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount in MOTO"
                  value={buyInput}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setBuyInput(v);
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-xl text-white font-mono text-sm focus:border-bitcoin-500 focus:outline-none transition-colors pr-16"
                />
                <button
                  onClick={() => setBuyInput(formatMoto(motoBalance))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-bitcoin-500/20 text-bitcoin-500 text-xs font-bold rounded hover:bg-bitcoin-500/30 transition-colors"
                >
                  MAX
                </button>
              </div>
              <button
                onClick={handleBuy}
                disabled={loading || !buyInput}
                className="px-6 py-3 bg-gradient-to-r from-bitcoin-500 to-bitcoin-600 hover:from-bitcoin-600 hover:to-bitcoin-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                {loading ? (loadingStep || '...') : 'Buy'}
              </button>
            </div>
          </div>

          {/* Sell Panel */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white mb-4">Sell</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Your Shares</span>
                <span className="text-green-500 font-mono">{formatBasket(position?.shares ?? 0n)}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Shares to sell"
                  value={sellInput}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setSellInput(v);
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-xl text-white font-mono text-sm focus:border-bitcoin-500 focus:outline-none transition-colors pr-16"
                />
                <button
                  onClick={() => setSellInput(formatBasket(position?.shares ?? 0n))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-bitcoin-500/20 text-bitcoin-500 text-xs font-bold rounded hover:bg-bitcoin-500/30 transition-colors"
                >
                  MAX
                </button>
              </div>
              <button
                onClick={handleSell}
                disabled={loading || !sellInput}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-red-400 border border-red-500/30 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                {loading ? (loadingStep || '...') : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Your Position */}
      {isConnected && position && position.shares > 0n && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-display font-bold text-white mb-4">Your Position</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Your Shares</div>
              <div className="text-green-500 font-mono font-semibold text-lg">{formatBasket(position.shares)}</div>
            </div>
            <div>
              <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Cost Basis</div>
              <div className="text-white font-mono font-semibold text-lg">{formatMoto(position.costBasis)} MOTO</div>
            </div>
            <div>
              <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Share Token</div>
              <div className="text-dark-300 font-mono text-xs">
                {info.shareToken > 0n ? shortenAddress(u256ToAddress(info.shareToken)) : 'Not set'}
              </div>
              <div className="text-dark-500 text-xs mt-0.5">OP20 &middot; Transferable</div>
            </div>
          </div>
        </div>
      )}

      {/* Creator Management Panel */}
      {isConnected && isCreator && (
        <div className="bg-dark-800 border border-bitcoin-500/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-display font-bold text-bitcoin-500 mb-4">Creator Management</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={async () => { const tx = await scheduleRebalance(basketId); if (tx) setTxId(tx); }}
              disabled={loading || !isActive}
              className="px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-xl border border-dark-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Schedule Rebalance'}
            </button>
            <button
              onClick={async () => { const tx = await executeRebalance(basketId); if (tx) setTxId(tx); }}
              disabled={loading || !isActive}
              className="px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-xl border border-dark-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Execute Rebalance'}
            </button>
            <button
              onClick={async () => { const tx = await collectPerfFee(basketId); if (tx) setTxId(tx); }}
              disabled={loading || !isActive}
              className="px-4 py-3 bg-bitcoin-500/20 hover:bg-bitcoin-500/30 text-bitcoin-400 text-sm font-medium rounded-xl border border-bitcoin-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Collect Fee'}
            </button>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
          <p className="text-dark-400 text-lg">Connect your wallet to invest in this index</p>
        </div>
      )}
    </div>
  );
}
