// Gate 3b's tap watcher (2026-11-15): taps a door the way a reader does on the gate's export, served the
// shell's way and reading the main web (GET only), and reads where every block of words stands in each frame
// from the tap to WINDOW_MS after (default 2000), with getBoundingClientRect inside requestAnimationFrame
// (no MessageChannel sampler). Each element's box (top, left, height) and its first text's line box (left,
// top) are compared frame to frame; a step of 0.5px or more is recorded with the fonts that finished loading
// (document.fonts) and the woff2 files that arrived (resource timing) around it, and the running animations.
// Scroll is allowed for: a top counts only when it changed both on screen and in the document. Blocks are
// those with words on or near the screen (up to 400), found again at every change of the page or scroll.
//   saints    from /discover/, tap the Saints door (a[href="/saints"])        Updates 69's item 4
//   settings  from /account/, tap the Settings door (a[href="/settings"])     Updates 69's item 4
//   chat      from /discover/, tap the Chat door (a[href="/community"])       the arbiter's note 2
//   node tapwatch.mjs <out dir> <jsonl> <job@lang@cpu@try>...
import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const JOBS = {
  saints: { from: "/discover/", to: "/saints" },
  settings: { from: "/account/", to: "/settings" },
  chat: { from: "/discover/", to: "/community" },
};
const [base, jsonl, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const WINDOW = Number(process.env.WINDOW_MS ?? 2000);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Runs in the page, installed just before the tap. */
function watch(windowMs) {
  const t0 = performance.now();
  const W = (window.__tw = { tap: null, frames: 0, fonts: [], res: [], els: {}, moves: [], anims: [], scrolls: [], done: false });
  const mark = () => { W.tap ??= performance.now() - t0; };
  addEventListener("pointerdown", mark, { capture: true, once: true });
  addEventListener("touchstart", mark, { capture: true, once: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      if (/\.woff2?(\?|$)/.test(e.name) && e.startTime >= t0 - 20)
        W.res.push({ file: e.name.split("/").pop(), start: e.startTime - t0, end: e.responseEnd - t0 });
  }).observe({ type: "resource", buffered: true });
  const faces = new Map();
  for (const f of document.fonts) faces.set(f, f.status);
  const ids = new WeakMap();
  const last = {};
  let nid = 1;
  let dirty = true;
  let cands = [];
  let lastSy = scrollY;
  new MutationObserver(() => { dirty = true; }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
  const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} "${(e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48)}"`;
  const rebuild = () => {
    const set = new Set();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const H = innerHeight;
    for (let n = tw.nextNode(); n && set.size < 400; n = tw.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const p = n.parentElement;
      if (!p || set.has(p) || p.closest("script,style,noscript,[data-tab-bar]")) continue;
      const r = p.getBoundingClientRect();
      if ((r.width === 0 && r.height === 0) || r.bottom < -H / 2 || r.top > H * 1.5) continue;
      set.add(p);
    }
    for (const a of document.querySelectorAll("main article, main h1, main h2")) set.add(a);
    cands = [...set];
  };
  const frame = () => {
    const t = performance.now() - t0;
    W.frames++;
    for (const f of document.fonts) {
      const was = faces.get(f);
      if (was !== f.status) {
        faces.set(f, f.status);
        if (f.status === "loaded") W.fonts.push({ t, family: f.family.replace(/["']/g, "").slice(0, 40), weight: f.weight, style: f.style, range: (f.unicodeRange || "").slice(0, 20) });
      }
    }
    const sy = scrollY;
    if (dirty || sy !== lastSy) { rebuild(); dirty = false; }
    if (sy !== lastSy) { W.scrolls.push({ t, from: lastSy, to: sy }); lastSy = sy; }
    let moved = 0;
    for (const e of cands) {
      if (!e.isConnected) continue;
      const b = e.getBoundingClientRect();
      if ((b.width === 0 && b.height === 0) || b.bottom <= 0 || b.top >= innerHeight) continue;
      let tl = null;
      let tt = null;
      const tn = [...e.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (tn) {
        const rg = document.createRange();
        rg.selectNodeContents(tn);
        const q = rg.getBoundingClientRect();
        tl = q.left;
        tt = q.top;
      }
      const cur = { top: b.top, left: b.left, h: b.height, tl, tt, sy };
      let id = ids.get(e);
      if (!id) {
        id = nid++;
        ids.set(e, id);
        W.els[id] = { d: desc(e), font: getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim().slice(0, 40), first: t, old: W.tap === null, top: Math.round(b.top) };
        last[id] = cur;
        continue;
      }
      const p = last[id];
      const both = (now, was) => {
        if (now === null || was === null) return 0;
        const raw = now - was;
        const doc = now + cur.sy - (was + p.sy);
        return Math.abs(raw) < Math.abs(doc) ? raw : doc;
      };
      const d = { top: both(cur.top, p.top), left: cur.left - p.left, h: cur.h - p.h, tl: tl === null || p.tl === null ? 0 : tl - p.tl, tt: both(tt, p.tt) };
      if (Object.values(d).some((v) => Math.abs(v) >= 0.5)) {
        moved++;
        if (W.moves.length < 3000) W.moves.push({ t, id, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Math.round(v * 10) / 10])), at: Math.round(cur.top) });
      }
      last[id] = cur;
    }
    if (moved) {
      const running = document.getAnimations().filter((a) => a.playState === "running");
      W.anims.push({ t, running: running.length, on: running.slice(0, 3).map((a) => { const el = a.effect?.target; return `${a.animationName ?? a.constructor.name}${el ? " " + (el.tagName ?? "").toLowerCase() : ""}${a.effect?.pseudoElement ?? ""}`; }) });
    }
    if ((W.tap !== null && t - W.tap > windowMs) || t > windowMs + 4000) { W.cands = cands.length; W.done = true; return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function run(spec) {
  const [job, lang, cpu, n] = spec.split("@");
  const J = JOBS[job];
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  try {
    const cdp = await ctx.newCDPSession(page);
    if (Number(cpu) > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(cpu) });
    await go(page, J.from, { timeout: 120000 });
    const link = page.locator(`a[href="${J.to}"], a[href="${J.to}/"]`).first();
    await link.waitFor({ timeout: 120000 });
    await page.waitForTimeout(6000);
    await link.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => performance.getEntriesByType("resource").filter((e) => /\.woff2/.test(e.name)).map((e) => e.name.split("/").pop()));
    const from = await page.evaluate(() => location.pathname);
    await page.evaluate(watch, WINDOW);
    await link.tap();
    await page.waitForFunction(() => window.__tw?.done, null, { timeout: 60000 });
    const W = await page.evaluate(() => window.__tw);
    const tap = W.tap ?? 0;
    const rel = (t) => Math.round(t - tap);
    const res = W.res.map((r) => ({ file: r.file, start: rel(r.start), end: rel(r.end) }));
    const fonts = W.fonts.map((f) => ({ ...f, t: rel(f.t) }));
    const near = (t) => {
      const f = fonts.filter((x) => x.t <= rel(t) && rel(t) - x.t <= 150).pop();
      const r = res.filter((x) => x.end <= rel(t) && rel(t) - x.end <= 200).pop();
      return [f ? `${f.family} ${f.weight} ${f.style} loaded at ${f.t}ms` : null, r ? `${r.file} arrived at ${r.end}ms` : null].filter(Boolean).join("; ") || null;
    };
    const moves = W.moves.map((m) => ({ ...m, t: rel(m.t), el: W.els[m.id].d, font: W.els[m.id].font, old: W.els[m.id].old, firstAt: rel(W.els[m.id].first) }));
    const big = moves.filter((m) => Math.max(Math.abs(m.top), Math.abs(m.left), Math.abs(m.tl), Math.abs(m.tt)) >= 1 || Math.abs(m.h) >= 1);
    const anim = (t) => W.anims.find((a) => rel(a.t) === t);
    const faults = big.filter((m) => !m.old).map((m) => ({ ...m, cause: near(m.t + tap), anim: anim(m.t) }));
    const shot = path.join(path.dirname(jsonl), `shot-${spec.replace(/[@/]/g, "_")}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    const fresh = Object.values(W.els).filter((e) => !e.old);
    const byFont = {};
    for (const e of fresh) byFont[e.font] = (byFont[e.font] ?? 0) + 1;
    const row = { spec, newEls: fresh.length, firstNew: fresh.length ? rel(Math.min(...fresh.map((e) => e.first))) : null, byFont, from, to: await page.evaluate(() => location.pathname), frames: W.frames, woff2Before: before.length, res, fonts, scrolls: W.scrolls.map((s) => ({ ...s, t: rel(s.t) })), newMoves1px: faults.length, oldMoves1px: big.length - faults.length, faults: faults.slice(0, 60), cands: W.cands, oldMoves: big.filter((m) => m.old).slice(0, 30).map((m) => ({ ...m, cause: near(m.t + tap), anim: anim(m.t) })), small: moves.filter((m) => !m.old).length, errors, shot };
    fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
    console.log(`${spec}: ${row.from} -> ${row.to}, ${W.frames} frames, woff2 after the tap ${res.length} (${res.map((r) => `${r.file}@${r.end}`).join(", ")}), faces loaded ${fonts.length}, new blocks ${row.newEls} from ${row.firstNew}ms, moves >=1px on the opened page ${faults.length} (old page ${row.oldMoves1px})`);
  } catch (e) {
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300), errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

for (const s of specs) await run(s);
await browser.close();
