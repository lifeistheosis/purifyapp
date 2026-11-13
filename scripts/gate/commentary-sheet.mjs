// The final check's walk of Genesis 1's commentary sheet (the arbiter, 2026-11-12 20:20 UTC: "Genesis 1's
// commentary sheet, in Arabic too"), which the tap walk never reaches: each verse's commentary mark is a
// button 11 to 15 by 5 pixels whose 44px reach is drawn round it (hit-44), and the walk passes over anything
// under 8 pixels. Here each mark is tapped as a finger would (its middle), the sheet it opens is held to
// checkMock with pixels on the five palettes (and the seven light looks on the first), and each control in
// the first sheet is tapped and must change something. Language: the third argument (ar), set as the tap
// walk sets it; the reader: SELLS_PLUS=1 for the new reader (the Android shell).
import fs from "node:fs";
import { chromium } from "playwright";
import { checkMock, LOOKS as THEMES } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, readerWords } from "../lib/sells-plus.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SHOTS = process.argv[2];
const LANG = process.argv[3] || null;
const AT = "/bible/genesis/1/";
const SEVEN = ["Desert", "Jordan", "Blush", "Roses", "Lavender", "Olive", "Stone"];
const light = THEMES.filter(([label]) => SEVEN.includes(label));
if (light.length !== 7) throw new Error("expected the seven light looks");
const fetched = new Map();
async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) fetched.set(url, (async () => {
      const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
      const r = await fetch(url, { headers });
      const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
      return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
    })());
    return route.fulfill(await fetched.get(url));
  } catch { return route.abort(); }
}
const marks = (page) => page.evaluate(() => [...document.querySelectorAll("main button[aria-label]")].filter((b) => b.className.includes("hit-44") && b.closest("[data-verse], [id^=v], p, div") && /\d/.test(b.innerText) && b.querySelector("sup")).map((b, i) => { b.setAttribute("data-cmt", String(i)); return b.getAttribute("aria-label"); }));
const sheetNow = (page) => page.evaluate(() => {
  const ds = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const d = ds[ds.length - 1];
  if (!d) return null;
  for (const x of document.querySelectorAll("[data-cmt-sheet]")) x.removeAttribute("data-cmt-sheet");
  d.setAttribute("data-cmt-sheet", "1");
  const by = d.getAttribute("aria-labelledby");
  const sc = [d, ...d.querySelectorAll("*")].find((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight; });
  return { name: (d.getAttribute("aria-label") || (by && document.getElementById(by)?.textContent) || "").replace(/\s+/g, " ").trim(), text: (d.innerText || "").length, scroll: sc ? Math.round(sc.scrollTop) : 0, expanded: [...d.querySelectorAll("[aria-expanded]")].map((e) => e.getAttribute("aria-expanded")).join(","), url: location.pathname + location.search, dialogs: ds.length };
});
async function fresh(ctx) {
  const page = await ctx.newPage();
  await go(page, AT, { timeout: 30000 });
  let m = [];
  for (let w = 0; w < 20000 && !m.length; w += 1000) { await page.waitForTimeout(1000); m = await marks(page); }
  await page.waitForTimeout(800);
  m = await marks(page);
  return { page, m };
}
async function tapMiddle(page, sel) {
  const el = page.locator(sel).first();
  await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(700);
  const b = await el.boundingBox();
  if (!b) return { covered: "out of reach" };
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const covered = await page.evaluate(({ sel, x, y }) => { const e = document.querySelector(sel); const h = document.elementFromPoint(x, y); if (!h) return "nothing"; if (e === h || e.contains(h)) return null; return `${h.tagName.toLowerCase()} "${(h.getAttribute("aria-label") || h.innerText || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`; }, { sel, x, y });
  if (covered) return { covered, x, y };
  await page.touchscreen.tap(x, y);
  return { x, y, before: b };
}
console.log(`${AT} at 390 by 844, its commentary sheet${LANG ? ` in ${LANG}` : ""}, ${readerWords()}`);
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let fails = 0;
const say = (verdict, what) => { if (verdict === "FAIL") fails += 1; console.log(`${verdict}  ${what}`); };
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(LANG ? { locale: LANG } : {}) });
  await ctx.addInitScript((lang) => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); if (lang) localStorage.setItem("CapacitorStorage.purify_locale", lang); } catch {} }, LANG);
  if (LANG) await ctx.addCookies([{ name: "purify_locale", value: LANG, url: "https://localhost" }]);
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  for (const p of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(p, mainWeb);
  // Every mark: tapped at its middle, the sheet it opens held to checkMock on the five palettes.
  let first = await fresh(ctx);
  const names = first.m;
  console.log(`${names.length} commentary marks: ${names.join("; ").slice(0, 300)}`);
  if (!names.length) say("FAIL", "no commentary mark drawn in 20 seconds");
  await first.page.close();
  let firstControls = [];
  for (let i = 0; i < names.length; i++) {
    const { page } = await fresh(ctx);
    try {
      const t = await tapMiddle(page, `[data-cmt="${i}"]`);
      if (t.covered) { say("FAIL", `"${names[i]}": covered: the finger meets ${t.covered} before it`); continue; }
      let s = null;
      for (let w = 0; w < 6000 && !s; w += 500) { await page.waitForTimeout(500); s = await sheetNow(page); }
      if (!s) { say("FAIL", `"${names[i]}": nothing: the tap opened no sheet`); continue; }
      await page.waitForTimeout(1200);
      const five = await checkMock(page, '[data-cmt-sheet="1"]', { pixels: true });
      const all = [...five.failures];
      let un = [...five.unmeasured];
      if (i === 0) {
        const seven = await checkMock(page, '[data-cmt-sheet="1"]', { pixels: true, palettes: light });
        all.push(...seven.failures);
        un.push(...seven.unmeasured);
        firstControls = await page.evaluate(() => [...document.querySelector('[data-cmt-sheet="1"]').querySelectorAll("button, a[href], [role=button], [role=tab], summary")].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((c, k) => { c.setAttribute("data-cmt-control", String(k)); return (c.getAttribute("aria-label") || c.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40); }));
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/genesis-1-commentary-${LANG ?? "en"}-${SELLS_PLUS ? "noplus" : "open"}.png` });
      }
      const seen = new Set();
      const failures = all.filter((f) => { const k = `${f.check}|${f.palette}|${f.what}`; if (seen.has(k)) return false; seen.add(k); return true; });
      un = [...new Set(un.map(String))];
      say(failures.length ? "FAIL" : "pass", `"${names[i]}" opened "${s.name}": ${failures.length} failed on the five palettes${i === 0 ? " and the seven light looks" : ""}`);
      for (const f of failures) console.log(`    ${f.check}${f.palette ? ` [${f.palette}]` : ""}: ${f.what}: ${f.detail}`.slice(0, 260));
      for (const u of un) console.log(`    look: ${u.slice(0, 200)}`);
    } finally { await page.close(); }
  }
  // Each control in the first verse's sheet: tapped, and it must change something.
  console.log(`the first sheet's controls: ${firstControls.join("; ")}`);
  for (let k = 0; k < firstControls.length; k++) {
    const { page } = await fresh(ctx);
    try {
      const t0 = await tapMiddle(page, '[data-cmt="0"]');
      if (t0.covered) { say("FAIL", `the first mark: covered by ${t0.covered}`); continue; }
      let s = null;
      for (let w = 0; w < 6000 && !s; w += 500) { await page.waitForTimeout(500); s = await sheetNow(page); }
      if (!s) { say("FAIL", "the first mark opened no sheet"); continue; }
      await page.waitForTimeout(1200);
      const named = await page.evaluate((k) => { const d = document.querySelector('[data-cmt-sheet="1"]'); const c = [...d.querySelectorAll("button, a[href], [role=button], [role=tab], summary")].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[k]; if (!c) return null; c.setAttribute("data-cmt-control", "x"); return (c.getAttribute("aria-label") || c.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40); }, k);
      if (named !== firstControls[k]) { console.log(`skipped  "${firstControls[k]}": the sheet drew differently on its second visit (${named})`); continue; }
      const before = await sheetNow(page);
      const t = await tapMiddle(page, '[data-cmt-control="x"]');
      if (t.covered) { say("FAIL", `"${named}": covered: the finger meets ${t.covered} before it`); continue; }
      await page.waitForTimeout(1500);
      const after = (await sheetNow(page)) ?? { name: null, url: await page.evaluate(() => location.pathname + location.search), dialogs: 0 };
      const moved = await page.evaluate((y) => { const e = document.querySelector('[data-cmt-control="x"]'); if (!e) return null; const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2 - y); }, t.y);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      if (!changed) say("FAIL", `"${named}": nothing: the tap changed nothing`);
      else say("pass", `"${named}": ${after.url !== before.url ? `went to ${after.url}` : !after.name ? "closed the sheet" : after.dialogs !== before.dialogs ? `opened "${after.name}"` : after.expanded !== before.expanded ? `expanded ${before.expanded} to ${after.expanded}` : after.scroll !== before.scroll ? `scrolled the sheet ${before.scroll} to ${after.scroll}` : "changed the sheet"}${moved !== null && Math.abs(moved) > 8 && after.name === before.name ? ` (it moved ${moved}px under the finger)` : ""}`);
    } finally { await page.close(); }
  }
  await ctx.close();
} finally { await browser.close(); }
console.log(`\n${fails} failed`);
process.exit(fails ? 1 : 0);
