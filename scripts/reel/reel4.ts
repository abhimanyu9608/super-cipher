/**
 * Reel #4 (20 s, 1080x1920, 30 fps): "Ab boss BOLTE hain 🔊" — every boss says its line out loud.
 * Hook (manager: "Ek quick call?") → 7 bosses talk one by one → CEO jumpscare line → CTA.
 *
 * Voices are rendered offline by scripts/reel/tts.mjs (Windows speech engine + ffmpeg) and mixed
 * in by render.mjs. The page gets the measured line lengths as ?d=1.36,0.9,... so every scene is
 * timed to its line; without ?d it uses the lengths below.
 * Preview: /super-cipher/scripts/reel/reel4.html. Export: REEL_URL=.../reel4.html node scripts/reel/render.mjs
 */
import {
  sprite,
  txt,
  caption,
  burst,
  confetti,
  bgGradient,
  clamp,
  lerp,
  easeOut,
  backOut,
  PIXEL,
  BODY,
  OUT,
  host,
} from './reel';
import { LINES } from './reel4-lines.mjs';
import { ensureCharacter } from '../../src/gfx/sprites';
import { sheetKey } from '../../src/gfx/characters';
import { SOUNDS, musicSpec, render, type SoundSpec } from '../../src/audio/synth';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 20;

ensureCharacter(host, 'boy', 'goldPhones');

type Line = { id: string; who: string; text: string; say: string };
const lines = LINES as Line[];

/** Measured line lengths (seconds) for the default voices; render.mjs passes the real ones. */
const DEFAULT_DUR: Record<string, number> = {
  hook: 1.36,
  monkey: 0.95,
  manager: 1.01,
  aunty: 1.8,
  prodBug: 1.91,
  client: 1.65,
  hr: 2.2,
  committee: 1.26,
  ceo: 2.59,
};
const durs: Record<string, number> = { ...DEFAULT_DUR };
if (typeof location !== 'undefined') {
  const d = new URLSearchParams(location.search).get('d');
  if (d) d.split(',').forEach((v, i) => lines[i] && Number(v) > 0 && (durs[lines[i].id] = Number(v)));
}

const LOOK: Record<string, { name: string; frame: number; bg: [string, string]; scale: number }> = {
  monkey: { name: 'BANDAR', frame: 0, bg: ['#C2255C', '#FFD8A8'], scale: 9 },
  manager: { name: 'MANAGER', frame: 1, bg: ['#5C1A1A', '#FF8787'], scale: 5.6 },
  aunty: { name: 'CANTEEN AUNTY', frame: 1, bg: ['#8B5A2B', '#FFD8A8'], scale: 5.6 },
  prodBug: { name: 'PROD BUG', frame: 0, bg: ['#2A0B12', '#FF2D55'], scale: 6 },
  client: { name: 'CLIENT', frame: 0, bg: ['#16213E', '#5C7CFA'], scale: 5.6 },
  hr: { name: 'HR', frame: 1, bg: ['#F76707', '#FFD8A8'], scale: 5.6 },
  committee: { name: 'APPRAISAL COMMITTEE', frame: 1, bg: ['#3A2412', '#FAB005'], scale: 5.6 },
  ceo: { name: 'THE CEO 👑', frame: 1, bg: ['#1A0000', '#C92A2A'], scale: 7.2 },
};

// ------------------------------------------------------------------ timeline (from line lengths)
const VOICE_DELAY = 0.12; // boss lands, then talks
const PAD = 0.15;
interface Slot {
  line: Line;
  t0: number;
  t1: number;
  /** When the voice starts and how long it lasts. */
  at: number;
  dur: number;
  index: number;
}
const slots: Slot[] = [];
{
  let t = 0;
  lines.forEach((line, index) => {
    const dur = durs[line.id];
    const lead = line.id === 'hook' ? 0.35 : line.id === 'ceo' ? 0.45 : VOICE_DELAY;
    const min = line.id === 'hook' ? 1.75 : line.id === 'ceo' ? 3.0 : 1.15;
    const len = Math.max(min, lead + dur + PAD);
    slots.push({ line, t0: t, t1: t + len, at: t + lead, dur, index });
    t += len;
  });
}
const CTA0 = Math.min(DURATION - 1.6, slots[slots.length - 1].t1);
slots[slots.length - 1].t1 = CTA0;
/** Voice clips for render.mjs: where each line goes in the soundtrack. */
export const VOICE_TRACK = slots.map((s) => ({
  id: s.line.id,
  at: s.at,
  gain: s.line.who === 'prodBug' ? 1.4 : 1,
}));

