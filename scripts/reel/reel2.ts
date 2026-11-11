/**
 * Reel #2 (20 s, 1080x1920, 30 fps): shows off the new features — intro wake-up, monsoon mood,
 * hit-stop combos to ON FIRE, coins flying to the HUD, bus SPLAT + heart shatter, stickers,
 * the jumpscare, skins, the career map, daily moods and the boss clip.
 * Preview: /super-cipher/scripts/reel/reel2.html. Export: REEL_URL=.../reel2.html node scripts/reel/render.mjs
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
  miniHud,
  drawWorld,
  windowFrame,
  sceneScare,
  sceneCta,
  getWorlds,
  toScreen,
  clamp,
  lerp,
  easeOut,
  backOut,
  arc,
  WIN_TOP,
  WS,
  Y0,
  WIN_H,
  PIXEL,
  OUT,
} from './reel';
import { ensureCharacter } from '../../src/gfx/sprites';
import { sheetKey } from '../../src/gfx/characters';
import { paintBackdrop, paintGround } from '../../src/gfx/world';
import { seeded } from '../../src/gfx/draw';
import { SOUNDS, musicSpec, render, type SoundSpec } from '../../src/audio/synth';
import type { SkinId } from '../../src/config/extras';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 20;

const SKIN_LIST: SkinId[] = ['none', 'lanyard', 'cap', 'shades', 'goldPhones'];
for (const s of SKIN_LIST) {
  ensureCharacter(host, 'boy', s);
  ensureCharacter(host, 'girl', s);
}

const hero = (
  c: CanvasRenderingContext2D,
  id: 'boy' | 'girl',
  frame: string,
  x: number,
  y: number,
  s: number,
  o: { flip?: boolean; skin?: SkinId; rot?: number; sx?: number; sy?: number; alpha?: number } = {},
) => {
  c.save();
  c.translate(x, y);
  c.scale(o.sx ?? 1, o.sy ?? 1);
  sprite(c, sheetKey(id, o.skin ?? 'none'), frame, 0, 0, s * 0.5, {
    ay: 160 / 164,
    flip: o.flip,
    rot: o.rot,
    alpha: o.alpha,
  });
  c.restore();
};

// ------------------------------------------------------------------ the 1RK bedroom strip
let bedroom: HTMLCanvasElement | null = null;
function getBedroom(): HTMLCanvasElement {
  if (bedroom) return bedroom;
  const canvas = document.createElement('canvas');
  canvas.width = 1150;
  canvas.height = 540;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 540);
  g.addColorStop(0, '#FF9A5A');
  g.addColorStop(1, '#FFE0B8');
  c.fillStyle = g;
  c.fillRect(0, 0, 1150, 540);
  const bd = paintBackdrop({
    key: 'z1_1',
    x0: 0,
    w: 1150,
    decor: [{ id: 0, type: 'exitDoor', x: 1070, y: 360, w: 60, h: 100, point: false, props: {} }],
  });
  if (bd) c.drawImage(bd, 0, 0);
  c.drawImage(paintGround('wood', 1150, 80, 3), 0, 460);
  bedroom = canvas;
  return canvas;
}

/** Meme sticker: slaps on big, wobbles, peels off. */
function sticker(c: CanvasRenderingContext2D, t: number, t0: number, text: string, y = 760, tilt = -0.07) {
  const dt = t - t0;
  if (dt < 0 || dt > 1.4) return;
  const k = dt < 0.16 ? lerp(2.3, 1, dt / 0.16) : dt > 1.15 ? 1 - (dt - 1.15) * 0.8 : 1;
  c.save();
  c.globalAlpha = dt > 1.15 ? 1 - (dt - 1.15) / 0.25 : 1;
  c.translate(W / 2, y);
  c.rotate(tilt + Math.sin(dt * 9) * 0.015);
  c.scale(k, k);
  c.font = '800 66px "Baloo 2", sans-serif';
  const w = Math.min(W - 60, c.measureText(text).width + 70);
  c.fillStyle = '#F06595';
  c.beginPath();
  c.roundRect(-w / 2 + 14, -60 + 14, w, 120, 26);
  c.fill();
  c.fillStyle = '#FFFFFF';
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(-w / 2, -60, w, 120, 26);
  c.fill();
  c.stroke();
  txt(c, text, 0, 4, 66, OUT, { weight: '800', maxW: w - 40 });
  c.restore();
}

