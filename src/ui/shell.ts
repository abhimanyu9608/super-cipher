/** Page shell: header toolbar, language switch, info panels, touch controls and the #admin owner tool. */
import { t, getLang, setLang, onLangChange, htmlLang, type StringKey, type Lang } from '../i18n/strings';
import { LEVELS, LEVEL_IDS, PLANNED_LEVELS, type LevelId } from '../config/levels';
import { profile, session } from '../game/session';
import { headDataUrl } from '../gfx/sprites';
import { audio } from '../audio/sfx';
import { unlockCode, isPlayerId } from '../social/unlock';
import { press } from './input';
import { copyText } from './clipboard';
import type { Flow } from './screens';
import { initFullscreen, toggleFullscreen } from './fullscreen';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;

const ZONES: Record<LevelId, { key: string; icon: string; stars: number }[]> = {
  1: [
    { key: 'z1_1', icon: '🏠', stars: 1 },
    { key: 'z1_2', icon: '🐕', stars: 2 },
    { key: 'z1_3', icon: '🛺', stars: 3 },
    { key: 'z1_cp', icon: '☕', stars: 0 },
    { key: 'z1_4', icon: '🏗️', stars: 4 },
    { key: 'z1_5', icon: '🐒', stars: 4 },
    { key: 'z1_6', icon: '🚇', stars: 5 },
  ],
  2: [
    { key: 'z2_1', icon: '🏢', stars: 1 },
    { key: 'z2_2', icon: '🛗', stars: 2 },
    { key: 'z2_3', icon: '💻', stars: 3 },
    { key: 'z2_cp', icon: '💧', stars: 0 },
    { key: 'z2_4', icon: '🍿', stars: 4 },
    { key: 'z2_5', icon: '🖥️', stars: 4 },
    { key: 'z2_boss', icon: '👔', stars: 5 },
    { key: 'z2_fin', icon: '☝️', stars: 0 },
  ],
  3: [
    { key: 'z3_1', icon: '🍽️', stars: 1 },
    { key: 'z3_2', icon: '🍛', stars: 2 },
    { key: 'z3_cp', icon: '☕', stars: 0 },
    { key: 'z3_3', icon: '🥣', stars: 3 },
    { key: 'z3_4', icon: '🍽️', stars: 4 },
    { key: 'z3_boss', icon: '👩‍🍳', stars: 5 },
    { key: 'z3_fin', icon: '💻', stars: 0 },
  ],
};

export function initShell(flow: Flow): void {
  let mapLevel: LevelId = 1;

  const applyStatic = () => {
    document.documentElement.lang = htmlLang(getLang());
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n as StringKey);
    });
    document.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
      const label = t(el.dataset.i18nLabel as StringKey);
      el.setAttribute('aria-label', label);
      el.title = label;
    });
    document
      .querySelectorAll<HTMLButtonElement>('[data-lang]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
    const snd = $('#btn-sound');
    snd.textContent = audio.enabled ? '🔊' : '🔇';
    snd.setAttribute('aria-label', t(audio.enabled ? 'soundOn' : 'soundOff'));
    snd.setAttribute('aria-pressed', String(audio.enabled));
    snd.title = t(audio.enabled ? 'soundOn' : 'soundOff');
    renderPanels();
  };

  const renderPanels = () => {
    $('#map-title').textContent = t(LEVELS[mapLevel].mapTitleKey);
    $('#map-goal').textContent = t(LEVELS[mapLevel].mapGoalKey);
    $('#zone-list').innerHTML = ZONES[mapLevel]
      .map(
        (z) => `<li><span class="ico" aria-hidden="true">${z.icon}</span>
        <span><span class="zn">${t(z.key as StringKey)}</span><br /><span class="zd">${t(`${z.key}Desc` as StringKey)}</span></span>
        <span class="zs" aria-label="${z.stars}/5">${z.stars ? '★'.repeat(z.stars) + '☆'.repeat(5 - z.stars) : '♥'}</span></li>`,
      )
      .join('');
    const how = document.querySelector('.how-list');
    if (how && mapLevel === 2 && !how.querySelector('[data-dash]')) {
      how.insertAdjacentHTML(
        'beforeend',
        `<li data-dash><span class="ico" aria-hidden="true">💨</span><span data-i18n="howDash">${t('howDash')}</span></li>`,
      );
    }
    how?.querySelector('[data-dash]')?.toggleAttribute('hidden', mapLevel !== 2);
  };

  const updateHead = () => {
    const img = $<HTMLImageElement>('#brand-head');
    img.src = headDataUrl(profile.character, 88, profile.skin);
  };

  flow.onScreen(() => {
    const lvl = flow.screen === 'title' ? 1 : flow.level;
    if (lvl !== mapLevel) {
      mapLevel = lvl;
      renderPanels();
    }
    updateHead();
  });

  // Toolbar.
  document
    .querySelectorAll<HTMLButtonElement>('[data-lang]')
    .forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang as Lang)));
  $('#btn-pause').addEventListener('click', () => flow.togglePause());
  $('#btn-restart').addEventListener('click', () => flow.restart());
  $('#btn-sound').addEventListener('click', () => {
    audio.setEnabled(!audio.enabled);
    applyStatic();
  });
  initFullscreen($('#stage'));
  $('#btn-full').addEventListener('click', () => void toggleFullscreen());
  $('#btn-full-exit').addEventListener('click', () => void toggleFullscreen());
  $('#btn-pause-in').addEventListener('click', () => flow.togglePause());
  onLangChange(applyStatic);
  applyStatic();
  updateHead();

  initTouch();
  initAdmin();
}

function initTouch(): void {
  const root = $('#touch');
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  root.querySelectorAll<HTMLButtonElement>('.tbtn').forEach((btn) => {
    const act = btn.dataset.act as 'left' | 'right' | 'jump' | 'dash';
    const down = (e: PointerEvent) => {
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
      btn.classList.add('down');
      press('touch', act, true);
    };
    const up = (e: PointerEvent) => {
      e.preventDefault();
      btn.classList.remove('down');
      press('touch', act, false);
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  });
  // DASH shows only while the coffee power-up is active.
  const dash = root.querySelector('.tbtn-dash') as HTMLElement;
  const loop = () => {
    dash.classList.toggle('show', !!session.run && session.run.power.coffee > 0);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function initAdmin(): void {
  const panel = $('#admin');
  const sel = $<HTMLSelectElement>('#admin-level');
  for (let n = 2; n <= PLANNED_LEVELS; n++) {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = LEVEL_IDS.includes(n as LevelId)
      ? `${n} · ${t(LEVELS[n as LevelId].nameKey)}`
      : String(n);
    sel.appendChild(o);
  }
  const sync = () => {
    panel.hidden = location.hash !== '#admin';
  };
  window.addEventListener('hashchange', sync);
  sync();
  let reply = '';
  $('#admin-gen').addEventListener('click', () => {
    const pid = $<HTMLInputElement>('#admin-pid').value.trim().toUpperCase();
    const msg = $('#admin-msg');
    const out = $('#admin-code');
    const copy = $('#admin-copy');
    if (!isPlayerId(pid)) {
      msg.textContent = t('adminBadPid');
      out.textContent = '';
      copy.hidden = true;
      return;
    }
    const n = Number(sel.value);
    const code = unlockCode(pid, n);
    out.textContent = code;
    reply = t('adminReply', { n, pid, code });
    msg.textContent = reply;
    copy.hidden = false;
  });
  $('#admin-copy').addEventListener('click', () => {
    void copyText(reply).then((ok) => ($('#admin-msg').textContent = ok ? `${t('copied')} ${reply}` : reply));
  });
}
