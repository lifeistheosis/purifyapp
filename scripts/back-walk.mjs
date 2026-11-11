// Back puts the reader where their thumb was, on a page that has changed
// since they left it (1.9, the pre-build gate: "Back that does not return to
// where the reader was"). The rule and where it was found are in
// lib/ui/returnPlace.ts; the unit tests hold the arithmetic
// (lib/ui/__tests__/returnPlace.test.ts). This is the check that watches it
// happen: the native export, a new reader, each link tapped with a real
// touch, and the tapped link measured in every frame for three seconds after
// Back, as that frame is about to be painted.
//
//   npm run build:android          (writes out/)
//   node scripts/back-walk.mjs [folder for stills]
//
// The places, each where the gate's tap walk found it (2026-11-11):
//   the reading room   a book in a shelf below "Continue reading" and
//                      "Because you read", which the room draws once a work
//                      has been opened: two new shelves above the book, and a
//                      new link to it on the first of them
//                      and a book in "Short reads", above them, which nothing
//                      moves: it has to stay where it was too
//   the Bible's list   a book's row (the first, one in the middle, the last);
//                      the list draws a "Continue reading" row above the
//                      books once a chapter has been opened
//   the Plus page      "Sign in to continue" at its foot. Nothing is drawn
//                      above it; the page brings itself in over a second
//                      (18px low, then rising), and the helper used to wait
//                      for that before it looked, with the page at its top:
//                      the gate's walk saw the top for 2.5s and then a jump.
//                      Walked on an export that sells Plus, as the Android
//                      shell, which is where that link is drawn
// Each is come back to by the browser's own Back (a browser's button, and
// what the gate's walk does), which is not pictured. The reading room and
// the Bible's list are come back to by the page's own Back button as well,
// which is pictured, and is the step the phone's Back takes in the apps
// (routeMotion.returnBy). A chapter's round button was a door to the whole
// list until 1.9, and opened it at its top; it returns the reader to their
// row now (lib/nav/readerWay.ts), and is walked both ways it has of doing
// so: by a true step, where the browser can say how far back the list is,
// and, with that taken away as on an iPhone before iOS 26.2, by opening the
// list again as the page behind, where the reader left it.
//
// What it holds:
//   - when the page has come back, the tapped link is where the thumb was,
//     within a pixel and a half;
//   - it was never painted further from there than a row's own entrance
//     carries it (8px, held low and rising): the page is put right before it
//     is shown, not after;
//   - and the walk proved something: the page did grow above the link while
//     the reader was away. Where it did not (the shelf above the new ones)
//     the walk says so, and that place is held only to "it did not move".
//     On the Plus page the proof is that the link was still on its way in
//     when the page came back, and was already in its place.
//
// How a frame is measured. A thing of the walk's own changes size in every
// animation frame, and a ResizeObserver on it is told after that frame's
// layout: when every script of the frame has run, the helper's look among
// them, and before the frame is painted. What it reads is what the frame
// shows. (It was first read in a task posted from the frame, "after the
// paint". Twice in some fifty walks that called a frame painted 75px off.
// Traced, it was the walk: the task of the frame before the step back ran
// late, after the page had come back and the browser had set its own number,
// and before the next frame, in which the helper put the page right before
// anything was painted.)
//
// Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { asAndroidShell, sellsOnAndroid } from "./lib/sells-plus.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const stills = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? null;
if (stills) fs.mkdirSync(stills, { recursive: true });
const OUT = path.resolve("out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");

const PHONE = { name: "a phone", width: 390, height: 844 };
const SMALL = { name: "a small phone", width: 360, height: 740 };
const TABLET = { name: "a tablet", width: 820, height: 1180 };
/** How long the tapped link is watched after Back: through the whole of the helper's own watch (lib/ui/returnPlace.ts, WATCH_FRAMES). */
const WATCH_MS = 3000;
/** Where it was: nearer than this. */
const STILL_PX = 1.5;
/** How far a row's own entrance holds it from its place while it comes in (app/globals.css, --rise-card). */
const RISE_PX = 8;
/** Where the link to be tapped is set, down the screen. */
const SET_AT = 0.5;

