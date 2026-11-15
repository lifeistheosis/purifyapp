// Gate 4b (2026-11-15): the Settings language switch filmed by the compositor, Updates 81's film way (CDP
// screencast, every frame it paints) on the switch open88's `switch` mode measures in the page. At 390x844,
// CPU 4x, the apps' user agent, a new reader, online (GET only). Settings in <from>, the language sheet
// opened, then <to> tapped; every painted frame from the tap until 4s after it is kept, and the distinct ones
// (a frame that differs from the one before) are laid side by side in a strip for the eye, each with the
// page's own state at that moment (html dir and lang, the h1's script), read from a mutation record in the page.
//   node film4b.mjs <out dir> <shots dir> <from> <to>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const sharp = (await import(`${ROOT}/node_modules/sharp/lib/index.js`)).default;
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [base, shots, from, to] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on"), locale: from });
await ctx.addCookies([{ name: "purify_locale", value: from, url: "https://localhost" }]);
await ctx.addInitScript((l) => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); localStorage.setItem("CapacitorStorage.purify_locale", l); } catch {} }, from);
await pinMotion(ctx, "on");
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, path.resolve(base), {});
for (const u of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(u, mainWeb);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await go(page, "/settings/", { timeout: 120000 });
await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 60000 });
await page.waitForTimeout(4000);
const picker = page.locator("[data-language-picker]").first();
await picker.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await picker.tap();
const opt = page.locator(`[data-language-sheet] [data-language-covers="${to}"]`).first();
await opt.waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const now = () => Math.round(performance.now() * 10) / 10;
  const script = (s) => (!s ? "-" : /[؀-ۿ]/.test(s) ? "ar" : /[A-Za-z]/.test(s) ? "en" : "-");
  const S = (window.__fs = { origin: performance.timeOrigin, states: [] });
  const read = () => {
    const h = document.documentElement;
    const h1 = document.querySelector("main h1, h1")?.textContent.trim() ?? "";
    const st = { t: now(), dir: h.dir || "ltr", lang: h.lang, h1: script(h1) + ":" + h1.slice(0, 24) };
    const last = S.states[S.states.length - 1];
    if (!last || last.dir !== st.dir || last.lang !== st.lang || last.h1 !== st.h1) S.states.push(st);
  };
  read();
  new MutationObserver(read).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["dir", "lang"] });
});
const frames = [];
cdp.on("Page.screencastFrame", async (f) => {
  frames.push({ wall: f.metadata.timestamp * 1000, data: f.data });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 390, maxHeight: 844 });
await page.waitForTimeout(300);
const tapAt = await page.evaluate(() => Math.round(performance.now() * 10) / 10);
await opt.tap();
await page.waitForTimeout(4000);
await cdp.send("Page.stopScreencast");
const S = await page.evaluate(() => window.__fs);
const stateAt = (t) => [...S.states].reverse().find((s) => s.t <= t) ?? S.states[0];
const rel = frames.map((f) => ({ t: Math.round((f.wall - S.origin) * 10) / 10, data: f.data })).filter((f) => f.t >= tapAt - 50);
const distinct = [];
let prev = null;
for (const f of rel) {
  const raw = await sharp(Buffer.from(f.data, "base64")).resize(98, 211).raw().toBuffer();
  const h = crypto.createHash("sha1").update(raw).digest("hex");
  if (h !== prev) distinct.push({ ...f, state: stateAt(f.t) });
  prev = h;
}
const tiles = await Promise.all(distinct.map((f) => sharp(Buffer.from(f.data, "base64")).resize(195, 422).png().toBuffer()));
const strip = path.join(shots, `switch-${from}-${to}.png`);
if (tiles.length) {
  await sharp({ create: { width: (195 + 4) * tiles.length, height: 422, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .composite(tiles.map((b, k) => ({ input: b, top: 0, left: k * (195 + 4) }))).png().toFile(strip);
}
const out = { from, to, tapAt, frames: rel.length, distinct: distinct.map((f) => ({ t: f.t, since: Math.round((f.t - tapAt) * 10) / 10, ...f.state })), states: S.states, errors };
fs.writeFileSync(path.join(shots, `switch-${from}-${to}.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, strip }));
await browser.close();
