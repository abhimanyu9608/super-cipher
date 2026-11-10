/** Small canvas-2D drawing helpers shared by sprites, backdrops and the story card. */
export const OUTLINE = '#14121F';

export type Ctx = CanvasRenderingContext2D;

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Filled shape with a dark outline. Call after building a path. */
export function fillStroke(ctx: Ctx, fill: string, lw = 3, stroke = OUTLINE): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, lw = 3, r = 0): void {
  rr(ctx, x, y, w, h, r);
  fillStroke(ctx, fill, lw);
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, lw = 3): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  fillStroke(ctx, fill, lw);
}

export function ellipse(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  lw = 3,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  fillStroke(ctx, fill, lw);
}

/** Thick outlined limb from (x1,y1) to (x2,y2). */
export function limb(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  color: string,
  ow = 3,
): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  if (ow > 0) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = w + ow * 2;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function poly(ctx: Ctx, pts: number[], fill: string, lw = 3): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  fillStroke(ctx, fill, lw);
}

export function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  opts: {
    font?: string;
    align?: CanvasTextAlign;
    stroke?: number;
    baseline?: CanvasTextBaseline;
    maxWidth?: number;
  } = {},
): void {
  ctx.font = `${size}px ${opts.font ?? '"Press Start 2P", monospace'}`;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = opts.baseline ?? 'middle';
  if (opts.stroke) {
    ctx.lineWidth = opts.stroke;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y, opts.maxWidth);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y, opts.maxWidth);
}

/** Five-pointed star path. */
export function star(ctx: Ctx, cx: number, cy: number, r: number, fill: string, lw = 3): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  fillStroke(ctx, fill, lw);
}

export function vgrad(ctx: Ctx, y0: number, y1: number, top: string, bottom: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  return { canvas, ctx };
}

/** Deterministic pseudo-random generator for stable decorations. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export const hexToInt = (hex: string): number => parseInt(hex.slice(1), 16);
