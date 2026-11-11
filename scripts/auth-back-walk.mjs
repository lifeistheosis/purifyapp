// The way back out of the sign-in pages, in the apps (1.9; the arbiter's word
// of 2026-11-11 on Fable Theology's finding: "The sign-in page has no Back in
// the apps (an iPhone can leave only by the Purify mark, to Today)").
//
// The rules are held by lib/nav/__tests__/authBack.test.ts; this reads what
// is drawn, on the export, at phone size, with a finger's taps:
//
//   - Sign in, opened from You: the chevron is at the start of the head,
//     named Back, a finger's size; tapped, the reader is back on You, where
//     they were, and the step is pictured as a step back is everywhere
//   - from Sign in to Forgot password and back: one step, to Sign in
//   - Sign in at the bottom of the history (a cold start, as a link from an
//     email leaves it): Back goes to Today, the floor
//   - in Arabic the chevron is at the page's start, which is its right, and
//     points the other way
//   - every page of the group has it
//
//   npm run build:android, then: node scripts/auth-back-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

const results = [];
const say = (ok, what) => {
  results.push(Boolean(ok));
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};

let browser;
async function phone(set = {}) {
  const opened = await openPhone({ scale: STILLS ? 2 : 1, set: { "purify:fasting-rule": "hidden", ...set }, browser });
  browser = opened.browser;
  // What the browser pictured of each page switch: how the page being left and the page arriving moved.
  await opened.ctx.addInitScript(() => {
    const seen = (window.__pictured = []);
    const start = Document.prototype.startViewTransition;
    if (!start) return;
    Document.prototype.startViewTransition = function (arg) {
      const entry = { old: null, fresh: null };
      seen.push(entry);
      const transition = start.call(this, arg);
      transition.ready.then(
        () => {
          for (const a of document.documentElement.getAnimations({ subtree: true })) {
            const part = a.effect?.pseudoElement;
            if (part === "::view-transition-old(root)") entry.old = a.animationName ?? "";
            if (part === "::view-transition-new(root)") entry.fresh = a.animationName ?? "";
          }
        },
        () => {},
      );
      return transition;
    };
  });
  return opened;
}

const BACK = "[data-auth-back]";
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const at = (page) => page.evaluate(() => location.pathname.replace(/\/+$/, "") || "/");
const launched = (page) =>
  page
    .waitForFunction(() => {
      const f = document.querySelector("[data-launch-frame]");
      return !f || getComputedStyle(f).display === "none" || Number(getComputedStyle(f).opacity) === 0;
    }, null, { timeout: 30000 })
    .catch(() => {});

async function still(page, name) {
  if (!STILLS) return;
  await settle(page, 500);
  await page.screenshot({ path: path.join(STILLS, `${name}.png`) });
  say(printMockCheck(await checkMock(page, "header"), `${name}.png`), `the house's rules on ${name}.png`);
}

