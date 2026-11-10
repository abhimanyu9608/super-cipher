/** Gameplay tuning outside of player physics (PRD sections 5–7, 10). All numbers per frame at 60 Hz. */

export const HEARTS = { start: 3, max: 5, coinsPerHeart: 100, checkpointMin: 3, continueHearts: 3 } as const;

export const POWERUP_FRAMES = { chai: 15 * 60, headphones: 8 * 60, coffee: 12 * 60 } as const;
export type PowerUpId = keyof typeof POWERUP_FRAMES;

export const SCORE = {
  coin: 10,
  powerup: 200,
  idCard: 500,
  bug: 100,
  dog: 50,
  invite: 200,
  coworker: 50,
  bossHit: 300,
  monkeyDefeat: 1000,
  managerDefeat: 1500,
  paper: 50,
  appraisal: 250,
  clearPerHeart: 500,
  clearPerSecond: 20,
} as const;

export const STARS = { coinFraction: 0.6, fastFrames: 4 * 60 * 60, appraisalTotal: 5 } as const;

export const ENEMY = {
  activeRange: 760,
  bugSpeed: 1,
  dogSpeed: 1.2,
  dogChaseRange: 320,
  inviteWave: 40,
  inviteWaveSpeed: 0.05,
} as const;

export const BUS = {
  interval: 330,
  warning: 70,
  speed: 6.5,
  w: 140,
  h: 95,
} as const;

export const BRICK = {
  minGap: 50,
  maxGap: 80,
  warning: 40,
  gravity: 0.4,
  spawnMin: -40,
  spawnMax: 240,
  w: 24,
  h: 16,
} as const;

export const MONKEY = {
  w: 70,
  h: 74,
  hp: 3,
  minDist: 150,
  maxDist: 300,
  speed: 2.2,
  hopMin: 70,
  hopMax: 130,
  hopVy: -10,
  gravity: 0.62,
  throwEvery: [65, 85, 110] as readonly number[], // index = hp - 1
  bananaGravity: 0.35,
  bananaFlight: 55,
  invuln: 60,
} as const;

export const METRO = { doorFrames: 25 * 60, pulseUnder: 8 * 60, tickUnder: 5 * 60 } as const;

export const OFFICE = {
  clockStartMin: 9 * 60 + 12,
  clockLateMin: 9 * 60 + 30,
  clockRedMin: 9 * 60 + 27,
  clockResetMin: 9 * 60 + 28,
  framesPerMinute: 600,
  liftSpeed: 1.2,
  liftPause: 45,
  chairSpeed: 3,
  chairDecay: 0.98,
  grabFrames: 120,
  printerEvery: 120,
  paperSpeed: 4,
  popcornEvery: 90,
  popcornGravity: 0.4,
  laserOn: 90,
  laserOff: 90,
  laserWarn: 30,
  darknessAlpha: 0.88,
  darknessAlphaReduced: 0.6,
  lightRadius: 180,
} as const;

export const MANAGER = {
  hp: 3,
  w: 120,
  h: 130,
  laptopW: 60,
  laptopH: 30,
  walkFrames: 180,
  inviteEvery: 90,
  ringEvery: 120,
  ringSpeed: 4,
  ringH: 20,
  paperEvery: 40,
  phase3SpeedUp: 1.3,
  inviteGravity: 0.3,
} as const;

export const FX = {
  shakeStomp: 4,
  shakeHit: 12,
  shakeBoss: 10,
  shakeDecay: 0.85,
  popupFrames: 60,
  popupFade: 25,
  popupRise: 0.7,
  bannerFrames: 170,
  confettiFrames: 150,
  skyBlend: 300,
} as const;

export const AUDIO_MIX = {
  master: 0.8,
  sfx: 0.7,
  voice: 0.9,
  music: 0.35,
  musicDucked: 0.15,
  maxVoicesPerWindow: 2,
  voiceWindowMs: 5000,
} as const;
