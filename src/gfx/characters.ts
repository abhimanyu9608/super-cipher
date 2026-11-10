/**
 * Cipherboy and Ciphergirl, drawn procedurally at 2x (128x164) per the PRD art spec:
 * big-head proportions (head ≈ 45% of height), thick dark outline, flat colours with one highlight.
 */
import type { CharacterId } from '../config/physics';
import { OUTLINE, circle, ellipse, limb, poly, rr, fillStroke, star, type Ctx } from './draw';

export const CHAR_FRAMES = [
  'idle0',
  'idle1',
  'run0',
  'run1',
  'run2',
  'run3',
  'run4',
  'run5',
  'jump',
  'fall',
  'hurt',
  'win0',
  'win1',
] as const;
export type CharFrame = (typeof CHAR_FRAMES)[number];
export const CHAR_W = 128;
export const CHAR_H = 164;

interface Palette {
  skin: string;
  skinShade: string;
  hair: string;
  hoodie: string;
  hoodieHi: string;
  pants: string;
  shoe: string;
  stripe: string;
}

const PAL: Record<CharacterId, Palette> = {
  boy: {
    skin: '#C98B5B',
    skinShade: '#A86E44',
    hair: '#17131F',
    hoodie: '#FF8A1F',
    hoodieHi: '#FFB066',
    pants: '#2F6FD6',
    shoe: '#FFFFFF',
    stripe: '#FF8A1F',
  },
  girl: {
    skin: '#D49A6A',
    skinShade: '#B17A4E',
    hair: '#6B3E1F',
    hoodie: '#14B8A6',
    hoodieHi: '#5EEAD4',
    pants: '#7C3AED',
    shoe: '#FFFFFF',
    stripe: '#14B8A6',
  },
};

interface Pose {
  legA: number;
  legB: number;
  armA: number;
  armB: number;
  bob: number;
  face: 'normal' | 'hurt' | 'happy' | 'focus';
  armsUp?: boolean;
}

function poseFor(f: CharFrame): Pose {
  if (f.startsWith('run')) {
    const i = Number(f.slice(3));
    const s = Math.sin((i / 6) * Math.PI * 2);
    return {
      legA: s * 0.7,
      legB: -s * 0.7,
      armA: -s * 0.8,
      armB: s * 0.8,
      bob: Math.abs(s) * -4,
      face: 'focus',
    };
  }
  switch (f) {
    case 'idle0':
      return { legA: 0.05, legB: -0.05, armA: 0.12, armB: -0.12, bob: 0, face: 'normal' };
    case 'idle1':
      return { legA: 0.05, legB: -0.05, armA: 0.16, armB: -0.16, bob: 2, face: 'normal' };
    case 'jump':
      return { legA: -0.6, legB: 0.35, armA: -2.4, armB: 0.7, bob: 0, face: 'focus' };
    case 'fall':
      return { legA: 0.3, legB: -0.3, armA: -1.9, armB: 1.9, bob: 0, face: 'normal' };
    case 'hurt':
      return { legA: 0.5, legB: -0.4, armA: -2.2, armB: 2.2, bob: 0, face: 'hurt' };
    case 'win0':
      return { legA: 0.15, legB: -0.15, armA: -2.7, armB: 2.7, bob: -4, face: 'happy', armsUp: true };
    default:
      return { legA: 0.25, legB: -0.25, armA: -2.9, armB: 2.5, bob: -8, face: 'happy', armsUp: true };
  }
}

/** Draw one frame with the character's feet at (ox + 64, oy + 160). Facing right. */
export function drawCharacter(ctx: Ctx, id: CharacterId, frame: CharFrame, ox = 0, oy = 0): void {
  const p = PAL[id];
  const pose = poseFor(frame);
  ctx.save();
  ctx.translate(ox, oy + pose.bob);
  const hipY = 126;
  const shoulderY = 96;

  // Ponytail goes behind everything.
  if (id === 'girl') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(30, 34);
    ctx.bezierCurveTo(4, 40, 2, 78, 14, 104);
    ctx.bezierCurveTo(20, 92, 22, 76, 36, 60);
    ctx.closePath();
    fillStroke(ctx, p.hair, 5);
    ctx.restore();
  }

  // Back leg + arm (darker).
  leg(ctx, 56, hipY, pose.legB, p, true);
  arm(ctx, 50, shoulderY, pose.armB, p, true);

  // Torso (hoodie).
  rr(ctx, 40, 86, 48, 46, 14);
  fillStroke(ctx, p.hoodie, 5);
  ctx.fillStyle = p.hoodieHi;
  rr(ctx, 46, 92, 10, 30, 5);
  ctx.fill();
  // Pocket + strings.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 118);
  ctx.lineTo(80, 118);
  ctx.stroke();
  limb(ctx, 58, 92, 58, 108, 3, '#FFFFFF', 1.5);
  limb(ctx, 70, 92, 70, 108, 3, '#FFFFFF', 1.5);

  // Front leg.
  leg(ctx, 72, hipY, pose.legA, p, false);

  // Neck accessory: Cipherboy wears neon headphones round the neck.
  if (id === 'boy') {
    ctx.beginPath();
    ctx.arc(64, 84, 22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 11;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#22D3EE';
    ctx.stroke();
    circle(ctx, 43, 92, 7, '#22D3EE', 4);
    circle(ctx, 85, 92, 7, '#22D3EE', 4);
  }

  head(ctx, id, p, pose);

  // Front arm on top.
  arm(ctx, 80, shoulderY, pose.armA, p, false);
  ctx.restore();
}

