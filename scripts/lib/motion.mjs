// The app's motion, as a walk asks for it (the arbiter, 2026-11-13, after build
// 95 notes 5 and 7: "Every walk runs as a reader sees it, with motion on. A
// second, shorter pass checks the reduced-motion path.").
//
// On a phone the app keeps its motion whatever the OS says, and goes still only
// on a device it judges too slow to animate (lib/ui/motionPreference.ts,
// lib/ui/deviceSpeed.ts): four seconds after it opens it samples ninety frames,
// keeps its verdict on the device (purify.motion.device, "ok" or "slow"), and
// <html data-motion> follows it ("full" or "reduce"; app/globals.css keys every
// still escape to it, Tailwind's motion-safe and motion-reduce included).
//
// Until now no walk said which it was walking. Each left the verdict to that
// sampling, on a headless browser in a busy container: in this container, three
// lanes at once, it came out "ok" every time (2026-11-13), so the walks saw the
// app's motion on, but nothing held it there, and a slower run would have
// walked a "slow" phone, still, without a word. Now a walk pins it:
//
//   on      the verdict "ok", taken just now, so the app neither samples nor
//           changes its mind during the walk, as on a reader's phone once it
//           has measured itself; the browser asks for no less motion.
//   reduce  the verdict "slow", the one way a phone reader comes to the app's
//           still path, and the browser asks for less motion too (the few
//           parts that read the OS's own question, lib/ui/motion.ts
//           osPrefersReducedMotion, follow it).
//
// and asserts it on every screen (assertMotion): the app's own attribute, and
// nothing a measure stilled left behind (checkMock, the words-on-pictures pass
// and the pixel audit each still transitions while they read a colour, and
// put them back).

/** The two ways a walk can ask for the app's motion. */
export const MOTION_MODES = ["on", "reduce"];

/** What <html data-motion> says for each. */
const ATTRIBUTE = { on: "full", reduce: "reduce" };

/** Throw unless `mode` is one of the two. */
function checkMode(mode) {
  if (!MOTION_MODES.includes(mode)) throw new Error(`motion is "on" or "reduce", not ${JSON.stringify(mode)}`);
}

/** The browser context's own options for a mode, to spread into newContext. */
export function motionOptions(mode = "on") {
  checkMode(mode);
  return { reducedMotion: mode === "reduce" ? "reduce" : "no-preference" };
}

/**
 * Pin the app's motion on every document the context opens: the device's verdict and when it was
 * taken (lib/ui/deviceSpeed.ts: an "ok" stands a week, a "slow" a day, so neither is sampled again
 * in a walk). Call it before the first page opens.
 */
export async function pinMotion(ctx, mode = "on") {
  checkMode(mode);
  await ctx.addInitScript((verdict) => {
    try {
      localStorage.setItem("purify.motion.device", verdict);
      localStorage.setItem("purify.motion.device.at", String(Date.now()));
    } catch {}
  }, mode === "reduce" ? "slow" : "ok");
}

/** The words a walk says its motion in. */
export const motionWords = (mode = "on") =>
  mode === "reduce" ? "with the app's motion reduced (a phone it judges slow)" : "with the app's motion on, as a reader's phone has it";

/**
 * What is wrong with the page's motion for a walk that asked for `mode`, or null: the app's own
 * attribute saying otherwise, the browser's question answered otherwise, or a measure's stilling
 * left behind. In the page, so it reads what the page draws by.
 */
export async function assertMotion(page, mode = "on") {
  checkMode(mode);
  const seen = await page
    .evaluate(() => {
      const left = [];
      if (document.querySelector("style[data-mock-check]")) left.push("checkMock's stilling (style[data-mock-check])");
      if (document.querySelector("[data-mock-was-animation]")) left.push("an entrance checkMock turned off ([data-mock-was-animation])");
      for (const s of document.querySelectorAll("style")) {
        if (s.hasAttribute("data-mock-check")) continue;
        const text = s.textContent || "";
        if (/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[^}]*transition:\s*none\s*!important/.test(text)) left.push("a measure's stilling (transition: none !important on every element)");
      }
      return {
        motion: document.documentElement.getAttribute("data-motion"),
        osReduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
        left,
      };
    })
    .catch((e) => ({ error: String(e).split("\n")[0] }));
  if (seen.error) return `motion: could not be read (${seen.error})`;
  const want = ATTRIBUTE[mode];
  const wrong = [];
  if (seen.motion !== want) wrong.push(`the app's motion was ${seen.motion === "reduce" ? "off" : seen.motion === "full" ? "on" : "unset"} (data-motion=${seen.motion ?? "none"}) where the walk asked for it ${mode === "on" ? "on" : "reduced"}`);
  if (seen.osReduce !== (mode === "reduce")) wrong.push(`the browser ${seen.osReduce ? "asked" : "did not ask"} for less motion`);
  for (const l of seen.left) wrong.push(`left behind by a measure: ${l}`);
  return wrong.length ? `motion: ${wrong.join("; ")}` : null;
}

/** What every watched page's motion was found to be, wrong, across a walk (watchMotion). */
const FAULTS = [];

/**
 * Assert the page's motion on every screen a walk reaches (cause 9 of the gate: the eight feature
 * walks asked for reduced motion and never said which motion they walked): after each navigation of
 * the page's own frame, once it has loaded, the app's own steps between addresses included. The
 * checks are settled before the page's context closes, with one more on the screen it closes on,
 * so the last screen is asserted too. What is wrong is kept for motionFaults().
 */
export function watchMotion(page, mode = "on") {
  checkMode(mode);
  const pending = new Set();
  const check = (where) => {
    const p = page
      .waitForLoadState("load")
      .catch(() => {})
      .then(() => (page.isClosed() ? null : assertMotion(page, mode)))
      .then((wrong) => {
        if (wrong && !page.isClosed()) FAULTS.push(`${where}: ${wrong}`);
      })
      .finally(() => pending.delete(p));
    pending.add(p);
  };
  const pathOf = (url) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) check(pathOf(frame.url()));
  });
  const ctx = page.context();
  if (!ctx.__motionClose) {
    const close = ctx.close.bind(ctx);
    ctx.__motionClose = true;
    ctx.close = async (...args) => {
      for (const open of ctx.pages()) if (!open.isClosed() && open.__motionCheck) open.__motionCheck(`${pathOf(open.url())}, as it closed`);
      await Promise.all(ctx.pages().flatMap((open) => (open.__motionPending ? [...open.__motionPending] : [])));
      return close(...args);
    };
  }
  page.__motionCheck = check;
  page.__motionPending = pending;
}

/** Every motion fault the walk's watched pages showed, said once each; the walk fails on any. */
export function motionFaults() {
  return [...new Set(FAULTS)];
}

/** Print the walk's motion faults under its result, and say how many (0 is a pass). */
export function reportMotion(mode = "on") {
  const wrong = motionFaults();
  if (wrong.length) {
    console.log(`\nMotion: ${wrong.length} screen${wrong.length === 1 ? "" : "s"} not walked ${motionWords(mode)}:`);
    for (const w of wrong) console.log(`  FAIL ${w}`);
  } else console.log(`\nMotion: every screen walked ${motionWords(mode)} (pinned, asserted on each).`);
  return wrong.length;
}
