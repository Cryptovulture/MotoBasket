import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { StepIndicator } from '../components/ui/StepIndicator';
import { NavChart } from '../components/charts/NavChart';
import { AllocationChart } from '../components/charts/AllocationChart';
import { getIndexByAddress, CATEGORY_META } from '../config/indexes';
import { getTokenSymbol, MOTO_ADDRESS } from '../config/tokens';
import { useIndexData } from '../hooks/useIndexData';
import { useIndexActions } from '../hooks/useIndexActions';
import { useNav } from '../hooks/useNav';
import { useWallet } from '../hooks/useWallet';
import { useMotoBalance } from '../hooks/useMotoBalance';
import { useTxTracker } from '../hooks/useTxTracker';
import { recordSnapshot, getSnapshots, type NavSnapshot } from '../hooks/useNavHistory';
import { formatTokenAmount, parseTokenInput, bpsToPercent, toFloat, shortenAddress } from '../lib/format';
import { estimateSharesOut, estimateMotoOut, investPriceImpact } from '../lib/estimator';
import { EXPLORER_TX_URL, EXPLORER_ADDRESS_URL } from '../config/network';

const EMPTY_CONFIG: import('../config/indexes').IndexConfig = {
  address: '', name: '', symbol: '', category: 'ai', description: '', components: [],
};

