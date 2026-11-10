// Every page switch moves: the check that watches it happen (1.9, build 89
// note 4; the standard is in CLAUDE.md, the rules in lib/ui/routeMotion.ts).
//
// lib/ui/__tests__/routeMotion.test.ts holds the rules and the wiring, and
// cannot see a transition: vitest has no browser. This opens the native
// export in Chromium, which is the Android WebView's engine, answered the way
// the shells answer it (scripts/lib/shell-server.mjs), walks the app as a
// reader does, and reads from the browser what it pictured.
//
//   npm run build:android
//   node scripts/route-motion.mjs                  the check
//   node scripts/route-motion.mjs --film <folder>  and stills of each walk
//
// What it holds:
//   forward   a tap into a page is one transition: the page being left fades
//             (route-leave) and the new one settles in (route-settle)
//   back      the page's own chevron is one transition: the page being left
//             sinks (route-sink), the one behind it returns (route-arrive),
//             and the link that was tapped is where it was
//   across    a tab for a tab, and a page for the page beside it, cross-fade
//             (route-leave, route-arrive)
//   the tab bar is pictured apart from the page in each of them
//   a card's picture travels to the head of its page, and back into its card
//             (a saint's icon, from the list and to it; a starter's tile on
//             the Florilegium, and back)
//   a gathering, whose page in the apps is one page for all of them named in
//             its query, is a page switch like any (lib/florilegium/href.ts)
//   a book    the cover tapped in the reading room travels to the head of the
//             book's page and back into its tile (components/reading/
//             OpeningCover.tsx); a book left in the middle opens on its cover
//             all the same, and goes down to the reader's paragraph only
//             once the page has arrived; back from there, with the cover far
//             up the page, nothing is flown in from off the screen; a
//             council's document, the same from its council's shelf
//   each is over within 350ms
//   the browser's own Back is not pictured (the platform's rule)
//   with motion reduced, nothing is pictured at all
//   and each walk ends on the page it set out for
//
// A film is the same walks with the transition stopped as it becomes ready
// and stepped to each time in turn: stills of the middle of a motion, which a
// screenshot of a running app cannot take.
//
// What it cannot say: how it feels at a phone's frame rate, and anything
// about iOS, whose WebKit is not here. Those are a walk on a phone
// (docs/PHONE-WALK.md).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { go } from "./lib/shell-server.mjs";
import { openPhone } from "./mock-check.mjs";

/** The times a film stops at, in ms from the start of the transition. */
export const FILM_TIMES = [1, 33, 66, 116, 180, 340];

/** Runs in the page before the app: every transition the browser is asked for is written down. */
function watchTransitions() {
  const log = { seen: [], film: false, held: null };
  window.__routeMotion = log;
  const start = Document.prototype.startViewTransition;
  if (!start) return;
  Document.prototype.startViewTransition = function (arg) {
    const entry = { from: location.pathname, at: performance.now(), parts: [], tabBar: false, carried: [], travelled: false, leaving: null, ready: false, done: false };
    log.seen.push(entry);
    const transition = start.call(this, arg);
    const held = transition.ready.then(
      () => {
        entry.ready = true;
        entry.to = location.pathname;
        const running = document.documentElement
          .getAnimations({ subtree: true })
          .filter((a) => a.effect && typeof a.effect.pseudoElement === "string" && a.effect.pseudoElement.startsWith("::view-transition"));
        for (const a of running) {
          const timing = a.effect.getComputedTiming();
          const part = a.effect.pseudoElement;
          if (part.includes("(tab-bar)")) entry.tabBar = true;
          // The travelling picture: its two sides, the card's and the page's,
          // where each is drawn fading. (A cover draws only the one it is
          // becoming, which does not fade: app/globals.css, "A cover is one
          // poster".)
          if (part === "::view-transition-old(carried)" && !entry.carried.includes("old")) entry.carried.push("old");
          // How the side being left is drawn: a cover's is kept unseen.
          if (part === "::view-transition-old(carried)") entry.leaving = a.animationName ?? "";
          if (part === "::view-transition-new(carried)" && !entry.carried.includes("new")) entry.carried.push("new");
          // And whether it travelled: the browser moves the frame the two
          // share only when there is one on each side of the change.
          if (part === "::view-transition-group(carried)") entry.travelled = true;
          if (part === "::view-transition-old(root)" || part === "::view-transition-new(root)") {
            entry.parts.push({ part: part.includes("old") ? "old" : "new", name: a.animationName ?? "", ms: Number(timing.duration) + Number(timing.delay) });
          }
        }
        if (log.film) {
          for (const a of running) a.pause();
          entry.running = running;
        }
        return true;
      },
      () => false,
    );
    if (log.film) log.held = held;
    transition.finished.then(
      () => {
        entry.done = true;
        entry.took = Math.round(performance.now() - entry.at);
        // How far down the page was when the change was over: a page that
        // goes somewhere as it opens goes after it has arrived.
        entry.scrolled = Math.round(window.scrollY);
      },
      () => {
        entry.done = true;
      },
    );
    return transition;
  };
}

