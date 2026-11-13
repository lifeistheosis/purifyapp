// Build 95, note 25: the phone's own voices, walked on the native export at phone size with real
// touch taps (the pre-build gate's part 1) and held to checkMock with pixels (part 2).
//
//   dock    (Updates 17's pushable commits) John 1 read by Heart, then the Russian Synodal downloaded
//           and chosen, then John 2: a Russian page while the English recording plays. The dock must
//           offer no Listen there (it offered the English reading over the Russian page). Every
//           control of the dock tapped; checkMock with pixels on the dock at 390, 800 and 1032 wide,
//           on the five palettes and every look, in English and in Arabic.
//
//   voices  (the reader-facing patch, held for his yes) every state of the Voice row and sheet and of
//           Listen on every text: Genesis 1's pill offering Listen and a phone's voice reading it, the
//           ••• sheet's Voice row (a phone's voice; Heart on John 1), the Voice sheet over the player
//           (Heart and the phone's English voices, one checked), Hear it, a choice read again at the
//           verse, Now Playing's cover and words with a word lit, the gone line, the none state (the
//           Serbian page with no Serbian voice), a downloaded Bible's page read in its own language
//           (the Russian, by the Russian voice), and a saint's life. Stills at 390 and twice the pixels
//           in English on Dark; checkMock with pixels on each state at 390, 800 and 1032, on the five
//           palettes and every look, in English and in Arabic.
//
//   node scripts/gate/export.mjs        (the export, cut as the store builds cut it)
//   JOHN1_MP3=<file> node scripts/gate/voices.mjs dock [shots dir]
//   JOHN1_MP3=<file> node scripts/gate/voices.mjs voices [shots dir] [--guard-only|--stills-only]
//
// The walk's browser is Chromium, which has no PurifySpeech plugin: what the phones' engines do is
// held by lib/listen/speech/__tests__ and proved by his walk on the release APK and TestFlight.
// In the voices mode the browser's own speech stands in for the phone's, and its voices are a
// STAND-IN LIST (no real voice speaks): Daniel (en-GB), Samantha (en-US), Karen (en-AU), Milena
// (ru-RU) and Melina (el-GR), and none for Serbian. Each word is reported every 250ms, as a phone
// that reports words does; what was asked to be spoken is kept for the walk (window.__spoken).
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
// The reader-facing patch is in this tree (and so in an export cut from it): the dock's rule is then the phone's voice reading the page's own language.
const VOICES_IN = Boolean(WORDS.en["player.voice"]);
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

