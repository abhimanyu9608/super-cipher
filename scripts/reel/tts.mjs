// Offline boss voices for reels: Windows' built-in speech engine (System.Speech) → WAV, then
// ffmpeg gives each boss its character (pitch, speed, effects). Prefers an Indian English voice
// when one is installed (Settings → Time & language → Speech → add "English (India)").
//
//   node scripts/reel/tts.mjs <outDir>   — renders the sample list below and prints durations.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

/** Per-boss character. pitch: frequency factor; tempo: speed factor after pitching; fx: extra ffmpeg filters. */
export const CHARACTERS = {
  monkey: { gender: 'Female', rate: 3, pitch: 1.9, tempo: 1.05, fx: '' },
  manager: { gender: 'Male', rate: 0, pitch: 0.92, tempo: 1.0, fx: '' },
  aunty: { gender: 'Female', rate: 1, pitch: 1.12, tempo: 1.0, fx: 'tremolo=f=7:d=0.18' },
  prodBug: {
    gender: 'Male',
    rate: 1,
    pitch: 0.62,
    tempo: 1.3,
    fx: 'flanger=delay=2:depth=4:speed=3,aecho=0.8:0.7:40:0.45',
  },
  client: { gender: 'Male', rate: 2, pitch: 1.08, tempo: 1.05, fx: '' },
  hr: { gender: 'Female', rate: 3, pitch: 1.18, tempo: 1.05, fx: '' },
  committee: { gender: 'Male', rate: 2, pitch: 0.82, tempo: 1.1, fx: 'aecho=0.8:0.6:60:0.3' },
  ceo: { gender: 'Male', rate: 1, pitch: 0.72, tempo: 1.15, fx: 'aecho=0.8:0.7:90:0.3,bass=g=6' },
};

const PS_SPEAK = `
param([string]$text, [string]$gender, [int]$rate, [string]$out)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$all = $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo }
$pick = $all | Where-Object { $_.Culture.Name -eq 'en-IN' -and $_.Gender -eq $gender } | Select-Object -First 1
if (-not $pick) { $pick = $all | Where-Object { $_.Culture.Name -eq 'en-IN' } | Select-Object -First 1 }
if (-not $pick) { $pick = $all | Where-Object { $_.Gender -eq $gender } | Select-Object -First 1 }
if ($pick) { $s.SelectVoice($pick.Name) }
$s.Rate = $rate
$s.SetOutputToWaveFile($out)
$s.Speak($text)
$s.Dispose()
Write-Output $pick.Name
`;

const atempoChain = (k) => {
  const parts = [];
  while (k > 2) {
    parts.push(2);
    k /= 2;
  }
  while (k < 0.5) {
    parts.push(0.5);
    k /= 0.5;
  }
  parts.push(k);
  return parts.map((p) => `atempo=${p.toFixed(4)}`).join(',');
};

function duration(file) {
  // ffmpeg prints "Duration: 00:00:01.23" on stderr.
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr));
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return 0;
}

/**
 * Render lines to WAV. Each line: { id, say, who }. Returns [{ id, file, dur, voice }].
 */
export function makeVoices(lines, dir) {
  mkdirSync(dir, { recursive: true });
  const ps = join(dir, 'speak.ps1');
  writeFileSync(ps, PS_SPEAK);
  return lines.map(({ id, say, who }) => {
    const ch = CHARACTERS[who];
    if (!ch) throw new Error(`unknown voice ${who}`);
    const raw = join(dir, `${id}.raw.wav`);
    const out = join(dir, `${id}.wav`);
    const voice = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        ps,
        '-text',
        say,
        '-gender',
        ch.gender,
        `-rate:${ch.rate}`,
        '-out',
        raw,
      ],
      { encoding: 'utf8' },
    ).trim();
    const filters = [
      `asetrate=22050*${ch.pitch}`,
      'aresample=44100',
      // Effects before the tempo change (vibrato after atempo produces garbage on some builds).
      ch.fx,
      atempoChain(ch.tempo / ch.pitch),
      'silenceremove=start_periods=1:start_threshold=-45dB',
      'areverse,silenceremove=start_periods=1:start_threshold=-40dB,afade=t=in:d=0.08,areverse',
      'loudnorm=I=-14:TP=-1.5',
      'aresample=44100',
    ].filter(Boolean);
    // SAPI writes 22.05 kHz mono by default; asetrate assumes that.
    execFileSync(FFMPEG, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      raw,
      '-af',
      filters.join(','),
      '-ac',
      '1',
      out,
    ]);
    return { id, file: out, dur: duration(out), voice };
  });
}

/**
 * Mix a music/sfx bed with voice clips placed at given times. Music ducks under the voices.
 * clips: [{ file, at, gain }]
 */
export function mixVoices(bed, clips, out) {
  if (!clips.length) return bed;
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', bed];
  for (const c of clips) args.push('-i', c.file);
  const parts = clips.map((c, i) => {
    const ms = Math.round(c.at * 1000);
    return `[${i + 1}]adelay=${ms}|${ms},volume=${c.gain ?? 1}[v${i}]`;
  });
  const vox = clips.map((_, i) => `[v${i}]`).join('');
  const graph = [
    ...parts,
    `${vox}amix=inputs=${clips.length}:duration=longest,volume=${clips.length},apad,asplit[vs][vm]`,
    `[0][vs]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck]`,
    `[duck][vm]amix=inputs=2:duration=first,volume=2,alimiter=limit=0.95[aout]`,
  ].join(';');
  args.push('-filter_complex', graph, '-map', '[aout]', '-ar', '44100', out);
  execFileSync(FFMPEG, args);
  return out;
}

// CLI: render the sample lines to check how they sound.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
) {
  const dir = resolve(process.argv[2] ?? 'tts-out');
  const sample = Object.keys(CHARACTERS).map((who) => ({
    id: who,
    say: 'Ek quick call? Deadline kal hai!',
    who,
  }));
  for (const r of makeVoices(sample, dir)) console.log(r.id, r.dur.toFixed(2), r.voice, existsSync(r.file));
}