function rain(c: CanvasRenderingContext2D, t: number, top = 0, h = H) {
  c.save();
  c.beginPath();
  c.rect(0, top, W, h);
  c.clip();
  c.fillStyle = 'rgba(28,61,90,0.16)';
  c.fillRect(0, top, W, h);
  c.strokeStyle = 'rgba(210,235,255,0.75)';
  c.lineWidth = 4;
  const r = seeded(21);
  c.beginPath();
  for (let i = 0; i < 110; i++) {
    const x = (((r() * (W + 300) - t * 220) % (W + 300)) + W + 300) % (W + 300);
    const y = top + ((r() * h + t * 1500) % h);
    c.moveTo(x, y);
    c.lineTo(x - 12, y + 46);
  }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ scenes
function sceneWake(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#3B1A4F', '#FF922B');
  const room = getBedroom();
  const cam = 0;
  c.drawImage(room, cam, Y0, W / WS, 540 - Y0, 0, WIN_TOP, W, WIN_H);
  const wake = 1.5;
  // Bed + shaking alarm clock.
  const [bx, by] = toScreen(100, 460, cam);
  sprite(c, 'bed', 0, bx, by, WS * 0.85);
  const ring = t > 0.3 && t < wake + 0.3;
  const [ax, ay] = toScreen(150, 340, cam);
  sprite(c, 'alarmClock', 0, ax + (ring ? Math.sin(t * 80) * 8 : 0), ay, WS * 0.8, {
    rot: ring ? Math.sin(t * 60) * 0.25 : 0,
  });
  if (ring && Math.floor(t * 6) % 2 === 0)
    txt(c, 'TRRRING!', ax, ay - 230, 46, '#FFD43B', { font: PIXEL, stroke: 12 });
  if (t < wake) {
    // Asleep on the bed.
    const [hx, hy] = toScreen(155, 383, cam);
    hero(c, 'boy', 'blink', hx, hy, WS, { rot: -Math.PI / 2 });
    for (let i = 0; i < 3; i++) {
      const zt = (t * 1.2 + i * 0.33) % 1;
      txt(c, 'z', hx - 120 + zt * 60, hy - 80 - zt * 160, 40 + i * 8, '#FFFFFF', {
        font: PIXEL,
        stroke: 8,
      });
    }
  } else {
    const k = clamp((t - wake) / 0.4);
    const hxw = lerp(120, 230, easeOut(k)) + Math.max(0, t - wake - 0.4) * 260;
    const hyw = 400 - Math.sin(Math.min(1, k) * Math.PI) * 90 + 60;
    const [hx, hy] = toScreen(hxw, hyw, cam);
    const frame = t < wake + 0.45 ? 'shock' : `run${Math.floor(t * 14) % 6}`;
    const shake = t < wake + 0.3 ? Math.sin(t * 90) * 10 : 0;
    hero(c, 'boy', frame, hx + shake, hy, WS);
    burst(c, t, wake, hx, hy - 120, '#FFFFFF', 14, 500, 2);
    popup(c, t, wake, hx, hy - 260, 'LATE HO GAYA!!', '#FF8787', 46);
  }
  windowFrame(c);
  miniHud(c, WIN_TOP + 10, 0, 0, '9:12 AM', '#FF8787');
  caption(c, t, 0.05, 2.65, 300, [
    ['POV: 9:12 AM', '#FFD43B'],
    ['Meeting 9:30 pe 💀', '#FFFFFF'],
  ]);
  caption(c, t, 0.3, 1.5, 1470, [['Alarm ka 7th snooze 😴', '#FFFFFF']], 76);
  caption(c, t, 1.5, 2.65, 1470, [['UTH JAA BHAI!! 😱', '#FF8787']], 86);
}

// Chained stomps with hit-stop: time freezes briefly on each hit.
const HITS = [3.3, 3.75, 4.2, 4.65];
const FREEZE = 0.09;
const warp = (t: number) => t - HITS.reduce((s, h) => s + clamp(t - h, 0, FREEZE), 0);
const S2 = 2.6;
const laneCam = (tw: number) => 1240 + (tw - S2) * 300;

function sceneMonsoon(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#1C3D5A', '#4DABF7');
  const w = getWorlds();
  const tw = warp(t);
  const cam = laneCam(tw);
  drawWorld(c, w.lane, cam, WS, WIN_TOP);
  const px = cam + 170;
  // Enemies placed where the hero lands on each hit.
  const hitWX = HITS.map((h) => laneCam(warp(h)) + 170);
  HITS.forEach((h, i) => {
    const [ex, ey] = toScreen(hitWX[i] - 4, 460, cam);
    if (t < h) {
      const dog = i === 3;
      sprite(c, dog ? 'dog' : 'bug', Math.floor(t * 10) % 4, ex, ey, WS, { flip: !dog });
    } else {
      sprite(c, i === 3 ? 'dog' : 'bugSquash', 0, ex, ey, WS, {
        alpha: clamp(1 - (t - h) / 0.9),
        flip: true,
      });
      burst(c, t, h, ex, ey - 40, i === 3 ? '#FFD43B' : '#40C057', 18, 620, 30 + i);
      popup(c, t, h, ex, ey - 150, i === 3 ? 'GOOD BOY +50' : 'BUG FIXED +100', '#69DB7C', 30);
    }
  });
  // Hero: launch at 2.9, then bounce from each stomp to the next.
  const pts = [2.9, ...HITS, 5.25];
  let jump = 0;
  for (let i = 0; i < pts.length - 1; i++)
    jump = Math.max(jump, arc(tw, warp(pts[i]), warp(pts[i + 1]) - warp(pts[i]), 120));
  const [hx, hy] = toScreen(px, 460 - jump, cam);
  const frozen = HITS.some((h) => t >= h && t < h + FREEZE);
  hero(c, 'boy', jump > 2 ? 'jump' : `run${Math.floor(tw * 14) % 6}`, hx, hy, WS, {
    sx: frozen ? 1.12 : 1,
    sy: frozen ? 0.88 : 1,
  });
  if (jump > 30)
    burst(c, t, Math.floor(t * 10) / 10, hx - 50, hy - 60, '#FFFFFF', 3, 120, Math.floor(t * 10));
  // Coins collected along the way fly up to the HUD counter.
  const coins = [1520, 1600, 1760, 1840, 2000, 2080];
  let got = 0;
  for (const cx of coins) {
    const tc = S2 + (cx - 170 - 1240) / 300;
    if (tw < tc) {
      const [sx, sy] = toScreen(cx, 380, cam);
      if (sx > -40 && sx < W + 40) sprite(c, 'coin', 0, sx, sy, 1.9, { ay: 0.5 });
      continue;
    }
    got++;
    const k = clamp((tw - tc) / 0.35);
    if (k < 1) {
      const [sx, sy] = toScreen(cx, 380, cam);
      const tx = 620;
      const ty = WIN_TOP + 50;
      const e = k * k * (3 - 2 * k);
      sprite(
        c,
        'coin',
        0,
        lerp(sx, tx, e),
        lerp(sy, ty, e) - Math.sin(k * Math.PI) * 140,
        1.9 + Math.sin(k * Math.PI),
        { ay: 0.5 },
      );
    }
  }
  rain(c, t, WIN_TOP, WIN_H);
  windowFrame(c);
  const hits = HITS.filter((h) => t >= h).length;
  miniHud(c, WIN_TOP + 10, got, got * 10 + hits * 100, 'TIME 0:21');
  // Combo text: bigger each hit, ON FIRE at x4.
  if (hits >= 2) {
    const last = HITS[hits - 1];
    const k = backOut((t - last) / 0.25);
    const label = hits >= 4 ? `COMBO x${hits} ON FIRE!` : `COMBO x${hits}!`;
    c.save();
    c.translate(W / 2, WIN_TOP + 300);
    const sc = k * Math.min(1, 0.7 + hits * 0.08);
    c.scale(sc, sc);
    txt(c, label, 6, 6, 48, '#FF5C5C', { font: PIXEL, maxW: 960 });
    txt(c, label, 0, 0, 48, hits >= 4 ? '#FFD43B' : '#FFFFFF', { font: PIXEL, stroke: 14, maxW: 960 });
    c.restore();
  }
  sticker(c, t, 4.85, 'SIGMA DEV MODE 😎', 1180, 0.06);
  caption(
    c,
    t,
    S2,
    3.6,
    300,
    [
      ['Monsoon Wednesday 🌧️', '#22D3EE'],
      ['aur office jaana hai', '#FFFFFF'],
    ],
    84,
  );
  caption(c, t, 3.6, 6.4, 300, [['Bugs ko STOMP karo 🐞', '#69DB7C']], 84);
}

function sceneSplat(c: CanvasRenderingContext2D, t: number) {
  bgGradient(c, '#2A1F5C', '#228BE6');
  const w = getWorlds();
  const t0 = 6.4;
  const hit = 7.05;
  const cam = 2430 + Math.min(t, hit) * 0 + (t - t0) * 40;
  drawWorld(c, w.lane, cam, WS, WIN_TOP);
  const px = cam + 200;
  const [hx, hy] = toScreen(px, 460, cam);
  const busX = px + 420 - (t - t0) * 650;
  const [bx, by] = toScreen(busX, 460, cam);
  sprite(c, 'bus', 0, bx, by + 16, WS, { ax: 0 });
  if (t < hit) hero(c, 'boy', `run${Math.floor(t * 14) % 6}`, hx, hy, WS);
  else {
    const k = t - hit;
    const flat = k < 0.55 ? 1 : clamp(1 - (k - 0.55) / 0.25);
    hero(c, 'boy', 'hurt', hx, hy, WS, {
      sx: 1 + 0.9 * flat,
      sy: 1 - 0.8 * flat,
      alpha: k > 0.8 && Math.floor(k * 12) % 2 ? 0.3 : 1,
    });
    popup(c, t, hit, hx, hy - 200, 'SPLAT!', '#FF8787', 64);
    burst(c, t, hit, hx, hy - 30, '#FF5C5C', 20, 700, 41);
  }
  rain(c, t, WIN_TOP, WIN_H);
  windowFrame(c);
  miniHud(c, WIN_TOP + 10, 6, 460, 'TIME 0:34');
  if (t > hit) {
    // Third heart shatters.
    const hx3 = 130 + 2 * 44;
    const hy3 = WIN_TOP + 62;
    sprite(c, 'heartEmpty', 0, hx3, hy3, 1.7, { ay: 0.5, alpha: 0.5 });
    burst(c, t, hit, hx3, hy3, '#FF5C5C', 12, 380, 44);
  }
  if (t > 6.55 && t < hit && Math.floor(t * 8) % 2 === 0) {
    c.fillStyle = '#FF5C5C';
    c.strokeStyle = OUT;
    c.lineWidth = 8;
    c.beginPath();
    c.roundRect(W - 470, WIN_TOP + 170, 430, 84, 16);
    c.fill();
    c.stroke();
    txt(c, 'BUS AA RAHI! ←', W - 255, WIN_TOP + 212, 30, '#FFFFFF', { font: PIXEL, stroke: 8 });
  }
  sticker(c, t, 7.25, 'BHAI KYA KAR RAHA HAI TU 😭', 1180, -0.06);
  caption(c, t, t0, 8.4, 300, [['DTC bus = SPLAT 🚌💥', '#FFD43B']], 88);
}

function sceneSkins(c: CanvasRenderingContext2D, t: number) {
  const t0 = 10.4;
  bgGradient(c, '#2A1F5C', '#F06595');
  c.save();
  c.translate(W / 2, 1000);
  c.rotate(t * 0.4);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 14; i++) {
    c.rotate((Math.PI * 2) / 14);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-90, -1400);
    c.lineTo(90, -1400);
    c.fill();
  }
  c.restore();
  const idx = Math.min(SKIN_LIST.length - 1, Math.floor((t - t0) / 0.42));
  const skin = SKIN_LIST[idx];
  const since = t - t0 - idx * 0.42;
  const pop = backOut(since / 0.18);
  const id = idx % 2 === 0 ? 'boy' : 'girl';
  c.save();
  c.translate(W / 2, 1300);
  c.scale(pop, pop);
  hero(c, id, Math.floor(t * 5) % 2 ? 'win0' : 'win1', 0, 0, 5.2, { skin });
  c.restore();
  if (since < 0.08) {
    c.fillStyle = `rgba(255,255,255,${0.7 * (1 - since / 0.08)})`;
    c.fillRect(0, 0, W, H);
  }
  const names: Record<SkinId, string> = {
    none: 'CLASSIC',
    lanyard: 'ID LANYARD',
    cap: 'CODER CAP',
    shades: 'SHADES 😎',
    goldPhones: 'GOLD HEADPHONES',
  };
  c.save();
  c.fillStyle = '#FFD43B';
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(W / 2 - 330, 1400, 660, 110, 55);
  c.fill();
  c.stroke();
  c.restore();
  txt(c, names[skin], W / 2, 1458, 44, OUT, { font: PIXEL, maxW: 600 });
  // Skin icons row.
  SKIN_LIST.forEach((s, i) => {
    const x = W / 2 + (i - 2) * 170;
    const on = i === idx;
    c.save();
    c.beginPath();
    c.arc(x, 1640, on ? 74 : 60, 0, Math.PI * 2);
    c.fillStyle = on ? '#FFD43B' : 'rgba(14,11,31,0.6)';
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = OUT;
    c.stroke();
    c.restore();
    sprite(c, s === 'none' ? `head-${id}` : `head-${id}-${s}`, 0, x, 1640, on ? 2.1 : 1.7, {
      ay: 0.5,
      alpha: i <= idx ? 1 : 0.4,
    });
  });
  caption(
    c,
    t,
    t0,
    12.8,
    300,
    [
      ['Stars kamao ⭐', '#FFD43B'],
      ['STYLE unlock karo 😎', '#FFFFFF'],
    ],
    92,
  );
}

