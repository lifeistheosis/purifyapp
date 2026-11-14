// Updates 49: build 97 note 7's zero (d8c7e610), tapped as a reader taps, on the export (real touch, 390 by 844).
//   node plans49.mjs <out dir> <json out> [en|ar] [on|reduce]
// The plans are Plus on the gate's export (both stores enforce it), so the reader here is a stand-in subscriber:
// a session for a made-up user in the native store, and the Supabase answers stood in, in the browser. Every
// Supabase address is answered here (writes with an empty success); nothing is sent to production.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const [base, outFile, lang = "en", mode = "on"] = process.argv.slice(2);
const REF = "avbqyvjgcrucjwevwixt";
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${data ? " " + JSON.stringify(data) : ""}`);
};

const b64u = (s) => Buffer.from(s).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const USER = { id: "00000000-0000-4000-8000-000000000049", aud: "authenticated", role: "authenticated", email: "reader49@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const jwt = [b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b64u(JSON.stringify({ sub: USER.id, aud: "authenticated", role: "authenticated", email: USER.email, exp: now + 86400, iat: now, session_id: "s49" })), b64u("stand-in")].join(".");
const SESSION = { access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: now + 86400, refresh_token: "stand-in-refresh", user: USER };
const STORE = JSON.stringify([{ name: `sb-${REF}-auth-token`, value: "base64-" + b64u(JSON.stringify(SESSION)) }]);
const ENTITLEMENT = [{ is_supporter: false, plus_until: "2099-01-01T00:00:00+00:00", plus_source: "play", pro_until: null }];
const sent = [];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode), ...(lang !== "en" ? { locale: lang } : {}) });
if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
await ctx.addInitScript(([l, store]) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("CapacitorStorage.purify_locale", l);
    if (!localStorage.getItem("purify.supabase.auth")) localStorage.setItem("purify.supabase.auth", store);
  } catch {}
}, [lang, STORE]);
await pinMotion(ctx, mode);
await serveLikeTheShell(ctx, base, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
// Every other Supabase address: answered here, never sent.
await ctx.route(new RegExp(`^https://${REF}\\.supabase\\.co/(?!storage/v1/object/public/)`), async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const m = req.method();
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") sent.push(`${m} ${url.pathname}`);
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });
  if (m === "OPTIONS") return json(200, {});
  if (url.pathname === "/auth/v1/user") return json(200, USER);
  if (url.pathname.startsWith("/auth/v1/token")) return json(200, SESSION);
  if (url.pathname.startsWith("/auth/v1/")) return json(200, {});
  if (url.pathname === "/rest/v1/entitlements") return json(200, ENTITLEMENT);
  if (url.pathname.startsWith("/rest/v1/rpc/")) return json(200, null);
  if (url.pathname.startsWith("/rest/v1/")) return m === "GET" || m === "HEAD" ? json(200, []) : json(201, []);
  return json(200, {});
});
// Nothing to the website's own write addresses either.
await ctx.route(/^https:\/\/purifyapp\.(net|onrender\.com)\/api\//, (route) => {
  const req = route.request();
  if (req.method() !== "GET") {
    sent.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  }
  return mainWeb(route);
});

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const cdp = await ctx.newCDPSession(page);
const SHOTS = outFile.replace(/\.json$/, "");
fs.mkdirSync(SHOTS, { recursive: true });

async function tap(selector) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const b = await loc.boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  await tapAt(cdp, Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
}
const planState = () =>
  page.evaluate(() => {
    const path = document.querySelector("[data-plan-path]");
    const head = path?.firstElementChild;
    const count = head ? [...head.querySelectorAll("p")].filter((p) => p.id !== "plan-path").map((p) => p.textContent.trim()) : null;
    const bar = path ? [...path.children].find((el) => el.matches("div.h-1")) : null;
    const plans = JSON.parse(localStorage.getItem("purify:plans") ?? "{}");
    return {
      at: location.pathname,
      path: !!path,
      count,
      bar: bar ? bar.firstElementChild?.style.width ?? "?" : null,
      barBox: bar ? Math.round(bar.getBoundingClientRect().width) : null,
      begun: !!plans.gospels,
      done: Object.keys(plans.gospels?.done ?? {}),
      dialog: !!document.querySelector("[role=dialog]"),
      locked: !!document.querySelector("[data-plan-begin] span"),
    };
  });
