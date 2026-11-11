import { describe, expect, it } from 'vitest';
import { PHYSICS, CHARACTERS, perSecond, perSecondSq, framesToMs, HITBOX } from '../src/config/physics';
import {
  createPlayerBody,
  stepPlayer,
  isStomp,
  makeSolid,
  safeSpot,
  type PlayerInput,
  type PhysicsEnv,
} from '../src/systems/physics';

const env: PhysicsEnv = {
  worldWidth: 2000,
  canDoubleJump: false,
  canDash: false,
  slow: false,
  wet: false,
  updraft: false,
};
const idle: PlayerInput = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
};
const ground = () => [makeSolid({ x: 0, y: 460, w: 2000, h: 80 })];
const jump: PlayerInput = { ...idle, jumpPressed: true, jumpHeld: true };
const hold: PlayerInput = { ...idle, jumpHeld: true };

function settle(p = createPlayerBody('boy', 100, 390), solids = ground()) {
  for (let i = 0; i < 20; i++) stepPlayer(p, idle, solids, env);
  return p;
}

describe('physics constants (PRD section 4 table)', () => {
  it('per-second values match the PRD', () => {
    expect(perSecondSq(PHYSICS.gravity)).toBeCloseTo(2232);
    expect(perSecond(PHYSICS.maxFall)).toBe(840);
    expect(perSecondSq(PHYSICS.groundAccel)).toBeCloseTo(2520);
    expect(perSecondSq(PHYSICS.airAccel)).toBeCloseTo(1512);
    expect(perSecond(CHARACTERS.boy.maxRun)).toBeCloseTo(264);
    expect(perSecond(CHARACTERS.boy.jump)).toBeCloseTo(804);
    expect(perSecond(CHARACTERS.girl.maxRun)).toBeCloseTo(306);
    expect(perSecond(CHARACTERS.girl.jump)).toBeCloseTo(756);
    expect(perSecond(PHYSICS.jumpCut)).toBe(270);
    expect(framesToMs(PHYSICS.coyoteFrames)).toBe(117);
    expect(framesToMs(PHYSICS.jumpBufferFrames)).toBe(133);
    expect(perSecond(PHYSICS.stompBounce)).toBe(570);
    expect(perSecond(PHYSICS.bossStompBounce)).toBe(660);
    expect(perSecond(PHYSICS.hurtKnockUp)).toBe(420);
    expect(perSecond(PHYSICS.hurtKnockBack)).toBe(240);
    expect(framesToMs(PHYSICS.invulnFrames)).toBe(1667);
    expect(perSecond(PHYSICS.conveyorSpeed)).toBeCloseTo(-108);
    expect(HITBOX).toEqual({ w: 30, h: 60 });
  });
});

