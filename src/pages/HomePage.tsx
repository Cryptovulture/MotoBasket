import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CATEGORY_INDEXES, EXPERT_INDEXES, CATEGORY_META } from '../config/indexes';
import { EXPERTS, getExpertBySlug } from '../config/experts';
import { getTokenSymbol } from '../config/tokens';

export function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative py-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-500/5 via-transparent to-transparent" />
        <div className="relative space-y-6">
          <img
            src="/logos/motobasket-main.png"
            alt="MotoBasket"
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg shadow-bitcoin-500/20"
          />
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            <span className="gradient-text">MotoBasket</span>
          </h1>
          <p className="text-lg text-dark-300 max-w-xl mx-auto">
            Diversified index investing on Bitcoin L1. One token, instant exposure
            to the best of OPNet.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm">
            <Stat label="Indexes" value={String(CATEGORY_INDEXES.length + EXPERT_INDEXES.length)} />
            <Stat label="Categories" value={String(CATEGORY_INDEXES.length)} />
            <Stat label="Experts" value={String(EXPERT_INDEXES.length)} />
          </div>
        </div>
      </section>

      {/* Category Indexes */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-6">Category Indexes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORY_INDEXES.map((idx) => (
            <Link key={idx.symbol} to={idx.address ? `/index/${idx.address}` : '#'}>
              <Card hover className="p-5 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg">{idx.symbol}</h3>
                    <p className="text-sm text-dark-400">{idx.name}</p>
                  </div>
                  <Badge category={idx.category} />
                </div>
                <p className="text-xs text-dark-500 mb-3">{idx.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {idx.components.map((c) => (
                    <span
                      key={c.address}
                      className="px-2 py-0.5 text-xs rounded bg-dark-700/50 text-dark-300 font-mono"
                    >
                      {getTokenSymbol(c.address)}
                    </span>
                  ))}
                </div>
                {!idx.address && (
                  <span className="mt-3 inline-block text-xs text-dark-500 italic">
                    Not yet deployed
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Expert Spotlight */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold">Expert Indexes</h2>
          <Link to="/experts" className="text-sm text-bitcoin-400 hover:text-bitcoin-300">
            View all experts
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERT_INDEXES.map((idx) => {
            const expert = getExpertBySlug(idx.curatorSlug ?? '');
            return (
              <Link key={idx.symbol} to={idx.address ? `/index/${idx.address}` : `/expert/${idx.curatorSlug}`}>
                <Card hover className="p-5 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    {expert && (
                      <img
                        src={expert.avatar}
                        alt={expert.name}
                        className="w-10 h-10 rounded-full ring-2 ring-bitcoin-500/30"
                      />
                    )}
                    <div>
                      <h3 className="font-display font-semibold">{idx.symbol}</h3>
                      <p className="text-xs text-dark-400">
                        {expert?.name ?? 'Unknown'} &middot; {expert?.focus}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-dark-500 mb-3">{idx.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {idx.components.map((c) => (
                      <span
                        key={c.address}
                        className="px-2 py-0.5 text-xs rounded bg-dark-700/50 text-dark-300 font-mono"
                      >
                        {getTokenSymbol(c.address)}
                      </span>
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="pb-8">
        <h2 className="text-xl font-display font-semibold mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Step num={1} title="Choose an Index" desc="Pick a category or expert-curated index that matches your thesis." />
          <Step num={2} title="Invest MOTO" desc="Send MOTO to the index contract. It auto-swaps into all component tokens." />
          <Step num={3} title="Hold or Redeem" desc="Your index token tracks the basket. Redeem anytime to get MOTO back." />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-display font-bold gradient-text">{value}</div>
      <div className="text-xs text-dark-500 mt-0.5">{label}</div>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-bitcoin-500/10 border border-bitcoin-500/30 flex items-center justify-center mx-auto">
        <span className="text-bitcoin-400 font-display font-bold">{num}</span>
      </div>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="text-sm text-dark-400">{desc}</p>
    </div>
  );
}
