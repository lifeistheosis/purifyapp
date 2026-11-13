// The final check's tall-card probe (the arbiter, 2026-11-12 20:23 UTC): on four saints' webs, stand
// the card tall and tap the faded web behind it. While the card stands tall the web is faded and must
// be inert: a tap on it changes nothing (no other saint's card, no page, the card still tall). Each web
// is walked at phone size with touch, as the new reader (the Android shell, SELLS_PLUS=1) or the open
// reader, reading the main web as the walks do with --online.
import fs from "node:fs";
import { chromium } from "playwright";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, readerWords } from "../lib/sells-plus.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SHOTS = process.argv[2];
const WEBS = process.env.ONLY_WEB ? [process.env.ONLY_WEB] : ["/saints/irenaeus-of-lyons/web/", "/saints/ambrose-of-milan/web/", "/saints/apostle-john/web/", "/saints/anthony-the-great/web/"];
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
const state = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-saint-web-card]")].filter((c) => !c.hasAttribute("data-away"));
  const c = cards[cards.length - 1];
  return { url: location.pathname + location.search, card: c ? c.getAttribute("aria-label") : null, tall: c ? c.getAttribute("data-state") : null, cards: cards.length, dialogs: document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length };
});
console.log(`${WEBS.length} saints' webs, the card stood tall and the faded web tapped, ${readerWords()}`);
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let fails = 0;
try {
  for (const at of WEBS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
    await pinMotion(ctx, "on");
    await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
    if (SELLS_PLUS) await asAndroidShell(ctx);
    await serveLikeTheShell(ctx, OUT, {});
    for (const pat of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(pat, mainWeb);
    const page = await ctx.newPage();
    const said = [];
    try {
      await go(page, at, { timeout: 30000 });
      await page.waitForTimeout(5000);
      // The card: shown short for the web's own saint, or opened by a tap on the first node.
      let s = await state(page);
      if (!s.card) {
        const node = page.locator("main button:visible").first();
        await node.tap({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1500);
        s = await state(page);
      }
      if (!s.card) throw new Error("no card to stand tall");
      const short = page.locator('[data-saint-web-card]:not([data-away]) button[aria-expanded="false"]').last();
      if (s.tall !== "tall") {
        await short.tap({ timeout: 5000 });
        await page.waitForTimeout(1500);
        s = await state(page);
      }
      if (s.tall !== "tall") throw new Error(`the card for ${s.card} did not stand tall`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${at.split("/")[2]}-tall.png` });
      // The faded web's nodes that stand clear of the tall card, where a finger can reach them.
      const findTargets = () => page.evaluate(() => {
        const card = [...document.querySelectorAll("[data-saint-web-card]")].filter((c) => !c.hasAttribute("data-away")).pop();
        const box = card.getBoundingClientRect();
        const out = [];
        // The web itself (the view the bar switches), not the page's own bar above it.
        for (const el of document.querySelectorAll("#saint-web-view button, #saint-web-view a[href], #saint-web-view [role=button]")) {
          if (card.contains(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) continue;
          if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) continue;
          const hit = document.elementFromPoint(x, y);
          // Where the page's own bar or plates (fixed or sticky, outside the web) stand over the web, a
          // finger touches them, not the web: those points are not the web's to answer.
          const pinned = (() => { for (let e = hit; e; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === "fixed" || p === "sticky") return true; } return false; })();
          if (hit && !hit.closest("#saint-web-view") && !card.contains(hit) && pinned) continue;
          // Inside the reach a pinned bar's own controls draw round them (hit-44 below the Web and Timeline
          // switch): a finger there is the bar's, not the web's (the final check, Anthony's web, y 52).
          const barReach = [...document.querySelectorAll("button, a[href], [role=tab]")].some((c) => {
            let q = c; let pin = false; for (; q; q = q.parentElement) { const ps = getComputedStyle(q).position; if (ps === "fixed" || ps === "sticky") { pin = true; break; } }
            if (!pin || c.closest("#saint-web-view")) return false;
            const cr = c.getBoundingClientRect(); const af = getComputedStyle(c, "::after");
            const below = af.content !== "none" ? Math.max(0, -parseFloat(af.bottom) || 0) : 0;
            return x >= cr.left - 8 && x <= cr.right + 8 && y >= cr.top && y <= cr.bottom + below;
          });
          if (barReach) continue;
          out.push({ name: (el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50), x, y, under: hit ? (hit.closest("[inert]") ? "inert" : hit.tagName.toLowerCase()) : "nothing" });
        }
        return out.slice(0, 12);
      });
      const targets = await findTargets();
      // Every reachable control of the faded web, the card stood tall again before each: by 05aee81e1 a
      // tap there lands on the empty web and lowers the card as a backdrop does, and nothing under the card
      // answers: no other saint's card, no page, no sheet. Lowering the card is that design, not a fail.
      let tapped = 0;
      let lowered = 0;
      for (const t of targets) {
        let before = await state(page);
        if (before.tall !== "tall") {
          await page.locator('[data-saint-web-card]:not([data-away]) button[aria-expanded="false"]').last().tap({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1200);
          before = await state(page);
        }
        if (before.tall !== "tall") { said.push(`the card would not stand tall again before "${t.name}"`); break; }
        // Aimed again where the control stands now: the web moves as the card rises and falls.
        const now = (await findTargets()).find((x) => x.name === t.name);
        if (!now) { said.push(`"${t.name}" no longer in reach once the card stood tall again`); continue; }
        if (process.env.DEBUG_TAP) console.log("   aim", JSON.stringify(now), JSON.stringify(await page.evaluate(({ x, y }) => { const out = []; for (let e = document.elementFromPoint(x, y); e && out.length < 6; e = e.parentElement) out.push(`${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${String(e.className).slice(0, 40)}${e.hasAttribute("inert") ? "[inert]" : ""} ${getComputedStyle(e).position}`); return out; }, now)), "scrollY", await page.evaluate(() => scrollY));
        await page.touchscreen.tap(now.x, now.y);
        await page.waitForTimeout(900);
        const after = await state(page);
        tapped += 1;
        if (after.tall !== "tall") lowered += 1;
        const besidesTall = (x) => JSON.stringify({ ...x, tall: undefined });
        if (besidesTall(after) !== besidesTall(before)) {
          said.push(`a tap on the faded web's "${t.name}" changed the screen: ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/${at.split("/")[2]}-after-${tapped}.png` });
          break;
        }
      }
      const verdict = said.length ? "FAIL" : "pass";
      if (said.length) fails += 1;
      console.log(`${verdict}  ${at}: the card for ${s.card} stood tall; ${targets.length} of the faded web's controls in reach, ${tapped} tapped, ${lowered} lowered the card as a backdrop does${targets.length ? ` (under the first: ${targets[0].under})` : ""}`);
      for (const l of said) console.log(`    ${l.slice(0, 300)}`);
    } catch (e) {
      fails += 1;
      console.log(`FAIL  ${at}: ${String(e).split("\n")[0].slice(0, 200)}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${WEBS.length} webs, ${fails} failed`);
process.exit(fails ? 1 : 0);
