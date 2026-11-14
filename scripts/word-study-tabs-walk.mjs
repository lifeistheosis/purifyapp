// Build 97 note 9's rule, carried to the Greek word study (Updates 47 read it in the code, Updates 57 measured
// it): the owner's "notice how the words section move the UI up fix that" was the verse picture's sheet, and
// his rule for it holds for every sheet with tabs: the edge, the title and the controls stand still when the
// tab changes. The old word study emptied its list as the tab changed and drew the other testament's verses
// only when they came back from purifyapp.net, so the sheet went short (its edge fell) and then rose again;
// one that opened at its lower rest rose past it. This opens John 1:1 in the interlinear at 390 wide, taps
// λόγος, opens its study, and reads every frame from each tab's tap to 2.5s after: the sheet's top edge, its
// title and the two tabs, which must not move. Then it follows a verse from each testament's list.
//
//   node scripts/word-study-tabs-walk.mjs http://localhost:3000    (a dev server; the old code was measured so)
//   npm run build:android && node scripts/word-study-tabs-walk.mjs (the export, served as the shell serves it,
//                                                                   as a Plus reader with a stand-in account)
//   LANGS=en,ar,de node scripts/word-study-tabs-walk.mjs ...       (English and Arabic unless named)
//
// The study's verses come from purifyapp.net, as the apps ask for them (the dev server's own route needs the
// account server; the shell answers nothing off the device), at the real round trip. Exits 1 if a check fails.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { NATIVE_UA, serveLikeTheShell } from "./lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../out", import.meta.url).pathname;
const BASE = process.argv[2] ?? null;
const LANGS = (process.env.LANGS ?? "en,ar").split(",");
const SIZES = [
  { name: "1x", zoom: 1 },
  { name: "1.3x", zoom: 1.3 },
];
const LIVE = "https://purifyapp.net";

/** The export's one Supabase project, and the session a signed-in phone keeps for it (scripts/faith-answers-walk.mjs). */
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

let failed = 0;
const must = (ok, line) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
  if (!ok) failed++;
};

/** Every word in the sheet set `k` times larger (a phone's font scale in a WebView), and every word drawn later too, before its first frame. */
const zoomText = (page, k) =>
  page.evaluate((k) => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
    const scale = (root) => {
      const els = [root, ...root.querySelectorAll("*")].filter((e) => e instanceof HTMLElement && !e.hasAttribute("data-walk-px"));
      const own = els.map((e) => {
        const px = parseFloat(getComputedStyle(e).fontSize);
        const up = e.parentElement;
        // A word that only inherits its parent's (already scaled) size keeps inheriting it.
        const inherits = up?.hasAttribute("data-walk-px") && px === parseFloat(getComputedStyle(up).fontSize);
        return { e, px, inherits };
      });
      for (const { e, px, inherits } of own) {
        e.setAttribute("data-walk-px", String(px));
        if (!inherits) e.style.fontSize = `${px * k}px`;
      }
    };
    scale(dlg);
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLElement) scale(n);
    }).observe(dlg, { childList: true, subtree: true });
  }, k);

/** Each frame for `ms`: the sheet's top edge, its title and the tabs. */
const frames = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((done) => {
        const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
        const tabs = dlg.querySelector('[role="tablist"]');
        const panel = tabs.closest(".rounded-t-3xl");
        const title = panel.querySelector("p");
        const top = (e) => Math.round(e.getBoundingClientRect().top * 10) / 10;
        const seen = [];
        const t0 = performance.now();
        const step = () => {
          seen.push([top(panel), top(title), top(tabs)]);
          if (performance.now() - t0 < ms) requestAnimationFrame(step);
          else done(seen);
        };
        requestAnimationFrame(step);
      }),
    ms,
  );

const span = (seen, i) => {
  const v = seen.map((f) => f[i]);
  return { min: Math.min(...v), max: Math.max(...v), first: v[0], last: v[v.length - 1] };
};

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const reader = BASE ? null : plusReader();
const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));

