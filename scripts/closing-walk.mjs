// What closes does not pull the page out from under the finger (1.9, the
// pre-build gate's first rule). The rule and where it was found are in
// lib/ui/keepLength.ts; the unit tests hold the arithmetic
// (lib/ui/__tests__/keepLength.test.ts). This is the check that watches it
// happen: the native export, at three sizes, each thing tapped with a real
// touch, and the thing under the finger measured on every frame for 1.6
// seconds after.
//
//   npm run build:android          (writes out/)
//   node scripts/closing-walk.mjs [folder for stills]
//
// The places, each where it was found or where it is bound to be:
//   What's new   a month's box shut with the reader at its title (the gate's
//                tap walk, 2026-11-11, on the page as it then was: a year's
//                box, its own title pulled 204px; the page is months and
//                their updates since, and the oldest month is walked), and
//                on a wide screen the open month's last update opened and
//                shut again (a phone has the months after it to stand on)
//   the FAQ      its last question opened and shut again
//   Prayers      the prayer book's open chapter shut, the book at the foot of
//                the screen
//   Chants       a tradition chosen under "All chants" (a fresh reader's walk:
//                the row of filters 137px lower)
// and What's new once more with Purify's motion off, which is the same rule
// with nothing to still.
//
// What it holds, at each size:
//   - the thing tapped is where it was on the screen, on every frame (within
//     a pixel and a half, which is rounding);
//   - and the walk proved something: the page, of itself, had grown too
//     short for where the reader stood (what is in it lost more than was
//     below the screen). A place where the page stayed long enough of itself
//     is said, and fails: a check that proves nothing is not a pass.
// And once, on What's new: the length kept is given back as the reader
// scrolls up, with nothing left of it at the top of the page.
//
// Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const stills = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? null;
if (stills) fs.mkdirSync(stills, { recursive: true });
const OUT = path.resolve("out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");

const SIZES = [
  { name: "a small phone", width: 360, height: 740 },
  { name: "a phone", width: 390, height: 844 },
  { name: "a tablet", width: 820, height: 1180 },
];
/** How long the thing under the finger is watched after the tap: longer than the mend's own watch (lib/ui/keepLength.ts, KEEP_WATCH_MS). */
const WATCH_MS = 1600;
/** Still: nearer than this to where it was, on every frame. */
const STILL_PX = 1.5;
/** Where the thing to be tapped is set, down the screen: under the bar at the top, with the foot of the page in reach. */
const SET_AT = 0.4;

const TYPES = { ".avif": "image/avif", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

let failed = 0;
let passed = 0;
const say = (ok, name, detail) => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

/** The app on a screen of this size, as the shells answer it; the website's own pictures from this branch's public/. */
async function open(browser, size, set = {}) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
  });
  await ctx.addInitScript(
    (values) => {
      for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    },
    { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...set },
  );
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
  /** A finger drawn down the screen, which takes the page up. */
  const drawDown = async (x, from, by) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from + (by * step) / 12 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(700);
  };
  return { ctx, page, touch, drawDown };
}

/**
 * Marks the thing to be tapped. `pick` runs in the page and returns the
 * element, or null. Says whether it was found, whether it is open, and its
 * words.
 */
async function mark(page, pick) {
  // As one piece of script, which the page's own rules about script do not stop.
  return page.evaluate(`(() => {
    document.querySelectorAll("[data-closing-walk]").forEach((el) => el.removeAttribute("data-closing-walk"));
    const el = (${pick.toString()})();
    if (!el) return null;
    el.setAttribute("data-closing-walk", "");
    const open = el.tagName === "SUMMARY" ? Boolean(el.parentElement && el.parentElement.open) : el.getAttribute("aria-expanded") === "true";
    return { open, says: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 32) };
  })()`);
}

/** Sets the marked thing `share` of the way down the screen, or as near as the page allows, and says where its middle is. */
async function set(page, share = SET_AT) {
  await page.evaluate((part) => {
    const el = document.querySelector("[data-closing-walk]");
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * part), behavior: "instant" });
  }, share);
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const el = document.querySelector("[data-closing-walk]");
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const under = document.elementFromPoint(x, y);
    return { x, y, top: Math.round(r.top), clear: Boolean(under && (under === el || el.contains(under))) };
  });
}

