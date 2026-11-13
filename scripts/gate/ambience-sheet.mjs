// Build 95, note 11 (a reader's report: the ambient sounds "do not currently work"). The ambience sheet
// on the native export, at phone size with real touch taps and the app's motion on:
//
//   play    each of the six sounds tapped, and each must really play: its file asked of the bundle and
//           answered, decoded, and started on a running AudioContext (the page's own Web Audio calls are
//           watched), its tile saying "Playing", no failure line; tapped again, it stops.
//   taps    every control of the sheet tapped as a reader taps it: the tiles (one, two, a third in the
//           place of the first), the volume, each sound's own volume while two play, the sleep timer's
//           four choices, and Close. Each tap must change something, and nothing may move more than
//           4px under the finger (the pre-build gate's part 1, docs/1.9-build/notes/build-93.md).
//   guard   checkMock with pixels (scripts/mock-check.mjs) on the sheet at 390, 800 and 1032 wide, on the
//           five palettes and every look, in English and in Arabic: with two sounds playing (every
//           control drawn), and quiet with a sound that could not play ("Try again") and the last one
//           marked.
//   lock    with SELLS_PLUS=1 (the export sells Plus; the page says it is the Android shell) the reader has
//           no Plus: every sound wears the padlock, a tap opens the upgrade sheet, its preview plays Rain,
//           and when the preview's sound fails no tile of the ambience sheet ever shows the failure line
//           in the lock's place. The locked sheet is held to checkMock too, in English and in Arabic.
//
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
//   node scripts/gate/ambience-sheet.mjs [shots dir]
//   SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs [shots dir]
//
// Chromium starts audio only from a tap here (--autoplay-policy=user-gesture-required, a phone browser's
// rule; the apps' shells waive it), so a sound that plays was started by the tap. The iPhone app's own
// answer for a bundled sound (no HTTP status) cannot be drawn by Chromium; lib/ambience/__tests__/
// starts.test.ts holds the player to it.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { EARNED, EVERY, LOOKS, PALETTES, checkMock } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, checkSells, readerWords } from "../lib/sells-plus.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const WORDS = {
  en: JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")),
  ar: JSON.parse(fs.readFileSync("lib/i18n/messages/ar.json", "utf8")),
};
const SOUNDS = ["rain", "birds", "bell", "peal", "sea", "wind"];
const SIZES = [
  [390, 844],
  [800, 1280],
  [1032, 1366],
];
const ALL = EVERY;
checkSells(OUT);
// The five palettes, the two earned by reading and every look the registry holds (seventeen until build 95 note 16 took the sea's two).
if (PALETTES.length !== 5 || EARNED.length !== 2 || LOOKS.length < 1) throw new Error(`expected the five palettes, the two earned and the looks, found ${PALETTES.length}, ${EARNED.length} and ${LOOKS.length}`);
for (const s of SOUNDS) if (!fs.existsSync(path.join(OUT, "audio", "ambience", `${s}.mp3`))) throw new Error(`the export does not carry audio/ambience/${s}.mp3`);

// The page's Web Audio, watched: every context and its state, each decoding and how it ended, each
// source started and the state of its context at that moment.
const WATCH = () => {
  const log = (window.__ambience = { contexts: [], decoded: [], started: [] });
  const AC = window.AudioContext;
  if (!AC) return;
  const decode = AC.prototype.decodeAudioData;
  AC.prototype.decodeAudioData = function (data, ...rest) {
    const bytes = data?.byteLength ?? 0;
    const p = decode.call(this, data, ...rest);
    p?.then?.(
      (b) => log.decoded.push({ bytes, seconds: b.duration }),
      (e) => log.decoded.push({ bytes, error: String(e) }),
    );
    return p;
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    log.started.push({ state: this.context.state, seconds: this.buffer?.duration ?? null, loop: this.loop });
    return start.apply(this, a);
  };
  window.AudioContext = function (...a) {
    const c = new AC(...a);
    log.contexts.push(c);
    return c;
  };
  window.AudioContext.prototype = AC.prototype;
};