// ------------------------------------------------------------------ drawing helpers
const hero = (c: CanvasRenderingContext2D, frame: string, x: number, y: number, s: number, flip = false) =>
  sprite(c, sheetKey('boy', 'goldPhones'), frame, x, y, s * 0.5, { ay: 160 / 164, flip });

function wrap(c: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const next = cur ? `${cur} ${w}` : w;
    if (c.measureText(next).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** Comic speech bubble whose text types out while the line is being spoken. */
function bubble(c: CanvasRenderingContext2D, t: number, s: Slot, tailX: number, y: number, size: number) {
  const k = backOut((t - s.t0 - 0.05) / 0.22);
  if (k <= 0) return;
  const shown = clamp((t - s.at) / Math.max(0.3, s.dur * 0.85));
  const full = s.line.text;
  const chars = [...full];
  const visible = chars.slice(0, Math.ceil(chars.length * shown)).join('');
  c.save();
  c.font = `800 ${size}px ${BODY}`;
  const rows = wrap(c, full, W - 220);
  const h = rows.length * size * 1.15 + 80;
  const top = y - h / 2;
  c.translate(W / 2, y);
  c.scale(k, k);
  c.translate(-W / 2, -y);
  c.fillStyle = '#FFFFFF';
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(70, top, W - 140, h, 46);
  c.moveTo(tailX - 50, top + h - 2);
  c.lineTo(tailX + 10, top + h + 90);
  c.lineTo(tailX + 40, top + h - 2);
  c.fill();
  c.stroke();
  // Cover the stroke where the tail joins the box.
  c.fillStyle = '#FFFFFF';
  c.fillRect(tailX - 44, top + h - 12, 80, 14);
  // Typewriter: lay out the full text, draw only the visible part.
  let left = visible.length;
  rows.forEach((row, i) => {
    const part = [...row].slice(0, Math.max(0, left)).join('');
    left -= [...row].length + 1;
    if (!part) return;
    c.font = `800 ${size}px ${BODY}`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const rw = c.measureText(row).width;
    c.fillStyle = OUT;
    c.fillText(part, W / 2 - rw / 2, top + 40 + size * 0.58 + i * size * 1.15);
  });
  c.restore();
}

/** Speaker icon + sound rings and equalizer bars while the boss is talking. */
function voiceFx(c: CanvasRenderingContext2D, t: number, s: Slot, mx: number, my: number, color: string) {
  const talking = t >= s.at && t <= s.at + s.dur;
  if (!talking) return;
  const u = t - s.at;
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 10;
  for (let i = 0; i < 3; i++) {
    const r = ((u * 1.6 + i / 3) % 1) * 260 + 60;
    c.globalAlpha = 1 - ((u * 1.6 + i / 3) % 1);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(mx, my, r, side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, side < 0 ? Math.PI * 1.2 : Math.PI * 0.2);
      c.stroke();
    }
  }
  c.restore();
  // Equalizer bars above the name panel.
  c.save();
  for (let i = 0; i < 15; i++) {
    const h = 20 + Math.abs(Math.sin(t * 17 + i * 1.7) * Math.cos(t * 9 + i)) * 90;
    c.fillStyle = color;
    c.strokeStyle = OUT;
    c.lineWidth = 5;
    c.beginPath();
    c.roundRect(W / 2 - 15 * 26 + i * 52, 1500 - h, 36, h, 8);
    c.fill();
    c.stroke();
  }
  c.restore();
}

function namePanel(c: CanvasRenderingContext2D, t: number, s: Slot, label: string) {
  const k = easeOut((t - s.t0) / 0.2);
  c.save();
  c.translate(lerp(-W, 0, k), 0);
  c.fillStyle = 'rgba(14,11,31,0.88)';
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(80, 1530, W - 160, 200, 30);
  c.fill();
  c.stroke();
  txt(c, label, W / 2, 1600, 48, '#FFD43B', { font: PIXEL, stroke: 10, maxW: W - 220 });
  txt(c, `🔊 BOSS ${s.index}/8`, W / 2, 1680, 30, '#FFFFFF', { font: PIXEL, stroke: 8 });
  c.restore();
}

/** Boss sprite with a talking bob (frames flip while the line plays). */
function talkingBoss(c: CanvasRenderingContext2D, t: number, s: Slot, x: number, y: number, scale: number) {
  const look = LOOK[s.line.who];
  const talking = t >= s.at && t <= s.at + s.dur;
  const frame = talking ? Math.floor(t * 9) % 2 : look.frame;
  const bob = talking ? 1 + Math.abs(Math.sin(t * 18)) * 0.05 : 1;
  sprite(c, s.line.who, frame, x, y, scale * bob, { ay: 1, sy: talking ? 1 / bob + 0.04 : 1 });
}

// ------------------------------------------------------------------ scenes
function sceneHook(c: CanvasRenderingContext2D, t: number, s: Slot) {
  const dt = t - s.t0;
  bgGradient(c, '#14121F', '#3B1A4F');
  // Manager pops up huge from the bottom like a video call.
  const k = backOut((dt - 0.05) / 0.3);
  c.save();
  c.fillStyle = '#1B1636';
  c.strokeStyle = '#22D3EE';
  c.lineWidth = 12;
  c.beginPath();
  c.roundRect(110, 760, W - 220, 820, 40);
  c.fill();
  c.stroke();
  c.restore();
  txt(c, '● LIVE CALL', 200, 820, 30, '#FF5C5C', { font: PIXEL, stroke: 8, align: 'left' });
  c.save();
  c.beginPath();
  c.roundRect(116, 766, W - 232, 808, 36);
  c.clip();
  talkingBoss(c, t, s, W / 2, lerp(2200, 1640, k), 6.6);
  c.restore();
  bubble(c, t, s, W / 2 + 60, 560, 84);
  voiceFx(c, t, s, W / 2, 1160, '#22D3EE');
  caption(c, t, s.t0 + 0.1, s.t1, 190, [['Ab boss BOLTE hain! 😱🔊', '#FFD43B']], 80);
}

function sceneBoss(c: CanvasRenderingContext2D, t: number, s: Slot) {
  const look = LOOK[s.line.who];
  const dt = t - s.t0;
  bgGradient(c, look.bg[0], look.bg[1]);
  // Radiating stripes.
  c.save();
  c.translate(W / 2, 1150);
  c.rotate(t * 0.25);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 12; i++) {
    c.rotate((Math.PI * 2) / 12);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-90, -1500);
    c.lineTo(90, -1500);
    c.fill();
  }
  c.restore();
  const kIn = backOut(dt / 0.22);
  const shake = dt < 0.15 ? Math.sin(dt * 120) * 16 : 0;
  talkingBoss(c, t, s, lerp(W + 500, W / 2, kIn) + shake, 1400, look.scale);
  voiceFx(c, t, s, W / 2, 1050, '#FFFFFF');
  // The hero in the corner, flinching while the boss talks.
  const talking = t >= s.at && t <= s.at + s.dur;
  hero(c, talking ? 'hurt' : 'idle0', 150, 1500 - (talking ? Math.abs(Math.sin(t * 12)) * 20 : 0), 2.2);
  bubble(c, t, s, W / 2 + 40, 470, s.line.text.length > 24 ? 70 : 88);
  namePanel(c, t, s, look.name);
  if (dt < 0.07) {
    c.fillStyle = `rgba(255,255,255,${0.8 * (1 - dt / 0.07)})`;
    c.fillRect(0, 0, W, H);
  }
  txt(c, 'BOSS VOICE LINES 🔊', W / 2, 150, 40, '#FFFFFF', { font: PIXEL, stroke: 10, maxW: W - 80 });
}

