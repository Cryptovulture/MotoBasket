import { networks } from '@btc-vision/bitcoin';
import type { Network } from '@btc-vision/bitcoin';

// ============================================================================
// NETWORK CONFIGURATION — OPNet Testnet
// ============================================================================
export const NETWORK: Network = networks.opnetTestnet;
export const RPC_URL = 'https://testnet.opnet.org';

// ============================================================================
// DEPLOYED CONTRACT ADDRESSES (Testnet)
// ============================================================================

// Core protocol contracts
export const EXPERT_INDEX_ADDRESS = '0xdcbb2487c8da960a56b5b2c461024fa3b67f1337b51cb4acb1a3422dd2d6d770';
export const BATCH_ROUTER_ADDRESS = '0x00776fb7580f41ec6d53da28480500384e7ad28dd164c938d4aa0695bd47f188';

// MOTO token — base currency for investments
export const MOTO_TOKEN_ADDRESS = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

// MotoSwap DEX (testnet)
export const MOTOSWAP_ROUTER_ADDRESS = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';
export const MOTOSWAP_FACTORY_ADDRESS = '';

// Legacy — not used on testnet (base token is MOTO directly)
export const BASKET_TOKEN_ADDRESS = '';

export const BASKET_DECIMALS = 8;
export const MOTO_DECIMALS = 18;

export const INDEX_BASE_TOKEN = MOTO_TOKEN_ADDRESS;
export const INDEX_BASE_DECIMALS = MOTO_DECIMALS;

// App configuration
export const CONFIG = {
  appName: 'MotoBasket',
  appTagline: 'Invest in Bitcoin Like a Pro',
  platformFee: 0.0095,
};

// ============================================================================
// ALL TOKEN ADDRESSES (from testnet-deployed-addresses.json)
// ============================================================================

// Known token metadata (testnet) — all deployed tokens with LP pools
export const TOKEN_META: Record<string, { symbol: string; name: string; decimals: number }> = {
  // Base
  [MOTO_TOKEN_ADDRESS]: { symbol: 'MOTO', name: 'Motoswap', decimals: 18 },
  // Original tokens
  '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04': { symbol: 'NEBL', name: 'Nebula Token', decimals: 18 },
  '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940': { symbol: 'CPHR', name: 'Cipher Coin', decimals: 18 },
  '0x22f48fcf70308931285e65325b79281683b9071c73663bd68ab5d97f79cd794d': { symbol: 'VRTX', name: 'Vortex Coin', decimals: 18 },
  // AI tokens
  '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f': { symbol: 'NRNA', name: 'NeuralNet Protocol', decimals: 18 },
  '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c': { symbol: 'SYNP', name: 'Synapse AI', decimals: 18 },
  '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c': { symbol: 'CRTX', name: 'Cortex Compute', decimals: 18 },
  '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7': { symbol: 'DPLR', name: 'DeepLayer', decimals: 18 },
  // Meme tokens
  '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6': { symbol: 'PEEP', name: 'Pepe BTC', decimals: 18 },
  '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22': { symbol: 'DGEN', name: 'Degen Coin', decimals: 18 },
  '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258': { symbol: 'BONQ', name: 'Bonk L1', decimals: 18 },
  '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383': { symbol: 'SHBA', name: 'Shiba Bitcoin', decimals: 18 },
  // DeFi tokens
  '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18': { symbol: 'LNDB', name: 'LendBTC', decimals: 18 },
  '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b': { symbol: 'YLDP', name: 'Yield Protocol', decimals: 18 },
  '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46': { symbol: 'SWPX', name: 'SwapX', decimals: 18 },
  // Food tokens
  '0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce': { symbol: 'MNGO', name: 'Mango Coin', decimals: 18 },
  '0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27': { symbol: 'APPL', name: 'Apple Token', decimals: 18 },
  '0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd': { symbol: 'AVDO', name: 'Avocado', decimals: 18 },
  '0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1': { symbol: 'BERY', name: 'Berry Finance', decimals: 18 },
};

// Display names for on-chain baskets (basketId -> friendly name)
export const BASKET_DISPLAY_NAMES: Record<string, string> = {
  '1': 'NEBL-CPHR-VRTX Index',
  '2': 'CPHR-VRTX 50/50',
  '3': 'Artificial Intelligence Index',
  '4': 'Meme Token Index',
  '5': 'Bitcoin DeFi Index',
  '6': 'Fresh Produce Index',
  '7': 'Blue Chip Index',
  '8': "Danny's Alpha Picks",
  '9': "Chad's BTC Maxi Basket",
  '10': "Vulture's Degen Plays",
  '11': "Ansem's Smart Money",
  '12': "GCR's Contrarian Basket",
};

// Expert metadata for baskets managed by KOLs
export const EXPERT_BASKETS: Record<string, {
  creator: string;
  avatar: string;
  description: string;
  isExpert: boolean;
}> = {
  '8': {
    creator: '@danny_btc',
    avatar: '/kol-avatars/danny.png',
    description: 'High-conviction AI and DeFi plays from a top Bitcoin trader',
    isExpert: true,
  },
  '9': {
    creator: '@chad_btc',
    avatar: '/kol-avatars/chad.png',
    description: 'Bitcoin maximalist plays — blue chips and DeFi infrastructure',
    isExpert: true,
  },
  '10': {
    creator: '@crypto_vulture',
    avatar: '/kol-avatars/vulture.png',
    description: 'High risk, high reward — memes and micro-caps on Bitcoin L1',
    isExpert: true,
  },
  '11': {
    creator: '@anslorian',
    avatar: '/kol-avatars/ansem.png',
    description: 'Institutional-grade allocations across AI and blue chips',
    isExpert: true,
  },
  '12': {
    creator: '@gaygcr',
    avatar: '/kol-avatars/gaygcr.png',
    description: 'Contrarian bets — overlooked food tokens and undervalued AI plays',
    isExpert: true,
  },
};