/** The phone's voices, stood in by the browser's speech: a stand-in list, each word reported every 250ms. */
const STAND_IN_SPEECH = (voices) => {
  const list = voices.map(([name, lang]) => ({ voiceURI: `stand-in:${name}`, name, lang, localService: true, default: false }));
  const spoken = (window.__spoken = []);
  const listeners = {};
  let queue = [];
  let current = null;
  let timer = null;
  const fire = (u, type, extra = {}) => {
    const e = { type, utterance: u, charIndex: 0, charLength: 0, elapsedTime: 0, name: "", ...extra };
    try {
      u["on" + type]?.(e);
    } catch {}
    for (const l of u.__l[type] ?? []) {
      try {
        l(e);
      } catch {}
    }
  };
  const next = () => {
    if (current || !queue.length) return;
    const u = (current = queue.shift());
    spoken.push({ text: u.text.slice(0, 120), voice: u.voice?.name ?? null, lang: u.lang });
    const words = [...u.text.matchAll(/\S+/g)];
    const step = Math.max(60, 250 / (u.rate || 1));
    let i = 0;
    fire(u, "start");
    const tick = () => {
      if (current !== u) return;
      if (i < words.length) {
        fire(u, "boundary", { name: "word", charIndex: words[i].index, charLength: words[i][0].length });
        i += 1;
        timer = setTimeout(tick, step);
        return;
      }
      current = null;
      fire(u, "end");
      next();
    };
    timer = setTimeout(tick, 40);
  };
  class Utterance {
    constructor(text = "") {
      this.text = String(text);
      this.lang = "";
      this.voice = null;
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.__l = {};
    }
    addEventListener(type, fn) {
      (this.__l[type] ??= new Set()).add(fn);
    }
    removeEventListener(type, fn) {
      this.__l[type]?.delete(fn);
    }
  }
  const synth = {
    getVoices: () => list.slice(),
    speak(u) {
      queue.push(u);
      next();
    },
    cancel() {
      const u = current;
      queue = [];
      current = null;
      clearTimeout(timer);
      if (u) fire(u, "error", { error: "interrupted" });
    },
    pause() {},
    resume() {},
    get speaking() {
      return Boolean(current);
    },
    get pending() {
      return queue.length > 0;
    },
    get paused() {
      return false;
    },
    addEventListener(type, fn) {
      (listeners[type] ??= new Set()).add(fn);
    },
    removeEventListener(type, fn) {
      listeners[type]?.delete(fn);
    },
    onvoiceschanged: null,
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true, writable: true });
};
const STAND_IN_VOICES = [
  ["Daniel", "en-GB"],
  ["Samantha", "en-US"],
  ["Karen", "en-AU"],
  ["Milena", "ru-RU"],
  ["Melina", "el-GR"],
];

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
  if (MODE === "voices" || VOICES_IN) await ctx.addInitScript(STAND_IN_SPEECH, STAND_IN_VOICES);
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
    else if (!VOICES_IN) {
      const offered = await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count();
      if (offered === 0) ok("the dock offers no Listen over the Russian page");
      else fail(`the dock offers Listen over the Russian page (${offered})`);
    } else if (await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count()) ok("the dock offers Listen over the Russian page, for the Russian voice");
    else fail("the dock offers no Listen over the Russian page, which the Russian voice can read");
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
    if (!VOICES_IN) {
      if ((await dock.locator("button", { hasText: t(lang, "readAloud.listen") }).count()) === 0) ok("back on John 2, still no Listen");
      else fail("back on John 2, the dock offers Listen");
    }
    await tapMust(page, dock.locator(`button[aria-label]`).first(), "The cover: opens Now Playing", { settle: 1500 });
    await shot(page, "dock-now-playing-390-en");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    if (VOICES_IN) {
      // Last, as it moves the page: Listen reads the Russian page in the Russian voice, never Heart's English.
      // (While a voice reads, the page follows the verse and the dock draws in to its small pill.)
      await tapAt(page, dock.locator("button", { hasText: t(lang, "readAloud.listen") }).first());
      await page.waitForTimeout(2500);
      const said = await page.evaluate(() => window.__spoken.at(-1) ?? null);
      const heart = await audioState(page);
      if (said?.voice === "Milena" && /[\u0400-\u04FF]{3,}/.test(said.text)) ok(`the dock's Listen reads the Russian page in the Russian voice: "${said.text.slice(0, 40)}..."`);
      else fail(`the dock's Listen over the Russian page: ${JSON.stringify(said)}`);
      if (!heart || heart.paused) ok("and Heart's English stopped for it");
      else fail("Heart's English went on under the Russian voice");
    }
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
        if (!VOICES_IN) {
          if (listens === 0) ok("no Listen in the dock over the Russian page");
          else fail("the dock offers Listen over the Russian page");
        } else if (listens) ok("the dock offers Listen over the Russian page, for the Russian voice");
        else fail("the dock offers no Listen over the Russian page");
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

