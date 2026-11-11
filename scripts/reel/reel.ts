/**
 * 20-second Instagram reel (1080x1920, 30 fps) built from the game's own art and sounds.
 * Every frame is a pure function of time, so frames can be captured in any order.
 * Open scripts/reel/reel.html on the dev server for a live preview; scripts/reel/render.mjs exports the MP4.
 */
import { registerSprites } from '../../src/gfx/sprites';
import { paintBackdrop, paintGround } from '../../src/gfx/world';
import { seeded } from '../../src/gfx/draw';
import { SOUNDS, musicSpec, render, type SoundSpec } from '../../src/audio/synth';
import type { MapObject } from '../../src/level/map';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 20;

export const PIXEL = '"Press Start 2P", monospace';
export const BODY = '"Baloo 2", sans-serif';
export const OUT = '#14121F';

// ------------------------------------------------------------------ sprite access
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string | number;
}
const sprites = new Map<string, { canvas: HTMLCanvasElement; frames: Frame[] }>();
/** Texture host that keeps generated sprite canvases for drawing straight onto the reel canvas. */
export const host: Parameters<typeof registerSprites>[0] = {
  exists: (k) => sprites.has(k),
  addCanvas: (k, canvas) => {
    const e = { canvas, frames: [] as Frame[] };
    sprites.set(k, e);
    return {
      add: (name: string | number, _s: number, x: number, y: number, w: number, h: number) =>
        e.frames.push({ x, y, w, h, name }),
    };
  },
};
registerSprites(host);

export function sprite(
  c: CanvasRenderingContext2D,
  key: string,
  frame: string | number,
  x: number,
  y: number,
  scale: number,
  o: { flip?: boolean; rot?: number; alpha?: number; ax?: number; ay?: number; sy?: number } = {},
): void {
  const e = sprites.get(key);
  if (!e) return;
  const f = e.frames.find((fr) => fr.name === frame) ?? {
    x: 0,
    y: 0,
    w: e.canvas.width,
    h: e.canvas.height,
    name: 0,
  };
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.scale((o.flip ? -1 : 1) * scale, scale * (o.sy ?? 1));
  c.drawImage(e.canvas, f.x, f.y, f.w, f.h, -f.w * (o.ax ?? 0.5), -f.h * (o.ay ?? 1), f.w, f.h);
  c.restore();
}

/** Player sprite with feet at (x, y). */
export const hero = (
  c: CanvasRenderingContext2D,
  id: 'boy' | 'girl',
  frame: string,
  x: number,
  y: number,
  s: number,
  flip = false,
) => sprite(c, `player-${id}`, frame, x, y, s * 0.5, { ay: 160 / 164, flip });

// ------------------------------------------------------------------ worlds (pre-rendered strips)
const obj = (type: string, x: number, y: number, w: number, h: number): MapObject => ({
  id: 0,
  type,
  x,
  y,
  w,
  h,
  point: false,
  props: {},
});

export interface Strip {
  canvas: HTMLCanvasElement;
  x0: number;
}

function strip(
  x0: number,
  x1: number,
  zones: { key: string; a: number; b: number; top: string; bottom: string }[],
  grounds: [string, number, number, number, number][],
  decor: MapObject[],
  extra?: (c: CanvasRenderingContext2D) => void,
): Strip {
  const canvas = document.createElement('canvas');
  canvas.width = x1 - x0;
  canvas.height = 540;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.translate(-x0, 0);
  for (const z of zones) {
    const g = c.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, z.top);
    g.addColorStop(1, z.bottom);
    c.fillStyle = g;
    c.fillRect(z.a, 0, z.b - z.a, 540);
    const bd = paintBackdrop({ key: z.key, x0: z.a, w: z.b - z.a, decor });
    if (bd) c.drawImage(bd, z.a, 0);
  }
  grounds.forEach(([tex, x, y, w, h], i) => c.drawImage(paintGround(tex, w, h, i + 1), x, y));
  extra?.(c);
  return { canvas, x0 };
}

let worlds: Record<'lane' | 'roof' | 'office' | 'server', Strip> | null = null;
export function getWorlds(): Record<'lane' | 'roof' | 'office' | 'server', Strip> {
  if (!worlds) buildWorlds();
  return worlds as Record<'lane' | 'roof' | 'office' | 'server', Strip>;
}

