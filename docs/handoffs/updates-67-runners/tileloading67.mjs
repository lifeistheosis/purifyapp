// Updates 67 (build 97 note 10): the ambience sheet with a tile mid-loading, held to checkMock with
// pixels at 390, 800 and 1032 wide, on the five palettes and every look, in English and in Arabic.
// scripts/gate/ambience-sheet.mjs holds the sheet at rest and playing; this is the state between:
// Rain tapped while its file is held unanswered (a slow connection), so its tile says "Loading".
// Its pieces are that runner's (open, the sheet, the tiles, the guard), with the hold in place of
// its block.
//
//   node docs/handoffs/updates-67-runners/tileloading67.mjs [export] [shots dir]
//
// Updates 70 (2026-11-14): MOTION=on (the default) or MOTION=off pins the app's
// own motion switch (purify.motion), so a run says which it measured and the
// reduced state can be run at all; PULSE=faint holds every animation on the
// tile's state line at its faintest frame before the measure, so the worst
// frame is measured rather than wherever the measure lands; each line names the
// motion switch as the page wore it and the state line's opacity and
// animations; and every failure is printed, not the first twelve.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${ROOT}/scripts/lib/shell-server.mjs`);
const { EVERY, checkMock } = await import(`${ROOT}/scripts/mock-check.mjs`);

const OUT = path.resolve(process.argv[2] ?? `${ROOT}/out`);
const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const OWN = "/opt/pw-browsers/chromium";
const WORDS = {
  en: JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/en.json`, "utf8")),
  ar: JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/ar.json`, "utf8")),
};
const t = (lang, key) => WORDS[lang][key] ?? WORDS.en[key];
const SIZES = [
  [390, 844],
  [800, 1280],
  [1032, 1366],
];
const sheetSel = (lang) => `[role="dialog"][aria-label="${t(lang, "ambience.title")}"]`;
const MOTION = process.env.MOTION ?? "on";
const FAINT = process.env.PULSE === "faint";
if (!["on", "off"].includes(MOTION)) throw new Error(`MOTION=${MOTION}: on or off`);
console.log(`motion ${MOTION}${FAINT ? ", the state line held at its faintest frame" : ""}`);
let failures = 0;

const browser = await chromium.launch({ ...(fs.existsSync(OWN) ? { executablePath: OWN } : {}), args: ["--autoplay-policy=user-gesture-required"] });
async function tapAt(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("nothing to tap");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
async function textOf(locator, want, ms = 12000) {
  for (let waited = 0; waited < ms; waited += 200) {
    const text = (await locator.innerText().catch(() => "")).replace(/\s+/g, " ");
    if (want(text)) return text;
    await locator.page().waitForTimeout(200);
  }
  return (await locator.innerText().catch(() => "")).replace(/\s+/g, " ");
}

for (const lang of ["en", "ar"]) {
  for (const [width, height] of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "no-preference",
      isMobile: width < 700,
      hasTouch: true,
      userAgent: NATIVE_UA,
      ...(lang !== "en" ? { locale: lang } : {}),
    });
    if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
    await ctx.addInitScript(
      ([l, motion]) => {
        try {
          localStorage.setItem("purify:onboarded", "99");
          localStorage.setItem("purify:whatsNewSeen", "99");
          localStorage.setItem("CapacitorStorage.purify_locale", l);
          localStorage.setItem("purify.motion", motion);
        } catch {}
      },
      [lang, MOTION],
    );
    await serveLikeTheShell(ctx, OUT, {});
    // Rain's file asked and never answered: its tile stays "Loading".
    await ctx.route("**/audio/ambience/rain.mp3", () => {});
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    await go(page, "/bible/john/1/", { timeout: 30000 });
    await page.waitForTimeout(2500);
    const button = page.locator(`button[aria-label="${t(lang, "ambience.title")}"]`).filter({ visible: true }).first();
    await button.waitFor({ timeout: 20000 });
    await tapAt(page, button);
    await page.locator(sheetSel(lang)).waitFor({ timeout: 10000 });
    await page.waitForTimeout(900);
    const rain = page.locator(`${sheetSel(lang)} button[aria-pressed]`).filter({ hasText: t(lang, "ambience.rain") }).first();
    await tapAt(page, rain);
    const said = await textOf(rain, (x) => x.includes(t(lang, "ambience.loading")));
    await page.waitForTimeout(800);
    const still = (await rain.innerText()).replace(/\s+/g, " ");
    // The state line: its opacity now, its animations, and (PULSE=faint) each held at its faintest frame.
    const line = await rain.evaluate((tile, faint) => {
      const el = tile.lastElementChild;
      const out = { motion: document.documentElement.getAttribute("data-motion"), opacity: null, animations: [] };
      if (!el) return out;
      for (const a of el.getAnimations()) {
        const frames = a.effect?.getKeyframes?.() ?? [];
        const timing = a.effect?.getComputedTiming?.() ?? {};
        const own = Number(getComputedStyle(el).opacity);
        let least = { offset: null, opacity: Infinity };
        for (const f of frames) if (f.opacity !== undefined && Number(f.opacity) < least.opacity) least = { offset: f.computedOffset ?? f.offset, opacity: Number(f.opacity) };
        if (faint && least.offset !== null) {
          a.pause();
          a.currentTime = least.offset * Number(timing.duration);
        }
        out.animations.push(`${a.animationName ?? "?"} (${a.playState}, least ${least.opacity === Infinity ? "none" : least.opacity}, was ${own})`);
      }
      out.opacity = Number(getComputedStyle(el).opacity);
      return out;
    }, FAINT);
    const label = `a tile mid-loading at ${width} in ${lang}, motion ${line.motion}, the line at ${line.opacity}${line.animations.length ? ` with ${line.animations.join(", ")}` : " with no animation"}`;
    if (!said.includes(t(lang, "ambience.loading")) || !still.includes(t(lang, "ambience.loading"))) {
      failures++;
      console.log(`  ✗ ${label}: the tile said "${still}", not "${t(lang, "ambience.loading")}"`);
    } else {
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `loading-${width}-${lang}.png`) });
      const result = await checkMock(page, sheetSel(lang), { palettes: EVERY, pixels: true });
      const after = (await rain.innerText()).replace(/\s+/g, " ");
      if (!after.includes(t(lang, "ambience.loading"))) {
        failures++;
        console.log(`  ✗ ${label}: the tile left Loading during the check ("${after}")`);
      }
      if (result.failures.length) {
        failures++;
        console.log(`  ✗ checkMock ${label}: ${result.failures.length} failure(s)`);
        for (const f of result.failures) console.log(`      ${f.check} on ${f.palette}: ${f.what} ${f.detail ?? ""}`);
      } else console.log(`  ✓ checkMock ${label}: passes on ${EVERY.length} palettes and looks`);
      for (const a of result.allowed ?? []) console.log(`      allowed: ${a}`);
    }
    if (errors.length) console.log(`      page errors: ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `FAIL: ${failures}` : "PASS");
process.exit(failures ? 1 : 0);
