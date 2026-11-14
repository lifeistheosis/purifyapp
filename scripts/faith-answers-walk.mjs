// The answers about a reader's faith stay on the device (his "yes privacy"
// and "yes fasting", 2026-11-11, call 32), walked on the export. The rules
// are held by lib/onboarding/__tests__/faithAnswers.test.ts; this reads what
// the app does and what it sends, with a stand-in for the account's server
// that keeps every word sent to it. The four are the level, coming back, the
// background and the fast.
//
//   1. a new phone, signed in to an account that answered these questions on
//      another phone with an older build (so its copy still says "practicing",
//      "catholic", "coming back" and a fast): the first question is asked,
//      with no welcome and no "We updated our onboarding"; nothing of the
//      four is on the phone; and the account's copy has the four taken off,
//      the rest of it as it was;
//   2. the questions answered there: what is saved to the account at the end
//      holds what the reader is looking for and the questions' version, and
//      no word of the four; the phone keeps its own answers;
//   3. a phone that answered long ago, signed in, opened cold: the account's
//      older copy is cleared the same way, and nothing on the phone changes;
//      and its fast changed in Settings sends nothing;
//   4. an account whose copy holds none of the four: nothing is sent.
//
// The session is shaped like Supabase's and nothing reaches a real network.
// The account's server is the one the export was cut to talk to, read from the
// export itself: the gate's export (scripts/gate/export.mjs) carries the main
// web's address, and a session kept under another address is no session to the
// app (until 2026-11-14 the walk kept it under a placeholder's, so on the gate's
// export the phone was signed out and 15 of the 21 checks failed with nothing
// sent). The stand-in answers that address, so nothing reaches it.
//
//   node scripts/gate/export.mjs, then: node scripts/faith-answers-walk.mjs [--reduced]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { openPhone } from "./mock-check.mjs";
import { reportMotion } from "./lib/motion.mjs";

// Walked with the app's motion on, as a reader's phone has it, pinned and asserted on every
// screen (cause 9 of the gate; scripts/lib/motion.mjs). --reduced walks the still path.
const MOTION = process.argv.includes("--reduced") ? "reduce" : "on";

const FAITH = ["level", "returning", "background", "fasting"];
/** The account's server as the export names it: the one address of a Supabase project its code carries. */
function exportsServer() {
  const dir = path.join("out", "_next", "static", "chunks");
  if (!fs.existsSync(dir)) throw new Error("no native export in out/: run node scripts/gate/export.mjs first");
  const found = new Set();
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)) found.add(m[0]);
  if (found.size !== 1) throw new Error(`the export should name one Supabase project, it names ${found.size}: ${[...found].join(", ")}`);
  return [...found][0];
}
const SUPABASE = exportsServer();
// The name @supabase/ssr keeps a project's session under: sb-<the project's ref>-auth-token.
const SESSION_KEY = `sb-${new URL(SUPABASE).hostname.split(".")[0]}-auth-token`;

const results = [];
const say = (ok, what) => {
  results.push(ok);
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};

function session(space) {
  return {
    access_token: "walk",
    refresh_token: "walk",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365,
    user: {
      id: "00000000-0000-4000-8000-000000000000",
      email: "reader@example.com",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: space ? { purify_space: space } : {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

let browser;
/** A phone signed in to an account whose copy is `space`, with a stand-in server that keeps what it is sent. */
async function phone(set, space) {
  const s = session(space);
  // The apps keep the session in their own store (lib/supabase/nativeStore.ts), in the shape of a cookie jar.
  const jar = JSON.stringify([{ name: SESSION_KEY, value: JSON.stringify(s) }]);
  const opened = await openPhone({ motion: MOTION, set: { ...set, "purify.supabase.auth": jar }, browser });
  browser = opened.browser;
  const account = { user: s.user, sent: [] };
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  await opened.ctx.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === "/auth/v1/user") {
      if (req.method() === "PUT") {
        const body = JSON.parse(req.postData() || "{}");
        account.sent.push(body);
        if (body.data) account.user = { ...account.user, user_metadata: { ...account.user.user_metadata, ...body.data } };
      }
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(account.user) });
    }
    // Every other table: nothing kept, nothing refused.
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
  });
  return { ...opened, account };
}

