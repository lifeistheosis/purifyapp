// The ambience sheet's volume slider tapped and dragged as a reader does (Updates 65, item 2 of round 4).
// Updates 63's walk tapped it at 30% and saw no change within 1.5s, then read 0.3 by the next tap.
// This probe reads the slider's value every frame from BEFORE the touch, so a value that changes on the
// touch itself (Slider.tsx sets it on pointerdown) is seen, then: a tap on the track at 30%, and a drag of
// the thumb from where it stands to 80% (touchStart, ten touchMoves, touchEnd). 390x844, CPU 4x, real touch.
//   node docs/handoffs/updates-65-runners/slider65.mjs <out dir> [en|ar]
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${ROOT}/scripts/lib/shell-server.mjs`);

const OUT = path.resolve(process.argv[2] ?? `${ROOT}/out`);
const LANG = process.argv[3] ?? "en";
const msgs = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const M = msgs(LANG), EN = msgs("en");
const word = (k) => k.split(".").reduce((o, p) => o?.[p], M) ?? M[k] ?? k.split(".").reduce((o, p) => o?.[p], EN) ?? EN[k];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: NATIVE_UA, ...(LANG !== "en" ? { locale: LANG } : {}) });
if (LANG !== "en") await ctx.addCookies([{ name: "purify_locale", value: LANG, url: "https://localhost" }]);
await ctx.addInitScript((l) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("CapacitorStorage.purify_locale", l);
  } catch {}
}, LANG);
await serveLikeTheShell(ctx, OUT, {});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await go(page, "/bible/john/1/", { timeout: 30000 });
await page.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const button = page.locator(`button[aria-label="${word("ambience.title")}"]`).filter({ visible: true }).first();
await button.waitFor({ timeout: 20000 });
const b = await button.boundingBox();
await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
const SEL = `[role="dialog"][aria-label="${word("ambience.title")}"] [role="slider"][aria-label="${word("ambience.volume")}"]`;
await page.locator(SEL).waitFor({ timeout: 10000 });
await page.waitForTimeout(1500);

async function record(name, act) {
  await page.evaluate((sel) => {
    window.__f = [];
    window.__touch = null;
    addEventListener("touchstart", (e) => (window.__touch ??= e.timeStamp), { capture: true, once: true });
    const loop = () => {
      const el = document.querySelector(sel);
      window.__f.push([performance.now(), el?.getAttribute("aria-valuenow") ?? null]);
      if (window.__f.length < 200) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, SEL);
  await page.waitForTimeout(150);
  await act();
  await page.waitForTimeout(1500);
  const { f, touch } = await page.evaluate(() => ({ f: window.__f, touch: window.__touch }));
  const before = f.filter(([t]) => t < touch).at(-1)?.[1];
  const changes = [];
  let last = before;
  for (const [t, v] of f) if (t >= touch && v !== last) { changes.push(`${Math.round(t - touch)}ms ${v}`); last = v; }
  const r = { name, lang: LANG, before, after: f.at(-1)[1], changes: changes.slice(0, 14), framesAfterTouch: f.filter(([t]) => t >= touch).length };
  console.log(JSON.stringify(r));
  return r;
}

const box = await page.locator(SEL).boundingBox();
const rtl = LANG === "ar";
const xAt = (value) => box.x + box.width * (rtl ? 1 - value : value);
const y = box.y + box.height / 2;
await record("a tap on the track at 30%", () => page.touchscreen.tap(xAt(0.3), y));
const now = Number(await page.locator(SEL).getAttribute("aria-valuenow"));
await record(`a drag of the thumb from ${now} to 0.8`, async () => {
  const from = xAt(now), to = xAt(0.8);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from, y }] });
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(30);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from + ((to - from) * i) / 10, y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
});
console.log(JSON.stringify({ errors }));
await browser.close();
