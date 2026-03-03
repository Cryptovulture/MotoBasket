import { useMemo } from 'react';
import { JSONRpcProvider } from 'opnet';
import { RPC_URL, NETWORK } from '../config/network';

// Singleton provider — shared across all hooks
let providerInstance: JSONRpcProvider | null = null;

export function getProvider(): JSONRpcProvider {
  if (!providerInstance) {
    providerInstance = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
  }
  return providerInstance;
}

export function useProvider(): JSONRpcProvider {
  return useMemo(() => getProvider(), []);
}