function buildWorlds() {
  const lane = strip(
    1150,
    3500,
    [
      { key: 'z1_2', a: 1150, b: 2300, top: '#4DABF7', bottom: '#D0EBFF' },
      { key: 'z1_3', a: 2300, b: 3500, top: '#228BE6', bottom: '#A5D8FF' },
    ],
    [
      ['grass', 1150, 460, 1150, 80],
      ['asphalt', 2300, 460, 1200, 80],
    ],
    [obj('poles', 1240, 240, 816, 220)],
    (c) => {
      const cl: [number, number, string][] = [
        [1280, 340, 'shirt'],
        [1420, 300, 'dress'],
        [1560, 340, 'shirt'],
        [1700, 300, 'dress'],
        [1840, 340, 'shirt'],
        [1980, 300, 'dress'],
      ];
      for (const [x, y, k] of cl) sprite(c, `cloth-${k}`, 0, x, y + 4, 1, { ax: 0, ay: 0 });
      sprite(c, 'cow', 0, 3030, 382 - 4, 1, { ax: 0, ay: 0 });
    },
  );
  const roof = strip(
    5000,
    6300,
    [{ key: 'z1_5', a: 5000, b: 6300, top: '#E64980', bottom: '#FFD8A8' }],
    [
      ['roof', 5000, 400, 300, 140],
      ['roof', 5410, 340, 260, 200],
      ['roof', 5780, 380, 520, 160],
    ],
    [],
  );
  const office = strip(
    2100,
    3300,
    [{ key: 'z2_3', a: 2100, b: 3300, top: '#A5D8FF', bottom: '#E7F5FF' }],
    [['carpet', 2100, 460, 1200, 80]],
    [],
    (c) => {
      for (const dx of [2200, 2500, 2850]) {
        c.fillStyle = '#495057';
        c.fillRect(dx + 8, 406, 8, 54);
        c.fillRect(dx + 124, 406, 8, 54);
        c.fillStyle = '#C98A4B';
        c.fillRect(dx, 390, 140, 16);
        c.strokeStyle = OUT;
        c.lineWidth = 3;
        c.strokeRect(dx, 390, 140, 16);
        sprite(c, 'monitor', 0, dx + 70, 390, 1);
      }
      sprite(c, 'printer', 0, 3245, 460, 1);
    },
  );
  const server = strip(
    4800,
    6000,
    [{ key: 'z2_5', a: 4800, b: 6000, top: '#0B0D17', bottom: '#1A1F2E' }],
    [
      ['server', 4800, 460, 300, 80],
      ['server', 5300, 460, 700, 80],
    ],
    [obj('racks', 4800, 140, 1200, 320)],
  );
  worlds = { lane, roof, office, server };
}

// ------------------------------------------------------------------ helpers
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
export const backOut = (k: number) => {
  const x = clamp(k);
  const s = 2.2;
  return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
/** Parabolic jump height in [0,1] → [0,h]. */
export const arc = (t: number, t0: number, dur: number, h: number) => {
  const u = (t - t0) / dur;
  return u > 0 && u < 1 ? 4 * h * u * (1 - u) : 0;
};

export function txt(
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  o: {
    font?: string;
    weight?: string;
    stroke?: number;
    align?: CanvasTextAlign;
    shadow?: string;
    maxW?: number;
  } = {},
): void {
  c.save();
  c.font = `${o.weight ?? ''} ${size}px ${o.font ?? BODY}`;
  c.textAlign = o.align ?? 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  if (o.shadow) {
    c.fillStyle = o.shadow;
    c.fillText(s, x + size * 0.08, y + size * 0.08, o.maxW);
  }
  if (o.stroke) {
    c.lineWidth = o.stroke;
    c.strokeStyle = OUT;
    c.strokeText(s, x, y, o.maxW);
  }
  c.fillStyle = fill;
  c.fillText(s, x, y, o.maxW);
  c.restore();
}

/** Big punchy caption: pops in with overshoot. Lines are [text, color]. */
export function caption(
  c: CanvasRenderingContext2D,
  t: number,
  t0: number,
  t1: number,
  y: number,
  lines: [string, string][],
  size = 92,
) {
  if (t < t0 || t > t1) return;
  const k = backOut((t - t0) / 0.28);
  const out = clamp((t1 - t) / 0.15);
  c.save();
  c.globalAlpha = out;
  c.translate(W / 2, y);
  c.scale(k, k);
  c.rotate(-0.025);
  lines.forEach(([s, col], i) =>
    txt(c, s, 0, i * size * 1.08, size, col, { weight: '800', stroke: size * 0.22, maxW: W - 80 }),
  );
  c.restore();
}

/** Particle burst computed analytically from its start time (deterministic). */
export function burst(
  c: CanvasRenderingContext2D,
  t: number,
  te: number,
  x: number,
  y: number,
  color: string,
  n = 16,
  speed = 520,
  seed = 1,
) {
  const dt = t - te;
  if (dt < 0 || dt > 0.8) return;
  const r = seeded(seed);
  c.save();
  c.fillStyle = color;
  c.globalAlpha = 1 - dt / 0.8;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const v = speed * (0.4 + r() * 0.8);
    const px = x + Math.cos(a) * v * dt;
    const py = y + Math.sin(a) * v * dt + 900 * dt * dt;
    c.fillRect(px - 6, py - 6, 12, 12);
  }
  c.restore();
}

export function popup(
  c: CanvasRenderingContext2D,
  t: number,
  te: number,
  x: number,
  y: number,
  s: string,
  color: string,
  size = 34,
) {
  const dt = t - te;
  if (dt < 0 || dt > 1) return;
  c.save();
  c.globalAlpha = dt > 0.6 ? 1 - (dt - 0.6) / 0.4 : 1;
  txt(c, s, x, y - dt * 90, size, color, { font: PIXEL, stroke: 10 });
  c.restore();
}

