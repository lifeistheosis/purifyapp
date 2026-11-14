// checkMock with pixels on a reader's profile card (build 97 note 6, Updates 66), from Updates 60's mockrun60.mjs
// (which see): the same export, signed-in stand-in, palettes and looks, and the main web's real answers. The
// profile is opened as a reader opens it, from a post's author in Community.
//   node mockrun66.mjs <out dir> <jsonl> <conc> <state@width@lang>...
// state: rest (the profile read and drawn), loading (its answer held, so the card stands in its loading
// state while it is measured), taps (390 en only: Follow tapped before and after the viewer's standing lands,
// the menu, each door, then Close; read after each tap, written to the jsonl; no checkMock).
// No reader's name or handle is written anywhere.
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const GROUPS = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const messages = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = messages("en");
// FOLLOWS_YOU=1 plays a reader who follows the viewer (Updates 74, for Updates 71's "Follows you" mend): the
// standing says so, and each jsonl line carries followsYou.
const FOLLOWS_YOU = process.env.FOLLOWS_YOU === "1";
const RELATION = { mine: false, following: false, followsYou: FOLLOWS_YOU, mutuals: [], greeted: false, canGift: false, muted: false };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

/** The export's one Supabase project, and the session a signed-in phone keeps for it (as mockrun60 has it). */
function standInReader() {
  const dir = path.join(OUT, "_next", "static", "chunks");
  const found = new Set();
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)) found.add(m[0]);
  if (found.size !== 1) throw new Error(`the export should name one Supabase project, it names ${found.size}`);
  const server = [...found][0];
  const user = { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const session = { access_token: "walk", refresh_token: "walk", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365, user };
  return { server, user, jar: JSON.stringify([{ name: `sb-${new URL(server).hostname.split(".")[0]}-auth-token`, value: JSON.stringify(session) }]) };
}
const reader = standInReader();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Opens the first post's author's profile from Community and marks the card `data-run66`. */
async function openProfile(page, state) {
  await go(page, "/community/", { timeout: 120000 });
  await page.waitForSelector("article", { timeout: 120000 });
  await page.waitForTimeout(2500);
  const name = page.locator("article p button").first();
  await name.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await name.tap();
  const card = page.locator("[data-profile-card]");
  await card.waitFor({ timeout: 20000 });
  if (state === "loading") await page.waitForTimeout(1500);
  else if (state === "rest") {
    await card.locator("[role=tablist]").waitFor({ timeout: 60000 });
    await page.waitForTimeout(2000);
  }
  return card.evaluate((el, state) => {
    el.setAttribute("data-run66", "");
    // "Follows you" against the @handle: which side it stands on, and the gap (no words of either kept).
    const markSide = () => {
      const m = [...el.querySelectorAll("span")].find((x) => x.className.includes("bg-paper/[0.09]") && x.className.includes("text-caption"));
      const h = [...el.querySelectorAll("*")].find((x) => x.children.length === 0 && /^@/.test(x.textContent?.trim() ?? ""));
      if (!m || !h) return m ? "no handle" : null;
      const mb = m.getBoundingClientRect();
      const hb = h.getBoundingClientRect();
      return { side: mb.left + mb.width / 2 < hb.left + hb.width / 2 ? "left" : "right", gap: Math.round(mb.left >= hb.right ? mb.left - hb.right : hb.left - mb.right), sameRow: Math.abs(mb.top + mb.height / 2 - (hb.top + hb.height / 2)) < 6 };
    };
    return { state, followsMark: markSide(), busy: Boolean(el.querySelector("[aria-busy]")), doors: Boolean(el.querySelector("[role=tablist]")), statusPlace: Boolean(el.querySelector("[data-profile-status]")), height: Math.round(el.getBoundingClientRect().height), width: Math.round(el.getBoundingClientRect().width) };
  }, state);
}

