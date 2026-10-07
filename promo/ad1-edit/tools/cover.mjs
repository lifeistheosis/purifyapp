// Writes the TikTok cover (the hook in the middle of the frame).  node cover.mjs <url> <out.png>
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.READY || window.LOAD_ERROR, null, { timeout: 60000 });
const b64 = await page.evaluate(() => { window.renderCover(); return document.getElementById('c').toDataURL('image/png').slice(22); });
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
await browser.close();
