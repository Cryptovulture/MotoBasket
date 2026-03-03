export function Footer() {
  return (
    <footer className="border-t border-dark-700/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-dark-500">
        <span>MotoBasket - Diversified index investing on Bitcoin L1</span>
        <div className="flex items-center gap-4">
          <a
            href="https://opnet.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-dark-300 transition-colors"
          >
            OPNet
          </a>
          <a
            href="https://motoswap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-dark-300 transition-colors"
          >
            MotoSwap
          </a>
        </div>
      </div>
    </footer>
  );
}
