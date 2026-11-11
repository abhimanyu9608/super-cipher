/** Persistent player profile + the live run state shared by the level scene, HUD and UI. */
import type { CharacterId } from '../config/physics';
import { HEARTS, type PowerUpId } from '../config/game';
import type { LevelId } from '../config/levels';
import { load, save, loadInt, KEYS } from '../storage';
import { newPlayerId, isPlayerId } from '../social/unlock';
import { SKINS, skinUnlocked, type SkinId } from '../config/extras';
import { LEVEL_IDS } from '../config/levels';

export const profile = {
  get character(): CharacterId {
    return load(KEYS.char) === 'girl' ? 'girl' : 'boy';
  },
  set character(c: CharacterId) {
    save(KEYS.char, c);
  },
  /** Chosen cosmetic skin (falls back to none if it is no longer unlocked). */
  get skin(): SkinId {
    const s = (load(KEYS.skin) ?? 'none') as SkinId;
    return SKINS.some((k) => k.id === s) && skinUnlocked(s, this.totalStars()) ? s : 'none';
  },
  set skin(s: SkinId) {
    save(KEYS.skin, s);
  },
  totalStars(): number {
    return LEVEL_IDS.reduce((sum, l) => sum + this.stars(l), 0);
  },
  get playerId(): string {
    let id = load(KEYS.pid) ?? '';
    if (!isPlayerId(id)) {
      id = newPlayerId();
      save(KEYS.pid, id);
    }
    return id;
  },
  get unlocked(): number {
    return Math.max(1, loadInt(KEYS.unlocked, 1));
  },
  set unlocked(n: number) {
    save(KEYS.unlocked, String(Math.max(this.unlocked, n)));
  },
  best(level: number): number {
    return loadInt(KEYS.best(level), 0);
  },
  stars(level: number): number {
    return loadInt(KEYS.stars(level), 0);
  },
  /** Record a result; returns true if it is a new best score. */
  record(level: number, score: number, stars: number): boolean {
    const isBest = score > this.best(level);
    if (isBest) save(KEYS.best(level), String(score));
    if (stars > this.stars(level)) save(KEYS.stars(level), String(stars));
    return isBest;
  },
};

export interface RunState {
  level: LevelId;
  character: CharacterId;
  score: number;
  coins: number;
  totalCoins: number;
  hearts: number;
  frames: number;
  /** Active power-up frames remaining. */
  power: Record<PowerUpId, number>;
  hasId: boolean;
  appraisal: number;
  zoneKey: string;
  progress: number;
  /** Level 1 metro door frames left (null until started). */
  doorFrames: number | null;
  /** Level 2 office clock in minutes since midnight. */
  clock: number;
  boss: { name: string; hp: number; max: number; phase?: string } | null;
  busWarning: boolean;
  combo: number;
}

export function newRun(level: LevelId, character: CharacterId): RunState {
  return {
    level,
    character,
    score: 0,
    coins: 0,
    totalCoins: 0,
    hearts: HEARTS.start,
    frames: 0,
    power: { chai: 0, headphones: 0, coffee: 0 },
    hasId: level > 1,
    appraisal: 0,
    zoneKey: '',
    progress: 0,
    doorFrames: null,
    clock: 0,
    boss: null,
    busWarning: false,
    combo: 0,
  };
}

/** The current run; the HUD reads from it every frame. */
export const session: { run: RunState | null; paused: boolean; reducedMotion: boolean } = {
  run: null,
  paused: false,
  reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};
