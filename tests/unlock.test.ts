import { describe, expect, it } from 'vitest';
import {
  unlockCode,
  checkCode,
  newPlayerId,
  isPlayerId,
  normalize,
  CODE_ALPHABET,
} from '../src/social/unlock';

describe('unlock codes', () => {
  it('matches the prototype reference vector CB-7K4QX2 -> RQ8FTB for Level 2', () => {
    expect(unlockCode('CB-7K4QX2', 2)).toBe('RQ8FTB');
  });

  it('is case-insensitive on the player id and accepts messy input', () => {
    expect(unlockCode('cb-7k4qx2', 2)).toBe('RQ8FTB');
    expect(checkCode('CB-7K4QX2', 2, ' rq8-ftb ')).toBe(true);
    expect(checkCode('CB-7K4QX2', 2, 'RQ8FTC')).toBe(false);
    expect(normalize('a-b c_1!')).toBe('ABC1');
  });

  it('gives a different code per level', () => {
    expect(unlockCode('CB-7K4QX2', 3)).not.toBe(unlockCode('CB-7K4QX2', 2));
  });

  it('only uses the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const id = newPlayerId();
      expect(isPlayerId(id)).toBe(true);
      for (const ch of unlockCode(id, 2)) expect(CODE_ALPHABET).toContain(ch);
    }
    expect(CODE_ALPHABET).not.toMatch(/[ILO01]/);
    expect(isPlayerId('CB-ABC')).toBe(false);
  });
});
