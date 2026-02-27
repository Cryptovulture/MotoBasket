import { HashRouter, Routes, Route } from 'react-router-dom';
import { Component, type ReactNode, useMemo } from 'react';
import { WalletConnectProvider, useWalletConnect } from '@btc-vision/walletconnect';
import { Address } from '@btc-vision/transaction';
import '../node_modules/@btc-vision/walletconnect/browser/walletconnect.css';
import HomePage from './pages/HomePage';
import IndexDetailPage from './pages/IndexDetailPage';
import PortfolioPage from './pages/PortfolioPage';
import ExpertDashboard from './pages/KOLDashboard';
import Layout from './components/Layout';
import { WalletContext } from './hooks/useWallet';
import './index.css';

// Bridge that reads the real wallet context and pushes it into our own WalletContext
function WalletBridge({ children }: { children: ReactNode }) {
  let walletConnect: any = {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    walletConnect = useWalletConnect() as any;
  } catch {
    // hook failed
  }

  const value = useMemo(() => {
    const isConnected = Boolean(
      walletConnect?.isConnected ||
        (walletConnect?.hashedMLDSAKey && walletConnect?.publicKey),
    );

    // Build the Address object for SDK calls from the two keys WalletConnect
    // exposes. Address.fromString() requires BOTH params (hashedMLDSAKey,
    // legacyPublicKey) to produce a full Address with .equals() and
    // .originalPublicKey. Using walletConnect.address directly is unreliable
    // because some versions return a string, not an Address object.
    let senderAddressObj: Address | undefined;
    if (walletConnect?.hashedMLDSAKey && walletConnect?.publicKey) {
      try {
        senderAddressObj = Address.fromString(
          walletConnect.hashedMLDSAKey,
          walletConnect.publicKey,
        );
      } catch {
        // fallback: try the raw address if it's already an Address object
        if (walletConnect?.address && typeof walletConnect.address !== 'string' && 'equals' in walletConnect.address) {
          senderAddressObj = walletConnect.address;
        }
      }
    }

    // Display string for the UI
    let senderAddress: string | undefined;
    if (senderAddressObj) {
      try {
        senderAddress = senderAddressObj.toHex?.() ?? String(senderAddressObj);
      } catch { /* ignore */ }
    } else if (walletConnect?.address) {
      try {
        senderAddress =
          typeof walletConnect.address === 'string'
            ? walletConnect.address
            : walletConnect.address.toHex?.() ?? String(walletConnect.address);
      } catch { /* ignore */ }
    }

    return {
      ...walletConnect,
      isConnected,
      senderAddress,         // string for display
      senderAddressObj,      // Address object for SDK getContract() sender
      p2trAddress: walletConnect?.walletAddress ?? walletConnect?.p2trAddress ?? undefined,
      connect: walletConnect?.openConnectModal ?? (() => {}),
      disconnect: walletConnect?.disconnect ?? (() => {}),
    };
  }, [
    walletConnect?.isConnected,
    walletConnect?.hashedMLDSAKey,
    walletConnect?.publicKey,
    walletConnect?.address,
    walletConnect?.openConnectModal,
    walletConnect?.disconnect,
    walletConnect?.signer,
    walletConnect?.mldsaSigner,
    walletConnect?.walletAddress,
    walletConnect?.p2trAddress,
    walletConnect?.network,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function AppRoutes() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/index/:address" element={<IndexDetailPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/expert" element={<ExpertDashboard />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

// Tries to render with wallet provider; if it crashes, renders without it
class App extends Component<object, { walletFailed: boolean }> {
  state = { walletFailed: false };

  static getDerivedStateFromError() {
    return { walletFailed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('WalletConnectProvider crashed, running without wallet:', error.message);
  }

  render() {
    if (this.state.walletFailed) {
      // Wallet provider crashed — render app without it, navigation still works
      return <AppRoutes />;
    }

    return (
      <WalletConnectProvider theme="dark">
        <WalletBridge>
          <AppRoutes />
        </WalletBridge>
      </WalletConnectProvider>
    );
  }
}

export default App;
