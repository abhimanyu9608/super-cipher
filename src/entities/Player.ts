/** The player: physics body + procedural animation (PRD section 8). */
import Phaser from 'phaser';
import { PHYSICS, type CharacterId } from '../config/physics';
import {
  createPlayerBody,
  stepPlayer,
  type PlayerBody,
  type PlayerInput,
  type PhysicsEnv,
  type StepEvents,
} from '../systems/physics';
import { CHAR_H } from '../gfx/characters';
import type { LevelScene } from '../scenes/LevelScene';

export class Player {
  body: PlayerBody;
  sprite: Phaser.GameObjects.Sprite;
  private ring: Phaser.GameObjects.Graphics;
  invuln = 0;
  /** Frames left of the coworker grab slow. */
  grabbed = 0;
  /** Frames since the last hit (drives the hurt pose). */
  sinceHit = 999;
  squash = 0;
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
  ) {
    this.body = createPlayerBody(character, x, y);
    this.sprite = L.add
      .sprite(0, 0, `player-${character}`, 'idle0')
      .setOrigin(0.5, 160 / CHAR_H)
      .setScale(0.5)
      .setDepth(30);
    this.ring = L.add.graphics().setDepth(29);
  }

  step(inp: PlayerInput, solids: Parameters<typeof stepPlayer>[2], env: PhysicsEnv): StepEvents {
    this.prevBottom = this.body.y + this.body.h;
    if (this.invuln > 0) this.invuln--;
    if (this.grabbed > 0) this.grabbed--;
    this.sinceHit++;
    const ev = stepPlayer(this.body, inp, solids, { ...env, slow: env.slow || this.grabbed > 0 });
    if (ev.landedSpeed > 0) this.squash = 0.22;
    return ev;
  }

  hurtKnockback(fromX: number): void {
    const b = this.body;
    const dir = b.x + b.w / 2 < fromX ? -1 : 1;
    b.vy = -PHYSICS.hurtKnockUp;
    b.vx = dir * PHYSICS.hurtKnockBack;
    b.onGround = false;
    b.ground = null;
    this.invuln = PHYSICS.invulnFrames;
    this.sinceHit = 0;
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
    let frame: string;
    let bob = 0;
    if (this.win) frame = Math.floor(L.frame / 12) % 2 === 0 ? 'win0' : 'win1';
    else if (this.sinceHit < 30) frame = 'hurt';
    else if (!b.onGround) frame = b.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.vx) > 0.3) {
      this.runPhase += Math.abs(b.vx) * 0.075;
      frame = `run${Math.floor(this.runPhase) % 6}`;
      bob = Math.abs(Math.sin(this.runPhase * Math.PI)) * 5;
    } else {
      this.idleTimer++;
      frame = Math.floor(this.idleTimer / 30) % 2 === 0 ? 'idle0' : 'idle1';
    }
    s.setFrame(frame);
    s.setFlipX(b.facing < 0);

    // Stretch going up, squash on landing, lean with speed.
    let sx = 0.5;
    let sy = 0.5;
    if (!b.onGround && b.vy < 0) {
      sx *= 0.94;
      sy *= 1.06;
    }
    if (this.squash > 0.01) {
      sx *= 1 + this.squash;
      sy *= 1 - this.squash;
      this.squash *= 0.82;
    }
    s.setScale(sx, sy);
    s.setRotation(b.onGround ? b.vx * 0.012 : b.vx * 0.035);
    s.setPosition(b.x + b.w / 2, b.y + b.h - bob * 0.5 + 0.5);

    // Blink every 4 frames while invulnerable.
    s.setAlpha(this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0 ? 0.25 : 1);

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
