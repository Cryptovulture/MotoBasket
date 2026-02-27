import { useMemo } from 'react';
import { JSONRpcProvider } from 'opnet';
import { NETWORK, RPC_URL } from '../config/contracts';

let providerInstance: JSONRpcProvider | null = null;

export function useProvider() {
  const provider = useMemo(() => {
    if (!providerInstance) {
      providerInstance = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    }
    return providerInstance;
  }, []);

  return { provider, network: NETWORK };
}
