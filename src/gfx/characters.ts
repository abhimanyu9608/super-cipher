/**
 * Cipherboy and Ciphergirl, drawn procedurally at 2x (128x164) per the PRD art spec:
 * big-head proportions (head ≈ 45% of height), thick dark outline, flat colours with one highlight.
 * Frames include blink, skid, shock and "worried" variants (sweat + raised brows) used when time is low,
 * and optional cosmetic skins (shades, cap, gold headphones, ID lanyard).
 */
import type { CharacterId } from '../config/physics';
import type { SkinId } from '../config/extras';
import { OUTLINE, circle, ellipse, limb, poly, rr, fillStroke, star, type Ctx } from './draw';

export const CHAR_FRAMES = [
  'idle0',
  'idle1',
  'blink',
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
  'skid',
  'shock',
  'widle',
  'wrun0',
  'wrun1',
  'wrun2',
  'wrun3',
  'wrun4',
  'wrun5',
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

type Face = 'normal' | 'hurt' | 'happy' | 'focus' | 'blink' | 'worried' | 'shock';

interface Pose {
  legA: number;
  legB: number;
  armA: number;
  armB: number;
  bob: number;
  face: Face;
  lean?: number;
}

function runPose(i: number, face: Face): Pose {
  const s = Math.sin((i / 6) * Math.PI * 2);
  return { legA: s * 0.75, legB: -s * 0.75, armA: -s * 0.85, armB: s * 0.85, bob: Math.abs(s) * -4, face };
}

function poseFor(f: CharFrame): Pose {
  if (f.startsWith('wrun')) return runPose(Number(f.slice(4)), 'worried');
  if (f.startsWith('run')) return runPose(Number(f.slice(3)), 'focus');
  switch (f) {
    case 'idle0':
      return { legA: 0.05, legB: -0.05, armA: 0.12, armB: -0.12, bob: 0, face: 'normal' };
    case 'idle1':
      return { legA: 0.05, legB: -0.05, armA: 0.16, armB: -0.16, bob: 2, face: 'normal' };
    case 'blink':
      return { legA: 0.05, legB: -0.05, armA: 0.12, armB: -0.12, bob: 0, face: 'blink' };
    case 'widle':
      return { legA: 0.1, legB: -0.1, armA: 0.5, armB: -0.3, bob: 1, face: 'worried' };
    case 'jump':
      return { legA: -0.6, legB: 0.35, armA: -2.4, armB: 0.7, bob: 0, face: 'focus' };
    case 'fall':
      return { legA: 0.3, legB: -0.3, armA: -1.9, armB: 1.9, bob: 0, face: 'normal' };
    case 'hurt':
      return { legA: 0.5, legB: -0.4, armA: -2.2, armB: 2.2, bob: 0, face: 'hurt' };
    case 'skid':
      return { legA: 0.9, legB: 0.4, armA: -1.2, armB: -0.6, bob: 3, face: 'shock', lean: -0.18 };
    case 'shock':
      return { legA: 0.3, legB: -0.3, armA: -2.6, armB: 2.6, bob: -6, face: 'shock' };
    case 'win0':
      return { legA: 0.15, legB: -0.15, armA: -2.7, armB: 2.7, bob: -4, face: 'happy' };
    default:
      return { legA: 0.25, legB: -0.25, armA: -2.9, armB: 2.5, bob: -8, face: 'happy' };
  }
}

/** Draw one frame with the character's feet at (ox + 64, oy + 160). Facing right. */
export function drawCharacter(
  ctx: Ctx,
  id: CharacterId,
  frame: CharFrame,
  ox = 0,
  oy = 0,
  skin: SkinId = 'none',
): void {
  const p = PAL[id];
  const pose = poseFor(frame);
  ctx.save();
  ctx.translate(ox, oy + pose.bob);
  if (pose.lean) {
    ctx.translate(64, 160);
    ctx.rotate(pose.lean);
    ctx.translate(-64, -160);
  }
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
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 118);
  ctx.lineTo(80, 118);
  ctx.stroke();
  limb(ctx, 58, 92, 58, 108, 3, '#FFFFFF', 1.5);
  limb(ctx, 70, 92, 70, 108, 3, '#FFFFFF', 1.5);
  if (skin === 'lanyard') lanyard(ctx);

  // Front leg.
  leg(ctx, 72, hipY, pose.legA, p, false);

  // Neck headphones: Cipherboy always; anyone with the gold skin.
  if (id === 'boy' || skin === 'goldPhones') {
    const col = skin === 'goldPhones' ? '#FFD43B' : '#22D3EE';
    ctx.beginPath();
    ctx.arc(64, 84, 22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 11;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = col;
    ctx.stroke();
    circle(ctx, 43, 92, 7, col, 4);
    circle(ctx, 85, 92, 7, col, 4);
    if (skin === 'goldPhones') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(40, 88, 3, 3);
      ctx.fillRect(82, 88, 3, 3);
    }
  }

  head(ctx, id, p, pose, skin);

  // Front arm on top.
  arm(ctx, 80, shoulderY, pose.armA, p, false);
  ctx.restore();
}

