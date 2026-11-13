// checkMock { pixels: true } on the screens Updates 13, 14 and 18 touched, on the export in out/:
// at 390, 800 and 1032, in English and Arabic, on every palette (the five, the two earned, the looks),
// with the app's motion pinned on, reading the main web (GET only), as the new reader (SELLS_PLUS=1)
// or the open reader. Run from the repo root:
//   [SELLS_PLUS=1] NODE_USE_ENV_PROXY=1 node <this> [--widths 390,800,1032] [--locales en,ar] [--only /a/,/b/] [--json f]
import fs from "node:fs";
import path from "node:path";

const REPO = "/home/user/purifyapp";
const { EVERY, checkMock, printMockCheck } = await import(`${REPO}/scripts/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${REPO}/scripts/lib/shell-server.mjs`);
const { SELLS_PLUS, asAndroidShell, readerWords } = await import(`${REPO}/scripts/lib/sells-plus.mjs`);
const { assertMotion, motionOptions, pinMotion } = await import(`${REPO}/scripts/lib/motion.mjs`);
const { mainWeb, standInFor } = await import(`${REPO}/scripts/lib/main-web.mjs`);
const { chromium } = await import(`${REPO}/node_modules/playwright/index.mjs`);

const argv = process.argv.slice(2);
const flag = (n) => {
  const at = argv.indexOf(n);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const WIDTHS = (flag("--widths") ?? "390,800,1032").split(",").map(Number);
const LOCALES = (flag("--locales") ?? "en,ar").split(",");
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const SCREENS = flag("--only")?.split(",") ?? [
  "/settings/",
  "/community/",
  "/plans/",
  "/prayers/today/",
  "/councils/first-nicaea/the-symbol-of-the-faith/",
  "/history/alaska-mission/",
  "/bible/1-thessalonians/5/",
  "/account/export/",
  "/email/change/",
  "sheet:/signin/:0",
  "sheet:/signin/:1",
];
const JSON_OUT = flag("--json");
// --pixels never: by colour alone (words on a picture are listed, not measured); auto: by colour, then the pixels
// pass where such words are left; always: the pixels pass on every measure.
const PIXELS = flag("--pixels") ?? "auto";
const LIMIT_S = Number(flag("--limit") ?? 150);
const OUT = path.join(REPO, "out");

console.log(`${SCREENS.length} screens at ${WIDTHS.join(", ")} in ${LOCALES.join(" and ")}, on ${EVERY.length} palettes, ${readerWords()}`);
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
const results = [];
const t0 = Date.now();
for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    for (const at of SCREENS) {
      const started = Date.now();
      const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] ?? 900 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
      await pinMotion(ctx, "on");
      await ctx.addInitScript((loc) => {
        try {
          localStorage.setItem("purify:onboarded", "99");
          localStorage.setItem("purify:whatsNewSeen", "99");
          if (loc !== "en") localStorage.setItem("CapacitorStorage.purify_locale", loc);
        } catch {}
      }, locale);
      if (SELLS_PLUS) await asAndroidShell(ctx);
      await serveLikeTheShell(ctx, OUT, {});
      for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(site, mainWeb);
      // The main web's posts, with the walks' stand-in where it has none to show (scripts/lib/main-web.mjs).
      await ctx.route("https://purifyapp.net/api/community/posts**", async (route) => {
        const req = route.request();
        if (req.method() !== "GET") return route.abort();
        try {
          const r = await fetch(req.url());
          const headers = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
          const answer = { status: r.status, headers, body: Buffer.from(await r.arrayBuffer()) };
          return route.fulfill(standInFor(req.url(), answer) ?? answer);
        } catch {
          return route.abort();
        }
      });
      const page = await ctx.newPage();
      let r;
      // A measure that has not answered in 150s is said, not waited on (the page is closed under it).
      const limit = setTimeout(() => void ctx.close().catch(() => {}), LIMIT_S * 1000);
      try {
        // "sheet:<page>:<n>": the legal sheet, opened from the n-th legal link on that page (0 Terms, 1 Privacy Policy).
        const sheet = /^sheet:(.+):(\d)$/.exec(at);
        const partAt = /^part:([^:]+):/.exec(at)?.[1];
        await go(page, sheet ? sheet[1] : (partAt ?? at), { timeout: 30000 });
        await page.waitForTimeout(2000);
        const wrong = await assertMotion(page, "on");
        if (wrong) throw new Error(wrong);
        let selector = "body";
        // "part:<page>:<selector>": one part of a page, scrolled to (the chapter's discussions).
        const part = /^part:([^:]+):(.+)$/.exec(at);
        if (part) {
          selector = part[2];
          await page.locator(selector).waitFor({ timeout: 20000 });
          await page.locator(selector).evaluate((n) => n.scrollIntoView({ block: "center", behavior: "instant" }));
          await page.waitForTimeout(800);
        }
        if (sheet) {
          await page.locator("[data-legal-link]").nth(Number(sheet[2])).click();
          selector = '[role="dialog"]:has([data-legal-sheet])';
          await page.locator(selector).waitFor({ timeout: 15000 });
          await page.waitForTimeout(1200);
        }
        // The pixels pass measures only words whose ground a colour cannot give (a picture under or across them):
        // measured by colour first, on every palette, and again with pixels only where such words are left.
        r = PIXELS === "always" ? { ...(await checkMock(page, selector, { pixels: true, palettes: EVERY })), pixelsRun: true } : await checkMock(page, selector, { pixels: false, palettes: EVERY });
        if (PIXELS === "auto" && !r.pixelsRun && r.unmeasured.length) r = { ...(await checkMock(page, selector, { pixels: true, palettes: EVERY })), pixelsRun: true };
        const ok = printMockCheck({ ...r, byEye: [] }, `${at} (${width}, ${locale})`);
        results.push({ at, width, locale, ok, pixels: Boolean(r.pixelsRun), failures: r.failures, unmeasured: r.unmeasured, allowed: r.allowed, secs: Math.round((Date.now() - started) / 1000) });
      } catch (e) {
        console.log(`\n${at} (${width}, ${locale}): NOT MEASURED: ${String(e).split("\n")[0].slice(0, 200)}`);
        results.push({ at, width, locale, ok: false, error: String(e).split("\n")[0].slice(0, 200) });
      }
      clearTimeout(limit);
      await ctx.close().catch(() => {});
      if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
    }
  }
}
await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length} measured in ${Math.round((Date.now() - t0) / 60000)} min; ${results.length - bad.length} pass, ${bad.length} fail or not measured`);
for (const b of bad) console.log(`  ${b.at} (${b.width}, ${b.locale}): ${b.error ?? b.failures.map((f) => `${f.check} ${f.palette ?? ""} ${f.what}: ${f.detail}`).join(" | ").slice(0, 600)}`);
process.exit(bad.length ? 1 : 0);
