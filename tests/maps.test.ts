import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMap, objectsOf, num, type TiledMap } from '../src/level/map';
import { STRINGS } from '../src/i18n/strings';

const load = (n: number) =>
  parseMap(JSON.parse(readFileSync(`public/assets/maps/level${n}.tmj`, 'utf8')) as TiledMap);

describe('Level 1 map matches PRD section 6', () => {
  const m = load(1);
  it('has the world size, spawn and finish', () => {
    expect(m.worldWidth).toBe(7400);
    expect([m.spawnX, m.spawnY]).toEqual([80, 400]);
    expect(m.finishX).toBe(7240);
  });
  it('has 7 sections with i18n names and the broken-step pit', () => {
    const secs = objectsOf(m, 'section');
    expect(secs.map((s) => s.x)).toEqual([0, 1150, 2300, 3500, 3920, 5000, 6300]);
    for (const s of secs) expect(STRINGS).toHaveProperty(String(s.props.key));
    const floors = objectsOf(m, 'ground').filter((g) => g.y === 460 && g.x < 1150 && g.h === 80);
    expect(floors.map((f) => [f.x, f.w])).toEqual([
      [0, 560],
      [660, 490],
    ]);
  });
  it('has the checkpoint, monkey, gate and metro timer', () => {
    const cp = objectsOf(m, 'checkpoint')[0];
    expect([cp.x, num(cp, 'respawnX'), num(cp, 'respawnY')]).toEqual([3830, 3800, 400]);
    expect(objectsOf(m, 'monkey')).toHaveLength(1);
    expect(objectsOf(m, 'gate')[0].x).toBe(6290);
    expect(num(objectsOf(m, 'metroTimer')[0], 'respawnX')).toBe(6330);
  });
  it('has every coin listed in the PRD', () => {
    expect(objectsOf(m, 'coin')).toHaveLength(46);
  });
});

describe('Level 2 map follows PRD section 7', () => {
  const m = load(2);
  it('has 5 Appraisal Points, a Manager and the coffee pickup', () => {
    expect(objectsOf(m, 'appraisal')).toHaveLength(5);
    expect(objectsOf(m, 'manager')).toHaveLength(1);
    expect(objectsOf(m, 'pickup').some((p) => p.props.item === 'coffee')).toBe(true);
  });
  it('has every Level 2 mechanic', () => {
    const types = [
      'turnstile',
      'wet',
      'dark',
      'updraft',
      'laser',
      'printer',
      'microwave',
      'chair',
      'coworker',
      'bossDoor',
      'finish',
    ];
    for (const type of types) expect(objectsOf(m, type).length, type).toBeGreaterThan(0);
    const lifts = objectsOf(m, 'mover').filter((o) => String(o.props.style).startsWith('lift'));
    expect(lifts.some((l) => l.props.style === 'liftFull')).toBe(true);
    for (const l of lifts)
      expect([num(l, 'min'), num(l, 'max'), num(l, 'speed'), num(l, 'pause')]).toEqual([200, 420, 1.2, 45]);
  });
});
