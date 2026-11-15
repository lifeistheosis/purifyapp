// Updates 79 (2026-11-15), from Updates 78's doorwatch.mjs: three measures of /community/ on the gate's export,
// served the shell's way and reading the main web (GET only), at 390x844, CPU 4x, under the apps' user agent.
// Every read is taken in requestAnimationFrame (the frame about to be painted).
//   signin@<lang>@<new|keptno>  a direct open; the sign-in link's left, width, top, height and words in every
//                               frame they change, with the faces that finished loading and the layout shifts
//   back@<n>                    / first, then /community/ (the history has an entry before it); a post near the
//                               twentieth that holds a link to another page is put in the middle, its link
//                               tapped, then history.back(); where that post stands in every frame after
//   prof@<n>                    the twentieth post in the middle, its author tapped (the profile, a dialog); the
//                               post's top, the scroll, the scrim's opacity and the panel's top in every frame
//   node feed79.mjs <out dir> <jsonl> <spec>...
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

/** In the page from its first script: the sign-in link in every frame it changes, faces loaded, shifts. */
function signinWatch() {
  const now = () => Math.round(performance.now() * 10) / 10;
  const W = (window.__sw = { frames: [], fonts: [], shifts: [], fcp: null, done: false });
  try { document.fonts.addEventListener("loadingdone", (e) => W.fonts.push({ t: now(), f: e.fontfaces.map((f) => `${f.family} ${f.weight}`).join(" | ").slice(0, 160) })); } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") W.fcp = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        W.shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 10000) / 10000,
          src: (e.sources || []).map((s) => `${s.node ? (s.node.nodeType === 3 ? "#text" : s.node.nodeName) : "?"} x ${Math.round(s.previousRect.x)}->${Math.round(s.currentRect.x)} w ${Math.round(s.previousRect.width)}->${Math.round(s.currentRect.width)} y ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)} h ${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)}`) });
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  // Every change to the link's words, as the DOM makes it (a frame the read in requestAnimationFrame misses
  // is painted from a commit made after it): the words, the box, the page's lang and dir at that moment.
  W.words = [];
  let was;
  new MutationObserver(() => {
    const a = document.querySelector('main a[href^="/signin"]');
    const w = a ? a.textContent.trim() : null;
    if (w === was) return;
    was = w;
    const r = a?.getBoundingClientRect();
    W.words.push({ t: now(), w, x: r ? Math.round(r.left * 10) / 10 : null, width: r ? Math.round(r.width * 10) / 10 : null, lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction });
  }).observe(document, { subtree: true, childList: true, characterData: true });
  let last = "";
  const frame = () => {
    const a = document.querySelector('main a[href^="/signin"]');
    if (a) {
      const r = a.getBoundingClientRect();
      const p = a.parentElement.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const cur = { x: Math.round(r.left * 10) / 10, w: Math.round(r.width * 10) / 10, y: Math.round(r.top * 10) / 10, h: Math.round(r.height * 10) / 10,
        px: Math.round(p.left * 10) / 10, pw: Math.round(p.width * 10) / 10, words: a.textContent.trim(), lineWords: a.parentElement.textContent.trim().slice(0, 60),
        face: cs.fontFamily.split(",")[0].slice(0, 40), dir: getComputedStyle(a.parentElement).direction, vw: document.documentElement.clientWidth };
      const key = JSON.stringify(cur);
      if (key !== last) W.frames.push({ t: now(), ...cur });
      last = key;
    }
    if (performance.now() < 14000) requestAnimationFrame(frame);
    else W.done = true;
  };
  requestAnimationFrame(frame);
}

/** In the page: for `ms`, every frame, where the post with `key` stands, the scroll, the dialog's scrim and panel. */
function frameWatch({ key, ms }) {
  const t0 = performance.now();
  window.__pwT0 = t0;
  const W = (window.__pw = { rows: [], done: false });
  const find = () => [...document.querySelectorAll("main article")].find((a) => (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) === key) || null;
  const frame = () => {
    const a = find();
    const d = document.querySelector('[role="dialog"][aria-modal="true"]');
    const scrim = d ? [...d.children].find((c) => /bg-night\/72/.test(c.className)) : null;
    const panel = d ? [...d.children].filter((c) => c !== scrim).sort((x, y) => y.getBoundingClientRect().height * y.getBoundingClientRect().width - x.getBoundingClientRect().height * x.getBoundingClientRect().width)[0] : null;
    const r = a?.getBoundingClientRect();
    W.rows.push({ t: Math.round((performance.now() - t0) * 10) / 10, path: location.pathname, sy: Math.round(scrollY * 10) / 10,
      top: r ? Math.round(r.top * 10) / 10 : null, bottom: r ? Math.round(r.bottom * 10) / 10 : null,
      scrim: scrim ? Math.round(Number(getComputedStyle(scrim).opacity) * 100) / 100 : null, blur: scrim ? getComputedStyle(scrim).backdropFilter : null,
      panelTop: panel ? Math.round(panel.getBoundingClientRect().top) : null });
    // After the frame is painted (a task queued from it): what was drawn, when nothing in a later callback of
    // the same frame moved it (returnPlace.ts puts the page right in its own requestAnimationFrame).
    const t = W.rows.at(-1).t;
    setTimeout(() => { const b = find()?.getBoundingClientRect(); (W.post ??= []).push({ t, path: location.pathname, sy: Math.round(scrollY * 10) / 10, top: b ? Math.round(b.top * 10) / 10 : null }); }, 0);
    if (performance.now() - t0 < ms) requestAnimationFrame(frame);
    else W.done = true;
  };
  requestAnimationFrame(frame);
}