function lanyard(ctx: Ctx): void {
  ctx.strokeStyle = '#FF5C5C';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(52, 88);
  ctx.lineTo(64, 104);
  ctx.lineTo(76, 88);
  ctx.stroke();
  rr(ctx, 56, 102, 17, 21, 3);
  fillStroke(ctx, '#FFFFFF', 3);
  ctx.fillStyle = '#22D3EE';
  ctx.fillRect(58, 104, 13, 5);
  ctx.fillStyle = '#5A5470';
  ctx.fillRect(59, 113, 10, 2);
  ctx.fillRect(59, 117, 7, 2);
}

function leg(ctx: Ctx, x: number, y: number, a: number, p: Palette, back: boolean): void {
  const len = 26;
  const kx = x + Math.sin(a) * len;
  const ky = y + Math.cos(a) * len;
  limb(ctx, x, y, kx, ky, 16, back ? shadeHex(p.pants) : p.pants, 4);
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

function head(ctx: Ctx, id: CharacterId, p: Palette, pose: Pose, skin: SkinId = 'none'): void {
  const cx = 66;
  const cy = 48;
  if (id === 'girl') ellipse(ctx, cx - 2, cy - 6, 42, 38, p.hair, 5);
  ellipse(ctx, cx - 36, cy + 4, 7, 10, p.skin, 4);
  ellipse(ctx, cx, cy + 2, 37, 36, p.skin, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 14, 12, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair front (the cap replaces the top of it).
  if (skin === 'cap') cap(ctx, id, p, cx, cy);
  else if (id === 'boy') {
    // prettier-ignore
    poly(ctx, [
      cx - 38, cy - 2, cx - 40, cy - 22, cx - 30, cy - 30, cx - 34, cy - 46, cx - 16, cy - 38, cx - 10, cy - 54,
      cx + 4, cy - 40, cx + 16, cy - 54, cx + 22, cy - 36, cx + 38, cy - 44, cx + 34, cy - 24, cx + 42, cy - 16,
      cx + 30, cy - 12, cx + 10, cy - 20, cx - 8, cy - 12, cx - 24, cy - 16, cx - 30, cy - 2,
    ], p.hair, 5);
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

  const ey = cy + 4;
  const eyes = [cx + 2, cx + 24];
  ctx.lineCap = 'round';
  if (pose.face === 'hurt') {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.moveTo(ex - 6, ey - 6);
      ctx.lineTo(ex + 6, ey + 6);
      ctx.moveTo(ex + 6, ey - 6);
      ctx.lineTo(ex - 6, ey + 6);
      ctx.stroke();
    }
  } else if (pose.face === 'happy' || pose.face === 'blink') {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4.5;
    for (const ex of eyes) {
      ctx.beginPath();
      if (pose.face === 'happy') ctx.arc(ex, ey + 3, 7, Math.PI * 1.1, Math.PI * 1.9);
      else {
        ctx.moveTo(ex - 7, ey + 1);
        ctx.quadraticCurveTo(ex, ey + 5, ex + 7, ey + 1);
      }
      ctx.stroke();
    }
  } else {
    const big = pose.face === 'shock' ? 1.25 : 1;
    for (const ex of eyes) {
      ellipse(ctx, ex, ey, 7.5 * big, 9.5 * big, '#FFFFFF', 3.5);
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      const pr = pose.face === 'shock' ? 0.55 : 1;
      ctx.ellipse(ex + 2.5, ey + (pose.face === 'focus' ? 0 : 1), 4 * pr, 5.5 * pr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ex + 3, ey - 3, 2.5, 2.5);
    }
    // Brows: focused tilt down-in, worried/shock tilt up-in.
    ctx.strokeStyle = id === 'girl' ? p.hair : OUTLINE;
    ctx.lineWidth = 4;
    const tilt = pose.face === 'focus' ? 3 : pose.face === 'worried' ? -4 : 0;
    const lift = pose.face === 'shock' ? 6 : 0;
    ctx.beginPath();
    ctx.moveTo(cx - 6, ey - 15 - tilt - lift);
    ctx.lineTo(cx + 8, ey - 14 + tilt - lift);
    ctx.moveTo(cx + 18, ey - 14 + tilt - lift);
    ctx.lineTo(cx + 31, ey - 15 - tilt - lift);
    ctx.stroke();
  }
  // Shades skin over the eyes.
  if (skin === 'shades' && pose.face !== 'hurt') {
    rr(ctx, cx - 9, ey - 9, 22, 15, 5);
    fillStroke(ctx, '#14121F', 3);
    rr(ctx, cx + 15, ey - 9, 22, 15, 5);
    fillStroke(ctx, '#14121F', 3);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(cx + 12, ey - 5, 4, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(cx - 5, ey - 6, 6, 3);
    ctx.fillRect(cx + 19, ey - 6, 6, 3);
  }
  // Blush.
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 10, ey + 14, 7, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 34, ey + 14, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mouth.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (pose.face === 'hurt' || pose.face === 'shock') {
    ctx.ellipse(
      cx + 14,
      ey + 22,
      pose.face === 'shock' ? 5 : 6,
      pose.face === 'shock' ? 7 : 5,
      0,
      0,
      Math.PI * 2,
    );
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
  } else if (pose.face === 'worried') {
    // Wobbly frown.
    ctx.moveTo(cx + 5, ey + 22);
    ctx.quadraticCurveTo(cx + 10, ey + 17, cx + 15, ey + 21);
    ctx.quadraticCurveTo(cx + 20, ey + 25, cx + 25, ey + 20);
    ctx.stroke();
  } else {
    ctx.moveTo(cx + 6, ey + 18);
    ctx.quadraticCurveTo(cx + 15, ey + 25, cx + 24, ey + 17);
    ctx.stroke();
  }
  // Sweat drop when worried or shocked.
  if (pose.face === 'worried' || pose.face === 'shock') {
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy - 20);
    ctx.quadraticCurveTo(cx + 48, cy - 6, cx + 40, cy - 2);
    ctx.quadraticCurveTo(cx + 32, cy - 6, cx + 40, cy - 20);
    fillStroke(ctx, '#74C0FC', 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx + 37, cy - 9, 3, 3);
  }
}

function cap(ctx: Ctx, id: CharacterId, p: Palette, cx: number, cy: number): void {
  if (id === 'girl') {
    // Ponytail pokes out the back of the cap.
    ellipse(ctx, cx - 30, cy - 6, 12, 18, p.hair, 4);
  } else {
    poly(ctx, [cx - 38, cy - 2, cx - 40, cy - 14, cx - 30, cy - 18, cx - 30, cy - 2], p.hair, 4);
  }
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 12);
  ctx.bezierCurveTo(cx - 38, cy - 54, cx + 34, cy - 54, cx + 34, cy - 14);
  ctx.closePath();
  fillStroke(ctx, '#F06595', 5);
  // Brim.
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 18);
  ctx.quadraticCurveTo(cx + 40, cy - 22, cx + 56, cy - 12);
  ctx.quadraticCurveTo(cx + 36, cy - 8, cx + 10, cy - 12);
  ctx.closePath();
  fillStroke(ctx, '#C2255C', 4);
  circle(ctx, cx - 2, cy - 44, 4, '#FFD43B', 2.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('</>', cx - 4, cy - 24);
}

const shadeHex = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  const d = (c: number) => Math.round(c * 0.78);
  return `#${((1 << 24) | (d((n >> 16) & 255) << 16) | (d((n >> 8) & 255) << 8) | d(n & 255)).toString(16).slice(1)}`;
};

/** Round head icon (HUD, progress bar, header). */
export function drawHeadIcon(ctx: Ctx, id: CharacterId, size: number, skin: SkinId = 'none'): void {
  ctx.save();
  const s = size / 96;
  ctx.scale(s, s);
  ctx.translate(-18, 6);
  head(ctx, id, PAL[id], poseFor('idle0'), skin);
  ctx.restore();
}

/** Texture key for a character sheet with a skin. */
export const sheetKey = (id: CharacterId, skin: SkinId = 'none'): string =>
  skin === 'none' ? `player-${id}` : `player-${id}-${skin}`;
