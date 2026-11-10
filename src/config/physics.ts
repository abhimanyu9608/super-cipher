/**
 * Player physics, copied from the reference prototype (PRD section 4).
 * The simulation runs at a fixed 60 Hz step, so values are stored per frame (px/f, px/f²)
 * exactly as in the prototype. `perSecond()` converts for anything that needs real units.
 */
export const FPS = 60;
export const STEP_MS = 1000 / FPS;
/** Never simulate more than this many steps per rendered frame (avoids the spiral of death). */
export const MAX_STEPS_PER_FRAME = 5;

export const PHYSICS = {
  gravity: 0.62,
  maxFall: 14,
  groundAccel: 0.7,
  airAccel: 0.42,
  groundFriction: 0.76,
  airFriction: 0.95,
  frictionSnap: 0.05,
  jumpCut: 4.5,
  coyoteFrames: 7,
  jumpBufferFrames: 8,
  doubleJumpFactor: 0.9,
  stompBounce: 9.5,
  bossStompBounce: 11,
  hurtKnockUp: 7,
  hurtKnockBack: 4,
  invulnFrames: 100,
  slowFactor: 0.5,
  conveyorSpeed: -1.8,
  /** A contact is a stomp when the player's previous bottom was at or above enemy top + this. */
  stompTolerance: 12,
} as const;

export const HITBOX = { w: 30, h: 60 } as const;
export const SPRITE = { w: 64, h: 82 } as const;

export type CharacterId = 'boy' | 'girl';

export const CHARACTERS: Record<CharacterId, { maxRun: number; jump: number; perk: 'highJump' | 'fastRun' }> =
  {
    boy: { maxRun: 4.4, jump: 13.4, perk: 'highJump' },
    girl: { maxRun: 5.1, jump: 12.6, perk: 'fastRun' },
  };

export const CAMERA = {
  lerp: 0.12,
  /** Camera target is player.x − leadFraction × viewWidth. */
  leadFraction: 0.4,
} as const;

export const VIEW = { width: 960, height: 540 } as const;

/** Level 2 mechanics (PRD section 7). */
export const OFFICE_PHYSICS = {
  wetAccelFactor: 0.35,
  wetFriction: 0.98,
  updraftTarget: -6,
  updraftEase: 0.12,
  dashFrames: 15,
  dashCooldownFrames: 60,
  dashSpeedFactor: 2,
  liftFullPush: 6,
} as const;

/** px/f → px/s */
export const perSecond = (perFrame: number): number => perFrame * FPS;
/** px/f² → px/s² */
export const perSecondSq = (perFrame2: number): number => perFrame2 * FPS * FPS;
/** frames → ms */
export const framesToMs = (frames: number): number => Math.round((frames * 1000) / FPS);
