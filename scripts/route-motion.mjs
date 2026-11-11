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
//             and is one switch still when the page's own script is on its
//             way as the page is first drawn: nothing of the page waits in a
//             boundary of its own to be drawn a beat later and pictured as a
//             second switch (lib/florilegium/gatheringNow.ts); a gathering
//             kept from a starter carries the starter's picture from its row
//             to the head of its page, and back
//   a question's card carries its subject's icon to the head of its own page
//             and back; an error's row its scroll; the Creed's row its book
//             (components/theology/LeafPage.tsx)
//   a book    the cover tapped in the reading room travels to the head of the
//             book's page and back into its tile (components/reading/
//             OpeningCover.tsx); a book left in the middle opens on its cover
//             all the same, and goes down to the reader's paragraph only
//             once the page has arrived; back from there, with the cover far
//             up the page, nothing is flown in from off the screen; a
//             council's document, the same from its council's shelf
//   a page   comes back as the reader left it (build 93 note 1): a
//             council's page where it was left, its row still on the Father
//             he opened (lib/councils/fatherShown.ts), by the chevron and by
//             the phone's Back alike, and never moved to another link that
//             leads where the tapped one did (lib/ui/returnPlace.ts);
//             Prayers back whole, its picture, verse and rule not brought in
//             again (lib/ui/routeMotion.ts, quietEntrance), and where it was
//             left
//   slow      a page that is slow to come shows its outline, and the outline
//             is pictured as the page arriving, in the same one transition;
//             when the page is ready it takes its outline's place with no
//             second transition, under a copy of the outline that fades
//             (lib/ui/outlineLeave.ts), and it is not kept back: React keeps
//             an outline it has shown for 300ms, and the page is in place
//             within a quarter of a second of that or of its own script,
//             whichever is later. Until the week 1.9 was finished this same
//             tap was three transitions, none of which showed anything, and
//             the page 0.6s late (components/nav/RouteTransition.tsx, "The
//             mark asks only while the address is changing")
//   each is over within 350ms
//   the browser's own Back is not pictured (the platform's rule)
//   with motion reduced, nothing is pictured at all, a slow page included
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
    const entry = { from: location.pathname, at: performance.now(), parts: [], tabBar: false, carried: [], travelled: false, leaving: null, apart: [], ready: false, done: false };
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
          // Words that stand on a travelling picture and are pictured apart, over it (Your rule's head, 1.9).
          if (part.includes("(rule-words)") && !entry.apart.includes(part)) entry.apart.push(part);
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

/**
 * `during`, with every script the page asks for meanwhile kept back for `ms`:
 * a page whose own script is still on its way as the page is first drawn, as
 * on a slow phone. The bundle is on the phone, so it is never long; it only
 * has to be longer than React takes to start drawing.
 */
async function withScriptsHeld(page, ms, during) {
  const scripts = "**/_next/static/chunks/*.js";
  let held = 0;
  const hold = async (route) => {
    held += 1;
    await new Promise((done) => setTimeout(done, ms));
    await route.fallback();
  };
  await page.route(scripts, hold);
  try {
    return { ...(await during()), held };
  } finally {
    await page.unroute(scripts, hold);
  }
}
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

/**
 * `during`, with the phone's bar looked at on every frame meanwhile: what it
 * says, whether the name is on show, and on which page, each time one of
 * them changes. A page whose bar is right only a beat after it arrives shows
 * the wrong name for that beat, and a still taken after it sees nothing.
 */