function sceneCeo(c: CanvasRenderingContext2D, t: number, s: Slot) {
  const dt = t - s.t0;
  if (dt < 0.12) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    return;
  }
  const g = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.7);
  g.addColorStop(0, '#FFD43B');
  g.addColorStop(0.35, '#C92A2A');
  g.addColorStop(1, '#1A0000');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const d = dt - 0.12;
  const shake = d < 0.6 ? 26 * (1 - d / 0.6) : 0;
  const k = d < 0.25 ? lerp(0.3, 1, backOut(d / 0.25)) : 1 + Math.sin(d * 3) * 0.02;
  c.save();
  c.translate(Math.sin(d * 80) * shake, Math.cos(d * 70) * shake);
  talkingBoss(c, t, s, W / 2, 1640, LOOK.ceo.scale * k);
  c.restore();
  voiceFx(c, t, s, W / 2, 1100, '#FFD43B');
  if (d < 0.1) {
    c.fillStyle = `rgba(255,255,255,${1 - d / 0.1})`;
    c.fillRect(0, 0, W, H);
  }
  bubble(c, t, s, W / 2 + 40, 470, 72);
  namePanel(c, t, s, LOOK.ceo.name);
  txt(c, 'FINAL BOSS 😱', W / 2, 150, 52, '#FFFFFF', { font: PIXEL, stroke: 12, shadow: '#C92A2A' });
}

