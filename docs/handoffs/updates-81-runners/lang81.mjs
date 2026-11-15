// Updates 81 (2026-11-15), from Updates 79's feed79.mjs: the after side of Updates 80's language mend
// (44d567fa, RouteLanguageHold) on the gate's export, served the shell's way and reading the main web (GET
// only), at 390x844, CPU 4x, under the apps' user agent, a new reader. Every read is taken in
// requestAnimationFrame (the frame about to be painted).
//   open@<lang>@<path>   a cold open of <path>. Each frame: the screen's first mark (Community's sign-in link,
//                        else the first heading in the route's <main>) with its box, words and face; the
//                        slate's opacity; <html> lang and dir; the first four stars' left edges. Every text node
//                        whose words are an English catalog string the reader's language says otherwise, and
//                        each frame one of them is drawn on the screen, under the slate or seen. The faces
//                        that finished loading, the layout shifts, and when the 2.5s language deadline was armed.
//   switch@<from>@<to>   Settings in <from>, then the language picker, then <to>: each frame <html> dir and
//                        lang and the script of the words on screen (the heading, the language section's title,
//                        the tab bar), to find a frame drawn in one direction with the other language's words.
//   node lang81.mjs <out dir> <jsonl> <spec>...
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
/** English catalog strings the reader's language words otherwise (labels, headings, buttons). */
const englishOnly = (lang) => {
  if (lang === "en") return [];
  const L = cat(lang);
  return [...new Set(Object.entries(EN).filter(([k, v]) => typeof v === "string" && L[k] && L[k] !== v && /[A-Za-z]{2}/.test(v) && !/[{}<]/.test(v) && v.length <= 80).map(([, v]) => v.trim()))];
};

