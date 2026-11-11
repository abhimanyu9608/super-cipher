/**
 * The level: builds the world from a Tiled map and runs the fixed 60 Hz simulation.
 * Level-specific systems (bus, bricks, metro doors, office clock, darkness...) switch on
 * based on which objects the map contains, so new levels are mostly a map + a few entities.
 */
import Phaser from 'phaser';
import { STEP_MS, MAX_STEPS_PER_FRAME, CAMERA, VIEW, CHARACTERS, type CharacterId } from '../config/physics';
import {
  BUS,
  BRICK,
  FX,
  HEARTS,
  METRO,
  OFFICE,
  POWERUP_FRAMES,
  SCORE,
  MANAGER,
  ENEMY,
  type PowerUpId,
} from '../config/game';
import { LEVELS, type LevelId } from '../config/levels';
import {
  parseMap,
  objectsOf,
  num,
  str,
  bool,
  type LevelMap,
  type MapObject,
  type TiledMap,
} from '../level/map';
import {
  makeSolid,
  overlaps,
  isStomp,
  safeSpot,
  type Solid,
  type Rect,
  type PlayerInput,
} from '../systems/physics';
import { clearBonus, starsFor, heartsAfterCoin, formatClock } from '../systems/score';
import { Fx, FONT } from '../systems/fx';
import { Player } from '../entities/Player';
import { Enemy, Bug, Dog, Invite, Coworker } from '../entities/enemies';
import { Monkey, Manager, GiantBug, DESK_BOSSES } from '../entities/bosses';
import { Bus, FallingBrick, Laser, Projectile, type Hazard } from '../entities/hazards';
import {
  Coin,
  Block,
  BlockCoin,
  PowerUpItem,
  Floating,
  IdCard,
  type Collectible,
  type ItemKind,
} from '../entities/items';
import { Mover, Chair, Conveyor, SlidePlatform, type MoverStyle } from '../entities/platforms';
import { paintBackdrop, paintGround } from '../gfx/world';
import { hexToInt, mix } from '../gfx/draw';
import { t, onLangChange, type StringKey } from '../i18n/strings';
import { session, newRun, type RunState } from '../game/session';
import { bus as events } from '../game/events';
import { input, consumeJump, consumeDash } from '../ui/input';
import { sfx, audio } from '../audio/sfx';
import { moodFor, STICKERS, type Mood, type SkinId } from '../config/extras';
import { Ambient } from '../systems/ambient';
import { ensureCharacter } from '../gfx/sprites';
import type { HurtStyle } from '../entities/Player';

export interface LevelStart {
  level: LevelId;
  character: CharacterId;
  mode: 'play' | 'attract';
  skin?: SkinId;
}

interface Section {
  key: string;
  x0: number;
  x1: number;
  top: string;
  bottom: string;
}

type State = 'intro' | 'play' | 'finishing' | 'over' | 'cleared';

export class LevelScene extends Phaser.Scene {
  map!: LevelMap;
  run!: RunState;
  mode: 'play' | 'attract' = 'play';
  player!: Player;
  fx!: Fx;
  solids: Solid[] = [];
  frame = 0;
  camX = 0;
  state: State = 'play';
  sections: Section[] = [];
  checkpoint = { x: 0, y: 0 };

  private acc = 0;
  private enemies: Enemy[] = [];
  private hazards: Hazard[] = [];
  private items: Collectible[] = [];
  private blocks: Block[] = [];
  private blockCoins: BlockCoin[] = [];
  private movers: Mover[] = [];
  private chairs: Chair[] = [];
  private conveyors: Conveyor[] = [];
  private slides: SlidePlatform[] = [];
  private lasers: Laser[] = [];
  private zones: Record<string, MapObject[]> = {};
  private sky!: Phaser.GameObjects.Graphics;
  private parallax: {
    obj: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Image;
    factor: number;
    drift?: number;
    baseX?: number;
  }[] = [];
  private sun?: Phaser.GameObjects.Image;
  private sectionIndex = -1;
  private safe = { x: 0, y: 0 };
  private lastChair: Chair | null = null;
  private langOff: (() => void) | null = null;
  private labels: { obj: Phaser.GameObjects.Text; key: StringKey }[] = [];

  // Level 1 systems
  private busTimer = 0;
  private brickTimer = 60;
  private gate: Solid | null = null;
  private gateGfx: Phaser.GameObjects.Container | null = null;
  private signal: Phaser.GameObjects.Arc | null = null;
  private monkey: Monkey | null = null;
  private prodBug: GiantBug | null = null;
  private doors: { l: Phaser.GameObjects.Image; r: Phaser.GameObjects.Image; x: number } | null = null;
  private cowSolid: Solid | null = null;
  private cowNear = false;
  private scannerCd = 0;
  private checkpoints: { obj: MapObject; reached: boolean; flag: Phaser.GameObjects.Image }[] = [];
  private finishTimer = 0;

  // Level 2 systems
  private manager: Manager | null = null;
  private turnstile: { solid: Solid; img: Phaser.GameObjects.Image } | null = null;
  private bossDoor: { solid: Solid; gfx: Phaser.GameObjects.Rectangle } | null = null;
  private biometric: {
    img: Phaser.GameObjects.Image;
    lock: Phaser.GameObjects.Image;
    unlocked: boolean;
  } | null = null;
  private darkness: Phaser.GameObjects.Image | null = null;
  private leds: Phaser.GameObjects.Graphics | null = null;
  private printers: { o: MapObject; t: number }[] = [];
  private microwaves: { o: MapObject; t: number }[] = [];
  private onceFlags = new Set<string>();
  private scanFrames = 0;
  private scareFrames = 0;
  /** Daily modifiers (enemy speed, power-up time, score multipliers, rain). */
  mood: Mood = moodFor(new Date());
  private skin: SkinId = 'none';
  private ambient!: Ambient;
  /** Hit-stop: frames the simulation freezes after a big hit. */
  private hitStop = 0;
  /** Game-over slow motion zoom. */
  private dying = 0;
  private introT = -1;
  private introProps: Phaser.GameObjects.GameObject[] = [];
  private iris: Phaser.GameObjects.Graphics | null = null;
  private irisT = -1;
  private pitCount = 0;
  private hits = 0;

  constructor() {
    super('Level');
  }

  init(data: LevelStart): void {
    this.mode = data.mode;
    this.run = newRun(data.level, data.character);
    this.skin = data.skin ?? 'none';
    this.mood = moodFor(new Date());
    this.hitStop = 0;
    this.dying = 0;
    this.introT = -1;
    this.introProps = [];
    this.iris = null;
    this.irisT = -1;
    this.pitCount = 0;
    this.hits = 0;
    this.state = 'play';
    this.frame = 0;
    this.acc = 0;
    for (const k of [
      'solids',
      'enemies',
      'hazards',
      'items',
      'blocks',
      'blockCoins',
      'movers',
      'chairs',
      'conveyors',
      'slides',
      'lasers',
      'parallax',
      'checkpoints',
      'printers',
      'microwaves',
      'sections',
      'labels',
    ] as const)
      (this as unknown as Record<string, unknown[]>)[k] = [];
    this.zones = {};
    this.sectionIndex = -1;
    this.busTimer = 0;
    this.brickTimer = 60;
    this.gate = null;
    this.gateGfx = null;
    this.signal = null;
    this.monkey = null;
    this.prodBug = null;
    this.doors = null;
    this.cowSolid = null;
    this.manager = null;
    this.turnstile = null;
    this.bossDoor = null;
    this.biometric = null;
    this.darkness = null;
    this.leds = null;
    this.onceFlags = new Set();
    this.finishTimer = 0;
    this.scanFrames = 0;
    this.scareFrames = 0;
    this.lastChair = null;
    this.coinBlocks = 0;
    this.cowNear = false;
    if (this.mode === 'play') session.run = this.run;
  }

