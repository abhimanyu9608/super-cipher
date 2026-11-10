/** Canvas HUD (PRD section 9): hearts, power-ups, zone + progress, coins/score/time, boss bar, warnings, banners. */
import Phaser from 'phaser';
import { VIEW } from '../config/physics';
import { HEARTS, METRO, OFFICE, POWERUP_FRAMES, FX, type PowerUpId } from '../config/game';
import { LEVELS } from '../config/levels';
import { t, type StringKey } from '../i18n/strings';
import { session } from '../game/session';
import { formatTime, formatClock, padScore } from '../systems/score';
import { FONT } from '../systems/fx';
import type { LevelScene } from './LevelScene';

const label = (scene: Phaser.Scene, x: number, y: number, size: number, color = '#FFFFFF', stroke = 4) =>
  scene.add
    .text(x, y, '', {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#14121F',
      strokeThickness: stroke,
    })
    .setDepth(10);

interface PowerSlot {
  id: PowerUpId;
  icon: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  bg: Phaser.GameObjects.Rectangle;
}

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private powers: PowerSlot[] = [];
  private zone!: Phaser.GameObjects.Text;
  private progHead!: Phaser.GameObjects.Image;
  private coins!: Phaser.GameObjects.Text;
  private score!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private appraisal!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossPills: Phaser.GameObjects.Rectangle[] = [];
  private busCard!: Phaser.GameObjects.Container;
  private busText!: Phaser.GameObjects.Text;
  private doorPill!: Phaser.GameObjects.Container;
  private doorText!: Phaser.GameObjects.Text;
  private doorBg!: Phaser.GameObjects.Rectangle;
  private banner!: Phaser.GameObjects.Container;
  private bannerBg!: Phaser.GameObjects.Graphics;
  private bannerTitle!: Phaser.GameObjects.Text;
  private bannerTip!: Phaser.GameObjects.Text;
  private bannerKey: StringKey | null = null;
  private bannerT = -1;
  private bannerRed = false;
  private bannerLayoutLang = '';
  private combo!: Phaser.GameObjects.Text;
  private comboShadow!: Phaser.GameObjects.Text;
  private comboT = 0;
  private tick = 0;
  private readonly barX = VIEW.width / 2 - 150;

  constructor() {
    super('Hud');
  }

  create(): void {
    const run = session.run;
    if (!run) return;
    this.hearts = [];
    this.powers = [];
    this.bossPills = [];
    this.bannerT = -1;
    this.comboT = 0;
    const g = this.add.graphics();
    g.fillGradientStyle(0x0e0b1f, 0x0e0b1f, 0x0e0b1f, 0x0e0b1f, 0.85, 0.85, 0, 0);
    g.fillRect(0, 0, VIEW.width, 58);

    // Left: head in a gold ring, hearts, power-ups with draining bars.
    this.add.circle(30, 29, 22, 0x1b1636).setStrokeStyle(4, 0xffd43b);
    this.add.image(30, 29, `head-${run.character}`).setScale(0.62);
    for (let i = 0; i < HEARTS.max; i++) this.hearts.push(this.add.image(68 + i * 26, 22, 'heart'));
    for (const id of ['chai', 'headphones', 'coffee'] as PowerUpId[]) {
      const icon = this.add.image(0, 44, id).setScale(0.6);
      const bg = this.add.rectangle(0, 56, 26, 4, 0x3a3166).setOrigin(0, 0.5);
      const bar = this.add.rectangle(0, 56, 26, 4, 0x22d3ee).setOrigin(0, 0.5);
      this.powers.push({ id, icon, bar, bg });
    }

    // Centre: zone name + progress bar with checkpoint / boss / finish markers.
    this.zone = label(this, VIEW.width / 2, 14, 10, '#FFD43B').setOrigin(0.5);
    this.add.rectangle(this.barX, 38, 300, 8, 0x251e47).setOrigin(0, 0.5).setStrokeStyle(2, 0x14121f);
    for (const m of this.markers())
      this.add.rectangle(this.barX + m.p * 300, 38, 4, 14, m.color).setStrokeStyle(1.5, 0x14121f);
    this.progHead = this.add.image(this.barX, 38, `head-${run.character}`).setScale(0.36);

    // Right: coins, score, time or office clock, Appraisal Points.
    this.add.image(VIEW.width - 222, 18, 'coin').setScale(0.8);
    this.coins = label(this, VIEW.width - 208, 12, 11);
    this.score = label(this, VIEW.width - 16, 12, 11).setOrigin(1, 0);
    this.timeText = label(this, VIEW.width - 16, 34, 10, '#BDB5E0').setOrigin(1, 0);
    const office = LEVELS[run.level].officeClock;
    this.add
      .image(VIEW.width - 222, 42, 'appraisal')
      .setScale(0.55)
      .setVisible(office);
    this.appraisal = label(this, VIEW.width - 208, 36, 10, '#FFD43B').setVisible(office);

    // Boss name + 3 health pills under the band.
    this.bossName = label(this, VIEW.width / 2, 70, 9, '#FF8787').setOrigin(0.5);
    for (let i = 0; i < 3; i++)
      this.bossPills.push(
        this.add.rectangle(VIEW.width / 2 - 36 + i * 36, 88, 30, 10, 0xff5c5c).setStrokeStyle(2.5, 0x14121f),
      );

    // Flashing bus warning card.
    const busBg = this.add.rectangle(0, 0, 240, 40, 0xff5c5c).setStrokeStyle(4, 0x14121f);
    this.busText = label(this, 0, 0, 12).setOrigin(0.5);
    this.busCard = this.add.container(VIEW.width - 150, 120, [busBg, this.busText]).setVisible(false);

    // Metro door countdown pill.
    this.doorBg = this.add.rectangle(0, 0, 170, 30, 0x5f3dc4).setStrokeStyle(3, 0x14121f);
    this.doorText = label(this, 0, 0, 10).setOrigin(0.5);
    this.doorPill = this.add.container(VIEW.width / 2, 78, [this.doorBg, this.doorText]).setVisible(false);

    // Zone banner.
    this.bannerBg = this.add.graphics();
    this.bannerTitle = label(this, 0, -12, 14, '#FFD43B', 5).setOrigin(0.5);
    this.bannerTip = this.add
      .text(0, 14, '', {
        fontFamily: '"Baloo 2", sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#FFFFFF',
        stroke: '#14121F',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.banner = this.add
      .container(VIEW.width / 2, 120, [this.bannerBg, this.bannerTitle, this.bannerTip])
      .setAlpha(0)
      .setDepth(20);

    // Combo text with red + dark offset shadows.
    this.comboShadow = label(this, VIEW.width / 2 + 4, 204, 26, '#FF5C5C', 8)
      .setOrigin(0.5)
      .setAlpha(0);
    this.combo = label(this, VIEW.width / 2, 200, 26, '#FFFFFF', 6)
      .setOrigin(0.5)
      .setAlpha(0);

    const level = this.scene.get('Level') as LevelScene;
    const onZone = (key: string) => this.showBanner(key as StringKey, false);
    const onBoss = (key: string) => this.showBanner(key as StringKey, true);
    const onCombo = (n: number) => {
      this.combo.setText(t('combo', { n }));
      this.comboShadow.setText(t('combo', { n }));
      this.comboT = 60;
    };
    level.events.on('zone', onZone);
    level.events.on('bossBanner', onBoss);
    level.events.on('combo', onCombo);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      level.events.off('zone', onZone);
      level.events.off('bossBanner', onBoss);
      level.events.off('combo', onCombo);
    });
  }

  private markers(): { p: number; color: number }[] {
    const level = this.scene.get('Level') as LevelScene;
    const fin = level.map.finishX;
    const out: { p: number; color: number }[] = [];
    for (const o of level.map.layers.zones ?? []) {
      if (o.type === 'checkpoint') out.push({ p: o.x / fin, color: 0x40c057 });
      if (o.type === 'bossArena') out.push({ p: o.x / fin, color: 0xff5c5c });
    }
    out.push({ p: 1, color: 0xffd43b });
    return out;
  }

  private showBanner(key: StringKey, red: boolean): void {
    this.bannerRed = red;
    this.bannerT = 0;
    this.bannerKey = key;
    this.layoutBanner();
  }

  private layoutBanner(): void {
    const key = this.bannerKey;
    if (!key) return;
    this.bannerLayoutLang = t('langLabel');
    if (this.bannerRed) {
      this.bannerTitle.setText(t(key)).setColor('#FFFFFF');
      this.bannerTip.setText('');
    } else {
      this.bannerTitle.setText(t(key).toUpperCase()).setColor('#FFD43B');
      this.bannerTip.setText(t(`${key}Tip` as StringKey));
    }
    const w = Math.max(this.bannerTitle.width, this.bannerTip.width) + 48;
    const h = this.bannerRed ? 48 : 70;
    this.bannerTitle.y = this.bannerRed ? 0 : -13;
    this.bannerBg.clear();
    this.bannerBg.fillStyle(this.bannerRed ? 0xc92a2a : 0x1b1636, 0.95);
    this.bannerBg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.bannerBg.lineStyle(4, this.bannerRed ? 0x14121f : 0xffd43b);
    this.bannerBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  }

  update(_time: number, delta: number): void {
    const run = session.run;
    if (!run) return;
    const level = this.scene.get('Level') as LevelScene;
    const f = Math.min(4, delta / (1000 / 60));
    if (!session.paused) this.tick += f;

    // Hearts: at least 3 slots; lost ones at 20% opacity.
    const slots = Math.max(HEARTS.start, run.hearts);
    this.hearts.forEach((h, i) => {
      h.setVisible(i < slots);
      h.setTexture(i < run.hearts ? 'heart' : 'heartEmpty').setAlpha(i < run.hearts ? 1 : 0.2);
    });
    let px = 70;
    for (const p of this.powers) {
      const left = run.power[p.id];
      const on = left > 0;
      p.icon.setVisible(on);
      p.bar.setVisible(on);
      p.bg.setVisible(on);
      if (!on) continue;
      p.icon.setPosition(px + 13, 41);
      p.bg.setPosition(px, 55);
      p.bar.setPosition(px, 55);
      p.bar.width = 26 * (left / POWERUP_FRAMES[p.id]);
      p.icon.setAlpha(left < 120 && Math.floor(this.tick / 6) % 2 === 0 ? 0.4 : 1);
      px += 34;
    }
    const heartY = px > 70 ? 16 : 22;
    this.hearts.forEach((h) => (h.y = heartY));

    this.zone.setText(run.zoneKey ? t(run.zoneKey as StringKey).toUpperCase() : '');
    this.progHead.x = this.barX + run.progress * 300;
    this.coins.setText(`x${run.coins}`);
    this.score.setText(padScore(run.score));
    if (LEVELS[run.level].officeClock) {
      this.timeText.setText(formatClock(run.clock));
      this.timeText.setColor(run.clock >= OFFICE.clockRedMin ? '#FF5C5C' : '#BDB5E0');
    } else this.timeText.setText(`${t('time')} ${formatTime(run.frames)}`);
    this.appraisal.setText(`${run.appraisal}/5`);

    // Boss bar.
    const boss = run.boss;
    this.bossName.setVisible(!!boss);
    this.bossPills.forEach((p, i) => {
      p.setVisible(!!boss);
      if (boss) p.setFillStyle(i < boss.hp ? 0xff5c5c : 0x3a3166);
    });
    if (boss)
      this.bossName.setText(
        t(boss.name as StringKey) + (boss.phase ? ` · ${t(boss.phase as StringKey)}` : ''),
      );

    // Bus warning.
    this.busCard.setVisible(run.busWarning && Math.floor(this.tick / 8) % 2 === 0);
    this.busText.setText(t('busWarn'));

    // Metro door countdown: pulses red under 8 s.
    const df = run.doorFrames;
    this.doorPill.setVisible(df !== null && level.state === 'play');
    if (df !== null) {
      this.doorText.setText(`${t('doors')} ${Math.ceil(df / 60)}s`);
      const urgent = df < METRO.pulseUnder;
      this.doorBg.setFillStyle(urgent ? 0xff3b3b : 0x5f3dc4);
      this.doorPill.setScale(
        urgent && !session.reducedMotion ? 1 + Math.abs(Math.sin(this.tick * 0.2)) * 0.12 : 1,
      );
      this.doorPill.y = boss ? 112 : 78;
    }

    // Banner: slides down 30 px and fades in over 20 frames, holds, fades out.
    if (this.bannerT >= 0) {
      if (!session.paused) this.bannerT += f;
      const tb = this.bannerT;
      const total = FX.bannerFrames;
      const a = tb < 20 ? tb / 20 : tb > total - 20 ? Math.max(0, (total - tb) / 20) : 1;
      this.banner.setAlpha(a);
      this.banner.y = 96 + Math.min(1, tb / 20) * 30 + (boss || df !== null ? 46 : 0);
      if (this.bannerLayoutLang !== t('langLabel')) this.layoutBanner();
      if (tb >= total) this.bannerT = -1;
    }

    if (this.comboT > 0) {
      if (!session.paused) this.comboT -= f;
      const a = Math.min(1, this.comboT / 20);
      const s = 1 + Math.max(0, (this.comboT - 50) / 10) * 0.4;
      this.combo.setAlpha(a).setScale(s);
      this.comboShadow.setAlpha(a).setScale(s);
    } else {
      this.combo.setAlpha(0);
      this.comboShadow.setAlpha(0);
    }
  }
}
