import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-dark-700/50 rounded',
        className ?? 'h-4 w-full',
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2 mt-2" />
    </div>
  );
}
