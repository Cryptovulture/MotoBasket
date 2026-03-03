import { useMemo } from 'react';
import { JSONRpcProvider } from 'opnet';
import { RPC_URL, NETWORK } from '../config/network';

// Singleton provider — shared across all hooks
let providerInstance: JSONRpcProvider | null = null;

function getProvider(): JSONRpcProvider {
  if (!providerInstance) {
    providerInstance = new JSONRpcProvider(RPC_URL, NETWORK);
  }
  return providerInstance;
}

export function useProvider(): JSONRpcProvider {
  return useMemo(() => getProvider(), []);
}
