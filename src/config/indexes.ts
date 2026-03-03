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
    address: '0x725f25c622f943b50e5f53bb774863a4ad4611ffbbeb3ffc9501c796d7966721',
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
    address: '0xa392f205c01a793c4f35a1ff4b2f45963564280de199ab3b769975d99fc1fe8f',
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
    address: '0x7face6eedcad07524ef8f6c1d21687e5385c2be764f0315c314db978030804db',
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
    address: '0x99c4e810140e01bb9a7d958c19333bc9ee33e3ddb503bee5ea7752dc929d58a2',
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
    address: '0x5e40abb52fa1c7c5e388fc5ad95a2810c06d0dde6b2a82bb188ee57c862469e5',
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
    address: '0xc2e5f8d3ad1af23319857960b45344357e289ac1c550c166ace2039c342593c7',
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
    address: '0x22d5b22edc49fd93a73fd571bfe8fd9a64cdb60c244b4cb5345da3481f6ce043',
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
    address: '0xfd59e82e16ac39b0f5343df3d3f4d95cb9a21577ee4cb2597c672600e38e143a',
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
    address: '0x7b7d1f1d33cad8cc7b06dbf992f985dcd8896aef8082eb4ab23ca8ffad13c42d',
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
    address: '0xdf5624ec47b992e91b218244299795df35f0a6aacac1e4c7fef3aef38a08192a',
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
