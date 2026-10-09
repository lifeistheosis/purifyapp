// Renders the composition frame by frame through headless Chromium.
//   node capture.mjs <url> <outdir> test 0.4,1.1,4.75        (stills at given seconds)
//   node capture.mjs <url> <outdir> full 30 13.766 [from] [to] (every frame)
// Set PW_CHROMIUM to a Chromium binary if Playwright's own build is not installed.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out, mode, a, b, c, d] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 400)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.READY || window.LOAD_ERROR, null, { timeout: 60000 });
const err = await page.evaluate(() => window.LOAD_ERROR);
if (err) { console.log('LOAD_ERROR', err); process.exit(2); }
const grab = async (t, file) => {
  const b64 = await page.evaluate(tt => { window.renderFrame(tt); return document.getElementById('c').toDataURL('image/png').slice(22); }, t);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
};
const t0 = Date.now();
if (mode === 'test') {
  for (const s of a.split(',')) { const t = parseFloat(s); await grab(t, `${out}/t_${t.toFixed(3)}.png`); }
} else {
  const fps = parseFloat(a), dur = parseFloat(b), n = Math.round(fps * dur);
  const from = c ? parseInt(c, 10) : 0, to = d ? parseInt(d, 10) : n - 1;
  for (let f = from; f <= to; f++) {
    // sample 3/4 into each frame, so a hit inside a frame's display interval shows on that frame
    // (the picture leads the sound by at most 25 ms, never trails it)
    await grab((f + 0.75) / fps, `${out}/f_${String(f).padStart(4, '0')}.png`);
    if (f % 30 === 0) console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
console.log('done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();
