/**
 * Daily "Manager mood" modifiers and unlockable cosmetic skins.
 * Pure data + pure functions so they can be unit tested.
 */
import type { StringKey } from '../i18n/strings';

export interface Mood {
  id: string;
  nameKey: StringKey;
  descKey: StringKey;
  /** Multiplies enemy walk/chase speeds. */
  enemySpeed: number;
  /** Multiplies power-up durations. */
  powerTime: number;
  /** Multiplies points from stomping bugs. */
  bugScore: number;
  /** Multiplies coin points. */
  coinScore: number;
  /** Monsoon rain on outdoor levels (puddles slow you a bit more). */
  rain: boolean;
}

const base = { enemySpeed: 1, powerTime: 1, bugScore: 1, coinScore: 1, rain: false };

/** Index = Date#getDay() (0 = Sunday). */
export const MOODS: Mood[] = [
  { id: 'overtime', nameKey: 'moodSun', descKey: 'moodSunDesc', ...base, enemySpeed: 1.15 },
  { id: 'mondayBlues', nameKey: 'moodMon', descKey: 'moodMonDesc', ...base, enemySpeed: 1.2 },
  { id: 'chaiTuesday', nameKey: 'moodTue', descKey: 'moodTueDesc', ...base, powerTime: 2 },
  { id: 'monsoon', nameKey: 'moodWed', descKey: 'moodWedDesc', ...base, rain: true },
  { id: 'bugBash', nameKey: 'moodThu', descKey: 'moodThuDesc', ...base, bugScore: 2 },
  { id: 'fridayFeeling', nameKey: 'moodFri', descKey: 'moodFriDesc', ...base, coinScore: 2 },
  { id: 'halfDay', nameKey: 'moodSat', descKey: 'moodSatDesc', ...base, enemySpeed: 0.85 },
];

export const moodFor = (date: Date): Mood => MOODS[date.getDay()];

export type SkinId = 'none' | 'shades' | 'cap' | 'goldPhones' | 'lanyard';

export interface Skin {
  id: SkinId;
  nameKey: StringKey;
  /** Total stars (all levels) needed to unlock. */
  stars: number;
}

export const SKINS: Skin[] = [
  { id: 'none', nameKey: 'skinNone', stars: 0 },
  { id: 'lanyard', nameKey: 'skinLanyard', stars: 1 },
  { id: 'cap', nameKey: 'skinCap', stars: 2 },
  { id: 'shades', nameKey: 'skinShades', stars: 3 },
  { id: 'goldPhones', nameKey: 'skinGold', stars: 6 },
];

export const skinUnlocked = (skin: SkinId, totalStars: number): boolean =>
  (SKINS.find((s) => s.id === skin)?.stars ?? Infinity) <= totalStars;

/** Reaction stickers: original meme-style lines shown after big moments. */
export const STICKERS = {
  pitTwice: 'stickerPit',
  combo4: 'stickerCombo',
  bossDown: 'stickerBoss',
  closeCall: 'stickerClose',
  noHit: 'stickerClean',
} as const satisfies Record<string, StringKey>;
