import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { useWallet } from '../../hooks/useWallet';
import { useBlockInfo } from '../../hooks/useBlockInfo';

const NAV_LINKS = [
  { to: '/', label: 'Indexes' },
  { to: '/experts', label: 'Experts' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/history', label: 'History' },
];

export function Navbar() {
  const { pathname } = useLocation();
  const { address, connected, connect, disconnect } = useWallet();
  const { blockNumber } = useBlockInfo();
  const [menuOpen, setMenuOpen] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <nav className="sticky top-0 z-40 glass border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logos/motobasket-main.png" alt="MotoBasket" className="h-8 w-8 rounded-lg" />
          <span className="font-display font-bold text-lg gradient-text hidden sm:block">
            MotoBasket
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === link.to
                  ? 'text-bitcoin-400 bg-bitcoin-500/10'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {blockNumber > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-dark-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
              Block {blockNumber.toLocaleString()}
            </div>
          )}

          {connected ? (
            <button
              onClick={disconnect}
              className="glass-hover rounded-lg px-3 py-2 text-xs font-mono text-dark-300 hover:text-dark-100"
            >
              {shortAddr}
            </button>
          ) : (
            <Button size="sm" onClick={connect}>
              Connect
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-dark-300 hover:text-dark-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-dark-700/50 px-4 py-3 space-y-1 animate-slide-down">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'block px-3 py-2 rounded-lg text-sm font-medium',
                pathname === link.to
                  ? 'text-bitcoin-400 bg-bitcoin-500/10'
                  : 'text-dark-300',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
