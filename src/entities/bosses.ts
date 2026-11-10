/** Bosses: Monkey mini-boss (Level 1) and the Manager (Level 2). PRD sections 6 and 7. */
import Phaser from 'phaser';
import { MANAGER, MONKEY, SCORE, FX } from '../config/game';
import { t, type StringKey } from '../i18n/strings';
import { sfx } from '../audio/sfx';
import { Enemy } from './enemies';
import { Projectile, RingWave } from './hazards';
import type { LevelScene } from '../scenes/LevelScene';

export class Monkey extends Enemy {
  hurtKey: StringKey = 'monkeyHit';
  boss = true;
  hp: number = MONKEY.hp;
  active = false;
  private vy = 0;
  private floorY: number;
  private hopIn = 90;
  private throwIn = 80;
  private inv = 0;
  private defeated = false;
  private spin = 0;
  private dir = -1;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private min: number,
    private max: number,
  ) {
    super(L, x, y, MONKEY.w, MONKEY.h, 'monkey');
    this.floorY = y + MONKEY.h;
    this.x = max - this.w - 20;
  }

  activeNear(): boolean {
    return this.active || this.defeated;
  }

  step(): void {
    this.t++;
    const L = this.L;
    if (this.defeated) {
      // Spins off screen.
      this.spin += 0.3;
      this.vy += 0.4;
      this.x += 4;
      this.y += this.vy;
      if (this.y > 700) this.kill();
      return;
    }
    if (this.inv > 0) this.inv--;
    const p = L.player;
    const dx = p.cx - this.cx;
    const dist = Math.abs(dx);
    this.dir = dx > 0 ? 1 : -1;
    // Keep 150–300 px from the player.
    if (dist < MONKEY.minDist) this.x -= this.dir * MONKEY.speed;
    else if (dist > MONKEY.maxDist) this.x += this.dir * MONKEY.speed;
    this.x = Phaser.Math.Clamp(this.x, this.min, this.max - this.w);
    // Hop.
    this.hopIn--;
    const onFloor = this.y + this.h >= this.floorY;
    if (this.hopIn <= 0 && onFloor) {
      this.vy = MONKEY.hopVy;
      this.hopIn = Phaser.Math.Between(MONKEY.hopMin, MONKEY.hopMax);
    }
    this.vy += MONKEY.gravity;
    this.y += this.vy;
    if (this.y + this.h > this.floorY) {
      this.y = this.floorY - this.h;
      this.vy = 0;
    }
    // Throw bananas faster as HP drops.
    this.throwIn--;
    if (this.throwIn <= 0) {
      this.throwIn = MONKEY.throwEvery[Math.max(0, this.hp - 1)];
      this.throwBanana();
    }
  }

  private throwBanana(): void {
    const L = this.L;
    const sx = this.cx;
    const sy = this.y + 20;
    const T = MONKEY.bananaFlight;
    const tx = L.player.cx;
    const ty = L.player.cy;
    const vx = (tx - sx) / T;
    const vy = (ty - sy - 0.5 * MONKEY.bananaGravity * T * T) / T;
    L.addHazard(
      new Projectile(L, 'banana', sx - 10, sy, 20, 14, vx, vy, MONKEY.bananaGravity, 'bananaHit', {
        spin: 0.25,
      }),
    );
    if (Math.random() < 0.35) {
      L.fx.popup(this.cx, this.y - 10, t('ook'), '#FFD43B', 10);
      sfx('ook');
    }
  }

  onStomp(): void {
    const L = this.L;
    if (this.inv > 0 || this.defeated) return;
    this.hp--;
    this.inv = MONKEY.invuln;
    L.addScore(SCORE.bossHit);
    L.fx.popup(this.cx, this.y - 10, `+${SCORE.bossHit}`, '#FFD43B');
    L.fx.burst(this.cx, this.y + 20, 0xff5c5c, 16);
    L.fx.addShake(FX.shakeBoss);
    sfx('bossHit');
    // Knockback away from the player.
    this.x += (this.cx < L.player.cx ? -1 : 1) * 60;
    this.x = Phaser.Math.Clamp(this.x, this.min, this.max - this.w);
    this.vy = -6;
    if (this.hp <= 0) {
      this.defeated = true;
      this.passive = true;
      this.vy = -10;
      L.addScore(SCORE.monkeyDefeat);
      L.fx.popup(this.cx, this.y - 30, t('monkeyGone'), '#FFD43B', 12);
      sfx('monkeyGone');
      L.dropIdCard(this.cx - 14, this.y + 10);
    } else {
      L.fx.popup(this.cx, this.y - 26, t('ook'), '#FFFFFF', 10);
      sfx('ook');
    }
  }

  onTouch(): void {
    if (this.inv > 0 || this.defeated) return;
    super.onTouch();
  }

  /** Headphones don't clear bosses. */
  onMute(): void {}

  draw(): void {
    super.draw();
    const s = this.sprite;
    s.setFrame(Math.floor(this.t / 10) % 2);
    s.setFlipX(this.dir > 0);
    s.setRotation(this.spin);
    // Red glow + blink when hit.
    s.setTint(this.inv > 0 && Math.floor(this.inv / 4) % 2 === 0 ? 0xff6b6b : 0xffffff);
    s.setAlpha(this.inv > 0 && Math.floor(this.inv / 4) % 2 === 1 ? 0.5 : 1);
  }

  get statusHp(): number {
    return Math.max(0, this.hp);
  }
}

