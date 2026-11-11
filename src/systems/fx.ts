/** Particles, floating popups, screen shake and confetti, stepped by the fixed simulation. */
import Phaser from 'phaser';
import { FX } from '../config/game';
import { session } from '../game/session';

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  spin: number;
  fade: boolean;
}

interface Flyer {
  img: Phaser.GameObjects.Image;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  done?: () => void;
}

interface Popup {
  txt: Phaser.GameObjects.Text;
  life: number;
}

export const FONT = '"Press Start 2P", monospace';

export class Fx {
  private particles: Particle[] = [];
  private pool: Phaser.GameObjects.Image[] = [];
  private popups: Popup[] = [];
  private textPool: Phaser.GameObjects.Text[] = [];
  private flyers: Flyer[] = [];
  shake = 0;
  shakeX = 0;
  shakeY = 0;

  constructor(private scene: Phaser.Scene) {}

  private img(tex: string): Phaser.GameObjects.Image {
    const i = this.pool.pop() ?? this.scene.add.image(0, 0, tex).setDepth(40);
    i.setTexture(tex)
      .setVisible(true)
      .setActive(true)
      .setAlpha(1)
      .setScale(1)
      .setRotation(0)
      .setOrigin(0.5)
      .setDepth(40)
      .setFlipX(false)
      .setScrollFactor(1);
    return i;
  }

  burst(
    x: number,
    y: number,
    color: number,
    count = 12,
    opts: { speed?: number; gravity?: number; life?: number; tex?: string; up?: boolean } = {},
  ): void {
    const speed = opts.speed ?? 3;
    for (let k = 0; k < count; k++) {
      const a = opts.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2 : Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      const im = this.img(opts.tex ?? 'px')
        .setTint(color)
        .setPosition(x, y);
      const life = (opts.life ?? 30) + Math.floor(Math.random() * 10);
      this.particles.push({
        img: im,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        g: opts.gravity ?? 0.15,
        life,
        max: life,
        spin: 0,
        fade: true,
      });
    }
  }

  dust(x: number, y: number): void {
    for (let k = 0; k < 8; k++) {
      const dir = k < 4 ? -1 : 1;
      const im = this.img('spark')
        .setTint(0xffffff)
        .setPosition(x + dir * 6, y - 2)
        .setScale(0.8 + Math.random() * 0.6);
      this.particles.push({
        img: im,
        vx: dir * (0.8 + Math.random() * 1.6),
        vy: -Math.random() * 1.2,
        g: 0.02,
        life: 22,
        max: 22,
        spin: 0,
        fade: true,
      });
    }
  }

  trail(x: number, y: number, color: number, tex = 'spark'): void {
    const im = this.img(tex)
      .setTint(color)
      .setPosition(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 20)
      .setScale(0.6 + Math.random() * 0.5);
    this.particles.push({ img: im, vx: 0, vy: -0.3, g: 0, life: 24, max: 24, spin: 0, fade: true });
  }

  confetti(x0: number, x1: number, y: number, count = 6): void {
    const colors = [0xffd43b, 0xf06595, 0x22d3ee, 0x40c057, 0xff5c5c, 0x7c3aed];
    for (let k = 0; k < count; k++) {
      const im = this.img('confetti')
        .setTint(colors[Math.floor(Math.random() * colors.length)])
        .setPosition(x0 + Math.random() * (x1 - x0), y)
        .setDepth(45);
      this.particles.push({
        img: im,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2,
        g: 0.03,
        life: 140,
        max: 140,
        spin: (Math.random() - 0.5) * 0.3,
        fade: false,
      });
    }
  }

  popup(x: number, y: number, text: string, color = '#FFFFFF', size = 12): void {
    const t =
      this.textPool.pop() ??
      this.scene.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '12px',
          color: '#fff',
          stroke: '#14121F',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(60);
    t.setText(text)
      .setColor(color)
      .setFontSize(size)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true)
      .setActive(true);
    this.popups.push({ txt: t, life: FX.popupFrames });
  }

  /** A defeated enemy's body that lingers, then fades (or tumbles away when it falls). */
  corpse(tex: string, x: number, bottom: number, flip = false, falls = false): void {
    const im = this.img(tex).setOrigin(0.5, 1).setPosition(x, bottom).setFlipX(flip).setDepth(19);
    this.particles.push({
      img: im,
      vx: falls ? (Math.random() - 0.5) * 2 : 0,
      vy: falls ? -3 : 0,
      g: falls ? 0.3 : 0,
      life: 45,
      max: 45,
      spin: falls ? 0.08 : 0,
      fade: true,
    });
  }

  /** Motion streak behind a fast runner. */
  speedLine(x: number, y: number, dir: number): void {
    const im = this.img('speedline')
      .setPosition(x, y)
      .setFlipX(dir < 0)
      .setAlpha(0.8)
      .setDepth(28);
    this.particles.push({ img: im, vx: -dir * 2, vy: 0, g: 0, life: 10, max: 10, spin: 0, fade: true });
  }

  /** Screen-space flyer (e.g. a coin zipping to the HUD counter). */
  fly(sx: number, sy: number, tex: string, tx: number, ty: number, done?: () => void): void {
    const im = this.img(tex).setScrollFactor(0).setDepth(61).setPosition(sx, sy);
    this.flyers.push({ img: im, sx, sy, tx, ty, t: 0, dur: 22, done });
  }

  addShake(amount: number): void {
    if (session.reducedMotion) return;
    this.shake = Math.max(this.shake, amount);
  }

  step(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.g;
      p.img.x += p.vx;
      p.img.y += p.vy;
      p.img.rotation += p.spin;
      p.life--;
      if (p.fade) p.img.setAlpha(Math.max(0, p.life / p.max));
      if (p.life <= 0) {
        p.img.setVisible(false).setActive(false).clearTint();
        this.pool.push(p.img);
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t++;
      const k = f.t / f.dur;
      const e = k * k * (3 - 2 * k);
      // Arc upwards on the way.
      f.img.setPosition(f.sx + (f.tx - f.sx) * e, f.sy + (f.ty - f.sy) * e - Math.sin(k * Math.PI) * 60);
      f.img.setScale(1 + Math.sin(k * Math.PI) * 0.5).setRotation(k * 6);
      if (f.t >= f.dur) {
        f.done?.();
        f.img.setVisible(false).setActive(false).setScrollFactor(1);
        this.pool.push(f.img);
        this.flyers.splice(i, 1);
      }
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.txt.y -= FX.popupRise;
      p.life--;
      if (p.life < FX.popupFade) p.txt.setAlpha(p.life / FX.popupFade);
      if (p.life <= 0) {
        p.txt.setVisible(false).setActive(false);
        this.textPool.push(p.txt);
        this.popups.splice(i, 1);
      }
    }
    if (this.shake > 0.3) {
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
      this.shake *= FX.shakeDecay;
    } else {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
}
