/**
 * Ambient life: things that move but don't affect gameplay. Birds, kites, people walking past,
 * chai steam, warm glows, flickering office lights, sun rays, foreground silhouettes and rain.
 */
import Phaser from 'phaser';
import { VIEW } from '../config/physics';
import { session } from '../game/session';
import type { LevelScene } from '../scenes/LevelScene';

interface Walker {
  img: Phaser.GameObjects.Sprite;
  min: number;
  max: number;
  speed: number;
  dir: number;
}

interface Flyer {
  img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  vx: number;
  phase: number;
  bob: number;
  span: number;
}

interface Flicker {
  img: Phaser.GameObjects.Image;
  base: number;
  t: number;
}

export class Ambient {
  private walkers: Walker[] = [];
  private flyers: Flyer[] = [];
  private flickers: Flicker[] = [];
  private steamAt: { x: number; y: number }[] = [];
  private rays: Phaser.GameObjects.Image | null = null;
  private rain: Phaser.GameObjects.Image[] = [];
  private rainTint: Phaser.GameObjects.Rectangle | null = null;
  private outdoor: [number, number][] = [];
  private traffic: { img: Phaser.GameObjects.Image; x: number; min: number; max: number } | null = null;
  private calm = session.reducedMotion;

  constructor(private L: LevelScene) {}

