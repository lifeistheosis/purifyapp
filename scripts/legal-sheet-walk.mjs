// The Terms and the Privacy Policy in a sheet, walked on the native export
// (build 90 note 1; docs/1.9-build/notes/build-90.md).
//
//   npm run build:android && node scripts/legal-sheet-walk.mjs [--shots <dir>]
//
// His report: on the onboarding's account step ("Carry your prayers on every
// device"), tapping Terms or Privacy Policy showed nothing; the page changed
// beneath the onboarding's layer. This walks his steps on the app's own
// export, with no signal (nothing outside the app answers):
//
//   1. the onboarding, from its welcome to the account step;
//   2. Terms: a sheet over the onboarding, its text there, scrolled to its
//      end in its own scroll, the page beneath not moved;
//   3. a link inside the Terms to the Privacy Policy shows it in the sheet;
//   4. Close: the sheet goes, and the reader is on the account step still;
//   5. Privacy Policy, with no signal: it opens, with its text;
//   6. Escape closes it, and the onboarding stays;
//   7. checkMock on the open sheet, in all five palettes.
//
// --shots <dir> keeps two stills a person can see (the Terms and the Privacy
// Policy over the account step), at twice the pixels.

import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
const at = process.argv.indexOf("--shots");
const SHOTS = at > 0 ? path.resolve(process.argv[at + 1]) : null;

const failures = [];
function must(ok, what) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
}

const { browser, ctx, page } = await openPhone({ scale: SHOTS ? 2 : 1, set: { "purify:testers": "{}" } });
// A first opening: the onboarding is shown (Testers mode starts it at its welcome).
await ctx.addInitScript(() => {
  try {
    localStorage.removeItem("purify:onboarded");
  } catch {
    /* no storage: the walk says so below */
  }
});
// No signal: nothing outside the app's own bundle answers.
await ctx.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());

await go(page, "/");
const begin = page.getByRole("button", { name: en["onboard.welcome.begin"] });
await begin.waitFor({ timeout: 20000 }).catch(() => {});
must(await begin.isVisible().catch(() => false), "the onboarding opens on its welcome");
await begin.click();
const terms = page.locator('[data-legal-link="terms"]').first();
await terms.waitFor({ timeout: 15000 }).catch(() => {});
const onAccount = () => page.getByText(en["onboard.account.title"], { exact: true }).isVisible().catch(() => false);
must(await onAccount(), `on the account step ("${en["onboard.account.title"]}")`);

// 2. Terms, over the onboarding.
const pageBefore = await page.evaluate(() => ({ path: location.pathname, y: window.scrollY }));
await terms.click();
const termsSheet = page.locator(`[role="dialog"][aria-label="${en["ui.termsOfServiceX"]}"]`);
await termsSheet.waitFor({ timeout: 10000 }).catch(() => {});
must(await termsSheet.isVisible().catch(() => false), "Terms opens in a sheet");
await page.waitForTimeout(700);
const onTop = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"] [data-sheet-panel]');
  if (!panel) return false;
  const r = panel.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 200));
  return Boolean(hit && panel.contains(hit));
});
must(onTop, "the sheet stands over the onboarding (the point at its middle is the sheet's)");
await termsSheet.getByText("The terms, plainly.").waitFor({ timeout: 10000 }).catch(() => {});
must(await termsSheet.getByText("The terms, plainly.").isVisible().catch(() => false), "its text is there, from its heading");
if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, "01-legal-sheet-terms.png") });
}
const end = await page.evaluate(() => {
  const words = document.querySelector('[data-legal-sheet="terms"]');
  const scroller = words?.parentElement;
  if (!scroller) return null;
  scroller.scrollTop = scroller.scrollHeight;
  return { top: Math.round(scroller.scrollTop), max: Math.round(scroller.scrollHeight - scroller.clientHeight), tall: scroller.scrollHeight };
});
await page.waitForTimeout(300);
must(Boolean(end && end.tall > 3000 && end.top >= end.max - 2), `it scrolls to its end in its own scroll (${end ? `${end.top} of ${end.max}` : "no scroll"})`);
const lastSeen = await page.evaluate(() => {
  const words = document.querySelector('[data-legal-sheet="terms"]');
  const paras = words ? [...words.querySelectorAll("p")] : [];
  const last = paras[paras.length - 1];
  if (!last) return false;
  const r = last.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
});
must(lastSeen, "its last paragraph is on the screen");
const pageDuring = await page.evaluate(() => ({ path: location.pathname, y: window.scrollY }));
must(pageDuring.path === pageBefore.path && pageDuring.y === pageBefore.y, "the page beneath has not moved");

// 3. The Privacy Policy, from a link inside the Terms.
const inner = termsSheet.locator('a[href="/privacy"]').first();
if (await inner.count()) {
  await inner.scrollIntoViewIfNeeded();
  await inner.click();
  const shown = page.locator(`[role="dialog"][aria-label="${en["ui.privacyPolicyX"]}"]`);
  await shown.waitFor({ timeout: 8000 }).catch(() => {});
  must(await shown.isVisible().catch(() => false), "a link inside the Terms shows the Privacy Policy in the sheet");
  must((await page.evaluate(() => location.pathname)) === pageBefore.path, "and the page beneath stays where it was");
}

// 4. Close: back on the account step.
await page.locator('[role="dialog"] [data-sheet-panel] button[aria-label="Close"]').first().click();
await page.locator('[role="dialog"]').first().waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
must((await page.locator('[role="dialog"]').count()) === 0, "Close takes the sheet away");
must(await onAccount(), "and the reader is on the account step still");

// 5. Privacy Policy, with no signal.
await page.locator('[data-legal-link="privacy"]').first().click();
const privacySheet = page.locator(`[role="dialog"][aria-label="${en["ui.privacyPolicyX"]}"]`);
await privacySheet.waitFor({ timeout: 10000 }).catch(() => {});
await privacySheet.getByText(en["privacy.h1"]).waitFor({ timeout: 10000 }).catch(() => {});
must(await privacySheet.getByText(en["privacy.h1"]).isVisible().catch(() => false), "the Privacy Policy opens with no signal, with its text");
await page.waitForTimeout(600);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "01-legal-sheet-privacy.png") });

// 7. checkMock on the open sheet.
const result = await checkMock(page, '[role="dialog"] [data-sheet-panel]');
must(printMockCheck(result, "the Privacy Policy's sheet"), "checkMock passes on the sheet in all five palettes");

// 6. Escape closes it alone.
await page.keyboard.press("Escape");
await page.locator('[role="dialog"]').first().waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
must((await page.locator('[role="dialog"]').count()) === 0 && (await onAccount()), "Escape closes the sheet, and the onboarding stays on the account step");

await browser.close();
console.log(failures.length ? `\n${failures.length} failing.` : "\nAll clean.");
process.exit(failures.length ? 1 : 0);
