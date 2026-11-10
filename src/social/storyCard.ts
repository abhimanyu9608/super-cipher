/** Instagram story card: 1080x1920 PNG (PRD section 11). */
import type { CharacterId } from '../config/physics';
import { drawCharacter } from '../gfx/characters';
import { makeCanvas, rr, fillStroke, seeded, star, text } from '../gfx/draw';
import { t, type Lang } from '../i18n/strings';

export interface CardData {
  character: CharacterId;
  level: number;
  stars: number;
  score: number;
  coins: number;
  totalCoins: number;
  lang: Lang;
}

export function renderStoryCard(d: CardData): HTMLCanvasElement {
  const W = 1080;
  const H = 1920;
  const { canvas, ctx: c } = makeCanvas(W, H);
  const L = d.lang;

  // Purple-to-pink gradient.
  const g = c.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, '#2A1F5C');
  g.addColorStop(0.5, '#7C3AED');
  g.addColorStop(1, '#F06595');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // Sun-burst rays behind the hero.
  c.save();
  c.translate(W / 2, 900);
  c.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 16; i++) {
    c.rotate((Math.PI * 2) / 16);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-90, -1100);
    c.lineTo(90, -1100);
    c.closePath();
    c.fill();
  }
  c.restore();

  // Confetti.
  const r = seeded(d.score + d.coins + 7);
  const colors = ['#FFD43B', '#22D3EE', '#40C057', '#FF5C5C', '#FFFFFF', '#F06595'];
  for (let i = 0; i < 140; i++) {
    c.save();
    c.translate(r() * W, r() * H);
    c.rotate(r() * Math.PI);
    c.fillStyle = colors[Math.floor(r() * colors.length)];
    c.fillRect(-10, -5, 20, 10);
    c.restore();
  }

  // Logo.
  text(c, 'SUPER CIPHER', W / 2, 190, 78, '#FFD43B', { stroke: 18 });
  text(c, 'OFFICE RUN', W / 2, 300, 52, '#FFFFFF', { stroke: 14 });

  // Hero spotlight + character art.
  c.fillStyle = 'rgba(14,11,31,0.35)';
  c.beginPath();
  c.ellipse(W / 2, 1330, 280, 40, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(W / 2 - 64 * 4.1, 1345 - 160 * 4.1);
  c.scale(4.1, 4.1);
  drawCharacter(c, d.character, 'win1');
  c.restore();

  // LEVEL CLEAR banner.
  c.save();
  c.translate(W / 2, 450);
  c.rotate(-0.04);
  rr(c, -440, -70, 880, 140, 36);
  fillStroke(c, '#14121F', 0);
  rr(c, -430, -60, 860, 120, 30);
  fillStroke(c, '#FFD43B', 8, '#14121F');
  text(c, t('cardClear', { n: d.level === 1 ? '1-1' : '1-2' }, L), 0, 4, 46, '#14121F', {
    maxWidth: 800,
  });
  c.restore();

  // Stars.
  for (let i = 0; i < 3; i++) {
    const on = i < d.stars;
    star(c, W / 2 + (i - 1) * 200, 620 - (i === 1 ? 30 : 0), 80, on ? '#FFD43B' : 'rgba(20,18,31,0.45)', 10);
  }

  // Score + coins panel.
  rr(c, 90, 1360, W - 180, 260, 40);
  fillStroke(c, 'rgba(14,11,31,0.82)', 8, '#FFD43B');
  text(c, t('cardScore', undefined, L), 320, 1430, 34, '#BDB5E0');
  text(c, String(d.score).padStart(6, '0'), 320, 1520, 62, '#FFFFFF', { stroke: 10 });
  text(c, t('cardCoins', undefined, L), 790, 1430, 34, '#BDB5E0');
  text(c, `${d.coins}/${d.totalCoins}`, 790, 1520, 62, '#FFD43B', { stroke: 10 });

  // Challenge + handle.
  text(c, t('cardBeat', undefined, L), W / 2, 1710, 50, '#FFFFFF', { stroke: 14, maxWidth: W - 100 });
  rr(c, W / 2 - 300, 1780, 600, 90, 45);
  fillStroke(c, '#FFFFFF', 6, '#14121F');
  text(c, '@cipherboy.dev', W / 2, 1826, 40, '#7C3AED');
  return canvas;
}
