#!/usr/bin/env node
// The sample's one take: Today is built on the screen by its own pieces, then
// a finger opens the next screen.
//
//   node docs/plans/v1.9/video/sample/take.mjs          film it
//   node docs/plans/v1.9/video/sample/take.mjs --dry    no film: a still at each look
//
// The app is opened as the first cut opens it (../lib.mjs): the native export,
// a new reader with no Plus, Dark, Sunday 6 December 2026. Today is left to
// load whole. Then each piece in cut.mjs is found in the app's own page and
// held outside the screen, on the side it will come from; the film rolls on
// the bare screen; and the pieces are let go, each in its turn, on the house
// curve (--ease-house, read from the app's stylesheet). Nothing is drawn and
// nothing is copied: the element that moves is the element a reader taps. The
// app's layout is never touched (a piece is moved with `translate` and
// `scale`, which leave every other element where it is), so each piece comes
// to rest exactly where the app put it. After the tap the motion is the app's
// own: its press, its View Transition, the next page's own opening.

import { go, launchCamera, take, wait } from "../lib.mjs";
import { BUILT, CUT, PIECES } from "./cut.mjs";

const DRY = process.argv.includes("--dry");

/** In the page: hold each piece outside the screen. Gives the house curve it read and how many elements it holds. */
function hold(pieces) {
  // The cascade that holds Today's content is named once, so cut.mjs can find its pieces by what they are.
  const content = document.querySelector("[data-route-content] header[data-tab-topbar] + div");
  if (!content) throw new Error("Today's content is not where the sample reads it");
  content.setAttribute("data-today-build", "");
  const curve = getComputedStyle(document.documentElement).getPropertyValue("--ease-house").trim();
  if (!/^cubic-bezier/.test(curve)) throw new Error(`the app's stylesheet has no house curve (${curve})`);
  const [vw, vh, gap] = [innerWidth, innerHeight, 36];
  const held = [];
  const counts = {};
  // Every piece is found and measured where the app put it before any is moved, since a piece carried off the screen takes what it holds with it.
  const found = [];
  for (const p of pieces) {
    const els = [...document.querySelectorAll(p.pick)].filter((el) => el.getBoundingClientRect().top < vh);
    if (!els.length) throw new Error(`Today has no "${p.name}" (${p.pick})`);
    counts[p.name] = els.length;
    els.forEach((el, i) => found.push({ p, el, i, r: el.getBoundingClientRect() }));
  }
  for (const { p, el, i, r } of found) {
    const [dx, dy] =
      p.from === "below" ? [0, vh - r.top + gap] : p.from === "above" ? [0, -(r.bottom + gap)] : p.from === "start" ? [-(r.right + gap), 0] : p.from === "end" ? [vw - r.left + gap, 0] : [0, p.by];
    const first = { translate: `${dx}px ${dy}px`, scale: String(p.size ?? 1), opacity: p.from === "near" ? 0 : 1 };
    const a = el.animate([first, { translate: "0px 0px", scale: "1", opacity: 1 }], { duration: p.for * 1000, delay: (p.at + i * (p.each ?? 0)) * 1000, easing: curve, fill: "backwards" });
    a.pause();
    held.push(a);
  }
  window.__held = held;
  // A piece waiting beyond the end side must not make the page wider than the screen.
  return { curve, counts, wide: document.scrollingElement.scrollWidth > vw };
}

/** Today's one-question card, put away with its own Dismiss button before the film rolls (../record.mjs). */
async function dismiss(h) {
  const button = h.page.locator('button[aria-label="Dismiss"]').first();
  await button.waitFor({ state: "visible", timeout: 20000 });
  for (let tries = 0; tries < 4 && (await button.isVisible()); tries++) {
    await wait(600);
    await h.page.touchscreen.tap(...Object.values(await h.spot(button)));
    await button.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
  }
  if (await button.isVisible()) throw new Error("Today: the one-question card is still there");
  await h.page.evaluate(() => window.scrollTo(0, 0));
  await wait(1200);
}

const browser = await launchCamera();
const h = await take(browser, "sample", { film: !DRY });
try {
  // The next screen is opened once before the film, by the app's own router, and left: a phone that has shown a
  // saint's page has its picture, and the film should not wait on the network for one.
  await go(h.page, CUT.next.opens);
  await h.page.waitForFunction(() => document.images.length > 0 && [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  await go(h.page, "/");
  await dismiss(h);
  // Every picture on the screen is whole before a piece is moved.
  await h.page.waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0));
  const before = await h.look("today, before");
  const held = await h.page.evaluate(hold, PIECES);
  if (held.wide) throw new Error("a held piece makes the page wider than the screen");
  console.log(`  the house curve: ${held.curve}; ${Object.entries(held.counts).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  await wait(400);
  if (DRY) console.log(await h.still("bare"));
  await h.roll();
  h.mark("start");
  await h.rest((CUT.lead + 0.25) * 1000);
  h.mark("go");
  await h.page.evaluate(() => window.__held.forEach((a) => a.play()));
  if (DRY) {
    await h.rest(1100);
    console.log(await h.still("arriving"));
    // Without the camera the browser paints only when asked, so the pieces are waited for and not timed.
    await h.page.evaluate(() => Promise.all(window.__held.map((a) => a.finished)));
  } else await h.rest(CUT.tapAfter * 1000);
  // Every piece is back where the app put it: nothing is still moving, and the screen reads as it did before.
  const moving = await h.page.evaluate(() => window.__held.filter((a) => a.playState !== "finished").length);
  if (moving) throw new Error(`${moving} pieces are still moving ${CUT.tapAfter}s after they were let go (the last should rest at ${BUILT.toFixed(2)}s)`);
  const built = await h.look("today, built");
  if (built.words !== before.words) throw new Error("Today built does not read as Today did before its pieces were held");
  if (DRY) console.log(await h.still("built"));
  const from = h.page.url();
  await h.tap(h.page.locator(CUT.next.pick), { name: CUT.next.name });
  await h.page.waitForURL((u) => u.href !== from, { timeout: 20000 });
  if (new URL(h.page.url()).pathname !== CUT.next.opens) throw new Error(`the tap opened ${h.page.url()}, not ${CUT.next.opens}`);
  h.mark("page");
  await h.rest(CUT.restAfter * 1000);
  const next = await h.look("the next screen");
  console.log(`  opened ${new URL(h.page.url()).pathname}`);
  if (DRY) {
    console.log(await h.still("next"));
    console.log(next.words.replace(/\s+/g, " ").slice(0, 700));
  }
} finally {
  const record = await h.end();
  console.log(`${record.problems.length ? "NO  " : "ok  "} sample: ${record.seconds}s of the app's time, ${record.frames.length} frames, pictures: ${record.picturesSeen.map((p) => p.split("/").pop().split("?")[0]).join(", ") || "none"}`);
  for (const p of record.problems) console.log(`      ${p}`);
  await browser.close();
  if (record.problems.length) process.exitCode = 1;
}