let fails = 0;
const fail = (what) => {
  fails += 1;
  console.log(`  ✗ ${what}`);
};
const ok = (what) => console.log(`  ✓ ${what}`);

const browser = await chromium.launch({ ...(fs.existsSync(OWN) ? { executablePath: OWN } : {}), args: ["--autoplay-policy=user-gesture-required"] });

async function open(lang, [width, height], { blocked = [], scale = 1 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    isMobile: width < 700,
    hasTouch: true,
    userAgent: NATIVE_UA,
    // The reader's language as the tap walk sets it (scripts/tap-walk.mjs, --lang): the key the app
    // keeps, the browser's language and the cookie, so the Android shell's lane reads it too.
    ...(lang !== "en" ? { locale: lang } : {}),
  });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await ctx.addInitScript(WATCH);
  if (SELLS_PLUS) await asAndroidShell(ctx);
  const asked = {};
  await serveLikeTheShell(ctx, OUT, asked);
  // A sound whose file cannot be had (to draw the failure line): the shell answers nothing for it.
  for (const s of blocked) await ctx.route(`**/audio/ambience/${s}.mp3`, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await go(page, "/bible/john/1/", { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page, asked, errors };
}

const t = (lang, key) => WORDS[lang][key] ?? WORDS.en[key];
const sheetSel = (lang) => `[role="dialog"][aria-label="${t(lang, "ambience.title")}"]`;

/** Tap at the middle of what a locator names, with the finger (the DevTools protocol's touch). */
async function tapAt(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("nothing to tap");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

async function openSheet(page, lang) {
  const button = page.locator(`button[aria-label="${t(lang, "ambience.title")}"]`).filter({ visible: true }).first();
  await button.waitFor({ timeout: 20000 });
  await tapAt(page, button);
  await page.locator(sheetSel(lang)).waitFor({ timeout: 10000 });
  await page.waitForTimeout(900);
}

const tiles = (page, lang) => page.locator(`${sheetSel(lang)} button[aria-pressed]`).filter({ hasText: new RegExp(SOUNDS.map((s) => t(lang, `ambience.${s}`)).join("|")) });
const tileOf = (page, lang, s) => tiles(page, lang).filter({ hasText: t(lang, `ambience.${s}`) }).first();

async function waitText(locator, want, ms = 12000) {
  for (let waited = 0; waited < ms; waited += 200) {
    const text = (await locator.innerText().catch(() => "")).replace(/\s+/g, " ");
    if (want(text)) return text;
    await locator.page().waitForTimeout(200);
  }
  return (await locator.innerText().catch(() => "")).replace(/\s+/g, " ");
}

/** What a tap is measured by: the sheet's words and states, the sliders' values, the scroll, the dialogs. */
const state = (page) =>
  page.evaluate(() => {
    const ds = [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute("aria-label"));
    const marks = [...document.querySelectorAll('[role="dialog"] [aria-pressed], [role="dialog"] [role="slider"]')].map((e) => `${e.getAttribute("aria-pressed") ?? ""}${e.getAttribute("aria-valuenow") ?? ""}`);
    const words = [...document.querySelectorAll('[role="dialog"]')].map((d) => d.innerText).join("|");
    return JSON.stringify({ ds, marks, words });
  });

/** A tap by the finger that must change something, with what stood under the finger kept in place. */
async function tapMust(page, locator, what, { settle = 700, at = null } = {}) {
  const before = await state(page);
  const box0 = await locator.boundingBox();
  if (!box0) return fail(`${what}: not drawn`);
  const x = at ? box0.x + box0.width * at : box0.x + box0.width / 2;
  const y = box0.y + box0.height / 2;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(settle);
  const after = await state(page);
  if (after === before) return fail(`${what}: the tap changed nothing`);
  const box1 = await locator.boundingBox().catch(() => null);
  if (box1) {
    const moved = Math.max(Math.abs(box1.y - box0.y), Math.abs(box1.x - box0.x));
    if (moved > 4) return fail(`${what}: moved ${Math.round(moved)}px under the finger`);
  }
  ok(what);
}

async function guard(page, lang, size, label) {
  const result = await checkMock(page, sheetSel(lang), { palettes: ALL, pixels: true });
  const n = result.failures.length;
  if (n) {
    fail(`checkMock ${label} at ${size[0]} in ${lang}: ${n} failure(s)`);
    for (const f of result.failures.slice(0, 12)) console.log(`      ${f.check} on ${f.palette}: ${f.what} ${f.detail ?? ""}`);
  } else ok(`checkMock ${label} at ${size[0]} in ${lang}: passes on ${ALL.length} palettes and looks`);
  if (result.allowed?.length) for (const a of result.allowed) console.log(`      allowed: ${a}`);
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

console.log(`The ambience sheet on the export, ${readerWords()}, motion on.`);

if (!SELLS_PLUS) {
  // ---- play: each of the six, from the bundle, by a tap.
  {
    const lang = "en";
    const { ctx, page, asked, errors } = await open(lang, SIZES[0]);
    await openSheet(page, lang);
    console.log("\nplay: each sound by a tap, at 390");
    for (const s of SOUNDS) {
      const tile = tileOf(page, lang, s);
      const startedBefore = await page.evaluate(() => window.__ambience.started.length);
      const box0 = await tapAt(page, tile);
      const text = await waitText(tile, (x) => x.includes(t(lang, "ambience.playing")) || x.includes(t(lang, "ambience.failed")) || x.includes(t(lang, "ambience.needsConnection")));
      const log = await page.evaluate((n) => ({ started: window.__ambience.started.slice(n), decoded: window.__ambience.decoded, states: window.__ambience.contexts.map((c) => c.state) }), startedBefore);
      const file = `/audio/ambience/${s}.mp3`;
      const fromBundle = (asked.asked ?? []).some((a) => String(a).includes(file)) && !(asked.missing ?? []).some((a) => String(a).includes(file));
      const started = log.started.find((x) => x.state === "running" && x.loop && x.seconds > 20);
      const box1 = await tile.boundingBox();
      const moved = Math.abs(box1.y - box0.y);
      if (text.includes(t(lang, "ambience.playing")) && started && fromBundle) {
        ok(`${s}: asked of the bundle, decoded (${started.seconds.toFixed(1)}s), started on a running context, looped; "${text}"`);
      } else fail(`${s}: "${text}", from the bundle ${fromBundle}, started ${JSON.stringify(log.started)}, contexts ${JSON.stringify(log.states)}`);
      if (moved > 4) fail(`${s}: its tile moved ${Math.round(moved)}px under the finger as the sound began`);
      if (s === "rain") await shot(page, "play-rain-390");
      await tapAt(page, tile);
      await page.waitForTimeout(1200);
      if ((await tile.getAttribute("aria-pressed")) !== "false") fail(`${s}: tapped again, it did not stop`);
    }
    const bad = (await page.evaluate(() => window.__ambience.decoded)).filter((d) => d.error);
    if (bad.length) fail(`decoding failed: ${JSON.stringify(bad)}`);
    if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
    await ctx.close();
  }

  // ---- taps: every control of the sheet, motion on.
  {
    const lang = "en";
    const { ctx, page } = await open(lang, SIZES[0]);
    await openSheet(page, lang);
    console.log("\ntaps: every control of the sheet, at 390, motion on");
    const sheet = page.locator(sheetSel(lang));
    await tapMust(page, tileOf(page, lang, "rain"), "Rain: plays", { settle: 2500 });
    await tapMust(page, sheet.locator(`[role="slider"][aria-label="${t(lang, "ambience.volume")}"]`), "Volume: set by a tap", { at: 0.25 });
    for (const key of ["15", "30", "60", "off"]) {
      const name = key === "off" ? t(lang, "common.off") : t(lang, "today.minRead").replace(/\{count(?:, *plural,[^}]*\})?\}/, key);
      const choice = sheet.locator(`[role="group"][aria-label="${t(lang, "player.sleep")}"] button`).filter({ hasText: key === "off" ? name : key }).first();
      await tapMust(page, choice, `Sleep timer: ${key === "off" ? "Off" : `${key} minutes`}`);
    }
    await tapMust(page, tileOf(page, lang, "bell"), "Bell and stillness: joins Rain", { settle: 2500 });
    await tapMust(page, sheet.locator(`[role="slider"][aria-label="${t(lang, "ambience.rain")}"]`), "Rain's own volume: set by a tap", { at: 0.3 });
    await tapMust(page, sheet.locator(`[role="slider"][aria-label="${t(lang, "ambience.bell")}"]`), "Bell's own volume: set by a tap", { at: 0.7 });
    await tapMust(page, tileOf(page, lang, "sea"), "The sea: takes Rain's place", { settle: 2500 });
    // The sounds lit, not the sleep timer's chosen time (its buttons are pressed too, in their group).
    const lit = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} button[aria-pressed="true"]`)].filter((b) => !b.closest('[role="group"]')).map((b) => b.innerText.split("\n")[0]), sheetSel(lang));
    if (lit.length === 2 && lit.includes(WORDS.en["ambience.bell"]) && lit.includes(WORDS.en["ambience.sea"])) ok(`two play: ${lit.join(" and ")}`);
    else fail(`after a third sound, playing: ${lit.join(", ")}`);
    await tapMust(page, tileOf(page, lang, "bell"), "Bell and stillness: stops", { settle: 1400 });
    await tapMust(page, tileOf(page, lang, "sea"), "The sea: stops", { settle: 1400 });
    await shot(page, "taps-quiet-390");
    await tapMust(page, sheet.locator(`button[aria-label="${t(lang, "common.close")}"]`).filter({ visible: true }).last(), "Close: the sheet goes", { settle: 900 });
    await ctx.close();
  }

  // ---- stills for his yes, at twice the pixels: 390 on Dark with one sound playing and with two, and
  // the same on a light look (Stone, a clean neutral; never the parchment ground in a design).
  if (SHOTS) {
    console.log("\nstills: 390, at twice the pixels");
    const lang = "en";
    const { ctx, page } = await open(lang, SIZES[0], { scale: 2 });
    await openSheet(page, lang);
    await shot(page, "still-0-quiet-dark");
    await tapAt(page, tileOf(page, lang, "rain"));
    await waitText(tileOf(page, lang, "rain"), (x) => x.includes(t(lang, "ambience.playing")));
    await page.waitForTimeout(900);
    await shot(page, "still-1-one-playing-dark");
    await tapAt(page, tileOf(page, lang, "peal"));
    await waitText(tileOf(page, lang, "peal"), (x) => x.includes(t(lang, "ambience.playing")));
    await page.waitForTimeout(900);
    await shot(page, "still-2-two-playing-dark");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-reading-mode", "parchment");
      document.documentElement.setAttribute("data-look", "stone");
    });
    await page.waitForTimeout(900);
    await shot(page, "still-3-two-playing-light");
    ok("stills taken");
    await ctx.close();
  }

  // ---- guard: checkMock with pixels, three widths, 22 palettes and looks, English and Arabic.
  for (const lang of ["en", "ar"]) {
    for (const size of SIZES) {
      console.log(`\nguard: ${size[0]} wide, ${lang}`);
      {
        const { ctx, page } = await open(lang, size);
        await openSheet(page, lang);
        await tapAt(page, tileOf(page, lang, "rain"));
        await waitText(tileOf(page, lang, "rain"), (x) => x.includes(t(lang, "ambience.playing")));
        await tapAt(page, tileOf(page, lang, "bell"));
        await waitText(tileOf(page, lang, "bell"), (x) => x.includes(t(lang, "ambience.playing")));
        await page.waitForTimeout(800);
        await shot(page, `two-playing-${size[0]}-${lang}`);
        await guard(page, lang, size, "two sounds playing");
        await ctx.close();
      }
      {
        // Quiet: Wind played and stopped (marked "Last played"), and Rain could not play ("Try again").
        const { ctx, page } = await open(lang, size, { blocked: ["rain"] });
        await openSheet(page, lang);
        await tapAt(page, tileOf(page, lang, "wind"));
        await waitText(tileOf(page, lang, "wind"), (x) => x.includes(t(lang, "ambience.playing")));
        await tapAt(page, tileOf(page, lang, "wind"));
        await page.waitForTimeout(1200);
        await tapAt(page, tileOf(page, lang, "rain"));
        const text = await waitText(tileOf(page, lang, "rain"), (x) => x.includes(t(lang, "ambience.failed")));
        if (text.includes(t(lang, "ambience.failed"))) ok(`a sound that could not play says "${t(lang, "ambience.failed")}"`);
        else fail(`a sound that could not play says "${text}"`);
        await page.waitForTimeout(600);
        await shot(page, `failed-${size[0]}-${lang}`);
        await guard(page, lang, size, "quiet, one failed");
        await ctx.close();
      }
    }
  }
} else {
  // ---- lock: a reader with no Plus.
  for (const lang of ["en", "ar"]) {
    console.log(`\nlock: a reader with no Plus, ${lang}, at 390`);
    const { ctx, page } = await open(lang, SIZES[0], { blocked: lang === "en" ? [] : ["rain"] });
    await openSheet(page, lang);
    const locked = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} button[data-ambience-tile]`)].map((b) => ({ text: b.innerText.replace(/\s+/g, " "), lock: Boolean(b.querySelector("svg[aria-hidden]")) })), sheetSel(lang));
    if (locked.length === 6 && locked.every((x) => x.lock)) ok(`every sound wears the padlock (${locked.map((x) => x.text).join(", ")})`);
    else fail(`the locked tiles: ${JSON.stringify(locked)}`);
    await guard(page, lang, SIZES[0], "locked");
    // A tap opens the upgrade sheet; its preview plays Rain (or, with Rain's file kept away, fails).
    await tapAt(page, tileOf(page, lang, "rain"));
    const plus = page.locator(`[role="dialog"][aria-label="${t(lang, "plus.sheet.title")}"]`).first();
    await plus.waitFor({ timeout: 10000 }).catch(() => {});
    // Where the sheet comes to rest, not where it passes on its way up.
    await page.waitForTimeout(1200);
    if (!(await plus.count())) fail("a locked sound's tap opened no upgrade sheet");
    else {
      ok("a locked sound's tap opens the upgrade sheet");
      // Ambience's own Try it (components/billing/KeptPaywall.tsx), unless the sheet opened on it working.
      const tryIt = plus.locator('[data-plus-try-open="ambience"]').first();
      if (await tryIt.count()) await tapAt(page, tryIt);
      await page.waitForTimeout(4000);
      const words = (await plus.innerText()).replace(/\s+/g, " ");
      const shown = lang === "en" ? t(lang, "ambience.playing") : t(lang, "ambience.failed");
      if (words.includes(shown)) ok(`the preview's Rain says "${shown}"`);
      else fail(`the preview's Rain does not say "${shown}"`);
      await shot(page, `lock-preview-${lang}`);
      await tapAt(page, plus.locator(`button[aria-label="${t(lang, "common.close")}"]`).filter({ visible: true }).last());
      await page.waitForTimeout(1500);
    }
    const after = await page.locator(sheetSel(lang)).innerText().catch(() => "");
    const said = ["ambience.failed", "ambience.needsConnection", "ambience.loading", "ambience.last"].filter((key) => after.includes(t(lang, key)));
    for (const key of said) fail(`after the preview, a locked tile says "${t(lang, key)}"`);
    if (!said.length) ok("after the preview, no locked tile says a sound could not play: the padlocks alone");
    await shot(page, `lock-after-${lang}`);
    await ctx.close();
  }
}