export function confetti(c: CanvasRenderingContext2D, t: number, t0: number, n = 90, seed = 4) {
  if (t < t0) return;
  const r = seeded(seed);
  const cols = ['#FFD43B', '#F06595', '#22D3EE', '#40C057', '#FF5C5C', '#7C3AED'];
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const sp = 380 + r() * 420;
    const start = r() * 1.2;
    const y = -40 + (t - t0 - start) * sp;
    if (y < -40 || y > H) continue;
    c.save();
    c.translate(x + Math.sin((t + i) * 3) * 30, y);
    c.rotate((t * (2 + r() * 4) + i) % (Math.PI * 2));
    c.fillStyle = cols[i % cols.length];
    c.fillRect(-12, -6, 24, 12);
    c.restore();
  }
}

export function bgGradient(c: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = c.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Mini game HUD drawn inside the gameplay window. */
export function miniHud(
  c: CanvasRenderingContext2D,
  y: number,
  coins: number,
  score: number,
  right: string,
  rightColor = '#BDB5E0',
  id: 'boy' | 'girl' = 'boy',
) {
  c.save();
  const g = c.createLinearGradient(0, y, 0, y + 120);
  g.addColorStop(0, 'rgba(14,11,31,0.85)');
  g.addColorStop(1, 'rgba(14,11,31,0)');
  c.fillStyle = g;
  c.fillRect(0, y, W, 120);
  c.beginPath();
  c.arc(60, y + 52, 38, 0, Math.PI * 2);
  c.fillStyle = '#1B1636';
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = '#FFD43B';
  c.stroke();
  sprite(c, `head-${id}`, 0, 60, y + 52, 1.05, { ay: 0.5 });
  for (let i = 0; i < 3; i++) sprite(c, 'heart', 0, 130 + i * 44, y + 52, 1.7, { ay: 0.5 });
  sprite(c, 'coin', 0, 620, y + 40, 1.5, { ay: 0.5 });
  txt(c, `x${coins}`, 650, y + 42, 28, '#FFFFFF', { font: PIXEL, stroke: 8, align: 'left' });
  txt(c, String(score).padStart(6, '0'), W - 30, y + 42, 28, '#FFFFFF', {
    font: PIXEL,
    stroke: 8,
    align: 'right',
  });
  txt(c, right, W - 30, y + 86, 24, rightColor, { font: PIXEL, stroke: 7, align: 'right' });
  c.restore();
}

/** Draw a world strip into the gameplay window. */
export function drawWorld(c: CanvasRenderingContext2D, s: Strip, camX: number, scale: number, top: number) {
  const vw = W / scale;
  const sx = clamp(camX - s.x0, 0, s.canvas.width - vw);
  c.drawImage(s.canvas, sx, Y0, vw, 540 - Y0, 0, top, W, (540 - Y0) * scale);
  return s.x0 + sx;
}

// ------------------------------------------------------------------ scenes
export const WIN_TOP = 470;
export const WS = 2.6;
export const Y0 = 120;
export const WIN_H = (540 - Y0) * WS;
export const toScreen = (wx: number, wy: number, cam: number) =>
  [(wx - cam) * WS, WIN_TOP + (wy - Y0) * WS] as const;

export function windowFrame(c: CanvasRenderingContext2D) {
  c.save();
  c.strokeStyle = OUT;
  c.lineWidth = 12;
  c.strokeRect(-6, WIN_TOP, W + 12, WIN_H);
  c.fillStyle = '#FFD43B';
  c.fillRect(0, WIN_TOP - 10, W, 10);
  c.fillRect(0, WIN_TOP + WIN_H, W, 10);
  c.restore();
}

function sceneHook(c: CanvasRenderingContext2D, t: number) {
  // Dark bedroom, alarm clock ringing.
  bgGradient(c, '#1A1033', '#3B1A4F');
  const ring = Math.floor(t * 8) % 2 === 0;
  const shake = ring ? Math.sin(t * 90) * 10 : 0;
  c.save();
  c.translate(W / 2 + shake, 980);
  c.rotate(ring ? Math.sin(t * 70) * 0.05 : 0);
  // Clock body.
  c.fillStyle = '#FF5C5C';
  c.strokeStyle = OUT;
  c.lineWidth = 14;
  c.beginPath();
  c.roundRect(-380, -200, 760, 400, 60);
  c.fill();
  c.stroke();
  c.fillStyle = '#0B0D17';
  c.beginPath();
  c.roundRect(-330, -150, 660, 300, 30);
  c.fill();
  const min = t < 1.15 ? 12 : 13;
  txt(c, `9:${min}`, 0, 10, 190, ring ? '#FF5C5C' : '#FF8787', { font: PIXEL });
  txt(c, 'AM', 270, 110, 40, '#FF8787', { font: PIXEL });
  // Bells.
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(s * 300, -230, 70, Math.PI, 0);
    c.fillStyle = '#FFD43B';
    c.fill();
    c.stroke();
  }
  c.restore();
  if (ring) {
    txt(c, 'TRRRING!', W / 2 - 300, 680, 54, '#FFD43B', { font: PIXEL, stroke: 12 });
    txt(c, 'TRRRING!', W / 2 + 290, 1290, 54, '#FFD43B', { font: PIXEL, stroke: 12 });
  }
  caption(
    c,
    t,
    0.05,
    2.25,
    380,
    [
      ['POV:', '#FFD43B'],
      ['9:30 ki meeting hai', '#FFFFFF'],
    ],
    96,
  );
  caption(
    c,
    t,
    0.9,
    2.25,
    1500,
    [
      ['aur tum abhi', '#FFFFFF'],
      ['GHAR pe ho 💀', '#FF8787'],
    ],
    96,
  );
}

