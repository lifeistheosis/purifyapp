// Updates 78 (2026-11-15), from Updates 77's feedwatch.mjs. Two more fields after the try, joined by "+":
//   keptno  the device holds the server's no from last time (purify:campaigns:lastAnswer), as after the first
//           launch's ask; without it the reader is new, with no answer kept
//   open    the main web's answer to /api/campaigns/open is intercepted and answered yes (200, no parts)
// and one more mode:
//   back    open /community/, put the twentieth post in the middle of the screen, tap its author (the profile),
//           then Back (history.back, as the browser's Back); prints where the reader stands before and after
//           and every step read in requestAnimationFrame from the Back on
// Updates 77 (2026-11-15): the community feed as it opens, and scrolled to its end and back, on the gate's export,
// served the shell's way and reading the main web (GET only), at 390x844 with the CPU slowed. In every frame it
// reads where each post (main article) and the sign-in line stand, twice: in requestAnimationFrame (as Gate 3b's
// tapwatch does) and again in a task queued from that frame, which runs after the frame is painted ("post": what
// was drawn, unless the page changed in between, which is marked). Chrome's own layout-shift entries are kept
// too: a step that was drawn shows there.
//   door    from /discover/, tap the Chat door (a[href="/community"])
//   direct  open /community/ itself
//   scroll  open /community/, then scroll by 300px steps to the end and back to the top
// A fifth field, old, puts back the rule the mend took away (every post content-visibility: auto with the 320px
// placeholder, the tab skeleton 44px) through an adopted style sheet, to read the before on the same export.
//   node feedwatch.mjs <out dir> <jsonl> <mode@lang@cpu@try[@old]>...
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
const OLD_CSS =
  ".community-post{content-visibility:auto!important;contain-intrinsic-size:auto 320px!important}" +
  "div[aria-hidden].items-end.gap-6.border-b.pb-3{height:2.75rem!important}";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Runs in the page: from now (or the tap) for `ms`, both reads in every frame, and the layout shifts. */