export function IndexDetailPage() {
  const { address } = useParams<{ address: string }>();
  const config = getIndexByAddress(address ?? '');
  const { connected, address: walletAddr } = useWallet();
  const { balance: motoBalance } = useMotoBalance();

  // All hooks must be called unconditionally (React rules of hooks)
  const safeConfig = config ?? EMPTY_CONFIG;
  const { totalSupply, components, loading, error } = useIndexData(safeConfig);
  const { nav } = useNav(safeConfig, components, totalSupply);
  const { invest, redeem, state: actionState } = useIndexActions();
  const { getTxsForIndex } = useTxTracker();
  const txs = address ? getTxsForIndex(address) : [];

  const [tab, setTab] = useState<'invest' | 'redeem'>('invest');
  const [investInput, setInvestInput] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [snapshots, setSnapshots] = useState<NavSnapshot[]>([]);

  // Record NAV snapshot on each update
  useEffect(() => {
    if (nav && address) {
      recordSnapshot(address, nav.navPerShare, nav.totalMotoValue);
      setSnapshots(getSnapshots(address, 'all'));
    }
  }, [nav, address]);

  if (!config || !address) {
    return (
      <div className="py-20 text-center text-dark-400">
        Index not found. <Link to="/" className="text-bitcoin-400 underline">Go back</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonCard /></div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const handleInvest = () => {
    const amount = parseTokenInput(investInput);
    if (amount <= 0n) return;
    const minShares = (amount * 98n) / 100n;
    invest(address, amount, minShares);
  };

  const handleRedeem = () => {
    const amount = parseTokenInput(redeemInput);
    if (amount <= 0n) return;
    redeem(address, amount, 0n);
  };

  const stepLabels = ['Approve', 'Confirm', 'Simulate', 'Send'];
  const stepIndex = actionState === 'approving' ? 0 : actionState === 'waiting-approve' ? 1 : actionState === 'simulating' ? 2 : actionState === 'sending' ? 3 : -1;

  // Invest/redeem estimates
  const investAmount = parseTokenInput(investInput);
  const redeemAmount = parseTokenInput(redeemInput);
  const estShares = nav && investAmount > 0n ? estimateSharesOut(investAmount, totalSupply, nav.totalMotoValue) : 0n;
  const estMoto = nav && redeemAmount > 0n ? estimateMotoOut(redeemAmount, totalSupply, nav.totalMotoValue) : 0n;
  const impact = nav && investAmount > 0n ? investPriceImpact(investAmount, nav.totalMotoValue) : 0;

  // Allocation chart data
  const allocData = nav?.components.map((c, i) => ({
    label: getTokenSymbol(config.components[i]?.address ?? c.address),
    value: c.actualWeightBps / 100,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-bold">{config.symbol}</h1>
            <Badge category={config.category} size="md" />
          </div>
          <p className="text-dark-400">{config.name}</p>
          <p className="text-sm text-dark-500 mt-1">{config.description}</p>
        </div>
        {nav && (
          <div className="text-right">
            <div className="text-xs text-dark-500">NAV per token</div>
            <div className="text-xl font-display font-bold gradient-text">
              {formatTokenAmount(nav.navPerShare)} MOTO
            </div>
            <div className="text-xs text-dark-500 mt-1">
              TVL: {formatTokenAmount(nav.totalMotoValue, 18, 2)} MOTO
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Composition table */}
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold">Composition</h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-dark-500 text-xs">
                      <th className="text-left pb-3 font-medium">Token</th>
                      <th className="text-right pb-3 font-medium">Price</th>
                      <th className="text-right pb-3 font-medium">Target</th>
                      <th className="text-right pb-3 font-medium">Actual</th>
                      <th className="text-right pb-3 font-medium">Holdings</th>
                      <th className="text-right pb-3 font-medium">Value</th>
                      <th className="text-right pb-3 font-medium">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/30">
                    {nav?.components.map((c, i) => (
                      <tr key={i} className="hover:bg-dark-700/20">
                        <td className="py-2.5 font-mono font-medium">
                          {getTokenSymbol(config.components[i]?.address ?? c.address)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-dark-300">
                          {c.pricePerToken > 0 ? c.pricePerToken.toFixed(4) : '-'}
                        </td>
                        <td className="py-2.5 text-right text-dark-300">
                          {bpsToPercent(c.weightBps)}
                        </td>
                        <td className="py-2.5 text-right text-dark-300">
                          {bpsToPercent(c.actualWeightBps)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs">
                          {formatTokenAmount(c.holding, 18, 2)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs">
                          {formatTokenAmount(c.motoValue, 18, 2)} M
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={
                              Math.abs(c.driftBps) > 500
                                ? 'text-red-400'
                                : Math.abs(c.driftBps) > 200
                                  ? 'text-yellow-400'
                                  : 'text-dark-500'
                            }
                          >
                            {c.driftBps > 0 ? '+' : ''}{bpsToPercent(c.driftBps)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* NAV Chart */}
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold">NAV Performance</h2>
            </CardHeader>
            <CardBody>
              <NavChart snapshots={snapshots} />
            </CardBody>
          </Card>

          {/* Weight bars + allocation donut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <div className="space-y-3">
                  {nav?.components.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-12 text-dark-400">
                        {getTokenSymbol(config.components[i]?.address ?? c.address)}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <ProgressBar
                          value={c.actualWeightBps / 100}
                          className="flex-1"
                        />
                        <span className="text-xs text-dark-500 w-12 text-right">
                          {bpsToPercent(c.actualWeightBps)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex items-center justify-center">
                <AllocationChart data={allocData} height={180} innerRadius={40} />
              </CardBody>
            </Card>
          </div>

          {/* Recent TXs */}
          {txs.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display font-semibold text-sm">Recent Transactions</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {txs.slice(0, 5).map((tx) => (
                    <div key={tx.txid} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={tx.type === 'invest' ? 'text-emerald-400' : 'text-red-400'}>
                          {tx.type === 'invest' ? 'Invest' : 'Redeem'}
                        </span>
                        <a
                          href={`${EXPLORER_TX_URL}${tx.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-dark-400 hover:text-dark-200"
                        >
                          {tx.txid.slice(0, 10)}...
                        </a>
                      </div>
                      <span className="text-dark-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <Card gradient>
            <CardBody className="space-y-4">
              {/* Tab Switcher */}
              <div className="flex rounded-lg bg-dark-800 p-1">
                <button
                  onClick={() => setTab('invest')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'invest' ? 'bg-bitcoin-500 text-white' : 'text-dark-400'
                  }`}
                >
                  Invest
                </button>
                <button
                  onClick={() => setTab('redeem')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'redeem' ? 'bg-dark-600 text-white' : 'text-dark-400'
                  }`}
                >
                  Redeem
                </button>
              </div>

              {tab === 'invest' ? (
                <>
                  {connected && motoBalance > 0n && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-400">Available</span>
                      <button
                        className="font-mono text-bitcoin-400 hover:text-bitcoin-300"
                        onClick={() => setInvestInput(formatTokenAmount(motoBalance, 18, 6))}
                      >
                        {formatTokenAmount(motoBalance, 18, 4)} MOTO
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-70">max</span>
                      </button>
                    </div>
                  )}
                  <Input
                    label="MOTO Amount"
                    placeholder="0.00"
                    suffix="MOTO"
                    value={investInput}
                    onChange={(e) => setInvestInput(e.target.value)}
                    type="text"
                    inputMode="decimal"
                  />
                  {/* Estimate preview */}
                  {investAmount > 0n && nav && (
                    <div className="bg-dark-800/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">Est. shares received</span>
                        <span className="font-mono text-dark-200">
                          ~{formatTokenAmount(estShares, 18, 4)} {config.symbol}
                        </span>
                      </div>
                      {impact > 2 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-yellow-400">Price impact</span>
                          <span className="font-mono text-yellow-400">{impact.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  {stepIndex >= 0 && (
                    <StepIndicator steps={stepLabels} current={stepIndex} />
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleInvest}
                    loading={actionState !== 'idle'}
                    disabled={!connected || !investInput}
                  >
                    {!connected ? 'Connect Wallet' : actionState !== 'idle' ? 'Processing...' : 'Invest'}
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    label={`${config.symbol} Amount`}
                    placeholder="0.00"
                    suffix={config.symbol}
                    value={redeemInput}
                    onChange={(e) => setRedeemInput(e.target.value)}
                    type="text"
                    inputMode="decimal"
                  />
                  {/* Redeem estimate */}
                  {redeemAmount > 0n && nav && (
                    <div className="bg-dark-800/50 rounded-lg p-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">Est. MOTO returned</span>
                        <span className="font-mono text-dark-200">
                          ~{formatTokenAmount(estMoto, 18, 4)} MOTO
                        </span>
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    variant="secondary"
                    onClick={handleRedeem}
                    loading={actionState !== 'idle'}
                    disabled={!connected || !redeemInput}
                  >
                    {!connected ? 'Connect Wallet' : 'Redeem for MOTO'}
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          {/* Contract Info */}
          <Card>
            <CardBody className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-dark-500">Contract</span>
                <a
                  href={`${EXPLORER_ADDRESS_URL}${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-dark-300 hover:text-bitcoin-400"
                >
                  {shortenAddress(address)}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Supply</span>
                <span className="font-mono text-dark-300">
                  {formatTokenAmount(totalSupply, 18, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Components</span>
                <span className="text-dark-300">{components.length}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
