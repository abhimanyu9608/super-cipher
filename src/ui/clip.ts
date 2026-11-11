/**
 * Records the boss fight (canvas video + game audio) so players can save and share a clip.
 * Starts when a boss appears, stops at Level Clear (kept) or Game Over / restart (thrown away).
 * Capped at 45 s. Uses MP4 where the browser can record it, otherwise WebM.
 */
import { bus } from '../game/events';
import { audio } from '../audio/sfx';

const MAX_MS = 45_000;
let recorder: MediaRecorder | null = null;
const keepers = new WeakSet<MediaRecorder>();
let timer = 0;
let clip: { url: string; ext: string } | null = null;

function pickType(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const options = [
    { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  return options.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null;
}

function start(): void {
  stop(false);
  const type = pickType();
  const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
  if (!type || !canvas || typeof canvas.captureStream !== 'function') return;
  try {
    const stream = canvas.captureStream(30);
    audio
      .stream()
      ?.getAudioTracks()
      .forEach((tr) => stream.addTrack(tr));
    // Each recording owns its data, so a late stop event can't mix two recordings.
    const data: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 4_000_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size) data.push(e.data);
    };
    rec.onstop = () => {
      if (keepers.has(rec) && data.length) {
        if (clip) URL.revokeObjectURL(clip.url);
        clip = { url: URL.createObjectURL(new Blob(data, { type: type.mime })), ext: type.ext };
        window.dispatchEvent(new CustomEvent('sc-clip-ready'));
      }
      keepers.delete(rec);
      if (recorder === rec) recorder = null;
    };
    recorder = rec;
    rec.start(1000);
    timer = window.setTimeout(() => stop(true), MAX_MS);
  } catch {
    recorder = null;
  }
}

function stop(keep: boolean): void {
  window.clearTimeout(timer);
  if (!recorder || recorder.state === 'inactive') return;
  if (keep) keepers.add(recorder);
  recorder.stop();
}

export function initClip(): void {
  bus.on('bossStart', () => {
    if (clip) {
      URL.revokeObjectURL(clip.url);
      clip = null;
    }
    start();
  });
  // Keep a little of the victory moment before stopping.
  bus.on('levelClear', () => window.setTimeout(() => stop(true), 300));
  bus.on('gameOver', () => stop(false));
  bus.on('levelReady', () => stop(false));
}

/** The last recorded boss clip, if any. */
export const currentClip = (): { url: string; ext: string } | null => clip;
