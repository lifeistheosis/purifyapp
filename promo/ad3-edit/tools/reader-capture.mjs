// The reader as a phone shows it, for the phone in the fix scene.
//   node tools/reader-capture.mjs http://127.0.0.1:3000/saints/ignatius-of-antioch/epistle-to-the-romans work/ui
// Writes reader_page.png (the whole page, floating controls removed), reader_scrolled_view.png
// (one screen scrolled down, for the sticky top bar) and reader_pos.json (where the quote sits).
// If dynamic pages 404 in dev, the dev cache is stale: stop the server, rm -rf .next/dev, start again.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 240000 });
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, 3480));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/reader_scrolled_view.png` });
await page.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') el.style.setProperty('display', 'none', 'important');
    if (cs.position === 'sticky') el.style.setProperty('position', 'relative', 'important');
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/reader_page.png`, fullPage: true });
const q = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const i = n.textContent.indexOf('I am the wheat of God');
    if (i < 0) continue;
    const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, n.textContent.indexOf('bread of Christ.', i) + 'bread of Christ.'.length);
    const r1 = b => Math.round(b * 10) / 10;
    return { rects: Array.from(rg.getClientRects()).map(b => [r1(b.left), r1(b.top + window.scrollY), r1(b.width), r1(b.height)]), height: document.documentElement.scrollHeight };
  }
  return null;
});
fs.writeFileSync(`${out}/reader_pos.json`, JSON.stringify(q, null, 1));
console.log(JSON.stringify(q));
await browser.close();
