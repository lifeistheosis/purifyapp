#!/usr/bin/env node
// The ad's takes, stage 1: one for each scene. A scene's screen is built by
// its own pieces, as the sample builds Today (../sample/take.mjs), and a scene
// that is followed by another is then emptied the same way, so the phone can
// carry a bare screen to the next scene.
//
//   node docs/plans/v1.9/video/ad/take.mjs today          film one scene
//   node docs/plans/v1.9/video/ad/take.mjs journal --dry  no film: a still at each look
//   node docs/plans/v1.9/video/ad/take.mjs today --dom    no film: what the screen holds, for writing its pieces
//
// The app is opened as the first cut opens it (../lib.mjs): the native export,
// a new reader with no Plus, Dark, Sunday 6 December 2026. The screen is
// reached the way a reader reaches it (real taps, before the film rolls) and
// left to load whole. Then each piece in cut.mjs is found in the app's own
// page and held outside the screen; the film rolls on the bare screen; and the
// pieces are let go in turn on the house curve (--ease-house, read from the
// app's stylesheet). The element that moves is the element a reader taps, and
// it is moved with `translate` and `scale` only, so the app's layout is never
// touched. The take fails unless the screen reads word for word after the
// build as it did before.

import { launchCamera, take, wait } from "../lib.mjs";
import { SCENES, builtAt, leftAt } from "./cut.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const DOM = args.includes("--dom");
const scene = SCENES.find((s) => s.id === args[0]);
if (!scene) throw new Error(`name a scene: ${SCENES.map((s) => s.id).join(", ")}`);

/**
 * In the page: hold each piece outside the screen, and make ready the way each leaves again. Gives the house curve
 * it read and how many elements it holds.
 */
function hold({ pieces, name, leave }) {
  for (const [attr, pick] of Object.entries(name ?? {})) {
    const el = document.querySelector(pick);
    if (!el) throw new Error(`the screen has no ${attr} (${pick})`);
    el.setAttribute(attr, "");
  }
  const curve = getComputedStyle(document.documentElement).getPropertyValue("--ease-house").trim();
  const nums = /^cubic-bezier\(([^)]+)\)$/.exec(curve)?.[1].split(",").map(Number);
  if (!nums || nums.length !== 4) throw new Error(`the app's stylesheet has no house curve (${curve})`);
  // The house curve run backward, for a piece that leaves as it came.
  const back = `cubic-bezier(${[1 - nums[2], 1 - nums[3], 1 - nums[0], 1 - nums[1]].map((n) => Number(n.toFixed(4))).join(", ")})`;
  const [vw, vh, gap] = [innerWidth, innerHeight, 36];
  const counts = {};
  // Every piece is found and measured where the app put it before any is moved, since a piece carried off the screen takes what it holds with it.
  const found = [];
  for (const p of pieces) {
    const els = [...document.querySelectorAll(p.pick)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < vh && r.bottom > 0 && r.width > 0;
    });
    if (!els.length) throw new Error(`the screen has no "${p.name}" (${p.pick})`);
    if (p.count && els.length !== p.count) throw new Error(`"${p.name}" is ${els.length} on the screen, not ${p.count}`);
    counts[p.name] = els.length;
    els.forEach((el, i) => found.push({ p, el, i, r: el.getBoundingClientRect() }));
  }
  const held = [];
  const going = [];
  const outer = found.filter((f) => f.p.from !== "near");
  for (const { p, el, i, r } of found) {
    const [dx, dy] =
      p.from === "below" ? [0, vh - r.top + gap] : p.from === "above" ? [0, -(r.bottom + gap)] : p.from === "start" ? [-(r.right + gap), 0] : p.from === "end" ? [vw - r.left + gap, 0] : [0, p.by];
    const off = { translate: `${dx}px ${dy}px`, scale: String(p.size ?? 1), opacity: p.from === "near" ? 0 : 1 };
    const rest = { translate: "0px 0px", scale: "1", opacity: 1 };
    const a = el.animate([off, rest], { duration: p.for * 1000, delay: (p.at + i * (p.each ?? 0)) * 1000, easing: curve, fill: "backwards" });
    a.pause();
    held.push(a);
    if (leave && p.from !== "near") {
      // Last in, first out: the screen empties from the bottom of its order, each piece to the side it came from.
      const turn = outer.length - 1 - outer.findIndex((f) => f.el === el);
      // Made only when it is time to leave: an animation waiting on a piece would hold it at rest and undo its arrival.
      going.push(() => el.animate([rest, off], { duration: leave.for * 1000, delay: turn * leave.each * 1000, easing: back, fill: "forwards" }));
    }
  }
  window.__held = held;
  window.__leave = () => (window.__going = going.map((start) => start()));
  // A piece waiting beyond the end side must not make the page wider than the screen.
  return { curve, back, counts, wide: document.scrollingElement.scrollWidth > vw };
}

