/**
 * Minimal 8-bit sound synthesiser. Renders note sequences to raw samples, so every
 * generated effect ships with zero licence risk (PRD section 10). Pure; no Web Audio needed.
 */
export type Wave = 'square' | 'triangle' | 'sine' | 'saw' | 'noise';

export interface Note {
  /** Start and end frequency in Hz (slides linearly). 0 = rest. */
  f: number;
  f1?: number;
  /** Duration in seconds. */
  d: number;
  /** Volume 0..1 (default 1). */
  v?: number;
}

export interface Voice {
  wave: Wave;
  notes: Note[];
  /** Overall gain for this voice. */
  gain?: number;
  attack?: number;
  release?: number;
  /** Vibrato depth (fraction of frequency) and rate (Hz). */
  vib?: [number, number];
  duty?: number;
  /** Start offset in seconds. */
  at?: number;
}

export interface SoundSpec {
  voices: Voice[];
}

export function noteHz(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 0;
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  let n = base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  n = n + 0;
  return 440 * Math.pow(2, n / 12);
}

let noiseSeed = 1;
function noise(): number {
  noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
  return (noiseSeed / 0x7fffffff) * 2 - 1;
}

function osc(wave: Wave, phase: number, duty: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'square':
      return p < duty ? 0.6 : -0.6;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'sine':
      return Math.sin(p * Math.PI * 2);
    case 'saw':
      return (2 * p - 1) * 0.6;
    case 'noise':
      return noise() * 0.7;
  }
}

export function specDuration(spec: SoundSpec): number {
  return Math.max(
    ...spec.voices.map((v) => (v.at ?? 0) + v.notes.reduce((s, n) => s + n.d, 0) + (v.release ?? 0.02)),
  );
}

/** Render a sound to mono samples. */
export function render(spec: SoundSpec, sampleRate: number): Float32Array {
  const total = Math.ceil(specDuration(spec) * sampleRate);
  const out = new Float32Array(total);
  for (const v of spec.voices) {
    const attack = v.attack ?? 0.004;
    const release = v.release ?? 0.02;
    const gain = v.gain ?? 0.5;
    const duty = v.duty ?? 0.5;
    let t0 = v.at ?? 0;
    let phase = 0;
    let held = 0;
    for (const n of v.notes) {
      const start = Math.floor(t0 * sampleRate);
      const len = Math.floor(n.d * sampleRate);
      const rel = Math.floor(release * sampleRate);
      for (let i = 0; i < len + rel && start + i < total; i++) {
        const t = i / sampleRate;
        const k = Math.min(1, i / Math.max(1, len));
        let f = n.f + ((n.f1 ?? n.f) - n.f) * k;
        if (v.vib) f *= 1 + Math.sin(t * Math.PI * 2 * v.vib[1]) * v.vib[0];
        if (v.wave === 'noise' && f > 0) {
          // Sample-and-hold noise gives pitched 8-bit noise.
          phase += f / sampleRate;
          if (phase >= 1) {
            phase -= Math.floor(phase);
            held = noise();
          }
        } else phase += f / sampleRate;
        if (n.f === 0) continue;
        const env = Math.min(1, t / attack) * (i < len ? 1 : 1 - (i - len) / Math.max(1, rel));
        const s = v.wave === 'noise' ? held * 0.7 : osc(v.wave, phase, duty);
        out[start + i] += s * env * gain * (n.v ?? 1);
      }
      t0 += n.d;
    }
  }
  // Soft clip.
  for (let i = 0; i < total; i++) out[i] = Math.tanh(out[i] * 1.2);
  return out;
}

const N = noteHz;
const seq = (names: string[], d: number, v = 1): Note[] =>
  names.map((s) => ({ f: s === '-' ? 0 : N(s), d, v }));

