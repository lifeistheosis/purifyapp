// What opens shows itself: the page moves with it (1.9, build 93 note 15).
// The rule and his words are in lib/ui/showOpened.ts; the unit tests hold the
// arithmetic (lib/ui/__tests__/showOpened.test.ts). This is the check that
// watches it happen: the native export, at a phone's size, each control
// tapped with a real touch.
//
//   npm run build:android          (writes out/)
//   node scripts/opened-walk.mjs [folder for stills] [--only <word>] [--named]
//
// What it holds, for every part it opens:
//   - the part ends in sight, clear of the tab bar by the room the helper
//     keeps, or the control that opened it has gone as far up as it may (to
//     the bar at the top, never under it);
//   - the control is never carried under the bar at the top;
//   - a part that opens in sight leaves the page where it was;
//   - and, where a thing says it is one whole (the prayer book), its end is
//     held to the same.
//
// The named walks are the places the owner and the fresh-eyes walk named:
// the prayer book as he had it in build 93 (every chapter shut, the second
// opened), with a chapter open above, at the foot of the screen, and with
// Purify's motion off; the FAQ's answers near the foot; the Terms' and the
// Privacy Policy's Contents; What's new's months and its newest note. After
// them, a sweep: on each page listed, every control that says it opens
// something in the page is set low on the screen, tapped, and judged.
//
// Exit 1 when anything fails. A walk that could not be made (no such control
// on the page) is said, and fails too: a check that proves nothing is not a
// pass.

import fs from "node:fs";
import path from "node:path";

import { openPhone } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const stills = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--only") ?? null;
/** --named: the named walks alone, without the sweep. */
const namedOnly = args.includes("--named");
if (stills) fs.mkdirSync(stills, { recursive: true });

/** The room the helper keeps (lib/ui/showOpened.ts, CLEAR_PX), and a pixel for rounding. */
const CLEAR = 12;
const HAIR = 1.5;
/** How long after the tap the page is judged: the helper's own longest watch is 1.4s. */
const SETTLED_MS = 1100;

const TYPES = { ".avif": "image/avif", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

let failed = 0;
let passed = 0;
const say = (ok, name, detail) => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

/** A phone on the export, the website's own pictures answered from this branch's public/. */
async function phone(set = {}) {
  const opened = await openPhone({ scale: 1, set });
  await opened.ctx.route("https://purifyapp.net/**", (route) => {
    const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(path.resolve("public") + path.sep) || !fs.existsSync(file)) return route.abort();
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
  const cdp = await opened.ctx.newCDPSession(opened.page);
  /** A finger: down and up at one point, as a phone gives it. */
  const touch = async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await opened.page.waitForTimeout(40);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  return { ...opened, touch };
}

/** What the page shows through: under its bars at the top, over its bars at the foot. Read in the page. */
const READ = `(() => {
  const standing = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0; };
  let roof = 0, floor = innerHeight;
  for (const el of document.querySelectorAll("[data-screen-edge]")) {
    if (!standing(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.getAttribute("data-screen-edge") === "top") roof = Math.max(roof, r.bottom); else floor = Math.min(floor, r.top);
  }
  return { roof, floor };
})()`;

/**
 * Marks one control for the walk and says where it stands. `find` runs in
 * the page and answers the control, or null.
 */
async function mark(page, find, arg) {
  return page.evaluate(
    ({ source, arg, READ }) => {
      document.querySelectorAll("[data-walk-control]").forEach((el) => el.removeAttribute("data-walk-control"));
      const el = new Function("arg", `return (${source})(arg)`)(arg);
      if (!el) return null;
      el.setAttribute("data-walk-control", "");
      const r = el.getBoundingClientRect();
      const band = new Function(`return ${READ}`)();
      return { top: r.top, bottom: r.bottom, x: r.left + r.width / 2, y: r.top + r.height / 2, ...band };
    },
    { source: find.toString(), arg, READ },
  );
}

/** Where the marked control and what it opened stand now. */
async function measure(page) {
  return page.evaluate((READ) => {
    const el = document.querySelector("[data-walk-control]");
    const band = new Function(`return ${READ}`)();
    if (!el) return { gone: true, ...band, scrollY: Math.round(scrollY) };
    const details = el.tagName === "SUMMARY" ? el.parentElement : null;
    let part = details;
    if (!part) {
      for (const id of (el.getAttribute("aria-controls") ?? "").split(/\s+/)) {
        const named = id ? document.getElementById(id) : null;
        if (named && (!part || named.getBoundingClientRect().bottom > part.getBoundingClientRect().bottom)) part = named;
      }
    }
    const open = details ? details.open : el.getAttribute("aria-expanded") === "true";
    const whole = (part ?? el).closest("[data-shown-whole]");
    const r = el.getBoundingClientRect();
    const p = part ? part.getBoundingClientRect() : null;
    // A box that scrolls the part itself (a sheet): the walk judges the page, and says so.
    let boxed = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.position === "fixed" || s.position === "sticky") boxed = true;
    }
    return {
      gone: false,
      open,
      boxed,
      top: r.top,
      bottom: Math.max(r.bottom, p ? p.bottom : r.bottom),
      partTop: p ? p.top : null,
      wholeBottom: whole ? whole.getBoundingClientRect().bottom : null,
      scrollY: Math.round(scrollY),
      max: Math.round(document.documentElement.scrollHeight - innerHeight),
      ...band,
    };
  }, READ);
}

