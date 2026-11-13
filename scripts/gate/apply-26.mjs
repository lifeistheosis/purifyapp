// Updates 26: the four approved changes walked on the native export, as the pre-build gate asks
// (CLAUDE.md, "No test build reaches him until it passes the pre-build gate"): real touch taps
// (locator.tap(), as a finger taps) at 390, 800 and 1032 wide, in English and in Arabic, and
// checkMock with pixels (scripts/mock-check.mjs) on the five palettes, the two earned by reading
// (Councils and Cappadocian, which Updates 26's run left out; Updates 32 added them) and every look.
//
//   settings  /settings/ (notes 18, 19 and 27): the one swept row (.set-mode-row) held to
//             checkMock; Light tapped (html[data-reading-mode] and the check move to it) and Dark
//             back; the Councils goal opens what is left to read (EarnSheet), held to checkMock;
//             its first door opens /councils/<slug>/, and Back returns to Settings with the row
//             where it was (its place on the screen and how far it was swept).
//   modes     /settings/reading-mode/ (notes 16 and 27): Land and sea is Holy Mountain, Forest and
//             Jordan, with no Desert, held to checkMock, and so is the shelf of goals; the
//             Cappadocian goal's sheet is opened, held to checkMock and closed by its own control;
//             Holy Mountain is tapped and what changes is said (data-look, or the Plus sheet).
//   bible     /bible/john/1/ (note 19): ••• then Reader settings, or the Reader pill where there is
//             no •••; the shelf (.reader-modes) held to checkMock, its Councils goal opens its
//             sheet, which is closed by its own control.
//   work      /saints/john-cassian/conferences/ (note 15): the ••• sheet and the contents, each
//             held to checkMock, each Share row tapped with navigator.share stood in (what it was
//             handed is kept): a link on https://purifyapp.net/ that names the work. And #s102,
//             opened from another screen, opens Conference 5, Chapter 10.
//   council   a council's document (COUNCIL_DOC): the same two sheets and the same Share.
//   looks     a reader's page with each land look stored as the reader's palette (the key the app
//             reads, READING_THEME_KEY): Holy Mountain, Forest and Jordan worn as themselves, and a
//             stored Desert worn as Roses (note 16).
//
// One line per check (PASS, FAIL or SKIP; screen, part, language, width, and the words of the
// first failure), then a total. A fresh context for each language and width, onboarded as
// scripts/gate/voices.mjs is.
//
//   node scripts/gate/export.mjs        (the export, cut as the store builds cut it)
//   node scripts/gate/apply-26.mjs [--lang en,ar] [--size 390,800,1032] [--only settings,modes,bible,work,council,looks] [--jobs 3]
//
// --jobs runs that many of the six walks (a language at a width) side by side, each in its own
// context of one browser; the lines say which walk each is from, and every FAIL and SKIP is said
// again at the end (marked "="), by language and width.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { EARNED, EVERY, LOOKS, PALETTES, checkMock } from "../mock-check.mjs";
import { NATIVE_UA, go, inBundle, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const ROOT = new URL("../../", import.meta.url).pathname;
const OUT = path.join(ROOT, "out");
const WORDS = {
  en: JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8")),
  ar: JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/ar.json"), "utf8")),
};
const argv = process.argv.slice(2);
const arg = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : null;
};
const SIZES_ALL = [
  [390, 844],
  [800, 1280],
  [1032, 1366],
];
const LANGS = (arg("--lang") ?? "en,ar").split(",");
const SIZES = arg("--size") ? SIZES_ALL.filter(([w]) => arg("--size").split(",").includes(String(w))) : SIZES_ALL;
const PARTS = (arg("--only") ?? "settings,modes,bible,work,council,looks").split(",");
/** How many of the language-and-width walks run side by side, each in its own context of one browser. */
const JOBS = Math.max(1, Number(arg("--jobs") ?? 1));
/** The five palettes, the two earned by reading and the looks (mock-check.mjs, EVERY). */
const ALL = EVERY;
/** The key the app reads for the reader's palette (lib/reader/readingModes.ts, READING_THEME_KEY; lib/reader/prepaint.ts). */
const READING_THEME_KEY = "purify.reader.theme";
const WORK = "/saints/john-cassian/conferences/";
/** A council's document of more than one part, so both its sheets have something to say. */
const COUNCIL_DOC = "/councils/first-nicaea/the-twenty-canons/";
/** Each land look as stored on a device, and what the page must wear for it: Desert is gone, and a device that kept it wears Roses. */
const LAND_STORED = [
  ["athos", "athos"],
  ["forest", "forest"],
  ["jordan", "jordan"],
  ["desert", "rose"],
];

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no export in out/: run node scripts/gate/export.mjs first");
if (PALETTES.length !== 5 || EARNED.length !== 2 || LOOKS.length < 1 || ALL.length !== PALETTES.length + EARNED.length + LOOKS.length)
  throw new Error(`expected the five palettes, the two earned and the looks, found ${PALETTES.length}, ${EARNED.length} and ${LOOKS.length} (${ALL.length} in all)`);