const sleep = (page, ms) => page.waitForTimeout(ms);
const pathOf = (page) => page.evaluate(() => location.pathname);
const seen = (page) =>
  page.evaluate(() =>
    window.__routeMotion.seen.map((entry) => {
      // The animations themselves do not cross to here.
      const said = { ...entry };
      delete said.running;
      return said;
    }),
  );
const forget = (page) =>
  page.evaluate(() => {
    window.__routeMotion.seen.length = 0;
    window.__routeMotion.held = null;
  });

/** A link of this kind that is on screen now, so the tap does not scroll the page first. Marks it, and says where it was. */
async function pick(page, selector) {
  return page.evaluate((sel) => {
    for (const a of document.querySelectorAll(sel)) {
      const r = a.getBoundingClientRect();
      if (r.top > 110 && r.top < 560 && r.width > 40 && r.height > 20) {
        document.querySelectorAll("[data-walk-target]").forEach((el) => el.removeAttribute("data-walk-target"));
        a.setAttribute("data-walk-target", "");
        return { href: a.getAttribute("href"), top: Math.round(r.top) };
      }
    }
    return null;
  }, selector);
}

/**
 * One walk: do `act`, wait for the address to change, and say what was
 * pictured. With `film`, the transition is stopped as it becomes ready and a
 * still is taken at each of FILM_TIMES.
 */
