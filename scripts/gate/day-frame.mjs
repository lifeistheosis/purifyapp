// The gate's probe for the day's frame (2.0; lib/onboarding/flags.ts, off for readers; the owner's
// yes of 2026-11-23 to "Done for today" at the end of the day's page). Asked of the export in out/,
// as a reader in their first week on the Android shell at phone size, with real touch.
//
// The frame serves a council, a saint, a moment in history and a lesson, and a prayer is kept by its
// own end (lib/onboarding/dayFrame.ts says why not the others yet). The reader walked is a Catholic
// reader, completely new, who asked for quiet: a lesson on the first day, a path on the second, a
// council on the third.
//
// With the frame off, as every reader has it: the day's page wears nothing of the frame, and
// opening a step takes it, as before.
//
// With the frame on (Testers mode, which is how it is walked before its test begins):
//   1. a day whose page the frame does not serve yet is as it was: nothing of the frame on its
//      page, and opening takes the step;
//   2. on the council's day the page's head is untouched: its own bar and title stand where they
//      stand for every reader;
//   3. the week's line and Done stand at the end of the page's own column and nowhere else: never
//      on the first screen, not while the page arrives either, and nothing of them fixed over it;
//   4. back on Today without Done, the card still waits with the same step;
//   5. at the page's end the button stands whole between the bars, and a finger's tap on it is
//      answered in the house's motion, where the finger is: the week's card with the day kept,
//      tomorrow's step by name, and the way back to Today, whole between the bars;
//   6. Today then says the day is kept, with tomorrow's step by name, and offers nothing to begin;
//   7. the page opened again that day keeps its card and does not move by itself;
//   8. the next day tomorrow's step waits on Today, and the council's page wears nothing;
//   9. with motion reduced, Done is answered with no motion and the card stands whole;
//  10. at a tablet's size the card stands whole too, clear of the bars and of the Testers mark;
//  11. on a prayer's day (the owner's yes of 2026-11-23: the prayer's own finish keeps the day, with
//      no second button) the prayer's page wears nothing of the week, before its end or after it;
//      opening keeps nothing; the reader moving down through the prayer to its end keeps the day,
//      once; and Today then says so, with tomorrow's step by name. With the frame off, opening the
//      prayer takes the step, as before;
//  12. on a lesson's day (the owner's "keep going" of 2026-11-23) the lesson's own end gives way:
//      the week's line and Done stand where its one white button stood, the way on to the next
//      lesson is a quiet link, "Lesson read" is left unsaid while the lesson is still marked read,
//      and Done is answered as on a council's page, the quiet links keeping their place. With the
//      frame off, and the day after, the lesson's end is as every reader has it.
//
// The tap on Done is recorded frame by frame and judged by the gate's own motion check
// (scripts/gate/frames.mjs): no cut, no jump, no flash; and with motion reduced, nothing that moves.
//
// Run from the repository's root on the export in out/. With --stills <dir> it keeps pictures.
//   node scripts/gate/day-frame.mjs [--stills dir]
import fs from "node:fs";

import { chromium } from "playwright";