  create(): void {
    const def = LEVELS[this.run.level];
    const json = this.cache.json.get(`map-${this.run.level}`) as TiledMap;
    this.map = parseMap(json);
    const m = this.map;
    this.fx = new Fx(this);
    this.cameras.main.setBounds(0, 0, m.worldWidth, VIEW.height);
    this.cameras.main.setBackgroundColor('#0E0B1F');

    for (const o of objectsOf(m, 'section'))
      this.sections.push({
        key: str(o, 'key'),
        x0: o.x,
        x1: o.x + o.w,
        top: str(o, 'skyTop', '#4DABF7'),
        bottom: str(o, 'skyBottom', '#D0EBFF'),
      });
    for (const [layer, objs] of Object.entries(m.layers))
      if (layer === 'zones') for (const o of objs) (this.zones[o.type] ??= []).push(o);

    this.buildBackground(def.indoor);
    this.buildSolids();
    this.buildPlatforms();
    this.buildItems();
    this.buildEnemies();
    this.buildSystems();

    ensureCharacter(this.textures, this.run.character, this.skin);
    this.player = new Player(this, this.run.character, m.spawnX, m.spawnY, this.skin);
    this.ambient = new Ambient(this);
    this.ambient.build();
    this.checkpoint = { x: m.spawnX, y: m.spawnY };
    this.safe = { ...this.checkpoint };
    this.run.totalCoins = this.items.filter((i) => i.kind === 'coin').length + this.coinBlocks;
    this.run.clock = def.clock?.start ?? 0;

    if (this.mode === 'attract') {
      this.player.hidden = true;
      this.player.body.y = -2000;
      this.camX = 0;
    } else {
      this.camX = 0;
      audio.startMusic(def.music);
      this.scene.launch('Hud');
      this.startIris();
      if (def.intro) this.startIntro();
    }
    this.langOff = onLangChange(() => this.relabel());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.langOff?.();
      this.langOff = null;
      // The camera may already be gone during shutdown; a fresh one is created on restart.
      const cam = this.cameras?.main;
      cam?.clearMask();
      cam?.setZoom(1);
    });
    events.emit('levelReady', { level: this.run.level });
  }

  private coinBlocks = 0;

  // ------------------------------------------------------------------ building

  private label(
    x: number,
    y: number,
    key: StringKey,
    size = 10,
    color = '#FFFFFF',
    depth = 3,
  ): Phaser.GameObjects.Text {
    const obj = this.add
      .text(x, y, t(key), {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        stroke: '#14121F',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(depth);
    this.labels.push({ obj, key });
    return obj;
  }

  private relabel(): void {
    for (const l of this.labels) if (l.obj.active) l.obj.setText(t(l.key));
  }

  private buildBackground(indoor: boolean): void {
    this.sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    if (!indoor) {
      this.sun = this.add.image(760, 90, 'sun').setScrollFactor(0.03).setDepth(-90);
      for (let i = 0; i < 9; i++) {
        const c = this.add
          .image(i * 420 + 80, 50 + (i % 3) * 40, `cloud${i % 3}`)
          .setScrollFactor(0.15)
          .setDepth(-80)
          .setAlpha(0.95);
        this.parallax.push({ obj: c, factor: 0.15, drift: 0.25, baseX: c.x });
      }
    }
    const sky = this.add
      .tileSprite(0, VIEW.height - 80 - 260, VIEW.width, 260, indoor ? 'officeSkyline' : 'skyline')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-70)
      .setAlpha(indoor ? 0.3 : 0.38);
    this.parallax.push({ obj: sky, factor: 0.35 });
    if (!indoor) {
      const hills = this.add
        .tileSprite(0, VIEW.height - 80 - 120, VIEW.width, 160, 'hills')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-60);
      this.parallax.push({ obj: hills, factor: 0.6 });
    }
    // Zone backdrops (factor 1), painted once.
    const decor = this.map.layers.decor ?? [];
    for (const s of this.sections) {
      const key = `bd-${this.run.level}-${s.key}`;
      if (!this.textures.exists(key)) {
        const canvas = paintBackdrop({ key: s.key, x0: s.x0, w: s.x1 - s.x0, decor });
        if (canvas) this.textures.addCanvas(key, canvas);
      }
      if (this.textures.exists(key)) this.add.image(s.x0, 0, key).setOrigin(0, 0).setDepth(-50);
    }
    // Localised labels baked over the backdrops.
    if (this.run.level === 1) {
      const ps = decor.find((d) => d.type === 'pitSign');
      if (ps)
        this.add
          .text(ps.x + ps.w / 2, 380, 'GADDA / PIT', {
            fontFamily: FONT,
            fontSize: '14px',
            color: '#FFD43B',
            stroke: '#14121F',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(-40);
    } else {
      const sign = decor.find((d) => d.type === 'companySign');
      if (sign) this.label(sign.x + sign.w / 2, sign.y + sign.h / 2 - 4, 'companyName', 14, '#FFFFFF', -40);
      const sc = decor.find((d) => d.type === 'screen');
      if (sc) this.label(sc.x + sc.w / 2, sc.y + sc.h / 2, 'quickCallScreen', 14, '#FFD43B', -40);
      const qs = decor.find((d) => d.type === 'queueSign');
      if (qs) this.label(qs.x + qs.w / 2, qs.y, 'queueShout', 8, '#E8590C', -20);
      const ws = decor.find((d) => d.type === 'wetSign');
      if (ws) {
        this.add
          .image(ws.x + ws.w / 2, ws.y + ws.h, 'wetSign')
          .setOrigin(0.5, 1)
          .setDepth(-30);
        this.label(ws.x + ws.w / 2, ws.y - 10, 'wetFloor', 8, '#FFD43B', -30);
      }
      const cooler = decor.find((d) => d.type === 'cooler');
      if (cooler)
        this.add
          .image(cooler.x + cooler.w / 2, cooler.y + cooler.h, 'cooler')
          .setOrigin(0.5, 1)
          .setDepth(-30);
      const g = decor.find((d) => d.type === 'gossip');
      if (g) {
        this.add
          .image(g.x, g.y + g.h, 'coworker', 0)
          .setOrigin(0.5, 1)
          .setDepth(-30);
        this.add
          .image(g.x + 44, g.y + g.h, 'coworker', 1)
          .setOrigin(0.5, 1)
          .setDepth(-30)
          .setFlipX(true)
          .setTint(0xffd8a8);
      }
    }
    for (const d of decor.filter((o) => o.type === 'guard'))
      this.add
        .image(d.x + d.w / 2, d.y + d.h, 'guard')
        .setOrigin(0.5, 1)
        .setDepth(-30);
  }

  private addSolid(s: Solid): Solid {
    this.solids.push(s);
    return s;
  }

  private buildSolids(): void {
    let seed = 1;
    for (const o of this.map.layers.solids ?? []) {
      switch (o.type) {
        case 'ground': {
          const tex = str(o, 'tex', 'grass');
          const key = `ground-${this.run.level}-${o.id}`;
          if (!this.textures.exists(key)) this.textures.addCanvas(key, paintGround(tex, o.w, o.h, seed++));
          this.add.image(o.x, o.y, key).setOrigin(0, 0).setDepth(0);
          // Grounds run to the bottom of the world so nothing falls through below the art.
          this.addSolid(
            makeSolid({ x: o.x, y: o.y, w: o.w, h: Math.max(o.h, 600 - o.y) }, 'solid', {
              safe: true,
              tag: tex,
            }),
          );
          break;
        }
        case 'cow':
          this.add
            .image(o.x - 2, o.y - 4, 'cow')
            .setOrigin(0, 0)
            .setDepth(4);
          this.cowSolid = this.addSolid(makeSolid(o, 'solid', { safe: false, tag: 'cow' }));
          break;
        case 'person':
          this.add
            .image(o.x + o.w / 2, o.y + o.h, `person${num(o, 'look')}`)
            .setOrigin(0.5, 1)
            .setScale(o.w / 40, o.h / 70)
            .setDepth(4);
          this.addSolid(makeSolid(o, 'solid', { safe: false, tag: 'person' }));
          break;
        case 'gate': {
          this.gate = this.addSolid(makeSolid(o, 'solid', { safe: false, tag: 'gate' }));
          const bars = this.add.container(o.x, 0).setDepth(15);
          for (let y = 40; y < o.h; y += 46)
            bars.add(this.add.rectangle(0, y, 20, 30, 0xff3b3b).setOrigin(0, 0).setStrokeStyle(3, 0x14121f));
          const lbl = this.label(o.x + 10, 160, 'needId', 10, '#FFFFFF', 16);
          bars.add(lbl.setPosition(10, 160));
          this.gateGfx = bars;
          break;
        }
        case 'turnstile': {
          const solid = this.addSolid(makeSolid(o, 'solid', { safe: false, tag: 'turnstile' }));
          const img = this.add
            .image(o.x - 3, o.y - 4, 'turnstile')
            .setOrigin(0, 0)
            .setDepth(14);
          this.turnstile = { solid, img };
          break;
        }
        case 'bossDoor': {
          const solid = this.addSolid(makeSolid(o, 'solid', { safe: false, tag: 'bossDoor' }));
          const gfx = this.add
            .rectangle(o.x, o.y, o.w, o.h, 0x74c0fc, 0.35)
            .setOrigin(0, 0)
            .setStrokeStyle(3, 0x14121f)
            .setDepth(14);
          this.bossDoor = { solid, gfx };
          break;
        }
        case 'plateStack':
          this.add
            .image(o.x + o.w / 2, o.y + o.h, 'plateStack')
            .setOrigin(0.5, 1)
            .setScale(1, o.h / 120)
            .setDepth(4);
          this.addSolid(makeSolid(o, 'solid', { safe: true, tag: 'plates' }));
          break;
        case 'fridge':
          this.add
            .image(o.x - 2, o.y - 2, 'fridge')
            .setOrigin(0, 0)
            .setDepth(4);
          this.addSolid(makeSolid(o, 'solid', { safe: true, tag: 'fridge' }));
          break;
        default:
          this.addSolid(makeSolid(o, 'solid', { safe: false }));
      }
    }
  }

  private buildPlatforms(): void {
    for (const o of this.map.layers.platforms ?? []) {
      switch (o.type) {
        case 'cloth': {
          this.add
            .image(o.x, o.y + 4, `cloth-${str(o, 'cloth', 'shirt')}`)
            .setOrigin(0, 0)
            .setDepth(-5);
          this.add
            .rectangle(o.x, o.y, o.w, 6, 0xf8f9fa)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x14121f)
            .setDepth(5);
          this.addSolid(makeSolid(o, 'oneway', { safe: false, tag: 'cloth' }));
          break;
        }
        case 'mover': {
          const mv = new Mover(
            this,
            o.x,
            o.y,
            o.w,
            o.h,
            str(o, 'style', 'beam') as MoverStyle,
            str(o, 'axis', 'x') as 'x' | 'y',
            num(o, 'min'),
            num(o, 'max'),
            num(o, 'speed', 1),
            num(o, 'pause', 0),
            num(o, 'phase', 0),
          );
          this.movers.push(mv);
          this.addSolid(mv.solid);
          break;
        }
        case 'beam':
          this.add.tileSprite(o.x, o.y, o.w, o.h, 'stripe').setOrigin(0, 0).setDepth(6);
          this.addSolid(makeSolid(o, 'oneway', { safe: false, tag: 'beam' }));
          break;
        case 'conveyor': {
          const c = new Conveyor(this, o.x, o.y, o.w, o.h, num(o, 'speed', -1.8));
          this.conveyors.push(c);
          this.addSolid(c.solid);
          break;
        }
        case 'slide': {
          const sl = new SlidePlatform(
            this,
            o.x,
            o.y,
            o.w,
            o.h,
            num(o, 'period', 240),
            num(o, 'on', 150),
            num(o, 'offset', 0),
            num(o, 'n', this.slides.length + 1),
          );
          this.slides.push(sl);
          this.addSolid(sl.solid);
          break;
        }
        case 'chair': {
          const ch = new Chair(this, o.x, o.y, o.w, o.h, num(o, 'min', o.x - 100), num(o, 'max', o.x + 200));
          this.chairs.push(ch);
          this.addSolid(ch.solid);
          break;
        }
        case 'desk':
        case 'counter':
        case 'shelf':
        case 'table': {
          const color =
            o.type === 'desk'
              ? 0xc98a4b
              : o.type === 'counter'
                ? 0xadb5bd
                : o.type === 'shelf'
                  ? 0x8b5a2b
                  : 0x5c3a1e;
          this.add
            .rectangle(o.x, o.y, o.w, o.h, color)
            .setOrigin(0, 0)
            .setStrokeStyle(3, 0x14121f)
            .setDepth(5);
          if (o.type === 'desk' || o.type === 'table' || o.type === 'counter') {
            const legH = this.map.groundY - o.y - o.h;
            if (legH > 0 && !bool(o, 'high')) {
              this.add
                .rectangle(o.x + 8, o.y + o.h, 8, legH, 0x495057)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x14121f)
                .setDepth(-6);
              this.add
                .rectangle(o.x + o.w - 16, o.y + o.h, 8, legH, 0x495057)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x14121f)
                .setDepth(-6);
            }
          }
          if (o.type === 'desk') {
            this.add
              .image(o.x + o.w / 2, o.y, 'monitor')
              .setOrigin(0.5, 1)
              .setDepth(-4);
          }
          this.addSolid(makeSolid(o, 'oneway', { safe: o.type !== 'shelf', tag: o.type }));
          break;
        }
      }
    }
  }

  private buildItems(): void {
    for (const o of this.map.layers.items ?? []) {
      switch (o.type) {
        case 'coin':
          this.items.push(new Coin(this, o.x, o.y));
          break;
        case 'block': {
          const b = new Block(
            this,
            o.x,
            o.y,
            str(o, 'kind', 'question') as 'question' | 'brick',
            str(o, 'item', 'coin'),
          );
          if (str(o, 'kind') === 'question' && str(o, 'item') === 'coin') this.coinBlocks++;
          this.blocks.push(b);
          this.addSolid(b.solid);
          break;
        }
        case 'pickup':
          this.items.push(new Floating(this, str(o, 'item', 'chai') as ItemKind, o.x, o.y));
          break;
        case 'appraisal':
          this.items.push(new Floating(this, 'appraisal', o.x, o.y));
          break;
      }
    }
  }

  private buildEnemies(): void {
    for (const o of this.map.layers.enemies ?? []) {
      switch (o.type) {
        case 'bug':
          this.enemies.push(new Bug(this, o.x, o.y, o.x, o.x + o.w));
          break;
        case 'dog':
          this.enemies.push(
            new Dog(this, o.x, o.y, o.x, o.x + o.w, num(o, 'chase', 2.3), num(o, 'patrol', ENEMY.dogSpeed)),
          );
          break;
        case 'invite':
          this.enemies.push(
            new Invite(
              this,
              o.x,
              o.y,
              num(o, 'speed', 1.6),
              'meetingHit',
              str(o, 'kind') === 'flybug' ? 'flybug' : 'invite',
            ),
          );
          break;
        case 'coworker':
          this.enemies.push(new Coworker(this, o.x, o.y, (str(o, 'line') || 'coworkerAsk') as StringKey));
          break;
        case 'prodBug':
          this.prodBug = new GiantBug(this, o.x, o.y, num(o, 'min', o.x - 400), num(o, 'max', o.x + 400));
          this.enemies.push(this.prodBug);
          break;
        case 'monkey':
          this.monkey = new Monkey(this, o.x, o.y, o.x, o.x + o.w);
          this.enemies.push(this.monkey);
          break;
        case 'aunty':
        case 'client':
        case 'manager': {
          const table = (this.map.layers.platforms ?? []).find((p) => p.type === 'table');
          const arena = (this.zones.bossArena ?? [])[0];
          const tx0 = table?.x ?? o.x - 140;
          const tx1 = table ? table.x + table.w : o.x + 260;
          this.manager = new Manager(
            this,
            o.x,
            (table?.y ?? 380) - MANAGER.h + 30,
            tx0,
            tx1,
            table?.y ?? 380,
            arena?.x ?? 6000,
            arena ? arena.x + arena.w : 7000,
            DESK_BOSSES[o.type],
          );
          this.enemies.push(this.manager);
          break;
        }
      }
    }
  }

  private buildSystems(): void {
    const z = this.zones;
    const decor = this.map.layers.decor ?? [];
    // Checkpoint flags.
    for (const cp of z.checkpoint ?? []) {
      const flag = this.add
        .image(cp.x + 2, cp.y + cp.h - 40, 'flagGrey')
        .setOrigin(0, 0)
        .setDepth(-20);
      this.checkpoints.push({ obj: cp, reached: false, flag });
    }
    // Traffic signal (blinks red during the bus warning).
    const sig = decor.find((d) => d.type === 'signal');
    if (sig) {
      this.add
        .rectangle(sig.x + 8, sig.y, 6, sig.h, 0x495057)
        .setOrigin(0, 0)
        .setDepth(-20);
      this.add
        .rectangle(sig.x - 2, sig.y - 10, 26, 64, 0x212529)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0x14121f)
        .setDepth(-19);
      this.signal = this.add.circle(sig.x + 11, sig.y + 6, 8, 0x5c1a1a).setDepth(-18);
      this.add.circle(sig.x + 11, sig.y + 24, 8, 0x5c4a00).setDepth(-18);
      this.add.circle(sig.x + 11, sig.y + 42, 8, 0x40c057).setDepth(-18);
    }
    // Metro doors.
    const d = decor.find((o) => o.type === 'doors');
    if (d) {
      const l = this.add.image(d.x, d.y, 'doorPanel').setOrigin(0, 0).setDepth(26);
      const r = this.add
        .image(d.x + 60, d.y, 'doorPanel')
        .setOrigin(0, 0)
        .setDepth(26)
        .setFlipX(true);
      this.doors = { l, r, x: d.x };
      this.label(d.x + 60, d.y - 36, 'doors', 9, '#FFD43B', -10);
    }
    // Biometric machine.
    const fin = (z.finish ?? [])[0];
    if (fin && LEVELS[this.run.level].finish === 'punch') {
      const img = this.add
        .image(fin.x + fin.w / 2, fin.y + fin.h, LEVELS[this.run.level].punch?.tex ?? 'biometric')
        .setOrigin(0.5, 1)
        .setDepth(3);
      const lock = this.add.image(fin.x + fin.w / 2, fin.y - 20, 'padlock').setDepth(4);
      this.biometric = { img, lock, unlocked: false };
    }
    // Lasers.
    for (const o of z.laser ?? []) {
      const l = new Laser(
        this,
        o.x,
        o.y,
        o.w,
        o.h,
        num(o, 'phase'),
        OFFICE.laserOn,
        OFFICE.laserOff,
        OFFICE.laserWarn,
        str(o, 'style') === 'projector' ? 0x74c0fc : 0xff2d55,
        str(o, 'style') === 'projector' ? 'projectorHit' : 'laserHit',
      );
      this.lasers.push(l);
      this.hazards.push(l);
    }
    for (const o of z.printer ?? []) {
      this.add
        .image(o.x + o.w / 2, o.y + o.h, 'printer')
        .setOrigin(0.5, 1)
        .setDepth(4);
      this.label(o.x + o.w / 2, o.y - 14, 'paperJam', 8, '#FF8787', 4);
      this.printers.push({ o, t: 0 });
    }
    for (const o of z.microwave ?? []) {
      this.add
        .image(o.x + o.w / 2, o.y + o.h, str(o, 'tex', 'microwave'))
        .setOrigin(0.5, 1)
        .setDepth(6);
      const title = str(o, 'title');
      if (title) this.label(o.x + o.w / 2, o.y - 12, title as StringKey, 8, '#FF8787', 6);
      this.microwaves.push({ o, t: 30 });
    }
    // Darkness overlay (server room) with LEDs glowing above it.
    if ((z.dark ?? []).length) {
      this.darkness = this.add
        .image(0, 0, 'darkness')
        .setScrollFactor(0)
        .setDepth(50)
        .setScale(3)
        .setVisible(false);
      this.leds = this.add.graphics().setDepth(55);
    }
    // Puddle and scanner art for slow zones.
    for (const o of z.slow ?? []) {
      if (str(o, 'label') === 'puddle')
        this.add
          .ellipse(o.x + o.w / 2, o.y + o.h - 2, o.w + 10, 14, 0x4dabf7, 0.75)
          .setStrokeStyle(2, 0x1c5d99)
          .setDepth(2);
    }
    for (const o of z.updraft ?? []) {
      this.add.rectangle(o.x, o.y, o.w, o.h, 0x9be7ff, 0.08).setOrigin(0, 0).setDepth(-8);
    }
    for (const o of z.wet ?? []) {
      const dal = str(o, 'style') === 'dal';
      this.add
        .rectangle(
          o.x,
          this.map.groundY - (dal ? 5 : 3),
          o.w,
          dal ? 9 : 6,
          dal ? 0xf59f00 : 0x74c0fc,
          dal ? 0.85 : 0.6,
        )
        .setOrigin(0, 0)
        .setDepth(2);
      if (dal) {
        for (let x = o.x + 30; x < o.x + o.w; x += 90)
          this.add.ellipse(x, this.map.groundY - 2, 46, 10, 0xffd43b, 0.8).setDepth(2);
        this.label(o.x + o.w / 2, this.map.groundY - 40, 'dalSpill', 8, '#E8590C', -20);
      }
    }
  }

  // ------------------------------------------------------------------ API used by entities

  hitsSolid(r: Rect): boolean {
    for (const s of this.solids) if (s.active && overlaps(r, s)) return true;
    return false;
  }

  /** Add an enemy mid-level (e.g. bugs spawned by the Prod Bug). */
  addEnemy(e: Enemy): void {
    this.enemies.push(e);
  }

  addHazard(h: Hazard): void {
    this.hazards.push(h);
  }

  addScore(n: number): void {
    this.run.score += n;
  }

  collectBlockCoin(x: number, y: number): void {
    this.blockCoins.push(new BlockCoin(this, x, y));
    this.gainCoin(x, y);
  }

  spawnPowerUp(kind: ItemKind, cx: number, blockTop: number): void {
    this.items.push(new PowerUpItem(this, kind, cx, blockTop, kind === 'chai'));
    sfx('powerup', { volume: 0.5 });
  }

  dropIdCard(x: number, y: number): void {
    this.items.push(new IdCard(this, x, y));
    this.hitStop = 10;
    this.sticker(STICKERS.bossDown);
  }

  /** Short pause on impact so hits feel crunchy. */
  freeze(frames: number): void {
    if (!session.reducedMotion) this.hitStop = Math.max(this.hitStop, frames);
  }

  /** Meme-style reaction sticker over the stage (once per kind per run). */
  sticker(key: StringKey): void {
    if (this.mode !== 'play' || !this.once(`sticker-${key}`)) return;
    events.emit('sticker', { text: t(key) });
  }

  onSkid(x: number, y: number): void {
    this.fx.dust(x, y);
    this.fx.dust(x, y);
  }

  onManagerDefeated(): void {
    if (this.bossDoor) {
      this.bossDoor.solid.active = false;
      this.tweens.add({ targets: this.bossDoor.gfx, alpha: 0, duration: 600 });
    }
    if (this.biometric) {
      this.biometric.unlocked = true;
      this.biometric.lock.setTint(0x40c057);
      this.tweens.add({
        targets: this.biometric.lock,
        y: this.biometric.lock.y - 20,
        alpha: 0,
        duration: 900,
        delay: 400,
      });
    }
    this.run.boss = null;
    this.hitStop = 12;
    this.sticker(STICKERS.bossDown);
  }

  hurtPlayer(reason: StringKey, fromX: number): void {
    if (this.state !== 'play' || this.mode !== 'play') return;
    const p = this.player;
    if (p.invuln > 0 || this.run.power.headphones > 0) return;
    this.run.hearts--;
    this.hits++;
    const style: HurtStyle =
      reason === 'busHit' || reason === 'brickHit'
        ? 'splat'
        : reason === 'bananaHit'
          ? 'slip'
          : reason === 'meetingHit' || reason === 'inviteHit'
            ? 'tangle'
            : 'normal';
    const extra: Partial<Record<HurtStyle, StringKey>> = { splat: 'splat', slip: 'slip', tangle: 'tangled' };
    this.fx.popup(p.cx, p.body.y - 12, t(extra[style] ?? reason), '#FF8787', 11);
    this.fx.burst(p.cx, p.cy, 0xff5c5c, 16);
    this.fx.addShake(FX.shakeHit);
    this.freeze(5);
    sfx('hurt');
    p.hurtKnockback(fromX, style);
    if (this.run.hearts <= 0) this.gameOver();
  }

  private gainCoin(wx?: number, wy?: number): void {
    const r = this.run;
    r.coins++;
    r.score += SCORE.coin * this.mood.coinScore;
    if (wx !== undefined && wy !== undefined && this.mode === 'play')
      this.fx.fly(wx - this.camX, wy, 'coin', VIEW.width - 222, 18, () => this.events.emit('coinPulse'));
    const h = heartsAfterCoin(r.coins, r.hearts);
    if (h.gained) {
      r.hearts = h.hearts;
      this.fx.popup(this.player.cx, this.player.body.y - 30, t('plusHeart'), '#FF8787', 12);
      sfx('heart');
    } else sfx('coin', { volume: 0.7 });
  }

  // ------------------------------------------------------------------ main loop

  update(_time: number, delta: number): void {
    if (session.paused && this.mode === 'play') return;
    this.acc += Math.min(delta, 250);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.step();
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.render();
  }

  /** Loud sting + giant face. Gameplay freezes for its duration so a scare never costs a heart. */
  private jumpscare(tex: string, frame: number, caption: StringKey): void {
    this.scareFrames = FX.scareFrames;
    sfx('jumpscare');
    this.fx.addShake(FX.shakeHit * 1.5);
    let image = '';
    try {
      image = this.textures.getBase64(tex, frame);
    } catch {
      /* texture missing: caption only */
    }
    events.emit('jumpscare', { image, text: t(caption) });
  }

  private step(): void {
    this.frame++;
    if (this.mode === 'attract') return this.stepAttract();
    if (this.scareFrames > 0) {
      this.scareFrames--;
      this.fx.step();
      return;
    }
    if (this.irisT >= 0) this.stepIris();
    if (this.hitStop > 0) {
      this.hitStop--;
      return;
    }
    // Game over: slow motion (half speed) while the camera zooms in.
    if (this.dying > 0) {
      this.dying--;
      if (this.dying % 2 === 1) {
        this.fx.step();
        return;
      }
    }
    if (this.state === 'intro') {
      this.stepIntro();
      this.ambient.step();
      this.fx.step();
      this.player.draw();
      return;
    }
    const r = this.run;
    if (this.state === 'play') r.frames++;
    for (const k of Object.keys(r.power) as PowerUpId[]) if (r.power[k] > 0) r.power[k]--;

    for (const m of this.movers) m.step();
    for (const c of this.chairs) c.step();
    for (const sl of this.slides) sl.step();
    for (const c of this.conveyors) c.step();
    for (const b of this.blocks) b.step();

    this.stepPlayer();
    this.stepEnemies();
    this.stepHazards();
    this.stepItems();
    this.stepSystems();
    this.ambient.step();
    this.fx.step();
    this.player.draw();
    for (const e of this.enemies) if (e.alive) e.draw();
    for (const m of this.movers) m.draw();
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private stepAttract(): void {
    this.ambient.step();
    for (const m of this.movers) m.step();
    for (const m of this.movers) m.draw();
    for (const c of this.conveyors) c.step();
    for (const b of this.blocks) b.step();
    for (const i of this.items) if (i.alive && i.kind === 'coin') i.step();
    this.player.body.x = this.camX + 480;
    for (const e of this.enemies) {
      if (!e.alive || e.boss) continue;
      if (e instanceof Bug || e instanceof Dog) {
        e.step();
        e.draw();
      }
    }
    this.camX += 1.1;
    if (this.camX > this.map.worldWidth - VIEW.width) this.camX = 0;
  }

  private stepPlayer(): void {
    const r = this.run;
    const p = this.player;
    const b = p.body;
    const locked = this.state !== 'play';
    const inp: PlayerInput = {
      left: input.left,
      right: input.right,
      jumpHeld: input.jump,
      jumpPressed: consumeJump(),
      dashPressed: consumeDash(),
    };
    if (this.state === 'finishing') {
      inp.right = LEVELS[this.run.level].finish === 'doors' && b.x < this.map.finishX + 50;
      inp.left = false;
      inp.jumpPressed = false;
    }
    const z = this.zones;
    const inZone = (type: string, pad = 0) =>
      (z[type] ?? []).some((o) => overlaps({ x: b.x, y: b.y - pad, w: b.w, h: b.h + pad * 2 }, o));
    const wasGround = b.onGround ? b.ground : null;
    const ev = p.step(inp, this.solids, {
      worldWidth: this.map.worldWidth,
      canDoubleJump: r.power.chai > 0,
      canDash: r.power.coffee > 0,
      slow: inZone('slow'),
      wet: inZone('wet', 6),
      updraft: inZone('updraft'),
      locked: locked && this.state !== 'finishing',
    });
    if (this.state === 'finishing' && LEVELS[this.run.level].finish === 'doors') {
      // Auto-walk in (input is overridden above).
      if (b.x < this.map.finishX + 50) b.vx = CHARACTERS[r.character].maxRun * 0.6;
    }
    if (ev.jumped) sfx('jump', { volume: 0.8 });
    if (ev.doubleJumped) {
      sfx('djump');
      this.fx.burst(p.cx, b.y + b.h, 0x22d3ee, 10, { speed: 2.5 });
    }
    if (ev.dashed) {
      sfx('dash');
      this.fx.addShake(2);
    }
    if (ev.landedSpeed > 6) {
      this.fx.dust(p.cx, b.y + b.h);
    }
    if (b.onGround) {
      r.combo = 0;
      const g = b.ground;
      if (g && g.safe && g.dx === 0 && g.dy === 0 && g.active) this.safe = safeSpot(b, g);
      // Chair drift: jumping from one moving chair onto another.
      const ch = this.chairs.find((c) => c.solid === g);
      if (ch && this.lastChair && this.lastChair !== ch && wasGround !== g) {
        this.fx.popup(p.cx, b.y - 20, t('chairDrift'), '#22D3EE', 11);
        this.addScore(100);
        sfx('coin');
      }
      this.lastChair = null;
    } else if (wasGround) {
      const ch = this.chairs.find((c) => c.solid === wasGround);
      if (ch && ch.moving) this.lastChair = ch;
    }
    // Trails.
    if (r.power.chai > 0 && this.frame % 3 === 0) this.fx.trail(p.cx, p.cy, 0x22d3ee);
    if (b.dashFrames > 0)
      for (let i = 0; i < 2; i++)
        this.fx.trail(p.cx - b.facing * 20, p.cy + (Math.random() - 0.5) * 30, 0xffffff, 'px');
    if (inZone('updraft') && this.frame % 4 === 0) this.fx.trail(p.cx, b.y + b.h + 10, 0xe0f7ff, 'snow');
    if (Math.abs(b.vx) >= b.maxRun * 0.95 && this.frame % 3 === 0 && !session.reducedMotion)
      this.fx.speedLine(p.cx - b.facing * 34, b.y + 12 + Math.random() * 40, b.facing);
    p.worried =
      (r.doorFrames !== null && r.doorFrames < METRO.pulseUnder) ||
      (!!LEVELS[r.level].clock && r.clock >= (LEVELS[r.level].clock?.red ?? Infinity));
    if (p.worried && this.frame % 40 === 0) this.fx.trail(p.cx + b.facing * 12, b.y + 4, 0x74c0fc, 'spark');

    // Pit fall.
    if (b.y > VIEW.height + 40 && this.state === 'play') this.pitFall();
  }

  private pitFall(): void {
    const r = this.run;
    r.hearts--;
    this.hits++;
    if (++this.pitCount >= 2) this.sticker(STICKERS.pitTwice);
    sfx('pitfall');
    const p = this.player;
    p.respawn(this.safe.x, this.safe.y);
    this.fx.popup(p.cx, p.body.y - 20, t('fell'), '#FF8787', 12);
    this.fx.addShake(FX.shakeHit);
    if (r.hearts <= 0) this.gameOver();
  }

  private stepEnemies(): void {
    const p = this.player;
    const b = p.body;
    const r = this.run;
    for (const e of this.enemies) {
      if (!e.alive || !e.activeNear(p.cx)) continue;
      e.step();
      if (!e.alive || e.passive || this.state !== 'play') continue;
      const target = e instanceof Manager ? e.laptopRect : e;
      if (e instanceof Manager) {
        if (e.vulnerable && overlaps(b, target) && isStomp(b.vy, p.prevBottom, target.y)) {
          b.vy = -11;
          b.y = target.y - b.h;
          this.freeze(8);
          e.onStomp();
        }
        continue;
      }
      if (!overlaps(b, e)) continue;
      if (r.power.headphones > 0) {
        e.onMute();
        continue;
      }
      if (e.stompable && isStomp(b.vy, p.prevBottom, e.y)) {
        b.vy = -(e.boss ? 11 : 9.5);
        r.combo++;
        if (r.combo >= 2) this.events.emit('combo', r.combo);
        if (r.combo >= 4) this.sticker(STICKERS.combo4);
        this.fx.addShake(e.boss ? FX.shakeBoss : FX.shakeStomp);
        this.freeze(e.boss ? 8 : 4);
        e.onStomp();
        if (r.combo >= 2) sfx('coin', { rate: 1 + Math.min(8, r.combo) * 0.12, volume: 0.6 });
      } else e.onTouch();
    }
    // Boss HUD status.
    if (this.monkey && this.monkey.active && this.monkey.alive && !this.monkey.passive)
      r.boss = { name: 'monkeyName', hp: this.monkey.statusHp, max: 3 };
    else if (this.manager && this.manager.active && !this.manager.defeated)
      r.boss = {
        name: this.manager.style.nameKey,
        hp: this.manager.hp,
        max: 3,
        phase: this.manager.phaseKey,
      };
    else if (this.prodBug && this.prodBug.active && !this.prodBug.defeated)
      r.boss = { name: 'prodBugName', hp: this.prodBug.hp, max: 3, phase: this.prodBug.phaseKey };
    else r.boss = null;
  }

  private stepHazards(): void {
    const b = this.player.body;
    for (const h of this.hazards) {
      if (!h.alive) continue;
      h.step();
      if (h.alive && h.armed && overlaps(b, h)) this.hurtPlayer(h.hurtKey, h.x + h.w / 2);
    }
    this.hazards = this.hazards.filter((h) => h.alive);
  }

  private stepItems(): void {
    const p = this.player;
    const r = this.run;
    for (const bc of this.blockCoins) bc.step();
    this.blockCoins = this.blockCoins.filter((c) => c.alive);
    for (const it of this.items) {
      if (!it.alive) continue;
      if (it.kind !== 'coin' || Math.abs(it.x - p.cx) < 600) it.step();
      if (!it.alive || this.state === 'over' || !overlaps(p.body, it)) continue;
      it.destroy();
      switch (it.kind) {
        case 'coin':
          this.gainCoin(it.x + 10, it.y + 10);
          this.fx.burst(it.x + 10, it.y + 10, 0xffd43b, 5, { speed: 1.5 });
          break;
        case 'chai':
        case 'headphones':
        case 'coffee':
          r.power[it.kind] = Math.round(POWERUP_FRAMES[it.kind] * this.mood.powerTime);
          r.score += SCORE.powerup;
          this.fx.popup(
            p.cx,
            p.body.y - 20,
            t(it.kind === 'chai' ? 'chaiGot' : it.kind === 'headphones' ? 'phonesGot' : 'coffeeGot'),
            '#22D3EE',
            11,
          );
          this.fx.burst(p.cx, p.cy, 0x22d3ee, 14);
          sfx('powerup');
          break;
        case 'appraisal':
          r.appraisal++;
          r.score += SCORE.appraisal;
          this.fx.popup(p.cx, p.body.y - 20, t('appraisalGot', { n: r.appraisal }), '#FFD43B', 11);
          this.fx.burst(it.x + 13, it.y + 13, 0xffd43b, 18);
          sfx('powerup');
          break;
        case 'id': {
          r.hasId = true;
          r.score += SCORE.idCard;
          this.fx.popup(p.cx, p.body.y - 24, t('idGot'), '#FFD43B', 11);
          this.fx.burst(p.cx, p.cy, 0xffd43b, 20);
          sfx('powerup');
          const arena = (this.zones.bossArena ?? [])[0];
          if (arena) this.checkpoint = { x: num(arena, 'respawnX', 6000), y: num(arena, 'respawnY', 320) };
          if (this.gate) {
            this.gate.active = false;
            this.fx.popup(this.gate.x, 200, t('gateOpen'), '#69DB7C', 12);
            if (this.gateGfx) this.tweens.add({ targets: this.gateGfx, y: -400, alpha: 0, duration: 700 });
          }
          break;
        }
      }
    }
    this.items = this.items.filter((i) => i.alive);
  }

  private once(key: string): boolean {
    if (this.onceFlags.has(key)) return false;
    this.onceFlags.add(key);
    return true;
  }

  private stepSystems(): void {
    const r = this.run;
    const p = this.player;
    const b = p.body;
    const z = this.zones;
    const m = this.map;

    // Zone tracking + banners.
    const si = this.sections.findIndex((s) => p.cx >= s.x0 && p.cx < s.x1);
    if (si >= 0 && si !== this.sectionIndex) {
      this.sectionIndex = si;
      r.zoneKey = this.sections[si].key;
      this.events.emit('zone', this.sections[si].key);
    }
    r.progress = Phaser.Math.Clamp(p.cx / m.finishX, 0, 1);

    // Checkpoints.
    for (const cp of this.checkpoints) {
      if (cp.reached || p.cx < cp.obj.x - 4) continue;
      cp.reached = true;
      this.checkpoint = { x: num(cp.obj, 'respawnX', cp.obj.x), y: num(cp.obj, 'respawnY', 400) };
      r.hearts = Math.max(r.hearts, HEARTS.checkpointMin);
      cp.flag.setTexture('flagGreen');
      cp.flag.y = cp.obj.y + cp.obj.h - 40;
      this.tweens.add({ targets: cp.flag, y: cp.obj.y + 4, duration: 700, ease: 'Back.easeOut' });
      this.fx.popup(
        cp.obj.x,
        cp.obj.y - 20,
        t(str(cp.obj, 'style') === 'water' ? 'checkpoint2' : 'checkpoint'),
        '#69DB7C',
        11,
      );
      this.fx.burst(cp.obj.x + 20, cp.obj.y + 20, 0x40c057, 18);
      sfx('checkpoint');
    }

    // ---------------- Level 1: bus on the main road
    const road = (z.busRoad ?? [])[0];
    if (road && this.state === 'play') {
      const onRoad = p.cx > road.x && p.cx < road.x + road.w;
      if (onRoad) {
        this.busTimer++;
        const warnAt = BUS.interval - BUS.warning;
        r.busWarning = this.busTimer >= warnAt;
        if (this.busTimer === warnAt) {
          sfx('honk');
          this.fx.popup(
            Math.min(this.camX + VIEW.width - 120, road.x + road.w - 60),
            240,
            t('honk'),
            '#FFD43B',
            12,
          );
        }
        if (this.busTimer >= BUS.interval) {
          this.busTimer = 0;
          r.busWarning = false;
          this.hazards.push(new Bus(this, this.camX + VIEW.width + 20, m.groundY));
        }
      } else {
        r.busWarning = false;
        this.busTimer = Math.min(this.busTimer, BUS.interval - BUS.warning - 30);
      }
      if (this.signal)
        this.signal.setFillStyle(r.busWarning && Math.floor(this.frame / 6) % 2 === 0 ? 0xff3b3b : 0x5c1a1a);
    }

    // ---------------- Level 1: falling bricks
    const rain = (z.brickRain ?? [])[0];
    if (rain && this.state === 'play' && p.cx > rain.x && p.cx < rain.x + rain.w) {
      if (--this.brickTimer <= 0) {
        this.brickTimer = Phaser.Math.Between(BRICK.minGap, BRICK.maxGap);
        const x = p.cx + Phaser.Math.Between(BRICK.spawnMin, BRICK.spawnMax);
        this.hazards.push(
          new FallingBrick(
            this,
            x,
            m.groundY,
            str(rain, 'tex', 'brick'),
            str(rain, 'hurt', 'brickHit') as StringKey,
          ),
        );
      }
    }

    // ---------------- Cow says MOO
    if (this.cowSolid) {
      const near = Math.abs(p.cx - (this.cowSolid.x + 50)) < 160;
      if (near && !this.cowNear) {
        this.fx.popup(this.cowSolid.x + 20, this.cowSolid.y - 20, t('moo'), '#FFFFFF', 14);
        sfx('moo');
      }
      this.cowNear = near;
    }

    // ---------------- Scanner beeps
    if (this.scannerCd > 0) this.scannerCd--;
    for (const s of z.slow ?? []) {
      if (str(s, 'label') === 'scanner' && overlaps(b, s) && this.scannerCd === 0) {
        this.scannerCd = 40;
        this.fx.popup(s.x + s.w / 2, s.y - 10, t('beep'), '#FF8787', 11);
        sfx('beep');
      }
    }

    // ---------------- Monkey arena
    const arena = (z.bossArena ?? [])[0];
    if (arena && this.state === 'play') {
      if (this.monkey && !this.monkey.active && p.cx > arena.x) {
        this.monkey.active = true;
        this.events.emit('bossBanner', 'bossMonkey');
        events.emit('bossStart', { level: r.level });
        if (this.once('scareMonkey')) this.jumpscare('monkey', 0, 'scareMonkey');
        else sfx('ook');
      }
      if (this.prodBug && !this.prodBug.active && p.cx > arena.x) {
        this.prodBug.active = true;
        this.events.emit('bossBanner', 'bossProdBug');
        events.emit('bossStart', { level: r.level });
        if (this.once('scareProdBug')) this.jumpscare('prodBug', 0, 'scareProdBug');
        this.fx.popup(this.prodBug.cx, this.prodBug.y - 30, t('prodBugRoar'), '#FF8787', 12);
      }
      if (this.manager && !this.manager.active && p.cx > arena.x) {
        this.manager.active = true;
        const style = this.manager.style;
        this.events.emit('bossBanner', style.bannerKey);
        events.emit('bossStart', { level: r.level });
        if (this.once('scareManager')) this.jumpscare(style.body, 1, style.scareKey);
        this.fx.popup(this.manager.cx, this.manager.y - 20, t(style.greetKey), '#FFFFFF', 12);
        sfx('manager');
      }
    }
    if (this.gate && this.gate.active && this.gateGfx) {
      this.gateGfx.setAlpha(Math.floor(this.frame / 15) % 2 === 0 ? 1 : 0.6);
    }

    // ---------------- Metro doors
    const metro = (z.metroTimer ?? [])[0];
    if (metro && this.state === 'play') {
      if (r.doorFrames === null && p.cx > metro.x) r.doorFrames = METRO.doorFrames;
      if (r.doorFrames !== null) {
        r.doorFrames--;
        if (r.doorFrames < METRO.tickUnder && r.doorFrames % 15 === 0) sfx('tick');
        if (r.doorFrames <= 0) {
          r.hearts--;
          sfx('pitfall');
          this.fx.popup(p.cx, b.y - 20, t('missedMetro'), '#FF8787', 11);
          p.respawn(num(metro, 'respawnX', 6330), num(metro, 'respawnY', 400));
          r.doorFrames = METRO.doorFrames;
          if (r.hearts <= 0) this.gameOver();
        }
      }
    }
    if (this.doors) {
      const left = r.doorFrames === null ? 1 : Phaser.Math.Clamp(r.doorFrames / METRO.doorFrames, 0, 1);
      const open =
        this.state === 'finishing' || this.state === 'cleared'
          ? Math.max(0, 1 - this.finishTimer / 40)
          : left;
      this.doors.l.x = this.doors.x - 52 * open;
      this.doors.r.x = this.doors.x + 60 + 52 * open;
    }

    // ---------------- Jumpscare deep inside the dark server room
    const dark = (z.dark ?? [])[0];
    if (dark && !num(dark, 'cycle') && this.state === 'play' && p.cx > dark.x + 360 && this.once('scareBug'))
      this.jumpscare('bug', 0, 'scareBug');

    // ---------------- Power cuts: darkness that cycles on and off
    for (const d of z.dark ?? []) {
      const cycle = num(d, 'cycle');
      if (!cycle || p.cx < d.x || p.cx > d.x + d.w || this.state !== 'play') continue;
      const phase = this.frame % (cycle * 2);
      if (phase === cycle) {
        this.fx.popup(p.cx, b.y - 30, t('powerCut'), '#FFD43B', 13);
        this.fx.addShake(4);
        sfx('thud');
      } else if (phase === 0) this.fx.popup(p.cx, b.y - 30, t('powerBack'), '#69DB7C', 11);
    }

    // ---------------- Level 2: office clock
    const clk = LEVELS[r.level].clock;
    if (clk && this.state === 'play') {
      r.clock += 1 / OFFICE.framesPerMinute;
      if (r.clock >= clk.late) {
        r.hearts--;
        r.clock = clk.reset;
        sfx('late');
        this.fx.popup(p.cx, b.y - 24, t(clk.lateKey), '#FF5C5C', 14);
        this.fx.addShake(FX.shakeHit);
        if (r.hearts <= 0) this.gameOver();
      }
    }

    // ---------------- Level 2: turnstile, receptionist, gossip
    if (
      this.turnstile &&
      this.turnstile.solid.active &&
      Math.abs(p.cx - this.turnstile.solid.x) < 90 &&
      r.hasId
    ) {
      this.turnstile.solid.active = false;
      this.turnstile.img.setTexture('turnstileOpen');
      this.fx.popup(this.turnstile.solid.x + 12, this.turnstile.solid.y - 20, t('accessOk'), '#69DB7C', 11);
      sfx('accessOk');
    }
    const rec = (m.layers.decor ?? []).find((d) => d.type === 'reception');
    if (rec && Math.abs(p.cx - (rec.x + 90)) < 120 && this.once('reception')) {
      this.fx.popup(rec.x + 90, rec.y - 60, t('receptionist'), '#FFFFFF', 10);
      sfx('coworker');
    }
    const gos = (m.layers.decor ?? []).find((d) => d.type === 'gossip');
    if (gos && Math.abs(p.cx - gos.x) < 140 && this.once('gossip')) {
      this.fx.popup(gos.x + 20, gos.y - 30, t('gossip'), '#FFFFFF', 10);
    }

    // ---------------- Level 2: printers + microwaves
    for (const pr of this.printers) {
      if (Math.abs(pr.o.x - p.cx) > ENEMY.activeRange) continue;
      if (++pr.t >= OFFICE.printerEvery) {
        pr.t = 0;
        this.hazards.push(
          new Projectile(
            this,
            'paper',
            pr.o.x - 10,
            pr.o.y + 14,
            22,
            16,
            -OFFICE.paperSpeed,
            0,
            0,
            'paperHit',
            { wobble: 6, breakOnSolid: false, maxLife: 400 },
          ),
        );
        sfx('paper', { volume: 0.6 });
      }
    }
    for (const mw of this.microwaves) {
      if (Math.abs(mw.o.x - p.cx) > ENEMY.activeRange) continue;
      if (++mw.t >= OFFICE.popcornEvery) {
        mw.t = 0;
        for (let i = 0; i < 3; i++) {
          const vx = Phaser.Math.FloatBetween(-3, 3);
          const vy = -Phaser.Math.FloatBetween(8, 11);
          this.hazards.push(
            new Projectile(
              this,
              str(mw.o, 'proj', 'popcorn'),
              mw.o.x + mw.o.w / 2 - 5,
              mw.o.y - 4,
              10,
              10,
              vx,
              vy,
              OFFICE.popcornGravity,
              str(mw.o, 'hurt', 'popcornHit') as StringKey,
              { spin: 0.2 },
            ),
          );
        }
        this.fx.popup(
          mw.o.x + mw.o.w / 2,
          mw.o.y - 24,
          t(str(mw.o, 'label', 'popPop') as StringKey),
          '#FFF3BF',
          9,
        );
        sfx('pop');
      }
    }

    // ---------------- Finish
    const fin = (z.finish ?? [])[0];
    if (fin && this.state === 'play') {
      const finish = LEVELS[r.level].finish;
      if (finish === 'doors' && p.cx > m.finishX) this.startFinish();
      if (finish === 'punch' && this.biometric && overlaps(b, fin)) {
        if (this.biometric.unlocked) this.startFinish();
        else if (this.frame % 60 === 0)
          this.fx.popup(
            fin.x + fin.w / 2,
            fin.y - 30,
            t(LEVELS[r.level].punch?.lockedKey ?? 'bioLocked'),
            '#FF8787',
            9,
          );
      }
    }
    if (this.state === 'finishing') this.stepFinish();
  }

  private startFinish(): void {
    this.state = 'finishing';
    this.finishTimer = 0;
    const r = this.run;
    if (LEVELS[r.level].finish === 'punch') {
      this.scanFrames = 60;
      this.player.body.vx = 0;
      sfx('scan');
      this.fx.popup(
        this.player.cx,
        this.player.body.y - 30,
        t(LEVELS[r.level].punch?.scanKey ?? 'scanning'),
        '#22D3EE',
        10,
      );
    }
  }

  private stepFinish(): void {
    const p = this.player;
    const r = this.run;
    if (LEVELS[r.level].finish === 'punch' && this.scanFrames > 0) {
      this.scanFrames--;
      if (this.scanFrames === 0) {
        this.fx.popup(
          p.cx,
          p.body.y - 40,
          t(LEVELS[r.level].punch?.doneKey ?? 'present', { time: formatClock(r.clock) }),
          '#69DB7C',
          13,
        );
        sfx('victory');
      }
      return;
    }
    this.finishTimer++;
    const doors = LEVELS[r.level].finish === 'doors';
    if (doors && this.finishTimer === 1) sfx('victory');
    if (doors && p.body.x > this.map.finishX + 40) p.hidden = true;
    p.win = true;
    if (this.finishTimer % 3 === 0) this.fx.confetti(this.camX, this.camX + VIEW.width, -10, 5);
    if (this.finishTimer >= FX.confettiFrames) this.levelClear();
  }

  private levelClear(): void {
    this.state = 'cleared';
    const r = this.run;
    const secondsLeft =
      LEVELS[r.level].clock === undefined
        ? (r.doorFrames ?? 0) / 60
        : Math.max(0, ((LEVELS[r.level].clock?.late ?? 0) - r.clock) * (OFFICE.framesPerMinute / 60));
    if (this.hits === 0) this.sticker(STICKERS.noHit);
    else if (secondsLeft < 4) this.sticker(STICKERS.closeCall);
    const bonus = clearBonus(r.hearts, secondsLeft);
    r.score += bonus;
    const stars = starsFor({
      level: r.level,
      hearts: r.hearts,
      secondsLeft,
      coins: r.coins,
      totalCoins: r.totalCoins,
      frames: r.frames,
      appraisal: r.appraisal,
    });
    events.emit('levelClear', {
      level: r.level,
      score: r.score,
      coins: r.coins,
      totalCoins: r.totalCoins,
      frames: r.frames,
      hearts: r.hearts,
      stars,
      appraisal: r.appraisal,
      bonus,
      clockText: formatClock(r.clock),
    });
  }

  private gameOver(): void {
    if (this.state === 'over') return;
    this.state = 'over';
    this.run.hearts = 0;
    if (!session.reducedMotion) {
      this.dying = 60;
      this.cameras.main.zoomTo(1.7, 900, 'Sine.easeOut');
    }
    audio.stopMusic();
    sfx('gameover');
    this.player.sinceHit = 0;
    this.time.delayedCall(900, () => events.emit('gameOver', { level: this.run.level }));
  }

  /** CTRL+Z: 3 hearts at the last checkpoint, score halved. */
  continueRun(): void {
    const r = this.run;
    r.hearts = HEARTS.continueHearts;
    r.score = Math.floor(r.score / 2);
    r.combo = 0;
    r.doorFrames = r.doorFrames === null ? null : METRO.doorFrames;
    const clock = LEVELS[r.level].clock;
    if (clock) r.clock = Math.min(r.clock, clock.reset - 2);
    this.player.respawn(this.checkpoint.x, this.checkpoint.y);
    this.player.sinceHit = 999;
    this.safe = { ...this.checkpoint };
    for (const h of this.hazards) if (!(h instanceof Laser)) h.destroy();
    this.hazards = this.hazards.filter((h) => h.alive);
    this.state = 'play';
    this.dying = 0;
    this.cameras.main.setZoom(1);
    audio.startMusic(LEVELS[r.level].music, true);
  }

  // ------------------------------------------------------------------ level start: iris + intro cutscene

  private startIris(): void {
    if (session.reducedMotion) return;
    this.iris = this.make.graphics({}, false);
    this.cameras.main.setMask(this.iris.createGeometryMask());
    this.irisT = 0;
    this.stepIris();
  }

  private stepIris(): void {
    if (!this.iris) return;
    this.irisT++;
    const k = Math.min(1, this.irisT / 40);
    const r = 8 + (1 - Math.pow(1 - k, 3)) * 620;
    const p = this.player;
    const sx = p ? p.cx - this.camX : VIEW.width / 2;
    const sy = p ? p.cy : VIEW.height / 2;
    this.iris.clear().fillStyle(0xffffff).fillCircle(sx, sy, r);
    if (k >= 1) {
      this.cameras.main.clearMask(true);
      this.iris = null;
      this.irisT = -1;
    }
  }

  /** Level 1 intro: asleep on the bed, alarm rings, wakes up in shock and jumps out. Any jump skips. */
  private startIntro(): void {
    this.state = 'intro';
    this.introT = 0;
    const p = this.player;
    const bed = this.add.image(100, this.map.groundY, 'bed').setOrigin(0.5, 1).setScale(0.85).setDepth(25);
    const clock = this.add.image(150, 318, 'alarmClock').setDepth(26).setScale(0.8);
    const hint = this.add
      .text(VIEW.width / 2, VIEW.height - 40, t('introSkip'), {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#FFFFFF',
        stroke: '#14121F',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(80);
    this.introProps = [bed, clock, hint];
    p.body.x = 140;
    p.body.y = this.map.groundY - 138;
    p.pose = { frame: 'blink', rot: -Math.PI / 2, dy: 0 };
    p.body.facing = 1;
  }

  private stepIntro(): void {
    const p = this.player;
    const t0 = ++this.introT;
    const clock = this.introProps[1] as Phaser.GameObjects.Image | undefined;
    const skip = consumeJump() || input.left || input.right;
    if (t0 > 20 && t0 < 100 && clock) {
      clock.setRotation(Math.sin(t0 * 1.3) * 0.25).setX(150 + Math.sin(t0 * 2.1) * 3);
      if (t0 % 16 === 0) sfx('beep', { rate: 1.2 });
      if (t0 === 24) this.fx.popup(150, 280, t('introAlarm'), '#FFD43B', 12);
    }
    if (t0 > 20 && t0 < 100 && t0 % 20 === 0) this.fx.popup(64, 360, 'z', '#FFFFFF', 10);
    if (t0 === 100) {
      // Wake up in shock!
      p.pose = { frame: 'shock', rot: 0, dy: 0 };
      p.body.y = this.map.groundY - 110;
      this.fx.popup(p.cx, p.body.y - 30, t('introWake'), '#FF8787', 14);
      this.fx.addShake(6);
      sfx('djump');
    }
    if (t0 > 100) {
      const k = Math.min(1, (t0 - 100) / 30);
      p.body.x = 140 - k * 60;
      p.body.y = this.map.groundY - 110 - Math.sin(k * Math.PI) * 50 + k * 50;
    }
    if (t0 >= 135 || (skip && t0 > 5)) this.endIntro();
  }

  private endIntro(): void {
    const p = this.player;
    p.pose = null;
    p.respawn(this.map.spawnX, this.map.spawnY);
    p.invuln = 0;
    for (const o of this.introProps) {
      if (o instanceof Phaser.GameObjects.Text) o.destroy();
      else this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
    }
    this.introProps = [];
    this.introT = -1;
    this.state = 'play';
  }

  // ------------------------------------------------------------------ rendering

  private render(): void {
    const cam = this.cameras.main;
    const p = this.player;
    if (this.mode === 'play') {
      const target = Phaser.Math.Clamp(
        p.cx - CAMERA.leadFraction * VIEW.width,
        0,
        this.map.worldWidth - VIEW.width,
      );
      this.camX += (target - this.camX) * CAMERA.lerp;
      if (this.frame <= 2) this.camX = target;
    }
    if (cam.zoom > 1.01) {
      // Death zoom: centre the player (scroll is the view centre minus half the view).
      cam.setBounds(-2000, -2000, this.map.worldWidth + 4000, VIEW.height + 4000);
      cam.setScroll(p.cx - VIEW.width / 2, p.cy - VIEW.height / 2);
    } else {
      cam.setBounds(0, 0, this.map.worldWidth, VIEW.height);
      cam.setScroll(Math.round(this.camX + this.fx.shakeX), Math.round(this.fx.shakeY));
    }
    this.drawSky();
    for (const l of this.parallax) {
      if (l.obj instanceof Phaser.GameObjects.TileSprite) l.obj.tilePositionX = this.camX * l.factor;
      else if (l.drift && l.baseX !== undefined) {
        l.baseX -= l.drift;
        const sx = l.baseX - this.camX * l.factor;
        if (sx < -200) l.baseX += 9 * 420;
        else if (sx > 9 * 420 - 200) l.baseX -= 9 * 420;
        l.obj.x = l.baseX;
      }
    }
    if (this.sun) {
      this.sun.rotation += 0.002;
      this.sun.setScale(session.reducedMotion ? 1 : 1 + Math.sin(this.frame * 0.03) * 0.04);
    }
    this.drawDarkness();
  }

  private drawSky(): void {
    const x = this.camX + VIEW.width / 2;
    const secs = this.sections;
    if (!secs.length) return;
    let i = secs.findIndex((s) => x >= s.x0 && x < s.x1);
    if (i < 0) i = x < secs[0].x0 ? 0 : secs.length - 1;
    let top = secs[i].top;
    let bottom = secs[i].bottom;
    const next = secs[i + 1];
    if (next && x > next.x0 - FX.skyBlend) {
      const k = (x - (next.x0 - FX.skyBlend)) / FX.skyBlend;
      top = mix(top, next.top, k);
      bottom = mix(bottom, next.bottom, k);
    }
    this.sky.clear();
    this.sky.fillGradientStyle(hexToInt(top), hexToInt(top), hexToInt(bottom), hexToInt(bottom), 1);
    this.sky.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  private drawDarkness(): void {
    if (!this.darkness || !this.leds) return;
    const p = this.player;
    const dark = (this.zones.dark ?? []).find((o) => p.cx > o.x - 60 && p.cx < o.x + o.w + 60);
    // Power-cut zones go dark for half of each cycle, with a flicker warning first.
    const cycle = dark ? num(dark, 'cycle') : 0;
    const phase = cycle ? this.frame % (cycle * 2) : 0;
    const lightsOut = !cycle || phase >= cycle || (phase >= cycle - 45 && Math.floor(phase / 4) % 2 === 0);
    this.darkness.setVisible(!!dark && lightsOut && this.mode === 'play');
    this.leds.clear();
    if (!dark) return;
    const edge = Math.min(p.cx - dark.x, dark.x + dark.w - p.cx);
    const fade = Phaser.Math.Clamp((edge + 60) / 160, 0, 1);
    const alpha = session.reducedMotion ? OFFICE.darknessAlphaReduced : OFFICE.darknessAlpha;
    this.darkness.setAlpha(fade * (alpha / OFFICE.darknessAlpha));
    this.darkness.setPosition(p.cx - this.camX, p.cy);
    // Server LEDs keep glowing above the darkness.
    const racks = (this.map.layers.decor ?? []).find((d) => d.type === 'racks');
    if (racks) {
      for (let x = racks.x + 10; x < racks.x + racks.w; x += 90) {
        if (x > 5100 && x < 5290) continue;
        if (x < this.camX - 100 || x > this.camX + VIEW.width + 100) continue;
        for (let y = racks.y + 16; y < racks.y + racks.h - 10; y += 22) {
          const on = (Math.floor(this.frame / 12) + x + y) % 5 !== 0;
          this.leds.fillStyle((x + y) % 3 === 0 ? 0x22d3ee : 0x40c057, on ? 0.95 : 0.25);
          this.leds.fillRect(x + 50, y + 2, 5, 5);
          this.leds.fillStyle(0xffd43b, (Math.floor(this.frame / 7) + y) % 4 === 0 ? 0.9 : 0.2);
          this.leds.fillRect(x + 40, y + 2, 5, 5);
        }
      }
      this.leds.fillStyle(0x22d3ee, 0.9);
      this.leds.fillRect(dark.x, this.map.groundY, dark.w, 3);
    }
  }
}
