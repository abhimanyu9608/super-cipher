/**
 * HTML overlay screens over the canvas (PRD section 9) and the game flow between them:
 * Title → (Level select) → Level → Pause / Game Over / Level Clear → Unlock.
 */
import type Phaser from 'phaser';
import { LEVELS, LEVEL_IDS, isUnlocked, nextLevel, type LevelId } from '../config/levels';
import type { CharacterId } from '../config/physics';
import { t, getLang, onLangChange, type StringKey } from '../i18n/strings';
import { profile, session } from '../game/session';
import { bus, type ClearResult } from '../game/events';
import { titleKey, formatTime, padScore } from '../systems/score';
import { portraitDataUrl, headDataUrl } from '../gfx/sprites';
import { SKINS, moodFor, skinUnlocked, type SkinId } from '../config/extras';
import { currentClip } from './clip';
import { renderStoryCard } from '../social/storyCard';
import { checkCode } from '../social/unlock';
import { audio, sfx } from '../audio/sfx';
import { setCapture } from './input';
import type { LevelScene } from '../scenes/LevelScene';
import { copyText } from './clipboard';

type Screen = 'loading' | 'title' | 'select' | 'playing' | 'pause' | 'over' | 'clear' | 'unlock';

const IG = 'https://www.instagram.com/';
const IG_PROFILE = 'https://www.instagram.com/cipherboy.dev/';
const IG_DM = 'https://ig.me/m/cipherboy.dev';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );

/** Wrap each letter in a span so the logo can bounce in letter by letter. */
const letters = (word: string, offset: number): string =>
  [...word].map((ch, i) => `<i style="--i:${i + offset}">${ch === ' ' ? '&nbsp;' : esc(ch)}</i>`).join('');

export class Flow {
  screen: Screen = 'loading';
  level: LevelId = 1;
  /** The level the unlock screen is unlocking (always the next one after the highest unlocked). */
  private unlockTarget: LevelId = 2;
  private lastClear: ClearResult | null = null;
  private newBest = false;
  private cardUrl = '';
  private root: HTMLElement;
  private stage: HTMLElement;
  private listeners: ((s: Screen) => void)[] = [];

