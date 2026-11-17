// Build 95, note 25: the voices, walked on the native export at phone size with real touch taps (the
// pre-build gate's part 1) and held to checkMock with pixels (part 2).
//
//   dock    (Updates 17's pushable commits) John 1 read by Heart, then the Russian Synodal downloaded
//           and chosen, then John 2: a Russian page while the English recording plays. The dock must
//           offer no Listen there (it offered the English reading over the Russian page). Every
//           control of the dock tapped; checkMock with pixels on the dock at 390, 800 and 1032 wide,
//           on the five palettes and every look, in English and in Arabic. Heart is the one voice:
//           the browser's speech is a tripwire, and the walk fails if anything asks it to speak.
//
//   voices  RETIRED on 2026-11-17 (Updates 98s). It walked the phone's own voices: the Voice sheet,
//           Hear it, Listen on Genesis 1 and a saint's life read by a phone's voice, the gone and the
//           none lines. His word of 2026-11-16 (about 22:35 UTC), "remove locally LLM voices ... (only
//           leave one the standard prerecorded voices)", made Heart the only voice, and Updates 98r's
//           patches took the phone's voices, the Voice sheet and Listen on unrecorded texts out of the
//           app, so there is nothing left for it to walk. It now says so and exits. Its code is in git
//           history (this file before 2026-11-17). Listen on the texts Heart has not recorded is
//           measured by scripts/gate/listen-walk.mjs: none on them.
//
//   node scripts/gate/export.mjs        (the export, cut as the store builds cut it)
//   JOHN1_MP3=<file> node scripts/gate/voices.mjs dock [shots dir]
//
// The main web runs 1.8 until the merge, so the Bibles it will serve are answered here from
// public/bibles/, and Heart's recording of John 1 from the file named by JOHN1_MP3 (fetched from
// audio.purifyapp.net); every other recording is a stretch of silence.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { LOOKS, PALETTES, checkMock } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const MODE = process.argv[2] ?? "dock";
if (MODE === "voices") {
  console.log("The voices mode is retired (2026-11-17, Updates 98s): Heart is the only voice since his word of 2026-11-16, and the phone's voices, the Voice sheet and Listen on unrecorded texts are gone from the app, so there is nothing for it to walk. Run the dock mode, and scripts/gate/listen-walk.mjs for the texts Heart has not recorded.");
  process.exit(0);
}
if (MODE !== "dock") throw new Error(`unknown mode ${MODE}: dock is the one mode (voices is retired)`);
// The stills' folder: the first word after the mode that is not a flag (--lang and --size take a value).
const PLAIN = process.argv.slice(3).filter((a, i, all) => !a.startsWith("--") && !["--lang", "--size"].includes(all[i - 1]));
const SHOTS = PLAIN[0] ? path.resolve(PLAIN[0]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const JOHN1 = process.env.JOHN1_MP3 ? fs.readFileSync(process.env.JOHN1_MP3) : null;
const WORDS = {
  en: JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")),
  ar: JSON.parse(fs.readFileSync("lib/i18n/messages/ar.json", "utf8")),
};
const SIZES = [
  [390, 844],
  [800, 1280],
  [1032, 1366],
];
const ALL = [...PALETTES, ...LOOKS];
const RUSSIAN = "Синодальный перевод (1876)";
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no export in out/: run node scripts/gate/export.mjs first");
if (PALETTES.length !== 5 || LOOKS.length < 1) throw new Error(`expected the five palettes and the looks, found ${PALETTES.length} and ${LOOKS.length}`);

let fails = 0;
const fail = (what) => {
  fails += 1;
  console.log(`  ✗ ${what}`);
};
const ok = (what) => console.log(`  ✓ ${what}`);
const t = (lang, key, vars = {}) => {
  let s = WORDS[lang][key] ?? WORDS.en[key];
  if (s === undefined) throw new Error(`no words for ${key}`);
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
};

// Seconds of silence, as a WAV a browser plays: 8 kHz, one channel, 8 bits.
function silence(seconds) {
  const n = Math.ceil(seconds * 8000);
  const b = Buffer.alloc(44 + n, 128);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(8000, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(n, 40);
  return b;
}

/** A body answered as the bucket answers it: whole, or the part a Range asks for. */
function fulfilBytes(route, body, contentType) {
  const headers = { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": contentType };
  const range = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()["range"] ?? "");
  if (range && (range[1] || range[2])) {
    const size = body.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return route.fulfill({ status: 416, headers: { ...headers, "content-range": `bytes */${size}` }, body: "" });
    return route.fulfill({ status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}` }, body: body.subarray(start, end + 1) });
  }
  return route.fulfill({ status: 200, headers, body });
}

/** What the main web will serve from the merge, answered from this checkout. */
async function standIns(ctx) {
  const cors = { "access-control-allow-origin": "*" };
  await ctx.route(/^https:\/\/purifyapp\.net\/bibles\//, (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join("public", p);
    if (!p.startsWith("/bibles/") || p.includes("..") || !fs.existsSync(file)) return route.fulfill({ status: 404, headers: cors, body: "" });
    return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: fs.readFileSync(file) });
  });
  // Everything else the main web serves from its public folder (a chapter's timings, the list of
  // readings, covers): answered from this checkout's own. Its API stays out of reach, as before.
  await ctx.route(/^https:\/\/purifyapp\.net\/(?!api\/|bibles\/)/, (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join("public", p);
    if (p.includes("..") || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
    const type = { ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" }[path.extname(file)] ?? "application/octet-stream";
    return route.fulfill({ status: 200, contentType: type, headers: cors, body: fs.readFileSync(file) });
  });
  await ctx.route(/^https:\/\/audio\.purifyapp\.net\/read\//, (route) => {
    // The player's own requests only. A save for offline (the week's readings) is refused: the browser
    // has no phone folder to play a saved copy from, so a saved chapter would fall silent here alone.
    if (route.request().resourceType() !== "media") return route.abort();
    const p = new URL(route.request().url()).pathname;
    if (JOHN1 && p === "/read/john/1.mp3") return fulfilBytes(route, JOHN1, "audio/mpeg");
    return fulfilBytes(route, silence(240), "audio/wav");
  });
}

const browser = await chromium.launch({ ...(fs.existsSync(OWN) ? { executablePath: OWN } : {}), args: ["--autoplay-policy=user-gesture-required"] });

async function open(lang, [width, height], { scale = 1 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    isMobile: width < 700,
    hasTouch: true,
    userAgent: NATIVE_UA,
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
  // The app's one player is an Audio() kept off the page: every media element that plays is kept for the walk.
  await ctx.addInitScript(() => {
    const kept = (window.__media = new Set());
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      kept.add(this);
      return play.apply(this, a);
    };
  });
  // Heart is the one voice (his word of 2026-11-16): the browser's speech is a tripwire, never a stand-in.
  await ctx.addInitScript(() => {
    window.__spoke = 0;
    try {
      if (window.speechSynthesis) window.speechSynthesis.speak = () => void (window.__spoke += 1);
    } catch {}
  });
  const asked = {};
  await serveLikeTheShell(ctx, OUT, asked);
  await standIns(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, asked, errors };
}

/** Tap at the middle of what a locator names, with the finger (the DevTools protocol's touch). */
async function tapAt(page, locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  // A row below the fold of a sheet is brought to the middle first, as a reader scrolls to it.
  const inView = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  });
  if (!inView) {
    await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(600);
  }
  const box = await locator.boundingBox();
  if (!box) throw new Error("nothing to tap");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

/** How many times anything asked the browser's speech to speak. */
const spoke = (page) => page.evaluate(() => window.__spoke ?? 0);

const audioState = (page) =>
  page.evaluate(() => {
    const a = [...(window.__media ?? [])].filter((x) => x.src).at(-1);
    return a ? { src: a.src, paused: a.paused, time: a.currentTime } : null;
  });

async function waitPlaying(page, ms = 15000) {
  for (let waited = 0; waited < ms; waited += 250) {
    const a = await audioState(page);
    if (a && !a.paused && a.time > 0.2) return a;
    await page.waitForTimeout(250);
  }
  return audioState(page);
}

/** The Translation sheet from •••: the Bible downloaded (which chooses it), or chosen when it is on the device. */
async function chooseBible(page, lang, title) {
  await tapAt(page, page.getByRole("button", { name: t(lang, "bible.moreActions") }).filter({ visible: true }).first());
  await page.waitForTimeout(800);
  await tapAt(page, page.locator("[role=dialog] button", { hasText: t(lang, "bible.translationLabel") }).filter({ visible: true }).first());
  await page.waitForTimeout(900);
  const prefix = t(lang, "bible.downloads.downloadAria", { name: title, size: "" }).replace(/[,،]\s*$/, "");
  const download = page.locator(`[role=dialog] button[aria-label^="${prefix}"]`).filter({ visible: true }).first();
  if (await download.count()) await tapAt(page, download);
  else await tapAt(page, page.locator("[role=dialog] button", { hasText: title }).filter({ visible: true }).first());
  // Chosen: the sheet goes, and the first Bible in another language asks about the app's language.
  await page
    .waitForFunction(() => document.querySelector("[data-bible-language-offer]") || ![...document.querySelectorAll("[role=dialog]")].some((d) => d.getClientRects().length), null, { timeout: 60000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
  const offer = page.locator("[data-bible-language-offer] button", { hasText: t(lang, "bible.languageOffer.notNow") });
  if (await offer.count()) {
    await tapAt(page, offer.first());
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 3 && (await page.locator("[role=dialog]").filter({ visible: true }).count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
}

/** The words a tap is measured by. */
const pageState = (page) =>
  page.evaluate(() => {
    const ds = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getClientRects().length).map((d) => d.getAttribute("aria-label") ?? d.getAttribute("aria-labelledby"));
    const dock = document.querySelector("[data-reader-dock]");
    const labels = dock ? [...dock.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.innerText).join("|") : "";
    const a = [...(window.__media ?? [])].filter((x) => x.src).at(-1);
    return JSON.stringify({ path: location.pathname, ds, labels, paused: a?.paused ?? null, rate: a?.playbackRate ?? null });
  });

/** A tap by the finger that must change something, with what stood under the finger kept in place. */
async function tapMust(page, locator, what, { settle = 900, moves = false } = {}) {
  const before = await pageState(page);
  const box0 = await locator.boundingBox().catch(() => null);
  if (!box0) return fail(`${what}: not drawn`);
  await page.touchscreen.tap(box0.x + box0.width / 2, box0.y + box0.height / 2);
  await page.waitForTimeout(settle);
  const after = await pageState(page);
  if (after === before) return fail(`${what}: the tap changed nothing`);
  if (!moves) {
    const box1 = await locator.boundingBox().catch(() => null);
    if (box1) {
      const moved = Math.max(Math.abs(box1.y - box0.y), Math.abs(box1.x - box0.x));
      if (moved > 4) return fail(`${what}: moved ${Math.round(moved)}px under the finger`);
    }
  }
  ok(what);
}

async function guard(page, selector, lang, size, label) {
  const result = await checkMock(page, selector, { palettes: ALL, pixels: true });
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

const dockSel = "[data-reader-dock]";

/** John 1 read by Heart, the Russian Synodal chosen, and John 2 opened by the dock's arrow. */
async function russianWhileHeartReads(lang, size, scale = 1) {
  const o = await open(lang, size, { scale });
  const { page } = o;
  await go(page, "/bible/john/1/", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const listen = page.locator("[data-reader-pill] button, [data-reader-chrome] button", { hasText: t(lang, "readAloud.listen") }).filter({ visible: true }).first();
  await tapAt(page, listen);
  const a = await waitPlaying(page);
  if (!a || a.paused) fail(`Heart did not start on John 1 (${JSON.stringify(a)})`);
  await chooseBible(page, lang, RUSSIAN);
  const dock = page.locator(dockSel).filter({ visible: true }).first();
  const next = t(lang, "bible.nextTargetAria", { book: t(lang, "bible.books.john"), chapter: 2 });
  if (await dock.count()) await tapAt(page, dock.locator(`[aria-label="${next}"]`).first());
  else await go(page, "/bible/john/2/", { timeout: 30000 });
  await page.waitForFunction(() => location.pathname.startsWith("/bible/john/2"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return { ...o, dock };
}

console.log(`The voices on the export (${MODE}), motion on.${JOHN1 ? "" : " No JOHN1_MP3: Heart reads silence."}`);

if (MODE === "dock") {
  // ---- the fault: an English Listen over a Russian page.
  {
    const lang = "en";
    const { ctx, page, dock, errors } = await russianWhileHeartReads(lang, SIZES[0]);
    console.log("\nJohn 2 in the Russian Synodal while Heart reads John 1, at 390");
    const words = await page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
    if (/[Ѐ-ӿ]{4,}/.test(words)) ok("the page shows the Russian");
    else fail("the page does not show the Russian");
    const a = await audioState(page);
    if (a && !a.paused && /\/read\/john\/1\.mp3/.test(a.src)) ok("Heart still reads John 1");
    else fail(`what plays: ${JSON.stringify(a)}`);
    if (!(await dock.count())) fail("no dock at 390 while something plays");
    else {
      const offered = await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count();
      if (offered === 0) ok("the dock offers no Listen over the Russian page");
      else fail(`the dock offers Listen over the Russian page (${offered})`);
    }
    await shot(page, "dock-russian-390-en");
    console.log("\ntaps: every control of the dock, at 390, motion on");
    const toggle = dock.locator("button.size-\\[44px\\]").first();
    await tapMust(page, toggle, "Play or Pause: pauses");
    await tapMust(page, toggle, "Play or Pause: plays again", { settle: 1500 });
    await tapMust(page, dock.locator(`button[aria-label="${t(lang, "player.sleep")}"]`).first(), "Sleep timer: opens its sheet");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    const pick = t(lang, "bible.pickChapterCurrentAria", { book: t(lang, "bible.books.john"), chapter: 2 });
    await tapMust(page, dock.locator(`button[aria-label="${pick}"]`).first(), "The chapter's name: opens the books");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    const prev = t(lang, "bible.previousTargetAria", { book: t(lang, "bible.books.john"), chapter: 1 });
    await tapMust(page, dock.locator(`[aria-label="${prev}"]`).first(), "The arrow back: John 1", { settle: 2500, moves: true });
    const next = t(lang, "bible.nextTargetAria", { book: t(lang, "bible.books.john"), chapter: 2 });
    await tapMust(page, dock.locator(`[aria-label="${next}"]`).first(), "The arrow on: John 2", { settle: 2500, moves: true });
    if ((await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count()) === 0) ok("back on John 2, still no Listen");
    else fail("back on John 2, the dock offers Listen");
    await tapMust(page, dock.locator(`button[aria-label]`).first(), "The cover: opens Now Playing", { settle: 1500 });
    await shot(page, "dock-now-playing-390-en");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    if (await spoke(page)) fail("the browser's speech was asked to speak: Heart is the one voice");
    else ok("the browser's speech was asked for nothing");
    if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(" | ")}`);
    await ctx.close();
  }

  // ---- the guard: the dock on the Russian page, three widths, every palette and look, English and Arabic.
  for (const lang of ["en", "ar"]) {
    for (const size of SIZES) {
      console.log(`\nguard: ${size[0]} wide, ${lang}`);
      const { ctx, page, dock, errors } = await russianWhileHeartReads(lang, size);
      if (await dock.count()) {
        const listens = await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count();
        if (listens === 0) ok("no Listen in the dock over the Russian page");
        else fail("the dock offers Listen over the Russian page");
        await shot(page, `dock-russian-${size[0]}-${lang}`);
        await guard(page, dockSel, lang, size, "the dock on the Russian page");
      } else {
        // The computer's width: the toolbar stands in for the pill and the dock.
        const listen = await page.locator("[data-reader-chrome] button", { hasText: t(lang, "readAloud.listen") }).filter({ visible: true }).count();
        if (listen === 0) ok(`no dock at ${size[0]} (the toolbar's width), and no Listen over the Russian page`);
        else fail(`at ${size[0]} the toolbar offers Listen over the Russian page`);
        await shot(page, `toolbar-russian-${size[0]}-${lang}`);
        await guard(page, "main", lang, size, "the Russian page");
      }
      if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(" | ")}`);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(fails ? `\n${fails} failure(s)` : "\nAll passed.");
process.exit(fails ? 1 : 0);
