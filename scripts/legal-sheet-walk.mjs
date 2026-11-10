// The Terms and the Privacy Policy in a sheet, where a new reader meets them,
// walked on the native export (build 90 note 1; docs/1.9-build/notes/build-90.md).
//
//   npm run build:android && node scripts/legal-sheet-walk.mjs [--shots <dir>]
//
// His report (build 90): on the onboarding's account step ("Carry your prayers
// on every device"), tapping Terms or Privacy Policy showed nothing; the page
// changed beneath the onboarding's layer.
//
// Since the new onboarding (the roads) is lit, an account is offered in one of
// the two versions of the first test (lib/ab/tests.ts, ACCOUNT_PLACE), so the
// walk takes both, each from a first opening:
//
//   end   the account is the last of the questions, and its own line carries
//         Terms and Privacy Policy;
//   card  the questions end without it; once a step of the first week is
//         behind the reader (the walk marks it, as a day's step would), a card
//         on Today offers the account, and its Sign in opens the sign-in page,
//         whose line above the buttons carries the two links.
//
// A walk is automation, which is never put in a test (lib/onboarding/count.ts,
// countingAllowed), so each version is picked as an admin picks one in Testers
// mode (lib/ab/device.ts, purify:ab.pick), as on his phone.
//
// Then, in each, with no signal (nothing outside the app's own bundle answers):
//
//   1. Terms: a sheet over the screen, its text there, scrolled to its end in
//      its own scroll, the page beneath not moved;
//   2. a link inside the Terms to the Privacy Policy shows it in the sheet;
//   3. Close: the sheet goes, and the reader is where they were;
//   4. Privacy Policy, with no signal: it opens, with its text;
//   5. checkMock on the open sheet, in all five palettes;
//   6. Escape closes it, and the reader is still where they were.
//
// --shots <dir> keeps a still of each sheet over each place, at twice the pixels.

import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
const at = process.argv.indexOf("--shots");
const SHOTS = at > 0 ? path.resolve(process.argv[at + 1]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const ACCOUNT_TITLE = en["onboard.account.title"];
const failures = [];
function must(ok, what) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
}

let browser;

/** A first opening, the version picked in Testers mode, and no signal. Set once: a later page keeps what the questions wrote. */
async function firstOpening(version) {
  const opened = await openPhone({ scale: SHOTS ? 2 : 1, browser });
  browser = opened.browser;
  const { ctx, page } = opened;
  await ctx.addInitScript((v) => {
    try {
      if (sessionStorage.getItem("legal-walk")) return;
      sessionStorage.setItem("legal-walk", "1");
      localStorage.removeItem("purify:onboarded");
      localStorage.setItem("purify:testers", "{}");
      localStorage.setItem("purify:ab.pick", JSON.stringify({ "account-place": v }));
    } catch {
      /* no storage: the walk says so below */
    }
  }, version);
  await ctx.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { ctx, page };
}

const dialog = (page) => page.locator('[role="dialog"]').first();
const words = async (page) => ((await dialog(page).innerText().catch(() => "")) || "").replace(/\s+/g, " ");

/** Answer the questions, the first choice wherever one is asked, until `stop` holds; the screens met, in order. */
async function answer(page, stop) {
  const d = dialog(page);
  const seen = [];
  for (let i = 0; i < 30; i++) {
    const now = await words(page);
    if (!now) break;
    if (seen[seen.length - 1] !== now) seen.push(now);
    if (stop(now)) break;
    // The welcome first: whatever else it shows is not a question.
    const begin = d.getByRole("button", { name: /^Begin$/ }).first();
    if (await begin.count()) {
      await begin.click();
      await page.waitForTimeout(900);
      continue;
    }
    // A screen that asks and has no answer yet: the first choice. Some move on by themselves.
    if (!(await d.locator('[aria-pressed="true"]').count()) && (await d.locator("[aria-pressed]").count())) {
      await d.locator("[aria-pressed]").first().click();
      await page.waitForTimeout(700);
      if ((await words(page)) !== now) continue;
    }
    let moved = false;
    for (const name of [/^Begin$/, /^Not now$/, /^Continue/]) {
      const b = d.getByRole("button", { name }).first();
      if ((await b.count()) && (await b.isEnabled().catch(() => false))) {
        await b.click();
        moved = true;
        break;
      }
    }
    if (!moved) break;
    await page.waitForTimeout(900);
  }
  return seen;
}

