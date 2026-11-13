// What the 1.9 video's two scripts share (README.md in this folder).
//
// The app is opened the way the store pictures open it (../store/make.mjs):
// the native export in out/, answered as the phones' shells answer it, as a
// new reader with no account and no Plus, on the night palette, on the store
// pictures' own day. Nothing of the app's interface is drawn or changed: a
// take is the app itself, tapped by a finger and filmed.
//
// Filming: the browser's own screencast, the thing Playwright's video is
// made from, kept picture by picture and not squeezed into a video file, on a
// screen of two and a half device pixels to one so a close-up stays sharp
// (1030 by 2115 for a phone of 412 by 846). The browser hands over about
// eighteen such pictures a second, so the app is run at a slower clock while
// it is filmed (SLOW times slower: its timers, its frames and its animations
// together) and the film is played back that much faster. A page transition
// of a quarter of a second is then held in sixty frames a second and not in
// five. What the reader sees is the app's own motion at its own speed.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../../../..");
export const OUT = path.join(ROOT, "out");
/** Everything made (takes, frames, the video) stays out of git: .gitignore keeps /.promo/. */
export const MADE = path.resolve(ROOT, process.env.PROMO_DIR || ".promo", "v1.9-video");

const require = createRequire(path.join(ROOT, "package.json"));
export const { chromium } = require("playwright");
export const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
export const { NATIVE_UA, ORIGIN, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
export const { heritageNamedIn } = await import(at("lib/marketing/heritagePictures.ts"));
export const { checkMock, CHECKS } = await import(at("scripts/mock-check.mjs"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: cut it first (README.md, \"Making it again\")");

export const dir = (...parts) => {
  const d = path.join(MADE, ...parts);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The day every take is filmed on: the store pictures' own, St Nicholas, in the Nativity Fast. */
export const DAY = "2026-12-06T09:30:00-05:00";
export const ZONE = "America/New_York";
/** The phone: the part of a 412 by 915 screen the app draws in, as the Play pictures have it. */
export const PHONE = { width: 412, height: 846 };
/** How sharp a take is filmed: 2.5 device pixels to one of the app's, so a close-up of 1080 across is the film's own grain. */
export const SHARP = 2.5;
/** How many times slower the app's clock runs while it is filmed. */
export const SLOW = Number(process.env.VIDEO_SLOW || 6);

const browserPath = "/opt/pw-browsers/chromium";
/** The browser's own long-press, in milliseconds by the wall, and how far a finger moves before a touch is a scroll. */
const LONG_PRESS = 500;
const SLOP = 18;

/** The stage's browser, for composing: one pixel to one. */
export const launch = () => chromium.launch(fs.existsSync(browserPath) ? { executablePath: browserPath } : {});
/**
 * The camera's browser: a screen of SHARP device pixels to one, so what the browser paints, and so what its
 * screencast hands over, is sharp. (Asking each picture to be scaled up instead interrupts a scroll under a finger:
 * the page then travels about three fifths as far as the finger, as the first takes showed.)
 */
export const launchCamera = () => chromium.launch({ ...(fs.existsSync(browserPath) ? { executablePath: browserPath } : {}), args: [`--force-device-scale-factor=${SHARP}`] });

// ── In the page ──────────────────────────────────────────────────────────

/** The stand-in shell: the page is told it is the Android app, where this export locks Plus. */
function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

/**
 * The page's clock: it starts on the take's day and runs `slow` times slower
 * than the wall, for everything the page can ask the time of (Date, the
 * performance clock, timers, animation frames, an event's own time). The
 * browser's own animations are slowed to match from outside (the recorder).
 */
function clock({ day, slow }) {
  const RealDate = Date;
  const realNow = RealDate.now.bind(RealDate);
  const perfNow = performance.now.bind(performance);
  const wall0 = realNow();
  const perf0 = perfNow();
  const page0 = new RealDate(day).getTime();
  const now = () => Math.floor(page0 + (realNow() - wall0) / slow);
  const scaled = (t) => perf0 + (t - perf0) / slow;
  class PageDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(now());
      else super(...args);
    }
    static now() {
      return now();
    }
  }
  window.Date = PageDate;
  performance.now = () => scaled(perfNow());
  const st = window.setTimeout.bind(window);
  const si = window.setInterval.bind(window);
  const raf = window.requestAnimationFrame.bind(window);
  window.setTimeout = (fn, ms = 0, ...rest) => st(fn, ms * slow, ...rest);
  window.setInterval = (fn, ms = 0, ...rest) => si(fn, ms * slow, ...rest);
  window.requestAnimationFrame = (fn) => raf((t) => fn(scaled(t)));
  const stamp = Object.getOwnPropertyDescriptor(Event.prototype, "timeStamp");
  if (stamp?.get) Object.defineProperty(Event.prototype, "timeStamp", { get() { return scaled(stamp.get.call(this)); } });
}

/** Every picture the page draws, and whether any of it is inside the screen (../store/make.mjs). */
function picturesOnPage() {
  const vw = innerWidth;
  const vh = innerHeight;
  const seen = [];
  const add = (src, r, ok = true) => {
    if (!src || src === "none" || src.startsWith("data:")) return;
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) seen.push({ src, ok });
  };
  const urls = (value) => [...String(value ?? "").matchAll(/url\((["']?)(.*?)\1\)/g)].map((m) => m[2]);
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (el.tagName === "IMG") add(el.currentSrc || el.src, r, el.complete && el.naturalWidth > 0);
    if (el.tagName === "image") add(el.href?.baseVal, r);
    for (const pseudo of [null, "::before", "::after"]) {
      const s = pseudo ? getComputedStyle(el, pseudo) : cs;
      for (const prop of ["backgroundImage", "maskImage", "webkitMaskImage", "content"]) for (const u of urls(s[prop])) add(u, r);
    }
  }
  return seen;
}

/** The words inside the screen. */
function wordsInView() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest("script, style, noscript, .sr-only")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) out.push(text);
  }
  return out.join(" \n");
}

// ── Prayer campaigns: the walks' own stand-in ────────────────────────────

/**
 * The export has no server, and the main web answers "closed" for campaigns
 * until release day, so a campaign screen is filmed against the stand-in the
 * campaigns' own walk uses (scripts/mock-campaigns.mjs): its made-up
 * campaigns in plain sample words, and its answers to the campaign routes,
 * given in the browser. Nothing leaves the machine and production is never
 * asked. Those parts of that script are read from it as they stand, word for
 * word (it is a script that runs when imported, so it cannot be imported),
 * with one change: its "today" is the film's day, so a campaign of seven
 * days is running on the day the app thinks it is.
 *
 * Gives { answer(ctx, opts), CAMPAIGNS, CARRIED, SESSION, ids }.
 */
export async function campaignStandIn() {
  const source = fs.readFileSync(path.join(ROOT, "scripts/mock-campaigns.mjs"), "utf8");
  const from = source.indexOf("const DAY = 86_400_000;");
  const to = source.indexOf("const results = [];");
  if (from < 0 || to < from) throw new Error("scripts/mock-campaigns.mjs no longer has its sample campaigns where the video reads them");
  const file = path.join(dir("tmp"), "campaign-stand-in.mjs");
  fs.writeFileSync(
    file,
    `// Written by docs/plans/v1.9/video/lib.mjs from scripts/mock-campaigns.mjs. Not kept.
const FILM_NOW = ${new Date(DAY).getTime()};
const RealDate = globalThis.Date;
class Date extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(FILM_NOW); }
  static now() { return FILM_NOW; }
}
const PICTURES_BUILD = false;
${source.slice(from, to)}
export { answer, CAMPAIGNS, CARRIED, SESSION };
export const ids = { NICHOLAS, MARIA, PETER, SOPHIA };
`,
  );
  return import(`${pathToFileURL(file).href}?${Date.now()}`);
}

// ── A take ───────────────────────────────────────────────────────────────

/**
 * Open the app as a new reader and film it. Returns the page and the hands
 * that work it: every one of them a finger on the glass, never a script
 * inside the page.
 *
 *   tap(target)        a finger down and up on the middle of a control
 *   hold(target, until) a finger held until the app answers, as a reader holds a verse
 *   drag(dy, ms)       the page drawn up (dy > 0) or down under a finger
 *   rest(ms)           the page left alone, in the app's own time
 *   look(name)         what is in view is read and held to the rules
 *   end()              the film stops and the take is written
 */
export async function take(browser, id, { seed = {}, film = true, server = null, campaigns = false } = {}) {
  const ctx = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: SHARP,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
    locale: "en-US",
    timezoneId: ZONE,
  });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...seed });
  await ctx.addInitScript(android);
  await ctx.addInitScript(clock, { day: DAY, slow: film ? SLOW : 1 });
  await serveLikeTheShell(ctx, OUT, {});
  // Pictures the app asks of the website (covers the bundle does not carry), as on a phone with signal. Nothing else leaves.
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  // A take that needs a server's answers brings a stand-in for them (the campaigns' own, above).
  if (server) await server(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    if (/^"\w+" plugin is not implemented on android$/.test(e.message)) return; // the stand-in shell has no plugins; a phone has them
    errors.push(e.message);
  });
  const cdp = await ctx.newCDPSession(page);
  const slow = film ? SLOW : 1;
  if (film) {
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
  }

  const folder = dir("takes", id);
  if (film) for (const f of fs.readdirSync(folder)) fs.rmSync(path.join(folder, f), { recursive: true, force: true });
  const frames = []; // { t: seconds of the app's own time since the film began, file }
  const marks = []; // what the finger did, and when
  const looks = [];
  let t0 = null;
  let filming = false;
  const writes = [];
  /** The app's own time since the film began, in seconds. */
  const appTime = () => (t0 === null ? 0 : (Date.now() / 1000 - t0) / slow);

  // The camera: one sharp picture of the screen after another, as fast as the browser hands them over, each
  // stamped with the app's own time at the middle of its taking.
  // The camera is the browser's own screencast: each picture the app paints, stamped by the browser with the moment
  // it was painted. On a 2.5x screen (launch, above) each is 1030 by 2115.
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    if (!filming) return;
    if (t0 === null) t0 = metadata.timestamp;
    const file = `f${String(frames.length).padStart(5, "0")}.jpg`;
    frames.push({ t: Number(((metadata.timestamp - t0) / slow).toFixed(4)), file });
    writes.push(fs.promises.writeFile(path.join(folder, file), Buffer.from(data, "base64")));
  });

  // All through the film, what pictures are in view is read several times a second, so one that only passes under a finger is seen too.
  const passing = new Set();
  let watching = null;
  const watch = async () => {
    const pictures = await page.evaluate(picturesOnPage).catch(() => []);
    for (const p of pictures) passing.add(p.src.replace(ORIGIN, "").replace("https://purifyapp.net", "purifyapp.net"));
  };

  const hands = {
    page,
    cdp,
    errors,
    appTime,
    /** Start the film: from here every frame the app paints is kept. */
    async roll() {
      if (!film || filming) return;
      filming = true;
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 93, everyNthFrame: 1 });
      watching = setInterval(watch, 500);
      await wait(400);
    },
    /** The app's own time passes: `ms` of it, which is `ms * SLOW` on the wall. */
    async rest(ms) {
      await wait(ms * slow);
    },
    /** The middle of a control, or the point given. */
    async spot(target) {
      if (typeof target === "object" && "x" in target) return target;
      const loc = typeof target === "string" ? page.locator(target).first() : target.first();
      await loc.waitFor({ state: "visible", timeout: 20000 });
      const box = await loc.boundingBox();
      if (!box) throw new Error(`${id}: nothing to tap`);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    },
    async tap(target, { press = 130, name = "" } = {}) {
      const p = await hands.spot(target);
      marks.push({ kind: "tap", t: appTime(), x: p.x, y: p.y, for: press / 1000, name });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
      await wait(press * slow);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      return p;
    },
    /**
     * A finger held until `until` resolves (the app answering the hold), and a little longer. The browser's own
     * long-press comes half a second after a finger goes down, by the wall and not by the page's clock, so the
     * touch itself begins late enough for that half second to end where half a second of the app's time ends:
     * in the film the finger is down for the app's own half second before the app answers.
     */
    async hold(target, until, { after = 280, name = "" } = {}) {
      const p = await hands.spot(target);
      const mark = { kind: "hold", t: appTime(), x: p.x, y: p.y, for: 0, name };
      marks.push(mark);
      await wait(LONG_PRESS * slow - LONG_PRESS);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
      await until();
      await wait(after * slow);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      mark.for = Number((appTime() - mark.t).toFixed(3));
      return p;
    },
    /**
     * Draw the page under a finger by `dy` of the app's pixels (up for more
     * of the page), over `ms`, easing to a stop so nothing is flung. `at` is
     * where the finger starts. The finger first moves past the browser's
     * slop at once, as a finger does, so the pull is a scroll from its first
     * moment and never a long-press (which the slowed clock would otherwise
     * let through: the first pull of the first verse take opened a verse's
     * tools that way).
     */
    async drag(dy, ms = 900, { at: start = { x: 206, y: dy > 0 ? 620 : 300 }, name = "", across = false } = {}) {
      // Twenty-five moves a second by the wall, which is a hundred and fifty for each second of the app's time.
      const steps = Math.max(8, Math.round((ms * slow) / 40));
      const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      const dir = Math.sign(dy) || 1;
      // `across`: the same pull sideways, for a row that runs off the side (dy > 0 draws more of it in from the end).
      const point = (d) => (across ? { x: start.x - d, y: start.y } : { x: start.x, y: start.y - d });
      marks.push({ kind: "drag", t: appTime(), x: start.x, y: start.y, dy: dy + dir * SLOP, for: ms / 1000, name, across });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
      for (const part of [0.5, 1]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point(dir * SLOP * part), id: 1 }] });
      const began = Date.now();
      for (let i = 1; i <= steps; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point(dir * SLOP + dy * ease(i / steps)), id: 1 }] });
        const due = began + (ms * slow * i) / steps;
        const left = due - Date.now();
        if (left > 0) await wait(left);
      }
      await wait(60 * slow);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    },
    /** A named moment, for the cut to find. */
    mark(name) {
      marks.push({ kind: "mark", t: appTime(), name });
    },
    /** Read what is in view and hold it to the rules: the heritage list, no campaign, no empty picture, no em dash. */
    async look(name) {
      const pictures = await page.evaluate(picturesOnPage);
      const words = await page.evaluate(wordsInView);
      const seen = {
        name,
        t: appTime(),
        pictures: [...new Set(pictures.map((p) => p.src.replace(ORIGIN, "").replace("https://purifyapp.net", "purifyapp.net")))],
        heritage: heritageNamedIn(pictures.map((p) => p.src).join("\n")),
        empty: [...new Set(pictures.filter((p) => !p.ok).map((p) => p.src.replace(ORIGIN, "")))],
        campaign: !campaigns && /campaign/i.test(words),
        // Where campaigns are shown, they are shown as 1.9 builds them: with no picture and nothing to add one with.
        campaignPicture: campaigns && /\b(picture|photo)/i.test(words),
        emDash: words.includes(String.fromCodePoint(0x2014)),
      };
      looks.push(seen);
      return { ...seen, words };
    },
    /** A still of the screen as it stands, for looking at. */
    async still(name) {
      const file = path.join(dir("stills"), `${id}-${name}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 80, scale: "css" });
      return file;
    },
    async end() {
      const seconds = Number(appTime().toFixed(3)); // the take's length: the screencast sends nothing while the screen is still
      if (film && filming) {
        await wait(300);
        clearInterval(watching);
        await watch();
        filming = false;
        await cdp.send("Page.stopScreencast").catch(() => {});
        await Promise.all(writes);
      }
      const reader = await page.evaluate(() => ({ plus: localStorage.getItem("purify:plusFeatures"), tier: localStorage.getItem("purify:premiumTier") }));
      const problems = [];
      if (reader.plus !== "0" || (reader.tier && reader.tier !== "free")) problems.push(`the reader is not a new reader with no Plus (${JSON.stringify(reader)})`);
      if (errors.length) problems.push(`page errors: ${[...new Set(errors)].join("; ")}`);
      for (const l of looks) {
        if (Object.keys(l.heritage).length) problems.push(`${l.name}: a picture on the heritage list is in view: ${Object.keys(l.heritage).join(", ")}`);
        if (l.empty.length) problems.push(`${l.name}: an empty picture in view: ${l.empty.join(", ")}`);
        if (l.campaign) problems.push(`${l.name}: a campaign is named in view`);
        if (l.campaignPicture) problems.push(`${l.name}: a campaign's picture, or a way to add one, is named in view`);
      }
      const passed = heritageNamedIn([...passing].join("\n"));
      if (Object.keys(passed).length) problems.push(`a picture on the heritage list passed through view: ${Object.keys(passed).join(", ")}`);
      const record = { id, day: DAY, slow, phone: PHONE, sharp: SHARP, seconds, frames, marks, looks, picturesSeen: [...passing].filter((p) => /\.(avif|jpe?g|png|webp)/.test(p)).sort(), reader, problems };
      if (film) fs.writeFileSync(path.join(folder, "take.json"), JSON.stringify(record));
      await ctx.close();
      return record;
    },
  };

  await go(page, "/");
  await page.waitForLoadState("networkidle").catch(() => {});
  return hands;
}
