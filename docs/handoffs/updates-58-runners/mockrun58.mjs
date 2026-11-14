// checkMock with pixels on round 3's sheets (Updates 58, from Updates 54's mockrun54.mjs): Word study open on each
// testament, the verse picture's sheet on each of its three tabs, the journal's sheet and For the living's sheet,
// on the export served as the shell serves it, as a Plus reader with a stand-in account (Word study is Plus; the
// session and entitlement as scripts/word-study-tabs-walk.mjs plays them), the website's files and the study's
// verses asked of purifyapp.net.
//   node mockrun58.mjs <out dir> <jsonl> <conc> <state@width@lang>...
// state: ws-0 (Old Testament), ws-1 (New Testament), pic-0, pic-1, pic-2 (the picture sheet's tabs in their
// order: Look, Words, Size), journal, living. Each spec opens its sheet once and is measured on three groups in
// turn (the five palettes and the two earned, looks 1-7, looks 8-14): one line each in the jsonl.
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

/** The export's one Supabase project, and the session a signed-in phone keeps for it (as the word study walk has it). */
function plusReader() {
  const dir = path.join(OUT, "_next", "static", "chunks");
  const found = new Set();
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)) found.add(m[0]);
  if (found.size !== 1) throw new Error(`the export should name one Supabase project, it names ${found.size}`);
  const server = [...found][0];
  const user = { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const session = { access_token: "walk", refresh_token: "walk", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365, user };
  const key = `sb-${new URL(server).hostname.split(".")[0]}-auth-token`;
  return { server, user, jar: JSON.stringify([{ name: key, value: JSON.stringify(session) }]) };
}
const reader = plusReader();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Opens the state's sheet and marks it `data-run58`; returns what was opened. */
async function open(page, state, t) {
  const mark = (how) =>
    page.evaluate((how) => {
      const all = [...document.querySelectorAll('[role="dialog"]')];
      const d = how.tablist ? all.filter((e) => e.querySelector('[role="tablist"]')).pop() : how.label ? all.find((e) => e.getAttribute("aria-label") === how.label) : all.pop();
      if (!d) return null;
      d.setAttribute("data-run58", "");
      return { tab: d.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null, width: Math.round(d.getBoundingClientRect().width) };
    }, how);
  if (state.startsWith("ws-")) {
    await go(page, "/bible/john/1", { timeout: 60000 });
    const word = page.locator('button[data-mock-why="a word in the verse\'s own line"]', { hasText: /^Λ/ }).first();
    await word.waitFor({ timeout: 120000 });
    const opener = page.getByRole("button", { name: t("bible.wordStudyOpen"), exact: true });
    for (let i = 0; i < 8 && !(await opener.isVisible()); i++) {
      await word.tap();
      await opener.waitFor({ timeout: 4000 }).catch(() => {});
    }
    await opener.tap();
    const dlg = page.getByRole("dialog").filter({ has: page.getByRole("tablist") });
    await dlg.getByRole("listitem").first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    await dlg.getByRole("tab").nth(Number(state.slice(3))).tap();
    await dlg.getByRole("listitem").first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    return mark({ tablist: true });
  }
  if (state.startsWith("pic-")) {
    await go(page, "/", { timeout: 60000 });
    const share = page.locator("article", { hasText: t("today.verseOfDay") }).first().getByRole("button", { name: t("common.share"), exact: true });
    await share.waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    await share.tap();
    const sheet = page.getByRole("dialog", { name: t("picture.title") });
    await sheet.waitFor({ timeout: 20000 });
    await page.waitForTimeout(900);
    await sheet.getByRole("tab").nth(Number(state.slice(4))).tap();
    await page.waitForTimeout(1500);
    return mark({ label: t("picture.title") });
  }
  if (state === "journal") {
    await go(page, "/journal/", { timeout: 60000 });
    const write = page.locator("[data-journal-write]:visible").first();
    await write.waitFor({ timeout: 120000 });
    await page.waitForTimeout(1500);
    await write.tap();
    await page.waitForSelector("[data-journal-composer]", { timeout: 30000 });
    await page.waitForTimeout(2000);
    return mark({});
  }
  if (state === "living") {
    await go(page, "/prayers/personal/", { timeout: 60000 });
    await page.waitForTimeout(2500);
    const btn = page.getByRole("button", { name: `${t("prayers.diptychs.add")}: ${t("prayers.diptychs.livingHeading")}`, exact: true }).first();
    await btn.waitFor({ timeout: 60000 });
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await btn.tap();
    await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
    await page.waitForTimeout(2000);
    // The field's own focus (autoFocus) is kept: what a reader sees the moment it opens.
    return mark({});
  }
  throw new Error(`unknown state ${state}`);
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
        localStorage.setItem("purify:interlinear", "1");
        localStorage.setItem("CapacitorStorage.purify_locale", l);
        localStorage.setItem("purify.supabase.auth", jar);
      } catch {}
    },
    { l: lang, jar: reader.jar },
  );
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  const plus = { is_supporter: false, plus_until: "2099-01-01T00:00:00Z", plus_source: "walk", pro_until: null };
  await ctx.route(`${reader.server}/**`, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/storage/v1/object/public/")) return route.fallback();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(reader.user) });
    if (url.pathname === "/rest/v1/entitlements") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(/object/.test(req.headers()["accept"] ?? "") ? plus : [plus]) });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
  });
  // The study's verses, from purifyapp.net as the apps ask for them; registered last, so it answers first.
  await ctx.route(/\/api\/bible\/word\?/, async (route) => {
    const url = new URL(route.request().url());
    const res = await route.fetch({ url: "https://purifyapp.net" + url.pathname + url.search, headers: { accept: "application/json" } });
    await route.fulfill({ response: res, headers: { ...res.headers(), "access-control-allow-origin": "*" } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    const opened = await open(page, state, t);
    if (!opened) throw new Error("no sheet to measure");
    for (const g of [0, 1, 2]) {
      const r = await checkMock(page, "[data-run58]", { pixels: true, palettes: GROUPS[g] });
      fs.appendFileSync(jsonl, JSON.stringify({ spec, group: g, opened, ms: Date.now() - t0, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, allowed: r.allowed?.length ?? 0, errors }) + "\n");
      console.log(`${spec} group ${g} (${opened.tab ?? "-"}, ${opened.width}px): ${r.failures.length} failure(s), ${errors.length} page error(s) (${Math.round((Date.now() - t0) / 1000)}s)`);
    }
  } catch (e) {
    const shot = path.join(path.dirname(jsonl), `fail-${spec.replace(/@/g, "_")}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300), shot, errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
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
