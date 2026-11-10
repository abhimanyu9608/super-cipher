/**
 * Player ID and per-level unlock codes (PRD section 11, v1 client-side check).
 * Limitation: anyone who reads the bundle can compute codes. v1.1 moves this to Supabase.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SALT = '|super-cipher-office-run|L';

/** cyrb53 — public-domain 53-bit string hash by bryc. */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Uppercase and strip everything except letters and digits. */
export const normalize = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function unlockCode(playerId: string, level: number): string {
  let h = cyrb53(playerId.trim().toUpperCase() + SALT + level);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = Math.floor(h / CODE_ALPHABET.length);
  }
  return out;
}

export function checkCode(playerId: string, level: number, input: string): boolean {
  return normalize(input) === unlockCode(playerId, level);
}

export function newPlayerId(random: () => number = Math.random): string {
  let id = 'CB-';
  for (let i = 0; i < 6; i++) id += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return id;
}

export const isPlayerId = (s: string): boolean =>
  new RegExp(`^CB-[${CODE_ALPHABET}]{6}$`).test(s.trim().toUpperCase());
