// The Plus sheet's order (1.9), pictured from the export for his OK before
// it is switched on for readers (lib/onboarding/flags.ts, PLUS_ORDER_LIVE).
// The rules are held by lib/ab/__tests__/tests.test.ts; this reads what is
// drawn when a reader taps a lock: a reading plan's Begin, without Plus.
//
//   - "list", the sheet as it is built: "Purify is kept by those it helps",
//     then the features, the tapped one first;
//   - "working", its second version: the same sheet open straight on that
//     feature working, the list one tap back;
//   - the plans stand at the foot in both;
//   - a reader, not a tester: the sheet as it is built, since the test is shut.
//
// The second version is reached the way an admin reaches it: Testers mode,
// with the version picked. The export has to hold Plus's locks, so it is
// built as the store's is, with Plus enforced and a key to sell it by
// (lib/entitlements/entitlements.ts: no key, no lock). The key here is a
// stand-in; nothing is bought and no store is reached:
//
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
//   node scripts/plus-order-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

/** The Android shell, as far as the app's own check goes: Plus is sold there. */
function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

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
  await opened.ctx.addInitScript(android);
  return opened;
}
const SHEET = '[role="dialog"]';

async function openFromLock(page) {
  await go(page, "/plans/john");
  // The plan's own Begin. Locked, it wears the Plus mark, so its words are "Begin Purify Plus".
  const begin = page.locator("main button").filter({ hasText: "Begin" }).first();
  if (!(await begin.waitFor({ timeout: 30000 }).then(() => true, () => false))) return false;
  // The lock is drawn once the app knows this reader has no Plus.
  await page.waitForTimeout(1500);
  await begin.click();
  const opened = await page.locator(SHEET).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  if (!opened) console.log("  the sheet did not open: was the export built with Plus enforced and a key? (see the head of this file)");
  await page.waitForTimeout(1800);
  return opened;
}
const words = async (page) => (await page.locator(SHEET).first().innerText()).replace(/\s+/g, " ");

for (const [version, pick] of [
  ["list", { "purify:testers": "{}", "purify:ab.pick": JSON.stringify({ "plus-sheet-order": "list" }) }],
  ["working", { "purify:testers": "{}", "purify:ab.pick": JSON.stringify({ "plus-sheet-order": "working" }) }],
  ["a reader", {}],
]) {
  const { ctx, page } = await phone(pick);
  const opened = await openFromLock(page);
  say(opened, `${version}: Begin on a reading plan, without Plus, opens the Plus sheet`);
  if (opened) {
    const now = await words(page);
    const list = now.includes("Purify is kept by those it helps");
    const working = /\bPreview\b/.test(now) && now.includes("Next:");
    if (version === "working") say(working && !list, "working: the sheet opens straight on the feature working, the list one tap back");
    else say(list && !working, `${version}: the sheet opens as it is built, on its list`);
    say(now.includes("Cancel any time"), `${version}: the plans stand at the foot`);
    if (STILLS && version !== "a reader") {
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(STILLS, `sheet-${version}.png`) });
      say(printMockCheck(await checkMock(page, SHEET), `sheet-${version}.png`), `the house's rules on sheet-${version}.png`);
    }
    if (version === "working") {
      // The way back to the list, as from any Try it.
      await page.locator(SHEET).first().getByRole("button", { name: /back/i }).first().click().catch(() => {});
      await page.waitForTimeout(1200);
      say((await words(page)).includes("Purify is kept by those it helps"), "working: one tap back is the list, as built");
    }
  }
  await ctx.close();
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
