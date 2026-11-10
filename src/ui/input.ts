/** Unified keyboard + touch input. The simulation reads held flags and consumes press edges. */
export const input = {
  left: false,
  right: false,
  jump: false,
  dash: false,
  jumpPresses: 0,
  dashPresses: 0,
  /** Touch state is tracked separately so releasing a key never cancels a held touch button. */
  touch: { left: false, right: false, jump: false, dash: false },
  keys: { left: false, right: false, jump: false, dash: false },
};

type Action = 'left' | 'right' | 'jump' | 'dash';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
};

function sync(): void {
  for (const a of ['left', 'right', 'jump', 'dash'] as const) input[a] = input.keys[a] || input.touch[a];
}

export function press(source: 'keys' | 'touch', a: Action, down: boolean): void {
  const was = input[a];
  input[source][a] = down;
  sync();
  if (!was && input[a]) {
    if (a === 'jump') input.jumpPresses++;
    if (a === 'dash') input.dashPresses++;
  }
}

/** Whether game keys should be captured (only while playing, so page scrolling still works elsewhere). */
let capture = false;
export const setCapture = (on: boolean): void => {
  capture = on;
  if (!on) releaseAll();
};

export function releaseAll(): void {
  for (const a of ['left', 'right', 'jump', 'dash'] as const) {
    input.keys[a] = false;
    input.touch[a] = false;
  }
  sync();
  input.jumpPresses = 0;
  input.dashPresses = 0;
}

export function consumeJump(): boolean {
  if (input.jumpPresses > 0) {
    input.jumpPresses = 0;
    return true;
  }
  return false;
}

export function consumeDash(): boolean {
  if (input.dashPresses > 0) {
    input.dashPresses = 0;
    return true;
  }
  return false;
}

export function initKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a || !capture) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    if (!e.repeat) press('keys', a, true);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) press('keys', a, false);
  });
  window.addEventListener('blur', releaseAll);
}
