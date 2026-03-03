import { useMemo } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { Address } from '@btc-vision/transaction';

// Thin wrapper around walletconnect context for consistent API
export function useWallet() {
  const wc = useWalletConnect();

  // Build sender Address from hashedMLDSAKey + publicKey (the canonical OPNet way)
  const senderAddress = useMemo(() => {
    if (!wc.hashedMLDSAKey || !wc.publicKey) return null;
    try {
      return Address.fromString(wc.hashedMLDSAKey, wc.publicKey);
    } catch {
      // Fallback to the walletconnect-provided address
      return wc.address ?? null;
    }
  }, [wc.hashedMLDSAKey, wc.publicKey, wc.address]);

  return {
    connected: !!wc.walletAddress,
    address: wc.walletAddress ?? '',
    publicKey: wc.publicKey ?? '',
    hashedMLDSAKey: wc.hashedMLDSAKey ?? '',
    connecting: wc.connecting,
    connect: wc.openConnectModal,
    disconnect: wc.disconnect,
    provider: wc.provider,
    signer: wc.signer,
    walletInstance: wc.walletInstance,
    network: wc.network,
    senderAddress,
  };
}