// Lane run choreography (world coords).
const LANE_T0 = 2.2;
const laneCam = (t: number) => 1180 + (t - LANE_T0) * 330;
const laneJumps: [number, number, number][] = [
  [2.75, 0.55, 120],
  [3.35, 0.4, 150],
  [4.95, 0.75, 230],
  [5.75, 0.45, 90],
];
const LANE_COINS = [1520, 1600, 1680, 1760, 2040, 2120, 2200, 2440, 2520, 2600, 2680];

function sceneLane(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#2A1F5C', '#7C3AED');
  const w = worlds!;
  const cam = laneCam(t);
  drawWorld(c, w.lane, cam, WS, WIN_TOP);
  const px = cam + 170;
  const jump = Math.max(...laneJumps.map(([a, d, h]) => arc(t, a, d, h)));
  const py = 460 - jump;
  // Coins.
  let coins = 0;
  for (const cx of LANE_COINS) {
    if (px > cx) {
      coins++;
      continue;
    }
    const [sx, sy] = toScreen(cx, 400, cam);
    if (sx > -50 && sx < W + 50)
      sprite(c, 'coin', 0, sx, sy, 1.9, { ay: 0.5, flip: Math.cos(t * 6 + cx) < 0 });
  }
  // Bug that gets stomped at 3.75.
  const bugX = laneCam(3.75) + 170;
  if (t < 3.75) {
    const [bx, by] = toScreen(bugX - 10, 460, cam);
    sprite(c, 'bug', Math.floor(t * 8) % 2, bx, by, WS);
  } else {
    const [bx, by] = toScreen(bugX, 460, cam);
    burst(c, t, 3.75, bx, by - 30, '#40C057', 20, 600, 7);
    popup(c, t, 3.75, bx, by - 140, 'BUG FIXED +100', '#69DB7C', 34);
  }
  // Dog chasing (falls behind after 3.6).
  const dogLag = t < 3.4 ? 95 + Math.sin(t * 6) * 10 : 95 + (t - 3.4) * 520;
  const [dx, dy] = toScreen(px - dogLag, 460, cam);
  if (dx > -120) {
    sprite(c, 'dog', Math.floor(t * 12) % 2, dx, dy - Math.abs(Math.sin(t * 14)) * 10, WS);
    if (t > 2.35 && t < 3.3 && Math.floor(t * 4) % 2 === 0)
      txt(c, 'BHOW!', dx, dy - 110, 38, '#FFD43B', { font: PIXEL, stroke: 10 });
  }
  // Auto-rickshaw parked + bus passing under the big jump.
  const busX = 2900 - (t - 4.75) * 980;
  if (t > 4.6) {
    const [bx, by] = toScreen(busX, 460, cam);
    sprite(c, 'bus', 0, bx, by + 16, WS, { ax: 0 });
  }
  // Hero.
  const air = jump > 1;
  const fr = air ? (t < 5.3 ? 'jump' : 'fall') : `run${Math.floor(t * 14) % 6}`;
  const [hx, hy] = toScreen(px + 15, py, cam);
  hero(c, 'boy', fr, hx, hy, WS);
  for (const [a, d] of laneJumps) burst(c, t, a + d, hx, hy - 5, '#FFFFFF', 8, 260, Math.floor(a * 10));
  // Coin sparkle on pickups.
  for (const cx of LANE_COINS) {
    const tc = LANE_T0 + (cx - 170 - 1180) / 330;
    popup(c, t, tc, ...(toScreen(cx, 380, cam) as [number, number]), '+10', '#FFD43B', 24);
  }
  windowFrame(c);
  miniHud(
    c,
    WIN_TOP + 10,
    coins,
    coins * 10 + (t > 3.75 ? 100 : 0),
    `TIME 0:${String(Math.floor(5 + (t - LANE_T0) * 3)).padStart(2, '0')}`,
  );
  caption(c, t, 2.25, 3.35, 300, [['Gali ke kutte 🐕', '#FFFFFF']]);
  caption(c, t, 3.4, 4.65, 300, [['Code ke BUGS 🐞', '#69DB7C']]);
  caption(c, t, 4.7, 6.5, 300, [['aur DTC BUS 🚌', '#FFD43B']]);
  if (t > 4.6 && t < 5.6 && Math.floor(t * 8) % 2 === 0) {
    c.fillStyle = '#FF5C5C';
    c.strokeStyle = OUT;
    c.lineWidth = 8;
    c.beginPath();
    c.roundRect(W - 470, WIN_TOP + 170, 430, 84, 16);
    c.fill();
    c.stroke();
    txt(c, 'BUS AA RAHI! ←', W - 255, WIN_TOP + 212, 30, '#FFFFFF', { font: PIXEL, stroke: 8 });
  }
  caption(
    c,
    t,
    5.0,
    6.5,
    1460,
    [
      ['Ek galti = ', '#FFFFFF'],
      ['RESIGNATION 😵', '#FF8787'],
    ],
    84,
  );
}

