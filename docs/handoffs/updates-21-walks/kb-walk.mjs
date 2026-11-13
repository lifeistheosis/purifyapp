// Fault B (Arbiter 2, 2026-11-13): with the keyboard up over a field, does the tab bar (or any bar at
// the foot) ride on the keyboard and cover the field? On the export, as the Android shell sees it:
// tap a field, stand a 320px keyboard in by making the screen shorter (Android's web view is made
// as tall as what the keyboard leaves), then measure what stands at the foot, visible, over the field.
//   node kb-walk.mjs --out <export> [--only /a/,/b/] [--plain]   (--plain: no native UA, a phone browser)
import fs from "node:fs";

const REPO = "/home/user/purifyapp";
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${REPO}/scripts/lib/shell-server.mjs`);
const { pinMotion, motionOptions } = await import(`${REPO}/scripts/lib/motion.mjs`);
const { mainWeb } = await import(`${REPO}/scripts/lib/main-web.mjs`);
const { chromium } = await import(`${REPO}/node_modules/playwright/index.mjs`);

const argv = process.argv.slice(2);
const flag = (n) => {
  const at = argv.indexOf(n);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const OUT = flag("--out") ?? `${REPO}/out`;
const PLAIN = argv.includes("--plain");
const PAGES = flag("--only")?.split(",") ?? ["/journal/", "/discover/", "/saints/", "/prayers/", "/community/", "/dictionary/", "/chants/", "/bible/", "/shop/", "/settings/", "/signin/", "/support/", "/florilegium/"];
const KB = 320;
const W = 390;
const H = 844;

const now = new Date().toISOString();
const entries = Array.from({ length: 8 }, (_, i) => ({ id: `kb-${i}`, kind: "reflection", body: `<p>Lord, have mercy. Line ${i + 1}.</p>`, createdAt: now, updatedAt: now }));

const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
const rows = [];
for (const at of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, ...(PLAIN ? {} : { userAgent: NATIVE_UA }), ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript((list) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("purify:journal", JSON.stringify(list));
    } catch {}
  }, entries);
  await serveLikeTheShell(ctx, OUT, {});
  for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(site, mainWeb);
  const page = await ctx.newPage();
  try {
    await go(page, at, { timeout: 30000 });
    await page.waitForTimeout(1500);
    // A search behind a door: open it, as a reader does.
    const door = page.locator("[data-search-door]").first();
    if ((await door.count()) && !(await page.locator("input:visible, textarea:visible").count())) {
      await door.tap({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    // The fields a keyboard comes up for, visible on the screen, in the page itself (not behind a closed sheet).
    const fields = await page.evaluate(() => {
      const takes = (el) => {
        if (el.isContentEditable) return true;
        if (el.tagName === "TEXTAREA") return !el.readOnly;
        if (el.tagName !== "INPUT") return false;
        if (el.readOnly || el.disabled) return false;
        return /^(text|search|email|url|tel|password|number)$/.test(el.type || "text");
      };
      const out = [];
      document.querySelectorAll("input, textarea, [contenteditable=''], [contenteditable='true']").forEach((el, i) => {
        if (!takes(el)) return;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 4 || r.height < 4 || cs.visibility === "hidden") return;
        el.setAttribute("data-kb-field", String(i));
        out.push({ i, name: el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || el.tagName.toLowerCase(), y: Math.round(r.top) });
      });
      return out;
    });
    if (!fields.length) {
      rows.push({ at, note: "no field on the screen" });
      await ctx.close();
      continue;
    }
    for (const f of fields.slice(0, 2)) {
      const field = page.locator(`[data-kb-field="${f.i}"]`);
      await field.scrollIntoViewIfNeeded().catch(() => {});
      await field.tap({ timeout: 5000 }).catch(async () => field.focus());
      await page.waitForTimeout(250);
      // The keyboard comes: the web view is made as tall as what it leaves.
      await page.setViewportSize({ width: W, height: H - KB });
      await page.waitForTimeout(600);
      const seen = await page.evaluate(() => {
        const el = document.activeElement;
        const fr = el?.getBoundingClientRect();
        const vh = window.innerHeight;
        const flag = document.documentElement.getAttribute("data-keyboard");
        const over = [];
        for (const n of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(n);
          if (cs.position !== "fixed" && cs.position !== "sticky") continue;
          const r = n.getBoundingClientRect();
          if (r.width < 20 || r.height < 20) continue;
          if (r.bottom < vh - 140) continue; // stands at the foot
          // Seen: visible and not faded out, itself and every ancestor.
          let shown = cs.visibility !== "hidden";
          for (let a = n; a && shown; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (Number(s.opacity) < 0.05 || s.display === "none" || s.visibility === "hidden") shown = false;
          }
          if (!shown) continue;
          if (n.contains(el)) continue; // the bar that holds the field
          const covers = fr ? !(r.bottom <= fr.top || r.top >= fr.bottom) : false;
          over.push({ what: n.getAttribute("data-tab-bar") !== null ? "tab bar" : (n.getAttribute("aria-label") || n.className || n.tagName).toString().slice(0, 70), top: Math.round(r.top), bottom: Math.round(r.bottom), covers });
        }
        const tab = document.querySelector("[data-tab-bar]");
        const tabCs = tab ? getComputedStyle(tab) : null;
        return { flag, focused: el?.tagName, field: fr ? { top: Math.round(fr.top), bottom: Math.round(fr.bottom) } : null, vh, tab: tab ? { visibility: tabCs.visibility, opacity: tabCs.opacity } : null, over };
      });
      rows.push({ at, field: f.name, ...seen });
      await page.setViewportSize({ width: W, height: H });
      await page.evaluate(() => document.activeElement?.blur?.());
      await page.waitForTimeout(400);
    }
  } catch (e) {
    rows.push({ at, error: String(e).split("\n")[0].slice(0, 160) });
  }
  await ctx.close();
}
await browser.close();
for (const r of rows) console.log(JSON.stringify(r));
const bad = rows.filter((r) => r.over?.some((o) => o.covers) || (r.tab && r.tab.visibility !== "hidden" && r.flag !== "up" && r.field));
console.log(`\n${rows.length} measures; ${bad.length} with a bar at the foot over the field, or the tab bar shown with the keyboard up`);