function sceneMap(c: CanvasRenderingContext2D, t: number) {
  const t0 = 12.8;
  bgGradient(c, '#0E0B1F', '#2A1F5C');
  const nodes: [string, string][] = [
    ['🏠', 'GHAR'],
    ['🚇', 'METRO'],
    ['🏢', 'OFFICE'],
    ['🍛', 'LUNCH'],
    ['🌙', 'DEADLINE'],
    ['🤝', 'CLIENT'],
    ['🏝️', 'OFFSITE'],
    ['📈', 'APPRAISAL'],
    ['👑', 'CTO'],
  ];
  const gap = 340;
  const hop = 0.24;
  const pos = clamp((t - t0 - 0.15) / hop, 0, nodes.length - 1);
  const at = Math.floor(pos);
  const frac = pos - at;
  const markerX = (at + easeOut(frac)) * gap;
  const camX = markerX - W / 2;
  const y = 980;
  // Road.
  c.save();
  c.strokeStyle = '#FFD43B';
  c.lineWidth = 14;
  c.setLineDash([36, 26]);
  c.beginPath();
  c.moveTo(-camX, y);
  c.lineTo((nodes.length - 1) * gap - camX, y);
  c.stroke();
  c.restore();
  nodes.forEach(([ico, name], i) => {
    const x = i * gap - camX;
    if (x < -200 || x > W + 200) return;
    const final = i === nodes.length - 1;
    const reached = i <= at;
    c.save();
    c.translate(x, y);
    if (final) {
      const g = c.createRadialGradient(0, 0, 20, 0, 0, 260);
      g.addColorStop(0, 'rgba(255,212,59,0.7)');
      g.addColorStop(1, 'rgba(255,212,59,0)');
      c.fillStyle = g;
      c.fillRect(-260, -260, 520, 520);
    }
    c.fillStyle = reached ? (final ? '#FFD43B' : '#251E47') : '#1B1636';
    c.strokeStyle = reached ? '#FFD43B' : '#3A3166';
    c.lineWidth = 10;
    c.beginPath();
    c.roundRect(-125, -150, 250, 300, 32);
    c.fill();
    c.stroke();
    txt(c, ico, 0, -40, 110, '#000', { font: 'sans-serif' });
    txt(c, name, 0, 90, 30, final ? OUT : '#FFFFFF', { font: PIXEL, maxW: 220 });
    c.restore();
  });
  // The hero marker hops from node to node.
  const hopY = Math.sin(frac * Math.PI) * 120;
  sprite(c, 'head-boy-lanyard', 0, markerX - camX, y - 250 - hopY, 2.6, { ay: 0.5 });
  if (pos >= nodes.length - 1) {
    burst(c, t, t0 + 0.15 + (nodes.length - 1) * hop, W / 2, y - 100, '#FFD43B', 24, 700, 77);
    confetti(c, t, t0 + 0.15 + (nodes.length - 1) * hop, 50, 3);
  }
  caption(
    c,
    t,
    t0,
    15.0,
    330,
    [
      ['INTERN ➜ CTO 🚀', '#FFD43B'],
      ['8 levels ka safar', '#FFFFFF'],
    ],
    96,
  );
  caption(c, t, 13.6, 15.0, 1470, [['Naya level jaldi aa raha 👀', '#22D3EE']], 74);
}

