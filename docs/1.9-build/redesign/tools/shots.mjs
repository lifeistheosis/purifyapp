#!/usr/bin/env node
// Stills of the native export, as a phone's shell serves it, with checkMock.
//
//   node shots.mjs <export dir> <out dir> <plan.json> [--check [--looks]] [--scale=2]
//
// plan.json: [{ name, to, set?, width?, height?, lang?, full?, wait?, steps?, selector? }]
//   set     localStorage values before the app starts (a new reader by default: questions done, nothing kept)
//   steps   [{ tap: "css" } | { scroll: y } | { wait: ms } | { eval: "js" }] after arriving
//   full    a still of the whole page as well as the first screen
//   voice   a phone's voice stand-in (scripts/lib/fake-voice.mjs), and the recordings served by the
//           export's own bell, so Listen plays a text in the still (build 98 note 2)
// Run from the repository's root (it imports the repo's own checker).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [dir, outDir, planFile, ...flags] = process.argv.slice(2);
const CHECK = flags.includes("--check");
const SCALE = Number(flags.find((f) => f.startsWith("--scale="))?.split("=")[1] ?? 2);
const repo = process.cwd();
const { checkMock, printMockCheck, PALETTES, LOOKS } = await import(pathToFileURL(path.join(repo, "scripts/mock-check.mjs")));
// --looks: the earned looks too, with the five palettes (as scripts/quote-library-walk.mjs measures them).
const PALS = flags.includes("--looks") ? [...PALETTES, ...LOOKS] : undefined;
const { NATIVE_UA, serveLikeTheShell, go } = await import(pathToFileURL(path.join(repo, "scripts/lib/shell-server.mjs")));
const { fakeVoice } = await import(pathToFileURL(path.join(repo, "scripts/lib/fake-voice.mjs")));
const { createRequire } = await import("node:module");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright");

const OUT = path.resolve(dir);
fs.mkdirSync(outDir, { recursive: true });
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;

for (const shot of plan) {
  const width = shot.width ?? 390;
  const height = shot.height ?? 844;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: SCALE,
    colorScheme: "dark",
    isMobile: width < 700,
    hasTouch: true,
    userAgent: NATIVE_UA,
    reducedMotion: "reduce",
    locale: shot.lang ?? "en-US",
  });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(shot.set ?? {}) });
  if (shot.clock) await ctx.clock.setFixedTime(new Date(shot.clock));
  await serveLikeTheShell(ctx, OUT, {});
  if (shot.voice) {
    await ctx.addInitScript(fakeVoice);
    const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
    await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bell }));
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  try {
    await go(page, shot.to);
    await wait(shot.wait ?? 1800);
    for (const step of shot.steps ?? []) {
      if (step.tap) {
        const box = await page.locator(step.tap).first().boundingBox();
        if (!box) throw new Error(`${step.tap} is not on the screen`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await wait(step.then ?? 900);
      } else if (step.scroll != null) {
        await page.evaluate((y) => window.scrollTo(0, y), step.scroll);
        await wait(500);
      } else if (step.wait) await wait(step.wait);
      else if (step.eval) { await page.evaluate(step.eval); await wait(400); }
    }
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
    if (shot.full) await page.screenshot({ path: path.join(outDir, `${shot.name}-full.png`), fullPage: true });
    if (shot.measure) {
      const m = await page.evaluate(shot.measure);
      console.log(`  ${shot.name} measure: ${JSON.stringify(m)}`);
    }
    if (CHECK && shot.check !== false) {
      const result = await checkMock(page, shot.selector ?? "body", PALS ? { pixels: true, palettes: PALS } : { pixels: true });
      const ok = printMockCheck(result, shot.name);
      if (!ok) failed += 1;
    }
    if (errors.length) console.log(`  ${shot.name} page errors: ${errors.join(" | ")}`);
    console.log(`still ${shot.name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAILED ${shot.name}: ${String(e).slice(0, 300)}`);
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
