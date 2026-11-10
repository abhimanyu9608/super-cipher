/** Ground textures and per-zone backdrop art (parallax layer 6), painted once per level. */
import type { MapObject } from '../level/map';
import {
  OUTLINE,
  box,
  circle,
  ellipse,
  limb,
  makeCanvas,
  poly,
  rr,
  fillStroke,
  seeded,
  shade,
  text,
  type Ctx,
} from './draw';

export type GroundTex =
  | 'wood'
  | 'crate'
  | 'grass'
  | 'asphalt'
  | 'dirt'
  | 'roof'
  | 'tile'
  | 'marble'
  | 'steel'
  | 'carpet'
  | 'pantry'
  | 'server'
  | 'boardroom'
  | 'fridge';

/** Paint a ground solid of the given size. */
export function paintGround(tex: string, w: number, h: number, seed = 1): HTMLCanvasElement {
  const { canvas, ctx: c } = makeCanvas(w, h);
  const r = seeded(seed * 97 + w);
  switch (tex as GroundTex) {
    case 'wood': {
      c.fillStyle = '#B5763C';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#7A4A1E';
      c.lineWidth = 2;
      for (let y = 14; y < h; y += 16) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
        const off = (y / 16) % 2 === 0 ? 0 : 40;
        for (let x = off; x < w; x += 80) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 16);
          c.stroke();
        }
      }
      c.fillStyle = '#D69A5C';
      c.fillRect(0, 0, w, 6);
      break;
    }
    case 'crate': {
      for (let y = 0; y < h; y += 40) {
        c.save();
        box(c, 1.5, y + 1.5, w - 3, 37, '#C98A4B', 3, 3);
        c.strokeStyle = '#7A4A1E';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(5, y + 5);
        c.lineTo(w - 5, y + 35);
        c.moveTo(w - 5, y + 5);
        c.lineTo(5, y + 35);
        c.stroke();
        c.strokeRect(5, y + 5, w - 10, 30);
        c.restore();
      }
      return canvas;
    }
    case 'grass': {
      c.fillStyle = '#C8553D';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8F3524';
      c.lineWidth = 2;
      for (let y = 14; y < h; y += 16) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
        const off = (Math.floor(y / 16) % 2) * 20;
        for (let x = off; x < w; x += 40) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 16);
          c.stroke();
        }
      }
      c.fillStyle = '#45B145';
      c.fillRect(0, 0, w, 14);
      c.fillStyle = '#6FD36F';
      c.fillRect(0, 0, w, 5);
      c.fillStyle = '#45B145';
      for (let x = 0; x < w; x += 12) {
        c.beginPath();
        c.moveTo(x, 14);
        c.lineTo(x + 6, 20);
        c.lineTo(x + 12, 14);
        c.fill();
      }
      break;
    }
    case 'asphalt': {
      c.fillStyle = '#3D3D46';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < w / 6; i++) {
        c.fillStyle = r() > 0.5 ? '#46464F' : '#35353D';
        c.fillRect(r() * w, 14 + r() * (h - 14), 3, 2);
      }
      for (let x = 0; x < w; x += 40) {
        c.fillStyle = (x / 40) % 2 === 0 ? '#FFD43B' : '#14121F';
        c.fillRect(x, 0, 40, 10);
      }
      c.fillStyle = '#FFFFFF';
      for (let x = 20; x < w; x += 120) c.fillRect(x, 40, 60, 6);
      break;
    }
    case 'dirt': {
      c.fillStyle = '#8B5A2B';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < (w * h) / 300; i++) {
        c.fillStyle = r() > 0.5 ? '#A0703A' : '#6E4520';
        c.beginPath();
        c.arc(r() * w, 8 + r() * h, 2 + r() * 3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#6E4520';
      c.fillRect(0, 0, w, 8);
      break;
    }
    case 'roof': {
      c.fillStyle = '#C9B79C';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#B3A184';
      for (let y = 30; y < h; y += 40) c.fillRect(0, y, w, 3);
      for (let i = 0; i < w / 50; i++) {
        c.fillStyle = 'rgba(90,70,50,0.15)';
        c.beginPath();
        c.ellipse(r() * w, 20 + r() * (h - 20), 10 + r() * 20, 4 + r() * 6, 0, 0, Math.PI * 2);
        c.fill();
      }
      // Parapet.
      c.fillStyle = '#E8DCC8';
      c.fillRect(0, 0, w, 10);
      c.fillStyle = '#9C8B70';
      c.fillRect(0, 10, w, 3);
      // Windows on the building face.
      for (let y = 40; y < h - 20; y += 60)
        for (let x = 24; x < w - 30; x += 70) {
          box(c, x, y, 30, 34, r() > 0.4 ? '#FFE8A3' : '#5C7CFA', 2.5, 2);
          c.fillStyle = OUTLINE;
          c.fillRect(x + 14, y, 2, 34);
        }
      break;
    }
    case 'tile': {
      for (let y = 0; y < h; y += 20)
        for (let x = 0; x < w; x += 20) {
          c.fillStyle = (x / 20 + y / 20) % 2 === 0 ? '#E9ECEF' : '#CED4DA';
          c.fillRect(x, y, 20, 20);
        }
      c.fillStyle = '#FFD43B';
      c.fillRect(0, 0, w, 8);
      c.fillStyle = '#E0B000';
      for (let x = 4; x < w; x += 8) c.fillRect(x, 2, 3, 3);
      break;
    }
    case 'marble': {
      c.fillStyle = '#E9ECEF';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(134,142,150,0.5)';
      c.lineWidth = 1.5;
      for (let i = 0; i < w / 60; i++) {
        c.beginPath();
        let x = r() * w;
        let y = 8;
        c.moveTo(x, y);
        while (y < h) {
          x += (r() - 0.5) * 24;
          y += 8 + r() * 10;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      c.fillStyle = '#ADB5BD';
      for (let x = 0; x < w; x += 80) c.fillRect(x, 0, 2, h);
      c.fillStyle = '#F8F9FA';
      c.fillRect(0, 0, w, 6);
      break;
    }
    case 'steel': {
      c.fillStyle = '#495057';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5C636A';
      for (let y = 0; y < h; y += 40) c.fillRect(0, y, w, 18);
      c.fillStyle = '#ADB5BD';
      for (let y = 10; y < h; y += 40) for (let x = 10; x < w; x += 30) c.fillRect(x, y, 3, 3);
      c.fillStyle = '#FFD43B';
      c.fillRect(0, 0, w, 8);
      break;
    }
    case 'carpet': {
      c.fillStyle = '#1C5D99';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#2470B5';
      for (let y = 10; y < h; y += 14)
        for (let x = (y / 14) % 2 === 0 ? 0 : 7; x < w; x += 14) c.fillRect(x, y, 4, 4);
      c.fillStyle = '#495057';
      c.fillRect(0, 0, w, 7);
      break;
    }
    case 'pantry': {
      for (let y = 0; y < h; y += 24)
        for (let x = 0; x < w; x += 24) {
          c.fillStyle = (x / 24 + y / 24) % 2 === 0 ? '#F1F3F5' : '#DEE2E6';
          c.fillRect(x, y, 24, 24);
        }
      c.fillStyle = '#868E96';
      c.fillRect(0, 0, w, 6);
      break;
    }
    case 'server': {
      c.fillStyle = '#12141F';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1F2433';
      c.lineWidth = 2;
      for (let x = 0; x < w; x += 40) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      c.fillStyle = '#22D3EE';
      c.fillRect(0, 0, w, 4);
      break;
    }
    case 'boardroom': {
      c.fillStyle = '#5C1A1A';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#6E2222';
      for (let y = 8; y < h; y += 12) c.fillRect(0, y, w, 4);
      c.fillStyle = '#3A0F0F';
      c.fillRect(0, 0, w, 7);
      break;
    }
    default: {
      c.fillStyle = '#868E96';
      c.fillRect(0, 0, w, h);
    }
  }
  // Common outline on the top edge.
  c.fillStyle = OUTLINE;
  c.fillRect(0, 0, w, 2);
  return canvas;
}

// ---------------------------------------------------------------- zone backdrops

export interface BackdropInput {
  key: string;
  x0: number;
  w: number;
  decor: MapObject[];
}

/** Paint the static art for one zone. Returns a canvas covering x0..x0+w, y 0..460 (transparent where sky shows). */
export function paintBackdrop(input: BackdropInput): HTMLCanvasElement | null {
  const painter = PAINTERS[input.key];
  if (!painter) return null;
  const { canvas, ctx } = makeCanvas(input.w, 460);
  ctx.save();
  ctx.translate(-input.x0, 0);
  painter(ctx, input);
  ctx.restore();
  return canvas;
}

type Painter = (c: Ctx, inp: BackdropInput) => void;
const find = (inp: BackdropInput, type: string) => inp.decor.find((d) => d.type === type);

function windowFrame(c: Ctx, x: number, y: number, w: number, h: number, glass = '#A5D8FF'): void {
  box(c, x, y, w, h, '#FFFFFF', 3, 3);
  c.fillStyle = glass;
  c.fillRect(x + 5, y + 5, w - 10, h - 10);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(x + 8, y + 8, 6, h - 20);
  c.fillStyle = OUTLINE;
  c.fillRect(x + w / 2 - 1.5, y + 3, 3, h - 6);
  c.fillRect(x + 3, y + h / 2 - 1.5, w - 6, 3);
}

function plant(c: Ctx, x: number, y: number, s = 1): void {
  poly(c, [x - 16 * s, y - 30 * s, x + 16 * s, y - 30 * s, x + 12 * s, y, x - 12 * s, y], '#C2622D', 3);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.45;
    ellipse(
      c,
      x + Math.cos(a) * 26 * s,
      y - 30 * s + Math.sin(a) * 30 * s,
      9 * s,
      20 * s,
      '#40C057',
      3,
      a + Math.PI / 2,
    );
  }
}