/** Taps the marked thing and watches it on every frame for WATCH_MS. */
async function tapAndWatch(page, touch, at) {
  const watching = page.evaluate(
    (ms) =>
      new Promise((done) => {
        const el = document.querySelector("[data-closing-walk]");
        const top = () => el.getBoundingClientRect().top;
        const holder = document.querySelector("[data-route-content]");
        // The page's own length: what stands in its holder, whatever the holder has been told to keep.
        const own = () => {
          const boxes = [...(holder?.children ?? [])].map((child) => child.getBoundingClientRect());
          return boxes.length ? Math.round(Math.max(...boxes.map((b) => b.bottom)) - Math.min(...boxes.map((b) => b.top))) : 0;
        };
        const start = top();
        const y0 = window.scrollY;
        const long0 = document.documentElement.scrollHeight;
        const own0 = own();
        const began = performance.now();
        let worst = 0;
        const look = () => {
          if (el.isConnected) worst = Math.max(worst, Math.abs(top() - start));
          if (performance.now() - began < ms) {
            requestAnimationFrame(look);
            return;
          }
          done({
            start: Math.round(start),
            worst: Math.round(worst * 10) / 10,
            y0: Math.round(y0),
            y1: Math.round(window.scrollY),
            long0,
            long1: document.documentElement.scrollHeight,
            own0,
            own1: own(),
            tall: window.innerHeight,
            // What the page is told to keep, as the layout has it: it is said in a stylesheet's rule, not written on the holder.
            kept: holder && Number.parseFloat(getComputedStyle(holder).minHeight) > 0 ? getComputedStyle(holder).minHeight : "",
          });
        };
        requestAnimationFrame(look);
      }),
    WATCH_MS,
  );
  await page.waitForTimeout(80);
  await touch(at.x, at.y);
  return watching;
}

/** What one closing must have been. */
function judge(seen) {
  const faults = [];
  if (seen.worst > STILL_PX) faults.push(`it moved ${seen.worst}px under the finger (it stood ${seen.start}px down the screen)`);
  // The walk proved something only if the page, of itself, had grown too
  // short for where the reader stood: what is in it lost more than was below
  // the screen.
  const lost = seen.own0 - seen.own1;
  const spare = seen.long0 - (seen.y0 + seen.tall);
  if (!(lost > spare + 1)) faults.push(`the page stayed long enough of itself (what is in it went from ${seen.own0}px to ${seen.own1}px, and ${Math.round(spare)}px of it was below the screen), so the walk proves nothing`);
  return faults;
}

const said = (seen) =>
  `it stood ${seen.start}px down the screen and moved ${seen.worst}px; what is in the page went from ${seen.own0}px to ${seen.own1}px${seen.kept ? `, and the page keeps ${Math.round(Number.parseFloat(seen.kept))}px` : ""}${seen.y1 !== seen.y0 ? `; the page was pulled ${seen.y0 - seen.y1}px` : ""}`;

/**
 * One place: the thing is found, opened first if it is shut, set down the
 * screen, shut with a touch and watched.
 */
async function closing(phone, size, name, address, pick, { shot = null, asItStands = false, at: share = SET_AT } = {}) {
  const { page, touch } = phone;
  // From a new start each time: the app's own way to a page it is already on
  // changes nothing, and the last place's boxes would still be as it left them.
  await page.goto("about:blank");
  await go(page, address);
  await page.waitForTimeout(1400);
  let found = await mark(page, pick);
  if (!found) {
    say(false, `${name}, on ${size.name}`, `nothing of that kind on ${address}`);
    return null;
  }
  if (!found.open && !asItStands) {
    // Shut: opened first, as a reader would have, and the page left to follow it.
    const at = await set(page, share);
    await touch(at.x, at.y);
    await page.waitForTimeout(1700);
    found = await mark(page, pick);
    if (!found?.open) {
      say(false, `${name}, on ${size.name}`, `"${found?.says ?? "it"}" did not open, so it could not be shut`);
      return null;
    }
  }
  const at = await set(page, share);
  if (!at.clear) {
    say(false, `${name}, on ${size.name}`, `"${found.says}" was under something at ${Math.round(at.y)}px, so it could not be tapped`);
    return null;
  }
  if (shot && stills) await page.screenshot({ path: path.join(stills, `${shot}-1-before.png`) });
  const seen = await tapAndWatch(page, touch, at);
  if (shot && stills) await page.screenshot({ path: path.join(stills, `${shot}-2-after.png`) });
  const faults = judge(seen);
  say(faults.length === 0, `${name}, on ${size.name}`, faults.length ? faults.join("; ") : said(seen));
  return seen;
}

