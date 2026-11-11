/**
 * Boss voice lines.
 *
 * Every boss line is spoken with the browser's built-in text-to-speech (Web Speech API), using
 * the device's own voices — so nothing is shipped and there is no licence risk. Each boss has a
 * voice "character" (pitch + speed). An Indian-English voice is preferred because it reads
 * Hinglish written in Latin script most naturally. The popup text always shows as well.
 *
 * Owner recordings win: if public/assets/audio/manifest.json maps "voice-<stringKey>" to a file
 * (e.g. { "voice-quickCall": "manager-quick-call" }), that recording plays instead of speech.
 * With no speech engine and no recording, the old 8-bit blip plays.
 */
import { audio, sfx, type SfxEvent } from './sfx';
import { t, getLang, type StringKey } from '../i18n/strings';

export type VoiceId = 'monkey' | 'manager' | 'aunty' | 'prodBug' | 'client' | 'hr' | 'committee' | 'ceo';

export interface VoiceStyle {
  /** 0..2 (1 = normal). */
  pitch: number;
  /** 0.1..10 (1 = normal). */
  rate: number;
  /** 8-bit sound used when speech is not available. */
  blip: SfxEvent;
}

export const VOICES: Record<VoiceId, VoiceStyle> = {
  monkey: { pitch: 2, rate: 1.35, blip: 'ook' },
  manager: { pitch: 0.7, rate: 0.95, blip: 'manager' },
  aunty: { pitch: 1.45, rate: 1.05, blip: 'manager' },
  prodBug: { pitch: 0.1, rate: 0.75, blip: 'manager' },
  client: { pitch: 1.15, rate: 1.15, blip: 'manager' },
  hr: { pitch: 1.7, rate: 1.2, blip: 'manager' },
  committee: { pitch: 0.55, rate: 0.85, blip: 'manager' },
  ceo: { pitch: 0.4, rate: 0.88, blip: 'manager' },
};

/** Max lines spoken per window, so bosses never talk over the whole game. */
export const VOICE_LIMIT = { lines: 2, windowMs: 4000 };

/** Short all-caps words the speech engine should spell out; other shouty words are read normally. */
const ACRONYMS = new Set(['CTO', 'CEO', 'HR', 'PIP', 'OK', 'ID', 'EMI', 'KPI', 'QA', 'PPT']);

/**
 * Turn a popup line into something speakable: no emoji or symbols (engines read them out as
 * "fire", "crown"...), no "+300" score tags, and SHOUTED words lower-cased so they are read as
 * words instead of being spelled letter by letter.
 */
export function speakable(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, '')
    .replace(/[+-]\d+/g, '')
    .replace(/[★✓➜→←•·…_#]/g, ' ')
    .replace(/\b[A-Z]{2,}\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pick the best available voice: Indian English, then Hindi, then any English. */
export function pickVoice<T extends { lang: string }>(voices: T[]): T | null {
  const by = (re: RegExp) => voices.find((v) => re.test(v.lang)) ?? null;
  return by(/^en[-_]IN/i) ?? by(/^hi[-_]IN/i) ?? by(/^en[-_](GB|US)/i) ?? by(/^en/i) ?? voices[0] ?? null;
}

/** Pure throttle: returns the kept timestamps and whether a new line may play now. */
export function allowLine(times: number[], now: number): { ok: boolean; times: number[] } {
  const recent = times.filter((x) => now - x < VOICE_LIMIT.windowMs);
  if (recent.length >= VOICE_LIMIT.lines) return { ok: false, times: recent };
  return { ok: true, times: [...recent, now] };
}

/** Map a texture/boss id to its voice (unknown ids get the manager's). */
export const voiceFor = (id: string): VoiceId => (id in VOICES ? (id as VoiceId) : 'manager');

class VoiceManager {
  private times: number[] = [];
  private voice: SpeechSynthesisVoice | null = null;

  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  /** Call once at boot. Voices load asynchronously on most browsers. */
  init(): void {
    const s = this.synth;
    if (!s) return;
    const load = () => {
      this.voice = pickVoice(s.getVoices());
    };
    load();
    s.addEventListener?.('voiceschanged', load);
  }

  /** Speak a boss line (by string key) in that boss's voice. */
  say(key: StringKey, who: VoiceId): void {
    const style = VOICES[who];
    if (!audio.enabled) return;
    const gate = allowLine(this.times, performance.now());
    this.times = gate.times;
    if (!gate.ok) return;
    if (audio.playNamed(`voice-${key}`)) return;
    const s = this.synth;
    const text = speakable(t(key));
    if (!s || !text) {
      sfx(style.blip);
      return;
    }
    // Keep at most one line waiting behind the current one.
    if (s.pending) s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? (getLang() === 'hi' ? 'en-IN' : 'en-US');
    u.pitch = style.pitch;
    u.rate = style.rate;
    u.volume = 1;
    u.onstart = () => audio.duckFor(Math.min(4, 0.4 + text.length * 0.07));
    s.speak(u);
  }

  stop(): void {
    this.synth?.cancel();
  }
}

export const voice = new VoiceManager();
