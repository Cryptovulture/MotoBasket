import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EXPERTS } from '../config/experts';
import { EXPERT_INDEXES } from '../config/indexes';

export function ExpertsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold mb-2">Expert Curators</h1>
        <p className="text-dark-400">
          Crypto-native investors curating high-conviction index portfolios on Bitcoin L1.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXPERTS.map((expert) => {
          const indexes = EXPERT_INDEXES.filter((idx) => idx.curatorSlug === expert.slug);
          return (
            <Link key={expert.slug} to={`/expert/${expert.slug}`}>
              <Card hover className="p-6 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-16 h-16 rounded-full ring-2 ring-bitcoin-500/30"
                  />
                  <div>
                    <h3 className="font-display font-bold text-lg">{expert.name}</h3>
                    <p className="text-xs text-dark-400">{expert.handle}</p>
                  </div>
                </div>
                <p className="text-sm text-dark-300 mb-3">{expert.bio}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-bitcoin-400 font-medium">{expert.focus}</span>
                  <span className="text-dark-500">
                    {indexes.length} index{indexes.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
