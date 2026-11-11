/** Bosses: Monkey mini-boss (Level 1) and the Manager (Level 2). PRD sections 6 and 7. */
import Phaser from 'phaser';
import { MANAGER, MONKEY, PROD_BUG, SCORE, FX } from '../config/game';
import { t, type StringKey } from '../i18n/strings';
import { sfx } from '../audio/sfx';
import { Enemy, Bug } from './enemies';
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

/** Art, attacks and lines for a desk boss (Manager in Level 2, Canteen Aunty in Level 3). */
export interface DeskBossStyle {
  body: string;
  weak: string;
  arcTex: string;
  arcHurt: StringKey;
  arcLine: StringKey;
  waveTex: string;
  waveHurt: StringKey;
  rainTex: string;
  rainHurt: StringKey;
  hitLine: StringKey;
  phaseLines: [StringKey, StringKey];
  byeLine: StringKey;
  phases: [StringKey, StringKey, StringKey];
  /** Boss intro banner, HUD name, first line and jumpscare caption. */
  bannerKey: StringKey;
  nameKey: StringKey;
  greetKey: StringKey;
  scareKey: StringKey;
}

export const MANAGER_STYLE: DeskBossStyle = {
  body: 'manager',
  weak: 'laptop',
  arcTex: 'calendar',
  arcHurt: 'inviteHit',
  arcLine: 'syncUp',
  waveTex: 'ring',
  waveHurt: 'ringHit',
  rainTex: 'deadline',
  rainHurt: 'deadlineHit',
  hitLine: 'muted',
  phaseLines: ['cameraOn', 'deadline'],
  byeLine: 'managerBye',
  phases: ['phase1', 'phase2', 'phase3'],
  bannerKey: 'bossManager',
  nameKey: 'managerName',
  greetKey: 'quickCall',
  scareKey: 'scareManager',
};

export const AUNTY_STYLE: DeskBossStyle = {
  body: 'aunty',
  weak: 'cooker',
  arcTex: 'roti',
  arcHurt: 'rotiHit',
  arcLine: 'rotiThrow',
  waveTex: 'sambar',
  waveHurt: 'sambarHit',
  rainTex: 'chilli',
  rainHurt: 'chilliHit',
  hitLine: 'cookerHit',
  phaseLines: ['auntyLine2', 'auntyLine3'],
  byeLine: 'auntyBye',
  phases: ['auntyP1', 'auntyP2', 'auntyP3'],
  bannerKey: 'bossAunty',
  nameKey: 'auntyName',
  greetKey: 'auntyHi',
  scareKey: 'scareAunty',
};

export const CLIENT_STYLE: DeskBossStyle = {
  body: 'client',
  weak: 'scopeDoc',
  arcTex: 'changeReq',
  arcHurt: 'crHit',
  arcLine: 'clientSmall',
  waveTex: 'scopeWave',
  waveHurt: 'scopeHit',
  rainTex: 'revision',
  rainHurt: 'revisionHit',
  hitLine: 'scopeLocked',
  phaseLines: ['clientLine2', 'clientLine3'],
  byeLine: 'clientBye',
  phases: ['clientP1', 'clientP2', 'clientP3'],
  bannerKey: 'bossClient',
  nameKey: 'clientName',
  greetKey: 'clientHi',
  scareKey: 'scareClient',
};

export const HR_STYLE: DeskBossStyle = {
  body: 'hr',
  weak: 'mic',
  arcTex: 'iceCard',
  arcHurt: 'iceHit',
  arcLine: 'hrArc',
  waveTex: 'songWave',
  waveHurt: 'songHit',
  rainTex: 'feedbackForm',
  rainHurt: 'formHit',
  hitLine: 'micHit',
  phaseLines: ['hrLine2', 'hrLine3'],
  byeLine: 'hrBye',
  phases: ['hrP1', 'hrP2', 'hrP3'],
  bannerKey: 'bossHR',
  nameKey: 'hrName',
  greetKey: 'hrHi',
  scareKey: 'scareHR',
};

/** Map object type → desk boss style. */
export const DESK_BOSSES: Record<string, DeskBossStyle> = {
  manager: MANAGER_STYLE,
  aunty: AUNTY_STYLE,
  client: CLIENT_STYLE,
  hr: HR_STYLE,
};

