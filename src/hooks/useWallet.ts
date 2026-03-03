import { useWalletConnect } from '@btc-vision/walletconnect';

// Thin wrapper around walletconnect context for consistent API
export function useWallet() {
  const wc = useWalletConnect();

  return {
    connected: !!wc.walletAddress,
    address: wc.walletAddress ?? '',
    publicKey: wc.publicKey ?? '',
    connecting: wc.connecting,
    connect: wc.openConnectModal,
    disconnect: wc.disconnect,
    provider: wc.provider,
    signer: wc.signer,
    walletInstance: wc.walletInstance,
    addressObj: wc.address,
  };
}