describe('player movement', () => {
  it('lands on the ground and stands still', () => {
    const p = settle();
    expect(p.onGround).toBe(true);
    expect(p.y + p.h).toBe(460);
  });

  it('caps run speed per character', () => {
    for (const c of ['boy', 'girl'] as const) {
      const p = settle(createPlayerBody(c, 100, 390));
      for (let i = 0; i < 60; i++) stepPlayer(p, { ...idle, right: true }, ground(), env);
      expect(p.vx).toBeCloseTo(CHARACTERS[c].maxRun);
    }
  });

  it('applies ground friction and snaps to zero', () => {
    const p = settle();
    p.vx = 4;
    stepPlayer(p, idle, ground(), env);
    expect(p.vx).toBeCloseTo(4 * PHYSICS.groundFriction);
    for (let i = 0; i < 40; i++) stepPlayer(p, idle, ground(), env);
    expect(p.vx).toBe(0);
  });

  it('jumps at the character jump speed', () => {
    const p = settle();
    stepPlayer(p, jump, ground(), env);
    expect(p.vy).toBeCloseTo(-CHARACTERS.boy.jump + PHYSICS.gravity);
  });

  it('cuts the jump when released (variable height)', () => {
    const p = settle();
    stepPlayer(p, jump, ground(), env);
    stepPlayer(p, idle, ground(), env);
    expect(p.vy).toBeCloseTo(-PHYSICS.jumpCut + PHYSICS.gravity);
  });

  it('allows a jump within coyote time after leaving a ledge', () => {
    const solids = [makeSolid({ x: 0, y: 460, w: 200, h: 80 })];
    const p = settle(createPlayerBody('boy', 150, 390), solids);
    p.x = 205; // just walked off the edge
    stepPlayer(p, idle, solids, env);
    expect(p.onGround).toBe(false);
    for (let i = 0; i < 4; i++) stepPlayer(p, idle, solids, env);
    expect(stepPlayer(p, jump, solids, env).jumped).toBe(true);
  });

  it('does not allow a jump after coyote time runs out', () => {
    const solids = [makeSolid({ x: 0, y: 460, w: 200, h: 80 })];
    const p = settle(createPlayerBody('boy', 150, 390), solids);
    p.x = 205;
    for (let i = 0; i < PHYSICS.coyoteFrames + 2; i++) stepPlayer(p, idle, solids, env);
    expect(stepPlayer(p, jump, solids, env).jumped).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const p = createPlayerBody('boy', 100, 380);
    p.vy = 8;
    stepPlayer(p, jump, ground(), env);
    let jumped = false;
    for (let i = 0; i < PHYSICS.jumpBufferFrames && !jumped; i++)
      jumped = stepPlayer(p, hold, ground(), env).jumped;
    expect(jumped).toBe(true);
  });

  it('double jumps only with chai, once per airtime', () => {
    const p = settle();
    const e2 = { ...env, canDoubleJump: true };
    stepPlayer(p, jump, ground(), e2);
    for (let i = 0; i < 10; i++) stepPlayer(p, hold, ground(), e2);
    expect(stepPlayer(p, jump, ground(), e2).doubleJumped).toBe(true);
    expect(p.vy).toBeCloseTo(-CHARACTERS.boy.jump * PHYSICS.doubleJumpFactor + PHYSICS.gravity);
    expect(stepPlayer(p, jump, ground(), e2).doubleJumped).toBe(false);
    const q = settle();
    stepPlayer(q, jump, ground(), env);
    for (let i = 0; i < 10; i++) stepPlayer(q, hold, ground(), env);
    expect(stepPlayer(q, jump, ground(), env).doubleJumped).toBe(false);
  });

  it('never falls faster than max fall speed', () => {
    const p = createPlayerBody('boy', 100, -2000);
    for (let i = 0; i < 100; i++) stepPlayer(p, idle, [], env);
    expect(p.vy).toBe(PHYSICS.maxFall);
  });

  it('halves max speed in slow zones', () => {
    const p = settle();
    for (let i = 0; i < 60; i++) stepPlayer(p, { ...idle, right: true }, ground(), { ...env, slow: true });
    expect(p.vx).toBeCloseTo(CHARACTERS.boy.maxRun * PHYSICS.slowFactor);
  });

  it('passes up through one-way platforms and lands on them from above', () => {
    const solids = [...ground(), makeSolid({ x: 50, y: 400, w: 120, h: 12 }, 'oneway')];
    const p = settle(createPlayerBody('boy', 100, 400), solids);
    expect(p.y + p.h).toBe(460);
    stepPlayer(p, jump, solids, env);
    let landedOn400 = false;
    for (let i = 0; i < 80; i++) {
      stepPlayer(p, hold, solids, env);
      if (p.onGround && p.y + p.h === 400) landedOn400 = true;
    }
    expect(landedOn400).toBe(true);
  });

  it('is carried by a moving platform and pushed by a conveyor', () => {
    const plat = makeSolid({ x: 50, y: 400, w: 120, h: 18 }, 'oneway');
    const p = settle(createPlayerBody('boy', 100, 330), [plat]);
    expect(p.ground).toBe(plat);
    plat.x += 2;
    plat.dx = 2;
    const x0 = p.x;
    stepPlayer(p, idle, [plat], env);
    expect(p.x).toBeCloseTo(x0 + 2);
    const belt = makeSolid({ x: 0, y: 460, w: 400, h: 16 }, 'solid', { conveyor: PHYSICS.conveyorSpeed });
    const q = settle(createPlayerBody('boy', 200, 390), [belt]);
    const qx = q.x;
    stepPlayer(q, idle, [belt], env);
    expect(q.x).toBeCloseTo(qx + PHYSICS.conveyorSpeed);
  });

  it('stops at walls', () => {
    const solids = [...ground(), makeSolid({ x: 300, y: 300, w: 40, h: 160 })];
    const p = settle(createPlayerBody('boy', 200, 390), solids);
    for (let i = 0; i < 60; i++) stepPlayer(p, { ...idle, right: true }, solids, env);
    expect(p.x + p.w).toBe(300);
  });

  it('bonks its head on blocks from below', () => {
    let hit = 0;
    const block = makeSolid({ x: 90, y: 330, w: 40, h: 40 }, 'solid', { onHeadHit: () => hit++ });
    const solids = [...ground(), block];
    const p = settle(createPlayerBody('boy', 95, 400), solids);
    stepPlayer(p, jump, solids, env);
    for (let i = 0; i < 10; i++) stepPlayer(p, hold, solids, env);
    expect(hit).toBe(1);
    expect(p.y).toBeGreaterThanOrEqual(370);
  });
});

describe('stomp rule', () => {
  it('counts as a stomp only when falling and previous bottom was at or above enemy top + 12', () => {
    expect(isStomp(3, 432, 432)).toBe(true);
    expect(isStomp(3, 444, 432)).toBe(true);
    expect(isStomp(3, 444.5, 432)).toBe(false);
    expect(isStomp(0, 420, 432)).toBe(false);
    expect(isStomp(-2, 420, 432)).toBe(false);
  });
});

describe('safe respawn spot', () => {
  it('clamps 8 px from the edges of the last safe ground', () => {
    const s = { x: 660, y: 460, w: 490, h: 80 };
    expect(safeSpot({ x: 650, y: 400, w: 30, h: 60 }, s)).toEqual({ x: 668, y: 400 });
    expect(safeSpot({ x: 1149, y: 400, w: 30, h: 60 }, s)).toEqual({ x: 1112, y: 400 });
  });
});

describe('trampoline spring', () => {
  it('keeps the full bounce even when jump is not held', async () => {
    const { springLaunch } = await import('../src/systems/physics');
    const p = createPlayerBody('boy', 100, 300);
    springLaunch(p, 16);
    stepPlayer(p, idle, [], env);
    expect(p.vy).toBeCloseTo(-16 + PHYSICS.gravity);
    for (let i = 0; i < 40; i++) stepPlayer(p, idle, [], env);
    expect(p.spring).toBe(0);
  });
});
