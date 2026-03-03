export interface ExpertProfile {
  slug: string;
  name: string;
  handle: string; // twitter/X handle
  avatar: string; // path in /public/kol-avatars/
  bio: string;
  focus: string;
}

export const EXPERTS: ExpertProfile[] = [
  {
    slug: 'ansem',
    name: 'Ansem',
    handle: '@blknoiz06',
    avatar: '/kol-avatars/ansem.png',
    bio: 'AI and compute infrastructure maximalist. Early identifier of NeuralNet and Cortex protocols.',
    focus: 'AI Infrastructure',
  },
  {
    slug: 'chad',
    name: 'Chad',
    handle: '@chad_btc',
    avatar: '/kol-avatars/chad.png',
    bio: 'Full degen, no apologies. If it has a dog on it and it\'s on Bitcoin, it\'s in the portfolio.',
    focus: 'Meme Coins',
  },
  {
    slug: 'danny',
    name: 'OpDanny',
    handle: '@OpDanny',
    avatar: '/kol-avatars/danny.png',
    bio: 'Cross-sector alpha hunter. Finds asymmetric opportunities where AI meets DeFi meets meme culture.',
    focus: 'Cross-Sector Alpha',
  },
  {
    slug: 'gaygcr',
    name: 'GayGCR',
    handle: '@GayGCR',
    avatar: '/kol-avatars/gaygcr.png',
    bio: 'DeFi infrastructure thesis. Believes the real money is in the picks and shovels of Bitcoin DeFi.',
    focus: 'DeFi Infrastructure',
  },
  {
    slug: 'vulture',
    name: 'Vulture',
    handle: '@Vulture_BTC',
    avatar: '/kol-avatars/vulture.png',
    bio: 'Contrarian deep-value investor. Buys what nobody else is looking at, sells when everyone wants it.',
    focus: 'Contrarian Value',
  },
];

export function getExpertBySlug(slug: string): ExpertProfile | undefined {
  return EXPERTS.find((e) => e.slug === slug);
}