const ROOF_T0 = 6.5;
function sceneRoof(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#5C1A3A', '#E64980');
  const w = worlds!;
  const cam = 5770 + (t - ROOF_T0) * 12;
  drawWorld(c, w.roof, cam, WS, WIN_TOP);
  const hit = 7.85;
  // Monkey hopping on roof 3 (top 380).
  const mx = 6150;
  const mhop = t < hit ? Math.abs(Math.sin(t * 5)) * 60 : 0;
  const [mx2, my2] = toScreen(mx, 380 - mhop, cam);
  if (t < hit + 0.05 || t > hit + 0.12) {
    const spun = t > hit ? (t - hit) * 9 : 0;
    const fly = t > hit ? (t - hit) * 900 : 0;
    sprite(
      c,
      'monkey',
      Math.floor(t * 6) % 2,
      mx2 + fly * 0.6,
      my2 - fly * 0.4 + (t > hit ? 2000 * Math.pow(t - hit, 2) : 0),
      WS,
      { rot: spun },
    );
  }
  // Bananas thrown at the hero.
  for (const tb of [6.7, 7.15]) {
    const u = (t - tb) / 0.6;
    if (u > 0 && u < 1) {
      const bx = lerp(mx - 20, 5860, u);
      const by = lerp(320, 400, u) - 4 * 140 * u * (1 - u);
      const [sx, sy] = toScreen(bx, by, cam);
      sprite(c, 'banana', 0, sx, sy, WS * 1.2, { rot: t * 12, ay: 0.5 });
    }
  }
  // Hero: dodge-jump then the double jump stomp onto the monkey.
  const j1 = arc(t, 6.95, 0.5, 110);
  const stompU = clamp((t - 7.35) / 0.5);
  const hxWorld = t < 7.35 ? 5860 : lerp(5860, mx - 15, easeOut(stompU));
  const j2 = t >= 7.35 && t < hit ? 4 * 110 * stompU * (1 - stompU) + (380 - 380) : 0;
  const bounce = arc(t, hit, 0.6, 160);
  const hyWorld =
    380 - Math.max(j1, j2, bounce) - (t > 7.35 && t < hit ? (380 - 380 + 74) * easeOut(stompU) : 0);
  const [hx, hy] = toScreen(hxWorld, hyWorld, cam);
  hero(
    c,
    'boy',
    t < 6.95 ? `run${Math.floor(t * 14) % 6}` : t < hit ? 'jump' : bounce > 1 ? 'jump' : 'win0',
    hx,
    hy,
    WS,
  );
  if (t > 7.5 && t < 7.8) for (let i = 0; i < 6; i++) burst(c, t, 7.5, hx, hy, '#22D3EE', 10, 300, 3 + i);
  burst(c, t, hit, mx2, my2 - 60, '#FF5C5C', 22, 700, 11);
  popup(c, t, hit, mx2, my2 - 180, '+1000', '#FFD43B', 40);
  // ID card pops out.
  if (t > hit) {
    const u = clamp((t - hit) / 0.5);
    const [ix, iy] = toScreen(mx - 40, 380 - 4 * 120 * u * (1 - u) - 10, cam);
    sprite(c, 'idcard', 0, ix, iy, WS * 1.4);
  }
  windowFrame(c);
  miniHud(c, WIN_TOP + 10, 11, 1210 + (t > hit ? 1000 : 0), 'BANDAR', '#FF8787');
  const hp = t < hit ? 3 : 0;
  for (let i = 0; i < 3; i++) {
    c.fillStyle = i < hp ? '#FF5C5C' : '#3A3166';
    c.fillRect(W / 2 - 110 + i * 80, WIN_TOP + 150, 60, 20);
    c.strokeStyle = OUT;
    c.lineWidth = 5;
    c.strokeRect(W / 2 - 110 + i * 80, WIN_TOP + 150, 60, 20);
  }
  caption(
    c,
    t,
    6.5,
    7.5,
    300,
    [
      ['Bandar ne ID', '#FFFFFF'],
      ['CHURA LI! 🐒', '#FFD43B'],
    ],
    88,
  );
  caption(c, t, 7.5, 8.45, 300, [['BOSS FIGHT 🥊', '#FF8787']], 100);
  caption(c, t, 7.4, 8.45, 1460, [['Chai = DOUBLE JUMP!', '#22D3EE']], 70);
}

