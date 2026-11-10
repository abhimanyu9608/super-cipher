import { describe, expect, it } from 'vitest';
import { SOUNDS, render, musicSpec, noteHz } from '../src/audio/synth';
import { load, save, loadInt } from '../src/storage';

describe('generated audio', () => {
  it('renders every effect to finite, non-silent samples within [-1, 1]', () => {
    for (const [key, spec] of Object.entries(SOUNDS)) {
      const s = render(spec, 22050);
      expect(s.length, key).toBeGreaterThan(100);
      let peak = 0;
      for (const v of s) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak, key).toBeGreaterThan(0.05);
      expect(peak, key).toBeLessThanOrEqual(1);
    }
  });

  it('renders music loops and tunes A4 to 440 Hz', () => {
    expect(noteHz('A4')).toBe(440);
    expect(render(musicSpec('commute'), 8000).length).toBeGreaterThan(8000 * 5);
  });
});

describe('storage wrapper', () => {
  it('works without a browser localStorage', () => {
    save('sc-test', '42');
    expect(load('sc-test')).toBe('42');
    expect(loadInt('sc-test')).toBe(42);
    expect(loadInt('sc-missing', 7)).toBe(7);
  });
});