function sceneMoodClip(c: CanvasRenderingContext2D, t: number) {
  const t0 = 15.0;
  const split = 16.15;
  if (t < split) {
    bgGradient(c, '#5C1A3A', '#F06595');
    const moods: [string, string, string][] = [
      ['😵', 'MONDAY BLUES', 'Dushman 20% tez'],
      ['☕', 'CHAI TUESDAY', 'Power-ups x2'],
      ['🌧️', 'MONSOON', 'Baarish!'],
      ['🐞', 'BUG BASH', 'Bug = x2 points'],
      ['🎉', 'FRIDAY FEELING', 'Coins = x2'],
    ];
    const i = Math.min(moods.length - 1, Math.floor((t - t0) / 0.22));
    const local = (t - t0 - i * 0.22) / 0.22;
    const flip = Math.abs(Math.cos(clamp(local) * Math.PI * 0.5 + Math.PI * 0.5)) * 0 + clamp(local * 3);
    const [ico, name, desc] = moods[i];
    c.save();
    c.translate(W / 2, 1000);
    c.scale(flip, 1);
    c.rotate(-0.03);
    c.fillStyle = '#FFFFFF';
    c.strokeStyle = OUT;
    c.lineWidth = 14;
    c.beginPath();
    c.roundRect(-380, -330, 760, 660, 50);
    c.fill();
    c.stroke();
    txt(c, ico, 0, -120, 200, '#000', { font: 'sans-serif' });
    txt(c, name, 0, 90, 52, '#7C3AED', { font: PIXEL, maxW: 680 });
    txt(c, desc, 0, 200, 64, OUT, { weight: '800' });
    c.restore();
    caption(
      c,
      t,
      t0,
      split,
      330,
      [
        ['Har din naya', '#FFFFFF'],
        ['MANAGER MOOD 🎲', '#FFD43B'],
      ],
      96,
    );
    return;
  }
  // Boss clip: phone showing a recording of the boss fight.
  bgGradient(c, '#2A1F5C', '#7C3AED');
  const k = backOut((t - split) / 0.3);
  c.save();
  c.translate(W / 2, 1000);
  c.scale(k, k);
  c.rotate(0.04);
  c.fillStyle = '#14121F';
  c.beginPath();
  c.roundRect(-300, -560, 600, 1120, 70);
  c.fill();
  // Screen: rooftop boss fight.
  c.save();
  c.beginPath();
  c.roundRect(-270, -520, 540, 1040, 44);
  c.clip();
  const roof = getWorlds().roof;
  c.drawImage(roof.canvas, 780, 0, 520, 540, -540, -520, 1080, 1040);
  const tt = t - split;
  sprite(c, 'monkey', Math.floor(t * 6) % 2, 130, 220 - Math.abs(Math.sin(t * 6)) * 60, 2.4);
  hero(c, 'boy', Math.floor(t * 4) % 2 ? 'jump' : 'fall', -100, 160 - Math.abs(Math.sin(tt * 4)) * 120, 2.4, {
    skin: 'shades',
  });
  c.restore();
  c.fillStyle = Math.floor(t * 3) % 2 ? '#FF2D2D' : '#7A1F2B';
  c.beginPath();
  c.arc(-200, -450, 18, 0, Math.PI * 2);
  c.fill();
  txt(c, `REC 0:${String(8 + Math.floor(tt * 4)).padStart(2, '0')}`, -80, -448, 30, '#FFFFFF', {
    font: PIXEL,
    stroke: 8,
  });
  c.restore();
  c.save();
  c.translate(W / 2, 1640);
  const b = 1 + Math.abs(Math.sin(t * 6)) * 0.05;
  c.scale(b, b);
  c.fillStyle = '#F06595';
  c.strokeStyle = OUT;
  c.lineWidth = 10;
  c.beginPath();
  c.roundRect(-380, -70, 760, 140, 70);
  c.fill();
  c.stroke();
  txt(c, '🎬 Boss clip save karo', 0, 4, 56, '#FFFFFF', { weight: '800', stroke: 10 });
  c.restore();
  caption(
    c,
    t,
    split,
    17.25,
    300,
    [
      ['Boss fight ka clip', '#FFFFFF'],
      ['➜ Story pe daalo 📲', '#FFD43B'],
    ],
    90,
  );
}