/** The legal sheet's six checks, from the links in `scope`, for a reader at `place` (`here` says they still are). */
async function legalSheet(page, { place, scope, here, still }) {
  const legalOpen = () => page.locator('[role="dialog"]:has([data-legal-sheet])').count();
  const gone = () => page.locator('[role="dialog"]:has([data-legal-sheet])').first().waitFor({ state: "detached", timeout: 8000 }).catch(() => {});

  // 1. Terms, over the screen.
  const terms = scope.locator('[data-legal-link="terms"]').first();
  must((await terms.count()) > 0, `${place}: the Terms link is there`);
  if (!(await terms.count())) return;
  const pageBefore = await page.evaluate(() => ({ path: location.pathname, y: window.scrollY }));
  await terms.click();
  const termsSheet = page.locator(`[role="dialog"][aria-label="${en["ui.termsOfServiceX"]}"]`);
  await termsSheet.waitFor({ timeout: 10000 }).catch(() => {});
  must(await termsSheet.isVisible().catch(() => false), `${place}: Terms opens in a sheet`);
  await page.waitForTimeout(700);
  const onTop = await page.evaluate(() => {
    // The point at the middle of the text on the screen belongs to the sheet, not to what is beneath.
    const text = document.querySelector("[data-legal-sheet]");
    const sheet = text?.closest('[role="dialog"]');
    if (!text || !sheet) return false;
    const r = text.getBoundingClientRect();
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, innerHeight);
    const hit = document.elementFromPoint(r.left + r.width / 2, (top + bottom) / 2);
    return Boolean(hit && sheet.contains(hit));
  });
  must(onTop, `${place}: the sheet stands over the screen (the point at its middle is the sheet's)`);
  await termsSheet.getByText("The terms, plainly.").waitFor({ timeout: 10000 }).catch(() => {});
  must(await termsSheet.getByText("The terms, plainly.").isVisible().catch(() => false), `${place}: its text is there, from its heading`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${still}-terms.png`) });
  const end = await page.evaluate(() => {
    const text = document.querySelector('[data-legal-sheet="terms"]');
    const scroller = text?.parentElement;
    if (!scroller) return null;
    scroller.scrollTop = scroller.scrollHeight;
    return { top: Math.round(scroller.scrollTop), max: Math.round(scroller.scrollHeight - scroller.clientHeight), tall: scroller.scrollHeight };
  });
  await page.waitForTimeout(300);
  must(Boolean(end && end.tall > 3000 && end.top >= end.max - 2), `${place}: it scrolls to its end in its own scroll (${end ? `${end.top} of ${end.max}` : "no scroll"})`);
  const lastSeen = await page.evaluate(() => {
    const text = document.querySelector('[data-legal-sheet="terms"]');
    const paras = text ? [...text.querySelectorAll("p")] : [];
    const last = paras[paras.length - 1];
    if (!last) return false;
    const r = last.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  });
  must(lastSeen, `${place}: its last paragraph is on the screen`);
  const pageDuring = await page.evaluate(() => ({ path: location.pathname, y: window.scrollY }));
  must(pageDuring.path === pageBefore.path && pageDuring.y === pageBefore.y, `${place}: the page beneath has not moved`);

  // 2. The Privacy Policy, from a link inside the Terms.
  // The app's build writes its links with a closing slash ("/privacy/").
  const inner = termsSheet.locator('a[href^="/privacy"]').first();
  if (await inner.count()) {
    await inner.scrollIntoViewIfNeeded();
    await inner.click();
    const shown = page.locator(`[role="dialog"][aria-label="${en["ui.privacyPolicyX"]}"]`);
    await shown.waitFor({ timeout: 8000 }).catch(() => {});
    must(await shown.isVisible().catch(() => false), `${place}: a link inside the Terms shows the Privacy Policy in the sheet`);
    must((await page.evaluate(() => location.pathname)) === pageBefore.path, `${place}: and the page beneath stays where it was`);
  }

  // 3. Close. The sheet's own Close (the backdrop is a button with the same name, out of the tab order).
  await page.locator('[role="dialog"] button[aria-label="Close"]:not([tabindex="-1"])').first().click();
  await gone();
  must((await legalOpen()) === 0, `${place}: Close takes the sheet away`);
  must(await here(), `${place}: and the reader is there still`);

  // 4. The Privacy Policy, with no signal.
  await scope.locator('[data-legal-link="privacy"]').first().click();
  const privacySheet = page.locator(`[role="dialog"][aria-label="${en["ui.privacyPolicyX"]}"]`);
  await privacySheet.waitFor({ timeout: 10000 }).catch(() => {});
  await privacySheet.getByText(en["privacy.h1"]).waitFor({ timeout: 10000 }).catch(() => {});
  must(await privacySheet.getByText(en["privacy.h1"]).isVisible().catch(() => false), `${place}: the Privacy Policy opens with no signal, with its text`);
  await page.waitForTimeout(600);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${still}-privacy.png`) });

  // 5. checkMock on the open sheet.
  const result = await checkMock(page, '[role="dialog"]:has([data-legal-sheet])');
  must(printMockCheck(result, `the Privacy Policy's sheet, ${place}`), `${place}: checkMock passes on the sheet in all five palettes`);

  // 6. Escape closes it alone.
  await page.keyboard.press("Escape");
  await gone();
  must((await legalOpen()) === 0 && (await here()), `${place}: Escape closes the sheet, and the reader is there still`);
}

