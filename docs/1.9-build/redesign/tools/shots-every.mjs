// Round 1's shots tool (docs/1.9-build/redesign/tools/shots.mjs), with the looks:
// a plan line's `every: true` wears EVERY (the five, the two earned, the fifteen
// looks); otherwise WORN. --jobs=N runs N stills at once. Run from the repo root.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const [dir, outDir, planFile, ...flags] = process.argv.slice(2);
const JOBS = Number(flags.find((f) => f.startsWith("--jobs="))?.split("=")[1] ?? 3);
const repo = process.cwd();
const { checkMock, printMockCheck, EVERY, WORN } = await import(pathToFileURL(path.join(repo, "scripts/mock-check.mjs")));
const { NATIVE_UA, serveLikeTheShell, go } = await import(pathToFileURL(path.join(repo, "scripts/lib/shell-server.mjs")));
const { createRequire } = await import("node:module");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright");
const OUT = path.resolve(dir);
fs.mkdirSync(outDir, { recursive: true });
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failedNames = [];
async function run(shot) {
  const width = shot.width ?? 390;
  const height = shot.height ?? 844;
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true,
    userAgent: NATIVE_UA, reducedMotion: "reduce", locale: shot.lang ?? "en-US",
  });
  await ctx.addInitScript((values) => { for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(shot.set ?? {}) });
  if (shot.clock) await ctx.clock.setFixedTime(new Date(shot.clock));
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    await go(page, shot.to);
    await wait(shot.wait ?? 2500);
    for (const step of shot.steps ?? []) {
      if (step.tap) {
        const box = await page.locator(step.tap).first().boundingBox();
        if (!box) throw new Error(`${step.tap} is not on the screen`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await wait(step.then ?? 900);
      } else if (step.scroll != null) { await page.evaluate((y) => window.scrollTo(0, y), step.scroll); await wait(500); }
      else if (step.wait) await wait(step.wait);
      else if (step.eval) { await page.evaluate(step.eval); await wait(400); }
    }
    if (shot.expect) {
      const ok = await page.evaluate((sel) => !!document.querySelector(sel), shot.expect);
      if (!ok) throw new Error(`expected ${shot.expect} on the screen`);
    }
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
    const result = await checkMock(page, shot.selector ?? "body", { pixels: true, palettes: shot.every ? EVERY : WORN });
    const ok = printMockCheck(result, shot.name);
    if (!ok) failedNames.push(shot.name);
    if (errors.length) console.log(`  ${shot.name} page errors: ${errors.join(" | ")}`);
    console.log(`still ${shot.name} ${ok ? "PASS" : "FAIL"} ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (e) {
    failedNames.push(shot.name);
    console.log(`FAILED ${shot.name}: ${String(e).slice(0, 300)}`);
  }
  await ctx.close();
}
const queue = [...plan];
await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) await run(queue.shift()); }));
await browser.close();
console.log(`DONE ${plan.length - failedNames.length}/${plan.length} passed${failedNames.length ? `; failed: ${failedNames.join(", ")}` : ""}`);
process.exit(failedNames.length ? 1 : 0);