async function newCtx(lang, keptNo) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript(([l, kept]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (kept) localStorage.setItem("purify:campaigns:lastAnswer", "no");
    } catch {}
  }, [lang, keptNo]);
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

const keyOf = (page, i) => page.evaluate((i) => (document.querySelectorAll("main article")[i]?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80), i);
const center = (page, i) => page.evaluate((i) => { document.documentElement.style.scrollBehavior = "auto"; document.querySelectorAll("main article")[i].scrollIntoView({ block: "center" }); }, i);
const standOf = (page, key) => page.evaluate((key) => { const a = [...document.querySelectorAll("main article")].find((x) => (x.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) === key); return { path: location.pathname, sy: Math.round(scrollY * 10) / 10, top: a ? Math.round(a.getBoundingClientRect().top * 10) / 10 : null, posts: document.querySelectorAll("main article").length }; }, key);
/** Steps of 1px or more in a post's top between frames where it is drawn in both. */
const stepsOf = (rows) => {
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    if (a.top === null || b.top === null || a.path !== b.path) continue;
    const screen = Math.round((b.top - a.top) * 10) / 10;
    const doc = Math.round((b.top + b.sy - a.top - a.sy) * 10) / 10;
    if (Math.abs(screen) >= 1 || Math.abs(doc) >= 1) out.push({ t: b.t, screen, doc, top: b.top, sy: b.sy, scrim: b.scrim, panelTop: b.panelTop });
  }
  return out;
};