function sceneCta(c: CanvasRenderingContext2D, t: number) {
  const dt = t - CTA0;
  bgGradient(c, '#0E0B1F', '#2A1F5C');
  confetti(c, t, CTA0, 70, 12);
  const k = backOut(dt / 0.35);
  c.save();
  c.translate(W / 2, 330);
  c.scale(k, k);
  txt(c, 'SUPER CIPHER', 0, 0, 92, '#FFD43B', { font: PIXEL, stroke: 22, shadow: '#F06595', maxW: W - 40 });
  txt(c, 'OFFICE RUN', 0, 130, 64, '#FFFFFF', { font: PIXEL, stroke: 16 });
  c.restore();
  // All 8 bosses in a row, bobbing like they're all talking at once.
  const row = ['monkey', 'manager', 'aunty', 'prodBug', 'client', 'hr', 'committee', 'ceo'];
  row.forEach((b, i) => {
    const x = 110 + (i % 4) * 287;
    const y = i < 4 ? 900 : 1170;
    const bob = Math.abs(Math.sin(t * 9 + i)) * 14;
    sprite(c, b, Math.floor(t * 8 + i) % 2, x, y - bob, b === 'monkey' ? 2.6 : 1.8, { ay: 1 });
  });
  txt(c, 'Sound ON karke khelo 🔊', W / 2, 1300, 62, '#22D3EE', { weight: '800', stroke: 14, maxW: W - 60 });
  if (dt > 0.3) {
    const b = 1 + Math.abs(Math.sin(t * 5)) * 0.06;
    c.save();
    c.translate(W / 2, 1470);
    c.scale(b, b);
    c.fillStyle = '#FFD43B';
    c.strokeStyle = OUT;
    c.lineWidth = 10;
    c.beginPath();
    c.roundRect(-400, -85, 800, 170, 85);
    c.fill();
    c.stroke();
    txt(c, '🔗 LINK IN BIO 👆', 0, 4, 66, OUT, { weight: '800' });
    c.restore();
  }
  txt(c, 'FREE · NO DOWNLOAD 📱', W / 2, 1650, 48, '#FFFFFF', { font: PIXEL, stroke: 12, maxW: W - 60 });
  txt(c, '@cipherboy.dev', W / 2, 1780, 54, '#F06595', { font: PIXEL, stroke: 12 });
}

// ------------------------------------------------------------------ frame
export function drawFrame(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.clearRect(0, 0, W, H);
  const s = slots.find((x) => t >= x.t0 && t < x.t1);
  const cut = s ? s.t0 : CTA0;
  const z = 1 + 0.06 * (1 - easeOut((t - cut) / 0.25));
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);
  if (!s) sceneCta(c, t);
  else if (s.line.id === 'hook') sceneHook(c, t, s);
  else if (s.line.id === 'ceo') sceneCeo(c, t, s);
  else sceneBoss(c, t, s);
  c.restore();
  if (!s && t - CTA0 < 0.08) {
    c.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - CTA0) / 0.08)})`;
    c.fillRect(0, 0, W, H);
  }
  if (s && s.line.id !== 'ceo') burst(c, t, s.t0 + 0.12, W / 2, 1100, '#FFD43B', 18, 700, s.index + 3);
}

// ------------------------------------------------------------------ soundtrack bed (voices are mixed in by render.mjs)
export function renderAudio(sr = 44100): Float32Array {
  const out = new Float32Array(Math.ceil(DURATION * sr));
  const add = (spec: SoundSpec, at: number, gain = 1, until = DURATION) => {
    const s = render(spec, sr);
    const o = Math.floor(at * sr);
    const end = Math.min(out.length, Math.floor(until * sr));
    for (let i = 0; i < s.length && o + i < end; i++) out[o + i] += s[i] * gain;
  };
  const S = SOUNDS;
  const ceo = slots[slots.length - 1];
  add(S.ring, 0.02, 0.8);
  add(musicSpec('commute'), slots[1].t0, 0.55, ceo.t0 - 0.02);
  for (const s of slots.slice(1, -1)) add(S.thud, s.t0, 0.9);
  add(S.jumpscare, ceo.t0 + 0.12, 1.2);
  add(musicSpec('office'), CTA0, 0.6, DURATION);
  add(S.victory, CTA0, 0.9);
  add(S.click, CTA0 + 0.3, 0.8);
  for (let i = 0; i < out.length; i++) {
    const fade = Math.min(1, (out.length - i) / (0.5 * sr));
    out[i] = Math.tanh(out[i] * 0.9) * 0.86 * fade;
  }
  return out;
}

export { wavBase64 } from './reel';
