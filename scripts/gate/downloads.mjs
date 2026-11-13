// Build 95, note 23 (downloads in the phone's bar and the bell's sheet), walked on the native
// export at phone size with real touch taps (the pre-build gate's part 1) and held to checkMock
// with pixels (part 2); and, beside it, the page the welcome email's "Send it to me" opens.
//
//   walk   A new reader's first download: John 1, the Translation sheet, the Russian Synodal
//          downloaded. Purify's own ask must come first, in its own words, before the phone is
//          asked anything; Turn on, and only then the phone's own prompt; the download told to
//          the phone as it runs and as it ends; the bell lit, and its sheet's Downloads part saying
//          it. Then a second reader who says Not now: the phone is never asked, and the next
//          download asks nothing. Then the opt-in page's one button. Stills at 390 and twice the
//          pixels, in English on Dark.
//   guard  checkMock with pixels on the ask, the bell's sheet with a download in each of its
//          four states, and the opt-in page asking and answered: at 390, 800 and 1032, on the five
//          palettes and every look, in English and in Arabic (--lang and --size walk one alone, so
//          walks can run side by side).
//
//   node scripts/gate/export.mjs        (the export, cut as the store builds cut it)
//   node scripts/gate/downloads.mjs walk [shots dir]
//   node scripts/gate/downloads.mjs guard [--lang en|ar] [--size 390|800|1032]
//
// The walk's browser has no shell, so two of the shell's plugins are stood in, and only those:
// Capacitor sends a call to any plugin its headers name to the bridge, so the headers name
// PushNotifications (the phone's notification permission: "prompt" until asked, then what the
// stand-in answers) and DownloadNotice (the app's own plugin: what it is told is kept, as the bar
// would show it). Everything else runs as the export runs. What the bar itself draws is Android's
// own template; this walk proves what it is told.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { LOOKS, PALETTES, checkMock } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const MODE = process.argv[2] ?? "walk";
const PLAIN = process.argv.slice(3).filter((a, i, all) => !a.startsWith("--") && !["--lang", "--size"].includes(all[i - 1]));
const SHOTS = PLAIN[0] ? path.resolve(PLAIN[0]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const WORDS = {
  en: JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")),
  ar: JSON.parse(fs.readFileSync("lib/i18n/messages/ar.json", "utf8")),
};
const SIZES = { 390: [390, 844], 800: [800, 1280], 1032: [1032, 1366] };
const ALL = [...PALETTES, ...LOOKS];
const RUSSIAN = "Синодальный перевод (1876)";
// A stand-in account and its link's code: the walk answers the route itself, so no real account is touched.
const OPT_IN = "/email/first-week/?u=8d7b2f4e-5c1a-4b7e-9f3d-2a6c8e1b0d4f&s=" + "x".repeat(43);
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no export in out/: run node scripts/gate/export.mjs first");
if (PALETTES.length !== 5 || LOOKS.length < 1) throw new Error(`expected the five palettes and the looks, found ${PALETTES.length} and ${LOOKS.length}`);
if (!WORDS.en["downloads.ask.title"]) throw new Error("the ask's words are not in this tree");

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

/** The two plugins stood in, before any page script: the phone's permission, and the app's own notice. */
const STAND_IN_PHONE = (answer) => {
  const phone = (window.__phone = { calls: [], permission: "prompt", answer });
  window.Capacitor = {
    PluginHeaders: [
      {
        name: "PushNotifications",
        methods: [
          { name: "checkPermissions", rtype: "promise" },
          { name: "requestPermissions", rtype: "promise" },
        ],
      },
      {
        name: "DownloadNotice",
        methods: [
          { name: "post", rtype: "promise" },
          { name: "clear", rtype: "promise" },
        ],
      },
    ],
    nativePromise: (plugin, method, options) => {
      phone.calls.push({ plugin, method, options: options ?? null, at: Date.now() });
      if (plugin === "PushNotifications" && method === "checkPermissions") return Promise.resolve({ receive: phone.permission });
      if (plugin === "PushNotifications" && method === "requestPermissions") {
        phone.permission = phone.answer;
        return Promise.resolve({ receive: phone.permission });
      }
      return Promise.resolve(undefined);
    },
    nativeCallback: (plugin, method, options) => {
      phone.calls.push({ plugin, method, options: options ?? null, at: Date.now() });
      return String(phone.calls.length);
    },
  };
};

/** What the main web will serve from the merge, answered from this checkout, and the opt-in's route. */
async function standIns(ctx) {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
  await ctx.route(/^https:\/\/purifyapp\.net\/bibles\//, (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join("public", p);
    if (!p.startsWith("/bibles/") || p.includes("..") || !fs.existsSync(file)) return route.fulfill({ status: 404, headers: cors, body: "" });
    return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: fs.readFileSync(file) });
  });
  await ctx.route(/^https:\/\/purifyapp\.net\/(?!api\/|bibles\/)/, (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join("public", p);
    if (p.includes("..") || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
    const type = { ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" }[path.extname(file)] ?? "application/octet-stream";
    return route.fulfill({ status: 200, contentType: type, headers: cors, body: fs.readFileSync(file) });
  });
  // The opt-in's route, as app/api/email/first-week/route.ts answers a good link.
  await ctx.route(/^https:\/\/purifyapp\.net\/api\/email\/first-week/, (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors, body: "" });
    ctx.__optIn = (ctx.__optIn ?? 0) + 1;
    return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ ok: true, answer: "on", said: "The guide is on its way." }) });
  });
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

