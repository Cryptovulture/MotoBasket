import { networks } from '@btc-vision/bitcoin';
import type { Network } from '@btc-vision/bitcoin';

// ── Network Toggle ── Change this one value for mainnet migration ─────────
export const ACTIVE_NETWORK: 'testnet' | 'mainnet' = 'testnet';

const NETWORK_CONFIG = {
  testnet: {
    network: networks.opnetTestnet,
    rpcUrl: 'https://testnet.opnet.org',
    explorerTxUrl: 'https://mempool.opnet.org/tx/',
    explorerAddressUrl: 'https://mempool.opnet.org/address/',
    name: 'OPNet Testnet',
  },
  mainnet: {
    network: networks.opnetTestnet, // TODO: update when mainnet launches
    rpcUrl: 'https://mainnet.opnet.org',
    explorerTxUrl: 'https://mempool.opnet.org/tx/',
    explorerAddressUrl: 'https://mempool.opnet.org/address/',
    name: 'OPNet Mainnet',
  },
} as const;

export const NET = NETWORK_CONFIG[ACTIVE_NETWORK];
export const NETWORK: Network = NET.network;
export const RPC_URL: string = NET.rpcUrl;
export const EXPLORER_TX_URL: string = NET.explorerTxUrl;
export const EXPLORER_ADDRESS_URL: string = NET.explorerAddressUrl;
export const NETWORK_NAME: string = NET.name;
