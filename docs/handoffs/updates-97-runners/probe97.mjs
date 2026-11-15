// Updates 97 (2026-11-15): Updates 95's probe (docs/handoffs/updates-95-runners/probe95.mjs), with a chapter's
// Community section among the boxes it reads (disc) and one more network: feed.
//   node probe97.mjs <from> <to-path | control text> <on|reduce> [online|offline|feed] [--out dir] [--new] [--up px]
// feed: every request off this origin is cut but a chapter's Community feed, which answers at once (after
// --delay ms) with the walks' one stand-in post in plain words (scripts/lib/main-web.mjs): the online answer
// at its fastest, while a reader still stands where the chapter opened. --up: then scroll up that far, as a
// reader going back to the verses, and read on. --end: 700ms after the chapter is drawn, stand at its end (the
// chapter's foot, KeepScrolling on the screen), as a reader who has read to the foot when the answer comes.
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = oi >= 0 ? args.splice(oi, 2)[1] : null;
const ni = args.indexOf("--new"); // the walk's new reader (SELLS_PLUS=1): the page is the Android shell, no Plus
const NEW = ni >= 0 ? Boolean(args.splice(ni, 1)) : false;
const ui = args.indexOf("--up");
const UP = ui >= 0 ? Number(args.splice(ui, 2)[1]) : 0;
const ei = args.indexOf("--end");
const END = ei >= 0 ? Boolean(args.splice(ei, 1)) : false;
const di = args.indexOf("--delay");
const DELAY = di >= 0 ? Number(args.splice(di, 2)[1]) : 0;
const { standInFor } = await import(`${R}/lib/main-web.mjs`);
const BASE = OUT ? ORIGIN : "http://localhost:3000";
const [from, to, mode = "on", net = "online"] = args;
const offline = net.startsWith("offline");
const keepMedia = net === "offline-keepmedia"; // the plate stands: only the rest of the website is cut
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await pinMotion(ctx, mode);
if (NEW) await (await import(`${R}/lib/sells-plus.mjs`)).asAndroidShell(ctx);
if (OUT) await serveLikeTheShell(ctx, OUT, {});
if (net === "feed") await ctx.route((u) => !u.href.startsWith(BASE) || /\/api\/community\/posts\?chapter=/.test(u.href), async (r) => {
  const u = r.request().url();
  if (!/\/api\/community\/posts\?chapter=/.test(u)) return r.abort();
  const cors = { "access-control-allow-origin": r.request().headers()["origin"] ?? "*", "access-control-allow-credentials": "true", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, OPTIONS" };
  if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
  if (DELAY) await new Promise((ok) => setTimeout(ok, DELAY));
  const a = standInFor(u, { status: 200, headers: {}, body: Buffer.from(JSON.stringify({ posts: [] })) });
  await r.fulfill({ status: a.status, headers: { ...a.headers, ...cors }, body: a.body });
});
if (offline) await ctx.route((u) => !u.href.startsWith(BASE) || (!OUT && !keepMedia && u.pathname.startsWith("/history/media/")), (r) => r.abort());
const page = await ctx.newPage();
await page.goto(BASE + from, { waitUntil: "load", timeout: 240000 });
await page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const W = (window.__p = { frames: [], marks: [] });
  const tl = () => Math.round(document.timeline.currentTime);
  const SEL = { column: "section.history-line > div", plate: "[data-event-plate]", keep: "[data-keep-scrolling]", disc: "[aria-labelledby=chapter-discussed]", person: "[data-walk-person] .min-w-0", portrait: "[data-walk-portrait]" };
  let last = "";
  const step = () => {
    const row = { path: location.pathname, sy: Math.round(scrollY), sh: document.documentElement.scrollHeight };
    for (const [k, s] of Object.entries(SEL)) { const el = document.querySelector(s); if (el) { const r = el.getBoundingClientRect(); row[k] = `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; } }
    const key = JSON.stringify(row);
    if (key !== last) W.frames.push({ tl: tl(), ...row });
    last = key;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const desc = (n) => n.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 3).join(".") : ""} "${(n.textContent || "").trim().slice(0, 30)}"` : null;
  new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) { const d = desc(n); if (d) W.marks.push({ tl: tl(), what: `+ ${d} in ${desc(m.target)}` }); }
      for (const n of m.removedNodes) { const d = desc(n); if (d) W.marks.push({ tl: tl(), what: `- ${d} from ${desc(m.target)}` }); }
    }
  }).observe(document.body, { subtree: true, childList: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) for (const s of e.sources || []) W.marks.push({ tl: tl(), what: `shift ${e.value.toFixed(4)} ${desc(s.node) ?? "?"} ${Math.round(s.previousRect.y)} -> ${Math.round(s.currentRect.y)} (x ${Math.round(s.previousRect.x)} -> ${Math.round(s.currentRect.x)})` }); }).observe({ type: "layout-shift" });
  for (const ev of ["error", "load"]) addEventListener(ev, (e) => { const t = e.target; if (t && t.tagName === "IMG") W.marks.push({ tl: tl(), what: `img ${ev} ${(t.currentSrc || t.src).slice(-60)}` }); }, true);
});
const t0 = Date.now();
if (to.startsWith("/")) await page.evaluate((p) => window.next.router.push(p), to);
else {
  const loc = page.locator(`a, button`).filter({ hasText: to }).or(page.locator(`[aria-label*="${to}"]`)).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await loc.click();
}
if (END) { await page.waitForFunction((f) => location.pathname !== f && document.querySelector("[data-keep-scrolling]"), from, { timeout: 30000 }); await page.waitForTimeout(700); await page.evaluate(() => { window.__p.marks.push({ tl: Math.round(document.timeline.currentTime), what: "stand at the end" }); scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); }); }
await page.waitForTimeout(3000);
if (UP) { await page.evaluate((y) => { window.__p.marks.push({ tl: Math.round(document.timeline.currentTime), what: `scroll up ${y}` }); scrollBy({ top: -y, behavior: "instant" }); }, UP); await page.waitForTimeout(2000); }
const W = await page.evaluate(() => window.__p);
console.log(`${from} -> ${to} (${mode}, ${net}${DELAY ? ` +${DELAY}ms` : ""}${END ? ", at the end" : ""}${UP ? `, up ${UP}` : ""}${OUT ? ", export" : ", dev"}) at ${new Date(t0).toISOString()}`);
const all = [...W.frames.map((f) => ({ tl: f.tl, s: `F ${JSON.stringify({ ...f, tl: undefined })}` })), ...W.marks.map((m) => ({ tl: m.tl, s: `  ${m.what}` }))].sort((a, b) => a.tl - b.tl);
for (const x of all) if (!/^  [+-] (script|link|meta|style|title)/.test(x.s)) console.log(x.tl, x.s.slice(0, 260));
await browser.close();
