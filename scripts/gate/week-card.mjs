// The gate's probe for the week's card on Today (the owner, 2026-11-22: "a lot of the times it
// doesn't even switch to the screen smoothly"). Two things were measured on the export of main
// that day (docs/plans/onboarding-2.0.md, "A day of the week, worked on"), and this asks both of
// the export in out/:
//
//   1. As Today opens for a new reader with a first week, is the card whole on the screen, its
//      Begin between the top bar's foot and the tab bar's top? It stood under the greeting, its
//      Begin under the tab bar, where a finger opens the Bible.
//   2. On a finger's tap of Begin, with motion on: is the card still on Today when the page's own
//      transition begins, has Today not moved between the tap and that moment, and is the address
//      the step's own? The step was written as taken at the tap, so the card went 4 ms after it
//      and Today jumped before the transition began (lib/onboarding/openStep.ts).
//
// Each reader is new and walks the questions as a finger would (Begin, where they come from,
// Continue, Not yet, one picture card, Continue), on the Android shell. Run from the repository's
// root on the export in out/; writes nothing.
//   node scripts/gate/week-card.mjs [WxH,WxH,...]
import fs from "node:fs";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { asAndroidShell } from "../lib/sells-plus.mjs";

// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SIZES = (process.argv[2] ?? "390x844,360x740").split(",").map((s) => s.split("x").map(Number));
/** Where a reader comes from, and the one card they pick: three roads, three kinds of page. */
const READERS = [
  ["Catholic", "The councils"],
  ["Protestant", "The Gospels"],
  ["Just curious", "Daily quiet"],
];

if (!fs.existsSync(`${OUT}/index.html`)) {
  console.error(`no export in ${OUT}: cut one first (node scripts/gate/export.mjs)`);
  process.exit(1);
}

/** What the page notes of itself from its first moment: the transition, the card, the layout, the address. */
function watch() {
  window.__weekCard = [];
  const note = (what, more) => window.__weekCard.push({ t: performance.now(), what, ...(more || {}) });
  window.__weekCardNote = note;
  const own = document.startViewTransition?.bind(document);
  if (own)
    document.startViewTransition = (update) => {
      note("transition");
      return own(update);
    };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) note("shift", { size: e.value });
    }).observe({ type: "layout-shift", buffered: false });
  } catch {
    // a browser with no such observer: the walk says so below
  }
}