/** Every generated effect. Keys match audio/sfx.ts. */
export const SOUNDS: Record<string, SoundSpec> = {
  jump: { voices: [{ wave: 'square', duty: 0.25, notes: [{ f: 280, f1: 720, d: 0.13 }], gain: 0.35 }] },
  djump: {
    voices: [
      { wave: 'square', duty: 0.125, notes: [{ f: 620, f1: 1300, d: 0.1 }], gain: 0.3 },
      { wave: 'triangle', notes: seq(['E6', 'B6'], 0.05), gain: 0.3, at: 0.05 },
    ],
  },
  coin: {
    voices: [
      {
        wave: 'square',
        duty: 0.25,
        notes: [
          { f: N('B5'), d: 0.06 },
          { f: N('E6'), d: 0.2 },
        ],
        gain: 0.3,
      },
    ],
  },
  bump: {
    voices: [
      { wave: 'triangle', notes: [{ f: 160, f1: 70, d: 0.1 }], gain: 0.7 },
      { wave: 'noise', notes: [{ f: 2000, d: 0.05 }], gain: 0.25 },
    ],
  },
  powerup: {
    voices: [
      { wave: 'square', duty: 0.25, notes: seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.06), gain: 0.3 },
    ],
  },
  stomp: {
    voices: [
      {
        wave: 'sine',
        notes: [
          { f: 180, f1: 520, d: 0.09 },
          { f: 520, f1: 260, d: 0.1 },
        ],
        gain: 0.6,
        vib: [0.04, 30],
      },
    ],
  },
  hurt: {
    voices: [
      { wave: 'square', notes: [{ f: 420, f1: 90, d: 0.28 }], gain: 0.35 },
      { wave: 'sine', notes: [{ f: 1300, f1: 450, d: 0.32 }], gain: 0.25, at: 0.04 },
    ],
  },
  bark: {
    voices: [
      {
        wave: 'saw',
        notes: [
          { f: 320, f1: 170, d: 0.11 },
          { f: 0, d: 0.06 },
          { f: 300, f1: 160, d: 0.13 },
        ],
        gain: 0.45,
      },
      {
        wave: 'noise',
        notes: [
          { f: 3000, d: 0.08 },
          { f: 0, d: 0.09 },
          { f: 3000, d: 0.08 },
        ],
        gain: 0.2,
      },
    ],
  },
  honk: {
    voices: [
      {
        wave: 'saw',
        notes: [
          { f: 349, d: 0.16 },
          { f: 0, d: 0.07 },
          { f: 330, d: 0.26 },
        ],
        gain: 0.35,
        vib: [0.03, 18],
      },
      {
        wave: 'square',
        notes: [
          { f: 440, d: 0.16 },
          { f: 0, d: 0.07 },
          { f: 415, d: 0.26 },
        ],
        gain: 0.2,
      },
    ],
  },
  moo: {
    voices: [
      {
        wave: 'saw',
        notes: [{ f: 150, f1: 115, d: 0.7 }],
        gain: 0.4,
        vib: [0.05, 6],
        attack: 0.08,
        release: 0.1,
      },
    ],
  },
  thud: {
    voices: [
      { wave: 'sine', notes: [{ f: 110, f1: 40, d: 0.16 }], gain: 0.8 },
      { wave: 'noise', notes: [{ f: 900, d: 0.08 }], gain: 0.35 },
    ],
  },
  checkpoint: {
    voices: [{ wave: 'triangle', notes: seq(['E5', 'G5', 'C6'], 0.12), gain: 0.55, release: 0.2 }],
  },
  ook: {
    voices: [
      {
        wave: 'sine',
        notes: [
          { f: 520, f1: 340, d: 0.1 },
          { f: 0, d: 0.05 },
          { f: 560, f1: 360, d: 0.12 },
        ],
        gain: 0.5,
      },
    ],
  },
  monkeyGone: {
    voices: [
      { wave: 'square', duty: 0.25, notes: [{ f: 900, f1: 200, d: 0.5 }], gain: 0.3, vib: [0.06, 14] },
    ],
  },
  coworker: {
    voices: [
      {
        wave: 'triangle',
        notes: [
          { f: 330, f1: 392, d: 0.12 },
          { f: 392, f1: 494, d: 0.16 },
        ],
        gain: 0.5,
      },
    ],
  },
  manager: {
    voices: [
      {
        wave: 'saw',
        notes: [
          { f: 140, f1: 180, d: 0.18 },
          { f: 180, f1: 120, d: 0.24 },
        ],
        gain: 0.35,
        vib: [0.04, 8],
      },
    ],
  },
  tick: { voices: [{ wave: 'noise', notes: [{ f: 8000, d: 0.025 }], gain: 0.35 }] },
  pitfall: {
    voices: [
      {
        wave: 'square',
        duty: 0.5,
        notes: [
          { f: N('G4'), d: 0.3 },
          { f: N('F#4'), d: 0.3 },
          { f: N('F4'), f1: N('D4'), d: 0.7 },
        ],
        gain: 0.25,
        vib: [0.02, 6],
      },
    ],
  },
  gameover: {
    voices: [
      {
        wave: 'square',
        notes: [
          { f: N('D4'), d: 0.18 },
          { f: 0, d: 0.05 },
          { f: N('F4'), d: 0.18 },
          { f: 0, d: 0.05 },
          { f: N('G#3'), d: 0.9 },
        ],
        gain: 0.3,
        vib: [0.015, 5],
      },
      {
        wave: 'triangle',
        notes: [
          { f: N('D2'), d: 0.23 },
          { f: N('F2'), d: 0.23 },
          { f: N('G#1'), d: 0.9 },
        ],
        gain: 0.6,
      },
    ],
  },
  victory: {
    voices: [
      {
        wave: 'square',
        duty: 0.25,
        notes: [...seq(['G4', 'C5', 'E5', 'G5', 'C6', 'E6'], 0.08), { f: N('G6'), d: 0.45 }],
        gain: 0.28,
      },
      { wave: 'triangle', notes: [...seq(['C3', 'E3', 'G3'], 0.16), { f: N('C4'), d: 0.5 }], gain: 0.5 },
      { wave: 'square', duty: 0.5, notes: [{ f: N('E5'), d: 0.45 }], gain: 0.15, at: 0.56 },
    ],
  },
  laugh: {
    voices: [
      {
        wave: 'triangle',
        notes: [0, 1, 2, 3]
          .map((i) => ({ f: 640 - i * 30, f1: 520 - i * 30, d: 0.09 }))
          .flatMap((n) => [n, { f: 0, d: 0.05 }]),
        gain: 0.45,
        at: 0.9,
      },
    ],
  },
  beep: { voices: [{ wave: 'square', duty: 0.5, notes: [{ f: 1560, d: 0.08 }], gain: 0.25 }] },
  accessOk: {
    voices: [
      {
        wave: 'square',
        duty: 0.5,
        notes: [
          { f: 1560, d: 0.07 },
          { f: 0, d: 0.03 },
          { f: 2080, d: 0.12 },
        ],
        gain: 0.25,
      },
    ],
  },
  dash: { voices: [{ wave: 'noise', notes: [{ f: 6000, f1: 1500, d: 0.22 }], gain: 0.35 }] },
  pop: {
    voices: [
      { wave: 'noise', notes: [{ f: 5000, d: 0.03 }], gain: 0.4 },
      { wave: 'sine', notes: [{ f: 900, f1: 300, d: 0.04 }], gain: 0.3 },
    ],
  },
  laser: { voices: [{ wave: 'saw', notes: [{ f: 110, d: 0.25 }], gain: 0.18, vib: [0.08, 40] }] },
  scan: { voices: [{ wave: 'sine', notes: [{ f: 400, f1: 1600, d: 0.9 }], gain: 0.25, vib: [0.02, 20] }] },
  click: { voices: [{ wave: 'square', duty: 0.25, notes: [{ f: 880, d: 0.03 }], gain: 0.2 }] },
  bossHit: {
    voices: [
      {
        wave: 'square',
        notes: [
          { f: 220, f1: 880, d: 0.12 },
          { f: 880, f1: 110, d: 0.2 },
        ],
        gain: 0.35,
      },
    ],
  },
  paper: { voices: [{ wave: 'noise', notes: [{ f: 3000, f1: 6000, d: 0.12 }], gain: 0.25 }] },
  ring: {
    voices: [
      {
        wave: 'square',
        duty: 0.5,
        notes: [0, 1, 2, 3, 4, 5].map((i) => ({ f: i % 2 ? 1320 : 1760, d: 0.05 })),
        gain: 0.2,
      },
    ],
  },
  unlock: {
    voices: [
      {
        wave: 'square',
        duty: 0.25,
        notes: seq(['C5', 'G5', 'C6', '-', 'G5', 'C6', 'E6', 'G6'], 0.08),
        gain: 0.3,
      },
    ],
  },
  heart: { voices: [{ wave: 'triangle', notes: seq(['C6', 'E6', 'G6', 'C7'], 0.06), gain: 0.4 }] },
  late: {
    voices: [
      {
        wave: 'square',
        duty: 0.5,
        notes: [
          { f: 880, d: 0.15 },
          { f: 0, d: 0.05 },
          { f: 880, d: 0.15 },
          { f: 0, d: 0.05 },
          { f: 660, d: 0.3 },
        ],
        gain: 0.3,
      },
    ],
  },
  /** Jumpscare sting: white-noise blast + detuned dissonant stab + sub boom + rising shriek. */
  jumpscare: {
    voices: [
      { wave: 'noise', notes: [{ f: 9000, f1: 700, d: 0.55 }], gain: 0.7, attack: 0.001, release: 0.25 },
      {
        wave: 'saw',
        notes: [{ f: 220, f1: 205, d: 0.75 }],
        gain: 0.32,
        attack: 0.001,
        vib: [0.03, 23],
        release: 0.3,
      },
      {
        wave: 'saw',
        notes: [{ f: 233, f1: 218, d: 0.75 }],
        gain: 0.32,
        attack: 0.001,
        vib: [0.03, 19],
        release: 0.3,
      },
      { wave: 'square', notes: [{ f: 311, f1: 290, d: 0.7 }], gain: 0.22, attack: 0.001, release: 0.3 },
      { wave: 'sine', notes: [{ f: 95, f1: 30, d: 0.7 }], gain: 1, attack: 0.001, release: 0.2 },
      {
        wave: 'square',
        duty: 0.25,
        notes: [{ f: 900, f1: 2600, d: 0.5 }],
        gain: 0.2,
        vib: [0.06, 13],
        at: 0.06,
      },
    ],
  },
};

