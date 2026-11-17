// Updates 98r: the controls Heart-only touched, tapped as a reader taps them, on the export.
//   node heart-walk.mjs <repo> [shots dir]
// Phone (390x844, native shell, touch) in English and Arabic, and the computer (1280x800, website).
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(process.argv[2] ?? ".");
const SHOTS = process.argv[3] ?? null;
const OUT = path.join(REPO, "out");
const { chromium } = await import(path.join(REPO, "node_modules/playwright/index.mjs"));
const { NATIVE_UA, go, serveLikeTheShell } = await import(path.join(REPO, "scripts/lib/shell-server.mjs"));
const { tapAt, firstTouch } = await import(path.join(REPO, "scripts/lib/tap.mjs"));
const { installGate } = await import(path.join(REPO, "scripts/gate/inpage.mjs"));
const DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const words = (lang) => JSON.parse(fs.readFileSync(path.join(REPO, "lib/i18n/messages", `${lang}.json`), "utf8"));

const lines = [];
let failed = 0;
const ok = (m) => lines.push(`ok    ${m}`);
const bad = (m) => {
  failed += 1;
  lines.push(`FAIL  ${m}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, { lang, width, height, desktop }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    isMobile: !desktop,
    hasTouch: !desktop,
    userAgent: desktop ? DESKTOP_UA : NATIVE_UA,
    locale: lang,
  });
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      if (l !== "en") localStorage.setItem("CapacitorStorage.purify_locale", l);
      // A reader of an earlier test build whose stored choice was a phone's voice.
      localStorage.setItem("purify:listen.voice", JSON.stringify({ en: "en-us-x-sfg-local", ar: "ar-xa-x-arz-local" }));
    } catch {}
    // Every word asked of the browser's speech is counted: there must be none.
    window.__spoke = 0;
    try {
      const s = window.speechSynthesis;
      if (s) {
        const speak = s.speak.bind(s);
        s.speak = (u) => {
          window.__spoke += 1;
          return speak(u);
        };
      }
    } catch {}
    const Made = window.Audio;
    window.__media = [];
    window.Audio = function Audio(...args) {
      const a = new Made(...args);
      window.__media.push(a);
      return a;
    };
    window.Audio.prototype = Made.prototype;
  }, lang);
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
  await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => {
    const m = /bytes=(\d+)-(\d*)/.exec(r.request().headers()["range"] ?? "");
    if (!m) return r.fulfill({ status: 200, contentType: "audio/mpeg", headers: { "accept-ranges": "bytes" }, body: bell });
    const from = Math.min(Number(m[1]), bell.length - 1);
    const to = m[2] ? Math.min(Number(m[2]), bell.length - 1) : bell.length - 1;
    return r.fulfill({ status: 206, contentType: "audio/mpeg", headers: { "accept-ranges": "bytes", "content-range": `bytes ${from}-${to}/${bell.length}` }, body: bell.subarray(from, to + 1) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  const cdp = desktop ? null : await ctx.newCDPSession(page);
  return { ctx, page, cdp, errors };
}

async function tap(page, cdp, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) return false;
  if (cdp) await tapAt(cdp, box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}

async function count(page, selector) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => el.getBoundingClientRect().width > 0).length, selector);
}

async function playing(page) {
  return page.evaluate(() => (window.__media ?? []).filter((a) => !a.paused).map((a) => a.currentSrc || a.src));
}

async function phone(browser, lang) {
  const W = words(lang);
  const old = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), `ar-en-voice.json`), "utf8"))[lang];
  const tag = `[390 ${lang}]`;
  const { ctx, page, cdp, errors } = await open(browser, { lang, width: 390, height: 844, desktop: false });

  // An Old Testament chapter, a life, a work and a council: nothing recorded, so no Listen anywhere.
  for (const to of ["/bible/genesis/1/", "/saints/xenia-of-petersburg/", "/saints/athanasius-the-great/against-the-heathen/", "/councils/first-nicaea/the-synodal-letter/"]) {
    await go(page, to);
    await wait(2500);
    const listen = (await count(page, "[data-read-aloud-play], [data-listen-pill], [data-listen-here], [data-tour='listen']")) + (await page.locator("button", { hasText: new RegExp(`^\\s*${W["readAloud.listen"]}\\s*$`) }).count());
    if (listen === 0) ok(`${tag} ${to}: no Listen (no recording of Heart's)`);
    else bad(`${tag} ${to}: ${listen} Listen controls where nothing is recorded`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `rest-${to.replace(/\W+/g, "_")}-${lang}.png`) });
  }

  // A New Testament chapter: Listen in the pill, a tap plays Heart's recording, the stored phone voice set aside.
  await go(page, "/bible/john/1/");
  await wait(2500);
  if (cdp) await firstTouch(page, cdp);
  const pill = page.locator("[data-read-aloud-play]").first();
  if ((await count(page, "[data-read-aloud-play]")) === 1) ok(`${tag} John 1: Listen in the pill`);
  else bad(`${tag} John 1: no Listen in the pill`);
  await tap(page, cdp, pill);
  await wait(2500);
  const now = await playing(page);
  if (now.some((src) => /audio\.purifyapp\.net\/read\/john\/1\.mp3/.test(src))) ok(`${tag} John 1: the tap plays Heart's recording (${now.join(", ")})`);
  else bad(`${tag} John 1: the tap played ${JSON.stringify(now)}`);
  const spoke = await page.evaluate(() => window.__spoke);
  if (spoke === 0) ok(`${tag} John 1: the browser's speech asked for nothing, with a phone voice stored from an earlier build`);
  else bad(`${tag} John 1: the browser's speech was asked ${spoke} times`);
  if ((await count(page, "[data-reader-dock]")) === 1) ok(`${tag} John 1: the dock stands while it plays`);
  else bad(`${tag} John 1: no dock while it plays`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `john1-playing-${lang}.png`) });

  // Now Playing from the dock, then its •••: no Voice row.
  const opener = page.locator(`[data-reader-dock] button[aria-label^="${W["prayers.nowPlaying"]}"]`).first();
  if (await tap(page, cdp, opener)) {
    await wait(1800);
    if ((await count(page, "[data-now-playing]")) >= 1) ok(`${tag} Now Playing opens from the dock`);
    else bad(`${tag} Now Playing did not open from the dock`);
    const more = page.locator(`[data-now-playing] button[aria-label="${W["bible.moreActions"]}"]`).first();
    if (await tap(page, cdp, more)) {
      await wait(1200);
      const rows = await page.evaluate(() => {
        const dialogs = [...document.querySelectorAll("[role=dialog]")].filter((d) => d.getBoundingClientRect().height > 0 && !d.hasAttribute("data-now-playing"));
        const last = dialogs[dialogs.length - 1];
        return last ? [...last.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()).filter(Boolean) : null;
      });
      if (!rows) bad(`${tag} the player's ••• sheet did not open`);
      else {
        const voiceRow = rows.find((r) => r.startsWith(old));
        if (!voiceRow && rows.some((r) => r.startsWith(W["player.sleep"])) && rows.some((r) => r.startsWith(W["ambience.title"]))) ok(`${tag} the player's ••• sheet: ${rows.join(" | ")} (no Voice row)`);
        else bad(`${tag} the player's ••• sheet rows: ${rows.join(" | ")}`);
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `player-more-${lang}.png`) });
      await page.keyboard.press("Escape");
      await wait(800);
    } else bad(`${tag} no ••• in Now Playing`);
    await page.keyboard.press("Escape");
    await wait(1200);
  } else bad(`${tag} no Now Playing door in the dock`);

  // With John 1 loaded, on a chapter and a life with no recording: the dock stands, and offers no Listen.
  for (const to of ["/bible/genesis/1/", "/saints/xenia-of-petersburg/"]) {
    await go(page, to);
    await wait(2500);
    const dock = await count(page, "[data-reader-dock]");
    const dockListen = await page.locator("[data-reader-dock] button", { hasText: W["readAloud.listen"] }).count();
    if (dock === 1 && dockListen === 0) ok(`${tag} ${to} with John 1 loaded: the dock, and no Listen in it`);
    else bad(`${tag} ${to} with John 1 loaded: dock ${dock}, Listen in it ${dockListen}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `docked-${to.replace(/\W+/g, "_")}-${lang}.png`) });
  }
  if (errors.length) bad(`${tag} page errors: ${errors.join(" / ")}`);
  else ok(`${tag} no page error`);
  await ctx.close();
}

async function computer(browser) {
  const W = words("en");
  const tag = "[1280 en, website]";
  const { ctx, page, errors } = await open(browser, { lang: "en", width: 1280, height: 800, desktop: true });
  await go(page, "/bible/john/1/");
  await wait(2500);
  const toolbar = page.locator("[data-tour='listen']:visible", { hasText: W["readAloud.listen"] });
  if ((await toolbar.count()) >= 1 && (await toolbar.first().isVisible())) ok(`${tag} John 1: Listen in the toolbar`);
  else bad(`${tag} John 1: no Listen in the toolbar`);
  await tap(page, null, toolbar.first());
  await wait(2500);
  const now = await playing(page);
  if (now.some((src) => /read\/john\/1\.mp3/.test(src))) ok(`${tag} John 1: the toolbar's Listen plays Heart's recording`);
  else bad(`${tag} John 1: the toolbar's Listen played ${JSON.stringify(now)}`);
  for (const to of ["/bible/genesis/1/", "/saints/xenia-of-petersburg/", "/saints/athanasius-the-great/against-the-heathen/", "/councils/first-nicaea/the-synodal-letter/"]) {
    await go(page, to);
    await wait(2500);
    const n = (await page.locator("[data-tour='listen']:visible, [data-listen-here]:visible").count()) + (await page.locator("main button:visible", { hasText: new RegExp(`^\\s*${W["readAloud.listen"]}\\s*$`) }).count());
    if (n === 0) ok(`${tag} ${to}: no Listen in the page`);
    else bad(`${tag} ${to}: ${n} Listen in the page`);
  }
  const spoke = await page.evaluate(() => window.__spoke);
  if (spoke === 0) ok(`${tag} the browser's speech asked for nothing`);
  else bad(`${tag} the browser's speech was asked ${spoke} times`);
  if (errors.length) bad(`${tag} page errors: ${errors.join(" / ")}`);
  else ok(`${tag} no page error`);
  await ctx.close();
}

if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
if (process.env.ONLY !== "computer") for (const lang of ["en", "ar"]) await phone(browser, lang);
await computer(browser);
await browser.close();
console.log(lines.join("\n"));
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
