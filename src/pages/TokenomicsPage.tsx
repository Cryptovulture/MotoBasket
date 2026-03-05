import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { AllocationChart } from '../components/charts/AllocationChart';

const DISTRIBUTION = [
  { label: 'Community Rewards', value: 60, color: '#f7931a', desc: 'Earned by investing in indexes. The more you invest, the more BASKET you earn over time.' },
  { label: 'Liquidity Pool', value: 15, color: '#8b5cf6', desc: 'Paired with MOTO on MotoSwap to ensure deep on-chain liquidity from day one.' },
  { label: 'Development', value: 10, color: '#06b6d4', desc: 'Funds ongoing protocol development, audits, and infrastructure.' },
  { label: 'Founder', value: 5, color: '#10b981', desc: '12-month linear vesting. Aligned with long-term protocol success.' },
  { label: 'MotoCats Airdrop', value: 5, color: '#f59e0b', desc: 'Rewarding the earliest OPNet community members.' },
  { label: 'Staking Rewards', value: 5, color: '#ef4444', desc: 'Distributed to BASKET stakers from protocol fee revenue.' },
];

export function TokenomicsPage() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="text-center py-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          <span className="gradient-text">BASKET</span> Token
        </h1>
        <p className="text-dark-300 max-w-lg mx-auto">
          The governance and revenue-sharing token for MotoBasket protocol.
          Earn it by investing, stake it for yield.
        </p>
      </section>

      {/* Distribution */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-6">Token Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardBody className="flex items-center justify-center py-6">
              <AllocationChart data={DISTRIBUTION} height={240} innerRadius={60} />
            </CardBody>
          </Card>
          <div className="space-y-3">
            {DISTRIBUTION.map((item) => (
              <Card key={item.label}>
                <CardBody className="py-3 px-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-display font-semibold text-sm">{item.label}</span>
                    <span className="ml-auto font-mono text-sm text-dark-300">{item.value}%</span>
                  </div>
                  <p className="text-xs text-dark-500 ml-6">{item.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-6">Fee Structure</h2>
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-dark-500 text-xs">
                    <th className="text-left pb-3 font-medium">Action</th>
                    <th className="text-right pb-3 font-medium">Fee</th>
                    <th className="text-left pb-3 font-medium pl-6">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  <tr>
                    <td className="py-3 font-medium">Invest</td>
                    <td className="py-3 text-right font-mono">0.5%</td>
                    <td className="py-3 pl-6 text-dark-400">BASKET staking pool</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Redeem</td>
                    <td className="py-3 text-right font-mono">0.5%</td>
                    <td className="py-3 pl-6 text-dark-400">BASKET staking pool</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Rebalance</td>
                    <td className="py-3 text-right font-mono">0%</td>
                    <td className="py-3 pl-6 text-dark-400">No fee (public good)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Staking */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-6">Staking Mechanics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="font-display font-semibold">Revenue Sharing</h3>
              <p className="text-sm text-dark-400">
                All invest/redeem fees flow to the BASKET staking pool. Stakers earn a
                proportional share of every protocol transaction.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-bitcoin-500/10 text-bitcoin-400 font-mono">0.5% of invest</span>
                <span className="text-dark-600">+</span>
                <span className="px-2 py-1 rounded bg-bitcoin-500/10 text-bitcoin-400 font-mono">0.5% of redeem</span>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <h3 className="font-display font-semibold">Slashing Timer</h3>
              <p className="text-sm text-dark-400">
                Claiming rewards resets a 2,000-block timer (~14 hours). Unstaking before
                the timer expires forfeits accrued rewards for that cycle.
              </p>
              <div className="text-xs text-dark-500">
                Modeled after MOTO's Proof of HODL mechanism
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Governance Roadmap */}
      <section className="pb-8">
        <h2 className="text-xl font-display font-semibold mb-6">Governance Roadmap</h2>
        <Card>
          <CardBody>
            <div className="space-y-4">
              <RoadmapStep
                phase="Phase 1"
                title="Multisig"
                desc="Protocol controlled by a 3-of-5 multisig. Index composition and weights managed by curators."
                active
              />
              <RoadmapStep
                phase="Phase 2"
                title="BASKET Voting"
                desc="BASKET holders vote on index additions, weight changes, and fee parameters."
              />
              <RoadmapStep
                phase="Phase 3"
                title="Full DAO"
                desc="On-chain governance with proposal creation, timelocked execution, and treasury management."
              />
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function RoadmapStep({
  phase,
  title,
  desc,
  active = false,
}: {
  phase: string;
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            active
              ? 'bg-bitcoin-500 text-white'
              : 'bg-dark-700 text-dark-500'
          }`}
        >
          {active ? '\u2713' : '\u2022'}
        </div>
        <div className="w-px flex-1 bg-dark-700 mt-1" />
      </div>
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-dark-500">{phase}</span>
          <span className="font-display font-semibold">{title}</span>
          {active && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-400 font-medium uppercase">
              Current
            </span>
          )}
        </div>
        <p className="text-sm text-dark-400">{desc}</p>
      </div>
    </div>
  );
}
