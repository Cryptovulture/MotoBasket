/**
 * Sector & Expert index display data.
 * All indexes are functional with LP pools on MotoSwap.
 * TVL, performance, and investor counts reflect real on-chain state.
 */

export interface MockComponent {
  symbol: string;
  name: string;
  weight: number;
}

export interface MockOfficialIndex {
  slug: string;
  name: string;
  fullName: string;
  description: string;
  components: MockComponent[];
  tvl: number;
  performance: { day: number; week: number; month: number; year: number };
  fee: number;
  investors: number;
  onChainBasketId?: number;
}

export interface MockExpertIndex {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  avatar: string;
  description: string;
  components: MockComponent[];
  tvl: number;
  performance: { day: number; week: number; month: number; year: number };
  performanceFee: number;
  investors: number;
  onChainBasketId?: number;
}

// ============================================================================
// SECTOR INDEXES — on-chain basket IDs map to ExpertIndex contract
// ============================================================================

export const MOCK_OFFICIAL_INDEXES: MockOfficialIndex[] = [
  {
    slug: 'bc1p-ai',
    name: 'AI',
    fullName: 'Artificial Intelligence Index',
    description: 'Exposure to leading AI infrastructure and compute tokens on Bitcoin L1',
    components: [
      { symbol: 'NRNA', name: 'NeuralNet Protocol', weight: 30 },
      { symbol: 'SYNP', name: 'Synapse AI', weight: 25 },
      { symbol: 'CRTX', name: 'Cortex Compute', weight: 25 },
      { symbol: 'DPLR', name: 'DeepLayer', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    fee: 1.25,
    investors: 0,
    onChainBasketId: 3,
  },
  {
    slug: 'bc1p-meme',
    name: 'MEME',
    fullName: 'Meme Token Index',
    description: 'Top performing meme coins on Bitcoin L1',
    components: [
      { symbol: 'PEEP', name: 'Pepe BTC', weight: 30 },
      { symbol: 'DGEN', name: 'Degen Coin', weight: 25 },
      { symbol: 'BONQ', name: 'Bonk L1', weight: 25 },
      { symbol: 'SHBA', name: 'Shiba Bitcoin', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    fee: 1.5,
    investors: 0,
    onChainBasketId: 4,
  },
  {
    slug: 'bc1p-defi',
    name: 'DEFI',
    fullName: 'Bitcoin DeFi Index',
    description: 'Core DeFi protocols powering Bitcoin L1 — lending, swaps, and yield',
    components: [
      { symbol: 'LNDB', name: 'LendBTC', weight: 30 },
      { symbol: 'YLDP', name: 'Yield Protocol', weight: 25 },
      { symbol: 'SWPX', name: 'SwapX', weight: 25 },
      { symbol: 'NEBL', name: 'Nebula Token', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    fee: 0.95,
    investors: 0,
    onChainBasketId: 5,
  },
  {
    slug: 'bc1p-food',
    name: 'FOOD',
    fullName: 'Fresh Produce Index',
    description: 'The tastiest tokens on Bitcoin L1 — fruits, veggies, and gains',
    components: [
      { symbol: 'MNGO', name: 'Mango Coin', weight: 25 },
      { symbol: 'APPL', name: 'Apple Token', weight: 25 },
      { symbol: 'AVDO', name: 'Avocado', weight: 25 },
      { symbol: 'BERY', name: 'Berry Finance', weight: 25 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    fee: 1.0,
    investors: 0,
    onChainBasketId: 6,
  },
  {
    slug: 'bc1p-blue',
    name: 'BLUE',
    fullName: 'Blue Chip Index',
    description: 'Established Bitcoin L1 protocols with proven track records',
    components: [
      { symbol: 'NEBL', name: 'Nebula Token', weight: 30 },
      { symbol: 'NRNA', name: 'NeuralNet Protocol', weight: 25 },
      { symbol: 'LNDB', name: 'LendBTC', weight: 25 },
      { symbol: 'YLDP', name: 'Yield Protocol', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    fee: 0.75,
    investors: 0,
    onChainBasketId: 7,
  },
];

// ============================================================================
// EXPERT INDEXES
// ============================================================================

export const MOCK_EXPERT_INDEXES: MockExpertIndex[] = [
  {
    id: 'danny',
    name: "Danny's Alpha Picks",
    symbol: 'DANNY',
    creator: '@danny_btc',
    avatar: '/kol-avatars/danny.png',
    description: 'High-conviction AI and DeFi plays from a top Bitcoin trader',
    components: [
      { symbol: 'NRNA', name: 'NeuralNet Protocol', weight: 35 },
      { symbol: 'CRTX', name: 'Cortex Compute', weight: 30 },
      { symbol: 'NEBL', name: 'Nebula Token', weight: 20 },
      { symbol: 'DGEN', name: 'Degen Coin', weight: 15 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    performanceFee: 10,
    investors: 0,
    onChainBasketId: 8,
  },
  {
    id: 'chad',
    name: "Chad's BTC Maxi Basket",
    symbol: 'CHAD',
    creator: '@chad_btc',
    avatar: '/kol-avatars/chad.png',
    description: 'Bitcoin maximalist plays — blue chips and DeFi infrastructure',
    components: [
      { symbol: 'LNDB', name: 'LendBTC', weight: 30 },
      { symbol: 'NEBL', name: 'Nebula Token', weight: 25 },
      { symbol: 'YLDP', name: 'Yield Protocol', weight: 25 },
      { symbol: 'SWPX', name: 'SwapX', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    performanceFee: 8,
    investors: 0,
    onChainBasketId: 9,
  },
  {
    id: 'vulture',
    name: "Vulture's Degen Plays",
    symbol: 'VULT',
    creator: '@crypto_vulture',
    avatar: '/kol-avatars/vulture.png',
    description: 'High risk, high reward — memes and micro-caps on Bitcoin L1',
    components: [
      { symbol: 'PEEP', name: 'Pepe BTC', weight: 30 },
      { symbol: 'DGEN', name: 'Degen Coin', weight: 25 },
      { symbol: 'BONQ', name: 'Bonk L1', weight: 25 },
      { symbol: 'SHBA', name: 'Shiba Bitcoin', weight: 20 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    performanceFee: 15,
    investors: 0,
    onChainBasketId: 10,
  },
  {
    id: 'ansem',
    name: "Ansem's Smart Money",
    symbol: 'ANSEM',
    creator: '@anslorian',
    avatar: '/kol-avatars/ansem.png',
    description: 'Institutional-grade allocations across AI and blue chips',
    components: [
      { symbol: 'NEBL', name: 'Nebula Token', weight: 30 },
      { symbol: 'NRNA', name: 'NeuralNet Protocol', weight: 25 },
      { symbol: 'LNDB', name: 'LendBTC', weight: 20 },
      { symbol: 'MNGO', name: 'Mango Coin', weight: 15 },
      { symbol: 'CRTX', name: 'Cortex Compute', weight: 10 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    performanceFee: 5,
    investors: 0,
    onChainBasketId: 11,
  },
  {
    id: 'gaygcr',
    name: "GCR's Contrarian Basket",
    symbol: 'GCR',
    creator: '@gaygcr',
    avatar: '/kol-avatars/gaygcr.png',
    description: 'Contrarian bets — overlooked food tokens and undervalued AI plays',
    components: [
      { symbol: 'AVDO', name: 'Avocado', weight: 25 },
      { symbol: 'BERY', name: 'Berry Finance', weight: 25 },
      { symbol: 'SYNP', name: 'Synapse AI', weight: 25 },
      { symbol: 'DPLR', name: 'DeepLayer', weight: 25 },
    ],
    tvl: 0,
    performance: { day: 0, week: 0, month: 0, year: 0 },
    performanceFee: 12,
    investors: 0,
    onChainBasketId: 12,
  },
];

/** Look up a mock index by its URL slug */
export function findMockIndex(slug: string | undefined): MockOfficialIndex | MockExpertIndex | null {
  if (!slug) return null;
  if (slug.startsWith('expert-')) {
    const expertId = slug.replace('expert-', '');
    return MOCK_EXPERT_INDEXES.find(k => k.id === expertId) ?? null;
  }
  return MOCK_OFFICIAL_INDEXES.find(o => o.slug === slug) ?? null;
}

export function isExpertIndex(index: MockOfficialIndex | MockExpertIndex): index is MockExpertIndex {
  return 'creator' in index;
}
