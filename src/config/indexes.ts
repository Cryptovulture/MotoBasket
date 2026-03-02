import { TOKEN_META } from './contracts';

export interface IndexComponent {
  address: string;
  symbol: string;
  name: string;
  weightBps: number; // basis points, sum to 10000
}

export interface IndexConfig {
  address: string; // deployed contract address (will be filled after deployment)
  name: string;
  symbol: string;
  category: 'ai' | 'meme' | 'defi';
  description: string;
  components: IndexComponent[];
}

// Helper to build a component from TOKEN_META
function comp(address: string, weightBps: number): IndexComponent {
  const meta = TOKEN_META[address];
  return {
    address,
    symbol: meta?.symbol ?? '???',
    name: meta?.name ?? 'Unknown',
    weightBps,
  };
}

// ── Token addresses from contracts.ts ───────────────────────────────
const NRNA = '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f';
const SYNP = '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c';
const CRTX = '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c';
const DPLR = '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7';
const CPHR = '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940';

const PEEP = '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6';
const DGEN = '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22';
const BONQ = '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258';
const SHBA = '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383';

const LNDB = '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18';
const YLDP = '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b';
const SWPX = '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46';
const NEBL = '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04';

// ── Index Configurations ────────────────────────────────────────────
// Addresses will be populated after testnet deployment

export const INDEX_CONFIGS: IndexConfig[] = [
  {
    address: '0xe2aad9cfc8878fe3ad5105026f3b4619c7ff07c8c13ef1e9398bbf2229d2e4f7',
    name: 'OPNet AI Index',
    symbol: 'OPAI',
    category: 'ai',
    description: 'Top AI infrastructure and compute tokens on Bitcoin L1',
    components: [
      comp(NRNA, 2000),
      comp(SYNP, 2000),
      comp(CRTX, 2000),
      comp(DPLR, 2000),
      comp(CPHR, 2000),
    ],
  },
  {
    address: '0x104ec804d48280051a81848ced6b17728af6be701f0251f4aed4bfd49d033c2e',
    name: 'OPNet Meme Index',
    symbol: 'OPMEME',
    category: 'meme',
    description: 'Top performing meme coins on Bitcoin L1',
    components: [
      comp(PEEP, 2500),
      comp(DGEN, 2500),
      comp(BONQ, 2500),
      comp(SHBA, 2500),
    ],
  },
  {
    address: '0xbe33f93ff068eccc623440c7b6dc52039a38de50745fee11d4b1b208f4c868c1',
    name: 'OPNet DeFi Index',
    symbol: 'OPDEFI',
    category: 'defi',
    description: 'Core DeFi protocols on Bitcoin L1',
    components: [
      comp(LNDB, 2500),
      comp(YLDP, 2500),
      comp(SWPX, 2500),
      comp(NEBL, 2500),
    ],
  },
];

// Category display metadata
export const CATEGORY_META: Record<string, { label: string; gradient: string }> = {
  ai: { label: 'AI', gradient: 'from-violet-500 to-purple-600' },
  meme: { label: 'Meme', gradient: 'from-yellow-500 to-orange-500' },
  defi: { label: 'DeFi', gradient: 'from-teal-500 to-cyan-500' },
};
