/** Boot: fonts → Phaser game → UI shell → title screen. */
import Phaser from 'phaser';
import './style.css';
import { VIEW } from './config/physics';
import { PreloadScene } from './scenes/PreloadScene';
import { LevelScene } from './scenes/LevelScene';
import { HudScene } from './scenes/HudScene';
import { Flow } from './ui/screens';
import { initShell } from './ui/shell';
import { initScare } from './ui/scare';
import { initClip } from './ui/clip';
import { initKeyboard } from './ui/input';
import { bus } from './game/events';
import { audio } from './audio/sfx';

async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const timeout = new Promise<void>((r) => setTimeout(r, 2500));
  const fonts = Promise.all([
    document.fonts.load('12px "Press Start 2P"'),
    document.fonts.load('700 18px "Baloo 2"'),
    document.fonts.load('800 18px "Baloo 2"'),
  ]).then(() => undefined);
  await Promise.race([fonts, timeout]).catch(() => undefined);
}

async function boot(): Promise<void> {
  await loadFonts();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW.width,
    height: VIEW.height,
    backgroundColor: '#0E0B1F',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60, smoothStep: true },
    input: { keyboard: false, gamepad: false },
    audio: { noAudio: true },
    banner: false,
    scene: [PreloadScene, LevelScene, HudScene],
  });
  // Dev-only handle for debugging in the browser console (stripped from production builds).
  if (import.meta.env.DEV) (window as unknown as { __sc: unknown }).__sc = { game };
  audio.init(import.meta.env.BASE_URL);
  initKeyboard();
  const flow = new Flow(game);
  initShell(flow);
  initScare();
  initClip();
  bus.on('ready', () => {
    document.getElementById('loading')?.classList.add('done');
    flow.toTitle();
  });
  // Pause the game loop when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.loop.sleep();
    else game.loop.wake();
  });
}

void boot();
