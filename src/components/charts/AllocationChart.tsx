import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Slice {
  label: string;
  value: number; // percentage or bps
  color?: string;
}

interface AllocationChartProps {
  data: Slice[];
  height?: number;
  innerRadius?: number;
}

const COLORS = [
  '#f7931a', // bitcoin orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
];

export function AllocationChart({ data, height = 200, innerRadius = 50 }: AllocationChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 30}
          paddingAngle={2}
          strokeWidth={0}
          animationDuration={300}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={data[i].color ?? COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid #2d2d44',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
