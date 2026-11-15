// Updates 87 (2026-11-15): the causes behind Updates 82's two follow-ups, on the gate's export, served the
// shell's way and reading the main web (GET only), at 390x844, CPU 4x, under the apps' user agent, a new
// reader. The numbers are taken with Updates 81's runner (lang81.mjs, unchanged); this one finds causes.
//   open@<lang>@<path>[@trace]  a cold open of <path>. Every English-only catalog string put in the page,
//                        with its ancestors and whether anything hides it; when Today's greeting goes into the
//                        page and whether it is ever drawn; when the reader's words first go in; long tasks;
//                        the route's first mark drawn. With @trace, the main thread from the reader's words
//                        going in to the mark drawn, by kind and by the code file that ran.
//   walk@<lang>          a cold open of / in <lang>, a wait for the ready-ahead, then the pages it readies,
//                        reached by taps as a reader reaches them; on each, every English-only catalog string
//                        drawn on the screen in the 3 s after the tap, with its ancestors.
//   node lang87.mjs <out dir> <jsonl> <spec>...
import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const cat = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = cat("en");
/** English catalog strings the reader's language words otherwise (as lang81.mjs). */
const englishOnly = (lang) => {
  if (lang === "en") return [];
  const L = cat(lang);
  return [...new Set(Object.entries(EN).filter(([k, v]) => typeof v === "string" && L[k] && L[k] !== v && /[A-Za-z]{2}/.test(v) && !/[{}<]/.test(v) && v.length <= 80).map(([, v]) => v.trim()))];
};

