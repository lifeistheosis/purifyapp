// The gate's motion check (the arbiter, 2026-11-13: "Every walk runs as a reader
// sees it, with motion on. A second, shorter pass checks the reduced-motion
// path. Find where the walks turn motion off today, and say so.").
//
// Where they turned it off, as found on 2026-11-13:
//   - checkMock (scripts/mock-check.mjs, the still before its measure) sets
//     transition: none and turns off entrances driven by the scroll on every
//     element while it reads a screen's colours, and puts them back after. The
//     guardrail walk (part 2), the stripe walk, the sheet looks and the tap
//     walk's sheet measure all read their screens through it: a screen at rest,
//     on purpose, which is why none of them ever saw a transition.
//   - The words-on-pictures pass, the painted-ground check and the pixel audit
//     still transitions the same way while they read pixels.
//   - Eight feature walks (asked-again, faith-answers, learn, legal-sheet,
//     plus-intro, plus-order, questions-top, reminders) ask the browser for
//     reduced motion. On a phone the app's own switch ignores that question
//     (lib/ui/motionPreference.ts), but the parts that read it directly
//     (lib/ui/motion.ts osPrefersReducedMotion: the selection tools, the
//     skeletons, the gift box, the prayer slideshow) go still there.
//   - export-walk.mjs sets purify.motion off for ten of its walks, on purpose
//     (each a check of the still path).
//   - No walk pinned the app's motion at all: the app samples its own frames
//     four seconds after it opens and goes still on a phone it judges slow
//     (lib/ui/deviceSpeed.ts). On a busy container the walks' phone could be
//     judged slow, and walked still without a word (this self-test plants it).
//
// From now on a walk pins it (scripts/lib/motion.mjs, pinMotion) and asserts it
// on every screen (assertMotion): the tap walk, the guardrail walk, the stripe
// walk, the gate's probes and the motion walk (scripts/motion-walk.mjs), whose
// --reduced pass is the shorter walk down the still path.
//
//   node scripts/gate/motion.mjs --self-test [out dir]
//
// proves it on the export: a phone left to judge itself while its frames are
// slow goes still and fails the assertion (the race that was there); the pin
// holds through the same slow frames; a measure's stilling left behind fails;
// a phone pinned to the still path is still and passes the reduced pass, and
// fails a walk that asked for motion.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertMotion, motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

/** Frames slowed to 40ms each for four seconds, from 3.5s after the page opened: a busy machine, as the app's sampling sees it. */
function slowFrames() {
  const until = performance.now() + 4500;
  const step = () => {
    const t = performance.now();
    while (performance.now() - t < 40) {}
    if (performance.now() < until) requestAnimationFrame(step);
  };
  setTimeout(() => requestAnimationFrame(step), 0);
}

async function selfTest(out) {
  const { chromium } = await import("playwright");
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  const phone = async (mode, { unpinned = false } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
      } catch {}
    });
    if (!unpinned) await pinMotion(ctx, mode);
    await serveLikeTheShell(ctx, out, {});
    const page = await ctx.newPage();
    await go(page, "/", { timeout: 60000 });
    return { ctx, page };
  };
  const cases = [];
  const say = (name, ok, detail) => {
    cases.push(ok);
    console.log(`  ${ok ? "ok    " : "MISSED"} ${name}: ${detail}`);
  };
  try {
    // The race that was there: no pin, and frames slow when the app samples them.
    {
      const { ctx, page } = await phone("on", { unpinned: true });
      await page.waitForTimeout(3000);
      await page.evaluate(slowFrames);
      await page.waitForTimeout(6500);
      const wrong = await assertMotion(page, "on");
      const verdict = await page.evaluate(() => localStorage.getItem("purify.motion.device"));
      say("a phone left to judge itself while its frames are slow", Boolean(wrong) && verdict === "slow", wrong ? `the app judged it ${verdict}, and the walk says so: ${wrong}` : `the app judged it ${verdict} and the walk saw nothing`);
      await ctx.close();
    }
    // The pin holds through the same slow frames.
    {
      const { ctx, page } = await phone("on");
      await page.waitForTimeout(3000);
      await page.evaluate(slowFrames);
      await page.waitForTimeout(6500);
      const wrong = await assertMotion(page, "on");
      say("a phone pinned to motion, through the same slow frames", !wrong, wrong ?? "the app's motion stayed on (data-motion=full)");
      // A measure's stilling, left behind.
      await page.evaluate(() => {
        const s = document.createElement("style");
        s.setAttribute("data-mock-check", "");
        s.textContent = "*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }";
        document.head.appendChild(s);
      });
      const left = await assertMotion(page, "on");
      say("a measure's stilling left behind on the page", Boolean(left), left ?? "nothing was said");
      await ctx.close();
    }
    // The still path.
    {
      const { ctx, page } = await phone("reduce");
      await page.waitForTimeout(1500);
      const wrong = await assertMotion(page, "reduce");
      const asOn = await assertMotion(page, "on");
      say("a phone pinned to the still path, walked by the reduced pass", !wrong, wrong ?? "still (data-motion=reduce), and the browser asks for less motion");
      say("the same phone, walked by a walk that asked for motion", Boolean(asOn), asOn ?? "nothing was said");
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  const ok = cases.every(Boolean);
  console.log(ok ? "\nself-test: the motion pin holds, and a walk that is not walking the motion it asked for says so" : "\nself-test FAILED");
  return ok;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.includes("--self-test")) {
    console.log("node scripts/gate/motion.mjs --self-test [out dir]");
    process.exit(2);
  }
  const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out");
  if (!fs.existsSync(path.join(out, "index.html"))) throw new Error(`no native export in ${out}: run npm run build:android first`);
  process.exit((await selfTest(out)) ? 0 : 1);
}