const PAINTERS: Record<string, Painter> = {
  z1_1(c, inp) {
    const x0 = inp.x0;
    const x1 = x0 + inp.w;
    // Warm interior wall with baseboard.
    c.fillStyle = '#F4C38A';
    c.fillRect(x0, 70, inp.w, 390);
    c.fillStyle = '#E3A869';
    for (let x = x0; x < x1; x += 34) c.fillRect(x, 70, 3, 390);
    c.fillStyle = '#8B5A2B';
    c.fillRect(x0, 70, inp.w, 14);
    c.fillStyle = OUTLINE;
    c.fillRect(x0, 84, inp.w, 3);
    for (const wx of [80, 330, 640, 900]) windowFrame(c, wx, 130, 110, 110, '#FFD8A8');
    // 1RK plate.
    box(c, 210, 270, 70, 34, '#2F6FD6', 3, 4);
    text(c, '1RK', 245, 288, 12, '#FFFFFF', { stroke: 3 });
    // Poster.
    box(c, 470, 110, 130, 150, '#FFFFFF', 3, 2);
    c.fillStyle = '#7C3AED';
    c.fillRect(478, 118, 114, 134);
    ['GYM', 'CODE', 'CHAI', 'SLEEP', 'REPEAT'].forEach((wd, i) =>
      text(c, wd, 535, 140 + i * 24, 10, i === 4 ? '#FFD43B' : '#FFFFFF', { stroke: 3 }),
    );
    // Shoe rack + tiffin.
    box(c, 700, 410, 60, 50, '#8B5A2B', 3, 2);
    box(c, 712, 396, 16, 14, '#ADB5BD', 2.5, 3);
    plant(c, 1010, 460, 1.1);
    const door = find(inp, 'exitDoor');
    if (door) {
      box(c, door.x, door.y, door.w, door.h, '#2F6FD6', 3, 4);
      circle(c, door.x + door.w - 12, door.y + 54, 4, '#FFD43B', 2);
      box(c, door.x + 4, door.y - 30, door.w - 8, 22, '#40C057', 3, 3);
      text(c, 'EXIT', door.x + door.w / 2, door.y - 19, 9, '#FFFFFF', { stroke: 3 });
    }
  },
  z1_2(c, inp) {
    const cols = ['#F783AC', '#74C0FC', '#FFD43B', '#8CE99A', '#FFA94D', '#B197FC'];
    const r = seeded(7);
    for (let i = 0; i < 6; i++) {
      const hx = inp.x0 + 10 + i * 190;
      const hh = 230 + r() * 90;
      const top = 460 - hh;
      box(c, hx, top, 180, hh, cols[i], 4, 3);
      c.fillStyle = shade(cols[i], -0.12);
      c.fillRect(hx + 4, top + 4, 172, 14);
      for (let fy = top + 40; fy < 400; fy += 90) {
        windowFrame(c, hx + 22, fy, 46, 50, r() > 0.5 ? '#FFE8A3' : '#A5D8FF');
        windowFrame(c, hx + 112, fy, 46, 50, r() > 0.5 ? '#FFE8A3' : '#A5D8FF');
        // Balcony.
        box(c, hx + 100, fy + 52, 70, 8, '#868E96', 2.5, 1);
        c.strokeStyle = OUTLINE;
        c.lineWidth = 2;
        for (let bx = hx + 104; bx < hx + 170; bx += 10) {
          c.beginPath();
          c.moveTo(bx, fy + 36);
          c.lineTo(bx, fy + 52);
          c.stroke();
        }
      }
      // Water tank on top.
      box(c, hx + 120, top - 30, 40, 30, '#343A40', 3, 6);
    }
    const poles = find(inp, 'poles');
    if (poles) {
      const p0 = poles.x;
      const p1 = poles.x + poles.w;
      limb(c, p0, 240, p0, 460, 8, '#868E96', 3);
      limb(c, p1, 240, p1, 460, 8, '#868E96', 3);
      // The line sags through each clothesline platform top.
      const pts = [
        [p0, 250],
        [1312, 340],
        [1452, 300],
        [1592, 340],
        [1732, 300],
        [1872, 340],
        [2012, 300],
        [p1, 250],
      ];
      c.strokeStyle = '#F8F9FA';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2;
        const my = Math.max(pts[i - 1][1], pts[i][1]) + 18;
        c.quadraticCurveTo(mx, my, pts[i][0], pts[i][1]);
      }
      c.stroke();
    }
  },
  z1_3(c, inp) {
    const r = seeded(3);
    // Distant shop row.
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 150) {
      const h = 120 + r() * 60;
      box(c, x + 6, 460 - h, 140, h, ['#FFC9C9', '#D0BFFF', '#FFE8CC', '#C3FAE8'][Math.floor(r() * 4)], 3, 2);
      box(
        c,
        x + 16,
        460 - h + 14,
        120,
        24,
        ['#F06595', '#4DABF7', '#40C057', '#FD7E14'][Math.floor(r() * 4)],
        2.5,
        3,
      );
      c.fillStyle = 'rgba(20,18,31,0.55)';
      c.fillRect(x + 26, 400, 100, 60);
      // Shutter lines.
      c.fillStyle = 'rgba(255,255,255,0.25)';
      for (let y = 404; y < 460; y += 8) c.fillRect(x + 26, y, 100, 2);
    }
    // Billboard.
    box(c, 2900, 90, 220, 110, '#FFFFFF', 4, 4);
    c.fillStyle = '#F06595';
    c.fillRect(2906, 96, 208, 98);
    text(c, 'CHAI ☕ ₹10', 3010, 132, 14, '#FFFFFF', { stroke: 4 });
    text(c, 'CUTTING SPECIAL', 3010, 166, 8, '#FFD43B', { stroke: 3 });
    limb(c, 2960, 200, 2960, 380, 6, '#868E96', 2);
    limb(c, 3060, 200, 3060, 380, 6, '#868E96', 2);
    // Street lamps.
    for (const lx of [2420, 2980, 3400]) {
      limb(c, lx, 250, lx, 460, 6, '#495057', 2);
      limb(c, lx, 252, lx + 30, 252, 5, '#495057', 2);
      ellipse(c, lx + 32, 258, 10, 5, '#FFE066', 2);
    }
  },
  z1_cp(c, inp) {
    const st = find(inp, 'stall');
    if (st) {
      const { x, y, w, h } = st;
      box(c, x + 10, y + 50, w - 20, h - 50, '#8B5A2B', 4, 3);
      // Red-white striped awning.
      for (let i = 0; i < 10; i++) {
        c.fillStyle = i % 2 === 0 ? '#FF5C5C' : '#FFFFFF';
        c.beginPath();
        c.moveTo(x + (i * w) / 10, y + 20);
        c.lineTo(x + ((i + 1) * w) / 10, y + 20);
        c.lineTo(x + ((i + 1) * w) / 10, y + 52);
        c.arc(x + ((i + 0.5) * w) / 10, y + 52, w / 20, 0, Math.PI);
        c.closePath();
        c.fill();
      }
      c.strokeStyle = OUTLINE;
      c.lineWidth = 3;
      c.strokeRect(x, y + 20, w, 32);
      box(c, x + 20, y - 14, w - 40, 30, '#FFD43B', 3, 4);
      text(c, 'SHARMA JI CHAI', x + w / 2, y + 2, 10, '#14121F');
      // Counter with cups and kettle.
      box(c, x + 16, y + 92, w - 32, 14, '#E9C8A0', 3, 2);
      for (let i = 0; i < 5; i++)
        poly(
          c,
          [
            x + 40 + i * 24,
            y + 78,
            x + 54 + i * 24,
            y + 78,
            x + 52 + i * 24,
            y + 92,
            x + 42 + i * 24,
            y + 92,
          ],
          '#C2622D',
          2,
        );
      ellipse(c, x + w - 50, y + 80, 16, 12, '#ADB5BD', 3);
      // Bench.
      box(c, x - 10, y + 128, 80, 10, '#8B5A2B', 3, 2);
    }
    // Flag pole (flag itself is animated in the scene).
    limb(c, 3830, 300, 3830, 460, 5, '#DEE2E6', 2.5);
    circle(c, 3830, 298, 5, '#FFD43B', 2);
  },
  z1_4(c, inp) {
    const cr = find(inp, 'crane');
    if (cr) {
      const bx = cr.x + 60;
      c.strokeStyle = '#E8A33D';
      c.lineWidth = 6;
      // Tower lattice.
      box(c, bx, cr.y + 40, 40, 380, 'rgba(0,0,0,0)', 0);
      c.strokeStyle = '#D9480F';
      c.lineWidth = 4;
      c.strokeRect(bx, cr.y + 40, 40, 380);
      for (let y = cr.y + 40; y < 460; y += 40) {
        c.beginPath();
        c.moveTo(bx, y);
        c.lineTo(bx + 40, y + 40);
        c.moveTo(bx + 40, y);
        c.lineTo(bx, y + 40);
        c.stroke();
      }
      // Jib.
      c.strokeRect(bx - 60, cr.y + 20, cr.w, 22);
      for (let x = bx - 60; x < bx - 60 + cr.w; x += 30) {
        c.beginPath();
        c.moveTo(x, cr.y + 20);
        c.lineTo(x + 30, cr.y + 42);
        c.stroke();
      }
      box(c, bx - 20, cr.y + 44, 70, 40, '#FFD43B', 3, 3);
      // Hook cable.
      c.strokeStyle = OUTLINE;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx + 380, cr.y + 42);
      c.lineTo(bx + 380, cr.y + 150);
      c.stroke();
      box(c, bx + 360, cr.y + 150, 40, 26, '#C8553D', 3, 2);
    }
    // Half-built building with scaffolding.
    c.fillStyle = 'rgba(173,181,189,0.7)';
    c.fillRect(4700, 140, 260, 320);
    c.strokeStyle = '#868E96';
    c.lineWidth = 4;
    for (let y = 140; y < 460; y += 60) {
      c.beginPath();
      c.moveTo(4700, y);
      c.lineTo(4960, y);
      c.stroke();
    }
    for (let x = 4700; x <= 4960; x += 65) {
      c.beginPath();
      c.moveTo(x, 140);
      c.lineTo(x, 460);
      c.stroke();
    }
    const ps = find(inp, 'pitSign');
    if (ps) {
      // Barriers at both pit edges.
      for (const bx of [ps.x - 40, ps.x + ps.w + 8]) {
        for (let i = 0; i < 4; i++) {
          c.fillStyle = i % 2 === 0 ? '#FF5C5C' : '#FFFFFF';
          c.fillRect(bx, 418 + i * 8, 32, 8);
        }
        c.strokeStyle = OUTLINE;
        c.lineWidth = 2.5;
        c.strokeRect(bx, 418, 32, 32);
      }
    }
  },
  z1_5(c, inp) {
    const r = seeded(5);
    // Distant towers.
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 120) {
      const h = 160 + r() * 120;
      c.fillStyle = 'rgba(92,60,120,0.35)';
      c.fillRect(x, 460 - h, 100, h);
      c.fillStyle = 'rgba(255,232,163,0.5)';
      for (let y = 470 - h; y < 440; y += 26)
        for (let wx = x + 10; wx < x + 90; wx += 22) if (r() > 0.5) c.fillRect(wx, y, 10, 12);
    }
    // Water tanks, dish antennas on the roofs.
    box(c, 5040, 330, 54, 50, '#212529', 3, 8);
    box(c, 5180, 352, 40, 28, '#212529', 3, 8);
    box(c, 5500, 280, 50, 40, '#212529', 3, 8);
    ellipse(c, 5620, 318, 18, 10, '#DEE2E6', 3, -0.5);
    box(c, 5900, 328, 54, 34, '#212529', 3, 8);
    // Washing line on roof 1.
    c.strokeStyle = '#F8F9FA';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(5110, 340);
    c.quadraticCurveTo(5170, 356, 5260, 340);
    c.stroke();
    limb(c, 5110, 340, 5110, 400, 4, '#868E96', 2);
    limb(c, 5260, 340, 5260, 400, 4, '#868E96', 2);
  },
  z1_6(c, inp) {
    // Station canopy and pillars.
    c.fillStyle = '#5F3DC4';
    poly(c, [inp.x0, 70, inp.x0 + inp.w, 70, inp.x0 + inp.w, 110, inp.x0, 110], '#7048E8', 4);
    for (let x = inp.x0 + 60; x < inp.x0 + inp.w; x += 220) {
      box(c, x, 110, 30, 350, '#DEE2E6', 3, 2);
    }
    // Generic metro sign (no real brand marks).
    box(c, 6460, 130, 230, 60, '#FFFFFF', 4, 10);
    circle(c, 6492, 160, 20, '#E64980', 3);
    text(c, 'M', 6492, 162, 14, '#FFFFFF');
    text(c, 'METRO', 6600, 160, 16, '#5F3DC4');
    // Route map board.
    box(c, 6880, 140, 180, 100, '#FFFFFF', 3, 4);
    c.lineWidth = 5;
    for (const [col, y] of [
      ['#FFD43B', 170],
      ['#4DABF7', 190],
      ['#F06595', 210],
    ] as const) {
      c.strokeStyle = col;
      c.beginPath();
      c.moveTo(6894, y);
      c.lineTo(7046, y + (y === 190 ? 0 : 10));
      c.stroke();
    }
    // Scanner arch.
    box(c, 6784, 330, 12, 130, '#ADB5BD', 3, 2);
    box(c, 6844, 330, 12, 130, '#ADB5BD', 3, 2);
    box(c, 6784, 324, 72, 14, '#868E96', 3, 3);
    c.fillStyle = '#FF5C5C';
    c.fillRect(6812, 328, 16, 6);
    // Door frame (doors themselves animate).
    box(c, 7236, 280, 128, 22, '#495057', 3, 3);
  },

  // ---------------- Level 2
  z2_1(c, inp) {
    c.fillStyle = '#F8F9FA';
    c.fillRect(inp.x0, 40, inp.w, 420);
    c.fillStyle = '#E9ECEF';
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 100) c.fillRect(x, 40, 4, 420);
    // Glass windows on the far wall.
    for (let x = inp.x0 + 30; x < inp.x0 + inp.w - 120; x += 260) windowFrame(c, x, 230, 120, 120, '#BDE0FE');
    const sign = find(inp, 'companySign');
    if (sign) {
      box(c, sign.x, sign.y, sign.w, sign.h, '#14121F', 4, 8);
      c.fillStyle = '#22D3EE';
      c.fillRect(sign.x + 8, sign.y + sign.h - 12, sign.w - 16, 4);
    }
    const rec = find(inp, 'reception');
    if (rec) {
      box(c, rec.x, rec.y, rec.w, rec.h, '#ADB5BD', 4, 6);
      box(c, rec.x - 6, rec.y - 8, rec.w + 12, 12, '#F8F9FA', 3, 3);
      // Receptionist.
      circle(c, rec.x + 90, rec.y - 26, 14, '#C98B5B', 3);
      c.fillStyle = '#2B2235';
      c.beginPath();
      c.arc(rec.x + 90, rec.y - 30, 14, Math.PI, 0);
      c.fill();
      box(c, rec.x + 74, rec.y - 14, 32, 10, '#F06595', 3, 3);
    }
    const pl = find(inp, 'plant');
    if (pl) plant(c, pl.x + pl.w / 2, 460, 1.2);
  },
  z2_2(c, inp) {
    c.fillStyle = '#2B3035';
    c.fillRect(inp.x0, 0, inp.w, 460);
    c.fillStyle = '#343A40';
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 50) c.fillRect(x, 0, 25, 460);
    const cab = find(inp, 'cables');
    if (cab) {
      c.strokeStyle = '#15171A';
      c.lineWidth = 3;
      for (const x of [1230, 1390, 1550, 1710]) {
        for (const dx of [-30, 30]) {
          c.beginPath();
          c.moveTo(x + dx, 0);
          c.lineTo(x + dx, 460);
          c.stroke();
        }
      }
    }
    // Floor markers on the shaft wall.
    for (let i = 0; i < 4; i++) text(c, `${3 + i}`, 1100, 420 - i * 100, 12, '#FFD43B', { stroke: 3 });
    const f7 = find(inp, 'floor7');
    if (f7) {
      box(c, f7.x + 10, f7.y - 6, f7.w - 20, 30, '#40C057', 3, 4);
      text(c, 'FLOOR 7', f7.x + f7.w / 2, f7.y + 9, 9, '#FFFFFF', { stroke: 3 });
    }
  },
  z2_3(c, inp) {
    c.fillStyle = '#E7F5FF';
    c.fillRect(inp.x0, 0, inp.w, 460);
    // City windows along the top.
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 200) {
      box(c, x + 10, 60, 180, 150, '#74C0FC', 4, 2);
      c.fillStyle = 'rgba(52,58,64,0.55)';
      const r = seeded(x);
      for (let b = 0; b < 5; b++) {
        const bh = 30 + r() * 90;
        c.fillRect(x + 16 + b * 34, 206 - bh, 28, bh);
      }
    }
    // Ceiling lights.
    for (let x = inp.x0 + 60; x < inp.x0 + inp.w; x += 220) {
      box(c, x, 14, 100, 10, '#F8F9FA', 3, 3);
      c.fillStyle = 'rgba(255,249,219,0.35)';
      poly(c, [x, 24, x + 100, 24, x + 140, 120, x - 40, 120], 'rgba(255,249,219,0.25)', 0);
    }
    // Wall poster + whiteboard.
    box(c, 2520, 240, 110, 80, '#FFFFFF', 3, 3);
    text(c, 'SHIP IT', 2575, 270, 10, '#F06595', { stroke: 0 });
    text(c, '🚀', 2575, 298, 16, '#000', { font: 'sans-serif' });
    plant(c, 2160, 460, 0.9);
    plant(c, 3240, 460, 0.9);
  },
  z2_cp(c, inp) {
    c.fillStyle = '#C3FAE8';
    c.fillRect(inp.x0, 0, inp.w, 460);
    c.fillStyle = '#96F2D7';
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 40) c.fillRect(x, 300, 20, 160);
    box(c, inp.x0 + 30, 120, 120, 80, '#FFFFFF', 3, 4);
    text(c, '💧', inp.x0 + 90, 160, 26, '#000', { font: 'sans-serif' });
    limb(c, 3620, 300, 3620, 460, 5, '#DEE2E6', 2.5);
    circle(c, 3620, 298, 5, '#FFD43B', 2);
  },
  z2_4(c, inp) {
    for (let y = 0; y < 460; y += 30)
      for (let x = inp.x0; x < inp.x0 + inp.w; x += 30) {
        c.fillStyle = ((x - inp.x0) / 30 + y / 30) % 2 === 0 ? '#F8F9FA' : '#E9ECEF';
        c.fillRect(x, y, 30, 30);
      }
    // Upper cabinets.
    for (let x = inp.x0 + 80; x < inp.x0 + inp.w - 100; x += 140) {
      box(c, x, 120, 120, 70, '#FFA94D', 3, 4);
      c.fillStyle = OUTLINE;
      c.fillRect(x + 59, 122, 2, 66);
      c.fillRect(x + 50, 150, 6, 3);
      c.fillRect(x + 64, 150, 6, 3);
    }
    const cm = find(inp, 'chaiMachine');
    if (cm) {
      box(c, cm.x, cm.y, cm.w, cm.h, '#495057', 3, 4);
      box(c, cm.x + 8, cm.y + 10, cm.w - 16, 18, '#FFD43B', 2.5, 2);
      text(c, 'CHAI', cm.x + cm.w / 2, cm.y + 19, 6, '#14121F');
      box(c, cm.x + 16, cm.y + 50, 18, 16, '#FFFFFF', 2.5, 2);
    }
  },
  z2_5(c, inp) {
    c.fillStyle = '#0B0D17';
    c.fillRect(inp.x0, 0, inp.w, 460);
    const racks = find(inp, 'racks');
    if (racks) {
      for (let x = racks.x + 10; x < racks.x + racks.w; x += 90) {
        if (x > 5100 && x < 5290) continue;
        box(c, x, racks.y, 70, racks.h, '#1F2433', 3, 3);
        for (let y = racks.y + 12; y < racks.y + racks.h - 10; y += 22) {
          c.fillStyle = '#2B3245';
          c.fillRect(x + 6, y, 58, 16);
        }
      }
    }
    // AC vents above the updraft.
    box(c, 5130, 20, 140, 24, '#ADB5BD', 3, 3);
    c.fillStyle = OUTLINE;
    for (let x = 5140; x < 5260; x += 14) c.fillRect(x, 26, 8, 12);
  },
  z2_boss(c, inp) {
    c.fillStyle = '#7A2424';
    c.fillRect(inp.x0, 0, inp.w, 460);
    c.fillStyle = '#6A1E1E';
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 60) c.fillRect(x, 0, 30, 460);
    const wb = find(inp, 'whiteboard');
    if (wb) {
      box(c, wb.x, wb.y, wb.w, wb.h, '#FFFFFF', 4, 4);
      text(c, 'Q4 DEADLINE!!!', wb.x + wb.w / 2, wb.y + 30, 10, '#FF5C5C');
      c.strokeStyle = '#4DABF7';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(wb.x + 20, wb.y + 90);
      c.lineTo(wb.x + 70, wb.y + 60);
      c.lineTo(wb.x + 110, wb.y + 80);
      c.lineTo(wb.x + 180, wb.y + 50);
      c.stroke();
    }
    const sc = find(inp, 'screen');
    if (sc) {
      box(c, sc.x, sc.y, sc.w, sc.h, '#14121F', 5, 6);
      c.fillStyle = '#1C3D5A';
      c.fillRect(sc.x + 8, sc.y + 8, sc.w - 16, sc.h - 16);
    }
    const door = find(inp, 'exitDoor');
    if (door) {
      box(c, door.x, door.y, door.w, door.h, '#8B5A2B', 4, 3);
      circle(c, door.x + 10, door.y + 64, 4, '#FFD43B', 2);
    }
  },
  z2_fin(c, inp) {
    c.fillStyle = '#CED4DA';
    c.fillRect(inp.x0, 0, inp.w, 460);
    c.fillStyle = '#ADB5BD';
    for (let x = inp.x0; x < inp.x0 + inp.w; x += 50) c.fillRect(x, 0, 3, 460);
    box(c, 7020, 160, 120, 40, '#14121F', 3, 4);
  },
};

