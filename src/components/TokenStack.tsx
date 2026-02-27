interface TokenStackProps {
  value: number; // normalized 0-100 scale
  color?: string; // 'orange' | 'blue' | 'purple' | 'green'
  maxStacks?: number;
  maxHeight?: number; // max coins per stack
}

const COLORS = {
  orange: {
    face: '#F97316',
    faceDark: '#C2410C',
    edge: '#EA580C',
    edgeDark: '#9A3412',
    shine: '#FB923C',
    symbol: '#FED7AA',
  },
  blue: {
    face: '#3B82F6',
    faceDark: '#1D4ED8',
    edge: '#2563EB',
    edgeDark: '#1E40AF',
    shine: '#60A5FA',
    symbol: '#BFDBFE',
  },
  purple: {
    face: '#8B5CF6',
    faceDark: '#6D28D9',
    edge: '#7C3AED',
    edgeDark: '#5B21B6',
    shine: '#A78BFA',
    symbol: '#DDD6FE',
  },
  green: {
    face: '#22C55E',
    faceDark: '#15803D',
    edge: '#16A34A',
    edgeDark: '#166534',
    shine: '#4ADE80',
    symbol: '#BBF7D0',
  },
};

function getStackLayout(value: number, maxStacks: number, maxHeight: number): number[] {
  // Map value (0-100) to total coins
  const totalCoins = Math.max(1, Math.round((value / 100) * maxStacks * maxHeight));

  if (totalCoins <= maxHeight) {
    // Single stack
    return [totalCoins];
  }

  // Multiple stacks - distribute coins
  const numStacks = Math.min(maxStacks, Math.ceil(totalCoins / maxHeight));
  const stacks: number[] = [];
  let remaining = totalCoins;

  for (let i = 0; i < numStacks; i++) {
    const perStack = Math.min(maxHeight, Math.ceil(remaining / (numStacks - i)));
    stacks.push(perStack);
    remaining -= perStack;
  }

  // Sort descending so tallest stack is in the back
  return stacks.sort((a, b) => b - a);
}

export default function TokenStack({
  value,
  color = 'orange',
  maxStacks = 3,
  maxHeight = 8,
}: TokenStackProps) {
  const c = COLORS[color as keyof typeof COLORS] || COLORS.orange;
  const stacks = getStackLayout(value, maxStacks, maxHeight);

  const coinWidth = 36;
  const coinHeight = 6;
  const coinGap = 3;
  const stackSpacing = 18;
  const perspectiveOffset = 10; // ellipse height for 3D top face

  const totalWidth = stacks.length * stackSpacing + coinWidth;
  const tallestStack = Math.max(...stacks);
  const totalHeight = tallestStack * (coinHeight + coinGap) + perspectiveOffset + 4;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="flex-shrink-0"
    >
      <defs>
        {/* Coin face gradient */}
        <radialGradient id={`coinFace-${color}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={c.shine} />
          <stop offset="60%" stopColor={c.face} />
          <stop offset="100%" stopColor={c.faceDark} />
        </radialGradient>
        {/* Edge gradient */}
        <linearGradient id={`coinEdge-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.edge} />
          <stop offset="100%" stopColor={c.edgeDark} />
        </linearGradient>
      </defs>

      {stacks.map((stackSize, stackIndex) => {
        const stackX = stackIndex * stackSpacing;
        // Render from bottom to top; tallest stacks render first (back)
        return (
          <g key={stackIndex}>
            {Array.from({ length: stackSize }).map((_, coinIndex) => {
              const y = totalHeight - (coinIndex + 1) * (coinHeight + coinGap) - 2;

              return (
                <g key={coinIndex} transform={`translate(${stackX}, ${y})`}>
                  {/* Coin edge (side) */}
                  <rect
                    x={0}
                    y={perspectiveOffset / 2}
                    width={coinWidth}
                    height={coinHeight}
                    rx={2}
                    fill={`url(#coinEdge-${color})`}
                  />
                  {/* Left rounded edge */}
                  <ellipse
                    cx={0}
                    cy={perspectiveOffset / 2 + coinHeight / 2}
                    rx={1}
                    ry={coinHeight / 2}
                    fill={c.edgeDark}
                  />
                  {/* Right rounded edge */}
                  <ellipse
                    cx={coinWidth}
                    cy={perspectiveOffset / 2 + coinHeight / 2}
                    rx={1}
                    ry={coinHeight / 2}
                    fill={c.edgeDark}
                  />
                  {/* Coin top face (ellipse for 3D perspective) */}
                  <ellipse
                    cx={coinWidth / 2}
                    cy={perspectiveOffset / 2}
                    rx={coinWidth / 2}
                    ry={perspectiveOffset / 2}
                    fill={`url(#coinFace-${color})`}
                  />
                  {/* Inner ring on top face */}
                  <ellipse
                    cx={coinWidth / 2}
                    cy={perspectiveOffset / 2}
                    rx={coinWidth / 2 - 4}
                    ry={perspectiveOffset / 2 - 1.5}
                    fill="none"
                    stroke={c.symbol}
                    strokeWidth={0.75}
                    opacity={0.5}
                  />
                  {/* Shine highlight */}
                  <ellipse
                    cx={coinWidth / 2 - 5}
                    cy={perspectiveOffset / 2 - 1}
                    rx={6}
                    ry={2}
                    fill="white"
                    opacity={0.15}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
