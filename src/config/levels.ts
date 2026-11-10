export type LevelId = 1 | 2;

export interface LevelDef {
  id: LevelId;
  /** World map file in public/assets/maps. */
  map: string;
  nameKey: 'level1Name' | 'level2Name';
  /** i18n key of the eyebrow on the title screen and level card. */
  worldKey: 'world1' | 'world2';
  indoor: boolean;
  /** Level 2 uses the office clock instead of an elapsed-time counter. */
  officeClock: boolean;
  promotion: { from: string; to: string };
  music: 'commute' | 'office';
}

export const LEVELS: Record<LevelId, LevelDef> = {
  1: {
    id: 1,
    map: 'level1.tmj',
    nameKey: 'level1Name',
    worldKey: 'world1',
    indoor: false,
    officeClock: false,
    promotion: { from: 'Intern', to: 'Junior Dev' },
    music: 'commute',
  },
  2: {
    id: 2,
    map: 'level2.tmj',
    nameKey: 'level2Name',
    worldKey: 'world2',
    indoor: true,
    officeClock: true,
    promotion: { from: 'Junior Dev', to: 'Developer' },
    music: 'office',
  },
};

export const LEVEL_IDS: LevelId[] = [1, 2];
/** Total levels planned (PRD section 15); levels beyond the built ones show as "coming soon". */
export const PLANNED_LEVELS = 8;

/** Level n is playable when n <= highest unlocked level. Level 1 is always open. */
export const isUnlocked = (level: number, highestUnlocked: number): boolean =>
  level <= Math.max(1, highestUnlocked);