// ---------------------------------------------------------------- music

/** Short chiptune loop (generated). 4/4, 16th-note grid. */
export function musicSpec(kind: 'commute' | 'office'): SoundSpec {
  const bpm = kind === 'commute' ? 148 : 132;
  const s16 = 60 / bpm / 4;
  const lead =
    kind === 'commute'
      ? 'E5 - G5 - A5 - G5 E5 D5 - E5 - - - C5 D5 E5 - G5 - A5 - C6 - B5 A5 G5 - A5 - - - - - E5 - G5 - A5 - G5 E5 D5 - E5 - - - D5 C5 A4 - C5 - D5 - E5 - D5 C5 A4 - C5 - - - - -'
      : 'A4 - C5 - E5 - C5 - D5 - F5 - A5 - G5 - E5 - - - C5 - D5 - E5 - - - - - A4 - C5 - E5 - C5 - D5 - F5 - A5 - B5 - G5 - - - E5 - D5 - C5 - - - - -';
  const bassNotes =
    kind === 'commute'
      ? ['C3', 'C3', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2']
      : ['A2', 'A2', 'D3', 'D3', 'F2', 'F2', 'E2', 'E2'];
  const leadNotes: Note[] = lead.split(' ').map((n) => ({ f: n === '-' ? 0 : noteHz(n), d: s16, v: 0.9 }));
  // Merge held notes: a note followed by rests sustains a little.
  const bass: Note[] = [];
  for (const b of bassNotes)
    for (let i = 0; i < 8; i++) bass.push({ f: i % 2 === 0 ? noteHz(b) : noteHz(b) * 2, d: s16 });
  const hat: Note[] = [];
  for (let i = 0; i < 64; i++) hat.push({ f: i % 2 === 0 ? 9000 : 0, d: s16, v: i % 4 === 0 ? 1 : 0.6 });
  const kick: Note[] = [];
  for (let i = 0; i < 16; i++) kick.push({ f: 150, f1: 45, d: s16 }, { f: 0, d: s16 * 3 });
  return {
    voices: [
      { wave: 'square', duty: 0.25, notes: leadNotes, gain: 0.16, release: 0.03 },
      { wave: 'triangle', notes: bass, gain: 0.32, release: 0.01 },
      { wave: 'noise', notes: hat, gain: 0.05, release: 0.005 },
      { wave: 'sine', notes: kick, gain: 0.35, release: 0.01 },
    ],
  };
}