/** In the page: what the screen holds, as a short tree, for writing a scene's pieces. */
function tree(rootPick) {
  const vh = innerHeight;
  const out = [];
  const walk = (el, depth) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.top >= vh || r.bottom <= 0) return;
    const attrs = [...el.attributes].filter((a) => a.name.startsWith("data-") || a.name === "aria-label" || a.name === "href").map((a) => `${a.name}${a.value ? `="${a.value.slice(0, 40)}"` : ""}`).join(" ");
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").slice(0, 50);
    out.push(`${"  ".repeat(depth)}${el.tagName.toLowerCase()}${attrs ? ` [${attrs}]` : ""} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}${own ? ` "${own}"` : ""}`);
    if (depth < 7) for (const c of el.children) walk(c, depth + 1);
  };
  for (const root of document.querySelectorAll(rootPick)) walk(root, 0);
  return out.join("\n");
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

/** The way a reader reaches each scene's screen, before the film rolls: fingers on the glass. */
const REACH = {
  async today(h) {
    await dismiss(h);
  },
  async journal(h) {
    await dismiss(h);
    await h.tap(h.page.getByRole("link", { name: "You", exact: true }), { name: "You" });
    await h.page.getByText("Your journal", { exact: true }).first().waitFor({ state: "visible" });
    await h.rest(900);
    await h.tap(h.page.getByText("Your journal", { exact: true }), { name: "Your journal" });
    await h.page.waitForSelector("[data-journal-today]");
    // The page's own opening is left to finish, so what is held is the page at rest.
    await h.rest(2500);
  },
};

const browser = await launchCamera();
const h = await take(browser, `ad-${scene.id}`, { film: !DRY && !DOM });
try {
  await REACH[scene.id](h);
  // Every picture on the screen is whole before a piece is moved.
  await h.page.waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0));
  if (DOM) {
    console.log(new URL(h.page.url()).pathname);
    console.log(await h.page.evaluate(tree, scene.dom ?? "[data-route-content], nav[data-tab-bar]"));
    console.log(await h.still("whole"));
  } else {
    const before = await h.look(`${scene.id}, before`);
    const held = await h.page.evaluate(hold, { pieces: scene.pieces, name: scene.name, leave: scene.leave ?? null });
    if (held.wide) throw new Error("a held piece makes the page wider than the screen");
    console.log(`  the house curve: ${held.curve}; backward: ${held.back}; ${Object.entries(held.counts).map(([k, n]) => `${k} ${n}`).join(", ")}`);
    await wait(400);
    if (DRY) console.log(await h.still("bare"));
    await h.roll();
    h.mark("start");
    await h.rest((scene.lead + 0.25) * 1000);
    h.mark("go");
    await h.page.evaluate(() => window.__held.forEach((a) => a.play()));
    const built = builtAt(scene);
    if (DRY) {
      await h.rest(1000);
      console.log(await h.still("arriving"));
      // Without the camera the browser paints only when asked, so the pieces are waited for and not timed.
      await h.page.evaluate(() => Promise.all(window.__held.map((a) => a.finished)));
    } else await h.rest((built + 0.25) * 1000);
    // Every piece is back where the app put it: nothing is still moving, and the screen reads as it did before.
    const moving = await h.page.evaluate(() => window.__held.filter((a) => a.playState !== "finished").length);
    if (moving) throw new Error(`${moving} pieces are still moving ${(built + 0.25).toFixed(2)}s after they were let go (the last should rest at ${built.toFixed(2)}s)`);
    const after = await h.look(`${scene.id}, built`);
    if (after.words !== before.words) throw new Error(`${scene.id} built does not read as it did before its pieces were held`);
    console.log(`  built: ${after.words.split(/\s+/).length} words, the same as before, word for word`);
    if (DRY) console.log(await h.still("built"));
    if (scene.leave) {
      await h.rest(scene.leave.after * 1000);
      h.mark("leave");
      await h.page.evaluate(() => void window.__leave());
      if (DRY) await h.page.evaluate(() => Promise.all(window.__going.map((a) => a.finished)));
      else await h.rest((leftAt(scene) + 0.6) * 1000);
      const left = await h.page.evaluate(() => window.__going.filter((a) => a.playState !== "finished").length);
      if (left) throw new Error(`${left} pieces have not left`);
      h.mark("bare");
      if (DRY) console.log(await h.still("left"));
    } else await h.rest(scene.restAfter * 1000);
  }
} finally {
  const record = await h.end();
  console.log(`${record.problems.length ? "NO  " : "ok  "} ${scene.id}: ${record.seconds}s of the app's time, ${record.frames.length} frames, pictures: ${record.picturesSeen.map((p) => p.split("/").pop().split("?")[0]).join(", ") || "none"}`);
  for (const p of record.problems) console.log(`      ${p}`);
  await browser.close();
  if (record.problems.length) process.exitCode = 1;
}