async function open(lang, [width, height], { scale = 1, answer = "granted", seed = null } = {}) {
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
  await ctx.addInitScript(
    ([l, s]) => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("CapacitorStorage.purify_locale", l);
        if (s && !sessionStorage.getItem("purify:walk-seeded")) {
          localStorage.setItem("purify:downloads", JSON.stringify(s));
          sessionStorage.setItem("purify:walk-seeded", "1");
        }
      } catch {}
    },
    [lang, seed],
  );
  await ctx.addInitScript(STAND_IN_PHONE, answer);
  // With seeded downloads, the bridge's twelve seconds (STOPPED_AFTER_MS) are held, so a seeded
  // running or waiting row is measured as it is drawn, not as it is said to stop part way through
  // the measure. Only timers of exactly that length are held, and only in these contexts.
  if (seed) {
    await ctx.addInitScript(() => {
      const later = window.setTimeout;
      window.setTimeout = (fn, ms, ...rest) => (ms === 12_000 ? 0 : later(fn, ms, ...rest));
    });
  }
  await serveLikeTheShell(ctx, OUT, {});
  await standIns(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

/** Tap at the middle of what a locator names, with the finger. */
async function tapAt(page, locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
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

const calls = (page) => page.evaluate(() => window.__phone.calls.map((c) => ({ ...c })));
const askCard = (page, lang) => page.locator("[role=dialog]", { hasText: t(lang, "downloads.ask.title") }).filter({ visible: true });

/** The Translation sheet from •••, and the Russian Synodal's download tapped. */
async function downloadRussian(page, lang) {
  await tapAt(page, page.getByRole("button", { name: t(lang, "bible.moreActions") }).filter({ visible: true }).first());
  await page.waitForTimeout(800);
  await tapAt(page, page.locator("[role=dialog] button", { hasText: t(lang, "bible.translationLabel") }).filter({ visible: true }).first());
  await page.waitForTimeout(900);
  const prefix = t(lang, "bible.downloads.downloadAria", { name: RUSSIAN, size: "" }).replace(/[,،]\s*$/, "");
  await tapAt(page, page.locator(`[role=dialog] button[aria-label^="${prefix}"]`).filter({ visible: true }).first());
}

/** One question at a time: while the app's language offer stands, Purify's ask must not. Then Not now to the offer. */
async function offerFirst(page, lang) {
  const offer = page.locator("[data-bible-language-offer] button", { hasText: t(lang, "bible.languageOffer.notNow") });
  await offer.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  if (!(await offer.count())) return false;
  await page.waitForTimeout(1200);
  const both = await askCard(page, lang).count();
  await tapAt(page, offer.first());
  await page.waitForTimeout(900);
  return both === 0;
}

/** Put away what stands over the page: the language offer, then any sheet. */
async function clearOver(page, lang) {
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

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

/** A still of the opt-in page's own words and button: the email's link opens it on the website, in the website's frame, not the app's. */
async function shotPage(page, name) {
  if (SHOTS) await page.locator('div[lang="en"][dir="ltr"]').filter({ visible: true }).first().screenshot({ path: path.join(SHOTS, `${name}.png`) });
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

/**
 * A download in each state, as lib/downloads/log.ts keeps them, for the bell's sheet. As the stores
 * can make them (lib/downloads/watch.ts): a Bible downloading, a book's saving waiting for Wi-Fi (only a
 * book's saving waits), a Bible done and one failed.
 */
function fourStates() {
  const now = Date.now();
  const iso = (ms) => new Date(now - ms).toISOString();
  return [
    { key: "bible:en-web", kind: "bible", name: "World English Bible", state: "running", share: 0.42, done: 0, total: 0, at: iso(60_000) },
    { key: "book:luke", kind: "book", name: "Luke", state: "waiting", share: 10 / 24, done: 10, total: 24, waiting: "wifi", at: iso(120_000) },
    { key: "bible:ru-synodal", kind: "bible", name: RUSSIAN, state: "done", share: 1, done: 0, total: 0, at: iso(600_000), ended: iso(540_000), seen: false },
    { key: "bible:grc-lxx-patriarchal", kind: "bible", name: "Οι Εβδομήκοντα και το Πατριαρχικό κείμενο (1904)", state: "failed", share: 0.6, done: 0, total: 0, failure: { key: "bible.downloads.failedOffline" }, at: iso(3_600_000), ended: iso(3_500_000), seen: false },
  ];
}

/** The bell, tapped: its sheet, with the Downloads part in it. */
async function openBell(page, lang) {
  // A cold start opens on the launch stage, which covers the screen for its first seconds.
  await page.waitForFunction(() => !document.querySelector("[data-launch-stage]"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const bell = page.locator(`button[aria-label="${t(lang, "nav.notificationsNew")}"], button[aria-label="${t(lang, "settings.notifications")}"]`).filter({ visible: true }).first();
  await tapAt(page, bell);
  const part = page.locator("[data-downloads]").filter({ visible: true }).first();
  await part.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(900);
  return part;
}

console.log(`Note 23 on the export (${MODE}), motion on.`);

if (MODE === "walk") {
  const lang = "en";
  // ---- a new reader who says Turn on.
  {
    console.log("\nA new reader's first download, at 390: Turn on");
    const { ctx, page, errors } = await open(lang, SIZES[390], { scale: 2 });
    await go(page, "/bible/john/1/", { timeout: 30000 });
    await page.waitForTimeout(2500);
    await downloadRussian(page, lang);
    // The Russian is chosen as it downloads, so the app's language offer asks too: one question at a time.
    if (await offerFirst(page, lang)) ok("one question at a time: the language offer stood alone, and Purify's ask waited");
    else fail("Purify's ask stood together with the language offer");
    const card = askCard(page, lang);
    await card.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    if (await card.count()) ok("Purify's own ask came at the first download, once the offer was answered");
    else fail("no ask at the first download");
    const words = (await card.innerText().catch(() => "")).replace(/\s+/g, " ");
    for (const key of ["downloads.ask.title", "downloads.ask.body", "discordAsk.turnOn", "onboard.reminders.notNow"]) {
      if (words.includes(t(lang, key))) ok(`the card says "${t(lang, key)}"`);
      else fail(`the card does not say "${t(lang, key)}" (it says "${words}")`);
    }
    let c = await calls(page);
    if (c.some((x) => x.method === "requestPermissions")) fail("the phone was asked before Purify's own ask was answered");
    else ok("the phone was not asked while Purify's ask stands");
    await page.waitForTimeout(600);
    await shot(page, "23-ask");
    await tapAt(page, card.locator("button", { hasText: t(lang, "discordAsk.turnOn") }).first());
    await page.waitForTimeout(1200);
    c = await calls(page);
    const asked = c.filter((x) => x.method === "requestPermissions").length;
    if (asked === 1) ok("Turn on: the phone's own prompt, once, after the card");
    else fail(`Turn on: the phone was asked ${asked} times`);
    if (!(await askCard(page, lang).count())) ok("the card has gone");
    else fail("the card stays after Turn on");
    // The download runs to its end, told to the phone as it goes.
    await page
      .waitForFunction(() => window.__phone.calls.some((x) => x.plugin === "DownloadNotice" && x.options?.state === "done"), null, { timeout: 120000 })
      .catch(() => {});
    c = await calls(page);
    const told = c.filter((x) => x.plugin === "DownloadNotice" && x.method === "post").map((x) => x.options);
    const running = told.filter((o) => o.state === "running");
    const done = told.find((o) => o.state === "done");
    if (running.length) ok(`the phone was told it runs: "${running.at(-1).title}", "${running.at(-1).text}", ${Math.round(running.at(-1).share * 100)}%`);
    else fail("the phone was never told it runs");
    if (done) ok(`the phone was told its end: "${done.title}", "${done.text}"`);
    else fail("the phone was never told its end");
    // In the reader's words, never a key ("downloads.saving"), which is what it said outside the words' provider.
    const keys = told.filter((o) => /^[a-z][\w]*(\.[\w-]+)+$/.test(o.text ?? "") || /^[a-z][\w]*(\.[\w-]+)+$/.test(o.title ?? ""));
    if (told.length && !keys.length) ok("every line the phone was told is in words, none a key");
    else if (keys.length) fail(`the phone was told a key: ${JSON.stringify(keys[0])}`);
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, "23-told.json"), JSON.stringify(told, null, 2));
    await clearOver(page, lang);
    // The bell, lit by the unseen end, and its sheet's Downloads part.
    await go(page, "/", { timeout: 30000 });
    await page.waitForTimeout(2500);
    const lit = page.locator(`button[aria-label="${t(lang, "nav.notificationsNew")}"]`).filter({ visible: true });
    if (await lit.count()) ok("the bell is lit by the download's end");
    else fail("the bell is not lit after the download ended");
    const part = await openBell(page, lang);
    const said = (await part.innerText()).replace(/\s+/g, " ");
    if (said.includes(RUSSIAN) && said.includes(t(lang, "downloads.downloaded"))) ok(`the bell's sheet says it: "${said.slice(0, 90)}"`);
    else fail(`the bell's sheet does not say the download's end ("${said.slice(0, 120)}")`);
    await shot(page, "23-bell-done");
    if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(" | ")}`);
    await ctx.close();
  }
  // ---- the bell's four states, for the still.
  {
    console.log("\nThe bell's sheet with a download in each state, at 390");
    const { ctx, page } = await open(lang, SIZES[390], { scale: 2, seed: fourStates() });
    await go(page, "/", { timeout: 30000 });
    await page.waitForTimeout(1500);
    const part = await openBell(page, lang);
    const states = await part.locator("[data-download]").evaluateAll((els) => els.map((e) => e.getAttribute("data-download")));
    if (["running", "waiting", "done", "failed"].every((s) => states.includes(s))) ok(`four states drawn: ${states.join(", ")}`);
    else fail(`states drawn: ${states.join(", ")}`);
    await shot(page, "23-bell-states");
    await ctx.close();
  }
  // ---- a reader who says Not now.
  {
    console.log("\nA reader who says Not now, at 390");
    const { ctx, page } = await open(lang, SIZES[390]);
    await go(page, "/bible/john/1/", { timeout: 30000 });
    await page.waitForTimeout(2500);
    await downloadRussian(page, lang);
    await offerFirst(page, lang);
    const card = askCard(page, lang);
    await card.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    await tapAt(page, card.locator("button", { hasText: t(lang, "onboard.reminders.notNow") }).first());
    await page.waitForTimeout(1500);
    let c = await calls(page);
    if (!c.some((x) => x.method === "requestPermissions")) ok("Not now: the phone was never asked");
    else fail("Not now: the phone was asked anyway");
    if (!(await askCard(page, lang).count())) ok("the card has gone");
    else fail("the card stays after Not now");
    // A second download asks nothing.
    await page.waitForFunction(() => window.__phone.calls.some((x) => x.plugin === "DownloadNotice" && x.options?.state === "done"), null, { timeout: 120000 }).catch(() => {});
    await clearOver(page, lang);
    await go(page, "/bible/john/2/", { timeout: 30000 });
    await page.waitForTimeout(2000);
    await tapAt(page, page.getByRole("button", { name: t(lang, "bible.moreActions") }).filter({ visible: true }).first());
    await page.waitForTimeout(800);
    await tapAt(page, page.locator("[role=dialog] button", { hasText: t(lang, "bible.translationLabel") }).filter({ visible: true }).first());
    await page.waitForTimeout(900);
    const greek = page.locator('[role=dialog] button[aria-label^="' + t(lang, "bible.downloads.downloadAria", { name: "", size: "" }).split(",")[0].trim() + '"]').filter({ visible: true });
    if (await greek.count()) {
      await tapAt(page, greek.first());
      await page.waitForTimeout(2500);
      if (!(await askCard(page, lang).count())) ok("the next download asks nothing");
      else fail("the next download asked again");
    } else console.log("  (no second Bible to download in the sheet: the second ask not walked)");
    c = await calls(page);
    if (!c.some((x) => x.method === "requestPermissions")) ok("and the phone is still never asked");
    else fail("the phone was asked after Not now");
    await ctx.close();
  }
  // ---- the welcome email's link: the page asks, and its one button answers.
  {
    console.log("\nThe opt-in page, at 390");
    const { ctx, page } = await open(lang, SIZES[390], { scale: 2 });
    await go(page, OPT_IN, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const send = page.locator("button", { hasText: "Send it to me" }).filter({ visible: true }).first();
    if (await send.count()) ok("the page asks, with its one button");
    else fail("the page does not ask");
    if (!ctx.__optIn) ok("nothing was turned on by the visit");
    else fail("the visit turned the guide on");
    await shotPage(page, "optin-ask");
    await tapAt(page, send);
    await page.waitForTimeout(1500);
    if (ctx.__optIn === 1) ok("the button sent one request");
    else fail(`the button sent ${ctx.__optIn ?? 0} requests`);
    if (await page.getByRole("heading", { name: "It is on its way" }).count()) ok("the page says it is on");
    else fail("the page does not say it is on");
    await shotPage(page, "optin-done");
    await ctx.close();
  }
}

if (MODE === "guard") {
  const at = process.argv.indexOf("--lang");
  const LANGS = at > 0 ? [process.argv[at + 1]] : ["en", "ar"];
  const sz = process.argv.indexOf("--size");
  const WIDTHS = sz > 0 ? [Number(process.argv[sz + 1])] : [390, 800, 1032];
  for (const lang of LANGS) {
    for (const w of WIDTHS) {
      const size = SIZES[w];
      console.log(`\n${lang} at ${w}`);
      // The ask.
      {
        const { ctx, page } = await open(lang, size);
        await go(page, "/bible/john/1/", { timeout: 30000 });
        await page.waitForTimeout(2500);
        await downloadRussian(page, lang);
        await offerFirst(page, lang);
        const card = askCard(page, lang);
        await card.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1200);
        if (await card.count()) await guard(page, "[data-confirm-card]", lang, size, "the ask");
        else fail(`no ask at ${w} in ${lang}`);
        await ctx.close();
      }
      // The bell's sheet, a download in each state (the bridge's twelve seconds held: see open()).
      {
        const { ctx, page } = await open(lang, size, { seed: fourStates() });
        await go(page, "/", { timeout: 30000 });
        await page.waitForTimeout(1500);
        await openBell(page, lang);
        await guard(page, "[data-downloads]", lang, size, "the bell's Downloads part");
        await ctx.close();
      }
      // The opt-in page, asking and answered.
      {
        const { ctx, page } = await open(lang, size);
        await go(page, OPT_IN, { timeout: 30000 });
        await page.waitForTimeout(1500);
        await guard(page, "main", lang, size, "the opt-in page, asking");
        await tapAt(page, page.locator("button", { hasText: "Send it to me" }).filter({ visible: true }).first());
        await page.waitForTimeout(1500);
        await guard(page, "main", lang, size, "the opt-in page, answered");
        await ctx.close();
      }
    }
  }
}

await browser.close();
console.log(fails ? `\n${fails} failure(s)` : "\nAll passed.");
process.exit(fails ? 1 : 0);
