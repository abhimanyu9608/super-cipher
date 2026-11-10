/**
 * Event → sound map and mixer (PRD section 10).
 * Master 0.8, effects 0.7, voice 0.9, music 0.35 (ducked to 0.15 while a voice line plays).
 * Max 2 voice lines per 5 s. Audio only starts after the first click/tap/key.
 *
 * Owner voice lines and Pixabay effects are optional files listed in
 * public/assets/audio/manifest.json ({ "bark": "bark" } → bark.ogg / bark.mp3). Any event with no
 * file falls back to its generated sound, so the game always has audio.
 */
import { AUDIO_MIX } from '../config/game';
import { load, save, KEYS } from '../storage';
import { SOUNDS, musicSpec, render } from './synth';

export type SfxEvent =
  | 'jump'
  | 'djump'
  | 'coin'
  | 'bump'
  | 'powerup'
  | 'stomp'
  | 'hurt'
  | 'bark'
  | 'honk'
  | 'moo'
  | 'thud'
  | 'checkpoint'
  | 'ook'
  | 'monkeyGone'
  | 'coworker'
  | 'manager'
  | 'tick'
  | 'pitfall'
  | 'gameover'
  | 'victory'
  | 'beep'
  | 'accessOk'
  | 'dash'
  | 'pop'
  | 'laser'
  | 'scan'
  | 'click'
  | 'bossHit'
  | 'paper'
  | 'ring'
  | 'unlock'
  | 'heart'
  | 'late'
  | 'jumpscare';

type Channel = 'sfx' | 'voice';

