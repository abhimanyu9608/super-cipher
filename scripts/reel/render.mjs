// Export the 20 s Instagram reel as an MP4 (1080x1920, 30 fps, H.264 + AAC).
//
// Needs: the dev server running (npm run dev), a Chromium browser, ffmpeg, and puppeteer-core.
//   TOOLS=<folder with node_modules/puppeteer-core>  FFMPEG=<path to ffmpeg>  BROWSER=<path to chrome/msedge>
//   node scripts/reel/render.mjs [out.mp4]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(resolve(process.env.TOOLS ?? '.', 'package.json'));
const puppeteer = require('puppeteer-core');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const BROWSER = process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = process.env.REEL_URL ?? 'http://localhost:5173/super-cipher/scripts/reel/reel.html?t=0';
const out = resolve(process.argv[2] ?? 'super-cipher-reel.mp4');

const browser = await puppeteer.launch({
  executablePath: BROWSER,
  headless: true,
  args: ['--hide-scrollbars', '--mute-audio'],
  defaultViewport: { width: 540, height: 960 },
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.title === 'ready', { timeout: 60000 });
const { duration, fps } = await page.evaluate(() => ({
  duration: window.reel.duration,
  fps: window.reel.fps,
}));
const total = Math.round(duration * fps);

// Soundtrack rendered by the game's own synth.
const dir = mkdtempSync(join(tmpdir(), 'reel-'));
const wav = join(dir, 'audio.wav');
writeFileSync(wav, Buffer.from(await page.evaluate(() => window.reel.audio()), 'base64'));

const ff = spawn(
  FFMPEG,
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-framerate',
    String(fps),
    '-c:v',
    'mjpeg',
    '-i',
    '-',
    '-i',
    wav,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-preset',
    'slow',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-g',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '44100',
    '-shortest',
    '-movflags',
    '+faststart',
    out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const done = new Promise((res, rej) =>
  ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))),
);

for (let i = 0; i < total; i++) {
  const url = await page.evaluate((n) => window.reel.frame(n, 0.95), i);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`frame ${i}/${total}\n`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`wrote ${out}`);
