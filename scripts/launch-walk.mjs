// The opening hands off to the first screen cleanly (build 95 note 8). His
// word, 2026-11-13, on build 96, with a screenshot of the opening: "the
// animation is buggy". Filmed on that build's export, the cross and the
// horizon stayed drawn over Today for about a third of a second as the night
// faded, smearing as the whole stage was blurred.
// lib/platform/__tests__/launchHandOff.test.ts models it from the stylesheet;
// this watches the built app do it, every frame, from the first paint until
// the first screen stands.
//
//   npm run build:android                  (writes out/)
//   node scripts/launch-walk.mjs           the walk
//   node scripts/launch-walk.mjs --self-test
//                                           proves it: with build 96's lift
//                                           put back, it must fail
//
// At 390 on the day's first open and 412 on a later one, motion on, at the
// phone's speed and with the CPU slowed four times (a battery saver):
//   - in no frame are the cross and the horizon (the stage) and the first
//     screen under the night both seen at more than a tenth of their ink;
//   - the stage is never drawn through a filter (no blur, no glow growing);
//   - the first screen stands, the cover out of the page, within the pace's
//     own time and the lift's.
// And with Purify's motion off: the cover goes at once.
//
// Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, serveLikeTheShell } from "./lib/shell-server.mjs";

const SELF_TEST = process.argv.includes("--self-test");
const OUT = path.resolve("out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
const OWN = "/opt/pw-browsers/chromium";
/** Seen: at more than this share of its ink. */
const SEEN = 0.1;
/** Build 96's lift, for the self-test: the stage on an ease-in with a blur, the night evenly. */
const OLD_LIFT = `
[data-launch-frame] { transition: opacity 580ms cubic-bezier(0.4, 0, 0.6, 1) 20ms, visibility 0s linear 600ms !important; }
[data-launch-stage] { transition: opacity 600ms cubic-bezier(0.5, 0, 0.9, 0.5), transform 600ms cubic-bezier(0.5, 0, 0.9, 0.5), filter 600ms cubic-bezier(0.5, 0, 0.9, 0.5) !important; }
html[data-launch="ready"][data-intro="played"] [data-launch-stage] { filter: blur(6px) !important; }`;

let failed = 0;
let passed = 0;
const say = (ok, name, detail) => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function opening(browser, { width, height, pace, rate = 1, set = {}, broken = null }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, reducedMotion: "no-preference" });
  await ctx.addInitScript(
    ({ pace, set, broken }) => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("purify.motion.device", "ok");
        for (const [k, v] of Object.entries(set)) localStorage.setItem(k, v);
        const t = new Date(), m = t.getMonth() + 1, n = t.getDate();
        const day = `${t.getFullYear()}-${m < 10 ? "0" : ""}${m}-${n < 10 ? "0" : ""}${n}`;
        if (pace === "quick") localStorage.setItem("purify.intro.day", day);
        else localStorage.removeItem("purify.intro.day");
      } catch {}
      if (broken) document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = broken;
        document.head.appendChild(s);
      });
      const frames = (window.__launch = []);
      const tick = () => {
        const frame = document.querySelector("[data-launch-frame]");
        const stage = document.querySelector("[data-launch-stage]");
        const h = document.documentElement;
        // Gone means gone after it was there: before the cover is parsed there is none yet.
        window.__hadCover = window.__hadCover || !!frame;
        frames.push({
          t: performance.now(),
          lifting: h.getAttribute("data-launch") === "ready" && h.getAttribute("data-intro") === "played",
          night: frame ? Number(getComputedStyle(frame).opacity) : 0,
          gone: window.__hadCover && (!frame || getComputedStyle(frame).visibility === "hidden"),
          stage: stage ? Number(getComputedStyle(stage).opacity) : 0,
          filter: stage ? getComputedStyle(stage).filter : "none",
          screen: !!document.querySelector("[data-route-content]"),
        });
        if (frames.length < 1500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { pace, set, broken },
  );
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  if (rate > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto("https://localhost/", { waitUntil: "commit", timeout: 120000 });
  await page.waitForFunction(() => window.__launch?.some((f) => f.gone), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const frames = await page.evaluate(() => window.__launch ?? []);
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  await ctx.close();
  return { frames, motion };
}

async function walk(browser, run, broken = null) {
  const label = `${run.width}px, ${run.pace === "slow" ? "the day's first open" : "a later open"}${run.rate > 1 ? `, the CPU slowed ${run.rate} times` : ""}`;
  const { frames, motion } = await opening(browser, { ...run, broken });
  if (motion !== "full") {
    say(false, `${label}: Purify's motion is on`, `it was "${motion}"`);
    return;
  }
  const from = frames.findIndex((f) => f.lifting);
  const lift = from < 0 ? [] : frames.slice(from);
  let worst = null;
  for (const f of lift) {
    const both = Math.min(f.stage, 1 - f.night);
    if (f.screen && both > SEEN && (!worst || both > worst.both)) worst = { ...f, both };
  }
  say(from >= 0 && !worst, `${label}: the cross and the horizon are gone before the first screen shows`, from < 0 ? "it never lifted" : worst ? `at +${Math.round(worst.t - frames[from].t)}ms of the lift the stage at ${worst.stage.toFixed(2)} over the first screen at ${(1 - worst.night).toFixed(2)}` : `${lift.length} frames of the lift, never both seen`);
  const filtered = frames.filter((f) => f.filter && f.filter !== "none");
  say(filtered.length === 0, `${label}: the stage is never drawn through a filter`, filtered.length ? `${filtered.length} frames, e.g. ${filtered.at(-1).filter}` : `${frames.length} frames`);
  const gone = frames.find((f) => f.gone);
  const limit = (run.pace === "slow" ? 2400 : 900) + (run.pace === "slow" ? 600 : 360) + (run.rate > 1 ? 2000 : 600);
  say(Boolean(gone) && gone.screen && gone.t <= limit, `${label}: the first screen stands, the cover out of the page`, gone ? `at ${Math.round(gone.t)}ms of the document${gone.screen ? "" : ", with no screen under it"}` : "the cover never went");
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
try {
  if (SELF_TEST) {
    const before = { failed, passed };
    console.log("-- broken on purpose: build 96's lift");
    await walk(browser, { width: 390, height: 844, pace: "slow", rate: 1 }, OLD_LIFT);
    const caught = failed - before.failed;
    failed = before.failed;
    passed = before.passed;
    console.log("");
    say(caught >= 2, "self-test: with build 96's lift put back, the walk fails the cross over the first screen and the blur", `${caught} fails`);
  } else {
    for (const run of [
      { width: 390, height: 844, pace: "slow", rate: 1 },
      { width: 390, height: 844, pace: "slow", rate: 4 },
      { width: 412, height: 915, pace: "quick", rate: 1 },
      { width: 412, height: 915, pace: "quick", rate: 4 },
    ]) await walk(browser, run);
    // Purify's motion off: the cover goes at once, the night and the stage together.
    const { frames, motion } = await opening(browser, { width: 390, height: 844, pace: "slow", set: { "purify.motion": "off" } });
    const from = frames.findIndex((f) => f.lifting);
    const part = from < 0 ? [] : frames.slice(from, from + 6).filter((f) => !f.gone && f.night > 0.01 && f.night < 0.99);
    say(motion === "reduce" && from >= 0 && part.length === 0, "with Purify's motion off, the cover goes at once", motion !== "reduce" ? `motion was "${motion}"` : `${part.length} frames part seen`);
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not`);
process.exit(failed ? 1 : 0);
