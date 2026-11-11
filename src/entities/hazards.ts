/** Hazards that always hurt and can't be stomped: bus, bricks, projectiles, rings, lasers. */
import Phaser from 'phaser';
import { BUS, BRICK } from '../config/game';
import type { StringKey } from '../i18n/strings';
import { overlaps, type Rect } from '../systems/physics';
import { sfx } from '../audio/sfx';
import type { LevelScene } from '../scenes/LevelScene';

export interface Hazard extends Rect {
  alive: boolean;
  hurtKey: StringKey;
  /** False while a hazard is only a warning (brick column, laser off). */
  armed: boolean;
  step(): void;
  destroy(): void;
}

export class Projectile implements Hazard {
  alive = true;
  armed = true;
  sprite: Phaser.GameObjects.Image;
  private t = 0;
  private baseY: number;

  constructor(
    private L: LevelScene,
    tex: string,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    public vx: number,
    public vy: number,
    private g: number,
    public hurtKey: StringKey,
    private opts: { spin?: number; wobble?: number; breakOnSolid?: boolean; maxLife?: number } = {},
  ) {
    this.baseY = y;
    this.sprite = L.add.image(x + w / 2, y + h / 2, tex).setDepth(35);
  }

  step(): void {
    this.t++;
    this.vy += this.g;
    this.x += this.vx;
    if (this.opts.wobble) {
      this.baseY += this.vy;
      this.y = this.baseY + Math.sin(this.t * 0.15) * this.opts.wobble;
    } else this.y += this.vy;
    this.sprite.setPosition(this.x + this.w / 2, this.y + this.h / 2);
    if (this.opts.spin) this.sprite.rotation += this.opts.spin;
    if (this.y > 600 || this.t > (this.opts.maxLife ?? 600) || Math.abs(this.x - this.L.player.cx) > 1400)
      this.destroy();
    else if (this.opts.breakOnSolid !== false && this.vy > 0 && this.L.hitsSolid(this)) {
      this.L.fx.burst(this.x + this.w / 2, this.y + this.h, 0xffffff, 6, { speed: 2 });
      this.destroy();
    }
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}

export class Bus implements Hazard {
  alive = true;
  armed = true;
  hurtKey: StringKey = 'busHit';
  w = BUS.w;
  h = BUS.h;
  y: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    public x: number,
    groundY: number,
  ) {
    this.y = groundY - this.h;
    this.sprite = L.add
      .image(x - 5, groundY, 'bus')
      .setOrigin(0, 1)
      .setDepth(25);
  }

  step(): void {
    this.x -= BUS.speed;
    this.sprite.setPosition(this.x - 5, this.y + this.h + 9);
    if (this.x + this.w < this.L.camX - 200) this.destroy();
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}

export class FallingBrick implements Hazard {
  alive = true;
  armed = false;
  hurtKey: StringKey = 'brickHit';
  w = BRICK.w;
  h = BRICK.h;
  y = -30;
  private vy = 0;
  private warn = BRICK.warning;
  private column: Phaser.GameObjects.Rectangle;
  private bang: Phaser.GameObjects.Text;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    public x: number,
    groundY: number,
    private tex = 'brick',
    hurtKey: StringKey = 'brickHit',
  ) {
    this.hurtKey = hurtKey;
    this.column = L.add
      .rectangle(x + this.w / 2, 0, this.w + 8, groundY, 0xff3b3b, 0.22)
      .setOrigin(0.5, 0)
      .setDepth(33);
    this.bang = L.add
      .text(x + this.w / 2, 70, '!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '22px',
        color: '#FF5C5C',
        stroke: '#14121F',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(34);
    this.sprite = L.add.image(x, this.y, this.tex).setOrigin(0, 0).setDepth(35).setVisible(false);
  }

  step(): void {
    if (this.warn > 0) {
      this.warn--;
      const on = Math.floor(this.warn / 5) % 2 === 0;
      this.column.setAlpha(on ? 1 : 0.5);
      this.bang.setVisible(on);
      if (this.warn === 0) {
        this.armed = true;
        this.column.destroy();
        this.bang.destroy();
        this.sprite.setVisible(true);
      }
      return;
    }
    this.vy += BRICK.gravity;
    this.y += this.vy;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.rotation += 0.05;
    if (this.L.hitsSolid(this) || this.y > 560) {
      if (this.y < 560) {
        this.L.fx.burst(this.x + this.w / 2, this.y + this.h, 0xc8553d, 10, { speed: 3, up: true });
        this.L.fx.burst(this.x + this.w / 2, this.y + this.h, 0xd9c2a0, 6, { speed: 2, up: true });
        if (Math.abs(this.x - this.L.player.cx) < 500) sfx('thud', { volume: 0.7 });
      }
      this.destroy();
    }
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    if (this.column.active) this.column.destroy();
    if (this.bang.active) this.bang.destroy();
    this.sprite.destroy();
  }
}

/** Phone-ring shockwave travelling along the floor (Manager phase 2). */
export class RingWave implements Hazard {
  alive = true;
  armed = true;
  hurtKey: StringKey = 'ringHit';
  w = 26;
  h = 20;
  y: number;
  private sprite: Phaser.GameObjects.Image;
  private t = 0;