/** In the page from its first script: shared helpers on window.__u87. */
function helpers({ english }) {
  const now = () => Math.round(performance.now() * 10) / 10;
  const EN = new Set(english);
  const desc = (el) => {
    if (!el || el.nodeType !== 1) return "?";
    const data = [...el.attributes].filter((a) => a.name.startsWith("data-") || a.name === "hidden" || a.name === "inert" || a.name === "aria-hidden" || a.name === "role").map((a) => (a.value && a.value.length < 24 ? `${a.name}=${a.value}` : a.name)).join(",");
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}${data ? `[${data}]` : ""}`;
  };
  const chain = (n, depth = 14) => {
    const out = [];
    for (let e = n.nodeType === 1 ? n : n.parentElement; e && out.length < depth && e !== document.documentElement; e = e.parentElement) out.push(desc(e));
    return out.join(" < ");
  };
  /** Why a node is not on the screen, if it is not: the first reason found going up. */
  const hiddenWhy = (n) => {
    for (let e = n.nodeType === 1 ? n : n.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hasAttribute("hidden")) return `hidden on ${desc(e)}`;
      if (e.hasAttribute("inert")) return `inert on ${desc(e)}`;
      const cs = getComputedStyle(e);
      if (cs.display === "none") return `display:none on ${desc(e)}`;
      if (cs.visibility === "hidden") return `visibility:hidden on ${desc(e)}`;
      if (Number(cs.opacity) === 0) return `opacity 0 on ${desc(e)}`;
    }
    return null;
  };
  const onScreen = (n) => {
    const rg = document.createRange();
    rg.selectNodeContents(n);
    return [...rg.getClientRects()].some((b) => b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth);
  };
  window.__u87 = { now, EN, desc, chain, hiddenWhy, onScreen };
}

function openWatch({ ms }) {
  const { now, EN, chain, hiddenWhy, onScreen } = window.__u87;
  const W = (window.__lw = { english: [], englishFrames: [], today: [], arIn: null, armed: [], longtasks: [], frames: [], done: false });
  const realST = window.setTimeout;
  window.setTimeout = function (fn, d, ...rest) { if (d === 2500) W.armed.push(now()); return realST.call(window, fn, d, ...rest); };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) W.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch {}
  const live = [];
  const scan = (n) => {
    if (n.nodeType === 3) {
      const w = n.nodeValue.trim();
      if (!w) return;
      if (W.arIn === null && /[؀-ۿ]/.test(w) && !n.parentElement?.closest("[data-launch-frame]")) { W.arIn = now(); performance.mark("u87-ar"); }
      if (EN.has(w)) { live.push(n); W.english.push({ t: now(), w, chain: chain(n), hidden: hiddenWhy(n) }); }
      return;
    }
    if (n.nodeType !== 1 || n.nodeName === "SCRIPT" || n.nodeName === "STYLE") return;
    if (!W.contentIn && location.pathname.startsWith("/saints") && (n.matches?.("a.press-card") || n.querySelector?.("a.press-card"))) { W.contentIn = now(); performance.mark("u87-content"); }
    if (n.matches?.("h2.title-in") || n.querySelector?.("h2.title-in")) W.today.push({ t: now(), at: location.pathname, chain: chain(n.matches("h2.title-in") ? n : n.querySelector("h2.title-in"), 6) });
    const it = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    for (let x = it.nextNode(); x; x = it.nextNode()) scan(x);
  };
  new MutationObserver((recs) => { for (const r of recs) { if (r.type === "characterData") scan(r.target); else for (const a of r.addedNodes) scan(a); } }).observe(document, { subtree: true, childList: true, characterData: true });
  const mark = () => {
    const a = document.querySelector('main a[href^="/signin"]');
    if (a && location.pathname.startsWith("/community")) return a;
    if (location.pathname === "/") return [...document.querySelectorAll("h2.title-in")].find((h) => h.textContent.trim() && h.getBoundingClientRect().height > 0) ?? null;
    // The route's own heading: an h1 (Today's greeting is an h2, and it is in the page under another
    // address while the front door is drawn).
    return [...document.querySelectorAll("main[data-route-content] h1")].find((h) => h.getBoundingClientRect().height > 0) ?? null;
  };
  let marked = false;
  let todayDrawn = false;
  const frame = () => {
    const t = now();
    const slate = document.querySelector("[data-launch-frame]");
    const sc = slate ? getComputedStyle(slate) : null;
    const slateOp = !slate || sc.display === "none" || sc.visibility === "hidden" ? 0 : Math.round(Number(sc.opacity) * 100) / 100;
    const el = mark();
    if (!marked && el && el.textContent.trim() && el.getBoundingClientRect().width > 0) { marked = true; W.drawn = { t, words: el.textContent.trim().slice(0, 40), slate: slateOp }; performance.mark("u87-drawn"); }
    const g = document.querySelector("h2.title-in");
    if (!todayDrawn && g && location.pathname !== "/" && g.getBoundingClientRect().height > 0 && !hiddenWhy(g)) { todayDrawn = true; W.todayDrawn = { t, slate: slateOp }; }
    for (const n of live) {
      if (!n.isConnected || n.__seen) continue;
      if (n.parentElement?.closest("[data-launch-frame]") || hiddenWhy(n) || !onScreen(n)) continue;
      n.__seen = true;
      W.englishFrames.push({ t, w: n.nodeValue.trim().slice(0, 40), slate: slateOp, chain: chain(n, 8) });
    }
    if (performance.now() < ms) requestAnimationFrame(frame);
    else W.done = true;
  };
  requestAnimationFrame(frame);
}

/** From a tap: English-only catalog strings drawn on the screen, each once. */
function walkWatch({ ms }) {
  const { now, EN, chain, hiddenWhy, onScreen } = window.__u87;
  const t0 = now();
  const W = (window.__ww = { drawn: [], inserted: [], at: null, done: false });
  const seen = new Set();
  const look = () => {
    const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      const w = n.nodeValue.trim();
      if (!w || !EN.has(w) || seen.has(n)) continue;
      if (n.parentElement?.closest("[data-launch-frame], script, style") || hiddenWhy(n) || !onScreen(n)) continue;
      seen.add(n);
      W.drawn.push({ t: Math.round(now() - t0), w: w.slice(0, 40), path: location.pathname, chain: chain(n, 9) });
    }
  };
  const mo = new MutationObserver((recs) => { for (const r of recs) for (const a of r.addedNodes) { const it = a.nodeType === 1 ? document.createTreeWalker(a, NodeFilter.SHOW_TEXT) : null; const list = a.nodeType === 3 ? [a] : []; if (it) for (let x = it.nextNode(); x; x = it.nextNode()) list.push(x); for (const x of list) if (EN.has(x.nodeValue.trim())) W.inserted.push({ t: Math.round(now() - t0), w: x.nodeValue.trim().slice(0, 40), hidden: hiddenWhy(x), chain: chain(x, 6) }); } });
  mo.observe(document.body, { subtree: true, childList: true });
  const frame = () => {
    look();
    W.at = location.pathname;
    if (now() - t0 < ms) requestAnimationFrame(frame);
    else { mo.disconnect(); W.done = true; }
  };
  requestAnimationFrame(frame);
}

async function newCtx(lang) {
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
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await ctx.addInitScript(helpers, { english: englishOnly(lang) });
  return { ctx, page, cdp, errors };
}

/** The main thread between two user-timing marks, by kind and by the code file that ran (self time, ms). */
function split(events, from, to) {
  const at = (n) => events.find((e) => e.name === n && (e.ph === "R" || e.ph === "I" || e.ph === "n" || e.ph === "b"))?.ts;
  const a = at(from);
  const b = at(to);
  if (!a || !b) return { error: `marks ${from} ${a} ${to} ${b}` };
  const main = new Set(events.filter((e) => e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain").map((e) => `${e.pid}:${e.tid}`));
  const span = events.filter((e) => e.ph === "X" && e.dur && main.has(`${e.pid}:${e.tid}`) && e.ts + e.dur >= a && e.ts <= b).sort((x, y) => x.ts - y.ts || y.dur - x.dur);
  const kind = (n) => {
    if (n === "EvaluateScript" || /^v8\.compile|^V8\.Compile|^v8\.parse|^v8\.deserialize|produceCache|^CacheScript/.test(n)) return "code compiled and run";
    if (/GC/.test(n)) return "garbage collection";
    if (/^(UpdateLayoutTree|Layout|RecalculateStyles)$/.test(n)) return "style and layout";
    if (/^(Paint|PrePaint|Layerize|Commit|UpdateLayer|CompositeLayers|PaintImage)$/.test(n)) return "paint";
    if (/^(FunctionCall|RunMicrotasks|TimerFire|FireAnimationFrame|EventDispatch|v8\.callFunction|V8\.Execute|v8\.run|XHRReadyStateChange|HandlePostMessage|ParseHTML)$/.test(n)) return "script";
    return "other";
  };
  const stack = [];
  const self = new Map();
  for (const e of span) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    const d = Math.max(0, Math.min(e.ts + e.dur, b) - Math.max(e.ts, a));
    self.set(e, (self.get(e) ?? 0) + d);
    if (stack.length) self.set(stack[stack.length - 1], (self.get(stack[stack.length - 1]) ?? 0) - d);
    stack.push(e);
  }
  const kinds = {};
  const files = {};
  for (const [e, d] of self) {
    const k = kind(e.name);
    kinds[k] = (kinds[k] ?? 0) + d / 1000;
    const url = e.args?.data?.url || e.args?.data?.stackTrace?.[0]?.url || "";
    if (k === "script" || k === "code compiled and run") { const f = (url.split("/").pop() || e.name).slice(0, 40); files[f] = (files[f] ?? 0) + d / 1000; }
  }
  const round = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v >= 5).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, Math.round(v)]));
  return { span: Math.round((b - a) / 1000), kinds: round(kinds), files: round(files) };
}

/** A link to the page, as a reader taps it: the tab bar's first, else any link drawn on the screen. A click
 * event on the link (the router answers it as it answers a tap); then the address is waited for. */
async function tapTo(page, prefix) {
  const want = prefix.replace(/\/$/, "");
  const href = await page.evaluate((w) => {
    const ok = (a) => { const h = new URL(a.href, location.href).pathname.replace(/\/$/, ""); return h === w || (w === "/bible" && h.startsWith("/bible/")); };
    const drawn = (a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(a).visibility !== "hidden"; };
    const all = [...document.querySelectorAll("a[href]")].filter(ok);
    const a = all.find((x) => x.closest("nav") && drawn(x)) ?? all.find(drawn) ?? all[0];
    if (!a) return null;
    a.scrollIntoView({ block: "center" });
    a.click();
    return new URL(a.href, location.href).pathname;
  }, want);
  if (!href) return null;
  await page.waitForFunction((h) => location.pathname.replace(/\/$/, "") === h.replace(/\/$/, ""), href, { timeout: 15000 }).catch(() => {});
  return href;
}

async function run(spec) {
  const [mode, lang, a2, extra] = spec.split("@");
  const { ctx, page, cdp, errors } = await newCtx(lang);
  try {
    if (mode === "open") {
      const p = a2.startsWith("/") ? a2 : `/${a2}`;
      const trace = extra === "trace";
      const events = [];
      if (trace) {
        cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
        await cdp.send("Tracing.start", { categories: "devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
      }
      await ctx.addInitScript(openWatch, { ms: 9000 });
      await go(page, p, { timeout: 120000 });
      await page.waitForFunction(() => window.__lw?.done, null, { timeout: 120000 });
      const W = await page.evaluate(() => window.__lw);
      W.res = await page.evaluate(() => performance.getEntriesByType("resource").filter((e) => /index\.txt|\/chunks\/|woff2|\.json/.test(e.name) && e.startTime > 900).map((e) => [new URL(e.name).pathname.split("/").slice(-2).join("/").slice(0, 36), Math.round(e.startTime), Math.round(e.responseEnd)]));
      let cut = null;
      if (trace) {
        const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
        await cdp.send("Tracing.end");
        await done;
        cut = split(events, "u87-ar", "u87-content");
        const main = new Set(events.filter((e) => e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain").map((e) => `${e.pid}:${e.tid}`));
        const t0 = events.find((e) => e.name === "navigationStart")?.ts ?? events.find((e) => e.name === "u87-ar")?.ts;
        const ms = (ts) => Math.round((ts - t0) / 1000);
        cut.tasks = events.filter((e) => main.has(`${e.pid}:${e.tid}`) && e.ph === "X" && /^(TimerFire|FunctionCall|EventDispatch|FireAnimationFrame|RunMicrotasks|XHRLoad|XHRReadyStateChange|ParseHTML|EvaluateScript)$/.test(e.name) && e.dur >= 8000 && ms(e.ts) > 2000)
          .map((e) => [ms(e.ts), Math.round(e.dur / 1000), e.name, (e.args?.data?.functionName || e.args?.data?.type || "").slice(0, 24), (e.args?.data?.url || "").split("/").pop().slice(0, 24), e.args?.data?.timerId ?? ""]).slice(0, 40);
        cut.timers = events.filter((e) => main.has(`${e.pid}:${e.tid}`) && e.name === "TimerInstall" && (e.args?.data?.timeout ?? 0) >= 300).map((e) => [ms(e.ts), e.args.data.timeout, e.args.data.timerId, (e.args?.data?.stackTrace?.[0]?.url || "").split("/").pop().slice(0, 24), (e.args?.data?.stackTrace?.[0]?.functionName || "").slice(0, 20)]).slice(0, 30);
      }
      const deadline = W.armed[0] != null ? Math.round((W.armed[0] + 2500) * 10) / 10 : null;
      const after = W.arIn ?? 0;
      const row = { spec, contentIn: W.contentIn ?? null, drawn: W.drawn, deadline, arIn: W.arIn, armed: W.armed, today: W.today, todayDrawn: W.todayDrawn ?? null, english: W.english, englishFrames: W.englishFrames, longtasks: W.longtasks.filter(([s, d]) => s + d >= after - 50), cut, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: content in ${W.contentIn}; drawn ${W.drawn?.t} "${W.drawn?.words}" (slate ${W.drawn?.slate}); deadline ${deadline}; reader's words in ${W.arIn}`);
      console.log(`  Today's greeting into the page: ${JSON.stringify(W.today.map((x) => [x.t, x.at]))}; drawn on screen off "/": ${JSON.stringify(W.todayDrawn ?? null)}`);
      console.log(`  long tasks from the reader's words: ${JSON.stringify(row.longtasks)}`);
      console.log(`  English put in the page (${W.english.length}): ${JSON.stringify(W.english.slice(0, 8))}`);
      console.log(`  English drawn on the screen outside the slate: ${W.englishFrames.length} ${JSON.stringify(W.englishFrames.slice(0, 6))}`);
      if (cut) console.log(`  main thread, reader's words in -> drawn: ${JSON.stringify(cut)}`);
      console.log(`  files read after 900 ms [name, start, end]: ${JSON.stringify(W.res)}`);
    } else if (mode === "walk") {
      await go(page, "/", { timeout: 120000 });
      await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(12000);
      const readied = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => new URL(e.name).pathname).filter((n) => n.endsWith("/index.txt")));
      console.log(`${spec}: index.txt read before the first tap: ${JSON.stringify(readied)}`);
      const rows = [];
      for (const target of ["/bible", "/prayers/", "/prayers/morning/", "/prayers/evening/", "/prayers/", "/discover/", "/saints/", "/account/", "/settings/"]) {
        await page.evaluate(walkWatch, { ms: 3500 });
        const href = await tapTo(page, target);
        await page.waitForFunction(() => window.__ww?.done, null, { timeout: 60000 }).catch(() => {});
        const W = await page.evaluate(() => window.__ww ?? { drawn: [], inserted: [], at: location.pathname });
        rows.push({ target, href, at: W.at, drawn: W.drawn, inserted: W.inserted });
        console.log(`  ${target} (link ${href}, at ${W.at}): English drawn ${W.drawn.length} ${JSON.stringify(W.drawn.slice(0, 10))}`);
        if (W.inserted.length) console.log(`    English put in the page: ${JSON.stringify(W.inserted.slice(0, 6))}`);
        await page.waitForTimeout(600);
      }
      fs.appendFileSync(jsonl, JSON.stringify({ spec, readied, rows, errors }) + "\n");
    }
    if (errors.length) console.log(`  page errors: ${JSON.stringify(errors.slice(0, 3))}`);
  } catch (e) {
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300), errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

for (const s of specs) await run(s);
await browser.close();
