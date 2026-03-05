import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastProvider } from './components/ui/Toast';
import { HomePage } from './pages/HomePage';
import { IndexDetailPage } from './pages/IndexDetailPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ExpertsPage } from './pages/ExpertsPage';
import { ExpertDetailPage } from './pages/ExpertDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminPage } from './pages/AdminPage';
import { TokenomicsPage } from './pages/TokenomicsPage';

function AppContent() {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/index/:address" element={<IndexDetailPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/expert/:slug" element={<ExpertDetailPage />} />
            <Route path="/tokenomics" element={<TokenomicsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletConnectProvider theme="dark">
        <AppContent />
      </WalletConnectProvider>
    </BrowserRouter>
  );
}
