/**
 * Full screen that works on phones.
 * 1. Try the real Fullscreen API (Android Chrome, desktop, iPad) and lock to landscape where allowed.
 * 2. If it's missing (iPhone Safari) or the browser refuses, fall back to "full window":
 *    the stage covers the whole viewport with CSS, page scroll is locked.
 * Installing to the home screen (manifest.webmanifest, display: fullscreen) removes the browser bars entirely.
 */
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: (opts?: FullscreenOptions) => Promise<void> | void };

let stage: FsEl;
const doc = document as FsDoc;

const realFull = (): boolean => !!(document.fullscreenElement ?? doc.webkitFullscreenElement);
export const isFullscreen = (): boolean => realFull() || stage.classList.contains('pseudo-full');

function sync(): void {
  stage.classList.toggle('is-full', isFullscreen());
  // Let Phaser re-measure its parent after the layout change.
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
}

function setPseudo(on: boolean): void {
  stage.classList.toggle('pseudo-full', on);
  document.body.classList.toggle('pseudo-full-on', on);
  if (on) window.scrollTo(0, 0);
  sync();
}

async function lockLandscape(): Promise<void> {
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o?.lock?.('landscape');
  } catch {
    /* orientation lock not supported or not allowed */
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) {
    if (stage.classList.contains('pseudo-full')) setPseudo(false);
    if (realFull()) {
      try {
        await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } catch {
        /* already exited */
      }
    }
    sync();
    return;
  }
  const request = stage.requestFullscreen ?? stage.webkitRequestFullscreen;
  if (request) {
    try {
      await request.call(stage, { navigationUI: 'hide' });
      // Some browsers resolve without actually entering full screen.
      if (realFull()) {
        await lockLandscape();
        sync();
        return;
      }
    } catch {
      /* refused: fall through to full-window mode */
    }
  }
  setPseudo(true);
}

export function initFullscreen(el: HTMLElement): void {
  stage = el as FsEl;
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && stage.classList.contains('pseudo-full') && !document.querySelector('.overlay'))
      setPseudo(false);
  });
}
