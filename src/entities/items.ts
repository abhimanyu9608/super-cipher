/** Coins, ?-blocks, power-up items, Appraisal Points and the Office ID card. */
import Phaser from 'phaser';
import { makeSolid, stepSimpleBody, type Solid, type Rect } from '../systems/physics';
import { sfx } from '../audio/sfx';
import type { LevelScene } from '../scenes/LevelScene';

export type ItemKind = 'coin' | 'chai' | 'headphones' | 'coffee' | 'id' | 'appraisal';

export interface Collectible extends Rect {
  alive: boolean;
  kind: ItemKind;
  step(): void;
  destroy(): void;
}

export class Coin implements Collectible {
  alive = true;
  kind: ItemKind = 'coin';
  w = 20;
  h = 20;
  x: number;
  y: number;
  private sprite: Phaser.GameObjects.Image;
  private phase: number;

  constructor(
    private L: LevelScene,
    cx: number,
    cy: number,
  ) {
    this.x = cx - 10;
    this.y = cy - 10;
    this.phase = cx * 0.01;
    this.sprite = L.add.image(cx, cy, 'coin').setDepth(10);
  }

  step(): void {
    // Spin by scaling x with |cos|.
    this.sprite.scaleX = Math.max(0.12, Math.abs(Math.cos(this.L.frame * 0.08 + this.phase)));
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}

/** A coin that pops out of a ?-block, spins up and is collected automatically. */
export class BlockCoin {
  alive = true;
  private t = 0;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    private x: number,
    private y: number,
  ) {
    this.sprite = L.add.image(x, y, 'coin').setDepth(9);
  }

  step(): void {
    this.t++;
    const vy = -7 + this.t * 0.45;
    this.y += vy;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.scaleX = Math.abs(Math.cos(this.t * 0.4));
    if (this.t > 28) {
      this.L.fx.burst(this.x, this.y, 0xffd43b, 6, { speed: 2 });
      this.alive = false;
      this.sprite.destroy();
    }
  }
}

export class Block {
  solid: Solid;
  used = false;
  private bump = 0;
  private sprite: Phaser.GameObjects.Image;
  private mark: Phaser.GameObjects.Image | null = null;

  constructor(
    private L: LevelScene,
    x: number,
    y: number,
    private kind: 'question' | 'brick',
    private item: string,
  ) {
    this.solid = makeSolid({ x, y, w: 40, h: 40 }, 'solid', { safe: false, tag: 'block' });
    this.solid.onHeadHit = () => this.hit();
    this.sprite = L.add
      .image(x, y, kind === 'question' ? 'qblock' : 'brickblock')
      .setOrigin(0, 0)
      .setDepth(8);
    if (kind === 'question') this.mark = L.add.image(x + 20, y + 20, 'qmark').setDepth(9);
  }

  private hit(): void {
    if (this.bump > 0) return;
    this.bump = 12;
    sfx('bump');
    if (this.kind === 'question' && !this.used) {
      this.used = true;
      this.sprite.setTexture('usedblock');
      this.mark?.destroy();
      this.mark = null;
      const cx = this.solid.x + 20;
      if (this.item === 'coin') this.L.collectBlockCoin(cx, this.solid.y - 12);
      else this.L.spawnPowerUp(this.item as ItemKind, cx, this.solid.y);
    } else {
      this.L.fx.burst(this.solid.x + 20, this.solid.y, 0xc8553d, 5, { speed: 2, up: true });
    }
  }

  step(): void {
    let off = 0;
    if (this.bump > 0) {
      this.bump--;
      // Rises 10 px over 12 frames and settles back.
      off = -Math.sin(((12 - this.bump) / 12) * Math.PI) * 10;
    }
    this.sprite.setPosition(this.solid.x, this.solid.y + off);
    if (this.mark) {
      this.mark.setPosition(this.solid.x + 20, this.solid.y + 20 + off + Math.sin(this.L.frame * 0.1) * 2);
      this.sprite.setTint(Math.floor(this.L.frame / 20) % 3 === 0 ? 0xfff1b0 : 0xffffff);
    }
  }
}

/** A power-up that rises out of a ?-block: rises 32 px, then falls. Chai slides like a mushroom. */
export class PowerUpItem implements Collectible {
  alive = true;
  w = 26;
  h = 28;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  private rise = 32;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    public kind: ItemKind,
    cx: number,
    blockTop: number,
    private slides: boolean,
  ) {
    this.x = cx - this.w / 2;
    this.y = blockTop - 4;
    const tex =
      kind === 'chai'
        ? 'chai'
        : kind === 'headphones'
          ? 'headphones'
          : kind === 'coffee'
            ? 'coffee'
            : 'idcard';
    this.sprite = L.add.image(cx, this.y, tex).setOrigin(0.5, 0).setDepth(7);
  }

  step(): void {
    if (this.rise > 0) {
      this.rise -= 2;
      this.y -= 2;
      if (this.rise <= 0) {
        if (this.slides) this.vx = 1.5;
        this.sprite.setDepth(12);
      }
    } else {
      const r = stepSimpleBody(this, this.L.solids, 0.45);
      if (r.wall) this.vx = -this.vx;
      if (this.y > 580) this.destroy();
    }
    this.sprite.setPosition(this.x + this.w / 2, this.y);
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}

/** Floating free pickup (chai at the tapri, coffee at the water cooler), Appraisal Points. */
export class Floating implements Collectible {
  alive = true;
  w: number;
  h: number;
  x: number;
  y: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    public kind: ItemKind,
    private cx: number,
    private cy: number,
  ) {
    const tex = kind === 'appraisal' ? 'appraisal' : kind;
    this.sprite = L.add.image(cx, cy, tex).setDepth(kind === 'appraisal' ? 57 : 11);
    this.w = kind === 'appraisal' ? 26 : 26;
    this.h = kind === 'appraisal' ? 26 : 30;
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
  }

  step(): void {
    const f = this.L.frame;
    this.sprite.setPosition(this.cx, this.cy + Math.sin(f * 0.07 + this.cx) * 4);
    if (this.kind === 'appraisal') this.sprite.setScale(1 + Math.sin(f * 0.12) * 0.08);
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}

/** The Office ID the monkey drops: falls to the roof and waits to be picked up. */
export class IdCard implements Collectible {
  alive = true;
  kind: ItemKind = 'id';
  w = 28;
  h = 22;
  vx = 0;
  vy = -6;
  private sprite: Phaser.GameObjects.Image;

  constructor(
    private L: LevelScene,
    public x: number,
    public y: number,
  ) {
    this.sprite = L.add.image(x, y, 'idcard').setOrigin(0, 0).setDepth(12);
  }

  step(): void {
    stepSimpleBody(this, this.L.solids, 0.4);
    if (this.y > 520) this.y = 300;
    const f = this.L.frame;
    this.sprite.setPosition(this.x, this.y - Math.abs(Math.sin(f * 0.08)) * 3);
    if (f % 6 === 0) this.L.fx.trail(this.x + this.w / 2, this.y, 0xffd43b);
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}
