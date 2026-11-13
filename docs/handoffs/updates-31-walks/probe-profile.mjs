// Updates 31: Updates 30's probe, with NAMES=1 (the merge's posts: each writer's name now, from a profile not private).
// Probe: a tap on an author's name on /community/: the profile card's visual top (with its transform), its layout top, height and styles, frame by frame, and the layout shifts the browser reports.
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb, standInFor } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { asAndroidShell } from "/home/user/purifyapp/scripts/lib/sells-plus.mjs";
const [OUT, NAME = "Purify"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: (process.env.W || 390) < 600, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, OUT, {});
for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(site, mainWeb);
await ctx.route("https://purifyapp.net/api/community/posts**", async (route) => {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  try {
    const r = await fetch(req.url());
    const headers = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
    let body = Buffer.from(await r.arrayBuffer());
    // STATUS=1: the posts as the merge will serve them, each writer's status line added from their public profile.
    if ((process.env.STATUS || process.env.NAMES) && r.status === 200) {
      const j = JSON.parse(body.toString());
      const handles = [...new Set((j.posts ?? []).map((p) => p.author_handle).filter(Boolean))];
      const seen = new Map(await Promise.all(handles.map(async (h) => { try { const pr = await (await fetch(`https://purifyapp.net/api/community/profile?h=${encodeURIComponent(h)}`)).json(); const p = pr?.profile ?? pr; return [h, p ?? null]; } catch { return [h, null]; } })));
      for (const p of j.posts ?? []) {
        const pr = p.author_handle ? seen.get(p.author_handle) : null;
        if (!pr) continue;
        if (process.env.STATUS) p.author_status = pr.status ?? null;
        // NAMES=1: a profile not private gives the name its writer goes by now (lib/community/authorStatus.ts).
        if (process.env.NAMES && pr.private !== true && pr.name && pr.name !== p.author_name) {
          console.log(`name stood in: ${p.author_handle}: "${p.author_name}" -> "${pr.name}"`);
          p.author_name = pr.name;
        }
      }
      if (process.env.STATUS) console.log(`stood in: ${[...seen].filter(([, v]) => v?.status).map(([h, v]) => `${h}: "${v.status}"`).join(", ")}`);
      body = Buffer.from(JSON.stringify(j));
    }
    const answer = { status: r.status, headers, body };
    return route.fulfill(standInFor(req.url(), answer) ?? answer);
  } catch { return route.abort(); }
});
const page = await ctx.newPage();
await go(page, "/community/", { timeout: 30000 });
await page.waitForTimeout(process.env.STATUS || process.env.NAMES ? 9000 : 3500);
await page.evaluate(() => {
  const log = (window.__p = []);
  const t0 = performance.now();
  // Every shift the browser reports, anywhere: the card, what is in it, and the page under it.
  new PerformanceObserver((l) => { for (const e of l.getEntries()) for (const s of e.sources ?? []) { const n = s.node && s.node.nodeType === 1 ? s.node : s.node?.parentElement; const where = !n ? "?" : n.matches?.("[data-profile-card]") ? "card" : n.closest?.("[data-profile-card]") ? `in card <${n.tagName.toLowerCase()} ${String(n.className).slice(0, 50)}>` : `page <${n.tagName?.toLowerCase()} ${String(n.className).slice(0, 40)}>`; const far = Math.max(Math.abs(s.currentRect.x - s.previousRect.x), Math.abs(s.currentRect.y - s.previousRect.y)); log.push(`${Math.round(e.startTime - t0)}ms SHIFT${far >= 24 ? " >=24" : ""} ${where} from ${Math.round(s.previousRect.x)},${Math.round(s.previousRect.y)} to ${Math.round(s.currentRect.x)},${Math.round(s.currentRect.y)} (h ${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)})`); } }).observe({ type: "layout-shift" });
  let last = "";
  const step = () => {
    const c = document.querySelector("[data-profile-card]");
    if (c) {
      const r = c.getBoundingClientRect();
      const key = `vis top ${Math.round(r.top)} h ${Math.round(r.height)} | layout h ${c.offsetHeight} style.h "${c.style.height}" tf "${c.style.transform}" tr "${c.style.transition}"`;
      if (key !== last) log.push(`${Math.round(performance.now() - t0)}ms ${key}`);
      last = key;
    }
    if (performance.now() - t0 < 3000) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
const spot = await page.evaluate((name) => {
  const b = [...document.querySelectorAll("article button")].find((x) => (x.getAttribute("aria-label") || x.textContent || "").trim() === name);
  if (!b) return null;
  b.scrollIntoView({ block: "center", behavior: "instant" });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, NAME);
console.log(`the name: ${JSON.stringify(spot)}`);
await page.waitForTimeout(600);
await page.evaluate(() => (window.__p.length = 0));
await page.touchscreen.tap(spot.x, spot.y);
await page.waitForTimeout(3200);
for (const l of await page.evaluate(() => window.__p)) console.log(l);
console.log(await page.evaluate(() => { const c = document.querySelector("[data-profile-card]"); if (!c) return "no card"; const st = [...c.querySelectorAll("p")].find((p) => p.querySelector(".sr-only") && /status/i.test(p.textContent || "")); return `card at rest: top ${Math.round(c.getBoundingClientRect().top)}, bottom ${Math.round(c.getBoundingClientRect().bottom)} of ${innerHeight}; status row ${st ? "shown" : "none"}`; }));
await browser.close();
