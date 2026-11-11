import type { SkinId } from './extras';

export type LevelId = 1 | 2 | 3;

/** In-game clock (minutes since midnight). Reaching `late` costs a heart and resets to `reset`. */
export interface LevelClock {
  start: number;
  red: number;
  late: number;
  reset: number;
}

export interface LevelDef {
  id: LevelId;
  /** World map file in public/assets/maps. */
  map: string;
  nameKey: 'level1Name' | 'level2Name' | 'level3Name';
  /** i18n key of the eyebrow on the title screen and level card. */
  worldKey: 'world1' | 'world2' | 'world3';
  mapTitleKey: 'mapTitle1' | 'mapTitle2' | 'mapTitle3';
  mapGoalKey: 'mapGoal1' | 'mapGoal2' | 'mapGoal3';
  /** Big headline on Level Clear. */
  clearKey: 'clearBig' | 'clearBig2' | 'clearBig3';
  indoor: boolean;
  /** Levels with a clock show it instead of the elapsed time (Level 2: office clock, Level 3: lunch). */
  clock?: LevelClock;
  /** How the level ends: walk through metro doors, or punch a machine after the boss. */
  finish: 'doors' | 'punch';
  /** Level 1 starts with the alarm-clock wake-up cutscene. */
  intro: boolean;
  /** Third star: finish under 4:00, or collect all 5 Appraisal Points. */
  thirdStar: 'time' | 'appraisal';
  promotion: { from: string; to: string };
  /** Outfit shown on the promotion screen. */
  promoSkin: SkinId;
  music: 'commute' | 'office';
}

const hm = (h: number, m: number) => h * 60 + m;

export const LEVELS: Record<LevelId, LevelDef> = {
  1: {
    id: 1,
    map: 'level1.tmj',
    nameKey: 'level1Name',
    worldKey: 'world1',
    mapTitleKey: 'mapTitle1',
    mapGoalKey: 'mapGoal1',
    clearKey: 'clearBig',
    indoor: false,
    finish: 'doors',
    intro: true,
    thirdStar: 'time',
    promotion: { from: 'Intern', to: 'Junior Dev' },
    promoSkin: 'lanyard',
    music: 'commute',
  },
  2: {
    id: 2,
    map: 'level2.tmj',
    nameKey: 'level2Name',
    worldKey: 'world2',
    mapTitleKey: 'mapTitle2',
    mapGoalKey: 'mapGoal2',
    clearKey: 'clearBig2',
    indoor: true,
    clock: { start: hm(9, 12), red: hm(9, 27), late: hm(9, 30), reset: hm(9, 28) },
    finish: 'punch',
    intro: false,
    thirdStar: 'appraisal',
    promotion: { from: 'Junior Dev', to: 'Developer' },
    promoSkin: 'goldPhones',
    music: 'office',
  },
  3: {
    id: 3,
    map: 'level3.tmj',
    nameKey: 'level3Name',
    worldKey: 'world3',
    mapTitleKey: 'mapTitle3',
    mapGoalKey: 'mapGoal3',
    clearKey: 'clearBig3',
    indoor: true,
    clock: { start: hm(13, 12), red: hm(13, 27), late: hm(13, 30), reset: hm(13, 28) },
    finish: 'punch',
    intro: false,
    thirdStar: 'time',
    promotion: { from: 'Developer', to: 'Senior Dev' },
    promoSkin: 'shades',
    music: 'commute',
  },
};

export const LEVEL_IDS: LevelId[] = [1, 2, 3];
/** Total levels planned (PRD section 15); levels beyond the built ones show as "coming soon". */
export const PLANNED_LEVELS = 8;

/** Level n is playable when n <= highest unlocked level. Level 1 is always open. */
export const isUnlocked = (level: number, highestUnlocked: number): boolean =>
  level <= Math.max(1, highestUnlocked);

/** The level after this one, if it is built. */
export const nextLevel = (level: LevelId): LevelId | null =>
  LEVEL_IDS.includes((level + 1) as LevelId) ? ((level + 1) as LevelId) : null;
