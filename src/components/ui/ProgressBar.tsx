import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, color, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={clsx('w-full', className)}>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color ?? 'bg-bitcoin-500')}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-dark-400 mt-1 block">{clamped.toFixed(1)}%</span>
      )}
    </div>
  );
}