/** The places. Each `pick` is run in the page as it is written, and returns the thing to tap. */
const PLACES = [
  {
    name: "What's new: the oldest month's box shut at its own title",
    address: "/whats-new/",
    // The outermost boxes are the months; the last of them is the oldest.
    pick: () => [...document.querySelectorAll("details")].filter((d) => !d.parentElement.closest("details")).pop()?.querySelector(":scope > summary") ?? null,
    shot: "whats-new-month",
  },
  {
    name: "What's new: the open month's last update opened and shut again",
    address: "/whats-new/",
    // On a wide screen only. On a phone the months that follow the open one fill the screen under an update that
    // has shut, so the page stays long enough of itself and there is nothing to hold (measured: 182px to spare at
    // 360 by 740, 120px at 390 by 844). On a tablet they do not, and the page would be pulled.
    from: 768,
    // An update is a box inside its month's. One in a month that is shut cannot be reached, whatever it measures.
    pick: () => [...document.querySelectorAll("details[open] > details, details[open] > :not(summary) details")].filter((d) => d.parentElement.closest("details")?.open && !d.parentElement.closest("details").parentElement.closest("details")).pop()?.querySelector(":scope > summary") ?? null,
  },
  {
    name: "the FAQ: its last question opened and shut again",
    address: "/faq/",
    pick: () => [...document.querySelectorAll("details")].pop()?.querySelector(":scope > summary") ?? null,
  },
  {
    name: "Prayers: the prayer book's open chapter shut",
    address: "/prayers/",
    pick: () => document.querySelector('[data-prayer-book] button[aria-expanded="true"]') ?? document.querySelector("[data-prayer-book] button[aria-expanded]"),
    // The book is not the last thing on its page: its title is set just under
    // the bar, which is where a reader has it when the book's foot is the page's.
    at: 0.2,
  },
  {
    name: "Chants: a tradition chosen under All chants",
    address: "/chants/",
    // A chip that is not the one lit: the list under it grows shorter. It
    // opens nothing, so it is tapped as it stands.
    pick: () => [...document.querySelectorAll("button")].find((b) => /^(Serbian|Greek|Arabic|Contemporary)$/.test((b.textContent || "").trim())) || null,
    asItStands: true,
  },
];

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
try {
  for (const size of SIZES) {
    const phone = await open(browser, size);
    try {
      for (const place of PLACES) {
        if (place.from && size.width < place.from) continue;
        await closing(phone, size, place.name, place.address, place.pick, { shot: place.shot && size.width === 390 ? place.shot : null, asItStands: place.asItStands, at: place.at });
      }

      // The length kept is given back as the reader scrolls up, and none of it is left at the top of the page.
      if (size.width === 390) {
        const { page, drawDown } = phone;
        const seen = await closing(phone, size, "What's new again, for what follows", "/whats-new/", PLACES[0].pick);
        if (seen) {
          const length = () =>
            page.evaluate(() => ({
              kept: Number.parseFloat(getComputedStyle(document.querySelector("[data-route-content]")).minHeight) || 0,
              y: Math.round(window.scrollY),
              long: document.documentElement.scrollHeight,
              tall: window.innerHeight,
            }));
          const before = await length();
          await drawDown(size.width / 2, 260, 220);
          const after = await length();
          const faults = [];
          if (!(before.kept > 0)) faults.push("no length was kept, so there was nothing to give back");
          if (!(after.y < before.y - 40)) faults.push(`the page did not go up under the finger (${before.y}px to ${after.y}px)`);
          if (after.kept > 0 && !(after.kept < before.kept - 40)) faults.push(`none of it was given back (${before.kept}px kept, then ${after.kept}px)`);
          if (after.kept > 0 && after.long > after.y + after.tall + 2) faults.push(`what is kept reaches ${after.long - (after.y + after.tall)}px below the screen, where it should have been given back`);
          say(faults.length === 0, "the length kept is given back as the reader scrolls up", faults.length ? faults.join("; ") : `${before.kept}px kept at ${before.y}px down the page, ${after.kept || "none"} at ${after.y}px`);
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
          await page.waitForTimeout(500);
          const top = await length();
          say(top.kept === 0, "and none of it is left at the top of the page", top.kept ? `${top.kept}px still kept` : `the page is its own ${top.long}px`);
        }
      }
    } finally {
      await phone.ctx.close();
    }
  }

  // Purify's motion off: the same rule, with nothing to still.
  const still = await open(browser, SIZES[1], { "purify.motion": "off" });
  try {
    const motion = await (async () => {
      await go(still.page, "/whats-new/");
      return still.page.evaluate(() => document.documentElement.dataset.motion);
    })();
    if (motion !== "reduce") say(false, "with Purify's motion off", `motion was "${motion}", so this did not test it`);
    else await closing(still, SIZES[1], "with Purify's motion off, What's new: the oldest month's box shut at its own title", "/whats-new/", PLACES[0].pick);
  } finally {
    await still.ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not`);
process.exit(failed ? 1 : 0);
