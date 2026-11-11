/** Jumpscare pop-up: a giant face + caption flashed over the canvas for ~0.9 s. */
import { bus } from '../game/events';

export function initScare(): void {
  const box = document.querySelector('.stage-box') as HTMLElement;
  let timer = 0;
  bus.on('jumpscare', ({ image, text }) => {
    box.querySelector('.scare')?.remove();
    const el = document.createElement('div');
    el.className = 'scare';
    el.setAttribute('role', 'alert');
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      el.appendChild(img);
    }
    const p = document.createElement('p');
    p.textContent = text;
    el.appendChild(p);
    box.appendChild(el);
    // Short phone buzz where supported.
    try {
      navigator.vibrate?.([80, 40, 140]);
    } catch {
      /* vibration not allowed */
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => el.remove(), 950);
  });

  // Meme-style reaction stickers: slap onto the screen, wobble, peel away.
  bus.on('sticker', ({ text }) => {
    box.querySelector('.sticker')?.remove();
    const el = document.createElement('p');
    el.className = 'sticker';
    el.setAttribute('role', 'status');
    el.textContent = text;
    el.style.setProperty('--tilt', `${(Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4)}deg`);
    box.appendChild(el);
    window.setTimeout(() => el.remove(), 1900);
  });
}