/** The card and its Begin between the bars, as the screen stands. */
function geometry() {
  const drawn = (x) => {
    const r = x.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && x.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const card = document.querySelector("[data-first-step]");
  const begin = card?.querySelector("a");
  if (!card || !begin) return null;
  const ceiling = Math.max(0, ...[...document.querySelectorAll('[data-screen-edge="top"]')].filter(drawn).map((x) => x.getBoundingClientRect().bottom));
  const floor = Math.min(innerHeight, ...[...document.querySelectorAll('[data-screen-edge="bottom"]')].filter(drawn).map((x) => x.getBoundingClientRect().top));
  const c = card.getBoundingClientRect();
  const b = begin.getBoundingClientRect();
  return { top: Math.round(c.top), bottom: Math.round(c.bottom), beginBottom: Math.round(b.bottom), ceiling: Math.round(ceiling), floor: Math.round(floor), href: begin.getAttribute("href"), x: b.left + b.width / 2, y: b.top + b.height / 2, scrollY: Math.round(scrollY) };
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
console.log(`the week's card on Today: ${READERS.length} new readers at ${SIZES.map(([w, h]) => `${w} by ${h}`).join(" and ")}, as a new reader on the Android shell, motion on`);

let faults = 0;
const fault = (why) => {
  faults++;
  console.log(`    NO   ${why}`);
};

for (const [W, H] of SIZES) {
  for (const [from, pick] of READERS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", ...motionOptions("on") });
    await pinMotion(ctx, "on");
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("purify:whatsNewSeen", "99");
      } catch {}
    });
    await ctx.addInitScript(watch);
    await asAndroidShell(ctx);
    await serveLikeTheShell(ctx, OUT, {});
    const page = await ctx.newPage();
    await go(page, "/", { timeout: 30000 });
    const d = page.locator('[role="dialog"]').first();
    await d.waitFor({ state: "visible", timeout: 30000 });
    const answer = async (re) => {
      const b = d.getByRole("button", { name: re }).first();
      await b.waitFor({ state: "visible", timeout: 15000 });
      await b.tap();
      await page.waitForTimeout(1200);
    };
    await answer(/^Begin/);
    await answer(new RegExp(`^${from}`));
    await answer(/^Continue/);
    await answer(/^Not yet/);
    await answer(new RegExp(`^${pick}`));
    await answer(/^Continue with/);
    await page.locator("[data-first-step]").first().waitFor({ state: "visible", timeout: 30000 });
    // The slate passes into Today and the card rises in: read the screen at rest.
    await page.waitForTimeout(3000);

    const g = await page.evaluate(geometry);
    console.log(`  ${W} by ${H}, ${from}, picked ${pick}`);
    if (!g) {
      fault("no card on Today");
      await ctx.close();
      continue;
    }
    // 1. Whole on the screen as Today opens, its Begin clear of the tab bar.
    const whole = g.scrollY === 0 && g.top >= g.ceiling - 1 && g.bottom <= g.floor + 1;
    console.log(`    ${whole ? "ok  " : "    "} as Today opens: the card from ${g.top} to ${g.bottom}, Begin's foot at ${g.beginBottom}, between the top bar's foot at ${g.ceiling} and the tab bar's top at ${g.floor}`);
    if (!whole) fault(g.scrollY !== 0 ? `Today opened scrolled to ${g.scrollY}` : "the card is not whole between the bars as Today opens");

    // 2. A finger on Begin, where it stands.
    const under = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ?? null, [g.x, g.y]);
    if (under !== g.href) fault(`a finger on Begin lands on ${under ?? "something that is no link"}, not on ${g.href}`);
    await page.evaluate(() => {
      window.__weekCard.length = 0;
      new MutationObserver(() => {
        if (!document.querySelector("[data-first-step]") && !window.__weekCard.some((e) => e.what === "gone")) window.__weekCardNote("gone");
      }).observe(document.body, { childList: true, subtree: true });
      document.querySelector("[data-first-step] a").addEventListener("click", () => window.__weekCardNote("tap"), { capture: true });
    });
    await page.touchscreen.tap(g.x, g.y);
    await page.waitForTimeout(3000);
    const log = await page.evaluate(() => window.__weekCard);
    const at = (what) => log.find((e) => e.what === what)?.t ?? null;
    const tap = at("tap");
    const begins = at("transition");
    const gone = at("gone");
    const address = await page.evaluate(() => location.pathname);
    if (tap == null) fault("the tap did not reach Begin");
    else if (begins == null) fault("no transition began: the page changed with a cut");
    else {
      const ms = (t) => Math.round(t - tap);
      const early = log.filter((e) => e.what === "shift" && e.t >= tap && e.t < begins);
      const stayed = gone == null || gone >= begins;
      console.log(`    ${stayed && !early.length ? "ok  " : "    "} from the tap: the transition begins at ${ms(begins)} ms, the card leaves at ${gone == null ? "no moment (it is still there)" : `${ms(gone)} ms`}, Today moved ${early.length ? `${early.length} time${early.length === 1 ? "" : "s"} before it` : "not at all before it"}`);
      if (!stayed) fault(`the card left Today ${ms(begins) - ms(gone)} ms before the page's transition began`);
      if (early.length) fault(`Today moved under the finger before the transition began (${early.map((e) => e.size.toFixed(4)).join(", ")})`);
    }
    const want = g.href.replace(/\/$/, "");
    if (address.replace(/\/$/, "") !== want) fault(`the address is ${address}, not the step's ${g.href}`);
    else console.log(`    ok   the address is the step's own, ${g.href}`);
    await ctx.close();
  }
}

await browser.close();
console.log(faults ? `\nthe week's card: ${faults} fault${faults === 1 ? "" : "s"}` : "\nthe week's card: whole as Today opens, and it stays until its page moves");
process.exit(faults ? 1 : 0);
