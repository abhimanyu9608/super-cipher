/**
 * Reel #3 (20 s, 1080x1920, 30 fps): the finale — "Intern se CTO tak".
 * Promotion staircase hook → 7-boss VS rush → CEO jumpscare → CEO fight → the RESIGN/CTO choice → CTA.
 * Preview: /super-cipher/scripts/reel/reel3.html. Export: REEL_URL=.../reel3.html node scripts/reel/render.mjs
 */
import {
  host,
  sprite,
  txt,
  caption,
  burst,
  popup,
  confetti,
  bgGradient,
  clamp,
  lerp,
  easeOut,
  backOut,
  PIXEL,
  OUT,
} from './reel';
import { ensureCharacter } from '../../src/gfx/sprites';
import { sheetKey } from '../../src/gfx/characters';
import { seeded } from '../../src/gfx/draw';
import { SOUNDS, musicSpec, render, type SoundSpec } from '../../src/audio/synth';
import type { SkinId } from '../../src/config/extras';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 20;

for (const s of ['none', 'lanyard', 'cap', 'shades', 'goldPhones'] as SkinId[])
  ensureCharacter(host, 'boy', s);

const hero = (
  c: CanvasRenderingContext2D,
  frame: string,
  x: number,
  y: number,
  s: number,
  o: { skin?: SkinId; flip?: boolean; rot?: number; sx?: number; sy?: number; alpha?: number } = {},
) => {
  c.save();
  c.translate(x, y);
  c.scale(o.sx ?? 1, o.sy ?? 1);
  sprite(c, sheetKey('boy', o.skin ?? 'none'), frame, 0, 0, s * 0.5, {
    ay: 160 / 164,
    flip: o.flip,
    rot: o.rot,
    alpha: o.alpha,
  });
  c.restore();
};

function panel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  r = 28,
) {
  c.save();
  c.fillStyle = fill;
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
  c.stroke();
  c.restore();
}

