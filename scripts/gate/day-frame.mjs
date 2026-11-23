// The gate's probe for the day's frame (2.0; lib/onboarding/flags.ts, off for readers; the owner's
// yes of 2026-11-23 to "Done for today" at the end of the day's page). Asked of the export in out/,
// as a reader in their first week on the Android shell at phone size, with real touch.
//
// The frame serves a council, a saint and a moment in history (lib/onboarding/dayFrame.ts says why
// not the others yet), so the reader walked is on the third day of a week whose third step is a
// council: a Catholic reader, completely new, who asked for quiet.
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
//  10. at a tablet's size the card stands whole too, clear of the bars and of the Testers mark.
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

console.log("\n  With the frame on (Testers mode), a day whose page it does not serve yet (the first day, a lesson)");
{
  const ctx = await reader({ ...READER, ...TESTING });
  const page = await today(ctx);
  const c = await card(page);
  if (!c.step || !c.href) fault(`no step on Today: ${JSON.stringify(c)}`);
  else {
    await begin(page);
    await page.waitForTimeout(3000);
    const m = await measure(page);
    check(m.path.replace(/\/$/, "") === c.href.replace(/\/$/, "") && !m.end, `"${c.step[1]}" (${m.path}) wears nothing of the frame`, `the page ${m.path} shows the frame's end: ${JSON.stringify(m.end)}`);
    check(/"at":1/.test(m.week ?? ""), "opening the step took it, as it always has, so the day is not left unkept", `the week is ${m.week} after opening`);
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

await browser.close();
console.log(faults ? `\nthe day's frame: ${faults} fault${faults === 1 ? "" : "s"}` : "\nthe day's frame: a day is kept by Done at the end of its page, and ends on tomorrow");
process.exit(faults ? 1 : 0);