// ------------------------------------------------------------------ timeline
const CUTS = [0, S2, 6.4, 8.4, 10.4, 12.8, 15.0, 16.15, 17.25];
export function drawFrame(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.clearRect(0, 0, W, H);
  const last = Math.max(...CUTS.filter((x) => x <= t));
  const z = 1 + 0.06 * (1 - easeOut((t - last) / 0.25));
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);
  if (t < S2) sceneWake(c, t);
  else if (t < 6.4) sceneMonsoon(c, t);
  else if (t < 8.4) sceneSplat(c, t);
  else if (t < 10.4) sceneScare(c, t + 0.15);
  else if (t < 12.8) sceneSkins(c, t);
  else if (t < 15.0) sceneMap(c, t);
  else if (t < 17.25) sceneMoodClip(c, t);
  else sceneCta(c, t - 17.25 + 17.05);
  c.restore();
  const flash = t - last;
  if (last > 0 && last !== 8.4 && flash < 0.08) {
    c.fillStyle = `rgba(255,255,255,${0.7 * (1 - flash / 0.08)})`;
    c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ soundtrack
/** Shift every note of a sound by a pitch factor (for rising combo blips). */
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
  // Wake-up: alarm, snore, shock.
  for (let i = 0; i < 6; i++)
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
      0.3 + i * 0.2,
    );
  add({ voices: [{ wave: 'noise', notes: [{ f: 400, f1: 200, d: 0.5 }], gain: 0.15, attack: 0.2 }] }, 0.05);
  add(S.djump, 1.5, 1.1);
  add(S.hurt, 1.52, 0.4);
  add(S.jump, 1.9, 0.8);
  // Music: dhol from the run, tabla for the features montage.
  add(musicSpec('commute'), 2.0, 0.7, 8.35);
  add(musicSpec('office'), 10.4, 0.7, 17.2);
  add(musicSpec('commute'), 17.25, 0.7, DURATION);
  // Monsoon rain bed.
  add(
    { voices: [{ wave: 'noise', notes: [{ f: 7000, d: 5.6 }], gain: 0.07, attack: 0.4, release: 0.4 }] },
    2.6,
  );
  // Combo: each stomp a bit higher.
  add(S.jump, 2.9, 0.8);
  HITS.forEach((h, i) => {
    add(S.stomp, h, 1);
    add(pitched(S.coin, 1 + (i + 1) * 0.12), h + 0.05, 0.7);
  });
  add(S.bark, 4.6, 0.6);
  add(S.powerup, 4.75, 0.6);
  add(S.click, 4.85, 1);
  for (const cx of [1520, 1600, 1760, 1840, 2000, 2080]) add(S.coin, S2 + (cx - 170 - 1240) / 300, 0.45);
  // Splat.
  add(S.honk, 6.45, 1.1);
  add(S.thud, 7.05, 1.2);
  add(S.hurt, 7.06, 0.8);
  add(S.click, 7.25, 1);
  // Jumpscare.
  add(S.jumpscare, 8.4, 1.5);
  add(S.manager, 9.1, 1);
  // Skins: a sparkle per outfit.
  for (let i = 0; i < 5; i++) add(pitched(S.powerup, 1 + i * 0.06), 10.4 + i * 0.42, 0.5);
  // Map hops.
  for (let i = 0; i < 9; i++) add(pitched(S.jump, 1 + i * 0.05), 12.95 + i * 0.24, 0.5);
  add(S.victory, 15.0 - 0.1, 0.8);
  // Mood flips + REC beep.
  for (let i = 0; i < 5; i++) add(S.click, 15.0 + i * 0.22, 0.9);
  add(S.beep, 16.2, 0.8);
  add(S.scan, 16.3, 0.6);
  // CTA.
  add(S.unlock, 17.3, 0.9);
  add(S.laugh, 17.9 - 0.9, 0.6);
  for (let i = 0; i < out.length; i++) {
    const fade = Math.min(1, (out.length - i) / (0.5 * sr));
    out[i] = Math.tanh(out[i] * 0.9) * 0.86 * fade;
  }
  return out;
}

export { wavBase64 } from './reel';