const dialog = (page) => page.locator('[role="dialog"]').first();
const words = async (page) => (await dialog(page).innerText()).replace(/\s+/g, " ");
const kept = (page, key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const spaces = (account) => account.sent.map((b) => b?.data?.purify_space).filter(Boolean);
const clean = (space) => FAITH.every((k) => !(k in space));
const settle = async (page, account, atLeast) => {
  for (let i = 0; i < 40 && spaces(account).length < atLeast; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
};

const OLD_COPY = { level: "practicing", returning: true, background: "catholic", intent: "study", intents: ["study", "saints"], fasting: "modified", savedAt: "2026-10-01T10:00:00.000Z", v: 4 };

// 1 and 2. A new phone of an account that answered on another, with an older build's copy.
{
  const { ctx, page, account } = await phone({ "purify:onboarded": "0" }, OLD_COPY);
  await go(page, "/");
  const asked = await page.getByText("Where are you coming from?").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  say(asked, "a new phone of an account that answered elsewhere: the first question is asked");
  const first = asked ? await words(page) : "";
  say(asked && !first.includes("We updated our onboarding") && !first.includes("Welcome to Purify"), "and neither the welcome nor \"We updated our onboarding\" is shown");
  say(
    (await kept(page, "purify:level")) === null && (await kept(page, "purify:background")) === null && (await kept(page, "purify:returning")) === null && (await kept(page, "purify:fasting-rule")) === null,
    "nothing of the level, the background, coming back or the fast is put on the phone from the account",
  );
  say((await kept(page, "purify:intent")) === "study", "what the account keeps (what they look for) is taken");

  await settle(page, account, 1);
  const cleared = spaces(account)[0];
  say(!!cleared && clean(cleared), "the account's older copy has the four taken off at this sign-in");
  say(
    !!cleared && JSON.stringify(cleared) === JSON.stringify({ intent: "study", intents: ["study", "saints"], savedAt: "2026-10-01T10:00:00.000Z", v: 4 }),
    "and the rest of the copy is as it was",
  );
  const afterClear = spaces(account).length;
  say(afterClear === 1, `it is taken off once, not at every look (${afterClear} sent)`);

  // The questions, answered on this phone.
  const d = dialog(page);
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    if (!(await b.count())) return false;
    await b.click();
    await page.waitForTimeout(900);
    return true;
  };
  let last = "";
  let ended = false;
  for (let i = 0; i < 24; i++) {
    if (!(await d.count())) break;
    const now = await words(page).catch(() => "");
    if (!now) break;
    if (now.includes("Setting up your space")) {
      ended = true;
      break;
    }
    const same = now === last;
    last = now;
    if (now.includes("A nudge to pray") && (await tap(/^Not now$/))) continue;
    if (same || /Continue with \d/.test(now)) if (await tap(/^Continue/)) continue;
    if (await tap(/^Catholic$/)) continue;
    if (await tap(/^(Completely new|Not yet)/)) continue;
    if (await tap(/^(Scripture|A rule of prayer|The councils)/)) continue;
    if (await tap(/^Continue/)) continue;
    break;
  }
  say(ended, "the questions are answered to their end on this phone");
  await settle(page, account, afterClear + 1);
  const saved = spaces(account).slice(afterClear);
  say(saved.length >= 1, `the answers are saved to the account at the end (${saved.length} sent)`);
  say(saved.length >= 1 && saved.every(clean), "what is saved holds no level, no background, no coming back and no fast");
  const said = JSON.stringify(saved);
  say(saved.length >= 1 && !/catholic|inquirer|learning|practicing|returning|strict|modified|hidden/i.test(said), "and no word of them under any other name");
  const end = saved.at(-1) ?? {};
  say(
    typeof end.intent === "string" && Array.isArray(end.intents) && end.v === 4 && Object.keys(end).every((k) => ["intent", "intents", "savedAt", "v"].includes(k)),
    "it holds what the page names and nothing else: what they look for, when, and the questions' version",
  );
  say((await kept(page, "purify:background")) === "catholic" && (await kept(page, "purify:level")) !== null, "the phone keeps its own answers");
  // Every word sent to the account in this walk, of any kind.
  say(account.sent.every((b) => !/"(level|returning|background|fasting)"/.test(JSON.stringify(b))), "nothing sent to the account in the whole walk names the four");
  await ctx.close();
}

// 3. A phone that answered long ago, signed in, opened cold.
{
  const here = { "purify:onboarded": "4", "purify:background": "orthodox", "purify:level": "practicing", "purify:returning": "1", "purify:fasting-rule": "modified", "purify:intent": "prayer", "purify:intents": JSON.stringify(["prayer"]) };
  const { ctx, page, account } = await phone(here, { level: "practicing", returning: true, intent: "prayer", intents: ["prayer"], fasting: "strict", savedAt: "2026-10-20T08:00:00.000Z", v: 4 });
  await go(page, "/");
  await settle(page, account, 1);
  const sent = spaces(account);
  say(sent.length === 1 && clean(sent[0]) && sent[0].intent === "prayer" && sent[0].v === 4, `a phone that answered before, opened cold: the account's older copy is cleared, once (${sent.length} sent)`);
  say((await page.locator('[role="dialog"]').count()) === 0, "and it is asked nothing");
  say(
    (await kept(page, "purify:level")) === "practicing" && (await kept(page, "purify:background")) === "orthodox" && (await kept(page, "purify:returning")) === "1" && (await kept(page, "purify:fasting-rule")) === "modified",
    "nothing on the phone is removed: its own answers stand",
  );
  // Opened again: the copy is clean now, so nothing more is sent.
  await go(page, "/");
  await settle(page, account, 2);
  say(spaces(account).length === 1, "opened again: nothing more is sent");
  // The fast changed in Settings stays on the phone: no word of it goes to the account.
  await go(page, "/settings");
  const fast = page.getByRole("radio", { name: "Hidden", exact: true }).first();
  const there = await fast.waitFor({ timeout: 30000 }).then(() => true, () => false);
  if (there) {
    await fast.scrollIntoViewIfNeeded();
    await fast.click();
  }
  await page.waitForTimeout(2500);
  say(there && (await kept(page, "purify:fasting-rule")) === "hidden", "the fast changed in Settings is kept on the phone");
  say(account.sent.length === 1, `and nothing is sent to the account for it (${account.sent.length} sent in all)`);
  await ctx.close();
}

// 4. An account whose copy holds none of the four.
{
  const here = { "purify:onboarded": "4", "purify:level": "learning", "purify:intent": "study" };
  const { ctx, page, account } = await phone(here, { intent: "study", intents: ["study"], savedAt: "2026-11-11T08:00:00.000Z", v: 4 });
  await go(page, "/");
  await settle(page, account, 1);
  say(account.sent.length === 0, `a copy with none of the four: nothing is sent to the account (${account.sent.length} sent)`);
  await ctx.close();
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(reportMotion(MOTION) || failed ? 1 : 0);
