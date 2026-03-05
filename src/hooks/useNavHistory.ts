const STORAGE_KEY = 'motobasket_nav_history';
const MAX_SNAPSHOTS = 1000;

export interface NavSnapshot {
  t: number;       // timestamp ms
  nav: string;     // navPerShare as bigint string
  tvl: string;     // totalMotoValue as bigint string
}

type HistoryStore = Record<string, NavSnapshot[]>;

function load(): HistoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(store: HistoryStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function recordSnapshot(
  address: string,
  navPerShare: bigint,
  totalMotoValue: bigint,
): void {
  if (navPerShare <= 0n) return;

  const store = load();
  const key = address.toLowerCase();
  const list = store[key] ?? [];

  // Deduplicate: skip if NAV unchanged from last entry
  if (list.length > 0) {
    const last = list[list.length - 1];
    if (last.nav === navPerShare.toString()) return;
  }

  list.push({
    t: Date.now(),
    nav: navPerShare.toString(),
    tvl: totalMotoValue.toString(),
  });

  // Cap at MAX_SNAPSHOTS, prune oldest
  if (list.length > MAX_SNAPSHOTS) {
    list.splice(0, list.length - MAX_SNAPSHOTS);
  }

  store[key] = list;
  save(store);
}

export type TimeRange = '24h' | '7d' | '30d' | 'all';

const RANGE_MS: Record<TimeRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

export function getSnapshots(address: string, range: TimeRange = 'all'): NavSnapshot[] {
  const store = load();
  const list = store[address.toLowerCase()] ?? [];
  if (range === 'all') return list;
  const cutoff = Date.now() - RANGE_MS[range];
  return list.filter((s) => s.t >= cutoff);
}

export function getLatestSnapshot(address: string): NavSnapshot | null {
  const store = load();
  const list = store[address.toLowerCase()] ?? [];
  return list.length > 0 ? list[list.length - 1] : null;
}

export function getFirstSnapshot(address: string): NavSnapshot | null {
  const store = load();
  const list = store[address.toLowerCase()] ?? [];
  return list.length > 0 ? list[0] : null;
}
