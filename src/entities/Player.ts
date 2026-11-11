/** The player: physics body + procedural animation (PRD section 8) and extra "juice". */
import Phaser from 'phaser';
import { PHYSICS, type CharacterId } from '../config/physics';
import type { SkinId } from '../config/extras';
import {
  createPlayerBody,
  stepPlayer,
  type PlayerBody,
  type PlayerInput,
  type PhysicsEnv,
  type StepEvents,
} from '../systems/physics';
import { CHAR_H, sheetKey } from '../gfx/characters';
import type { LevelScene } from '../scenes/LevelScene';

/** Cartoon reactions to specific hazards. */
export type HurtStyle = 'normal' | 'splat' | 'slip' | 'tangle';

export class Player {
  body: PlayerBody;
  sprite: Phaser.GameObjects.Sprite;
  private ring: Phaser.GameObjects.Graphics;
  private orbit: Phaser.GameObjects.Image[] = [];
  invuln = 0;
  /** Frames left of the coworker grab slow. */
  grabbed = 0;
  /** Frames since the last hit (drives the hurt pose). */
  sinceHit = 999;
  hurtStyle: HurtStyle = 'normal';
  squash = 0;
  /** Frames left of the skid pose (direction change at speed). */
  skid = 0;
  /** True when time is running out: worried face + sweat. */
  worried = false;
  /** Cutscene overrides (intro). */
  pose: { frame: string; rot: number; dy: number } | null = null;
  private runPhase = 0;
  private idleTimer = 0;
  win = false;
  hidden = false;
  prevBottom = 0;

  constructor(
    private L: LevelScene,
    public character: CharacterId,
    x: number,
    y: number,
    skin: SkinId = 'none',
  ) {
    this.body = createPlayerBody(character, x, y);
    this.sprite = L.add
      .sprite(0, 0, sheetKey(character, skin), 'idle0')
      .setOrigin(0.5, 160 / CHAR_H)
      .setScale(0.5)
      .setDepth(30);
    this.ring = L.add.graphics().setDepth(29);
    for (let i = 0; i < 3; i++)
      this.orbit.push(L.add.image(0, 0, 'calendar').setDepth(31).setVisible(false).setScale(0.8));
  }

  step(inp: PlayerInput, solids: Parameters<typeof stepPlayer>[2], env: PhysicsEnv): StepEvents {
    const b = this.body;
    this.prevBottom = b.y + b.h;
    if (this.invuln > 0) this.invuln--;
    if (this.grabbed > 0) this.grabbed--;
    if (this.skid > 0) this.skid--;
    this.sinceHit++;
    const vxBefore = b.vx;
    const ev = stepPlayer(b, inp, solids, { ...env, slow: env.slow || this.grabbed > 0 });
    if (ev.landedSpeed > 0) this.squash = 0.22;
    // Skid: pushing against fast movement on the ground.
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (
      b.onGround &&
      dir !== 0 &&
      Math.sign(vxBefore) === -dir &&
      Math.abs(vxBefore) > b.maxRun * 0.6 &&
      this.skid === 0
    ) {
      this.skid = 12;
      this.L.onSkid(b.x + b.w / 2 - Math.sign(vxBefore) * 10, b.y + b.h);
    }
    return ev;
  }

  hurtKnockback(fromX: number, style: HurtStyle = 'normal'): void {
    const b = this.body;
    const dir = b.x + b.w / 2 < fromX ? -1 : 1;
    b.vy = -PHYSICS.hurtKnockUp;
    b.vx = dir * PHYSICS.hurtKnockBack;
    b.onGround = false;
    b.ground = null;
    this.invuln = PHYSICS.invulnFrames;
    this.sinceHit = 0;
    this.hurtStyle = style;
  }

  respawn(x: number, y: number): void {
    const b = this.body;
    b.x = x;
    b.y = y;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    b.ground = null;
    b.dashFrames = 0;
    this.invuln = PHYSICS.invulnFrames;
    this.grabbed = 0;
  }

  get cx(): number {
    return this.body.x + this.body.w / 2;
  }

  get cy(): number {
    return this.body.y + this.body.h / 2;
  }