const TYPES = { ".avif": "image/avif", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
const CHEVRON = 'button[aria-label="Back"]:visible, a[aria-label="Back"]:visible';

let failed = 0;
let passed = 0;
/** Places that could not be walked on this export, and were said. */
let unwalked = 0;
const say = (ok, name, detail) => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

/**
 * The app on a screen of this size, a new reader past the questions; the
 * website's own pictures from this branch's public/. `shell`: the page is the
 * Android shell, where Plus is sold (scripts/lib/sells-plus.mjs). `older`: a
 * browser that cannot say what is behind the page (no Navigation API, as an
 * iPhone before iOS 26.2).
 */
async function open(browser, size, { shell = false, older = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  });
  if (shell) await asAndroidShell(ctx);
  if (older) await ctx.addInitScript(() => Object.defineProperty(window, "navigation", { value: undefined, configurable: true }));
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route("https://purifyapp.net/**", (route) => {
    const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(path.resolve("public") + path.sep) || !fs.existsSync(file)) return route.abort();
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  /** A finger: down and up at one point, as a phone gives it. */
  const touch = async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(40);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  return { ctx, page, touch };
}

/**
 * The places. `choose` and `again` run in the page: `choose()` answers the
 * link to tap on the page as a new reader finds it; `again(href)` answers
 * that same link on the page that has come back, told by where it stands
 * (its shelf, its list) and never by counting links, which is the helper's
 * own way and so no check of it.
 */
const IN_PAGE = `(a) => a.getClientRects().length > 0 && !a.closest("[data-tab-bar], [data-bible-continue], header, nav")`;
const PLACES = {
  library: {
    name: "the reading room, a book below the two new shelves",
    address: "/reading/",
    wait: "[data-reading-row]",
    // "New to Orthodoxy?": a shelf of whole works after the place the two new ones are drawn. A whole work, so that
    // "Continue reading" leads to the very same address and the page comes back with one link to it more.
    choose: `() => document.querySelector('[data-reading-row="begin"] a[href^="/saints/"], [data-reading-row="begin"] a[href^="/councils/"]')`,
    partOf: `(a) => a.closest("[data-reading-row]")?.getAttribute("data-reading-row") ?? null`,
    again: `(href, part) => document.querySelector('[data-reading-row="' + part + '"] a[href="' + href + '"]')`,
    grows: true,
  },
  short: {
    name: "the reading room, a book above the two new shelves",
    address: "/reading/",
    wait: "[data-reading-row]",
    choose: `() => document.querySelector('[data-reading-row="short"] a[href^="/saints/"], [data-reading-row="short"] a[href^="/councils/"]')`,
    partOf: `() => "short"`,
    again: `(href, part) => document.querySelector('[data-reading-row="' + part + '"] a[href="' + href + '"]')`,
    grows: false,
  },
  ...Object.fromEntries(
    [
      ["genesis", "the first"],
      ["1-kings", "one in the middle"],
      ["revelation", "the last"],
    ].map(([book, which]) => [
      book,
      {
        name: `the Bible's list, a book's row (${which}: ${book})`,
        address: "/bible/",
        wait: `a[href="/bible/${book}/1/"]`,
        choose: `() => [...document.querySelectorAll('a[href="/bible/${book}/1/"]')].find(${IN_PAGE}) ?? null`,
        partOf: `() => "books"`,
        again: `(href) => [...document.querySelectorAll('a[href="' + href + '"]')].find(${IN_PAGE}) ?? null`,
        grows: true,
        // The chapter after the one the row opens, to turn to before leaving by the page's own button.
        turns: `/bible/${book}/2/`,
      },
    ]),
  ),
};

PLACES.plus = {
  name: "the Plus page, the link to sign in at its foot",
  address: "/pricing/",
  wait: 'a[href^="/signin/"]',
  choose: `() => [...document.querySelectorAll('a[href^="/signin/"]')].filter(${IN_PAGE}).pop() ?? null`,
  partOf: `() => "foot"`,
  again: `(href) => [...document.querySelectorAll('a[href="' + href + '"]')].filter(${IN_PAGE}).pop() ?? null`,
  grows: false,
  // Drawn only where Plus is sold, and the page is the Android shell.
  sells: true,
  // The page's own entrance holds everything in it 18px low and then lets it rise (app/globals.css, paywall-in).
  rise: 18,
  arrives: true,
};

const WAYS = {
  browser: { name: "the browser's own Back", back: (page) => page.evaluate(() => history.back()) },
  chevron: { name: "the page's own Back button", back: (page) => page.locator(CHEVRON).first().click() },
  // The same button on a browser that cannot say what is behind the page.
  older: { name: "the page's own Back button, on a browser that cannot say what is behind it", back: (page) => page.locator(CHEVRON).first().click(), older: true },
};

async function walk(browser, size, place, way) {
  const name = `${place.name}: back by ${way.name}, on ${size.name}`;
  if (place.sells && !sellsOnAndroid(OUT)) {
    // Said, and counted as neither: the gate's export sells, and walks it.
    console.log(`not walked  ${name}  (this export does not sell Plus; cut it the gate's way: NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android)`);
    unwalked += 1;
    return;
  }
  const { ctx, page, touch } = await open(browser, size, { shell: Boolean(place.sells), older: Boolean(way.older) });
  try {
    await go(page, place.address);
    await page.waitForSelector(place.wait, { timeout: 20000, state: "attached" }).catch(() => {});
    await page.waitForTimeout(1500);
    // Set the link down the screen, as a reader who has scrolled to it has it.
    const set = await page.evaluate(
      ({ choose, partOf, at }) => {
        const link = new Function(`return (${choose})()`)();
        if (!link) return null;
        link.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
        window.scrollBy({ top: link.getBoundingClientRect().top - innerHeight * at, behavior: "instant" });
        return { href: link.getAttribute("href"), part: new Function("a", `return (${partOf})(a)`)(link) };
      },
      { choose: place.choose, partOf: place.partOf, at: SET_AT },
    );
    if (!set) return say(false, name, "no such link on the page");
    await page.waitForTimeout(600);
    const read = () =>
      page.evaluate(
        ({ again, href, part }) => {
          const link = new Function("href", "part", `return (${again})(href, part)`)(href, part);
          if (!link) return null;
          const r = link.getBoundingClientRect();
          return { top: r.top, x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 30), inPage: r.top + scrollY, down: Math.round(scrollY), long: document.documentElement.scrollHeight, same: [...document.links].filter((a) => a.getAttribute("href") === href).length };
        },
        { again: place.again, href: set.href, part: set.part },
      );
    const before = await read();
    if (!before) return say(false, name, "the link could not be found again on the page it was chosen on");
    if (before.y < 120 || before.y > size.height - 120) return say(false, name, `the link could not be set in sight (it stands ${Math.round(before.y)}px down)`);
    if (stills && way === WAYS.browser && size === PHONE) await page.screenshot({ path: path.join(stills, `${slug(place.name)}-1-the-tap.png`) });
    await touch(before.x, before.y);
    const from = new URL(place.address, "https://localhost").pathname;
    const left = await page.waitForFunction((p) => location.pathname !== p, from, { timeout: 10000 }).then(() => true, () => false);
    if (!left) return say(false, name, "the tap led nowhere");
    // Long enough for the page opened to be kept as the last thing read.
    await page.waitForTimeout(1800);
    const opened = await page.evaluate(() => location.pathname);
    if (way.older && (await page.evaluate(() => typeof window.navigation !== "undefined"))) return say(false, name, "the walk could not take the Navigation API away, so it proves nothing of a browser without it");
    // A chapter turned inside the reader first, where there is one to turn to: one tap must still leave it.
    if (place.turns && way !== WAYS.browser) {
      const turned = await page.evaluate((next) => {
        const a = [...document.links].find((x) => x.getAttribute("href") === next);
        if (!a) return false;
        a.click();
        return true;
      }, place.turns);
      if (!turned) return say(false, name, `the chapter has no link to ${place.turns} to turn by`);
      await page.waitForFunction((p) => location.pathname === p, new URL(place.turns, "https://localhost").pathname, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    // Watch the tapped link in every frame, as the frame is about to be painted, from before the step back is taken.
    await page.evaluate(
      ({ again, href, part, from, ms }) => {
        const seen = (window.__back = { frames: [], began: performance.now(), done: false });
        const find = new Function("href", "part", `return (${again})(href, part)`);
        const tick = document.createElement("div");
        tick.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
        document.body.appendChild(tick);
        const laidOut = new ResizeObserver(() => {
          if (location.pathname !== from) return;
          const link = find(href, part);
          if (link) seen.frames.push([Math.round(performance.now() - seen.began), link.getBoundingClientRect().top]);
        });
        laidOut.observe(tick);
        let wide = false;
        const frame = () => {
          if (performance.now() - seen.began >= ms) {
            laidOut.disconnect();
            tick.remove();
            seen.done = true;
            return;
          }
          wide = !wide;
          tick.style.width = wide ? "2px" : "1px";
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      },
      { again: place.again, href: set.href, part: set.part, from, ms: WATCH_MS + 400 },
    );
    await way.back(page);
    const back = await page.waitForFunction((p) => location.pathname === p, from, { timeout: 10000 }).then(() => true, () => false);
    if (!back) return say(false, name, `Back from ${opened} did not come to ${from} (it is on ${await page.evaluate(() => location.pathname)})`);
    await page.waitForFunction(() => window.__back.done, null, { timeout: WATCH_MS + 5000 });
    const frames = await page.evaluate(() => window.__back.frames);
    const after = await read();
    if (stills && way === WAYS.browser && size === PHONE) await page.screenshot({ path: path.join(stills, `${slug(place.name)}-2-back.png`) });
    if (!after || !frames.length) return say(false, name, "the tapped link was not on the page that came back");

    const faults = [];
    const off = after.top - before.top;
    const grew = Math.round(after.inPage - before.inPage);
    // The frames painted further from the thumb than the link's own entrance holds it.
    const astray = frames.filter(([, top]) => Math.abs(top - before.top) > (place.rise ?? RISE_PX) + STILL_PX);
    let worst = 0;
    for (const [, top] of frames) worst = Math.max(worst, Math.abs(top - before.top));
    if (Math.abs(off) > STILL_PX) faults.push(`the link came back ${Math.round(Math.abs(off))}px ${off > 0 ? "below" : "above"} the thumb (${Math.round(after.top)}px down the screen, tapped at ${Math.round(before.top)}px)`);
    if (astray.length) faults.push(`it was painted ${Math.round(Math.abs(astray[0][1] - before.top))}px from the thumb ${astray[0][0]}ms after Back, for ${astray.length} frame${astray.length === 1 ? "" : "s"}`);
    if (place.grows && grew < 20) faults.push(`the page above the link grew ${grew}px while the reader was away, so the walk proved nothing`);
    // (Not asked of the page's own button after a chapter was turned: the new row then leads to the chapter
    // turned to, not to the row's own, and what that walk proves is the button, which opened the list at its top.)
    if (place.grows && after.same === before.same && !(place.turns && way !== WAYS.browser)) faults.push(`the page has ${after.same} link${after.same === 1 ? "" : "s"} to it, as it had: the helper before this knew it too, so the walk proved nothing`);
    if (!place.grows && Math.abs(grew) > 1) faults.push(`the page above this link changed by ${grew}px: it is no longer the place nothing moves`);
    if (place.arrives && worst < 4) faults.push(`the link was never more than ${Math.round(worst)}px from the thumb, so it was not being brought in as the page came back and the walk proved nothing`);
    say(
      faults.length === 0,
      name,
      faults.length
        ? faults.join("; ")
        : `${place.arrives ? `still ${Math.round(worst)}px low on its way in as the page came back, and the page already in its place; ` : ""}${grew ? `${grew}px drawn above it while away, ` : "nothing drawn above it, "}${before.same} link${before.same === 1 ? "" : "s"} to it before and ${after.same} after; under the thumb again, never more than ${Math.round(worst)}px from it in ${frames.length} frames`,
    );
  } finally {
    await ctx.close();
  }
}

const slug = (words) => words.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "").slice(0, 60);

/** The browser this machine carries, where it has one of its own (as scripts/mock-check.mjs opens it). */
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
try {
  for (const [place, way, size] of [
    [PLACES.library, WAYS.browser, PHONE],
    [PLACES.library, WAYS.chevron, PHONE],
    [PLACES.short, WAYS.browser, PHONE],
    [PLACES["1-kings"], WAYS.browser, PHONE],
    [PLACES["1-kings"], WAYS.chevron, PHONE],
    [PLACES["1-kings"], WAYS.older, PHONE],
    [PLACES.genesis, WAYS.browser, PHONE],
    [PLACES.revelation, WAYS.browser, PHONE],
    [PLACES.library, WAYS.browser, SMALL],
    [PLACES["1-kings"], WAYS.browser, SMALL],
    [PLACES.library, WAYS.browser, TABLET],
    [PLACES["1-kings"], WAYS.browser, TABLET],
    // By the browser's own Back only: the page that link opens, Sign in, has no Back button of its own.
    [PLACES.plus, WAYS.browser, PHONE],
  ]) {
    await walk(browser, size, place, way);
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not${unwalked ? `; ${unwalked} not walked on this export` : ""}`);
process.exit(failed ? 1 : 0);