async function run(spec) {
  const [mode, a1, a2] = spec.split("@");
  const lang = mode === "signin" ? a1 : "en";
  const { ctx, page, errors } = await newCtx(lang, mode === "signin" ? a2 === "keptno" : true);
  try {
    if (mode === "signin") {
      await ctx.addInitScript(signinWatch);
      await go(page, "/community/", { timeout: 120000 });
      await page.waitForFunction(() => window.__sw?.done, null, { timeout: 120000 });
      const W = await page.evaluate(() => window.__sw);
      const first = W.frames[0];
      const moves = W.frames.slice(1).map((f, i) => {
        const p = W.frames[i];
        return { t: f.t, dx: Math.round((f.x - p.x) * 10) / 10, dw: Math.round((f.w - p.w) * 10) / 10, dy: Math.round((f.y - p.y) * 10) / 10, dh: Math.round((f.h - p.h) * 10) / 10,
          dpx: Math.round((f.px - p.px) * 10) / 10, dpw: Math.round((f.pw - p.pw) * 10) / 10, words: f.words !== p.words ? `${p.words} -> ${f.words}` : undefined,
          line: f.lineWords !== p.lineWords ? `${p.lineWords} -> ${f.lineWords}` : undefined, face: f.face !== p.face ? `${p.face} -> ${f.face}` : undefined, vw: f.vw !== p.vw ? `${p.vw} -> ${f.vw}` : undefined };
      });
      const row = { spec, fcp: W.fcp, first, moves, fonts: W.fonts, words: W.words, shifts: W.shifts, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: first frame t ${first?.t} x ${first?.x} w ${first?.w} y ${first?.y} "${first?.words}" (${first?.face}, ${first?.dir}); fcp ${W.fcp}; ${moves.length} change(s): ${JSON.stringify(moves)}`);
      console.log(`  faces done: ${JSON.stringify(W.fonts)}`);
      console.log(`  words as the DOM changed them: ${JSON.stringify(W.words)}`);
      console.log(`  shifts: ${JSON.stringify(W.shifts)}`);
    } else if (mode === "back") {
      await go(page, "/", { timeout: 120000 });
      await page.waitForTimeout(4000);
      await go(page, "/community/", { timeout: 120000 });
      await page.waitForFunction(() => document.querySelectorAll("main article").length >= 20, null, { timeout: 60000 });
      await page.waitForTimeout(2000);
      const hist = await page.evaluate(() => history.length);
      // The post nearest the twentieth with a link to another page in it.
      const pick = await page.evaluate(() => {
        const posts = [...document.querySelectorAll("main article")];
        const order = [...posts.keys()].sort((x, y) => Math.abs(x - 19) - Math.abs(y - 19));
        for (const i of order) {
          const l = [...posts[i].querySelectorAll("a[href^='/']")].find((x) => !/^\/(signin|community)/.test(x.getAttribute("href")));
          if (l) { l.setAttribute("data-u79", "1"); return { i, href: l.getAttribute("href"), words: l.textContent.trim().slice(0, 40) }; }
        }
        return null;
      });
      if (!pick) throw new Error("no post in the feed holds a link to another page");
      const key = await keyOf(page, pick.i);
      await center(page, pick.i);
      await page.waitForTimeout(2500);
      const before = await standOf(page, key);
      const link = page.locator("[data-u79]");
      const lb = await link.boundingBox();
      if (!lb || lb.y < 0 || lb.y + lb.height > 844) await link.scrollIntoViewIfNeeded();
      const at = await standOf(page, key);
      await link.tap();
      await page.waitForURL((u) => !u.pathname.startsWith("/community"), { timeout: 30000 });
      await page.waitForTimeout(3000);
      const away = await page.evaluate(() => ({ path: location.pathname, sy: Math.round(scrollY), hist: history.length }));
      await page.evaluate(frameWatch, { key, ms: 6000 });
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => window.__pw?.done, null, { timeout: 60000 });
      const rows = await page.evaluate(() => window.__pw.rows);
      const post = await page.evaluate(() => window.__pw.post ?? []);
      const firstPost = post.filter((r) => r.path.startsWith("/community")).slice(0, 4);
      const after = await standOf(page, key);
      const back = rows.filter((r) => r.path.startsWith("/community"));
      const firstDrawn = back.find((r) => r.top !== null) ?? null;
      const steps = stepsOf(back);
      const row = { spec, hist, pick, before, at, away, firstDrawn, after, steps: steps.slice(0, 30), frames: back.length, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: history ${hist}; post ${pick.i + 1} link "${pick.words}" -> ${pick.href}; stood at top ${at.top} (sy ${at.sy}) when tapped; away at ${away.path}`);
      console.log(`  read in rAF, first 4 on /community/: ${JSON.stringify(rows.filter((r) => r.path.startsWith("/community")).slice(0, 4).map((r) => [r.t, r.sy, r.top]))}`);
      console.log(`  read after paint, first 4: ${JSON.stringify(firstPost.map((r) => [r.t, r.sy, r.top]))}`);
      console.log(`  back: first drawn ${JSON.stringify(firstDrawn)}; after 6s ${JSON.stringify(after)}; ${steps.length} step(s) of 1px or more: ${JSON.stringify(steps.slice(0, 12))}`);
    } else if (mode === "prof") {
      await go(page, "/community/", { timeout: 120000 });
      await page.waitForFunction(() => document.querySelectorAll("main article").length >= 20, null, { timeout: 60000 });
      await page.waitForTimeout(1500);
      const key = await keyOf(page, 19);
      await center(page, 19);
      await page.waitForTimeout(2500);
      const before = await standOf(page, key);
      const who = page.locator("main article").nth(19).locator("button, a").first();
      // A finger at the control's middle, as a reader taps (locator.tap() may scroll the page itself first).
      const wb = await who.boundingBox();
      await page.evaluate(frameWatch, { key, ms: 2500 });
      await page.evaluate(() => addEventListener("pointerdown", () => { window.__pw.tap ??= Math.round((performance.now() - window.__pwT0) * 10) / 10; }, { capture: true, once: true }));
      await page.touchscreen.tap(wb.x + wb.width / 2, wb.y + wb.height / 2);
      await page.waitForFunction(() => window.__pw?.done, null, { timeout: 60000 });
      const rows = await page.evaluate(() => window.__pw.rows);
      const post = await page.evaluate(() => window.__pw.post ?? []);
      const tapT = await page.evaluate(() => window.__pw.tap ?? null);
      const steps = stepsOf(rows).map((x) => ({ ...x, afterTap: tapT === null ? null : Math.round((x.t - tapT) * 10) / 10, painted: post.find((q) => q.t === x.t) ?? null, prevPainted: post.filter((q) => q.t < x.t).at(-1) ?? null }));
      const settled = rows.at(-1);
      const row = { spec, before, settled, steps, frames: rows.length, errors };
      fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
      console.log(`${spec}: finger at ${wb ? Math.round(wb.y + wb.height / 2) : "?"} (touch at ${tapT}ms of the watch); before ${JSON.stringify(before)}; settled ${JSON.stringify(settled)}; ${steps.length} step(s): ${JSON.stringify(steps)}`);
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
