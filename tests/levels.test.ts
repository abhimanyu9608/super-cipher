import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_IDS, nextLevel, isUnlocked } from '../src/config/levels';
import { STRINGS, t } from '../src/i18n/strings';
import { unlockCode } from '../src/social/unlock';

describe('level definitions', () => {
  it('every level has its texts and a sensible clock', () => {
    for (const id of LEVEL_IDS) {
      const d = LEVELS[id];
      for (const k of [d.nameKey, d.worldKey, d.mapTitleKey, d.mapGoalKey, d.clearKey])
        expect(STRINGS).toHaveProperty(k);
      if (d.clock) {
        expect(d.clock.start).toBeLessThan(d.clock.red);
        expect(d.clock.red).toBeLessThan(d.clock.late);
        expect(d.clock.reset).toBeLessThan(d.clock.late);
      }
    }
  });

  it('chains levels 1 → 2 → 3 → 4 and unlocks in order', () => {
    expect(nextLevel(1)).toBe(2);
    expect(nextLevel(2)).toBe(3);
    expect(nextLevel(3)).toBe(4);
    expect(nextLevel(4)).toBeNull();
    expect(isUnlocked(3, 2)).toBe(false);
    expect(isUnlocked(3, 3)).toBe(true);
  });

  it('has a separate unlock code for Level 3', () => {
    expect(unlockCode('CB-7K4QX2', 3)).not.toBe(unlockCode('CB-7K4QX2', 2));
    expect(t('unlockTitle', { n: 3 }, 'en')).toBe('UNLOCK LEVEL 3');
  });
});