import { assertMotion, motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { asAndroidShell } from "../lib/sells-plus.mjs";
import { judgeFrames, recordFrames, stripOf } from "./frames.mjs";
import { installGate } from "./inpage.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const at = process.argv.indexOf("--stills");
const STILLS = at > 0 ? process.argv[at + 1] : null;
if (!fs.existsSync(`${OUT}/index.html`)) {
  console.error(`no export in ${OUT}: cut one first (node scripts/gate/export.mjs)`);
  process.exit(1);
}

// The walk's days are the device's own: today, the day before it and the day after, as the reader's
// phone (in New York) counts them. Today's pages run on the container's own clock, never a pinned
// one. A pinned clock moves the page's own timeline (performance.timeOrigin) away from the one the
// screen's frames are stamped on, and the gate's motion check, which reads the two together, could
// then no longer tell a glide from a flash: every frame of a move read as a still one (2026-11-23,
// this probe's first runs: "something drawn for 2 frames and gone" on a line the page was carrying
// up the screen). Only the day after is reached by a clock moved a day on, and nothing is judged
// frame by frame there.
const ZONE = "America/New_York";
const dayOf = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const A_DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const DAY = dayOf(NOW);
const YESTERDAY = dayOf(NOW - A_DAY);
const COUNCIL = "/councils/first-nicaea";
/** A Catholic reader, completely new, who asked for quiet: the Jesus Prayer's lesson, the Fathers' path, then the First Council of Nicaea. */
const READER = {
  "purify:onboarded": "4",
  "purify:level": "inquirer",
  "purify:depth": "inquirer",
  "purify:background": "catholic",
  "purify:intent": "quiet",
  "purify:intents": '["quiet"]',
  "purify:firststeps.eligible": "1",
  "purify:onboarded.day": dayOf(NOW - 2 * A_DAY),
  "purify:fasting-rule": "hidden",
  "purify:calendar.style": "new",
  "purify:whatsNewSeen": "99",
};
/** Another Christian tradition, completely new, who asked for quiet: the Jesus Prayer's lesson, then the Creed, then the First Council of Nicaea. */
const PRAYING = { ...READER, "purify:background": "christian" };
const CREED = "/prayers/creed";
/** One day kept, yesterday: today is the second day, a prayer. */
const SECOND_DAY = { "purify:week": JSON.stringify({ at: 1, day: YESTERDAY, passed: 0 }) };
/** Two days kept, the second yesterday: today is the third day. */
const THIRD_DAY = { "purify:week": JSON.stringify({ at: 2, day: YESTERDAY, passed: 0 }) };
/** Testers mode, as lib/onboarding/testers.ts starts it. */
const TESTING = { "purify:testers": '{"v":1,"keys":{}}' };
// The device's motion verdict (scripts/lib/motion.mjs) is dated a day and a half on, so it is not
// stale on the day after either: a stale verdict is measured again four seconds in, and a walk that
// asked for reduced motion would be walked with motion on without a word.
const VERDICT_AT = NOW + 1.5 * A_DAY;

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let faults = 0;
const fault = (why) => {
  faults++;
  console.log(`    NO   ${why}`);
};
const ok = (what) => console.log(`    ok   ${what}`);
const check = (cond, good, bad) => (cond ? ok(good) : fault(bad));

async function reader(keys, { motion = "on", scale = 1, width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "America/New_York", ...motionOptions(motion) });
  await pinMotion(ctx, motion);
  await ctx.addInitScript(({ kept, verdictAt }) => {
    try {
      if (!localStorage.getItem("purify:onboarded")) for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
      localStorage.setItem("purify.motion.device.at", String(verdictAt));
    } catch {}
    window.__frame = { transitions: 0, seen: [], watch: false };
    const own = document.startViewTransition?.bind(document);
    if (own)
      document.startViewTransition = (update) => {
        window.__frame.transitions++;
        return own(update);
      };
  }, { kept: keys, verdictAt: VERDICT_AT });
  await installGate(ctx);
  await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  return ctx;
}
async function open(ctx, path, { tomorrow = false } = {}) {
  const page = await ctx.newPage();
  if (tomorrow) await page.clock.install({ time: new Date(Date.now() + A_DAY) });
  await go(page, path, { timeout: 30000 });
  await page.waitForTimeout(3500);
  return page;
}
const today = (ctx, when) => open(ctx, "/", when);
const still = async (page, name) => {
  if (STILLS) await page.screenshot({ path: `${STILLS}/${name}.png` });
};
const card = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("[data-first-step]");
    const k = document.querySelector("[data-first-step-kept]");
    const words = (x) => (x ? [...x.querySelectorAll("p")].map((p) => p.textContent.trim()) : null);
    return { step: words(c), href: c?.querySelector("a")?.getAttribute("href") ?? null, kept: words(k), keptLinks: k ? k.querySelectorAll("a, button").length : 0 };
  });
const tap = async (page, selector) => {
  const box = await page.locator(selector).first().boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};
const begin = async (page) => {
  await page.locator("[data-first-step] a").scrollIntoViewIfNeeded();
  await tap(page, "[data-first-step] a");
};
/** What the page shows of itself and of the frame, as measured. */
const measure = (page) =>
  page.evaluate(() => {
    const r = (x) => {
      if (!x) return null;
      const b = x.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), height: Math.round(b.height) };
    };
    const end = document.querySelector("[data-day-end]");
    const done = document.querySelector("[data-day-done]");
    const mark = document.querySelector("[data-day-mark]");
    const kept = document.querySelector("[data-day-kept]");
    const main = document.querySelector("main");
    const bar = document.querySelector('main [data-screen-edge="top"]');
    const h1 = document.querySelector("main h1");
    const column = end?.parentElement ?? null;
    const padded = (x) => {
      const b = x.getBoundingClientRect();
      const s = getComputedStyle(x);
      return { left: Math.round(b.left + parseFloat(s.paddingLeft)), right: Math.round(b.right - parseFloat(s.paddingRight)) };
    };
    // Anything a reader would see or tap that follows the frame's end in the page.
    const after = end
      ? [...main.querySelectorAll("*")].filter((x) => end.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING && !end.contains(x) && x.getBoundingClientRect().height > 1 && (x.textContent.trim() || x.matches("a, button, img, svg"))).length
      : 0;
    const fixed = end ? [end, ...end.querySelectorAll("*")].some((y) => ["fixed", "sticky"].includes(getComputedStyle(y).position)) : false;
    const pill = document.querySelector(".testers-mark");
    const link = kept?.querySelector("a") ?? null;
    const lb = link?.getBoundingClientRect();
    const hit = lb ? document.elementFromPoint(lb.left + lb.width / 2, lb.top + lb.height / 2) : null;
    return {
      path: location.pathname,
      y: Math.round(scrollY),
      pageHeight: document.documentElement.scrollHeight,
      bar: r(bar),
      h1: h1 ? { words: h1.textContent.trim(), ...r(h1) } : null,
      end: r(end),
      column: column ? padded(column) : null,
      mark: mark ? { words: mark.textContent.trim(), ...r(mark) } : null,
      done: done ? { words: done.textContent.trim(), ...r(done) } : null,
      kept: kept ? { words: [...kept.querySelectorAll("p")].map((x) => x.textContent.trim()), link: link?.textContent.trim() ?? null, href: link?.getAttribute("href") ?? null, linkHit: !!hit && link.contains(hit), ...r(kept) } : null,
      after,
      fixed,
      ceiling: Math.round(Math.max(0, ...[...document.querySelectorAll('[data-screen-edge="top"]')].map((x) => x.getBoundingClientRect().bottom))),
      floor: Math.round(Math.min(innerHeight, ...[...document.querySelectorAll('[data-screen-edge="bottom"]')].map((x) => x.getBoundingClientRect().top))),
      pill: r(pill),
      transitions: window.__frame.transitions,
      week: localStorage.getItem("purify:week"),
    };
  });