// ── 1. From You into Sign in, and back to You ───────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, "/");
  await launched(page);
  await go(page, "/account");
  await settle(page, 1500);
  const door = page.locator('a[href^="/signin"]').first();
  say(await door.waitFor({ timeout: 20000 }).then(() => true, () => false), "You: the way to Sign in is there");
  await door.scrollIntoViewIfNeeded();
  await door.tap();
  await page.waitForFunction(() => location.pathname.startsWith("/signin"), null, { timeout: 20000 }).catch(() => {});
  await settle(page);
  say((await at(page)) === "/signin", "it opens Sign in");
  const back = page.locator(BACK);
  say(await back.waitFor({ timeout: 10000 }).then(() => true, () => false), "Sign in has a way back at the top");
  const seen = await back.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const mark = [...document.querySelectorAll("header a")].find((a) => a.getAttribute("href") === "/")?.getBoundingClientRect();
    return { name: el.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), beforeMark: mark ? r.right <= mark.left + 1 : null, svg: el.querySelectorAll("svg").length, text: el.textContent.trim() };
  });
  say(seen.name === "Back", `it is named Back ("${seen.name}")`);
  say(seen.w >= 44 && seen.h >= 44, `a finger's size (${seen.w} by ${seen.h})`);
  say(seen.svg === 1 && seen.text === "", "the house's chevron, drawn, with no typed arrow");
  say(seen.beforeMark === true && seen.left >= 0 && seen.left < 40, `at the start of the head, before the Purify mark (${seen.left}px from the edge)`);
  await still(page, "01-signin-back");
  const before = await page.evaluate(() => window.__pictured.length);
  await back.tap();
  await page.waitForFunction(() => location.pathname.startsWith("/account"), null, { timeout: 15000 }).catch(() => {});
  await settle(page, 1200);
  say((await at(page)) === "/account", "Back returns the reader to You, where they were");
  const moved = await page.evaluate((n) => window.__pictured.slice(n), before);
  say(moved.length === 1 && moved[0].old === "route-sink" && moved[0].fresh === "route-arrive", `the step back is pictured as everywhere: the page left sinks, the page behind arrives (${JSON.stringify(moved)})`);

  // ── 2. Sign in, Forgot password, and one step back ──────────────────────
  await page.locator('a[href^="/signin"]').first().tap();
  await page.waitForFunction(() => location.pathname.startsWith("/signin"), null, { timeout: 20000 }).catch(() => {});
  await settle(page);
  await page.locator('a[href="/forgot/"], a[href="/forgot"]').first().tap();
  await page.waitForFunction(() => location.pathname.startsWith("/forgot"), null, { timeout: 20000 }).catch(() => {});
  await settle(page);
  say((await at(page)) === "/forgot" && (await page.locator(BACK).count()) === 1, "Forgot password has the way back too");
  await page.locator(BACK).tap();
  await page.waitForFunction(() => location.pathname.startsWith("/signin"), null, { timeout: 15000 }).catch(() => {});
  await settle(page);
  say((await at(page)) === "/signin", "one step back from it is Sign in, not Today");
  await ctx.close();
}

// ── 3. At the bottom of the history: Today is the floor ─────────────────────
{
  const { ctx, page } = await phone();
  await page.goto("https://localhost/signin/", { waitUntil: "load" });
  await launched(page);
  await settle(page, 1500);
  const back = page.locator(BACK);
  say(await back.waitFor({ timeout: 15000 }).then(() => true, () => false), "Sign in opened cold, as a link from an email opens it: the way back is there");
  await back.tap();
  await page.waitForFunction(() => location.pathname === "/", null, { timeout: 15000 }).catch(() => {});
  await settle(page, 1200);
  say((await at(page)) === "/", "with nothing of the app behind it, Back goes to Today");
  await ctx.close();
}

// ── 4. Every page of the group ──────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, "/");
  await launched(page);
  for (const p of ["/signup", "/forgot", "/reset", "/set-password"]) {
    await go(page, `${p}/`);
    await settle(page, 1200);
    const there = (await at(page)) === p;
    // A page that sends a reader on at once (no link to act on) is not one to stand on.
    if (!there) {
      console.log(`     ${p} sent the reader on to ${await at(page)}; nothing to stand on there`);
      continue;
    }
    say((await page.locator(BACK).count()) === 1, `${p} has the way back`);
  }
  await ctx.close();
}

// ── 5. In Arabic: at the page's start, pointing the other way ───────────────
{
  const { ctx, page } = await phone({ "CapacitorStorage.purify_locale": "ar" });
  await go(page, "/");
  await launched(page);
  await go(page, "/signin/");
  await settle(page, 1500);
  const back = page.locator(BACK);
  const up = await back.waitFor({ timeout: 15000 }).then(() => true, () => false);
  say(up, "in Arabic, Sign in has the way back");
  if (up) {
    const seen = await back.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const svg = el.querySelector("svg");
      const m = new DOMMatrixReadOnly(getComputedStyle(svg).transform);
      return { dir: document.documentElement.dir, fromRight: Math.round(window.innerWidth - r.right), name: el.getAttribute("aria-label"), flipped: m.a < 0 };
    });
    say(seen.dir === "rtl" && seen.fromRight >= 0 && seen.fromRight < 40, `at the page's start, which is its right (${seen.fromRight}px from the right edge)`);
    say(seen.flipped, "the chevron points the other way");
    say(Boolean(seen.name) && seen.name !== "Back", `named in Arabic ("${seen.name}")`);
    await still(page, "02-signin-back-arabic");
  }
  await ctx.close();
}

await browser?.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} of ${results.length} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
