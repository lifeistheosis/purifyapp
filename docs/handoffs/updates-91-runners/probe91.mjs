// Updates 91 (2026-11-15): two arrivals read frame by frame, on a dev server or on the export.
//   node probe91.mjs line <from[@scrollY]> <to#hash> <on|reduce> [runs] [--out dir]
//   node probe91.mjs community <on|reduce> [runs] [offline] [--out dir]
// line: a rAF loop running before the move, like the motion walk's sampler (scripts/gate/inpage.mjs),
//   reads the fade under the pill, the running line and the scroll each frame; a MutationObserver on the
//   line and the scroll event say in which frame (document.timeline's time) each changed.
// community: the front door, then the router into /community/, the main web cut when offline;
//   layout shifts with the moved node's classes and trail, and what was put into <main> per frame.
// Without --out it reads http://localhost:3000 (next dev); with it, the export served the shell's way.
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = oi >= 0 ? args.splice(oi, 2)[1] : null;
const BASE = OUT ? ORIGIN : "http://localhost:3000";
const [kind, ...rest] = args;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function context(mode, offline) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, mode);
  if (OUT) await serveLikeTheShell(ctx, OUT, {});
  if (offline) await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  return ctx;
}
async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 180000 });
  await page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout: 60000 });
}

function lineWatch() {
  const W = (window.__p = { frames: [], marks: [] });
  const tl = () => Math.round(document.timeline.currentTime * 10) / 10;
  let last = "";
  const step = (t) => {
    const fade = document.querySelector(".pill-fade");
    const line = document.querySelector("[data-running-line]");
    const row = { path: location.pathname, sy: Math.round(scrollY), fade: fade ? Math.round(fade.getBoundingClientRect().top) : null, open: line ? line.hasAttribute("data-open") : null, text: line?.textContent ?? null };
    const k = JSON.stringify(row);
    if (k !== last) W.frames.push({ t: Math.round(t * 10) / 10, tl: tl(), ...row });
    last = k;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  new MutationObserver((list) => {
    for (const m of list) {
      const line = m.target.closest?.("[data-running-line]") ?? m.target.parentElement?.closest?.("[data-running-line]");
      if (line) { W.marks.push({ tl: tl(), now: Math.round(performance.now()), what: `line ${m.type} open=${line.hasAttribute("data-open")} "${line.textContent}"` }); break; }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-open"] });
  addEventListener("scroll", () => W.marks.push({ tl: tl(), now: Math.round(performance.now()), what: `scroll ${Math.round(scrollY)}` }), { capture: true, passive: true });
}

function doorWatch() {
  const W = (window.__p = { shifts: [], adds: [], frames: [] });
  const tl = () => Math.round(document.timeline.currentTime);
  const trail = (n) => { const out = []; for (let e = n; e && e !== document.body && out.length < 6; e = e.parentElement) out.push(`${e.nodeName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`); return out.join(" < "); };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) W.shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 10000) / 10000, src: (e.sources || []).map((s) => ({ node: s.node ? trail(s.node.nodeType === 1 ? s.node : s.node.parentElement) : "?", text: (s.node?.textContent ?? "").slice(0, 60), from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)], to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)] })) }); }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  new MutationObserver((list) => {
    for (const m of list) {
      if (!m.target.closest?.("main")) continue;
      for (const n of m.addedNodes) if (n.nodeType === 1 && W.adds.length < 80) W.adds.push({ t: Math.round(performance.now()), tl: tl(), add: trail(n), text: (n.textContent ?? "").slice(0, 50) });
      for (const n of m.removedNodes) if (n.nodeType === 1 && W.adds.length < 80) W.adds.push({ t: Math.round(performance.now()), tl: tl(), rm: trail(n), text: (n.textContent ?? "").slice(0, 50) });
    }
  }).observe(document.body, { subtree: true, childList: true });
}

if (kind === "line") {
  const [from, to, mode = "reduce", runs = "2"] = rest;
  for (let run = 1; run <= Number(runs); run++) {
    const ctx = await context(mode, false);
    const page = await ctx.newPage();
    const [fromPath, at] = from.split("@");
    await open(page, fromPath);
    await page.waitForTimeout(1500);
    if (at) await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Number(at));
    await page.evaluate(lineWatch);
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => performance.now());
    await page.evaluate((h) => window.next.router.push(h), to);
    await page.waitForTimeout(2500);
    const W = await page.evaluate(() => window.__p);
    const p = new URL(to, BASE).pathname;
    const frames = W.frames.filter((f) => f.path.replace(/\/$/, "") === p.replace(/\/$/, "")).slice(0, 8);
    const firstTl = frames[0]?.tl ?? 0;
    console.log(`run ${run} (${mode}) ${from} -> ${to}`);
    for (const f of frames) console.log(`  frame tl ${f.tl} (+${Math.round(f.t - t0)}): sy ${f.sy} fade ${f.fade} open ${f.open} "${f.text}"`);
    for (const m of W.marks.filter((m) => m.tl >= firstTl - 100).slice(0, 10)) console.log(`  mark tl ${m.tl} (+${Math.round(m.now - t0)}): ${m.what}`);
    await ctx.close();
  }
} else if (kind === "community") {
  const [mode = "reduce", runs = "2", net = "online"] = rest;
  for (let run = 1; run <= Number(runs); run++) {
    const ctx = await context(mode, net === "offline");
    const first = await ctx.newPage();
    await open(first, "/");
    await first.waitForTimeout(1500);
    const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
    await first.close();
    const page = await ctx.newPage();
    await page.addInitScript((k) => { if (!sessionStorage.getItem("p91")) { sessionStorage.setItem("p91", "1"); for (const [a, b] of k) localStorage.setItem(a, b); } }, kept);
    await open(page, "/");
    await page.waitForTimeout(1500);
    await page.evaluate(doorWatch);
    const t0 = await page.evaluate(() => performance.now());
    await page.evaluate(() => window.next.router.push("/community/"));
    await page.waitForTimeout(2500);
    const W = await page.evaluate(() => window.__p);
    console.log(`run ${run} (${mode}, ${net})`);
    for (const s of W.shifts.filter((s) => s.t >= t0)) console.log(`  shift +${Math.round(s.t - t0)} ${s.v}: ${JSON.stringify(s.src)}`);
    for (const a of W.adds.filter((a) => a.t >= t0).slice(0, 40)) console.log(`  +${Math.round(a.t - t0)} tl ${a.tl} ${a.add ? "add " + a.add : "rm " + a.rm} "${a.text}"`);
    await ctx.close();
  }
}
await browser.close();
