import { ADDR } from './tokens';

export type IndexCategory = 'ai' | 'meme' | 'defi' | 'gaming' | 'infra' | 'expert';

export interface IndexComponent {
  address: string;
  weightBps: number; // basis points, sum to 10000
}

export interface IndexConfig {
  address: string; // deployed contract address (empty = not yet deployed)
  name: string;
  symbol: string;
  category: IndexCategory;
  description: string;
  curatorSlug?: string; // links to expert profile
  components: IndexComponent[];
}

// ── Category Indexes (5) ─────────────────────────────────────────────────

export const CATEGORY_INDEXES: IndexConfig[] = [
  {
    address: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8',
    name: 'OPNet AI Index',
    symbol: 'OPAI',
    category: 'ai',
    description: 'Top AI infrastructure and compute tokens on Bitcoin L1',
    components: [
      { address: ADDR.NRNA, weightBps: 2000 },
      { address: ADDR.SYNP, weightBps: 2000 },
      { address: ADDR.CRTX, weightBps: 2000 },
      { address: ADDR.DPLR, weightBps: 2000 },
      { address: ADDR.CPHR, weightBps: 2000 },
    ],
  },
  {
    address: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd',
    name: 'OPNet Meme Index',
    symbol: 'OPMEME',
    category: 'meme',
    description: 'Top performing meme coins on Bitcoin L1',
    components: [
      { address: ADDR.PEEP, weightBps: 2500 },
      { address: ADDR.DGEN, weightBps: 2500 },
      { address: ADDR.BONQ, weightBps: 2500 },
      { address: ADDR.SHBA, weightBps: 2500 },
    ],
  },
  {
    address: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead',
    name: 'OPNet DeFi Index',
    symbol: 'OPDEFI',
    category: 'defi',
    description: 'Core DeFi protocols on Bitcoin L1',
    components: [
      { address: ADDR.LNDB, weightBps: 2500 },
      { address: ADDR.YLDP, weightBps: 2500 },
      { address: ADDR.SWPX, weightBps: 2500 },
      { address: ADDR.NEBL, weightBps: 2500 },
    ],
  },
  {
    address: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c',
    name: 'OPNet Gaming Index',
    symbol: 'OPGAME',
    category: 'gaming',
    description: 'Gaming and entertainment tokens on Bitcoin L1',
    components: [
      { address: ADDR.MNGO, weightBps: 2500 },
      { address: ADDR.APPL, weightBps: 2500 },
      { address: ADDR.AVDO, weightBps: 2500 },
      { address: ADDR.BERY, weightBps: 2500 },
    ],
  },
  {
    address: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c',
    name: 'OPNet Infra Index',
    symbol: 'OPINFRA',
    category: 'infra',
    description: 'Bitcoin infrastructure and utility tokens',
    components: [
      { address: ADDR.WBTC, weightBps: 2500 },
      { address: ADDR.STSH, weightBps: 2500 },
      { address: ADDR.PILL, weightBps: 2500 },
      { address: ADDR.STR8, weightBps: 2500 },
    ],
  },
];

// ── Expert Indexes (5) ───────────────────────────────────────────────────

export const EXPERT_INDEXES: IndexConfig[] = [
  {
    address: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7',
    name: 'Ansem AI Conviction',
    symbol: 'ANSEM',
    category: 'expert',
    curatorSlug: 'ansem',
    description: 'AI-heavy conviction picks by Ansem',
    components: [
      { address: ADDR.NRNA, weightBps: 3000 },
      { address: ADDR.CRTX, weightBps: 2500 },
      { address: ADDR.SYNP, weightBps: 2000 },
      { address: ADDR.DPLR, weightBps: 1500 },
      { address: ADDR.CPHR, weightBps: 1000 },
    ],
  },
  {
    address: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65',
    name: 'Chad Degen Plays',
    symbol: 'CHAD',
    category: 'expert',
    curatorSlug: 'chad',
    description: 'Maximum degen meme exposure by Chad',
    components: [
      { address: ADDR.PEEP, weightBps: 3000 },
      { address: ADDR.DGEN, weightBps: 3000 },
      { address: ADDR.BONQ, weightBps: 2000 },
      { address: ADDR.SHBA, weightBps: 2000 },
    ],
  },
  {
    address: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe',
    name: 'OpDanny Alpha',
    symbol: 'DANNY',
    category: 'expert',
    curatorSlug: 'danny',
    description: 'Cross-sector alpha picks by OpDanny',
    components: [
      { address: ADDR.NRNA, weightBps: 3000 },
      { address: ADDR.DGEN, weightBps: 2500 },
      { address: ADDR.YLDP, weightBps: 2500 },
      { address: ADDR.CPHR, weightBps: 2000 },
    ],
  },
  {
    address: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a',
    name: 'GCR DeFi Infra',
    symbol: 'GCR',
    category: 'expert',
    curatorSlug: 'gaygcr',
    description: 'DeFi infrastructure thesis by GayGCR',
    components: [
      { address: ADDR.LNDB, weightBps: 2500 },
      { address: ADDR.YLDP, weightBps: 2500 },
      { address: ADDR.WBTC, weightBps: 2500 },
      { address: ADDR.STSH, weightBps: 2500 },
    ],
  },
  {
    address: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad',
    name: 'Vulture Deep Value',
    symbol: 'VULTURE',
    category: 'expert',
    curatorSlug: 'vulture',
    description: 'Contrarian deep-value picks by Vulture',
    components: [
      { address: ADDR.PILL, weightBps: 2500 },
      { address: ADDR.STR8, weightBps: 2500 },
      { address: ADDR.NEBL, weightBps: 2500 },
      { address: ADDR.SWPX, weightBps: 2500 },
    ],
  },
];

// ── All indexes combined ─────────────────────────────────────────────────
export const ALL_INDEXES: IndexConfig[] = [...CATEGORY_INDEXES, ...EXPERT_INDEXES];

// Lookup by address
export function getIndexByAddress(address: string): IndexConfig | undefined {
  return ALL_INDEXES.find((idx) => idx.address.toLowerCase() === address.toLowerCase());
}

// Lookup by symbol
export function getIndexBySymbol(symbol: string): IndexConfig | undefined {
  return ALL_INDEXES.find((idx) => idx.symbol.toLowerCase() === symbol.toLowerCase());
}

// ── Category display metadata ────────────────────────────────────────────
export const CATEGORY_META: Record<IndexCategory, { label: string; color: string; gradient: string }> = {
  ai: { label: 'AI', color: 'text-violet-400', gradient: 'from-violet-500 to-purple-600' },
  meme: { label: 'Meme', color: 'text-yellow-400', gradient: 'from-yellow-500 to-orange-500' },
  defi: { label: 'DeFi', color: 'text-teal-400', gradient: 'from-teal-500 to-cyan-500' },
  gaming: { label: 'Gaming', color: 'text-emerald-400', gradient: 'from-emerald-500 to-green-500' },
  infra: { label: 'Infra', color: 'text-blue-400', gradient: 'from-blue-500 to-indigo-500' },
  expert: { label: 'Expert', color: 'text-bitcoin-400', gradient: 'from-bitcoin-500 to-amber-500' },
};
