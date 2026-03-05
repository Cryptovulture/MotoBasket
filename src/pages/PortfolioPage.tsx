import { Link } from 'react-router-dom';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { usePortfolio } from '../hooks/usePortfolio';
import { useWallet } from '../hooks/useWallet';
import { useAllIndexNav } from '../hooks/useAllIndexNav';
import { formatTokenAmount, toFloat } from '../lib/format';

export function PortfolioPage() {
  const { connected } = useWallet();
  const { positions, loading, totalIndexes } = usePortfolio();
  const navMap = useAllIndexNav();

  if (!connected) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-3">Portfolio</h1>
        <p className="text-dark-400">Connect your wallet to view your positions.</p>
      </div>
    );
  }

  // Compute MOTO values for each position
  const enriched = positions.map((pos) => {
    const navData = navMap[pos.index.address.toLowerCase()];
    let motoValue = 0n;
    if (navData && navData.navPerShare > 0n) {
      motoValue = (pos.balance * navData.navPerShare) / (10n ** 18n);
    }
    return { ...pos, motoValue };
  });

  const totalValue = enriched.reduce((sum, p) => sum + p.motoValue, 0n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Portfolio</h1>
          {totalValue > 0n && (
            <p className="text-sm text-dark-400 mt-1">
              Total: <span className="font-mono gradient-text font-semibold">{formatTokenAmount(totalValue, 18, 4)} MOTO</span>
            </p>
          )}
        </div>
        <span className="text-sm text-dark-400">
          {totalIndexes} position{totalIndexes !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-dark-400 mb-4">No positions yet.</p>
            <Link
              to="/"
              className="text-bitcoin-400 hover:text-bitcoin-300 text-sm font-medium"
            >
              Browse indexes to get started
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {enriched.map((pos) => {
            const pct = totalValue > 0n
              ? Number((pos.motoValue * 10000n) / totalValue) / 100
              : 0;

            return (
              <Link key={pos.index.address} to={`/index/${pos.index.address}`}>
                <Card hover className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold">{pos.index.symbol}</span>
                          <Badge category={pos.index.category} />
                        </div>
                        <p className="text-xs text-dark-500 mt-0.5">{pos.index.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">
                        {formatTokenAmount(pos.balance, 18, 4)}
                      </div>
                      <div className="text-xs text-dark-500">{pos.index.symbol} tokens</div>
                      {pos.motoValue > 0n && (
                        <div className="text-xs font-mono text-bitcoin-400 mt-0.5">
                          {formatTokenAmount(pos.motoValue, 18, 4)} MOTO
                          {pct > 0 && (
                            <span className="text-dark-500 ml-1">({pct.toFixed(1)}%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