const listState = () =>
  page.evaluate(() => {
    const card = document.querySelector("[data-plans-continue]");
    const bar = card?.querySelector("span.h-1");
    return { at: location.pathname, card: !!card, text: card ? card.innerText.replace(/\s+/g, " ").slice(0, 120) : null, bar: bar ? bar.firstElementChild?.style.width ?? "?" : null };
  });
const word = lang === "en" ? (r) => `${r} of 89 days read` : null;

try {
  // A: the plan's own page, never begun.
  await go(page, "/plans/gospels/", { timeout: 60000 });
  await page.waitForSelector("[data-plan-path]", { timeout: 30000 });
  await page.waitForTimeout(3500);
  let s = await planState();
  say(s.path && !s.begun && (s.count ?? []).length === 0 && s.bar === null && !s.locked, "A. /plans/gospels/ not begun: no count, no bar, Begin unlocked for the subscriber", s);
  await page.screenshot({ path: `${SHOTS}/a-not-begun.png` });

  // B: Begin, as a reader taps it: Matthew 1 opens; back to the plan.
  await tap("[data-plan-begin]");
  await page.waitForFunction(() => location.pathname.startsWith("/bible/matthew/1"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const opened = await page.evaluate(() => ({ at: location.pathname, bar: !!document.querySelector("[data-plan-bar]") }));
  say(opened.at.startsWith("/bible/matthew/1") && opened.bar, "B. Begin opens Matthew 1 with the plan's bar", opened);
  await page.goBack();
  await page.waitForSelector("[data-plan-path]", { timeout: 20000 });
  await page.waitForTimeout(2000);
  s = await planState();
  say(s.at.startsWith("/plans/gospels") && s.begun && s.done.length === 0 && (s.count ?? []).length === 0 && s.bar === null, "B. the plan newly begun: no zero (no count, no bar)", s);
  await page.screenshot({ path: `${SHOTS}/b-begun-none-read.png` });

  // C: the plans list, begun with none read: the Continue card, no bar.
  await go(page, "/plans/", { timeout: 60000 });
  await page.waitForSelector("[data-plans-continue]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  let l = await listState();
  say(l.card && l.bar === null, "C. /plans/ begun, none read: the Continue card with no bar", l);
  await page.screenshot({ path: `${SHOTS}/c-list-none-read.png` });

  // D: the plan's page; Mark day 1 read.
  await go(page, "/plans/gospels/", { timeout: 60000 });
  await page.waitForSelector("[data-plan-path]", { timeout: 20000 });
  await page.waitForTimeout(2500);
  await tap('[data-plan-path] button[aria-pressed="false"]');
  await page.waitForTimeout(1500);
  s = await planState();
  const one = lang === "en" ? (s.count ?? []).includes(word(1)) : (s.count ?? []).length === 1;
  say(s.done.length === 1 && s.done[0] === "0" && one && s.bar === "1%" && s.barBox > 0, `D. Mark day 1 read: "${lang === "en" ? word(1) : "the count"}" and the bar`, s);
  await page.screenshot({ path: `${SHOTS}/d-one-read.png` });

  // E: the list with day 1 read: the Continue card's bar.
  await go(page, "/plans/", { timeout: 60000 });
  await page.waitForSelector("[data-plans-continue]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  l = await listState();
  say(l.card && l.bar === "1%", "E. /plans/ with day 1 read: the Continue card's bar from one", l);
  await page.screenshot({ path: `${SHOTS}/e-list-one-read.png` });

  // F: untick on the plan's page: back to nothing; and the list again.
  await go(page, "/plans/gospels/", { timeout: 60000 });
  await page.waitForSelector("[data-plan-path]", { timeout: 20000 });
  await page.waitForTimeout(2500);
  await tap('[data-plan-path] button[aria-pressed="true"]');
  await page.waitForTimeout(1500);
  s = await planState();
  say(s.begun && s.done.length === 0 && (s.count ?? []).length === 0 && s.bar === null, "F. untick day 1: no count, no bar again", s);
  await page.screenshot({ path: `${SHOTS}/f-unticked.png` });
  await go(page, "/plans/", { timeout: 60000 });
  await page.waitForSelector("[data-plans-continue]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  l = await listState();
  say(l.card && l.bar === null, "F. /plans/ after the untick: the Continue card with no bar", l);
} catch (e) {
  say(false, `ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
}
say(errors.length === 0, `no page errors`, errors.length ? errors.slice(0, 3) : undefined);
say(true, `writes answered in the browser, never sent: ${sent.length}`, sent.slice(0, 12));
fs.writeFileSync(outFile, JSON.stringify({ lang, mode, results }, null, 2));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
