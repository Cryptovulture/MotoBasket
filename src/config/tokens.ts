export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  category: 'base' | 'ai' | 'meme' | 'defi' | 'infra' | 'gaming';
}

// ── MOTO (base currency) ─────────────────────────────────────────────────
export const MOTO_ADDRESS = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
export const MOTO_DECIMALS = 18;
export const INDEX_DECIMALS = 18;

// ── MotoSwap DEX ─────────────────────────────────────────────────────────
export const MOTOSWAP_ROUTER = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';
export const MOTOSWAP_FACTORY = '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

// ── All deployed token addresses (testnet) ───────────────────────────────
export const TOKENS: Record<string, TokenMeta> = {
  // Base
  [MOTO_ADDRESS]: { symbol: 'MOTO', name: 'Motoswap', decimals: 18, category: 'base' },

  // AI tokens
  '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f': { symbol: 'NRNA', name: 'NeuralNet Protocol', decimals: 18, category: 'ai' },
  '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c': { symbol: 'SYNP', name: 'Synapse AI', decimals: 18, category: 'ai' },
  '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c': { symbol: 'CRTX', name: 'Cortex Compute', decimals: 18, category: 'ai' },
  '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7': { symbol: 'DPLR', name: 'DeepLayer', decimals: 18, category: 'ai' },
  '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940': { symbol: 'CPHR', name: 'Cipher Coin', decimals: 18, category: 'ai' },

  // Meme tokens
  '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6': { symbol: 'PEEP', name: 'Pepe BTC', decimals: 18, category: 'meme' },
  '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22': { symbol: 'DGEN', name: 'Degen Coin', decimals: 18, category: 'meme' },
  '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258': { symbol: 'BONQ', name: 'Bonk L1', decimals: 18, category: 'meme' },
  '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383': { symbol: 'SHBA', name: 'Shiba Bitcoin', decimals: 18, category: 'meme' },

  // DeFi tokens
  '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18': { symbol: 'LNDB', name: 'LendBTC', decimals: 18, category: 'defi' },
  '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b': { symbol: 'YLDP', name: 'Yield Protocol', decimals: 18, category: 'defi' },
  '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46': { symbol: 'SWPX', name: 'SwapX', decimals: 18, category: 'defi' },
  '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04': { symbol: 'NEBL', name: 'Nebula Token', decimals: 18, category: 'defi' },

  // Infrastructure tokens
  '0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 18, category: 'infra' },
  '0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018': { symbol: 'STSH', name: 'Stash Token', decimals: 18, category: 'infra' },
  '0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53': { symbol: 'PILL', name: 'PillCoin', decimals: 18, category: 'infra' },
  '0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514': { symbol: 'STR8', name: 'Str8 Token', decimals: 18, category: 'infra' },

  // Gaming tokens
  '0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce': { symbol: 'MNGO', name: 'Mango Coin', decimals: 18, category: 'gaming' },
  '0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27': { symbol: 'APPL', name: 'Apple Token', decimals: 18, category: 'gaming' },
  '0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd': { symbol: 'AVDO', name: 'Avocado', decimals: 18, category: 'gaming' },
  '0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1': { symbol: 'BERY', name: 'Berry Finance', decimals: 18, category: 'gaming' },
};

// ── Shorthand address constants ──────────────────────────────────────────
export const ADDR = {
  NRNA: '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f',
  SYNP: '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c',
  CRTX: '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c',
  DPLR: '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7',
  CPHR: '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940',
  PEEP: '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6',
  DGEN: '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22',
  BONQ: '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258',
  SHBA: '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383',
  LNDB: '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18',
  YLDP: '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b',
  SWPX: '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46',
  NEBL: '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04',
  WBTC: '0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d',
  STSH: '0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018',
  PILL: '0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53',
  STR8: '0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514',
  MNGO: '0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce',
  APPL: '0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27',
  AVDO: '0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd',
  BERY: '0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1',
} as const;

export function getTokenSymbol(address: string): string {
  return TOKENS[address]?.symbol ?? address.slice(0, 10);
}

export function getTokenName(address: string): string {
  return TOKENS[address]?.name ?? 'Unknown';
}