function watch(cfg) {
  const t0 = performance.now();
  const W = (window.__fw = { tap: null, raf: [], post: [], shifts: [], done: false, inputs: 0 });
  addEventListener("pointerdown", () => { W.tap ??= performance.now() - t0; }, { capture: true, once: true });
  let muts = 0;
  new MutationObserver(() => { muts++; }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
  const name = (n) => n && n.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.id ? "#" + n.id.slice(0, 14) : ""} "${(n.textContent || "").trim().slice(0, 24)}"` : String(n?.nodeName ?? null);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        W.shifts.push({ t: Math.round(e.startTime - t0), v: Math.round(e.value * 10000) / 10000, input: e.hadRecentInput,
          src: (e.sources || []).map((s) => `${name(s.node)} y ${Math.round(s.previousRect.y)} -> ${Math.round(s.currentRect.y)}, h ${Math.round(s.previousRect.height)} -> ${Math.round(s.currentRect.height)}`) });
    }).observe({ type: "layout-shift", buffered: false });
  } catch {}
  const read = () => {
    const o = {};
    document.querySelectorAll("main article").forEach((a, i) => {
      const r = a.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) o[`post${i}`] = [r.top, r.height];
    });
    const link = document.querySelector('main a[href^="/signin"]');
    const p = link?.previousElementSibling;
    if (p) { const r = p.getBoundingClientRect(); o.signin = [r.top, r.height]; }
    if (link) { const r = link.getBoundingClientRect(); o.signinLink = [r.top, r.height]; }
    return o;
  };
  const frame = () => {
    const t = performance.now() - t0;
    const m0 = muts;
    const input = window.__fwIn ?? 0;
    window.__fwIn = 0;
    W.raf.push({ t, sy: scrollY, input, o: read() });
    setTimeout(() => { W.post.push({ t, sy: scrollY, input, dirty: muts !== m0, o: read() }); }, 0);
    const from = W.tap ?? (cfg.door ? null : 0);
    if ((from !== null && t - from > cfg.ms && !window.__fwHold) || t > cfg.ms + 60000) {
      W.n = document.querySelectorAll("main article").length;
      W.heights = [...document.querySelectorAll("main article")].slice(0, 12).map((a) => Math.round(a.getBoundingClientRect().height * 10) / 10);
      W.done = true;
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Steps of 0.5px or more between frames, for every key seen in both. Scroll allowed for as tapwatch does. */
function steps(samples, scroll) {
  const out = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (b.dirty) continue;
    const dsy = b.sy - a.sy;
    for (const k of Object.keys(b.o)) {
      if (!a.o[k]) continue;
      const screen = b.o[k][0] - a.o[k][0];
      const doc = screen + dsy;
      // Opening: a top counts when it moved on the screen and in the document. Scroll walk: in a frame the walk
      // scrolled, everything on the screen moves by the scroll; in any other frame nothing on the screen moves.
      const top = scroll ? (b.input ? screen + dsy : screen) : Math.abs(screen) < Math.abs(doc) ? screen : doc;
      const h = b.o[k][1] - a.o[k][1];
      if (Math.abs(top) >= 0.5 || Math.abs(h) >= 0.5)
        out.push({ t: Math.round(b.t), k, top: Math.round(top * 10) / 10, h: Math.round(h * 10) / 10, at: Math.round(b.o[k][0]), sy: Math.round(b.sy), input: b.input || 0 });
    }
  }
  return out;
}

async function run(spec) {
  const [mode, lang, cpu, n, extra = ""] = spec.split("@");
  const flags = new Set(extra.split("+"));
  const old = flags.has("old") ? "old" : "";
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  if (flags.has("keptno") || mode === "back") await ctx.addInitScript(() => { window.__keptNo = true; });
  await ctx.addInitScript(([l, css]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (window.__keptNo) localStorage.setItem("purify:campaigns:lastAnswer", "no");
    } catch {}
    if (css) {
      const s = new CSSStyleSheet();
      s.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
    }
  }, [lang, old === "old" ? OLD_CSS : ""]);

  if (mode !== "door" && mode !== "back") await ctx.addInitScript(watch, { door: false, ms: mode === "scroll" ? 12000 : 9000 });
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(at, mainWeb);
  let asked = 0;
  if (flags.has("open"))
    await ctx.route("https://purifyapp.net/api/campaigns/open**", (r) => { asked++; return r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: { "access-control-allow-origin": "https://localhost", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, OPTIONS" } }) : r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "https://localhost" }, body: JSON.stringify({ open: true, parts: {} }) }); });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  try {
    const cdp = await ctx.newCDPSession(page);
    if (Number(cpu) > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(cpu) });
    if (mode === "door") {
      await go(page, "/discover/", { timeout: 120000 });
      const link = page.locator('a[href="/community"], a[href="/community/"]').first();
      await link.waitFor({ timeout: 120000 });
      await page.waitForTimeout(6000);
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await page.evaluate(watch, { door: true, ms: 3000 });
      await link.tap();
    } else if (mode === "back") {
      await go(page, "/community/", { timeout: 120000 });
      await page.waitForFunction(() => document.querySelectorAll("main article").length >= 20, null, { timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; document.querySelectorAll("main article")[19].scrollIntoView({ block: "center" }); });
      await page.waitForTimeout(2500);
      const stand = () => page.evaluate(() => { const a = document.querySelectorAll("main article")[19]; return { url: location.pathname + location.hash, sy: Math.round(scrollY), top20: a ? Math.round(a.getBoundingClientRect().top * 10) / 10 : null, dialog: !!document.querySelector('[role="dialog"]'), posts: document.querySelectorAll("main article").length }; });
      const before = await stand();
      const who = page.locator("main article").nth(19).locator("button, a").first();
      const label = (await who.getAttribute("aria-label")) ?? (await who.innerText()).slice(0, 30);
      await who.tap();
      await page.waitForTimeout(2500);
      const opened = await stand();
      await page.evaluate(watch, { door: false, ms: 4000 });
      await page.goBack({ timeout: 30000 }).catch(() => null);
      await page.waitForTimeout(4500);
      const after = await stand().catch((e) => ({ error: String(e).slice(0, 120) }));
      console.log(`${spec}: tapped "${label}"`, JSON.stringify({ before, opened, after }));
      fs.appendFileSync(jsonl, JSON.stringify({ spec, label, before, opened, after }) + "\n");
    } else {
      await go(page, "/community/", { timeout: 120000 });
    }
    if (mode === "scroll") {
      await page.evaluate(() => { window.__fwHold = true; });
      await page.waitForFunction(() => document.querySelectorAll("main article").length > 8, null, { timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
      for (const dir of [1, -1]) {
        for (let k = 0; k < 200; k++) {
          const moved = await page.evaluate((dy) => {
            const was = scrollY;
            window.__fwIn = dy;
            window.scrollBy({ top: dy, behavior: "instant" });
            if (scrollY === was) window.__fwIn = 0;
            return scrollY !== was;
          }, 300 * dir);
          await page.waitForTimeout(220);
          if (!moved) break;
        }
        await page.waitForTimeout(800);
      }
      await page.evaluate(() => { window.__fwHold = false; });
    }
    await page.waitForFunction(() => window.__fw?.done, null, { timeout: 120000 });
    const W = await page.evaluate(() => window.__fw);
    const zero = W.tap ?? 0;
    const rel = (s) => s.map((x) => ({ ...x, t: x.t - zero }));
    const raf = steps(rel(W.raf), mode === "scroll");
    const post = steps(rel(W.post), mode === "scroll");
    const firstSeen = {};
    for (const s of rel(W.raf)) for (const k of Object.keys(s.o)) firstSeen[k] ??= { t: Math.round(s.t), top: Math.round(s.o[k][0]), h: Math.round(s.o[k][1] * 10) / 10 };
    const row = { spec, to: await page.evaluate(() => location.pathname), frames: W.raf.length, posts: W.n, heights: W.heights, firstSeen,
      rafSteps: raf.length, postSteps: post.length, raf: raf.slice(0, 40), post: post.slice(0, 40), shifts: W.shifts.map((s) => ({ ...s, t: s.t - Math.round(zero) })).slice(0, 20),
      dirtyPost: W.post.filter((p) => p.dirty).length, errors };
    fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
    row.asked = asked;
    row.door = await page.evaluate(() => [document.documentElement.getAttribute("data-pray-door"), document.querySelector("[data-door-place]")?.getAttribute("data-door-place") ?? null, !!document.querySelector('[role="tablist"] [role="tab"]')]);
    console.log(`${spec}: door mark/place/switch ${JSON.stringify(row.door)}, asked ${asked}; ${row.to}, ${row.frames} frames, ${row.posts} posts, steps read in requestAnimationFrame ${raf.length}, after paint ${post.length}, layout shifts ${row.shifts.length}`);
  } catch (e) {
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300), errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

for (const s of specs) await run(s);
await browser.close();