/**
 * Sets the marked control `from` px over the tab bar (its foot), taps it with
 * a finger, lets the page settle, and judges what it opened.
 */
async function openAndJudge(p, name, { from = 30, wants = {} } = {}) {
  const { page, touch } = p;
  // Set it low on the screen: the foot of the control `from` px over the floor.
  await page.evaluate((from) => {
    const el = document.querySelector("[data-walk-control]");
    const READ_floor = (() => { let floor = innerHeight; for (const e of document.querySelectorAll('[data-screen-edge="bottom"]')) { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (r.height > 0 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0) floor = Math.min(floor, r.top); } return floor; })();
    const r = el.getBoundingClientRect();
    window.scrollBy({ top: r.bottom - (READ_floor - from), behavior: "instant" });
  }, from);
  await page.waitForTimeout(350);
  const before = await measure(page);
  if (before.gone) return say(false, name, "the control went away before it could be tapped");
  if (before.open) return say(false, name, "it was open already: nothing to open");
  const at = await page.evaluate(() => { const r = document.querySelector("[data-walk-control]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 22) }; });
  if (at.y >= before.floor || at.y <= before.roof) return say(false, name, `the control could not be set in sight (it stands ${Math.round(at.y)}px down, the page shows ${Math.round(before.roof)} to ${Math.round(before.floor)})`);
  await touch(at.x, at.y);
  if (wants.atOnce) {
    // With Purify's motion off the page is there at once: judged a tenth of a second after the finger.
    await page.waitForTimeout(100);
  } else {
    await page.waitForTimeout(SETTLED_MS);
  }
  const after = await measure(page);
  if (stills) await page.screenshot({ path: path.join(stills, `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 70)}.png`) });
  if (after.gone) return say(false, name, "the control was gone after the tap");
  if (!after.open) return say(false, name, "the tap did not open it");
  const faults = [];
  const end = wants.whole && after.wholeBottom !== null ? Math.max(after.bottom, after.wholeBottom) : after.bottom;
  const clear = end <= after.floor - CLEAR + HAIR;
  // As far up as it may go: the control's top at the bar, with the room kept.
  // Within a few pixels: the app reads the bar's foot for itself (lib/ui/
  // readingPlace.ts), and a bar with a hairline under it reads 2px lower
  // there than its box does here.
  const asFar = after.top <= after.roof + CLEAR + 4;
  // Or the page has no more to give: it is at its end.
  const atEnd = after.scrollY >= after.max - 1;
  const moved = after.scrollY - before.scrollY;
  if (wants.whole && after.wholeBottom === null) faults.push("nothing here says it is one whole (data-shown-whole)");
  if (!clear && !asFar && !atEnd) faults.push(`it ends ${Math.round(end)}px down and the page shows to ${Math.round(after.floor)}; its control stands ${Math.round(after.top)}px down with room to rise to ${Math.round(after.roof + CLEAR)}`);
  if (after.top < after.roof + CLEAR - HAIR && moved > 1) faults.push(`its control was carried to ${Math.round(after.top)}px, under the bar that ends at ${Math.round(after.roof)}`);
  if (wants.still && Math.abs(moved) > 1) faults.push(`it opened in sight and the page moved ${moved}px all the same`);
  if (wants.moves && moved < 20) faults.push(`the page moved ${moved}px; this walk is of a part that ends out of sight, so it proves nothing`);
  say(faults.length === 0, name, faults.length ? faults.join("; ") : `the page ${moved === 0 ? "stayed" : `moved ${moved}px`}; it ends ${Math.round(end)}px down, the page shows to ${Math.round(after.floor)}; its control ${Math.round(after.top)}px down`);
}

const wanted = (name) => !only || name.toLowerCase().includes(only.toLowerCase());

// ── The prayer book ──────────────────────────────────────────────────
const chapter = (n) => document.querySelector(`[data-prayer-book] [data-chapter-at="${n}"]`);

async function prayerBook() {
  /** Prayers, the book with every chapter shut, as he had it. */
  const shut = async (p) => {
    await go(p.page, "/prayers/");
    await p.page.waitForSelector("[data-prayer-book] [data-chapter-at]", { timeout: 20000 });
    await p.page.waitForTimeout(900);
    // The daily rule is open at first: shut it, as he had.
    const open = await p.page.evaluate(() => document.querySelector('[data-prayer-book] [aria-expanded="true"]')?.getAttribute("data-chapter-at") ?? null);
    if (open !== null) {
      await p.page.locator(`[data-prayer-book] [data-chapter-at="${open}"]`).click();
      await p.page.waitForTimeout(700);
    }
  };

  if (wanted("his screen")) {
    const p = await phone();
    await shut(p);
    // His screen: the whole book in sight, its end just over the tab bar.
    const placed = await p.page.evaluate(() => {
      const book = document.querySelector("[data-prayer-book]");
      let floor = innerHeight;
      for (const e of document.querySelectorAll('[data-screen-edge="bottom"]')) { const r = e.getBoundingClientRect(); if (r.height > 0) floor = Math.min(floor, r.top); }
      window.scrollBy({ top: book.getBoundingClientRect().bottom - (floor - 40), behavior: "instant" });
      return true;
    });
    await p.page.waitForTimeout(350);
    const control = placed ? await mark(p.page, chapter, 1) : null;
    if (!control) say(false, "the prayer book, his screen: every chapter shut, the second opened", "no second chapter on the page");
    else {
      const before = await measure(p.page);
      await p.touch(control.x, control.top + 22);
      await p.page.waitForTimeout(SETTLED_MS);
      const after = await measure(p.page);
      if (stills) await p.page.screenshot({ path: path.join(stills, "prayer-book-his-screen.png") });
      const faults = [];
      if (!after.open) faults.push("the tap did not open the chapter");
      if (after.wholeBottom === null) faults.push("the book does not say it is one whole (data-shown-whole)");
      else if (after.wholeBottom > after.floor - CLEAR + HAIR && after.top > after.roof + CLEAR + HAIR) faults.push(`the book ends ${Math.round(after.wholeBottom)}px down, under the tab bar at ${Math.round(after.floor)}, and the page ${after.scrollY === before.scrollY ? "stayed where it was" : `moved only ${after.scrollY - before.scrollY}px`}`);
      if (after.top < after.roof + CLEAR - HAIR) faults.push(`the chapter's title was carried to ${Math.round(after.top)}px, under the bar`);
      say(faults.length === 0, "the prayer book, his screen: every chapter shut, the second opened, the book still whole in sight", faults.length ? faults.join("; ") : `the page moved ${after.scrollY - before.scrollY}px; the book ends ${Math.round(after.wholeBottom)}px down, the tab bar begins at ${Math.round(after.floor)}`);
    }
    await p.browser.close();
  }

  if (wanted("the last chapter")) {
    const p = await phone();
    await shut(p);
    const control = await mark(p.page, chapter, 3);
    if (!control) say(false, "the prayer book: the last chapter, opened at the foot of the screen", "no fourth chapter on the page");
    else await openAndJudge(p, "the prayer book: the last chapter, opened at the foot of the screen", { from: 20, wants: { whole: true, moves: true } });
    await p.browser.close();
  }

  if (wanted("a chapter open above")) {
    const p = await phone();
    await go(p.page, "/prayers/");
    await p.page.waitForSelector("[data-prayer-book] [data-chapter-at]", { timeout: 20000 });
    await p.page.waitForTimeout(900);
    // The daily rule open above, as the page opens: the chapter tapped stays under the finger, then the page goes with it.
    const control = await mark(p.page, chapter, 2);
    if (!control) say(false, "the prayer book: a chapter open above the one tapped", "no third chapter on the page");
    else {
      await p.page.evaluate(() => {
        const el = document.querySelector("[data-walk-control]");
        let floor = innerHeight;
        for (const e of document.querySelectorAll('[data-screen-edge="bottom"]')) { const r = e.getBoundingClientRect(); if (r.height > 0) floor = Math.min(floor, r.top); }
        window.scrollBy({ top: el.getBoundingClientRect().bottom - (floor - 60), behavior: "instant" });
      });
      await p.page.waitForTimeout(350);
      const at = await p.page.evaluate(() => { const r = document.querySelector("[data-walk-control]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 22, top: r.top }; });
      await p.touch(at.x, at.y);
      // A frame or two after the finger: the title has not left it.
      await p.page.waitForTimeout(60);
      const soon = await measure(p.page);
      await p.page.waitForTimeout(SETTLED_MS);
      const after = await measure(p.page);
      if (stills) await p.page.screenshot({ path: path.join(stills, "prayer-book-open-above.png") });
      const faults = [];
      if (!after.open) faults.push("the tap did not open the chapter");
      if (soon.top > at.top + 2) faults.push(`the title dropped ${Math.round(soon.top - at.top)}px under the finger as the chapter above shut`);
      if (after.wholeBottom !== null && after.wholeBottom > after.floor - CLEAR + HAIR && after.top > after.roof + CLEAR + HAIR && after.scrollY < after.max - 1) faults.push(`the book ends ${Math.round(after.wholeBottom)}px down, under the tab bar at ${Math.round(after.floor)}`);
      if (after.top < after.roof + CLEAR - HAIR) faults.push(`the title was carried to ${Math.round(after.top)}px, under the bar`);
      say(faults.length === 0, "the prayer book: a chapter open above the one tapped: the title stays under the finger, then the page goes with its page", faults.length ? faults.join("; ") : `the title ${Math.round(at.top)}px down at the tap, ${Math.round(soon.top)}px a moment after, ${Math.round(after.top)}px when settled; the book ends ${Math.round(after.wholeBottom ?? -1)}px down`);
    }
    await p.browser.close();
  }

  if (wanted("motion off")) {
    const p = await phone({ "purify.motion": "off" });
    await shut(p);
    const reduced = await p.page.evaluate(() => document.documentElement.dataset.motion);
    const control = await mark(p.page, chapter, 3);
    if (reduced !== "reduce") say(false, "the prayer book with Purify's motion off: the page is there at once", `the walk could not turn motion off (the page says "${reduced}")`);
    else if (!control) say(false, "the prayer book with Purify's motion off: the page is there at once", "no fourth chapter on the page");
    else await openAndJudge(p, "the prayer book with Purify's motion off: the page is there at once, with no glide", { from: 20, wants: { whole: true, moves: true, atOnce: true } });
    await p.browser.close();
  }

  if (wanted("in sight")) {
    // A part that opens in sight leaves the page where it was. The FAQ's
    // first answer, its question set high on the screen: a few lines, well
    // over the tab bar.
    const p = await phone();
    await go(p.page, "/faq/");
    await p.page.waitForSelector("details > summary", { timeout: 20000 }).catch(() => {});
    await p.page.waitForTimeout(900);
    const control = await mark(p.page, () => [...document.querySelectorAll("details:not([open]) > summary")].filter((s) => !s.closest("header, footer, nav"))[0] ?? null);
    if (!control) say(false, "an answer that opens in sight leaves the page where it was", "no answer on the page to open");
    else {
      await p.page.evaluate(() => {
        const el = document.querySelector("[data-walk-control]");
        let roof = 0;
        for (const e of document.querySelectorAll('[data-screen-edge="top"]')) { const r = e.getBoundingClientRect(); if (r.height > 0) roof = Math.max(roof, r.bottom); }
        window.scrollBy({ top: el.getBoundingClientRect().top - (roof + 60), behavior: "instant" });
      });
      await p.page.waitForTimeout(350);
      const before = await measure(p.page);
      const at = await p.page.evaluate(() => { const r = document.querySelector("[data-walk-control]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 22) }; });
      await p.touch(at.x, at.y);
      await p.page.waitForTimeout(SETTLED_MS);
      const after = await measure(p.page);
      const faults = [];
      if (!after.open) faults.push("the tap did not open the answer");
      const inSight = after.bottom + (after.scrollY - before.scrollY) <= after.floor - CLEAR + HAIR;
      if (!inSight) faults.push(`the answer would have ended ${Math.round(after.bottom + (after.scrollY - before.scrollY))}px down, out of sight, so the walk proves nothing`);
      else if (after.scrollY !== before.scrollY) faults.push(`it opened in sight and the page moved ${after.scrollY - before.scrollY}px all the same`);
      say(faults.length === 0, "an answer that opens in sight leaves the page where it was", faults.length ? faults.join("; ") : `it ends ${Math.round(after.bottom)}px down, the tab bar at ${Math.round(after.floor)}; the page stayed`);
    }
    await p.browser.close();
  }
}

// ── The places the fresh-eyes walk named ─────────────────────────────
async function namedPlaces() {
  const places = [
    { name: "the FAQ: its last answer, opened near the foot", address: "/faq/", wait: "details > summary", find: () => [...document.querySelectorAll("main details:not([open]) > summary, details:not([open]) > summary")].filter((s) => !s.closest("header, footer, nav")).pop() ?? null },
    { name: "the FAQ: its first answer, opened near the foot", address: "/faq/", wait: "details > summary", find: () => [...document.querySelectorAll("details:not([open]) > summary")].filter((s) => !s.closest("header, footer, nav"))[0] ?? null },
    { name: "the Terms: their Contents", address: "/terms/", wait: "[data-legal-page]", find: () => document.querySelector('[data-legal-page] [aria-expanded="false"][aria-controls]') },
    { name: "the Privacy Policy: its Contents", address: "/privacy/", wait: "[data-legal-page]", find: () => document.querySelector('[data-legal-page] [aria-expanded="false"][aria-controls]') },
    { name: "What's new: the first thing that opens on the page", address: "/whats-new/", wait: "details > summary", find: () => [...document.querySelectorAll("details:not([open]) > summary")].filter((s) => !s.closest("header, footer, nav") && s.getBoundingClientRect().height > 0 && !s.parentElement.parentElement.closest("details:not([open])"))[0] ?? null },
    // Not one shut inside another that is shut: it cannot be reached yet, whatever it measures.
    { name: "What's new: the last thing that opens on the page", address: "/whats-new/", wait: "details > summary", find: () => [...document.querySelectorAll("details:not([open]) > summary")].filter((s) => !s.closest("header, footer, nav") && s.getBoundingClientRect().height > 0 && !s.parentElement.parentElement.closest("details:not([open])")).pop() ?? null },
  ];
  for (const place of places) {
    if (!wanted(place.name)) continue;
    const p = await phone();
    await go(p.page, place.address);
    await p.page.waitForSelector(place.wait, { timeout: 20000 }).catch(() => {});
    await p.page.waitForTimeout(900);
    const control = await mark(p.page, place.find);
    if (!control) say(false, place.name, "nothing on the page to open");
    else await openAndJudge(p, place.name, { from: 24 });
    await p.browser.close();
  }
}

// ── What is tapped stays under the finger ────────────────────────────
// A work's pill hugs its name in the middle of the screen, so a name longer or
// shorter than the last one moved both arrows sideways as the part turned
// (the fresh-eyes walk: "a council document's Next bar shifts 47px when
// tapped"; 27 of the 38 council documents moved 15 to 55px). The pill keeps
// one width for the whole work now (components/saints/MobileWorkPill.tsx):
// the arrow tapped is under the finger for the next tap.
async function underTheFinger() {
  const works = [
    // Measured on the export before the mend: 47px here (the fresh-eyes walk's own), "On the Eight Canons" to "Canon I".
    { name: "Ephesus' canons: the pill's arrows stay under the finger as the parts turn", address: "/councils/ephesus/the-eight-canons/" },
    // 55px here, the most of the 38 documents; 27 of them moved 15px or more.
    { name: "Nicaea's canons: the pill's arrows stay under the finger as the parts turn", address: "/councils/first-nicaea/the-twenty-canons/" },
    // A Father's work, its parts numbered: 2px before, and held to the same.
    { name: "a Father's work: the pill's arrows stay under the finger as the parts turn", address: "/saints/athanasius-the-great/four-discourses-against-the-arians/" },
  ];
  for (const work of works) {
    if (!wanted(work.name)) continue;
    const p = await phone();
    await go(p.page, work.address);
    await p.page.waitForSelector("[data-work-pill] button", { timeout: 20000 }).catch(() => {});
    await p.page.waitForTimeout(2200);
    const read = () =>
      p.page.evaluate(() => {
        const arrows = [...document.querySelectorAll("[data-work-pill] button")].filter((b) => !b.hasAttribute("data-pill-name") && b.querySelector("svg") && b.getBoundingClientRect().width <= 60);
        const name = document.querySelector("[data-work-pill] [data-pill-name]");
        const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), off: el.disabled }; };
        // The first two round buttons of the pill are the arrows, back and on; the sound stands after the hairline.
        // The name shown, not the work's widest names laid unseen under it.
        const shown = name?.querySelector("span > span:not([data-pill-width])") ?? name;
        return arrows.length >= 2 && shown ? { back: box(arrows[0]), on: box(arrows[1]), name: (shown.textContent ?? "").replace(/\s+/g, " ").trim() } : null;
      });
    const first = await read();
    if (!first) {
      say(false, work.name, "no pill with its two arrows on the page");
      await p.browser.close();
      continue;
    }
    const names = [first.name];
    let worst = 0;
    let turned = 0;
    for (let i = 0; i < 4; i += 1) {
      const now = await read();
      if (!now || now.on.off) break;
      // The same point each time: where the finger already is.
      await p.touch(first.on.x, first.on.y);
      await p.page.waitForTimeout(900);
      const after = await read();
      if (!after) break;
      if (after.name === now.name) break;
      turned += 1;
      names.push(after.name);
      worst = Math.max(worst, Math.abs(after.on.x - first.on.x), Math.abs(after.back.x - first.back.x), Math.abs(after.on.y - first.on.y));
    }
    const faults = [];
    if (turned < 2) faults.push(`only ${turned} part(s) turned under a finger held in one place, so the walk proves little (${names.join(" > ")})`);
    if (new Set(names.map((n) => n.length)).size < 2) faults.push("every name was the same length, so the walk proves nothing");
    if (worst > 2) faults.push(`an arrow moved ${worst}px from where it was tapped`);
    say(faults.length === 0, work.name, faults.length ? faults.join("; ") : `${turned} parts turned, the arrows within ${worst}px of where they stood (${names.map((n) => `"${n.slice(0, 22)}"`).join(", ")})`);
    await p.browser.close();
  }
}

// ── The sweep: every control on these pages that opens something in the page ──
const SWEEP = ["/prayers/", "/faq/", "/terms/", "/privacy/", "/whats-new/", "/settings/reading-mode/", "/settings/", "/theology/", "/bible/john/1/", "/plans/", "/about/", "/support/", "/fasting/", "/calendar/", "/saints/john-chrysostom/paschal-homily/", "/councils/first-nicaea/", "/you/"];

/** The nth control on the page that says it opens something in the page and is shut, in the page's own flow. */
const nthControl = (n) => {
  const pinned = (el) => { for (let node = el; node && node !== document.body; node = node.parentElement) { const s = getComputedStyle(node).position; if (s === "fixed" || s === "sticky") return true; } return false; };
  const all = [...document.querySelectorAll('[aria-expanded="false"][aria-controls], details:not([open]) > summary')].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (el.matches("input, textarea, select, [role='combobox']")) return false;
    if (el.closest("[data-opens-in-place]")) return false;
    // Something shut inside something shut cannot be reached yet, whatever it measures:
    // a browser leaves what a shut <details> holds where it last stood.
    const holder = el.tagName === "SUMMARY" ? el.parentElement?.parentElement : el.parentElement;
    if (holder?.closest("details:not([open])")) return false;
    return !pinned(el);
  });
  return all[n] ?? null;
};

async function sweep() {
  let tried = 0;
  for (const address of SWEEP) {
    if (!wanted(`sweep ${address}`)) continue;
    // Count first, on one phone; then each control on a page newly opened, so one opening never sets up the next.
    const counter = await phone();
    await go(counter.page, address);
    await counter.page.waitForTimeout(1500);
    const here = await counter.page.evaluate(() => location.pathname);
    const count = await counter.page.evaluate((source) => { const f = new Function("n", `return (${source})(n)`); let n = 0; while (f(n)) n += 1; return n; }, nthControl.toString());
    await counter.browser.close();
    if (here.replace(/\/+$/, "") !== address.replace(/\/+$/, "")) {
      console.log(`--    ${address}: the app opened ${here} instead; not swept`);
      continue;
    }
    if (count === 0) {
      console.log(`--    ${address}: nothing on it opens in the page`);
      continue;
    }
    // Twelve of a page's controls say what the rest would: first, last, and those between.
    const picks = count <= 12 ? [...Array(count).keys()] : [...new Set([0, 1, 2, 3, 4, Math.floor(count / 2), count - 5, count - 4, count - 3, count - 2, count - 1])];
    for (const n of picks) {
      const p = await phone();
      await go(p.page, address);
      await p.page.waitForTimeout(1300);
      const control = await mark(p.page, nthControl, n);
      if (!control) {
        say(false, `sweep ${address} control ${n + 1} of ${count}`, "it was there to count and not there to tap");
      } else {
        const label = await p.page.evaluate(() => (document.querySelector("[data-walk-control]").textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40));
        await openAndJudge(p, `sweep ${address} control ${n + 1} of ${count} "${label}"`, { from: 24 });
        tried += 1;
      }
      await p.browser.close();
    }
  }
  return tried;
}

await prayerBook();
await namedPlaces();
await underTheFinger();
const swept = namedOnly || (only && !only.toLowerCase().includes("sweep") && !SWEEP.some((a) => `sweep ${a}`.includes(only.toLowerCase()))) ? 0 : await sweep();

console.log(`\n${passed} as they should be; ${failed} not${swept ? `; ${swept} of them in the sweep` : ""}`);
process.exit(failed ? 1 : 0);
