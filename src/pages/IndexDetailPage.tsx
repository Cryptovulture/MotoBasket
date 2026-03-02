import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useIndexToken,
  formatToken,
  formatMotoDisplay,
  parseMotoInput,
  parseTokenInput,
} from '../hooks/useIndexToken';
import { useWallet } from '../hooks/useWallet';
import { EXPLORER_TX_URL, INDEX_DECIMALS } from '../config/contracts';
import { INDEX_CONFIGS, CATEGORY_META } from '../config/indexes';
import {
  type TrackedTx,
  type TxStatus,
  loadTxHistory,
  saveTxHistory,
  statusBadge,
  txTypeLabel,
  timeAgo,
} from '../utils/txHistory';
import { fetchTransactionReceipt } from '../utils/rawRpc';

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

function bannerClasses(status: TxStatus): string {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'confirmed': return 'bg-green-500/10 border-green-500/20';
    case 'reverted': return 'bg-red-500/10 border-red-500/20';
  }
}

function bannerTextClass(status: TxStatus): string {
  switch (status) {
    case 'pending': return 'text-yellow-400';
    case 'confirmed': return 'text-green-400';
    case 'reverted': return 'text-red-400';
  }
}

function bannerLabel(status: TxStatus): string {
  switch (status) {
    case 'pending': return 'TX pending';
    case 'confirmed': return 'TX confirmed';
    case 'reverted': return 'TX reverted';
  }
}

// ── Step Progress Indicator ──────────────────────────────────────────

function StepProgress({ current, total, label }: { current: number; total: number; label: string }) {
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === current;
          const isDone = stepNum < current;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isDone ? 'bg-green-500 text-white' : ''}
                ${isActive ? 'bg-bitcoin-500 text-white animate-pulse' : ''}
                ${!isDone && !isActive ? 'bg-dark-700 text-dark-400' : ''}
              `}>
                {isDone ? (
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : stepNum}
              </div>
              {i < total - 1 && (
                <div className={`w-8 h-0.5 ${isDone ? 'bg-green-500' : 'bg-dark-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step label */}
      <div className="text-center">
        <p className="text-sm text-dark-300 font-medium">{label}</p>
        <p className="text-xs text-dark-500 mt-1">
          Step {current} of {total}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function IndexDetailPage() {
  const { address } = useParams<{ address: string }>();

  const indexConfig = useMemo(() => {
    if (!address) return null;
    const decoded = decodeURIComponent(address);
    return INDEX_CONFIGS.find(c => c.address.toLowerCase() === decoded.toLowerCase()) ?? null;
  }, [address]);

  if (!indexConfig) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
          &larr; Back to Indexes
        </Link>
        <div className="text-center py-20">
          <h1 className="text-3xl font-display font-bold text-white mb-4">Index Not Found</h1>
          <p className="text-dark-400 mb-4">No index token at this address.</p>
          <Link to="/" className="text-bitcoin-500 hover:text-bitcoin-400 transition-colors">Back to Indexes</Link>
        </div>
      </div>
    );
  }

  return <IndexDetail config={indexConfig} />;
}

