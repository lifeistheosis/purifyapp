// Discover's doors, held and moved (1.9, build 95 note 9), walked on the native
// export with real touch (the DevTools protocol's touch events, as the export
// walk's verse gestures use). components/discover/DoorOrder.tsx.
//
// A tap opens a door and a swipe scrolls and lifts nothing; a hold lifts a door
// with one tick; drawn, one click at each change of place and none between; let
// go, the order is kept, across a reload and a visit from Today; the arrange
// sheet's moves, words, focus and restore; reduced motion; Clicks as you scroll
// off; Arabic; and the tablet sizes. Every tick is counted: in this browser the
// app's haptics fall back to navigator.vibrate (@capacitor/haptics' web
// fallback: the lift's light impact is [20], each place's click [10]), which
// the walk records.
//
//   npm run build:android, then:
//   node scripts/door-order-walk.mjs <shots dir>                     the walk
//   node scripts/door-order-walk.mjs <shots dir> --checks            and checkMock with pixels
//   node scripts/door-order-walk.mjs <shots dir> --only-checks [--width 390]
//     checkMock { pixels: true } on Discover at rest, with a door held, and with
//     the arrange sheet open, in English and Arabic, on the five palettes and
//     the looks, at 390, 800 and 1032 (or one width, to run them side by side)
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { checkMock, printMockCheck, PALETTES, LOOKS } from "./mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const ROOT = process.cwd();

const SHOTS = path.resolve(process.argv[2] ?? "shots");
const CHECKS = process.argv.includes("--checks");
const ONLY_CHECKS = process.argv.includes("--only-checks");
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = path.join(ROOT, "out");
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});

let failures = 0;
const must = (ok, what) => {
  console.log(`${ok ? "  ok " : "  NO "} ${what}`);
  if (!ok) failures++;
};

async function phone({ width = 390, height = 844, scale = 1, set = {} } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
  });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    window.__ticks = [];
    Object.defineProperty(Navigator.prototype, "vibrate", {
      configurable: true,
      value(pattern) {
        window.__ticks.push(JSON.stringify(pattern));
        window.dispatchEvent(new CustomEvent("walk:tick"));
        return true;
      },
    });
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...set });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const finger = {
    down: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }),
    to: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }),
    up: () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }),
  };
  return { ctx, page, finger };
}

const order = (page) => page.evaluate(() => [...document.querySelectorAll("[data-door-list] > [data-door]")].map((li) => li.dataset.door));
const shownOrder = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-door-list] > [data-door]")]
      .map((li) => [li.dataset.door, li.getBoundingClientRect().top])
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id),
  );
const centre = (page, id) =>
  page.evaluate((door) => {
    const r = document.querySelector(`[data-door="${door}"]`).getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, id);
const ticks = (page) => page.evaluate(() => window.__ticks.slice());
const clearTicks = (page) => page.evaluate(() => (window.__ticks.length = 0));
const lifted = (page) => page.evaluate(() => document.querySelector("[data-door-list] > [data-lifted]")?.dataset.door ?? null);
const kept = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("purify:discover-order") ?? "null"));

