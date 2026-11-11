/** Regular enemies: Bug, Street dog, Meeting invite, Coworker (PRD section 5). */
import Phaser from 'phaser';
import { ENEMY, OFFICE, SCORE } from '../config/game';
import { t, type StringKey } from '../i18n/strings';
import { sfx } from '../audio/sfx';
import type { LevelScene } from '../scenes/LevelScene';

export abstract class Enemy {
  alive = true;
  /** Harmless and non-interactive (e.g. a happy dog running off). */
  passive = false;
  stompable = true;
  boss = false;
  abstract hurtKey: StringKey;
  sprite: Phaser.GameObjects.Sprite;
  t = 0;

  constructor(
    protected L: LevelScene,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    tex: string,
  ) {
    this.sprite = L.add.sprite(x, y, tex, 0).setOrigin(0.5, 1).setDepth(20);
  }

  get cx(): number {
    return this.x + this.w / 2;
  }

  /** Always step (bosses, flying invites) or only near the player. */
  activeNear(px: number): boolean {
    return Math.abs(this.cx - px) < ENEMY.activeRange;
  }

  abstract step(): void;
  abstract onStomp(): void;

  /** Default contact: hurt the player. */
  onTouch(): void {
    this.L.hurtPlayer(this.hurtKey, this.cx);
  }

  /** Touched while the player wears headphones. */
  onMute(): void {
    this.L.fx.popup(this.cx, this.y - 10, t('mute'), '#22D3EE');
    this.L.fx.burst(this.cx, this.y + this.h / 2, 0x22d3ee, 14);
    sfx('stomp');
    this.kill();
  }

  kill(): void {
    this.alive = false;
    this.sprite.destroy();
  }

  draw(): void {
    this.sprite.setPosition(this.x + this.w / 2, this.y + this.h);
  }
}

export class Bug extends Enemy {
  hurtKey: StringKey = 'bugHit';
  private dir = -1;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private min: number,
    private max: number,
  ) {
    super(L, x, y, 36, 28, 'bug');
    this.x = Math.min(max - this.w, Math.max(min, x + (max - min) / 2));
  }

  step(): void {
    this.t++;
    this.x += this.dir * ENEMY.bugSpeed * this.L.mood.enemySpeed;
    if (this.x <= this.min) {
      this.x = this.min;
      this.dir = 1;
    } else if (this.x + this.w >= this.max) {
      this.x = this.max - this.w;
      this.dir = -1;
    }
  }

  onStomp(): void {
    const L = this.L;
    L.addScore(SCORE.bug * L.mood.bugScore);
    L.fx.popup(
      this.cx,
      this.y - 6,
      t('bugFixed').replace('100', String(SCORE.bug * L.mood.bugScore)),
      '#69DB7C',
    );
    L.fx.burst(this.cx, this.y + 14, 0x40c057, 16);
    L.fx.corpse('bugSquash', this.cx, this.y + this.h, this.dir > 0);
    sfx('stomp');
    this.kill();
  }

  draw(): void {
    super.draw();
    this.sprite.setFrame(Math.floor(this.t / 6) % 4);
    this.sprite.setFlipX(this.dir > 0);
    this.sprite.setRotation(Math.sin(this.t * 0.4) * 0.06);
  }
}

