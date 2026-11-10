// Turning reminders on in the welcome questions, walked on the export
// (build 90, note 2: "turning on notifications doesn't work"; the plan is
// docs/1.9-build/notes/build-90.md, note 2). The unit tests hold the rules
// (lib/push/__tests__/nativeLimits.test.ts); this reads what a reader is
// drawn, on both sets of questions:
//
//   1. the older questions, no account, as the Android app: the sign-in is
//      offered at once, and no button says it turns reminders on;
//   2. the new questions, signed in, on a phone that asks its question and
//      then never gives its address: the button does not stay on "…", the
//      step says it did not work and offers the tap again;
//   3. the same in Testers mode: one more plain line says which wait it was;
//   4. the new questions as a reader with no account (Testers mode's
//      "Preview as signed out"): no reminders step at all.
//
//   5. Today's account card, back from a sign-in, and the reminders in
//      Settings, on the same silent phone: each says it did not work and
//      offers the tap again.
//
// The phone's own code is stood in for (a browser has none): its question is
// answered yes, and its request for an address is left unanswered. A session
// shaped like Supabase's is set for the picture only; nothing reaches a
// network. What a real phone and a real reminder do is the phone walk's
// (docs/PHONE-WALK.md, row 19).
//
//   npm run build:android, then: node scripts/reminders-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

const SESSION = JSON.stringify({
  access_token: "picture",
  refresh_token: "picture",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365,
  user: { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
});
const SIGNED_IN = { "sb-placeholder-auth-token": SESSION };
const AT_REMINDERS = { "purify:onboarded": "0", "purify:onboarding.stage": "reminders" };
const TESTERS = { "purify:testers": "{}" };

/** The Android shell's bridge, with a push plugin that asks and then says nothing. */
function standInPhone() {
  const never = new Promise(() => {});
  window.androidBridge = { postMessage() {} };
  window.Capacitor = {
    getPlatform: () => "android",
    isNativePlatform: () => true,
    PluginHeaders: [
      {
        name: "PushNotifications",
        methods: [
          { name: "checkPermissions", rtype: "promise" },
          { name: "requestPermissions", rtype: "promise" },
          { name: "register", rtype: "promise" },
          { name: "addListener" },
          { name: "removeListener" },
        ],
      },
    ],
    nativePromise: (plugin, method) => {
      if (plugin !== "PushNotifications") return Promise.reject(new Error("not in this walk"));
      if (method === "register") return never;
      return Promise.resolve({ receive: "granted" });
    },
    nativeCallback: () => Promise.resolve("listener"),
  };
}

const results = [];
const say = (ok, what) => {
  results.push(ok);
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};
let browser;
async function phone(set, { android = true } = {}) {
  const opened = await openPhone({ scale: STILLS ? 2 : 1, set, browser });
  browser = opened.browser;
  await opened.page.emulateMedia({ reducedMotion: "reduce" });
  if (android) await opened.ctx.addInitScript(standInPhone);
  return opened;
}
const dialog = (page) => page.locator('[role="dialog"]').first();
const words = async (page) => (await dialog(page).innerText()).replace(/\s+/g, " ");
const buttons = async (page) => (await dialog(page).locator("button, a").allInnerTexts()).map((s) => s.trim()).filter(Boolean);
const still = async (page, name) => {
  if (!STILLS) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(STILLS, name) });
  say(printMockCheck(await checkMock(page, '[role="dialog"]'), name), `the house's rules on ${name}`);
};
const atStep = (page) => page.getByText("A nudge to pray, morning and evening.").first().waitFor({ timeout: 30000 });

// 1. The older questions, no account, as the Android app.
{
  const { ctx, page } = await phone({ "purify:onboarded": "0" });
  await go(page, "/");
  const d = dialog(page);
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    if (!(await b.count())) return false;
    await b.click();
    await page.waitForTimeout(900);
    return true;
  };
  await page.getByRole("button", { name: "Begin", exact: true }).waitFor({ timeout: 30000 });
  let last = "";
  for (let i = 0; i < 20; i++) {
    const now = await words(page);
    if (now.includes("A nudge to pray")) break;
    const same = now === last;
    last = now;
    if (await tap(/^Begin$/)) continue;
    if (await tap(/^Continue without an account/)) continue;
    if (same || /Continue with \d/.test(now)) if (await tap(/^Continue/)) continue;
    if (await tap(/^Catholic$/)) continue;
    if (await tap(/^Completely new/)) continue;
    if (await tap(/^(Scripture|A rule of prayer|The councils)/)) continue;
    if (await tap(/^Continue/)) continue;
    break;
  }
  await atStep(page);
  const b = await buttons(page);
  say(!b.includes("Turn on reminders"), "the older questions, no account: no button says it turns reminders on");
  say(b.includes("Sign in") && (await words(page)).includes("Sign in, and they turn on."), "the older questions, no account: the sign-in is offered at once, with its line");
  say(b.includes("Not now"), "the older questions, no account: Not now is still there");
  await still(page, "1-no-account.png");
  await ctx.close();
}

