import { type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
}

export function Card({ hover = false, gradient = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl',
        hover ? 'glass-hover cursor-pointer' : 'glass',
        gradient && 'gradient-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 py-4 border-b border-dark-700/50', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}
