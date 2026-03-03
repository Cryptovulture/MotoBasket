import { type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  error?: string;
}

export function Input({ label, suffix, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-dark-300 font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={clsx(
            'w-full bg-dark-800 border rounded-lg px-3 py-2.5 text-dark-100 font-mono text-sm',
            'placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-bitcoin-500/50',
            'transition-colors',
            error ? 'border-red-500' : 'border-dark-600 focus:border-bitcoin-500',
            suffix && 'pr-16',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-dark-400 font-medium">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