/** Follow before and after the standing lands, the menu, each door, then Close: what each tap changed. */
async function taps(page, t) {
  const card = page.locator("[data-profile-card]");
  const follow = card.locator("button[aria-pressed]").first();
  const out = [];
  const pressed = async () => (await follow.getAttribute("aria-pressed").catch(() => null)) === "true";
  out.push({ tap: "Follow, before the standing", there: (await follow.count()) > 0, pressedBefore: await pressed() });
  await follow.tap();
  await page.waitForTimeout(500);
  out.at(-1).pressedAfter = await pressed();
  out.at(-1).notice = await card.locator("[role=status]").count();
  await page.waitForTimeout(3500); // the standing lands at 2500ms
  out.push({ tap: "Follow, after the standing", pressedBefore: await pressed() });
  await follow.tap();
  await page.waitForTimeout(600);
  out.at(-1).pressedAfter = await pressed();
  const menu = card.locator(`button[aria-haspopup="menu"][aria-label="${t("profile.moreActions")}"]`).first();
  await menu.tap();
  const opened = await page.waitForSelector("[role=menu]", { timeout: 3000 }).then(() => true).catch(() => false);
  const items = opened ? await page.locator("[role=menu] [role=menuitem]").count() : 0;
  out.push({ tap: "the menu", opened, items });
  if (opened) await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const tabs = card.locator("[role=tablist] [role=tab]");
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).tap();
    await page.waitForTimeout(700);
    out.push({
      tap: `door ${i + 1} of ${n}`,
      selected: (await tabs.nth(i).getAttribute("aria-selected")) === "true",
      panelShown: await card.locator('[role=tabpanel]:not([aria-hidden="true"])').count(),
    });
  }
  await card.locator(`button[aria-label="${t("common.close")}"]`).first().tap();
  await page.waitForTimeout(1500);
  out.push({ tap: "Close", cardGone: (await page.locator("[data-profile-card]").count()) === 0 });
  return out;
}

async function run(spec) {
  const [state, w, lang] = spec.split("@");
  const width = Number(w);
  const m = messages(lang);
  const t = (k) => m[k] ?? EN[k];
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript(
    ({ l, jar }) => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("CapacitorStorage.purify_locale", l);
        localStorage.setItem("purify.supabase.auth", jar);
      } catch {}
    },
    { l: lang, jar: reader.jar },
  );
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  await ctx.route(`${reader.server}/**`, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/storage/v1/object/public/")) return route.fallback();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(reader.user) });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
  });
  // Registered last, so these answer first: the viewer's standing (at 2500ms for the taps), Follow's write, and
  // for the loading state the profile's own answer, held until the run ends.
  let release = null;
  const held = new Promise((r) => (release = r));
  await ctx.route(/\/api\/community\/relation/, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (state === "taps") await new Promise((r) => setTimeout(r, 2500));
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ relation: RELATION }) });
  });
  await ctx.route(/\/api\/community\/follow/, (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const follow = Boolean(JSON.parse(req.postData() ?? "{}").follow);
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ following: follow }) });
  });
  if (state === "loading") {
    await ctx.route(/\/api\/community\/profile/, async (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      await held;
      return route.abort().catch(() => {});
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    const opened = await openProfile(page, state);
    if (state === "taps") {
      const done = await taps(page, t);
      fs.appendFileSync(jsonl, JSON.stringify({ spec, followsYou: FOLLOWS_YOU, opened, taps: done, errors }) + "\n");
      console.log(`${spec}: ${JSON.stringify(done)}`);
    } else {
      for (const g of [0, 1, 2]) {
        const r = await checkMock(page, "[data-run66]", { pixels: true, palettes: GROUPS[g] });
        fs.appendFileSync(jsonl, JSON.stringify({ spec, followsYou: FOLLOWS_YOU, group: g, opened, ms: Date.now() - t0, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, unmeasuredList: r.unmeasured ?? [], allowed: r.allowed?.length ?? 0, errors }) + "\n");
        console.log(`${spec} group ${g} (busy ${opened.busy}, doors ${opened.doors}, ${opened.width}x${opened.height}): ${r.failures.length} failure(s), ${errors.length} page error(s) (${Math.round((Date.now() - t0) / 1000)}s)`);
      }
    }
  } catch (e) {
    const shot = path.join(path.dirname(jsonl), `fail-${spec.replace(/@/g, "_")}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    fs.appendFileSync(jsonl, JSON.stringify({ spec, followsYou: FOLLOWS_YOU, error: String(e).slice(0, 300), shot, errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    release();
    await ctx.close();
  }
}

const queue = [...specs];
await Promise.all(
  Array.from({ length: Number(conc) }, async () => {
    for (let s = queue.shift(); s; s = queue.shift()) await run(s);
  }),
);
await browser.close();
