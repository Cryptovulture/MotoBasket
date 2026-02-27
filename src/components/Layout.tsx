import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import BlockInfo from './BlockInfo';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isConnected, connect, disconnect, senderAddress } = useWallet();

  const navigation = [
    { name: 'Indexes', href: '/' },
    { name: 'Experts', href: '/expert' },
    { name: 'Portfolio', href: '/portfolio' },
  ];

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-dark-900 bg-noise">
      {/* Navigation */}
      <nav className="border-b border-dark-700 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/motobasket-logo.png"
                alt="MotoBasket"
                className="w-10 h-10 rounded-lg transform group-hover:scale-110 transition-transform"
              />
              <div>
                <h1 className="text-xl font-display font-bold text-white">
                  MotoBasket
                </h1>
                <p className="text-xs text-dark-400 font-mono">MOTO Protocol</p>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-sm font-medium transition-colors relative group ${
                      isActive
                        ? 'text-bitcoin-500'
                        : 'text-dark-300 hover:text-white'
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-bitcoin-500" />
                    )}
                    {!isActive && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-bitcoin-500 scale-x-0 group-hover:scale-x-100 transition-transform" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Block Info */}
            <div className="hidden md:block">
              <BlockInfo />
            </div>

            {/* Connect Wallet */}
            <div>
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-800 border border-dark-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-mono text-white">
                      {formatAddress(senderAddress)}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-3 py-2 text-sm text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg border border-dark-700 transition-colors"
                    title="Disconnect wallet"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => connect()}
                  className="px-6 py-2.5 bg-gradient-to-r from-bitcoin-500 to-bitcoin-600 hover:from-bitcoin-600 hover:to-bitcoin-700 text-white font-medium rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-bitcoin-500/20"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800 bg-dark-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/motobasket-logo.png" alt="MotoBasket" className="w-8 h-8 rounded-lg" />
                <h2 className="text-lg font-display font-bold text-white">MotoBasket</h2>
              </div>
              <p className="text-dark-400 text-sm max-w-md">
                Diversified index investing on Bitcoin L1. Powered by MOTO and secured by OPNet.
              </p>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-dark-400">
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">GitHub</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Community</h3>
              <ul className="space-y-2 text-sm text-dark-400">
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-bitcoin-500 transition-colors">Telegram</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-dark-800 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-dark-500 text-sm">
              © 2026 MotoBasket. Built on Bitcoin L1.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="text-dark-500 hover:text-bitcoin-500 text-sm transition-colors">
                Terms
              </a>
              <a href="#" className="text-dark-500 hover:text-bitcoin-500 text-sm transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
