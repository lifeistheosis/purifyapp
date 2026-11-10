// Readers who already answered are asked the new questions once (1.9, his
// 110), walked on the export. The rules are held by
// lib/onboarding/__tests__/askedAgain.test.ts; this reads what such a reader
// is drawn:
//
//   1. a device that finished the earlier questions, with no account: it is
//      greeted "We updated our onboarding" (never the welcome a new visitor
//      gets), walks the new questions, and lands on Today with its steps
//      called "Your next step" and its streak's rope still standing. Opened
//      again, it is asked nothing;
//   2. the same with an account from before: the same greeting, and the
//      reminders asked, since someone is signed in;
//   3. a new visitor still gets the welcome;
//   4. the reader every other walk and picture stands for is asked nothing.
//
// A session shaped like Supabase's is set for the picture only; nothing
// reaches a network.
//
//   npm run build:android, then: node scripts/asked-again-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

const ANSWERED_BEFORE = {
  "purify:onboarded": "3",
  "purify:background": "orthodox",
  "purify:level": "practicing",
  "purify:intent": "prayer",
  "purify:intents": JSON.stringify(["prayer"]),
  "purify:fasting-rule": "modified",
};
const SESSION = JSON.stringify({
  access_token: "picture",
  refresh_token: "picture",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365,
  user: {
    id: "00000000-0000-4000-8000-000000000000",
    email: "reader@example.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { purify_space: { level: "practicing", intent: "prayer", fasting: "modified", v: 3 } },
    created_at: "2026-01-01T00:00:00Z",
  },
});

const results = [];
const say = (ok, what) => {
  results.push(ok);
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};
let browser;
async function phone(set) {
  const opened = await openPhone({ scale: STILLS ? 2 : 1, set, browser });
  browser = opened.browser;
  await opened.page.emulateMedia({ reducedMotion: "reduce" });
  return opened;
}
const dialog = (page) => page.locator('[role="dialog"]').first();
const words = async (page) => (await dialog(page).innerText()).replace(/\s+/g, " ");
const launched = (page) =>
  page
    .waitForFunction(() => {
      const f = document.querySelector("[data-launch-frame]");
      return !f || getComputedStyle(f).display === "none" || Number(getComputedStyle(f).opacity) === 0;
    }, null, { timeout: 30000 })
    .catch(() => {});
const still = async (page, selector, name) => {
  if (!STILLS) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(STILLS, name) });
  say(printMockCheck(await checkMock(page, selector), name), `the house's rules on ${name}`);
};

/** Walk the questions from where they stand to their end; the screens met, in order. */
async function walk(page) {
  const d = dialog(page);
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    if (!(await b.count())) return false;
    await b.click();
    await page.waitForTimeout(900);
    return true;
  };
  const seen = [];
  let last = "";
  for (let i = 0; i < 24; i++) {
    if (!(await d.count())) break;
    const now = await words(page).catch(() => "");
    if (!now) break;
    seen.push(now);
    if (now.includes("Setting up your space")) break;
    const same = now === last;
    last = now;
    if (await tap(/^Begin$/)) continue;
    if (now.includes("A nudge to pray") && (await tap(/^Not now$/))) continue;
    if (same || /Continue with \d/.test(now)) if (await tap(/^Continue/)) continue;
    if (now.includes("Where are you now?") && (await tap(/^Practicing/))) continue;
    if (await tap(/^Continue/)) continue;
    break;
  }
  return seen;
}

// 1 and 2. A reader who answered the earlier questions, with no account and with one.
for (const account of [false, true]) {
  const who = account ? "with an account" : "no account";
  const { ctx, page } = await phone({ ...ANSWERED_BEFORE, ...(account ? { "sb-placeholder-auth-token": SESSION } : {}) });
  await go(page, "/");
  const greeted = await page.getByText("We updated our onboarding").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  say(greeted, `answered before, ${who}: greeted "We updated our onboarding"`);
  say(greeted && !(await words(page)).includes("Welcome to Purify"), `answered before, ${who}: not the welcome a new visitor gets`);
  if (!account) await still(page, '[role="dialog"]', "1-updated.png");
  const seen = await walk(page);
  const asked = (q) => seen.some((s) => s.includes(q));
  say(asked("Where are you coming from?") && asked("What are you looking for?"), `answered before, ${who}: walks the new questions`);
  say(!asked("Carry your prayers on every device"), `answered before, ${who}: no account screen`);
  say(asked("A nudge to pray") === account, account ? "with an account: the reminders are asked" : "no account: no reminders screen");
  say(seen.some((s) => s.includes("Setting up your space")), `answered before, ${who}: the questions end`);
  const card = page.locator("[data-first-step]");
  const up = await card.waitFor({ timeout: 30000 }).then(() => true, () => false);
  await launched(page);
  const cardWords = up ? (await card.innerText()).replace(/\s+/g, " ") : "";
  say(up && /your next step/i.test(cardWords) && !/first week/i.test(cardWords), `answered before, ${who}: Today's card is "Your next step", not a first week`);
  if (!account) {
    const rope = page.getByRole("button", { name: /\bdays?\b/i }).first();
    say((await rope.count()) > 0, "answered before: the streak's rope stands on Today beside the card");
    await still(page, "[data-first-step]", "2-today.png");
  }
  // Opened again: asked nothing.
  await go(page, "/");
  await page.waitForTimeout(2500);
  say((await page.getByText("We updated our onboarding").count()) === 0 && (await page.getByText("Where are you coming from?").count()) === 0, `answered before, ${who}: opened again, asked nothing`);
  say(await page.evaluate(() => window.localStorage.getItem("purify:onboarded") === "4"), `answered before, ${who}: marked as having answered this version`);
  await ctx.close();
}

// 3. A new visitor.
{
  const { ctx, page } = await phone({ "purify:onboarded": "0" });
  await go(page, "/");
  const welcome = await page.getByRole("button", { name: "Begin", exact: true }).waitFor({ timeout: 30000 }).then(() => true, () => false);
  const now = welcome ? await words(page) : "";
  say(now.includes("Welcome to Purify") && !now.includes("We updated our onboarding"), "a new visitor: the welcome, as before");
  await ctx.close();
}

// 4. The reader every walk and picture stands for.
{
  const { ctx, page } = await phone({});
  await go(page, "/");
  await page.waitForTimeout(2500);
  say((await page.locator('[role="dialog"]').count()) === 0, "the walks' own reader: asked nothing");
  await ctx.close();
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
