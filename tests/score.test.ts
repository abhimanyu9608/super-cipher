import { describe, expect, it } from 'vitest';
import {
  clearBonus,
  starsFor,
  titleKey,
  heartsAfterCoin,
  formatTime,
  formatClock,
  padScore,
} from '../src/systems/score';

const base = {
  level: 1,
  hearts: 3,
  secondsLeft: 10,
  coins: 0,
  totalCoins: 50,
  frames: 5 * 3600,
  appraisal: 0,
};

describe('scoring', () => {
  it('level clear bonus = 500 per heart + 20 per second left', () => {
    expect(clearBonus(3, 12.7)).toBe(1500 + 240);
    expect(clearBonus(1, -3)).toBe(500);
  });

  it('awards stars for finishing, 60% coins and time (Level 1)', () => {
    expect(starsFor(base)).toBe(1);
    expect(starsFor({ ...base, coins: 30 })).toBe(2);
    expect(starsFor({ ...base, coins: 29 })).toBe(1);
    expect(starsFor({ ...base, coins: 30, frames: 3 * 3600 })).toBe(3);
  });

  it('uses Appraisal Points instead of time on Level 2', () => {
    expect(starsFor({ ...base, level: 2, frames: 60, appraisal: 4 })).toBe(1);
    expect(starsFor({ ...base, level: 2, appraisal: 5, coins: 40 })).toBe(3);
  });

  it('maps stars to corporate titles', () => {
    expect(titleKey(1)).toBe('title1');
    expect(titleKey(2)).toBe('title2');
    expect(titleKey(3)).toBe('title3');
  });

  it('gives +1 heart every 100 coins up to 5', () => {
    expect(heartsAfterCoin(100, 3)).toEqual({ hearts: 4, gained: true });
    expect(heartsAfterCoin(99, 3)).toEqual({ hearts: 3, gained: false });
    expect(heartsAfterCoin(200, 5)).toEqual({ hearts: 5, gained: false });
  });

  it('formats time, clock and score', () => {
    expect(formatTime(3 * 3600 + 5 * 60)).toBe('3:05');
    expect(formatClock(9 * 60 + 12.9)).toBe('9:12');
    expect(padScore(4321)).toBe('004321');
  });
});