for (const p of [WORK, COUNCIL_DOC, "/settings/", "/settings/reading-mode/", "/bible/john/1/"]) if (!inBundle(OUT, p)) throw new Error(`the export carries no ${p}`);

const t = (lang, key, vars = {}) => {
  let s = WORDS[lang][key] ?? WORDS.en[key];
  if (s === undefined) throw new Error(`no words for ${key}`);
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const q = (s) => s.replace(/["\\]/g, "\\$&");
const dialogSel = (label) => `[role="dialog"][aria-label="${q(label)}"]`;
const first = (e) => String(e?.message ?? e).split("\n")[0].slice(0, 160);

// ---- what the walk says

const results = [];
function record(status, c, part, words = "") {
  results.push({ status, screen: c.screen, part, lang: c.lang, width: c.width, words });
  console.log(`${status}  ${c.screen}  |  ${part}  |  ${c.lang}  |  ${c.width}${words ? `  |  ${words}` : ""}`);
}
const pass = (c, part, words) => record("PASS", c, part, words);
const fail = (c, part, words) => record("FAIL", c, part, words);
const skip = (c, part, words) => record("SKIP", c, part, words);
const detail = (line) => console.log(`        ${line}`);

// ---- the phone

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

async function open(lang, [width, height]) {
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
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  // The phone's share sheet, stood in: what each Share hands it is kept for the walk. In the apps
  // the Share plugin opens the phone's sheet; in a browser (and Capacitor's web Share) it is
  // navigator.share, so both ways reach this.
  await ctx.addInitScript(() => {
    window.__shared = [];
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: async function share(data) {
        window.__shared.push({ title: data?.title ?? null, text: data?.text ?? null, url: data?.url ?? null });
      },
    });
    Object.defineProperty(Navigator.prototype, "canShare", { configurable: true, value: () => true });
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(first(e)));
  return { ctx, page, errors };
}

const htmlState = (page) =>
  page.evaluate(() => ({ mode: document.documentElement.getAttribute("data-reading-mode"), look: document.documentElement.getAttribute("data-look") }));

/** Until html wears what is wanted, up to `ms`. */
async function waitHtml(page, want, ms = 4000) {
  for (let waited = 0; waited < ms; waited += 200) {
    const h = await htmlState(page);
    if (h.mode === want.mode && h.look === want.look) return h;
    await page.waitForTimeout(200);
  }
  return htmlState(page);
}

const visibleDialogs = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getClientRects().length).map((d) => d.getAttribute("aria-label")));

async function waitShown(page, sel, ms = 10000) {
  return page
    .waitForFunction((s) => [...document.querySelectorAll(s)].some((d) => d.getClientRects().length), sel, { timeout: ms })
    .then(() => true)
    .catch(() => false);
}

async function waitGone(page, sel, ms = 6000) {
  return page
    .waitForFunction((s) => ![...document.querySelectorAll(s)].some((d) => d.getClientRects().length), sel, { timeout: ms })
    .then(() => true)
    .catch(() => false);
}

/** Until a sheet stops moving (it rises on the house curve), up to 5 seconds. */
async function atRest(page, sel) {
  let last = null;
  for (let waited = 0; waited < 5000; waited += 150) {
    const top = await page.evaluate((s) => {
      const d = [...document.querySelectorAll(s)].filter((x) => x.getClientRects().length).at(-1);
      const panel = d ? [...d.querySelectorAll("*")].find((e) => e.getBoundingClientRect().height > 120) : null;
      return panel ? Math.round(panel.getBoundingClientRect().top) : null;
    }, sel);
    if (top !== null && top === last) return;
    last = top;
    await page.waitForTimeout(150);
  }
}

