/**
 * Every game sprite, drawn procedurally into canvases. Texture keys are stable so real art can
 * replace any of them later via public/assets/sprites/manifest.json (see PreloadScene).
 */
import { CHARACTERS, type CharacterId } from '../config/physics';
import { CHAR_FRAMES, CHAR_H, CHAR_W, drawCharacter, drawHeadIcon, sheetKey } from './characters';
import type { SkinId } from '../config/extras';
import {
  OUTLINE,
  box,
  circle,
  ellipse,
  fillStroke,
  limb,
  makeCanvas,
  poly,
  rr,
  seeded,
  star,
  text,
  type Ctx,
} from './draw';

export interface SpriteDef {
  key: string;
  w: number;
  h: number;
  frames?: number;
  draw: (ctx: Ctx, frame: number) => void;
}

const defs: SpriteDef[] = [];
const def = (key: string, w: number, h: number, draw: SpriteDef['draw'], frames = 1): void => {
  defs.push({ key, w, h, draw, frames });
};

// ------------------------------------------------------------------ pickups
def('coin', 26, 26, (c) => {
  circle(c, 13, 13, 10.5, '#FFD43B', 3);
  c.strokeStyle = '#B07A00';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(13, 13, 6.5, 0, Math.PI * 2);
  c.stroke();
  text(c, '₹', 13, 14, 9, '#B07A00', { font: 'Arial, sans-serif' });
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(8, 7, 3, 3);
});
def('heart', 24, 22, (c) => heartPath(c, '#FF5C5C'));
def('heartEmpty', 24, 22, (c) => heartPath(c, '#4A3F6B'));
def('chai', 26, 30, (c) => {
  // Kulhad (clay cup) with steam.
  poly(c, [4, 12, 22, 12, 19, 28, 7, 28], '#C2622D', 3);
  c.fillStyle = '#E9C8A0';
  c.fillRect(6, 13, 14, 3);
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(10, 9);
  c.quadraticCurveTo(7, 5, 10, 1);
  c.moveTo(16, 9);
  c.quadraticCurveTo(19, 5, 16, 1);
  c.stroke();
});
def('headphones', 30, 28, (c) => {
  c.beginPath();
  c.arc(15, 16, 11, Math.PI, 0);
  c.lineWidth = 8;
  c.strokeStyle = OUTLINE;
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = '#22D3EE';
  c.stroke();
  box(c, 1, 14, 9, 13, '#F06595', 3, 3);
  box(c, 20, 14, 9, 13, '#F06595', 3, 3);
});
def('coffee', 26, 30, (c) => {
  poly(c, [4, 9, 22, 9, 20, 28, 6, 28], '#FFFFFF', 3);
  c.fillStyle = '#8B5A2B';
  c.fillRect(6, 15, 14, 7);
  box(c, 3, 6, 20, 5, '#5C3A1E', 2.5, 2);
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(13, 4);
  c.quadraticCurveTo(10, 2, 13, 0);
  c.stroke();
});
def('idcard', 30, 24, (c) => {
  box(c, 2, 4, 26, 18, '#FFFFFF', 3, 3);
  c.fillStyle = '#22D3EE';
  c.fillRect(4, 6, 22, 5);
  circle(c, 9, 16, 3.5, '#C98B5B', 1.5);
  c.fillStyle = '#5A5470';
  c.fillRect(15, 14, 10, 2);
  c.fillRect(15, 18, 7, 2);
  c.strokeStyle = '#FF5C5C';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(15, 4);
  c.lineTo(15, 0);
  c.stroke();
});
def('appraisal', 34, 34, (c) => {
  const g = c.createRadialGradient(17, 17, 4, 17, 17, 17);
  g.addColorStop(0, 'rgba(255,212,59,0.9)');
  g.addColorStop(1, 'rgba(255,212,59,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 34, 34);
  box(c, 6, 6, 22, 22, '#FFF4CC', 2.5, 4);
  box(c, 9, 18, 4, 8, '#22C55E', 1.5);
  box(c, 15, 13, 4, 13, '#FFD43B', 1.5);
  box(c, 21, 9, 4, 17, '#F06595', 1.5);
});
def('spark', 8, 8, (c) => {
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.arc(4, 4, 3.5, 0, Math.PI * 2);
  c.fill();
});
def('px', 4, 4, (c) => {
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, 4, 4);
});
def('snow', 6, 6, (c) => {
  c.strokeStyle = '#E0F7FF';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(3, 0);
  c.lineTo(3, 6);
  c.moveTo(0, 3);
  c.lineTo(6, 3);
  c.stroke();
});

// ------------------------------------------------------------------ blocks
def('qblock', 40, 40, (c) => {
  box(c, 1.5, 1.5, 37, 37, '#FFC233', 3, 4);
  c.fillStyle = '#FFE08A';
  c.fillRect(5, 5, 30, 3);
  c.fillStyle = '#B07A00';
  for (const [x, y] of [
    [6, 6],
    [31, 6],
    [6, 31],
    [31, 31],
  ])
    c.fillRect(x, y, 3, 3);
});
def('qmark', 20, 24, (c) => text(c, '?', 10, 13, 18, '#FFFFFF', { stroke: 5 }));
def('usedblock', 40, 40, (c) => {
  box(c, 1.5, 1.5, 37, 37, '#9C6B3F', 3, 4);
  c.fillStyle = '#7A5230';
  for (const [x, y] of [
    [6, 6],
    [31, 6],
    [6, 31],
    [31, 31],
  ])
    c.fillRect(x, y, 3, 3);
});
def('brickblock', 40, 40, (c) => {
  box(c, 1.5, 1.5, 37, 37, '#C8553D', 3, 2);
  c.strokeStyle = '#7A2E1F';
  c.lineWidth = 2;
  c.beginPath();
  for (const y of [13, 26]) {
    c.moveTo(3, y);
    c.lineTo(37, y);
  }
  for (const [x, y0, y1] of [
    [20, 3, 13],
    [11, 13, 26],
    [29, 13, 26],
    [20, 26, 37],
  ]) {
    c.moveTo(x, y0);
    c.lineTo(x, y1);
  }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(4, 4, 14, 2);
});