export function sceneScare(c: CanvasRenderingContext2D, t: number) {
  const t0 = 8.55;
  if (t < t0) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    return;
  }
  const dt = t - t0;
  const g = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.7);
  g.addColorStop(0, '#FF2D2D');
  g.addColorStop(1, '#2A0000');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const shake = dt < 0.8 ? 30 * (1 - dt / 0.8) : 0;
  const sx = Math.sin(dt * 80) * shake;
  const sy = Math.cos(dt * 70) * shake;
  const k = dt < 0.25 ? lerp(0.3, 8.2, backOut(dt / 0.25)) : 8.2 + Math.sin(dt * 3) * 0.15;
  sprite(c, 'manager', 1, W / 2 + sx, H / 2 + 560 + sy, k * 0.95, { ay: 1 });
  if (dt < 0.12) {
    c.fillStyle = `rgba(255,255,255,${1 - dt / 0.12})`;
    c.fillRect(0, 0, W, H);
  }
  c.save();
  c.translate(W / 2 + Math.sin(dt * 60) * 8, 330);
  txt(c, 'EK QUICK', 0, 0, 92, '#FFFFFF', { font: PIXEL, stroke: 20, shadow: '#C92A2A' });
  txt(c, 'CALL?!', 0, 120, 120, '#FFFFFF', { font: PIXEL, stroke: 24, shadow: '#C92A2A' });
  c.restore();
  caption(
    c,
    t,
    9.2,
    10.55,
    1460,
    [
      ['Manager se bach ', '#FFFFFF'],
      ['ke dikhao 😱', '#FFD43B'],
    ],
    84,
  );
}

function sceneOffice(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#0E2A47', '#1C5D99');
  const w = worlds!;
  const t0 = 10.55;
  const cam = 2200 + (t - t0) * 300;
  drawWorld(c, w.office, cam, WS, WIN_TOP);
  const px = cam + 160;
  const jump = arc(t, 11.1, 0.6, 140);
  const [hx, hy] = toScreen(px, 460 - jump, cam);
  // Coworker asking for help.
  const [cx, cy] = toScreen(2850, 460, cam);
  sprite(c, 'coworker', Math.floor(t * 2) % 2, cx, cy, WS, { flip: true });
  if (t > 11.45) {
    c.fillStyle = '#FFFFFF';
    c.strokeStyle = OUT;
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(cx - 260, cy - 250, 400, 90, 20);
    c.fill();
    c.stroke();
    txt(c, 'Bhai ek help? 2 min!', cx - 60, cy - 205, 34, OUT, { weight: '800' });
  }
  // Flying printouts.
  for (const tp of [10.6, 11.4]) {
    const px2 = 3220 - (t - tp) * 420;
    if (t > tp) {
      const [sx, sy] = toScreen(px2, 425 + Math.sin(t * 9) * 6, cam);
      sprite(c, 'paper', 0, sx, sy, WS, { ay: 0.5 });
    }
  }
  hero(c, 'girl', jump > 1 ? 'jump' : `run${Math.floor(t * 15) % 6}`, hx, hy, WS);
  windowFrame(c);
  miniHud(c, WIN_TOP + 10, 24, 4180, '9:24', '#BDB5E0', 'girl');
  caption(c, t, t0, 12.3, 300, [['LEVEL 2: OFFICE 🏢', '#FFD43B']], 92);
  caption(
    c,
    t,
    11.0,
    12.3,
    1460,
    [
      ['Coworkers. Printer.', '#FFFFFF'],
      ['Rolling chairs 🪑', '#22D3EE'],
    ],
    80,
  );
}

function sceneServer(c: CanvasRenderingContext2D, t: number) {
  c.fillStyle = '#05060C';
  c.fillRect(0, 0, W, H);
  const w = worlds!;
  const t0 = 12.3;
  const cam = 5250 + (t - t0) * 260;
  drawWorld(c, w.server, cam, WS, WIN_TOP);
  const px = cam + 230;
  const jump = arc(t, 13.2, 0.6, 130);
  const [hx, hy] = toScreen(px, 460 - jump, cam);
  // Darkness with a light around the hero.
  c.save();
  c.beginPath();
  c.rect(0, WIN_TOP, W, WIN_H);
  c.clip();
  const g = c.createRadialGradient(hx, hy - 60, 30, hx, hy - 60, 330);
  g.addColorStop(0, 'rgba(5,6,12,0)');
  g.addColorStop(0.6, 'rgba(5,6,12,0.55)');
  g.addColorStop(1, 'rgba(5,6,12,0.9)');
  c.fillStyle = g;
  c.fillRect(0, WIN_TOP, W, WIN_H);
  // LEDs.
  const r = seeded(5);
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = WIN_TOP + 260 + r() * 520;
    const on = (Math.floor(t * 8) + i) % 4 !== 0;
    c.fillStyle = i % 3 === 0 ? '#22D3EE' : '#40C057';
    c.globalAlpha = on ? 0.95 : 0.2;
    c.fillRect(x, y, 9, 9);
  }
  c.globalAlpha = 1;
  // Firewall lasers.
  for (const [lx, ph] of [
    [5560, 0],
    [5780, 0.5],
  ] as const) {
    const on = (t + ph) % 1 < 0.5;
    const [sx] = toScreen(lx, 0, cam);
    c.fillStyle = on ? 'rgba(255,45,85,0.55)' : 'rgba(255,45,85,0.12)';
    c.fillRect(sx - 14, WIN_TOP, 28, (460 - Y0) * WS);
    if (on) {
      c.fillStyle = '#FFFFFF';
      c.fillRect(sx - 3, WIN_TOP, 6, (460 - Y0) * WS);
    }
  }
  c.restore();
  hero(c, 'girl', jump > 1 ? 'jump' : `run${Math.floor(t * 15) % 6}`, hx, hy, WS);
  windowFrame(c);
  const red = Math.floor(t * 4) % 2 === 0;
  miniHud(c, WIN_TOP + 10, 31, 6950, '9:29', red ? '#FF5C5C' : '#FFFFFF', 'girl');
  caption(
    c,
    t,
    t0,
    14.5,
    280,
    [
      ['Andhera. Lasers.', '#FFFFFF'],
      ['Aur 9:29 ⏰', '#FF5C5C'],
    ],
    92,
  );
  caption(c, t, 13.0, 14.5, 1460, [['LATE MARK = −1 ❤️', '#FF8787']], 80);
}