const apart = (a, b) => !a || !b || a.bottom <= b.top || b.bottom <= a.top || a.right <= b.left || b.right <= a.left;
/** The tap on Done, recorded frame by frame and judged as the gate judges any tap's change. */
const judgedDone = async (ctx, page, motion) => {
  const cdp = await ctx.newCDPSession(page);
  const rec = await recordFrames(page, cdp, () => tap(page, "[data-day-done]"), { moves: motion === "reduce" });
  const v = await judgeFrames(rec, { motion });
  await cdp.detach().catch(() => {});
  // With --stills, each fail's frames side by side, to see what was drawn.
  if (STILLS) for (const [n, f] of v.fails.entries()) if (f.frames) await stripOf(rec, f.frames, `${STILLS}/done-${motion}-${f.kind}-${n}.png`);
  return { frames: rec.frames.length, fails: v.fails.map((f) => `${f.kind}: ${f.detail}`), unsure: v.unsure ?? [], glides: (v.glides ?? []).length };
};
const toEnd = async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(900);
};

console.log("The day's frame: a reader in their first week on the Android shell at 390 by 844, with touch");

// With the frame off.
let plain = null;
console.log("\n  With the frame off, as every reader has it (the third day, a council)");
{
  const ctx = await reader({ ...READER, ...THIRD_DAY });
  const page = await today(ctx);
  const c = await card(page);
  if (!c.step || !c.href) fault(`no step on Today: ${JSON.stringify(c)}`);
  else {
    check(c.href.replace(/\/$/, "") === COUNCIL, `today's step is "${c.step[1]}" (${c.href})`, `today's step opens ${c.href}, not ${COUNCIL}`);
    await begin(page);
    await page.waitForTimeout(3000);
    plain = await measure(page);
    check(!plain.end, `the page (${plain.path}) wears nothing of the frame`, "the page wears the frame's end with the frame off");
    check(/"at":3/.test(plain.week ?? ""), "opening the step took it, as before", `the week is ${plain.week} after opening`);
  }
  await ctx.close();
}

console.log("\n  With the frame on (Testers mode), a day whose page it does not serve yet (the second day, a path)");
{
  const ctx = await reader({ ...READER, ...SECOND_DAY, ...TESTING });
  const page = await today(ctx);
  const c = await card(page);
  if (!c.step || !c.href) fault(`no step on Today: ${JSON.stringify(c)}`);
  else {
    await begin(page);
    await page.waitForTimeout(3000);
    const m = await measure(page);
    check(m.path.replace(/\/$/, "") === c.href.replace(/\/$/, "") && !m.end, `"${c.step[1]}" (${m.path}) wears nothing of the frame`, `the page ${m.path} shows the frame's end: ${JSON.stringify(m.end)}`);
    check(/"at":2/.test(m.week ?? ""), "opening the step took it, as it always has, so the day is not left unkept", `the week is ${m.week} after opening`);
    await page.goBack();
    await page.waitForTimeout(2500);
    const back = await card(page);
    check(!back.kept, "Today does not say Done was tapped: nothing was", `Today shows the kept card: ${JSON.stringify(back.kept)}`);
  }
  await ctx.close();
}

