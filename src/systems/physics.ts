/**
 * Fixed-step platformer physics in frame units, ported from the reference prototype.
 * Pure functions with no Phaser dependency so they can be unit tested.
 */
import { PHYSICS, OFFICE_PHYSICS, CHARACTERS, type CharacterId } from '../config/physics';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SolidKind = 'solid' | 'oneway';

export interface Solid extends Rect {
  kind: SolidKind;
  /** Movement applied this frame (moving platforms carry riders by this much). */
  dx: number;
  dy: number;
  /** Horizontal push per frame while standing on it (reverse escalator). */
  conveyor: number;
  /** Valid "last safe ground" for pit respawns: static ground only. */
  safe: boolean;
  active: boolean;
  tag?: string;
  /** Called when the player's head hits it from below. */
  onHeadHit?: () => void;
  /** Called every frame the player stands on it. */
  onStand?: () => void;
}

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function makeSolid(r: Rect, kind: SolidKind = 'solid', extra: Partial<Solid> = {}): Solid {
  return { ...r, kind, dx: 0, dy: 0, conveyor: 0, safe: kind === 'solid', active: true, ...extra };
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  /** True only on the frame jump was pressed. */
  jumpPressed: boolean;
  dashPressed: boolean;
}

export const NO_INPUT: PlayerInput = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
};

export interface PlayerBody extends Rect {
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  ground: Solid | null;
  coyote: number;
  buffer: number;
  doubleUsed: boolean;
  maxRun: number;
  jump: number;
  dashFrames: number;
  dashCooldown: number;
  /** Frames during which a spring launch ignores the variable-jump cut (trampolines). */
  spring: number;
}

export interface PhysicsEnv {
  worldWidth: number;
  canDoubleJump: boolean;
  canDash: boolean;
  slow: boolean;
  wet: boolean;
  updraft: boolean;
  /** Freeze input (auto-walk, cutscenes). */
  locked?: boolean;
}

export interface StepEvents {
  jumped: boolean;
  doubleJumped: boolean;
  dashed: boolean;
  /** Fall speed at the moment of landing, or 0 if the player did not land this frame. */
  landedSpeed: number;
  headHit: Solid | null;
}

export function createPlayerBody(character: CharacterId, x: number, y: number): PlayerBody {
  const c = CHARACTERS[character];
  return {
    x,
    y,
    w: 30,
    h: 60,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    ground: null,
    coyote: 0,
    buffer: 0,
    doubleUsed: false,
    maxRun: c.maxRun,
    jump: c.jump,
    dashFrames: 0,
    dashCooldown: 0,
    spring: 0,
  };
}

/** Horizontal speed limit after slow zones and dash. */
export function maxSpeed(p: PlayerBody, env: PhysicsEnv): number {
  if (p.dashFrames > 0) return p.maxRun * OFFICE_PHYSICS.dashSpeedFactor;
  return env.slow ? p.maxRun * PHYSICS.slowFactor : p.maxRun;
}