function sceneResult(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#2A1F5C', '#7C3AED');
  const t0 = 14.5;
  confetti(c, t, t0 + 0.2, 60, 9);
  for (let i = 0; i < 3; i++) {
    const ts = t0 + 0.3 + i * 0.3;
    if (t < ts) continue;
    const k = backOut((t - ts) / 0.35);
    sprite(c, 'star', 0, W / 2 + (i - 1) * 270, 720 - (i === 1 ? 50 : 0), 5 * k, { ay: 0.5 });
  }
  txt(c, 'METRO PAKAD LI!', W / 2, 980, 62, '#FFD43B', { font: PIXEL, stroke: 16, maxW: W - 60 });
  const score = Math.floor(12450 * easeOut((t - t0 - 0.2) / 1.2));
  c.save();
  c.fillStyle = 'rgba(14,11,31,0.8)';
  c.strokeStyle = '#FFD43B';
  c.lineWidth = 8;
  c.beginPath();
  c.roundRect(140, 1080, W - 280, 200, 36);
  c.fill();
  c.stroke();
  c.restore();
  txt(c, 'SCORE', W / 2, 1130, 32, '#BDB5E0', { font: PIXEL });
  txt(c, String(Math.max(0, score)).padStart(6, '0'), W / 2, 1210, 80, '#FFFFFF', {
    font: PIXEL,
    stroke: 14,
  });
  if (t > t0 + 1.4)
    txt(c, 'Tech Lead Material 😎', W / 2, 1380, 64, '#22D3EE', { weight: '800', stroke: 14 });
  hero(c, 'boy', Math.floor(t * 5) % 2 ? 'win0' : 'win1', 250, 1780, 3);
  hero(c, 'girl', Math.floor(t * 5) % 2 ? 'win1' : 'win0', W - 250, 1780, 3, true);
  caption(
    c,
    t,
    t0,
    17.05,
    300,
    [
      ['Kya TUM 9:30 se pehle', '#FFFFFF'],
      ['pahunch paoge? ⏰', '#FFD43B'],
    ],
    84,
  );
}

export function sceneCta(c: CanvasRenderingContext2D, t: number) {
  const t0 = 17.05;
  bgGradient(c, '#0E0B1F', '#2A1F5C');
  // Sunburst.
  c.save();
  c.translate(W / 2, 860);
  c.rotate(t * 0.3);
  c.fillStyle = 'rgba(124,58,237,0.25)';
  for (let i = 0; i < 14; i++) {
    c.rotate((Math.PI * 2) / 14);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-80, -1400);
    c.lineTo(80, -1400);
    c.fill();
  }
  c.restore();
  confetti(c, t, t0, 70, 12);
  const k = backOut((t - t0) / 0.4);
  const pulse = 1 + Math.sin(t * 6) * 0.03;
  c.save();
  c.translate(W / 2, 470);
  c.scale(k * pulse, k * pulse);
  txt(c, 'SUPER CIPHER', 0, 0, 92, '#FFD43B', { font: PIXEL, stroke: 22, shadow: '#F06595', maxW: W - 40 });
  txt(c, 'OFFICE RUN', 0, 130, 64, '#FFFFFF', { font: PIXEL, stroke: 16 });
  c.restore();
  const run = `run${Math.floor(t * 14) % 6}`;
  hero(c, 'boy', run, W / 2 - 200, 1190 - Math.abs(Math.sin(t * 7)) * 24, 3.6);
  hero(c, 'girl', run, W / 2 + 210, 1190 - Math.abs(Math.cos(t * 7)) * 24, 3.3, true);
  if (t > t0 + 0.4)
    txt(c, 'FREE · NO DOWNLOAD', W / 2, 1270, 52, '#22D3EE', { font: PIXEL, stroke: 12, maxW: W - 60 });
  if (t > t0 + 0.7) {
    const b = 1 + Math.abs(Math.sin(t * 5)) * 0.06;
    c.save();
    c.translate(W / 2, 1430);
    c.scale(b, b);
    c.fillStyle = '#FFD43B';
    c.strokeStyle = OUT;
    c.lineWidth = 12;
    c.beginPath();
    c.roundRect(-400, -85, 800, 170, 85);
    c.fill();
    c.stroke();
    txt(c, '🔗 LINK IN BIO 👆', 0, 4, 66, OUT, { weight: '800' });
    c.restore();
  }
  if (t > t0 + 1.0)
    txt(c, 'Phone pe abhi khelo 📱', W / 2, 1600, 62, '#FFFFFF', { weight: '800', stroke: 14 });
  txt(c, '@cipherboy.dev', W / 2, 1740, 54, '#F06595', { font: PIXEL, stroke: 12 });
}