function leg(ctx: Ctx, x: number, y: number, a: number, p: Palette, back: boolean): void {
  const len = 26;
  const kx = x + Math.sin(a) * len;
  const ky = y + Math.cos(a) * len;
  const color = back ? shadeHex(p.pants) : p.pants;
  limb(ctx, x, y, kx, ky, 16, color, 4);
  // Sneaker.
  ctx.save();
  ctx.translate(kx, ky + 4);
  ctx.rotate(a * 0.4);
  rr(ctx, -10, -6, 26, 13, 6);
  fillStroke(ctx, back ? '#E8E8EE' : p.shoe, 4);
  ctx.fillStyle = p.stripe;
  ctx.fillRect(-2, -2, 12, 3);
  ctx.restore();
}

function arm(ctx: Ctx, x: number, y: number, a: number, p: Palette, back: boolean): void {
  const len = 24;
  const hx = x + Math.sin(a) * len;
  const hy = y + Math.cos(a) * len;
  limb(ctx, x, y, hx, hy, 13, back ? shadeHex(p.hoodie) : p.hoodie, 4);
  circle(ctx, hx, hy, 6.5, back ? p.skinShade : p.skin, 3.5);
}

function head(ctx: Ctx, id: CharacterId, p: Palette, pose: Pose): void {
  const cx = 66;
  const cy = 48;
  // Hair back mass.
  if (id === 'girl') {
    ellipse(ctx, cx - 2, cy - 6, 42, 38, p.hair, 5);
  }
  // Ears.
  ellipse(ctx, cx - 36, cy + 4, 7, 10, p.skin, 4);
  // Face.
  ellipse(ctx, cx, cy + 2, 37, 36, p.skin, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 14, 12, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair front.
  if (id === 'boy') {
    poly(
      ctx,
      [
        cx - 38,
        cy - 2,
        cx - 40,
        cy - 22,
        cx - 30,
        cy - 30,
        cx - 34,
        cy - 46,
        cx - 16,
        cy - 38,
        cx - 10,
        cy - 54,
        cx + 4,
        cy - 40,
        cx + 16,
        cy - 54,
        cx + 22,
        cy - 36,
        cx + 38,
        cy - 44,
        cx + 34,
        cy - 24,
        cx + 42,
        cy - 16,
        cx + 30,
        cy - 12,
        cx + 10,
        cy - 20,
        cx - 8,
        cy - 12,
        cx - 24,
        cy - 16,
        cx - 30,
        cy - 2,
      ],
      p.hair,
      5,
    );
    ctx.fillStyle = '#3A3355';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 46);
    ctx.lineTo(cx, cy - 36);
    ctx.lineTo(cx - 14, cy - 34);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy + 8);
    ctx.bezierCurveTo(cx - 44, cy - 36, cx + 10, cy - 52, cx + 40, cy - 22);
    ctx.bezierCurveTo(cx + 30, cy - 18, cx + 10, cy - 22, cx - 6, cy - 14);
    ctx.bezierCurveTo(cx - 18, cy - 6, cx - 26, cy - 8, cx - 30, cy + 8);
    ctx.closePath();
    fillStroke(ctx, p.hair, 5);
    star(ctx, cx + 22, cy - 28, 10, '#FFD43B', 3);
  }

  // Eyes.
  const ey = cy + 4;
  if (pose.face === 'hurt') {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const ex of [cx + 2, cx + 24]) {
      ctx.beginPath();
      ctx.moveTo(ex - 6, ey - 6);
      ctx.lineTo(ex + 6, ey + 6);
      ctx.moveTo(ex + 6, ey - 6);
      ctx.lineTo(ex - 6, ey + 6);
      ctx.stroke();
    }
  } else if (pose.face === 'happy') {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (const ex of [cx + 2, cx + 24]) {
      ctx.beginPath();
      ctx.arc(ex, ey + 3, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    for (const ex of [cx + 2, cx + 24]) {
      ellipse(ctx, ex, ey, 7.5, 9.5, '#FFFFFF', 3.5);
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(ex + 2.5, ey + (pose.face === 'focus' ? 0 : 1), 4, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ex + 3, ey - 3, 2.5, 2.5);
    }
    // Brows.
    ctx.strokeStyle = id === 'girl' ? p.hair : OUTLINE;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const tilt = pose.face === 'focus' ? 3 : 0;
    ctx.beginPath();
    ctx.moveTo(cx - 6, ey - 15 - tilt);
    ctx.lineTo(cx + 8, ey - 14 + tilt);
    ctx.moveTo(cx + 18, ey - 14 + tilt);
    ctx.lineTo(cx + 31, ey - 15 - tilt);
    ctx.stroke();
  }
  // Blush + mouth.
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 10, ey + 14, 7, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 34, ey + 14, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (pose.face === 'hurt') {
    ctx.ellipse(cx + 14, ey + 22, 6, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7A1F2B';
    ctx.fill();
    ctx.stroke();
  } else if (pose.face === 'happy') {
    ctx.moveTo(cx + 2, ey + 16);
    ctx.quadraticCurveTo(cx + 14, ey + 32, cx + 26, ey + 16);
    ctx.closePath();
    ctx.fillStyle = '#7A1F2B';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.moveTo(cx + 6, ey + 18);
    ctx.quadraticCurveTo(cx + 15, ey + 25, cx + 24, ey + 17);
    ctx.stroke();
  }
}

const shadeHex = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  const d = (c: number) => Math.round(c * 0.78);
  return `#${((1 << 24) | (d((n >> 16) & 255) << 16) | (d((n >> 8) & 255) << 8) | d(n & 255)).toString(16).slice(1)}`;
};

/** Round head icon (HUD, progress bar, header). */
export function drawHeadIcon(ctx: Ctx, id: CharacterId, size: number): void {
  ctx.save();
  const s = size / 96;
  ctx.scale(s, s);
  ctx.translate(-18, 6);
  head(ctx, id, PAL[id], poseFor('idle0'));
  ctx.restore();
}