function IndexDetail({ config }: { config: typeof INDEX_CONFIGS[number] }) {
  const wallet = useWallet();
  const isConnected = wallet.isConnected;
  const category = CATEGORY_META[config.category];

  const {
    components, totalSupply, userBalance, motoBalance, motoAllowance,
    loading, loadingStep, currentStep, totalSteps,
    initialLoading, error, lastTxId,
    invest, redeem, needsApproval,
  } = useIndexToken(config);

  const [buyInput, setBuyInput] = useState('');
  const [sellInput, setSellInput] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  // ── TX tracking ─────────────────────────────────────────────────
  const historyKey = config.address || config.symbol;
  const [txHistory, setTxHistory] = useState<TrackedTx[]>(() => loadTxHistory(historyKey));
  const [latestTx, setLatestTx] = useState<TrackedTx | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    saveTxHistory(historyKey, txHistory);
  }, [txHistory, historyKey]);

  const pollPendingTxs = useCallback(async () => {
    const pending = txHistory.filter(t => t.status === 'pending');
    if (pending.length === 0) return;

    let changed = false;
    const updated = [...txHistory];

    for (const tx of pending) {
      try {
        const receipt = await fetchTransactionReceipt(tx.txId);
        if (!receipt) continue;

        const idx = updated.findIndex(t => t.txId === tx.txId);
        if (idx === -1) continue;

        const isConfirmed = receipt.events.length > 0;
        const revertReason = !isConfirmed && receipt.revert ? receipt.revert : undefined;
        const newStatus: TxStatus = isConfirmed ? 'confirmed' : 'reverted';
        updated[idx] = { ...updated[idx], status: newStatus, revertReason };
        changed = true;

        if (latestTx && latestTx.txId === tx.txId) {
          setLatestTx(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } catch { /* ignore */ }
    }

    if (changed) setTxHistory(updated);
  }, [txHistory, latestTx]);

  useEffect(() => {
    const hasPending = txHistory.some(t => t.status === 'pending');
    if (hasPending) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => { pollPendingTxs(); }, 10_000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [txHistory, pollPendingTxs]);

  const trackTx = useCallback((txId: string, type: TrackedTx['type'], amount: string) => {
    const entry: TrackedTx = { txId, type, amount, timestamp: Date.now(), status: 'pending' };
    setLatestTx(entry);
    setTxHistory(prev => [entry, ...prev]);
    setTimeout(async () => {
      try {
        const receipt = await fetchTransactionReceipt(txId);
        if (receipt) {
          const isConfirmed = receipt.events.length > 0;
          const revertReason = !isConfirmed && receipt.revert ? receipt.revert : undefined;
          const newStatus: TxStatus = isConfirmed ? 'confirmed' : 'reverted';
          setLatestTx(prev => prev?.txId === txId ? { ...prev, status: newStatus, revertReason } : prev);
          setTxHistory(prev => prev.map(t => t.txId === txId ? { ...t, status: newStatus, revertReason } : t));
        }
      } catch { /* interval will catch it */ }
    }, 5_000);
  }, []);

  const totalWeight = components.reduce((s, c) => s + Number(c.weight), 0);

  // Parsed buy amount for validation
  const buyAmount = useMemo(() => {
    if (!buyInput) return 0n;
    return parseMotoInput(buyInput);
  }, [buyInput]);

  const buyNeedsApproval = useMemo(() => {
    if (buyAmount <= 0n) return false;
    return needsApproval(buyAmount);
  }, [buyAmount, needsApproval]);

  const handleBuy = async () => {
    if (!buyInput || buyAmount <= 0n) return;
    const tx = await invest(buyAmount);
    if (tx) {
      trackTx(tx, 'invest', buyInput + ' MOTO');
      setBuyInput('');
    }
  };

  const handleSell = async () => {
    if (!sellInput) return;
    const amount = parseTokenInput(sellInput, INDEX_DECIMALS);
    if (amount <= 0n) return;
    const tx = await redeem(amount);
    if (tx) {
      trackTx(tx, 'withdraw', sellInput + ' ' + config.symbol);
      setSellInput('');
    }
  };

  const handleCopy = (e: React.MouseEvent, txId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(txId).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
          &larr; Back to Indexes
        </Link>
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-dark-700 rounded-lg" />
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
        <p className="text-dark-400 text-center mt-8">Loading index data from testnet...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/" className="text-dark-400 hover:text-bitcoin-500 transition-colors text-sm mb-6 inline-block">
        &larr; Back to Indexes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-4xl font-display font-bold text-white">{config.symbol}</h1>
            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded border border-green-500/20">
              Live
            </span>
            {category && (
              <span className={`px-3 py-1 bg-gradient-to-r ${category.gradient} text-white text-xs font-medium rounded`}>
                {category.label}
              </span>
            )}
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded border border-yellow-500/20">
              Testnet
            </span>
          </div>
          <p className="text-dark-400">{config.name}</p>
          <p className="text-dark-500 text-sm mt-1">{config.description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-dark-500 mb-1">Total Supply</div>
          <div className="text-2xl font-display font-bold text-white">
            {totalSupply > 0n ? formatToken(totalSupply, INDEX_DECIMALS) : '--'}
          </div>
          <div className="text-xs text-dark-500">{config.symbol}</div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* TX Banner */}
      {latestTx && (
        <div className={`${bannerClasses(latestTx.status)} border rounded-xl p-4 mb-6 flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            {latestTx.status === 'pending' && (
              <svg className="w-4 h-4 animate-spin text-yellow-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {latestTx.status === 'confirmed' && (
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`${bannerTextClass(latestTx.status)} text-sm font-mono`}>
              {bannerLabel(latestTx.status)}:{' '}
              <a href={EXPLORER_TX_URL + latestTx.txId} target="_blank" rel="noopener noreferrer" className="hover:text-bitcoin-500 underline transition-colors">
                {latestTx.txId.slice(0, 16)}...
              </a>
              <button type="button" onClick={(e) => handleCopy(e, latestTx.txId)} className="ml-2 text-bitcoin-500 hover:text-bitcoin-400 underline cursor-pointer bg-transparent border-none text-sm font-mono">
                {copyFeedback ? 'Copied!' : 'Copy'}
              </button>
            </p>
          </div>
          <button type="button" onClick={() => setLatestTx(null)} className="text-dark-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Components */}
      {components.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-white mb-4">Portfolio Composition</h2>

          <div className="flex h-3 rounded-full overflow-hidden mb-6 bg-dark-700">
            {components.map((c, i) => {
              const pct = totalWeight > 0 ? (Number(c.weight) / totalWeight) * 100 : 0;
              const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
              return (
                <div
                  key={c.address}
                  className={`${colors[i % colors.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${c.symbol} ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {components.map((c) => {
              const pct = totalWeight > 0 ? (Number(c.weight) / totalWeight) * 100 : 0;
              const gradient = TOKEN_COLORS[c.symbol] || 'from-gray-500 to-gray-600';
              return (
                <div key={c.address} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white`}>
                      {c.symbol[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{c.symbol}</div>
                      <div className="text-dark-500 text-xs">{c.name}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-green-500 font-mono font-bold text-lg">{pct.toFixed(1)}%</div>
                    <div className="text-right">
                      <div className="text-dark-500 text-xs font-mono">
                        {formatToken(c.holding, 18)} held
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Total Supply</div>
          <div className="text-white font-mono font-semibold">{totalSupply > 0n ? formatToken(totalSupply, INDEX_DECIMALS) : '--'}</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Components</div>
          <div className="text-white font-mono font-semibold">{components.length}</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Standard</div>
          <div className="text-bitcoin-500 font-mono font-semibold">OP20</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Network</div>
          <div className="text-yellow-400 font-mono font-semibold">Testnet</div>
        </div>
      </div>

      {/* Buy / Sell Panel */}
      {isConnected && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden mb-8">
          {/* Tabs */}
          <div className="flex border-b border-dark-700">
            <button
              type="button"
              onClick={() => !loading && setActiveTab('buy')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'buy'
                  ? 'text-bitcoin-500 border-b-2 border-bitcoin-500 bg-dark-800'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Buy {config.symbol}
            </button>
            <button
              type="button"
              onClick={() => !loading && setActiveTab('sell')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'sell'
                  ? 'text-red-400 border-b-2 border-red-400 bg-dark-800'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Redeem {config.symbol}
            </button>
          </div>

          <div className="p-6">
            {/* Processing overlay */}
            {loading && (
              <div className="mb-6 bg-dark-900 border border-dark-600 rounded-xl p-6">
                <StepProgress current={currentStep} total={totalSteps} label={loadingStep} />
              </div>
            )}

            {activeTab === 'buy' ? (
              <div className="space-y-4">
                {/* Balance info */}
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Your MOTO Balance</span>
                  <span className="text-white font-mono">{formatMotoDisplay(motoBalance)} MOTO</span>
                </div>

                {/* Amount input */}
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter MOTO amount (min 10)"
                    value={buyInput}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setBuyInput(v);
                    }}
                    disabled={loading}
                    className="w-full px-4 py-4 bg-dark-900 border border-dark-600 rounded-xl text-white font-mono text-lg focus:border-bitcoin-500 focus:outline-none transition-colors pr-24 disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBuyInput(formatMotoDisplay(motoBalance))}
                      disabled={loading}
                      className="px-3 py-1.5 bg-bitcoin-500/20 text-bitcoin-500 text-xs font-bold rounded hover:bg-bitcoin-500/30 transition-colors disabled:opacity-50"
                    >
                      MAX
                    </button>
                    <span className="text-dark-400 text-sm font-mono">MOTO</span>
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {[10, 50, 100, 500].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBuyInput(String(amount))}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-dark-300 text-xs font-mono hover:border-bitcoin-500/50 hover:text-bitcoin-500 transition-colors disabled:opacity-50"
                    >
                      {amount} MOTO
                    </button>
                  ))}
                </div>

                {/* Approval info */}
                {buyAmount > 0n && buyNeedsApproval && !loading && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-400 text-xs">
                      First-time approval required. You will sign 2 transactions: approve MOTO, then invest.
                    </span>
                  </div>
                )}

                {buyAmount > 0n && !buyNeedsApproval && !loading && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-400 text-xs">
                      MOTO approved. One-click purchase ready.
                    </span>
                  </div>
                )}

                {/* How it works */}
                <div className="bg-dark-900 rounded-lg p-4 space-y-2">
                  <p className="text-dark-500 text-xs font-medium uppercase tracking-wide">How it works</p>
                  <ul className="space-y-1.5 text-xs text-dark-400">
                    <li className="flex items-start gap-2">
                      <span className="text-bitcoin-500 font-mono mt-0.5">1.</span>
                      Your MOTO is split by weight across {components.length} tokens
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-bitcoin-500 font-mono mt-0.5">2.</span>
                      Each portion is swapped on MotoSwap automatically
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-bitcoin-500 font-mono mt-0.5">3.</span>
                      You receive {config.symbol} index tokens representing your share
                    </li>
                  </ul>
                </div>

                {/* Buy button */}
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={loading || !buyInput || buyAmount <= 0n}
                  className="w-full py-4 bg-gradient-to-r from-bitcoin-500 to-bitcoin-600 hover:from-bitcoin-600 hover:to-bitcoin-700 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:from-dark-600 disabled:to-dark-600 shadow-lg shadow-bitcoin-500/20 hover:shadow-bitcoin-500/40"
                >
                  {loading
                    ? 'Processing...'
                    : buyNeedsApproval
                      ? `Approve & Buy ${config.symbol}`
                      : `Buy ${config.symbol}`
                  }
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sell tab */}
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Your {config.symbol} Balance</span>
                  <span className="text-green-500 font-mono">{formatToken(userBalance, INDEX_DECIMALS)} {config.symbol}</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={`${config.symbol} tokens to redeem`}
                    value={sellInput}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setSellInput(v);
                    }}
                    disabled={loading}
                    className="w-full px-4 py-4 bg-dark-900 border border-dark-600 rounded-xl text-white font-mono text-lg focus:border-red-400 focus:outline-none transition-colors pr-24 disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSellInput(formatToken(userBalance, INDEX_DECIMALS))}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-bold rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      MAX
                    </button>
                    <span className="text-dark-400 text-sm font-mono">{config.symbol}</span>
                  </div>
                </div>

                {userBalance > 0n && components.length > 0 && (
                  <div className="bg-dark-900 rounded-lg p-4">
                    <p className="text-dark-500 text-xs mb-2">
                      Redeeming burns your {config.symbol} and returns proportional amounts of:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {components.map(c => (
                        <span key={c.address} className="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded font-mono">
                          {c.symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSell}
                  disabled={loading || !sellInput || userBalance <= 0n}
                  className="w-full py-4 bg-dark-700 hover:bg-dark-600 text-red-400 border border-red-500/30 font-bold text-lg rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : `Redeem ${config.symbol}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Your Position */}
      {isConnected && userBalance > 0n && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-display font-bold text-white mb-4">Your Position</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Your {config.symbol}</div>
              <div className="text-green-500 font-mono font-semibold text-lg">{formatToken(userBalance, INDEX_DECIMALS)}</div>
            </div>
            <div>
              <div className="text-dark-500 text-xs mb-1 uppercase tracking-wide">Share of Pool</div>
              <div className="text-white font-mono font-semibold text-lg">
                {totalSupply > 0n ? ((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2) + '%' : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent TXs */}
      {txHistory.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-white mb-4">Recent Transactions</h2>
          <div className="space-y-2">
            {txHistory.slice(0, 10).map((tx) => (
              <div key={tx.txId} className="flex items-center justify-between py-2 px-3 bg-dark-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    tx.type === 'invest' ? 'bg-green-500/10 text-green-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {txTypeLabel(tx.type)}
                  </span>
                  <span className="text-dark-300 text-sm font-mono">{tx.amount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href={EXPLORER_TX_URL + tx.txId} target="_blank" rel="noopener noreferrer" className="text-dark-500 text-xs font-mono hover:text-bitcoin-500 transition-colors">
                    {tx.txId.slice(0, 12)}...
                  </a>
                  {(() => { const b = statusBadge(tx.status); return (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${b.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.dotClass}`} />
                      {b.label}
                    </span>
                  ); })()}
                  <span className="text-dark-400 text-xs whitespace-nowrap" title={new Date(tx.timestamp).toLocaleString()}>
                    {timeAgo(tx.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
          <svg className="w-12 h-12 text-dark-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
          </svg>
          <p className="text-dark-400 text-lg mb-2">Connect your OP_WALLET to invest</p>
          <p className="text-dark-500 text-sm">One approval, one transaction. That's it.</p>
        </div>
      )}
    </div>
  );
}
