/**
 * Loads level maps and optional real-art overrides, then generates every procedural texture.
 * To swap in real art: add public/assets/sprites/manifest.json, e.g. { "bug": "bug.png" }.
 * Keys in the manifest replace the generated texture with the same key.
 */
import Phaser from 'phaser';
import { registerSprites, darknessCanvas } from '../gfx/sprites';
import { paintSkyline, paintHills, paintOfficeSkyline } from '../gfx/world';
import { LEVELS, LEVEL_IDS } from '../config/levels';
import { bus } from '../game/events';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const id of LEVEL_IDS) this.load.json(`map-${id}`, `assets/maps/${LEVELS[id].map}`);
    this.load.json('sprite-manifest', 'assets/sprites/manifest.json');
    this.load.on('progress', (v: number) => setLoadProgress(v * 0.7));
  }

  create(): void {
    const manifest = (this.cache.json.get('sprite-manifest') ?? {}) as Record<string, string>;
    const entries = Object.entries(manifest).filter(([k]) => !k.startsWith('_'));
    if (entries.length) {
      for (const [key, file] of entries) this.load.image(key, `assets/sprites/${file}`);
      this.load.once('complete', () => this.finish());
      this.load.start();
    } else this.finish();
  }

  private finish(): void {
    setLoadProgress(0.85);
    registerSprites(this.textures);
    if (!this.textures.exists('skyline')) this.textures.addCanvas('skyline', paintSkyline());
    if (!this.textures.exists('officeSkyline'))
      this.textures.addCanvas('officeSkyline', paintOfficeSkyline());
    if (!this.textures.exists('hills')) this.textures.addCanvas('hills', paintHills());
    if (!this.textures.exists('darkness')) this.textures.addCanvas('darkness', darknessCanvas());
    setLoadProgress(1);
    bus.emit('ready', undefined);
  }
}

function setLoadProgress(v: number): void {
  const bar = document.getElementById('load-bar');
  if (bar) bar.style.width = `${Math.round(v * 100)}%`;
}