async function walk(page, name, act, { film } = {}) {
  await forget(page);
  const from = await pathOf(page);
  if (film) await page.evaluate(() => (window.__routeMotion.film = true));
  await act();
  await page.waitForFunction((f) => location.pathname !== f, from, { timeout: 15000 }).catch(() => {});
  const stills = [];
  if (film) {
    const caught = await page
      .waitForFunction(() => window.__routeMotion.held !== null, null, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (caught && (await page.evaluate(() => window.__routeMotion.held))) {
      for (const t of FILM_TIMES) {
        await page.evaluate((time) => {
          const entry = window.__routeMotion.seen.at(-1);
          for (const a of entry.running ?? []) a.currentTime = time;
        }, t);
        await sleep(page, 50);
        const file = path.join(film, `${name}-${String(t).padStart(3, "0")}ms.png`);
        await page.screenshot({ path: file });
        stills.push({ label: `${t} ms`, file });
      }
      await page.evaluate(() => {
        const entry = window.__routeMotion.seen.at(-1);
        for (const a of entry.running ?? []) {
          try {
            a.finish();
          } catch {
            // already over
          }
        }
        window.__routeMotion.film = false;
      });
    }
    await page.evaluate(() => (window.__routeMotion.film = false));
  }
  await page.waitForFunction(() => window.__routeMotion.seen.every((e) => e.done), null, { timeout: 4000 }).catch(() => {});
  await sleep(page, 450);
  if (film) {
    const file = path.join(film, `${name}-there.png`);
    await page.screenshot({ path: file });
    stills.push({ label: "there", file });
  }
  return { name, from, to: await pathOf(page), pictured: await seen(page), stills };
}

/** What a pictured walk must have been. */
function judge(result, { old, fresh, tabBar = true, to, carried = false }) {
  const faults = [];
  const { pictured } = result;
  if (to && !sameAddress(result.to, to)) faults.push(`ended on ${result.to}, not ${to}`);
  if (pictured.length !== 1) {
    faults.push(`pictured ${pictured.length} transitions, not one`);
    return faults;
  }
  const [one] = pictured;
  if (!one.ready) faults.push("the transition never became ready");
  const part = (side) => one.parts.find((p) => p.part === side);
  if (part("old")?.name !== old) faults.push(`the page being left moves as "${part("old")?.name ?? "nothing"}", not ${old}`);
  if (part("new")?.name !== fresh) faults.push(`the page arriving moves as "${part("new")?.name ?? "nothing"}", not ${fresh}`);
  const longest = Math.max(0, ...one.parts.map((p) => p.ms));
  if (longest > 350) faults.push(`takes ${longest}ms, over 350`);
  if (tabBar && !one.tabBar) faults.push("the tab bar is not pictured apart from the page");
  if (carried && !one.travelled) {
    faults.push(`the picture did not travel (its sides drawn: ${one.carried.join(" and ") || "neither"})`);
  }
  if (carried === "alone" && one.leaving !== "carried-unseen") {
    faults.push(`a cover was drawn twice as it travelled: the one being left moves as "${one.leaving ?? "nothing"}", not carried-unseen`);
  }
  return faults;
}

const sameAddress = (a, b) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

/** A contact sheet of a walk's stills, for looking at. */
async function sheet(ctx, film, name, stills) {
  if (!stills.length) return;
  const page = await ctx.newPage();
  const cells = stills
    .map(({ label, file }) => `<figure><img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}"><figcaption>${label}</figcaption></figure>`)
    .join("");
  await page.setViewportSize({ width: stills.length * 270 + 20, height: 640 });
  await page.setContent(
    `<style>body{margin:10px;background:#3a3a3d;display:flex;gap:10px;font:14px sans-serif;color:#fff}figure{margin:0}img{width:260px;display:block}figcaption{text-align:center;padding:4px}</style>${cells}`,
  );
  await page.screenshot({ path: path.join(film, `${name}-sheet.png`) });
  await page.close();
}

export async function checkRouteMotion({ film = null, scale = 1 } = {}) {
  if (film) fs.mkdirSync(film, { recursive: true });
  const report = [];
  const note = (name, faults, said) => report.push({ name, faults, said });

  // One gathering of the reader's own, to open: a real verse, as the Bible here carries it.
  const verse = JSON.parse(fs.readFileSync(path.resolve("data/bible/john/1.json"), "utf8")).verses.find((v) => v.n === 5);
  const mine = [
    {
      id: "walk-gathering",
      title: "On the light",
      createdAt: 1,
      updatedAt: 1,
      items: [{ id: "walk-line", addedAt: 1, kind: "scripture", text: verse.text, reference: "John 1:5", book: "john", chapter: 1, verse: 5 }],
    },
  ];
  const { browser, ctx, page } = await openPhone({ scale, set: { "purify:florilegia": JSON.stringify(mine) } });
  await ctx.addInitScript(watchTransitions);
  // The books' covers are pictures the apps ask the website for and never
  // carry (lib/readAloud/covers.ts; a council's document is a window onto
  // its council's icon, under /history/media), and the shell here answers
  // nothing from outside the bundle. They are answered from the same files
  // in this checkout, which are what the website serves, as a phone with
  // signal gets them; nothing leaves this machine.
  for (const folder of ["covers", "history/media"]) {
    await ctx.route(`https://purifyapp.net/${folder}/**`, (route) => {
      const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
      if (!file.startsWith(path.resolve("public", folder)) || !fs.existsSync(file)) return route.abort();
      return route.fulfill({ status: 200, contentType: file.endsWith(".avif") ? "image/avif" : "image/jpeg", body: fs.readFileSync(file) });
    });
  }
  const chevron = 'button[aria-label="Back"]:visible, a[aria-label="Back"]:visible';
  try {
    // Forward: Prayers, then one of its pages.
    await go(page, "/prayers/");
    await sleep(page, 900);
    let r = await walk(page, "forward", () => page.locator('a[href^="/prayers/hours"]').first().click(), { film });
    note("forward: a tap into a page", judge(r, { old: "route-leave", fresh: "route-settle", to: "/prayers/hours" }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "forward", r.stills);

    // Back, by the page's own chevron.
    r = await walk(page, "back", () => page.locator(chevron).first().click(), { film });
    note("back: the page's own chevron", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/prayers" }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "back", r.stills);

    // Across: a tab for a tab.
    r = await walk(page, "tab", () => page.locator('[data-tab-bar] a[href^="/discover"]').first().click(), { film });
    note("across: a tab for a tab", judge(r, { old: "route-leave", fresh: "route-arrive", to: "/discover" }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "tab", r.stills);

    // Across: a page for the page beside it (John 3, John 4), with nothing said of it.
    await go(page, "/bible/john/3/");
    await sleep(page, 900);
    r = await walk(page, "beside", () => page.evaluate(() => window.next.router.push("/bible/john/4/")));
    note("across: a chapter for the next", judge(r, { old: "route-leave", fresh: "route-arrive", tabBar: false, to: "/bible/john/4" }), `${r.from} to ${r.to}`);

    // A long list, scrolled: into a saint, and back to the same place.
    await go(page, "/saints/");
    await sleep(page, 1200);
    await page.evaluate(() => window.scrollTo(0, 1400));
    await sleep(page, 500);
    const tapped = await pick(page, 'a[href^="/saints/"]');
    if (!tapped) {
      note("a scrolled list: into a saint", ["no saint on screen to tap"], "");
    } else {
      r = await walk(page, "into", () => page.locator("[data-walk-target]").first().click(), { film });
      const top = await page.evaluate(() => Math.round(window.scrollY));
      const faults = judge(r, { old: "route-leave", fresh: "route-settle", to: tapped.href, carried: true });
      if (top > 2) faults.push(`the saint's page opened ${top}px down, not at its top`);
      note("a scrolled list: into a saint, his icon travelling to the head of his page", faults, `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, "into", r.stills);

      r = await walk(page, "return", () => page.locator(chevron).first().click(), { film });
      const where = await page.evaluate((href) => {
        const a = document.querySelector(`a[href="${href}"]`);
        return a ? Math.round(a.getBoundingClientRect().top) : null;
      }, tapped.href);
      const back = judge(r, { old: "route-sink", fresh: "route-arrive", to: "/saints", carried: true });
      if (where === null) back.push("the saint that was tapped is not on the page that came back");
      else if (Math.abs(where - tapped.top) > 6) back.push(`the saint that was tapped came back at ${where}px, not at ${tapped.top}px where it was`);
      note("a scrolled list: back to the same place, the icon back in its card", back, `${r.from} to ${r.to}, the tapped saint at ${where}px (was ${tapped.top}px)`);
      if (film) await sheet(ctx, film, "return", r.stills);
    }

    // A book (1.9, the owner's yes of 2026-11-10 to a cover at a book's
    // head). The cover tapped in the reading room travels to the head of the
    // page it opens, and back into its tile.
    await go(page, "/reading/");
    await page.waitForSelector("[data-reading-row] li a[href^='/saints/']", { timeout: 20000 }).catch(() => {});
    await sleep(page, 1500);
    // The room opens on the day's book, which fills the first screen: down to
    // Short reads, the first row of covers, which stays where it is when the
    // reader comes back (Continue reading arrives under it). A book of that
    // row whose first chapter is long enough to be left in the middle of.
    const shelf = "[data-reading-row='short'] li a[href^='/saints/']";
    const onShelf = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((a) => a.getAttribute("href")), shelf);
    const leftAt = (href) => {
      try {
        const [saint, work] = href.split("/").filter(Boolean).slice(1);
        const first = JSON.parse(fs.readFileSync(path.resolve("data", "saints", saint, `${work}.json`), "utf8")).sections[0];
        const worded = first.paragraphs.map((p, i) => ({ i, n: p.trim() ? p.trim().split(/\s+/).length : 0 })).filter((w) => w.n > 0 && w.i > 0);
        return worded.length >= 5 ? { saint, work, kept: { sectionN: first.n, paragraph: worded[3].i } } : null;
      } catch {
        return null;
      }
    };
    const nth = onShelf.findIndex((href) => href && !href.includes("#") && leftAt(href));
    /** Marks the book's tile, and says where it stands. */
    const tile = () =>
      page.evaluate(
        ([sel, i]) => {
          const a = document.querySelectorAll(sel)[i];
          if (!a) return null;
          document.querySelectorAll("[data-walk-target]").forEach((el) => el.removeAttribute("data-walk-target"));
          a.setAttribute("data-walk-target", "");
          return { href: a.getAttribute("href"), top: Math.round(a.getBoundingClientRect().top) };
        },
        [shelf, nth],
      );
    if (nth < 0) {
      note("a book: its cover travelling to the head of its page", ["no book in Short reads has a first chapter long enough to be left in the middle of"], "");
    } else {
      await page.evaluate(() => {
        const row = document.querySelector("[data-reading-row='short']");
        window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 200);
      });
      // Into sight, for a book that is a swipe along the row.
      await page.locator(shelf).nth(nth).scrollIntoViewIfNeeded();
      await sleep(page, 900);
      const book = await tile();
      const { saint, work, kept } = leftAt(book.href);

      r = await walk(page, "book", () => page.locator("[data-walk-target]").first().click(), { film });
      const faults = judge(r, { old: "route-leave", fresh: "route-settle", to: book.href, carried: "alone" });
      const head = await page.evaluate(() => {
        const cover = document.querySelector("[data-opening-cover] [data-cover]");
        return cover ? { top: Math.round(cover.getBoundingClientRect().top), page: Math.round(window.scrollY) } : null;
      });
      if (!head) faults.push("the book's page has no cover at its head");
      else if (head.page > 2) faults.push(`the book opened ${head.page}px down, not on its cover`);
      await page.waitForSelector("[data-work-head]", { timeout: 15000 }).catch(() => faults.push("the book's text never came"));
      note("a book: the reading room's cover travelling to the head of its page", faults, `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, "book", r.stills);

      r = await walk(page, "book-back", () => page.locator(chevron).first().click(), { film });
      const again = await tile();
      const back = judge(r, { old: "route-sink", fresh: "route-arrive", to: "/reading", carried: "alone" });
      if (!again || again.href !== book.href) back.push("the cover that was tapped is not on the page that came back");
      else if (Math.abs(again.top - book.top) > 6) back.push(`the cover that was tapped came back at ${again.top}px, not at ${book.top}px where it was`);
      note("a book: back to the reading room, the cover back in its tile", back, `${r.from} to ${r.to}, the tapped cover at ${again?.top}px (was ${book.top}px)`);
      if (film) await sheet(ctx, film, "book-back", r.stills);

      // The same book, left in the middle: a paragraph well down its first
      // chapter, kept as the reader keeps it (lib/reader/position.ts). It
      // opens on its cover, which the tile's picture travels to, and goes
      // down to that paragraph once the page has arrived, not while it is
      // arriving (components/saints/useWorkPlace.ts, useLanding). Not
      // filmed: a film stops the transition, and the wait is by the clock.
      await page.evaluate(
        ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
        [`purify.reader.position.${saint}/${work}`, { ...kept, savedAt: Date.now() }],
      );
      r = await walk(page, "book-kept", () => page.locator("[data-walk-target]").first().click());
      const left = judge(r, { old: "route-leave", fresh: "route-settle", to: book.href, carried: "alone" });
      const during = r.pictured[0]?.scrolled ?? null;
      if (during === null) left.push("the page switch never ended");
      else if (during > 2) left.push(`the page was ${during}px down before it had arrived: it went to the reader's place while the cover was still travelling`);
      // Then it goes: the paragraph stands at the reading place, lit.
      const landed = await page
        .waitForFunction(([n, i]) => window.scrollY > 40 && document.querySelector(`[data-place="${n}:${i}"]`)?.getAttribute("data-focus") === "true", [kept.sectionN, kept.paragraph], { timeout: 6000 })
        .then(() => true)
        .catch(() => false);
      if (!landed) left.push(`the page did not go on to the paragraph the reader left (${kept.sectionN}:${kept.paragraph})`);
      note("a book left in the middle: its cover first, then the reader's paragraph", left, `${r.from} to ${r.to}, the page ${during}px down as it arrived`);
      if (film) {
        await sleep(page, 1400);
        await page.screenshot({ path: path.join(film, "book-kept-there.png") });
      }
      await page.evaluate((key) => localStorage.removeItem(key), `purify.reader.position.${saint}/${work}`);

      // And back from there, the cover far up the page and off the screen:
      // a cover that is not in sight is not flown in from above. The tile
      // arrives with its page, as a picture with nothing behind it does.
      await sleep(page, 2200);
      const away = await page.evaluate(() => {
        const cover = document.querySelector("[data-opening-cover] [data-cover]");
        return cover ? Math.round(cover.getBoundingClientRect().bottom) : null;
      });
      r = await walk(page, "book-read-on-back", () => page.locator(chevron).first().click(), { film });
      const out = judge(r, { old: "route-sink", fresh: "route-arrive", to: "/reading" });
      if (away === null) out.push("the cover was not on the page that was left");
      else if (away > 0) out.push(`the cover was still in sight (its foot at ${away}px), so this did not test a cover off the screen`);
      if (r.pictured[0]?.travelled) out.push("the cover was flown in from off the screen");
      note("a book read on: back to the reading room, with no cover flown in from off the screen", out, `${r.from} to ${r.to}, the cover's foot at ${away}px when it was left`);
      if (film) await sheet(ctx, film, "book-read-on-back", r.stills);
    }

    // A council's document, from its council's shelf: the same.
    await go(page, "/reading/councils/first-nicaea/");
    await page.waitForSelector("[data-council-shelf] a[href^='/councils/']", { timeout: 20000 }).catch(() => {});
    await sleep(page, 1500);
    const decree = await pick(page, "[data-council-shelf] li a[href^='/councils/']");
    if (!decree) {
      note("a council's document: its cover travelling to the head of its page", ["no document on screen to tap on the council's shelf"], "");
    } else {
      r = await walk(page, "council-book", () => page.locator("[data-walk-target]").first().click(), { film });
      const faults = judge(r, { old: "route-leave", fresh: "route-settle", to: decree.href, carried: "alone" });
      if (!(await page.locator("[data-opening-cover] [data-cover]").count())) faults.push("the document's page has no cover at its head");
      note("a council's document: its shelf's cover travelling to the head of its page", faults, `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, "council-book", r.stills);
      r = await walk(page, "council-book-back", () => page.locator(chevron).first().click());
      note("a council's document: back to the shelf, the cover back in its place", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/reading/councils/first-nicaea", carried: "alone" }), `${r.from} to ${r.to}`);
    }

    // The Florilegium (build 89 notes 6 and 12). A starter's tile carries its
    // picture to the head of the page it opens, and back. The Song of the
    // Theotokos, whose icon the apps carry, so there is a picture with no
    // network.
    await go(page, "/florilegium/");
    await sleep(page, 1200);
    r = await walk(page, "starter", () => page.locator('a[data-starter="magnificat"]').first().click(), { film });
    note(
      "a starter: its tile's picture travelling to the head of its page",
      judge(r, { old: "route-leave", fresh: "route-settle", to: "/florilegium/begin/magnificat", carried: true }),
      `${r.from} to ${r.to}`,
    );
    if (film) await sheet(ctx, film, "starter", r.stills);
    r = await walk(page, "starter-back", () => page.locator(chevron).first().click(), { film });
    note("a starter: back, the picture back in its tile", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/florilegium", carried: true }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "starter-back", r.stills);

    // A gathering: in the apps, one page for all of them, which one named in
    // its query. A page of its own, so opening it moves, and so does the way back.
    r = await walk(page, "gathering", () => page.locator("a[data-gathering]").first().click(), { film });
    const opened = judge(r, { old: "route-leave", fresh: "route-settle", to: "/florilegium/gathering" });
    const named = await page.evaluate(() => new URLSearchParams(location.search).get("g"));
    if (named !== "walk-gathering") opened.push(`the gathering named in the address is "${named}", not the one tapped`);
    if (!(await page.locator("[data-gathering-page]").count())) opened.push("the gathering's page did not draw");
    note("a gathering in the apps: a page of its own, so it moves", opened, `${r.from} to ${r.to}?g=${named}`);
    if (film) await sheet(ctx, film, "gathering", r.stills);
    r = await walk(page, "gathering-back", () => page.locator(chevron).first().click());
    note("a gathering: back to the Florilegium", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/florilegium" }), `${r.from} to ${r.to}`);

    // The browser's own Back: the page changes, and nothing is pictured.
    await go(page, "/prayers/");
    await sleep(page, 700);
    await go(page, "/prayers/hours/");
    await sleep(page, 700);
    r = await walk(page, "browser-back", () => page.goBack());
    const own = [];
    if (!sameAddress(r.to, "/prayers")) own.push(`ended on ${r.to}, not /prayers`);
    if (r.pictured.length) own.push(`pictured ${r.pictured.length} transition(s); the browser's own Back is left alone`);
    note("the browser's own Back is not pictured", own, `${r.from} to ${r.to}`);
  } finally {
    await ctx.close();
  }

  // Motion reduced: the same tap, and nothing pictured.
  const still = await openPhone({ scale, set: { "purify.motion": "off" }, browser });
  await still.ctx.addInitScript(watchTransitions);
  try {
    await go(still.page, "/prayers/");
    await sleep(still.page, 900);
    const motion = await still.page.evaluate(() => document.documentElement.dataset.motion);
    const r = await walk(still.page, "reduced", () => still.page.locator('a[href^="/prayers/hours"]').first().click());
    const faults = [];
    if (motion !== "reduce") faults.push(`motion was "${motion}", so this did not test reduced motion`);
    if (!sameAddress(r.to, "/prayers/hours")) faults.push(`ended on ${r.to}, not /prayers/hours`);
    if (r.pictured.length) faults.push(`pictured ${r.pictured.length} transition(s) with motion reduced`);
    note("with motion reduced, nothing is pictured", faults, `${r.from} to ${r.to}`);
  } finally {
    await still.ctx.close();
    await browser.close();
  }
  return report;
}

export function printRouteMotion(report) {
  let ok = true;
  for (const { name, faults, said } of report) {
    console.log(`${faults.length ? "FAIL" : "ok  "}  ${name}${said ? `  (${said})` : ""}`);
    for (const fault of faults) console.log(`        ${fault}`);
    if (faults.length) ok = false;
  }
  console.log(ok ? "Every walk moved as it should." : "A page switch did not move as it should.");
  return ok;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--film");
  const film = at >= 0 ? path.resolve(args[at + 1] ?? "route-film") : null;
  const scaleAt = args.indexOf("--scale");
  const scale = scaleAt >= 0 ? Number(args[scaleAt + 1]) : 1;
  const ok = printRouteMotion(await checkRouteMotion({ film, scale }));
  process.exit(ok ? 0 : 1);
}
