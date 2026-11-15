// Updates 77 (2026-11-15): what moves the feed up as /community/ is opened directly. In requestAnimationFrame
// from the document's start, finds the section that holds the feed's tabs and, on the first two frames its top
// changes by 1px or more, prints every element above it or holding it whose height, top padding or top margin
// changed since the frame before, with its tag, classes and data attributes.
//   node directcause.mjs <out dir>
const ROOT = "/home/user/purifyapp", R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: NATIVE_UA, colorScheme: "dark", ...motionOptions("on") });
await ctx.addInitScript(() => {
  try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {}
  const t0 = performance.now(); const W = (window.__dc = { out: [] });
  const name = (e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).slice(0, 6).join(".") : ""}${[...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `[${a.name}]`).join("")}`;
  let prev = null, prevTop = null;
  const f = () => {
    const t = performance.now() - t0;
    const tabs = document.querySelector('main [role="tablist"], main div[aria-hidden].items-end.gap-6.border-b');
    const sec = tabs?.closest("section") ?? tabs?.parentElement;
    if (sec) {
      const top = sec.getBoundingClientRect().top;
      const set = new Set();
      for (let n = sec; n && n !== document.documentElement; n = n.parentElement) set.add(n);
      for (const e of document.body.querySelectorAll("*")) { const r = e.getBoundingClientRect(); if (r.height > 0 && r.bottom <= top + 2) set.add(e); }
      const cur = new Map([...set].map((e) => { const s = getComputedStyle(e); return [e, [e.getBoundingClientRect().height, parseFloat(s.paddingTop), parseFloat(s.marginTop)]]; }));
      if (prev && prevTop !== null && Math.abs(top - prevTop) >= 1 && W.out.length < 2)
        W.out.push({ t: Math.round(t), top: [Math.round(prevTop), Math.round(top)], changed: [...cur].filter(([e, v]) => prev.has(e) && v.some((x, i) => Math.abs(x - prev.get(e)[i]) >= 0.5)).slice(0, 12).map(([e, v]) => `${name(e)} h ${Math.round(prev.get(e)[0])}->${Math.round(v[0])} pt ${prev.get(e)[1]}->${v[1]} mt ${prev.get(e)[2]}->${v[2]}`), added: [...cur.keys()].filter((e) => !prev.has(e)).slice(0, 4).map(name), gone: [...prev.keys()].filter((e) => !cur.has(e)).slice(0, 4).map(name) });
      prev = cur; prevTop = top;
    }
    if (t < 12000 && W.out.length < 2) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
});
await pinMotion(ctx, "on");
await serveLikeTheShell(ctx, process.argv[2] ?? `${ROOT}/out`, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await go(page, "/community/", { timeout: 120000 }); await page.waitForTimeout(9000);
console.log(JSON.stringify(await page.evaluate(() => window.__dc.out), null, 1));
await b.close();
