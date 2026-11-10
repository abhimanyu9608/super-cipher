/** Safe localStorage wrapper: every read and write is guarded; the game works with storage blocked. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memory = new Map<string, string>();
const fallback: KV = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
};

function backend(): KV {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* access can throw in private mode or with blocked site data */
  }
  return fallback;
}

export function load(key: string): string | null {
  try {
    return backend().getItem(key);
  } catch {
    return fallback.getItem(key);
  }
}

export function save(key: string, value: string): void {
  try {
    backend().setItem(key, value);
  } catch {
    fallback.setItem(key, value);
  }
}

export function loadInt(key: string, def = 0): number {
  const n = parseInt(load(key) ?? '', 10);
  return Number.isFinite(n) ? n : def;
}

export const KEYS = {
  lang: 'sc-lang',
  sound: 'sc-sound',
  char: 'sc-char',
  pid: 'sc-pid',
  unlocked: 'sc-unlocked',
  best: (level: number) => `sc-best-L${level}`,
  stars: (level: number) => `sc-stars-L${level}`,
} as const;
