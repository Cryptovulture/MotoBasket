import { type ReactNode, useEffect } from 'react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative glass rounded-2xl shadow-2xl animate-slide-up',
          wide ? 'w-full max-w-2xl' : 'w-full max-w-md',
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/50">
            <h2 className="text-lg font-display font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-dark-400 hover:text-dark-100 transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
