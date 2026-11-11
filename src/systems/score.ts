/** Scoring, stars and corporate titles (PRD section 5). Pure functions. */
import { SCORE, STARS, HEARTS } from '../config/game';
import type { StringKey } from '../i18n/strings';

export interface ClearInput {
  level: number;
  hearts: number;
  /** Seconds left on the level's final timer (metro doors / office clock). */
  secondsLeft: number;
  coins: number;
  totalCoins: number;
  frames: number;
  appraisal: number;
  /** Third-star rule from the level config; defaults to appraisal for Level 2, time otherwise. */
  thirdStar?: 'time' | 'appraisal';
}

export const clearBonus = (hearts: number, secondsLeft: number): number =>
  hearts * SCORE.clearPerHeart + Math.max(0, Math.floor(secondsLeft)) * SCORE.clearPerSecond;

export function starsFor(r: ClearInput): number {
  let stars = 1;
  if (r.totalCoins > 0 && r.coins / r.totalCoins >= STARS.coinFraction) stars++;
  const rule = r.thirdStar ?? (r.level === 2 ? 'appraisal' : 'time');
  if (rule === 'appraisal') {
    if (r.appraisal >= STARS.appraisalTotal) stars++;
  } else if (r.frames < STARS.fastFrames) stars++;
  return stars;
}

export const titleKey = (stars: number): StringKey =>
  stars >= 3 ? 'title3' : stars === 2 ? 'title2' : 'title1';

/** Hearts after collecting a coin; +1 every 100 coins, capped at max. */
export function heartsAfterCoin(coinsAfter: number, hearts: number): { hearts: number; gained: boolean } {
  if (coinsAfter > 0 && coinsAfter % HEARTS.coinsPerHeart === 0 && hearts < HEARTS.max) {
    return { hearts: hearts + 1, gained: true };
  }
  return { hearts, gained: false };
}

/** m:ss from frames at 60 Hz. */
export function formatTime(frames: number): string {
  const s = Math.floor(frames / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 9:12 style clock from minutes since midnight. */
export const formatClock = (minutes: number): string =>
  `${Math.floor(minutes / 60) % 24}:${String(Math.floor(minutes) % 60).padStart(2, '0')}`;

export const padScore = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(6, '0');
