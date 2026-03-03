import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getExpertBySlug } from '../config/experts';
import { EXPERT_INDEXES } from '../config/indexes';
import { getTokenSymbol } from '../config/tokens';
import { bpsToPercent } from '../lib/format';

export function ExpertDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const expert = getExpertBySlug(slug ?? '');

  if (!expert) {
    return (
      <div className="py-20 text-center text-dark-400">
        Expert not found. <Link to="/experts" className="text-bitcoin-400 underline">View all experts</Link>
      </div>
    );
  }

  const indexes = EXPERT_INDEXES.filter((idx) => idx.curatorSlug === expert.slug);

  return (
    <div className="space-y-8">
      {/* Profile */}
      <div className="flex items-center gap-6">
        <img
          src={expert.avatar}
          alt={expert.name}
          className="w-24 h-24 rounded-full ring-4 ring-bitcoin-500/20"
        />
        <div>
          <h1 className="text-2xl font-display font-bold">{expert.name}</h1>
          <p className="text-dark-400 text-sm">{expert.handle}</p>
          <p className="text-dark-300 mt-2 max-w-xl">{expert.bio}</p>
          <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-bitcoin-500/10 text-bitcoin-400 font-medium">
            {expert.focus}
          </span>
        </div>
      </div>

      {/* Their indexes */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4">Curated Indexes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indexes.map((idx) => (
            <Link
              key={idx.symbol}
              to={idx.address ? `/index/${idx.address}` : '#'}
            >
              <Card hover className="p-5 h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold">{idx.symbol}</h3>
                  <Badge category="expert" />
                </div>
                <p className="text-sm text-dark-400 mb-3">{idx.description}</p>
                <div className="space-y-1.5">
                  {idx.components.map((c) => (
                    <div key={c.address} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-dark-300">{getTokenSymbol(c.address)}</span>
                      <span className="text-dark-500">{bpsToPercent(c.weightBps)}</span>
                    </div>
                  ))}
                </div>
                {!idx.address && (
                  <p className="text-xs text-dark-500 italic mt-3">Not yet deployed</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