/** One 1/60 s step of player movement and collision. Mutates `p`. */
export function stepPlayer(p: PlayerBody, input: PlayerInput, solids: Solid[], env: PhysicsEnv): StepEvents {
  const ev: StepEvents = { jumped: false, doubleJumped: false, dashed: false, landedSpeed: 0, headHit: null };
  const inp = env.locked ? NO_INPUT : input;

  // Ride whatever we stood on last frame.
  const g = p.onGround ? p.ground : null;
  if (g && g.active) {
    p.x += g.dx + g.conveyor;
    p.y += g.dy;
  }

  // Dash (Level 2 coffee).
  if (p.dashCooldown > 0) p.dashCooldown--;
  if (p.spring > 0) p.spring--;
  if (p.dashFrames > 0) p.dashFrames--;
  if (env.canDash && inp.dashPressed && p.dashCooldown === 0) {
    p.dashFrames = OFFICE_PHYSICS.dashFrames;
    p.dashCooldown = OFFICE_PHYSICS.dashCooldownFrames;
    p.vx = p.facing * p.maxRun * OFFICE_PHYSICS.dashSpeedFactor;
    ev.dashed = true;
  }

  // Horizontal input.
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const max = maxSpeed(p, { ...env, slow: env.slow && p.dashFrames === 0 });
  if (p.dashFrames > 0) {
    p.vx = p.facing * max;
  } else if (dir !== 0) {
    p.facing = dir > 0 ? 1 : -1;
    let acc = p.onGround ? PHYSICS.groundAccel : PHYSICS.airAccel;
    if (p.onGround && env.wet) acc *= OFFICE_PHYSICS.wetAccelFactor;
    const before = p.vx;
    p.vx += dir * acc;
    // Clamp to max; speed left over from a dash or shove decays smoothly instead of snapping.
    if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(before) * PHYSICS.airFriction);
  } else {
    const fr = p.onGround
      ? env.wet
        ? OFFICE_PHYSICS.wetFriction
        : PHYSICS.groundFriction
      : PHYSICS.airFriction;
    p.vx *= fr;
    if (Math.abs(p.vx) < PHYSICS.frictionSnap) p.vx = 0;
  }

  // Coyote time and jump buffer.
  p.coyote = p.onGround ? PHYSICS.coyoteFrames : Math.max(0, p.coyote - 1);
  p.buffer = inp.jumpPressed ? PHYSICS.jumpBufferFrames : Math.max(0, p.buffer - 1);

  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -p.jump;
    p.coyote = 0;
    p.buffer = 0;
    p.onGround = false;
    p.ground = null;
    p.doubleUsed = false;
    ev.jumped = true;
  } else if (inp.jumpPressed && !p.onGround && p.coyote === 0 && env.canDoubleJump && !p.doubleUsed) {
    p.vy = -p.jump * PHYSICS.doubleJumpFactor;
    p.doubleUsed = true;
    p.buffer = 0;
    ev.doubleJumped = true;
  }

  // Variable jump height: releasing jump caps upward speed.
  if (!inp.jumpHeld && p.vy < -PHYSICS.jumpCut && p.spring === 0) p.vy = -PHYSICS.jumpCut;

  // Gravity or AC updraft.
  if (env.updraft) {
    p.vy += (OFFICE_PHYSICS.updraftTarget - p.vy) * OFFICE_PHYSICS.updraftEase;
  } else {
    p.vy = Math.min(p.vy + PHYSICS.gravity, PHYSICS.maxFall);
  }

  // Move X and resolve against full solids.
  p.x += p.vx;
  for (const s of solids) {
    if (!s.active || s.kind !== 'solid' || !overlaps(p, s)) continue;
    const fromLeft = p.x + p.w / 2 < s.x + s.w / 2;
    p.x = fromLeft ? s.x - p.w : s.x + s.w;
    if ((fromLeft && p.vx > 0) || (!fromLeft && p.vx < 0)) p.vx = 0;
  }
  if (p.x < 0) {
    p.x = 0;
    if (p.vx < 0) p.vx = 0;
  }
  if (p.x + p.w > env.worldWidth) {
    p.x = env.worldWidth - p.w;
    if (p.vx > 0) p.vx = 0;
  }

  // Move Y and resolve.
  const prevBottom = p.y + p.h;
  const wasOnGround = p.onGround;
  const vyBefore = p.vy;
  p.y += p.vy;
  p.onGround = false;
  p.ground = null;
  let headHit: Solid | null = null;
  for (const s of solids) {
    if (!s.active || !overlaps(p, s)) continue;
    if (s.kind === 'oneway') {
      if (p.vy >= 0 && prevBottom <= s.y + 1 + Math.max(0, -s.dy)) {
        land(p, s);
      }
      continue;
    }
    if (p.vy >= 0 && prevBottom <= s.y + 1 + Math.max(0, -s.dy)) {
      land(p, s);
    } else if (p.vy < 0 && p.y < s.y + s.h && p.y - p.vy >= s.y + s.h - 1) {
      p.y = s.y + s.h;
      p.vy = 0;
      if (
        !headHit ||
        Math.abs(s.x + s.w / 2 - (p.x + p.w / 2)) < Math.abs(headHit.x + headHit.w / 2 - (p.x + p.w / 2))
      )
        headHit = s;
    }
  }
  if (p.onGround && !wasOnGround) ev.landedSpeed = Math.max(0.001, vyBefore);
  if (p.onGround) {
    p.doubleUsed = false;
    (p.ground as Solid | null)?.onStand?.();
  }
  if (headHit) {
    ev.headHit = headHit;
    headHit.onHeadHit?.();
  }
  return ev;
}

function land(p: PlayerBody, s: Solid): void {
  p.y = s.y - p.h;
  p.vy = 0;
  p.onGround = true;
  // Prefer a solid we are mostly over when standing on two at once.
  if (!p.ground || s.safe) p.ground = s;
}

/**
 * Stomp rule (PRD section 4): the player is falling and the player's previous bottom edge
 * was at or above the enemy's top + 12 px.
 */
/** Launch the player upward off a trampoline; the bounce is not cut by releasing jump. */
export function springLaunch(p: PlayerBody, speed: number): void {
  p.vy = -speed;
  p.spring = 30;
  p.onGround = false;
  p.ground = null;
  p.doubleUsed = false;
}

export function isStomp(playerVy: number, prevPlayerBottom: number, enemyTop: number): boolean {
  return playerVy > 0 && prevPlayerBottom <= enemyTop + PHYSICS.stompTolerance;
}

/** Last safe ground spot on a static solid, clamped 8 px from its edges. */
export function safeSpot(p: Rect, s: Rect): { x: number; y: number } {
  const x = Math.min(Math.max(p.x, s.x + 8), s.x + s.w - 8 - p.w);
  return { x, y: s.y - p.h };
}

/** Push a body out of a full solid that moved into it (e.g. the auto-rickshaw). */
export function pushOut(p: PlayerBody, s: Solid): void {
  if (!overlaps(p, s)) return;
  const pc = p.x + p.w / 2;
  const sc = s.x + s.w / 2;
  if (pc < sc) p.x = s.x - p.w;
  else p.x = s.x + s.w;
}

/** Simple body (items, projectiles) falling under gravity and landing on solids. Returns true if it hit a wall. */
export function stepSimpleBody(
  b: Rect & { vx: number; vy: number },
  solids: Solid[],
  gravity: number,
  maxFall = PHYSICS.maxFall,
): { landed: boolean; wall: boolean } {
  let wall = false;
  let landed = false;
  b.vy = Math.min(b.vy + gravity, maxFall);
  b.x += b.vx;
  for (const s of solids) {
    if (!s.active || s.kind !== 'solid' || !overlaps(b, s)) continue;
    b.x = b.vx > 0 ? s.x - b.w : s.x + s.w;
    wall = true;
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy;
  for (const s of solids) {
    if (!s.active || !overlaps(b, s)) continue;
    if (b.vy >= 0 && prevBottom <= s.y + 1 + Math.abs(s.dy)) {
      b.y = s.y - b.h;
      b.vy = 0;
      landed = true;
    } else if (s.kind === 'solid' && b.vy < 0) {
      b.y = s.y + s.h;
      b.vy = 0;
    }
  }
  return { landed, wall };
}