// ── end: the account as the last question ────────────────────────────────────
{
  const { page } = await firstOpening("end");
  await go(page, "/");
  const begin = page.getByRole("button", { name: en["onboard.welcome.begin"] });
  await begin.waitFor({ timeout: 30000 }).catch(() => {});
  must(await begin.isVisible().catch(() => false), "end: a first opening meets the welcome");
  const seen = await answer(page, (now) => now.includes(ACCOUNT_TITLE));
  const onAccount = () => page.getByText(ACCOUNT_TITLE, { exact: true }).isVisible().catch(() => false);
  must(seen.length > 2 && (await onAccount()), `end: the questions end on the account ("${ACCOUNT_TITLE}"), after ${Math.max(seen.length - 1, 0)} screens`);
  await legalSheet(page, { place: "end, the account question", scope: dialog(page), here: onAccount, still: "1-end" });
  await page.context().close();
}

// ── card: the account on Today, then the sign-in page ───────────────────────
{
  const { page } = await firstOpening("card");
  await go(page, "/");
  const begin = page.getByRole("button", { name: en["onboard.welcome.begin"] });
  await begin.waitFor({ timeout: 30000 }).catch(() => {});
  must(await begin.isVisible().catch(() => false), "card: a first opening meets the welcome");
  const seen = await answer(page, () => false);
  must(!seen.some((s) => s.includes(ACCOUNT_TITLE)), "card: the questions never ask for an account");
  await dialog(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  must((await page.locator('[role="dialog"]').count()) === 0, "card: the questions end, on Today");

  // A step of the first week behind the reader, as a day's step leaves it.
  await page.evaluate(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    localStorage.setItem("purify:week", JSON.stringify({ at: 1, day: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, passed: 0 }));
  });
  await go(page, "/");
  const card = page.locator('[data-road-card="keep-card"]');
  await card.waitFor({ timeout: 20000 }).catch(() => {});
  must(await card.isVisible().catch(() => false), `card: Today offers the account on a card ("${ACCOUNT_TITLE}")`);
  const signIn = card.getByRole("link", { name: en["common.signIn"] });
  if (await signIn.count()) {
    await signIn.click();
    await page.waitForURL(/\/signin/, { timeout: 15000 }).catch(() => {});
  }
  const onSignIn = async () => /^\/signin\/?$/.test(await page.evaluate(() => location.pathname));
  must(await onSignIn(), "card: its Sign in opens the sign-in page");
  const line = page.locator("p:has([data-legal-link])").first();
  await line.waitFor({ timeout: 15000 }).catch(() => {});
  must(await line.isVisible().catch(() => false), "card: the sign-in page's line carries the Terms and the Privacy Policy");
  await legalSheet(page, { place: "card, the sign-in page", scope: line, here: onSignIn, still: "2-card" });
  await page.context().close();
}

await browser?.close();
console.log(failures.length ? `\n${failures.length} failing.` : "\nAll clean.");
process.exit(failures.length ? 1 : 0);