/** In the page from its first script. */
function openWatch({ english, ms }) {
  const now = () => Math.round(performance.now() * 10) / 10;
  const W = (window.__lw = { frames: [], marks: [], fonts: [], shifts: [], english: [], seenEnglish: [], stars: [], armed: [], fcp: null, done: false });
  const EN = new Set(english);
  const realST = window.setTimeout;
  window.setTimeout = function (fn, d, ...rest) { if (d === 2500) W.armed.push(now()); return realST.call(window, fn, d, ...rest); };
  try { document.fonts.addEventListener("loadingdone", (e) => W.fonts.push({ t: now(), f: e.fontfaces.map((f) => `${f.family} ${f.weight}`).join(" | ").slice(0, 160) })); } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") W.fcp = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        W.shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 10000) / 10000,
          src: (e.sources || []).map((s) => `${s.node ? (s.node.nodeType === 3 ? "#text" : s.node.nodeName) : "?"} x ${Math.round(s.previousRect.x)}->${Math.round(s.currentRect.x)} w ${Math.round(s.previousRect.width)}->${Math.round(s.currentRect.width)} y ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)}`) });
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  // Every text node put in the page (the parser's too) whose words are an English-only catalog string.
  const live = [];
  const scan = (n) => {
    if (n.nodeType === 3) { const w = n.nodeValue.trim(); if (w && EN.has(w)) { live.push(n); const sl = document.querySelector("[data-launch-frame]"); W.english.push({ t: now(), w, inSlate: !!n.parentElement?.closest("[data-launch-frame]"), slateThen: sl ? `${getComputedStyle(sl).opacity}/${getComputedStyle(sl).visibility}` : "absent" }); } return; }
    if (n.nodeType !== 1 || n.nodeName === "SCRIPT" || n.nodeName === "STYLE") return;
    const it = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    for (let x = it.nextNode(); x; x = it.nextNode()) scan(x);
  };
  W.slateOut = [];
  W.ticks = [];
  new MutationObserver((recs) => { for (const r of recs) { if (r.type === "characterData") scan(r.target); else { for (const a of r.addedNodes) scan(a); for (const d of r.removedNodes) if (d.nodeType === 1 && (d.matches("[data-launch-frame]") || d.querySelector("[data-launch-frame]"))) W.slateOut.push(now()); } } }).observe(document, { subtree: true, childList: true, characterData: true });
  const mark = () => {
    const a = document.querySelector('main a[href^="/signin"]');
    if (a && location.pathname.startsWith("/community")) return a;
    // Today: its greeting (components/today/GreetingHeader.tsx), the first words it draws.
    if (location.pathname === "/") return [...document.querySelectorAll("h2.title-in")].find((h) => h.textContent.trim() && h.getBoundingClientRect().height > 0) ?? null;
    return [...document.querySelectorAll("main[data-route-content] h1, main[data-route-content] h2")].find((h) => h.getBoundingClientRect().height > 0) ?? null;
  };
  let last = "";
  let lastStars = "";
  const frame = () => {
    const t = now();
    if (t > 1000 && t < 4000) W.ticks.push(Math.round(t));
    const slate = document.querySelector("[data-launch-frame]");
    const sc = slate ? getComputedStyle(slate) : null;
    const slateOp = !slate || sc.display === "none" || sc.visibility === "hidden" ? 0 : Math.round(Number(sc.opacity) * 100) / 100;
    const h = document.documentElement;
    const el = mark();
    const r = el?.getBoundingClientRect();
    const cur = { slate: slateOp, launch: h.dataset.launch ?? null, intro: h.dataset.intro ?? null, lang: h.lang, dir: h.dir || getComputedStyle(h).direction,
      path: location.pathname, tag: el ? el.tagName : null, words: el ? el.textContent.trim().slice(0, 50) : null,
      x: r ? Math.round(r.left * 10) / 10 : null, w: r ? Math.round(r.width * 10) / 10 : null, y: r ? Math.round(r.top * 10) / 10 : null, h: r ? Math.round(r.height * 10) / 10 : null,
      face: el ? getComputedStyle(el).fontFamily.split(",")[0].slice(0, 40) : null };
    const key = JSON.stringify(cur);
    if (key !== last) W.frames.push({ t, ...cur });
    last = key;
    // The stars, while the slate is drawn.
    if (slateOp > 0) {
      const s = [...document.querySelectorAll(".launch-stars i")].slice(0, 4).map((i) => Math.round(i.getBoundingClientRect().left * 10) / 10);
      const k = JSON.stringify([s, cur.dir]);
      if (k !== lastStars) W.stars.push({ t, left: s, dir: cur.dir, slate: slateOp, starOp: document.querySelector(".launch-stars i") ? getComputedStyle(document.querySelector(".launch-stars i")).opacity : null });
      lastStars = k;
    }
    // English words drawn this frame: on screen, not inside the slate, and not under a slate fully drawn.
    for (const n of live) {
      if (!n.isConnected || !EN.has(n.nodeValue.trim())) continue;
      const p = n.parentElement;
      if (!p || p.closest("[data-launch-frame]")) continue;
      const hid = p.closest("[inert], [hidden], [aria-hidden='true']");
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const box = [...rg.getClientRects()].find((b) => b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth);
      if (!box) continue;
      const pc = getComputedStyle(p);
      if (pc.visibility === "hidden" || Number(pc.opacity) === 0) continue;
      W.seenEnglish.push({ t, w: n.nodeValue.trim().slice(0, 40), slate: slateOp, inert: hid ? `${hid.tagName.toLowerCase()}${hid.hasAttribute("inert") ? " inert" : ""}${hid.getAttribute("aria-hidden") === "true" ? " aria-hidden" : ""}${hid.hasAttribute("hidden") ? " hidden" : ""}` : null, where: `${p.tagName.toLowerCase()} at ${Math.round(box.left)},${Math.round(box.top)}` });
    }
    if (W.seenEnglish.length > 400) W.seenEnglish.length = 400;
    if (performance.now() < ms) requestAnimationFrame(frame);
    else W.done = true;
  };
  requestAnimationFrame(frame);
}