console.log("\n  With the frame on, the council's day");
{
  const ctx = await reader({ ...READER, ...THIRD_DAY, ...TESTING }, { scale: STILLS ? 2 : 1 });
  let page = await today(ctx);
  const c = await card(page);
  if (!c.step || !c.href) {
    fault(`no step on Today: ${JSON.stringify(c)}`);
  } else {
    console.log(`    today for this reader: ${c.step[0]}, ${c.step[1]} (${c.href})`);
    await still(page, "day-1-today");
    // While the page arrives: every frame, where Done stands, if it stands anywhere.
    await page.evaluate(() => {
      window.__frame.watch = true;
      const tick = () => {
        const d = document.querySelector("[data-day-done]");
        if (d) window.__frame.seen.push(Math.round(d.getBoundingClientRect().top));
        if (window.__frame.watch) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await begin(page);
    await page.waitForTimeout(3000);
    const seen = await page.evaluate(() => {
      window.__frame.watch = false;
      return { frames: window.__frame.seen.length, highest: window.__frame.seen.length ? Math.min(...window.__frame.seen) : null };
    });

    // 2 and 3.
    const p = await measure(page);
    check(p.path.replace(/\/$/, "") === COUNCIL, `Begin opened the day's page (${p.path})`, `Begin opened ${p.path}, not ${COUNCIL}`);
    check(
      plain && p.bar?.top === plain.bar?.top && p.h1?.top === plain.h1?.top && p.h1.words === plain.h1.words,
      `the page's head is untouched: its bar at ${p.bar?.top} and "${p.h1?.words}" at ${p.h1?.top}, as for every reader`,
      `the page's head moved: its bar at ${p.bar?.top} and its title at ${p.h1?.top}; with the frame off they stand at ${plain?.bar?.top} and ${plain?.h1?.top}`,
    );
    check(p.mark?.words === "Your first week · 3 of 7" && p.done?.words === "Done for today" && p.done.height >= 44 && p.mark.bottom <= p.done.top, `the week's line and Done stand together: "${p.mark?.words}", then "${p.done?.words}" (${p.done?.height} high)`, `the frame's end shows ${JSON.stringify(p.mark)} and ${JSON.stringify(p.done)}`);
    check(p.after === 0, "nothing of the page follows them: they are its end", `${p.after} part${p.after === 1 ? "" : "s"} of the page follow the frame's end`);
    check(p.column && p.done.left === p.column.left && p.done.right === p.column.right, `in the page's own column (${p.column?.left} to ${p.column?.right})`, `Done runs from ${p.done?.left} to ${p.done?.right}; the page's column from ${p.column?.left} to ${p.column?.right}`);
    check(p.done.top + p.y > 844, `not on the first screen: Done stands at ${p.done.top + p.y} of ${p.pageHeight}, reached by reading down`, `Done stands at ${p.done.top + p.y}, on the first screen`);
    check(seen.frames > 0 && seen.highest > 844, `nor while the page arrived: over ${seen.frames} frames it never stood above ${seen.highest}`, `while the page arrived Done stood at ${seen.highest} (${seen.frames} frames read)`);
    check(!p.fixed, "nothing of the frame is fixed or sticky over the page", "a part of the frame is fixed or sticky");
    check(/"at":2/.test(p.week ?? ""), "opening the step kept nothing", `the week is ${p.week} after opening`);
    await still(page, "day-2-page");

    // 4.
    await page.goBack();
    await page.waitForTimeout(2500);
    const again = await card(page);
    check(again.step?.[1] === c.step[1] && !again.kept, "back on Today without Done, the card waits with the same step", `Today shows ${JSON.stringify(again)}`);

    // 5.
    await begin(page);
    await page.waitForTimeout(2500);
    await toEnd(page);
    const before = await measure(page);
    const motion = await assertMotion(page, "on");
    check(!motion, "the app's motion is on, as a reader's phone has it", motion);
    check(before.done && before.mark.top >= before.ceiling && before.done.bottom <= before.floor, `at the page's end the line and Done stand whole between the bars (${before.mark?.top} to ${before.done?.bottom}, the bars at ${before.ceiling} and ${before.floor})`, `at the page's end Done runs to ${before.done?.bottom} with the tab bar's top at ${before.floor}`);
    check(apart(before.done, before.pill), "and clear of the Testers mark", `the Testers mark (${JSON.stringify(before.pill)}) stands over Done (${JSON.stringify(before.done)})`);
    await still(page, "day-3-done");
    await page.evaluate(() => (window.__frame.transitions = 0));
    const seenDone = await judgedDone(ctx, page, "on");
    await page.waitForTimeout(900);
    const after = await measure(page);
    check(after.transitions > 0, "the tap was answered in the house's motion", "the button changed with a cut: no transition began");
    check(!seenDone.fails.length && !seenDone.unsure.length, `frame by frame (${seenDone.frames} frames), the gate's motion check finds no cut, no jump and no flash`, `the gate's motion check on the tap: ${[...seenDone.fails, ...seenDone.unsure.map((u) => `unsure: ${u}`)].join("; ")}`);
    check(!after.done && !after.mark && after.kept?.words[0] === "Day 3 of 7, kept" && /^Tomorrow: /.test(after.kept.words[1] ?? ""), `the week's card stands in their place: "${after.kept?.words.join('", "')}"`, `after Done the page shows ${JSON.stringify(after.kept)}, the button ${after.done ? "still there" : "gone"}`);
    const moved = after.y - before.y;
    check(after.kept && Math.abs(after.kept.top + moved - before.mark.top) <= 2, `where the finger is: the card's head stands where the line's did${moved ? `, and the page went ${moved} with it` : ", and the page did not move"}`, `the card's head is at ${after.kept?.top} (the page moved ${moved}); the line's was at ${before.mark.top}`);
    check(after.kept && after.kept.top >= after.ceiling && after.kept.bottom <= after.floor, `the card is whole between the bars (${after.kept?.top} to ${after.kept?.bottom}, the bars at ${after.ceiling} and ${after.floor})`, `the card runs from ${after.kept?.top} to ${after.kept?.bottom} with the bars at ${after.ceiling} and ${after.floor}`);
    check(apart(after.kept, after.pill), "and clear of the Testers mark", `the Testers mark (${JSON.stringify(after.pill)}) stands over the card (${after.kept?.top} to ${after.kept?.bottom})`);
    check(after.kept?.link === "Back to Today" && after.kept.href === "/" && after.kept.linkHit, "it offers the way back to Today, and a finger reaches it", `its link is ${JSON.stringify(after.kept?.link)} to ${after.kept?.href}, under the finger: ${after.kept?.linkHit}`);
    check(new RegExp(`"at":3,"day":"${DAY}","passed":0`).test(after.week ?? ""), "the day is kept on the device, today", `the week is ${after.week}`);
    await still(page, "day-4-kept");

    // 6.
    await page.evaluate(() => (window.__frame.transitions = 0));
    await tap(page, "[data-day-kept] a");
    await page.waitForTimeout(3000);
    const home = await page.evaluate(() => ({ path: location.pathname, transitions: window.__frame.transitions }));
    const kept = await card(page);
    check(home.path === "/" && home.transitions > 0, "Back to Today opens Today in the house's motion", `it went to ${home.path} with ${home.transitions} transitions`);
    check(!kept.step && kept.kept?.[0] === "Day 3 of 7, kept" && kept.kept[1] === after.kept?.words[1] && kept.keptLinks === 0, `Today says the day is kept: "${kept.kept?.join('", "')}", with nothing to begin`, `Today shows ${JSON.stringify(kept)}`);
    await still(page, "day-5-today-kept");
    await page.close();

    // 7.
    page = await open(ctx, COUNCIL);
    const later = await measure(page);
    check(later.kept?.words[0] === "Day 3 of 7, kept" && !later.done, "opened again that day, the page keeps its card at its end", `opened again the page shows ${JSON.stringify(later.kept)} and ${JSON.stringify(later.done)}`);
    check(later.y === 0, "and it opens at its head: the page does not move by itself", `the page opened at ${later.y}`);
    await page.close();

    // 8.
    page = await today(ctx, { tomorrow: true });
    const next = await card(page);
    check(next.step?.[0] === "Your first week · 4 of 7" && `Tomorrow: ${next.step[1]}` === after.kept?.words[1] && !next.kept, `the next day, the step named waits on Today: "${next.step?.join('", "')}"`, `the next day Today shows ${JSON.stringify(next)}`);
    await page.close();
    page = await open(ctx, COUNCIL, { tomorrow: true });
    const old = await measure(page);
    check(!old.end, "and the council's page wears nothing: it is no longer anyone's day", `the next day the council's page shows ${JSON.stringify(old.end)}`);
  }
  await ctx.close();
}

console.log("\n  With motion reduced");
{
  const ctx = await reader({ ...READER, ...THIRD_DAY, ...TESTING }, { motion: "reduce" });
  const page = await open(ctx, COUNCIL);
  await toEnd(page);
  const before = await measure(page);
  const motion = await assertMotion(page, "reduce");
  check(!motion, "the app's motion is reduced, as on a phone it judges slow", motion);
  if (!before.done) fault("no Done at the page's end");
  else {
    await page.evaluate(() => (window.__frame.transitions = 0));
    const seenDone = await judgedDone(ctx, page, "reduce");
    await page.waitForTimeout(600);
    const after = await measure(page);
    check(after.transitions === 0 && after.kept?.words[0] === "Day 3 of 7, kept", "Done is answered with no motion: the card stands at once", `with motion reduced ${after.transitions} transitions began; the page shows ${JSON.stringify(after.kept)}`);
    check(!seenDone.fails.length && !seenDone.unsure.length, `frame by frame (${seenDone.frames} frames), nothing moves`, `the gate's motion check on the tap, motion reduced: ${[...seenDone.fails, ...seenDone.unsure.map((u) => `unsure: ${u}`)].join("; ")}`);
    check(after.kept && after.kept.top >= after.ceiling && after.kept.bottom <= after.floor && after.kept.linkHit, `whole between the bars (${after.kept?.top} to ${after.kept?.bottom}), its way back under the finger`, `the card runs from ${after.kept?.top} to ${after.kept?.bottom} with the bars at ${after.ceiling} and ${after.floor}; its link under the finger: ${after.kept?.linkHit}`);
  }
  await ctx.close();
}

console.log("\n  At a tablet's size (800 by 1280)");
{
  const ctx = await reader({ ...READER, ...THIRD_DAY, ...TESTING }, { width: 800, height: 1280 });
  const page = await open(ctx, COUNCIL);
  await toEnd(page);
  const before = await measure(page);
  if (!before.done) fault("no Done at the page's end");
  else {
    check(before.done.left === before.column.left && before.done.right < before.column.right && before.done.bottom <= before.floor && apart(before.done, before.pill), `Done stands at the column's start, no wider than a button (${before.done.left} to ${before.done.right}), clear of the bars and of the Testers mark`, `Done runs from ${before.done.left} to ${before.done.right} in a column from ${before.column.left} to ${before.column.right}; its foot at ${before.done.bottom}, the bar at ${before.floor}, the Testers mark ${JSON.stringify(before.pill)}`);
    await tap(page, "[data-day-done]");
    await page.waitForTimeout(2600);
    const after = await measure(page);
    check(after.kept && after.kept.top >= after.ceiling && after.kept.bottom <= after.floor && apart(after.kept, after.pill) && after.kept.linkHit, `the card stands whole between the bars (${after.kept?.top} to ${after.kept?.bottom}), clear of the Testers mark, its way back under the finger`, `the card runs from ${after.kept?.top} to ${after.kept?.bottom} with the bars at ${after.ceiling} and ${after.floor}; the Testers mark ${JSON.stringify(after.pill)}; its link under the finger: ${after.kept?.linkHit}`);
  }
  await ctx.close();
}

console.log("\n  A lesson's day (the first day, the Jesus Prayer)");
{
  const LESSON = "/prayers/learning/jesus-prayer";
  // The lesson's own end: what it says, what is white in it, and where its links stand.
  const ending = (page) =>
    page.evaluate(() => {
      const end = document.querySelector("[data-lesson-end]");
      const r = (x) => {
        if (!x) return null;
        const b = x.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
      };
      const white = (x) => {
        const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(x).backgroundColor);
        const [red, green, blue, alpha = "1"] = m ? m[1].split(",").map((v) => v.trim()) : [0, 0, 0, "0"];
        return Number(alpha) > 0.9 && Math.min(Number(red), Number(green), Number(blue)) > 200;
      };
      const links = end ? [...end.querySelectorAll("a, button")] : [];
      const on = end?.querySelector("[data-lesson-on]") ?? null;
      const h1 = document.querySelector("main h1");
      return {
        path: location.pathname,
        h1: h1 ? { words: h1.textContent.trim(), top: Math.round(h1.getBoundingClientRect().top + scrollY) } : null,
        over: h1?.previousElementSibling?.textContent.trim() ?? null,
        whites: links.filter(white).map((x) => x.textContent.trim()),
        names: links.map((x) => x.textContent.trim()),
        read: end?.querySelector('[role="status"]')?.textContent.trim() ?? null,
        on: on ? { words: on.textContent.trim(), href: on.getAttribute("href"), ...r(on) } : null,
        marked: /jesus-prayer/.test(localStorage.getItem("purify.learning.read") ?? ""),
      };
    });

  // As every reader has it.
  let plainLesson = null;
  {
    const ctx = await reader(READER);
    const page = await today(ctx);
    const c = await card(page);
    if (!c.step || c.href?.replace(/\/$/, "") !== LESSON) fault(`with the frame off, today's step is ${JSON.stringify(c.step)} (${c.href}), not the lesson`);
    else {
      await begin(page);
      await page.waitForTimeout(3000);
      const m = await measure(page);
      await toEnd(page);
      await page.waitForTimeout(2600);
      plainLesson = await ending(page);
      check(/"at":1/.test(m.week ?? "") && !m.end, "with the frame off, opening the lesson took the step, as before, and it wears nothing of the frame", `with the frame off the week is ${m.week} and the page shows ${JSON.stringify(m.end)}`);
      check(plainLesson.whites.length === 1 && /^Next lesson: /.test(plainLesson.whites[0]) && plainLesson.read === "Lesson read", `its end is the lesson's own: "${plainLesson.read}", then one white button, "${plainLesson.whites[0]}"`, `with the frame off the lesson's end shows ${JSON.stringify(plainLesson)}`);
    }
    await ctx.close();
  }

  const ctx = await reader({ ...READER, ...TESTING }, { scale: STILLS ? 2 : 1 });
  let page = await today(ctx);
  const c = await card(page);
  if (!c.step || c.href?.replace(/\/$/, "") !== LESSON) {
    fault(`today's step is ${JSON.stringify(c.step)} (${c.href}), not the lesson`);
  } else {
    console.log(`    today for this reader: ${c.step[0]}, ${c.step[1]} (${c.href})`);
    await page.evaluate(() => {
      window.__frame.seen = [];
      window.__frame.watch = true;
      const tick = () => {
        const d = document.querySelector("[data-day-done]");
        if (d) window.__frame.seen.push(Math.round(d.getBoundingClientRect().top));
        if (window.__frame.watch) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await begin(page);
    await page.waitForTimeout(3000);
    const seen = await page.evaluate(() => {
      window.__frame.watch = false;
      return { frames: window.__frame.seen.length, highest: window.__frame.seen.length ? Math.min(...window.__frame.seen) : null };
    });
    const p = await measure(page);
    const head = await ending(page);
    check(p.path.replace(/\/$/, "") === LESSON && /"at":0/.test(p.week ?? '"at":0'), `Begin opened the lesson (${p.path}), and opening kept nothing`, `Begin opened ${p.path}; the week is ${p.week}`);
    check(plainLesson && head.h1?.top === plainLesson.h1?.top && head.over === plainLesson.over, `the lesson's head is untouched: "${head.over}" over "${head.h1?.words}", as for every reader`, `the lesson's head reads ${JSON.stringify(head.over)} at ${head.h1?.top}; for every reader ${JSON.stringify(plainLesson?.over)} at ${plainLesson?.h1?.top}`);
    check(seen.frames > 0 && seen.highest > 844, `Done never stood on the first screen while the lesson arrived (${seen.frames} frames, never above ${seen.highest})`, `while the lesson arrived Done stood at ${seen.highest} (${seen.frames} frames read)`);

    await toEnd(page);
    await page.waitForTimeout(2600);
    const before = await measure(page);
    const e = await ending(page);
    check(before.mark?.words === "Your first week · 1 of 7" && before.done?.words === "Done for today", `the lesson's end gives way: "${before.mark?.words}", then "${before.done?.words}"`, `the lesson's end shows ${JSON.stringify(before.mark)} and ${JSON.stringify(before.done)}`);
    check(e.whites.length === 1 && e.whites[0] === "Done for today", "Done is the one white button in it", `the white buttons in the lesson's end: ${JSON.stringify(e.whites)}`);
    check(e.on && /^Next lesson: /.test(e.on.words) && e.on.top >= before.done.bottom, `the way on stays, as a quiet link under it: "${e.on?.words}"`, `the way on is ${JSON.stringify(e.on)}; Done ends at ${before.done?.bottom}`);
    check(e.read === null && e.marked, "\"Lesson read\" is left unsaid, and the lesson is marked read all the same", `the lesson's end says ${JSON.stringify(e.read)}; marked read on the device: ${e.marked}`);
    check(before.done.bottom <= before.floor && apart(before.done, before.pill), `Done stands whole over the bars, clear of the Testers mark (${before.done.top} to ${before.done.bottom})`, `Done runs to ${before.done.bottom} with the tab bar at ${before.floor} and the Testers mark ${JSON.stringify(before.pill)}`);
    await still(page, "lesson-1-done");

    await page.evaluate(() => (window.__frame.transitions = 0));
    const seenDone = await judgedDone(ctx, page, "on");
    await page.waitForTimeout(900);
    const after = await measure(page);
    const e2 = await ending(page);
    check(after.transitions > 0 && !seenDone.fails.length && !seenDone.unsure.length, `the tap is answered in the house's motion, and frame by frame (${seenDone.frames} frames) the gate's motion check finds no cut, no jump and no flash`, `the tap on Done: ${after.transitions} transitions; the gate's motion check: ${[...seenDone.fails, ...seenDone.unsure.map((u) => `unsure: ${u}`)].join("; ") || "nothing"}`);
    check(!after.done && after.kept?.words[0] === "Day 1 of 7, kept" && after.kept.words[1] === "Tomorrow: Start with the Fathers", `the week's card stands in their place: "${after.kept?.words.join('", "')}"`, `after Done the lesson's end shows ${JSON.stringify(after.kept)}`);
    check(after.kept && after.kept.top >= after.ceiling && after.kept.bottom <= after.floor && apart(after.kept, after.pill) && after.kept.linkHit, `whole between the bars (${after.kept?.top} to ${after.kept?.bottom}), clear of the Testers mark, its way back under the finger`, `the card runs from ${after.kept?.top} to ${after.kept?.bottom} with the bars at ${after.ceiling} and ${after.floor}; the Testers mark ${JSON.stringify(after.pill)}; its link under the finger: ${after.kept?.linkHit}`);
    check(e2.on && e2.on.words === e.on?.words && e2.whites.length === 0 && e2.read === null, "the lesson's quiet links keep their place under it, and nothing in the end is white", `after Done the lesson's end shows ${JSON.stringify(e2)}`);
    check(new RegExp(`"at":1,"day":"${DAY}","passed":0`).test(after.week ?? ""), "the day is kept on the device, today", `the week is ${after.week}`);
    await still(page, "lesson-2-kept");
    await page.close();

    page = await today(ctx);
    const kept = await card(page);
    check(!kept.step && kept.kept?.[0] === "Day 1 of 7, kept" && kept.kept[1] === "Tomorrow: Start with the Fathers", `Today says the day is kept: "${kept.kept?.join('", "')}"`, `Today shows ${JSON.stringify(kept)}`);
    await page.close();

    page = await open(ctx, LESSON, { tomorrow: true });
    await toEnd(page);
    await page.waitForTimeout(1200);
    const old = await measure(page);
    const e3 = await ending(page);
    check(!old.end && e3.whites.length === 1 && /^Next lesson: /.test(e3.whites[0]), "the day after, the lesson's end is every reader's again: its own white button, nothing of the frame", `the day after the lesson's end shows ${JSON.stringify(e3)} and the frame ${JSON.stringify(old.end)}`);
  }
  await ctx.close();
}

console.log("\n  A prayer's day (the second day, the Creed)");
{
  // What the prayer's page shows of the week, and of its own end.
  const prayer = (page) =>
    page.evaluate(() => {
      const main = document.querySelector("main");
      const words = main.innerText;
      const end = document.querySelector("[data-rule-end]");
      return {
        path: location.pathname,
        frame: !!document.querySelector("[data-day-end], [data-day-done], [data-day-kept], [data-day-mark]"),
        week: /Your first week|Done for today|of 7, kept|Tomorrow:/.test(words),
        complete: end?.querySelector("[data-rule-complete-words]")?.textContent.trim() ?? null,
        kept: localStorage.getItem("purify:week"),
        y: Math.round(scrollY),
        tall: document.documentElement.scrollHeight,
      };
    });
  // The reader moves down through the prayer as a hand does, a part of a screen at a time, to its end.
  const prayThrough = async (page) => {
    for (let i = 0; i < 80; i++) {
      const done = await page.evaluate(() => {
        window.scrollBy(0, 260);
        return Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight;
      });
      await page.waitForTimeout(120);
      if (done) break;
    }
    await page.waitForTimeout(1500);
  };

  {
    const ctx = await reader({ ...PRAYING, ...SECOND_DAY });
    const page = await today(ctx);
    const c = await card(page);
    if (!c.step || c.href?.replace(/\/$/, "") !== CREED) fault(`with the frame off, today's step is ${JSON.stringify(c.step)} (${c.href}), not the Creed`);
    else {
      await begin(page);
      await page.waitForTimeout(3000);
      const m = await prayer(page);
      check(/"at":2/.test(m.kept ?? "") && !m.frame && !m.week, "with the frame off, opening the prayer took the step, as before, and its page wears nothing of the week", `with the frame off the week is ${m.kept}; the page shows the frame: ${m.frame}, the week's words: ${m.week}`);
    }
    await ctx.close();
  }

  const ctx = await reader({ ...PRAYING, ...SECOND_DAY, ...TESTING }, { scale: STILLS ? 2 : 1 });
  let page = await today(ctx);
  const c = await card(page);
  if (!c.step || c.href?.replace(/\/$/, "") !== CREED) {
    fault(`today's step is ${JSON.stringify(c.step)} (${c.href}), not the Creed`);
  } else {
    console.log(`    today for this reader: ${c.step[0]}, ${c.step[1]} (${c.href})`);
    await begin(page);
    await page.waitForTimeout(3000);
    const opened = await prayer(page);
    check(opened.path.replace(/\/$/, "") === CREED && !opened.frame && !opened.week, "the prayer's page wears nothing of the week: no line, no Done, no card", `the prayer's page shows the frame: ${opened.frame}, the week's words: ${opened.week}`);
    check(/"at":1/.test(opened.kept ?? "") && !opened.complete, "opening it kept nothing, and the prayer is not yet said", `after opening the week is ${opened.kept} and the prayer's end says ${JSON.stringify(opened.complete)}`);

    await page.goBack();
    await page.waitForTimeout(2500);
    const waits = await card(page);
    check(waits.step?.[1] === c.step[1] && !waits.kept, "back on Today before the prayer is said, the card waits with the same step", `Today shows ${JSON.stringify(waits)}`);

    await begin(page);
    await page.waitForTimeout(2500);
    await prayThrough(page);
    const said = await prayer(page);
    check(said.complete === "Glory to God. The rule is complete for today.", `moving down through the prayer to its end, the prayer's own end answers: "${said.complete}"`, `at the prayer's end (${said.y} of ${said.tall}) its end says ${JSON.stringify(said.complete)}`);
    check(new RegExp(`"at":2,"day":"${DAY}","passed":0`).test(said.kept ?? ""), "and the day is kept on the device, by that end alone", `the week is ${said.kept}`);
    check(!said.frame && !said.week, "still nothing of the week on the prayer's page: no retention loop inside a prayer", `after its end the prayer's page shows the frame: ${said.frame}, the week's words: ${said.week}`);
    await still(page, "prayer-1-said");

    // Told again (the page read on, the store heard twice): the day is kept once.
    await page.evaluate(() => window.scrollTo(0, 0));
    await prayThrough(page);
    const again = await prayer(page);
    check(new RegExp(`"at":2,"day":"${DAY}","passed":0`).test(again.kept ?? ""), "read through again, the day is still kept once", `after a second reading the week is ${again.kept}`);
    await page.close();

    page = await today(ctx);
    const kept = await card(page);
    check(!kept.step && kept.kept?.[0] === "Day 2 of 7, kept" && kept.kept[1] === "Tomorrow: First Council of Nicaea" && kept.keptLinks === 0, `Today says the day is kept: "${kept.kept?.join('", "')}", with nothing to begin`, `Today shows ${JSON.stringify(kept)}`);
    await still(page, "prayer-2-today-kept");
    await page.close();

    page = await today(ctx, { tomorrow: true });
    const next = await card(page);
    check(next.step?.[0] === "Your first week · 3 of 7" && next.step[1] === "First Council of Nicaea" && !next.kept, `the next day, the step named waits on Today: "${next.step?.join('", "')}"`, `the next day Today shows ${JSON.stringify(next)}`);
  }
  await ctx.close();

  // A prayer that is not today's step keeps nothing of the week. And one said earlier the same day
  // keeps the day as its page is opened: it was said today.
  {
    const ctx2 = await reader({ ...PRAYING, ...TESTING });
    let page2 = await open(ctx2, CREED);
    await prayThrough(page2);
    const other = await prayer(page2);
    check(other.complete && (!other.kept || /"at":0/.test(other.kept)), "on a day that is not the prayer's (the first day, a lesson), saying it keeps nothing of the week", `said on another day, the prayer's end says ${JSON.stringify(other.complete)} and the week is ${other.kept}`);
    // The same reader with the first day kept yesterday: today is the Creed's day, and the Creed is said already.
    await page2.evaluate((week) => localStorage.setItem("purify:week", week), SECOND_DAY["purify:week"]);
    await page2.close();
    page2 = await open(ctx2, CREED);
    const m = await prayer(page2);
    check(new RegExp(`"at":2,"day":"${DAY}","passed":0`).test(m.kept ?? "") && m.complete && !m.frame && !m.week, "a prayer already said today keeps the day as its page is opened, its end at rest", `opened already said, the week is ${m.kept} and the prayer's end says ${JSON.stringify(m.complete)}`);
    await ctx2.close();
  }
}

await browser.close();
console.log(faults ? `\nthe day's frame: ${faults} fault${faults === 1 ? "" : "s"}` : "\nthe day's frame: a day is kept by Done at the end of its page, a lesson's among them, or by a prayer's own end, and ends on tomorrow");
process.exit(faults ? 1 : 0);
