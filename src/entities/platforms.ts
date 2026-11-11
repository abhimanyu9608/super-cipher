/** Moving platforms (beams, auto-rickshaw, lifts), rolling chairs and the reverse escalator. */
import Phaser from 'phaser';
import { OFFICE } from '../config/game';
import { OFFICE_PHYSICS } from '../config/physics';
import { t } from '../i18n/strings';
import { makeSolid, pushOut, overlaps, type Solid } from '../systems/physics';
import { sfx } from '../audio/sfx';
import type { LevelScene } from '../scenes/LevelScene';

export type MoverStyle = 'beam' | 'auto' | 'lift' | 'liftFull' | 'tray' | 'coach' | 'float' | 'bar';

export class Mover {
  solid: Solid;
  private dir = 1;
  private wait = 0;
  private sprite: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  private lastPush = -999;

  constructor(
    private L: LevelScene,
    x: number,
    y: number,
    w: number,
    h: number,
    private style: MoverStyle,
    private axis: 'x' | 'y',
    private min: number,
    private max: number,
    private speed: number,
    private pause: number,
    phase: number,
  ) {
    this.solid = makeSolid({ x, y, w, h }, style === 'auto' || style === 'coach' ? 'solid' : 'oneway', {
      safe: false,
      tag: style,
    });
    // Start partway along the path when a phase is given.
    if (phase > 0) {
      const p = this.min + (this.max - this.min) * phase;
      if (axis === 'x') this.solid.x = p;
      else this.solid.y = p;
    }
    if (style === 'auto') this.sprite = L.add.image(0, 0, 'auto').setOrigin(0, 0).setDepth(6);
    else if (style === 'lift' || style === 'liftFull')
      this.sprite = L.add
        .image(0, 0, style === 'lift' ? 'liftCabin' : 'liftCabinFull')
        .setOrigin(0, 0)
        .setDepth(-5);
    else if (style === 'tray') this.sprite = L.add.image(0, 0, 'tray').setOrigin(0, 0).setDepth(6);
    else if (style === 'coach') this.sprite = L.add.image(0, 0, 'coach').setOrigin(0, 0).setDepth(6);
    else if (style === 'float') this.sprite = L.add.image(0, 0, 'floatie').setOrigin(0, 0).setDepth(6);
    else if (style === 'bar') {
      // A tall graph bar; colour cycles along the chart.
      const colors = [0x40c057, 0x4dabf7, 0xfab005, 0xf06595, 0x7048e8];
      this.sprite = L.add
        .tileSprite(0, 0, w, 560, 'barCol')
        .setOrigin(0, 0)
        .setDepth(5)
        .setTint(colors[Math.floor(x / 160) % colors.length]);
    } else this.sprite = L.add.tileSprite(0, 0, w, h, 'stripe').setOrigin(0, 0).setDepth(6);
    if (style === 'liftFull') {
      this.solid.onStand = () => this.shove();
    }
    this.draw();
  }

  step(): void {
    const s = this.solid;
    let dx = 0;
    let dy = 0;
    if (this.wait > 0) this.wait--;
    else {
      const pos = this.axis === 'x' ? s.x : s.y;
      let next = pos + this.dir * this.speed;
      if (next >= this.max) {
        next = this.max;
        this.dir = -1;
        this.wait = this.pause;
      } else if (next <= this.min) {
        next = this.min;
        this.dir = 1;
        this.wait = this.pause;
      }
      if (this.axis === 'x') dx = next - s.x;
      else dy = next - s.y;
    }
    s.x += dx;
    s.y += dy;
    s.dx = dx;
    s.dy = dy;
    // The auto is a full solid: shove the player sideways if it drives into them.
    if (this.style === 'auto' || this.style === 'coach') {
      const p = this.L.player.body;
      if (p.ground !== s && overlaps(p, s)) pushOut(p, s);
    }
  }

  private shove(): void {
    const L = this.L;
    if (L.frame - this.lastPush < 30) return;
    this.lastPush = L.frame;
    const p = L.player.body;
    const dir = p.x + p.w / 2 < this.solid.x + this.solid.w / 2 ? -1 : 1;
    p.vx = dir * OFFICE_PHYSICS.liftFullPush;
    p.vy = -5;
    p.onGround = false;
    p.ground = null;
    p.x += dir * 4;
    L.fx.popup(p.x + p.w / 2, p.y - 10, t('dhakka'), '#FF5C5C');
    L.fx.addShake(4);
    sfx('bump');
  }

