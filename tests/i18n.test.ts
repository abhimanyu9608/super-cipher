import { describe, expect, it } from 'vitest';
import { STRINGS, t, format } from '../src/i18n/strings';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n coverage', () => {
  it('every key has a non-empty Hinglish and English string', () => {
    for (const [key, v] of Object.entries(STRINGS)) {
      expect(v.hi, `${key}.hi`).toBeTruthy();
      expect(v.en, `${key}.en`).toBeTruthy();
    }
  });

  it('both languages use the same placeholders', () => {
    for (const [key, v] of Object.entries(STRINGS))
      expect(placeholders(v.hi), key).toEqual(placeholders(v.en));
  });

  it('every zone has a name, tip and description', () => {
    const zones = ['z1_1', 'z1_2', 'z1_3', 'z1_cp', 'z1_4', 'z1_5', 'z1_6'];
    const zones2 = ['z2_1', 'z2_2', 'z2_3', 'z2_cp', 'z2_4', 'z2_5', 'z2_boss', 'z2_fin'];
    for (const z of [...zones, ...zones2])
      for (const suffix of ['', 'Tip', 'Desc']) expect(STRINGS).toHaveProperty(z + suffix);
  });

  it('formats values', () => {
    expect(t('challenge', { s: 1234, c: 56 }, 'en')).toContain('1234');
    expect(t('challenge', { s: 1234, c: 56 }, 'hi')).toContain('56 coins');
    expect(format('{a}-{b}', { a: 1 })).toBe('1-{b}');
  });

  it('keeps the PRD sample strings', () => {
    expect(t('start', undefined, 'hi')).toBe('▶ NAUKRI SHURU');
    expect(t('clearBig', undefined, 'en')).toBe('YOU CAUGHT THE METRO!');
    expect(t('busWarn', undefined, 'hi')).toBe('BUS AA RAHI! ←');
    expect(t('pauseSub', undefined, 'hi')).toBe('Chai break chal raha hai. Manager ko mat batana.');
  });
});