// 2 and 3. The new questions, signed in, on a phone that never gives its address.
for (const testers of [false, true]) {
  const who = testers ? "a tester" : "a reader";
  const { ctx, page } = await phone({ ...AT_REMINDERS, ...SIGNED_IN, ...(testers ? TESTERS : {}) });
  await go(page, "/");
  await atStep(page);
  say((await buttons(page)).includes("Turn on reminders"), `signed in, ${who}: the button is there`);
  await page.getByRole("button", { name: "Turn on reminders", exact: true }).click();
  const started = Date.now();
  await dialog(page).getByRole("button", { name: "Try again", exact: true }).waitFor({ timeout: 25000 }).catch(() => {});
  const took = Math.round((Date.now() - started) / 1000);
  const b = await buttons(page);
  const now = await words(page);
  say(b.includes("Try again") && took <= 20, `signed in, ${who}: the button did not stay on "…" (${took} s), and the tap is offered again`);
  say(now.includes("Reminders could not be turned on just now."), `signed in, ${who}: the step says it did not work, in a sentence`);
  say(b.includes("Continue"), `signed in, ${who}: Continue is still there`);
  const line = await page.locator("[data-testers-line]").count();
  say(testers ? line === 1 && now.includes("Testers: Google or Apple gave this phone no address") : line === 0, testers ? "a tester is told which wait it was" : "a reader is shown no tester's line");
  await still(page, testers ? "3-failed-tester.png" : "2-failed.png");
  await ctx.close();
}

// 4. The new questions as a reader with no account: no reminders step.
{
  const { ctx, page } = await phone({ "purify:onboarded": "0", ...SIGNED_IN, ...TESTERS, "purify:testers.signedout": "1" });
  await go(page, "/");
  await page.getByRole("button", { name: "Begin", exact: true }).waitFor({ timeout: 30000 });
  const d = dialog(page);
  const seen = [];
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    if (!(await b.count())) return false;
    await b.click();
    await page.waitForTimeout(900);
    return true;
  };
  let last = "";
  for (let i = 0; i < 20; i++) {
    const now = await words(page);
    seen.push(now);
    if (now.includes("Setting up your space") || now.includes("A nudge to pray")) break;
    const same = now === last;
    last = now;
    if (await tap(/^Begin$/)) continue;
    if (same || /Continue with \d/.test(now)) if (await tap(/^Continue/)) continue;
    if (await tap(/^Catholic$/)) continue;
    if (await tap(/^Not yet/)) continue;
    if (await tap(/^(Scripture|A rule of prayer|The councils)/)) continue;
    if (await tap(/^Continue/)) continue;
    break;
  }
  say(seen.some((s) => s.includes("Setting up your space")) && !seen.some((s) => s.includes("A nudge to pray")), "the new questions, no account: they end with no reminders step");
  await ctx.close();
}

// 5. The account card on Today, back from its sign-in, and Settings: the same handling.
{
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const { ctx, page } = await phone({
    "purify:onboarded": "3",
    "purify:firststeps.eligible": "1",
    "purify:background": "catholic",
    "purify:level": "inquirer",
    "purify:fasting-rule": "hidden",
    "purify:week": JSON.stringify({ at: 1, day: today, passed: 0 }),
    "purify:keep": "in",
    ...SIGNED_IN,
    ...TESTERS,
  });
  await go(page, "/");
  const card = page.locator('[data-road-card="keep-card"]');
  await card.waitFor({ timeout: 30000 });
  await page
    .waitForFunction(() => {
      const f = document.querySelector("[data-launch-frame]");
      return !f || getComputedStyle(f).display === "none" || Number(getComputedStyle(f).opacity) === 0;
    }, null, { timeout: 30000 })
    .catch(() => {});
  await card.getByRole("button", { name: "Turn on reminders", exact: true }).click();
  await card.getByRole("button", { name: "Try again", exact: true }).waitFor({ timeout: 25000 }).catch(() => {});
  const now = (await card.innerText()).replace(/\s+/g, " ");
  say(now.includes("Try again") && now.includes("Reminders could not be turned on just now."), "the account card: it says it did not work, and offers the tap again");
  say(now.includes("Testers: Google or Apple gave this phone no address"), "the account card: a tester is told which wait it was");
  if (STILLS) {
    // Clear of the Testers mark, which floats at the foot of the screen.
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(600);
    await card.screenshot({ path: path.join(STILLS, "5-card-failed-tester.png") });
    say(printMockCheck(await checkMock(page, '[data-road-card="keep-card"]'), "5-card-failed-tester.png"), "the house's rules on 5-card-failed-tester.png");
  }
  await ctx.close();
}
{
  const { ctx, page } = await phone({ "purify:onboarded": "3", ...SIGNED_IN });
  await go(page, "/account/notifications");
  const turnOn = page.getByRole("button", { name: "Turn on reminders", exact: true }).first();
  const there = await turnOn.waitFor({ timeout: 30000 }).then(() => true, () => false);
  say(there, "Settings: the reminders control is there for a signed-in reader");
  if (there) {
    // Marked before the tap: the button's own words change with it.
    await turnOn.evaluate((el) => el.closest("section")?.setAttribute("data-walk", "reminders"));
    const box = page.locator('[data-walk="reminders"]');
    await turnOn.click();
    await box.getByRole("button", { name: "Try again", exact: true }).waitFor({ timeout: 25000 }).catch(() => {});
    const now = (await box.innerText()).replace(/\s+/g, " ");
    say(now.includes("Try again") && now.includes("Reminders could not be turned on just now."), "Settings: it says it did not work, and the button offers the tap again");
    if (STILLS) {
      await page.waitForTimeout(600);
      await box.screenshot({ path: path.join(STILLS, "6-settings-failed.png") });
      say(printMockCheck(await checkMock(page, '[data-walk="reminders"]'), "6-settings-failed.png"), "the house's rules on 6-settings-failed.png");
    }
  }
  await ctx.close();
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