function crown(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#FFD43B';
  c.strokeStyle = OUT;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(-50, 30);
  c.lineTo(-50, -10);
  c.lineTo(-25, 12);
  c.lineTo(0, -30);
  c.lineTo(25, 12);
  c.lineTo(50, -10);
  c.lineTo(50, 30);
  c.closePath();
  c.fill();
  c.stroke();
  for (const [px, col] of [
    [-25, '#FF5C5C'],
    [0, '#22D3EE'],
    [25, '#40C057'],
  ] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(px, 18, 7, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ 1. promotion staircase hook
const TITLES = [
  'INTERN',
  'JUNIOR DEV',
  'DEVELOPER',
  'SENIOR DEV',
  'TEAM LEAD',
  'TECH LEAD',
  'ENG MANAGER',
  'DIRECTOR',
  'CTO 👑',
];
const S1 = 2.6;
function sceneStairs(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#1B1636', '#7C3AED');
  // Steps rise from bottom-left to top-right.
  const step = (i: number) => ({ x: 70 + i * 104, y: 1560 - i * 118 });
  TITLES.forEach((title, i) => {
    const { x, y } = step(i);
    const top = i === TITLES.length - 1;
    panel(c, x, y, 150, 1920 - y, top ? '#FFD43B' : i % 2 ? '#3A2F6B' : '#4B3C8A', 16);
    c.save();
    c.translate(x + 75, y - 26);
    c.rotate(-0.35);
    txt(c, title, 0, 0, 22, top ? '#FFD43B' : '#FFFFFF', { font: PIXEL, stroke: 7, maxW: 300 });
    c.restore();
  });
  // Hero hops up one step every 0.24 s.
  const pos = clamp((t - 0.25) / 0.24, 0, TITLES.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const a = step(i);
  const b = step(Math.min(TITLES.length - 1, i + 1));
  const hx = lerp(a.x, b.x, easeOut(f)) + 75;
  const hy = lerp(a.y, b.y, easeOut(f)) - Math.sin(f * Math.PI) * 90;
  const skins: SkinId[] = [
    'none',
    'lanyard',
    'lanyard',
    'shades',
    'cap',
    'goldPhones',
    'goldPhones',
    'lanyard',
    'goldPhones',
  ];
  const done = pos >= TITLES.length - 1;
  hero(
    c,
    done ? (Math.floor(t * 6) % 2 ? 'win0' : 'win1') : f > 0.05 && f < 0.95 ? 'jump' : 'idle0',
    hx,
    hy,
    2,
    { skin: skins[i] },
  );
  if (done) {
    crown(c, hx, hy - 210 - Math.sin(t * 6) * 6, 1.1);
    confetti(c, t, 0.25 + (TITLES.length - 1) * 0.24, 50, 31);
  }
  caption(
    c,
    t,
    0.05,
    S1,
    260,
    [
      ['8 LEVELS. 8 BOSSES.', '#FFFFFF'],
      ['1 KURSI 👑', '#FFD43B'],
    ],
    96,
  );
}

// ------------------------------------------------------------------ 2. VS boss rush
const BOSSES: {
  tex: string;
  frame: number;
  name: string;
  line: string;
  bg: [string, string];
  scale: number;
}[] = [
  { tex: 'monkey', frame: 0, name: 'BANDAR', line: 'OOK OOK! 🐒', bg: ['#C2255C', '#FFD8A8'], scale: 6.5 },
  {
    tex: 'manager',
    frame: 1,
    name: 'MANAGER',
    line: 'Ek quick call? 📞',
    bg: ['#5C1A1A', '#FF8787'],
    scale: 4.2,
  },
  {
    tex: 'aunty',
    frame: 1,
    name: 'CANTEEN AUNTY',
    line: 'Aur roti loge? 🫓',
    bg: ['#8B5A2B', '#FFD8A8'],
    scale: 4.2,
  },
  {
    tex: 'prodBug',
    frame: 0,
    name: 'PROD BUG',
    line: 'PROD DOWN! 🔥',
    bg: ['#2A0B12', '#FF2D55'],
    scale: 4.4,
  },
  {
    tex: 'client',
    frame: 0,
    name: 'CLIENT',
    line: 'Bas ek chhota change! 🙏',
    bg: ['#16213E', '#5C7CFA'],
    scale: 4.2,
  },
  { tex: 'hr', frame: 1, name: 'HR', line: 'Fun activity time! 🎉', bg: ['#F76707', '#FFD8A8'], scale: 4.2 },
  {
    tex: 'committee',
    frame: 1,
    name: 'COMMITTEE',
    line: 'Rating: 2/5 📉',
    bg: ['#3A2412', '#FAB005'],
    scale: 4.2,
  },
];
const RUSH0 = S1;
const RUSH_EACH = 0.68;
const RUSH1 = RUSH0 + BOSSES.length * RUSH_EACH;
function sceneRush(c: CanvasRenderingContext2D, t: number) {
  const i = Math.min(BOSSES.length - 1, Math.floor((t - RUSH0) / RUSH_EACH));
  const b = BOSSES[i];
  const lt = t - RUSH0 - i * RUSH_EACH;
  bgGradient(c, b.bg[0], b.bg[1]);
  // Diagonal VS split.
  c.save();
  c.fillStyle = 'rgba(20,18,31,0.55)';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(W * 0.55, 0);
  c.lineTo(W * 0.35, H);
  c.lineTo(0, H);
  c.closePath();
  c.fill();
  c.restore();
  // Boss slams in from the right, hero from the left.
  const kIn = backOut(lt / 0.22);
  const shake = lt < 0.15 ? Math.sin(lt * 120) * 14 : 0;
  sprite(c, b.tex, b.frame, lerp(W + 400, W * 0.66, kIn) + shake, 1360, b.scale, { ay: 1 });
  hero(c, 'jump', lerp(-300, 230, kIn), 1420 - Math.abs(Math.sin(lt * 10)) * 30, 3.2, { skin: 'goldPhones' });
  const vk = backOut((lt - 0.08) / 0.2);
  c.save();
  c.translate(W * 0.47, 980);
  c.scale(vk, vk);
  c.rotate(-0.1);
  txt(c, 'VS', 0, 0, 150, '#FFD43B', { font: PIXEL, stroke: 26, shadow: '#C92A2A' });
  c.restore();
  panel(c, 80, 1500, W - 160, 230, 'rgba(14,11,31,0.85)', 30);
  txt(c, b.name, W / 2, 1565, 50, '#FFD43B', { font: PIXEL, stroke: 10, maxW: W - 220 });
  txt(c, b.line, W / 2, 1660, 58, '#FFFFFF', { weight: '800', stroke: 12, maxW: W - 220 });
  // Little counter: boss i of 7.
  txt(c, `BOSS ${i + 1}/7`, W / 2, 1810, 30, '#FFFFFF', { font: PIXEL, stroke: 8 });
  if (lt < 0.07) {
    c.fillStyle = `rgba(255,255,255,${0.8 * (1 - lt / 0.07)})`;
    c.fillRect(0, 0, W, H);
  }
  caption(
    c,
    t,
    RUSH0,
    RUSH1,
    260,
    [
      ['Saare purane boss', '#FFFFFF'],
      ['WAPAS AA GAYE! 😱', '#FF8787'],
    ],
    88,
  );
}

// ------------------------------------------------------------------ 3. CEO jumpscare
const SCARE0 = RUSH1;
const SCARE1 = SCARE0 + 2.0;
function sceneScare(c: CanvasRenderingContext2D, t: number) {
  const dt = t - SCARE0;
  if (dt < 0.15) {
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
  const d = dt - 0.15;
  const shake = d < 0.8 ? 30 * (1 - d / 0.8) : 0;
  const k = d < 0.25 ? lerp(0.3, 8, backOut(d / 0.25)) : 8 + Math.sin(d * 3) * 0.12;
  sprite(c, 'ceo', 1, W / 2 + Math.sin(d * 80) * shake, H / 2 + 620 + Math.cos(d * 70) * shake, k * 0.95, {
    ay: 1,
  });
  if (d < 0.12) {
    c.fillStyle = `rgba(255,255,255,${1 - d / 0.12})`;
    c.fillRect(0, 0, W, H);
  }
  c.save();
  c.translate(W / 2 + Math.sin(d * 60) * 8, 300);
  txt(c, 'RESIGN YA', 0, 0, 86, '#FFFFFF', { font: PIXEL, stroke: 20, shadow: '#C92A2A' });
  txt(c, 'CTO?!!', 0, 120, 130, '#FFD43B', { font: PIXEL, stroke: 26, shadow: '#C92A2A' });
  c.restore();
  caption(c, t, SCARE0 + 0.8, SCARE1, 1560, [['FINAL BOSS: THE CEO 👑', '#FFFFFF']], 76);
}

// ------------------------------------------------------------------ 4. CEO fight
const FIGHT0 = SCARE1;
const FIGHT1 = FIGHT0 + 3.8;
const HITS3 = [FIGHT0 + 1.0, FIGHT0 + 2.0, FIGHT0 + 3.0];
function sceneFight(c: CanvasRenderingContext2D, t: number) {
  const dt = t - FIGHT0;
  bgGradient(c, '#05050A', '#16161F');
  // Night city through the window.
  const r = seeded(808);
  for (let i = 0; i < 14; i++) {
    const bh = 220 + r() * 600;
    const bx = i * 80;
    c.fillStyle = '#1E2547';
    c.fillRect(bx, 1250 - bh, 70, bh);
    c.fillStyle = '#FFE8A3';
    for (let y = 1270 - bh; y < 1230; y += 30) if (r() > 0.5) c.fillRect(bx + 14, y, 14, 14);
  }
  // Table + CEO + vision deck.
  const hp = 3 - HITS3.filter((h) => t >= h).length;
  sprite(c, 'ceo', Math.floor(t * 3) % 2, W * 0.62, 1260, 3.4, { ay: 1 });
  panel(c, 300, 1250, 700, 40, '#5C3A1E', 10);
  const deckPulse = 1 + Math.sin(t * 8) * 0.05;
  if (hp > 0) sprite(c, 'visionDeck', 0, W * 0.62, 1254, 3 * deckPulse, { ay: 1 });
  panel(c, 0, 1500, W, 420, '#1B1636', 0);
  c.fillStyle = '#FFD43B';
  c.fillRect(0, 1500, W, 8);
  // Old-boss projectiles raining in arcs.
  const proj = [
    'banana',
    'roti',
    'errorCode',
    'changeReq',
    'ratingStar',
    'iceCard',
    'calendar',
    'kpiSheet',
    'chilli',
  ];
  for (let k = 0; k < 14; k++) {
    const start = (k * 0.27) % 3.6;
    const u = (dt - start) / 1.1;
    if (u < 0 || u > 1) continue;
    const sx = W * 0.62;
    const ex = 120 + ((k * 197) % 700);
    const x = lerp(sx, ex, u);
    const y = lerp(1100, 1500, u) - 4 * 500 * u * (1 - u);
    sprite(c, proj[k % proj.length], 0, x, y, 2.6, { ay: 0.5, rot: u * 8 });
  }
  // Hero bounces onto the deck for each hit.
  let hx = 260;
  let hy = 1500;
  for (const h of HITS3) {
    const u = (t - (h - 0.55)) / 0.55;
    if (u >= 0 && u <= 1) {
      hx = lerp(260, W * 0.62, easeOut(u));
      hy = lerp(1500, 1210, u) - 4 * 300 * u * (1 - u);
    }
    const back = (t - h) / 0.4;
    if (back >= 0 && back <= 1) {
      hx = lerp(W * 0.62, 260, easeOut(back));
      hy = 1210 - 4 * 260 * back * (1 - back) + back * 290;
    }
  }
  hero(c, hy < 1490 ? 'jump' : `run${Math.floor(t * 14) % 6}`, hx, hy, 2.6, { skin: 'goldPhones' });
  for (const h of HITS3) {
    burst(c, t, h, W * 0.62, 1200, '#FFD43B', 26, 800, Math.floor(h * 10));
    popup(c, t, h, W * 0.62, 1050, 'VISION LOCKED! +300', '#FFD43B', 36);
  }
  // Boss HP pills.
  txt(c, 'CEO', W / 2, 560, 40, '#FF8787', { font: PIXEL, stroke: 10 });
  for (let i = 0; i < 3; i++)
    panel(c, W / 2 - 170 + i * 120, 600, 100, 34, i < hp ? '#FF5C5C' : '#3A3166', 12);
  if (hp === 0) {
    const k = clamp((t - HITS3[2]) / 0.6);
    c.save();
    c.globalAlpha = k;
    txt(c, 'Welcome aboard, CTO! 👑', W / 2, 760, 60, '#FFFFFF', { weight: '800', stroke: 14 });
    c.restore();
  }
  caption(
    c,
    t,
    FIGHT0,
    FIGHT0 + 1.9,
    300,
    [
      ['Har boss ka attack', '#FFFFFF'],
      ['EK SAATH! 🤯', '#FF8787'],
    ],
    88,
  );
  caption(
    c,
    t,
    FIGHT0 + 1.9,
    FIGHT1,
    300,
    [
      ['Vision 2030 pe', '#FFFFFF'],
      ['STOMP! 💥', '#FFD43B'],
    ],
    88,
  );
}

// ------------------------------------------------------------------ 5. the choice
const CHOICE0 = FIGHT1;
const CHOICE1 = CHOICE0 + 3.4;
function sceneChoice(c: CanvasRenderingContext2D, t: number) {
  const dt = t - CHOICE0;
  bgGradient(c, '#0E0B1F', '#251E47');
  for (const x of [270, 810]) {
    const g = c.createRadialGradient(x, 1300, 20, x, 1300, 420);
    g.addColorStop(0, 'rgba(255,236,170,0.55)');
    g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g;
    c.fillRect(x - 450, 700, 900, 900);
  }
  panel(c, 0, 1480, W, 440, '#2B2250', 0);
  c.fillStyle = '#FFD43B';
  c.fillRect(0, 1480, W, 8);
  sprite(c, 'resignDoor', 0, 270, 1480, 3.2, { ay: 1 });
  sprite(c, 'ctoChair', 0, 810, 1480, 3.2, { ay: 1 });
  txt(c, 'RESIGN?', 270, 1000, 44, '#FF8787', { font: PIXEL, stroke: 12 });
  txt(c, 'CTO? 👑', 810, 1000, 44, '#FFD43B', { font: PIXEL, stroke: 12 });
  // Walk to the door, bounce back, walk to the chair, sit, crown.
  let hx: number;
  let hy = 1480;
  let frame = `run${Math.floor(t * 14) % 6}`;
  let flip = false;
  const bounceAt = 0.9;
  if (dt < bounceAt) hx = lerp(540, 300, dt / bounceAt);
  else if (dt < bounceAt + 0.5) {
    const u = (dt - bounceAt) / 0.5;
    hx = lerp(300, 470, u);
    hy = 1480 - 4 * 160 * u * (1 - u);
    frame = 'hurt';
  } else if (dt < 2.3) {
    hx = lerp(470, 810, (dt - bounceAt - 0.5) / (2.3 - bounceAt - 0.5));
  } else {
    hx = 810;
    hy = 1330;
    frame = Math.floor(t * 6) % 2 ? 'win0' : 'win1';
  }
  if (dt < bounceAt) flip = true;
  hero(c, frame, hx, hy, 3, { skin: 'goldPhones', flip });
  popup(c, t, CHOICE0 + bounceAt, 330, 1080, '90 din ka notice! 😅', '#FFD43B', 34);
  if (dt >= 2.3) {
    const k = backOut((dt - 2.3) / 0.35);
    crown(c, 810, 1330 - 300 - Math.sin(t * 5) * 8, 1.3 * k);
    confetti(c, t, CHOICE0 + 2.3, 90, 41);
  }
  caption(
    c,
    t,
    CHOICE0,
    CHOICE0 + 2.3,
    300,
    [
      ['Aakhri sawaal:', '#FFFFFF'],
      ['RESIGN ya CTO? 🤔', '#FFD43B'],
    ],
    92,
  );
  caption(c, t, CHOICE0 + 2.3, CHOICE1, 300, [['CTO BAN GAYE! 👑', '#FFD43B']], 104);
}

// ------------------------------------------------------------------ 6. CTA
const CTA0 = CHOICE1;
function sceneCta(c: CanvasRenderingContext2D, t: number) {
  const dt = t - CTA0;
  bgGradient(c, '#0E0B1F', '#2A1F5C');
  c.save();
  c.translate(W / 2, 900);
  c.rotate(t * 0.3);
  c.fillStyle = 'rgba(255,212,59,0.12)';
  for (let i = 0; i < 14; i++) {
    c.rotate((Math.PI * 2) / 14);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-80, -1400);
    c.lineTo(80, -1400);
    c.fill();
  }
  c.restore();
  confetti(c, t, CTA0, 70, 12);
  const k = backOut(dt / 0.4);
  c.save();
  c.translate(W / 2, 360);
  c.scale(k, k);
  txt(c, 'SUPER CIPHER', 0, 0, 92, '#FFD43B', { font: PIXEL, stroke: 22, shadow: '#F06595', maxW: W - 40 });
  txt(c, 'OFFICE RUN', 0, 130, 64, '#FFFFFF', { font: PIXEL, stroke: 16 });
  c.restore();
  // Mini career map: 8 level icons lighting up.
  const icons = ['🚇', '🏢', '🍛', '🌙', '🤝', '🏝️', '📈', '👑'];
  icons.forEach((ico, i) => {
    const lit = dt > 0.2 + i * 0.12;
    const x = 120 + i * 120;
    panel(c, x - 50, 640, 100, 100, lit ? (i === 7 ? '#FFD43B' : '#3A2F6B') : '#1B1636', 20);
    c.save();
    c.globalAlpha = lit ? 1 : 0.3;
    txt(c, ico, x, 692, 52, '#000', { font: 'sans-serif' });
    c.restore();
  });
  hero(c, Math.floor(t * 6) % 2 ? 'win0' : 'win1', W / 2, 1260, 3.4, { skin: 'goldPhones' });
  crown(c, W / 2, 900 - Math.sin(t * 5) * 8, 0.9);
  if (dt > 0.3)
    txt(c, 'SAARE 8 LEVELS LIVE 🔥', W / 2, 1360, 60, '#22D3EE', { weight: '800', stroke: 14, maxW: W - 60 });
  if (dt > 0.6) {
    const b = 1 + Math.abs(Math.sin(t * 5)) * 0.06;
    c.save();
    c.translate(W / 2, 1510);
    c.scale(b, b);
    panel(c, -400, -85, 800, 170, '#FFD43B', 85);
    txt(c, '🔗 LINK IN BIO 👆', 0, 4, 66, OUT, { weight: '800' });
    c.restore();
  }
  if (dt > 0.9)
    txt(c, 'FREE · NO DOWNLOAD 📱', W / 2, 1680, 50, '#FFFFFF', { font: PIXEL, stroke: 12, maxW: W - 60 });
  txt(c, '@cipherboy.dev', W / 2, 1800, 54, '#F06595', { font: PIXEL, stroke: 12 });
}

// ------------------------------------------------------------------ timeline
const CUTS = [0, S1, ...BOSSES.map((_, i) => RUSH0 + i * RUSH_EACH), SCARE0, FIGHT0, CHOICE0, CTA0];
export function drawFrame(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.clearRect(0, 0, W, H);
  const last = Math.max(...CUTS.filter((x) => x <= t));
  const z = 1 + 0.06 * (1 - easeOut((t - last) / 0.25));
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);
  if (t < S1) sceneStairs(c, t);
  else if (t < RUSH1) sceneRush(c, t);
  else if (t < SCARE1) sceneScare(c, t);
  else if (t < FIGHT1) sceneFight(c, t);
  else if (t < CHOICE1) sceneChoice(c, t);
  else sceneCta(c, t);
  c.restore();
  const flash = t - last;
  if (last > 0 && last !== SCARE0 && flash < 0.08) {
    c.fillStyle = `rgba(255,255,255,${0.6 * (1 - flash / 0.08)})`;
    c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ soundtrack
const pitched = (spec: SoundSpec, k: number): SoundSpec => ({
  voices: spec.voices.map((v) => ({
    ...v,
    notes: v.notes.map((n) => ({ ...n, f: n.f * k, f1: n.f1 !== undefined ? n.f1 * k : undefined })),
  })),
});

export function renderAudio(sr = 44100): Float32Array {
  const out = new Float32Array(Math.ceil(DURATION * sr));
  const add = (spec: SoundSpec, at: number, gain = 1, until = DURATION) => {
    const s = render(spec, sr);
    const o = Math.floor(at * sr);
    const end = Math.min(out.length, Math.floor(until * sr));
    for (let i = 0; i < s.length && o + i < end; i++) out[o + i] += s[i] * gain;
  };
  const S = SOUNDS;
  // Staircase: a rising blip per promotion.
  for (let i = 0; i < 9; i++) add(pitched(S.jump, 1 + i * 0.09), 0.25 + i * 0.24, 0.8);
  add(S.victory, 0.25 + 8 * 0.24, 0.9);
  // Dhol under the boss rush + fight.
  add(musicSpec('commute'), 2.4, 0.7, SCARE0 - 0.05);
  add(musicSpec('commute'), FIGHT0, 0.7, CHOICE0 + 2.2);
  add(musicSpec('office'), CTA0, 0.7, DURATION);
  const voices = [S.ook, S.manager, S.coworker, S.bossHit, S.manager, S.coworker, S.manager];
  BOSSES.forEach((_, i) => {
    add(S.thud, RUSH0 + i * RUSH_EACH, 0.9);
    add(voices[i], RUSH0 + i * RUSH_EACH + 0.12, 0.8);
  });
  add(S.jumpscare, SCARE0 + 0.15, 1.5);
  add(S.manager, SCARE0 + 0.9, 1);
  for (let k = 0; k < 10; k++) add(S.pop, FIGHT0 + k * 0.36, 0.5);
  for (const h of HITS3) {
    add(S.jump, h - 0.55, 0.8);
    add(S.bossHit, h, 1.1);
  }
  add(S.monkeyGone, HITS3[2] + 0.1, 0.8);
  add(S.bump, CHOICE0 + 0.9, 1);
  add(S.hurt, CHOICE0 + 0.92, 0.6);
  add(S.unlock, CHOICE0 + 2.3, 1);
  add(S.victory, CHOICE0 + 2.4, 1);
  add(S.laugh, CHOICE0 + 2.4 - 0.9, 0.6);
  add(S.click, CTA0 + 0.6, 0.8);
  for (let i = 0; i < out.length; i++) {
    const fade = Math.min(1, (out.length - i) / (0.5 * sr));
    out[i] = Math.tanh(out[i] * 0.9) * 0.86 * fade;
  }
  return out;
}

export { wavBase64 } from './reel';
