// Updates 81 (2026-11-15): one cold open filmed by the compositor (CDP screencast, every frame it paints), at
// 390x844, CPU 4x, the apps' user agent, a new reader, on the gate's export. The page marks when <html> dir
// flips, when the slate leaves the page and when the first English catalog string is put in the page outside it;
// the frames painted around those moments are kept, and a strip of them is written for the eye.
//   node film81.mjs <out dir> <shots dir> <lang> <path>
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const sharp = (await import(`${ROOT}/node_modules/sharp/lib/index.js`)).default;
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [base, shots, lang, at] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const cat = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = cat("en"), L = cat(lang);
const english = [...new Set(Object.entries(EN).filter(([k, v]) => typeof v === "string" && L[k] && L[k] !== v && /[A-Za-z]{2}/.test(v) && !/[{}<]/.test(v) && v.length <= 80).map(([, v]) => v.trim()))];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on"), locale: lang });
await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
await ctx.addInitScript((l) => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); localStorage.setItem("CapacitorStorage.purify_locale", l); } catch {} }, lang);
await ctx.addInitScript((list) => {
  const EN = new Set(list);
  const now = () => Math.round(performance.now() * 10) / 10;
  const M = (window.__fm = { origin: performance.timeOrigin, dir: null, slateOut: null, english: null, words: [] });
  new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === "attributes" && r.attributeName === "dir" && M.dir === null && document.documentElement.dir === "rtl") M.dir = now();
      for (const d of r.removedNodes || []) if (d.nodeType === 1 && (d.matches("[data-launch-frame]") || d.querySelector("[data-launch-frame]"))) M.slateOut ??= now();
      for (const a of r.addedNodes || []) {
        const it = a.nodeType === 1 ? document.createTreeWalker(a, NodeFilter.SHOW_TEXT) : null;
        const nodes = a.nodeType === 3 ? [a] : [];
        if (it) for (let x = it.nextNode(); x; x = it.nextNode()) nodes.push(x);
        for (const n of nodes) if (EN.has(n.nodeValue.trim()) && !n.parentElement?.closest("[data-launch-frame]")) { M.english ??= now(); if (M.words.length < 8) M.words.push(n.nodeValue.trim().slice(0, 30)); }
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["dir"] });
}, english);
await pinMotion(ctx, "on");
await serveLikeTheShell(ctx, path.resolve(base), {});
for (const u of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(u, mainWeb);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const frames = [];
cdp.on("Page.screencastFrame", async (f) => {
  frames.push({ wall: f.metadata.timestamp * 1000, data: f.data });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 390, maxHeight: 844 });
await go(page, at, { timeout: 120000 });
await page.waitForTimeout(7000);
await cdp.send("Page.stopScreencast");
const M = await page.evaluate(() => window.__fm);
const rel = frames.map((f, i) => ({ i, t: Math.round((f.wall - M.origin) * 10) / 10, data: f.data }));
const keep = (t0, before, after) => rel.filter((f) => f.t >= t0 - before && f.t <= t0 + after);
const out = { lang, at, marks: { dir: M.dir, slateOut: M.slateOut, english: M.english, words: M.words }, frames: rel.length, times: rel.map((f) => f.t) };
const strip = async (name, list, crop) => {
  if (!list.length) return null;
  const tiles = await Promise.all(list.map((f) => sharp(Buffer.from(f.data, "base64")).extract(crop).png().toBuffer()));
  const W = crop.width, H = crop.height;
  const file = path.join(shots, `${name}.png`);
  await sharp({ create: { width: W, height: (H + 4) * tiles.length, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .composite(tiles.map((b, k) => ({ input: b, top: k * (H + 4), left: 0 }))).png().toFile(file);
  for (const f of list) fs.writeFileSync(path.join(shots, `${name}-${f.t}.png`), Buffer.from(f.data, "base64"));
  return { file, at: list.map((f) => f.t) };
};
if (M.dir) out.stars = await strip("stars", keep(M.dir, 60, 60).slice(0, 4), { left: 0, top: 0, width: 390, height: 470 });
if (M.slateOut) out.screen = await strip("screen", keep(M.slateOut, 40, 260).slice(0, 5), { left: 0, top: 280, width: 390, height: 130 });
if (M.slateOut) out.bar = await strip("bar", keep(M.slateOut, 40, 260).slice(0, 5), { left: 0, top: 784, width: 390, height: 60 });
fs.writeFileSync(path.join(shots, "film.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, times: out.times.filter((t) => (M.slateOut && Math.abs(t - M.slateOut) < 400) || (M.dir && Math.abs(t - M.dir) < 150)) }));
await browser.close();