async function openDiscover(page) {
  await go(page, "/discover/");
  await page.waitForSelector("[data-door-list] > [data-door]", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

/** Hold `id` for the hold, then move the finger by `dy` in steps, and let go. Returns what was seen. */
async function holdAndMove(page, finger, id, dy, { step = 8, shot = null, beforeUp = null } = {}) {
  const c = await centre(page, id);
  await clearTicks(page);
  await finger.down(c.x, c.y);
  await page.waitForTimeout(250);
  const early = await lifted(page);
  await page.waitForTimeout(250);
  const atLift = { door: await lifted(page), ticks: await ticks(page) };
  if (shot) await page.screenshot({ path: path.join(SHOTS, `${shot}-1-lifted.png`) });
  let y = c.y;
  const n = Math.round(Math.abs(dy) / step);
  for (let i = 1; i <= n; i++) {
    y = c.y + Math.sign(dy) * i * step;
    await finger.to(c.x, y);
    await page.waitForTimeout(16);
    if (shot && i === Math.round(n * 0.55)) await page.screenshot({ path: path.join(SHOTS, `${shot}-2-moving.png`) });
  }
  await page.waitForTimeout(260);
  if (shot) await page.screenshot({ path: path.join(SHOTS, `${shot}-3-over.png`) });
  if (beforeUp) await beforeUp();
  const seen = { early, atLift, moved: await ticks(page) };
  await finger.up();
  await page.waitForTimeout(450);
  if (shot) await page.screenshot({ path: path.join(SHOTS, `${shot}-4-dropped.png`) });
  return seen;
}

// ── The walk, at a phone's size, motion on ──────────────────────────────

async function walk() {
  console.log("\nDiscover, 390 by 844, motion on, English");
  const { ctx, page, finger } = await phone();
  await openDiscover(page);
  const first = await order(page);
  must(first.length >= 11 && first[0] === "/saints", `the doors in the first order (${first.length})`);
  must((await page.evaluate(() => document.querySelector("[data-motion]")?.getAttribute("data-motion") ?? document.documentElement.dataset.motion)) !== "reduce", "motion is on");

  // A tap opens the door.
  let c = await centre(page, "/reading");
  await finger.down(c.x, c.y);
  await page.waitForTimeout(70);
  await finger.up();
  await page.waitForFunction(() => location.pathname.startsWith("/reading"), null, { timeout: 8000 }).catch(() => {});
  must((await page.evaluate(() => location.pathname)).startsWith("/reading"), "a tap on Reading opens Reading");
  must((await ticks(page)).length === 0, "a tap gives no tick");
  await openDiscover(page);

  // A swipe from a door scrolls the page, and lifts nothing.
  await page.evaluate(() => {
    window.__everLifted = false;
    new MutationObserver(() => {
      if (document.querySelector("[data-door-list] > [data-lifted]")) window.__everLifted = true;
    }).observe(document.querySelector("[data-door-list]"), { attributes: true, subtree: true });
  });
  c = await centre(page, "/councils");
  await clearTicks(page);
  await finger.down(c.x, c.y);
  for (let i = 1; i <= 12; i++) {
    await finger.to(c.x, c.y - i * 22);
    await page.waitForTimeout(16);
  }
  await finger.up();
  await page.waitForTimeout(700);
  const scrolled = await page.evaluate(() => window.scrollY);
  must(scrolled > 100, `a swipe from a door scrolls the page (${scrolled}px)`);
  must(!(await page.evaluate(() => window.__everLifted)), "and lifts nothing");
  must((await ticks(page)).length === 0, "and gives no tick");
  must((await page.evaluate(() => location.pathname)) === "/discover/", "and opens nothing");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // A hold lifts Saints with one tick; moved down past two doors, two clicks; let go, it lands third.
  const seen = await holdAndMove(page, finger, "/saints", 236, { shot: "390" });
  must(seen.early === null, "nothing lifts before the hold's 400ms");
  must(seen.atLift.door === "/saints", "held, Saints lifts");
  must(JSON.stringify(seen.atLift.ticks) === JSON.stringify(["[20]"]), `one tick at the lift (${JSON.stringify(seen.atLift.ticks)})`);
  const clicks = seen.moved.filter((t) => t === "[10]").length;
  must(clicks === 2, `one click at each change of place: 2 places passed, ${clicks} clicks (${JSON.stringify(seen.moved)})`);
  let now = await order(page);
  must(now.indexOf("/saints") === 2, `let go, Saints lands third (${now.slice(0, 4).join(", ")})`);
  must(JSON.stringify(await kept(page)) === JSON.stringify(now), "and the order is kept on the device");
  must((await page.evaluate(() => location.pathname)) === "/discover/", "and the drop opens nothing");
  must(
    (await page.evaluate(() => [...document.querySelectorAll("[data-door-list] > li")].every((li) => !li.style.transform && !li.hasAttribute("data-lifted")))),
    "and nothing is left moved or lifted",
  );
  const shown = await shownOrder(page);
  must(JSON.stringify(shown) === JSON.stringify(now), "what is shown is the order kept");

  // Up again, with one click: Saints back to second.
  const up = await holdAndMove(page, finger, "/saints", -110);
  must(up.moved.filter((t) => t === "[10]").length === 1, `back up one place, one click (${JSON.stringify(up.moved)})`);
  now = await order(page);
  must(now.indexOf("/saints") === 1, `Saints second (${now.slice(0, 3).join(", ")})`);

  // Near the foot of the screen the page comes along with the held door.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const h = await centre(page, "/history");
  const tabs = await page.evaluate(() => document.querySelector("[data-tab-bar]")?.getBoundingClientRect().top ?? innerHeight);
  await finger.down(h.x, h.y);
  await page.waitForTimeout(500);
  for (let y = h.y; y <= tabs - 20; y += 12) {
    await finger.to(h.x, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(900);
  const carried = await page.evaluate(() => window.scrollY);
  must(carried > 60, `held near the tab bar, the page scrolls with it (${carried}px)`);
  await finger.up();
  await page.waitForTimeout(500);
  now = await order(page);
  must(now.indexOf("/history") > 4, `and History lands lower down (${now.indexOf("/history") + 1} of ${now.length})`);

  // The page loaded whole keeps the order, drawn from the first paint (the pre-paint), and moves nothing as the app starts.
  const want = await order(page);
  await page.reload({ waitUntil: "commit" });
  await page.waitForSelector("[data-door-list] > [data-door]", { timeout: 30000 });
  const firstPaint = await shownOrder(page);
  const styled = await page.evaluate(() => !!document.getElementById("door-order-prepaint"));
  await page.waitForTimeout(3000);
  const afterStart = await shownOrder(page);
  must(JSON.stringify(firstPaint) === JSON.stringify(want), `a page loaded whole shows the kept order from its first paint${styled ? " (by the pre-paint)" : ""}`);
  must(JSON.stringify(afterStart) === JSON.stringify(want), "and the same order once the app has started");
  must(JSON.stringify(await order(page)) === JSON.stringify(want), "with the list's own markup in that order");
  must(!(await page.evaluate(() => !!document.getElementById("door-order-prepaint"))), "and the pre-paint's style taken out");

  // Reached by the router from Today: the kept order from the first frame.
  await go(page, "/");
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__firstSeen = null;
    const look = () => {
      const lis = document.querySelectorAll("[data-door-list] > [data-door]");
      if (lis.length && !window.__firstSeen) window.__firstSeen = [...lis].map((li) => li.dataset.door);
    };
    new MutationObserver(look).observe(document.body, { childList: true, subtree: true });
  });
  await go(page, "/discover/");
  await page.waitForSelector("[data-door-list] > [data-door]");
  await page.waitForTimeout(600);
  must(JSON.stringify(await page.evaluate(() => window.__firstSeen)) === JSON.stringify(want), "reached from Today, the doors are drawn in the kept order from the first frame");

  // The arrange sheet: Move down, said aloud, one click; the original order back.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const arrange = page.locator("button", { hasText: "Arrange sections" });
  must((await arrange.count()) === 1, "Arrange sections is under the list");
  await arrange.tap();
  await page.waitForSelector('[role="dialog"] [data-arrange-row]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SHOTS, "390-5-sheet.png") });
  const rows = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] [data-arrange-row]')].map((r) => r.dataset.arrangeRow));
  must(JSON.stringify(rows) === JSON.stringify(want), "the sheet lists the doors in the reader's order");
  must((await page.locator('[role="dialog"] [data-arrange-restore]').count()) === 1, "the way back to the original order is there, as the order is the reader's own");
  const firstRowUp = page.locator('[role="dialog"] [data-arrange-row]').first().locator('[data-move="up"]');
  must(await firstRowUp.isDisabled(), "the first door's Move up is off");
  await clearTicks(page);
  const moving = rows[0];
  await page.locator(`[role="dialog"] [data-arrange-row="${moving}"] [data-move="down"]`).tap();
  await page.waitForTimeout(400);
  const afterMove = await order(page);
  must(afterMove.indexOf(moving) === 1, `Move down takes ${moving} one place down on Discover too`);
  must(JSON.stringify(await ticks(page)) === JSON.stringify(["[10]"]), "with one click");
  const said = await page.evaluate(() => document.querySelector('[role="status"].sr-only')?.textContent ?? "");
  must(/, now 2 of \d+$/.test(said), `and said aloud: "${said}"`);
  // The keyboard stays on the door it moved.
  const focusRow = await page.evaluate(() => document.activeElement?.closest("[data-arrange-row]")?.getAttribute("data-arrange-row") ?? null);
  must(focusRow === moving, `the focus stays on the moved door's row (${focusRow})`);
  await page.locator('[role="dialog"] [data-arrange-restore]').tap();
  await page.waitForTimeout(400);
  must(JSON.stringify(await order(page)) === JSON.stringify(first), "Restore puts back the original order");
  must((await kept(page)) === null, "and keeps no order at all");
  must((await page.locator('[role="dialog"] [data-arrange-restore]').count()) === 0, "and the button goes with nothing left to restore");
  must((await page.evaluate(() => document.querySelector('[role="status"].sr-only')?.textContent)) === "The original order is back.", "said aloud");
  await page.screenshot({ path: path.join(SHOTS, "390-6-sheet-restored.png") });
  await ctx.close();
}

// Reduced motion: no lift, no slide, no glide; the door still follows the finger.
async function stillWalk() {
  console.log("\nDiscover, reduced motion (Settings' motion off)");
  const { ctx, page, finger } = await phone({ set: { "purify.motion": "off" } });
  await openDiscover(page);
  must((await page.evaluate(() => document.documentElement.dataset.motion)) === "reduce", "motion is reduced");
  const c = await centre(page, "/saints");
  await finger.down(c.x, c.y);
  await page.waitForTimeout(500);
  const face = await page.evaluate(() => {
    const li = document.querySelector("[data-door-list] > [data-lifted]");
    const f = li?.querySelector("[data-door-face]");
    return f ? { transform: getComputedStyle(f).transform, transition: getComputedStyle(f).transitionDuration, shadow: getComputedStyle(f, "::after").opacity } : null;
  });
  must(face?.transform === "none", `lifted with no growth (${face?.transform})`);
  must(face?.shadow === "1", "its shadow there at once");
  for (let i = 1; i <= 15; i++) {
    await finger.to(c.x, c.y + i * 8);
    await page.waitForTimeout(16);
  }
  const others = await page.evaluate(() => [...document.querySelectorAll("[data-door-list] > li:not([data-lifted])")].map((li) => getComputedStyle(li).transitionDuration));
  must(others.every((d) => d.split(",").every((x) => parseFloat(x) === 0)), "the doors step aside with no slide");
  const followed = await page.evaluate(() => document.querySelector("[data-door-list] > [data-lifted]")?.style.transform ?? "");
  must(followed.includes("120px"), `the held door still follows the finger (${followed})`);
  await finger.up();
  await page.waitForTimeout(40);
  must(
    (await page.evaluate(() => [...document.querySelectorAll("[data-door-list] > li")].every((li) => !li.style.transform))),
    "let go, it is in its place at once",
  );
  must((await order(page)).indexOf("/saints") === 1, "Saints second");
  await ctx.close();
}

// Clicks as you scroll off: the phone stays still.
async function quietWalk() {
  console.log("\nDiscover, Clicks as you scroll off");
  const { ctx, page, finger } = await phone({ set: { "purify:scroll-clicks": "off" } });
  await openDiscover(page);
  const seen = await holdAndMove(page, finger, "/saints", 236);
  must(seen.atLift.door === "/saints", "the hold still lifts");
  must(seen.moved.length === 0, `and nothing ticks (${JSON.stringify(seen.moved)})`);
  must((await order(page)).indexOf("/saints") === 2, "and the door is moved");
  await ctx.close();
}

// Arabic, and the two tablet sizes.
async function otherWalks() {
  for (const [label, opts] of [
    ["Arabic, 390 by 844", { set: { "CapacitorStorage.purify_locale": "ar" } }],
    ["800 by 1280", { width: 800, height: 1280 }],
    ["1032 by 1376", { width: 1032, height: 1376 }],
  ]) {
    console.log(`\nDiscover, ${label}`);
    const { ctx, page, finger } = await phone(opts);
    await openDiscover(page);
    if (opts.set) must((await page.evaluate(() => document.documentElement.dir)) === "rtl", "the page reads right to left");
    const tag = label.startsWith("Arabic") ? "ar" : String(opts.width);
    const seen = await holdAndMove(page, finger, "/saints", 236, { shot: tag });
    must(seen.atLift.door === "/saints" && JSON.stringify(seen.atLift.ticks) === '["[20]"]', "held, Saints lifts with one tick");
    must(seen.moved.filter((t) => t === "[10]").length === 2, `two places, two clicks (${JSON.stringify(seen.moved)})`);
    must((await order(page)).indexOf("/saints") === 2, "let go, Saints lands third");
    if (opts.set) {
      // The arrange sheet mirrored: the door's name at the start (the right), its arrows at the end.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.locator("button", { has: page.locator("svg") }).filter({ hasText: "ترتيب الأقسام" }).tap();
      await page.waitForSelector('[role="dialog"] [data-arrange-row]');
      await page.waitForTimeout(700);
      const mirrored = await page.evaluate(() => {
        const row = document.querySelector('[role="dialog"] [data-arrange-row]');
        const name = row.querySelector("span").getBoundingClientRect();
        const up = row.querySelector('[data-move="up"]').getBoundingClientRect();
        return name.left > up.left;
      });
      must(mirrored, "the sheet mirrors: each name at the right, its arrows at the left");
      await page.screenshot({ path: path.join(SHOTS, "ar-5-sheet.png") });
    }
    await ctx.close();
  }
}

// checkMock, with pixels, on the five palettes and seventeen looks: resting, lifted, and the sheet.
async function checks() {
  const all = [...PALETTES, ...LOOKS];
  const results = [];
  const only = process.argv.includes("--width") ? Number(process.argv[process.argv.indexOf("--width") + 1]) : null;
  for (const [w, h] of [[390, 844], [800, 1280], [1032, 1376]].filter(([w]) => !only || w === only)) {
    for (const lang of ["en", "ar"]) {
      const set = lang === "ar" ? { "CapacitorStorage.purify_locale": "ar" } : {};
      const { ctx, page, finger } = await phone({ width: w, height: h, set });
      await openDiscover(page);
      const label = `${w} ${lang}`;
      const rest = await checkMock(page, "body", { pixels: true, palettes: all });
      results.push([`${label} resting`, printMockCheck(rest, `Discover resting, ${label}`), rest]);
      const c = await centre(page, "/history");
      await finger.down(c.x, c.y);
      await page.waitForTimeout(500);
      await finger.to(c.x, c.y + 40);
      await page.waitForTimeout(300);
      const held = await checkMock(page, "body", { pixels: true, palettes: all });
      results.push([`${label} lifted`, printMockCheck(held, `Discover with History held, ${label}`), held]);
      await finger.up();
      await page.waitForTimeout(500);
      // The sheet, with the order the reader's own (so the restore shows).
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.locator("[data-door-list] ~ div button").first().tap();
      await page.waitForSelector('[role="dialog"] [data-arrange-row]');
      await page.waitForTimeout(800);
      const sheet = await checkMock(page, '[role="dialog"]', { pixels: true, palettes: all });
      results.push([`${label} sheet`, printMockCheck(sheet, `the arrange sheet, ${label}`), sheet]);
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(SHOTS, `checks${only ? `-${only}` : ""}.json`), JSON.stringify(results.map(([l, ok, r]) => ({ label: l, ok, failures: r.failures, unmeasured: r.unmeasured, allowed: r.allowed })), null, 1));
  for (const [l, ok] of results) must(ok, `checkMock: ${l}`);
}

try {
  if (!ONLY_CHECKS) {
    await walk();
    await stillWalk();
    await quietWalk();
    await otherWalks();
  }
  if (CHECKS || ONLY_CHECKS) await checks();
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