/** checkMock with pixels on the five palettes and every look, as one check line. */
async function guard(c, page, selector, part) {
  try {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), selector);
    await page.waitForTimeout(500);
    const r = await checkMock(page, selector, { palettes: ALL, pixels: true });
    if (!r.failures.length) return pass(c, part, `passes on ${ALL.length} palettes and looks`);
    const f = r.failures[0];
    const kinds = {};
    for (const g of r.failures) kinds[g.check] = (kinds[g.check] ?? 0) + 1;
    const all = Object.entries(kinds)
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
    fail(c, part, `${f.check}${f.palette ? ` on ${f.palette}` : ""}: ${f.what}: ${f.detail ?? ""} (${r.failures.length} failure(s) in all: ${all})`);
    const seen = new Set();
    for (const g of r.failures.slice(1)) {
      const key = `${g.check} ${g.what} ${g.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > 6) break;
      detail(`${g.check}${g.palette ? ` on ${g.palette}` : ""}: ${g.what}: ${g.detail ?? ""}`);
    }
  } catch (e) {
    fail(c, part, `checkMock could not measure it: ${first(e)}`);
  }
}

/** A sheet closed by its own close control, or by Escape where it has none; true when it is gone. */
async function closeSheet(page, sel, lang) {
  const sheet = page.locator(sel).filter({ visible: true }).last();
  const close = sheet.locator(`button[aria-label="${q(t(lang, "common.close"))}"]:not([tabindex="-1"])`).filter({ visible: true }).first();
  let how = "its close control";
  if (await close.count()) await close.tap({ timeout: 10000 });
  else {
    how = "Escape (it has no close control)";
    await page.keyboard.press("Escape");
  }
  return { gone: await waitGone(page, sel), how };
}

/** A palette's tile, by the name a reader reads under it. */
const tileNamed = (page, scope, lang, key) =>
  scope.locator(".set-mode").filter({ has: page.locator(".set-mode-name", { hasText: exact(t(lang, key)) }) }).first();

/** Tap a palette's tile: html must wear it, the check must stand on it, and the tile must not jump under the finger. */
async function tapPalette(c, page, tile, want, part) {
  try {
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box0 = await tile.boundingBox();
    await tile.tap({ timeout: 10000 });
    const h = await waitHtml(page, want);
    await page.waitForTimeout(400);
    const pressed = await tile.getAttribute("aria-pressed");
    const box1 = await tile.boundingBox();
    const moved = box0 && box1 ? Math.round(Math.max(Math.abs(box1.x - box0.x), Math.abs(box1.y - box0.y))) : 0;
    const wears = `data-reading-mode ${h.mode ?? "none"}, data-look ${h.look ?? "none"}`;
    if (h.mode !== want.mode || h.look !== want.look) return fail(c, part, `html wears ${wears}, wanted data-reading-mode ${want.mode ?? "none"}, data-look ${want.look ?? "none"}`);
    if (pressed !== "true") return fail(c, part, `html changed (${wears}) but the check did not move to the tile`);
    if (moved > 4) return fail(c, part, `the tile moved ${moved}px under the finger`);
    pass(c, part, `${wears}, the check on it`);
  } catch (e) {
    fail(c, part, `could not tap it: ${first(e)}`);
  }
}

// ---- 1. Settings

async function partSettings(c, page) {
  c.screen = "/settings/";
  await go(page, "/settings/", { timeout: 30000 });
  const row = page.locator(".set-mode-row").first();
  try {
    await row.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    return fail(c, "row: .set-mode-row", "no .set-mode-row on the screen");
  }
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1200);
  await guard(c, page, ".set-mode-row", "row: checkMock .set-mode-row");
  await tapPalette(c, page, tileNamed(page, row, c.lang, "settings.paletteLight"), { mode: "parchment", look: null }, "row: tap Light");
  await tapPalette(c, page, tileNamed(page, row, c.lang, "settings.paletteDark"), { mode: null, look: null }, "row: tap Dark back");

  // The Councils goal, swept to as a finger sweeps the row to it.
  const goal = row.locator('[data-palette-goal="councils"]').first();
  if (!(await goal.count())) return fail(c, "goal: Councils", 'no [data-palette-goal="councils"] in the row');
  await goal.evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "center" }));
  await page.waitForTimeout(1200);
  const placeOf = () =>
    page.evaluate(() => {
      const r = document.querySelector(".set-mode-row");
      return r ? { path: location.pathname, top: Math.round(r.getBoundingClientRect().top), swept: Math.round(r.scrollLeft), y: Math.round(scrollY) } : { path: location.pathname };
    });
  let before = await placeOf();
  const sheet = dialogSel(t(c.lang, "settings.paletteCouncils"));
  try {
    await goal.tap({ timeout: 10000 });
  } catch (e) {
    return fail(c, "goal: tap Councils", `could not tap it: ${first(e)}`);
  }
  if (!(await waitShown(page, `${sheet}:has(.earn-sheet-line)`))) return fail(c, "goal: tap Councils", `no dialog with .earn-sheet-line opened (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
  pass(c, "goal: tap Councils", `"${t(c.lang, "settings.paletteCouncils")}" opens with .earn-sheet-line`);
  await page.waitForFunction((s) => document.querySelector(s)?.querySelectorAll(".earn-door").length > 0, sheet, { timeout: 10000 }).catch(() => {});
  await atRest(page, sheet);
  await guard(c, page, sheet, "goal: checkMock the Councils sheet");
  // checkMock wears every palette on <html> in turn, and the row keeps the palette that is on in
  // sight (useThemeWorn follows data-reading-mode and data-look): behind the sheet it moved with
  // each one and ended on Dark at its start. A reader changes nothing there. So the sheet is
  // closed by its own control, the row swept to Councils again as before, and that is the place
  // Back must give back (Updates 32).
  const closed = await closeSheet(page, sheet, c.lang);
  if (!closed.gone) return fail(c, "goal: close the Councils sheet", `closed by ${closed.how}, and it stayed open`);
  pass(c, "goal: close the Councils sheet", `closed by ${closed.how}`);
  await goal.evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "center" }));
  await page.waitForTimeout(1200);
  before = await placeOf();
  try {
    await goal.tap({ timeout: 10000 });
  } catch (e) {
    return fail(c, "goal: tap Councils again", `could not tap it: ${first(e)}`);
  }
  if (!(await waitShown(page, `${sheet}:has(.earn-door)`))) return fail(c, "goal: tap Councils again", "the sheet did not open again");
  await atRest(page, sheet);

  const door = page.locator(`${sheet} .earn-door`).first();
  if (!(await door.count())) return fail(c, "goal: first .earn-door", "the sheet has no doors");
  const href = await door.getAttribute("href");
  try {
    await door.tap({ timeout: 10000 });
  } catch (e) {
    return fail(c, "goal: first .earn-door", `could not tap it: ${first(e)}`);
  }
  await page.waitForFunction(() => /^\/councils\/[^/]+\/$/.test(location.pathname), null, { timeout: 15000 }).catch(() => {});
  const at = await page.evaluate(() => location.pathname);
  const sheetGone = await waitGone(page, sheet, 3000);
  if (!/^\/councils\/[^/]+\/$/.test(at)) fail(c, "goal: first .earn-door", `the URL is ${at} (the door is ${href})`);
  else if (!sheetGone) fail(c, "goal: first .earn-door", `the URL is ${at}, but the sheet is still open over it`);
  else pass(c, "goal: first .earn-door", `the URL is ${at}, the sheet gone`);

  await page.goBack();
  await page.waitForFunction(() => location.pathname === "/settings/", null, { timeout: 15000 }).catch(() => {});
  await page.locator(".set-mode-row").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const after = await placeOf();
  const words = `the row ${after.top ?? "?"}px from the top (was ${before.top}), swept ${after.swept ?? "?"}px (was ${before.swept}), page at ${after.y ?? "?"} (was ${before.y})`;
  if (after.path !== "/settings/") fail(c, "back: Settings with the row where it was", `Back went to ${after.path}`);
  else if (after.top === undefined) fail(c, "back: Settings with the row where it was", "back on /settings/, but no .set-mode-row");
  else if (Math.abs(after.top - before.top) > 4 || Math.abs(after.swept - before.swept) > 4) fail(c, "back: Settings with the row where it was", words);
  else pass(c, "back: Settings with the row where it was", words);
}