/** Distant city skyline strip, tileable horizontally (parallax layer 4). */
export function paintSkyline(w = 960, h = 260): HTMLCanvasElement {
  const { canvas, ctx: c } = makeCanvas(w, h);
  const r = seeded(42);
  let x = 0;
  while (x < w) {
    const bw = 40 + r() * 70;
    const bh = 60 + r() * (h - 70);
    c.fillStyle = '#2B2250';
    c.fillRect(x, h - bh, bw, bh);
    c.fillStyle = '#FFE8A3';
    for (let y = h - bh + 10; y < h - 10; y += 16)
      for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (r() > 0.6) c.fillRect(wx, y, 5, 7);
    x += bw + 4;
  }
  return canvas;
}

/** Rolling hills strip, tileable horizontally (parallax layer 5). */
export function paintHills(w = 960, h = 160): HTMLCanvasElement {
  const { canvas, ctx: c } = makeCanvas(w, h);
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const y = 60 + Math.sin((x / w) * Math.PI * 4) * 26 + Math.sin((x / w) * Math.PI * 10) * 8;
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.closePath();
  fillStroke(c, '#5DBB63', 4);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 18; i++) {
    c.beginPath();
    c.arc((i * w) / 18 + 20, 100 + (i % 3) * 14, 6, 0, Math.PI * 2);
    c.fill();
  }
  return canvas;
}

/** Office interior back wall used behind Level 2 zones (keeps the parallax depth indoors). */
export function paintOfficeSkyline(w = 960, h = 260): HTMLCanvasElement {
  const { canvas, ctx: c } = makeCanvas(w, h);
  const r = seeded(9);
  for (let x = 0; x < w; x += 60) {
    const bh = 80 + r() * 140;
    c.fillStyle = 'rgba(20,18,31,0.35)';
    c.fillRect(x, h - bh, 50, bh);
  }
  return canvas;
}

export { rr };
