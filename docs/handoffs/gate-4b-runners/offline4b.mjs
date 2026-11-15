// Gate 4b's Community offline runner (2026-11-15; Updates 91 left both): /community/ with no network,
// its card measured with checkMock { pixels: true } on the five palettes and the two earned, then its
// Try again tapped with real touch and measured again. Offline as Updates 91's probe made it: every
// request outside the bundle aborted, as a phone with no signal answers. Reached the app's way (a cold
// start at the front door, then the router). For each run it records the button's size, what the finger
// meets at its middle, its top before and after the tap, whether the line under it ("No signal") came,
// the page's layout shifts across the tap, and checkMock's failures before and after.
//   node offline4b.mjs <out dir> <jsonl> <spec>...    spec: <width>@<lang>@<new|open>
// A new reader is the Android shell that sells Plus (SELLS_PLUS's way); the open reader is the same
// export with nothing locked.
import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, WORN } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const messages = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = messages("en");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(spec) {
  const [w, lang, reader] = spec.split("@");
  const width = Number(w);
  const m = messages(lang);
  const t = (k) => m[k] ?? EN[k];
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA,
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
  if (reader === "new") await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route((u) => !u.href.startsWith("https://localhost"), (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const rec = { spec };
  try {
    await go(page, "/community/", { timeout: 60000 });
    const label = t("community.tryAgain");
    const btn = page.locator("button", { hasText: label }).first();
    await btn.waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      window.__shifts = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__shifts.push({ v: +e.value.toFixed(4), at: Math.round(e.startTime), who: (e.sources ?? []).map((s) => s.node?.nodeName + " " + Math.round(s.previousRect.y) + ">" + Math.round(s.currentRect.y)).join(", ") });
      }).observe({ type: "layout-shift", buffered: false });
    });
    await btn.evaluate((b) => b.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(400);
    rec.card = await page.evaluate((said) => {
      const p = [...document.querySelectorAll("p")].find((e) => e.textContent.trim() === said);
      return { said: !!p, dir: document.documentElement.dir || "ltr" };
    }, t("community.loadFailed"));
    const before = await checkMock(page, "body", { pixels: true, palettes: WORN });
    rec.before = { failures: before.failures.map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 300)), unmeasured: before.unmeasured?.length ?? 0 };
    const b = await btn.boundingBox();
    rec.button = { w: Math.round(b.width), h: Math.round(b.height), top: +b.y.toFixed(1) };
    rec.meets = await page.evaluate(([x, y, said]) => {
      const hit = document.elementFromPoint(x, y);
      const btn = hit?.closest("button");
      return btn && btn.textContent.trim() === said ? "Try again" : (hit?.tagName ?? "nothing");
    }, [b.x + b.width / 2, b.y + b.height / 2, label]);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(1500);
    const a = await btn.boundingBox();
    rec.after = { top: +a.y.toFixed(1), moved: +(a.y - b.y).toFixed(1) };
    rec.line = await page.evaluate(() => {
      const s = document.querySelector("[data-feed-unreached]");
      return s ? { said: s.textContent.trim().slice(0, 80), role: s.getAttribute("role") } : null;
    });
    rec.shifts = await page.evaluate(() => window.__shifts);
    const after = await checkMock(page, "body", { pixels: true, palettes: WORN });
    rec.afterMock = { failures: after.failures.map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 300)), unmeasured: after.unmeasured?.length ?? 0 };
    rec.errors = errors;
    console.log(`${spec}: card ${rec.card.said} dir ${rec.card.dir}; button ${rec.button.w}x${rec.button.h} meets ${rec.meets}; moved ${rec.after.moved}px; line ${rec.line ? "yes" : "NO"}; shifts ${rec.shifts.length}; checkMock before ${rec.before.failures.length}, after ${rec.afterMock.failures.length}`);
  } catch (e) {
    rec.error = String(e).slice(0, 300);
    rec.errors = errors;
    await page.screenshot({ path: path.join(path.dirname(jsonl), `fail-${spec.replace(/@/g, "_")}.png`) }).catch(() => {});
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    fs.appendFileSync(jsonl, JSON.stringify(rec) + "\n");
    await ctx.close();
  }
}

for (const s of specs) await run(s);
await browser.close();
