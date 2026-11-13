// The final check's light looks on the two sheets the mends touch, which no page walk reaches: the
// Search sheet opened from Saints and from a page that searches Everything, and the Purify profile sheet
// on Community. Each sheet is opened by a tap at phone size, then held to checkMock with pixels on the
// seven light looks (Desert, Jordan, Blush, Roses, Lavender, Olive, Stone; the arbiter, 2026-11-12).
// The tap walk holds the same sheets to the five palettes.
import fs from "node:fs";
import { chromium } from "playwright";
import { checkMock, LOOKS as THEMES } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SHOTS = process.argv[2];
const SEVEN = ["Desert", "Jordan", "Blush", "Roses", "Lavender", "Olive", "Stone"];
const palettes = THEMES.filter(([label]) => SEVEN.includes(label));
if (palettes.length !== 7) throw new Error(`expected the seven light looks, found ${palettes.map(([l]) => l).join(", ")}`);
const SHEETS = [
  { at: "/saints/", tap: { role: "button", name: "Search the saints" }, sheet: "Search Purify" },
  { at: "/about/", tap: { role: "button", name: "Search" }, sheet: "Search Purify" },
  { at: "/community/", tap: { role: "button", name: "Purify" }, sheet: "Purify" },
];
// Reading the main web as the walks do with --online (scripts/tap-walk.mjs, mainWeb): Chromium's GETs to
// the website are fetched by Node through the session's proxy and handed back; anything else is refused.
const fetched = new Map();
async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) {
      fetched.set(url, (async () => {
        const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
        const r = await fetch(url, { headers });
        const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
        return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
      })());
    }
    return route.fulfill(await fetched.get(url));
  } catch {
    return route.abort();
  }
}
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let fails = 0;
try {
  for (const s of SHEETS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
    await serveLikeTheShell(ctx, OUT, {});
    for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
    const page = await ctx.newPage();
    const name = `${s.at} sheet "${s.sheet}"`;
    try {
      await go(page, s.at, { timeout: 30000 });
      await page.waitForTimeout(4500);
      // The first control drawn with this name, named as the walks name it (its label, or its words);
      // Community's posts come from the main web, a few seconds in.
      let marked = false;
      for (let waited = 0; !marked && waited < 30000; waited += 1000) {
        marked = await page.evaluate((want) => {
          for (const el of document.querySelectorAll("main button, main a[href], main [role=button], button, [role=button]")) {
            const said = (el.getAttribute("aria-label") || el.innerText || "").trim();
            const r = el.getBoundingClientRect();
            if (said === want && r.width > 0 && r.height > 0) { el.setAttribute("data-sheet-tap", "1"); return true; }
          }
          return false;
        }, s.tap.name);
        if (!marked) await page.waitForTimeout(1000);
      }
      if (!marked) throw new Error(`no control "${s.tap.name}" drawn in 30 seconds`);
      const control = page.locator('[data-sheet-tap="1"]').first();
      await control.scrollIntoViewIfNeeded();
      await control.tap({ timeout: 10000 });
      // The sheet the tap opened: the last dialog drawn, which must carry the expected name.
      let named = null;
      for (let waited = 0; named === null && waited < 10000; waited += 500) {
        named = await page.evaluate(() => {
          const open = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
          const d = open[open.length - 1];
          if (!d) return null;
          d.setAttribute("data-sheet-light", "1");
          const by = d.getAttribute("aria-labelledby");
          return (d.getAttribute("aria-label") || (by && document.getElementById(by)?.textContent) || "").trim();
        });
        if (named === null) await page.waitForTimeout(500);
      }
      if (named === null) throw new Error("the tap opened no sheet");
      if (named !== s.sheet) throw new Error(`the tap opened "${named}", not "${s.sheet}"`);
      await page.waitForTimeout(1500);
      // The five palettes too: the tap walk holds each sheet once by its name, so the Search sheet from
      // Saints, which carries the kinds and their counts, is otherwise measured only as the one from a page
      // that searches everything.
      const five = await checkMock(page, '[data-sheet-light="1"]', { pixels: true });
      const seven = await checkMock(page, '[data-sheet-light="1"]', { pixels: true, palettes });
      const seen = new Set();
      const r = { failures: [...five.failures, ...seven.failures].filter((f) => { const k = `${f.check}|${f.palette}|${f.what}`; if (seen.has(k)) return false; seen.add(k); return true; }), unmeasured: [...new Set([...five.unmeasured, ...seven.unmeasured])] };
      await page.screenshot({ path: `${SHOTS}/${s.at.replace(/\//g, "_")}${s.sheet.replace(/[^a-z]+/gi, "-")}.png` });
      const verdict = r.failures.length ? "FAIL" : "pass";
      if (r.failures.length) fails += 1;
      console.log(`${verdict}  ${name}: ${r.failures.length} failed on the five palettes and the seven light looks`);
      for (const f of r.failures) console.log(`    ${f.check}${f.palette ? ` [${f.palette}]` : ""}: ${f.what}: ${f.detail}`.slice(0, 260));
      for (const u of r.unmeasured) console.log(`    look: ${String(u).slice(0, 180)}`);
    } catch (e) {
      fails += 1;
      console.log(`FAIL  ${name}: ${String(e).split("\n")[0].slice(0, 200)}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${SHEETS.length} sheets on the five palettes and the seven light looks, ${fails} failed`);
process.exit(fails ? 1 : 0);