/** Desk boss: stomp the glowing weak spot (laptop / pressure cooker) on the table. */
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
    public style: DeskBossStyle = MANAGER_STYLE,
  ) {
    super(L, x, y, MANAGER.w, MANAGER.h, style.body);
    this.sprite.setDepth(4);
    this.tableY = tableY;
    this.hurtKey = style.arcHurt;
    this.laptop = L.add.image(0, 0, style.weak).setOrigin(0.5, 1).setDepth(9);
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
    return this.style.phases[this.hp >= 3 ? 0 : this.hp === 2 ? 1 : 2];
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
          this.style.arcTex,
          sx - 12,
          sy,
          24,
          22,
          vx * this.speedUp,
          vy,
          MANAGER.inviteGravity * this.speedUp * this.speedUp,
          this.style.arcHurt,
          { spin: 0.1 },
        ),
      );
      if (this.t % 3 === 0) L.fx.popup(this.cx, this.y - 16, t(this.style.arcLine), '#FFFFFF', 9);
    }
    // Phase 2+: phone-ring shockwave both ways along the floor.
    if (this.hp <= 2) {
      this.ringIn -= this.speedUp;
      if (this.ringIn <= 0) {
        this.ringIn = MANAGER.ringEvery;
        const gy = L.map.groundY;
        L.addHazard(
          new RingWave(
            L,
            this.cx - 13,
            gy,
            -MANAGER.ringSpeed * this.speedUp,
            this.arenaX0,
            this.arenaX1,
            this.style.waveTex,
            this.style.waveHurt,
          ),
        );
        L.addHazard(
          new RingWave(
            L,
            this.cx - 13,
            gy,
            MANAGER.ringSpeed * this.speedUp,
            this.arenaX0,
            this.arenaX1,
            this.style.waveTex,
            this.style.waveHurt,
          ),
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
          new Projectile(
            L,
            this.style.rainTex,
            px,
            -30,
            18,
            22,
            0,
            2.2,
            0.06 * this.speedUp,
            this.style.rainHurt,
            {
              wobble: 6,
            },
          ),
        );
      }
    }
  }

  onStomp(): void {
    const L = this.L;
    if (!this.vulnerable) return;
    this.hp--;
    L.addScore(SCORE.bossHit);
    L.fx.popup(this.cx, this.tableY - 50, t(this.style.hitLine), '#FFD43B', 12);
    L.fx.burst(this.cx, this.tableY - 15, 0xffd43b, 18);
    L.fx.addShake(FX.shakeBoss);
    sfx('bossHit');
    if (this.hp <= 0) {
      this.defeated = true;
      this.passive = true;
      this.leaving = 160;
      L.addScore(SCORE.managerDefeat);
      L.fx.popup(this.cx, this.y - 20, t(this.style.byeLine), '#FFFFFF', 11);
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
    const line: StringKey = this.style.phaseLines[this.hp === 2 ? 0 : 1];
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

/**
 * Giant Prod Bug (Level 4): walks after you across the war room and hops.
 * Phase 1 spawns mini bugs, phase 2 adds "500" error arcs, phase 3 adds a stack-overflow rain.
 * Stomp it 3 times.
 */
export class GiantBug extends Enemy {
  hurtKey: StringKey = 'bugHit';
  boss = true;
  hp: number = PROD_BUG.hp;
  active = false;
  defeated = false;
  private vy = 0;
  private floorY: number;
  private hopIn = 120;
  private spawnIn = 90;
  private errorIn = 60;
  private rainIn = 30;
  private inv = 0;
  private dir = -1;
  private gone = 0;
  private minions: Bug[] = [];
  /** Shell label drawn separately so it never mirrors when the bug turns around. */
  private tag: Phaser.GameObjects.Text;

  constructor(
    L: LevelScene,
    x: number,
    y: number,
    private min: number,
    private max: number,
  ) {
    super(L, x, y, PROD_BUG.w, PROD_BUG.h, 'prodBug');
    this.floorY = y + PROD_BUG.h;
    this.tag = L.add
      .text(0, 0, 'PROD', {
        fontFamily: '"Press Start 2P"',
        fontSize: '9px',
        color: '#FFFFFF',
        stroke: '#14121F',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(21);
  }

  activeNear(): boolean {
    return this.active || this.gone > 0;
  }

  get phaseKey(): StringKey {
    return this.hp >= 3 ? 'prodP1' : this.hp === 2 ? 'prodP2' : 'prodP3';
  }

  step(): void {
    this.t++;
    const L = this.L;
    if (this.defeated) {
      // Shrinks away into a harmless little bug.
      if (--this.gone <= 0) {
        this.tag.destroy();
        this.kill();
      }
      return;
    }
    if (this.inv > 0) this.inv--;
    const p = L.player;
    const dx = p.cx - this.cx;
    this.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > 40) this.x += this.dir * PROD_BUG.speed[Math.max(0, this.hp - 1)] * L.mood.enemySpeed;
    this.x = Phaser.Math.Clamp(this.x, this.min, this.max - this.w);
    // Hop.
    const onFloor = this.y + this.h >= this.floorY;
    if (--this.hopIn <= 0 && onFloor) {
      this.vy = PROD_BUG.hopVy;
      this.hopIn = Phaser.Math.Between(PROD_BUG.hopMin, PROD_BUG.hopMax);
    }
    this.vy += PROD_BUG.gravity;
    this.y += this.vy;
    if (this.y + this.h > this.floorY) {
      if (this.vy > 6) {
        L.fx.addShake(5);
        L.fx.dust(this.cx, this.floorY);
      }
      this.y = this.floorY - this.h;
      this.vy = 0;
    }
    // Phase 1+: spawn mini bugs (capped).
    this.minions = this.minions.filter((m) => m.alive);
    if (--this.spawnIn <= 0) {
      this.spawnIn = PROD_BUG.spawnEvery[Math.max(0, this.hp - 1)];
      if (this.minions.length < PROD_BUG.maxMinions) {
        const bug = new Bug(L, this.cx - 140, this.floorY - 28, this.min, this.max);
        bug.x = this.cx - 18;
        this.minions.push(bug);
        L.addEnemy(bug);
        L.fx.burst(this.cx, this.floorY - 20, 0x7c3aed, 10, { speed: 2 });
      }
    }
    // Phase 2+: "500" error arcs at the player.
    if (this.hp <= 2 && --this.errorIn <= 0) {
      this.errorIn = PROD_BUG.errorEvery;
      const T = PROD_BUG.errorFlight;
      const sx = this.cx;
      const sy = this.y + 10;
      const vx = (p.cx - sx) / T;
      const vy = (p.cy - sy - 0.5 * PROD_BUG.errorGravity * T * T) / T;
      L.addHazard(
        new Projectile(L, 'errorCode', sx - 22, sy, 40, 24, vx, vy, PROD_BUG.errorGravity, 'errorHit', {
          spin: 0.05,
        }),
      );
    }
    // Phase 3: stack traces rain down.
    if (this.hp <= 1 && --this.rainIn <= 0) {
      this.rainIn = PROD_BUG.rainEvery;
      const px = Phaser.Math.Between(this.min + 20, this.max - 40);
      L.addHazard(new Projectile(L, 'stackTrace', px, -30, 18, 24, 0, 2.4, 0.06, 'stackHit', { wobble: 6 }));
    }
  }

  onStomp(): void {
    const L = this.L;
    if (this.inv > 0 || this.defeated) return;
    this.hp--;
    this.inv = PROD_BUG.invuln;
    L.addScore(SCORE.bossHit);
    L.fx.popup(this.cx, this.y - 16, t('prodBugHit'), '#69DB7C', 12);
    L.fx.burst(this.cx, this.y + 20, 0x40c057, 22);
    L.fx.addShake(FX.shakeBoss);
    sfx('bossHit');
    this.x += (this.cx < L.player.cx ? -1 : 1) * 70;
    this.x = Phaser.Math.Clamp(this.x, this.min, this.max - this.w);
    this.vy = -7;
    if (this.hp <= 0) {
      this.defeated = true;
      this.passive = true;
      this.gone = 80;
      L.addScore(SCORE.managerDefeat);
      L.fx.popup(this.cx, this.y - 40, t('prodBugBye'), '#69DB7C', 14);
      L.fx.burst(this.cx, this.y + 30, 0x40c057, 30, { speed: 5 });
      for (const m of this.minions) if (m.alive) m.onMute();
      sfx('monkeyGone');
      L.onManagerDefeated();
    } else {
      L.fx.popup(this.cx, this.y - 40, t('prodBugRoar'), '#FF8787', 11);
      sfx('manager');
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
    s.setFrame(Math.floor(this.t / 7) % 4);
    s.setFlipX(this.dir < 0);
    s.setAlpha(this.inv > 0 && Math.floor(this.inv / 4) % 2 === 1 ? 0.45 : 1);
    // The shell is the back half of the sprite (behind the head).
    const back = this.dir < 0 ? 1 : -1;
    this.tag.setPosition(s.x + back * 4 * s.scaleX, s.y - 34 * s.scaleY).setAlpha(s.alpha);
    if (this.defeated) {
      const k = Math.max(0, this.gone / 80);
      s.setScale(k)
        .setAlpha(k)
        .setRotation((1 - k) * 6);
      this.tag.setAlpha(k).setScale(k);
    }
  }
}