async function watchingBar(page, during) {
  await page.evaluate(() => {
    const seen = (window.__barSeen = []);
    const until = performance.now() + 2500;
    let last = "";
    const look = () => {
      const bar = document.querySelector("[data-mobile-topbar]");
      // A name the bar holds back until the page's own has gone up, or a plain one, always on show.
      const held = bar?.querySelector("[data-topbar-title]");
      const plain = bar?.querySelector("h1");
      const state = {
        path: location.pathname,
        says: (held ?? plain)?.textContent?.trim() ?? "",
        shown: held ? Number(getComputedStyle(held).opacity) > 0.1 : Boolean(plain),
      };
      const said = JSON.stringify(state);
      if (said !== last) seen.push(state);
      last = said;
      if (performance.now() < until) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  const result = await during();
  return { ...result, bar: await page.evaluate(() => window.__barSeen) };
}

/** How long an outline's copy takes to fade over its page (lib/ui/outlineLeave.ts, DISSOLVE_MS; a unit test holds the two together). */
const DISSOLVE_MS = 180;
/** How long React keeps an outline it has shown, whatever else is ready (react-dom, FALLBACK_THROTTLE_MS). */
const REACT_KEEPS_MS = 300;
/** How far past the moment it could first have come a page may arrive: the outline's own picture ending, and the page being drawn. */
const KEPT_BACK_MS = 250;

/**
 * A page that is slow to come: `selector` is tapped, and every script the
 * page asks for is kept back until `ms` after the tap, which is what makes a
 * page slow in the apps (its words are on the phone; its script is what a
 * slow phone is still reading). Says what was pictured, and on every frame
 * whether the outline is in the page and whether a copy of it is.
 */
async function slowWalk(page, selector, ms) {
  await forget(page);
  const from = await pathOf(page);
  const scripts = "**/_next/static/chunks/*.js";
  let tapped = 0;
  let held = 0;
  const gate = async (route) => {
    held += 1;
    while (!tapped) await new Promise((done) => setTimeout(done, 5));
    await new Promise((done) => setTimeout(done, Math.max(0, tapped + ms - Date.now())));
    await route.fallback();
  };
  await page.route(scripts, gate);
  try {
    await page.evaluate(() => {
      const seen = (window.__outlineSeen = { at: performance.now(), frames: [] });
      const until = seen.at + 6000;
      let last = "";
      const look = () => {
        const state = {
          path: location.pathname,
          outline: Boolean(document.querySelector("[data-route-loading]")),
          copy: Boolean(document.querySelector("[data-outline-ghost]")),
        };
        const said = JSON.stringify(state);
        if (said !== last) seen.frames.push({ ms: Math.round(performance.now() - seen.at), ...state });
        last = said;
        if (performance.now() < until) requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    tapped = Date.now();
    await page.locator(selector).first().click();
    await page.waitForFunction((f) => location.pathname !== f, from, { timeout: 15000 }).catch(() => {});
    // Past the page's own arrival, its outline's copy, and any transition a fault would start after them.
    await sleep(page, Math.max(0, tapped + ms + 1700 - Date.now()));
  } finally {
    await page.unroute(scripts, gate);
  }
  return { from, to: await pathOf(page), pictured: await seen(page), frames: await page.evaluate(() => window.__outlineSeen.frames), held, ms };
}

/** What a slow page's walk must have been: `judge`, and what became of the outline. */
function judgeSlow(result, expected) {
  const faults = judge(result, expected);
  const { frames, ms, held } = result;
  const shown = frames.find((f) => f.outline);
  if (!shown) {
    faults.push(`no outline was shown (${held} of the page's scripts were kept back ${ms}ms), so the walk proves nothing`);
    return faults;
  }
  const there = frames.find((f) => f.ms > shown.ms && !f.outline);
  if (!there) {
    faults.push("the page never took its outline's place");
    return faults;
  }
  if (!there.copy) faults.push("the outline was cut away: nothing of it was left over the page as the page took its place");
  else {
    const cleared = frames.find((f) => f.ms > there.ms && !f.copy);
    if (!cleared) faults.push("what was left of the outline was never taken away");
    else if (cleared.ms - there.ms > DISSOLVE_MS + 200) faults.push(`what was left of the outline stood ${cleared.ms - there.ms}ms over the page; it fades in ${DISSOLVE_MS}`);
  }
  const free = Math.max(ms, shown.ms + REACT_KEEPS_MS);
  if (there.ms - free > KEPT_BACK_MS) {
    faults.push(
      `the page was kept back ${there.ms - free}ms: its script was there ${ms}ms after the tap and its outline was shown at ${shown.ms}ms (React keeps one it has shown for ${REACT_KEEPS_MS}ms), so it could have come at ${free}ms, and it came at ${there.ms}ms`,
    );
  }
  return faults;
}

/** A slow walk in a line: when the outline was shown, when the page took its place. */
function saidSlow(result) {
  const shown = result.frames.find((f) => f.outline);
  const there = shown ? result.frames.find((f) => f.ms > shown.ms && !f.outline) : null;
  return `${result.from} to ${result.to}: its script ${result.ms}ms after the tap, its outline at ${shown ? `${shown.ms}ms` : "no time"}, the page at ${there ? `${there.ms}ms` : "no time"}`;
}

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
  // And one kept from a starter and since renamed: it is told by its lines
  // (lib/florilegium/starters.ts, starterOf) and wears the starter's picture.
  // The Song of the Theotokos, whose icon the apps carry.
  const starter = JSON.parse(fs.readFileSync(path.resolve("data/florilegium/starters.json"), "utf8")).starters.find((s) => s.id === "magnificat");
  const sung = JSON.parse(fs.readFileSync(path.resolve(`data/bible/${starter.book}/${starter.chapter}.json`), "utf8")).verses;
  mine.push({
    id: "walk-kept",
    title: "Her song",
    description: "Luke 1:46-55",
    createdAt: 0,
    updatedAt: 0,
    items: starter.lines.map((l) => ({
      id: `walk-kept-${l.verse}`,
      addedAt: 0,
      kind: "scripture",
      text: sung.find((v) => v.n === l.verse).text,
      reference: `Luke ${starter.chapter}:${l.verse}`,
      book: starter.book,
      chapter: starter.chapter,
      verse: l.verse,
    })),
  });
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

    // A page that returns is not brought in again (lib/ui/routeMotion.ts,
    // quietEntrance). Prayers' rule rises 8px into place half a second after
    // the page is there, and until 1.9 it did so again on the way back: the
    // page was moved 8px to meet its link while it was still held low, and
    // was left 8px from where the reader had it once the rule rose. So: the
    // picture, the verse and the rule are whole as the page comes back, and
    // the page is where it was left (a part still on its way is not chased
    // either, lib/ui/returnPlace.ts).
    await page.evaluate(() => window.scrollTo(0, 36));
    await sleep(page, 500);
    const rule = await page.evaluate(() => {
      const a = [...document.links].filter((x) => x.getAttribute("href") === "/prayers/personal/" && x.getClientRects().length)[0];
      return a ? { down: Math.round(window.scrollY), top: Math.round(a.getBoundingClientRect().top), enters: Boolean(a.closest(".prayers-hero-in")) } : null;
    });
    if (!rule) note("Prayers, left by its rule's link: back where it was left", ["the page has no link to the reader's own rule to leave by"], "/prayers/");
    else {
      r = await walk(page, "prayers-rule", () => page.evaluate(() => [...document.links].filter((x) => x.getAttribute("href") === "/prayers/personal/" && x.getClientRects().length)[0].click()));
      const there = judge(r, { old: "route-leave", fresh: "route-settle", to: "/prayers/personal" });
      r = await walk(page, "prayers-rule-back", () => page.locator(chevron).first().click());
      const home = [...there, ...judge(r, { old: "route-sink", fresh: "route-arrive", to: "/prayers" })];
      // The page is back, and its rule's entrance would be a second from over had it begun again.
      const entering = await page.evaluate(() => {
        const parts = [...document.querySelectorAll(".prayers-hero-img, .prayers-hero-in")];
        const playing = parts.flatMap((el) => el.getAnimations().filter((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.animationName ?? "an animation"));
        return { parts: parts.length, playing };
      });
      if (entering.parts < 3) home.push(`the page has ${entering.parts} of its three parts that are brought in, so the walk proves nothing`);
      if (entering.playing.length) home.push(`brought in again on the way back: ${entering.playing.join(", ")}`);
      // Past the rule's own entrance (460ms held, 600ms rising) and the whole of the watch.
      await sleep(page, 2800);
      const now = await page.evaluate(() => {
        const a = [...document.links].filter((x) => x.getAttribute("href") === "/prayers/personal/" && x.getClientRects().length)[0];
        return { down: Math.round(window.scrollY), top: a ? Math.round(a.getBoundingClientRect().top) : null };
      });
      if (!rule.enters) home.push("the link is not in the part of the page that is brought in, so the walk proves nothing");
      if (Math.abs(now.down - rule.down) > 2) home.push(`the page came back ${now.down}px down, and was left ${rule.down}px down`);
      if (now.top === null || Math.abs(now.top - rule.top) > 2) home.push(`the link came back ${now.top}px from the top, and was left ${rule.top}px from it`);
      note("Prayers, left by its rule's link: back whole, not brought in again, and where it was left", home, `${r.from} to ${r.to}, ${now.down}px down (was ${rule.down}px), the link ${now.top}px from the top (was ${rule.top}px)`);
    }
    // Your rule's tile wears the half its page opens on, so its picture
    // travels into the head of that page, and back into the tile (1.9; the
    // arbiter's call of 2026-11-11, "let Your rule's tile wear the half the
    // page will open on (morning or evening), so one picture travels").
    // Until then the tile wore the Pantocrator at every hour, the head the
    // half's own icon, and nothing travelled. Both halves, each chosen as a
    // reader's is: by the rule kept on the device (lib/prayers/myRule.ts,
    // openingPart), so the walk says the same at any hour.
    for (const half of ["evening", "morning"]) {
      await page.evaluate((h) => {
        const names = [{ kind: "names" }];
        localStorage.setItem("purify.prayers.mine", JSON.stringify({ v: 1, morning: h === "morning" ? names : [], evening: h === "evening" ? names : [], minutes: { morning: 0, evening: 0 }, updatedAt: "" }));
        window.dispatchEvent(new CustomEvent("purify:my-rule"));
      }, half);
      await sleep(page, 600);
      const tile = await page.evaluate((h) => {
        for (const el of document.querySelectorAll("[data-walk-tile]")) el.removeAttribute("data-walk-tile");
        const picture = document.querySelector(`a[href="/prayers/personal/"] [data-carry="rule:${h}"]`);
        const a = picture?.closest("a");
        if (!a) return null;
        a.scrollIntoView({ block: "center" });
        a.setAttribute("data-walk-tile", "");
        return { icon: picture.querySelector("img")?.getAttribute("src") ?? "", wears: [...document.querySelectorAll('a[href="/prayers/personal/"] [data-carry]')].map((el) => el.getAttribute("data-carry")) };
      }, half);
      if (!tile) {
        note(`Your rule's tile, the ${half} half: its picture travelling into the head of its page`, [`no tile on Prayers wears the ${half} half's picture`], "/prayers/");
        continue;
      }
      await sleep(page, 500);
      r = await walk(page, `rule-${half}`, () => page.locator("[data-walk-tile]").first().click(), { film });
      const into = judge(r, { old: "route-leave", fresh: "route-settle", to: "/prayers/personal", carried: true });
      const head = await page.evaluate(() => {
        const on = document.querySelector(".rule-head-img[data-on]");
        return {
          part: on?.getAttribute("data-part") ?? null,
          takes: [...document.querySelectorAll("[data-carry-into]")].map((el) => el.getAttribute("data-carry-into")),
          top: Math.round(window.scrollY),
          // The icon under the picture that arrived: whole, and not fading in again now the name is given back.
          icon: on ? { opacity: Number(getComputedStyle(on).opacity), fading: on.getAnimations().filter((a) => a.playState === "running").length } : null,
          titles: [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length).length,
        };
      });
      if (head.part !== half) into.push(`the page opened on its ${head.part} half, and the tile wore the ${half} half`);
      if (head.takes.length !== 1 || head.takes[0] !== `rule:${half}`) into.push(`the head takes ${JSON.stringify(head.takes)}, not the one picture of the ${half} half`);
      if (head.top > 2) into.push(`the page opened ${head.top}px down, not at its top`);
      if (!head.icon || head.icon.opacity < 0.99 || head.icon.fading) into.push(`the head's icon is not simply there once the picture has landed: ${JSON.stringify(head.icon)}`);
      if (head.titles !== 1) into.push(`the page shows ${head.titles} names, not one`);
      // The head's words stand on the picture, and a picture in flight is drawn over the page it arrives on: unless
      // they are pictured apart, over it, the name is covered until the picture lands and then appears at once.
      if (!r.pictured[0]?.apart?.includes("::view-transition-new(rule-words)")) into.push("the head's words are not pictured apart, over the picture arriving under them");
      note(`Your rule's tile, the ${half} half: its picture travelling into the head of its page`, into, `${r.from} to ${r.to}, the tile in ${tile.icon}`);
      if (film) await sheet(ctx, film, `rule-${half}`, r.stills);
      r = await walk(page, `rule-${half}-back`, () => page.locator(chevron).first().click(), { film });
      const out = judge(r, { old: "route-sink", fresh: "route-arrive", to: "/prayers", carried: true });
      if (!r.pictured[0]?.apart?.includes("::view-transition-old(rule-words)")) out.push("the head's words are not pictured apart as the picture leaves from under them");
      note(`Your rule's tile, the ${half} half: back, the picture back in its tile`, out, `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, `rule-${half}-back`, r.stills);
      await sleep(page, 600);
    }
    // The walks after this one meet Prayers as a reader with no rule does.
    await page.evaluate(() => {
      localStorage.removeItem("purify.prayers.mine");
      window.dispatchEvent(new CustomEvent("purify:my-rule"));
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(page, 300);

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

    // A saint whose page opens on a wide picture (1.9, P2; the arbiter's call
    // of 2026-11-11: "where the saint's page shows his icon anywhere, the
    // card's icon flies to it"). The wide picture is another picture, with
    // the name over it, and cannot take the card's icon; until now nothing
    // did, and the icon left with its page. But the page shows his own icon
    // in the box until the wide picture has come, and that icon takes it
    // (components/saints/SaintHeroPicture.tsx). Twice, as a phone meets it:
    // with signal, where the wide picture then comes in over the icon, and
    // must not take it away in mid-flight; and with none, where the icon is
    // what stays.
    for (const [signal, slug] of [["with signal", "john-chrysostom"], ["with no signal", "basil-the-great"]]) {
      const href = `/saints/${slug}/`;
      const none = (route) => route.abort();
      if (signal === "with no signal") await page.route("https://purifyapp.net/covers/saints/**", none);
      await go(page, "/saints/");
      await sleep(page, 1200);
      const card = await page.evaluate((h) => {
        document.querySelectorAll("[data-walk-target]").forEach((el) => el.removeAttribute("data-walk-target"));
        const a = [...document.querySelectorAll(`a[href="${h}"]`)].find((x) => x.querySelector("[data-carry]"));
        if (!a) return null;
        a.scrollIntoView({ block: "center" });
        a.setAttribute("data-walk-target", "");
        return { icon: a.querySelector("[data-carry]").getAttribute("data-carry") };
      }, href);
      if (!card) {
        note(`a saint with a wide picture, ${signal}: his card's icon travelling to his icon`, [`no card for ${href} with an icon on the saints' list`], "/saints/");
        if (signal === "with no signal") await page.unroute("https://purifyapp.net/covers/saints/**", none);
        continue;
      }
      await sleep(page, 800);
      // Every frame of the change, as a reader's phone draws it: is the icon still in flight, and has the wide
      // picture been shown? The film cannot say: it holds the flight still for seconds while the page lives on.
      await page.evaluate(() => {
        const frames = (window.__wideFrames = []);
        const until = performance.now() + 2500;
        const look = () => {
          const flying = document.getAnimations().some((a) => a.effect?.pseudoElement === "::view-transition-group(carried)" && a.playState === "running");
          const wide = document.querySelector("[data-hero-picture]");
          frames.push({ flying, shown: wide?.getAttribute("data-hero-picture") === "shown" });
          if (performance.now() < until) requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      });
      r = await walk(page, `wide-${slug}`, () => page.locator("[data-walk-target]").first().click(), { film });
      const into = judge(r, { old: "route-leave", fresh: "route-settle", to: href, carried: true });
      if (!film) {
        const frames = await page.evaluate(() => window.__wideFrames ?? []);
        const flown = frames.filter((f) => f.flying).length;
        const early = frames.filter((f) => f.flying && f.shown).length;
        if (!flown) into.push("no frame of the icon in flight was seen, so the walk cannot say when the wide picture came");
        if (early) into.push(`the wide picture was shown while the icon was still in flight, for ${early} of its ${flown} frames`);
      }
      // Long enough for the wide picture to have come, or to have failed twice and been given up (2.5s between).
      await sleep(page, signal === "with signal" ? 1800 : 4200);
      const head = await page.evaluate(() => {
        const icon = document.querySelector("[data-hero-stand-in]");
        const wide = document.querySelector("[data-hero-picture]");
        return {
          box: Boolean(document.querySelector('[data-saint-hero="picture"]')),
          takes: [...document.querySelectorAll("[data-carry-into]")].map((el) => el.getAttribute("data-carry-into")),
          icon: icon ? Number(getComputedStyle(icon).opacity) : null,
          wide: wide ? { state: wide.getAttribute("data-hero-picture"), seen: Number(getComputedStyle(wide).opacity) } : null,
          top: Math.round(window.scrollY),
        };
      });
      if (!head.box) into.push("his page did not open on the wide picture's box, so the walk proves nothing");
      // His books' covers take pictures of their own; his card's icon is taken once, and only by his icon.
      const takers = head.takes.filter((k) => k === card.icon).length;
      if (takers !== 1) into.push(`his card's icon (${card.icon}) is taken ${takers} times on his page, not once`);
      if (head.top > 2) into.push(`his page opened ${head.top}px down, not at its top`);
      if (signal === "with signal") {
        if (head.wide?.state !== "shown" || head.wide.seen < 0.99) into.push(`the wide picture has not come in over the icon: ${JSON.stringify(head.wide)}`);
        if (head.icon === null || head.icon > 0.01) into.push(`the icon is still seen under the wide picture (${head.icon})`);
      } else {
        if (head.wide) into.push(`a wide picture is drawn with no signal: ${JSON.stringify(head.wide)}`);
        if (head.icon === null || head.icon < 0.99) into.push(`with no signal the icon is not what stays (${head.icon})`);
      }
      note(`a saint with a wide picture, ${signal}: his card's icon travelling to his icon`, into, `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, `wide-${slug}`, r.stills);
      r = await walk(page, `wide-${slug}-back`, () => page.locator(chevron).first().click(), { film });
      note(`a saint with a wide picture, ${signal}: back, the icon back in his card`, judge(r, { old: "route-sink", fresh: "route-arrive", to: "/saints", carried: true }), `${r.from} to ${r.to}`);
      if (film) await sheet(ctx, film, `wide-${slug}-back`, r.stills);
      if (signal === "with no signal") await page.unroute("https://purifyapp.net/covers/saints/**", none);
      await sleep(page, 500);
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

    // A page comes back as the reader left it (build 93 note 1, the owner on
    // his phone: "when I click back to go back to the first council of Nicaea
    // ... it just randomly places you at the bottom"). St Alexander chosen in
    // the Holy Fathers row and opened by the card. Until 1.9 the row began
    // again at St Athanasius on the way back, so the card that was tapped was
    // gone; the page names St Alexander once more, as a link, deep in its
    // account, that link was taken for the card, and the page came back
    // 3,424px down. Two mends, and both are held here: the row is on the
    // Father he opened when he comes back (lib/councils/fatherShown.ts), and
    // the page is where he left it (lib/ui/returnPlace.ts, which no longer
    // takes one link for another: its own test holds the card that is gone).
    // A little way down the page when it is left, so "where it was" and "the
    // top" are not one answer; by the page's own chevron, and by the phone's
    // Back (the browser's own here, which is not pictured).
    for (const how of ["the page's own chevron", "the phone's Back"]) {
      await go(page, "/councils/first-nicaea/");
      await page.waitForSelector("[data-council-fathers] button", { timeout: 20000 });
      await sleep(page, 1200);
      await page.evaluate(() => window.scrollTo(0, 260));
      await sleep(page, 400);
      await page.locator('[data-council-fathers] button[aria-label="St. Alexander of Alexandria"]').click();
      await sleep(page, 400);
      const left = await page.evaluate(() => ({
        down: Math.round(window.scrollY),
        card: document.querySelector("[data-council-fathers] a")?.getAttribute("href") ?? null,
        // How many links on the page lead where the card does: the card is not the only one.
        same: [...document.links].filter((a) => a.getAttribute("href") === document.querySelector("[data-council-fathers] a")?.getAttribute("href")).length,
      }));
      r = await walk(page, "council-father", () => page.locator("[data-council-fathers] a").first().click());
      const out = judge(r, { old: "route-leave", fresh: "route-settle", to: "/saints/alexander-of-alexandria" });
      if (left.same < 2) out.push(`the page has ${left.same} link to St Alexander, so the walk proves nothing: it needs the card and the one in the account`);
      note("a council: the Father chosen in its row, opened by the card", out, `${r.from} to ${r.to}`);
      r = await walk(page, "council-father-back", () => (how === "the phone's Back" ? page.goBack() : page.locator(chevron).first().click()));
      const back = how === "the phone's Back" ? (r.pictured.length ? [`pictured ${r.pictured.length} transition(s); the browser's own Back is left alone`] : []) : judge(r, { old: "route-sink", fresh: "route-arrive", to: "/councils/first-nicaea" });
      if (!sameAddress(r.to, "/councils/first-nicaea")) back.push(`ended on ${r.to}, not the council's page`);
      // Through the whole of the watch a page is kept under as it comes back (lib/ui/returnPlace.ts, WATCH_FRAMES).
      await sleep(page, 2800);
      const now = await page.evaluate(() => ({ down: Math.round(window.scrollY), card: document.querySelector("[data-council-fathers] a")?.getAttribute("href") ?? null }));
      if (Math.abs(now.down - left.down) > 4) back.push(`the page came back ${now.down}px down, and was left ${left.down}px down`);
      if (now.card !== left.card) back.push(`the row came back on another Father: the card led to ${left.card} and now leads to ${now.card}`);
      note(`a council: back by ${how}, the row still on the Father he opened and the page where it was left`, back, `${r.from} to ${r.to}, ${now.down}px down (was ${left.down}px), the card to ${now.card}`);
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
    r = await walk(page, "gathering", () => page.locator('a[data-gathering="walk-gathering"]').first().click(), { film });
    const opened = judge(r, { old: "route-leave", fresh: "route-settle", to: "/florilegium/gathering" });
    const named = await page.evaluate(() => new URLSearchParams(location.search).get("g"));
    if (named !== "walk-gathering") opened.push(`the gathering named in the address is "${named}", not the one tapped`);
    if (!(await page.locator("[data-gathering-page]").count())) opened.push("the gathering's page did not draw");
    note("a gathering in the apps: a page of its own, so it moves", opened, `${r.from} to ${r.to}?g=${named}`);
    if (film) await sheet(ctx, film, "gathering", r.stills);
    r = await walk(page, "gathering-back", () => page.locator(chevron).first().click());
    note("a gathering: back to the Florilegium", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/florilegium" }), `${r.from} to ${r.to}`);

    // The same gathering on a fresh start, with the page's own script still
    // on its way as the page is first drawn: a new page of the same phone,
    // which has none of the gathering's script yet (the walks above go from
    // page to page inside one, and keep what they have loaded), and every
    // script it asks for after the tap held back. One switch all the same: a
    // bar that waited in a Suspense boundary of its own was drawn a beat
    // after its page, as a stand-in until then, and React pictured its
    // arrival as a second switch (lib/florilegium/gatheringNow.ts).
    const fresh = await ctx.newPage();
    try {
      await go(fresh, "/florilegium/");
      await fresh.waitForSelector('a[data-gathering="walk-gathering"]', { timeout: 20000 });
      await sleep(fresh, 1200);
      r = await withScriptsHeld(fresh, 300, () =>
        watchingBar(fresh, () => walk(fresh, "gathering-late", () => fresh.locator('a[data-gathering="walk-gathering"]').first().click())),
      );
      const late = judge(r, { old: "route-leave", fresh: "route-settle", to: "/florilegium/gathering" });
      if (!r.held) late.push("no script was asked for after the tap, so nothing was late: the walk proved nothing");
      const barSays = await fresh.evaluate(() => document.querySelector("[data-mobile-topbar] [data-topbar-title]")?.textContent?.trim() ?? null);
      if (barSays !== "On the light") late.push(`the bar over the gathering says "${barSays}", not the gathering's own name`);
      // The name reaches the bar after the page (React keeps it until the
      // transition is over). At the top of the page no name is on show in
      // the bar at any frame of that wait, the Florilegium's least of all.
      const over = r.bar.filter((b) => b.path.startsWith("/florilegium/gathering"));
      if (!over.length) late.push("the bar was never looked at over the gathering");
      for (const b of over.filter((b) => b.shown)) late.push(`the bar showed "${b.says}" over the gathering as it arrived`);
      note("a gathering in the apps, its script still on its way: one switch all the same", late, `${r.from} to ${r.to} (${r.held} script${r.held === 1 ? "" : "s"} held 300ms)`);
    } finally {
      await fresh.close();
    }

    // A gathering kept from a starter wears the starter's picture in its row
    // (1.9, F1), and the picture travels to the head of its page, and back.
    r = await walk(page, "kept", () => page.locator('a[data-gathering="walk-kept"]').first().click(), { film });
    const kept = judge(r, { old: "route-leave", fresh: "route-settle", to: "/florilegium/gathering", carried: true });
    if (!(await page.locator('[data-gathering-page="walk-kept"] [data-gathering-picture]').count())) kept.push("the gathering's page has no picture at its head");
    note("a gathering kept from a starter: its row's picture travelling to the head of its page", kept, `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "kept", r.stills);
    r = await walk(page, "kept-back", () => page.locator(chevron).first().click(), { film });
    note("a gathering kept from a starter: back, the picture back in its row", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/florilegium", carried: true }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "kept-back", r.stills);

    // Theology's leaf pages (1.9; components/theology/LeafPage.tsx). A
    // question's card carries its subject's icon to the head of the
    // question's own page, and back into the card; an error's row carries
    // its scroll, and the Creed's row on the hub its book.
    await go(page, "/topics/");
    await sleep(page, 1200);
    r = await walk(page, "topic", () => page.locator('a[data-topic-card="theosis"]').first().click(), { film });
    const question = judge(r, { old: "route-leave", fresh: "route-settle", to: "/topics/theosis", carried: true });
    if (!(await page.locator('[data-leaf-page="topic"] [data-leaf-mark="picture"]').count())) question.push("the question's page has no picture at its head");
    note("a question: its card's icon travelling to the head of its page", question, `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "topic", r.stills);
    r = await walk(page, "topic-back", () => page.locator(chevron).first().click(), { film });
    note("a question: back, the icon back in its card", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/topics", carried: true }), `${r.from} to ${r.to}`);
    if (film) await sheet(ctx, film, "topic-back", r.stills);

    await go(page, "/heresies/");
    await sleep(page, 1200);
    r = await walk(page, "heresy", () => page.locator('a[href^="/heresies/arianism"]').first().click(), { film });
    note(
      "an error: its row's scroll travelling to the head of its page",
      judge(r, { old: "route-leave", fresh: "route-settle", to: "/heresies/arianism", carried: true }),
      `${r.from} to ${r.to}`,
    );
    if (film) await sheet(ctx, film, "heresy", r.stills);
    r = await walk(page, "heresy-back", () => page.locator(chevron).first().click());
    note("an error: back to the list, the scroll back in its row", judge(r, { old: "route-sink", fresh: "route-arrive", to: "/heresies", carried: true }), `${r.from} to ${r.to}`);

    await go(page, "/theology/");
    await sleep(page, 1200);
    r = await walk(page, "creed", () => page.locator('[data-theology-creed] a[href^="/theology/creed"]').first().click());
    note("the Creed: its row's book travelling to the head of its page", judge(r, { old: "route-leave", fresh: "route-settle", to: "/theology/creed", carried: true }), `${r.from} to ${r.to}`);

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

  // A page that is slow to come: first one that is ready while its outline
  // is still arriving, which is the page a picture could keep back, then one
  // that is ready well after. Each on a phone of its own, newly started: on
  // one that has walked the app already the service worker holds every
  // script, nothing is asked for, and no page is slow.
  for (const [ms, when] of [
    [450, "ready while its outline is still arriving"],
    [1100, "ready well after its outline"],
  ]) {
    const fresh = await openPhone({ scale, browser });
    await fresh.ctx.addInitScript(watchTransitions);
    try {
      await go(fresh.page, "/prayers/");
      await sleep(fresh.page, 1200);
      const slow = await slowWalk(fresh.page, '[data-tab-bar] a[href="/discover/"]', ms);
      note(
        `a page that is slow to come, ${when}: its outline arrives as the page, and the page takes its place under it, not kept back`,
        judgeSlow(slow, { old: "route-leave", fresh: "route-arrive", to: "/discover" }),
        saidSlow(slow),
      );
    } finally {
      await fresh.ctx.close();
    }
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

    // And a page that is slow to come: its outline and then the page, each
    // simply there, with nothing left of the outline over the page.
    await go(still.page, "/prayers/");
    await sleep(still.page, 1200);
    const slow = await slowWalk(still.page, '[data-tab-bar] a[href="/discover/"]', 700);
    const quiet = [];
    const shown = slow.frames.find((f) => f.outline);
    if (!sameAddress(slow.to, "/discover")) quiet.push(`ended on ${slow.to}, not /discover`);
    if (!shown) quiet.push(`no outline was shown (${slow.held} of the page's scripts were kept back), so the walk proves nothing`);
    else if (!slow.frames.some((f) => f.ms > shown.ms && !f.outline)) quiet.push("the page never took its outline's place");
    if (slow.pictured.length) quiet.push(`pictured ${slow.pictured.length} transition(s) with motion reduced`);
    if (slow.frames.some((f) => f.copy)) quiet.push("a copy of the outline was left over the page with motion reduced");
    note("with motion reduced, a page that is slow to come is simply there, and so is its outline before it", quiet, saidSlow(slow));
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