export class Dog extends Enemy {
  hurtKey: StringKey = 'dogBite';
  private dir = -1;
  private chasing = false;
  private barkCd = 0;
  private fleeing = false;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private min: number,
    private max: number,
    private chase: number,
    private patrol: number = ENEMY.dogSpeed,
  ) {
    super(L, x, y, 48, 34, 'dog');
    this.x = min + (max - min) * 0.6;
  }

  step(): void {
    this.t++;
    if (this.barkCd > 0) this.barkCd--;
    if (this.fleeing) {
      this.x += this.dir * 6;
      if (Math.abs(this.cx - this.L.player.cx) > 1100) this.kill();
      return;
    }
    const p = this.L.player;
    const dx = p.cx - this.cx;
    const near =
      Math.abs(dx) < ENEMY.dogChaseRange && Math.abs(p.body.y + p.body.h - (this.y + this.h)) < 140;
    if (near && !this.chasing && this.barkCd === 0) {
      this.L.fx.popup(this.cx, this.y - 14, t('bark'), '#FFD43B', 11);
      sfx('bark');
      this.barkCd = 150;
    }
    this.chasing = near;
    const speed = (near ? this.chase : this.patrol) * this.L.mood.enemySpeed;
    if (near) this.dir = dx > 0 ? 1 : -1;
    this.x += this.dir * speed;
    if (this.x <= this.min) {
      this.x = this.min;
      if (!near) this.dir = 1;
    } else if (this.x + this.w >= this.max) {
      this.x = this.max - this.w;
      if (!near) this.dir = -1;
    }
  }

  onStomp(): void {
    const L = this.L;
    L.addScore(SCORE.dog);
    L.fx.popup(this.cx, this.y - 8, t('goodBoy'), '#FFD43B');
    L.fx.burst(this.cx, this.y + 10, 0xffd43b, 10);
    sfx('stomp');
    // Never hurt: the dog runs happily off screen.
    this.fleeing = true;
    this.passive = true;
    this.dir = L.player.cx < this.cx ? 1 : -1;
  }

  onMute(): void {
    this.L.fx.popup(this.cx, this.y - 10, t('mute'), '#22D3EE');
    this.fleeing = true;
    this.passive = true;
    this.dir = this.L.player.cx < this.cx ? 1 : -1;
  }

  activeNear(px: number): boolean {
    return this.fleeing || super.activeNear(px);
  }

  draw(): void {
    super.draw();
    const fast = this.fleeing || this.chasing;
    this.sprite.setFrame(Math.floor(this.t / (fast ? 4 : 7)) % 4);
    this.sprite.setFlipX(this.dir < 0);
    // Bouncy run.
    this.sprite.y -= Math.abs(Math.sin(this.t * (fast ? 0.35 : 0.2))) * 4;
  }
}

export class Invite extends Enemy {
  hurtKey: StringKey;
  private started = false;
  private y0: number;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private speed: number,
    hurtKey: StringKey = 'meetingHit',
  ) {
    super(L, x - 22, y - 15, 42, 28, 'invite');
    this.y0 = this.y;
    this.hurtKey = hurtKey;
  }

  activeNear(px: number): boolean {
    if (this.started) return true;
    return super.activeNear(px);
  }

  step(): void {
    this.started = true;
    this.t++;
    this.x -= this.speed;
    this.y = this.y0 + Math.sin(this.t * ENEMY.inviteWaveSpeed) * ENEMY.inviteWave;
    if (this.t % 5 === 0) this.L.fx.trail(this.x + this.w + 4, this.y + 8 + (this.t % 3) * 6, 0xffffff, 'px');
    if (this.x + this.w < this.L.camX - 300) this.kill();
  }

  onStomp(): void {
    const L = this.L;
    L.addScore(SCORE.invite);
    L.fx.popup(this.cx, this.y - 6, t('meetingDeclined'), '#4DABF7');
    L.fx.burst(this.cx, this.y + 14, 0xffffff, 14);
    L.fx.corpse('inviteTorn', this.cx, this.y + this.h, false, true);
    sfx('stomp');
    this.kill();
  }

  draw(): void {
    this.sprite.setPosition(this.x + this.w / 2, this.y + this.h);
    this.sprite.setRotation(Math.sin(this.t * ENEMY.inviteWaveSpeed + Math.PI / 2) * 0.18);
  }
}

export class Coworker extends Enemy {
  hurtKey: StringKey = 'coworkerAsk';
  private cooldown = 0;
  private leaving = 0;

  constructor(L: LevelScene, x: number, y: number) {
    super(L, x, y, 36, 60, 'coworker');
  }

  step(): void {
    this.t++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.leaving > 0) {
      this.leaving--;
      this.x += 3;
      this.sprite.setAlpha(this.leaving / 40);
      if (this.leaving === 0) this.kill();
    }
  }

  /** Contact grabs and slows for 2 s; no damage. */
  onTouch(): void {
    if (this.cooldown > 0 || this.leaving > 0) return;
    const L = this.L;
    L.player.grabbed = OFFICE.grabFrames;
    this.cooldown = OFFICE.grabFrames + 30;
    L.fx.popup(this.cx, this.y - 16, t('coworkerAsk'), '#FFFFFF', 10);
    sfx('coworker');
  }

  onStomp(): void {
    const L = this.L;
    L.player.grabbed = 0;
    L.addScore(SCORE.coworker);
    L.fx.popup(this.cx, this.y - 8, t('helpLater'), '#FFD43B');
    sfx('stomp');
    this.passive = true;
    this.leaving = 40;
  }

  onMute(): void {
    this.L.fx.popup(this.cx, this.y - 10, t('mute'), '#22D3EE');
    this.passive = true;
    this.leaving = 40;
  }

  draw(): void {
    super.draw();
    this.sprite.setFrame(Math.floor(this.t / 40) % 2);
    this.sprite.setFlipX(this.L.player.cx > this.cx);
  }
}
