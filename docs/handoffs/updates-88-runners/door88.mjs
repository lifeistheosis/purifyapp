// Updates 88 (2026-11-15): when the first launch's campaigns ask goes out, against the page switch from the
// front door into /community/, the way the motion walk takes it (scripts/motion-walk.mjs: a first open of /
// whose storage every screen starts from, then fresh() and the router). On the export, served the shell's
// way, reading the main web (GET only), the apps' user agent, motion pinned. Per rAF: the door's held place
// (.community-door-place) and the sign-in section's top.
//   node door88.mjs <out dir> <on|reduce> [runs] [offline]   (offline: the main web not routed, as the walk without --online)
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { fresh } = await import(`${R}/lib/tap.mjs`);

const [base, mode = "reduce", runs = "2", net = "online"] = process.argv.slice(2);
const OUT = path.resolve(base);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function watch() {
  const now = () => Math.round(performance.now() * 10) / 10;
  const W = (window.__dw = { rows: [], shifts: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) W.shifts.push([Math.round(e.startTime), Math.round(e.value * 10000) / 10000, (e.sources || []).map((s) => `${s.node?.nodeName ?? "?"} y ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)}`).join("; ")]); }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  let last = "";
  const frame = () => {
    const place = document.querySelector(".community-door-place");
    const a = document.querySelector('main a[href^="/signin"]');
    const sec = a?.closest("section");
    const row = { path: location.pathname, door: document.documentElement.getAttribute("data-pray-door"), place: place ? Math.round(place.getBoundingClientRect().height) : null, sec: sec ? Math.round(sec.getBoundingClientRect().top) : null, kept: localStorage.getItem("purify:campaigns:lastAnswer") };
    const k = JSON.stringify(row);
    if (k !== last) W.rows.push({ t: now(), ...row });
    last = k;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

for (let run = 1; run <= Number(runs); run++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, mode);
  await serveLikeTheShell(ctx, OUT, {});
  if (net !== "offline") for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const asks = [];
  ctx.on("request", (r) => { if (r.url().includes("/api/campaigns/open")) asks.push({ at: "req", url: new URL(r.url()).pathname, page: r.frame()?.url() }); });
  // The walk's first open: what the device keeps once the app has first opened.
  const first = await ctx.newPage();
  await go(first, "/", { timeout: 60000 });
  await first.waitForTimeout(1500);
  const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
  const askedOnFirst = asks.length;
  await first.close();
  const keptAnswer = kept.find(([k]) => k === "purify:campaigns:lastAnswer")?.[1] ?? "none";
  // The arrival, as walkScreen takes it.
  const page = await ctx.newPage();
  await ctx.addInitScript(watch);
  await fresh(page, "/", kept);
  const before = asks.length;
  const t0 = await page.evaluate(() => performance.now());
  await go(page, "/community/", { timeout: 15000 });
  await page.waitForTimeout(2500);
  const W = await page.evaluate(() => window.__dw);
  const rows = W.rows.filter((r) => r.t >= t0 - 1).map((r) => ({ ...r, t: Math.round(r.t - t0) }));
  const firstDrawn = rows.find((r) => r.path.startsWith("/community") && r.sec !== null);
  const moves = rows.filter((r, i) => i > 0 && r.sec !== null && rows[i - 1].sec !== null && Math.abs(r.sec - rows[i - 1].sec) >= 1).map((r) => ({ t: r.t, sec: r.sec, place: r.place }));
  console.log(`run ${run} (${mode}, ${net}): asked on the first open of /: ${askedOnFirst}; kept answer after it: ${keptAnswer}; asks during the arrival: ${asks.length - before}`);
  console.log(`  Community first drawn at +${firstDrawn?.t} (place ${firstDrawn?.place}, sign-in section top ${firstDrawn?.sec}, mark ${firstDrawn?.door}, kept ${firstDrawn?.kept})`);
  console.log(`  section moves of 1px or more after: ${JSON.stringify(moves)}`);
  console.log(`  rows: ${JSON.stringify(rows.slice(0, 14).map((r) => [r.t, r.path, r.place, r.sec, r.door, r.kept]))}`);
  console.log(`  layout shifts in the arrival: ${JSON.stringify(W.shifts.filter((s) => s[0] >= t0).map((s) => [Math.round(s[0] - t0), s[1], s[2]]))}`);
  await ctx.close();
}
await browser.close();