if (MODE === "voices") {
  const GUARD_ONLY = process.argv.includes("--guard-only");
  const NP_ONLY = process.argv.includes("--now-playing-only");
  const STILLS_ONLY = process.argv.includes("--stills-only");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const spokenNow = (page) => page.evaluate(() => window.__spoken.slice());
  const lastSpoken = async (page) => (await spokenNow(page)).at(-1) ?? null;
  const nowPlayingSel = (lang) => `[role="dialog"][aria-label="${t(lang, "prayers.nowPlaying")}"]`;
  const voiceSheetSel = (lang) => `[role="dialog"][aria-label="${t(lang, "player.voice")}"]`;
  const visibleDialog = (page, sel) => page.locator(sel).filter({ visible: true }).last();

  /** The app started again (the shells' one document, then the router): what is kept on the device is read afresh. */
  async function coldStart(page, to) {
    await page.goto("https://localhost/", { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout: 30000 });
    await go(page, to, { timeout: 30000 });
  }

  async function waitFor(page, fn, arg, ms = 15000) {
    for (let waited = 0; waited < ms; waited += 250) {
      if (await page.evaluate(fn, arg).catch(() => false)) return true;
      await page.waitForTimeout(250);
    }
    return false;
  }

  /** Listen on the chapter's pill, or on the computer's toolbar where the pill is not drawn. */
  const listenOnPage = (page, lang) =>
    page.locator("[data-reader-pill] button, [data-reader-chrome] button, [data-reader-dock] button", { hasText: t(lang, "readAloud.listen") }).filter({ visible: true }).first();

  async function openNowPlaying(page, lang) {
    // The dock's card, or its small pill once the reader reads on: whichever cover is on top opens the player.
    const dock = page.locator(dockSel).filter({ visible: true }).first();
    const covers = (await dock.count()) ? dock.locator(".reader-dock-card button[aria-label], .reader-dock-pill button[aria-label]") : page.locator("[data-now-playing-bar] button[aria-label], [data-mini-player] button[aria-label]");
    let opener = covers.first();
    for (let i = 0; i < (await covers.count()); i++) {
      const c = covers.nth(i);
      const onTop = await c
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          let seen = 1;
          for (let n = el; n; n = n.parentElement) seen *= Number(getComputedStyle(n).opacity);
          return Boolean(hit && (hit === el || el.contains(hit))) && seen > 0.5;
        })
        .catch(() => false);
      if (onTop) {
        opener = c;
        break;
      }
    }
    await tapAt(page, opener);
    await page.locator(nowPlayingSel(lang)).first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(900);
    await atRest(page, nowPlayingSel(lang));
  }

  /** Until what a selector names stops moving (a sheet rising on the house curve), up to 5 seconds. */
  async function atRest(page, sel) {
    let last = null;
    for (let waited = 0; waited < 5000; waited += 150) {
      const top = await page.evaluate((s) => {
        const d = [...document.querySelectorAll(s)].filter((x) => x.getClientRects().length).at(-1);
        const panel = d ? [...d.querySelectorAll("*")].find((e) => e.getBoundingClientRect().height > 200) : null;
        return panel ? Math.round(panel.getBoundingClientRect().top) : null;
      }, sel);
      if (top !== null && top === last) return;
      last = top;
      await page.waitForTimeout(150);
    }
  }

  async function openMore(page, lang) {
    await tapAt(page, page.locator(`${nowPlayingSel(lang)} button[aria-label="${t(lang, "bible.moreActions")}"]`).first());
    await page.waitForTimeout(900);
  }

  /** The ••• sheet's Voice row, by its label alone. */
  const voiceRow = (page, lang) =>
    page
      .locator('[role="dialog"] button[aria-haspopup="dialog"]')
      .filter({ has: page.locator("span.truncate", { hasText: new RegExp(`^${esc(t(lang, "player.voice"))}$`) }) })
      .filter({ visible: true })
      .first();

  async function rowValue(page, lang) {
    const row = voiceRow(page, lang);
    if (!(await row.count())) return null;
    return (await row.innerText()).replace(/\s+/g, " ").replace(t(lang, "player.voice"), "").trim();
  }

  async function openVoiceSheet(page, lang) {
    await tapAt(page, voiceRow(page, lang));
    await page.locator(voiceSheetSel(lang)).first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);
  }

  const radios = (page, lang) =>
    page.evaluate((sel) => {
      const d = [...document.querySelectorAll(sel)].filter((x) => x.getClientRects().length).at(-1);
      if (!d) return null;
      return [...d.querySelectorAll('[role="radio"]')].map((r) => ({ name: r.querySelector("span span")?.textContent ?? "", about: r.querySelectorAll("span span")[1]?.textContent ?? "", on: r.getAttribute("aria-checked") === "true" }));
    }, voiceSheetSel(lang));

  async function closeTop(page, lang) {
    const close = page.locator(`[role="dialog"] button[aria-label="${t(lang, "common.close")}"]`).filter({ visible: true }).last();
    if (await close.count()) await tapAt(page, close);
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
  }

  async function closeAll(page, lang) {
    for (let i = 0; i < 4 && (await page.locator('[role="dialog"]').filter({ visible: true }).count()); i++) await closeTop(page, lang);
  }

  /** Now Playing measured still: paused first, since a live player re-renders its words under the pixel measure. */
  async function guardPlayer(page, lang, size, label) {
    const pauseBtn = page.locator(`${nowPlayingSel(lang)} button[aria-label="${t(lang, "prayers.pause")}"]`).first();
    const paused = Boolean(await pauseBtn.count());
    if (paused) {
      await tapAt(page, pauseBtn);
      await page.waitForTimeout(700);
    }
    await guard(page, nowPlayingSel(lang), lang, size, `${label} (paused for the measure)`);
    const playBtn = page.locator(`${nowPlayingSel(lang)} button[aria-label="${t(lang, "prayers.play")}"]`).first();
    if (paused && (await playBtn.count())) {
      await tapAt(page, playBtn);
      await page.waitForTimeout(700);
    }
  }

  const guardIf = async (page, sel, lang, size, label, on) => {
    if (on) await guard(page, sel, lang, size, label);
  };

  /** Every state, in one reader's order; stills when asked, checkMock when asked. */
  async function walk(lang, size, { scale = 1, stills = false, guards = true, taps = false } = {}) {
    const tag = `${size[0]}-${lang}`;
    const still = async (page, name) => {
      if (stills) await shot(page, `25-voices-${name}`);
    };
    const { ctx, page, errors } = await open(lang, size, { scale });
    console.log(`\n${guards ? "guard" : "stills"}: ${size[0]} wide, ${lang}${scale !== 1 ? `, ${scale}x` : ""}`);
    try {
      // ---- Genesis 1: no recording; the phone's voice reads.
      await go(page, "/bible/genesis/1/", { timeout: 30000 });
      await page.waitForTimeout(2500);
      const listen = listenOnPage(page, lang);
      if (await listen.count()) ok("Genesis 1 offers Listen");
      else fail("Genesis 1 offers no Listen");
      const pillSel = (await page.locator("[data-reader-pill]").filter({ visible: true }).count()) ? "[data-reader-pill]" : "main";
      await still(page, "genesis-pill");
      if (guards && !NP_ONLY) await guard(page, pillSel, lang, size, "Genesis 1's pill with Listen");
      await tapAt(page, listen);
      const started = await waitFor(page, () => window.__spoken.length > 0 && window.speechSynthesis.speaking);
      const first = (await spokenNow(page))[0];
      if (started && first?.voice === "Daniel" && /^In the beginning/.test(first.text)) ok(`Genesis 1 read by Daniel: "${first.text.slice(0, 40)}..."`);
      else fail(`Genesis 1's reading: ${JSON.stringify(first)}`);
      await page.waitForTimeout(5000);
      const lit = await page.evaluate(() => Boolean(document.querySelector("[data-read-now]")));
      if (lit) ok("the verse being read is lit on the page");
      else fail("no verse lit while the phone's voice reads");
      await still(page, "genesis-reading");
      await openNowPlaying(page, lang);
      await still(page, "now-playing-cover");
      if (guards) await guardPlayer(page, lang, size, "Now Playing (cover), a phone's voice");
      const wordsTab = page.locator(`${nowPlayingSel(lang)} [role="tab"]`, { hasText: t(lang, "player.viewWords") }).first();
      if (await wordsTab.count()) {
        await tapAt(page, wordsTab);
        await page.waitForTimeout(2500);
        const word = await page.evaluate(() => Boolean(document.querySelector('[data-sung="lit"], [aria-current="true"]')));
        if (word) ok("Now Playing's words: the line being read is lit");
        else fail("Now Playing's words: nothing lit");
        await still(page, "now-playing-words");
        if (guards) await guardPlayer(page, lang, size, "Now Playing (words), a phone's voice");
        await tapAt(page, page.locator(`${nowPlayingSel(lang)} [role="tab"]`, { hasText: t(lang, "player.viewCover") }).first());
        await page.waitForTimeout(800);
      } else fail("Now Playing has no Words view for a phone's voice");
      await openMore(page, lang);
      const phoneValue = await rowValue(page, lang);
      if (phoneValue === "Daniel") ok('the ••• sheet\'s Voice row says "Daniel"');
      else fail(`the ••• sheet's Voice row says "${phoneValue}" while Daniel reads`);
      await still(page, "more-phone");
      if (guards && !NP_ONLY) await guard(page, '[role="dialog"]:not([aria-label="' + t(lang, "prayers.nowPlaying") + '"])', lang, size, "the ••• sheet with the Voice row");
      await openVoiceSheet(page, lang);
      const rowsGen = await radios(page, lang);
      if (rowsGen && rowsGen.map((r) => r.name).join("|") === "Daniel|Karen|Samantha" && rowsGen[0].on) ok("over Genesis 1, no Heart: Daniel (checked), Karen, Samantha");
      else fail(`the Voice sheet over Genesis 1: ${JSON.stringify(rowsGen)}`);
      if (guards && !NP_ONLY) await guard(page, voiceSheetSel(lang), lang, size, "the Voice sheet, phone's voices only");
      await closeAll(page, lang);
      if (taps) {
        // Next in Now Playing: Genesis 2's page opens and the same voice reads it from its first verse.
        await openNowPlaying(page, lang);
        const nextStep = page.locator(`${nowPlayingSel(lang)} button[aria-label="${t(lang, "bible.nextTargetAria", { book: t(lang, "bible.books.genesis"), chapter: 2 })}"]`).first();
        const before = (await spokenNow(page)).length;
        await tapMust(page, nextStep, "Now Playing's next: Genesis 2", { settle: 4000, moves: true });
        await waitFor(page, (n) => location.pathname.startsWith("/bible/genesis/2") && window.__spoken.length > n, before);
        const two = (await spokenNow(page))[before];
        const verse1 = await page.evaluate(() => (document.querySelector("#v1 p")?.textContent ?? "").replace(/\s+/g, " ").trim());
        const path2 = await page.evaluate(() => location.pathname);
        // The first words the voice says are verse 1's on the page (its number and mark stand before them there).
        const firstWords = (two?.text ?? "").split(/\s+/).slice(0, 4).join(" ");
        const fromOne = Boolean(two) && firstWords.length > 6 && verse1.includes(firstWords);
        if (path2.startsWith("/bible/genesis/2") && two?.voice === "Daniel" && !/^In the beginning/.test(two.text) && fromOne) ok(`Genesis 2's page opened and Daniel reads it from its first verse: "${two.text.slice(0, 40)}..."`);
        else fail(`after next: ${path2}, first spoken ${JSON.stringify(two)}, the page's verse 1 "${verse1.slice(0, 40)}"`);
        await closeAll(page, lang);
      }

      if (!NP_ONLY) {
      // ---- John 1, Heart: its recording, nothing chosen.
      await go(page, "/bible/john/1/", { timeout: 30000 });
      await page.waitForTimeout(2500);
      await tapAt(page, listenOnPage(page, lang));
      await page.evaluate(() => window.speechSynthesis.cancel());
      const a = await waitPlaying(page);
      if (a && !a.paused && /\/read\/john\/1\.mp3/.test(a.src)) ok("John 1: Heart reads its recording (nothing chosen)");
      else fail(`John 1: Heart did not read (${JSON.stringify(a)})`);
      if (await page.evaluate(() => window.speechSynthesis.speaking)) fail("John 1: a phone's voice speaks while Heart reads");
      await page.waitForTimeout(4000);
      await openNowPlaying(page, lang);
      await openMore(page, lang);
      const heartValue = await rowValue(page, lang);
      if (heartValue === t(lang, "player.voice.heart")) ok(`the ••• sheet's Voice row says "${heartValue}"`);
      else fail(`the ••• sheet's Voice row says "${heartValue}" over Heart's recording`);
      await still(page, "more-heart");
      await guardIf(page, '[role="dialog"]:last-of-type', lang, size, "the ••• sheet over Heart", guards && false);
      await openVoiceSheet(page, lang);
      const rowsJohn = await radios(page, lang);
      const names = (rowsJohn ?? []).map((r) => `${r.name}${r.on ? " (checked)" : ""}`);
      const wantJohn = [t(lang, "player.voice.heart"), "Daniel", "Karen", "Samantha"];
      if (rowsJohn && rowsJohn.map((r) => r.name).join("|") === wantJohn.join("|") && rowsJohn[0].on && rowsJohn.filter((r) => r.on).length === 1) ok(`the Voice sheet: ${names.join(", ")}`);
      else fail(`the Voice sheet over John 1: ${names.join(", ")}`);
      await still(page, "sheet-john");
      if (guards) await guard(page, voiceSheetSel(lang), lang, size, "the Voice sheet (Heart and three)");
      if (taps) {
        // Hear it: Karen, the first words of the verse being read; Heart pauses for it.
        const hear = page.locator(`${voiceSheetSel(lang)} button[aria-label="${t(lang, "player.voice.hearName", { name: "Karen" })}"]`).first();
        const before = (await spokenNow(page)).length;
        await tapMust(page, hear, "Hear it (Karen): speaks", { settle: 1200 });
        const heard = (await spokenNow(page)).slice(before);
        const audioNow = await audioState(page);
        if (heard.length && heard[0].voice === "Karen" && heard[0].text.length > 3) ok(`Hear it: Karen says "${heard[0].text.slice(0, 48)}..."`);
        else fail(`Hear it spoke ${JSON.stringify(heard)}`);
        if (audioNow?.paused) ok("Heart paused while Karen is heard");
        else fail("Heart went on under Hear it");
        // Daniel chosen: John 1 read again in Daniel, at the verse being read.
        const verseBefore = await page.evaluate(() => document.querySelector("[data-read-now]")?.getAttribute("data-verse") ?? document.querySelector("[data-read-now]")?.id ?? null);
        const daniel = page.locator(`${voiceSheetSel(lang)} [role="radio"]`, { hasText: "Daniel" }).first();
        await tapMust(page, daniel, "Daniel: chosen", { settle: 2500, moves: true });
        const said = await lastSpoken(page);
        if (said?.voice === "Daniel") ok(`John 1 read again by Daniel, from "${said.text.slice(0, 48)}..." (the verse lit before: ${verseBefore ?? "none"})`);
        else fail(`after choosing Daniel the voice is ${JSON.stringify(said)}`);
        if (!(await page.locator(voiceSheetSel(lang)).filter({ visible: true }).count())) ok("the sheet closed on the choice");
        else fail("the sheet stayed open after the choice");
        // The row says the new voice.
        if (!(await page.locator(nowPlayingSel(lang)).filter({ visible: true }).count())) await openNowPlaying(page, lang);
        await openMore(page, lang);
        const danielValue = await rowValue(page, lang);
        if (danielValue === "Daniel") ok('the Voice row now says "Daniel"');
        else fail(`the Voice row says "${danielValue}" after Daniel was chosen`);
        // Back to Heart, chosen from the sheet: the recording, at the verse.
        await openVoiceSheet(page, lang);
        await tapMust(page, page.locator(`${voiceSheetSel(lang)} [role="radio"]`, { hasText: t(lang, "player.voice.heart") }).first(), "Heart: chosen again", { settle: 2500, moves: true });
        const back = await waitPlaying(page, 8000);
        if (back && !back.paused && /\/read\/john\/1\.mp3/.test(back.src) && back.time > 1) ok(`Heart reads again, at ${back.time.toFixed(1)}s (not from the start)`);
        else fail(`after choosing Heart: ${JSON.stringify(back)}`);
        // Hear it, then Close with no choice: the reading goes on as it was.
        if (!(await page.locator(nowPlayingSel(lang)).filter({ visible: true }).count())) await openNowPlaying(page, lang);
        await openMore(page, lang);
        await openVoiceSheet(page, lang);
        await tapAt(page, page.locator(`${voiceSheetSel(lang)} button[aria-label="${t(lang, "player.voice.hearName", { name: "Samantha" })}"]`).first());
        await page.waitForTimeout(1200);
        await closeTop(page, lang);
        const after = await waitPlaying(page, 6000);
        if (after && !after.paused) ok("closed with no choice after Hear it: Heart goes on");
        else fail(`closed with no choice after Hear it: ${JSON.stringify(after)}`);
      }
      await closeAll(page, lang);

      }

      // ---- The gone line: a chosen voice no longer on the phone.
      await page.evaluate(() => {
        window.speechSynthesis.cancel();
        localStorage.setItem("purify:listen.voice", JSON.stringify({ en: "gone-voice" }));
        localStorage.removeItem("purify:listen.voiceGone");
      });
      await coldStart(page, "/bible/genesis/1/");
      await page.waitForTimeout(2500);
      await tapAt(page, listenOnPage(page, lang));
      await waitFor(page, () => window.speechSynthesis.speaking);
      await page.waitForTimeout(1500);
      await openNowPlaying(page, lang);
      const goneLine = t(lang, "player.voice.gone", { name: "Daniel" });
      const npWords = (await page.locator(nowPlayingSel(lang)).first().innerText()).replace(/\s+/g, " ");
      if (npWords.includes(goneLine)) ok(`Now Playing says: "${goneLine}"`);
      else fail(`Now Playing does not say the gone line (${npWords.slice(0, 160)})`);
      await still(page, "gone-now-playing");
      if (guards) await guardPlayer(page, lang, size, "Now Playing with the gone line");
      await openMore(page, lang);
      await openVoiceSheet(page, lang);
      const sheetWords = (await visibleDialog(page, voiceSheetSel(lang)).innerText()).replace(/\s+/g, " ");
      if (sheetWords.includes(goneLine)) ok("the Voice sheet says it too");
      else fail(`the Voice sheet does not say the gone line (${sheetWords.slice(0, 160)})`);
      await still(page, "gone-sheet");
      if (guards && !NP_ONLY) await guard(page, voiceSheetSel(lang), lang, size, "the Voice sheet with the gone line");
      await closeAll(page, lang);
      await page.evaluate(() => {
        window.speechSynthesis.cancel();
        localStorage.removeItem("purify:listen.voice");
      });

      if (!NP_ONLY) {
      // ---- The none state: the Serbian page, and no Serbian voice on this phone.
      await go(page, "/bible/john/1/", { timeout: 30000 });
      await page.waitForTimeout(2000);
      await chooseBible(page, lang, "Превод Вука Караџића и Ђуре Даничића (1868)");
      const serbian = await page.evaluate(() => /[Ѐ-ӿ]{4,}/.test(document.querySelector("main")?.innerText ?? ""));
      if (serbian) ok("John 1 shows the Serbian");
      else fail("John 1 does not show the Serbian");
      const before = (await spokenNow(page)).length;
      await tapAt(page, listenOnPage(page, lang));
      const noneSheet = page.locator(voiceSheetSel(lang)).filter({ visible: true });
      await noneSheet.first().waitFor({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(900);
      const noneWords = (await noneSheet.count()) ? (await noneSheet.last().innerText()).replace(/\s+/g, " ") : "";
      const serbianName = await page.evaluate((l) => new Intl.DisplayNames([l], { type: "language" }).of("sr"), lang);
      const noneLine = t(lang, "player.voice.none", { language: serbianName });
      if (noneWords.includes(noneLine) && noneWords.includes(t(lang, "player.voice.noneHow"))) ok(`Listen on the Serbian page: "${noneLine}"`);
      else fail(`Listen on the Serbian page shows "${noneWords.slice(0, 160)}"`);
      if ((await spokenNow(page)).length === before) ok("and nothing is spoken");
      else fail("something was spoken over the Serbian page");
      await still(page, "none");
      if (guards) await guard(page, voiceSheetSel(lang), lang, size, "the none state");
      await closeAll(page, lang);

      // ---- A downloaded Bible's page, read in its own language: the Russian, by the Russian voice.
      await chooseBible(page, lang, RUSSIAN);
      const listenRu = listenOnPage(page, lang);
      if (await listenRu.count()) ok("the Russian page offers Listen");
      else fail("the Russian page offers no Listen");
      // The pill, or the dock in its place while something is loaded; never the whole page, whose
      // Scripture is the edition's own words (the Synodal's em dashes, John 1:38 and 42, kept verbatim).
      const pillRu = (await page.locator("[data-reader-pill]").filter({ visible: true }).count()) ? "[data-reader-pill]" : (await page.locator(dockSel).filter({ visible: true }).count()) ? dockSel : "main";
      await still(page, "russian-pill");
      if (guards) await guard(page, pillRu, lang, size, "the Russian page's pill with Listen");
      await tapAt(page, listenRu);
      await waitFor(page, () => window.speechSynthesis.speaking);
      const ru = await lastSpoken(page);
      if (ru?.voice === "Milena" && /[Ѐ-ӿ]{3,}/.test(ru.text)) ok(`the Russian read by Milena: "${ru.text.slice(0, 40)}..."`);
      else fail(`the Russian page's reading: ${JSON.stringify(ru)}`);
      await page.waitForTimeout(3000);
      const litRu = await page.evaluate(() => Boolean(document.querySelector("[data-read-now]")));
      if (litRu) ok("the Russian verse being read is lit");
      else fail("no Russian verse lit");
      await still(page, "russian-reading");
      await page.evaluate(() => window.speechSynthesis.cancel());
      await closeAll(page, lang);

      // ---- A saint's life: Listen where no recording is, read by the phone's voice.
      await go(page, "/saints/anthony-the-great/", { timeout: 30000 });
      await page.waitForSelector("[data-mk]", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const here = page.locator("[data-listen-here]").filter({ visible: true }).first();
      if (await here.count()) {
        ok("a saint's life offers Listen");
        await here.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await still(page, "life-listen");
        if (guards) await guard(page, "main", lang, size, "a saint's life with Listen");
        const n = (await spokenNow(page)).length;
        await tapAt(page, here);
        await waitFor(page, () => window.speechSynthesis.speaking);
        const life = (await spokenNow(page)).slice(n)[0];
        if (life?.voice === "Daniel" && life.text.length > 20) ok(`the life read by Daniel: "${life.text.slice(0, 40)}..."`);
        else fail(`the life's reading: ${JSON.stringify(life)}`);
        await page.waitForTimeout(3000);
        const litLife = await page.evaluate(() => Boolean(document.querySelector("[data-read-now]")));
        if (litLife) ok("the paragraph being read is lit");
        else fail("no paragraph lit on the life");
        await still(page, "life-reading");
      } else fail("a saint's life offers no Listen");
      }
    } catch (e) {
      fail(`the walk stopped: ${String(e).split("\n")[0]}`);
      await shot(page, `stopped-${tag}`).catch(() => {});
    }
    if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(" | ")}`);
    await ctx.close();
  }

  // --lang en|ar walks one reader's language alone (two walks can run side by side).
  const at = process.argv.indexOf("--lang");
  const LANGS = at > 0 ? [process.argv[at + 1]] : ["en", "ar"];
  if (!GUARD_ONLY) await walk("en", SIZES[0], { scale: 2, stills: true, guards: false, taps: true });
  // --size 390|800|1032 walks one width alone.
  const sz = process.argv.indexOf("--size");
  const WIDTHS = sz > 0 ? SIZES.filter(([w]) => String(w) === process.argv[sz + 1]) : SIZES;
  if (!STILLS_ONLY) for (const lang of LANGS) for (const size of WIDTHS) await walk(lang, size, { guards: true });
}

await browser.close();
console.log(fails ? `\n${fails} failure(s)` : "\nAll passed.");
process.exit(fails ? 1 : 0);
