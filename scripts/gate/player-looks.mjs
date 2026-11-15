// The player's three surfaces held to checkMock with pixels (build 98 notes 14 and 8, Updates 98e):
// the reader's dock on John 10, the mini player over Prayers and Now Playing open, each at 390, 800
// and 1032, on the five palettes, the two earned and every look, in English and in Arabic. The track is
// John 10 from the Bible's own Listen, its recording the export's bell (as scripts/motion-walk.mjs
// --loaded track serves it), so nothing is asked of the network. Each surface is reached as a reader
// reaches it: Listen on the chapter's pill, the Prayers tab, the mini player's own open button.
//
//   node scripts/gate/export.mjs, then: node scripts/gate/player-looks.mjs [shots dir]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { EVERY, checkMock } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, checkSells } from "../lib/sells-plus.mjs";

const OUT = path.resolve("out");
const SHOTS = process.argv[2] ?? null;
const SIZES = [[390, 844], [800, 1280], [1032, 1366]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
checkSells(OUT);
const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ ...(fs.existsSync(own) ? { executablePath: own } : {}), args: ["--autoplay-policy=no-user-gesture-required"] });
let failed = 0;

async function open(lang, [width, height]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "no-preference", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA, ...(lang !== "en" ? { locale: lang } : {}) });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bell }));
  return { ctx, page: await ctx.newPage() };
}

/** Taps the first element `find` (run in the page) returns, at its centre, as a finger does. */
async function tap(page, find, what) {
  for (let i = 0; i < 60; i++) {
    const box = await page.evaluate(find);
    if (box) return page.touchscreen.tap(box.x, box.y);
    await sleep(250);
  }
  throw new Error(`no ${what}`);
}
const centreOf = (js) => `(() => { const el = ${js}; const r = el?.getBoundingClientRect(); return r && r.height > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;

async function guard(page, sel, label, lang, size) {
  const result = await checkMock(page, sel, { palettes: EVERY, pixels: true });
  const n = result.failures.length;
  if (n) {
    failed += 1;
    console.log(`  FAIL checkMock ${label} at ${size[0]} in ${lang}: ${n} failure(s)`);
    for (const f of result.failures.slice(0, 10)) console.log(`      ${f.check} on ${f.palette}: ${f.what} ${f.detail ?? ""}`);
  } else console.log(`  ok   checkMock ${label} at ${size[0]} in ${lang}: passes on ${EVERY.length} palettes and looks`);
  for (const a of result.allowed ?? []) console.log(`      allowed: ${a}`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label.replace(/\W+/g, "-")}-${size[0]}-${lang}.png`) });
}

if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
for (const lang of ["en", "ar"]) {
  for (const size of SIZES) {
    const { ctx, page } = await open(lang, size);
    try {
      await go(page, "/bible/john/10/", { timeout: 60000 });
      await sleep(1500);
      // Listen: the last of the chapter pill's buttons.
      await tap(page, centreOf(`[...document.querySelectorAll("[data-reader-pill] button")].pop()`), "Listen on the chapter's pill");
      await sleep(2000);
      await guard(page, "[data-reader-dock]", "the reader's dock", lang, size);
      await tap(page, centreOf(`document.querySelectorAll("[data-tab-bar] a")[3]`), "Prayers tab");
      await sleep(2000);
      await guard(page, "[data-mini-player]", "the mini player", lang, size);
      await tap(page, centreOf(`document.querySelector("[data-mini-player] .mini-player-card button")`), "mini player's open button");
      await sleep(1800);
      const up = await page.evaluate(() => Boolean(document.querySelector("[data-now-playing][role='dialog']")));
      if (!up) {
        failed += 1;
        console.log(`  FAIL Now Playing did not open at ${size[0]} in ${lang}`);
      } else await guard(page, "[data-now-playing]", "Now Playing", lang, size);
    } catch (e) {
      failed += 1;
      console.log(`  FAIL at ${size[0]} in ${lang}: ${e.message}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(failed ? `\n${failed} failure(s)` : "\nall passed");
process.exit(failed ? 1 : 0);
