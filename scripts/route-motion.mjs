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
//             (a saint's icon, from the list and to it)
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
    const entry = { from: location.pathname, at: performance.now(), parts: [], tabBar: false, carried: [], ready: false, done: false };
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
          // The travelling picture: its two sides, the card's and the page's.
          if (part === "::view-transition-old(carried)" && !entry.carried.includes("old")) entry.carried.push("old");
          if (part === "::view-transition-new(carried)" && !entry.carried.includes("new")) entry.carried.push("new");
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
  if (carried && !(one.carried.includes("old") && one.carried.includes("new"))) {
    faults.push(`the picture did not travel (its sides pictured: ${one.carried.join(" and ") || "neither"})`);
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

  const { browser, ctx, page } = await openPhone({ scale });
  await ctx.addInitScript(watchTransitions);
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