/** Which channel each event plays on, and the generated fallback(s). */
const MAP: Record<SfxEvent, { ch: Channel; gen: string[] }> = {
  jump: { ch: 'sfx', gen: ['jump'] },
  djump: { ch: 'sfx', gen: ['djump'] },
  coin: { ch: 'sfx', gen: ['coin'] },
  bump: { ch: 'sfx', gen: ['bump'] },
  powerup: { ch: 'sfx', gen: ['powerup'] },
  stomp: { ch: 'sfx', gen: ['stomp'] },
  hurt: { ch: 'sfx', gen: ['hurt'] },
  bark: { ch: 'voice', gen: ['bark'] },
  honk: { ch: 'sfx', gen: ['honk'] },
  moo: { ch: 'voice', gen: ['moo'] },
  thud: { ch: 'sfx', gen: ['thud'] },
  checkpoint: { ch: 'sfx', gen: ['checkpoint'] },
  ook: { ch: 'voice', gen: ['ook'] },
  monkeyGone: { ch: 'voice', gen: ['monkeyGone'] },
  coworker: { ch: 'voice', gen: ['coworker'] },
  manager: { ch: 'voice', gen: ['manager'] },
  tick: { ch: 'sfx', gen: ['tick'] },
  pitfall: { ch: 'sfx', gen: ['pitfall'] },
  gameover: { ch: 'sfx', gen: ['gameover'] },
  victory: { ch: 'sfx', gen: ['victory', 'laugh'] },
  beep: { ch: 'sfx', gen: ['beep'] },
  accessOk: { ch: 'sfx', gen: ['accessOk'] },
  dash: { ch: 'sfx', gen: ['dash'] },
  pop: { ch: 'sfx', gen: ['pop'] },
  laser: { ch: 'sfx', gen: ['laser'] },
  scan: { ch: 'sfx', gen: ['scan'] },
  click: { ch: 'sfx', gen: ['click'] },
  bossHit: { ch: 'sfx', gen: ['bossHit'] },
  paper: { ch: 'sfx', gen: ['paper'] },
  ring: { ch: 'sfx', gen: ['ring'] },
  unlock: { ch: 'sfx', gen: ['unlock'] },
  heart: { ch: 'sfx', gen: ['heart'] },
  late: { ch: 'sfx', gen: ['late'] },
  jumpscare: { ch: 'sfx', gen: ['jumpscare'] },
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private voiceGain!: GainNode;
  private musicGain!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private files = new Map<string, AudioBuffer>();
  private music: AudioBufferSourceNode | null = null;
  private musicKind: 'commute' | 'office' | null = null;
  private voiceTimes: number[] = [];
  private duckUntil = 0;
  private lastPlay = new Map<string, number>();
  enabled = load(KEYS.sound) !== 'off';
  private manifestBase = '';

  /** Call once at boot; audio is created lazily on the first user gesture. */
  init(baseUrl: string): void {
    this.manifestBase = baseUrl;
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend'])
      window.addEventListener(ev, unlock, { capture: true });
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.enabled ? AUDIO_MIX.master : 0;
    this.master.connect(c.destination);
    this.sfxGain = c.createGain();
    this.sfxGain.gain.value = AUDIO_MIX.sfx;
    this.sfxGain.connect(this.master);
    this.voiceGain = c.createGain();
    this.voiceGain.gain.value = AUDIO_MIX.voice;
    this.voiceGain.connect(this.master);
    this.musicGain = c.createGain();
    this.musicGain.gain.value = AUDIO_MIX.music;
    this.musicGain.connect(this.master);
    void this.loadFiles();
    if (this.musicKind) this.startMusic(this.musicKind, true);
    return c;
  }

  private async loadFiles(): Promise<void> {
    if (!this.ctx) return;
    try {
      const res = await fetch(`${this.manifestBase}assets/audio/manifest.json`);
      if (!res.ok) return;
      const manifest = (await res.json()) as Record<string, string>;
      const canOgg = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
      await Promise.all(
        Object.entries(manifest).map(async ([event, file]) => {
          try {
            const r = await fetch(`${this.manifestBase}assets/audio/${file}.${canOgg ? 'ogg' : 'mp3'}`);
            if (!r.ok || !this.ctx) return;
            this.files.set(event, await this.ctx.decodeAudioData(await r.arrayBuffer()));
          } catch {
            /* missing or undecodable file: keep the generated sound */
          }
        }),
      );
    } catch {
      /* no manifest: generated sounds only */
    }
  }

  private buffer(key: string): AudioBuffer | null {
    const c = this.ctx;
    if (!c) return null;
    let b = this.buffers.get(key);
    if (!b) {
      const spec = key.startsWith('music:') ? musicSpec(key.slice(6) as 'commute' | 'office') : SOUNDS[key];
      if (!spec) return null;
      const data = render(spec, c.sampleRate);
      b = c.createBuffer(1, data.length, c.sampleRate);
      b.getChannelData(0).set(data);
      this.buffers.set(key, b);
    }
    return b;
  }

  /** Pre-render generated sounds so the first play has no hitch. */
  warm(): void {
    if (!this.ctx) return;
    for (const k of Object.keys(SOUNDS)) this.buffer(k);
  }

  play(ev: SfxEvent, opts: { volume?: number } = {}): void {
    const c = this.ensure();
    if (!c || !this.enabled || c.state !== 'running') return;
    const now = performance.now();
    // Avoid machine-gun repeats of the same sound in the same frame.
    if (now - (this.lastPlay.get(ev) ?? 0) < 40) return;
    this.lastPlay.set(ev, now);
    const m = MAP[ev];
    if (m.ch === 'voice') {
      this.voiceTimes = this.voiceTimes.filter((t) => now - t < AUDIO_MIX.voiceWindowMs);
      if (this.voiceTimes.length >= AUDIO_MIX.maxVoicesPerWindow) return;
      this.voiceTimes.push(now);
    }
    const file = this.files.get(ev);
    const sources = file ? [file] : m.gen.map((g) => this.buffer(g)).filter((b): b is AudioBuffer => !!b);
    let longest = 0;
    for (const b of sources) {
      const src = c.createBufferSource();
      src.buffer = b;
      const g = c.createGain();
      g.gain.value = opts.volume ?? 1;
      src.connect(g).connect(m.ch === 'voice' ? this.voiceGain : this.sfxGain);
      src.start();
      longest = Math.max(longest, b.duration);
    }
    if (m.ch === 'voice') this.duck(longest);
  }

  private duck(seconds: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.duckUntil = Math.max(this.duckUntil, t + seconds);
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setTargetAtTime(AUDIO_MIX.musicDucked, t, 0.03);
    this.musicGain.gain.setTargetAtTime(AUDIO_MIX.music, this.duckUntil, 0.15);
  }

  startMusic(kind: 'commute' | 'office', force = false): void {
    if (this.musicKind === kind && this.music && !force) return;
    this.stopMusic();
    this.musicKind = kind;
    const c = this.ctx;
    if (!c) return;
    const b = this.files.get(`music-${kind}`) ?? this.buffer(`music:${kind}`);
    if (!b) return;
    const src = c.createBufferSource();
    src.buffer = b;
    src.loop = true;
    src.connect(this.musicGain);
    src.start();
    this.music = src;
  }

  stopMusic(): void {
    try {
      this.music?.stop();
    } catch {
      /* already stopped */
    }
    this.music = null;
  }

  /** Pause/resume everything (tab hidden, pause screen). */
  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    save(KEYS.sound, on ? 'on' : 'off');
    if (this.ctx) this.master.gain.setTargetAtTime(on ? AUDIO_MIX.master : 0, this.ctx.currentTime, 0.02);
  }
}

export const audio = new AudioManager();
export const sfx = (ev: SfxEvent, opts?: { volume?: number }): void => audio.play(ev, opts);