/** In the page, from the tap: every frame's direction and the script of the words on screen. */
function switchWatch({ ms }) {
  const t0 = performance.now();
  const W = (window.__sw = { rows: [], muts: [], done: false });
  const script = (s) => (/[؀-ۿ]/.test(s) ? "ar" : /[A-Za-z]/.test(s) ? "en" : "-");
  const words = () => {
    const h1 = document.querySelector("main h1")?.textContent.trim() ?? "";
    const sec = document.querySelector("#language h2, #language [class*='title']")?.textContent.trim() ?? "";
    const nav = [...document.querySelectorAll("nav a span, nav button span")].map((s) => s.textContent.trim()).filter(Boolean).slice(0, 5).join("|");
    return { h1, sec, nav };
  };
  new MutationObserver((recs) => { for (const r of recs) if (r.type === "attributes") W.muts.push({ t: Math.round((performance.now() - t0) * 10) / 10, attr: r.attributeName, v: document.documentElement.getAttribute(r.attributeName), w: words() }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
  let last = "";
  const frame = () => {
    const h = document.documentElement;
    const w = words();
    const cur = { dir: h.dir || getComputedStyle(h).direction, lang: h.lang, h1: `${script(w.h1)} ${w.h1.slice(0, 24)}`, sec: `${script(w.sec)} ${w.sec.slice(0, 24)}`, nav: `${script(w.nav)} ${w.nav.slice(0, 40)}` };
    const key = JSON.stringify(cur);
    if (key !== last) W.rows.push({ t: Math.round((performance.now() - t0) * 10) / 10, ...cur });
    last = key;
    if (performance.now() - t0 < ms) requestAnimationFrame(frame);
    else W.done = true;
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
      if (!sessionStorage.getItem("u81-kept")) localStorage.setItem("CapacitorStorage.purify_locale", l);
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
  return { ctx, page, errors };
}

const scriptOf = (s) => (!s ? "-" : /[؀-ۿ]/.test(s) ? "ar" : /[Ѐ-ӿ]/.test(s) ? "ru" : /[Ⴀ-ჿ]/.test(s) ? "ka" : /[A-Za-z]/.test(s) ? "en" : "-");

async function run(spec) {
  const [mode, a1, a2] = spec.split("@");
  const lang = a1;
  const { ctx, page, errors } = await newCtx(lang);
  try {
    if (mode === "open") {
      const p = a2.startsWith("/") ? a2 : `/${a2}`;
      await ctx.addInitScript(openWatch, { english: englishOnly(lang), ms: 12000 });
      await go(page, p, { timeout: 120000 });
      await page.waitForFunction(() => window.__lw?.done, null, { timeout: 120000 });
      const W = await page.evaluate(() => window.__lw);
      const drawn = W.frames.filter((f) => f.words && f.w > 0 && f.path.startsWith(p.replace(/\/$/, "") || "/"));
      const first = drawn[0] ?? null;
      const lift = W.frames.find((f) => f.slate < 1) ?? null;
      const gone = W.frames.find((f) => f.slate === 0) ?? null;
      const moves = drawn.slice(1).map((f, i) => { const q = drawn[i]; return { t: f.t, dx: Math.round((f.x - q.x) * 10) / 10, dw: Math.round((f.w - q.w) * 10) / 10, dy: Math.round((f.y - q.y) * 10) / 10, dh: Math.round((f.h - q.h) * 10) / 10, slate: f.slate, words: f.words !== q.words ? `${q.words} -> ${f.words}` : undefined, face: f.face !== q.face ? `${q.face} -> ${f.face}` : undefined }; })
        .filter((m) => Math.abs(m.dx) >= 1 || Math.abs(m.dw) >= 1 || Math.abs(m.dy) >= 1 || Math.abs(m.dh) >= 1 || m.words || m.face);
      const dirFlip = W.frames.find((f, i) => i > 0 && f.dir !== W.frames[i - 1].dir) ?? null;
      const seen = W.seenEnglish.filter((e) => e.slate < 1);
      const underSlate = W.seenEnglish.filter((e) => e.slate >= 1);
      const row = { spec, fcp: W.fcp, armed: W.armed, slateOut: W.slateOut, ticks: W.ticks, all: W.frames.map((f) => [f.t, f.slate, f.launch, f.intro, f.dir, f.tag, f.words, f.x, f.w]), first, firstScript: scriptOf(first?.words), lift, gone, moves, dirFlip, fonts: W.fonts, englishInDom: W.english.length, englishInDomOutsideSlate: W.english.filter((e) => !e.inSlate).length,
        englishFirst: W.english.slice(0, 6), seenEnglish: seen.slice(0, 20), seenEnglishCount: seen.length, underSlateCount: underSlate.length, underSlateSample: underSlate.slice(0, 4), stars: W.stars.slice(0, 12), shifts: W.shifts, frames: W.frames.length, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: fcp ${W.fcp}; armed ${JSON.stringify(W.armed)}; first drawn t ${first?.t} "${first?.words}" (${row.firstScript}, ${first?.face}, ${first?.dir}, slate ${first?.slate}); slate lifts ${lift?.t} gone ${gone?.t}; dir flip ${dirFlip ? `${dirFlip.t} -> ${dirFlip.dir} (slate ${dirFlip.slate})` : "none"}`);
      console.log(`  moves of 1px or more / word or face changes after first drawn: ${JSON.stringify(moves)}`);
      console.log(`  English: ${W.english.length} text node(s) in the DOM (${row.englishInDomOutsideSlate} outside the slate); drawn on screen with the slate not full: ${seen.length} ${JSON.stringify(seen.slice(0, 6))}; under the full slate: ${underSlate.length}`);
      console.log(`  slate removed from the page at ${JSON.stringify(W.slateOut)}; English inserted with the slate ${JSON.stringify([...new Set(W.english.filter((e) => !e.inSlate).map((e) => `${e.t}:${e.slateThen}`))].slice(0, 4))}; frames between: ${JSON.stringify(W.ticks.filter((x) => W.english[0] && x > W.english[0].t - 120 && x < W.english[0].t + 200))}`);
      console.log(`  faces done: ${JSON.stringify(W.fonts.map((f) => [f.t, f.f.slice(0, 60)]))}`);
      console.log(`  stars: ${JSON.stringify(W.stars.slice(0, 8))}`);
      console.log(`  shifts: ${JSON.stringify(W.shifts)}`);
    } else if (mode === "switch") {
      const to = a2;
      await go(page, "/settings/", { timeout: 120000 });
      await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 60000 });
      await page.waitForTimeout(4000);
      await page.evaluate(() => sessionStorage.setItem("u81-kept", "1"));
      const picker = page.locator("[data-language-picker]").first();
      await picker.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await picker.tap();
      const opt = page.locator(`[data-language-sheet] [data-language-covers="${to}"]`).first();
      await opt.waitFor({ timeout: 20000 });
      await page.waitForTimeout(1200);
      const before = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
      await page.evaluate(switchWatch, { ms: 5000 });
      await opt.tap();
      await page.waitForFunction(() => window.__sw?.done, null, { timeout: 60000 });
      const W = await page.evaluate(() => window.__sw);
      const wrong = W.rows.filter((r) => (r.dir === "rtl") !== [r.h1, r.sec, r.nav].some((x) => x.startsWith("ar")) && [r.h1, r.sec, r.nav].some((x) => !x.startsWith("-")));
      const row = { spec, before, rows: W.rows, muts: W.muts, wrong, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: before ${JSON.stringify(before)}; ${W.rows.length} frame change(s): ${JSON.stringify(W.rows)}`);
      console.log(`  html attribute writes: ${JSON.stringify(W.muts)}`);
      console.log(`  frames drawn in one direction with the other language's words: ${wrong.length} ${JSON.stringify(wrong)}`);
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