  draw(): void {
    const s = this.solid;
    if (this.style === 'auto') this.sprite.setPosition(s.x - 2, s.y - 4);
    else if (this.style === 'coach') this.sprite.setPosition(s.x - 4, s.y - 6);
    else if (this.style === 'bar') this.sprite.setPosition(s.x, s.y);
    else if (this.style === 'float')
      this.sprite.setPosition(s.x - 4, s.y - 4).setRotation(Math.sin(this.L.frame * 0.05 + s.x) * 0.04);
    else if (this.style === 'lift' || this.style === 'liftFull') this.sprite.setPosition(s.x - 5, s.y - 100);
    else this.sprite.setPosition(s.x, s.y);
  }
}

export class Chair {
  solid: Solid;
  v = 0;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    x: number,
    y: number,
    w: number,
    h: number,
    private min: number,
    private max: number,
  ) {
    this.solid = makeSolid({ x, y, w, h }, 'oneway', { safe: false, tag: 'chair' });
    this.solid.onStand = () => {
      if (Math.abs(this.v) < 0.2) this.v = this.L.player.body.facing * OFFICE.chairSpeed;
    };
    this.sprite = L.add.image(x, y, 'chair').setOrigin(0, 0).setDepth(6);
  }

  get moving(): boolean {
    return Math.abs(this.v) > 0.2;
  }

  step(): void {
    const s = this.solid;
    let nx = s.x + this.v;
    if (nx < this.min || nx + s.w > this.max) {
      nx = Phaser.Math.Clamp(nx, this.min, this.max - s.w);
      this.v = 0;
    }
    this.v *= OFFICE.chairDecay;
    if (Math.abs(this.v) < 0.05) this.v = 0;
    s.dx = nx - s.x;
    s.x = nx;
    this.sprite.setPosition(s.x - 2, s.y - 30);
  }
}

/**
 * A projected slide you can stand on (Level 5). It is solid for `on` frames out of every `period`,
 * blinks for the last 40 frames, then vanishes. The offset lets a row of slides take turns.
 */
export class SlidePlatform {
  solid: Solid;
  private sprite: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;

  constructor(
    private L: LevelScene,
    x: number,
    y: number,
    w: number,
    h: number,
    private period: number,
    private on: number,
    private offset: number,
    n: number,
  ) {
    this.solid = makeSolid({ x, y, w, h }, 'oneway', { safe: false, tag: 'slide' });
    this.sprite = L.add.image(x, y, 'slide').setOrigin(0, 0).setDepth(6).setDisplaySize(w, 34);
    this.label = L.add
      .text(x + w / 2, y + 12, `SLIDE ${n}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#14121F',
      })
      .setOrigin(0.5)
      .setDepth(7);
  }

  step(): void {
    const c = (this.L.frame + this.offset) % this.period;
    const active = c < this.on;
    const blinking = active && c > this.on - 40 && Math.floor(c / 4) % 2 === 0;
    this.solid.active = active;
    const a = !active ? 0.12 : blinking ? 0.35 : 1;
    this.sprite.setAlpha(a);
    this.label.setAlpha(a);
  }
}

export class Conveyor {
  solid: Solid;
  private sprite: Phaser.GameObjects.TileSprite;

  constructor(L: LevelScene, x: number, y: number, w: number, h: number, speed: number) {
    this.solid = makeSolid({ x, y, w, h }, 'solid', { conveyor: speed, safe: false, tag: 'conveyor' });
    L.add
      .rectangle(x, y + h, w, 80 - h, 0x1a1530)
      .setOrigin(0, 0)
      .setDepth(0);
    this.sprite = L.add
      .tileSprite(x, y, w, h, 'chevron')
      .setOrigin(0, 0)
      .setDepth(1)
      .setFlipX(speed > 0);
  }

  step(): void {
    this.sprite.tilePositionX -= this.solid.conveyor;
  }
}