// ---- 2. The Reading mode page

async function partModes(c, page) {
  c.screen = "/settings/reading-mode/";
  await go(page, "/settings/reading-mode/", { timeout: 30000 });
  const land = page.locator('[data-family="land"]').first();
  try {
    await land.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    return fail(c, "land: the shelf", 'no [data-family="land"] on the screen');
  }
  await page.waitForTimeout(1200);
  const shelf = await land.evaluate((el) => [...el.querySelectorAll(".set-mode")].map((b) => ({ id: b.querySelector("[data-palette]")?.getAttribute("data-palette"), name: b.querySelector(".set-mode-name")?.textContent?.trim() })));
  const desert = await page.locator('[data-palette="desert"]').count();
  const ids = shelf.map((s) => s.id).join(", ");
  if (ids === "athos, forest, jordan" && desert === 0) pass(c, "land: athos, forest, jordan, no desert", `${shelf.map((s) => `${s.id} (${s.name})`).join(", ")}`);
  else fail(c, "land: athos, forest, jordan, no desert", `the shelf holds ${ids}; desert on the page ${desert} time(s)`);
  await guard(c, page, '[data-family="land"]', 'land: checkMock [data-family="land"]');
  await guard(c, page, "section.set-fam:has([data-palette-goal])", "goals: checkMock the section of [data-palette-goal]");

  // The Cappadocian goal: its sheet, held, and closed by its own control.
  const goal = page.locator('[data-palette-goal="cappadocian"]').first();
  const sheet = dialogSel(t(c.lang, "settings.paletteCappadocian"));
  if (!(await goal.count())) fail(c, "goal: tap Cappadocian", 'no [data-palette-goal="cappadocian"] on the page');
  else {
    let opened = false;
    try {
      await goal.tap({ timeout: 10000 });
      opened = await waitShown(page, `${sheet}:has(.earn-sheet-line)`);
      if (opened) pass(c, "goal: tap Cappadocian", `"${t(c.lang, "settings.paletteCappadocian")}" opens with .earn-sheet-line`);
      else fail(c, "goal: tap Cappadocian", `no dialog with .earn-sheet-line opened (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
    } catch (e) {
      fail(c, "goal: tap Cappadocian", `could not tap it: ${first(e)}`);
    }
    if (opened) {
      await atRest(page, sheet);
      await guard(c, page, sheet, "goal: checkMock the Cappadocian sheet");
      try {
        const { gone, how } = await closeSheet(page, sheet, c.lang);
        if (gone) pass(c, "goal: close the Cappadocian sheet", `closed by ${how}`);
        else fail(c, "goal: close the Cappadocian sheet", `still open after ${how}`);
      } catch (e) {
        fail(c, "goal: close the Cappadocian sheet", first(e));
      }
    }
  }

  // Holy Mountain: say what changes.
  const athos = tileNamed(page, land, c.lang, "settings.paletteHolyMountain");
  try {
    await athos.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const h0 = await htmlState(page);
    const d0 = await visibleDialogs(page);
    await athos.tap({ timeout: 10000 });
    const h1 = await waitHtml(page, { mode: null, look: "athos" }, 3000);
    const d1 = await visibleDialogs(page);
    const newSheet = d1.find((d) => !d0.includes(d));
    if (h1.look === "athos") pass(c, "tap Holy Mountain", `html[data-look] ${h0.look ?? "none"} to athos (data-reading-mode ${h1.mode ?? "none"}); no Plus sheet`);
    else if (newSheet) {
      pass(c, "tap Holy Mountain", `the Plus sheet opened ("${newSheet}"); html[data-look] stays ${h1.look ?? "none"}`);
      await closeSheet(page, dialogSel(newSheet), c.lang).catch(() => {});
    } else fail(c, "tap Holy Mountain", `the tap changed nothing (data-look ${h1.look ?? "none"}, no sheet)`);
  } catch (e) {
    fail(c, "tap Holy Mountain", `could not tap it: ${first(e)}`);
  }
  // And back to Dark, from the first shelf, so the rest of the walk starts where a new reader is.
  const free = page.locator("section.set-fam").first();
  await tapPalette(c, page, tileNamed(page, free, c.lang, "settings.paletteDark"), { mode: null, look: null }, "tap Dark back");
}

// ---- 3. The Bible's own sheet

async function partBible(c, page) {
  c.screen = "/bible/john/1/";
  await go(page, "/bible/john/1/", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const more = page.locator(`button[aria-label="${q(t(c.lang, "bible.moreActions"))}"]`).filter({ visible: true }).first();
  const pill = page.locator(`button[aria-label="${q(t(c.lang, "bible.readerSettings"))}"]`).filter({ visible: true }).first();
  const settingsSheet = dialogSel(t(c.lang, "bible.readerSettings"));
  let how;
  try {
    if (await more.count()) {
      how = `${t(c.lang, "bible.moreActions")}, then ${t(c.lang, "bible.readerSettings")}`;
      await more.tap({ timeout: 10000 });
      await page.waitForTimeout(900);
      const row = page.locator('[role="dialog"] button', { hasText: t(c.lang, "bible.readerSettings") }).filter({ visible: true }).first();
      await row.tap({ timeout: 10000 });
    } else if (await pill.count()) {
      how = `the ${t(c.lang, "bible.readerSettings")} pill`;
      await pill.tap({ timeout: 10000 });
    } else return skip(c, "reader-modes: reach it", "no ••• and no Reader pill at this width, so .reader-modes cannot be reached");
  } catch (e) {
    return fail(c, "reader-modes: reach it", `could not tap ${how}: ${first(e)}`);
  }
  const modes = page.locator(".reader-modes").filter({ visible: true }).first();
  try {
    await modes.waitFor({ state: "visible", timeout: 10000 });
  } catch {
    return fail(c, "reader-modes: reach it", `${how} tapped, but no .reader-modes showed (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
  }
  pass(c, "reader-modes: reach it", `by ${how}`);
  await page.waitForFunction(() => document.querySelector(".reader-modes")?.hasAttribute("data-live"), null, { timeout: 5000 }).catch(() => {});
  await atRest(page, settingsSheet);
  // The one that is seen, named for the measure (a second, unseen one would otherwise be measured first).
  await modes.evaluate((el) => {
    for (const e of document.querySelectorAll("[data-walk-modes]")) e.removeAttribute("data-walk-modes");
    el.setAttribute("data-walk-modes", "");
  });
  await guard(c, page, "[data-walk-modes]", "reader-modes: checkMock .reader-modes");

  const goal = modes.locator('[data-palette-goal="councils"]').first();
  const sheet = dialogSel(t(c.lang, "settings.paletteCouncils"));
  if (!(await goal.count())) return fail(c, "reader-modes: tap Councils", 'no [data-palette-goal="councils"] on the shelf');
  try {
    await goal.tap({ timeout: 10000 });
  } catch (e) {
    return fail(c, "reader-modes: tap Councils", `could not tap it: ${first(e)}`);
  }
  if (!(await waitShown(page, `${sheet}:has(.earn-sheet-line)`))) return fail(c, "reader-modes: tap Councils", `no dialog with .earn-sheet-line opened (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
  pass(c, "reader-modes: tap Councils", `"${t(c.lang, "settings.paletteCouncils")}" opens with .earn-sheet-line`);
  await atRest(page, sheet);
  try {
    const { gone, how: by } = await closeSheet(page, sheet, c.lang);
    const under = (await visibleDialogs(page)).includes(t(c.lang, "bible.readerSettings"));
    if (gone) pass(c, "reader-modes: close the Councils sheet", `closed by ${by}${under ? ", Reader settings still open under it" : ""}`);
    else fail(c, "reader-modes: close the Councils sheet", `still open after ${by}`);
  } catch (e) {
    fail(c, "reader-modes: close the Councils sheet", first(e));
  }
  for (let i = 0; i < 3 && (await visibleDialogs(page)).length; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
}

// ---- 4 and 5. A work's two sheets, and Share

const sharedNow = (page) => page.evaluate(() => window.__shared.slice());

/** Tap the Share row of the open sheet and read what the phone's sheet was handed. */
async function shareFrom(c, page, sel, part, own, { hash }) {
  const row = page.locator(`${sel} [data-share-work]`).filter({ visible: true }).first();
  if (!(await row.count())) return fail(c, part, "no [data-share-work] in the sheet");
  const n = (await sharedNow(page)).length;
  try {
    await row.tap({ timeout: 10000 });
  } catch (e) {
    return fail(c, part, `could not tap it: ${first(e)}`);
  }
  await page.waitForFunction((k) => window.__shared.length > k, n, { timeout: 5000 }).catch(() => {});
  const got = (await sharedNow(page)).slice(n)[0];
  const closed = await waitGone(page, sel, 2500);
  if (!got) return fail(c, part, "the tap shared nothing (navigator.share was not called)");
  const url = got.url ?? "";
  const words = `${url} ("${got.text}")${closed ? ", the sheet closed" : ", the sheet stayed open"}`;
  if (!url.startsWith("https://purifyapp.net/")) return fail(c, part, `the link is not on https://purifyapp.net/: ${words}`);
  const pathOf = new URL(url).pathname.replace(/\/$/, "");
  if (pathOf !== own.replace(/\/$/, "")) return fail(c, part, `the link does not name this work: ${words}`);
  if (hash === "none" && new URL(url).hash) return fail(c, part, `the contents shares the work, but the link names a part: ${words}`);
  if (hash === "part" && !/^#s\d+$/.test(new URL(url).hash)) return fail(c, part, `the link names no part being read: ${words}`);
  pass(c, part, words);
}

async function partSheets(c, page, at) {
  c.screen = at;
  await go(page, at, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const several = await page.locator("[data-title-contents], [data-pill-name]").count();

  // The ••• sheet.
  const more = page.locator(`button[aria-label="${q(t(c.lang, "bible.moreActions"))}"]`).filter({ visible: true }).first();
  if (!(await more.count())) skip(c, "•••: open the sheet", "no ••• at this width");
  else {
    let sel = null;
    try {
      await more.tap({ timeout: 10000 });
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some((d) => d.getClientRects().length && d.querySelector("[data-share-work]")), null, { timeout: 10000 });
      const label = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].find((d) => d.getClientRects().length && d.querySelector("[data-share-work]"))?.getAttribute("aria-label"));
      sel = dialogSel(label);
      pass(c, "•••: open the sheet", `"${label}", with a Share row`);
    } catch (e) {
      fail(c, "•••: open the sheet", `no sheet with [data-share-work] opened: ${first(e)} (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
    }
    if (sel) {
      await atRest(page, sel);
      await guard(c, page, sel, "•••: checkMock the sheet");
      await shareFrom(c, page, sel, "•••: tap Share", at, { hash: several ? "part" : "none" });
      if (!(await waitGone(page, sel, 500))) await closeSheet(page, sel, c.lang).catch(() => {});
    }
  }

  // The contents.
  const opener = page.locator("[data-title-contents], [data-pill-name]").filter({ visible: true }).first();
  if (!(await opener.count())) return skip(c, "contents: open the sheet", "no title or pill opens the contents at this width");
  let sel = null;
  try {
    await opener.tap({ timeout: 10000 });
    await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some((d) => d.getClientRects().length && d.querySelector("[data-work-contents]")), null, { timeout: 10000 });
    const label = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].find((d) => d.getClientRects().length && d.querySelector("[data-work-contents]"))?.getAttribute("aria-label"));
    sel = dialogSel(label);
    pass(c, "contents: open the sheet", `"${label}"`);
  } catch (e) {
    return fail(c, "contents: open the sheet", `no contents opened: ${first(e)} (dialogs: ${JSON.stringify(await visibleDialogs(page))})`);
  }
  await atRest(page, sel);
  await guard(c, page, sel, "contents: checkMock the sheet");
  await shareFrom(c, page, sel, "contents: tap Share", at, { hash: "none" });
  if (!(await waitGone(page, sel, 500))) await closeSheet(page, sel, c.lang).catch(() => {});
}

/** #s102, opened from another screen as a link to it is: Conference 5, Chapter 10. */
async function partPlace(c, page) {
  c.screen = `${WORK}#s102`;
  await go(page, "/settings/", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await go(page, `${WORK}#s102`, { timeout: 30000 });
  await page.waitForFunction(() => /\S/.test(document.querySelector("[data-work-reader] h1")?.innerText ?? ""), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const seen = await page.evaluate(() => ({
    h1: (document.querySelector("[data-work-reader] h1")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    pill: (document.querySelector("[data-pill-name]")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    hash: location.hash,
  }));
  // Digits as the page writes them, read as Western ones.
  const west = (s) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const says = west(`${seen.h1} | ${seen.pill}`);
  if (/\b5\b[^|]*\b10\b/.test(west(seen.h1)) || /\b5\b\D+\b10\b/.test(west(seen.pill))) pass(c, "#s102 opens Conference 5, Chapter 10", `the head says "${seen.h1}", the pill "${seen.pill}"`);
  else fail(c, "#s102 opens Conference 5, Chapter 10", `the page says ${says} (address ${seen.hash})`);
}

// ---- 6. The land looks, as a device stored them

async function partLooks(c, page) {
  c.screen = "/bible/john/1/";
  for (const [stored, want] of LAND_STORED) {
    try {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [READING_THEME_KEY, stored]);
      // The app started again, as a phone opens it: the stored palette is read afresh.
      await page.goto("https://localhost/", { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout: 30000 });
      await go(page, "/bible/john/1/", { timeout: 30000 });
      await page.waitForTimeout(2500);
      const h = await htmlState(page);
      const words = `stored "${stored}": data-look ${h.look ?? "none"}, data-reading-mode ${h.mode ?? "none"}`;
      if (h.look === want) pass(c, `look: stored ${stored} wears ${want}`, words);
      else fail(c, `look: stored ${stored} wears ${want}`, words);
    } catch (e) {
      fail(c, `look: stored ${stored} wears ${want}`, first(e));
    }
  }
  await page.evaluate((k) => localStorage.removeItem(k), READING_THEME_KEY).catch(() => {});
}

// ---- the walk

/** One language at one width, in a fresh context: every part, in order. */
async function walk(lang, size) {
  const c = { lang, width: size[0], screen: "-" };
  console.log(`\n${lang} at ${size[0]}: begins`);
  const { ctx, page, errors } = await open(lang, size);
  const steps = {
    settings: () => partSettings(c, page),
    modes: () => partModes(c, page),
    bible: () => partBible(c, page),
    work: async () => {
      await partSheets(c, page, WORK);
      await partPlace(c, page);
    },
    council: () => partSheets(c, page, COUNCIL_DOC),
    looks: () => partLooks(c, page),
  };
  for (const part of PARTS) {
    try {
      await steps[part]();
    } catch (e) {
      fail(c, `${part}: the walk stopped`, first(e));
    }
    // Each part starts with no sheet open.
    for (let i = 0; i < 3 && (await visibleDialogs(page).catch(() => [])).length; i++) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  c.screen = "(every screen)";
  if (errors.length) fail(c, "no page errors", `${errors.length}: ${errors.slice(0, 2).join(" | ")}`);
  else pass(c, "no page errors", "");
  await ctx.close();
}

const started = Date.now();
console.log(`Updates 26 on the export: ${LANGS.join(" and ")} at ${SIZES.map(([w]) => w).join(", ")}; ${PARTS.join(", ")}; checkMock on ${ALL.length} palettes and looks, with pixels; ${JOBS} walk(s) at a time.`);
const queue = LANGS.flatMap((lang) => SIZES.map((size) => [lang, size]));
await Promise.all(
  Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) {
      const [lang, size] = queue.shift();
      await walk(lang, size);
    }
  }),
);
await browser.close();

const count = (s) => results.filter((r) => r.status === s).length;
const secs = Math.round((Date.now() - started) / 1000);
const order = (r) => `${LANGS.indexOf(r.lang)}-${String(r.width).padStart(5, "0")}`;
const recap = results.filter((r) => r.status !== "PASS").sort((a, b) => order(a).localeCompare(order(b)));
if (recap.length) {
  console.log("\nEvery FAIL and SKIP, by language and width:");
  for (const r of recap) console.log(`= ${r.status}  ${r.screen}  |  ${r.part}  |  ${r.lang}  |  ${r.width}${r.words ? `  |  ${r.words}` : ""}`);
}
console.log(`\nTOTAL: ${results.length} checks, ${count("PASS")} PASS, ${count("FAIL")} FAIL, ${count("SKIP")} SKIP; ${Math.floor(secs / 60)}m ${secs % 60}s`);
process.exit(count("FAIL") ? 1 : 0);
