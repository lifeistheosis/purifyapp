// Gate 3b (2026-11-15): what shrinks inside /community/'s first posts after the Chat door's tap (the arbiter's
// note 2). From /discover/, taps a[href="/community"] and, in requestAnimationFrame, keeps every element of the
// first two articles with its height; on the first frame an article's height changes, prints each descendant
// whose height changed by 1px or more, with its tag, classes and data attributes.
//   node chatcause.mjs <out dir>
const ROOT = "/home/user/purifyapp", R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: NATIVE_UA, colorScheme: "dark", ...motionOptions("on") });
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await pinMotion(ctx, "on");
await serveLikeTheShell(ctx, process.argv[2] ?? `${ROOT}/out`, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
await go(page, "/discover/", { timeout: 120000 });
const link = page.locator('a[href="/community"], a[href="/community/"]').first();
await link.waitFor({ timeout: 120000 }); await page.waitForTimeout(5000); await link.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
await page.evaluate(() => {
  const t0 = performance.now(); const W = (window.__cc = { tap: null, out: null });
  addEventListener("pointerdown", () => { W.tap ??= performance.now() - t0; }, { capture: true, once: true });
  const name = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 4).join(".") : ""}${[...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `[${a.name}${a.value ? "=" + a.value.slice(0, 20) : ""}]`).join("")} "${(e.textContent || "").trim().slice(0, 24)}"`;
  const snap = () => [...document.querySelectorAll("main article")].slice(0, 2).map((a) => [a, [a, ...a.querySelectorAll("*")].map((e) => [e, e.getBoundingClientRect().height])]);
  let prev = null;
  const f = () => {
    const t = performance.now() - t0; const cur = snap();
    if (prev && cur.length && !W.out) {
      for (const [a, list] of cur) {
        const p = prev.find((x) => x[0] === a); if (!p) continue;
        if (Math.abs(list[0][1] - p[1][0][1]) >= 1) {
          const ph = new Map(p[1]);
          W.out ??= { t: Math.round(t - (W.tap ?? 0)), changed: [] };
          W.out.changed.push({ article: a.id.slice(0, 13), from: Math.round(p[1][0][1] * 10) / 10, to: Math.round(list[0][1] * 10) / 10, inside: list.slice(1).filter(([e, h]) => ph.has(e) && Math.abs(h - ph.get(e)) >= 1).slice(0, 8).map(([e, h]) => `${name(e)} ${Math.round(ph.get(e) * 10) / 10} -> ${Math.round(h * 10) / 10}`), added: list.filter(([e]) => !ph.has(e)).slice(0, 4).map(([e]) => name(e)), removed: p[1].filter(([e]) => !e.isConnected || !a.contains(e)).slice(0, 4).map(([e, h]) => `${name(e)} ${Math.round(h)}`) });
        }
      }
    }
    prev = cur;
    if (t < 4000 && !W.out) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
});
await link.tap(); await page.waitForTimeout(4500);
console.log(JSON.stringify(await page.evaluate(() => window.__cc.out), null, 1));
await b.close();
