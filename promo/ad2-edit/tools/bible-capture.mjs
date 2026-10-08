// Captures the app's /bible page at iPad size, for the tablet in the fix scene.
//   node bible-capture.mjs http://127.0.0.1:3000/bible work/ui
// Writes tablet_full.png and tablet_pos.json (where each book's tile sits, in CSS px).
// At phone width the page did not hydrate in dev on 2026-10-08; at 820 px the grid is native.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
await page.waitForTimeout(1500);
const pos = await page.evaluate(() => {
  const r = {};
  const ot = document.getElementById('ot'); if (ot) r.ot = Math.round(ot.getBoundingClientRect().top + window.scrollY);
  const names = /^(Genesis|1 Esdras|Tobit|Judith|1 Maccabees|2 Maccabees|3 Maccabees|Psalms|Wisdom of Solomon|Sirach|Baruch|Epistle of Jeremiah|Prayer of Manasseh|2 Esdras|Matthew)/;
  for (const a of document.querySelectorAll('a')) {
    const m = (a.textContent || '').trim().replace(/\s+/g, ' ').match(names), b = a.getBoundingClientRect();
    if (m && b.height > 0 && !(m[1] in r)) r[m[1]] = [Math.round(b.left), Math.round(b.top + window.scrollY), Math.round(b.width), Math.round(b.height)];
  }
  return r;
});
fs.writeFileSync(`${out}/tablet_pos.json`, JSON.stringify(pos, null, 1));
await page.screenshot({ path: `${out}/tablet_full.png`, fullPage: true });
await browser.close();