/** Manager boss: stomp the glowing laptop on the meeting table. */
export class Manager extends Enemy {
  hurtKey: StringKey = 'inviteHit';
  boss = true;
  hp: number = MANAGER.hp;
  active = false;
  defeated = false;
  stompable = true;
  private laptop: Phaser.GameObjects.Image;
  /** Walk timer after a hit: laptop is not stompable while carried. */
  private walk = 0;
  private walkFrom = 0;
  private walkTo = 0;
  private inviteIn = 60;
  private ringIn = 120;
  private paperIn = 40;
  private leaving = 0;
  private tableY: number;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private tableX0: number,
    private tableX1: number,
    tableY: number,
    private arenaX0: number,
    private arenaX1: number,
  ) {
    super(L, x, y, MANAGER.w, MANAGER.h, 'manager');
    this.sprite.setDepth(4);
    this.tableY = tableY;
    this.laptop = L.add.image(0, 0, 'laptop').setOrigin(0.5, 1).setDepth(9);
  }

  activeNear(): boolean {
    return this.active || this.leaving > 0;
  }

  /** The laptop is the stomp target (60x30 on the table in front of him). */
  get laptopRect(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.cx - MANAGER.laptopW / 2,
      y: this.tableY - MANAGER.laptopH,
      w: MANAGER.laptopW,
      h: MANAGER.laptopH,
    };
  }

  get vulnerable(): boolean {
    return this.walk === 0 && !this.defeated;
  }

  private get speedUp(): number {
    return this.hp === 1 ? MANAGER.phase3SpeedUp : 1;
  }

  get phaseKey(): StringKey {
    return this.hp >= 3 ? 'phase1' : this.hp === 2 ? 'phase2' : 'phase3';
  }

  step(): void {
    this.t++;
    const L = this.L;
    if (this.leaving > 0) {
      this.leaving--;
      this.x += 2.5;
      if (this.leaving === 0) this.kill();
      return;
    }
    if (this.walk > 0) {
      this.walk--;
      const k = 1 - this.walk / MANAGER.walkFrames;
      this.x = this.walkFrom + (this.walkTo - this.walkFrom) * k;
    }
    // Phase 1+: calendar invites in arcs.
    this.inviteIn -= this.speedUp;
    if (this.inviteIn <= 0) {
      this.inviteIn = MANAGER.inviteEvery;
      const tx = L.player.cx;
      const T = 60;
      const sx = this.cx;
      const sy = this.y + 30;
      const vx = (tx - sx) / T;
      const vy = (L.player.cy - sy - 0.5 * MANAGER.inviteGravity * T * T) / T;
      L.addHazard(
        new Projectile(
          L,
          'calendar',
          sx - 12,
          sy,
          24,
          22,
          vx * this.speedUp,
          vy,
          MANAGER.inviteGravity * this.speedUp * this.speedUp,
          'inviteHit',
          { spin: 0.1 },
        ),
      );
      if (this.t % 3 === 0) L.fx.popup(this.cx, this.y - 16, t('syncUp'), '#FFFFFF', 9);
    }
    // Phase 2+: phone-ring shockwave both ways along the floor.
    if (this.hp <= 2) {
      this.ringIn -= this.speedUp;
      if (this.ringIn <= 0) {
        this.ringIn = MANAGER.ringEvery;
        const gy = L.map.groundY;
        L.addHazard(
          new RingWave(L, this.cx - 13, gy, -MANAGER.ringSpeed * this.speedUp, this.arenaX0, this.arenaX1),
        );
        L.addHazard(
          new RingWave(L, this.cx - 13, gy, MANAGER.ringSpeed * this.speedUp, this.arenaX0, this.arenaX1),
        );
        sfx('ring', { volume: 0.7 });
      }
    }
    // Phase 3: deadline papers rain from the ceiling.
    if (this.hp <= 1) {
      this.paperIn--;
      if (this.paperIn <= 0) {
        this.paperIn = MANAGER.paperEvery;
        const px = Phaser.Math.Between(this.arenaX0 + 20, this.arenaX1 - 40);
        L.addHazard(
          new Projectile(L, 'deadline', px, -30, 18, 22, 0, 2.2, 0.06 * this.speedUp, 'deadlineHit', {
            wobble: 6,
          }),
        );
      }
    }
  }

  onStomp(): void {
    const L = this.L;
    if (!this.vulnerable) return;
    this.hp--;
    L.addScore(SCORE.bossHit);
    L.fx.popup(this.cx, this.tableY - 50, t('muted'), '#FFD43B', 12);
    L.fx.burst(this.cx, this.tableY - 15, 0xffd43b, 18);
    L.fx.addShake(FX.shakeBoss);
    sfx('bossHit');
    if (this.hp <= 0) {
      this.defeated = true;
      this.passive = true;
      this.leaving = 160;
      L.addScore(SCORE.managerDefeat);
      L.fx.popup(this.cx, this.y - 20, t('managerBye'), '#FFFFFF', 11);
      sfx('manager');
      L.onManagerDefeated();
      this.laptop.destroy();
      return;
    }
    // Picks up the laptop and walks to the other end of the table for 3 s.
    this.walk = MANAGER.walkFrames;
    this.walkFrom = this.x;
    const mid = (this.tableX0 + this.tableX1) / 2;
    this.walkTo = this.cx < mid ? this.tableX1 - this.w - 10 : this.tableX0 + 10;
    const line: StringKey = this.hp === 2 ? 'cameraOn' : 'deadline';
    L.fx.popup(this.cx, this.y - 20, t(line), '#FF8787', 11);
    sfx('manager');
  }

  /** Body sits behind the table: no contact damage, only his attacks hurt. */
  onTouch(): void {}
  onMute(): void {}

  draw(): void {
    super.draw();
    const s = this.sprite;
    s.setFrame(this.walk > 0 || this.t % 240 < 120 ? 1 : 0);
    s.setFlipX(this.L.player.cx < this.cx);
    if (this.walk > 0) s.y -= Math.abs(Math.sin(this.t * 0.25)) * 4;
    if (this.laptop.active) {
      const lr = this.laptopRect;
      const carried = this.walk > 0;
      this.laptop.setPosition(lr.x + lr.w / 2, carried ? this.y + 70 : this.tableY + 2);
      this.laptop.setAlpha(carried ? 0.6 : 1);
      this.laptop.setScale(carried ? 0.8 : 1 + Math.sin(this.t * 0.15) * 0.04);
    }
    if (this.leaving > 0) s.setAlpha(Math.min(1, this.leaving / 60));
  }
}
