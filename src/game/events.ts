/** Tiny typed event bus between the Phaser scenes and the DOM UI. */
import type { LevelId } from '../config/levels';

export interface ClearResult {
  level: LevelId;
  score: number;
  coins: number;
  totalCoins: number;
  frames: number;
  hearts: number;
  stars: number;
  appraisal: number;
  bonus: number;
  clockText: string;
}

export interface GameEvents {
  levelClear: ClearResult;
  gameOver: { level: LevelId };
  ready: undefined;
  /** Level scene finished building. */
  levelReady: { level: LevelId };
  /** Full-screen jumpscare: a face image (data URL) and a caption. */
  jumpscare: { image: string; text: string };
  /** Meme-style reaction sticker. */
  sticker: { text: string };
  /** A boss fight began (starts the shareable clip recording). */
  bossStart: { level: LevelId };
}

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof GameEvents, Handler<never>[]>();

  on<K extends keyof GameEvents>(ev: K, fn: Handler<GameEvents[K]>): void {
    const list = this.handlers.get(ev) ?? [];
    list.push(fn as Handler<never>);
    this.handlers.set(ev, list);
  }

  emit<K extends keyof GameEvents>(ev: K, payload: GameEvents[K]): void {
    for (const fn of this.handlers.get(ev) ?? []) (fn as Handler<GameEvents[K]>)(payload);
  }
}

export const bus = new Bus();
