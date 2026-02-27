import { createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultWallet: any = {
  isConnected: false,
  senderAddress: undefined,
  connect: () => { console.warn('Wallet provider not available'); },
  disconnect: () => { console.warn('Wallet provider not available'); },
  address: undefined,
  publicKey: undefined,
  hashedMLDSAKey: undefined,
  signer: undefined,
  mldsaSigner: undefined,
  p2trAddress: undefined,
  network: undefined,
  sendTransaction: async () => { throw new Error('Wallet not connected'); },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WalletContext = createContext<any>(defaultWallet);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWallet(): any {
  return useContext(WalletContext);
}
