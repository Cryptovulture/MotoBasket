import { useState } from 'react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ALL_INDEXES, type IndexConfig } from '../config/indexes';
import { getTokenSymbol } from '../config/tokens';
import { useWallet } from '../hooks/useWallet';
import { useIndexData } from '../hooks/useIndexData';
import { useNav } from '../hooks/useNav';
import { useRebalance } from '../hooks/useRebalance';
import { formatTokenAmount, bpsToPercent } from '../lib/format';

export function AdminPage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-3">Admin</h1>
        <p className="text-dark-400">Connect deployer wallet to access admin controls.</p>
      </div>
    );
  }

  const deployedIndexes = ALL_INDEXES.filter((idx) => idx.address);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
      <p className="text-sm text-dark-400">
        Deployer-only controls. Rebalance and weight management for all indexes.
      </p>

      <div className="space-y-6">
        {deployedIndexes.map((idx) => (
          <AdminIndexCard key={idx.address} config={idx} />
        ))}
      </div>

      {deployedIndexes.length === 0 && (
        <Card>
          <CardBody className="py-8 text-center text-dark-400">
            No deployed indexes found.
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function AdminIndexCard({ config }: { config: IndexConfig }) {
  const { components, totalSupply, loading } = useIndexData(config);
  const { nav } = useNav(config, components, totalSupply);
  const { triggerRebalance, loading: rebalancing } = useRebalance();
  const [expanded, setExpanded] = useState(false);

  const maxDrift = nav
    ? Math.max(...nav.components.map((c) => Math.abs(c.driftBps)))
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold">{config.symbol}</span>
            <Badge category={config.category} />
            {maxDrift > 500 && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                Drift: {bpsToPercent(maxDrift)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Details'}
            </Button>
            <Button
              size="sm"
              onClick={() => triggerRebalance(config.address)}
              loading={rebalancing}
              disabled={maxDrift < 200}
            >
              Rebalance
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && nav && (
        <CardBody>
          <div className="space-y-3">
            {nav.components.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono w-12 text-dark-400">
                  {getTokenSymbol(config.components[i]?.address ?? c.address)}
                </span>
                <ProgressBar
                  value={c.actualWeightBps / 100}
                  className="flex-1"
                  color={
                    Math.abs(c.driftBps) > 500
                      ? 'bg-red-500'
                      : Math.abs(c.driftBps) > 200
                        ? 'bg-yellow-500'
                        : 'bg-bitcoin-500'
                  }
                />
                <span className="text-xs text-dark-500 w-20 text-right">
                  {bpsToPercent(c.actualWeightBps)} / {bpsToPercent(c.weightBps)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dark-700/30 flex gap-4 text-xs text-dark-500">
            <span>Supply: {formatTokenAmount(totalSupply, 18, 2)}</span>
            <span>TVL: {formatTokenAmount(nav.totalMotoValue, 18, 2)} MOTO</span>
          </div>
        </CardBody>
      )}
    </Card>
  );
}
