import { clsx } from 'clsx';

interface StepIndicatorProps {
  steps: string[];
  current: number; // 0-based
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < current && 'bg-bitcoin-500 text-white',
              i === current && 'bg-bitcoin-500/20 text-bitcoin-400 ring-2 ring-bitcoin-500',
              i > current && 'bg-dark-700 text-dark-500',
            )}
          >
            {i < current ? '\u2713' : i + 1}
          </div>
          <span
            className={clsx(
              'text-xs font-medium hidden sm:inline',
              i <= current ? 'text-dark-200' : 'text-dark-500',
            )}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <div
              className={clsx(
                'w-8 h-0.5 rounded',
                i < current ? 'bg-bitcoin-500' : 'bg-dark-700',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