for (const lang of LANGS) {
  const m = JSON.parse(fs.readFileSync(`lib/i18n/messages/${lang}.json`, "utf8"));
  const t = (k) => m[k] ?? en[k];
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark", ...(BASE ? {} : { userAgent: NATIVE_UA }), ...(lang !== "en" ? { locale: lang } : {}) });
    await ctx.addCookies([{ name: "purify_locale", value: lang, url: BASE ?? "https://localhost" }]);
    await ctx.addInitScript(
      ({ l, jar }) => {
        try {
          localStorage.setItem("purify:onboarded", "99");
          localStorage.setItem("purify:whatsNewSeen", "99");
          localStorage.setItem("purify:interlinear", "1");
          localStorage.setItem("CapacitorStorage.purify_locale", l);
          if (jar) localStorage.setItem("purify.supabase.auth", jar);
        } catch {}
      },
      { l: lang, jar: reader?.jar ?? null },
    );
    if (!BASE) {
      await serveLikeTheShell(ctx, OUT, {});
      const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
      const plus = { is_supporter: false, plus_until: "2099-01-01T00:00:00Z", plus_source: "walk", pro_until: null };
      await ctx.route(`${reader.server}/**`, (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
        if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(reader.user) });
        if (url.pathname === "/rest/v1/entitlements") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(/object/.test(req.headers()["accept"] ?? "") ? plus : [plus]) });
        return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
      });
    }
    // Registered last, so it answers before the routes above.
    await ctx.route(/\/api\/bible\/word\?/, async (route) => {
      const url = new URL(route.request().url());
      const res = await route.fetch({ url: LIVE + url.pathname + url.search, headers: { accept: "application/json" } });
      await route.fulfill({ response: res, headers: { ...res.headers(), "access-control-allow-origin": "*" } });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const at = `${lang}, ${size.name}`;
    const openStudy = async () => {
      if (BASE) await page.goto(`${BASE}/bible/john/1`, { waitUntil: "load", timeout: 300000 });
      else {
        const { go } = await import("./lib/shell-server.mjs");
        await go(page, "/bible/john/1", { timeout: 60000 });
      }
      const word = page.locator('button[data-mock-why="a word in the verse\'s own line"]', { hasText: /^Λ/ }).first(); // Λόγος, the first word of John 1:1 to begin so (its accent is an oxia, not a tonos)
      await word.waitFor({ timeout: 120000 });
      // A tap before the page has woken opens nothing: tap again until the word's card offers its study.
      const open = page.getByRole("button", { name: t("bible.wordStudyOpen"), exact: true });
      for (let i = 0; i < 8 && !(await open.isVisible()); i++) {
        await word.tap();
        await open.waitFor({ timeout: 4000 }).catch(() => {});
      }
      await open.tap();
      const dlg = page.getByRole("dialog").filter({ has: page.getByRole("tablist") });
      await dlg.getByRole("listitem").first().waitFor({ timeout: 60000 });
      await page.waitForTimeout(1500);
      return dlg;
    };
    const dlg = await openStudy();
    if (size.zoom !== 1) await zoomText(page, size.zoom);
    await page.waitForTimeout(400);
    const tabs = dlg.getByRole("tab");
    for (const [i, name] of [
      [0, "Old Testament"],
      [1, "New Testament"],
    ]) {
      const rec = frames(page, 2500);
      await tabs.nth(i).tap();
      const seen = await rec;
      const [edge, title, ctrls] = [0, 1, 2].map((k) => span(seen, k));
      const still = [edge, title, ctrls].every((s) => s.max - s.min < 0.5);
      must(
        still && (await tabs.nth(i).getAttribute("aria-selected")) === "true",
        `${at}, to the ${name} (${seen.length} frames): edge ${edge.first} -> ${edge.min}..${edge.max} -> ${edge.last}; title ${title.min}..${title.max}; tabs ${ctrls.min}..${ctrls.max}`,
      );
      await page.waitForTimeout(300);
    }
    // A verse from the list opens its chapter: the New Testament's at 1x, the Old Testament's at 1.3x (one study opened per pass).
    {
      for (const [i, name] of [size.zoom === 1 ? [1, "New Testament"] : [0, "Old Testament"]]) {
        if (i === 0) {
          await tabs.nth(0).tap();
          await page.waitForTimeout(1500);
        }
        const link = dlg.getByRole("listitem").first().getByRole("link");
        const href = await link.getAttribute("href");
        await link.tap();
        const went = await page.waitForURL((u) => u.pathname === href.split("#")[0], { timeout: 60000 }).then(() => true).catch(() => false);
        const shut = await page.getByRole("dialog").filter({ has: page.getByRole("tablist") }).count().then((n) => n === 0);
        must(went && shut, `${at}: a verse from the ${name} list opens ${href} (now ${new URL(page.url()).pathname}), the sheet closed`);
      }
    }
    must(errors.length === 0, `${at}: no page errors${errors.length ? `: ${errors.slice(0, 2).join(" | ")}` : ""}`);
    await ctx.close();
  }
}
await browser.close();
console.log(failed ? `${failed} FAIL` : "all held");
process.exit(failed ? 1 : 0);
