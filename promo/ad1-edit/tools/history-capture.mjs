// Full-page capture of the real /history timeline at phone size, every card painted.
//   node history-capture.mjs http://127.0.0.1:3000/history <outdir>
// Cards are `content-visibility: auto` (app/globals.css .history-cv), which a full-page
// screenshot does not paint, so the capture forces them visible first.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.addStyleTag({ content: '.history-cv,.cv-card{content-visibility:visible!important;contain-intrinsic-size:auto!important} nextjs-portal{display:none!important}' });
await page.waitForTimeout(1500);
const heads = await page.evaluate(() => Array.from(document.querySelectorAll('h2,h3')).map(e => ({ t: e.textContent.trim().slice(0, 60), y: Math.round(e.getBoundingClientRect().top + window.scrollY), tag: e.tagName })));
fs.writeFileSync(`${out}/headings.json`, JSON.stringify(heads, null, 1));
await page.screenshot({ path: `${out}/history_full.png`, fullPage: true });
await browser.close();
