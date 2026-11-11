import { describe, expect, it } from 'vitest';
import { speakable, pickVoice, allowLine, voiceFor, VOICES, VOICE_LIMIT } from '../src/audio/voice';
import { t } from '../src/i18n/strings';

describe('boss voice lines', () => {
  it('strips emoji, score tags and symbols, and un-shouts words', () => {
    expect(speakable('Welcome aboard, CTO! 👑')).toBe('Welcome aboard, CTO!');
    expect(speakable('MUTED! +300')).toBe('muted!');
    expect(speakable('BUG RESOLVED ✅')).toBe('bug resolved');
    expect(speakable('OOK OOK!')).toBe('ook ook!');
    expect(speakable("Let's do a fun activity! 🎉")).toBe("Let's do a fun activity!");
  });

  it('prefers an Indian English voice, then Hindi, then any English', () => {
    const v = (lang: string) => ({ lang, name: lang });
    expect(pickVoice([v('fr-FR'), v('en-US'), v('hi-IN'), v('en-IN')])?.lang).toBe('en-IN');
    expect(pickVoice([v('en-US'), v('hi-IN')])?.lang).toBe('hi-IN');
    expect(pickVoice([v('fr-FR'), v('en-GB')])?.lang).toBe('en-GB');
    expect(pickVoice([])).toBeNull();
  });

  it('throttles lines to the voice limit per window', () => {
    let times: number[] = [];
    const results: boolean[] = [];
    for (const now of [0, 100, 200, VOICE_LIMIT.windowMs + 1]) {
      const r = allowLine(times, now);
      times = r.times;
      results.push(r.ok);
    }
    expect(results).toEqual([true, true, false, true]);
  });

  it('gives every boss its own voice and keeps settings in range', () => {
    for (const id of ['monkey', 'manager', 'aunty', 'prodBug', 'client', 'hr', 'committee', 'ceo'])
      expect(voiceFor(id)).toBe(id);
    expect(voiceFor('unknown')).toBe('manager');
    for (const v of Object.values(VOICES)) {
      expect(v.pitch).toBeGreaterThanOrEqual(0);
      expect(v.pitch).toBeLessThanOrEqual(2);
      expect(v.rate).toBeGreaterThan(0.1);
    }
  });

  it('has something speakable for every boss line in both languages', () => {
    const keys = [
      'quickCall',
      'muted',
      'cameraOn',
      'deadline',
      'managerBye',
      'auntyHi',
      'cookerHit',
      'auntyLine2',
      'auntyLine3',
      'auntyBye',
      'clientHi',
      'scopeLocked',
      'clientLine2',
      'clientLine3',
      'clientBye',
      'hrHi',
      'micHit',
      'hrLine2',
      'hrLine3',
      'hrBye',
      'committeeHi',
      'stampHit',
      'committeeLine2',
      'committeeLine3',
      'committeeBye',
      'ceoHi',
      'ceoHit',
      'ceoLine2',
      'ceoLine3',
      'ceoBye',
      'ook',
      'monkeyGone',
      'prodBugHit',
      'prodBugRoar',
      'prodBugBye',
    ] as const;
    for (const key of keys)
      for (const lang of ['hi', 'en'] as const)
        expect(speakable(t(key, undefined, lang)).length).toBeGreaterThan(1);
  });
});
