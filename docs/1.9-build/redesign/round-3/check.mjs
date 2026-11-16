// The round's page, as the artifact's skeleton wraps it, held to checkMock at four widths.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const repo = process.cwd();
const dir = process.argv[2];
const { checkMock, printMockCheck } = await import(pathToFileURL(path.join(repo, "scripts/mock-check.mjs")));
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright");
const html = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0}img{max-width:100%}</style></head><body>${fs.readFileSync(path.join(dir, "index.html"), "utf8")}</body></html>`;
fs.writeFileSync(path.join(dir, "_wrapped.html"), html);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let bad = 0;
for (const width of [360, 390, 412, 1032]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(dir, "_wrapped.html")).href);
  await page.waitForTimeout(600);
  const spill = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (spill > 0) { bad++; console.log(`  NO   sideways scroll at ${width}: ${spill}px`); }
  const result = await checkMock(page, "body");
  if (!printMockCheck(result, `page at ${width}`)) bad++;
  if (width === 390) await page.screenshot({ path: path.join(dir, "_page-390.png"), fullPage: true });
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
