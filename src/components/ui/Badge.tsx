import { clsx } from 'clsx';
import { CATEGORY_META, type IndexCategory } from '../../config/indexes';

interface BadgeProps {
  category: IndexCategory;
  size?: 'sm' | 'md';
}

export function Badge({ category, size = 'sm' }: BadgeProps) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium bg-gradient-to-r',
        meta.gradient,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        'text-white',
      )}
    >
      {meta.label}
    </span>
  );
}