// ------------------------------------------------------------------ enemies
def(
  'bug',
  44,
  32,
  (c, f) => {
    // 4-frame scuttle: legs alternate, body bobs.
    const lp = [3, 0, -3, 0][f];
    c.translate(0, [0, -1.5, 0, -1.5][f]);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = 14 + i * 8;
      c.beginPath();
      c.moveTo(x, 22);
      c.lineTo(x + (i % 2 === 0 ? lp : -lp) - 3, 30);
      c.stroke();
    }
    ellipse(c, 22, 18, 16, 11, '#7C3AED', 3);
    c.fillStyle = '#A78BFA';
    c.beginPath();
    c.ellipse(19, 14, 8, 4, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(22, 8);
    c.lineTo(22, 28);
    c.stroke();
    circle(c, 36, 16, 7, '#22C55E', 3);
    circle(c, 38, 14, 2.5, '#FFFFFF', 1);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(38, 10);
    c.lineTo(42, 2 + (f % 2 === 0 ? 0 : 2));
    c.moveTo(34, 10);
    c.lineTo(34, 2 + (f % 2 === 0 ? 2 : 0));
    c.stroke();
    text(c, '</>', 20, 20, 6, '#FFFFFF');
  },
  4,
);
// Stomped bug: flat as a pancake with spiral eyes.
def('bugSquash', 48, 16, (c) => {
  ellipse(c, 22, 10, 20, 5, '#7C3AED', 3);
  ellipse(c, 40, 10, 7, 4, '#22C55E', 2.5);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(41, 9, 2, 0, Math.PI * 1.6);
  c.stroke();
  c.lineWidth = 2;
  for (const x of [8, 18, 28]) {
    c.beginPath();
    c.moveTo(x, 13);
    c.lineTo(x - 5, 15);
    c.stroke();
  }
});
def('inviteTorn', 46, 32, (c) => {
  poly(c, [2, 8, 20, 6, 16, 18, 22, 30, 2, 28], '#FFFFFF', 3);
  poly(c, [26, 4, 44, 6, 42, 28, 24, 30, 30, 18], '#FFFFFF', 3);
  c.fillStyle = '#4DABF7';
  c.fillRect(5, 22, 12, 4);
  c.fillRect(28, 22, 12, 4);
});
def(
  'dog',
  56,
  38,
  (c, f) => {
    // 4-frame gallop: front and back legs out of phase, tail wags.
    const s = Math.sin((f / 4) * Math.PI * 2);
    const q = Math.cos((f / 4) * Math.PI * 2);
    c.translate(0, -Math.abs(s) * 1.5);
    limb(c, 16, 26, 14 + s * 5, 36, 5, '#C08A4B', 2.5);
    limb(c, 22, 26, 22 - s * 5, 36, 5, '#A0703A', 2.5);
    limb(c, 36, 26, 34 + q * 5, 36, 5, '#C08A4B', 2.5);
    limb(c, 42, 26, 42 - q * 5, 36, 5, '#A0703A', 2.5);
    // Curly tail (wagging).
    c.beginPath();
    c.arc(8, 14 + q * 2, 6, Math.PI * 0.2, Math.PI * 1.6);
    c.lineWidth = 7;
    c.strokeStyle = OUTLINE;
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = '#C08A4B';
    c.stroke();
    ellipse(c, 28, 22, 18, 9, '#C08A4B', 3);
    c.fillStyle = '#E8C48F';
    c.beginPath();
    c.ellipse(28, 26, 12, 4, 0, 0, Math.PI * 2);
    c.fill();
    // Head.
    ellipse(c, 45, 13, 10, 9, '#C08A4B', 3);
    ellipse(c, 53, 16, 5, 4, '#E8C48F', 2.5);
    circle(c, 57, 15, 2, OUTLINE, 0);
    poly(c, [38, 7, 41, 0, 45, 6], '#8A5A2B', 2.5);
    circle(c, 47, 11, 2, OUTLINE, 0);
    // Red collar.
    c.fillStyle = '#FF5C5C';
    c.fillRect(38, 18, 7, 3);
    // Tongue out on the stride.
    if (f % 2 === 1) {
      c.fillStyle = '#FF8FA3';
      c.fillRect(52, 19, 4, 5);
    }
  },
  4,
);
def('invite', 46, 32, (c) => {
  box(c, 2, 4, 40, 26, '#FFFFFF', 3, 3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(3, 6);
  c.lineTo(22, 19);
  c.lineTo(41, 6);
  c.stroke();
  c.fillStyle = '#4DABF7';
  c.fillRect(5, 24, 34, 4);
  circle(c, 39, 6, 6, '#FF5C5C', 2.5);
  text(c, '!', 39, 7, 7, '#FFFFFF');
});
def(
  'monkey',
  76,
  78,
  (c, f) => {
    const s = f === 0 ? 0 : 1;
    // Tail.
    c.beginPath();
    c.moveTo(14, 56);
    c.bezierCurveTo(-2, 50, 2, 20, 14, 26 + s * 4);
    c.lineWidth = 8;
    c.strokeStyle = OUTLINE;
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = '#8B5A2B';
    c.stroke();
    limb(c, 28, 60, 24 - s * 3, 74, 9, '#8B5A2B', 3);
    limb(c, 48, 60, 52 + s * 3, 74, 9, '#8B5A2B', 3);
    ellipse(c, 38, 50, 20, 18, '#8B5A2B', 3.5);
    ellipse(c, 38, 54, 11, 11, '#E8B98A', 0);
    limb(c, 22, 44, 12, 34 - s * 8, 8, '#8B5A2B', 3);
    limb(c, 54, 44, 64, 34 + s * 8, 8, '#8B5A2B', 3);
    // Head.
    circle(c, 18, 20, 7, '#E8B98A', 3);
    circle(c, 58, 20, 7, '#E8B98A', 3);
    circle(c, 38, 22, 19, '#8B5A2B', 3.5);
    ellipse(c, 38, 26, 14, 12, '#F2B8A0', 2.5);
    circle(c, 32, 21, 3.5, '#FFFFFF', 2);
    circle(c, 44, 21, 3.5, '#FFFFFF', 2);
    c.fillStyle = OUTLINE;
    c.fillRect(32, 21, 2, 2);
    c.fillRect(44, 21, 2, 2);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(38, 30, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
    // Stolen ID card on a lanyard.
    c.strokeStyle = '#FF5C5C';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(30, 38);
    c.lineTo(38, 48);
    c.lineTo(46, 38);
    c.stroke();
    box(c, 32, 46, 13, 10, '#FFFFFF', 2, 2);
    c.fillStyle = '#22D3EE';
    c.fillRect(34, 48, 9, 2);
  },
  2,
);
def('banana', 24, 16, (c) => {
  c.beginPath();
  c.moveTo(2, 4);
  c.quadraticCurveTo(12, 18, 22, 4);
  c.quadraticCurveTo(12, 11, 2, 4);
  fillStroke(c, '#FFE066', 2.5);
  c.fillStyle = '#5C3A1E';
  c.fillRect(20, 2, 3, 3);
});
def('brick', 26, 16, (c) => {
  box(c, 1.5, 1.5, 23, 13, '#C8553D', 2.5, 2);
  c.fillStyle = '#7A2E1F';
  c.fillRect(12, 2, 2, 12);
});
def(
  'coworker',
  40,
  64,
  (c, f) => {
    limb(c, 14, 44, 13, 60, 8, '#334155', 3);
    limb(c, 26, 44, 27, 60, 8, '#334155', 3);
    box(c, 8, 26, 24, 22, '#F8F9FA', 3, 6);
    c.fillStyle = '#4DABF7';
    c.fillRect(18, 28, 4, 16);
    limb(c, 10, 30, 2, f === 0 ? 40 : 30, 6, '#F8F9FA', 3);
    limb(c, 30, 30, 36, 40, 6, '#F8F9FA', 3);
    circle(c, 20, 14, 12, '#B97A4B', 3);
    c.fillStyle = '#2B2235';
    c.beginPath();
    c.arc(20, 10, 12, Math.PI, 0);
    c.fill();
    c.fillStyle = OUTLINE;
    c.fillRect(14, 14, 3, 3);
    c.fillRect(23, 14, 3, 3);
    // Glasses.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.5;
    c.strokeRect(12, 12, 7, 6);
    c.strokeRect(21, 12, 7, 6);
    // Lanyard + phone.
    box(c, 0, 32 + (f === 0 ? 6 : -4), 6, 10, '#343A40', 2, 1);
  },
  2,
);
def(
  'manager',
  124,
  134,
  (c, f) => {
    // Body (blazer, tie, belly).
    limb(c, 44, 100, 42, 130, 16, '#2B3245', 4);
    limb(c, 78, 100, 80, 130, 16, '#2B3245', 4);
    rr(c, 26, 56, 70, 60, 22);
    fillStroke(c, '#3B4A6B', 4);
    poly(c, [52, 58, 70, 58, 66, 96, 56, 96], '#FFFFFF', 3);
    poly(c, [58, 60, 64, 60, 66, 90, 61, 96, 56, 90], '#FF5C5C', 2.5);
    // Arms (phone to ear on frame 1).
    limb(c, 30, 66, 18, 100, 13, '#3B4A6B', 4);
    if (f === 0) limb(c, 92, 66, 106, 98, 13, '#3B4A6B', 4);
    else {
      limb(c, 92, 66, 100, 34, 13, '#3B4A6B', 4);
      box(c, 92, 16, 12, 22, '#212529', 3, 3);
    }
    // Head.
    circle(c, 62, 32, 26, '#C98B5B', 4);
    c.fillStyle = '#4B4B5C';
    c.beginPath();
    c.arc(62, 24, 26, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    // Moustache + eyes + glasses.
    c.fillStyle = '#2B2235';
    c.beginPath();
    c.ellipse(62, 44, 12, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.5;
    c.strokeRect(46, 28, 12, 9);
    c.strokeRect(66, 28, 12, 9);
    c.beginPath();
    c.moveTo(58, 32);
    c.lineTo(66, 32);
    c.stroke();
    c.fillStyle = OUTLINE;
    c.fillRect(51, 31, 3, 3);
    c.fillRect(71, 31, 3, 3);
    // Angry brows.
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(46, 22);
    c.lineTo(58, 26);
    c.moveTo(78, 22);
    c.lineTo(66, 26);
    c.stroke();
  },
  2,
);
def('laptop', 64, 34, (c) => {
  const g = c.createRadialGradient(32, 16, 4, 32, 16, 32);
  g.addColorStop(0, 'rgba(255,212,59,0.65)');
  g.addColorStop(1, 'rgba(255,212,59,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 34);
  poly(c, [12, 4, 52, 4, 54, 26, 10, 26], '#ADB5BD', 3);
  c.fillStyle = '#FFD43B';
  c.fillRect(16, 8, 32, 14);
  box(c, 4, 25, 56, 6, '#868E96', 3, 2);
  text(c, '📞', 32, 15, 9, '#000', { font: 'sans-serif' });
});
def('calendar', 28, 26, (c) => {
  box(c, 2, 4, 24, 20, '#FFFFFF', 2.5, 3);
  c.fillStyle = '#FF5C5C';
  c.fillRect(4, 6, 20, 5);
  c.fillStyle = OUTLINE;
  c.fillRect(8, 2, 2, 5);
  c.fillRect(18, 2, 2, 5);
  text(c, '9:30', 14, 17, 5, '#14121F');
});
def('paper', 24, 18, (c) => {
  box(c, 2, 2, 20, 14, '#FFFFFF', 2.5, 1);
  c.fillStyle = '#ADB5BD';
  for (const y of [6, 9, 12]) c.fillRect(5, y, 14, 1.5);
});
def('deadline', 22, 26, (c) => {
  box(c, 2, 2, 18, 22, '#FFF3BF', 2.5, 1);
  c.fillStyle = '#FF5C5C';
  c.fillRect(4, 5, 14, 3);
  text(c, '!!', 11, 16, 7, '#FF5C5C');
});
def('popcorn', 12, 12, (c) => {
  circle(c, 6, 6, 4.5, '#FFF9DB', 2);
  c.fillStyle = '#FFD43B';
  c.fillRect(5, 6, 3, 3);
});

// ------------------------------------------------------------------ vehicles, animals, people
def('bus', 150, 104, (c) => {
  box(c, 4, 6, 142, 82, '#2F9E44', 4, 10);
  c.fillStyle = '#FFD43B';
  c.fillRect(6, 58, 138, 8);
  for (let i = 0; i < 5; i++) box(c, 14 + i * 24, 16, 20, 26, '#A5D8FF', 3, 3);
  box(c, 126, 16, 16, 40, '#74C0FC', 3, 3);
  text(c, 'DTC', 40, 74, 10, '#FFFFFF', { stroke: 4 });
  circle(c, 32, 90, 12, '#343A40', 4);
  circle(c, 116, 90, 12, '#343A40', 4);
  circle(c, 32, 90, 4, '#ADB5BD', 0);
  circle(c, 116, 90, 4, '#ADB5BD', 0);
  circle(c, 8, 70, 4, '#FFE066', 2);
});
def('auto', 144, 104, (c) => {
  // Yellow canopy, green body: Delhi CNG auto.
  poly(c, [16, 10, 120, 10, 134, 40, 134, 76, 10, 76, 6, 40], '#FFD43B', 4);
  c.fillStyle = '#212529';
  c.fillRect(20, 30, 40, 28);
  c.fillRect(70, 30, 40, 28);
  box(c, 4, 56, 136, 30, '#2F9E44', 4, 8);
  text(c, 'DL 1R', 70, 70, 7, '#FFFFFF', { stroke: 3 });
  circle(c, 30, 90, 11, '#343A40', 4);
  circle(c, 114, 90, 11, '#343A40', 4);
  circle(c, 134, 64, 4, '#FFE066', 2);
});
def('cow', 104, 82, (c) => {
  limb(c, 22, 60, 22, 78, 9, '#F8F9FA', 3);
  limb(c, 34, 60, 34, 78, 9, '#F8F9FA', 3);
  limb(c, 70, 60, 70, 78, 9, '#F8F9FA', 3);
  limb(c, 82, 60, 82, 78, 9, '#F8F9FA', 3);
  ellipse(c, 52, 44, 40, 22, '#F8F9FA', 4);
  c.fillStyle = '#343A40';
  c.beginPath();
  c.ellipse(40, 38, 10, 8, 0.3, 0, Math.PI * 2);
  c.ellipse(66, 48, 8, 6, -0.2, 0, Math.PI * 2);
  c.fill();
  // Head on the left (cow faces the player).
  ellipse(c, 14, 30, 13, 15, '#F8F9FA', 4);
  ellipse(c, 10, 40, 9, 6, '#FFC9C9', 3);
  poly(c, [6, 16, 2, 6, 10, 14], '#E9C8A0', 2.5);
  poly(c, [20, 16, 26, 6, 22, 16], '#E9C8A0', 2.5);
  circle(c, 9, 26, 2, OUTLINE, 0);
  circle(c, 18, 26, 2, OUTLINE, 0);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(92, 36);
  c.quadraticCurveTo(100, 50, 96, 60);
  c.stroke();
});
for (let look = 0; look < 3; look++) {
  const shirt = ['#F06595', '#4DABF7', '#FAB005'][look];
  def(`person${look}`, 44, 74, (c) => {
    limb(c, 16, 50, 16, 70, 8, '#343A40', 3);
    limb(c, 28, 50, 28, 70, 8, '#343A40', 3);
    box(c, 8, 28, 28, 26, shirt, 3, 7);
    circle(c, 22, 16, 12, ['#C98B5B', '#8D5524', '#E0AC69'][look], 3);
    c.fillStyle = '#2B2235';
    c.beginPath();
    c.arc(22, 12, 12, Math.PI * 1.1, Math.PI * 1.9 + (look === 1 ? 0.3 : 0));
    c.fill();
    // Phone glow: everyone in the queue is on their phone.
    box(c, 30, 34, 7, 11, '#22D3EE', 2, 2);
  });
}
def('guard', 44, 84, (c) => {
  limb(c, 16, 58, 16, 80, 9, '#2B3245', 3);
  limb(c, 28, 58, 28, 80, 9, '#2B3245', 3);
  box(c, 8, 32, 28, 30, '#5C7CFA', 3, 6);
  c.fillStyle = '#FFD43B';
  c.fillRect(12, 38, 6, 4);
  circle(c, 22, 20, 12, '#A86E44', 3);
  box(c, 8, 4, 28, 10, '#2B3245', 3, 3);
  c.fillStyle = '#2B2235';
  c.fillRect(16, 24, 12, 3);
});

// ------------------------------------------------------------------ level props
def('flagGrey', 46, 30, (c) => poly(c, [2, 2, 44, 14, 2, 28], '#ADB5BD', 3));
def('flagGreen', 46, 30, (c) => {
  poly(c, [2, 2, 44, 14, 2, 28], '#40C057', 3);
  text(c, 'SAVE', 18, 15, 6, '#FFFFFF', { stroke: 2 });
});
def('cloth-shirt', 64, 44, (c) => {
  poly(c, [10, 4, 22, 0, 32, 6, 42, 0, 54, 4, 62, 16, 52, 20, 50, 42, 14, 42, 12, 20, 2, 16], '#F06595', 3);
  c.fillStyle = '#FFFFFF';
  c.fillRect(30, 10, 4, 28);
});
def('cloth-dress', 64, 50, (c) => {
  poly(c, [20, 0, 44, 0, 42, 16, 58, 48, 6, 48, 22, 16], '#7C3AED', 3);
  c.fillStyle = '#FFD43B';
  for (const [x, y] of [
    [24, 30],
    [36, 36],
    [44, 26],
    [30, 42],
  ]) {
    c.beginPath();
    c.arc(x, y, 2.5, 0, Math.PI * 2);
    c.fill();
  }
});
def('liftCabin', 110, 120, (c) => {
  c.fillStyle = 'rgba(173,181,189,0.35)';
  c.fillRect(6, 6, 98, 96);
  box(c, 2, 2, 106, 10, '#868E96', 3, 2);
  box(c, 2, 2, 8, 104, '#868E96', 3, 2);
  box(c, 100, 2, 8, 104, '#868E96', 3, 2);
  box(c, 2, 100, 106, 18, '#495057', 3, 2);
  c.fillStyle = '#FFD43B';
  c.fillRect(48, 104, 14, 4);
});
def('liftCabinFull', 110, 120, (c) => {
  c.fillStyle = 'rgba(255,92,92,0.3)';
  c.fillRect(6, 6, 98, 96);
  box(c, 2, 2, 106, 10, '#C92A2A', 3, 2);
  box(c, 2, 2, 8, 104, '#C92A2A', 3, 2);
  box(c, 100, 2, 8, 104, '#C92A2A', 3, 2);
  box(c, 2, 100, 106, 18, '#862E2E', 3, 2);
  // Crowd silhouettes.
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 22;
    c.fillStyle = ['#2B2235', '#3B4A6B', '#343A40', '#5C1A1A'][i];
    c.beginPath();
    c.arc(x, 50, 9, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x - 10, 60, 20, 40);
  }
  text(c, 'FULL', 55, 22, 8, '#FFFFFF', { stroke: 3 });
});
def('chair', 74, 56, (c) => {
  box(c, 50, 2, 16, 30, '#343A40', 3, 4);
  box(c, 4, 30, 66, 12, '#495057', 3, 4);
  limb(c, 37, 42, 37, 48, 5, '#868E96', 2);
  limb(c, 14, 50, 60, 50, 4, '#868E96', 2);
  circle(c, 14, 52, 4, '#212529', 2);
  circle(c, 37, 52, 4, '#212529', 2);
  circle(c, 60, 52, 4, '#212529', 2);
});
def('printer', 54, 64, (c) => {
  box(c, 2, 20, 50, 36, '#DEE2E6', 3, 5);
  box(c, 8, 8, 38, 16, '#ADB5BD', 3, 3);
  c.fillStyle = '#212529';
  c.fillRect(4, 36, 10, 4);
  circle(c, 44, 28, 3, '#40C057', 1.5);
  box(c, 10, 56, 34, 6, '#868E96', 2, 1);
});
def('microwave', 54, 40, (c) => {
  box(c, 2, 2, 50, 36, '#F1F3F5', 3, 4);
  box(c, 6, 7, 32, 26, '#343A40', 2.5, 3);
  c.fillStyle = 'rgba(255,212,59,0.5)';
  c.fillRect(9, 10, 26, 20);
  c.fillStyle = '#40C057';
  c.fillRect(42, 8, 7, 4);
  for (const y of [16, 22, 28]) circle(c, 45, y, 1.8, '#868E96', 1);
});
def('fridge', 74, 164, (c) => {
  box(c, 3, 3, 68, 158, '#E9ECEF', 4, 6);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(4, 56);
  c.lineTo(70, 56);
  c.stroke();
  box(c, 56, 20, 6, 24, '#ADB5BD', 2, 2);
  box(c, 56, 70, 6, 40, '#ADB5BD', 2, 2);
  // Fridge magnets.
  for (const [x, y, col] of [
    [16, 80, '#F06595'],
    [28, 96, '#FFD43B'],
    [18, 120, '#22D3EE'],
  ] as const)
    box(c, x, y, 8, 8, col, 1.5, 2);
});
def('cooler', 54, 104, (c) => {
  box(c, 8, 44, 38, 58, '#DEE2E6', 3, 4);
  ellipse(c, 27, 24, 17, 22, '#74C0FC', 3);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(18, 10, 5, 22);
  box(c, 14, 56, 8, 6, '#FF5C5C', 2, 1);
  box(c, 32, 56, 8, 6, '#4DABF7', 2, 1);
});
def('biometric', 64, 94, (c) => {
  box(c, 8, 2, 48, 64, '#868E96', 3, 6);
  box(c, 14, 8, 36, 16, '#0B0D17', 2.5, 2);
  box(c, 20, 32, 24, 26, '#495057', 2.5, 4);
  c.strokeStyle = '#22D3EE';
  c.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.ellipse(32, 46, 3 + i * 2.5, 4 + i * 2.5, 0, Math.PI, Math.PI * 2);
    c.stroke();
  }
  box(c, 26, 66, 12, 26, '#495057', 3, 2);
});
def('turnstile', 30, 84, (c) => {
  box(c, 2, 2, 26, 80, '#ADB5BD', 3, 4);
  box(c, 6, 10, 18, 10, '#0B0D17', 2, 2);
  c.fillStyle = '#FF5C5C';
  c.fillRect(9, 13, 12, 4);
});
def('turnstileOpen', 30, 84, (c) => {
  box(c, 2, 2, 26, 80, '#ADB5BD', 3, 4);
  box(c, 6, 10, 18, 10, '#0B0D17', 2, 2);
  c.fillStyle = '#40C057';
  c.fillRect(9, 13, 12, 4);
});
def('padlock', 30, 34, (c) => {
  c.beginPath();
  c.arc(15, 14, 8, Math.PI, 0);
  c.lineWidth = 7;
  c.strokeStyle = OUTLINE;
  c.stroke();
  c.lineWidth = 3.5;
  c.strokeStyle = '#ADB5BD';
  c.stroke();
  box(c, 3, 14, 24, 18, '#FFD43B', 3, 3);
  circle(c, 15, 22, 3, OUTLINE, 0);
});
def('doorPanel', 60, 160, (c) => {
  box(c, 2, 2, 56, 156, '#ADB5BD', 3, 2);
  box(c, 10, 14, 40, 70, '#A5D8FF', 3, 2);
  c.fillStyle = '#FF5C5C';
  c.fillRect(6, 100, 48, 6);
});
def('sun', 120, 120, (c) => {
  const g = c.createRadialGradient(60, 60, 20, 60, 60, 60);
  g.addColorStop(0, 'rgba(255,236,153,0.9)');
  g.addColorStop(1, 'rgba(255,236,153,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 120, 120);
  circle(c, 60, 60, 30, '#FFE066', 0);
  c.strokeStyle = '#FFD43B';
  c.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(60 + Math.cos(a) * 36, 60 + Math.sin(a) * 36);
    c.lineTo(60 + Math.cos(a) * 46, 60 + Math.sin(a) * 46);
    c.stroke();
  }
});
for (let i = 0; i < 3; i++) {
  def(`cloud${i}`, 160, 70, (c) => {
    const r = seeded(11 + i);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.beginPath();
    for (let k = 0; k < 6; k++) c.arc(30 + k * 20 + r() * 8, 42 - r() * 18, 16 + r() * 12, 0, Math.PI * 2);
    c.fill();
    c.fillRect(20, 42, 120, 20);
  });
}
def('stripe', 20, 18, (c) => {
  c.fillStyle = '#FFD43B';
  c.fillRect(0, 0, 20, 18);
  c.fillStyle = '#14121F';
  c.beginPath();
  c.moveTo(0, 18);
  c.lineTo(10, 0);
  c.lineTo(20, 0);
  c.lineTo(10, 18);
  c.closePath();
  c.fill();
  c.fillRect(0, 0, 20, 2);
  c.fillRect(0, 16, 20, 2);
});
def('chevron', 30, 16, (c) => {
  c.fillStyle = '#495057';
  c.fillRect(0, 0, 30, 16);
  c.fillStyle = '#FFD43B';
  c.beginPath();
  c.moveTo(18, 3);
  c.lineTo(10, 8);
  c.lineTo(18, 13);
  c.lineTo(22, 13);
  c.lineTo(14, 8);
  c.lineTo(22, 3);
  c.closePath();
  c.fill();
  c.fillStyle = '#14121F';
  c.fillRect(0, 0, 30, 2);
  c.fillRect(0, 14, 30, 2);
});
def('ring', 26, 20, (c) => {
  for (const [r, col] of [
    [12, '#F06595'],
    [8, '#FFD43B'],
    [4, '#FFFFFF'],
  ] as const) {
    c.beginPath();
    c.ellipse(13, 20, r, r * 1.5, 0, Math.PI, Math.PI * 2);
    c.lineWidth = 3;
    c.strokeStyle = col;
    c.stroke();
  }
});
def('wetSign', 36, 60, (c) => {
  poly(c, [18, 2, 34, 56, 2, 56], '#FFD43B', 3);
  text(c, '!', 18, 36, 14, '#14121F');
});
def('monitor', 60, 46, (c) => {
  box(c, 4, 2, 52, 34, '#212529', 3, 3);
  c.fillStyle = '#4DABF7';
  c.fillRect(9, 7, 42, 24);
  c.fillStyle = '#FFFFFF';
  for (const [y, w] of [
    [11, 24],
    [16, 32],
    [21, 18],
    [26, 28],
  ] as const)
    c.fillRect(12, y, w, 2);
  box(c, 26, 36, 8, 6, '#495057', 2, 0);
  box(c, 16, 41, 28, 4, '#495057', 2, 1);
});
def('confetti', 8, 5, (c) => {
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, 8, 5);
});
def('star', 40, 40, (c) => star(c, 20, 21, 17, '#FFD43B', 3.5));
def('dpad', 4, 4, (c) => {
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, 4, 4);
});

// ------------------------------------------------------------------ Level 3: lunch break
def(
  'aunty',
  124,
  134,
  (c, f) => {
    // Saree + apron, hair bun, ladle in hand.
    limb(c, 46, 104, 44, 132, 14, '#7A1F5C', 4);
    limb(c, 78, 104, 80, 132, 14, '#7A1F5C', 4);
    rr(c, 24, 54, 76, 66, 26);
    fillStroke(c, '#C2255C', 4);
    // Saree pallu stripe.
    poly(c, [30, 58, 50, 56, 96, 116, 76, 118], '#FFD43B', 3);
    // Apron.
    rr(c, 40, 76, 44, 44, 8);
    fillStroke(c, '#F8F9FA', 3);
    c.fillStyle = '#FF8787';
    c.fillRect(46, 84, 32, 3);
    // Arms: ladle up on frame 1.
    limb(c, 28, 66, 16, 100, 12, '#C98B5B', 4);
    if (f === 0) limb(c, 96, 66, 108, 96, 12, '#C98B5B', 4);
    else {
      limb(c, 96, 66, 104, 34, 12, '#C98B5B', 4);
      limb(c, 104, 34, 112, 8, 5, '#ADB5BD', 2.5);
      ellipse(c, 113, 6, 9, 6, '#ADB5BD', 3);
    }
    // Head.
    circle(c, 62, 32, 25, '#B97A4B', 4);
    circle(c, 62, 4, 12, '#2B2235', 3);
    c.fillStyle = '#2B2235';
    c.beginPath();
    c.arc(62, 26, 26, Math.PI * 1.02, Math.PI * 1.98);
    c.fill();
    // Bindi, eyes, smile-scowl.
    circle(c, 62, 20, 3, '#FF2D55', 0);
    c.fillStyle = OUTLINE;
    c.fillRect(50, 30, 4, 4);
    c.fillRect(70, 30, 4, 4);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(47, 24);
    c.lineTo(56, 27);
    c.moveTo(77, 24);
    c.lineTo(68, 27);
    c.stroke();
    c.beginPath();
    c.arc(62, 44, 7, 0.1 * Math.PI, 0.9 * Math.PI);
    c.stroke();
    // Gold earrings.
    circle(c, 37, 38, 4, '#FFD43B', 2);
    circle(c, 87, 38, 4, '#FFD43B', 2);
  },
  2,
);
def('cooker', 64, 40, (c) => {
  const g = c.createRadialGradient(32, 22, 4, 32, 22, 32);
  g.addColorStop(0, 'rgba(255,212,59,0.65)');
  g.addColorStop(1, 'rgba(255,212,59,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 40);
  rr(c, 12, 14, 40, 22, 8);
  fillStroke(c, '#CED4DA', 3);
  box(c, 16, 9, 32, 7, '#868E96', 3, 3);
  box(c, 29, 2, 6, 8, '#343A40', 2, 2);
  limb(c, 50, 22, 62, 20, 5, '#343A40', 2);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fillRect(17, 18, 6, 12);
});
def('roti', 28, 28, (c) => {
  circle(c, 14, 14, 12, '#E8B96A', 3);
  c.fillStyle = '#B07A3A';
  for (const [x, y] of [
    [9, 10],
    [17, 8],
    [15, 17],
    [8, 18],
    [20, 15],
  ] as const) {
    c.beginPath();
    c.arc(x, y, 2, 0, Math.PI * 2);
    c.fill();
  }
});
def('sambar', 30, 20, (c) => {
  c.beginPath();
  c.moveTo(0, 20);
  c.quadraticCurveTo(6, 2, 15, 8);
  c.quadraticCurveTo(24, 0, 30, 20);
  c.closePath();
  fillStroke(c, '#E8590C', 2.5);
  c.fillStyle = '#FFA94D';
  c.fillRect(8, 12, 4, 4);
  c.fillRect(18, 10, 3, 3);
});
def('chilli', 18, 28, (c) => {
  c.beginPath();
  c.moveTo(9, 4);
  c.quadraticCurveTo(18, 14, 10, 27);
  c.quadraticCurveTo(4, 16, 9, 4);
  fillStroke(c, '#E03131', 2.5);
  limb(c, 9, 4, 12, 0, 3, '#2F9E44', 1.5);
});
def('tray', 100, 18, (c) => {
  box(c, 1.5, 3, 97, 13, '#4DABF7', 3, 4);
  for (const x of [12, 40, 68]) {
    c.fillStyle = '#E7F5FF';
    c.beginPath();
    c.arc(x + 8, 9, 6, 0, Math.PI * 2);
    c.fill();
  }
});
def('plate', 28, 12, (c) => {
  ellipse(c, 14, 6, 12, 4.5, '#F8F9FA', 2.5);
  ellipse(c, 14, 6, 6, 2, '#DEE2E6', 0);
});
def('oil', 10, 10, (c) => {
  c.beginPath();
  c.moveTo(5, 0);
  c.quadraticCurveTo(10, 7, 5, 10);
  c.quadraticCurveTo(0, 7, 5, 0);
  fillStroke(c, '#FAB005', 1.5);
});
def('tawa', 64, 40, (c) => {
  box(c, 6, 24, 52, 14, '#495057', 3, 3);
  ellipse(c, 32, 20, 26, 7, '#212529', 3);
  c.fillStyle = 'rgba(255,120,40,0.6)';
  c.fillRect(14, 30, 36, 4);
  circle(c, 32, 18, 7, '#E8B96A', 2);
});
def('plateStack', 60, 120, (c) => {
  for (let i = 0; i < 9; i++) ellipse(c, 30, 112 - i * 12, 26, 6, i % 2 ? '#F1F3F5' : '#FFFFFF', 2.5);
});

// ------------------------------------------------------------------ ambient life
def(
  'bird',
  24,
  14,
  (c, f) => {
    c.strokeStyle = '#2B2235';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    const up = f === 0 ? -5 : 4;
    c.moveTo(2, 7 + up);
    c.quadraticCurveTo(7, 5, 12, 8);
    c.quadraticCurveTo(17, 5, 22, 7 + up);
    c.stroke();
  },
  2,
);
def('kite', 40, 70, (c) => {
  poly(c, [20, 2, 37, 22, 20, 44, 3, 22], '#F06595', 3);
  poly(c, [20, 2, 37, 22, 20, 22], '#FFD43B', 0);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(20, 2);
  c.lineTo(20, 44);
  c.moveTo(3, 22);
  c.lineTo(37, 22);
  c.stroke();
  c.strokeStyle = '#FFFFFF';
  c.beginPath();
  c.moveTo(20, 44);
  c.quadraticCurveTo(28, 56, 18, 68);
  c.stroke();
});
for (let look = 0; look < 3; look++) {
  const shirt = ['#4DABF7', '#F783AC', '#FFA94D'][look];
  def(
    `walker${look}`,
    30,
    56,
    (c, f) => {
      const s = f === 0 ? 4 : -4;
      limb(c, 12, 36, 12 + s, 54, 6, '#343A40', 2.5);
      limb(c, 18, 36, 18 - s, 54, 6, '#495057', 2.5);
      box(c, 7, 18, 16, 22, shirt, 2.5, 5);
      circle(c, 15, 10, 8, ['#C98B5B', '#8D5524', '#E0AC69'][look], 2.5);
      c.fillStyle = '#2B2235';
      c.beginPath();
      c.arc(15, 7, 8, Math.PI, 0);
      c.fill();
      if (look === 1) {
        // Tiffin box.
        box(c, 20, 30, 8, 10, '#ADB5BD', 2, 1);
      }
    },
    2,
  );
}
def('steam', 20, 20, (c) => {
  const g = c.createRadialGradient(10, 10, 1, 10, 10, 10);
  g.addColorStop(0, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 20, 20);
});
def('raindrop', 4, 18, (c) => {
  c.fillStyle = 'rgba(200,230,255,0.75)';
  c.fillRect(1, 0, 2, 18);
});
def('heartPiece', 12, 12, (c) => poly(c, [1, 1, 11, 3, 6, 11], '#FF5C5C', 2));
def('glow', 128, 128, (c) => {
  const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,140,0.75)');
  g.addColorStop(0.5, 'rgba(255,170,80,0.25)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
});
def('sunrays', 480, 540, (c) => {
  for (let i = 0; i < 5; i++) {
    const g = c.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, 'rgba(255,236,170,0.32)');
    g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g;
    c.beginPath();
    const x = 60 + i * 90;
    c.moveTo(x, 0);
    c.lineTo(x + 40, 0);
    c.lineTo(x - 80 + 40, 540);
    c.lineTo(x - 140, 540);
    c.closePath();
    c.fill();
  }
});
// Foreground silhouettes (parallax layer in front of the player).
def('fgPole', 60, 540, (c) => {
  c.fillStyle = '#1A1530';
  c.fillRect(24, 0, 12, 540);
  c.fillRect(0, 60, 60, 8);
  c.fillRect(6, 90, 48, 6);
});
def('fgPlant', 120, 140, (c) => {
  c.fillStyle = '#1A1530';
  for (let i = 0; i < 7; i++) {
    c.save();
    c.translate(60, 140);
    c.rotate(-1.2 + i * 0.4);
    c.beginPath();
    c.ellipse(0, -60, 14, 60, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
});
def('fgDesk', 200, 120, (c) => {
  c.fillStyle = '#1A1530';
  c.fillRect(0, 20, 200, 16);
  c.fillRect(10, 36, 12, 84);
  c.fillRect(178, 36, 12, 84);
  c.fillRect(60, 0, 70, 22);
});
def('alarmClock', 60, 64, (c) => {
  circle(c, 12, 12, 10, '#FFD43B', 3);
  circle(c, 48, 12, 10, '#FFD43B', 3);
  circle(c, 30, 36, 24, '#FF5C5C', 4);
  circle(c, 30, 36, 17, '#FFFFFF', 3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(30, 36);
  c.lineTo(30, 24);
  c.moveTo(30, 36);
  c.lineTo(38, 40);
  c.stroke();
  limb(c, 14, 56, 10, 62, 4, '#343A40', 2);
  limb(c, 46, 56, 50, 62, 4, '#343A40', 2);
});
def('bed', 200, 80, (c) => {
  box(c, 4, 30, 192, 34, '#8B5A2B', 4, 6);
  box(c, 4, 4, 22, 72, '#6E4520', 4, 4);
  box(c, 12, 22, 180, 16, '#F8F9FA', 3, 6);
  box(c, 22, 14, 46, 20, '#A5D8FF', 3, 8);
  box(c, 70, 18, 120, 18, '#7C3AED', 3, 6);
  limb(c, 180, 64, 180, 78, 6, '#6E4520', 2);
});
def('speedline', 60, 4, (c) => {
  const g = c.createLinearGradient(0, 0, 60, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  c.fillStyle = g;
  c.fillRect(0, 0, 60, 4);
});

function heartPath(c: Ctx, fill: string): void {
  c.beginPath();
  c.moveTo(12, 20);
  c.bezierCurveTo(2, 13, 0, 6, 5, 3);
  c.bezierCurveTo(9, 0, 12, 4, 12, 6);
  c.bezierCurveTo(12, 4, 15, 0, 19, 3);
  c.bezierCurveTo(24, 6, 22, 13, 12, 20);
  c.closePath();
  fillStroke(c, fill, 2.5);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(6, 6, 3, 3);
}

// ------------------------------------------------------------------ registration

export interface TextureHost {
  exists(key: string): boolean;
  addCanvas(
    key: string,
    canvas: HTMLCanvasElement,
  ): {
    add(name: string | number, source: number, x: number, y: number, w: number, h: number): unknown;
  } | null;
}

/** Create all procedural textures that have not been provided as real art. */
export function registerSprites(textures: TextureHost): void {
  for (const d of defs) {
    if (textures.exists(d.key)) continue;
    const frames = d.frames ?? 1;
    const { canvas, ctx } = makeCanvas(d.w * frames, d.h);
    for (let f = 0; f < frames; f++) {
      ctx.save();
      ctx.translate(f * d.w, 0);
      d.draw(ctx, f);
      ctx.restore();
    }
    const tex = textures.addCanvas(d.key, canvas);
    if (tex && frames > 1) for (let f = 0; f < frames; f++) tex.add(f, 0, f * d.w, 0, d.w, d.h);
  }
  for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
    ensureCharacter(textures, id, 'none');
  }
}

/** Build (once) the sprite sheet and head icon for a character + skin. */
export function ensureCharacter(textures: TextureHost, id: CharacterId, skin: SkinId): void {
  const key = sheetKey(id, skin);
  if (!textures.exists(key)) {
    const { canvas, ctx } = makeCanvas(CHAR_W * CHAR_FRAMES.length, CHAR_H);
    CHAR_FRAMES.forEach((_, i) => drawCharacter(ctx, id, CHAR_FRAMES[i], i * CHAR_W, 0, skin));
    const tex = textures.addCanvas(key, canvas);
    CHAR_FRAMES.forEach((name, i) => tex?.add(name, 0, i * CHAR_W, 0, CHAR_W, CHAR_H));
  }
  const headKey = skin === 'none' ? `head-${id}` : `head-${id}-${skin}`;
  if (!textures.exists(headKey)) {
    const { canvas, ctx } = makeCanvas(64, 64);
    drawHeadIcon(ctx, id, 64, skin);
    textures.addCanvas(headKey, canvas);
  }
}

/** Head icon as a data URL for DOM use (header, character cards). */
export function headDataUrl(id: CharacterId, size = 64, skin: SkinId = 'none'): string {
  const { canvas, ctx } = makeCanvas(size, size);
  drawHeadIcon(ctx, id, size, skin);
  return canvas.toDataURL();
}

/** Full-body portrait as a data URL (character select cards, promotion screen). */
export function portraitDataUrl(
  id: CharacterId,
  frame: (typeof CHAR_FRAMES)[number] = 'idle0',
  skin: SkinId = 'none',
): string {
  const { canvas, ctx } = makeCanvas(CHAR_W, CHAR_H);
  drawCharacter(ctx, id, frame, 0, 0, skin);
  return canvas.toDataURL();
}

/** Darkness overlay: 660x380 drawn with a soft hole; scaled 3x it covers the screen with a 180 px light. */
export function darknessCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(660, 380);
  ctx.fillStyle = 'rgba(5,6,12,0.88)';
  ctx.fillRect(0, 0, 660, 380);
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createRadialGradient(330, 190, 10, 330, 190, 60);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 660, 380);
  return canvas;
}