  /** Sync the sprite with the body. Called once per simulated frame. */
  draw(): void {
    const b = this.body;
    const s = this.sprite;
    const L = this.L;
    s.setVisible(!this.hidden);
    const w = this.worried ? 'w' : '';
    let frame: string;
    let bob = 0;
    if (this.pose) frame = this.pose.frame;
    else if (this.win) frame = Math.floor(L.frame / 12) % 2 === 0 ? 'win0' : 'win1';
    else if (this.sinceHit < 30) frame = 'hurt';
    else if (this.skid > 0) frame = 'skid';
    else if (!b.onGround) frame = b.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.vx) > 0.3) {
      this.runPhase += Math.abs(b.vx) * 0.075;
      frame = `${w}run${Math.floor(this.runPhase) % 6}`;
      bob = Math.abs(Math.sin(this.runPhase * Math.PI)) * 5;
    } else {
      this.idleTimer++;
      // Breathe, and blink every ~3 s.
      const blink = this.idleTimer % 180 > 172;
      frame = this.worried
        ? 'widle'
        : blink
          ? 'blink'
          : Math.floor(this.idleTimer / 30) % 2 === 0
            ? 'idle0'
            : 'idle1';
    }
    s.setFrame(frame);
    s.setFlipX(b.facing < 0);

    // Stretch going up, squash on landing, lean with speed.
    let sx = 0.5;
    let sy = 0.5;
    let rot = b.onGround ? b.vx * 0.012 : b.vx * 0.035;
    if (!b.onGround && b.vy < 0) {
      sx *= 0.94;
      sy *= 1.06;
    }
    if (this.squash > 0.01) {
      sx *= 1 + this.squash;
      sy *= 1 - this.squash;
      this.squash *= 0.82;
    }
    // Hazard-specific hit reactions (first 36 frames after the hit).
    const hitT = this.sinceHit;
    const reacting = hitT < 36 && !this.pose;
    if (reacting && this.hurtStyle === 'splat') {
      // Flattened like a sticker, then pops back.
      const k = hitT < 24 ? 1 : 1 - (hitT - 24) / 12;
      sx *= 1 + 0.9 * k;
      sy *= 1 - 0.8 * k;
      rot = 0;
    } else if (reacting && this.hurtStyle === 'slip') {
      // Banana slip: a full spin.
      rot = (hitT / 36) * Math.PI * 2 * (b.facing > 0 ? -1 : 1);
    }
    for (const [i, o] of this.orbit.entries()) {
      const on = reacting && this.hurtStyle === 'tangle' && !this.hidden;
      o.setVisible(on);
      if (on) {
        const a = L.frame * 0.25 + (i * Math.PI * 2) / 3;
        o.setPosition(b.x + b.w / 2 + Math.cos(a) * 34, b.y + 20 + Math.sin(a) * 12);
      }
    }
    if (this.pose) {
      rot = this.pose.rot;
      bob = this.pose.dy;
    }
    s.setScale(sx, sy);
    s.setRotation(rot);
    s.setPosition(b.x + b.w / 2, b.y + b.h - bob * 0.5 + 0.5);

    // Blink every 4 frames while invulnerable (not during the cartoon reaction, so it reads clearly).
    const blinking = this.invuln > 0 && !(reacting && this.hurtStyle !== 'normal');
    s.setAlpha(blinking && Math.floor(this.invuln / 4) % 2 === 0 ? 0.25 : 1);

    // Headphones: rainbow ring.
    const run = L.run;
    this.ring.clear();
    if (run.power.headphones > 0 && !this.hidden) {
      const hue = (L.frame * 6) % 360;
      const col = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 1) as Phaser.Types.Display.ColorObject;
      this.ring.lineStyle(4, Phaser.Display.Color.GetColor(col.r, col.g, col.b), 0.85);
      this.ring.strokeCircle(b.x + b.w / 2, b.y + b.h / 2 - 4, 44 + Math.sin(L.frame * 0.3) * 3);
      const col2 = Phaser.Display.Color.HSVToRGB(
        ((hue + 180) % 360) / 360,
        0.8,
        1,
      ) as Phaser.Types.Display.ColorObject;
      this.ring.lineStyle(2, Phaser.Display.Color.GetColor(col2.r, col2.g, col2.b), 0.6);
      this.ring.strokeCircle(b.x + b.w / 2, b.y + b.h / 2 - 4, 50);
    }
  }
}