  build(): void {
    const L = this.L;
    const level = L.run.level;
    const decor = L.map.layers.decor ?? [];
    const sec = (key: string) => L.sections.find((s) => s.key === key);

    if (level === 1) {
      // Walkers on the lane, the road pavement and the station.
      for (const [key, n] of [
        ['z1_2', 3],
        ['z1_3', 2],
        ['z1_6', 2],
      ] as const) {
        const s = sec(key);
        if (!s) continue;
        for (let i = 0; i < n; i++) this.addWalker(s.x0 + 60, s.x1 - 60, i);
      }
      // Birds and kites over the open-air zones.
      for (let i = 0; i < 5; i++) {
        const img = L.add.sprite(0, 0, 'bird', 0).setDepth(-55).setScrollFactor(0.5);
        this.flyers.push({
          img,
          x: 300 + i * 900,
          y: 60 + (i % 3) * 35,
          vx: 0.9 + (i % 2) * 0.4,
          phase: i,
          bob: 10,
          span: 4200,
        });
      }
      for (let i = 0; i < 3; i++) {
        const img = L.add.image(0, 0, 'kite').setDepth(-56).setScrollFactor(0.4).setScale(0.8);
        this.flyers.push({
          img,
          x: 600 + i * 1100,
          y: 80 + i * 20,
          vx: 0.15,
          phase: i * 2,
          bob: 18,
          span: 3200,
        });
      }
      // Distant traffic on the main road.
      const road = sec('z1_3');
      if (road) {
        const img = L.add
          .image(road.x0, 452, 'auto')
          .setOrigin(0.5, 1)
          .setScale(0.45)
          .setDepth(-34)
          .setTint(0x8899aa);
        this.traffic = { img, x: road.x0, min: road.x0 - 100, max: road.x1 + 100 };
      }
      // Chai stall: steam + warm glow.
      const stall = decor.find((d) => d.type === 'stall');
      if (stall) {
        this.steamAt.push(
          { x: stall.x + stall.w - 50, y: stall.y + 66 },
          { x: stall.x + 90, y: stall.y + 76 },
        );
        L.add
          .image(stall.x + stall.w / 2, stall.y + 80, 'glow')
          .setScale(2.6)
          .setDepth(-44)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.7);
      }
      // Morning sun rays.
      this.rays = L.add
        .image(VIEW.width - 260, 0, 'sunrays')
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(-45);
      this.rays.setBlendMode(Phaser.BlendModes.ADD);
      for (const k of ['z1_2', 'z1_3', 'z1_cp', 'z1_4', 'z1_5']) {
        const s = sec(k);
        if (s) this.outdoor.push([s.x0, s.x1]);
      }
      // Foreground silhouettes (parallax 1.25, in front of the player).
      for (let x = 2200; x < 9400; x += 1150) {
        L.add
          .image(x, VIEW.height, 'fgPole')
          .setOrigin(0.5, 1)
          .setScrollFactor(1.25)
          .setDepth(70)
          .setAlpha(0.8);
        L.add
          .image(x + 520, VIEW.height + 10, 'fgPlant')
          .setOrigin(0.5, 1)
          .setScrollFactor(1.25)
          .setDepth(70)
          .setAlpha(0.85);
      }
      if (L.mood.rain) this.buildRain();
    } else {
      // Office people walking about.
      for (const [key, n] of [
        ['z2_1', 2],
        ['z2_3', 2],
        ['z2_cp', 1],
        ['z2_4', 1],
        ['z3_1', 2],
        ['z3_cp', 1],
        ['z3_3', 2],
        ['z3_4', 1],
      ] as const) {
        const s = sec(key);
        if (s) for (let i = 0; i < n; i++) this.addWalker(s.x0 + 40, s.x1 - 40, i + 3);
      }
      // Flickering ceiling lights in the open office.
      // Cafeteria hanging lamps glow warmly.
      const cafe = sec('z3_1');
      if (cafe)
        for (let x = cafe.x0 + 120; x < cafe.x1; x += 260) {
          const img = L.add
            .image(x, 90, 'glow')
            .setScale(1.4)
            .setDepth(-44)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xffd8a8);
          this.flickers.push({ img, base: 0.6, t: Math.floor(Math.random() * 400) });
        }
      const office = sec('z2_3');
      if (office)
        for (let x = office.x0 + 110; x < office.x1; x += 220) {
          const img = L.add
            .image(x, 70, 'glow')
            .setScale(1.6, 1.1)
            .setDepth(-44)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xfff3bf);
          this.flickers.push({ img, base: 0.55, t: Math.floor(Math.random() * 400) });
        }
      // Monitor glow on the desks.
      for (const d of (L.map.layers.platforms ?? []).filter(
        (p) => p.type === 'desk' && p.props.high !== true,
      )) {
        const img = L.add
          .image(d.x + d.w / 2, d.y - 24, 'glow')
          .setScale(0.9)
          .setDepth(-3)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0x4dabf7);
        this.flickers.push({ img, base: 0.5, t: 0 });
      }
      // Foreground office furniture.
      for (let x = 1400; x < 9200; x += 1300) {
        L.add
          .image(x, VIEW.height + 6, 'fgDesk')
          .setOrigin(0.5, 1)
          .setScrollFactor(1.25)
          .setDepth(70)
          .setAlpha(0.85);
      }
    }
  }

  private addWalker(min: number, max: number, i: number): void {
    const L = this.L;
    const look = i % 3;
    const img = L.add
      .sprite(min + ((i * 397) % Math.max(1, max - min)), L.map.groundY, `walker${look}`, 0)
      .setOrigin(0.5, 1)
      .setDepth(-35)
      .setScale(1.1)
      .setAlpha(0.95);
    this.walkers.push({ img, min, max, speed: 0.5 + (i % 3) * 0.25, dir: i % 2 === 0 ? 1 : -1 });
  }

  private buildRain(): void {
    const L = this.L;
    this.rainTint = L.add
      .rectangle(0, 0, VIEW.width, VIEW.height, 0x1c3d5a, 0.16)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(64);
    const n = this.calm ? 50 : 110;
    for (let i = 0; i < n; i++) {
      const img = L.add
        .image(Math.random() * VIEW.width, Math.random() * VIEW.height, 'raindrop')
        .setScrollFactor(0)
        .setDepth(65)
        .setRotation(0.2);
      this.rain.push(img);
    }
  }

  step(): void {
    const L = this.L;
    const f = L.frame;
    for (const w of this.walkers) {
      w.img.x += w.dir * w.speed;
      if (w.img.x > w.max) w.dir = -1;
      if (w.img.x < w.min) w.dir = 1;
      w.img.setFlipX(w.dir < 0).setFrame(Math.floor(f / 14) % 2);
    }
    for (const fl of this.flyers) {
      fl.x += fl.vx;
      if (fl.x > fl.span) fl.x = -100;
      fl.img.setPosition(fl.x, fl.y + Math.sin(f * 0.03 + fl.phase) * fl.bob);
      if (fl.img instanceof Phaser.GameObjects.Sprite)
        fl.img.setFrame(Math.floor((f + fl.phase * 7) / 10) % 2);
      else fl.img.setRotation(Math.sin(f * 0.02 + fl.phase) * 0.25);
    }
    if (this.traffic) {
      const t = this.traffic;
      t.x += 2.2;
      if (t.x > t.max) t.x = t.min;
      t.img.x = t.x;
    }
    if (f % 9 === 0)
      for (const s of this.steamAt)
        if (Math.abs(s.x - L.camX - VIEW.width / 2) < VIEW.width)
          this.L.fx.trail(s.x, s.y, 0xffffff, 'steam');
    for (const fl of this.flickers) {
      fl.t++;
      // Mostly steady; every so often a quick flicker.
      const flick = !this.calm && fl.t % 400 > 385 && Math.floor(fl.t / 3) % 2 === 0;
      fl.img.setAlpha(flick ? 0.1 : fl.base + Math.sin(fl.t * 0.05) * 0.06);
    }
    if (this.rays) {
      const cx = L.camX + VIEW.width / 2;
      const inside = this.outdoor.some(([a, b]) => cx > a - 200 && cx < b + 200);
      const target = inside ? 0.85 + Math.sin(f * 0.02) * 0.15 : 0;
      this.rays.setAlpha(this.rays.alpha + (target - this.rays.alpha) * 0.05);
    }
    if (this.rain.length) {
      const cx = L.camX + VIEW.width / 2;
      const inside = this.outdoor.some(([a, b]) => cx > a && cx < b) || L.run.level === 1;
      for (const r of this.rain) {
        r.y += 14;
        r.x -= 3;
        if (r.y > VIEW.height) {
          r.y = -20;
          r.x = Math.random() * (VIEW.width + 100);
        }
        r.setVisible(inside);
      }
      this.rainTint?.setVisible(inside);
      if (inside && f % 6 === 0)
        this.L.fx.burst(L.camX + Math.random() * VIEW.width, L.map.groundY, 0xc8e6ff, 2, {
          speed: 1.2,
          life: 10,
          up: true,
        });
    }
  }
}