  constructor(private game: Phaser.Game) {
    this.root = document.getElementById('overlay-root') as HTMLElement;
    this.stage = document.getElementById('stage') as HTMLElement;
    bus.on('levelClear', (r) => this.onClear(r));
    bus.on('gameOver', () => this.show('over'));
    onLangChange(() => this.render());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.autoPause());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('sc-clip-ready', () => this.fillClipSlot());
  }

  private fillClipSlot(): void {
    const slot = this.root.querySelector('#clip-slot');
    const clip = currentClip();
    if (!slot || !clip || this.screen !== 'clear') return;
    slot.innerHTML = `<a class="btn btn-pink" href="${clip.url}" download="super-cipher-boss.${clip.ext}">${t('saveClip')}</a>`;
  }

  onScreen(fn: (s: Screen) => void): void {
    this.listeners.push(fn);
  }

  private get levelScene(): LevelScene {
    return this.game.scene.getScene('Level') as LevelScene;
  }

  // ------------------------------------------------------------------ transitions

  toTitle(): void {
    this.game.scene.stop('Hud');
    session.run = null;
    session.paused = false;
    audio.stopMusic();
    this.startLevelScene({ level: 1, character: profile.character, mode: 'attract', skin: profile.skin });
    this.show('title');
  }

  startLevel(level: LevelId): void {
    if (!isUnlocked(level, profile.unlocked)) {
      this.level = level;
      this.unlockTarget = Math.min(level, profile.unlocked + 1) as LevelId;
      this.cardUrl = '';
      this.show('unlock');
      return;
    }
    this.level = level;
    session.paused = false;
    audio.suspend(false);
    this.game.scene.stop('Hud');
    this.startLevelScene({ level, character: profile.character, mode: 'play', skin: profile.skin });
    this.show('playing');
  }

  private startLevelScene(data: {
    level: LevelId;
    character: CharacterId;
    mode: 'play' | 'attract';
    skin: SkinId;
  }): void {
    const sc = this.game.scene;
    if (sc.isActive('Level') || sc.isPaused('Level')) sc.stop('Level');
    sc.start('Level', data);
  }

  restart(): void {
    if (this.screen === 'title' || this.screen === 'select' || this.screen === 'loading') return;
    this.startLevel(this.level);
  }

  togglePause(): void {
    if (this.screen === 'playing') this.pause();
    else if (this.screen === 'pause') this.resume();
  }

  pause(): void {
    if (this.screen !== 'playing') return;
    session.paused = true;
    audio.suspend(true);
    this.show('pause');
  }

  private autoPause(): void {
    if (this.screen === 'playing' && this.levelScene?.state === 'play') this.pause();
  }

  resume(): void {
    if (this.screen !== 'pause') return;
    session.paused = false;
    audio.suspend(false);
    this.show('playing');
  }

  continueRun(): void {
    this.levelScene.continueRun();
    this.show('playing');
  }

  private onClear(r: ClearResult): void {
    this.lastClear = r;
    this.newBest = profile.record(r.level, r.score, r.stars);
    this.cardUrl = '';
    this.show('clear');
  }

  private onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const typing =
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
    if ((e.code === 'KeyP' || e.code === 'Escape') && !typing) {
      if (this.screen === 'playing' || this.screen === 'pause') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'Escape' && (this.screen === 'select' || this.screen === 'unlock'))
        this.toTitle();
    }
    if (this.screen === 'over' && e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.continueRun();
    }
    if (this.screen === 'title' && e.code === 'Enter' && !typing && (target?.tagName ?? '') !== 'BUTTON') {
      e.preventDefault();
      this.startLevel(1);
    }
  }

  show(s: Screen): void {
    this.screen = s;
    this.stage.classList.toggle('playing', s === 'playing');
    setCapture(s === 'playing');
    this.render();
    this.listeners.forEach((fn) => fn(s));
    // Move keyboard focus to the main button of the overlay.
    const main = this.root.querySelector<HTMLElement>('[data-main]');
    if (main) main.focus({ preventScroll: true });
    else if (
      s === 'playing' &&
      document.activeElement instanceof HTMLElement &&
      this.root.contains(document.activeElement)
    )
      document.activeElement.blur();
  }

  // ------------------------------------------------------------------ rendering

  render(): void {
    const html = this.html();
    this.root.innerHTML = html;
    this.bind();
  }

  private html(): string {
    switch (this.screen) {
      case 'title':
        return this.titleHtml();
      case 'select':
        return this.selectHtml();
      case 'pause':
        return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
          <h2 id="ov-h" class="h-big">${t('paused')}</h2>
          <p class="lead">${t('pauseSub')}</p>
          <div class="row">
            <button class="btn btn-gold btn-big" data-act="resume" data-main>${t('resume')}</button>
            <button class="btn" data-act="restart">↻ ${t('restart')}</button>
            <button class="btn btn-ghost" data-act="title">${t('menu')}</button>
          </div></div>`;
      case 'over':
        return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
          <h2 id="ov-h" class="h-big h-red">${t('overBig')}</h2>
          <p class="lead">${t('overMsg')}</p>
          <p class="hint">${t('overNote')}</p>
          <div class="row">
            <button class="btn btn-gold btn-big" data-act="continue" data-main>${t('continue')}</button>
            <button class="btn" data-act="restart">${t('startOver')}</button>
            <button class="btn btn-ghost" data-act="title">${t('menu')}</button>
          </div></div>`;
      case 'clear':
        return this.clearHtml();
      case 'unlock':
        return this.unlockHtml();
      default:
        return '';
    }
  }

  private titleHtml(): string {
    const ch = profile.character;
    const mood = moodFor(new Date());
    const stars = profile.totalStars();
    const card = (id: CharacterId, name: StringKey, perk: StringKey) =>
      `<button class="char-card" data-char="${id}" aria-pressed="${ch === id}">
        <img src="${portraitDataUrl(id, 'idle0', ch === id ? profile.skin : 'none')}" alt="" width="64" height="82" />
        <span><span class="char-name">${t(name)}</span><span class="char-perk">${t(perk)}</span></span>
      </button>`;
    return `<div class="overlay title">
      <p class="eyebrow">${t('world1')}</p>
      <h1 class="big-logo" aria-label="${esc(t('logoTop'))} ${esc(t('logoBottom'))}">${letters(t('logoTop'), 0)}<span>${letters(t('logoBottom'), 12)}</span></h1>
      <p class="mood-chip"><b>${t('moodTitle')}:</b> ${t(mood.nameKey)} · ${t(mood.descKey)}</p>
      <p class="lead">${t('sub')}</p>
      <div class="chars" role="group" aria-label="${esc(t('chooseChar'))}">
        ${card('boy', 'charBoy', 'perkHighJump')}
        ${card('girl', 'charGirl', 'perkFastRun')}
      </div>
      <div class="skins" role="group" aria-label="${esc(t('skinTitle'))}">
        ${SKINS.map((sk) => {
          const open = skinUnlocked(sk.id, stars);
          return `<button class="skin ${open ? '' : 'locked'}" data-skin="${sk.id}" aria-pressed="${profile.skin === sk.id}" ${open ? '' : 'aria-disabled="true"'} title="${esc(open ? t(sk.nameKey) : t('skinLocked', { n: sk.stars }))}">
            <img src="${headDataUrl(ch, 40, sk.id)}" alt="" width="40" height="40" />
            <span>${open ? t(sk.nameKey) : t('skinLocked', { n: sk.stars })}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="row">
        <button class="btn btn-gold btn-big" data-act="start" data-main>${t('start')}</button>
        <button class="btn" data-act="select">${t('levels')}</button>
      </div>
      <p class="hint">${t('controlsHint')}</p>
    </div>`;
  }

  private selectHtml(): string {
    const unlocked = profile.unlocked;
    const icons = ['🏠', '🚇', '🏢', '🍛', '🌙', '🤝', '🏝️', '📈', '👑'];
    const soonKeys: StringKey[] = (['lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'] as StringKey[]).slice(
      LEVEL_IDS.length - 2,
    );
    const here = Math.max(...LEVEL_IDS.filter((id) => isUnlocked(id, unlocked)));
    const nodes = [
      `<div class="node done"><span class="node-ico">${icons[0]}</span><span class="node-name">${t('mapHome')}</span></div>`,
      ...LEVEL_IDS.map((id) => {
        const def = LEVELS[id];
        const open = isUnlocked(id, unlocked);
        const stars = profile.stars(id);
        return `<button class="node ${open ? 'open' : 'locked'}" data-level="${id}" ${id === here ? 'data-main' : ''}>
          ${id === here ? `<img class="node-me" src="${headDataUrl(profile.character, 44, profile.skin)}" alt="" />` : ''}
          <span class="node-ico">${open ? icons[id] : '🔒'}</span>
          <span class="node-name">${t(def.nameKey)}</span>
          <span class="node-meta">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
          <span class="node-meta">${t('best')} ${padScore(profile.best(id))}</span>
          <span class="node-cta">${open ? t('play') : t('unlockToPlay')}</span>
        </button>`;
      }),
      ...soonKeys.map(
        (k, i) =>
          `<div class="node soon"><span class="node-ico">${icons[i + LEVEL_IDS.length + 1]}</span><span class="node-name">${t(k)}</span><span class="node-meta">${t('soonShort')}</span></div>`,
      ),
    ];
    return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
      <h2 id="ov-h" class="h-big">${t('mapWorld')}</h2>
      <div class="overworld">${nodes.join('<span class="road" aria-hidden="true"></span>')}</div>
      <div class="row">
        <a class="btn btn-pink" href="${IG_PROFILE}" target="_blank" rel="noopener">${t('followForNews')}</a>
        <button class="btn btn-ghost" data-act="title">${t('back')}</button>
      </div>
    </div>`;
  }

  private clearHtml(): string {
    const r = this.lastClear;
    if (!r) return '';
    const def = LEVELS[r.level];
    const starHtml = [0, 1, 2]
      .map(
        (i) =>
          `<span class="s ${i < r.stars ? 'on' : 'off'}" style="animation-delay:${0.25 + i * 0.35}s">⭐</span>`,
      )
      .join('');
    const next = nextLevel(r.level);
    const nextOpen = next !== null && isUnlocked(next, profile.unlocked);
    const nextBtn =
      next === null
        ? `<a class="btn btn-pink" href="${IG_PROFILE}" target="_blank" rel="noopener">${t('comingSoon', { n: r.level + 1 })} · ${t('follow')}</a>`
        : `<button class="btn btn-gold btn-big" data-act="${nextOpen ? 'next' : 'unlock'}" data-main>${nextOpen ? t('nextLevel', { n: next }) : t('unlockNext', { n: next })}</button>`;
    const stats = [
      [t('statScore'), padScore(r.score)],
      [t('statCoins'), `${r.coins}/${r.totalCoins}`],
      [t('statTime'), formatTime(r.frames)],
      [t('statBest'), padScore(profile.best(r.level))],
      ...(def.thirdStar === 'appraisal' ? [[t('statAppraisal'), `${r.appraisal}/5`]] : []),
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
    return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
      <div class="stars" aria-label="${r.stars}/3">${starHtml}</div>
      <h2 id="ov-h" class="h-big">${t(def.clearKey)}</h2>
      <div class="promo">
        <img src="${portraitDataUrl(profile.character, 'idle0', 'none')}" alt="" />
        <span class="promo-arrow">➜</span>
        <img class="promo-new" src="${portraitDataUrl(profile.character, 'win1', def.promoSkin)}" alt="" />
        <p class="title-badge"><b>${t('promoted')}</b> ${t(titleKey(r.stars))}<br />${t('promotion', { from: def.promotion.from, to: def.promotion.to })}</p>
      </div>
      ${this.newBest ? `<p class="new-best">${t('newBest')}</p>` : ''}
      <dl class="stats">${stats}</dl>
      <div class="row">
        ${nextBtn}
        <button class="btn" data-act="restart" ${next === null ? 'data-main' : ''}>${t('playAgain')}</button>
        <button class="btn btn-cyan" data-act="challenge">${t('copyChallenge')}</button>
        <span id="clip-slot"></span>
      </div>
      <p class="toast" id="toast" aria-live="polite"></p>
    </div>`;
  }

  private storyCardUrl(): string {
    if (this.cardUrl) return this.cardUrl;
    const level = Math.max(1, this.unlockTarget - 1) as LevelId;
    const r = this.lastClear?.level === level ? this.lastClear : null;
    const canvas = renderStoryCard({
      character: profile.character,
      level,
      stars: r?.stars ?? Math.max(1, profile.stars(level)),
      score: r?.score ?? profile.best(level),
      coins: r?.coins ?? 0,
      totalCoins: r?.totalCoins ?? 0,
      lang: getLang(),
    });
    this.cardUrl = canvas.toDataURL('image/png');
    return this.cardUrl;
  }

  private unlockHtml(): string {
    const target = this.unlockTarget;
    if (isUnlocked(target, profile.unlocked)) {
      return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
        <h2 id="ov-h" class="h-big">${t('unlocked', { n: target })}</h2>
        <div class="row">
          <button class="btn btn-gold btn-big" data-act="play2" data-main>${t('playLevel2', { n: target })}</button>
          <button class="btn btn-ghost" data-act="title">${t('menu')}</button>
        </div></div>`;
    }
    const pid = profile.playerId;
    const url = this.storyCardUrl();
    return `<div class="overlay dim" role="dialog" aria-modal="true" aria-labelledby="ov-h">
      <h2 id="ov-h" class="h-big">${t('unlockTitle', { n: target })}</h2>
      <p class="hint">${t('unlockIntro', { n: target })}</p>
      <div class="unlock">
        <img class="card-preview" src="${url}" alt="${esc(t('cardAlt'))}" />
        <div class="steps">
          <section class="step"><h3>${t('step1')}</h3><p>${t('step1Text')}</p>
            <div class="row">
              <a class="btn btn-pink" href="${IG}" target="_blank" rel="noopener">${t('openInstagram')}</a>
              <a class="btn" href="${url}" download="super-cipher-story.png">${t('saveCard')}</a>
            </div></section>
          <section class="step"><h3>${t('step2')}</h3>
            <div class="row"><a class="btn btn-pink" href="${IG_PROFILE}" target="_blank" rel="noopener">${t('follow')}</a></div></section>
          <section class="step"><h3>${t('step3')}</h3><p>${t('step3Text')} <span class="pid">${pid}</span></p>
            <div class="row">
              <button class="btn btn-cyan" data-act="copydm">${t('copyDm')}</button>
              <a class="btn" href="${IG_DM}" target="_blank" rel="noopener">${t('openDm')}</a>
            </div></section>
          <section class="step"><h3>${t('step4')}</h3>
            <form class="row" data-form="code">
              <label class="sr" for="code-in" hidden>${t('step4')}</label>
              <input id="code-in" class="code-input" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(t('codePlaceholder'))}" data-main />
              <button class="btn btn-gold" type="submit">${t('unlockBtn')}</button>
            </form>
            <p class="err" id="code-err" aria-live="polite"></p></section>
        </div>
      </div>
      <button class="btn btn-ghost" data-act="title">${t('back')}</button>
      <p class="toast" id="toast" aria-live="polite"></p>
    </div>`;
  }

  private toast(msg: string): void {
    const el = this.root.querySelector('#toast');
    if (el) el.textContent = msg;
  }

  private bind(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.skin as SkinId;
        if (!skinUnlocked(id, profile.totalStars())) {
          sfx('hurt', { volume: 0.4 });
          return;
        }
        profile.skin = id;
        sfx('powerup', { volume: 0.5 });
        this.render();
        this.root.querySelector<HTMLElement>(`[data-skin="${id}"]`)?.focus();
        this.listeners.forEach((fn) => fn(this.screen));
      }),
    );
    this.root.querySelectorAll<HTMLButtonElement>('[data-char]').forEach((b) =>
      b.addEventListener('click', () => {
        profile.character = b.dataset.char as CharacterId;
        sfx('click');
        this.render();
        this.root.querySelector<HTMLElement>(`[data-char="${b.dataset.char}"]`)?.focus();
        this.listeners.forEach((fn) => fn(this.screen));
      }),
    );
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-level]')
      .forEach((b) => b.addEventListener('click', () => this.startLevel(Number(b.dataset.level) as LevelId)));
    this.root.querySelectorAll<HTMLElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        switch (b.dataset.act) {
          case 'start':
            return this.startLevel(1);
          case 'select':
            return this.show('select');
          case 'title':
            return this.toTitle();
          case 'resume':
            return this.resume();
          case 'restart':
            return this.startLevel(this.level);
          case 'continue':
            return this.continueRun();
          case 'next':
            return this.startLevel(nextLevel(this.level) ?? this.level);
          case 'play2':
            return this.startLevel(this.unlockTarget);
          case 'unlock':
            this.unlockTarget = nextLevel(this.level) ?? this.level;
            this.cardUrl = '';
            return this.show('unlock');
          case 'challenge': {
            const r = this.lastClear;
            const msg = `${t('challenge', { s: r?.score ?? 0, c: r?.coins ?? 0 })} ${location.origin}${location.pathname}`;
            void copyText(msg).then((ok) => this.toast(ok ? t('copied') : `${t('copyFailed')}: ${msg}`));
            return;
          }
          case 'copydm': {
            const msg = t('dmMessage', {
              pid: profile.playerId,
              n: this.unlockTarget,
              done: this.unlockTarget - 1,
            });
            void copyText(msg).then((ok) => this.toast(ok ? t('copied') : `${t('copyFailed')}: ${msg}`));
            return;
          }
        }
      }),
    );
    const form = this.root.querySelector<HTMLFormElement>('[data-form="code"]');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input') as HTMLInputElement;
      if (checkCode(profile.playerId, this.unlockTarget, input.value)) {
        profile.unlocked = this.unlockTarget;
        sfx('unlock');
        this.show('unlock');
      } else {
        const err = this.root.querySelector('#code-err');
        if (err) err.textContent = t('wrongCode');
        sfx('hurt');
        input.select();
      }
    });
  }
}