// ------------------------------------------------------------------ timeline
export function drawFrame(c: CanvasRenderingContext2D, t: number): void {
  if (!worlds) buildWorlds();
  c.save();
  c.clearRect(0, 0, W, H);
  // Scene punch-in zoom on every cut.
  const cuts = [0, LANE_T0, ROOF_T0, 10.55, 12.3, 14.5, 17.05];
  const last = Math.max(...cuts.filter((x) => x <= t));
  const z = 1 + 0.06 * (1 - easeOut((t - last) / 0.25));
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);
  if (t < LANE_T0) sceneHook(c, t);
  else if (t < ROOF_T0) sceneLane(c, t);
  else if (t < 8.45) sceneRoof(c, t);
  else if (t < 10.55) sceneScare(c, t);
  else if (t < 12.3) sceneOffice(c, t);
  else if (t < 14.5) sceneServer(c, t);
  else if (t < 17.05) sceneResult(c, t);
  else sceneCta(c, t);
  c.restore();
  // White flash on cuts.
  const flash = t - last;
  if (last > 0 && flash < 0.08 && last !== 10.55) {
    c.fillStyle = `rgba(255,255,255,${0.7 * (1 - flash / 0.08)})`;
    c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ soundtrack
export function renderAudio(sr = 44100): Float32Array {
  const out = new Float32Array(Math.ceil(DURATION * sr));
  const add = (spec: SoundSpec, at: number, gain = 1, until = DURATION) => {
    const s = render(spec, sr);
    const o = Math.floor(at * sr);
    const end = Math.min(out.length, Math.floor(until * sr));
    for (let i = 0; i < s.length && o + i < end; i++) out[o + i] += s[i] * gain;
  };
  const S = SOUNDS;
  // Alarm (0–2.2 s).
  for (let i = 0; i < 9; i++)
    add(
      {
        voices: [
          {
            wave: 'square',
            duty: 0.5,
            notes: [
              { f: 1760, d: 0.07 },
              { f: 0, d: 0.04 },
              { f: 1760, d: 0.07 },
            ],
            gain: 0.28,
          },
        ],
      },
      i * 0.25,
      1,
    );
  // Music under the action, cut for the jumpscare.
  const music = musicSpec('commute');
  add(music, 2.2, 0.75, 8.4);
  add(musicSpec('office'), 10.55, 0.75, 17.0);
  add(music, 17.05, 0.75, DURATION);
  // Lane.
  add(S.bark, 2.4, 0.9);
  add(S.bark, 2.95, 0.7);
  for (const [a] of laneJumps) add(S.jump, a, 0.8);
  add(S.stomp, 3.75);
  for (const cx of LANE_COINS) add(S.coin, LANE_T0 + (cx - 170 - 1180) / 330, 0.5);
  add(S.honk, 4.65, 1.1);
  add(S.hurt, 6.35, 0.4);
  // Roof.
  add(S.ook, 6.55);
  add(S.powerup, 7.3, 0.6);
  add(S.djump, 7.55);
  add(S.bossHit, 7.85, 1.1);
  add(S.monkeyGone, 8.0, 0.8);
  // Jumpscare.
  add(S.jumpscare, 8.55, 1.5);
  add(S.manager, 9.25, 1);
  // Office + server.
  add(S.accessOk, 10.6, 0.8);
  add(S.jump, 11.1, 0.8);
  add(S.coworker, 11.25);
  add(S.paper, 10.7, 0.6);
  for (let i = 0; i < 4; i++) add(S.laser, 12.4 + i * 0.5, 0.5);
  add(S.jump, 13.2, 0.8);
  add(S.late, 13.6, 0.7);
  // Result + CTA.
  add(S.victory, 14.55, 1.1);
  for (let i = 0; i < 3; i++) add(S.heart, 14.8 + i * 0.3, 0.8);
  for (let i = 0; i < 10; i++) add(S.coin, 14.7 + i * 0.12, 0.25);
  add(S.unlock, 17.1, 0.9);
  add(S.click, 17.8, 0.8);
  // Master: gentle limiter + 0.5 s fade out.
  for (let i = 0; i < out.length; i++) {
    const fade = Math.min(1, (out.length - i) / (0.5 * sr));
    out[i] = Math.tanh(out[i] * 0.9) * 0.86 * fade;
  }
  return out;
}

export function wavBase64(samples: Float32Array, sr = 44100): string {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++)
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
