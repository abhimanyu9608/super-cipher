import { describe, expect, it } from 'vitest';
import { MOODS, moodFor, SKINS, skinUnlocked } from '../src/config/extras';
import { STRINGS } from '../src/i18n/strings';
import { musicSpec, render } from '../src/audio/synth';
import { CHAR_FRAMES } from '../src/gfx/characters';

describe('daily Manager mood', () => {
  it('has one mood per weekday, picked by the date', () => {
    expect(MOODS).toHaveLength(7);
    expect(moodFor(new Date(2026, 10, 10)).id).toBe(MOODS[2].id); // a Tuesday
    expect(moodFor(new Date(2026, 10, 11)).rain).toBe(true); // Wednesday = monsoon
  });

  it('keeps modifiers in a fair range and every mood is translated', () => {
    for (const m of MOODS) {
      expect(m.enemySpeed).toBeGreaterThanOrEqual(0.8);
      expect(m.enemySpeed).toBeLessThanOrEqual(1.25);
      expect(STRINGS).toHaveProperty(m.nameKey);
      expect(STRINGS).toHaveProperty(m.descKey);
    }
  });
});

describe('skins', () => {
  it('unlock by total stars', () => {
    expect(skinUnlocked('none', 0)).toBe(true);
    expect(skinUnlocked('shades', 2)).toBe(false);
    expect(skinUnlocked('shades', 3)).toBe(true);
    expect(skinUnlocked('goldPhones', 6)).toBe(true);
    for (const s of SKINS) expect(STRINGS).toHaveProperty(s.nameKey);
  });
});

describe('animation and music assets', () => {
  it('has blink, skid, shock and worried frames', () => {
    for (const f of ['blink', 'skid', 'shock', 'widle', 'wrun0', 'wrun5']) expect(CHAR_FRAMES).toContain(f);
  });

  it('renders both desi-percussion music loops', () => {
    for (const kind of ['commute', 'office'] as const) {
      const s = render(musicSpec(kind), 8000);
      let peak = 0;
      for (const v of s) peak = Math.max(peak, Math.abs(v));
      expect(peak).toBeGreaterThan(0.1);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });
});
