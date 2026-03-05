import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { type NavSnapshot, type TimeRange } from '../../hooks/useNavHistory';

interface NavChartProps {
  snapshots: NavSnapshot[];
  height?: number;
}

const RANGES: TimeRange[] = ['24h', '7d', '30d', 'all'];

function formatNav(navStr: string): number {
  return Number(BigInt(navStr)) / 1e18;
}

export function NavChart({ snapshots, height = 240 }: NavChartProps) {
  const [range, setRange] = useState<TimeRange>('7d');

  const filtered = useMemo(() => {
    if (range === 'all') return snapshots;
    const ms: Record<TimeRange, number> = {
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      all: Infinity,
    };
    const cutoff = Date.now() - ms[range];
    return snapshots.filter((s) => s.t >= cutoff);
  }, [snapshots, range]);

  const data = useMemo(
    () => filtered.map((s) => ({ time: s.t, nav: formatNav(s.nav) })),
    [filtered],
  );

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-dark-500 text-sm" style={{ height }}>
        Collecting NAV data... Check back after a few blocks.
      </div>
    );
  }

  const minNav = Math.min(...data.map((d) => d.nav));
  const maxNav = Math.max(...data.map((d) => d.nav));
  const padding = (maxNav - minNav) * 0.1 || 0.001;

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              range === r
                ? 'bg-bitcoin-500/20 text-bitcoin-400'
                : 'text-dark-500 hover:text-dark-300'
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f7931a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t) =>
              range === '24h' ? format(t, 'HH:mm') : format(t, 'MMM d')
            }
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minNav - padding, maxNav + padding]}
            tickFormatter={(v: number) => v.toFixed(4)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid #2d2d44',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => format(t as number, 'MMM d, HH:mm')}
            formatter={(value: number) => [value.toFixed(6) + ' MOTO', 'NAV/Share']}
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="#f7931a"
            strokeWidth={2}
            fill="url(#navGradient)"
            dot={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