if (SELLS_PLUS) {
  // ---- preview: the Plus preview's strip wears the photographs (build 95, note 22, his word of
  // 2026-11-13 about 14:29 UTC, "the Plus preview's strip takes the photographs too"). Opened as a
  // reader without Plus opens it, from a locked sound and Ambience's Try it; each of the six tiles
  // shows its sound's photograph; in English a finger plays a second sound and the tile under it
  // does not move; checkMock with pixels on the preview at each width, in English and in Arabic.
  console.log("\npreview: the Plus preview's strip, with the photographs");
  for (const lang of ["en", "ar"]) {
    for (const size of SIZES) {
      const { ctx, page } = await open(lang, size, { blocked: lang === "en" ? [] : ["rain"] });
      await openSheet(page, lang);
      await tapAt(page, tileOf(page, lang, "rain"));
      const plus = page.locator(`[role="dialog"][aria-label="${t(lang, "plus.sheet.title")}"]`).first();
      await plus.waitFor({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const tryIt = plus.locator('[data-plus-try-open="ambience"]').first();
      if (await tryIt.count()) await tapAt(page, tryIt);
      const preview = page.locator('[data-plus-try="ambience"]').first();
      if (!(await preview.waitFor({ timeout: 10000 }).then(() => true, () => false))) {
        fail(`the Plus preview of Ambience did not open at ${size[0]} in ${lang}`);
        await ctx.close();
        continue;
      }
      await page.waitForTimeout(3000);
      const strip = preview.locator(`[role="group"][aria-label="${t(lang, "ambience.title")}"]`).first();
      const shown = await strip.evaluate((el) =>
        [...el.querySelectorAll("button")].map((b) => {
          const img = b.querySelector("img");
          return { src: img?.getAttribute("src") ?? null, painted: Boolean(img?.complete && img.naturalWidth > 0), h: Math.round(b.getBoundingClientRect().height) };
        }),
      );
      const expected = SOUNDS.map((s) => `/audio/ambience/${s}.jpg`);
      if (shown.length === 6 && shown.every((x, i) => x.src === expected[i] && x.painted && x.h === 108)) ok(`the strip's six tiles each show their sound's photograph, painted, 108px tall, at ${size[0]} in ${lang}`);
      else fail(`the strip at ${size[0]} in ${lang}: ${JSON.stringify(shown)}`);
      if (lang === "en" && size === SIZES[0]) {
        const sea = strip.locator("button").nth(SOUNDS.indexOf("sea"));
        await sea.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        const before = await sea.boundingBox();
        await tapAt(page, sea);
        const text = await waitText(sea, (x) => x.includes(t(lang, "ambience.playing")) || x.includes(t(lang, "ambience.failed")));
        const after = await sea.boundingBox();
        const moved = before && after ? Math.max(Math.abs(after.x - before.x), Math.abs(after.y - before.y)) : 99;
        if (text.includes(t(lang, "ambience.playing")) && moved <= 4) ok(`a finger on The sea in the strip plays it, and the tile does not move (${moved.toFixed(1)}px)`);
        else fail(`The sea in the strip: "${text}", moved ${moved.toFixed(1)}px`);
      }
      const result = await checkMock(page, '[data-plus-try="ambience"]', { palettes: ALL, pixels: true });
      if (result.failures.length) {
        fail(`checkMock the Plus preview at ${size[0]} in ${lang}: ${result.failures.length} failure(s)`);
        for (const f of result.failures.slice(0, 12)) console.log(`      ${f.check} on ${f.palette}: ${f.what} ${f.detail ?? ""}`);
      } else ok(`checkMock the Plus preview at ${size[0]} in ${lang}: passes on ${ALL.length} palettes and looks`);
      if (result.allowed?.length) for (const a of result.allowed) console.log(`      allowed: ${a}`);
      await shot(page, `preview-${lang}-${size[0]}`);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(fails ? `\n${fails} fail(s).` : "\nAll passed.");
process.exit(fails ? 1 : 0);