  constructor(
    L: LevelScene,
    public x: number,
    groundY: number,
    private vx: number,
    private minX: number,
    private maxX: number,
    tex = 'ring',
    hurtKey: StringKey = 'ringHit',
  ) {
    this.y = groundY - this.h;
    this.hurtKey = hurtKey;
    this.sprite = L.add.image(x, this.y, tex).setOrigin(0, 0).setDepth(35);
  }

  step(): void {
    this.t++;
    this.x += this.vx;
    this.sprite.setPosition(this.x, this.y).setScale(1, 0.9 + Math.sin(this.t * 0.5) * 0.15);
    if (this.x < this.minX || this.x > this.maxX) this.destroy();
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}

/** Server-room firewall laser: 90 frames on, 90 off, flicker warning for the last 30 off frames. */
export class Laser implements Hazard {
  alive = true;
  armed = false;
  hurtKey: StringKey = 'laserHit';
  private beam: Phaser.GameObjects.Rectangle;
  private core: Phaser.GameObjects.Rectangle;
  private emitter: Phaser.GameObjects.Rectangle;
  private wasOn = false;

  constructor(
    private L: LevelScene,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    private phase: number,
    private on: number,
    private off: number,
    private warn: number,
  ) {
    this.beam = L.add
      .rectangle(x + w / 2, y, w + 10, h, 0xff2d55, 0.35)
      .setOrigin(0.5, 0)
      .setDepth(56);
    this.core = L.add
      .rectangle(x + w / 2, y, 4, h, 0xffffff, 0.9)
      .setOrigin(0.5, 0)
      .setDepth(56);
    this.emitter = L.add
      .rectangle(x + w / 2, y, 30, 18, 0x495057)
      .setOrigin(0.5, 0)
      .setDepth(56)
      .setStrokeStyle(3, 0x14121f);
  }

  step(): void {
    const c = (this.L.frame + this.phase) % (this.on + this.off);
    const isOn = c >= this.off;
    const warning = !isOn && c >= this.off - this.warn;
    this.armed = isOn;
    if (isOn && !this.wasOn && Math.abs(this.x - this.L.player.cx) < 600) sfx('laser', { volume: 0.6 });
    this.wasOn = isOn;
    const flick = warning && Math.floor(c / 3) % 2 === 0;
    this.beam.setVisible(isOn || flick).setAlpha(isOn ? 0.45 + Math.sin(this.L.frame * 0.6) * 0.15 : 0.15);
    this.beam.width = isOn ? this.w + 10 : 4;
    this.core.setVisible(isOn);
    this.emitter.setFillStyle(isOn ? 0xff2d55 : warning ? 0xffd43b : 0x495057);
  }

  destroy(): void {
    this.alive = false;
  }
}

export const touching = (a: Rect, b: Rect): boolean => overlaps(a, b);
