// Walks the native export the way the apps run it. Run after
// scripts/native-build.mjs and before out/ is removed:
//   node scripts/export-walk.mjs [out dir] [--sections 33,37-42] [--from 39]
//
// With no choice it walks every section. --sections (or WALK_SECTIONS, the
// same list) walks the sections named, and --from N walks N and every section
// after it; both may be given. Section 11 counts the documents opened by the
// sections walked before it, so it means most in a whole walk.
//
// The bundle is answered the way the phones' shells answer it
// (scripts/lib/shell-server.mjs): any address without a file extension gets
// the front door's document, a file is a file, and nothing outside the bundle
// answers at all, so this is also the app with no network. Every screen is
// reached the app's way: a cold start at the front door, then the router. No
// server is started. It exits 1 if a check fails. Screenshots go to
// .release-logs/walk/.
//
// Until 1.5.2 this served out/ like a web host and opened each page's own
// index.html, which no phone has ever done. The phone contexts carry the
// shell's user agent now, so what is walked is the app's screen and not the
// website's drawn at a phone's width.
//
// Add a check here when a page learns to fetch something it used to carry
// (AGENTS.md, "A page carries what it shows").
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { IPAD_UA, NATIVE_UA, ORIGIN, go, inBundle, payloadBytes, serveLikeTheShell } from "./lib/shell-server.mjs";
import { englishOutOfPlace } from "./rtl-walk.mjs";
import { LONG_HEADING_LANGUAGES, LONG_HEADING_PAGES } from "../lib/ui/longHeadings.ts";

const argv = process.argv.slice(2);
/** The value after a flag, taken out of the arguments so the out dir is what is left. */
const option = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a value`);
  argv.splice(i, 2);
  return value;
};
const sectionList = option("--sections") ?? process.env.WALK_SECTIONS ?? "";
const fromSection = option("--from");
if (fromSection !== undefined && !/^\d+$/.test(fromSection)) throw new Error(`--from takes a section number, not "${fromSection}"`);
const picked = new Set();
for (const part of sectionList.split(",").map((s) => s.trim()).filter(Boolean)) {
  const m = /^(\d+)(?:-(\d+))?$/.exec(part);
  if (!m) throw new Error(`--sections takes numbers and ranges such as 33,37-42, not "${part}"`);
  for (let n = Number(m[1]); n <= Number(m[2] ?? m[1]); n++) picked.add(n);
}
const everySection = picked.size === 0 && fromSection === undefined;
const chosen = (n) => everySection || picked.has(n) || (fromSection !== undefined && n >= Number(fromSection));

const OUT = path.resolve(argv[0] ?? "out");
const SHOTS = path.resolve(".release-logs/walk");
fs.mkdirSync(SHOTS, { recursive: true });

// A machine whose browser is not the one this Playwright downloads (a cloud
// session's /opt/pw-browsers/chromium) names it in PW_CHROMIUM.
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
/** Every document any context asked for, and any page's own .html: section 11 reads them. */
const everyDocument = [];
const everyPageFile = [];
async function open({ width, height, phone, set = {}, locale, userAgent = NATIVE_UA }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, colorScheme: "dark", ...(locale ? { locale } : {}), ...(phone ? { isMobile: true, hasTouch: true, userAgent } : {}) });
  await ctx.addInitScript((values) => { for (const [k, v] of Object.entries(values)) window.localStorage.setItem(k, v); }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...set });
  const log = await serveLikeTheShell(ctx, OUT, { documents: everyDocument, pageFiles: everyPageFile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  return { ctx, page, asked: log.asked, missing: log.missing, errors };
}
const data = (asked) => asked.filter((p) => p.startsWith("/bible-data/"));
const say = (label, value) => console.log(`${label}: ${value}`);
let failed = 0;
const must = (ok, text) => { if (!ok) failed++; console.log(`${ok ? "  ok  " : "  NO  "}${text}`); };
const firstLine = (e) => String(e?.message ?? e).split("\n")[0];

/**
 * One section of the walk, if it was chosen. Whatever throws inside it is a NO
 * that names the section, the contexts it left open are closed, and the walk
 * goes on to the next: in 1.7 one missing link in section 38 threw out of the
 * whole walk, and sections 39 to 42 never ran.
 */
const walked = [];
async function section(n, run) {
  if (!chosen(n)) return;
  walked.push(n);
  try {
    await run();
  } catch (e) {
    must(false, `section ${n} stopped here: ${firstLine(e)}`);
    for (const c of browser.contexts()) await c.close().catch(() => {});
  }
}

// The releases build the apps with the shop and Community on
// (.github/workflows/android-apk.yml and ios-release.yml). An export built
// without NEXT_PUBLIC_SHOP_ENABLED still carries the shop's pages, each one
// Next's 404, so the shop's checks fail one by one in sections with nothing
// wrong in them (2026-11-07: nine NOs from the one missing flag, section 10
// included, whose own test for a shop left out looks for the pages, and they
// are there). Said once, first, with what to set.
const builtAsNotFound = (page) => {
  const file = path.join(OUT, page, "index.txt");
  return fs.existsSync(file) && fs.readFileSync(file, "utf8").includes("NEXT_HTTP_ERROR_FALLBACK;404");
};
const shopOff = builtAsNotFound("/shop/");
must(
  !shopOff,
  `the export was built as the releases build it, with the shop on${shopOff ? ": it was built without NEXT_PUBLIC_SHOP_ENABLED=1, so every page of the shop is a 404 and the shop's checks below fail with it; build it again with NEXT_PUBLIC_SHOP_ENABLED=1 NEXT_PUBLIC_COMMUNITY_ENABLED=1" : ""}`,
);

/**
 * A tap that cannot end the walk. A locator's own tap waits for its target and
 * then throws; this one says NO, naming what it could not tap, and the walk
 * goes on with the next step. It answers whether the tap was made.
 */
async function tap(locator, { timeout = 15000 } = {}) {
  try {
    await locator.tap({ timeout });
    return true;
  } catch (e) {
    must(false, `could not tap ${locator}: ${firstLine(e)}`);
    return false;
  }
}

// The export writes every address with a closing slash (next.config.ts,
// trailingSlash), and so does every Link in it: "/walkthroughs/job" in the
// source is "/walkthroughs/job/" in the apps, and "/reading?theme=pascha" is
// "/reading/?theme=pascha". bare() gives an address as the source writes it,
// and linkTo() is a selector for a link to it in either form.
const bare = (href) => String(href ?? "").replace(/(.)\/(?=$|[?#])/, "$1");
const slashed = (href) => (href.startsWith("/") ? href.replace(/^([^?#]*?)\/?(?=[?#]|$)/, "$1/") : href);
const linkTo = (href) => `a:is([href="${bare(href)}"], [href="${slashed(bare(href))}"])`;

/**
 * How much lighter the curve of a round box's corners is than the box just
 * inside it, or than the page beside it, in levels of light (0 to 255). A
 * layer laid over a picture in a round box is clipped to the curve on its
 * own, so where the curve only partly covers a pixel it covers only part of
 * what the picture put there, and a hairline of the picture shows round the
 * corner: the owner's build 80 note 1 on Discover's bands (section 25), and
 * the same line on the Bible and You mastheads and Today's readings band.
 * `corners` are "top-start", "bottom-end" and so on, so a page that reads
 * right to left is measured on its own start. The box must be whole on the
 * screen.
 *
 * Read along the whole curve, not at its lightest pixel: the line runs along
 * every pixel the curve partly covers, while where a picture still shows
 * through, a speck of its own (the You plate has one beside its foot corner,
 * square corners or round) is one pixel. So the answer is the lift that a
 * tenth of the curve's pixels reach, with the lightest beside it, and each
 * corner's own. 1.8's markup, drawn in this Chromium with the real pictures
 * on the five everyday palettes: the mastheads 11 to 31 levels, the readings
 * band 15 to 17, and with the line gone 2 at most.
 */
async function cornerLift(page, selector, corners) {
  const { default: sharp } = await import("sharp");
  const b = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      radius: parseFloat(css.borderTopLeftRadius) || 0,
      rtl: css.direction === "rtl",
      whole: r.top >= 4 && r.left >= 4 && r.bottom <= innerHeight - 4 && r.right <= innerWidth - 4,
    };
  }, selector);
  if (!b || !b.radius || !b.whole) throw new Error(`${selector} is ${!b ? "not on the page" : !b.radius ? "not round" : "not whole on the screen"}`);
  const pad = 3;
  const clip = { x: Math.floor(b.left) - pad, y: Math.floor(b.top) - pad, width: Math.ceil(b.width) + 2 * pad, height: Math.ceil(b.height) + 2 * pad };
  const { data, info } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = info.width / clip.width;
  const at = (x, y) => (Math.min(info.height - 1, Math.max(0, Math.round(y))) * info.width + Math.min(info.width - 1, Math.max(0, Math.round(x)))) * info.channels;
  const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const R = b.radius * s;
  const x0 = (b.left - clip.x) * s;
  const y0 = (b.top - clip.y) * s;
  const each = {};
  let most = -Infinity;
  for (const corner of corners) {
    const [edge, side] = corner.split("-");
    const up = edge === "top";
    const left = (side === "start") !== b.rtl;
    const cx = left ? x0 + R : x0 + b.width * s - R;
    const cy = up ? y0 + R : y0 + b.height * s - R;
    // The page beside the box on that side, halfway down it.
    const ground = lum(at(left ? 1 : info.width - 2, info.height / 2));
    const lifts = [];
    for (let y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R + 1); y++) {
      for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        // The corner's own quarter.
        if ((left ? dx > 0 : dx < 0) || (up ? dy > 0 : dy < 0)) continue;
        const d = Math.hypot(dx, dy);
        // The curve's own pixels, the ones it only partly covers.
        if (d < R - 1 || d > R + 0.5) continue;
        // The box just inside: the lightest pixel near the same ray, 2 to 4px in.
        let inside = 0;
        for (const t of [2, 3, 4]) {
          const k = (R - t * s) / d;
          for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) inside = Math.max(inside, lum(at(cx + dx * k - 0.5 + ox, cy + dy * k - 0.5 + oy)));
        }
        lifts.push(lum(at(x, y)) - Math.max(inside, ground));
      }
    }
    if (!lifts.length) throw new Error(`${selector} has no curve at its ${corner} corner`);
    lifts.sort((p, q) => p - q);
    each[corner] = Math.round(lifts[Math.floor(lifts.length * 0.9)]);
    most = Math.max(most, lifts.at(-1));
  }
  return { lift: Math.max(...Object.values(each)), most: Math.round(most), each };
}

// ---- 1. A phone, the Greek off: the page is its verses and asks for nothing more.
await section(1, async () => {
  const { ctx, page, asked, missing, errors } = await open({ width: 390, height: 844, phone: true });
  const t0 = Date.now();
  await go(page, "/bible/john/1/");
  // A loaded machine can take seconds to draw the reader. Wait for the verse
  // itself, up to twenty seconds, and only then judge the page.
  await page.waitForFunction(() => document.body.innerText.includes("In the beginning was the Word"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  console.log("\n1. John 1 on a phone, Greek off");
  const verses = await page.locator("[data-verse], [id^='v']").count();
  const text = await page.evaluate(() => document.body.innerText);
  must(text.includes("In the beginning was the Word"), "the first verse is on the page");
  must(data(asked).length === 0, `no chapter file asked for (asked: ${data(asked).join(", ") || "none"})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  say("  verse elements", verses);
  say("  payload bytes", payloadBytes(OUT, "/bible/john/1/"));
  say("  cold start and the way there, ms (local files)", Date.now() - t0 - 2500);
  await page.screenshot({ path: path.join(SHOTS, "john1-phone.png") });

  // Open a verse's commentary: the sheet opens and the file is read then.
  const mark = page.locator("button[aria-label*='ommentary'], button[title*='ommentary']").first();
  const marks = await page.locator("button[aria-label*='ommentary'], button[title*='ommentary']").count();
  say("  commentary marks", marks);
  if (marks) {
    await tap(mark);
    await page.waitForTimeout(1800);
    must(data(asked).includes("/bible-data/commentary/john/1.json"), "opening a verse's commentary reads the commentary file");
    const sheet = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); return d ? d.innerText.replace(/\n+/g, " ").slice(0, 160) : ""; });
    must(sheet.length > 40, `the sheet shows the Fathers: "${sheet.slice(0, 110)}"`);
    await page.screenshot({ path: path.join(SHOTS, "john1-commentary-sheet.png") });
  } else must(false, "found a commentary mark to tap");
  say("  missing files", missing.filter((m) => !m.includes("favicon")).slice(0, 5).join(", ") || "none");
  await ctx.close();
});

// ---- 2. A phone, the Greek on: the Greek and the lexicon are read, and a word opens.
await section(2, async () => {
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify:interlinear": "1" } });
  await go(page, "/bible/john/1/");
  // As in section 4: wait for the Greek itself, not for three seconds.
  await page.waitForFunction((want) => document.body.innerText.normalize("NFC").includes(want), "Ἐν ἀρχῇ".normalize("NFC"), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log("\n2. John 1 on a phone, Greek on");
  must(data(asked).includes("/bible-data/interlinear/john/1.json"), "the chapter's Greek is read");
  must(data(asked).includes("/bible-data/strongs.json"), "the lexicon is read");
  const text = await page.evaluate(() => document.body.innerText.normalize("NFC"));
  must(text.includes("Ἐν ἀρχῇ".normalize("NFC")), "the Greek is on the page");
  await page.screenshot({ path: path.join(SHOTS, "john1-greek-phone.png") });
  // Tap the Greek word for "Word": its entry opens from the shared lexicon.
  const tapped = await page.evaluate(() => {
    const want = "Λόγος".normalize("NFC");
    const el = [...document.querySelectorAll("span, button")].find((e) => e.children.length === 0 && (e.textContent || "").normalize("NFC").replace(/[.,;·]/g, "").trim() === want);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  });
  if (tapped) {
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => document.body.innerText.normalize("NFC"));
    must(/λόγος/.test(after) || /logos/i.test(after), "tapping a Greek word shows its lexicon entry");
    await page.screenshot({ path: path.join(SHOTS, "john1-word.png") });
  } else must(false, "found the Greek word to tap");

  // On to the next chapter the way the app goes: its Greek follows.
  const before = data(asked).length;
  await go(page, "/bible/john/2/");
  await page.waitForTimeout(2500);
  must(data(asked).slice(before).includes("/bible-data/interlinear/john/2.json"), "the next chapter reads its own Greek");
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 3. A computer's width: the study rail reads the commentary and draws it.
await section(3, async () => {
  const { ctx, page, asked, errors } = await open({ width: 1366, height: 900, phone: false });
  await go(page, "/bible/john/1/");
  await page.waitForTimeout(3000);
  console.log("\n3. John 1 at a computer's width");
  must(data(asked).includes("/bible-data/commentary/john/1.json"), "the rail reads the commentary file");
  const rail = await page.evaluate(() => { const a = [...document.querySelectorAll("aside")].find((x) => /PATRISTIC/i.test(x.innerText)); return a ? a.innerText.replace(/\n+/g, " ").slice(0, 200) : ""; });
  must(/CHRYSOSTOM|AUGUSTINE|CYRIL|ORIGEN|BASIL|THEOPHYLACT/i.test(rail), `the rail names the Fathers: "${rail.slice(0, 120)}"`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.screenshot({ path: path.join(SHOTS, "john1-desktop.png") });
  // The files a Plus reader's cross-references come from are in the bundle.
  const refs = await page.evaluate(async () => { const r = await fetch("/bible-data/crossrefs/john/1.json"); return r.ok ? Object.keys(await r.json()).length : 0; });
  must(refs > 10, `the cross-reference file is in the bundle (${refs} verses)`);
  await ctx.close();
});

// ---- 4. An Old Testament chapter with Greek, and a chapter with no commentary.
await section(4, async () => {
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify:interlinear": "1" } });
  await go(page, "/bible/genesis/1/");
  // The Greek is read from a file after the chapter is drawn. On a loaded
  // machine three seconds was not always enough (2026-10-13: the file had
  // been read and was not yet drawn). Wait for the word itself.
  await page.waitForFunction(() => /ἐποίησεν/.test(document.body.innerText.normalize("NFC")), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log("\n4. Genesis 1 on a phone, Greek on");
  const text = await page.evaluate(() => document.body.innerText.normalize("NFC"));
  must(data(asked).includes("/bible-data/interlinear/genesis/1.json"), "the Septuagint's Greek is read");
  must(/ἐποίησεν/.test(text), "the Septuagint's Greek is on the page");
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 5. A long work of the Fathers: the page is light and the work is read from its file.
await section(5, async () => {
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  const work = "/saints/gregory-the-dialogist/morals-on-the-book-of-job/";
  await go(page, work);
  await page.waitForTimeout(4000);
  console.log("\n5. St. Gregory's Morals on Job on a phone");
  const payload = payloadBytes(OUT, work);
  must(payload > 0 && payload < 300_000, `the page is light (${Math.round(payload / 1024)} KB of payload; before 1.5.1 it was 4.2 MB)`);
  must(asked.includes("/saints-data/gregory-the-dialogist/morals-on-the-book-of-job.json"), "the work is read from its file");
  // Since 1.8's round 6 (r3-29 A) a work reads as the Bible does: one book
  // on the page at a time, "Book 1" where the Bible's book stands and the
  // work under it, its text there to read; the contents (the pill's name)
  // hold all 35, and a book chosen turns the page.
  const text = await page.evaluate(() => document.body.innerText);
  const head = () => page.evaluate(() => document.querySelector("[data-work-head] h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "");
  const first = await head();
  must(/^Book 1\b/.test(first) && /Morals on the Book of Job/i.test(first) && text.length > 20000, `the reader is drawn, Book 1 on its own page ("${first}", ${text.length} characters on the page)`);
  await tap(page.locator("[data-work-pill] [data-pill-name]"));
  await page.waitForTimeout(900);
  const cells = await page.locator("[data-work-contents] button[aria-label]").count();
  must(cells === 35, `the contents hold all 35 books (${cells})`);
  await tap(page.locator("[data-work-contents] button", { hasText: /^35$/ }).first());
  await page.waitForTimeout(1500);
  const last = await head();
  must(/^Book 35\b/.test(last), `a book chosen turns the page ("${last}")`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.screenshot({ path: path.join(SHOTS, "morals-phone.png") });
  await ctx.close();
});
await section(6, async () => {
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/saints/athanasius-the-great/on-the-incarnation/");
  await page.waitForTimeout(3500);
  console.log("\n6. St. Athanasius, On the Incarnation, on a phone");
  must(asked.includes("/saints-data/athanasius-the-great/on-the-incarnation.json"), "the work is read from its file");
  const text = await page.evaluate(() => document.body.innerText);
  must(/Incarnation/i.test(text) && text.length > 1500, `the reader is drawn (${text.length} characters on the page)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 7. The Saints tab: every saint is listed, and the page no longer carries the registry twice.
await section(7, async () => {
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/saints/");
  await page.waitForTimeout(3000);
  console.log("\n7. The Saints tab on a phone");
  const payload = payloadBytes(OUT, "/saints/");
  must(payload > 0 && payload < 150_000, `the page is light (${Math.round(payload / 1024)} KB of payload; the registry it was once handed was 455 KB on its own)`);
  const cards = await page.locator("a[href^='/saints/']").count();
  must(cards > 150, `the saints are listed (${cards} links to a saint)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.screenshot({ path: path.join(SHOTS, "saints-phone.png") });
  await ctx.close();
});

// ---- 8. Nothing is wider than the phone (1.5.2).
// A box that reaches past the right edge makes a phone grow the whole page to
// hold it, which a reader sees as the screen zoomed in and sliding sideways.
// It came back three times before this was measured: a saint's "?" box, the
// Fathers' reader's top bar, and the reader settings pill before them.
// app/globals.css now clips the page so it cannot grow, which also means
// scrollWidth can no longer be the test: this looks for the box itself. A box
// inside its own sideways scroller, or inside something fixed (a drawer
// parked off screen), is not one.
const sticksOut = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    let held = false;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.position === "fixed" || s.visibility === "hidden") { held = true; break; }
      if (p !== el && /(auto|scroll|hidden|clip)/.test(s.overflowX)) { held = true; break; }
    }
    if (held) continue;
    out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
  }
  return out.slice(0, 4);
};
await section(8, async () => {
  console.log("\n8. Nothing is wider than the phone");
  const pages = ["/", "/prayers/", "/bible/", "/bible/john/1/", "/discover/", "/reading/", "/saints/", "/saints/john-chrysostom/", "/saints/john-chrysostom/on-the-priesthood/", "/saints/athanasius-the-great/on-the-incarnation/", "/saints/gregory-the-dialogist/morals-on-the-book-of-job/", "/community/", "/shop/", "/calendar/", "/settings/", "/whats-new/", "/start/", "/start/first-liturgy/", "/walkthroughs/", "/walkthroughs/job/", "/walkthroughs/job/1/"];
  // A page that is not in the export is named, not passed over in silence.
  // The first 1.5.2 export was built without the shop's settings and had no
  // shop at all, and this section read as all green.
  for (const p of pages) if (!inBundle(OUT, p)) console.log(`  ..  ${p} is not in this export, so it was not looked at`);
  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page } = await open({ ...size, phone: true });
    for (const p of pages) {
      if (!inBundle(OUT, p)) continue;
      await go(page, p);
      await page.waitForTimeout(1800);
      const out = await page.evaluate(sticksOut);
      must(out.length === 0, `${p} at ${size.width}px${out.length ? ": " + out.join(" | ") : ""}`);
    }
    await ctx.close();
  }
  // And with the things a reader opens: the saint's explainer, the search.
  const { ctx, page } = await open({ width: 360, height: 740, phone: true });
  await go(page, "/saints/john-chrysostom/");
  await page.waitForTimeout(2000);
  // The explainer is a round "i" from 1.7, a drawn icon with no words on it.
  const explain = page.locator("[data-saint-explainer]").first();
  if (await explain.count()) {
    await explain.scrollIntoViewIfNeeded();
    await tap(explain);
    await page.waitForTimeout(900);
    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `a saint's explainer, open${out.length ? ": " + out.join(" | ") : ""}`);
    // A sheet's panel is the dialog's last child. Since 1.7 the shared sheet
    // (components/ui/Sheet.tsx) stands it in a box of display: contents, whose
    // own box is 0 by 0, and that 0..0 once passed here for "inside the
    // screen". So a box of display: contents is looked through, here and in
    // section 33.
    const sheet = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      if (!d) return null;
      let p = d.lastElementChild;
      while (p && getComputedStyle(p).display === "contents") p = p.lastElementChild;
      const r = p.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth };
    });
    must(Boolean(sheet) && sheet.right > sheet.left && sheet.left >= 0 && sheet.right <= sheet.vw, `the explainer is a sheet inside the screen (${sheet ? sheet.left + ".." + sheet.right + " of " + sheet.vw : "no dialog"})`);
    await page.screenshot({ path: path.join(SHOTS, "saint-explainer-phone.png") });
  } else must(false, "found the saint's explainer to open");
  await go(page, "/saints/john-chrysostom/on-the-priesthood/");
  await page.waitForTimeout(2500);
  const bar = await page.evaluate(() => { const b = document.querySelector("[data-mobile-topbar]"); if (!b) return null; const r = b.getBoundingClientRect(); const last = b.lastElementChild.getBoundingClientRect(); return { right: Math.round(last.right), vw: innerWidth, bar: Math.round(r.right) }; });
  must(Boolean(bar) && bar.right <= bar.vw, `a work's top bar ends inside the screen (${bar ? bar.right + " of " + bar.vw : "no bar"})`);
  await page.screenshot({ path: path.join(SHOTS, "work-topbar-phone.png") });
  await ctx.close();
});

// ---- 9. Forward opens at the top; back returns the reader to their place (1.5.2).
// From the saints list scrolled far down, a saint used to open at the foot of
// their page (lib/ui/scrollReset.ts has the measurements and the cause).
//
// And coming back used to be judged by the page's scroll number, which the
// browser does restore. It is not the reader's place: the list comes back as
// placeholders, shorter than the cards the reader had scrolled past, so the
// same number is a different saint. Measured on the 1.5.2 export before the
// fix, with every card on the way drawn as a thumb draws them: 20 saints
// down, the saint that was opened came back 1,400px above where it had been;
// 40 down, 3,022px; 80 down, 5,882px. So this scrolls there the way a reader
// does, and asks where the tapped saint IS on the screen afterwards
// (lib/ui/returnPlace.ts).
await section(9, async () => {
  console.log("\n9. Forward opens at the top; back returns the reader to their place");
  const { ctx, page } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/saints/");
  await page.waitForTimeout(2500);
  // A thumb on the page, off any link: a reader's first touch is what hands
  // scroll anchoring back after a page has arrived.
  await page.touchscreen.tap(195, 140);
  await page.waitForTimeout(300);
  const links = page.locator("a[href^='/saints/']:visible");
  const n = await links.count();
  const link = links.nth(Math.min(40, Math.max(0, n - 1)));
  const href = await link.getAttribute("href");
  // Screen by screen, slowly enough that each card on the way is drawn.
  for (let i = 0; i < 400; i++) {
    const top = await link.evaluate((el) => el.getBoundingClientRect().top);
    if (top < 420) break;
    await page.evaluate((d) => window.scrollBy(0, d), Math.min(500, Math.round(top - 300)));
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(700);
  await page.evaluate((d) => window.scrollBy(0, d), Math.round((await link.evaluate((el) => el.getBoundingClientRect().top)) - 300));
  await page.waitForTimeout(600);
  const place = () => page.evaluate((h) => { const el = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === h && a.getClientRects().length > 0); return { y: Math.round(window.scrollY), top: el ? Math.round(el.getBoundingClientRect().top) : null, path: location.pathname }; }, href);
  const from = await place();
  await tap(link);
  await page.waitForTimeout(2600);
  const at = await page.evaluate(() => ({ y: Math.round(window.scrollY), path: location.pathname }));
  must(from.y > 1500, `the list was scrolled well down first (${from.y}px, the saint ${from.top}px from the top of the screen)`);
  must(at.path !== "/saints/" && at.y < 8, `the saint opened at the top (scrolled ${at.y}px, on ${at.path})`);
  await page.goBack();
  await page.waitForTimeout(2200);
  const back = await place();
  must(back.path === "/saints/", `going back is the list again (${back.path})`);
  must(back.top !== null && from.top !== null && Math.abs(back.top - from.top) <= 40, `and the saint that was opened is where the thumb left it (${back.top}px from the top, was ${from.top}px; the page's scroll is ${back.y}px, was ${from.y}px)`);
  await ctx.close();
});

// ---- 10. The shop's bar marks where the reader is (1.5.2).
// The export writes every address with a closing slash, so the shop's front
// page is "/shop/" here and "/shop" on the website. The bar compared the
// address with "/shop" exactly, so in the apps it stood with no tab marked on
// the one shop screen every reader opens first. The website never showed it.
// Skipped when the export was built with the shop off.
await section(10, async () => {
  console.log("\n10. The shop's bar marks where the reader is");
  if (!inBundle(OUT, "/shop/")) {
    console.log("  ..  /shop/ is not in this export (built with the shop off), so its bar was not looked at");
    return;
  }
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  const current = () =>
    page.evaluate(() => {
      const bar = [...document.querySelectorAll("nav")].find((n) => n.getAttribute("aria-label") === "Shop sections");
      if (!bar) return null;
      return [...bar.querySelectorAll('a[aria-current="page"]')].map((a) => (a.textContent || "").trim());
    });
  await go(page, "/shop/");
  await page.waitForTimeout(2000);
  const home = await current();
  must(Boolean(home), "the shop's bar is drawn");
  must(Boolean(home) && home.length === 1 && home[0] === "Explore", `on /shop/ the current tab is Explore (${home ? home.join(", ") || "none" : "no bar"})`);
  if (inBundle(OUT, "/shop/category/all/")) {
    await go(page, "/shop/category/all/");
    await page.waitForTimeout(2000);
    const browsing = await current();
    must(Boolean(browsing) && browsing.length === 1 && browsing[0] === "Explore", `browsing a category keeps Explore current (${browsing ? browsing.join(", ") || "none" : "no bar"})`);
  }
  if (inBundle(OUT, "/shop/orders/")) {
    await go(page, "/shop/orders/");
    await page.waitForTimeout(2000);
    const orders = await current();
    must(Boolean(orders) && orders.length === 1 && orders[0] === "Orders", `on /shop/orders/ the current tab is Orders (${orders ? orders.join(", ") || "none" : "no bar"})`);
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 12. The apps select nothing by themselves, and a hold copies (1.5.2).
// The owner, of holding the screen in the app and moving: "the screen turns
// blue. I want you to remove that feature so there's a native system built
// into the app. Where when you copy anything, it uses our system." So in the
// shells the system's selection is off (app/globals.css), a verse's own tools
// carry Copy, and a hold on any other text offers Copy for the block under
// the finger (components/native/PressToCopy.tsx). Numbered 12 and run before
// 11, which counts every document the walk opened and so comes last. From 1.9
// (the owner's pick B of 2026-11-06) a verse's tools were its strip under the
// verse; from his pick C of 2026-11-08 they are its focus, the verse lifted
// into a card over the page (components/bible/VerseFocus.tsx), and never the
// pill over the tab bar.
await section(12, async () => {
  console.log("\n12. The apps select nothing by themselves, a hold copies, and a verse answers its gestures");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
  const cdp = await ctx.newCDPSession(page);
  // A finger down, held, and lifted: real touch events, so the page's own
  // listeners and the browser's own long-press both see it.
  const hold = async (x, y, ms) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const drag = async (x, y, dy) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) {
      await page.waitForTimeout(90);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / 6 }] });
    }
    await page.waitForTimeout(250);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const pill = () => page.evaluate(() => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === "Actions for this text");
    return d ? { buttons: [...d.querySelectorAll("button")].map((b) => (b.innerText || "").trim()).filter(Boolean), held: document.querySelectorAll("[data-held]").length } : null;
  });
  const selected = () => page.evaluate(() => String(window.getSelection() ?? ""));

  // A field is still a field: its caret is a selection. The search, on the
  // front door, is the one every reader has.
  await go(page, "/");
  await page.waitForTimeout(2500);
  await tap(page.locator('button[aria-label*="earch" i]').first());
  await page.waitForTimeout(1000);
  const field = await page.evaluate(() => { const i = document.querySelector("[role=dialog] input"); return i ? getComputedStyle(i).userSelect : null; });
  must(field === "text", `a field keeps the phone's own selection, so it can be typed in (${field ?? "no field found"})`);
  await page.locator("[role=dialog] button", { hasText: /^Cancel$/ }).tap().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(500);

  await go(page, "/prayers/morning/");
  await page.waitForTimeout(2500);
  const css = await page.evaluate(() => ({ shell: document.documentElement.classList.contains("is-native"), body: getComputedStyle(document.body).userSelect, callout: getComputedStyle(document.body).webkitTouchCallout ?? "" }));
  must(css.shell && css.body === "none", `in the shell nothing is selectable by the system (user-select: ${css.body})`);

  // A prayer's words: a plain div, the whole prayer.
  const prayer = await page.evaluate(() => {
    const el = [...document.querySelectorAll("main div")].find((d) => getComputedStyle(d).whiteSpace === "pre-line" && d.innerText.trim().length > 60 && d.getBoundingClientRect().height > 20);
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + Math.min(120, r.width / 2)), y: Math.round(r.top + Math.min(24, r.height / 2)), words: el.innerText.trim() };
  });
  must(Boolean(prayer), "found a prayer's words on the morning rule");
  if (prayer) {
    await page.waitForTimeout(500);
    const at = await page.evaluate(() => { const el = [...document.querySelectorAll("main div")].find((d) => getComputedStyle(d).whiteSpace === "pre-line" && d.innerText.trim().length > 60 && d.getBoundingClientRect().height > 20); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(120, r.width / 2)), y: Math.round(r.top + Math.min(24, r.height / 2)) }; });

    // A tap is not a hold.
    await hold(at.x, at.y, 120);
    await page.waitForTimeout(500);
    must((await pill()) === null, "a tap on a prayer opens nothing");

    // Nor is a finger that travels.
    await drag(at.x, at.y, -60);
    await page.waitForTimeout(500);
    must((await pill()) === null, "a finger that scrolls opens nothing");
    const again = await page.evaluate(() => { const el = [...document.querySelectorAll("main div")].find((d) => getComputedStyle(d).whiteSpace === "pre-line" && d.innerText.trim().length > 60 && d.getBoundingClientRect().height > 20); el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(120, r.width / 2)), y: Math.round(r.top + Math.min(24, r.height / 2)) }; });
    await page.waitForTimeout(600);

    // A hold is.
    await hold(again.x, again.y, 800);
    await page.waitForTimeout(500);
    const up = await pill();
    must(Boolean(up) && up.buttons.includes("Copy"), `holding a prayer raises Purify's own pill (${up ? up.buttons.join(", ") || "no buttons" : "nothing"})`);
    must(Boolean(up) && up.held === 1, `and marks the prayer that is held (${up ? up.held : 0})`);
    must((await selected()) === "", `the system selected nothing (${JSON.stringify((await selected()).slice(0, 40))})`);
    await page.screenshot({ path: path.join(SHOTS, "hold-prayer-phone.png") });
    if (up) {
      await tap(page.locator("[role=dialog] button", { hasText: /^Copy$/ }));
      await page.waitForTimeout(300);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => "could not read: " + e);
      const norm = (t) => t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      must(norm(clip) === norm(prayer.words), `Copy puts the whole prayer on the clipboard (${clip.length} characters, the prayer is ${prayer.words.length}: "${clip.slice(0, 44).replace(/\n/g, " ")}")`);
      await page.waitForTimeout(1600);
      const gone = await page.evaluate(() => ({ pill: [...document.querySelectorAll("[role=dialog]")].some((x) => x.getAttribute("aria-label") === "Actions for this text"), held: document.querySelectorAll("[data-held]").length }));
      must(!gone.pill && gone.held === 0, `and the pill puts itself away (${gone.pill ? "still up" : "gone"}, ${gone.held} still marked)`);
    }
  }

  // A verse has tools of its own, and they now carry Copy.
  await go(page, "/bible/john/1/");
  await page.waitForFunction(() => document.body.innerText.includes("In the beginning was the Word"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const verse = await page.evaluate(() => {
    const el = document.querySelector("[data-own-press]");
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + r.height / 2) };
  });
  must(Boolean(verse), "a verse marks its words as having their own hold");
  if (verse) {
    await page.waitForTimeout(500);
    const at = await page.evaluate(() => { const r = document.querySelector("[data-own-press]").getBoundingClientRect(); return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + r.height / 2) }; });
    await hold(at.x, at.y, 800);
    await page.waitForTimeout(600);
    // The verse's focus (his pick C of 2026-11-08): named for the verse, the
    // colours above the card, its tools below in their words.
    await page.waitForTimeout(500);
    const tools = await page.evaluate(() => {
      const d = document.querySelector("[data-verse-focus]");
      if (!d || !/John 1:/.test(d.getAttribute("aria-label") || "")) return null;
      const rs = [...d.querySelectorAll('[role="menu"] button')].map((b) => ({ text: (b.innerText || "").replace(/\s+/g, " ").trim(), r: b.getBoundingClientRect() }));
      const card = d.querySelector(".verse-focus-card")?.getBoundingClientRect();
      const colours = d.querySelector("[data-hl-swatch]")?.getBoundingClientRect();
      return {
        buttons: rs.map((b) => b.text),
        left: Math.round(Math.min(...rs.map((b) => b.r.left))),
        right: Math.round(Math.max(...rs.map((b) => b.r.right))),
        order: Boolean(card && colours && rs.length) && colours.bottom <= card.top + 1 && rs[0].r.top >= card.bottom - 1,
        ready: d.hasAttribute("data-ready"),
        vw: innerWidth,
      };
    });
    must(Boolean(tools) && tools.buttons.includes("Copy"), `holding a verse raises the verse's focus, with Copy in it (${tools ? tools.buttons.join(", ") : "no focus"})`);
    must((await pill()) === null, "and not the general one as well");
    must((await selected()) === "", "the system selected nothing there either");
    must(Boolean(tools) && tools.left >= 0 && tools.right <= tools.vw, `every tool of the focus is on the screen (${tools ? tools.left + ".." + tools.right + " of " + tools.vw : "no focus"})`);
    must(Boolean(tools) && tools.order && tools.ready, `the colours above the verse's card and the tools below it, its motion begun (${tools ? (tools.order ? "in order" : "out of order") + (tools.ready ? ", ready" : ", not ready") : "no focus"})`);
    await page.screenshot({ path: path.join(SHOTS, "hold-verse-phone.png") });
    if (tools && tools.buttons.includes("Copy")) {
      await tap(page.locator("[data-verse-focus] button", { hasText: /^Copy$/ }));
      await page.waitForTimeout(400);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => "could not read: " + e);
      must(/\nJohn 1:\d+$/.test(clip) && clip.length > 30, `Copy puts the verse and where it is from on the clipboard ("${clip.replace(/\n/g, " / ").slice(0, 90)}")`);
    }
  }

  // Build 88 note 1: a hold on a phone also sends the page a contextmenu
  // (Android's WebView), which opened the computer's right-click menu over
  // the verse's own tools. The headless hold makes no contextmenu of its own,
  // so one is sent after it, as a phone's would be.
  const verseMenu = () => page.evaluate(() => !!document.querySelector('[role="menu"][aria-label="Verse actions"]'));
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);
  const words = await page.evaluate(() => {
    const el = document.querySelector("[data-own-press]");
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + r.height / 2) };
  });
  await page.waitForTimeout(500);
  await hold(words.x, words.y, 800);
  await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y })), words);
  await page.waitForTimeout(500);
  const afterHold = { strip: await page.evaluate(() => !!document.querySelector("[data-verse-focus]")), menu: await verseMenu() };
  must(afterHold.strip && !afterHold.menu, `a hold and the contextmenu a phone sends with it open the verse's tools and not the computer's menu (tools ${afterHold.strip ? "up" : "not up"}, menu ${afterHold.menu ? "up" : "shut"})`);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(500);

  // Build 88 note 2: a touch on a page still moving is the scroll's. Build 90
  // note 10 made the gestures what they are now: a lone tap opens nothing, a
  // double tap highlights the verse in the colour picked last, and a hold
  // opens its window (held above). The page is kept scrolling a step every
  // 30ms while a finger double-taps a verse: nothing is marked or opened.
  // Then on a page at rest: a lone tap, nothing; a double tap, the highlight;
  // a second double tap takes it off, leaving the page as it was found.
  const tapAt = async ({ x, y }) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const doubleTapAt = async (at) => {
    await tapAt(at);
    await page.waitForTimeout(110);
    await tapAt(at);
  };
  const aVerse = () =>
    page.evaluate(() => {
      const el = document.querySelector("[data-own-press]");
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + Math.min(20, r.height / 2)), id: el.closest("[id^='v']")?.id ?? null };
    });
  const marked = (id) =>
    page.evaluate((id) => ({
      any: document.querySelectorAll("[id^='v'][data-hl='true']").length,
      hl: id ? document.getElementById(id)?.getAttribute("data-hl") === "true" : false,
      tools: !!document.querySelector("[data-verse-focus]"),
    }), id);
  await page.evaluate(() => { window.__glide = setInterval(() => window.scrollBy(0, 2), 30); });
  await page.waitForTimeout(200);
  await doubleTapAt(await aVerse());
  await page.evaluate(() => clearInterval(window.__glide));
  await page.waitForTimeout(500);
  const onGlide = await marked(null);
  must(onGlide.any === 0 && !onGlide.tools, `a double tap on a page still gliding marks nothing and opens nothing (${onGlide.any} marked, ${onGlide.tools ? "the tools opened" : "no tools"})`);
  await page.waitForTimeout(400);
  const still = await aVerse();
  await tapAt(still);
  await page.waitForTimeout(600);
  const lone = await marked(still.id);
  must(!lone.hl && !lone.tools, `a lone tap on a page at rest opens nothing and marks nothing (${lone.hl ? "marked" : "not marked"}, ${lone.tools ? "the tools opened" : "no tools"})`);
  await doubleTapAt(still);
  await page.waitForTimeout(600);
  const twice = await marked(still.id);
  must(twice.hl && !twice.tools, `a double tap on a page at rest highlights the verse, with no window (${twice.hl ? "highlighted" : "not highlighted"}, ${twice.tools ? "the tools opened" : "no tools"})`);
  await doubleTapAt(still);
  await page.waitForTimeout(600);
  must(!(await marked(still.id)).hl, "and a second double tap takes it off");
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();

  // And outside the shell, a browser keeps what a browser has.
  const web = await open({ width: 1366, height: 900, phone: false });
  await go(web.page, "/prayers/morning/");
  await web.page.waitForTimeout(2000);
  const webCss = await web.page.evaluate(() => getComputedStyle(document.body).userSelect);
  must(webCss !== "none", `outside the shell the page is selectable as any page is (user-select: ${webCss})`);
  await web.ctx.close();
});

// ---- 11. The phones open one document (1.5.2).
// Capacitor answers every address without an extension with the front door's
// index.html, so the bundle carries that one and no other
// (scripts/native-build.mjs, prunePageDocuments: 1,922 files and 219 MB the
// shells never served). Three things hold that up: the bundle really has one,
// nothing in this whole walk asked for another, and the only document any
// context opened was the front door. If a tool or a page ever asks for a
// page's own index.html, it shows here before it ships.
await section(11, async () => {
  console.log("\n11. The phones open one document");
  const documents = [];
  (function find(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) find(p);
      else if (e.name === "index.html") documents.push(path.relative(OUT, p).split(path.sep).join("/"));
    }
  })(OUT);
  must(documents.includes("index.html"), "the front door's document is in the bundle");
  must(documents.length === 1, `and it is the only one (${documents.length}${documents.length > 1 ? ", such as " + documents.filter((d) => d !== "index.html").slice(0, 3).join(", ") : ""})`);
  const inner = everyDocument.filter((d) => d !== "/");
  must(everyDocument.length > 0 && inner.length === 0, `every cold load in this walk was the front door (${everyDocument.length} of them${inner.length ? "; also " + [...new Set(inner)].slice(0, 3).join(", ") : ""})`);
  must(everyPageFile.length === 0, `no page's own index.html was asked for (${everyPageFile.length}${everyPageFile.length ? ": " + [...new Set(everyPageFile)].slice(0, 3).join(", ") : ""})`);

  // A hard load of an inner address. The shell hands over the front door
  // for it, as for every address; before 1.5.2 the app then sat on Today
  // under the chapter's address. It asks the router for the screen the
  // address names now (lib/nav/entry.ts).
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await page.goto(`${ORIGIN}/bible/john/1/?x=1#v3`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.innerText.includes("In the beginning was the Word"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const hard = await page.evaluate(() => ({ address: location.pathname + location.search + location.hash, chapter: document.body.innerText.includes("In the beginning was the Word"), today: /VERSE OF THE DAY/i.test(document.body.innerText) }));
  must(hard.chapter && !hard.today, `a hard load of an inner address ends on that screen (${hard.chapter ? "the chapter" : hard.today ? "Today" : "neither"})`);
  must(hard.address === "/bible/john/1/?x=1#v3", `with its address, its query and its # kept (${hard.address})`);

  // And an address the bundle has no screen for. The router answers a missing
  // payload with a hard load of the same address, which would be this again
  // for ever; the second time it is given up on, and the reader is at the
  // front door, address and all.
  const loadsBefore = everyDocument.length;
  await page.goto(`${ORIGIN}/no/such/screen/`, { waitUntil: "load" });
  await page.waitForTimeout(7000);
  const lost = await page.evaluate(() => ({ path: location.pathname, drawn: document.body.innerText.length > 200 }));
  const loads = everyDocument.length - loadsBefore;
  must(lost.path === "/" && lost.drawn, `an address with no screen ends at the front door (${lost.path})`);
  must(loads >= 1 && loads <= 3, `and stops there: ${loads} loads, not a loop`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 13. With no signal (1.6).
// This whole walk answers nothing from outside the bundle, so every check
// above is already the app with no network. What none of them asked is what
// a reader is TOLD. Measured on 2026-10-11: all 34 screens tried drew, and
// the shop said "Failed to fetch", the engine's words, to a reader with no
// signal. Here the phone also says it is offline, the three things a reader
// opens the app for are opened, and the two places that need the network
// have to say so in plain words of ours.
await section(13, async () => {
  console.log("\n13. With no signal");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false }));
  const reads = async (to, words) => {
    await go(page, to);
    await page
      .waitForFunction((w) => w.every((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase())), words, { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(600);
    return page.evaluate(() => document.body.innerText);
  };
  const has = (text, words) => words.every((w) => text.toLowerCase().includes(w.toLowerCase()));
  const ENGINE = /failed to fetch|load failed|networkerror|net::err/i;

  // 1.7: the readings are rows of the Church today list, each named by its
  // kind; "Today's Readings" is only said on a day with none.
  const today = await reads("/", ["Verse of the Day", "The Church today", "Gospel"]);
  must(has(today, ["Verse of the Day", "The Church today", "Gospel"]), "Today draws its verse and its readings");
  const rule = await reads("/prayers/morning/", ["In the name of the Father"]);
  must(has(rule, ["In the name of the Father"]), "the Morning Rule opens with its prayers");
  const chapter = await reads("/bible/john/1/", ["In the beginning was the Word"]);
  must(has(chapter, ["In the beginning was the Word"]), "a chapter of the Bible opens");

  if (inBundle(OUT, "/shop/")) {
    const shop = await reads("/shop/", ["couldn't reach the shop"]);
    must(has(shop, ["couldn't reach the shop"]), "the shop says it could not be reached, and why");
    must(!ENGINE.test(shop), `and not in the engine's words${ENGINE.test(shop) ? ` (it says "${ENGINE.exec(shop)[0]}")` : ""}`);
  }
  if (inBundle(OUT, "/community/")) {
    const community = await reads("/community/", ["could not load"]);
    must(has(community, ["could not load"]) && !ENGINE.test(community), "Community says it could not load, in plain words");
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 14. One search (1.6).
// The magnifier on every screen opened a search that knew the books, the
// saints and the prayer rules, and nothing else: not a verse, not a work of
// the Fathers, not the journal, not one setting. The owner's test for 1.6 is
// that a reader finds prayers, saints, verses and settings from that one
// box. This opens it the way a thumb does and asks it for each.
await section(14, async () => {
  console.log("\n14. One search");
  // The list is one file for every shell, and this shell leaves some screens
  // out. A row for one of those would open the front door instead.
  const listFile = path.join(OUT, "search-corpus.json");
  const list = fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, "utf8")) : [];
  const nowhere = list.filter((row) => !inBundle(OUT, `${row.href.split(/[?#]/)[0]}/`));
  must(list.length > 450, `the list is in the bundle (${list.length} rows)`);
  must(nowhere.length === 0, `every row opens a screen this bundle carries${nowhere.length ? ` (${nowhere.length} do not: ${nowhere.slice(0, 3).map((r) => r.href).join(", ")})` : ""}`);
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/");
  // The tap waits for the button, so it also waits for Today to be drawn.
  const openSearch = async () => {
    await page.locator('button[aria-label="Search"]:visible').first().click();
    await page.locator('[role="dialog"] input').waitFor({ timeout: 10000 });
  };
  // The rows on screen once one of them reads as expected (the list and the
  // reference reader are both fetched on first open, so the first answer
  // can be a moment behind the typing).
  const finds = async (query, expected) => {
    await page.locator('[role="dialog"] input').fill(query);
    await page
      .waitForFunction(
        (e) => [...document.querySelectorAll('[role="dialog"] button[data-idx]')].some((b) => b.innerText.includes(e)),
        expected,
        { timeout: 8000 },
      )
      .catch(() => {});
    return page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"] button[data-idx]')].map((b) => b.innerText.replace(/\s*\n\s*/g, " / ")),
    );
  };
  const tap = async (label) => {
    await page.locator('[role="dialog"] button[data-idx]', { hasText: label }).first().click();
    await page.waitForTimeout(400);
  };

  await openSearch();
  const verse = await finds("john 3:16", "John 3:16");
  must(verse[0]?.startsWith("John 3:16"), `a typed verse leads the results (${verse[0] ?? "nothing"})`);
  const several = await finds("John 3:16, Ps 23", "Open 2 references");
  must(several[0]?.startsWith("Open 2 references"), `several references are offered as one page (${several[0] ?? "nothing"})`);
  const named = await finds("susanna", "Susanna");
  must(named.some((r) => r.startsWith("Susanna") && r.includes("Daniel 13")), `a passage known by name is found, with where it lives (${named[0] ?? "nothing"})`);
  const work = await finds("incarnation", "On the Incarnation");
  must(work.some((r) => r.startsWith("On the Incarnation")), "a work of the Fathers is found by its title");
  const screen = await finds("journal", "Your journal");
  must(screen.some((r) => r.startsWith("Your journal")), "a screen is found by its name");
  const mode = await finds("dark mode", "Reading mode");
  must(mode.length === 1 && mode[0].startsWith("Reading mode"), `a setting is found by the words a reader has for it (${mode.join("; ") || "nothing"})`);

  // And the rows go where they say.
  await finds("old calendar", "Calendar reckoning");
  await tap("Calendar reckoning");
  await page.waitForFunction(() => location.pathname.startsWith("/settings") && document.body.innerText.includes("Calendar reckoning"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  const settings = await page.evaluate(() => {
    const row = [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === "Calendar reckoning");
    const top = row ? Math.round(row.getBoundingClientRect().top) : null;
    return { at: location.pathname + location.hash, top, tall: innerHeight, open: !!document.querySelector('[role="dialog"] input') };
  });
  must(settings.at.startsWith("/settings") && settings.top !== null && !settings.open, `the setting's row opens Settings (${settings.at})`);
  // Settings is three screens long on a phone and this one is in the middle.
  must(settings.top !== null && settings.top > 0 && settings.top < settings.tall, `with that setting on screen, not somewhere below (${settings.top} of ${settings.tall})`);

  await go(page, "/");
  await openSearch();
  await finds("john 3:16", "John 3:16");
  await tap("John 3:16");
  await page.waitForFunction(() => document.body.innerText.includes("For God so loved the world"), null, { timeout: 20000 }).catch(() => {});
  const chapter = await page.evaluate(() => ({ at: location.pathname + location.hash, text: document.body.innerText.includes("For God so loved the world") }));
  must(/^\/bible\/john\/3\/?#v16$/.test(chapter.at) && chapter.text, `the verse's row opens the chapter at that verse (${chapter.at})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 15. The front door is the app's (1.6).
// The apps load one document, and it is the website's front door. Until 1.6
// it carried the website's whole front page too: the phone was handed it,
// drew it behind the splash, fetched its pictures, and then dropped it for
// Today. The export leaves it out now (app/page.tsx). If it comes back, the
// document grows and the pictures are asked for again, and both show here.
await section(15, async () => {
  console.log("\n15. The front door is the app's");
  const door = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  const WEBSITE = /\/marketing\/|_widget_v2\.png|data-phone-pages/;
  must(!WEBSITE.test(door), `the one document does not carry the website's front page${WEBSITE.test(door) ? ` (it has "${WEBSITE.exec(door)[0]}")` : ""}`);
  must(door.includes("data-front-door"), "and still carries the mark that says it is the front door");
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/");
  await page
    .waitForFunction(() => document.body.innerText.toLowerCase().includes("verse of the day"), null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
  const today = await page.evaluate(() => document.body.innerText.toLowerCase().includes("verse of the day"));
  must(today, "Today is drawn on a cold open");
  const strays = asked.filter((p) => WEBSITE.test(p));
  must(strays.length === 0, `no picture of the website's front page is asked for${strays.length ? ` (${strays.slice(0, 3).join(", ")})` : ""}`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 16. A phone set to another language (1.6).
// 1.6 is built around Greek, Romanian and Filipino. On first open the app
// takes the phone's language, and the one search answers in it: a book is
// named and found as the reader's own Bible names it, a setting as the
// reader's Settings screen does. The words expected are read from the
// catalogs, so this follows them when a translation is corrected.
await section(16, async () => {
  console.log("\n16. A phone set to another language");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const rowsFor = (page) =>
    page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[data-idx]')].map((b) => b.innerText.replace(/\s*\n\s*/g, " / ")));
  const typed = async (page, query, expected) => {
    await page.locator('[role="dialog"] input').fill(query);
    await page
      .waitForFunction((e) => [...document.querySelectorAll('[role="dialog"] button[data-idx]')].some((b) => b.innerText.includes(e)), expected, { timeout: 8000 })
      .catch(() => {});
    return rowsFor(page);
  };
  const inTheBar = (page, word) =>
    page
      .waitForFunction((w) => [...document.querySelectorAll("nav a, nav button")].some((n) => n.innerText.trim() === w), word, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);

  // Greek: the app comes up in Greek, and the search reads and answers in it.
  {
    const el = words("el");
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    await go(page, "/");
    must(await inTheBar(page, el["nav.today"]), `a phone set to Greek opens in Greek (the tab reads "${el["nav.today"]}")`);
    await page.locator(`button[aria-label="${el["search.open"]}"]:visible`).first().click();
    await page.locator('[role="dialog"] input').waitFor({ timeout: 10000 });
    const book = el["bible.books.john"];
    const verse = await typed(page, `${book} 3:16`, `${book} 3:16`);
    must(verse[0]?.startsWith(`${book} 3:16`), `a verse typed by the book's Greek name leads the results (${verse[0] ?? "nothing"})`);
    const setting = await typed(page, el["nav.settings"], el["nav.settings"]);
    must(setting.some((r) => r.startsWith(el["nav.settings"])), `Settings is found by its Greek name (${setting[0] ?? "nothing"})`);
    const english = await typed(page, "psalms", el["bible.books.psalms"]);
    must(english.some((r) => r.startsWith(el["bible.books.psalms"])), `and a book is still found by its English name, shown in Greek (${english[0] ?? "nothing"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Filipino, from a phone that still calls it Tagalog.
  {
    const fil = words("fil");
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "tl-PH" });
    await go(page, "/");
    must(await inTheBar(page, fil["nav.today"]), `a phone that says Tagalog opens in Filipino (the tab reads "${fil["nav.today"]}")`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 17. Start here, and a verse as a picture (1.6; the card and its picture 1.8).
// Two things for the reader who is new, or who wants to send a verse to
// someone. Start here is seven doors to screens the app already has, so the
// check is that there are seven and that the first one opens. The Verse of
// the Day is the owner's pick B of round 10, "The light": the whole verse and
// three round actions, Save, Listen (only where the chapter has a recording)
// and Share, with a small ••• beside them. Share opens the verse picture's
// sheet (his "mix of A and B" of round 11): the picture drawn on the phone,
// its Look, Words and Size. With no share sheet in this browser Save
// downloads it, and what comes out has to be a real PNG of the size chosen.
await section(17, async () => {
  console.log("\n17. Start here, and a verse as a picture");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/discover/");
  await page.waitForFunction(() => document.body.innerText.includes("Start here"), null, { timeout: 20000 }).catch(() => {});
  const door = await page.evaluate(() => !!document.querySelector('a[href^="/start"]'));
  must(door, "Discover has the way in to Start here");
  await go(page, "/start/");
  await page.waitForFunction(() => document.querySelectorAll("ol > li").length >= 7, null, { timeout: 20000 }).catch(() => {});
  const steps = await page.evaluate(() => [...document.querySelectorAll("ol > li a")].map((a) => a.getAttribute("href")));
  must(steps.length === 7, `Start here lists its seven steps (${steps.length})`);
  must(steps.every((href) => inBundle(OUT, href.endsWith("/") ? href : `${href}/`)), "and every step is a screen this bundle carries");
  // 1.7: a phone page. Its own bar alone, the Pantocrator whole at the top,
  // and after the steps the door to Your first Liturgy.
  const frame = await page.evaluate(() => {
    const img = document.querySelector("[data-route-content] header img");
    const ol = document.querySelector("[data-route-content] ol");
    const door = document.querySelector('[data-route-content] a[href^="/start/first-liturgy"]');
    return {
      bars: document.querySelectorAll("[data-mobile-topbar]").length,
      backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
      icon: img ? { ok: img.complete && img.naturalWidth > 0, src: img.getAttribute("src"), w: Math.round(img.getBoundingClientRect().width), natural: img.naturalWidth } : null,
      guide: !!door,
      guideAfterSteps: !!(ol && door && ol.compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  must(frame.bars === 1 && !frame.backBar, `Start here has its own bar and no second one (${frame.bars} bar${frame.bars === 1 ? "" : "s"}${frame.backBar ? ", and the back bar" : ""})`);
  must(Boolean(frame.icon) && frame.icon.ok && frame.icon.src === "/sections/prayers.v4.jpg" && frame.icon.w * 2 <= frame.icon.natural + 2, `the Pantocrator at the top, cut close to the face, never enlarged past its pixels (${frame.icon ? `${frame.icon.w}px wide of ${frame.icon.natural}` : "none"})`);
  must(frame.guide && frame.guideAfterSteps, "after the steps, the door to Your first Liturgy");
  await page.screenshot({ path: path.join(SHOTS, "start-phone.png"), fullPage: true });
  await page.locator("ol > li a").first().click();
  await page.waitForFunction(() => location.pathname.startsWith("/prayers/learning/"), null, { timeout: 15000 }).catch(() => {});
  const first = await page.evaluate(() => location.pathname);
  must(first.startsWith("/prayers/learning/what-is-prayer"), `the first step opens the first lesson (${first})`);

  await go(page, "/");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const recorded = JSON.parse(fs.readFileSync(path.resolve("data/readAloud/index.json"), "utf8"));
  await page.waitForFunction(() => [...document.querySelectorAll("article")].some((a) => /verse of the day/i.test(a.innerText)), null, { timeout: 20000 }).catch(() => {});
  const card = page.locator("article", { hasText: en["today.verseOfDay"] }).first();
  const seen = await card
    .evaluate((a) => ({
      actions: [...a.querySelectorAll("button[aria-label]")].map((b) => b.getAttribute("aria-label")),
      href: a.querySelector("a[href^='/bible/']")?.getAttribute("href") ?? "",
      clamped: !!a.querySelector("[class*='line-clamp']"),
    }))
    .catch(() => ({ actions: [], href: "", clamped: true }));
  const [, vodBook, vodChapter] = /^\/bible\/([a-z0-9-]+)\/(\d+)/.exec(seen.href) ?? [];
  const heard = recorded.includes(`${vodBook}/${vodChapter}`);
  const wantActions = [en["common.save"], ...(heard ? [en["readAloud.listen"]] : []), en["common.share"], en["today.verse.moreActions"]];
  must(
    JSON.stringify(seen.actions) === JSON.stringify(wantActions),
    `the verse card's actions are ${wantActions.join(", ")}, Listen ${heard ? "with" : "without"} a recording of ${vodBook} ${vodChapter} (${seen.actions.join(", ") || "none"})`,
  );
  must(!seen.clamped, "and its verse is whole, never cut to a few lines");

  // A PNG says its own size in bytes 16 to 23.
  const savePicture = async (sheet, label) => {
    const saved = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      sheet.getByRole("button", { name: en["common.save"], exact: true }).click(),
    ]).then(([d]) => d).catch(() => null);
    if (!saved) return null;
    const to = path.join(SHOTS, `verse-picture-${label}.png`);
    await saved.saveAs(to);
    const png = fs.readFileSync(to);
    const isPng = png.subarray(1, 4).toString("latin1") === "PNG";
    return { name: saved.suggestedFilename(), width: isPng ? png.readUInt32BE(16) : 0, height: isPng ? png.readUInt32BE(20) : 0, kb: Math.round(png.length / 1024) };
  };
  // Painted, and not only sized: its ground is solid where nothing was before.
  const previewIs = (w, h) =>
    page
      .waitForFunction(([pw, ph]) => {
        const c = document.querySelector('[role="dialog"] canvas[role="img"]');
        return !!c && c.width === pw && c.height === ph && c.getContext("2d").getImageData(Math.floor(pw / 2), 2, 1, 1).data[3] === 255;
      }, [w, h], { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

  await tap(card.getByRole("button", { name: en["common.share"], exact: true }));
  const sheet = page.getByRole("dialog", { name: en["picture.title"] });
  await sheet.waitFor({ timeout: 15000 }).catch(() => {});
  const drawn = await previewIs(540, 960);
  const opened = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return {
      tabs: [...(d?.querySelectorAll('[role="tab"]') ?? [])].map((b) => (b.textContent ?? "").trim()),
      looks: d ? d.querySelectorAll('[role="tabpanel"] button[aria-pressed]').length : 0,
    };
  });
  must(
    JSON.stringify(opened.tabs) === JSON.stringify([en["picture.tab.look"], en["picture.tab.words"], en["ui.size"]]) && opened.looks === 6,
    `Share opens the verse picture: its tabs ${opened.tabs.join(", ") || "none"}, and ${opened.looks} looks`,
  );
  must(drawn, "and the picture is drawn as a story, 9 by 16");
  const story = await savePicture(sheet, "story");
  must(Boolean(story) && story.width === 1080 && story.height === 1920, `Save makes a PNG of a story's size (${story ? `${story.width} by ${story.height}, ${story.kb} KB` : "nothing came out"})`);
  must(Boolean(story) && /^purify-[a-z0-9-]+\.png$/.test(story.name), `named for its verse (${story?.name ?? "none"})`);
  await page.screenshot({ path: path.join(SHOTS, "verse-picture-sheet.png") });

  // The Christ look in a square: the icon from the bundle above, the verse under it.
  await tap(sheet.getByRole("button", { name: en["picture.look.christ"], exact: true }));
  await tap(sheet.getByRole("tab", { name: en["ui.size"] }));
  await tap(sheet.getByRole("button", { name: new RegExp(`^${en["picture.shape.square"]}`) }));
  must(await previewIs(540, 540), "the Christ look as a square is drawn");
  const square = await savePicture(sheet, "christ-square");
  must(Boolean(square) && square.width === 1080 && square.height === 1080, `and comes out a square (${square ? `${square.width} by ${square.height}, ${square.kb} KB` : "nothing came out"})`);
  await page.screenshot({ path: path.join(SHOTS, "verse-picture-christ.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  // What the card's ••• offered stays one tap away, beside the three.
  await tap(card.getByRole("button", { name: en["today.verse.moreActions"] }));
  await page.waitForTimeout(600);
  const more = await page.evaluate(() =>
    [...(document.querySelector('[role="dialog"]')?.querySelectorAll("button") ?? [])].map((b) => (b.textContent ?? "").trim()).filter(Boolean),
  );
  must(
    ["today.verse.openChapter", "today.verse.copyVerseText", "today.verse.copyLink"].every((k) => more.includes(en[k])),
    `its ••• keeps the chapter, the copy and the link (${more.join(", ") || "nothing"})`,
  );
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 18. The start does not read every saint's life (1.6).
// lib/saints/saints.ts is every profile with its life, 484 KB of source, and
// until 1.6 the calendar imported it, so the code a cold open reads carried
// all of it. The calendar reads the saints in brief now (lib/saints/brief.ts).
// The unit test follows the imports. This opens the app and reads the files
// the start asked for, looking for a line that only a life has, and then
// opens the saints screen to be sure the line can be found at all.
await section(18, async () => {
  console.log("\n18. The start, and the saints' lives");
  const registry = fs.readFileSync(path.resolve("lib/saints/saints.ts"), "utf8");
  // Sixty letters, spaces and commas from the first life: plain enough that
  // no bundler writes them any other way.
  const mark = (registry.slice(registry.indexOf("life: [")).match(/[A-Za-z][A-Za-z ,]{58}[A-Za-z]/) ?? [""])[0];
  must(mark.length === 60, `a line from a saint's life to look for ("${mark.slice(0, 36)}...")`);
  const carriesLives = (p) => {
    const file = path.join(OUT, p);
    return p.endsWith(".js") && fs.existsSync(file) && fs.readFileSync(file, "utf8").includes(mark);
  };
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/");
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("verse of the day"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const atStart = asked.filter((p) => p.endsWith(".js"));
  const withLives = atStart.filter(carriesLives);
  must(atStart.length > 10 && withLives.length === 0, `the cold open read ${atStart.length} script files and none carries the lives${withLives.length ? ": " + withLives.join(", ") : ""}`);

  // The calendar still knows its saints. November 13 is St. John Chrysostom,
  // a fixed day: his name links his profile and his icon is drawn.
  await go(page, "/calendar/?m=2026-11&d=2026-11-13");
  await page.waitForFunction(() => !!document.querySelector('a[href^="/saints/john-chrysostom"]'), null, { timeout: 20000 }).catch(() => {});
  const kept = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/saints/john-chrysostom"]');
    const icon = [...document.querySelectorAll("img")].some((img) => (img.getAttribute("src") ?? "").includes("john-chrysostom"));
    return { link: !!link, name: link?.textContent ?? "", icon };
  });
  must(kept.link && kept.icon, `the calendar keeps St. John Chrysostom on November 13, with his icon and the way to his profile (${kept.name.trim().slice(0, 40)})`);
  const stillNone = asked.filter(carriesLives);
  must(stillNone.length === 0, `and the calendar did not read the lives to do it${stillNone.length ? ": " + stillNone.join(", ") : ""}`);

  const before = asked.length;
  await go(page, "/saints/");
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/saints/"]').length > 20, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // A set: the router asks for a screen's script files twice over.
  const later = [...new Set(asked.slice(before))].filter(carriesLives);
  must(later.length > 0, `the saints screen reads them when it is opened, so the line can be found (in ${later.length} file, ${Math.round(fs.statSync(path.join(OUT, later[0] ?? "")).size / 1024)} KB)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 19. The splash is not lifted onto the wrong language (1.6).
// The apps are built in English and corrected on the device. Until 1.6 the
// splash lifted before that was done, so a phone set to Greek showed Today in
// English for a moment on every cold start. The first screen now waits for its
// language (lib/i18n/launchLanguage.ts) and so does the splash. The bridge
// says when it lifts it, data-launch on <html>, and this reads the screen on
// that frame: what a reader sees the instant the logo goes.
await section(19, async () => {
  console.log("\n19. The splash, and the language under it");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const english = words("en")["nav.today"];
  // Every frame from the first: the first tab's word and the page's language,
  // noted when either changes, and the frame the splash is lifted on.
  const watch = () => {
    const log = { frames: [], lift: null };
    window.__launch = log;
    const frame = () => {
      const root = document.documentElement;
      if (root) {
        const word = document.querySelector("[data-tab-label]")?.textContent?.trim() ?? "";
        const last = log.frames[log.frames.length - 1];
        if (!last || last[0] !== word || last[1] !== root.lang) log.frames.push([word, root.lang]);
        if (log.lift === null && root.dataset.launch === "ready") log.lift = { word, lang: root.lang, today: !!document.querySelector("[data-route-content]") };
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const launch = async ({ locale, set }) => {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale, set });
    await ctx.addInitScript(watch);
    await go(page, "/");
    await page.waitForFunction(() => window.__launch?.lift, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const log = await page.evaluate(() => window.__launch);
    await ctx.close();
    return { log, errors };
  };

  const greek = words("el")["nav.today"];
  {
    const { log, errors } = await launch({ locale: "el-GR" });
    const shown = log.frames.map(([word]) => word).filter(Boolean);
    must(log.lift?.today && log.lift.word === greek && log.lift.lang === "el", `a phone set to Greek: the splash lifts onto Greek (the first tab reads "${log.lift?.word}", lang="${log.lift?.lang}")`);
    must(shown.length > 0 && !shown.includes(english), `and the tab bar was never drawn in English first (${shown.join(", ") || "nothing drawn"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  }
  {
    // The reader chose English on this phone. The phone's own language must not overrule that.
    const { log } = await launch({ locale: "el-GR", set: { "CapacitorStorage.purify_locale": "en" } });
    must(log.lift?.today && log.lift.word === english && log.lift.lang === "en", `a Greek phone whose reader chose English stays in English (the first tab reads "${log.lift?.word}")`);
  }
  {
    // And the other way: Romanian chosen on a phone set to English.
    const romanian = words("ro")["nav.today"];
    const { log } = await launch({ locale: "en-US", set: { "CapacitorStorage.purify_locale": "ro" } });
    const shown = log.frames.map(([word]) => word).filter(Boolean);
    must(log.lift?.today && log.lift.word === romanian && !shown.includes(english), `an English phone whose reader chose Romanian opens in Romanian, never English first (the first tab reads "${log.lift?.word}")`);
  }
  {
    const { log } = await launch({ locale: "en-US" });
    must(log.lift?.today && log.lift.word === english, `a phone set to English: the splash lifts onto Today as before (the first tab reads "${log.lift?.word}")`);
  }
  {
    // A language the app does not carry: it opens as built, and it does open.
    const { log } = await launch({ locale: "ja-JP" });
    must(log.lift?.today && log.lift.word === english, `a phone set to a language the app does not carry opens in English (the first tab reads "${log.lift?.word}")`);
  }
});
// ---- 20. The screens a server wrote in English follow the phone's language (1.6).
// A server component that looks a phrase up writes a string into the page, and
// in the export the server ran once, in English. Until 1.6 that froze the
// Discover tab, the reading room and a dozen headings in English on every
// phone, though each line was already translated. They are <T> islands now
// (components/i18n/T.tsx). The unit test holds the source; this opens the
// screens on a phone set to Greek and reads them.
await section(20, async () => {
  console.log("\n20. Discover and the reading room, on a phone set to Greek");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  // Only lines Greek has its own words for can show which language is drawn.
  const told = (keys) => keys.filter((k) => el[k] && el[k] !== en[k]);
  // A heading set in capitals is read back in capitals, and Greek capitals
  // drop their accents, so both sides are compared without case or accent.
  const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const read = async (page, to, keys) => {
    await go(page, to);
    const first = el[told(keys)[0]];
    await page.waitForFunction((w) => document.body.innerText.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(w), fold(first), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const text = fold(await page.evaluate(() => document.querySelector("[data-route-content]")?.innerText ?? document.body.innerText));
    const has = (w) => text.includes(fold(w));
    return { greek: told(keys).filter((k) => has(el[k])), english: told(keys).filter((k) => has(en[k]) && !has(el[k])), of: told(keys).length };
  };
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });

  // 1.7: the library first (the owner's pick of 2026-10-15). The plate's
  // sentence, the History band and the reading-room card left the screen;
  // the search field and the Reading and Walkthroughs tiles came.
  const discover = await read(page, "/discover/", [
    "search.ariaLabel", "discover.tile.saints", "discover.tile.reading", "discover.tile.history", "discover.tile.councils",
    "discover.tile.theology", "discover.tile.calendar", "nav.discoverMenu.walkthroughs", "discover.tile.start", "discover.tile.startBlurb",
    "discover.tile.parishes", "discover.tile.parishesBlurb", "nav.shop", "nav.chat",
  ]);
  must(discover.of >= 12 && discover.greek.length === discover.of, `Discover: ${discover.greek.length} of ${discover.of} lines are in Greek`);
  must(discover.english.length === 0, `and none is still in English${discover.english.length ? ": " + discover.english.join(", ") : ""}`);

  // 1.7: the reading room is rows of covers (the owner's note 18): their
  // names, the passions on their row, and the rest of the library.
  const reading = await read(page, "/reading/", [
    "reading.row.begin", "reading.row.passions", "reading.row.virtues", "reading.row.life", "reading.row.short",
    "reading.theme.gluttony", "reading.theme.anger", "reading.tradition.greek", "reading.tradition.latin",
    "reading.row.alsoInLibrary", "reading.surface.councils", "reading.surface.councilsBlurb", "reading.surface.topics", "reading.surface.topicsBlurb",
  ]);
  must(reading.of >= 8 && reading.greek.length === reading.of, `the reading room: ${reading.greek.length} of ${reading.of} lines are in Greek`);
  must(reading.english.length === 0, `and none is still in English${reading.english.length ? ": " + reading.english.join(", ") : ""}`);

  const saints = await read(page, "/saints/", ["saints.eyebrow", "saints.h1"]);
  must(saints.of >= 1 && saints.greek.length === saints.of, `the saints' heading is in Greek (${saints.greek.length} of ${saints.of})`);
  const councils = await read(page, "/councils/", ["councils.eyebrow", "councils.h1"]);
  must(councils.of >= 1 && councils.greek.length === councils.of, `the councils' heading is in Greek (${councils.greek.length} of ${councils.of})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();

  // And a phone set to English reads what it always read.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/discover/");
    await page.waitForFunction((w) => document.body.innerText.includes(w), en["discover.tile.saints"], { timeout: 20000 }).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText);
    // 1.7: the library first (the owner's pick of 2026-10-15).
    const lines = ["search.ariaLabel", "discover.tile.saints", "discover.tile.reading", "discover.tile.calendar", "nav.discoverMenu.walkthroughs", "discover.tile.start", "nav.chat"];
    const there = lines.filter((k) => text.toLowerCase().includes(en[k].toLowerCase()));
    must(there.length === lines.length, `a phone set to English: Discover reads as it should (${there.length} of ${lines.length} lines)`);
    // The History band and the reading room's card left the screen: History
    // and Reading are tiles now.
    const cta = en["study.history.exploreTimeline"];
    must(!text.toLowerCase().includes(cta.toLowerCase()) && !text.includes(en["reading.enterReadingRoom"]), `and the History band and the reading-room card are gone ("${cta}")`);
    await ctx.close();
  }
});
// ---- 21. What every page of the export carries (1.6).
// Whatever a layout, the not-found page or the root metadata writes is
// written into EVERY page's payload, so a kilobyte there is two megabytes of
// the app. Three such things were found in 1.6 and came out: the names of
// thirty-six components (now two frames), the whole "page not found" screen
// (now one reference), and the website's link-preview tags (now a title).
// The unit tests hold the source. This reads the built files, with no
// browser, so the gain cannot quietly go back.
await section(21, async () => {
  console.log("\n21. What every page carries");
  // The layout's and the head's own files leave the bundle since 1.9
  // (scripts/native-build.mjs, pruneRouterFiles), which keeps John 1's copies
  // in .release-logs/router-files/ for this check. An older export still
  // holds them beside the page.
  const at = (file) => {
    const inBundleFile = path.join(OUT, "bible", "john", "1", file);
    return fs.readFileSync(fs.existsSync(inBundleFile) ? inBundleFile : path.resolve(".release-logs/router-files", file), "utf8");
  };
  const routerFiles = ["__next._index.txt", "__next._tree.txt", "__next._head.txt"].filter((f) => fs.existsSync(path.join(OUT, "bible", "john", "1", f)) || fs.existsSync(path.join(OUT, f)));
  must(routerFiles.length === 0, `no page carries the router files that only led to pruned segment files${routerFiles.length ? ": " + routerFiles.join(", ") : ""} (they were 7.0 MB packed)`);
  // One line of a payload per client component it names.
  const named = (text) => text.split("\n").filter((row) => /^[0-9a-f]+:I\[/.test(row)).map((row) => (row.match(/"([^"]*)"\]$/) ?? [])[1] ?? "");
  const layout = named(at("__next._index.txt"));
  must(layout.includes("RootFrame") && layout.length <= 8, `the root layout's file names ${layout.length} components, the frame among them (it was 26)`);
  const page = at("index.txt");
  const inPage = named(page);
  must(inPage.includes("AppFrame") && !inPage.includes("MobileTabBar") && !inPage.includes("PrayerSyncBridge"), "a chapter names the two frames and not the parts inside them");
  must(inPage.includes("NotFoundScreen") && !page.includes("min-h-screen bg-night flex items-center justify-center"), "and carries a reference to the not-found screen, not the screen");
  // Next 16.4 writes no head file: the head's rows (its meta, then its title
  // with the manifest and icon links) are in the page's own payload, and are
  // read from there, whole, against the same three conditions.
  const headFile = ["bible/john/1/__next._head.txt", "__next._head.txt"].some((f) => fs.existsSync(path.join(OUT, f))) || fs.existsSync(path.resolve(".release-logs/router-files", "__next._head.txt"));
  const head = headFile ? at("__next._head.txt") : page.split("\n").filter((row) => /^[0-9a-f]+:\[\["\$","(title|meta)",/.test(row)).join("\n");
  // The manifest and icon links stay: Next writes those itself, from the files of those names.
  must(head.includes("John 1") && !/og:|twitter:|"keywords"|"canonical"|"description"|"author"/.test(head) && head.length < 2000, `its head is its title, with none of the website's link-preview tags (${(head.length / 1024).toFixed(1)} KB, it was 3.6 KB)`);
  const websiteOnly = ["opengraph-image.png", "sitemap.xml", "robots.txt", "llms.txt"].filter((f) => fs.existsSync(path.join(OUT, f)));
  must(websiteOnly.length === 0, `the bundle holds none of the files only a website needs${websiteOnly.length ? ": " + websiteOnly.join(", ") : ""}`);
  // Nor the content package: 32.7 MB of the app's text for an on-device store
  // that no screen reads. The layer is switched off (lib/content/enabled.ts).
  must(!fs.existsSync(path.join(OUT, "content")), "nor the content package no screen reads (it was 32.7 MB)");
  // The fourth (1.6): a chapter drew twenty-six client components straight
  // from its page, on each of 1,362 chapters. They are one screen now
  // (components/bible/ChapterScreen.tsx), and the page names it, the reader,
  // the rail, and the phone's round plates with the buttons they hold (1.8).
  const gone = ["ReaderPrefsProvider", "BookSwitcher", "TranslationSwitcher", "ChapterPager", "BibleSearch", "BookChapterSidebar", "ChapterDiscussions"].filter((n) => inPage.includes(n));
  must(inPage.includes("ChapterScreen") && gone.length === 0, `a chapter names its screen and not the parts inside it${gone.length ? " (still named: " + gone.join(", ") + ")" : ""}`);
  must(inPage.length <= 20, `it names ${inPage.length} client components in all (it was 38)`);
  must(page.length < 40 * 1024, `John 1 is ${(page.length / 1024).toFixed(1)} KB to read (it was 68.1 KB at 1.5.2, and 51.1 before the screen)`);
});
// ---- 22. The day's readings, the calendar's date and a saint's feast day, in the reader's language (1.6).
// Three things a screen drew straight from English data, whatever the phone
// was set to: a reading's reference ("Luke 13:31-35"), the long date over the
// calendar's feast panel ("Friday · November 13, 2026") and a saint's feast
// day ("Εορτή August 9": the label from the catalog, the date not). The book
// is named from the catalog now (referenceIn, lib/bible/books.ts) and the
// dates are written by the device (formatLongDateDual, lib/saints/feastDay.ts).
// The unit tests hold the rules. This opens the screens on a phone set to
// Greek, on a fixed day, and reads them.
await section(22, async () => {
  console.log("\n22. Readings, the calendar's date and feast days, on a phone set to Greek");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const plain = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ENGLISH_DAY = new RegExp(`(${MONTHS.join("|").toLowerCase()}) \\d`);
  // Friday, November 13, 2026: Saint John Chrysostom, with readings of his own.
  const NOW = new Date("2026-11-13T10:30:00");
  const start = async (options) => {
    const opened = await open({ width: 390, height: 844, phone: true, ...options });
    await opened.page.clock.setFixedTime(NOW);
    return opened;
  };

  // Every link into a chapter at a verse, with the book its address names.
  const readingsOn = async (page, to) => {
    await go(page, to);
    await page.waitForFunction(() => document.querySelector('a[href*="/bible/"][href*="#v"]'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    return page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/bible/"][href*="#v"]')].map((a) => ({
        slug: (a.getAttribute("href").match(/\/bible\/([^/]+)\//) ?? [])[1] ?? "",
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    );
  };
  // Sorted by the name each reference opens with: the reader's own, or English.
  const sorted = (refs, names) => {
    const own = [];
    const english = [];
    for (const r of refs) {
      const mine = names[`bible.books.${r.slug}`];
      const eng = en[`bible.books.${r.slug}`];
      if (!mine || !eng) continue;
      const text = fold(r.text);
      if (new RegExp(`${plain(fold(mine))} \\d`).test(text)) own.push(r.text);
      else if (new RegExp(`(^|[^a-z])${plain(fold(eng))} \\d`).test(text)) english.push(r.text);
    }
    return { own, english };
  };
  // The date as the screen's own engine writes it, so this does not depend
  // on Node and the phone agreeing about Greek.
  const longDate = (page, locale, old) =>
    page.evaluate(
      ([l, isOld, at]) => {
        const d = new Date(at);
        const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
        const weekday = new Intl.DateTimeFormat(l, { weekday: "long", timeZone: "UTC" }).format(day);
        if (!isOld) return `${weekday} · ${new Intl.DateTimeFormat(l, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(day)}`;
        const julian = new Date(day);
        julian.setUTCDate(julian.getUTCDate() - 13);
        const dayOf = new Intl.DateTimeFormat(l, { month: "long", day: "numeric", timeZone: "UTC" });
        return `${weekday} · ${dayOf.format(day)} / ${dayOf.format(julian)}, ${day.getUTCFullYear()}`;
      },
      [locale, old, NOW.getTime()],
    );
  const screenReads = async (page, wanted) => {
    await page.waitForFunction((w) => document.body.innerText.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(w), fold(wanted), { timeout: 20000 }).catch(() => {});
    return fold(await page.evaluate(() => document.body.innerText)).includes(fold(wanted));
  };

  const { ctx, page, errors } = await start({ locale: "el-GR" });

  const today = sorted(await readingsOn(page, "/"), el);
  must(today.own.length >= 2 && today.english.length === 0, `Today names the book of each reading in Greek (${today.own.length}: ${today.own.slice(0, 2).join(" | ")})${today.english.length ? ", but not: " + today.english.join(" | ") : ""}`);
  // A book's Greek name is longer than its English one. A reference too long
  // for its row goes onto a second line; it is not cut short with three dots,
  // which hid the verses.
  const cutShort = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/bible/"][href*="#v"] span')]
        .filter((s) => s.scrollWidth > s.clientWidth + 1 && getComputedStyle(s).overflowX !== "visible")
        .map((s) => (s.textContent ?? "").trim()),
    );
  const cut = await cutShort(page);
  must(cut.length === 0, `and none is cut short on its row${cut.length ? ": " + cut.join(" | ") : ""}`);
  // A browser may break a line after a hyphen, which left "24-" at the end
  // of one line and "28" alone on the next. Each range of verses is kept
  // whole (components/bible/Reference.tsx): outside those kept parts, no
  // reference has a hyphen between two digits left.
  const looseRanges = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/bible/"][href*="#v"]')]
        .map((a) => {
          const copy = a.cloneNode(true);
          for (const kept of copy.querySelectorAll("span.whitespace-nowrap")) kept.remove();
          return { whole: (a.textContent ?? "").trim(), rest: (copy.textContent ?? "").trim() };
        })
        .filter((r) => /\d-\d/.test(r.rest))
        .map((r) => r.whole),
    );
  const loose = await looseRanges(page);
  must(loose.length === 0, `and no range of verses can be broken at its hyphen${loose.length ? ": " + loose.join(" | ") : ""}`);
  {
    const narrow = await start({ locale: "el-GR", width: 360 });
    const rows = await readingsOn(narrow.page, "/");
    const cutNarrow = await cutShort(narrow.page);
    must(rows.length >= 2 && cutNarrow.length === 0, `nor on a narrow phone, 360 wide (${rows.length} readings)${cutNarrow.length ? ": " + cutNarrow.join(" | ") : ""}`);
    // On the same narrow phone a saint's card keeps its feast day on one
    // line. With the month in full, 117 of 157 cards put it on two.
    await go(narrow.page, "/saints/");
    await narrow.page.waitForFunction(() => document.querySelectorAll(".cv-card a").length > 50, null, { timeout: 20000 }).catch(() => {});
    await narrow.page.waitForTimeout(900);
    const feastRows = await narrow.page.evaluate(() => {
      const out = { cards: 0, twoLines: [] };
      for (const card of document.querySelectorAll(".cv-card a")) {
        // Lay the card out though it is off the screen.
        card.parentElement.style.contentVisibility = "visible";
        const feast = card.lastElementChild?.firstElementChild;
        if (!feast) continue;
        out.cards += 1;
        const line = parseFloat(getComputedStyle(feast).lineHeight) || 16;
        if (Math.round(feast.getBoundingClientRect().height / line) > 1) out.twoLines.push((feast.textContent ?? "").trim());
      }
      return out;
    });
    must(feastRows.cards >= 100 && feastRows.twoLines.length === 0, `and there each saint's card keeps its feast day on one line (${feastRows.cards} cards)${feastRows.twoLines.length ? ", but " + feastRows.twoLines.length + " take two: " + feastRows.twoLines.slice(0, 2).join(" | ") : ""}`);
    await narrow.ctx.close();
  }
  const bible = sorted(await readingsOn(page, "/bible/"), el);
  must(bible.own.length >= 1 && bible.english.length === 0, `the Bible tab's reading for the day is named in Greek (${bible.own.length}: ${bible.own[0] ?? "none"})${bible.english.length ? ", but not: " + bible.english.join(" | ") : ""}`);
  const bibleLoose = await looseRanges(page);
  const calendar = sorted(await readingsOn(page, "/calendar/"), el);
  const calendarLoose = await looseRanges(page);
  must(calendar.own.length >= 2 && calendar.english.length === 0, `and so are the calendar's (${calendar.own.length})${calendar.english.length ? ", but not: " + calendar.english.join(" | ") : ""}`);
  must(bibleLoose.length === 0 && calendarLoose.length === 0, `on the Bible tab and the calendar no range of verses can be broken either${bibleLoose.length + calendarLoose.length ? ": " + [...bibleLoose, ...calendarLoose].slice(0, 2).join(" | ") : ""}`);

  const greekDate = await longDate(page, "el", false);
  const englishDate = await longDate(page, "en", false);
  must(await screenReads(page, greekDate), `the calendar's date is written in Greek ("${greekDate}")`);
  must(!fold(await page.evaluate(() => document.body.innerText)).includes(fold(englishDate)), `and not in English ("${englishDate}")`);

  // The saints' list: every card whose feast is a fixed day gives it in Greek.
  const briefs = JSON.parse(fs.readFileSync(path.resolve("data/calendar/profiled-saints.json"), "utf8"));
  const dayOf = (feast) => {
    const found = /^([A-Z][a-z]+) (\d{1,2})$/.exec(feast);
    return found && MONTHS.includes(found[1]) ? [MONTHS.indexOf(found[1]), Number(found[2])] : null;
  };
  const fixed = briefs.filter((b) => dayOf(b.feastDays[0])).map((b) => ({ slug: b.slug, day: dayOf(b.feastDays[0]) }));
  await go(page, "/saints/");
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/saints/"]').length > 50, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  const cards = await page.evaluate(
    ([list, label]) => {
      const squash = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ");
      // The card abbreviates the month: its last row has two more things on it.
      const write = new Intl.DateTimeFormat("el", { month: "short", day: "numeric", timeZone: "UTC" });
      const out = { drawn: 0, greek: 0, missed: [] };
      for (const { slug, day } of list) {
        const card = document.querySelector(`a[href="/saints/${slug}/"], a[href="/saints/${slug}"]`);
        if (!card) continue;
        const text = squash(card.textContent);
        // The card set above the list (the Theotokos) gives no feast day.
        if (!text.includes(`${squash(label)} `)) continue;
        out.drawn += 1;
        const wanted = squash(`${label} ${write.format(new Date(Date.UTC(2028, day[0], day[1], 12)))}`);
        if (text.includes(wanted)) out.greek += 1;
        else out.missed.push(slug);
      }
      return out;
    },
    [fixed, el["saints.feastLabel"]],
  );
  must(cards.drawn >= 100 && cards.greek === cards.drawn, `the saints' list gives ${cards.greek} of ${cards.drawn} feast days in Greek${cards.missed.length ? " (not: " + cards.missed.slice(0, 4).join(", ") + ")" : ""}`);
  const listText = fold(await page.evaluate(() => [...document.querySelectorAll('a[href^="/saints/"]')].map((a) => a.textContent).join("\n")));
  const stillEnglish = listText.match(new RegExp(`${plain(fold(el["saints.feastLabel"]))} ${ENGLISH_DAY.source}`, "g")) ?? [];
  must(stillEnglish.length === 0, `and none with an English month${stillEnglish.length ? ": " + stillEnglish.slice(0, 3).join(", ") : ""}`);

  // One saint's own screen: the feast days among the facts under the name.
  const chrysostom = briefs.find((b) => b.slug === "john-chrysostom");
  await go(page, "/saints/john-chrysostom/");
  await page.waitForFunction(() => document.querySelector("dl dd"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  const facts = await page.evaluate(
    ([days]) => {
      const write = new Intl.DateTimeFormat("el", { month: "long", day: "numeric", timeZone: "UTC" });
      const wanted = days.map(([m, d]) => write.format(new Date(Date.UTC(2028, m, d, 12)))).join(" · ");
      const drawn = [...document.querySelectorAll("dl dd")].map((dd) => (dd.textContent ?? "").replace(/\s+/g, " ").trim());
      return { wanted, drawn };
    },
    [chrysostom.feastDays.map(dayOf)],
  );
  must(chrysostom.feastDays.every(dayOf) && facts.drawn.includes(facts.wanted), `a saint's own screen gives his feast days in Greek ("${facts.wanted}")`);
  must(!facts.drawn.includes(chrysostom.feastDays.join(" · ")), `and not as the profile wrote them ("${chrysostom.feastDays.join(" · ")}")`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();

  // The Old Calendar keeps both reckonings in its date, in Greek too.
  {
    const { ctx, page } = await start({ locale: "el-GR", set: { "purify:calendar.style": "old" } });
    await go(page, "/calendar/");
    const both = await longDate(page, "el", true);
    must(both.includes(" / ") && (await screenReads(page, both)), `on the Old Calendar the date gives both reckonings in Greek ("${both}")`);
    await ctx.close();
  }

  // A phone whose engine cannot write dates in its language keeps the English
  // a screen already has. Asked anyway, the engine answers with a bare
  // pattern: this browser has no Georgian, and wrote "M11 13" and "Fri".
  // Should a later browser learn Georgian, the same checks expect Georgian.
  {
    const { ctx, page } = await start({ locale: "ka-GE" });
    const ka = { ...en, ...words("ka") };
    await go(page, "/calendar/");
    const knows = await page.evaluate(() => Intl.DateTimeFormat.supportedLocalesOf(["ka"]).length > 0);
    const date = knows ? await longDate(page, "ka", false) : "Friday · November 13, 2026";
    must(await screenReads(page, date), `a phone set to Georgian, which this browser ${knows ? "can" : "cannot"} write: the calendar's date reads "${date}"`);
    await go(page, "/saints/");
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/saints/"]').length > 50, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => [...document.querySelectorAll('a[href^="/saints/"]')].map((a) => (a.textContent ?? "").replace(/\s+/g, " ")).join("\n"));
    const bare = text.match(/\bM\d\d \d{1,2}\b/g) ?? [];
    must(text.includes(ka["saints.feastLabel"]) && bare.length === 0, `and no saint's feast day is a bare pattern${bare.length ? ": " + bare.slice(0, 3).join(", ") : ""}`);
    if (!knows) must(text.includes(`${ka["saints.feastLabel"]} ${chrysostom.feastDays[0]}`), `it keeps the English there: "${ka["saints.feastLabel"]} ${chrysostom.feastDays[0]}"`);
    // The screens with no English of their own to keep hand the device a
    // language it can write (dateLocale, lib/i18n/deviceDates.ts). Before,
    // this phone read "M11 13, FRI" on Today, "FRI · 2026 M11 13" on the
    // Prayers tab, "M11 2026" over the calendar and "M11 11, Wed" in the
    // fasting record: 22 such lines on these five screens.
    const patterns = [];
    for (const to of ["/", "/prayers/", "/calendar/", "/fasting/", "/catechism/"]) {
      await go(page, to);
      await page.waitForTimeout(2200);
      const lines = await page.evaluate(() => document.body.innerText.split("\n").map((l) => l.trim()).filter((l) => /\bM\d\d\b/.test(l)));
      for (const line of lines) patterns.push(`${to} "${line.slice(0, 40)}"`);
    }
    must(patterns.length === 0, `Today, the Prayers tab, the calendar, the fasting record and the catechism show no month as a bare pattern${patterns.length ? ": " + patterns.slice(0, 3).join(", ") : ""}`);
    await ctx.close();
  }

  // And a phone set to English reads what it always read.
  {
    const { ctx, page } = await start({});
    const today = sorted(await readingsOn(page, "/"), en);
    must(today.own.length >= 2, `a phone set to English: Today's readings are named as they were (${today.own.slice(0, 2).join(" | ")})`);
    const cutEnglish = await cutShort(page);
    must(cutEnglish.length === 0, `and the long one is whole, where it used to end in three dots${cutEnglish.length ? ": " + cutEnglish.join(" | ") : ""}`);
    const looseEnglish = await looseRanges(page);
    must(looseEnglish.length === 0, `with each range of verses kept on one line${looseEnglish.length ? ": " + looseEnglish.join(" | ") : ""}`);
    await go(page, "/calendar/");
    must(await screenReads(page, "Friday · November 13, 2026"), 'the calendar\'s date reads "Friday · November 13, 2026"');
    await go(page, "/saints/");
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/saints/"]').length > 50, null, { timeout: 20000 }).catch(() => {});
    const card = await page.evaluate(() => (document.querySelector('a[href="/saints/john-chrysostom/"], a[href="/saints/john-chrysostom"]')?.textContent ?? "").replace(/\s+/g, " "));
    must(card.includes(`${en["saints.feastLabel"]} ${chrysostom.feastDays[0]}`), `and a saint's card reads "${en["saints.feastLabel"]} ${chrysostom.feastDays[0]}"`);
    await ctx.close();
  }
});
// ---- 23. The owner's answers of 2026-10-12 (1.6).
// A great feast's readings lead and the day's own go under them, labelled
// (lib/calendar/orthodox.ts, FEAST_LEADS). And the lines whose English he
// approved that day, Start here and Find a parish, are in the reader's
// language, where until then they were English in every language on purpose.
await section(23, async () => {
  console.log("\n23. A great feast's readings lead, and the approved lines are in Greek");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  // The Entry of the Theotokos, a Saturday in 2026: the calendar lists the
  // Saturday's pair and the feast's.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await page.clock.setFixedTime(new Date("2026-11-21T10:30:00"));
    await go(page, "/");
    await page.waitForFunction(() => document.querySelector('a[href*="/bible/"][href*="#v"]'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    // 1.8 (the owner's pick B of round 12, "Bands", and round 3 r3-21 A): the
    // feast's pair leads the readings card and the day's own pair follows it
    // under "For the day", all inside The Church today.
    const card = await page.evaluate(() => (document.querySelector("[data-church-today]")?.textContent ?? "").replace(/\s+/g, " "));
    const order = ["Hebrews 9:1-7", "Luke 10:38-42; 11:27-28", en["bible.readForDay"], "Galatians 1:3-10", "Luke 9:57-62"].map((w) => card.indexOf(w));
    must(
      order.every((at) => at >= 0) && order.every((at, i) => i === 0 || at > order[i - 1]),
      `on the Entry of the Theotokos, Today gives the feast's Epistle and Gospel, then "${en["bible.readForDay"]}" and the Saturday's`,
    );
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // An ordinary day has no such second group.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await page.clock.setFixedTime(new Date("2026-11-13T10:30:00"));
    await go(page, "/");
    await page.waitForFunction(() => document.querySelector('a[href*="/bible/"][href*="#v"]'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => document.body.textContent ?? "");
    must(!text.includes(en["bible.readForDay"]), `and on an ordinary day nothing is headed "${en["bible.readForDay"]}"`);

    // The Church today as bands (1.8, the owner's pick B of round 12), on St
    // John Chrysostom's day, as round 3 r3-21 A has them ("The face beside
    // the words"): his words whole beside his face, the readings as one card
    // with his two readings folded into one line and Read all and Listen at
    // its foot, the Nativity path at the fast's foot in the week before the
    // fast, and Pascha's count on the date line. His face is his cover
    // portrait on the website; this walk has no network, so it must be the
    // picture the app carries for him, the Hosios Loukas mosaic (round 3
    // sheet r3-23), placed by its face on the side his cover would stand, and
    // never a broken picture or the cross.
    await page.waitForFunction(() => { const img = document.querySelector('[data-today-band="saint"] img[data-face-shown]'); return !!img && img.complete && img.naturalWidth > 0 && img.getAttribute("src") === "/saints/icons/john-chrysostom.v2.jpg"; }, null, { timeout: 10000 }).catch(() => {});
    const bands = await page.evaluate(() => {
      const rail = document.querySelector("[data-church-today]");
      const saint = rail?.querySelector('[data-today-band="saint"]');
      const fold = rail?.querySelector("[data-saints-fold]");
      const all = rail?.querySelector("[data-read-all]");
      return {
        order: [...(rail?.querySelectorAll("[data-today-band]") ?? [])].map((b) => b.getAttribute("data-today-band")),
        saint: (saint?.textContent ?? "").replace(/\s+/g, " "),
        words: (saint?.querySelector("[data-band-words]")?.textContent ?? "").trim(),
        face: saint?.getAttribute("data-face") ?? null,
        shown: (() => { const img = saint?.querySelector("img[data-face-shown]"); return img ? { src: img.getAttribute("src"), ok: img.complete && img.naturalWidth > 0 } : null; })(),
        cross: !!saint?.querySelector("[data-band-cross]"),
        tour: saint?.getAttribute("data-tour") ?? "",
        share: !!saint?.querySelector("[data-saint-share]"),
        source: saint?.querySelector("[data-cite]")?.getAttribute("href") ?? "",
        page: saint?.querySelector("a.today-band-link")?.getAttribute("href") ?? "",
        broken: [...(rail?.querySelectorAll("img") ?? [])].filter((i) => i.complete && i.naturalWidth === 0 && i.getClientRects().length > 0).map((i) => i.getAttribute("src")),
        lit: [...(rail?.querySelectorAll("[data-fast-mark][data-allowed]") ?? [])].map((m) => m.getAttribute("data-fast-mark")),
        struck: [...(rail?.querySelectorAll("[data-fast-mark]:not([data-allowed])") ?? [])].map((m) => m.getAttribute("data-fast-mark")),
        read: !!rail?.querySelector('[data-today-band="readings"] a[href*="/bible/1-thessalonians/5"]') && !!rail?.querySelector('[data-today-band="readings"] a[href*="/bible/luke/13"]'),
        path: rail?.querySelector('[data-today-band="fast"] [data-nativity-path]')?.getAttribute("href") ?? "",
        fold: fold ? { line: (fold.textContent ?? "").replace(/\s+/g, " ").trim(), open: fold.getAttribute("aria-expanded") } : null,
        all: all ? { words: (all.textContent ?? "").trim(), href: all.getAttribute("href") ?? "" } : null,
        listen: !!rail?.querySelector("[data-listen]"),
        dateline: (document.querySelector("header.mb-5 > p")?.textContent ?? "").trim(),
      };
    });
    must(bands.order.join(",") === "saint,fast,readings", `The Church today is three bands, the saint, the fast and the readings (${bands.order.join(", ")})`);
    must(bands.saint.includes("St. John Chrysostom") && bands.words === "“Let no one fear death, for the Saviour's death hath set us free.”", `the saint's band names him and sets his words whole (${bands.words.slice(0, 70) || bands.saint.slice(0, 70)})`);
    must(
      bands.face === "right" && bands.shown?.src === "/saints/icons/john-chrysostom.v2.jpg" && bands.shown.ok && !bands.cross && bands.broken.length === 0,
      `with no signal his face is the mosaic the app carries, on his side of the band, and nothing is broken (${bands.shown?.src ?? "no picture"}, side ${bands.face}${bands.broken.length ? "; broken: " + bands.broken.join(", ") : ""})`,
    );
    must(bands.share && /^\/saints\/john-chrysostom\/paschal-homily\/?#p-1-4$/.test(bands.source) && /^\/saints\/john-chrysostom\/?$/.test(bands.page) && bands.tour === "quote-picture", `with Share as a picture, the source line at the homily (${bands.source || "none"}), his page from the band (${bands.page || "none"}), and the tour's mark on it`);
    must(bands.lit.join(",") === "wine,oil" && bands.struck.join(",") === "fish,meat", `the Friday fast lights wine and oil and strikes fish and meat (${bands.lit.join(", ")} | ${bands.struck.join(", ")})`);
    must(/^\/reading\/paths\/nativity\/?$/.test(bands.path), `the Nativity path stands at the foot of the fast in the week before it (${bands.path || "none"})`);
    must(bands.read, "the readings card opens 1 Thessalonians 5 and Luke 13");
    must(bands.fold?.line === `${en["bible.readForCommemoration"]} · 2 more` && bands.fold.open === "false", `his two readings are one line, shut ("${bands.fold?.line ?? "none"}")`);
    must(bands.all?.words === "Read all 4" && bands.all.href.includes("/bible/1-thessalonians/5") && bands.listen, `Read all 4 walks from the day's Epistle, and Listen is beside it (${bands.all?.words ?? "none"}, ${bands.all?.href ?? ""})`);
    must(bands.dateline.endsWith("170 days until Pascha"), `Pascha's count is on the date line ("${bands.dateline}")`);
    // The readings band's start corners are as dark as its shade, with no
    // line of the manuscript round them: the shade lay over the page and was
    // clipped to the curve on its own (found with the owner's build 80 note
    // 1). ChurchTodayRail.tsx and .today-readings-picture in globals.css;
    // lib/ui/__tests__/pictureCorners.test.ts holds the source.
    try {
      await page.evaluate(() => document.querySelector('[data-today-band="readings"]')?.scrollIntoView({ block: "center" }));
      await page.waitForFunction(() => { const img = document.querySelector('[data-today-band="readings"] img'); return !!img && img.complete && img.naturalWidth > 0; }, null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(300);
      const lift = await cornerLift(page, '[data-today-band="readings"]', ["top-start", "bottom-start"]);
      must(lift.lift <= 4, `the readings band's start corners are as dark as its shade, with no line of the page round them (${lift.lift} levels over the band inside along the curve, ${lift.most} at its lightest; 1.8's markup measured 16)`);
    } catch (e) {
      must(false, `the readings band's corners could not be measured: ${firstLine(e)}`);
    }

    // His two readings open in place under the line.
    await tap(page.locator("[data-saints-fold]"));
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => {
      const fold = document.querySelector("[data-saints-fold]");
      const body = fold ? document.getElementById(fold.getAttribute("aria-controls") ?? "") : null;
      const rows = [...(body?.querySelectorAll("a") ?? [])].map((a) => ({ href: a.getAttribute("href") ?? "", tall: a.getBoundingClientRect().height }));
      return { open: fold?.getAttribute("aria-expanded"), inert: body?.hasAttribute("inert") ?? true, rows };
    });
    must(
      opened.open === "true" && !opened.inert && opened.rows.length === 2 && opened.rows[0].href.includes("/bible/hebrews/7") && opened.rows[1].href.includes("/bible/john/10") && opened.rows.every((r) => r.tall >= 43),
      `a tap on the line opens Hebrews 7 and John 10 in place, each a 44px row (${opened.rows.map((r) => `${r.href} ${Math.round(r.tall)}px`).join(", ") || "none"})`,
    );

    // The share mark makes the picture, from the band itself.
    await tap(page.locator("[data-saint-share]"));
    await page.waitForFunction(() => !!document.querySelector('[role="dialog"]'), null, { timeout: 10000 }).catch(() => {});
    must(await page.evaluate(() => !!document.querySelector('[role="dialog"]')), "the share mark on his band opens the picture sheet");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    if (inBundle(OUT, "/saints/john-chrysostom/paschal-homily/")) {
      await tap(page.locator('[data-today-band="saint"] [data-cite]'));
      await page.waitForFunction(() => location.pathname.startsWith("/saints/john-chrysostom/paschal-homily"), null, { timeout: 15000 }).catch(() => {});
      must(await page.evaluate(() => location.pathname.startsWith("/saints/john-chrysostom/paschal-homily") && location.hash === "#p-1-4"), "and the source line under his words opens the homily at those words");
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    const told = (keys) => keys.filter((k) => el[k] && el[k] !== en[k]);
    const read = async (to, keys) => {
      await go(page, to);
      await page.waitForFunction((w) => document.body.innerText.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(w), fold(el[told(keys)[0]]), { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(600);
      const text = fold(await page.evaluate(() => document.body.innerText));
      return { greek: told(keys).filter((k) => text.includes(fold(el[k]))).length, of: told(keys).length };
    };
    const start = await read("/start/", ["start.title", "start.intro", "start.step.prayer.title", "start.step.cross.title", "start.step.cross.body", "start.step.parish.body", "start.closing"]);
    must(start.of >= 6 && start.greek === start.of, `Start here, on a phone set to Greek: ${start.greek} of ${start.of} lines are in Greek`);
    const parishes = await read("/parishes/", ["parishes.title", "parishes.intro", "parishes.leaving", "parishes.region.northAmerica", "parishes.region.westernEurope"]);
    must(parishes.of >= 4 && parishes.greek === parishes.of, `Find a parish: ${parishes.greek} of ${parishes.of} lines are in Greek`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 24. Open almost at once (1.6), on the horizon (1.8).
// The one document the apps load carries Purify's intro, with no words in it,
// and a few lines that lift the phone's logo screen once it is painted
// (lib/platform/launchFrame.ts). This reads the document, then watches a cold
// start frame by frame: the intro is up before the app has drawn anything,
// the logo screen is asked to go once and by the document itself, the intro
// covers the page until the app says it is ready AND it has played, and then
// it is gone and the tab bar answers a tap. That first cold start of the day
// plays the slow pace; a second the same day plays the quick one, and the
// first of a new day is slow again (the owner, 2026-10-28). Last, with the
// app's code held back altogether, the intro still comes up, and still goes.
//
// What this cannot see is the phone's own logo screen going. A browser has
// none. That part needs a real phone.
await section(24, async () => {
  console.log("\n24. Open almost at once: the intro before the app");
  const doc = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  const at = doc.indexOf("data-launch-frame");
  must(at > 0, "the apps' document carries the intro");
  const scriptAt = doc.indexOf("<script", at);
  const outline = at > 0 ? doc.slice(doc.lastIndexOf("<div", at), scriptAt).replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/, "") : "";
  must(outline.length > 200 && outline.replace(/<[^>]+>/g, "").trim() === "", `and it has no words in it (${outline.length} bytes of shapes)`);
  must(at > 0 && doc.slice(scriptAt, scriptAt + 1200).includes("nativePromise"), "the lines that lift the logo screen follow it in the document");
  // The lines that choose its pace by the reader's day (the owner,
  // 2026-10-28: slow on the day's first cold start, quick on every later one)
  // come just before it, so it is never in the page on the wrong one.
  const paceAt = at > 0 ? doc.lastIndexOf("<script", at) : -1;
  const paceLines = paceAt > 0 ? doc.slice(paceAt, doc.lastIndexOf("<div", at)) : "";
  must(paceLines.includes("data-intro-pace") && paceLines.includes("purify.intro.day"), "the lines that choose its pace come just before it in the document");
  // The intro's builds as the document carries them (lib/platform/launchFrame.ts
  // INTRO_BUILD_MS on the day's first cold start, INTRO_QUICK_BUILD_MS on every
  // later one), how long the cover takes to go on each, and how long the
  // horizon takes to rise on each (app/globals.css).
  const builds = /setTimeout\(played,d\.getAttribute\('data-intro-pace'\)==='quick'\?(\d+):(\d+)\)/.exec(doc.slice(scriptAt, scriptAt + 1200));
  const quickMs = Number(builds?.[1] ?? NaN);
  const buildMs = Number(builds?.[2] ?? NaN);
  must(buildMs >= 900 && quickMs >= 600 && quickMs < buildMs, `the document plays the intro for ${buildMs} ms on the day's first cold start, ${quickMs} ms on every later one`);
  const css = fs.readFileSync("app/globals.css", "utf8");
  const leaveMs = Number(/\[data-launch-frame\] \{\s*transition:[^;]*visibility 0s linear (\d+)ms;/.exec(css)?.[1] ?? 600);
  const quickLeaveMs = Number(/html\[data-intro-pace="quick"\] \[data-launch-frame\] \{\s*transition-duration:[^;]*;\s*transition-delay: \d+ms, (\d+)ms;/.exec(css)?.[1] ?? 360);
  const riseMs = Number(/\n\.launch-horizon \{\s*animation: launch-rise (\d+)ms/.exec(css)?.[1] ?? NaN);
  const quickRiseMs = Number(/html\[data-intro-pace="quick"\] \.launch-horizon \{\s*animation-duration: (\d+)ms;/.exec(css)?.[1] ?? NaN);

  // Every frame from the first. The shell's own handle is stood in for, so a
  // call to it is seen: only the document's lines use it here, because the
  // app's own call goes through the plugin, which in a browser does nothing.
  const watch = () => {
    const log = { asks: [], first: null, frame: null, ready: null, played: null, leaving: null, covered: [], words: [], pace: null, rise: null };
    window.__open = log;
    window.Capacitor = {
      nativePromise: (plugin, method) => {
        log.asks.push([Math.round(performance.now()), plugin, method]);
        return Promise.resolve();
      },
    };
    const tick = () => {
      const root = document.documentElement;
      const el = document.querySelector("[data-launch-frame]");
      if (root && el) {
        const now = Math.round(performance.now());
        const style = getComputedStyle(el);
        const up = style.visibility !== "hidden" && Number(style.opacity) > 0.99;
        const state = root.dataset.launch ?? "";
        const today = !!document.querySelector("[data-route-content]");
        // The pace on the first frame, and how long the stylesheet gives the
        // horizon to rise on it.
        if (log.pace === null) {
          log.pace = root.dataset.introPace ?? "";
          const horizon = el.querySelector(".launch-horizon");
          log.rise = horizon ? Math.round(parseFloat(getComputedStyle(horizon).animationDuration) * 1000) : null;
        }
        if (up && log.first === null) log.first = now;
        if (!up && log.first !== null && log.leaving === null) log.leaving = now;
        if (state === "frame" && log.frame === null) log.frame = { at: now, today };
        if (state === "ready" && log.ready === null) log.ready = { at: now, today };
        const played = root.dataset.intro === "played";
        if (played && log.played === null) log.played = now;
        // Until it starts to go: from that instant the taps go through to
        // the app, on purpose, while the fade is still at its first frame.
        if (up && !(state === "ready" && played)) {
          // Nine points across the screen: each belongs to the intro.
          let mine = 0;
          for (const x of [0.1, 0.5, 0.9]) for (const y of [0.1, 0.5, 0.9]) {
            const hit = document.elementFromPoint(innerWidth * x, innerHeight * y);
            if (hit && el.contains(hit)) mine++;
          }
          log.covered.push(mine);
          const text = (el.innerText || "").trim();
          if (text) log.words.push(text);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const outlineNow = () => {
    const el = document.querySelector("[data-launch-frame]");
    if (!el) return null;
    const style = getComputedStyle(el);
    const hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return { visibility: style.visibility, opacity: Number(style.opacity), takesTheMiddle: !!hit && el.contains(hit), state: document.documentElement.dataset.launch ?? "" };
  };

  // A cold start, as it goes. A new phone's first, so the first of its day.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await ctx.addInitScript(watch);
    await go(page, "/");
    await page.waitForFunction(() => window.__open?.ready && window.__open?.played, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(leaveMs + 400);
    const log = await page.evaluate(() => window.__open);
    must(log.pace === "slow" && log.rise === riseMs, `the first cold start of the day plays the slow pace (marked "${log.pace}", the horizon rising in ${log.rise} ms of ${riseMs})`);
    must(log.first !== null && log.ready && log.first < log.ready.at, `the intro is painted before the app is ready (at ${log.first} ms; the app says ready at ${log.ready?.at} ms)`);
    must(log.asks.length === 1 && log.asks[0][1] === "SplashScreen" && log.asks[0][2] === "hide", `the document asks the phone to lift its logo screen, once (${log.asks.map((a) => `${a[1]}.${a[2]} at ${a[0]} ms`).join(", ") || "never"})`);
    must(log.frame && log.ready && log.frame.at <= log.ready.at && log.asks[0]?.[0] <= log.ready.at, `and it asks before the app is ready (marked at ${log.frame?.at} ms)`);
    must(log.covered.length > 0 && log.covered.every((n) => n === 9), `while it is up it covers the page (${log.covered.length} frames, least ${Math.min(...log.covered, 9)} of 9 points)`);
    must(log.words.length === 0, `and shows no words${log.words.length ? ": " + log.words[0].slice(0, 60) : ""}`);
    must(log.ready?.today === true, "when the app says ready, Today is under it");
    // The intro plays in full: marked played a whole build after the logo
    // was asked to go (lib/platform/launchFrame.ts INTRO_BUILD_MS), and the
    // cover does not start to go before it is both played and ready.
    const build = log.played !== null && log.asks[0] ? log.played - log.asks[0][0] : null;
    must(build !== null && build >= buildMs - 20 && build <= buildMs + 200, `it plays in full: marked played ${build} ms after the logo was asked to go (its build is ${buildMs} ms)`);
    must(log.leaving !== null && log.leaving >= Math.max(log.ready?.at ?? 0, log.played ?? 0) - 20, `and it goes only once the app is ready and it has played (starts to go at ${log.leaving} ms)`);
    const after = await page.evaluate(outlineNow);
    must(after && after.visibility === "hidden" && after.opacity === 0 && !after.takesTheMiddle, `then the intro is gone (visibility ${after?.visibility}, opacity ${after?.opacity})`);
    await tap(page.locator("[data-tab-label]").nth(1));
    await page.waitForFunction(() => location.pathname !== "/", null, { timeout: 15000 }).catch(() => {});
    must(new URL(page.url()).pathname !== "/", `and the tab bar answers a tap (went to ${new URL(page.url()).pathname})`);
    say("  intro painted, ms", log.first);
    say("  logo asked to go, ms", log.asks[0]?.[0] ?? "never");
    say("  app ready, ms", log.ready?.at ?? "never");
    say("  intro played, ms", log.played ?? "never");
    say("  intro starts to go, ms", log.leaving ?? "never");

    // A second cold start the same day: the quick pace, the intro's first.
    // Not go(), which moves within the app: the document is loaded again, as
    // a phone loads it when the app is opened after it was closed.
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__open?.ready && window.__open?.played, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(quickLeaveMs + 400);
    const again = await page.evaluate(() => window.__open);
    must(again.pace === "quick" && again.rise === quickRiseMs, `a second cold start the same day plays the quick pace (marked "${again.pace}", the horizon rising in ${again.rise} ms of ${quickRiseMs})`);
    const quickBuild = again.played !== null && again.asks[0] ? again.played - again.asks[0][0] : null;
    must(quickBuild !== null && quickBuild >= quickMs - 20 && quickBuild <= quickMs + 200, `and plays in full on it: marked played ${quickBuild} ms after the logo was asked to go (its build is ${quickMs} ms)`);
    must(again.covered.length > 0 && again.covered.every((n) => n === 9) && again.words.length === 0, `and while it is up it covers the page, with no words (${again.covered.length} frames)`);
    must(again.leaving !== null && again.leaving >= Math.max(again.ready?.at ?? 0, again.played ?? 0) - 20, `and it goes only once the app is ready and it has played (starts to go at ${again.leaving} ms)`);
    const gone = await page.evaluate(outlineNow);
    must(gone && gone.visibility === "hidden" && gone.opacity === 0 && !gone.takesTheMiddle, `then it is gone, ${quickLeaveMs} ms after it starts to go (visibility ${gone?.visibility}, opacity ${gone?.opacity})`);
    say("  second cold start: intro played, ms", again.played ?? "never");
    say("  second cold start: intro starts to go, ms", again.leaving ?? "never");

    // The day it keeps is the phone's own. Put back a day, as the next
    // morning finds it, and the next cold start is slow again.
    const day = await page.evaluate(() => {
      const t = new Date();
      const two = (n) => String(n).padStart(2, "0");
      return { kept: localStorage.getItem("purify.intro.day"), today: `${t.getFullYear()}-${two(t.getMonth() + 1)}-${two(t.getDate())}` };
    });
    must(day.kept === day.today, `the day it keeps is the reader's own (${day.kept}; the phone says ${day.today})`);
    await page.evaluate(() => localStorage.setItem("purify.intro.day", "2000-01-01"));
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 120000 });
    const next = await page.evaluate(() => ({ pace: document.documentElement.dataset.introPace ?? "", kept: localStorage.getItem("purify.intro.day") }));
    must(next.pace === "slow" && next.kept === day.today, `and the first cold start of a new day is slow again (marked "${next.pace}", the day kept now ${next.kept})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The app's code held back altogether: what the phone has at first paint.
  // And the intro's picture, measured: the cross where and as large as the
  // phone's own logo screen draws it, so the hand-over cannot be seen, and
  // the horizon risen to below it.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await ctx.addInitScript(watch);
    await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(`${ORIGIN}/`, { waitUntil: "commit", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.dataset.launch === "frame", null, { timeout: 20000 }).catch(() => {});
    const held = await page.evaluate(outlineNow);
    const log = await page.evaluate(() => window.__open);
    must(held && held.state === "frame" && held.visibility === "visible" && held.takesTheMiddle, "with the app's code held back, the intro is still on the screen");
    must(log.asks.length === 1, `and the logo screen has still been asked to go (${log.asks.length} time${log.asks.length === 1 ? "" : "s"})`);
    await page.waitForFunction(() => document.documentElement.dataset.intro === "played", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(200);
    const fit = await page.evaluate(() => {
      const cross = document.querySelector("[data-launch-frame] img");
      const r = cross?.getBoundingClientRect();
      return {
        drawn: !!cross?.complete && cross.naturalWidth > 0,
        cx: r ? r.left + r.width / 2 : null,
        cy: r ? r.top + r.height / 2 : null,
        tall: r?.height ?? null,
        crest: document.querySelector("[data-launch-frame] .launch-horizon")?.getBoundingClientRect().top ?? null,
      };
    });
    const near = (a, b, by) => a !== null && b !== null && Math.abs(a - b) <= by;
    must(fit.drawn, "the cross is drawn, from the document itself");
    must(near(fit.cx, 195, 0.5) && near(fit.cy, 422, 0.5), `the cross sits in the middle of the screen, as on the phone's logo screen (${fit.cx}, ${fit.cy})`);
    must(near(fit.tall, 80, 0.5), `and is 80 px tall, as the logo screen's is (${fit.tall} px)`);
    must(fit.crest !== null && fit.crest > (fit.cy ?? 0) + 40 + 80, `the horizon has risen to below it (its crest ${fit.crest} px down)`);
    await page.screenshot({ path: path.join(SHOTS, "open-intro-phone.png") });
    // And it never stays for good: past its limit the document says ready itself.
    await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(leaveMs + 300);
    const gone = await page.evaluate(outlineNow);
    must(gone && gone.state === "ready" && gone.visibility === "hidden", `and with no app at all it takes itself away at its limit (state "${gone?.state}", visibility ${gone?.visibility})`);
    await ctx.close();
  }

  // Frames that never come. A web view may hold its frames back while the
  // phone's own logo screen is up. It is not known that any phone does, and
  // a computer cannot say, so neither the document's lines nor the app's own
  // lift may depend on a frame: each has a net under its two frames
  // (LIFT_ANYWAY_MS). Without the nets this open would last until the app's
  // 4 second limit. The page here is never handed a frame at all.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await ctx.addInitScript(() => {
      const log = { asks: [], frame: null, today: null, ready: null, played: null };
      window.__still = log;
      window.requestAnimationFrame = () => 0;
      window.cancelAnimationFrame = () => {};
      window.Capacitor = {
        nativePromise: (plugin, method) => {
          log.asks.push([Math.round(performance.now()), plugin, method]);
          return Promise.resolve();
        },
      };
      setInterval(() => {
        const now = Math.round(performance.now());
        const state = document.documentElement?.dataset.launch ?? "";
        if (state === "frame" && log.frame === null) log.frame = now;
        if (log.today === null && document.querySelector("[data-route-content]")) log.today = now;
        if (state === "ready" && log.ready === null) log.ready = now;
        if (document.documentElement?.dataset.intro === "played" && log.played === null) log.played = now;
      }, 10);
    });
    // Not go(): it waits on frames, and so does a wait with no polling time.
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__still?.ready && window.__still?.played, null, { timeout: 20000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(leaveMs + 400);
    const log = await page.evaluate(() => window.__still);
    const gone = await page.evaluate(outlineNow);
    must(log.asks.length === 1 && log.frame !== null && log.frame < 2000, `with no frames at all, the document still asks the phone to lift its logo screen, once (${log.asks.length} time${log.asks.length === 1 ? "" : "s"}, marked at ${log.frame} ms)`);
    must(log.today !== null && log.ready !== null && log.ready - log.today < 1500, `and the app still says ready once Today is in the page, not at its 4 second limit (Today at ${log.today} ms, ready at ${log.ready} ms)`);
    must(gone && gone.state === "ready" && gone.visibility === "hidden", `and the intro goes (visibility ${gone?.visibility})`);
    await ctx.close();
  }

  // The same intro on the light palette, where it stays the night, and on a
  // tablet, for the eye.
  for (const [name, size, set] of [
    ["open-intro-light.png", { width: 390, height: 844 }, { "purify.reader.theme": "parchment" }],
    ["open-intro-tablet.png", { width: 820, height: 1180 }, {}],
  ]) {
    const { ctx, page } = await open({ ...size, phone: true, set });
    await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(`${ORIGIN}/`, { waitUntil: "commit", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.dataset.intro === "played", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (set["purify.reader.theme"]) {
      const ground = await page.evaluate(() => [document.documentElement.dataset.readingMode ?? "", getComputedStyle(document.querySelector("[data-launch-frame]")).backgroundColor]);
      must(ground[0] === "parchment" && ground[1] === "rgb(16, 16, 19)", `on the light palette the intro is still the night (${ground[0]}: ${ground[1]})`);
    }
    await page.screenshot({ path: path.join(SHOTS, name) });
    await ctx.close();
  }
});
// ---- 25. Every glyph in the tab bar at one size (1.6).
// The six glyphs were drawn at different times and none fills its drawing
// the same way, so the row was six sizes: the sun small and high, the church
// tall. The bar now hands each glyph a frame worked out from where its lines
// really are (lib/ui/tabGlyphFrame.ts). This measures the glyphs as the built
// app draws them: each one's lines, their thickness included, in the units of
// a 24-unit drawing. Tall and wide glyphs are 20 along their long side, the
// two square ones 18, and every one is centred. It also holds the two glyphs
// the owner asked for on 2026-10-13: the three-bar cross on Discover and
// praying hands on Prayers.
await section(25, async () => {
  console.log("\n25. Every tab glyph at one size");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  const measure = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-tab-label]")].map((label) => {
        const li = label.closest("li");
        const svg = li.querySelector("svg");
        const box = svg.getBBox();
        const [vx, vy, vw, vh] = (svg.getAttribute("viewBox") ?? "0 0 24 24").split(" ").map(Number);
        const scale = 24 / vw;
        const lines = Number(svg.getAttribute("stroke-width") ?? "1") * scale;
        return {
          tab: label.textContent.trim(),
          lit: (li.querySelector("a")?.className ?? "").includes("font-semibold"),
          w: box.width * scale + lines,
          h: box.height * scale + lines,
          lines,
          // How far the lines' middle is from the middle of the frame, in the same units.
          off: Math.max(Math.abs(box.x + box.width / 2 - (vx + vw / 2)), Math.abs(box.y + box.height / 2 - (vy + vh / 2))) * scale,
          paths: svg.querySelectorAll("path").length,
          rects: svg.querySelectorAll("rect").length,
          first: svg.querySelector("path")?.getAttribute("d") ?? "",
        };
      }),
    );
  await go(page, "/");
  await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const onToday = await measure();
  await page.screenshot({ path: path.join(SHOTS, "tab-bar-phone.png"), clip: { x: 0, y: 844 - 110, width: 390, height: 110 } });
  await go(page, "/bible/");
  await page.waitForTimeout(1500);
  const onBible = await measure();
  // Each glyph idle: Today's from the Bible screen, the rest from Today.
  const idle = onToday.map((g, i) => (g.lit ? onBible[i] : g));
  const long = (g) => Math.max(g.w, g.h);
  const fmt = (n) => n.toFixed(1);
  must(idle.length >= 5 && idle.every((g) => !g.lit), `the bar has ${idle.length} glyphs, each measured idle`);
  must(
    idle.every((g) => Math.abs(long(g) - 20) < 0.35 || Math.abs(long(g) - 18) < 0.35),
    `each is 20 or 18 along its long side, lines included (${idle.map((g) => `${g.tab} ${fmt(g.w)} x ${fmt(g.h)}`).join(", ")})`,
  );
  const tall = idle.filter((g) => g.h > g.w * 1.14);
  must(tall.length >= 2 && Math.max(...tall.map((g) => g.h)) - Math.min(...tall.map((g) => g.h)) < 0.3, `the tall ones stand the same height (${tall.map((g) => `${g.tab} ${fmt(g.h)}`).join(", ")})`);
  must(idle.every((g) => g.off < 0.3), `and every one is centred in its box (furthest off: ${fmt(Math.max(...idle.map((g) => g.off)))} units)`);
  const lit = onToday.find((g) => g.lit);
  must(!!lit && lit.lines > idle[0].lines, `the tab that is open has the thicker lines (${fmt(lit?.lines ?? 0)} against ${fmt(idle[1].lines)})`);
  const discover = idle.find((g) => g.tab === "Discover");
  const prayers = idle.find((g) => g.tab === "Prayers");
  must(!!discover && discover.paths === 4 && discover.first.replace(/\s+/g, " ").startsWith("M12 3.2 V20.4"), "Discover wears the three-bar cross");
  must(!!prayers && prayers.rects === 2 && prayers.paths >= 8, `Prayers wears the praying hands (${prayers?.paths} lines and ${prayers?.rects} cuffs)`);
  must(!!prayers && prayers.lines < idle[1].lines + 0.01 && onBible.find((g) => g.tab === "Prayers").lines < 1.1, `whose lines are thin, so they can be told apart (${fmt(prayers?.lines ?? 0)})`);

  // Five tabs (the owner's yes of 2026-10-13). Shop and Chat are tiles on
  // Discover, You is back, and the bar still lights a tab wherever a
  // reader is.
  const litTabs = () => page.evaluate(() => [...document.querySelectorAll("[data-tab-label]")].filter((l) => (l.closest("a")?.className ?? "").includes("font-semibold")).map((l) => l.textContent.trim()));
  const words = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const want = ["nav.today", "nav.bible", "nav.discover", "nav.prayers", "nav.you"].map((k) => words[k]);
  must(JSON.stringify(idle.map((g) => g.tab)) === JSON.stringify(want), `the bar reads ${idle.map((g) => g.tab).join(", ")}`);
  await go(page, "/discover/");
  await page.waitForFunction((w) => document.body.innerText.includes(w), words["discover.tile.saints"], { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('[data-route-content] a[href]')].map((a) => [a.getAttribute("href").replace(/\/$/, ""), (a.textContent ?? "").replace(/\s+/g, " ").trim()]));
  const tile = (href) => tiles.find(([h]) => h === href)?.[1] ?? "";
  // 1.8: the tiles are a gallery's bands, each its name and then its line,
  // so a band's words start with its name.
  must(tile("/shop").startsWith(words["nav.shop"]) && tile("/community").startsWith(words["nav.chat"]), `Discover has a ${tile("/shop").slice(0, 40) || "(no)"} band and a ${tile("/community").slice(0, 40) || "(no)"} band`);
  must(!tiles.some(([h]) => h === "/account"), "and no longer ends on a Settings row");
  await page.screenshot({ path: path.join(SHOTS, "discover-tiles-phone.png"), fullPage: true });
  // The bands' start corners are as dark as their shade (the owner's build
  // 80 note 1, "a thin sliver shows with no shadow, as if trimmed off"). Read
  // along each band's top and bottom start curves with cornerLift (above):
  // the lift a tenth of the curve's pixels reach may be 6 levels at most.
  // 1.8's own walk had the picture showing round the shade there, 30 to 55
  // levels lighter on every band. This read the curve's single lightest
  // pixel until the first build with the fix, where a speck of the Reading
  // band's own picture read 12 while the corner, drawn six times over,
  // showed no line at all. components/ui/GalleryBand.tsx and .band-picture
  // in globals.css; lib/ui/__tests__/galleryBand.test.ts holds the source.
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page
      .waitForFunction(() => [...document.querySelectorAll("[data-route-content] li > a[href] img")].slice(0, 4).every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(300);
    const bands = await page.evaluate(() =>
      [...document.querySelectorAll("[data-route-content] li > a[href]")]
        .map((a) => ({ href: a.getAttribute("href") ?? "", r: a.getBoundingClientRect(), radius: parseFloat(getComputedStyle(a).borderTopLeftRadius) || 0, img: !!a.querySelector("img") }))
        .filter((b) => b.img && b.radius > 0 && b.r.height > 80 && b.r.top >= 0 && b.r.bottom <= innerHeight - 120)
        .slice(0, 4)
        .map((b) => ({ href: b.href, left: b.r.left, top: b.r.top, height: b.r.height, radius: b.radius })),
    );
    const corners = [];
    for (const b of bands) {
      const lift = await cornerLift(page, `[data-route-content] li > a[href="${b.href}"]`, ["top-start", "bottom-start"]);
      corners.push({ href: b.href, lift: lift.lift, most: lift.most });
    }
    must(
      corners.length >= 3 && corners.every((c) => c.lift <= 6),
      `the bands' start corners are as dark as their shade, with no line of the picture round them (${corners.map((c) => `${c.href} ${c.lift} (${Math.round(c.most)} at its lightest)`).join(", ") || "no bands measured"} levels over the band inside along the curve)`,
    );
  } catch (e) {
    must(false, `the bands' start corners could not be measured: ${firstLine(e)}`);
  }
  // /settings/ among them: its tab was written without the closing slash the
  // apps' addresses have, so the one screen every row of You leads to lit
  // nothing. Seen in this walk's own picture of Settings. The reading plans
  // and the journal light Bible (1.7): they are reached from the Bible tab.
  for (const [to, tab] of [["/shop/", words["nav.discover"]], ["/community/", words["nav.discover"]], ["/account/", words["nav.you"]], ["/saved/", words["nav.you"]], ["/settings/", words["nav.you"]], ["/prayers/", words["nav.prayers"]], ["/plans/", words["nav.bible"]], ["/journal/", words["nav.bible"]]]) {
    await go(page, to);
    await page.waitForTimeout(900);
    const on = await litTabs();
    must(on.length === 1 && on[0] === tab, `${to} lights ${tab}, and only it (${on.join(", ") || "nothing"})`);
  }
  await go(page, "/");
  await page.waitForTimeout(600);
  await tap(page.locator("[data-tab-label]").last());
  await page.waitForFunction(() => location.pathname.startsWith("/account"), null, { timeout: 15000 }).catch(() => {});
  must(new URL(page.url()).pathname.startsWith("/account"), `the last tab, ${want[4]}, opens the reader's own screen (${new URL(page.url()).pathname})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 26. The small labels, in the reader's language (1.6).
// Forty-five lines that were written into the screens in English and so were
// English on every phone: the palettes' names and what each one is, the
// saints' groups, the four feasts that move with Pascha, the FAQ's questions,
// two lines of the support screen and the shop's line for no connection. The
// owner approved their translations on 2026-10-13 and they read from the
// catalogs now. The unit test holds the keys; this opens the screens on a
// phone set to Greek and reads them, the support and FAQ pages through their
// islands among them, which only a built app can show.
await section(26, async () => {
  console.log("\n26. The small labels, on a phone set to Greek");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // Only a line Greek has its own words for can show which language is drawn.
  const told = (keys) => keys.filter((k) => el[k] && el[k] !== en[k]);
  // What a screen says: its words, and what its controls say of themselves.
  // A palette's one line is a chip's title, read out and shown on a long
  // press, and is not among the words drawn.
  const said = () => document.body.innerText + " " + [...document.querySelectorAll("[title]")].map((e) => e.getAttribute("title")).join(" ");
  const read = async (page, to, keys, table) => {
    await go(page, to);
    const first = fold(table[told(keys)[0]]);
    await page.waitForFunction((w) => (document.body.innerText + " " + [...document.querySelectorAll("[title]")].map((e) => e.getAttribute("title")).join(" ")).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(w), first, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    const text = fold(await page.evaluate(said));
    return { there: told(keys).filter((k) => text.includes(fold(table[k]))).length, of: told(keys).length, english: told(keys).filter((k) => text.includes(fold(en[k])) && !text.includes(fold(el[k]))) };
  };
  const SCREENS = [
    ["the FAQ's questions", "/faq/", ["faq.orthodox.q", "faq.bible.q", "faq.fasting.q", "faq.free.q", "faq.data.q"]],
    ["the saints' groups", "/saints/", ["saints.group.apostles", "saints.group.martyrs", "saints.group.hierarchs", "saints.group.wonderworkers", "saints.group.women"]],
    ["what each palette is, in Settings", "/settings/", ["settings.paletteDarkHint", "settings.paletteLightHint", "settings.paletteTrueBlackHint"]],
    ["the support screen's two lines", "/support/", ["support.workBehindTheApp", "support.gladYouAreHere"]],
    // The walk has no network, so the shop shows its line for no connection.
    ["the shop's line for no connection", "/shop/", ["shop.couldntReachTheShop"]],
    ["a feast that moves with Pascha, on St Mary of Egypt's page", "/saints/mary-of-egypt/", ["saints.movableFeast.fifthSundayOfLent"]],
  ];
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    for (const [name, to, keys] of SCREENS) {
      const got = await read(page, to, keys, el);
      must(got.of >= 1 && got.there === got.of && got.english.length === 0, `${name}: ${got.there} of ${got.of} in Greek${got.english.length ? ", still English: " + got.english.join(", ") : ""}`);
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // And a phone set to English reads every one as it always did.
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    let there = 0;
    let of = 0;
    for (const [, to, keys] of SCREENS) {
      await go(page, to);
      await page.waitForFunction((w) => (document.body.innerText + " " + [...document.querySelectorAll("[title]")].map((e) => e.getAttribute("title")).join(" ")).toLowerCase().includes(w), en[keys[0]].toLowerCase(), { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(500);
      const text = (await page.evaluate(said)).toLowerCase();
      of += keys.length;
      there += keys.filter((k) => text.includes(en[k].toLowerCase())).length;
    }
    must(there === of, `a phone set to English reads them as it always did (${there} of ${of} lines)`);
    await ctx.close();
  }
});

// ---- 27. The Bible tab opens the chapter; /bible is the whole list.
// The owner's pick A of r3-20, "Straight into the book" (his note 65: "just
// go straight into the book when you click the Bible"): the Bible tab opens
// the chapter the reader left, at the verse, and John 1 with nothing read;
// the chapter's title and the name on its pill open one books sheet (the
// search, both Testaments as one list, the book being read open at its
// chapters, today's readings, the plans and the journal at its foot); and
// /bible stays the whole list, its picture and then rows, with no Old and
// New Testament switch. And his note 68: the verse a reader stopped at is
// kept, leaving by any tap writes nothing, and a landing keeps its verse.
// The source is held by lib/bible/__tests__/lastRead.test.ts,
// booksSheet.test.ts and bibleAddresses.test.ts, lib/ui/__tests__/
// bibleIndex.test.ts and ownScroll.test.ts; what the phone does, only a
// built app can say.
await section(27, async () => {
  console.log("\n27. The Bible tab opens the chapter, and /bible is the whole list");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  const squeeze = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  // The verse over the reading line, the middle of what can be seen between
  // the bars standing at the top and at the foot (lib/ui/readingPlace.ts,
  // KEPT_AT), and how far verse n's middle is from that line.
  const atLine = (page, n) =>
    page.evaluate((n) => {
      const h = innerHeight;
      let top = 0;
      let bottom = h;
      for (const e of document.querySelectorAll("[data-screen-edge]")) {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || s.visibility === "hidden" || parseFloat(s.opacity) <= 0) continue;
        if (e.getAttribute("data-screen-edge") === "top" && r.bottom > 0 && r.top < h / 2) top = Math.max(top, Math.min(r.bottom, h));
        if (e.getAttribute("data-screen-edge") === "bottom" && r.top < h && r.bottom > h / 2) bottom = Math.min(bottom, Math.max(r.top, 0));
      }
      const line = (top + bottom) / 2;
      const verses = [...document.querySelectorAll("[data-verse][id^='v']")];
      let at = verses[0];
      for (const v of verses) if (v.getBoundingClientRect().top <= line) at = v;
      const want = document.getElementById(`v${n}`)?.getBoundingClientRect();
      return { verse: at ? Number(at.id.slice(1)) : 0, off: want ? Math.round((want.top + want.bottom) / 2 - line) : null };
    }, n);
  const kept = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("purify:bible:last") ?? "null"); } catch { return null; } });
  const versesDrawn = (page) => page.waitForFunction(() => document.querySelectorAll("[data-verse][id^='v']").length > 10, null, { timeout: 20000 }).catch(() => {});
  /**
   * The reader's own scroll (a wheel), until verse n is over the line, read
   * down as a reader reads. The bars go on the way down and come back on the
   * way up, and the line moves with them (65px on a phone), so a walk that
   * steps up and down past the verse never settles: build 86's first walk
   * swung between 13 and 15 six times. So the bars are sent away first, and
   * every step is measured against the room they leave; a step past the
   * verse goes up well clear of it and comes down again, which leaves the
   * bars away and the verse where the measure said.
   */
  const readTo = async (page, n) => {
    await page.mouse.move(195, 420);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(600);
    for (let i = 0; i < 6; i++) {
      const { off } = await atLine(page, n);
      if (off === null || Math.abs(off) <= 6) break;
      if (off > 0) {
        await page.mouse.wheel(0, off);
      } else {
        await page.mouse.wheel(0, off - 400);
        await page.waitForTimeout(600);
        await page.mouse.wheel(0, 400);
      }
      await page.waitForTimeout(600);
    }
    // One more touch of the wheel with the bars away, so the page reads the
    // place against the same room this walk does.
    await page.mouse.wheel(0, 2);
    await page.waitForTimeout(400);
  };
  const bibleTab = (page) => page.locator("[data-tab-bar] a").nth(1);
  const where = (page) => page.evaluate(() => ({ path: location.pathname, hash: location.hash }));

  {
    // A phone that has read nothing: the tab is John 1.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/");
    await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const href = await bibleTab(page).getAttribute("href");
    must(/^\/bible\/john\/1\/?$/.test(href ?? ""), `with nothing read the Bible tab opens John 1 (${href})`);
    await tap(bibleTab(page));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/john/1"), null, { timeout: 15000 }).catch(() => {});
    await versesDrawn(page);
    await page.waitForTimeout(900);
    const first = await page.evaluate(() => ({
      path: location.pathname,
      title: (document.querySelector("#chapter-title h1")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      chevron: !!document.querySelector("#chapter-title h1 svg"),
      button: (() => { const b = document.querySelector("[data-title-books]"); return b ? getComputedStyle(b).display !== "none" : false; })(),
      lit: document.querySelector("[data-tab-bar] a[aria-current='page'] [data-tab-label]")?.textContent?.trim() ?? "",
      back: document.querySelector("[data-plates-row] a")?.getAttribute("href") ?? "",
    }));
    must(/^\/bible\/john\/1\/?$/.test(first.path), `and lands there (${first.path})`);
    must(first.title.startsWith(en["bible.books.john"]) && first.title.includes(en["bible.chapterN"].replace("{n}", "1")) && first.chevron && first.button, `John 1 opens on its title, with the chevron that says the title opens the books (${first.title})`);
    must(first.lit === en["nav.bible"], `with the Bible tab lit (${first.lit})`);
    must(/^\/bible\/?$/.test(first.back), `and the way back at the top left still goes to the whole list (${first.back})`);
    const opened = await kept(page);
    must(opened?.book === "john" && opened?.chapter === 1 && opened?.verse === 1, `the place is John 1 from its top (${JSON.stringify(opened)})`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-first.png") });

    // The books from the title: the sheet opens on John, John 1 lit.
    await tap(page.locator("[data-title-books]"));
    await page.waitForFunction(() => document.querySelector("[data-books-sheet]"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(700);
    const sheet = await page.evaluate(() => {
      const d = document.querySelector("[data-books-sheet]")?.closest("[role=dialog]");
      if (!d) return null;
      const open = d.querySelector("[data-open-book]");
      const lit = d.querySelector("[aria-current='page']");
      const body = d.querySelector("[data-books-sheet]").parentElement.getBoundingClientRect();
      const grid = open?.nextElementSibling?.getBoundingClientRect();
      return {
        title: d.getAttribute("aria-label"),
        search: !!d.querySelector("[data-bible-search-open]"),
        headings: [...d.querySelectorAll("[data-books-sheet] h2")].map((h) => h.textContent.trim()),
        switch: d.querySelectorAll("[role=tablist], [role=tab]").length,
        books: d.querySelectorAll("[data-book]").length,
        open: open?.getAttribute("data-book") ?? null,
        lit: lit?.textContent?.trim() ?? null,
        litGlow: lit ? getComputedStyle(lit).boxShadow : "",
        gridShown: !!grid && grid.top >= body.top - 1 && grid.bottom <= body.bottom + 1,
        doors: [...d.querySelectorAll("[data-books-doors] a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })),
        gold: d.querySelectorAll("[class*='gold']").length,
      };
    });
    must(!!sheet && sheet.title === `${en["bible.books.john"]} 1` && sheet.search, `the title opens the books sheet, named for the chapter, with the Bible's search (${sheet?.title})`);
    must(!!sheet && sheet.headings.join(" | ") === `${en["bible.theOldTestament"]} | ${en["bible.theNewTestament"]}` && sheet.switch === 0 && sheet.books === 78, `both Testaments as one list, all 78 books, and no switch (${sheet?.headings.join(" | ")}; ${sheet?.books} books; ${sheet?.switch} tabs)`);
    must(!!sheet && sheet.open === "john" && sheet.lit === "1" && sheet.gridShown, `opened at John, its chapters whole on the screen, the one being read lit (${sheet?.open}, ${sheet?.lit})`);
    must(!!sheet && /rgba?\(255, 255, 255/.test(sheet.litGlow) && sheet.gold === 0, `lit white with its soft glow, and nothing gold (${sheet?.litGlow})`);
    must(
      !!sheet && sheet.doors.length === 3 && /^\/bible\/[a-z0-9-]+\/\d+\/?#v\d+$/.test(sheet.doors[0].href) && sheet.doors[0].text === en["readingsFlow.startLabel"] && bare(sheet.doors[1].href) === "/plans" && sheet.doors[1].text === en["plans.title"] && bare(sheet.doors[2].href) === "/journal" && sheet.doors[2].text === en["journal.title"],
      `at its foot today's readings, the plans and the journal (${sheet?.doors.map((d) => `${d.text} ${d.href}`).join(", ")})`,
    );
    await page.screenshot({ path: path.join(SHOTS, "bible-books-sheet.png") });

    // Another book opens its grid in its place, and a chapter goes there.
    await tap(page.locator("[data-books-sheet] [data-book='romans']"));
    await page.waitForTimeout(500);
    await tap(page.locator("[data-books-sheet] [data-open-book] + ul li").nth(7));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/romans/8"), null, { timeout: 15000 }).catch(() => {});
    must((await where(page)).path.startsWith("/bible/romans/8"), `Romans opens at its chapters, and 8 goes to Romans 8 (${(await where(page)).path})`);

    // And from the pill's name, the same sheet, now on Romans 8.
    await versesDrawn(page);
    await page.waitForTimeout(900);
    const pillName = en["bible.pickChapterCurrentAria"].replace("{book}", en["bible.books.romans"]).replace("{chapter}", "8");
    await tap(page.locator(`[data-reader-pill] button[aria-label="${pillName}"]`));
    await page.waitForFunction(() => document.querySelector("[data-books-sheet] [data-open-book]"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    const fromPill = await page.evaluate(() => ({ open: document.querySelector("[data-books-sheet] [data-open-book]")?.getAttribute("data-book") ?? null, lit: document.querySelector("[data-books-sheet] [aria-current='page']")?.textContent?.trim() ?? null }));
    must(fromPill.open === "romans" && fromPill.lit === "8", `the pill's name opens the same sheet, on Romans 8 (${fromPill.open} ${fromPill.lit})`);
    await page.keyboard.press("Escape");
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // John 3 read down to verse 14, left by Today, and come back to by the tab.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/bible/john/3/");
    await versesDrawn(page);
    await page.waitForTimeout(1200);
    await readTo(page, 14);
    await page.waitForTimeout(1000);
    const read = await atLine(page, 14);
    const before = await kept(page);
    must(read.verse === 14 && before?.book === "john" && before?.chapter === 3 && before?.verse === 14, `read down to verse 14 by hand, the place is John 3:14 (at the line ${read.verse}, kept ${before?.verse})`);
    await go(page, "/");
    await page.waitForTimeout(1200);
    const left = await kept(page);
    must(left?.chapter === 3 && left?.verse === 14, `leaving by Today keeps verse 14, not verse 1 (${left?.verse})`);
    const href = await bibleTab(page).getAttribute("href");
    must(/^\/bible\/john\/3\/?#v14$/.test(href ?? ""), `the Bible tab now opens John 3 at verse 14 (${href})`);
    await tap(bibleTab(page));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/john/3") && location.hash === "#v14", null, { timeout: 15000 }).catch(() => {});
    await versesDrawn(page);
    await page.waitForTimeout(2600);
    const back = await atLine(page, 14);
    const after = await kept(page);
    must(back.verse === 14, `it lands with verse 14 at the reading place (the verse there ${back.verse}, its middle ${back.off}px from the line)`);
    must(after?.verse === 14, `and the landing keeps 14 (${after?.verse})`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-return.png") });

    // A return that lands on verse 16 keeps 16: build 85 kept 13.
    await go(page, "/");
    await page.waitForTimeout(600);
    await go(page, "/bible/john/3/#v16");
    await versesDrawn(page);
    await page.waitForTimeout(2600);
    const sixteen = await kept(page);
    const there = await atLine(page, 16);
    must(sixteen?.verse === 16 && there.verse === 16, `a link to John 3:16 lands on it and keeps it (kept ${sixteen?.verse}, at the line ${there.verse})`);

    // The read-aloud's Read (lib/player/steps.ts, readHref) opens its
    // chapter at the verse being read, as before.
    await go(page, "/bible/colossians/4/#v7");
    await versesDrawn(page);
    await page.waitForTimeout(2600);
    const aloud = await atLine(page, 7);
    must(aloud.verse === 7 && (await kept(page))?.verse === 7, `the read-aloud's address lands on its verse and keeps it (Colossians 4:7, at the line ${aloud.verse})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // /bible, the whole list: the picture, then rows, and the books as one list.
  // The owner said of this screen on 2026-10-13: "this design has way too
  // much stuff going on here". Under the picture it was an empty card saying
  // a card would appear, two tinted pills, a band with a button and a lone
  // half width tile, and the first book began 1007 px down a phone 844 tall.
  const look = (page) =>
    page.evaluate(() => {
      const books = document.querySelector("[data-bible-books]");
      const body = books?.closest(".cascade");
      if (!body) return null;
      const flat = (n) => (n?.textContent ?? "").replace(/\s+/g, " ").trim();
      const bar = document.querySelector("[data-tab-label]")?.closest("nav");
      const firstBook = books.querySelector("ul li a");
      const cont = body.querySelector("[data-bible-continue] a");
      return {
        kinds: [...body.children].map((n) => n.tagName).join(" "),
        picture: !!body.querySelector("figure img"),
        cont: cont ? { href: cont.getAttribute("href"), start: flat(cont.children[0]), end: flat(cont.children[1]) } : null,
        heading: flat(body.querySelector("[data-bible-readings] p")),
        readings: [...body.querySelectorAll("[data-bible-readings] li a")].map((a) => ({ href: a.getAttribute("href"), start: flat(a.children[0]), end: flat(a.children[1]) })),
        study: [...body.querySelectorAll("[data-bible-study] a")].map((a) => ({ href: a.getAttribute("href"), text: flat(a) })),
        testaments: [...books.querySelectorAll("h2")].map(flat),
        books: books.querySelectorAll("ul li a").length,
        first: firstBook ? { href: firstBook.getAttribute("href"), text: flat(firstBook.children[0]) } : null,
        switch: document.querySelectorAll("[data-route-content] [role=tablist]").length,
        // Anything drawn in another look: the old band, a tinted card or tile, a pill, gold.
        others: body.querySelectorAll(".lm-feature, .lm-card, [class*='premium'], [class*='gold'], [class*='rounded-pill']").length,
        firstBookAt: Math.round(firstBook ? firstBook.getBoundingClientRect().top : innerHeight * 3),
        barTop: Math.round(bar ? bar.getBoundingClientRect().top : innerHeight),
      };
    });
  const openList = async (page) => {
    await go(page, "/bible/");
    await page.waitForFunction(() => document.querySelector("[data-bible-readings] li a") && document.querySelector("[data-bible-books]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
  };
  const READING = /^\/bible\/[a-z0-9-]+\/\d+\/?#v\d+$/;
  {
    // A phone that has read nothing.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await openList(page);
    const got = await look(page);
    must(!!got && got.kinds === "P FIGURE SECTION NAV DIV", `/bible with nothing read is the picture, the day's readings, the study row and the books, and nothing else (${got?.kinds})`);
    must(!!got && got.picture && got.cont === null, "with no Continue row, and no card saying one will appear");
    must(
      !!got && got.readings.length >= 1 && got.readings.length <= 3 && got.readings.every((r) => READING.test(r.href) && /\d/.test(r.start) && [en["bible.kindGospelLong"], en["bible.kindEpistleLong"], en["bible.kindOtLong"]].includes(r.end)),
      `the day's readings are rows, the reference and which reading it is (${got?.readings.map((r) => `${r.start} / ${r.end}`).join(", ")})`,
    );
    must(!!got && [en["bible.appointedToday"], en["bible.readForCommemoration"]].includes(got.heading), `under the heading the tab always gave them (${got?.heading})`);
    must(!!got && got.study.length === 2 && got.study[0].href.replace(/\/$/, "") === "/plans" && got.study[1].href.replace(/\/$/, "") === "/journal" && got.study[0].text === en["plans.title"] && got.study[1].text === en["journal.title"], "Reading plans and Your journal are one row of two halves");
    must(!!got && got.switch === 0 && got.testaments.join(" | ") === `${en["bible.theOldTestament"]} | ${en["bible.theNewTestament"]}` && got.books === 78, `the books are both Testaments as one list, all 78, with no switch (${got?.testaments.join(" | ")}; ${got?.books} rows; ${got?.switch} switches)`);
    must(!!got && /^\/bible\/genesis\/1\/?$/.test(got.first?.href ?? "") && got.first?.text === en["bible.books.genesis"], `in the Church's order, Genesis first (${got?.first?.text} ${got?.first?.href})`);
    must(!!got && got.others === 0, `nothing under the header is drawn in another look: no band, tinted card, pill or gold (${got?.others})`);
    must(!!got && got.firstBookAt < got.barTop - 40, `the first book is on the first screen (its row begins at ${got?.firstBookAt} px, the bar at ${got?.barTop}; it began at 1007)`);
    // The picture's foot corners are as dark as its wash, with no line of
    // the manuscript round them: the wash lay over the picture and was
    // clipped to the curve on its own (found with the owner's build 80 note
    // 1). SectionMasthead.tsx and .masthead-picture in globals.css;
    // lib/ui/__tests__/pictureCorners.test.ts holds the source.
    try {
      await page.waitForFunction(() => { const img = document.querySelector(".cascade > figure img"); return !!img && img.complete && img.naturalWidth > 0; }, null, { timeout: 10000 }).catch(() => {});
      const lift = await cornerLift(page, ".cascade > figure", ["bottom-start", "bottom-end"]);
      must(lift.lift <= 4, `the picture's foot corners are as dark as its wash, with no line of the picture round them (${lift.lift} levels over the plate inside along the curve, ${lift.most} at its lightest; 1.8's markup measured 25)`);
    } catch (e) {
      must(false, `the picture's corners could not be measured: ${firstLine(e)}`);
    }
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // A phone part way through a chapter.
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, set: { "purify:bible:last": JSON.stringify({ book: "john", bookName: "John", chapter: 3, verse: 16, totalVerses: 36, ts: 1 }) } });
    await openList(page);
    const got = await look(page);
    must(!!got && got.kinds === "P FIGURE UL SECTION NAV DIV", `a phone part way through a chapter has one more row, over the readings (${got?.kinds})`);
    must(!!got?.cont && /^\/bible\/john\/3\/?#v16$/.test(got.cont.href) && got.cont.start === `${en["bible.books.john"]} 3` && got.cont.end === squeeze(en["bible.continueAtVerseOf"].replace("{verse}", "16").replace("{total}", "36")), `which goes back to the verse (${got?.cont?.start} / ${got?.cont?.end}, to ${got?.cont?.href})`);
    const href = await page.locator("[data-tab-bar] a").nth(1).getAttribute("href");
    must(/^\/bible\/john\/3\/?#v16$/.test(href ?? ""), `and the Bible tab goes there too (${href})`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone-continue.png") });
    await ctx.close();
  }
  {
    // A phone set to Greek, at the top of a chapter whose book has a long name.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR", set: { "purify:bible:last": JSON.stringify({ book: "1-thessalonians", bookName: "1 Thessalonians", chapter: 5, verse: 1, totalVerses: 28, ts: 1 }) } });
    await openList(page);
    const got = await look(page);
    must(!!got?.cont && /^\/bible\/1-thessalonians\/5\/?$/.test(got.cont.href) && got.cont.start === `${el["bible.books.1-thessalonians"]} 5` && got.cont.end === el["bible.continueReading"], `a phone set to Greek names the book and the way back in Greek (${got?.cont?.start} / ${got?.cont?.end})`);
    must(!!got && [el["bible.appointedToday"], el["bible.readForCommemoration"]].includes(got.heading) && got.readings.every((r) => [el["bible.kindGospelLong"], el["bible.kindEpistleLong"], el["bible.kindOtLong"]].includes(r.end)), `and the readings' heading and kinds (${got?.heading}: ${got?.readings.map((r) => r.end).join(", ")})`);
    must(!!got && got.study.length === 2 && got.study[0].text === el["plans.title"] && got.study[1].text === el["journal.title"], `and the study row (${got?.study.map((s) => s.text).join(", ")})`);
    must(!!got && got.testaments.join(" | ") === `${el["bible.theOldTestament"]} | ${el["bible.theNewTestament"]}`, `and the two Testaments (${got?.testaments.join(" | ")})`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone-el.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// ---- 28. One Settings.
// The owner, of the You tab's list on his own phone, 2026-10-13: "there is
// technically 3 sections that all have similar names. profile, settings,
// account. like it needs to be even more simplified. if you have to delete
// sections and add them into one then do that". It was eleven rows that led
// into each other, a dashboard of four tabs behind one of them, and a
// Settings screen whose last group led back into the dashboard. Now the You
// tab keeps the reader's own rows and one door, and Settings holds the rest
// once. A built app shows it signed out. Signed in it is shown with a
// session that is only a name in the phone's storage: the screens read who
// is there without asking anyone, and the walk has no network to ask.
await section(28, async () => {
  console.log("\n28. One Settings");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const youRows = (page) =>
    page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-you-rows] li")].map((li) => ({ href: li.querySelector("a")?.getAttribute("href") ?? "", label: (li.querySelector("p")?.textContent ?? "").trim() }));
      // 1.7: the screen's bar is the one every tab wears, so a second way to
      // Settings in it would be a bar unlike the other four.
      const door = document.querySelector("[data-tab-topbar] a[href^='/settings']");
      const box = document.querySelector("[data-you-rows]");
      return { rows, door: door ? { href: door.getAttribute("href"), says: door.getAttribute("aria-label") } : null, onlyTheList: !!box && box.children.length === 1 && box.firstElementChild.tagName === "UL" };
    });
  const groups = (page) =>
    page.evaluate(() => {
      const seen = (el) => !!el && el.getClientRects().length > 0;
      return {
        // Each group: its heading, and its rows by address.
        groups: [...document.querySelectorAll("article section")].map((s) => ({
          id: s.id,
          heading: (s.querySelector("h2")?.textContent ?? "").trim(),
          rows: [...s.querySelectorAll("a[href]")].map((a) => ({ href: a.getAttribute("href"), label: (a.querySelector("p")?.textContent ?? a.textContent ?? "").trim() })),
        })),
        // The names of the screen that can be seen: the bar's, and no other.
        headings: [...document.querySelectorAll("h1")].filter(seen).map((h) => (h.textContent ?? "").trim()),
        back: document.querySelector("[data-mobile-topbar] a[aria-label]")?.getAttribute("href") ?? "",
        // A way back that is the way the reader came (1.8), not a link.
        backButton: !!document.querySelector("[data-mobile-topbar] button[aria-label]"),
      };
    });
  {
    // Signed out, which is what a built app with no network is.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/account/");
    await page.waitForFunction(() => document.querySelector("[data-you-rows] li"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const you = await youRows(page);
    // 1.8, note 71 (r3-25 A): Sign in left the list for the name's place on
    // the Ladder, and the Purify Premium row went, the pill in the bar being
    // the subscription's one door. Section 46 walks the rest of the tab.
    const want = ["/prayers/personal", "/campaigns/mine", "/settings"];
    must(
      you.rows.length >= 2 && you.rows.length <= 3 && you.rows.every((r) => want.includes(bare(r.href))) && bare(you.rows.at(-1).href) === "/settings",
      `the You tab's list is the reader's own rows and one door (${you.rows.map((r) => r.label).join(", ")})`,
    );
    must(you.rows.at(-1).label === en["settings.title"] && !you.door, `the door is Settings, the list's last row, and the bar is the tabs' own with no second door (${you.door ? "a door in the bar" : "none in the bar"})`);
    must(you.onlyTheList, "with no heading over the list");
    await page.evaluate(() => document.querySelector("[data-you-rows]")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, "you-rows-phone.png") });

    // The apps' own back bar follows the five tabs. Its list of tab roots is
    // hand-written and was left at six when the bar became five: the You tab
    // wore a chevron that led out of the tab, and the shop and Chat, tapped
    // into from Discover, had none.
    const backBar = async (to) => {
      await go(page, to);
      await page.waitForTimeout(1000);
      return page.evaluate(() => !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"));
    };
    const bars = { you: await backBar("/account/"), bible: await backBar("/bible/"), shop: await backBar("/shop/"), chat: await backBar("/community/"), saints: await backBar("/saints/") };
    must(!bars.you && !bars.bible, "a tab's own screen has no back bar: not You, not the Bible");
    must(bars.shop && bars.chat && bars.saints, "the shop and Chat, tapped into from Discover, have one, as the saints' list does");
    // A saint's own page wears its own bar from 1.7, the way back in it, and
    // so no second one.
    await go(page, "/saints/john-chrysostom/");
    await page.waitForTimeout(1000);
    const saintBar = await page.evaluate(() => ({
      backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
      own: !!document.querySelector("[data-mobile-topbar] > button[aria-label]"),
    }));
    must(!saintBar.backBar && saintBar.own, `a saint's page has its own bar with the way back, and no second one (${saintBar.own ? "its own" : "none of its own"}${saintBar.backBar ? ", and the back bar too" : ""})`);

    await go(page, "/settings/");
    await page.waitForFunction(() => document.querySelector("#account a") && document.querySelector("#about a"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const set = await groups(page);
    const ids = set.groups.map((g) => g.id).filter(Boolean);
    // 1.9: in the apps, what is kept on this device sits between data and
    // Purify (components/settings/StorageSection.tsx; lib/nav/__tests__/oneSettings.test.ts).
    must(ids[0] === "account" && ids.slice(-3).join(" ") === "data storage about" && ["space", "reading", "calendar", "language"].every((id) => ids.includes(id)), `Settings is the account, then the device's settings, then data, what this device keeps, and Purify (${ids.join(", ")})`);
    const account = set.groups.find((g) => g.id === "account");
    must(!!account && account.heading === en["settings.account"] && account.rows.length === 1 && bare(account.rows[0].href) === "/signin?next=/settings" && account.rows[0].label === en["common.signIn"], "signed out, the account is one row: Sign in");
    const data = set.groups.find((g) => g.id === "data");
    must(!!data && data.heading === en["account.tabs.data"] && data.rows.map((r) => bare(r.href)).join(" ") === "/account/export", "Data is Export your library, with nothing to delete");
    const about = set.groups.find((g) => g.id === "about");
    must(!!about && about.rows.map((r) => bare(r.href)).join(" ") === "/privacy /support /whats-new /about", `Purify is Privacy, Support Purify, What's new and About (${about?.rows.map((r) => r.label).join(", ")})`);
    // From 1.8 (F-47, F-48) Settings goes back the way the reader came: its
    // bar's way back is a button that falls back to You when nothing is
    // behind it (backFallback "/account"), not a link to You.
    must(
      set.headings.length === 1 && set.headings[0] === en["settings.title"] && set.backButton && !set.back,
      `the screen is named once, in its bar, whose way back is the way the reader came (${set.headings.join(" | ")}${set.back ? `; a link to ${set.back}` : ""}${set.backButton ? "" : "; no back button"})`,
    );
    must(!(await page.locator("[data-sign-out]").count()), "and there is no Sign out with nobody signed in");
    await page.screenshot({ path: path.join(SHOTS, "settings-phone-signed-out.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // Signed in: the rows that differ, and one account screen as a phone draws it.
    const session = JSON.stringify({ access_token: "walk", token_type: "bearer", user: { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", created_at: "2026-01-01T00:00:00Z", identities: [], user_metadata: {} } });
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, set: { "sb-walk-auth-token": session } });
    await go(page, "/settings/");
    await page.waitForFunction(() => document.querySelector("[data-sign-out]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const set = await groups(page);
    const account = set.groups.find((g) => g.id === "account");
    must(
      !!account && account.rows.map((r) => bare(r.href)).join(" ") === "/account/profile /account/security /account/notifications" && account.rows.map((r) => r.label).join(" | ") === [en["account.tabs.profile"], en["account.tabs.security"], en["settings.notifications"]].join(" | "),
      `signed in, the account is three screens, each named for what it holds (${account?.rows.map((r) => r.label).join(", ")})`,
    );
    const data = set.groups.find((g) => g.id === "data");
    must(!!data && data.rows.map((r) => bare(r.href)).join(" ") === "/account/export /account/data#danger", "Data gains Delete account, which opens the danger zone");
    const last = set.groups.at(-1);
    must(!!last && !last.heading && last.rows.length === 1 && bare(last.rows[0].href) === "/signout" && flat(last.rows[0].label) === en["common.signOut"], "and Sign out is the last row of the screen");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(SHOTS, "settings-phone-signed-in.png") });

    await go(page, "/account/security/");
    await page.waitForFunction(() => document.querySelector("[data-security-devices]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const sec = await page.evaluate(() => {
      const seen = (el) => !!el && el.getClientRects().length > 0;
      return {
        headings: [...document.querySelectorAll("h1")].filter(seen).map((h) => (h.textContent ?? "").trim()),
        back: document.querySelector("[data-mobile-topbar] a[aria-label]")?.getAttribute("href") ?? "",
        tabs: seen(document.querySelector("[data-account-dashboard]")),
        devices: seen(document.querySelector("[data-security-devices]")),
      };
    });
    must(sec.headings.length === 1 && sec.headings[0] === en["account.tabs.security"] && bare(sec.back) === "/settings", `an account screen wears its own name and goes back to Settings (${sec.headings.join(" | ")}, back to ${sec.back})`);
    must(!sec.tabs && sec.devices, "with no row of tabs, and where the account is signed in under its passwords");
    await page.screenshot({ path: path.join(SHOTS, "account-security-phone.png") });
    await ctx.close();
  }
});

// ---- 46. You: the Ladder, then the day (1.8, note 71).
// The owner's pick A of r3-25, 2026-10-31: "A, the ladder, then the day"
// (Homebase/boards/purify-master/variants/r3-25-you.html). The Ladder of
// Divine Ascent from the top of the screen under the clear bar, the reader on
// it (signed out, Sign in in the name's place), the prayer rope where the red
// flame card was, one lit card for where they left off, the kept verse in the
// Light with its two actions as one bar, what they kept as covers, and the
// rows last. One name for the subscription, Plus: the pill alone, and no
// Premium on the screen. Signed in is a session that is only a name in the
// phone's storage, as section 28's; the badges are the ones the device keeps,
// since the walk has no network to ask. The covers are the website's, which
// the walk refuses, so the books' stand on their bundled plate and a saint's
// on the cross. lib/you/__tests__/youTab.test.ts holds the source.
await section(46, async () => {
  console.log("\n46. You: the Ladder, then the day");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), s);
  const UID = "00000000-0000-4000-8000-000000000000";
  const session = JSON.stringify({ access_token: "walk", token_type: "bearer", user: { id: UID, email: "reader@example.com", created_at: "2026-01-01T00:00:00Z", identities: [], user_metadata: {} } });
  const JOHN_3_16 = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
  const kept = () => {
    const now = Date.now();
    return {
      "sb-walk-auth-token": session,
      "purify:bookmarks": JSON.stringify([
        { id: "walk-john-3-16", addedAt: now - 60_000, label: "John 3:16", kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 16 },
        { id: "walk-priesthood", addedAt: now - 3_600_000, label: "On the Priesthood, Book I", kind: "writing-section", saintSlug: "john-chrysostom", saintName: "St. John Chrysostom", workSlug: "on-the-priesthood", workTitle: "On the Priesthood", sectionN: 1, sectionTitle: "Book I" },
      ]),
      "purify:remember": JSON.stringify({ entries: {}, texts: { "john/3/16": JOHN_3_16 } }),
      "purify:bible:last": JSON.stringify({ book: "john", bookName: "John", chapter: 3, verse: 16, totalVerses: 36, ts: now - 30_000 }),
      "purify:reading-history": JSON.stringify([{ kind: "work", href: "/saints/john-chrysostom/on-the-priesthood", label: "On the Priesthood", at: now - 86_400_000 }]),
      "purify.myBadges": JSON.stringify({ uid: UID, ids: ["plus", "psalter", "first_share"], at: now }),
    };
  };
  /** The tab as the walk measures it. */
  const measure = (page) =>
    page.evaluate(() => {
      const box = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } : null;
      };
      const hero = document.querySelector("[data-you-hero]");
      const picture = hero?.querySelector(".you-hero-picture");
      const img = picture?.querySelector("img");
      const bar = document.querySelector("[data-route-content] [data-tab-topbar]") ?? document.querySelector("[data-tab-topbar]");
      const rope = hero?.querySelector("button.you-rope");
      const route = document.querySelector("[data-route-content]") ?? document.body;
      return {
        picture: box(picture),
        img: img ? { src: img.getAttribute("src") ?? "", natural: img.naturalWidth, complete: img.complete, animation: getComputedStyle(img).animationName } : null,
        barGround: bar ? getComputedStyle(bar).backgroundColor : "",
        barBox: box(bar),
        solid: document.documentElement.hasAttribute("data-bar-solid"),
        signIn: (() => {
          const a = document.querySelector("[data-you-signin]");
          return a ? { href: a.getAttribute("href") ?? "", text: (a.textContent ?? "").replace(/\s+/g, " ").trim(), box: box(a) } : null;
        })(),
        who: (hero?.querySelector("[data-you-who]")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        identity: (() => {
          const a = document.querySelector("[data-you-identity]");
          return a
            ? { href: a.getAttribute("href") ?? "", name: (a.querySelector(".font-heading")?.textContent ?? "").trim(), text: (a.textContent ?? "").replace(/\s+/g, " ").trim(), box: box(a) }
            : null;
        })(),
        badges: [...document.querySelectorAll("[data-you-badges] li[role=img]")].map((li) => ({ label: li.getAttribute("aria-label") ?? "", color: getComputedStyle(li).color })),
        rope: rope ? { box: box(rope), knots: rope.querySelectorAll("span.rounded-full").length, says: rope.getAttribute("aria-label") ?? "" } : null,
        // The old card's red: its classes, and the flame's own.
        red: /\b(?:text|bg|border|ring|from|to)-(?:streak|crimson)\b|streak-pulse|streak-flicker/.test(route.innerHTML),
        premium: /premium/i.test(route.innerText),
        pill: (document.querySelector("[data-tab-actions] > span > *")?.textContent ?? "").trim(),
        rows: [...document.querySelectorAll("[data-you-rows] li a")].map((a) => a.getAttribute("href") ?? ""),
        empty: (document.querySelector("[data-you-kept]")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    });
  /**
   * The bar over a page's picture as it stands now: whether the picture's
   * foot has gone up past the bar's, whether the page marked the bar solid
   * (components/mobile/barOverPicture.ts), and the bar's ground. One observer
   * turns the bar for You's Ladder and Prayers' Pantocrator both.
   */
  const barNow = (page) =>
    page.evaluate(() => {
      const bar = document.querySelector("[data-route-content] [data-tab-topbar]") ?? document.querySelector("[data-tab-topbar]");
      const picture = document.querySelector("[data-you-hero] .you-hero-picture, .prayers-hero-picture");
      const ground = bar ? getComputedStyle(bar).backgroundColor : "";
      return {
        y: Math.round(scrollY),
        // How far the page can scroll at all.
        room: Math.max(0, Math.round(document.scrollingElement.scrollHeight - innerHeight)),
        passed: !!bar && !!picture && picture.getBoundingClientRect().bottom <= bar.getBoundingClientRect().bottom + 0.5,
        solid: document.documentElement.hasAttribute("data-bar-solid"),
        clear: ground === "rgba(0, 0, 0, 0)",
        ground,
      };
    });
  /** Scrolled on as far as 600 px, or as far as the page goes. */
  const scrollOn = async (page, to = 600) => {
    await page.evaluate((y) => window.scrollTo(0, y), to);
    await page.waitForTimeout(700);
    return barNow(page);
  };

  {
    // Signed out, a new reader on this device.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.motion": "on" } });
    await go(page, "/account/");
    await page.waitForFunction(() => !!document.querySelector("[data-you-signin]") && !!document.querySelector("[data-you-hero] img")?.complete, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1600);
    const m = await measure(page);
    must(!!m.picture && Math.abs(m.picture.top) <= 1 && m.picture.height >= 330, `the Ladder runs from the very top of the screen, under the bar (top ${m.picture ? Math.round(m.picture.top) : "none"}, ${m.picture ? Math.round(m.picture.height) : 0} tall)`);
    must(!!m.img && /\/sections\/you\.v2\.jpg$/.test(m.img.src) && m.img.natural === 1170, `and is the square cut, sharp on a 3x phone (${m.img?.src ?? "no picture"}, ${m.img?.natural ?? 0} wide)`);
    must(m.barGround === "rgba(0, 0, 0, 0)" && !m.solid, `the bar is clear over it (${m.barGround})`);
    must(
      !!m.signIn && bare(m.signIn.href) === "/signin?next=/account" && m.signIn.text.startsWith(en["common.signIn"]) && m.signIn.text.includes(en["ui.syncAcrossDevicesOptional"]) && !!m.picture && m.signIn.box.top < m.picture.bottom,
      `signed out, Sign in stands on the picture where the name stands (${m.signIn ? `"${m.signIn.text}" at ${Math.round(m.signIn.box.top)}` : "none"})`,
    );
    must(m.who.includes(en["ui.privateOnThisDeviceNo"]), "with the line on where things are kept over it");
    must(!!m.rope && m.rope.knots === 7 && !!m.picture && m.rope.box.top < m.picture.bottom + 40, `the prayer rope at the picture's foot, seven knots (${m.rope ? `${m.rope.knots} knots at ${Math.round(m.rope.box.top)}` : "no rope"})`);
    must(!m.red, "and no red and no flame anywhere on the tab");
    must(!m.premium && m.pill === en["nav.premium"] && en["nav.premium"] === "Plus", `one name for the subscription: the pill says Plus and nothing says Premium (pill "${m.pill}")`);
    must(m.rows.every((h) => ["/prayers/personal", "/campaigns/mine", "/settings"].includes(bare(h))) && bare(m.rows.at(-1)) === "/settings", `the rows: Your rule and Settings (${m.rows.map(bare).join(", ")})`);
    must(m.empty.includes(en["saved.emptyLine"]), "nothing kept yet, so the shelf is its one line");
    must(m.img?.animation === "prayers-picture-in", `the picture fades in as the tab arrives (${m.img?.animation})`);
    await page.screenshot({ path: path.join(SHOTS, "you-ladder-signed-out.png") });
    // A new reader's tab is one screen on this phone: build 87's walk found
    // it 844 tall in an 844 window, so it does not scroll, the picture never
    // goes up under the bar, and the bar is right to stay clear over it. On a
    // page that does go past the picture the bar turns solid (signed in,
    // below, and Prayers).
    const down = await scrollOn(page);
    must(
      down.passed ? down.solid && !down.clear : !down.solid && down.clear,
      `${down.passed ? "scrolled past the picture, the bar is solid again" : "the tab is one screen, so the bar stays clear over the picture"} (scrolled ${down.y} of ${down.room}; ${down.ground})`,
    );
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  {
    // Signed in, with a verse, a work and a chapter on the device.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: kept() });
    await go(page, "/account/");
    await page.waitForFunction(() => !!document.querySelector("[data-you-identity]") && !!document.querySelector("[data-you-pickup]") && !!document.querySelector("[data-you-verse]"), null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1600);
    const m = await measure(page);
    must(!!m.identity && bare(m.identity.href) === "/account/profile" && m.identity.name === "reader" && m.identity.text.includes(en["profile.yourProfile"]) && !!m.picture && m.identity.box.top < m.picture.bottom, `signed in, the reader's name stands on the picture and opens their profile ("${m.identity?.text ?? "none"}")`);
    const neutral = (c) => {
      const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
    };
    must(
      m.badges.map((b) => b.label).join(" | ") === [en["profile.badge.plus"], en["profile.badge.psalter"], en["profile.badge.first_share"]].join(" | ") && m.badges.every((b) => neutral(b.color)),
      `their badges under it, in the house greys (${m.badges.map((b) => `${b.label} ${b.color}`).join(", ")})`,
    );
    must(!m.premium && !m.red, "no Premium, no red");
    const card = await page.evaluate(() => {
      const box = document.querySelector("[data-you-pickup] .you-lit");
      const first = box?.querySelector("a[data-pickup-first]");
      const bar = first?.querySelector(".you-progress-lit");
      return {
        links: box ? box.querySelectorAll("a").length : 0,
        first: first ? { href: first.getAttribute("href") ?? "", text: (first.textContent ?? "").replace(/\s+/g, " ").trim(), go: first.querySelector(".you-go")?.getBoundingClientRect().width ?? 0 } : null,
        far: bar ? bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width : null,
        work: !!box?.querySelector("a[data-pickup='work']"),
      };
    });
    must(
      !!card.first && card.first.href.startsWith("/bible/john/3") && card.first.text.includes(fill(en["bible.continueAtVerseOf"], { verse: 16, total: 36 })) && card.first.go >= 43 && card.links === 2 && card.work,
      `where you left off is one lit card: John 3 large with its way in, the work under it (${card.first?.text.slice(0, 60) ?? "none"}; ${card.links} links)`,
    );
    must(card.far !== null && Math.abs(card.far - 16 / 36) < 0.03, `and how far in, v16 of 36 (${card.far === null ? "no bar" : Math.round(card.far * 100) + "%"})`);
    // This tab is longer than the screen: scrolled on, the picture goes up
    // under the bar and the bar is solid; back at the top, clear again.
    const on = await scrollOn(page);
    must(on.passed && on.solid && !on.clear, `scrolled past the picture, the bar is solid again (scrolled ${on.y} of ${on.room}; ${on.ground})`);
    const top = await scrollOn(page, 0);
    must(!top.passed && !top.solid && top.clear, `and back at the top it is clear over the picture again (${top.ground})`);
    await page.evaluate(() => document.querySelector("[data-you-verse]")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    const verse = await page.evaluate(() => {
      const box = (el) => el?.getBoundingClientRect();
      const learn = document.querySelector("[data-you-learn]");
      const share = document.querySelector("[data-you-share]");
      const card = document.querySelector("[data-you-verse] .lm-card");
      return {
        text: (document.querySelector("[data-you-verse]")?.textContent ?? "").replace(/\s+/g, " "),
        lit: !!document.querySelector("[data-you-verse] .verse-cross-lit") && !!document.querySelector("[data-you-verse] .verse-light"),
        oneBar: !!learn && !!share && learn.parentElement === share.parentElement && Math.abs(box(learn).top - box(share).top) < 1 && box(share).bottom <= box(card).bottom + 1,
        learn: (learn?.textContent ?? "").replace(/\s+/g, " ").trim(),
        share: (share?.textContent ?? "").trim(),
      };
    });
    must(verse.text.includes(JOHN_3_16.slice(0, 40)) && verse.lit, "the verse kept, in the Light: the cross lit over it");
    must(verse.oneBar && verse.learn.endsWith(en["you.verse.learn"]) && verse.learn.startsWith("FG") && verse.share === en["common.share"], `Learn by heart and Share are one bar at its foot ("${verse.learn}" | "${verse.share}")`);
    await page.screenshot({ path: path.join(SHOTS, "you-verse-and-kept.png") });
    const shelf = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll("[data-you-kept] a[data-kept]:not([data-kept='all'])")];
      const all = document.querySelector("[data-you-kept] a[data-kept='all']");
      return {
        tiles: tiles.map((a) => ({ kind: a.getAttribute("data-kept"), height: Math.round(a.getBoundingClientRect().height), width: Math.round(a.getBoundingClientRect().width), text: (a.textContent ?? "").replace(/\s+/g, " ").trim() })),
        all: all ? (all.textContent ?? "").replace(/\s+/g, " ").trim() : "",
        broken: [...document.querySelectorAll("[data-you-kept] img, [data-you-pickup] img")].filter((i) => i.complete && i.naturalWidth === 0).length,
      };
    });
    must(
      shelf.tiles.map((t) => t.kind).join(" ") === "verses writings" && shelf.tiles.every((t) => t.height === 130 && Math.abs(t.width - (390 - 40 - 18) / 3) <= 1),
      `what was kept, as covers three across, each 130 tall (${shelf.tiles.map((t) => `${t.kind} ${t.width}x${t.height}`).join(", ")})`,
    );
    must(shelf.tiles[0]?.text.startsWith("1") && shelf.all.startsWith(en["common.seeAll"]) && shelf.all.endsWith("2"), `each with its count, and See all with the total ("${shelf.tiles[0]?.text}"; "${shelf.all}")`);
    must(shelf.broken === 0, `no cover is a broken picture with no signal (${shelf.broken})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  {
    // Prayers' Pantocrator, which the same observer serves: clear over the
    // picture at the top, solid once it has gone up under the bar, and clear
    // again back at the top.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/prayers/");
    await page.waitForFunction(() => !!document.querySelector(".prayers-hero-picture"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const at = await barNow(page);
    const on = await scrollOn(page);
    const back = await scrollOn(page, 0);
    must(
      at.clear && !at.solid && on.passed && on.solid && !on.clear && back.clear && !back.solid,
      `Prayers' bar too: clear over its picture, solid once it has gone, clear again at the top (${at.ground}, then ${on.ground} at ${on.y}, then ${back.ground})`,
    );
    must(errors.length === 0, `Prayers: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The five everyday palettes: the reader's name in the palette's own ink,
  // and nothing gold or yellow in the tab's own chrome; motion off, the
  // picture is simply there.
  for (const theme of ["default", "parchment", "black", "candlelight", "monastery"]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { ...kept(), "purify.reader.theme": theme, "purify.motion": "off" } });
    await go(page, "/account/");
    await page.waitForFunction(() => !!document.querySelector("[data-you-identity]") && !!document.querySelector("[data-you-hero] img")?.complete, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const seen = await page.evaluate(() => {
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim();
      const probe = document.createElement("span");
      probe.style.color = ink;
      document.body.append(probe);
      const inkRgb = getComputedStyle(probe).color;
      probe.remove();
      const name = document.querySelector("[data-you-identity] .font-heading");
      // Gold and yellow: a warm hue with real colour in it, in the tab's own text and grounds.
      const gold = [];
      for (const el of document.querySelectorAll("[data-you-hero] *, [data-you-pickup] *, [data-you-verse] *, [data-you-kept] > div *, [data-you-rows] *")) {
        if (el.closest("img, [data-kept] ")) continue;
        const s = getComputedStyle(el);
        for (const c of [s.color, s.backgroundColor, s.borderTopColor]) {
          const [r, g, b, a = 1] = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number);
          if (a === 0 || r === undefined) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min > 40 && r >= g && g > b && (g - b) > (r - g)) gold.push(`${el.tagName.toLowerCase()} ${c}`);
        }
      }
      return {
        mode: document.documentElement.dataset.readingMode ?? "",
        ink: inkRgb,
        name: name ? getComputedStyle(name).color : "",
        gold: gold.slice(0, 3),
        animation: getComputedStyle(document.querySelector("[data-you-hero] img")).animationName,
      };
    });
    must(seen.name === seen.ink && seen.gold.length === 0, `${theme}: the name in the palette's ink and nothing gold (${seen.mode || "default"}; name ${seen.name}, ink ${seen.ink}${seen.gold.length ? `; gold: ${seen.gold.join(", ")}` : ""})`);
    must(seen.animation === "none", `${theme}: with motion off the picture is simply there (${seen.animation})`);
    await page.screenshot({ path: path.join(SHOTS, `you-ladder-${theme}.png`) });
    must(errors.length === 0, `${theme}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// ---- 29. The tab bar's words are whole.
// Seen in section 27's own picture of a Greek phone: the word under Discover
// was drawn "Ανακαλύψ…". The bar chose one size for the row by asking whether
// each word fits its own cell, and measured word and cell in whole pixels: a
// 65.7 px cell counted as 66, and a word 66.03 px wide "fitted". The same
// rule cut the Filipino for Prayers at every size, in a cell with room on
// both sides of it. The row is fitted by neighbours now (lib/ui/
// tabLabelFit.ts): a word may reach into the room the words beside it leave.
// Only a browser can say what a word's width comes to, so only a built app
// can show it. Georgian is left out: this browser has no Georgian letters,
// and what it draws in their place is not what a phone draws.
await section(29, async () => {
  console.log("\n29. The tab bar's words are whole");
  const row = (page) =>
    page.evaluate(() => {
      const labels = [...document.querySelectorAll("[data-tab-label]")];
      const range = document.createRange();
      const bar = labels[0].closest("div.rounded-3xl").getBoundingClientRect();
      const words = labels.map((label) => {
        range.selectNodeContents(label);
        const box = label.getBoundingClientRect();
        // The word's own width against the room it was given: over it, the
        // browser draws an ellipsis.
        return { word: (label.textContent ?? "").trim(), text: range.getBoundingClientRect().width, left: box.left, right: box.right, width: box.width };
      });
      const across = [...words].sort((a, b) => a.left - b.left);
      let nearest = Infinity;
      for (let i = 0; i + 1 < across.length; i++) nearest = Math.min(nearest, across[i + 1].left - across[i].right);
      return {
        size: parseFloat(getComputedStyle(labels[0]).fontSize),
        cut: words.filter((w) => w.text > w.width + 0.1).map((w) => w.word),
        nearest,
        inside: across[0].left >= bar.left && across.at(-1).right <= bar.right,
        words: words.map((w) => w.word),
      };
    });
  for (const [locale, name] of [["en-US", "English"], ["el-GR", "Greek"], ["ro-RO", "Romanian"], ["fil-PH", "Filipino"], ["ru-RU", "Russian"], ["fr-FR", "French"], ["hu-HU", "Hungarian"], ["ar-SA", "Arabic"]]) {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, locale });
    await go(page, "/");
    await page.waitForFunction(() => document.querySelectorAll("[data-tab-label]").length === 5 && document.documentElement.dataset.launch === "ready", null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const got = await row(page);
    must(
      got.cut.length === 0 && got.nearest >= 4 && got.inside,
      `${name}: every word is whole at ${got.size} px and the nearest two are ${got.nearest.toFixed(1)} px apart (${got.words.join(", ")})${got.cut.length ? `, cut: ${got.cut.join(", ")}` : ""}`,
    );
    if (locale === "el-GR" || locale === "fil-PH") await page.screenshot({ path: path.join(SHOTS, `tab-bar-${locale.slice(0, 2)}.png`), clip: { x: 0, y: 844 - 110, width: 390, height: 110 } });
    await ctx.close();
  }
});
// ---- 30. Content packs: what the website sends reaches the app (lib/packs).
// The app asks the website for packs a few seconds after it opens. Here the
// website is played by the walk: one context gets nothing (no signal, as in
// every other section) and shows the build's own verse; one gets a good pack
// and shows the pack's verse on Today and its board message on What's New;
// one gets a pack whose verse leads somewhere it must not and shows the
// build's verse again. Nothing here reaches any real website.
await section(30, async () => {
  console.log("\n30. Content packs: the website's verse, board message and covers reach the app");
  const release = fs.readFileSync("lib/whatsNew/version.ts", "utf8").match(/CURRENT_VERSION = "([^"]+)"/)?.[1] ?? "0";
  const DAY = "2026-11-13";
  const pack = (verse) => ({
    format: 1,
    release,
    made: `${DAY}T09:00:00.000Z`,
    packs: {
      "verse-of-day": { schema: 1, days: { [DAY]: verse } },
      board: {
        schema: 1,
        message: { week: "2026-W46", date: "2026-11-12", eyebrow: "This week at Purify", headline: "A message from the walk", body: ["Published after the build was made."] },
      },
      // The covers pack (1.9): John's books wear the Patmos icon, a figure
      // the build has, so the walk needs no new picture to see the map move.
      covers: {
        schema: 1,
        books: { john: "johnPatmos" },
        figures: { johnPatmos: { file: "/covers/johnPatmos.v1.jpg", names: { en: "St John the Theologian, on Patmos" } } },
      },
    },
  });
  const psalm = { label: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want.", href: "/bible/psalms/23#v1", source: "related", book: "psalms", bookName: "Psalms", chapter: 23, verse: 1 };
  const verseCard = (page) =>
    page.evaluate(() => {
      const card = [...document.querySelectorAll("article")].find((a) => /verse of the day/i.test(a.innerText));
      return card ? card.innerText.replace(/\s+/g, " ") : "";
    });
  const run = async (answer) => {
    const opened = await open({ width: 390, height: 844, phone: true });
    const asks = [];
    if (answer !== undefined) {
      // Registered after the shell's own route, so it is asked first.
      await opened.ctx.route(/\/api\/packs$/, (route) => {
        asks.push(route.request());
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": ORIGIN, Vary: "Origin" },
          body: JSON.stringify(answer),
        });
      });
    }
    await opened.page.clock.setFixedTime(new Date(`${DAY}T10:30:00`));
    await go(opened.page, "/");
    await opened.page.waitForFunction(() => /verse of the day/i.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
    // The ask waits four seconds after the app opens (components/native/PackBridge.tsx).
    await opened.page.waitForTimeout(7000);
    return { ...opened, asks, card: await verseCard(opened.page) };
  };

  const none = await run(undefined);
  must(none.card.length > 20 && !none.card.includes("my shepherd"), `with no signal, Today shows the build's own verse: "${none.card.slice(0, 90)}"`);
  await none.ctx.close();

  const good = await run(pack(psalm));
  must(good.asks.length === 1, `the app asked the website once (${good.asks.length})`);
  must(good.asks.every((r) => !r.headers().authorization && !r.headers().cookie), "and sent no account with the ask");
  must(good.card.includes("The LORD is my shepherd") && good.card.includes("Psalm 23:1"), `with a pack, Today shows the pack's verse: "${good.card.slice(0, 90)}"`);
  await good.page.screenshot({ path: path.join(SHOTS, "packs-today.png") });
  await go(good.page, "/whats-new/");
  await good.page.waitForFunction(() => document.body.innerText.includes("A message from the walk"), null, { timeout: 15000 }).catch(() => {});
  const news = await good.page.evaluate(() => document.body.innerText);
  must(news.includes("A message from the walk"), "and What's New shows the board message published after the build");
  await go(good.page, "/");
  await good.page.waitForTimeout(1500);
  must(good.asks.length === 1, `moving around the app does not ask again (${good.asks.length})`);
  // The covers pack: the plans page's John plans ask the website for the
  // pack's figure, not the build's. The walk has no website, so each picture
  // then shows the plate it falls back on; what was asked is the proof.
  const coverAsks = [];
  good.page.on("request", (r) => {
    if (/\/covers\//.test(r.url())) coverAsks.push(new URL(r.url()).pathname);
  });
  await go(good.page, "/plans/");
  await good.page.waitForTimeout(2500);
  must(coverAsks.includes("/covers/johnPatmos.v1.jpg") && !coverAsks.includes("/covers/john.v1.jpg"), `the covers pack reaches the plans page: John's plans ask for the pack's figure (${[...new Set(coverAsks)].join(", ")})`);
  await good.page.screenshot({ path: path.join(SHOTS, "packs-covers.png") });
  must(good.errors.length === 0, `no page errors${good.errors.length ? ": " + good.errors.slice(0, 2).join(" | ") : ""}`);
  await good.ctx.close();

  const bad = await run(pack({ ...psalm, href: "javascript:alert(1)" }));
  must(bad.asks.length === 1 && !bad.card.includes("my shepherd") && bad.card === none.card, "a pack whose verse leads outside the Bible is thrown away, and the build's verse stays");
  await bad.ctx.close();
});
// ---- 31. Scrolling a work and the shop on Android (2026-10-14).
// The owner's Android phone, and not his iPad, showed the shop and a saint's
// work jumping and stuttering under the thumb. Four causes were found and
// fixed, and this holds each: the work's reading bar moved through React with
// an eased fill restarted on every frame; opening a work fetched font files
// for ‹ › ☆ and laid the whole work out again; a saved place took a reader
// who had already started scrolling somewhere else; and the shop's grid rose
// with the scroll, which only Chromium (Android) runs.
await section(31, async () => {
  console.log("\n31. Scrolling a work and the shop");
  const WORK = "/saints/anthony-the-great/life-of-antony/";
  {
    const { ctx, page, asked } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/");
    await page.waitForTimeout(1500);
    const before = asked.length;
    await go(page, WORK);
    await page.waitForFunction(() => document.documentElement.scrollHeight > 20000, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const fonts = asked.slice(before).filter((p) => /\.woff2?$/.test(p));
    must(fonts.length === 0, `opening a work fetches no font file (${fonts.length ? fonts.join(", ") : "none"})`);
    // Since 1.8's round 6 (r3-29 A) a work reads as the Bible does: no bar,
    // the reading line along the top of the screen, and over the pill a
    // running line that opens once the chapter's head has gone up (one
    // opening, its rows and its opacity). That is the one transition a
    // work's scroll may start, and only once. The reading line starts none,
    // as before, and nothing else starts one at all: a scroll the page makes
    // itself does not step the plates, the pill or the tab bar away.
    const bar = await page.evaluate(async () => {
      const fill = document.querySelector("[data-work-progress] [class*='origin-left']");
      const reading = fill?.closest("[data-work-progress]") ?? null;
      const runs = [];
      document.addEventListener("transitionrun", (e) => runs.push({ el: e.target, prop: e.propertyName }), true);
      for (let y = 600; y <= 4800; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const scale = fill ? Number((getComputedStyle(fill).transform.match(/matrix\(([^,]+)/) || [])[1]) : NaN;
      const want = window.scrollY / (document.documentElement.scrollHeight - innerHeight);
      const isName = (el) => el instanceof Element && el.matches("[data-running-line]");
      const named = (r) => `${r.el.tagName?.toLowerCase() ?? "?"}.${String(r.el.className ?? "").split(" ")[0]} ${r.prop}`;
      return {
        found: Boolean(reading),
        inBar: runs.filter((r) => reading?.contains(r.el)).length,
        name: runs.filter((r) => isName(r.el)).length,
        others: runs.filter((r) => !reading?.contains(r.el) && !isName(r.el)).map(named),
        scale,
        want,
      };
    });
    must(bar.found && bar.inBar === 0, `the reading bar starts no transition as the work scrolls (${bar.found ? bar.inBar : "no reading bar"})`);
    must(Math.abs(bar.scale - bar.want) < 0.01, `and its fill is where the reader is (${bar.scale.toFixed(3)} for ${bar.want.toFixed(3)})`);
    must(bar.others.length === 0 && bar.name <= 2, `nothing else on the page starts one but the running line over the pill, opening once as the chapter's head goes (${bar.name} for the line${bar.others.length ? "; also " + [...new Set(bar.others)].slice(0, 3).join(", ") + `, ${bar.others.length} in all` : ""})`);
    await ctx.close();
  }
  const HOMILIES = "/saints/john-chrysostom/homilies-on-1-corinthians/";
  const saved = { "purify.reader.position.john-chrysostom/homilies-on-1-corinthians": JSON.stringify({ sectionN: 6, savedAt: Date.now() }) };
  const visit = async (touch) => {
    const opened = await open({ width: 390, height: 844, phone: true, set: saved });
    // The text arrives a moment after the page, as on a slower phone.
    await opened.ctx.route((url) => url.pathname.startsWith("/saints-data/"), async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      return route.fallback();
    });
    await go(opened.page, HOMILIES);
    await opened.page.waitForTimeout(300);
    if (touch) {
      const cdp = await opened.ctx.newCDPSession(opened.page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 600 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await opened.page.waitForFunction(() => document.querySelector("[data-chapter]"), null, { timeout: 20000 }).catch(() => {});
    await opened.page.waitForTimeout(1500);
    const at = await opened.page.evaluate(() => ({ y: Math.round(window.scrollY), chapter: document.querySelector("[data-chapter]")?.getAttribute("data-chapter") ?? null }));
    await opened.ctx.close();
    return at;
  };
  const resumed = await visit(false);
  // Since 1.8's round 6 (r3-29 A) each homily is a page of its own: a place
  // saved before then has no paragraph, so the saved homily opens at its top.
  must(resumed.chapter === "6" && resumed.y < 100, `a reader who has not touched the work is taken to their saved homily, at its head (chapter ${resumed.chapter}, y ${resumed.y})`);
  const left = await visit(true);
  must(left.chapter === "6" && left.y < 100, `a reader who touched the page before the text arrived opens the same homily and is not moved (chapter ${left.chapter}, y ${left.y})`);
  const css = fs.readdirSync(path.join(OUT, "_next/static/chunks")).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(OUT, "_next/static/chunks", f), "utf8")).join("\n");
  must(!css.includes(".shop-rise"), "the shop's grid carries no scroll-driven rise");
});
// ---- 32. One top bar (1.7).
// The owner, 2026-10-16 (Homebase/boards/purify-master/r17/BRAINSTORM.md,
// notes 10 to 14): the five tabs each drew their top right differently, the
// Premium pill sat on the left of Today and on the right elsewhere, Support
// did nothing useful there, and the pill's star was a vibe-coded symbol. One
// bar now (components/mobile/MobileHeader.tsx): the tab's name, then the
// pill, search and the bell, the same on all five. The streak's flame and
// count rode between them from 1.7.1 and left in 1.8 (his pick A of round 15,
// "Lighter, no streak"; the streak is Today's prayer rope now), so the bar
// holds those three and nothing else. This opens each tab on the
// narrow Android width and on an iPhone's, in English, Greek and Arabic
// (Arabic has the longest tab name in the bar's type, its Bible, "الكتاب
// المقدس", 121px at 19px; Filipino's "Mga Panalangin" was the longest until
// it became "Panalangin" on 2026-11-10, when the tab bar's words were fitted
// to a 320px phone), and measures the bar: the name whole, the pill and the
// two buttons where they are on every other tab and one even step apart, no
// Support and no star, and all of it inside the screen. A right-to-left bar
// is measured from its own side: its boxes are mirrored before they are
// compared, so the same rules hold. Then
// Today's pill, which left the screen for /pricing until 1.7, opens the
// upgrade sheet as the other four do. lib/nav/__tests__/oneTopBar.test.ts
// holds the source.
await section(32, async () => {
  console.log("\n32. One top bar");
  const words = (code) => ({ ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8")), ...JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8")) });
  const TABS = [["/", "nav.today"], ["/bible/", "nav.bible"], ["/discover/", "nav.discover"], ["/prayers/", "nav.prayers"], ["/account/", "nav.you"]];
  const measure = (page) =>
    page.evaluate(() => {
      const bar = document.querySelector("[data-route-content] [data-tab-topbar]");
      const h1 = bar?.querySelector("h1");
      const cluster = h1?.nextElementSibling;
      if (!bar || !h1 || !cluster) return null;
      // Arabic's bar runs from the right: each box is read from that side.
      const rtl = getComputedStyle(bar).direction === "rtl";
      const box = (n) => {
        const r = n?.getBoundingClientRect();
        if (!r) return null;
        const [left, right] = rtl ? [innerWidth - r.right, innerWidth - r.left] : [r.left, r.right];
        return { left, right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      // The pill's 44px box first, then search and the bell, and nothing
      // else: the streak left the bar in 1.8 (round 15 A).
      const kids = [...cluster.children];
      const [wrap, search, bell] = [kids[0], kids[kids.length - 2], kids[kids.length - 1]];
      const pill = wrap?.firstElementChild ?? null;
      const outside = [...bar.querySelectorAll("*")].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5);
      }).length;
      return {
        title: (h1.textContent ?? "").trim(),
        cut: h1.scrollWidth > h1.clientWidth,
        bar: box(bar),
        pill: box(pill),
        painted: box(pill?.firstElementChild),
        search: box(search),
        bell: box(bell),
        searchSays: search?.getAttribute("aria-label") ?? "",
        support: !!bar.querySelector("a[href^='/support']"),
        star: !!pill && [...pill.querySelectorAll("*")].some((n) => getComputedStyle(n).clipPath !== "none" || n.tagName === "svg"),
        kids: kids.length,
        // The streak's count, by the words its button was named with.
        streak: [...cluster.querySelectorAll("[aria-label]")].some((n) => /\bstreak\b|\d+-day/i.test(n.getAttribute("aria-label") ?? "")),
        outside,
        vw: innerWidth,
      };
    });
  const near = (a, b, by = 1) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= by;
  for (const size of [{ width: 360, height: 780 }, { width: 390, height: 844 }]) {
    for (const [locale, code] of [["en-US", "en"], ["el-GR", "el"], ["ar", "ar"]]) {
      const w = words(code);
      const { ctx, page, errors } = await open({ ...size, phone: true, locale });
      const seen = [];
      for (const [to, key] of TABS) {
        await go(page, to);
        await page.waitForFunction((want) => document.querySelector("[data-route-content] [data-tab-topbar] h1")?.textContent?.trim() === want, w[key], { timeout: 20000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(700);
        seen.push({ to, key, got: await measure(page) });
      }
      const where = `${code} at ${size.width}px`;
      must(seen.every((s) => s.got && s.got.title === w[s.key]), `${where}: each tab's bar is named for its tab (${seen.map((s) => s.got?.title ?? "no bar").join(", ")})`);
      must(seen.every((s) => s.got && !s.got.cut), `${where}: and every name is whole${seen.some((s) => s.got?.cut) ? `, cut: ${seen.filter((s) => s.got?.cut).map((s) => s.got.title).join(", ")}` : ""}`);
      const first = seen[0].got;
      const same = (pick) => seen.every((s) => s.got && first && near(pick(s.got), pick(first)));
      must(
        !!first && same((g) => g.pill?.right) && same((g) => g.search?.left) && same((g) => g.bell?.left) && same((g) => g.bell?.right) && same((g) => g.bar?.bottom),
        `${where}: the pill ends where it does on every tab, search and the bell stand in one place, and the bar is one height (pill ends at ${seen.map((s) => Math.round(s.got?.pill?.right ?? -1)).join(", ")}; bar ends at ${seen.map((s) => Math.round(s.got?.bar?.bottom ?? -1)).join(", ")})`,
      );
      must(seen.every((s) => s.got && s.got.searchSays === w["search.open"] && s.got.search && s.got.bell && s.got.search.width >= 44 && s.got.search.height >= 44 && s.got.bell.width >= 44 && s.got.bell.height >= 44 && s.got.pill && s.got.pill.height >= 44), `${where}: search, the bell and the pill's box are 44px on every tab`);
      // One even step between the three boxes (the owner's build 80 note 5:
      // search touched the bell while the pill stood 2px off, which showed
      // on Prayers' round plates). The row's own 8px, on every tab.
      const steps = (g) => (g?.pill && g.search && g.bell ? [g.search.left - g.pill.right, g.bell.left - g.search.right] : null);
      must(
        seen.every((s) => {
          const st = steps(s.got);
          return !!st && near(st[0], st[1], 0.5) && st[0] >= 7.5;
        }),
        `${where}: the pill, search and the bell stand one even step apart (${seen.map((s) => steps(s.got)?.map((v) => v.toFixed(1)).join(" and ") ?? "?").join("; ")} px)`,
      );
      must(seen.every((s) => s.got && s.got.painted && near(s.got.painted.height, seen[0].got.painted?.height, 0.5)), `${where}: the pill is one size on every tab (${seen.map((s) => Math.round(s.got?.painted?.height ?? -1)).join(", ")} px tall)`);
      must(seen.every((s) => s.got && !s.got.support && !s.got.star), `${where}: no Support in the bar and no star in the pill`);
      must(
        seen.every((s) => s.got && s.got.kids === 3 && !s.got.streak),
        `${where}: the pill, search and the bell, and no streak in the bar (round 15 A; ${seen.map((s) => `${s.to} ${s.got?.kids ?? "?"}${s.got?.streak ? " with a streak" : ""}`).join(", ")})`,
      );
      must(seen.every((s) => s.got && s.got.outside === 0), `${where}: and all of it inside the screen${seen.some((s) => s.got?.outside) ? ` (${seen.filter((s) => s.got?.outside).map((s) => s.to).join(", ")} reach past it)` : ""}`);
      if (size.width === 360 && code === "ar") {
        await go(page, "/bible/");
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SHOTS, "top-bar-ar-360.png"), clip: { x: 0, y: 0, width: 360, height: 120 } });
      }
      must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
      await ctx.close();
    }
  }
  {
    // Today's pill opens the upgrade sheet over Today, and the screen stays.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/");
    const pill = page.locator("[data-route-content] [data-tab-topbar] h1 + div > :first-child > *").first();
    await pill.waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await pill.tap().catch(() => {});
    await page.waitForFunction(() => document.querySelector("[role=dialog]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ at: location.pathname, sheet: !!document.querySelector("[role=dialog]") }));
    must(after.sheet && after.at === "/", `Today's Premium pill opens the upgrade sheet and Today stays (${after.sheet ? "a sheet" : "no sheet"} on ${after.at})`);
    await page.screenshot({ path: path.join(SHOTS, "today-premium-sheet.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 33. The reader on a phone and a tablet (1.8, "The page").
// The owner's pick B of round 2, locked 2026-10-27 (Homebase/boards/
// purify-master/variants/02-bible): no bar at all, only round buttons over
// the page, the way back on one side and Aa and ••• on the other; the
// chapter opens like a book, on its words, the book's name over its chapter
// and a short rule; the pill at the foot turns the chapter and ends in
// Listen; the pill and the round buttons step away as the reader reads on
// and come back on a scroll up. What stood above the title and in the 1.7
// bar is in the ••• sheet (the one search, opened on the Bible, the chapters,
// the translation, the Greek, the bookmark) and the Aa sheet (the settings).
// Its second search, "Search Purify", and its Book row went in build 87 (the
// owner's note 82): the same screen twice, and the title's own job. On a
// tablet one centred column with the Fathers in the sheet, and focus mode's
// way out at the foot, out of the top right. This opens John
// 1 and Genesis 1 (the Greek offered) on the narrow Android width and on an
// iPhone's with its status bar and home indicator stood in, then John 1 on
// an iPad's two orientations, and walks focus mode on a phone and a tablet.
// lib/bible/__tests__/readerScreen.test.ts holds the source.
await section(33, async () => {
  console.log("\n33. The reader on a phone and a tablet");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const names = { back: en["nav.back"], settings: en["bible.readerSettings"], more: en["bible.moreActions"], sound: en["ambience.title"], listen: en["readAloud.listen"], focus: en["bible.focusReading"] };
  const looks = (w) => {
    const title = document.getElementById("chapter-title");
    const h1 = title?.querySelector("h1");
    const column = title?.parentElement;
    const shown = (n) => {
      if (!n) return false;
      const b = n.getBoundingClientRect();
      const s = getComputedStyle(n);
      return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const box = (n) => {
      if (!n) return null;
      const b = n.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    // The book's name as it is drawn: its words, not its block.
    const nameWords = (() => {
      const span = h1?.firstElementChild;
      if (!span) return null;
      const r = document.createRange();
      r.selectNodeContents(span);
      return box(r);
    })();
    const top = document.querySelector("[data-mobile-topbar]");
    const plates = top ? [...top.querySelectorAll("a, button")].filter(shown) : [];
    const wrap = document.querySelector("[data-reader-pill]");
    const pill = wrap?.querySelector(":scope > div") ?? null;
    const controls = pill ? [...pill.querySelectorAll("a, button")].filter(shown) : [];
    const last = controls[controls.length - 1];
    const buttons = [...document.querySelectorAll("button")].filter(shown);
    return {
      h1: (h1?.textContent ?? "").replace(/\s+/g, " ").trim(),
      name: nameWords,
      column: box(column),
      rule: box(title?.querySelector(".page-open-rule")),
      bar: top ? { plates: top.hasAttribute("data-plates"), heading: !!top.querySelector("h1, [data-topbar-title]"), pad: getComputedStyle(top).paddingTop, ground: getComputedStyle(top).backgroundImage } : null,
      plates: plates.map((p) => ({ ...box(p), name: p.getAttribute("aria-label") ?? "", round: parseFloat(getComputedStyle(p).borderTopLeftRadius) >= p.getBoundingClientRect().height / 2 - 0.5 })),
      pill: pill && shown(wrap) ? box(pill) : null,
      last: last ? { ...box(last), name: last.getAttribute("aria-label") ?? "", text: (last.innerText ?? "").trim(), listen: last.hasAttribute("data-read-aloud-play") } : null,
      sound: controls.findIndex((c) => c.getAttribute("aria-label") === w.sound),
      v1: box(document.getElementById("v1")),
      asides: [...document.querySelectorAll("aside")].filter(shown).length,
      toolbar: buttons.filter((b) => (b.getAttribute("aria-label") ?? "") === w.focus).length,
      settings: buttons.filter((b) => (b.getAttribute("aria-label") ?? "") === w.settings).length,
      readerPill: buttons.filter((b) => (b.textContent ?? "").trim() === "Reader").length,
      // The words' size: Large for a reader who has never chosen one (1.8).
      size: (() => {
        const article = document.getElementById("v1")?.closest("article");
        return article ? getComputedStyle(article).fontSize : null;
      })(),
      vw: innerWidth,
      vh: innerHeight,
    };
  };
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const opened = (page, want) => page.waitForFunction((w) => document.getElementById("chapter-title")?.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() === w, want, { timeout: 20000 }).catch(() => {});
  // The panel of the sheet named so, or holding those words, through a box
  // of display: contents (section 8).
  const sheetNamed = (page, test) =>
    page.evaluate((t) => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => new RegExp(t).test(x.getAttribute("aria-label") ?? "") || new RegExp(t).test(x.textContent ?? ""));
      if (!d) return null;
      let p = d.lastElementChild;
      while (p && getComputedStyle(p).display === "contents") p = p.lastElementChild;
      const r = p.getBoundingClientRect();
      return { name: d.getAttribute("aria-label"), modal: d.getAttribute("aria-modal"), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), middle: Math.round((r.left + r.right) / 2), vw: innerWidth, vh: innerHeight };
    }, test);
  // A phone's status bar and home indicator, as its WebView reports them.
  const statusBar = async (ctx, page, top, bottom) => {
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top, topMax: top, bottom, bottomMax: bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
    } catch (e) {
      must(false, `the phone's status bar stood in: ${firstLine(e)}`);
    }
  };

  // The phones: no bar, two round buttons (the way back and •••, the
  // owner's pick B of 2026-10-28, "Aa inside •••"), the book's name over
  // its chapter, the words near the top at Large, and the pill ending in
  // Listen.
  for (const size of [{ width: 360, height: 780, inset: [0, 0] }, { width: 390, height: 844, inset: [47, 34] }]) {
    const { ctx, page, errors } = await open({ width: size.width, height: size.height, phone: true, set: { "purify:interlinear": "1" } });
    if (size.inset[0]) await statusBar(ctx, page, size.inset[0], size.inset[1]);
    for (const [to, book] of [["/bible/john/1/", "John"], ["/bible/genesis/1/", "Genesis"]]) {
      await go(page, to);
      await opened(page, `${book} Chapter 1`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      const got = await page.evaluate(looks, names);
      const where = `${book} 1 at ${size.width}px`;
      must(got.h1 === `${book} Chapter 1`, `${where}: one heading names the book over its chapter, "${got.h1}"`);
      const middle = got.column ? (got.column.left + got.column.right) / 2 : -1;
      must(Boolean(got.name) && Math.abs((got.name.left + got.name.right) / 2 - middle) <= 2 && Boolean(got.rule) && got.rule.width > 20 && got.rule.width < 40 && Math.abs((got.rule.left + got.rule.right) / 2 - middle) <= 1.5, `${where}: the name and its short rule stand in the middle (${got.name ? Math.round((got.name.left + got.name.right) / 2) : "?"} and ${got.rule ? Math.round((got.rule.left + got.rule.right) / 2) : "?"} against ${Math.round(middle)})`);
      must(Boolean(got.bar) && got.bar.plates && !got.bar.heading, `${where}: no bar, only the plates (${got.bar ? (got.bar.heading ? "a title in it" : "no title") : "nothing"})`);
      must(got.plates.map((p) => p.name).join(" | ") === [names.back, names.more].join(" | "), `${where}: the way back, then ••• (${got.plates.map((p) => p.name).join(" | ")})`);
      must(got.plates.length === 2 && got.plates.every((p) => p.round && p.width >= 40 && p.height >= 40 && p.left >= 0 && p.right <= got.vw && p.top >= size.inset[0]), `${where}: each a round plate, inside the screen and under the status bar (${got.plates.map((p) => `${Math.round(p.width)}px at ${Math.round(p.top)}`).join(", ")})`);
      must(got.settings === 0, `${where}: no round Aa of its own: the settings are inside ••• (${got.settings} Aa)`);
      must(got.size === "19px", `${where}: a reader who has never chosen a size reads Large, 19px as drawn (${got.size})`);
      must(got.plates.length > 0 && spread(got.plates.map((p) => p.top)) <= 1, `${where}: in one row`);
      must(Boolean(got.v1) && got.plates.length > 0 && got.v1.top >= Math.max(...got.plates.map((p) => p.bottom)) && got.v1.top < got.vh * 0.6, `${where}: the chapter opens on its words, the first verse at ${got.v1 ? Math.round(got.v1.top) : "?"}px of ${got.vh} (it was at the foot of the first screen in 1.7)`);
      must(Boolean(got.pill) && got.pill.left >= -0.5 && got.pill.right <= got.vw + 0.5 && got.pill.bottom <= got.vh - size.inset[1], `${where}: the pill is inside the screen, clear of the home indicator (${got.pill ? `${Math.round(got.pill.left)}..${Math.round(got.pill.right)}, foot at ${Math.round(got.pill.bottom)} of ${got.vh}` : "no pill"})`);
      if (book === "John") {
        const l = got.last;
        must(Boolean(l) && l.listen && l.name === names.listen && l.height >= 40 && (size.width < 390 || l.text === names.listen), `${where}: the pill ends in Listen${size.width < 390 ? ", its mark alone on a narrow phone" : ", with its word"} (${l ? `"${l.name}", "${l.text}", ${Math.round(l.width)}x${Math.round(l.height)}` : "nothing"})`);
        must(got.sound >= 0, `${where}: the sound button is on the pill, before Listen`);
      }
      if (size.inset[0] && book === "John") {
        must(Boolean(got.bar) && got.bar.pad === `${size.inset[0]}px` && /gradient/.test(got.bar.ground), `${where}: the strip under the clock is the page's ground, so the words never run under it (${got.bar ? `${got.bar.pad}, ${got.bar.ground.slice(0, 40)}` : "no bar"})`);
        await page.screenshot({ path: path.join(SHOTS, "reader-john1-390.png") });

        // Reading on puts the plates, the pill and the tab bar away; a scroll
        // up brings them back (the tab bar with them from 1.8's second round).
        const state = () =>
          page.evaluate(() => {
            const bar = document.querySelector("[data-tab-bar]");
            return {
              away: document.body.hasAttribute("data-reader-away"),
              pill: getComputedStyle(document.querySelector("[data-reader-pill]")).visibility,
              plates: getComputedStyle(document.querySelector("[data-plates-row]")).visibility,
              tabs: bar ? getComputedStyle(bar).visibility : "none",
              y: Math.round(scrollY),
            };
          });
        await page.mouse.move(size.width / 2, size.height / 2);
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(700);
        const down = await state();
        must(down.away && down.pill === "hidden" && down.plates === "hidden", `${where}: reading on, the plates and the pill step away (scrolled to ${down.y}px; pill ${down.pill}, plates ${down.plates})`);
        must(down.tabs === "hidden", `${where}: and the tab bar with them (${down.tabs})`);
        await page.screenshot({ path: path.join(SHOTS, "reader-away-390.png") });
        await page.mouse.wheel(0, -160);
        await page.waitForTimeout(700);
        const up = await state();
        must(!up.away && up.pill === "visible" && up.plates === "visible", `${where}: a scroll up brings them back (at ${up.y}px; pill ${up.pill}, plates ${up.plates})`);
        must(up.tabs === "visible", `${where}: the tab bar too (${up.tabs})`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // ••• holds what stood above the title and in the bar.
        await tap(page.getByRole("button", { name: names.more }));
        await page.waitForFunction(() => [...document.querySelectorAll("[role=dialog]")].some((d) => d.getAttribute("aria-label") === "John 1"), null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(700);
        const more = await page.evaluate(() => {
          const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === "John 1");
          if (!d) return null;
          const rows = [...d.querySelectorAll("button")].map((b) => (b.innerText ?? "").replace(/\s+/g, " ").trim());
          const current = d.querySelector('a[aria-current="page"]');
          const r = current?.getBoundingClientRect();
          return {
            rows,
            search: !!d.querySelector("[data-bible-search-open]"),
            doors: [...d.querySelectorAll("[data-search-door]")].map((b) => b.getAttribute("data-search-door")),
            current: current ? { text: current.textContent.trim(), inView: r.left >= 0 && r.right <= innerWidth } : null,
          };
        });
        const has = (start, holds = "") => Boolean(more) && more.rows.some((t) => t.startsWith(start) && t.includes(holds));
        must(Boolean(more) && more.search && Boolean(more.current) && more.current.text === "1" && more.current.inView, `${where}: ••• opens a sheet with the search and the chapters, the one being read in view (${more ? `search ${more.search}, current ${more.current ? more.current.text : "none"}` : "no sheet"})`);
        const firstRow = more ? more.rows.filter(Boolean)[0] ?? "" : "";
        must(firstRow.endsWith(names.settings), `${where}: the reader's settings are its first row, over the search ("${firstRow}")`);
        must(has(en["bible.translationLabel"], "KJV") && has(en["bible.interlinearGreek"]) && has(en["bible.bookmarkThisChapter"]), `${where}: and the translation, the Greek and the bookmark (${more ? more.rows.filter(Boolean).slice(0, 8).join(" | ") : "no sheet"})`);
        // Build 87, the owner's note 82: one search, the Bible's, and no row
        // doing the title's job (the title opens the books).
        must(Boolean(more) && more.doors.join(",") === "bible" && !has(en["search.ariaLabel"]) && !has(`${en["bible.bookLabel"]} `, "John"), `${where}: one search in it, opened on the Bible, and no Book row (${more ? `${more.doors.join(", ") || "no search"}; ${more.rows.filter(Boolean).join(" | ")}` : "no sheet"})`);
        await page.screenshot({ path: path.join(SHOTS, "reader-more-sheet-390.png") });
        // The translation opens in a sheet of its own, as the settings do.
        await tap(page.locator("[role=dialog] button", { hasText: en["bible.translationLabel"] }).first());
        await page.waitForFunction(() => [...document.querySelectorAll("[role=dialog]")].some((d) => /King James Version/.test(d.textContent ?? "")), null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(700);
        const sheet = await sheetNamed(page, "King James Version");
        const stillMore = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].some((x) => x.getAttribute("aria-label") === "John 1"));
        must(Boolean(sheet) && sheet.modal === "true" && sheet.bottom >= sheet.vh - 1 && !stillMore, `${where}: Translation opens a sheet from the foot that holds the KJV, and ••• goes first (${sheet ? `${sheet.left}..${sheet.right}, foot at ${sheet.bottom} of ${sheet.vh}` : "no sheet"}${stillMore ? "; ••• still open" : ""})`);
        await page.screenshot({ path: path.join(SHOTS, "reader-translation-sheet-390.png") });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(700);
        // The settings' row opens the reader's settings, the sheet Aa opened, and ••• goes first.
        await tap(page.getByRole("button", { name: names.more }));
        await page.waitForTimeout(800);
        await tap(page.locator("[role=dialog] button", { hasText: names.settings }).first());
        await page.waitForTimeout(800);
        const settings = await sheetNamed(page, `^${names.settings}$`);
        const moreLeft = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].some((x) => x.getAttribute("aria-label") === "John 1"));
        must(Boolean(settings) && settings.name === names.settings && !moreLeft, `${where}: the row opens the reader's settings in its place (${settings ? settings.name : "no sheet"}${moreLeft ? "; ••• still open" : ""})`);
        const lit = await page.evaluate((large) => {
          const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === "Reader settings");
          return d ? [...d.querySelectorAll("button[aria-pressed='true']")].map((b) => b.getAttribute("aria-label") ?? "").includes(large) : false;
        }, en["settings.sizeLarge"]);
        must(lit, `${where}: with Large lit, the size the page is drawn at`);
        await page.screenshot({ path: path.join(SHOTS, "reader-settings-from-more-390.png") });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(600);

        // The tab bar steps away on this page alone: on another screen it stays.
        await go(page, "/discover/");
        await page.waitForFunction(() => location.pathname === "/discover/", null, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await page.mouse.move(size.width / 2, size.height / 2);
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(700);
        const elsewhere = await page.evaluate(() => {
          const bar = document.querySelector("[data-tab-bar]");
          return { screen: document.body.hasAttribute("data-reader-screen"), away: document.body.hasAttribute("data-reader-away"), tabs: bar ? getComputedStyle(bar).visibility : "none", opacity: bar ? getComputedStyle(bar).opacity : "none", y: Math.round(scrollY) };
        });
        must(!elsewhere.screen && !elsewhere.away && elsewhere.tabs === "visible" && elsewhere.opacity === "1", `${where}: on Discover, read on, the tab bar stays (scrolled to ${elsewhere.y}px; ${elsewhere.tabs}, opacity ${elsewhere.opacity})`);
      }
      if (to === "/bible/genesis/1/" && size.width === 360) await page.screenshot({ path: path.join(SHOTS, "reader-genesis1-360.png") });
    }
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // An iPad, both ways round: one centred column, the round buttons as on a
  // phone, no rail beside it, the Fathers in the sheet, and each sheet a panel.
  for (const size of [{ width: 1180, height: 820 }, { width: 820, height: 1180 }]) {
    const { ctx, page, asked, errors } = await open({ ...size, phone: true });
    await go(page, "/bible/john/1/");
    await opened(page, "John Chapter 1");
    await page.waitForTimeout(1500);
    const got = await page.evaluate(looks, names);
    const where = `John 1 at ${size.width}x${size.height}`;
    const middle = got.column ? (got.column.left + got.column.right) / 2 : -1;
    must(Math.abs(middle - got.vw / 2) <= 2, `${where}: the text's column stands in the middle (${Math.round(middle)} against ${got.vw / 2})`);
    must(Boolean(got.bar) && got.bar.plates && got.plates.length === 2, `${where}: the two round buttons over the page, as on a phone (${got.plates.map((p) => p.name).join(" | ")})`);
    must(got.asides === 0 && got.toolbar === 0, `${where}: no rail and no computer's toolbar (${got.asides} aside, ${got.toolbar} Focus pill)`);
    must(got.settings === 0 && got.readerPill === 0, `${where}: the reader's settings are inside •••, and no Reader pill (${got.settings} Aa, ${got.readerPill} Reader pill)`);
    must(Boolean(got.pill) && Math.abs((got.pill.left + got.pill.right) / 2 - got.vw / 2) <= 2, `${where}: the pill stands in the middle at the foot`);
    await page.screenshot({ path: path.join(SHOTS, `reader-john1-tablet-${size.width}.png`) });
    const mark = page.locator("button[aria-label*='ommentary']").filter({ visible: true }).first();
    if (await mark.count()) {
      await mark.scrollIntoViewIfNeeded();
      await tap(mark);
      await page.waitForTimeout(1800);
      must(data(asked).includes("/bible-data/commentary/john/1.json"), `${where}: a verse's mark opens the Fathers in the sheet, which reads the commentary file`);
      const panel = await page.evaluate(() => {
        const d = document.querySelector("[role=dialog][aria-labelledby='commentary-sheet-title']");
        if (!d) return null;
        let p = d.lastElementChild;
        while (p && getComputedStyle(p).display === "contents") p = p.lastElementChild;
        const r = p.getBoundingClientRect();
        return { width: Math.round(r.width), middle: Math.round((r.left + r.right) / 2), text: (d.textContent ?? "").length };
      });
      must(Boolean(panel) && panel.width > 0 && panel.width <= 681 && Math.abs(panel.middle - got.vw / 2) <= 2 && panel.text > 40, `${where}: the Fathers' sheet takes the column's width, in the middle (${panel ? `${panel.width}px at ${panel.middle}` : "no sheet"})`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(700);
    } else must(false, `${where}: found a commentary mark to tap`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await tap(page.getByRole("button", { name: names.more }));
    await page.waitForTimeout(800);
    await tap(page.locator("[role=dialog] button", { hasText: en["bible.translationLabel"] }).first());
    await page.waitForTimeout(900);
    const sheet = await sheetNamed(page, "King James Version");
    must(Boolean(sheet) && sheet.width > 0 && sheet.width <= 561 && Math.abs(sheet.middle - got.vw / 2) <= 2, `${where}: the translation sheet, from •••, is a centred panel, not a bar across the screen (${sheet ? `${sheet.width}px at ${sheet.middle}` : "no sheet"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Focus mode, from the reader's settings in •••, on a phone and an iPad.
  for (const size of [{ width: 390, height: 844 }, { width: 1180, height: 820 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/bible/john/1/");
    await opened(page, "John Chapter 1");
    await page.waitForTimeout(1200);
    const where = `focus at ${size.width}px`;
    await page.getByRole("button", { name: names.more }).tap().catch(() => {});
    await page.waitForTimeout(700);
    await page.locator("[role=dialog] button", { hasText: names.settings }).first().tap().catch(() => {});
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: /^Focus reading/ }).tap().catch(() => {});
    await page.waitForFunction(() => document.documentElement.classList.contains("reader-focus"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1100);
    const exitNow = () =>
      page.evaluate(() => {
        const b = document.querySelector("[data-reader-exit]");
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), middle: Math.round((r.left + r.right) / 2), opacity: Number(getComputedStyle(b).opacity), vw: innerWidth, vh: innerHeight };
      });
    const bars = await page.evaluate(() => {
      const shown = (n) => !!n && n.getBoundingClientRect().height > 0 && getComputedStyle(n).display !== "none";
      return { focus: document.documentElement.classList.contains("reader-focus"), bar: shown(document.querySelector("[data-mobile-topbar]")), pill: shown(document.querySelector("[aria-label='Chapter switcher']")), books: shown(document.querySelector("[data-title-books]")) };
    });
    must(bars.focus && !bars.bar && !bars.pill && !bars.books, `${where}: the round buttons, the chapter pill and the title's way to the books are put away (focus ${bars.focus}, plates ${bars.bar}, pill ${bars.pill}, books ${bars.books})`);
    const exit = await exitNow();
    must(Boolean(exit) && exit.opacity > 0.95 && exit.top >= exit.vh - 140 && exit.bottom <= exit.vh && Math.abs(exit.middle - exit.vw / 2) <= 2, `${where}: the way out is at the foot, in the middle, in sight as focus begins (${exit ? `${exit.top}..${exit.bottom} of ${exit.vh}, opacity ${exit.opacity}` : "none"})`);
    await page.screenshot({ path: path.join(SHOTS, `reader-focus-${size.width}.png`) });
    await page.waitForTimeout(4200);
    const resting = await exitNow();
    must(Boolean(resting) && resting.opacity < 0.05, `${where}: it fades once the reader is reading (opacity ${resting ? resting.opacity : "none"})`);
    const at = await page.evaluate(() => {
      const r = document.querySelector("#chapter-title h1")?.getBoundingClientRect();
      return r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null;
    });
    if (at) await page.touchscreen.tap(at.x, at.y);
    await page.waitForTimeout(600);
    const woken = await exitNow();
    must(Boolean(woken) && woken.opacity > 0.95, `${where}: and a tap brings it back (opacity ${woken ? woken.opacity : "none"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ focus: document.documentElement.classList.contains("reader-focus"), bar: !!document.querySelector("[data-mobile-topbar]") && getComputedStyle(document.querySelector("[data-mobile-topbar]")).display !== "none" }));
    must(!after.focus && after.bar, `${where}: Escape leaves focus and the round buttons are back`);
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 34. Chants, where the Kitchen was (1.7).
// The owner, 2026-10-16 (Homebase/boards/purify-master/r17/BRAINSTORM.md,
// notes 15, 26 and 28): the Kitchen comes off every reader surface and Chants
// takes its tile; every chant has one page (what it is, where it comes from,
// its versions); chant audio streams from the website and never ships inside
// the app. This walk has no network, so it is also the app with no signal:
// the Anthem's three versions must say they play with a connection, never
// offer a button that does nothing. The library opens with one chant, so the
// home must read as finished with it: no row with nothing in it.
await section(34, async () => {
  console.log("\n34. Chants");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  must(!inBundle(OUT, "/kitchen/") && !inBundle(OUT, "/kitchen/recipe/") && !inBundle(OUT, "/kitchen/new/"), "the Kitchen's screens are not in the bundle");
  must(!fs.existsSync(path.join(OUT, "kitchen-photos")), "nor its photos: they stay on the website");
  must(!fs.existsSync(path.join(OUT, "audio", "chants")), "no chant recording or takedown list ships inside the app");
  must(fs.existsSync(path.join(OUT, "chants-index.json")), "the library's index ships, so Pray with chant lists it with no signal");
  must(inBundle(OUT, "/chants/") && inBundle(OUT, "/chants/prayer-rope-anthem/"), "Chants and the Anthem's page are in the bundle");
  must(!inBundle(OUT, "/prayers/anthem/"), "and the Anthem's old page is not");

  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });

  // Discover: the Chants tile in the Kitchen's place, after Theology.
  await go(page, "/discover/");
  await page.waitForFunction((w) => document.body.innerText.includes(w), en["discover.tile.saints"], { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const tiles = await page.evaluate(() => [...document.querySelectorAll("[data-route-content] a[href]")].map((a) => (a.getAttribute("href") ?? "").replace(/\/$/, "")));
  must(tiles.includes("/chants") && !tiles.some((h) => h.startsWith("/kitchen")), `Discover has a Chants tile and no Kitchen (${tiles.filter((h) => /chants|kitchen/.test(h)).join(", ") || "neither"})`);
  must(tiles.indexOf("/chants") === tiles.indexOf("/theology") + 1, "in the Kitchen's place, after Theology");

  // The home (1.8, the six chants of 2026-10-30): the chant at the top has a
  // cover (the Prayer Rope Anthem, the one with an icon), except the Paschal
  // Canon in its own season, Palm Sunday through Bright Week
  // (lib/chants/select.ts); every row drawn holds a chant; every chant is in
  // All chants; and no cover is an empty box: a chant with none has the
  // plate, the cross glowing white (components/ui/CrossPlate.tsx).
  const library = JSON.parse(fs.readFileSync(path.join(OUT, "chants-index.json"), "utf8"));
  must(library.every((c) => inBundle(OUT, `/chants/${c.slug}/`)), `every chant's page is in the bundle (${library.length}: ${library.map((c) => c.slug).join(", ")})`);

  // Build 86 note 78: on the owner's phone Psalm 135 and Psalm 117 were not
  // timed, because the apps asked the website for each timing file and the
  // website still ran an older build. Every version with a recording now
  // carries its timing in the export (app/chant-timing), line for line its
  // words (data/chants, the words the pages were built from) and word for
  // word where it times words.
  const words = (s) => s.split(/\s+/).filter(Boolean);
  const timingProblems = [];
  let timedVersions = 0;
  for (const c of library) {
    const data = JSON.parse(fs.readFileSync(path.resolve("data", "chants", `${c.slug}.json`), "utf8"));
    for (const v of c.variants) {
      const ref = `${c.slug}/${v.id}`;
      if (!v.audio?.src) continue;
      if (!v.timing) {
        timingProblems.push(`${ref}: no timing`);
        continue;
      }
      const file = path.join(OUT, v.timing.replace(/^\//, ""));
      if (!fs.existsSync(file)) {
        timingProblems.push(`${ref}: ${v.timing} not in the export`);
        continue;
      }
      let t = null;
      try {
        t = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {}
      const lines = data.variants.find((x) => x.id === v.id)?.lines ?? [];
      if (!t || (t.v !== 1 && t.v !== 2) || !Array.isArray(t.lines)) timingProblems.push(`${ref}: ${v.timing} does not read`);
      else if (t.lines.length !== lines.length) timingProblems.push(`${ref}: ${t.lines.length} timed lines to ${lines.length} words`);
      else {
        const off = t.lines.findIndex((l, i) => l.text !== lines[i].text || (l.words && l.words.length !== words(l.text).length));
        if (off >= 0) timingProblems.push(`${ref}: line ${off + 1} is not its words`);
        else timedVersions++;
      }
    }
  }
  must(timingProblems.length === 0, `every version with a recording has its timing in the export, line for line its words (${timedVersions} timed${timingProblems.length ? `; ${timingProblems.join("; ")}` : ""})`);
  await go(page, "/chants/");
  await page.waitForFunction(() => document.querySelector("[data-route-content] section[aria-labelledby=chants-featured] [data-cover]"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const home = await page.evaluate(() => {
    const root = document.querySelector("[data-route-content]");
    const featured = root?.querySelector("section[aria-labelledby=chants-featured]");
    const all = root?.querySelector("section[aria-labelledby=chants-all]");
    return {
      text: root?.innerText ?? "",
      featured: featured
        ? {
            title: (featured.querySelector("h2")?.textContent ?? "").trim(),
            cover: featured.querySelector("[data-cover]")?.getAttribute("data-cover") ?? null,
            buttons: [...featured.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim()),
          }
        : null,
      rows: [...(root?.querySelectorAll("section[aria-labelledby^=chants-row-]") ?? [])].map((s) => ({
        heading: (s.querySelector("[role=heading]")?.textContent ?? "").trim(),
        chants: s.querySelectorAll("a[href*='/chants/']").length,
      })),
      all: all ? all.querySelectorAll("li a[href*='/chants/']").length : 0,
      covers: [...(root?.querySelectorAll("[data-cover]") ?? [])].map((c) =>
        c.getAttribute("data-cover") === "img" ? Boolean(c.querySelector("img")) : Boolean(c.querySelector("svg line")),
      ),
    };
  });
  const anthemTitle = en["chants.item.prayerRopeAnthem.title"];
  must(
    Boolean(home.featured) && (home.featured.cover === "img" || home.featured.title === en["chants.item.paschalCanon.title"]),
    `the Chants home opens on a chant with a cover, or on the Paschal Canon in its season (${home.featured ? `${home.featured.title}, ${home.featured.cover}` : "nothing at the top"})`,
  );
  if (home.featured?.title === anthemTitle) must(["English", "Français", "العربية"].every((l) => home.featured.buttons.includes(l)), "with the Anthem's three versions to choose between");
  must(home.text.includes(en["chants.needsConnection"]), "and with no signal it says they play with a connection");
  must(home.rows.length > 0 && home.rows.every((r) => r.chants > 0), `every row drawn holds a chant, none empty (${home.rows.map((r) => `${r.heading} ${r.chants}`).join(", ") || "no rows"})`);
  must(home.all === library.length, `All chants lists every chant (${home.all} of ${library.length})`);
  must(home.covers.length > 0 && home.covers.every(Boolean), `no cover is an empty box: each is an icon or the plate's cross (${home.covers.filter(Boolean).length} of ${home.covers.length})`);
  await page.screenshot({ path: path.join(SHOTS, "chants-home-phone.png"), fullPage: true });

  // A chant's own page (1.8, sheet r3-18, the owner's pick of 2026-10-31: "a
  // mix of A and B. I want the player to be at the bottom, like how A has
  // it"): B's page, the icon across the top with the name and who sings it on
  // it, the doors Words, About and Versions, the words as sung leading; and
  // A's player docked at the foot, over the tab bar, never under it. Every
  // control keeps its place from the first frame (the owner's note 61): its
  // box is recorded on every frame from the first one the page draws, and
  // once everything has answered it must be where it was. Frames count only
  // once the address is the chant being watched, and each watch keeps its own
  // list and ends the one before: the walk moves in place (go, the router),
  // and in build 86's first walk the Canon's recorder, still running, wrote
  // the Canon's last frames into the Anthem's list as its first.
  const chantLabels = { share: en["common.share"], back: en["nav.back"], play: en["prayers.play"] };
  const watchChant = (at) =>
    page.evaluate(({ labels, at }) => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map((v) => Math.round(v)).join(",");
      };
      const seen = () => {
        const bar = document.querySelector("[data-mobile-topbar]");
        const named = (label) => (bar ? ([...bar.querySelectorAll("button, a")].find((b) => b.getAttribute("aria-label") === label) ?? null) : null);
        const q = (s) => document.querySelector(`[data-route-content] ${s}`);
        return {
          back: box(named(labels.back)),
          share: box(named(labels.share)),
          icon: box(q("header [data-cover]")),
          name: box(q('[data-chant-control="name"]')),
          doors: box(q('[data-chant-control="doors"]')),
          switch: box(q('[data-chant-control="words-view"]')),
          words: box(q("[data-sung-look=page]")),
          dock: box(q('[data-chant-control="dock"]')),
          play: box(q(`[data-chant-control="dock"] button[aria-label="${labels.play}"]`)),
        };
      };
      window.__chantSeen = seen;
      const frames = (window.__chantFrames = []);
      const watch = (window.__chantWatch = (window.__chantWatch ?? 0) + 1);
      let n = 0;
      const tick = () => {
        if (window.__chantWatch !== watch) return;
        const here = location.pathname.replace(/\/$/, "") === at;
        if (here && document.querySelectorAll('[data-route-content] [data-chant-control="doors"]').length === 1) frames.push(seen());
        if (++n < 300) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { labels: chantLabels, at });
  const chantNow = () => page.evaluate(() => (window.__chantSeen ? window.__chantSeen() : null));
  const moved = (a, b, keys = Object.keys(a)) => keys.filter((k) => a[k] !== b[k]).map((k) => `${k} ${a[k]} to ${b[k]}`);
  const chantFoot = () =>
    page.evaluate(() => {
      const dock = document.querySelector('[data-route-content] [data-chant-control="dock"]')?.getBoundingClientRect();
      const tabs = document.querySelector("[data-tab-bar] > div")?.getBoundingClientRect();
      const mini = document.querySelector("[data-mini-player]");
      return {
        dock: dock ? { top: Math.round(dock.top), bottom: Math.round(dock.bottom) } : null,
        tabs: tabs ? Math.round(tabs.top) : null,
        mini: Boolean(mini),
        height: innerHeight,
        scrolls: document.documentElement.scrollHeight - innerHeight,
      };
    });

  // Psalm 135, opened from Chants: the first frame and every one after.
  await watchChant("/chants/psalm-135");
  await go(page, "/chants/psalm-135/");
  await page.waitForTimeout(2500);
  const psalmFrames = await page.evaluate(() => window.__chantFrames ?? []);
  const firstFrame = psalmFrames[0];
  must(Boolean(firstFrame && firstFrame.doors && firstFrame.dock && firstFrame.share), `Psalm 135 draws its controls in its first frame (${psalmFrames.length} frames: ${firstFrame ? Object.keys(firstFrame).filter((k) => firstFrame[k]).join(", ") : "none"})`);
  if (firstFrame) {
    const changed = moved(firstFrame, psalmFrames.at(-1));
    must(changed.length === 0, `and nothing moves after it, the list of recordings and the icon answered (${changed.join("; ") || `${psalmFrames.length} frames, every box held`})`);
  }
  const psalmFoot = await chantFoot();
  must(
    Boolean(psalmFoot.dock) && psalmFoot.dock.top >= 0 && (psalmFoot.tabs === null || psalmFoot.dock.bottom <= psalmFoot.tabs),
    `the player is docked over the tab bar, never under it (dock ${psalmFoot.dock ? `${psalmFoot.dock.top} to ${psalmFoot.dock.bottom}` : "none"}, tab bar from ${psalmFoot.tabs ?? "none"})`,
  );
  must(psalmFoot.scrolls <= 1, `with Words open the page is the screen: only the words scroll (${psalmFoot.scrolls}px past it)`);
  const psalm = await page.evaluate((play) => ({
    title: document.querySelector("[data-route-content] h1")?.textContent?.trim() ?? "",
    tabs: [...document.querySelectorAll("[data-route-content] [role=tab]")].map((t) => (t.textContent ?? "").trim()),
    parts: [...document.querySelectorAll('[data-route-content] [data-chant-control="words-view"] [role=radio]')].map((r) => `${(r.textContent ?? "").trim()}${r.disabled ? " (grey)" : ""}`),
    dock: document.querySelector('[data-route-content] [data-chant-control="dock"]')?.innerText ?? "",
    play: document.querySelector(`[data-route-content] [data-chant-control="dock"] button[aria-label="${play}"]`)?.disabled ?? null,
  }), en["prayers.play"]);
  must(psalm.title === en["chants.item.psalm135.title"], `the page is named on the icon (${psalm.title})`);
  must(psalm.tabs.join("|") === [en["chants.tab.words"], en["chants.tab.about"], en["chants.tab.versions"]].join("|"), `with the doors Words, About and Versions (${psalm.tabs.join(", ")})`);
  must(psalm.parts.join("|") === `English|${en["chants.words.translit"]} (grey)|${en["chants.words.both"]} (grey)`, `the switch on the English words, its sound and both greyed, never taken away (${psalm.parts.join(", ")})`);
  must(psalm.play === true && psalm.dock.includes(en["chants.needsConnection"]), `and Play waits in the dock for a connection, saying so (${psalm.dock.replace(/\s+/g, " ").trim()})`);
  // Note 78: the lines drawn are the lines the app's own timing file times,
  // read from the bundle with no signal.
  const drawnLines = await page.evaluate(() => document.querySelectorAll("[data-route-content] [data-sung-look=page] ol > li").length);
  let timedLines = null;
  try {
    timedLines = JSON.parse(fs.readFileSync(path.join(OUT, "chant-timing", "psalm-135", "en.json"), "utf8")).lines.length;
  } catch {}
  must(timedLines !== null && drawnLines === timedLines, `its English words drawn are the lines its bundled timing times (${drawnLines} drawn, ${timedLines ?? "no file"} timed)`);
  await page.screenshot({ path: path.join(SHOTS, "chants-psalm-135-phone.png") });

  // Each of its four versions, chosen in Versions: the words take the English's
  // place, and nothing else moves (note 61: choosing Ελληνικά moved Share 43px).
  for (const [label, sound] of [["العربية", true], ["Ελληνικά", true], ["Srpski", false], ["English", false]]) {
    await page.getByRole("tab", { name: en["chants.tab.versions"] }).tap().catch(() => {});
    await page.waitForTimeout(400);
    await tap(page.locator("[data-route-content] #chant-panel-versions li button[aria-pressed]", { hasText: label }).first());
    await page.waitForTimeout(700);
    const now = await chantNow();
    const parts = await page.evaluate(() => [...document.querySelectorAll('[data-route-content] [data-chant-control="words-view"] [role=radio]')].map((r) => r.disabled));
    const door = await page.evaluate(() => location.hash);
    const changed = now && firstFrame ? moved(firstFrame, now, ["back", "share", "icon", "doors", "switch", "words", "dock", "play"]) : ["nothing measured"];
    must(door === "" && changed.length === 0, `${label}: back on Words with every control where it was (${changed.join("; ") || "held"})`);
    must(parts.length === 3 && parts[1] === !sound && parts[2] === !sound, `${label}: its sound and both ${sound ? "offered" : "greyed"} (${parts.join(", ")})`);
  }

  // About, kept in the address, and the way back out.
  await page.getByRole("tab", { name: en["chants.tab.about"] }).tap().catch(() => {});
  await page.waitForTimeout(600);
  const about = await page.evaluate(() => ({ hash: location.hash, text: document.querySelector("[data-route-content] #chant-panel-about")?.innerText ?? "" }));
  must(about.hash === "#about", `About is kept in the address, so Back finds it (${about.hash || "no #"})`);
  must(
    about.text.includes(en["chants.about.what"]) && about.text.includes(en["chants.about.history"]) && about.text.includes(en["chants.about.when"]),
    "About says what it is, where it comes from and when it is sung",
  );
  await page.screenshot({ path: path.join(SHOTS, "chants-psalm-135-about-phone.png") });
  await tap(page.locator(`[data-mobile-topbar] button[aria-label="${en["nav.back"]}"]`).first());
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/chants", null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(150);
  const back = await page.evaluate(() => ({
    at: location.pathname,
    cover: (() => {
      const img = document.querySelector("[data-route-content] section[aria-labelledby=chants-featured] [data-cover] img");
      return img ? { whole: img.complete && img.naturalWidth > 0, shown: getComputedStyle(img).opacity } : null;
    })(),
  }));
  must(back.at.replace(/\/$/, "") === "/chants", `Back leaves the page for Chants in one step, through no door (${back.at})`);
  must(!back.cover || (back.cover.whole && back.cover.shown === "1"), `and Chants comes back whole, its cover drawn at once (${back.cover ? `${back.cover.whole ? "whole" : "not yet"}, opacity ${back.cover.shown}` : "no picture"})`);

  // The Paschal Canon: one version, no switch, its hymns lit at their own size.
  await watchChant("/chants/paschal-canon");
  await go(page, "/chants/paschal-canon/");
  await page.waitForTimeout(2000);
  const canonFrames = await page.evaluate(() => window.__chantFrames ?? []);
  const canon = await page.evaluate(() => ({
    title: document.querySelector("[data-route-content] h1")?.textContent?.trim() ?? "",
    switch: Boolean(document.querySelector('[data-route-content] [data-chant-control="words-view"]')),
    long: document.querySelectorAll("[data-route-content] [data-sung-look=page] li[data-sung-long]").length,
  }));
  must(canon.title === en["chants.item.paschalCanon.title"] && !canon.switch, `the Paschal Canon: named, and no switch for words it has only in English (${canon.title})`);
  must(canon.long > 0, `its long hymns marked to light at their own size (${canon.long})`);
  if (canonFrames[0]) {
    const changed = moved(canonFrames[0], canonFrames.at(-1));
    must(changed.length === 0, `and nothing moves after its first frame (${changed.join("; ") || "held"})`);
  }
  const canonFoot = await chantFoot();
  must(Boolean(canonFoot.dock) && (canonFoot.tabs === null || canonFoot.dock.bottom <= canonFoot.tabs), `its player over the tab bar (${canonFoot.dock ? canonFoot.dock.bottom : "none"} over ${canonFoot.tabs ?? "none"})`);
  await page.screenshot({ path: path.join(SHOTS, "chants-canon-phone.png") });

  // The Anthem's page: its name, the words on the page with no signal, its
  // three versions in Versions, each naming who sings it or that nobody is known.
  await watchChant("/chants/prayer-rope-anthem");
  await go(page, "/chants/prayer-rope-anthem/");
  await page.waitForTimeout(2000);
  const anthemFrames = await page.evaluate(() => window.__chantFrames ?? []);
  const anthem = await page.evaluate(() => ({
    title: document.querySelector("[data-route-content] h1")?.textContent?.trim() ?? "",
    lines: document.querySelectorAll("[data-route-content] [data-sung-look=page] ol > li").length,
    versions: [...document.querySelectorAll("[data-route-content] #chant-panel-versions li")].map((li) => (li.innerText ?? "").replace(/\s+/g, " ").trim()),
  }));
  must(anthem.title === en["chants.item.prayerRopeAnthem.title"], `the Anthem's page is named (${anthem.title})`);
  must(anthem.lines === 24, `the English words on the page, all 24 lines, with no signal (${anthem.lines})`);
  must(anthem.versions.length === 3 && anthem.versions.every((v) => v.includes(en["chants.performerUnknown"])), `three versions, each saying no singer is known, none invented (${anthem.versions.length})`);
  if (anthemFrames[0]) {
    const changed = moved(anthemFrames[0], anthemFrames.at(-1));
    must(changed.length === 0, `and nothing moves after its first frame (${changed.join("; ") || "held"})`);
  }
  await page.screenshot({ path: path.join(SHOTS, "chants-anthem-phone.png") });
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 35. The read-aloud covers and the ambience sheet (1.7).
// The owner's notes 9 and 25 of 2026-10-16 (Homebase/boards/purify-master/
// r17/BRAINSTORM.md): an icon of the book's saint on the read-aloud cover,
// for every book, and ambience out of the reader's settings into a sound
// button by the chapter pager that opens a sheet of its own. From 1.8 the
// pill ends in Listen, with the sound button just before it (the owner's
// pick B of round 2, "The page"; section 33). The covers stay
// on the website (lib/media/streamed.ts), and this walk has no network, so it
// is also the app with no signal: Now Playing must show the bundled plate in
// the cover's place, never a broken picture. lib/readAloud/__tests__/
// covers.test.ts holds the map and the files.
//
// From 1.9 the apps carry a short list of covers as well as the website
// (lib/media/carriedCovers.json, lib/media/__tests__/carried.test.ts): note
// 3's pictures, the seven councils' portraits and the five read-aloud covers
// new in 1.9 (his yes of 2026-11-10). Exactly that list ships, each JPEG with
// its AVIF, the five read-aloud covers as the JPEG alone (the player offers
// no AVIF), and nothing else under /covers/; every other cover is still the
// website's.
//
// From 1.8's second round (the owner's "add everything we left out" of
// 2026-10-28), the player's controls round 8 A drew and the first build left
// out: previous and next (the chapters either side that have a recording),
// Speed (the reader's own, kept on the device, and never on a chant), Read
// (the text being played) and ••• (Save for offline, the sleep timer,
// Ambience and Share). lib/player/__tests__/steps.test.ts and speed.test.ts
// hold the rules; a chant cannot play in this walk, which has no network.
await section(35, async () => {
  console.log("\n35. The read-aloud covers and the ambience sheet");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const carriedJson = JSON.parse(fs.readFileSync(path.resolve("lib/media/carriedCovers.json"), "utf8"));
  const carriedList = [...carriedJson.covers.flatMap((jpg) => [jpg, jpg.replace(/\.jpg$/, ".avif")]), ...carriedJson.jpegOnly].sort();
  const shippedCovers = [];
  const listCovers = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) listCovers(path.join(dir, e.name), `${rel}/${e.name}`);
      else shippedCovers.push(`${rel}/${e.name}`);
    }
  };
  if (fs.existsSync(path.join(OUT, "covers"))) listCovers(path.join(OUT, "covers"), "/covers");
  const moreCovers = shippedCovers.filter((f) => !carriedList.includes(f));
  const missingCovers = carriedList.filter((f) => !shippedCovers.includes(f));
  must(
    moreCovers.length === 0 && missingCovers.length === 0,
    `exactly the carried covers ship inside the app, ${carriedList.length} files, and every other cover stays on the website ` +
      `(${moreCovers.length ? `more: ${moreCovers.slice(0, 3).join(", ")}` : "none more"}; ${missingCovers.length ? `missing: ${missingCovers.slice(0, 3).join(", ")}` : "none missing"})`,
  );
  must(fs.existsSync(path.join(OUT, "sections", "bible.jpg")), "and the plate a cover falls back to does");

  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/bible/john/1/");
  await page.waitForFunction(() => document.getElementById("chapter-title")?.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() === "John Chapter 1", null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // The sound button, on the chapter pill after the arrows, just before Listen at its end.
  const button = await page.evaluate((name) => {
    const pill = document.querySelector("[aria-label='Chapter switcher']");
    if (!pill) return null;
    const controls = [...pill.querySelectorAll("a, button")];
    const b = controls.find((x) => x.getAttribute("aria-label") === name);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const next = controls[controls.indexOf(b) + 1];
    return { width: Math.round(r.width), height: Math.round(r.height), beforeListen: Boolean(next && next.hasAttribute("data-read-aloud-play") && next === controls[controls.length - 1]), popup: b.getAttribute("aria-haspopup") };
  }, en["ambience.title"]);
  must(Boolean(button) && button.beforeListen && button.height >= 40 && button.popup === "dialog", `the sound button is on the chapter pill, just before Listen at its end (${button ? `${button.width}x${button.height}, before Listen ${button.beforeListen}` : "none"})`);

  // It opens the ambience sheet: the three sounds as large tiles.
  await page.locator(`[aria-label='Chapter switcher'] button[aria-label="${en["ambience.title"]}"]`).first().tap().catch(() => {});
  await page.waitForFunction((t) => [...document.querySelectorAll("[role=dialog]")].some((d) => d.getAttribute("aria-label") === t), en["ambience.title"], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  const sheet = await page.evaluate((t) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === t);
    if (!d) return null;
    return [...d.querySelectorAll("button[aria-pressed]")].map((b) => ({ text: (b.textContent ?? "").trim(), h: Math.round(b.getBoundingClientRect().height) }));
  }, en["ambience.title"]);
  const sounds = [en["ambience.rain"], en["ambience.birds"], en["ambience.bell"]];
  must(Boolean(sheet) && sounds.every((n) => sheet.some((t) => t.text.startsWith(n) && t.h >= 100)), `the ambience sheet shows the three sounds as large tiles (${sheet ? sheet.map((t) => `${t.text} ${t.h}px`).join(", ") : "no sheet"})`);
  await page.screenshot({ path: path.join(SHOTS, "ambience-sheet-390.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  // The reader's settings, the first row of ••• (the owner's pick B of
  // 2026-10-28): one Ambience row, and the sounds no longer there.
  await page.getByRole("button", { name: en["bible.moreActions"] }).first().tap().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator("[role=dialog] button", { hasText: en["bible.readerSettings"] }).first().tap().catch(() => {});
  await page.waitForTimeout(900);
  const settings = await page.evaluate((w) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === w.title);
    if (!d) return null;
    const texts = [...d.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim());
    return { row: texts.filter((t) => t.startsWith(w.ambience)).length, sounds: texts.filter((t) => t === w.rain || t === w.birds || t === w.bell).length };
  }, { title: en["bible.readerSettings"], ambience: en["ambience.title"], rain: en["ambience.rain"], birds: en["ambience.birds"], bell: en["ambience.bell"] });
  must(Boolean(settings) && settings.row === 1 && settings.sounds === 0, `the reader's settings hold one Ambience row and no sound buttons (${settings ? `${settings.row} row, ${settings.sounds} sounds` : "no sheet"})`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  // Listen with no signal: the cover is the bundled plate, and St John is named under the title.
  await page.getByRole("button", { name: en["readAloud.listen"] }).first().tap().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: new RegExp(`^${en["prayers.nowPlaying"]}`) }).first().tap().catch(() => {});
  await page.waitForTimeout(1500);
  const cover = await page.evaluate((t) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === t);
    if (!d) return null;
    const img = [...d.querySelectorAll("img")].find((i) => {
      const r = i.getBoundingClientRect();
      return r.width >= 200 && r.width <= 400;
    });
    return { src: img ? img.currentSrc || img.src : null, ok: Boolean(img && img.complete && img.naturalWidth > 0), text: d.textContent ?? "" };
  }, en["prayers.nowPlaying"]);
  must(Boolean(cover) && cover.ok && /\/sections\/bible\.jpg$/.test(cover.src ?? ""), `with no signal, Now Playing shows the plate in the cover's place (${cover ? cover.src : "no Now Playing"})`);
  must(Boolean(cover) && cover.text.includes(en["readAloud.cover.john"]), `and names ${en["readAloud.cover.john"]} under the title`);
  await page.screenshot({ path: path.join(SHOTS, "now-playing-cover-offline-390.png") });

  // The player's controls, as round 8 A drew them.
  const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), s);
  const NP = `[role=dialog][aria-label="${en["prayers.nowPlaying"]}"]`;
  const player = () =>
    page.evaluate((w) => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === w.np);
      if (!d) return null;
      const labels = [...d.querySelectorAll("button, a")].map((b) => b.getAttribute("aria-label") ?? "");
      const read = [...d.querySelectorAll("a")].find((a) => (a.getAttribute("aria-label") ?? "").startsWith(`${w.read}: `));
      const play = [...d.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === w.pause || b.getAttribute("aria-label") === w.play);
      const ends = (name) => {
        const b = [...d.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === name);
        return b ? b.getBoundingClientRect() : null;
      };
      const prev = ends(w.previous);
      const next = ends(w.next);
      const p = play?.getBoundingClientRect();
      return {
        title: d.querySelector("h2")?.textContent?.trim() ?? "",
        labels,
        speed: labels.find((l) => l.startsWith(`${w.speed}: `)) ?? null,
        read: read ? read.getAttribute("href") : null,
        more: labels.includes(w.more),
        // Previous and next at the two ends of the controls, Play between them.
        row: prev && next && p ? { prev: Math.round(prev.left), play: Math.round((p.left + p.right) / 2), next: Math.round(next.right), vw: innerWidth, sameLine: Math.abs(prev.top + prev.height / 2 - (p.top + p.height / 2)) < 2 } : null,
      };
    }, w);
  const w = {
    np: en["prayers.nowPlaying"],
    read: en["player.read"],
    speed: en["player.speed"],
    more: en["bible.moreActions"],
    play: en["prayers.play"],
    pause: en["prayers.pause"],
    previous: fill(en["bible.previousTargetAria"], { book: "Luke", chapter: 24 }),
    next: fill(en["bible.nextTargetAria"], { book: "John", chapter: 2 }),
  };
  const before = await player();
  must(Boolean(before) && before.labels.includes(w.previous) && before.labels.includes(w.next), `previous and next step to the chapters either side that have a recording (${before ? before.labels.filter((l) => /:/.test(l)).join(", ") : "no Now Playing"})`);
  must(Boolean(before?.row) && before.row.sameLine && before.row.prev < before.row.play && before.row.play < before.row.next && Math.abs(before.row.play - before.row.vw / 2) <= 2, `at the two ends of the controls, Play in the middle (${before?.row ? `${before.row.prev}, ${before.row.play}, ${before.row.next} of ${before.row.vw}` : "not drawn"})`);
  must(before?.speed === `${w.speed}: 1×`, `Speed is among the choices, at 1 until the reader chooses (${before?.speed ?? "no Speed"})`);
  must(Boolean(before?.read) && /^\/bible\/john\/1\/?(#v\d+)?$/.test(before.read), `Read opens the chapter being read (${before?.read ?? "no Read"})`);
  must(Boolean(before?.more), "••• stands in the top bar");
  await page.screenshot({ path: path.join(SHOTS, "now-playing-controls-390.png") });

  // Speed goes up a step at a tap, and is kept on the device.
  await tap(page.locator(`${NP} button[aria-label^="${w.speed}: "]`).first());
  await page.waitForTimeout(400);
  const faster = await player();
  const kept = await page.evaluate(() => window.localStorage.getItem("purify:player.speed"));
  must(faster?.speed === `${w.speed}: 1.25×` && kept === "1.25", `a tap on Speed reads at 1.25, kept on the device (${faster?.speed ?? "no Speed"}, stored ${kept})`);

  // ••• holds Save for offline, the sleep timer, Ambience and Share.
  await tap(page.locator(`${NP} button[aria-label="${w.more}"]`).first());
  await page.waitForTimeout(900);
  const menu = await page.evaluate((title) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === title);
    return d ? [...d.querySelectorAll("button")].map((b) => (b.innerText ?? "").replace(/\s+/g, " ").trim()).filter(Boolean) : null;
  }, "John 1");
  const rows = [fill(en["player.offline.save"], { book: "John" }), en["player.sleep"], en["ambience.title"], en["common.share"]];
  must(Boolean(menu) && rows.every((r) => menu.some((t) => t.startsWith(r))), `••• opens a sheet over the player: Save for offline, the sleep timer, Ambience and Share (${menu ? menu.join(" | ") : "no sheet"})`);
  await page.screenshot({ path: path.join(SHOTS, "now-playing-more-390.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  must(Boolean(await player()), "Escape puts ••• away and leaves the player open");

  // Next: John 2, at the reader's speed, and from there back to John 1.
  await tap(page.locator(`${NP} button[aria-label="${w.next}"]`).first());
  await page.waitForFunction((np) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === np);
    return d?.querySelector("h2")?.textContent?.trim() === "John 2";
  }, w.np, { timeout: 8000 }).catch(() => {});
  const two = await player();
  must(two?.title === "John 2" && two.speed === `${w.speed}: 1.25×` && two.labels.includes(fill(en["bible.previousTargetAria"], { book: "John", chapter: 1 })), `next plays John 2, at the speed kept (${two ? `${two.title}, ${two.speed}` : "no Now Playing"})`);

  // Read: the player goes, and the chapter being read opens.
  await tap(page.locator(`${NP} a[aria-label^="${w.read}: "]`).first());
  await page.waitForFunction(() => location.pathname === "/bible/john/2/", null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  const after = await page.evaluate((np) => ({ path: location.pathname, open: [...document.querySelectorAll("[role=dialog]")].some((x) => x.getAttribute("aria-label") === np) }), w.np);
  must(after.path === "/bible/john/2/" && !after.open, `Read closes the player and opens John 2 (${after.path}${after.open ? ", the player still open" : ""})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 36. A saint on a phone (1.7, and its doors and web of 1.8).
// The owner's note 19 of 2026-10-16: a saint's page "reads like the desktop
// page shrunk". Now his icon is at the top (full width where a sharp picture
// of him is on the website; this walk has no network, so the bundled icon
// stands in the same box), his name with one line under it, one row with the
// request as a clear pill, then, from 1.8 (round 3b D, "Fade and doors"), the
// doors to his Life, Writings, Web and Hymns, only those he has, and the
// page's own bar, whose name arrives once his has scrolled away. The Web door
// opens the saint web: one screen, a Web / Timeline switch in its bar.
// lib/saints/__tests__/saintPage.test.ts reads the source; this is how the
// built app draws it.
await section(36, async () => {
  console.log("\n36. A saint on a phone");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const GLYPHS = [0x2192, 0x2713, 0x2020, 0x25b3, 0x25b2].map((c) => String.fromCharCode(c));
  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/saints/john-chrysostom/");
    await page.waitForFunction(() => !!document.querySelector("h1#saint-name"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const top = await page.evaluate((labels) => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const bars = document.querySelectorAll("[data-mobile-topbar]");
      const bar = bars[0];
      const hero = document.querySelector("[data-saint-hero]");
      const h1 = document.querySelector("h1#saint-name");
      const pill = [...document.querySelectorAll("a, button")].find((b) => (b.textContent ?? "").trim() === labels.ask);
      const title = bar?.querySelector("[data-topbar-title]");
      const group = [...document.querySelectorAll("[role=group]")].find((g) => g.getAttribute("aria-label") === labels.doors);
      const tabs = group ? [...group.children].map((t) => (t.textContent ?? "").trim()) : [];
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      return {
        bars: bars.length,
        backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
        overlay: bar?.hasAttribute("data-overlay") ?? false,
        hero: hero ? { kind: hero.getAttribute("data-saint-hero"), left: Math.round(r(hero).left), right: Math.round(r(hero).right), top: Math.round(r(hero).top) } : null,
        vw,
        h1: h1 ? Math.round(r(h1).bottom) : null,
        pill: pill ? Math.round(r(pill).bottom) : null,
        vh,
        title: title ? getComputedStyle(title).opacity : null,
        tabs,
        h1s: document.querySelectorAll("h1").length,
      };
    }, { ask: en["saints.ask.label"], doors: en["saints.sectionSwitcher"] });
    must(top.bars === 1 && !top.backBar, `${size.width}px: one bar, the page's own (${top.bars} bar${top.bars === 1 ? "" : "s"}${top.backBar ? ", and the back bar" : ""})`);
    must(top.overlay && Boolean(top.hero) && top.hero.kind === "picture" && top.hero.left === 0 && top.hero.right === top.vw && top.hero.top <= 0, `${size.width}px: the picture spans the screen from its top, under the clear bar (${top.hero ? `${top.hero.left}..${top.hero.right} of ${top.vw}, top ${top.hero.top}` : "no picture"})`);
    must(top.h1s === 1 && top.h1 !== null && top.h1 < top.vh && top.pill !== null && top.pill < top.vh, `${size.width}px: the name and the pill are on the first screen, and the name is the one heading (name ends ${top.h1}, pill ends ${top.pill}, of ${top.vh})`);
    must(top.title === "0", `${size.width}px: the bar keeps its name back at the top (opacity ${top.title})`);
    must(top.tabs.join(",") === [en["saints.tab.life"], en["saints.writings"], en["saints.door.web"]].join(","), `${size.width}px: St John Chrysostom has three doors, Life, Writings and Web (${top.tabs.join(", ") || "no doors"})`);
    await page.screenshot({ path: path.join(SHOTS, `saint-top-${size.width}.png`) });

    // Past the name, the bar is solid with it.
    await page.evaluate(() => window.scrollBy(0, document.querySelector("h1#saint-name").getBoundingClientRect().bottom + 40));
    await page.waitForTimeout(700);
    const scrolled = await page.evaluate(() => {
      const bar = document.querySelector("[data-mobile-topbar]");
      return { revealed: bar?.hasAttribute("data-revealed") ?? false, title: getComputedStyle(bar.querySelector("[data-topbar-title]")).opacity };
    });
    must(scrolled.revealed && scrolled.title === "1", `${size.width}px: once the name has scrolled away the bar shows it (revealed ${scrolled.revealed}, opacity ${scrolled.title})`);
    await page.screenshot({ path: path.join(SHOTS, `saint-scrolled-${size.width}.png`) });

    // Writings: the cover rows, and the Life put away.
    await tap(page.locator("#saint-door-writings"));
    await page.waitForTimeout(800);
    const writings = await page.evaluate(() => {
      const panel = document.querySelector("#saint-panel-writings");
      const life = document.querySelector("#saint-panel-life");
      const rows = panel ? [...panel.querySelectorAll("a[href^='/saints/john-chrysostom/']")].filter((a) => a.getClientRects().length > 0) : [];
      return { rows: rows.length, lifeHidden: life ? life.hidden : null, hash: location.hash };
    });
    must(writings.rows === 19 && writings.lifeHidden === true && writings.hash === "#writings", `${size.width}px: Writings shows the nineteen works as rows and puts the Life away (${writings.rows} rows, Life hidden ${writings.lifeHidden}, ${writings.hash || "no #"})`);
    await page.screenshot({ path: path.join(SHOTS, `saint-writings-${size.width}.png`) });
    const text = await page.evaluate(() => document.body.innerText);
    const drawn = GLYPHS.filter((g) => text.includes(g));
    must(drawn.length === 0, `${size.width}px: no arrow, check, dagger or triangle set as a character${drawn.length ? ": " + drawn.join(" ") : ""}`);

    // A work, and back: Writings is still open, the row where the thumb left it.
    const link = page.locator("#saint-panel-writings a[href^='/saints/john-chrysostom/']").nth(6);
    // In the middle of the screen, clear of the bar and the pinned switch.
    await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(400);
    const href = await link.getAttribute("href");
    const before = await link.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    await tap(link);
    await page.waitForTimeout(2200);
    const away = await page.evaluate(() => location.pathname);
    await page.goBack();
    await page.waitForTimeout(2200);
    const back = await page.evaluate((h) => {
      const el = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === h && a.getClientRects().length > 0);
      return { path: location.pathname, hash: location.hash, top: el ? Math.round(el.getBoundingClientRect().top) : null };
    }, href);
    must(away !== back.path && back.hash === "#writings" && back.top !== null && Math.abs(back.top - before) <= 40, `${size.width}px: back from a work, Writings is open and the work is where it was (${back.top}px from the top, was ${before}px; ${back.path}${back.hash})`);
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A saint with his life alone: no doors, his icon at its own size, the bar solid.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/saints/sava-of-serbia/");
    await page.waitForFunction(() => !!document.querySelector("h1#saint-name"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const lone = await page.evaluate(() => {
      const img = document.querySelector("[data-saint-hero='plate'] img");
      return {
        tabs: document.querySelectorAll("[id^='saint-door-']").length,
        plate: img ? { h: Math.round(img.getBoundingClientRect().height), natural: img.naturalHeight } : null,
        overlay: document.querySelector("[data-mobile-topbar]")?.hasAttribute("data-overlay") ?? null,
      };
    });
    must(lone.tabs === 0, `a saint with his life alone has no doors (${lone.tabs})`);
    must(Boolean(lone.plate) && lone.plate.h <= 260 && lone.overlay === false, `and his icon stands at its own size on the plate under a solid bar (${lone.plate ? `${lone.plate.h}px tall, ${lone.plate.natural}px in the file` : "no icon"})`);
    await page.screenshot({ path: path.join(SHOTS, "saint-life-only-390.png") });
    await ctx.close();
  }

  // The request's "i" opens the sheet the owner liked, inside the screen.
  {
    const { ctx, page } = await open({ width: 360, height: 740, phone: true });
    await go(page, "/saints/anthony-the-great/");
    await page.waitForFunction(() => !!document.querySelector("[data-saint-explainer]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const parts = await page.evaluate(() => ({
      doors: [...document.querySelectorAll("[id^='saint-door-']")].map((t) => (t.textContent ?? "").trim()),
      miracles: !!document.querySelector("#saint-panel-life #miracles h2"),
    }));
    must(!parts.doors.includes(en["saints.miracles"]) && parts.miracles, `St Anthony's Miracles are at the end of his Life, not a door (${parts.doors.join(", ")}; in the Life: ${parts.miracles})`);
    await tap(page.locator("[data-saint-explainer]").first());
    await page.waitForTimeout(900);
    const sheet = await page.evaluate((title) => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === title);
      return d ? (d.textContent ?? "").includes("editorial") : null;
    }, en["saints.bump.whatRequesting"]);
    must(sheet === true, `the round i opens what asking does, in the same sheet (${sheet === null ? "no sheet" : "its words there"})`);
    await ctx.close();
  }

  // The saint web (1.8, round 1 A and B): the Web door opens it, one screen
  // with a Web / Timeline switch in the bar, the same people both ways.
  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/saints/john-chrysostom/");
    await page.waitForFunction(() => !!document.querySelector("h1#saint-name"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    await tap(page.locator("a[href$='/saints/john-chrysostom/web'], a[href$='/saints/john-chrysostom/web/']").first());
    await page.waitForFunction(() => location.pathname.replace(/\/$/, "").endsWith("/web"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const web = await page.evaluate(() => {
      const bar = document.querySelector("[data-mobile-topbar]");
      const views = bar ? [...bar.querySelectorAll("[role=tablist] [role=tab]")].map((t) => (t.textContent ?? "").trim()) : [];
      const nodes = [...document.querySelectorAll("[data-saint-web-canvas] button[aria-pressed]")];
      const sheet = document.querySelector(".saint-web-sheet");
      return {
        path: location.pathname,
        views,
        nodes: nodes.length,
        sheet: sheet ? Math.round(sheet.getBoundingClientRect().bottom) : null,
        vh: window.innerHeight,
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    must(web.views.join(",") === [en["saints.door.web"], en["saints.web.timeline"]].join(","), `${size.width}px: the Web door opens the saint web, its switch in the bar (${web.path}; ${web.views.join(", ") || "no switch"})`);
    must(web.nodes >= 9 && web.sheet !== null && web.sheet <= web.vh, `${size.width}px: St John's web has its nine saints and the sheet on the screen (${web.nodes} nodes, sheet ends ${web.sheet} of ${web.vh})`);
    must(web.wide <= 0, `${size.width}px: the web is no wider than the phone (${web.wide}px over)`);
    await page.screenshot({ path: path.join(SHOTS, `saint-web-${size.width}.png`) });
    await tap(page.locator("[data-mobile-topbar] [role=tab]").nth(1));
    await page.waitForTimeout(700);
    const line = await page.evaluate(() => ({
      hash: location.hash,
      rows: document.querySelectorAll("#saint-web-view ol > li").length,
      people: document.querySelectorAll("#saint-web-view a[href^='/saints/']").length,
    }));
    must(line.hash === "#timeline" && line.rows > 3 && line.people >= 9, `${size.width}px: Timeline is his life year by year with the same people (${line.hash || "no #"}, ${line.rows} moments, ${line.people} saints)`);
    await page.screenshot({ path: path.join(SHOTS, `saint-web-timeline-${size.width}.png`) });
    must(errors.length === 0, `${size.width}px: no page errors on the web${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 37. Your first Liturgy (1.7).
// The owner's note 27 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md, with "Added to 27" and his answers): a guide for an inquirer
// going to a first Divine Liturgy, one card at a time. It asks whether they
// are going and what kind of church it is (a pick, never a search), walks
// before, arriving, during and after, then that kind of parish's customs, and
// ends on a checklist the reader keeps. A reminder waits on Today that week.
// Everything is on the device. lib/start/__tests__/firstLiturgy.test.ts holds
// the words; this walks the built app with no network.
await section(37, async () => {
  console.log("\n37. Your first Liturgy");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const el = { ...en, ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/el.json"), "utf8")) };
  const GLYPHS = [0x2192, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x2014].map((c) => String.fromCharCode(c));
  must(inBundle(OUT, "/start/first-liturgy/"), "the guide is in the bundle");
  const heading = (page) => page.evaluate(() => document.querySelector("#liturgy-step-title")?.textContent?.trim() ?? "");
  // The footer's Next names the card it opens: "Next: Before you go".
  const next = async (page, partKey) => {
    await tap(page.locator("button", { hasText: en["start.liturgy.ui.nextTo"].replace("{part}", en[partKey]) }).first());
    await page.waitForTimeout(700);
  };
  const scale = (t) => Number(/scaleX\(([\d.]+)\)/.exec(t ?? "")?.[1] ?? NaN);

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/start/");
    await page.waitForFunction(() => !!document.querySelector('[data-route-content] a[href^="/start/first-liturgy"]'), null, { timeout: 20000 }).catch(() => {});
    await tap(page.locator('[data-route-content] a[href^="/start/first-liturgy"]').first());
    await page.waitForFunction((w) => document.querySelector("#liturgy-step-title")?.textContent?.trim() === w, en["start.liturgy.intro.title"], { timeout: 20000 }).catch(() => {});
    const intro = await page.evaluate(() => ({
      bars: document.querySelectorAll("[data-mobile-topbar]").length,
      backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
      title: document.querySelector("[data-mobile-topbar] h1")?.textContent?.trim() ?? "",
    }));
    must((await heading(page)) === en["start.liturgy.intro.title"], `${size.width}px: Start here's door opens the guide on its question`);
    must(intro.bars === 1 && !intro.backBar && intro.title === en["start.liturgy.title"], `${size.width}px: one bar, named ${intro.title || "nothing"}`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-intro-${size.width}.png`), fullPage: true });

    await tap(page.locator("button", { hasText: en["start.liturgy.intro.yes"] }).first());
    await page.waitForTimeout(700);
    const kinds = await page.evaluate(() => [...document.querySelectorAll("[role=radiogroup] [role=radio]")].map((r) => (r.textContent ?? "").trim()));
    must((await heading(page)) === en["start.liturgy.kind.title"] && kinds.length === 12, `${size.width}px: then which kind of church, from twelve (${kinds.length})`);
    must(!kinds.some((k) => /Assyrian|Coptic|Armenian|Oriental/.test(k)), `${size.width}px: no Church outside the Orthodox communion on the list`);
    const waits = await page.evaluate((label) => [...document.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === label)?.disabled ?? null, en["start.liturgy.ui.nextTo"].replace("{part}", en["start.liturgy.step.when"]));
    must(waits === true, `${size.width}px: Next waits for a choice`);
    await tap(page.getByRole("radio", { name: en["start.liturgy.kind.unsure.name"] }));
    await page.waitForTimeout(500);
    const unsure = await page.evaluate(() => document.querySelector("[data-route-content]")?.textContent ?? "");
    must(unsure.includes(en["start.liturgy.unsure.ask"]) && unsure.includes("Assyrian Church of the East"), `${size.width}px: Not sure gets the gentle note: ask which bishop, compare with the list`);
    await tap(page.getByRole("radio", { name: en["start.liturgy.kind.greek.name"] }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-kind-${size.width}.png`), fullPage: true });
    await next(page, "start.liturgy.step.when");

    must((await heading(page)) === en["start.liturgy.when.title"], `${size.width}px: then the day`);
    await tap(page.getByRole("radio").first());
    await page.waitForTimeout(400);
    await next(page, "start.liturgy.part.before.title");

    // Where the reader is, and the line that the scroll fills.
    const before = await page.evaluate(() => ({
      text: document.querySelector("[data-guide-progress]")?.textContent ?? "",
      fill: document.querySelector("[data-guide-progress] [style*='scaleX']")?.style.transform ?? "",
    }));
    must((await heading(page)) === en["start.liturgy.part.before.title"] && before.text.includes("3 of 8"), `${size.width}px: Before you go, 3 of 8 (${before.text.slice(0, 40)})`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => document.querySelector("[data-guide-progress] [style*='scaleX']")?.style.transform ?? "");
    must(scale(after) > scale(before.fill), `${size.width}px: the line fills as the card is read (${before.fill} to ${after})`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-before-${size.width}.png`), fullPage: true });
    await next(page, "start.liturgy.part.arrive.title");

    // A why: the Council's own words, in English, in the movable sheet.
    await tap(page.locator("button", { hasText: en["start.liturgy.ui.why"] }).nth(1));
    await page.waitForTimeout(900);
    const why = await page.evaluate((decree) => {
      const d = document.querySelector("[role=dialog]");
      return {
        title: d?.getAttribute("aria-label") ?? "",
        quote: [...(d?.querySelectorAll("blockquote[lang=en]") ?? [])].map((q) => q.textContent ?? "").join(" "),
        door: d?.querySelector(decree)?.getAttribute("href") ?? null,
      };
    }, linkTo("/councils/second-nicaea/the-decree-on-the-holy-icons"));
    const words = why.quote.includes("honour which is paid to the image passes on");
    must(why.title === en["start.liturgy.arrive.honour.title"] && words && Boolean(why.door), `${size.width}px: why people kiss icons opens the Seventh Council's words, and a door to its decree (${why.title || "no sheet"}; ${words ? "the words" : "not the words"}; ${why.door ?? "no door"})`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-why-${size.width}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);

    await next(page, "start.liturgy.part.during.title");
    must((await heading(page)) === en["start.liturgy.part.during.title"], `${size.width}px: During the Liturgy`);
    await next(page, "start.liturgy.part.after.title");
    await next(page, "start.liturgy.step.customs");
    const customs = await page.evaluate(() => document.querySelector("[data-route-content]")?.textContent ?? "");
    must((await heading(page)) === en["start.liturgy.kind.greek.see"] && customs.includes(en["start.liturgy.custom.pews"]), `${size.width}px: then what you may see in a Greek parish`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-customs-${size.width}.png`), fullPage: true });
    await next(page, "start.liturgy.ready.title");

    // The end: the plan, the checklist kept on the device, what next.
    must((await heading(page)) === en["start.liturgy.ready.title"], `${size.width}px: and ends ready`);
    const boxes = page.getByRole("checkbox");
    must((await boxes.count()) === 6, `${size.width}px: a checklist of six`);
    await tap(boxes.nth(1));
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("[role=checkbox]").length === 6, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const kept = await page.evaluate(() => ({
      on: [...document.querySelectorAll("[role=checkbox]")].map((b) => b.getAttribute("aria-checked")),
      text: document.querySelector("[data-route-content]")?.textContent ?? "",
    }));
    must(kept.on[1] === "true" && kept.text.includes("1 of 6 ready"), `${size.width}px: and keeps what was ticked after a reload (${kept.on.join(",")})`);
    const text = await page.evaluate(() => document.body.innerText);
    const drawn = GLYPHS.filter((g) => text.includes(g));
    must(drawn.length === 0, `${size.width}px: no arrow, check, dagger, triangle or em dash set as a character${drawn.length ? ": " + drawn.join(" ") : ""}`);
    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `${size.width}px: nothing wider than the phone${out.length ? ": " + out.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-ready-${size.width}.png`), fullPage: true });
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Today, that week: the reminder under the day's word, and the way back in.
  {
    const plan = { v: 1, going: true, kind: "greek", date: "2026-10-18", step: "ready", furthest: 8, done: true, checked: ["time"], hiddenFor: null };
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify:firstLiturgy": JSON.stringify(plan) } });
    await page.clock.setFixedTime(new Date("2026-10-14T10:30:00"));
    await go(page, "/");
    await page.waitForFunction(() => !!document.querySelector("#first-liturgy-reminder"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const card = await page.evaluate((guide) => {
      const c = document.querySelector("#first-liturgy-reminder")?.closest("section");
      const verse = document.querySelector('a[href*="/bible/"]');
      return {
        text: c?.textContent ?? "",
        door: c?.querySelector(guide)?.getAttribute("href") ?? null,
        afterVerse: !!(c && verse && verse.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    }, linkTo("/start/first-liturgy"));
    must(card.text.includes(en["start.liturgy.title"]) && card.text.includes(en["start.liturgy.kind.greek.name"]) && card.text.includes("1 of 6 ready") && Boolean(card.door), `on the Wednesday before, Today holds the reminder, and its door to the guide (${card.door ?? "no door"}): ${card.text.slice(0, 80)}`);
    must(card.afterVerse, "under the day's word, so the verse stays first");
    await page.screenshot({ path: path.join(SHOTS, "liturgy-today-reminder.png") });
    await tap(page.getByRole("button", { name: en["start.liturgy.today.hide"] }));
    await page.waitForTimeout(600);
    must(!(await page.evaluate(() => !!document.querySelector("#first-liturgy-reminder"))), "and the reader can put it away for that day");
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // Eleven days before, nothing.
    const plan = { v: 1, going: true, kind: "greek", date: "2026-10-25", step: "ready", furthest: 8, done: true, checked: [], hiddenFor: null };
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, set: { "purify:firstLiturgy": JSON.stringify(plan) } });
    await page.clock.setFixedTime(new Date("2026-10-14T10:30:00"));
    await go(page, "/");
    await page.waitForTimeout(3500);
    must(!(await page.evaluate(() => !!document.querySelector("#first-liturgy-reminder"))), "eleven days before, Today shows no reminder");
    await ctx.close();
  }

  // A phone set to Greek: the guide is in Greek.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    await go(page, "/start/first-liturgy/");
    await page.waitForFunction((w) => document.querySelector("#liturgy-step-title")?.textContent?.trim() === w, el["start.liturgy.intro.title"], { timeout: 20000 }).catch(() => {});
    must((await heading(page)) === el["start.liturgy.intro.title"], `in Greek: ${await heading(page)}`);
    await page.screenshot({ path: path.join(SHOTS, "liturgy-intro-el.png"), fullPage: true });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// ---- 38. The walkthroughs (1.7).
// The owner's note 24 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md): "good concept, but the execution feels vibe coded: the
// star, the animations, the custom drawings, the line". Built again on the
// app's own pieces: the walkthroughs and a book's page are calm phone pages
// with the book's own icon on its cover (the website's file, fetched by the
// apps; with no signal, as here, the cover is its plate with the walk's
// name), a chapter is its verses with each note's name under its verse, a
// note opens in the movable sheet and nothing rises by itself, the line under
// the bar fills as the chapter is read, and the chapter ends in three short
// steps and a quiet finish with the way on. lib/walkthroughs/__tests__/
// screens.test.ts reads the source; this walks the built app with no network.
await section(38, async () => {
  console.log("\n38. The walkthroughs");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const el = { ...en, ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/el.json"), "utf8")) };
  const TITLE = "Walking with Job";
  // The walk's row, as a link to its page in either way the address is written.
  const JOB = `[data-route-content] ${linkTo("/walkthroughs/job")}`;
  const GLYPHS = [0x2190, 0x2192, 0x2713, 0x2726, 0x2605, 0x2606, 0x25b2, 0x25b3, 0x2014].map((c) => String.fromCharCode(c));
  for (const p of ["/walkthroughs/", "/walkthroughs/job/", "/walkthroughs/job/1/"]) must(inBundle(OUT, p), `${p} is in the bundle`);
  // What every walk screen must not have: a second bar, a character set as an
  // icon, a drawing (an svg on these screens is an icon of the set, 24 by 24 at
  // most), and a box past the phone's edge.
  const screen = (page) =>
    page.evaluate((glyphs) => {
      const content = document.querySelector("[data-route-content]") ?? document.body;
      const text = content.innerText ?? "";
      return {
        bars: document.querySelectorAll("[data-mobile-topbar]").length,
        backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
        h1s: document.querySelectorAll("h1").length,
        glyphs: glyphs.filter((g) => text.includes(g)),
        drawings: [...content.querySelectorAll("svg")].filter((s) => {
          const r = s.getBoundingClientRect();
          return r.width > 28 || r.height > 28;
        }).length,
      };
    }, GLYPHS);
  const clean = (where, s, out) => {
    must(s.bars === 1 && !s.backBar, `${where}: one bar, the page's own (${s.bars} bar${s.bars === 1 ? "" : "s"}${s.backBar ? ", and the back bar" : ""})`);
    must(s.h1s === 1, `${where}: one heading names the page (${s.h1s} h1)`);
    must(s.glyphs.length === 0 && s.drawings === 0, `${where}: no drawing and no character set as an icon${s.glyphs.length ? ": " + s.glyphs.join(" ") : ""}${s.drawings ? `, ${s.drawings} drawing(s)` : ""}`);
    must(out.length === 0, `${where}: nothing wider than the phone${out.length ? ": " + out.join(" | ") : ""}`);
  };
  // The cover is the icon of Job when the website answers, its plate with the
  // walk's name when it does not, and never a broken picture.
  const cover = (page, scope) =>
    page.evaluate((sel) => {
      const box = document.querySelector(sel);
      if (!box) return null;
      const img = box.querySelector("img");
      return img
        ? { picture: true, ok: img.complete && img.naturalWidth > 1, src: img.getAttribute("src") ?? "" }
        : // The poster holds short words to their neighbours with a no-break
          // space (lib/reading/coverText.ts), the same words to a reader.
          { picture: false, ok: true, src: "", plate: (box.textContent ?? "").replace(/ /g, " ").trim() };
    }, scope);
  const coverIsRight = (c) =>
    Boolean(c) && (c.picture ? c.ok && /^https:\/\/.+\/covers\/job\.v1\.jpg$/.test(c.src) : c.plate.includes(TITLE));
  const fill = (page) =>
    page.evaluate(() => Number(/scaleX\(([\d.]+)\)/.exec(document.querySelector("[data-walk-progress] [style*='scaleX']")?.style.transform ?? "")?.[1] ?? NaN));
  // How far the note's sheet stands below its full height. A long note rests
  // part way up, as every long sheet does (components/ui/Sheet.tsx and
  // lib/ui/useDraggableSheet.ts), its last lines and Keep below the screen's
  // edge, and the reader's first swipe up on it opens it fully.
  const noteDown = (page) =>
    page.evaluate(() => {
      const panel = document.querySelector("[role=dialog] [data-walk-note-sheet]")?.closest(".rounded-t-3xl");
      if (!panel) return null;
      const t = getComputedStyle(panel).transform;
      return t === "none" ? 0 : Math.round(new DOMMatrixReadOnly(t).m42);
    });
  // A thumb up the note, quickly: real touch events, which the sheet's body
  // listens for.
  const swipeUp = async (page) => {
    const at = await page.evaluate(() => {
      const r = document.querySelector("[role=dialog] [data-walk-note-sheet]")?.getBoundingClientRect();
      return r ? { x: Math.round(innerWidth / 2), y: Math.round(Math.min(r.top + 120, innerHeight - 40)) } : null;
    });
    if (!at) return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at.x, y: at.y }] });
    for (let i = 1; i <= 8; i++) {
      await page.waitForTimeout(20);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x, y: at.y - i * 30 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
    await page.waitForTimeout(700);
  };

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });

    // The walkthroughs: their name, one line, the walk as a cover row.
    await go(page, "/walkthroughs/");
    await page.waitForFunction(() => !!document.querySelector("h1#walk-hub-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    clean(`${size.width}px, the walkthroughs`, await screen(page), await page.evaluate(sticksOut));
    const row = await page.evaluate((sel) => (document.querySelector(sel)?.textContent ?? "").trim(), JOB);
    must(row.includes(TITLE) && row.includes(en["walk.free"]), `${size.width}px: Walking with Job is a row, free and not yet begun (${row.slice(0, 70)})`);
    const hubCover = await cover(page, `${JOB} [aria-hidden]`);
    must(coverIsRight(hubCover), `${size.width}px: its cover is Job's icon or, with no signal, the plate with its name (${hubCover ? (hubCover.picture ? hubCover.src : `plate: ${hubCover.plate}`) : "no cover"})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-hub-${size.width}.png`), fullPage: true });

    // The book's page: its cover, its name, Begin, and its chapters.
    await tap(page.locator(JOB).first());
    await page.waitForFunction(() => !!document.querySelector("h1#walk-book-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    clean(`${size.width}px, Walking with Job`, await screen(page), await page.evaluate(sticksOut));
    const book = await page.evaluate(() => ({
      begin: document.querySelector("[data-walk-resume]")?.getAttribute("href") ?? "",
      beginText: (document.querySelector("[data-walk-resume]")?.textContent ?? "").trim(),
      rows: document.querySelectorAll('[data-route-content] ol a[href^="/walkthroughs/job/"]').length,
      tabs: document.querySelectorAll("[role=tablist]").length,
    }));
    must(bare(book.begin) === "/walkthroughs/job/1" && book.beginText === en["walk.begin"], `${size.width}px: Begin opens chapter 1 (${book.beginText || "no button"}, ${book.begin})`);
    must(book.rows === 42 && book.tabs === 0, `${size.width}px: all forty-two chapters as rows, and no switch before a sentence is kept (${book.rows} rows, ${book.tabs} switch)`);
    must(coverIsRight(await cover(page, '[aria-labelledby="walk-book-title"] header [aria-hidden]')), `${size.width}px: the book's page wears the same cover`);
    await page.screenshot({ path: path.join(SHOTS, `walk-book-${size.width}.png`), fullPage: true });
    await page.evaluate(() => window.scrollBy(0, document.querySelector("h1#walk-book-title").getBoundingClientRect().bottom + 40));
    await page.waitForTimeout(700);
    must(await page.evaluate(() => document.querySelector("[data-mobile-topbar]")?.hasAttribute("data-revealed") ?? false), `${size.width}px: once its name has scrolled away the bar shows it`);

    // A chapter: the Scripture is the page.
    await page.evaluate(() => window.scrollTo(0, 0));
    await tap(page.locator("[data-walk-resume]"));
    await page.waitForFunction(() => !!document.querySelector("h1#walk-chapter-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    clean(`${size.width}px, Job 1`, await screen(page), await page.evaluate(sticksOut));
    const chapter = await page.evaluate(() => ({
      title: document.querySelector("h1#walk-chapter-title")?.textContent?.trim() ?? "",
      where: document.querySelector("[data-walk-progress]")?.textContent ?? "",
      verses: document.querySelectorAll("[data-walk-text] > li[id^='v']").length,
      notes: [...document.querySelectorAll("[data-walk-note]")].map((b) => b.getAttribute("data-walk-note")),
      inVerse: [...document.querySelectorAll("[data-walk-note]")].every((b) => /^v\d+$/.test(b.closest("li")?.id ?? "")),
    }));
    must(chapter.title === "A righteous man in the land of Ausis" && chapter.where.includes("Chapter 1 of 42"), `${size.width}px: chapter 1 under "Chapter 1 of 42" (${chapter.title}; ${chapter.where.slice(0, 40)})`);
    must(chapter.verses === 22 && chapter.notes.join(",") === "job-1-1,job-1-5,job-1-12,job-1-21" && chapter.inVerse, `${size.width}px: its 22 verses, each note's name under its own verse (${chapter.verses} verses; ${chapter.notes.join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-chapter-${size.width}.png`) });

    // Reading: the line fills with the scroll, and no note rises by itself.
    const top = await fill(page);
    await page.locator('[data-walk-note="job-1-5"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    must((await page.locator("[role=dialog]").count()) === 0, `${size.width}px: resting by a verse with a note opens nothing`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    const bottom = await fill(page);
    must(bottom > top && bottom > 0.9, `${size.width}px: the line under the bar fills as the chapter is read (${top} to ${bottom})`);

    // A note, in the movable sheet, and kept with one tap once it is open.
    await page.locator('[data-walk-note="job-1-5"]').scrollIntoViewIfNeeded();
    await tap(page.locator('[data-walk-note="job-1-5"]'));
    await page.waitForTimeout(900);
    const note = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return d
        ? { title: d.getAttribute("aria-label") ?? "", text: d.textContent ?? "", lines: d.querySelectorAll("blockquote").length, keep: d.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed") ?? null }
        : null;
    });
    must(Boolean(note) && note.title === "A father's early prayer" && note.text.includes("Job 1:5") && note.text.includes(en["walk.carry"]) && note.lines === 1 && note.keep === "false", `${size.width}px: the note opens in the sheet, with the Father's line and the question to carry (${note ? note.title : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-note-${size.width}.png`) });
    const resting = await noteDown(page);
    if (resting > 0) await swipeUp(page);
    const lifted = await noteDown(page);
    must(resting !== null && lifted === 0, `${size.width}px: a swipe up opens the note fully, its question and Keep with it (${resting ?? "no sheet"}px below full at rest, ${lifted ?? "?"} after)`);
    await tap(page.locator("[role=dialog] button[aria-pressed]"));
    await page.waitForTimeout(500);
    const kept = await page.evaluate(() => ({
      pressed: document.querySelector("[role=dialog] button[aria-pressed]")?.getAttribute("aria-pressed") ?? null,
      saved: (localStorage.getItem("purify:bookmarks") ?? "").includes('"cardId":"job-1-5"'),
    }));
    must(kept.pressed === "true" && kept.saved, `${size.width}px: Keep saves the note to Saved (${kept.pressed}, ${kept.saved ? "in Saved" : "not saved"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    must((await page.locator("[role=dialog]").count()) === 0, `${size.width}px: and the sheet goes away`);

    // The book's chapters, in the sheet, the open one marked.
    await tap(page.locator("[data-walk-progress] button"));
    await page.waitForTimeout(900);
    const list = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return d ? { title: d.getAttribute("aria-label") ?? "", rows: d.querySelectorAll('a[href^="/walkthroughs/job/"]').length, here: d.querySelector("[aria-current=page]")?.getAttribute("href") ?? "" } : null;
    });
    must(Boolean(list) && list.title === en["walk.chapterNav"] && list.rows === 42 && bare(list.here) === "/walkthroughs/job/1", `${size.width}px: Chapters lists the forty-two, chapter 1 marked (${list ? `${list.rows} rows, ${list.here}` : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-chapters-${size.width}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);

    // Gather up the chapter: nothing here can be failed. A wrong tap shows the verse.
    let wrong = 0;
    let echo = false;
    for (let guard = 0; guard < 40; guard++) {
      const left = await page.locator("[data-walk-choice]").count();
      if (left === 0) break;
      const placed = await page.locator("[data-walk-placed]").count();
      let moved = false;
      for (let i = 0; i < left && !moved; i++) {
        await tap(page.locator("[data-walk-choice]").nth(i));
        await page.waitForTimeout(150);
        moved = (await page.locator("[data-walk-placed]").count()) > placed;
        if (!moved) {
          wrong++;
          echo = echo || (await page.evaluate((w) => (document.querySelector("[data-walk-step=order]")?.textContent ?? "").includes(w), en["walk.orderLook"]));
        }
      }
      if (!moved) break;
    }
    const ordered = await page.locator("[data-walk-placed]").count();
    must(ordered === 5 && (wrong === 0 || echo), `${size.width}px: the five moments go in order, and a wrong tap shows the verse instead of a score (${ordered} placed, ${wrong} wrong tap${wrong === 1 ? "" : "s"})`);
    await page.waitForFunction(() => !!document.querySelector("[data-walk-step=who]"), null, { timeout: 5000 }).catch(() => {});
    const groups = await page.locator("[data-walk-step=who] [role=group]").count();
    for (let g = 0; g < groups; g++) {
      const pills = page.locator("[data-walk-step=who] [role=group]").nth(g).locator("button");
      const n = await pills.count();
      for (let i = 0; i < n; i++) {
        if (await pills.nth(i).isDisabled()) continue;
        await tap(pills.nth(i));
        await page.waitForTimeout(150);
        if ((await pills.nth(i).getAttribute("aria-pressed")) === "true") break;
      }
    }
    await page.waitForFunction(() => !!document.querySelector("[data-walk-step=ledger] textarea"), null, { timeout: 5000 }).catch(() => {});
    must((await page.locator("[data-walk-step=ledger] textarea").count()) === 1, `${size.width}px: who said it, then the ledger (${groups} line${groups === 1 ? "" : "s"} to place)`);
    const sentence = "To give thanks before anything is asked back.";
    await page.locator("[data-walk-step=ledger] textarea").fill(sentence);
    await tap(page.getByRole("button", { name: en["walk.finish"] }));
    await page.waitForTimeout(900);
    const finished = await page.evaluate((two) => {
      const s = document.querySelector("[data-walk-finished]");
      return s
        ? { text: s.textContent ?? "", next: s.querySelector(two)?.textContent?.trim() ?? "", focused: document.activeElement?.id ?? "", stored: JSON.parse(localStorage.getItem("purify:walk:job") ?? "{}") }
        : null;
    }, linkTo("/walkthroughs/job/2"));
    must(Boolean(finished) && finished.text.includes(en["walk.chapterWalked"].replace("{n}", "1")) && finished.text.includes(sentence) && finished.focused === "walk-finished", `${size.width}px: the finish is quiet and real: chapter 1 walked, the reader's sentence (${finished ? finished.text.slice(0, 60) : "no finish"})`);
    must(Boolean(finished) && finished.next === en["walk.nextChapter"].replace("{n}", "2") && Boolean(finished.stored?.done?.["1"]), `${size.width}px: and the way on, to chapter 2, with the chapter kept on the device`);
    await page.screenshot({ path: path.join(SHOTS, `walk-finished-${size.width}.png`) });

    // Back on the book's page: the walk in plain words, the sentence kept.
    await go(page, "/walkthroughs/job/");
    await page.waitForFunction(() => !!document.querySelector("h1#walk-book-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.evaluate((one) => ({
      done: document.querySelector("[data-walk-done]")?.textContent?.trim() ?? "",
      resume: document.querySelector("[data-walk-resume]")?.getAttribute("href") ?? "",
      walked: (document.querySelector(`[data-route-content] ol ${one}`)?.textContent ?? "").trim(),
      tabs: [...document.querySelectorAll("[role=tablist] [role=tab]")].map((t) => (t.textContent ?? "").trim()),
    }), linkTo("/walkthroughs/job/1"));
    must(after.done === en["walk.progressOf"].replace("{done}", "1").replace("{total}", "42") && bare(after.resume) === "/walkthroughs/job/2", `${size.width}px: the book's page says "${after.done}" and continues with chapter 2 (${after.resume || "no button"})`);
    must(after.walked.endsWith(en["walk.walked"]) && after.tabs.join(",") === `${en["walk.chapterNav"]},${en["walk.yourLedger"]}`, `${size.width}px: chapter 1 is marked walked, and the reader's ledger is a part of its own (${after.tabs.join(", ") || "no switch"})`);
    await tap(page.getByRole("tab", { name: en["walk.yourLedger"] }));
    await page.waitForTimeout(600);
    must((await page.evaluate(() => document.querySelector("#walk-panel-ledger")?.textContent ?? "")).includes(sentence), `${size.width}px: the ledger holds the sentence`);
    await page.screenshot({ path: path.join(SHOTS, `walk-book-after-${size.width}.png`), fullPage: true });
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A note kept in Saved opens on arrival.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/walkthroughs/job/1/#card-job-1-12");
    await page.waitForFunction(() => !!document.querySelector("[role=dialog]"), null, { timeout: 8000 }).catch(() => {});
    const title = await page.evaluate(() => document.querySelector("[role=dialog]")?.getAttribute("aria-label") ?? "");
    must(title === "The limit God draws", `a note's link from Saved opens it over its verse (${title || "nothing opened"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A phone in Greek: the walk's own words are English for now, and it says so.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    await go(page, "/walkthroughs/job/");
    await page.waitForFunction(() => !!document.querySelector("h1#walk-book-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const greek = await page.evaluate(() => ({
      begin: (document.querySelector("[data-walk-resume]")?.textContent ?? "").trim(),
      text: document.querySelector("[data-route-content]")?.textContent ?? "",
    }));
    must(greek.begin === el["walk.begin"] && greek.text.includes(el["walk.englishForNow"]), `in Greek: ${greek.begin}, and "${el["walk.englishForNow"]}"`);
    await page.screenshot({ path: path.join(SHOTS, "walk-book-el.png"), fullPage: true });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 39. The pages under Prayers (1.7).
// The owner's notes 16 and 17 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md) and his word the same day on how a prayer reads: each page
// under Prayers is a phone page with its own bar; a prayer page has its icon,
// its name, its length and Begin at its head, then the prayer line by line,
// the line being read lit by the scroll (with motion on), the sign of the
// Cross drawn beside the lines its rubric names, Pray with (chant, and
// ambience with Plus), and Mark prayed with no count and no bar; the Hours are
// the day as a timeline with the hour lit; Learn to pray marks the lessons
// read and names the next; the Akathist is set stanza by stanza; and Your rule
// is built, prayed through, kept for the day, and led with on Today.
// Your rule since 1.8 is the owner's pick A of r3-27 (note 73 of build 86):
// measured empty and with a rule, its names, and in every palette
// (lib/prayers/__tests__/yourRulePage.test.ts reads its source).
// lib/prayers/__tests__/prayerPages.test.ts reads the source; this walks the
// built app with no network.
await section(39, async () => {
  console.log("\n39. The pages under Prayers");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const el = { ...en, ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/el.json"), "utf8")) };
  const GLYPHS = [0x2190, 0x2192, 0x2713, 0x25cb, 0x2726, 0x2605, 0x2606, 0x25be, 0x2014].map((c) => String.fromCharCode(c));
  for (const p of ["/prayers/hours/", "/prayers/hours/third-hour/", "/prayers/morning/", "/prayers/learning/", "/prayers/learning/what-is-prayer/", "/prayers/akathists/", "/prayers/akathists/theotokos/", "/prayers/personal/", "/prayers/personal/morning/", "/prayers/today/"]) {
    must(inBundle(OUT, p), `${p} is in the bundle`);
  }
  // What no prayer page may have: a second bar, a second name, a character
  // set as an icon, a count or a bar of progress, a box past the phone's edge.
  const screen = (page) =>
    page.evaluate((glyphs) => {
      const content = document.querySelector("[data-route-content]") ?? document.body;
      const text = content.innerText ?? "";
      return {
        bars: document.querySelectorAll("[data-mobile-topbar]").length,
        backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
        h1s: document.querySelectorAll("h1").length,
        glyphs: glyphs.filter((g) => text.includes(g)),
        score: !!content.querySelector("[role=progressbar], progress") || /\b\d+ (of|\/) \d+\b/.test(text),
      };
    }, GLYPHS);
  const clean = (where, s, out) => {
    must(s.bars === 1 && !s.backBar, `${where}: one bar, the page's own (${s.bars} bar${s.bars === 1 ? "" : "s"}${s.backBar ? ", and the back bar" : ""})`);
    must(s.h1s === 1, `${where}: one heading names the page (${s.h1s} h1)`);
    must(s.glyphs.length === 0 && !s.score, `${where}: no character set as an icon, no count and no bar${s.glyphs.length ? ": " + s.glyphs.join(" ") : ""}${s.score ? ", a score" : ""}`);
    must(out.length === 0, `${where}: nothing wider than the phone${out.length ? ": " + out.join(" | ") : ""}`);
  };
  const today = (page) =>
    page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
  const kept = (page, id) => page.evaluate((k) => JSON.parse(localStorage.getItem(`purify.prayers.${k}.dates`) ?? "[]"), id);

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    // Motion on, whatever the machine running the walk says: the lit line is a
    // thing of the motion switch.
    const { ctx, page, errors } = await open({ ...size, phone: true, set: { "purify.motion": "on" } });

    // The Hours: the day down one line, one Hour lit.
    await go(page, "/prayers/hours/");
    await page.waitForFunction(() => !!document.querySelector("h1#hours-title") && document.querySelectorAll('a[aria-current="time"]').length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    clean(`${size.width}px, the Hours`, await screen(page), await page.evaluate(sticksOut));
    const hours = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-route-content] ol a[href^="/prayers/hours/"]')].map((a) => a.getAttribute("href")),
      lit: [...document.querySelectorAll('a[aria-current="time"]')].map((a) => (a.textContent ?? "").trim()),
      sharp: [...document.querySelectorAll('[data-route-content] ol img[src^="/icons/prayer/"]')].filter((i) => i.complete && i.naturalWidth >= i.getBoundingClientRect().width * 2).length,
    }));
    must(hours.rows.length === 5 && hours.sharp === 5, `${size.width}px: the five Hours, each with its icon sharp at the phone's pixels (${hours.rows.length} rows, ${hours.sharp} sharp icons)`);
    must(
      hours.lit.length === 1 && hours.lit[0].includes(en["prayers.hoursIndex.nowMark"]) && hours.lit[0].includes(en["today.prayNow.begin"]),
      `${size.width}px: one Hour is lit, with the word for now and Begin (${hours.lit.length} lit: ${hours.lit[0]?.slice(0, 60) ?? "none"})`,
    );
    await page.screenshot({ path: path.join(SHOTS, `prayers-hours-${size.width}.png`), fullPage: true });

    // An Hour: its head, then its prayers line by line.
    await go(page, "/prayers/hours/third-hour/");
    await page.waitForFunction(() => !!document.querySelector("h1#prayer-title") && document.querySelectorAll("[data-prayer-words] [data-line]").length > 5, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    clean(`${size.width}px, the Third Hour`, await screen(page), await page.evaluate(sticksOut));
    const head = await page.evaluate(() => {
      const h = document.querySelector("[data-prayer-reader] header");
      const img = h?.querySelector('img[src^="/icons/prayer/"]');
      const group = h?.querySelector("[role=group]");
      return {
        title: document.querySelector("h1#prayer-title")?.textContent?.trim() ?? "",
        icon: img ? { src: img.getAttribute("src"), sharp: img.complete && img.naturalWidth >= img.getBoundingClientRect().width * 2 } : null,
        prayWith: group ? [...group.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || (b.textContent ?? "").trim()) : [],
      };
    });
    must(head.title === en["prayers.rule.third-hour.title"], `${size.width}px: the Hour is named by the catalog (${head.title})`);
    must(Boolean(head.icon) && head.icon.src === "/icons/prayer/pentecost.jpg" && head.icon.sharp, `${size.width}px: Pentecost at its head, sharp (${head.icon ? head.icon.src : "no icon"})`);
    must(
      head.prayWith.length === 2 && head.prayWith[0] === en["prayers.prayWith.chant"] && [en["ambience.title"], en["prayers.prayWith.ambienceLocked"]].includes(head.prayWith[1]),
      `${size.width}px: Pray with, chant and ambience in one control (${head.prayWith.join(", ")})`,
    );
    await page.screenshot({ path: path.join(SHOTS, `prayers-hour-head-${size.width}.png`) });
    // Chant opens the Chants library's picker, and nothing comes over it: the
    // once-a-day "Pray with chant?" (1.6 seconds after a prayer opens,
    // components/player/PrayWithChant.tsx) is answered by the reader's own
    // tap. In 1.7 it still rose, over the picker, when Chant came first.
    await tap(page.locator("[data-prayer-reader] header [role=group] button").first());
    await page.waitForTimeout(2000);
    const sheets = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].map((d) => d.getAttribute("aria-label") ?? ""));
    must(sheets.length === 1 && sheets[0] === en["chant.button"], `${size.width}px: Chant opens Pray with chant, and nothing over it (${sheets.join(", ") || "nothing"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    // Begin goes to the first prayer, and reading lights one line at a time.
    await tap(page.locator("[data-prayer-reader] header button", { hasText: en["today.prayNow.begin"] }).first());
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollBy(0, Math.round(innerHeight * 0.8)));
    await page.waitForTimeout(900);
    const lit = await page.evaluate(() => {
      const reader = document.querySelector("[data-prayer-reader]");
      const on = [...document.querySelectorAll("[data-line][data-lit]")];
      const off = [...document.querySelectorAll("[data-line]:not([data-lit])")];
      return {
        following: reader?.hasAttribute("data-following") ?? false,
        on: on.length,
        bright: on[0] ? Number(getComputedStyle(on[0]).opacity) : 0,
        back: off[0] ? Number(getComputedStyle(off[0]).opacity) : 1,
        barTitle: document.querySelector("[data-mobile-topbar]")?.hasAttribute("data-revealed") ?? false,
      };
    });
    must(lit.following && lit.on === 1 && lit.bright > 0.95 && lit.back < 0.6, `${size.width}px: the line being read is lit and the rest step back (${lit.on} lit, ${lit.bright} against ${lit.back})`);
    must(lit.barTitle, `${size.width}px: once the name has scrolled away the bar shows it`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-hour-lines-${size.width}.png`) });
    // The rule's one Amen at its end keeps the Hour for today (build 89 note
    // 7: nothing is ticked under each prayer, and Mark all went with the marks).
    await tap(page.locator("[data-prayer-reader] [data-amen]").first());
    await page.waitForTimeout(700);
    const day = await today(page);
    const done = await page.evaluate(
      (w) => ({ doxology: document.body.innerText.includes(w.complete), prayed: (document.querySelector("[data-prayer-reader] header")?.textContent ?? "").includes(w.prayed) }),
      { complete: en["prayers.reader.complete"], prayed: en["shop.prayedToday"] },
    );
    must(
      done.doxology && done.prayed && (await kept(page, "third-hour")).includes(day),
      `${size.width}px: every prayer marked keeps the Hour for today, and says so once (${done.doxology ? "doxology" : "no doxology"}, ${done.prayed ? "Prayed today" : "no mark"})`,
    );

    // The Morning Rule: the sign of the Cross beside its line.
    await go(page, "/prayers/morning/");
    await page.waitForFunction(() => document.querySelectorAll("[data-prayer-words] [data-line]").length > 5, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    clean(`${size.width}px, the Morning Rule`, await screen(page), await page.evaluate(sticksOut));
    const cross = await page.evaluate((label) => {
      const marks = [...document.querySelectorAll(`[data-line] svg[role=img][aria-label="${label}"]`)];
      return { n: marks.length, line: marks[0]?.closest("[data-line]")?.textContent?.trim() ?? "" };
    }, en["prayers.reader.signOfTheCross"]);
    must(cross.n >= 1 && cross.line.startsWith("In the name of the Father"), `${size.width}px: the drawn cross stands beside "In the name of the Father" (${cross.n} cross${cross.n === 1 ? "" : "es"})`);

    // The Akathist, stanza by stanza.
    await go(page, "/prayers/akathists/theotokos/");
    await page.waitForFunction(() => !!document.querySelector("h1#prayer-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    clean(`${size.width}px, the Akathist`, await screen(page), await page.evaluate(sticksOut));
    const akathist = await page.evaluate(() => ({ stanza: document.querySelector("#kontakion-1-title")?.textContent?.trim() ?? "", text: document.body.innerText }));
    must(
      akathist.stanza === en["prayers.akathist.kontakion"].replace("{n}", "1") && akathist.text.includes("Hail, O Bride Unwedded!"),
      `${size.width}px: the stanza is named by the Church's word, its refrain on a line of its own (${akathist.stanza})`,
    );

    // Learn to pray: the way in, a lesson read, the next one named.
    await go(page, "/prayers/learning/");
    await page.waitForFunction(() => !!document.querySelector("[data-learn-next]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    clean(`${size.width}px, Learn to pray`, await screen(page), await page.evaluate(sticksOut));
    must((await page.evaluate(() => document.querySelector("[data-learn-next]")?.textContent?.trim() ?? "")) === en["prayers.learning.start"], `${size.width}px: the way in starts with lesson 1`);
    await tap(page.locator("[data-learn-next]"));
    await page.waitForFunction(() => !!document.querySelector("[data-lesson-end]"), null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.querySelector("[data-lesson-end]")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(2800);
    must(
      await page.evaluate((w) => (document.querySelector("[data-lesson-end]")?.textContent ?? "").includes(w), en["prayers.learning.lessonRead"]),
      `${size.width}px: a lesson whose end has been read is marked read`,
    );
    await go(page, "/prayers/learning/");
    await page.waitForFunction(() => !!document.querySelector("[data-learn-next]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const next = await page.evaluate(() => document.querySelector("[data-learn-next]")?.textContent?.trim() ?? "");
    must(next === en["prayers.learning.next"].replace("{title}", "The Sign of the Cross"), `${size.width}px: and the way in names the next lesson (${next})`);

    // Your rule: built from the morning rule, reordered, prayed through, kept.
    // Since 1.8 the owner's pick A of r3-27 (note 73, "A with a rule"): the
    // part's icon under the clear bar, a carved Morning and Evening switch,
    // the prayers as numbered steps on a thread. Measured empty, then with a
    // rule. #morning, so the part is the same whatever the walk's hour.
    await go(page, "/prayers/personal/#morning");
    await page.waitForFunction(() => !!document.querySelector("h1#mine-title") && !!document.querySelector("[data-rule-picture] img[data-on]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    clean(`${size.width}px, Your rule`, await screen(page), await page.evaluate(sticksOut));
    const ruleHead = () =>
      page.evaluate(() => {
        const box = document.querySelector("[data-rule-picture]");
        const lit = box?.querySelector("img[data-on]");
        const h1 = document.querySelector("h1#mine-title");
        const bar = document.querySelector("[data-mobile-topbar]");
        return {
          part: box?.getAttribute("data-rule-picture") ?? "",
          src: lit?.getAttribute("src") ?? "",
          loaded: Boolean(lit && lit.complete && lit.naturalWidth > 0),
          top: box ? Math.round(box.getBoundingClientRect().top) : null,
          edges: box ? Math.round(box.getBoundingClientRect().left) === 0 && Math.round(box.getBoundingClientRect().right) === document.documentElement.clientWidth : false,
          nameOnIt: Boolean(box && h1 && h1.getBoundingClientRect().top < box.getBoundingClientRect().bottom && h1.getBoundingClientRect().top > 0),
          // Clear until the head's first words reach it (build 90 note 3: data-solid, not the name's data-revealed).
          clearBar: Boolean(bar && bar.hasAttribute("data-overlay") && !bar.hasAttribute("data-solid")),
          tabs: [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((tab) => `${tab.id}:${tab.getAttribute("aria-selected")}`),
          pray: document.querySelector("[data-mine-pray]")?.getAttribute("href") ?? null,
          meta: document.querySelector("[data-mine-pray-meta]")?.textContent?.trim() ?? "",
          hash: location.hash,
        };
      });
    const empty = await ruleHead();
    must(
      empty.part === "morning" && empty.src === "/icons/prayer/anastasis.jpg" && empty.loaded && empty.top !== null && empty.top <= 1 && empty.edges,
      `${size.width}px: an empty Your rule opens on the morning's Anastasis, edge to edge from the screen's top, under the bar (${empty.src || "no picture"}, top ${empty.top})`,
    );
    must(empty.clearBar && empty.nameOnIt, `${size.width}px: the bar is clear over the icon, and the page's name stands on it`);
    must(empty.tabs.join(" ") === "mine-tab-morning:true mine-tab-evening:false" && empty.pray === null, `${size.width}px: Morning and Evening on one switch, Morning chosen, and no Pray my rule for an empty part (${empty.tabs.join(" ")})`);
    const ways = await page.evaluate(() => [...document.querySelectorAll("#mine-panel-morning [data-mine-ways] > button")].map((b) => (b.textContent ?? "").replace(/\s+/g, " ").trim()));
    const startWhat = en["prayers.mine.startFromWhat"]
      .replace("{prayers}", en["prayers.reader.prayerCount.other"].replace("{count}", "10"))
      .replace("{minutes}", en["today.minRead"].replace("{count}", "8"));
    must(
      ways.length === 2 && ways[0].includes(en["prayers.mine.startFromMorning"]) && ways[0].includes(startWhat) && ways[1].includes(en["prayers.mine.addOneByOne"]),
      `${size.width}px: the two ways in are one choice of two rows, each saying what it brings (${ways[0] ?? "none"})`,
    );
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-empty-${size.width}.png`), fullPage: true });

    await tap(page.locator("#mine-panel-morning [data-mine-ways] > button", { hasText: en["prayers.mine.startFromMorning"] }));
    await page.waitForTimeout(700);
    const rows = () => page.evaluate(() => [...document.querySelectorAll("#mine-panel-morning ol > li")].map((li) => li.querySelector("[data-step-title]")?.textContent?.trim() ?? ""));
    const built = await rows();
    const thread = await page.evaluate(() => ({
      nodes: [...document.querySelectorAll("#mine-panel-morning ol > li .rule-node")].map((n) => (n.textContent ?? "").trim()),
      add: !!document.querySelector("#mine-panel-morning .rule-thread > [data-mine-add]"),
      handles: document.querySelectorAll("#mine-panel-morning ol > li > button:last-child svg").length,
    }));
    const withRule = await ruleHead();
    must(built.length === 10 && withRule.pray !== null, `${size.width}px: starting from Morning prayers sets its ten prayers in the rule, and Pray my rule appears (${built.length} rows)`);
    must(
      thread.nodes.join(",") === "1,2,3,4,5,6,7,8,9,10" && thread.add && thread.handles === 10,
      `${size.width}px: the prayers are numbered steps on one thread, a handle on each, Add prayers its last stop (${thread.nodes.join(",")})`,
    );
    const eightMin = en["prayers.mine.partMinutes"].replace("{part}", en["prayers.tabs.morning"]).replace("{min}", "8");
    must(withRule.meta === eightMin, `${size.width}px: Pray my rule says the part and its length as the prayer book does, "${eightMin}" (${withRule.meta})`);
    await tap(page.locator("#mine-panel-morning ol > li").first().locator("[data-step-open]"));
    await page.waitForTimeout(900);
    await tap(page.locator("[role=dialog] button", { hasText: en["prayers.mine.moveDown"] }));
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    const moved = await rows();
    must(moved[0] === built[1] && moved[1] === built[0], `${size.width}px: Move down puts the first prayer second (${moved.slice(0, 2).join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-${size.width}.png`), fullPage: true });
    // The switch crosses to the evening's Pantocrator, keeps the part in the address, and comes back.
    await tap(page.locator("#mine-tab-evening"));
    await page.waitForTimeout(1000);
    const evening = await ruleHead();
    must(
      evening.part === "evening" && evening.src === "/sections/prayers.v4.jpg" && evening.loaded && evening.hash === "#evening" && evening.pray === null,
      `${size.width}px: Evening shows its own icon, the Pantocrator, and its empty part (${evening.src || "no picture"}, ${evening.hash})`,
    );
    await tap(page.locator("#mine-tab-morning"));
    await page.waitForTimeout(700);
    await tap(page.locator("[data-mine-pray]"));
    await page.waitForFunction(() => location.pathname.startsWith("/prayers/personal/morning") && document.querySelectorAll("[data-prayer-reader] section[id]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    clean(`${size.width}px, Your morning rule`, await screen(page), await page.evaluate(sticksOut));
    const mine = await page.evaluate(() => ({
      title: document.querySelector("h1#prayer-title")?.textContent?.trim() ?? "",
      steps: [...document.querySelectorAll("[data-prayer-reader] section[id]")].map((s) => s.id),
    }));
    must(
      mine.title === en["prayers.mine.morningTitle"] && mine.steps.length === 10 && mine.steps[0] === "morning--glory-to-thee" && mine.steps[1] === "morning--sign-of-cross",
      `${size.width}px: Pray my rule opens Your morning rule, its ten prayers in the reader's order (${mine.steps.slice(0, 2).join(", ")})`,
    );
    // Its Amen, as every rule's (build 89 note 7).
    await tap(page.locator("[data-prayer-reader] [data-amen]").first());
    await page.waitForTimeout(700);
    must((await kept(page, "mine-morning")).includes(await today(page)), `${size.width}px: praying it through keeps the day under mine-morning, which the streak reads`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-reader-${size.width}.png`) });

    // Today's Pray leads with the reader's rule for the part the hour calls
    // for: an evening part too, so either hour finds one. Since 1.8 (the
    // owner's pick B of round 13, "The hour, large") that is the hour's card,
    // the first of the list, and the day's rule is the first tile under it.
    await page.evaluate(() => {
      const rule = JSON.parse(localStorage.getItem("purify.prayers.mine") ?? "{}");
      rule.evening = [{ kind: "prayer", rule: "evening", prayer: "trisagion" }];
      localStorage.setItem("purify.prayers.mine", JSON.stringify(rule));
    });
    await go(page, "/");
    await page.waitForFunction(() => !!document.querySelector('section[aria-labelledby="today-pray"] a[data-pray-hour]'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const first = await page.evaluate(() => {
      const a = document.querySelector('section[aria-labelledby="today-pray"] ul > li a');
      const tile = document.querySelector('section[aria-labelledby="today-pray"] ul > li:nth-child(2) a');
      return { hour: a?.hasAttribute("data-pray-hour") ?? false, href: a?.getAttribute("href") ?? "", text: a?.textContent ?? "", tile: tile?.getAttribute("href") ?? "" };
    });
    must(
      first.hour && first.href.startsWith("/prayers/personal/") && (first.text.includes(en["prayers.mine.morningTitle"]) || first.text.includes(en["prayers.mine.eveningTitle"])),
      `${size.width}px: Today's Pray leads with the reader's own rule as the hour's card (${first.href})`,
    );
    must(/^\/prayers\/(morning|evening)\/?$/.test(first.tile), `${size.width}px: and the day's rule for the hour is the first tile under it (${first.tile || "none"})`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-today-mine-${size.width}.png`) });
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Your rule's names (the owner's note 73, and r3-27 A): the living, the
  // reposed and the prayer wall's names as rows of medallions; a repose
  // written as a date; each wall name with the day it leaves; a name removed
  // at once, with Undo and no browser box; In which prayers one row opening
  // lines to tick; the lists' lines naming Today in words; the note at the
  // foot naming the names.
  {
    const now = new Date().toISOString();
    const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const { ctx, page, errors } = await open({
      width: 390,
      height: 844,
      phone: true,
      set: {
        "purify.intentions.living": JSON.stringify([{ id: "a1111111-1111-4111-8111-111111111111", name: "Maria", relationship: "Mother", addedAt: now }]),
        "purify.intentions.departed": JSON.stringify([{ id: "a2222222-2222-4222-8222-222222222222", name: "George", repose: "2019-03-04", addedAt: now }]),
        "purify.prayers.wall": JSON.stringify([
          { id: "a3333333-3333-4333-8333-333333333333", name: "Anna", intention: "For my mother, who is ill", places: ["morning", "evening", "mine"], addedAt: now, until, doneAt: null, changedAt: now },
        ]),
      },
    });
    let boxes = 0;
    page.on("dialog", (d) => {
      boxes++;
      void d.dismiss().catch(() => {});
    });
    await go(page, "/prayers/personal/");
    await page.waitForFunction(() => document.querySelectorAll("[data-medallion]").length >= 3, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const lists = await page.evaluate(() =>
      Object.fromEntries(["living", "departed", "wall"].map((k) => [k, [...document.querySelectorAll(`[data-names="${k}"] [data-medallion]`)].map((b) => (b.textContent ?? "").replace(/\s+/g, " ").trim())])),
    );
    const leaves = await page.evaluate((u) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(u)), until);
    must(lists.living.length === 1 && lists.living[0].includes("Maria") && lists.living[0].includes("Mother"), `the living as medallions, each name with what it is (${lists.living.join(" | ")})`);
    must(lists.departed.length === 1 && lists.departed[0].includes(`${en["prayers.diptychs.reposedLabel"]} Mar 4, 2019`), `a repose is written as a date, not as typed (${lists.departed.join(" | ")})`);
    must(
      lists.wall.length === 1 && lists.wall[0].includes("Anna") && lists.wall[0].includes(en["prayers.diptychs.wallUntil"].replace("{date}", leaves)),
      `the prayer wall's names stand among the names, each with the day it leaves (${lists.wall.join(" | ")})`,
    );
    const where = await page.evaluate(() => (document.querySelector("[data-remembered-in]")?.textContent ?? "").replace(/\s+/g, " ").trim());
    must(where.includes(en["community.wallAddWhen"]) && where.includes(en["prayers.rule.morning.title"]), `In which prayers is one row that says the prayers chosen (${where})`);
    await tap(page.locator("[data-remembered-in]"));
    await page.waitForTimeout(900);
    const ticks = await page.evaluate(() => ({
      lines: document.querySelectorAll("[role=dialog] [data-place-ticks] > button").length,
      on: document.querySelectorAll('[role=dialog] [data-place-ticks] > button[aria-pressed="true"]').length,
      pills: document.querySelectorAll("[role=dialog] [data-place-ticks] .rounded-pill").length,
    }));
    must(ticks.lines === 6 && ticks.on === 3 && ticks.pills === 0, `and opens the six prayers as lines to tick, three ticked, no pills (${ticks.lines} lines, ${ticks.on} ticked)`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await tap(page.locator('[data-names="living"] [data-medallion-add]'));
    await page.waitForTimeout(900);
    const adding = await page.evaluate(() => document.querySelector("[role=dialog]")?.textContent ?? "");
    must(adding.includes(en["prayers.diptychs.livingIntro"]) && !adding.includes("/prayers/"), `adding a name, the living's line names Today in words, with no address`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await tap(page.locator('[data-names="living"] [data-medallion]').first());
    await page.waitForTimeout(900);
    await tap(page.locator("[role=dialog] [data-name-remove]"));
    await page.waitForTimeout(800);
    const gone = await page.evaluate(() => ({
      living: document.querySelectorAll('[data-names="living"] [data-medallion]').length,
      status: (document.querySelector('section[aria-labelledby="mine-names"] [role="status"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
    }));
    must(
      boxes === 0 && gone.living === 0 && gone.status.includes(en["prayers.mine.removed"].replace("{title}", "Maria")) && gone.status.includes(en["prayers.mine.undo"]),
      `removing a name takes it out at once, with Undo, and no browser box (${boxes} boxes, "${gone.status}")`,
    );
    await tap(page.locator('section[aria-labelledby="mine-names"] [role="status"] button'));
    await page.waitForTimeout(700);
    must((await page.evaluate(() => document.querySelectorAll('[data-names="living"] [data-medallion]').length)) === 1, `and Undo puts it back`);
    const note = await page.evaluate((want) => [...document.querySelectorAll("p")].some((p) => (p.textContent ?? "").trim() === want), en["prayers.mine.deviceNote"]);
    must(note, `the note at the page's foot names the names it speaks of ("${en["prayers.mine.deviceNote"].slice(0, 60)}...")`);
    await page.screenshot({ path: path.join(SHOTS, "prayers-mine-names-390.png"), fullPage: true });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Your rule in every palette: drawn, and nothing in gold, yellow or amber
  // (the owner's rule: black, white and grey; what stands out glows white).
  for (const theme of ["default", "parchment", "black", "candlelight", "monastery"]) {
    const { ctx, page, errors } = await open({
      width: 390,
      height: 844,
      phone: true,
      set: { "purify.reader.theme": theme, "purify.prayers.mine": JSON.stringify({ v: 1, morning: [{ kind: "prayer", rule: "morning", prayer: "trisagion" }, { kind: "names" }], evening: [], minutes: { morning: 0, evening: 0 }, updatedAt: "" }) },
    });
    await go(page, "/prayers/personal/#morning");
    await page.waitForFunction(() => !!document.querySelector("[data-rule-picture] img[data-on]") && document.querySelectorAll("#mine-panel-morning ol > li").length === 2, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const drawn = await page.evaluate(() => {
      const warm = [];
      for (const el of document.querySelectorAll('section[aria-labelledby="mine-title"] *')) {
        if (el.closest("[data-rule-picture]") || el.tagName === "IMG") continue;
        const cs = getComputedStyle(el);
        for (const c of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
          const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(c);
          if (!m || (m[4] !== undefined && Number(m[4]) < 0.2)) continue;
          const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
          if (r > 150 && g > 110 && r - b > 70 && g - b > 40) warm.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${c}`);
        }
      }
      return {
        mode: document.documentElement.dataset.readingMode ?? "",
        steps: document.querySelectorAll("#mine-panel-morning ol > li .rule-node").length,
        lit: !!document.querySelector('#mine-panel-morning .rule-node[data-lit]'),
        track: !!document.querySelector('.rule-track [aria-selected="true"]'),
        warm: [...new Set(warm)].slice(0, 4),
      };
    });
    must(
      drawn.steps === 2 && drawn.lit && drawn.track && drawn.warm.length === 0,
      `Your rule in ${theme} (${drawn.mode || "default"}): the steps, the lit names step and the switch, nothing gold${drawn.warm.length ? ": " + drawn.warm.join(" | ") : ""}`,
    );
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-${theme}-390.png`) });
    must(errors.length === 0, `${theme}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // With motion off, nothing steps back.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.motion": "off" } });
    await go(page, "/prayers/morning/");
    await page.waitForFunction(() => document.querySelectorAll("[data-prayer-words] [data-line]").length > 5, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => window.scrollBy(0, Math.round(innerHeight * 1.2)));
    await page.waitForTimeout(900);
    const still = await page.evaluate(() => ({
      lit: document.querySelectorAll("[data-line][data-lit]").length,
      dim: [...document.querySelectorAll("[data-line]")].filter((l) => Number(getComputedStyle(l).opacity) < 0.99).length,
    }));
    must(still.lit === 0 && still.dim === 0, `with motion off every line stays at full strength (${still.lit} lit, ${still.dim} stepped back)`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A phone in Greek: the Hour is named in Greek, its words are English for
  // now, and the page says so.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR" });
    await go(page, "/prayers/hours/third-hour/");
    await page.waitForFunction(() => !!document.querySelector("h1#prayer-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const greek = await page.evaluate(() => ({
      title: document.querySelector("h1#prayer-title")?.textContent?.trim() ?? "",
      text: document.querySelector("[data-prayer-reader] header")?.textContent ?? "",
    }));
    must(
      greek.title === el["prayers.rule.third-hour.title"] && greek.text.includes(el["prayers.reader.notInYourLanguage"]),
      `in Greek: "${greek.title}", and "${el["prayers.reader.notInYourLanguage"]}"`,
    );
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 40. Saved, the reading plans and the journal (1.7).
// The owner's notes 21 to 23 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md). Saved is one list under one row of chips, History the last;
// each row says what it is, shows a verse's words or a thing's title and where
// it is from, a highlight's colour as a small dot by its name, with no stripe
// and no tinted box; a swipe takes a row away and Undo brings it back. A
// plan's day is a session: Begin opens the chapter with the plan's bar at its
// foot, Next walks a kathisma's psalms, Done keeps the day and the plan's page
// opens on its finish (two questions to answer in a line, a saying of the
// Fathers on a day that has one, tomorrow), and an answer kept goes to the
// journal. The journal writes in a sheet as tall as what the keyboard leaves.
// lib/saved, lib/plans and lib/journal hold the rules in their tests; this
// walks the built app with no network, on the narrow Android width and an
// iPhone's.
//
// A headless browser has no keyboard, so one is stood in: a field taking the
// focus takes 300px off window.visualViewport and says so, as a phone's does
// (lib/ui/viewport.ts).
//
// The walk's phone is the shell before Capacitor names its platform, where
// Plus locks nothing unless both stores enforce it (lib/entitlements/
// entitlements.ts), so the day begins and the journal writes. A build that
// locks it there says so, and the steps that need Plus are not walked.
await section(40, async () => {
  console.log("\n40. Saved, the reading plans and the journal");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const guide = JSON.parse(fs.readFileSync(path.resolve("data/plans/guide/en.json"), "utf8"));
  const sayings = JSON.parse(fs.readFileSync(path.resolve("data/plans/sayings.json"), "utf8"));
  const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), s);
  const flat = (s) => s.replace(/\s+/g, " ").trim();
  for (const p of ["/saved/", "/journal/", "/plans/", "/plans/psalter/", "/plans/gospels/", "/plans/john/", "/plans/proverbs/", "/plans/nativity/"]) must(inBundle(OUT, p), `${p} is in the bundle`);

  const KEYBOARD = 300;
  const standInKeyboard = (kb) => {
    const target = new EventTarget();
    let up = 0;
    const vv = {
      get width() { return innerWidth; },
      get height() { return innerHeight - up; },
      offsetTop: 0,
      offsetLeft: 0,
      get pageTop() { return scrollY; },
      get pageLeft() { return scrollX; },
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: (...a) => target.addEventListener(...a),
      removeEventListener: (...a) => target.removeEventListener(...a),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    try {
      Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
      window.__standInKeyboard = true;
    } catch {
      /* the check below says so */
    }
    const set = (px) => {
      if (up === px) return;
      up = px;
      target.dispatchEvent(new Event("resize"));
    };
    const typing = (el) => el instanceof HTMLElement && el.matches("textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])");
    document.addEventListener("focusin", (e) => set(typing(e.target) ? kb : 0), true);
    document.addEventListener("focusout", () => set(0), true);
  };

  // What none of these pages may have: a second bar or name, a character set
  // as an icon, a box past the phone's edge.
  const GLYPHS = [0x2190, 0x2192, 0x2713, 0x25cb, 0x2726, 0x2605, 0x2606, 0x25be, 0x2014].map((c) => String.fromCharCode(c));
  const clean = async (where, page) => {
    const s = await page.evaluate((glyphs) => {
      const text = (document.querySelector("[data-route-content]") ?? document.body).innerText ?? "";
      return {
        bars: document.querySelectorAll("[data-mobile-topbar]").length,
        backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
        h1s: document.querySelectorAll("h1").length,
        glyphs: glyphs.filter((g) => text.includes(g)),
      };
    }, GLYPHS);
    const out = await page.evaluate(sticksOut);
    must(s.bars === 1 && !s.backBar && s.h1s === 1, `${where}: one bar, the page's own, and one heading (${s.bars} bar${s.bars === 1 ? "" : "s"}${s.backBar ? " and the back bar" : ""}, ${s.h1s} h1)`);
    must(s.glyphs.length === 0, `${where}: no character set as an icon${s.glyphs.length ? ": " + s.glyphs.join(" ") : ""}`);
    must(out.length === 0, `${where}: nothing wider than the phone${out.length ? ": " + out.join(" | ") : ""}`);
  };

  // A finger across a row toward the start of the line, quickly: real touch
  // events, so touch-action and the row's own handlers both see it. The
  // finger comes to rest before it lifts. Lifted while still moving, the
  // walk's Chromium swallows the next tap whole (a touchstart and a touchend,
  // no click) after a sideways swipe on anything with touch-action: pan-y,
  // on a blank page with none of the app's code as well (2026-10-17), and
  // the Undo that followed did nothing. Whether a phone's WebView does the
  // same is not yet checked. A row past 40 percent of its width goes either
  // way (components/ui/SwipeRow.tsx).
  const swipeAway = async (cdp, page, selector) => {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), selector);
    await page.waitForTimeout(500);
    const at = await page.evaluate((sel) => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: Math.round(innerWidth - 60), y: Math.round(r.top + r.height / 2) } : null;
    }, selector);
    if (!at) return false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at.x, y: at.y }] });
    for (let i = 1; i <= 8; i++) {
      await page.waitForTimeout(20);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x - i * 30, y: at.y }] });
    }
    await page.waitForTimeout(150);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x - 240, y: at.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(900);
    return true;
  };

  const savedRows = (page) =>
    page.evaluate(() => {
      const clear = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
      const ground = (n) => {
        for (let p = n.parentElement; p; p = p.parentElement) {
          const c = getComputedStyle(p).backgroundColor;
          if (!clear(c)) return c;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      return [...document.querySelectorAll("[data-saved-row]")].map((a) => {
        const li = a.closest("li");
        const slide = a.parentElement?.parentElement ?? a;
        const dot = a.querySelector("[data-saved-dot]");
        const sides = [li, slide, a].filter(Boolean).flatMap((n) => {
          const s = getComputedStyle(n);
          return [parseFloat(s.borderLeftWidth) || 0, parseFloat(s.borderRightWidth) || 0];
        });
        return {
          href: a.getAttribute("href") ?? "",
          text: a.innerText.replace(/\s+/g, " ").trim(),
          dot: dot ? { color: dot.getAttribute("data-saved-dot"), paint: getComputedStyle(dot).backgroundColor, size: Math.round(dot.getBoundingClientRect().width) } : null,
          stripe: Math.max(0, ...sides),
          plain: clear(getComputedStyle(a).backgroundColor) && getComputedStyle(slide).backgroundColor === ground(li ?? a),
        };
      });
    });
  const chipsOn = (page) =>
    page.evaluate((label) => [...document.querySelectorAll(`[aria-label="${label}"] button`)].map((b) => ({ text: (b.textContent ?? "").trim(), on: b.getAttribute("aria-pressed") === "true" })), en["saved.filtersLabel"]);
  const footOf = (page, selector) =>
    page.evaluate((sel) => {
      const el = [...document.querySelectorAll(sel)].find((x) => x.getBoundingClientRect().width > 0);
      const r = el?.getBoundingClientRect();
      const tabs = document.querySelector("[data-tab-label]")?.closest("nav")?.getBoundingClientRect();
      return r ? { bottom: Math.round(r.bottom), right: Math.round(r.right), height: Math.round(r.height), tabs: tabs ? Math.round(tabs.top) : null, vw: innerWidth, text: (el.textContent ?? "").replace(/\s+/g, " ").trim() } : null;
    }, selector);

  const JOHN_3_16 = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const w = size.width;
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const set = {
      "purify:bookmarks": JSON.stringify([
        { id: "walk-john-3-16", addedAt: now - 60_000, label: "John 3:16", kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 16 },
        { id: "walk-priesthood", addedAt: now - 3_600_000, label: "On the Priesthood, Book I", kind: "writing-section", saintSlug: "john-chrysostom", saintName: "St. John Chrysostom", workSlug: "on-the-priesthood", workTitle: "On the Priesthood", sectionN: 1, sectionTitle: "Book I" },
      ]),
      "purify:bible:psalms:22:1": JSON.stringify({ highlighted: true, color: "blue", at: iso(now - 7_200_000), hlAt: iso(now - 7_200_000) }),
      // What the reader calls blue (1.7.1): names start empty, and Saved uses one once it is given.
      "purify:bible:highlight-legend": JSON.stringify({ blue: en["bible.highlight.idea.questions"] }),
      "purify:remember": JSON.stringify({ entries: {}, texts: { "john/3/16": JOHN_3_16 } }),
      "purify:reading-history": JSON.stringify([{ kind: "work", href: "/saints/john-chrysostom/on-the-priesthood", label: "On the Priesthood", at: now - 86_400_000 }]),
    };
    const { ctx, page, errors } = await open({ ...size, phone: true, set });
    await page.addInitScript(standInKeyboard, KEYBOARD);
    const cdp = await ctx.newCDPSession(page);

    // Saved: one list, its rows and chips.
    await go(page, "/saved/");
    await page.waitForFunction(() => document.querySelectorAll("[data-saved-row]").length >= 3, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await clean(`${w}px, Saved`, page);
    const rows = await savedRows(page);
    must(rows.length === 3, `${w}px: the verse, the work and the highlight in one list (${rows.length} rows)`);
    must(rows[0]?.href.startsWith("/bible/john/3") && rows[0].text.includes("For God so loved the world"), `${w}px: newest first, a verse with its words ("${rows[0]?.text.slice(0, 60) ?? "no row"}")`);
    const lit = rows.find((r) => r.dot);
    must(
      // The blue disc of the 1.7.1 palette on the dark page (lib/bible/highlightPalette.ts).
      Boolean(lit) && lit.dot.color === "blue" && lit.dot.paint === "rgb(137, 192, 245)" && lit.dot.size <= 12 && lit.text.includes(`${en["saved.kind.highlight"]} · ${en["bible.highlight.idea.questions"]}`),
      `${w}px: a highlight's colour is a small dot by its name (${lit ? `${lit.dot.paint}, ${lit.dot.size}px, "${lit.text.slice(0, 40)}"` : "no dot"})`,
    );
    must(rows.length > 0 && rows.every((r) => r.stripe === 0 && r.plain), `${w}px: no row has a side stripe or a tinted box`);
    const chips = await chipsOn(page);
    // A starred section of a work is a writing from 1.8 (lib/saved/feed.ts):
    // Saints holds the saints themselves.
    const wantChips = ["common.all", "study.saved.verses", "saved.filter.highlights", "saved.filter.writings", "study.saved.history"].map((k) => en[k]);
    must(JSON.stringify(chips.map((c) => c.text)) === JSON.stringify(wantChips) && chips[0]?.on, `${w}px: the chips read ${chips.map((c) => c.text).join(", ") || "nothing"}, All chosen and History last`);
    await page.screenshot({ path: path.join(SHOTS, `saved-${w}.png`), fullPage: true });

    // A swipe takes the verse away; Undo brings it back.
    const swiped = await swipeAway(cdp, page, "[data-saved-row]");
    const gone = await page.evaluate(() => ({
      rows: document.querySelectorAll("[data-saved-row]").length,
      undo: document.querySelector("[data-undo-bar]")?.textContent ?? "",
      kept: JSON.parse(localStorage.getItem("purify:bookmarks") ?? "[]").map((b) => b.id),
    }));
    must(swiped && gone.rows === 2 && gone.undo.includes(en["saved.removed"]) && !gone.kept.includes("walk-john-3-16"), `${w}px: a swipe takes the verse away and offers Undo (${gone.rows} rows, "${gone.undo}")`);
    const undoAt = await footOf(page, "[data-undo-bar]");
    must(Boolean(undoAt) && (undoAt.tabs === null || undoAt.bottom <= undoAt.tabs + 1) && undoAt.right <= undoAt.vw, `${w}px: Undo stands over the tab bar, inside the screen`);
    await page.screenshot({ path: path.join(SHOTS, `saved-undo-${w}.png`) });
    await tap(page.locator("[data-undo-bar] button"));
    await page.waitForTimeout(700);
    const back = await savedRows(page);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("purify:bookmarks") ?? "[]").map((b) => b.id));
    must(back.length === 3 && back[0]?.href.startsWith("/bible/john/3") && kept.includes("walk-john-3-16"), `${w}px: Undo brings it back where it was (${back.length} rows)`);

    await tap(page.locator(`[aria-label="${en["saved.filtersLabel"]}"] button`, { hasText: en["saved.filter.highlights"] }));
    await page.waitForTimeout(500);
    const only = await savedRows(page);
    must(only.length === 1 && Boolean(only[0].dot), `${w}px: Highlights shows the highlighted verse alone (${only.length} row${only.length === 1 ? "" : "s"})`);
    // Under Highlights, the colours by their names, and the way to name them (1.7.1).
    const colorChips = await page.evaluate((label) => [...document.querySelectorAll(`[aria-label="${label}"] button`)].map((b) => (b.textContent ?? "").trim()), en["saved.colorFilterLabel"]);
    must(
      colorChips.includes(en["bible.highlight.idea.questions"]) && colorChips.includes(en["bible.highlightNames.open"]),
      `${w}px: under Highlights a chip by the colour's name, and Name colors (${colorChips.join(", ") || "no row"})`,
    );

    // The You tab's Verses opens Saved on its chip.
    await go(page, "/account/");
    await page.waitForTimeout(600);
    await go(page, "/saved/?kind=verses");
    await page.waitForFunction(() => document.querySelectorAll("[data-saved-row]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    const deep = (await chipsOn(page)).filter((c) => c.on).map((c) => c.text);
    must(deep.length === 1 && deep[0] === en["study.saved.verses"], `${w}px: /saved?kind=verses opens on Verses (${deep.join(", ") || "none chosen"})`);
    await tap(page.locator("[data-saved-row]").first());
    await page.waitForFunction(() => location.pathname.startsWith("/bible/john/3"), null, { timeout: 20000 }).catch(() => {});
    must(new URL(page.url()).pathname.startsWith("/bible/john/3"), `${w}px: a tap opens the verse in its chapter (${new URL(page.url()).pathname}${new URL(page.url()).hash})`);

    // Reading plans: the list, a plan's day, Begin, the bar, Done, the finish.
    // From 1.9 (the owner's pick for Practice, A and B) the list is Continue,
    // which a reader with none begun does not have, then every plan as a
    // picture tile; the season's plan stands apart as its own card from two
    // weeks before its season to the feast (lib/plans/season.ts), so the
    // walk's date decides whether the Nativity is a card or a tile.
    await go(page, "/plans/");
    await page.waitForFunction(() => document.querySelectorAll("[data-plans-tiles] [data-plan-tile]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    await clean(`${w}px, Reading plans`, page);
    const listed = await page.evaluate(() => ({
      tiles: [...document.querySelectorAll("[data-plans-tiles] [data-plan-tile]")].map((a) => `${a.getAttribute("data-plan-tile")} ${(a.getAttribute("href") ?? "").replace(/\/$/, "")}`),
      season: (document.querySelector("[data-plans-season] a")?.getAttribute("href") ?? "").replace(/\/$/, "") || null,
      continuing: Boolean(document.querySelector("[data-plans-continue]")),
    }));
    // Every plan the app has, in its order (lib/plans/plans.ts, READING_PLANS),
    // read from the source so a new plan does not leave this list behind (it
    // did: Acts, the New Testament and Holy Week came in 1.9). A season's
    // plan out of its season is a tile like the rest.
    const source = fs.readFileSync(path.resolve("lib/plans/plans.ts"), "utf8");
    const listAt = source.indexOf("export const READING_PLANS");
    const PLANS = [...source.slice(listAt, source.indexOf("\n];", listAt)).matchAll(/\bid: "([a-z0-9-]+)"/g)].map((m) => m[1]);
    const SEASONS = [...source.slice(listAt, source.indexOf("\n];", listAt)).matchAll(/\bid: "([a-z0-9-]+)", strand: "[a-z]+", season:/g)].map((m) => `/plans/${m[1]}`);
    const tilesWanted = PLANS.filter((id) => `/plans/${id}` !== listed.season).map((id) => `${id} /plans/${id}`);
    must(
      PLANS.length > 0 && !listed.continuing && (listed.season === null || SEASONS.includes(listed.season)) && JSON.stringify(listed.tiles) === JSON.stringify(tilesWanted),
      `${w}px: every plan, none begun: ${listed.season ? `the season's card (${listed.season}), then ` : ""}the tiles (${listed.tiles.map((x) => x.split(" ")[0]).join(", ")})`,
    );
    await tap(page.locator('[data-plans-tiles] [data-plan-tile="gospels"]'));
    await page.waitForFunction(() => !!document.querySelector("[data-plan-today]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await clean(`${w}px, the Gospels plan`, page);
    const card = await page.evaluate(() => ({
      text: (document.querySelector("[data-plan-today]")?.innerText ?? "").replace(/\s+/g, " "),
      locked: !!document.querySelector("[data-plan-begin] span"),
      path: document.querySelectorAll("[data-plan-path] ol > li").length,
    }));
    must(
      card.text.includes(fill(en["plans.dayOf"], { day: 1, total: 89 })) && card.text.includes("Matthew 1") && card.text.includes(flat(guide.gospels.days[0].intro).slice(0, 40)),
      `${w}px: the day's card first: Day 1 of 89, Matthew 1, and what to watch for`,
    );
    must(card.path >= 5, `${w}px: the plan's days as a path under it (${card.path} days shown)`);
    await page.screenshot({ path: path.join(SHOTS, `plan-today-${w}.png`), fullPage: true });
    if (card.locked) {
      await tap(page.locator("[data-plan-begin]"));
      await page.waitForTimeout(900);
      must(await page.evaluate(() => !!document.querySelector("[role=dialog]")), `${w}px: this build locks Plus on the walk's phone, and Begin opens the upgrade sheet`);
      console.log("  ..  so the day's session, its finish and the journal's writing were not walked");
      await ctx.close();
      continue;
    }

    await tap(page.locator("[data-plan-begin]"));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/matthew/1") && !!document.querySelector("[data-plan-bar]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const bar = await page.evaluate(() => ({ text: (document.querySelector("[data-plan-bar]")?.innerText ?? "").replace(/\s+/g, " ").trim(), n: document.querySelectorAll("[data-plan-bar]").length }));
    const barAt = await footOf(page, "[data-plan-bar]");
    must(bar.n === 1 && bar.text.startsWith(fill(en["plans.dayOf"], { day: 1, total: 89 })) && bar.text.includes("Matthew 1"), `${w}px: Begin opens Matthew 1 with the plan's bar at its foot ("${bar.text}")`);
    must(Boolean(barAt) && (barAt.tabs === null || barAt.bottom <= barAt.tabs + 1) && barAt.right <= barAt.vw, `${w}px: the bar stands over the tab bar, inside the screen (ends at ${barAt?.bottom ?? "?"}, the tabs at ${barAt?.tabs ?? "none"})`);
    await page.screenshot({ path: path.join(SHOTS, `plan-bar-${w}.png`) });

    await tap(page.locator("[data-plan-done]"));
    await page.waitForFunction(() => location.pathname.startsWith("/plans/gospels") && !!document.querySelector("[data-plan-finish]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await clean(`${w}px, the day's finish`, page);
    const finish = await page.evaluate(() => {
      const q = document.querySelector("[data-plan-questions]");
      return {
        title: document.querySelector("[data-plan-finish] h2")?.textContent?.trim() ?? "",
        questions: q ? [...q.querySelectorAll("label")].map((l) => (l.textContent ?? "").trim()) : [],
        fields: q ? q.querySelectorAll("input").length : 0,
        saying: (document.querySelector("[data-plan-saying]")?.innerText ?? "").replace(/\s+/g, " "),
        tomorrow: (document.querySelector("[data-plan-tomorrow]")?.innerText ?? "").replace(/\s+/g, " "),
        done: JSON.parse(localStorage.getItem("purify:plans") ?? "{}").gospels?.done ?? {},
      };
    });
    must(finish.title === fill(en["plans.finish.title"], { day: 1 }) && "0" in finish.done, `${w}px: Done keeps the day, and the plan's page opens on its finish ("${finish.title}")`);
    must(
      finish.fields === 2 && finish.questions[0] === flat(guide.gospels.days[0].q) && finish.questions[1] === flat(guide.gospels.pool[0]),
      `${w}px: two questions to answer in a line, the day's own and one of the plan's (${finish.questions.map((q) => q.slice(0, 32)).join(" | ")})`,
    );
    const say = sayings.gospels?.["1"];
    // A saying from a book the library holds is cited by that book's own
    // divisions and opens there (its `at`); one from elsewhere keeps its heading.
    const cite = say?.at?.place ?? say?.work;
    must(
      Boolean(say) && finish.saying.includes(flat(say.text).slice(0, 48)) && finish.saying.includes(say.author) && finish.saying.includes(cite),
      `${w}px: the day's saying of the Fathers, word for word and cited (${say ? `${say.author}, ${cite}` : "none in the data"})`,
    );
    must(finish.tomorrow.includes(fill(en["plans.dayOf"], { day: 2, total: 89 })) && finish.tomorrow.includes("Matthew 2"), `${w}px: and tomorrow ("${finish.tomorrow.slice(0, 70)}")`);
    await page.screenshot({ path: path.join(SHOTS, `plan-finish-${w}.png`), fullPage: true });

    const answer = "To keep still, and do what is asked.";
    await page.locator("[data-plan-questions] input").first().fill(answer);
    await tap(page.locator("[data-plan-questions] button", { hasText: en["plans.finish.keep"] }));
    await page.waitForTimeout(700);
    const answered = await page.evaluate(() => ({
      said: document.querySelector("[data-plan-finish] p[role=status]")?.textContent ?? "",
      journal: JSON.parse(localStorage.getItem("purify:journal") ?? "[]"),
    }));
    must(
      answered.said.includes(en["plans.finish.kept"]) && answered.journal.length === 1 && answered.journal[0].body === answer && answered.journal[0].kind === "question" && answered.journal[0].prompt?.key === "gospels.d1.q",
      `${w}px: an answer kept goes to the journal with its question (${answered.journal.length} entr${answered.journal.length === 1 ? "y" : "ies"})`,
    );
    await tap(page.locator("[data-plan-finish] button", { hasText: en["plans.finish.back"] }));
    await page.waitForFunction(() => !!document.querySelector("[data-plan-today]"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    const day2 = await page.evaluate(() => ({
      card: (document.querySelector("[data-plan-today]")?.innerText ?? "").replace(/\s+/g, " "),
      read: [...document.querySelectorAll('[data-plan-path] button[aria-pressed="true"]')].map((b) => b.getAttribute("aria-label")),
    }));
    must(
      day2.card.includes(fill(en["plans.dayOf"], { day: 2, total: 89 })) && day2.read.length === 1 && day2.read[0] === fill(en["plans.markUnread"], { day: 1 }),
      `${w}px: back on the plan, day 2 is next and day 1 is marked on the path (${day2.read.join(", ") || "none marked"})`,
    );

    // A kathisma is several psalms: Next walks them, and the way out ends it.
    await go(page, "/plans/psalter/");
    await page.waitForFunction(() => !!document.querySelector("[data-plan-begin]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    await tap(page.locator("[data-plan-begin]"));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/psalms/1") && !!document.querySelector("[data-plan-bar]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    const barText = () => page.evaluate(() => (document.querySelector("[data-plan-bar]")?.innerText ?? "").replace(/\s+/g, " ").trim());
    const k1 = await barText();
    const many = Number(/· 1 of (\d+)/.exec(k1)?.[1] ?? 0);
    must(k1.startsWith(fill(en["plans.dayOf"], { day: 1, total: 20 })) && many > 1, `${w}px: the Psalter's first day is a kathisma of ${many} psalms ("${k1}")`);
    await tap(page.locator("[data-plan-bar] ~ button").last());
    await page.waitForFunction(() => location.pathname.startsWith("/bible/psalms/2"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const k2 = await barText();
    must(new URL(page.url()).pathname.startsWith("/bible/psalms/2") && k2.includes(`· ${fill(en["readingsFlow.of"], { n: 2, total: many })}`), `${w}px: Next walks on to the second psalm ("${k2}")`);
    await tap(page.locator(`[data-plan-bar] ~ button[aria-label="${en["plans.bar.leave"]}"]`));
    await page.waitForTimeout(600);
    must(!(await page.evaluate(() => !!document.querySelector("[data-plan-bar]"))), `${w}px: and the way out takes the bar away`);

    // The journal: the kept answer, one Write button, the sheet above the keyboard.
    await go(page, "/journal/");
    await page.waitForFunction(() => document.querySelectorAll("[data-journal-entry]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    await clean(`${w}px, the journal`, page);
    const first = await page.evaluate(() => (document.querySelector("[data-journal-entry]")?.innerText ?? "").replace(/\s+/g, " "));
    must(first.includes(answer) && first.includes(flat(guide.gospels.days[0].q).slice(0, 30)) && first.includes(en["journal.kind.question"]), `${w}px: the answer is in the journal under its question ("${first.slice(0, 70)}")`);
    // Today's page (1.9, docs/1.9-build/JOURNAL.md): the weekday in Lora, the
    // date and the Church's day under it, and the day's readings to write
    // from, each a row to tap. Write is the journal's one button, below.
    const todayPage = await page.evaluate(() => {
      const s = document.querySelector("[data-journal-today]");
      const head = s?.querySelector("[role=heading]");
      if (!s || !head) return null;
      return {
        head: head.textContent ?? "",
        font: getComputedStyle(head).fontFamily,
        line: head.nextElementSibling?.textContent ?? "",
        rows: [...s.querySelectorAll("button")].map((b) => ({ text: (b.innerText ?? "").replace(/\s+/g, " ").trim(), h: Math.round(b.getBoundingClientRect().height) })),
      };
    });
    const onDay = new Date();
    must(Boolean(todayPage) && todayPage.head === new Intl.DateTimeFormat("en", { weekday: "long" }).format(onDay) && /Lora/.test(todayPage.font), `${w}px: today's page is headed by the weekday in Lora ("${todayPage?.head}")`);
    must(Boolean(todayPage) && todayPage.line.startsWith(new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(onDay)) && todayPage.line.includes(" · "), `${w}px: under it the date and the Church's day ("${todayPage?.line.slice(0, 90)}")`);
    must(
      Boolean(todayPage) && todayPage.rows.length >= 1 && todayPage.rows.every((r) => r.h >= 44 && r.text !== en["journal.write"]),
      `${w}px: the day's readings, every row 44px or more, and no second Write (${todayPage?.rows.map((r) => `${r.text.slice(0, 28)} ${r.h}`).join(", ")})`,
    );
    // A reading's pen begins a page about it, named and with the way back to it.
    await tap(page.locator("[data-journal-today] li button").first());
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const fromReading = await page.evaluate(() => {
      const c = document.querySelector("[data-journal-composer]");
      return c ? { text: (c.innerText ?? "").replace(/\s+/g, " "), href: c.querySelector("a[href*='/bible/']")?.getAttribute("href") ?? "" } : null;
    });
    must(
      Boolean(fromReading) && [en["bible.kindGospelLong"], en["bible.kindEpistleLong"], en["bible.kindOtLong"]].some((k) => fromReading.text.includes(`${k} · `)) && /\/bible\/[a-z0-9-]+\/\d+\/?#v\d+$/.test(fromReading.href),
      `${w}px: a reading's pen opens a page named for the reading, with the way back to it ("${fromReading?.text.slice(0, 60)}", ${fromReading?.href})`,
    );
    await tap(page.locator("[role=dialog] button", { hasText: en["common.close"] }).first());
    await page.waitForTimeout(700);
    const pill = await footOf(page, "[data-journal-write]");
    must(Boolean(pill) && pill.height >= 44 && (pill.tabs === null || pill.bottom <= pill.tabs + 1) && pill.text === en["journal.write"], `${w}px: one Write button in reach at the foot, over the tab bar (${pill ? `"${pill.text}", ends at ${pill.bottom}` : "none"})`);
    must(await page.evaluate(() => window.__standInKeyboard === true && window.visualViewport.height === innerHeight), `${w}px: the stand-in keyboard is in place, and down`);
    const write = page.locator("[data-journal-write]:visible").first();
    await tap(write);
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1100);
    const sheet = await page.evaluate(() => {
      const c = document.querySelector("[data-journal-composer]");
      const panel = c?.closest(".rounded-t-3xl");
      const area = c?.querySelector("textarea");
      const done = document.querySelector("[data-journal-done]");
      if (!panel || !area || !done) return null;
      const p = panel.getBoundingClientRect();
      return {
        top: Math.round(p.top),
        bottom: Math.round(p.bottom),
        visible: Math.round(window.visualViewport.height),
        inner: innerHeight,
        done: Math.round(done.getBoundingClientRect().bottom),
        area: Math.round(area.getBoundingClientRect().top),
        focused: document.activeElement === area,
      };
    });
    must(Boolean(sheet) && sheet.focused, `${w}px: Write opens the writing sheet with the words ready to write`);
    must(
      Boolean(sheet) && sheet.visible <= sheet.inner - KEYBOARD + 1 && sheet.bottom <= sheet.visible + 1 && sheet.top <= 60 && sheet.done <= sheet.visible && sheet.area < sheet.visible - 40,
      `${w}px: the sheet fills what the keyboard leaves, Done and the line being written above it (sheet ${sheet ? `${sheet.top}..${sheet.bottom}` : "none"}, the keyboard from ${sheet?.visible ?? "?"})`,
    );
    await page.screenshot({ path: path.join(SHOTS, `journal-writing-${w}.png`) });
    await page.keyboard.type("Lord, have mercy on the day just read.");
    await page.waitForTimeout(300);
    await tap(page.locator("[data-journal-done]"));
    await page.waitForTimeout(900);
    const wrote = await page.evaluate(() => ({
      open: !!document.querySelector("[data-journal-composer]"),
      entries: [...document.querySelectorAll("[data-journal-entry]")].map((e) => (e.innerText ?? "").replace(/\s+/g, " ")),
    }));
    must(!wrote.open && wrote.entries.length === 2 && wrote.entries.some((t) => t.includes("Lord, have mercy on the day just read.")), `${w}px: Done keeps the entry in the list (${wrote.entries.length} entries)`);

    // Close keeps what was written, and Write goes on with it.
    await tap(write);
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.keyboard.type("Half a thought");
    await tap(page.locator("[role=dialog] button", { hasText: en["common.close"] }).first());
    await page.waitForTimeout(900);
    const draft = await page.evaluate(() => ({ open: !!document.querySelector("[data-journal-composer]"), text: localStorage.getItem("purify:journal.draft") ?? "" }));
    const again = await footOf(page, "[data-journal-write]");
    must(!draft.open && draft.text.includes("Half a thought") && again?.text === en["journal.continueWriting"], `${w}px: Close keeps what was written, and the button goes on with it ("${again?.text ?? "none"}")`);

    // A swipe takes an entry away; Undo stands where Write was, and brings it back.
    const before = await page.evaluate(() => document.querySelectorAll("[data-journal-entry]").length);
    const swipedEntry = await swipeAway(cdp, page, "[data-journal-entry]");
    const mid = await page.evaluate(() => ({
      n: document.querySelectorAll("[data-journal-entry]").length,
      undo: document.querySelector("[data-undo-bar]")?.textContent ?? "",
      write: [...document.querySelectorAll("[data-journal-write]")].some((x) => x.getBoundingClientRect().width > 0),
    }));
    must(swipedEntry && mid.n === before - 1 && mid.undo.includes(en["journal.deleted"]) && !mid.write, `${w}px: a swipe takes an entry away, and Undo stands where Write was (${mid.n} of ${before})`);
    await tap(page.locator("[data-undo-bar] button"));
    await page.waitForTimeout(700);
    must((await page.evaluate(() => document.querySelectorAll("[data-journal-entry]").length)) === before, `${w}px: Undo brings the entry back`);

    // A past day is headed as a diary's page is: its weekday in Lora, then its
    // date, its feast or saints, and its fast when it keeps one.
    const past = new Date(onDay.getFullYear(), onDay.getMonth(), onDay.getDate() - 2, 10);
    await page.evaluate((iso) => {
      const all = JSON.parse(localStorage.getItem("purify:journal") ?? "[]");
      all.push({ id: "00000000-0000-4000-8000-000000000040", kind: "reflection", body: "Written two days before.", createdAt: iso, updatedAt: iso });
      localStorage.setItem("purify:journal", JSON.stringify(all));
    }, past.toISOString());
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll("[data-journal-day]").length >= 2, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const pastDay = await page.evaluate(() => {
      const heads = [...document.querySelectorAll("[data-journal-day]")];
      const last = heads[heads.length - 1];
      const next = last?.nextElementSibling;
      return last ? { head: last.textContent ?? "", font: getComputedStyle(last).fontFamily, line: next?.matches("[data-journal-day-line]") ? (next.textContent ?? "") : "" } : null;
    });
    must(
      Boolean(pastDay) && pastDay.head === new Intl.DateTimeFormat("en", { weekday: "long" }).format(past) && /Lora/.test(pastDay.font) && pastDay.line.startsWith(new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(past)) && pastDay.line.includes(" · "),
      `${w}px: a past day is headed by its weekday in Lora, then its date and its Church's day ("${pastDay?.head}", "${pastDay?.line.slice(0, 90)}")`,
    );
    // A page (1.9, docs/1.9-build/JOURNAL.md): a title, a verse card found
    // with Verse, Plus's checklist from More, kept as text and opened again as
    // it was. The walk's shell locks no Plus, so More adds its blocks here.
    await tap(page.locator("[data-journal-write]:visible").first());
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer] [data-journal-title]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.locator("[data-journal-title]").fill("A page of the walk");
    await tap(page.locator("[data-page-toolbar] button", { hasText: en["journal.page.addVerse"] }));
    await page.waitForTimeout(400);
    await page.keyboard.type("John 3:16");
    await page.waitForTimeout(500);
    await tap(page.locator("[data-page-verse-finder] li button").first());
    await page.waitForTimeout(500);
    await tap(page.locator("[data-page-toolbar] button", { hasText: en["journal.page.more"] }));
    await tap(page.locator("[data-page-more] button", { hasText: en["journal.page.checklist"] }));
    await page.waitForTimeout(300);
    await page.keyboard.type("First line");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second line");
    await page.waitForTimeout(300);
    const written = await page.evaluate(() => JSON.parse(localStorage.getItem("purify:journal.draft") ?? "{}").body ?? "");
    must(
      // The kept draft's words first ("Half a thought", from Close above), then
      // the card where the caret was, after them.
      written.startsWith("# A page of the walk") && /Half a thought[\s\S]*\[\[verse john 3:16\]\]/.test(written) && written.includes("- [ ] First line\n- [ ] Second line"),
      `${w}px: a page is kept as text, its title, its verse card and its checklist, every letter on its line ("${written.replace(/\n/g, " | ").slice(0, 110)}")`,
    );
    await tap(page.locator("[data-journal-done]"));
    await page.waitForTimeout(900);
    const titled = await page.evaluate(() => [...document.querySelectorAll("[data-journal-entry-title]")].map((e) => e.textContent ?? ""));
    must(titled.includes("A page of the walk"), `${w}px: the list shows the page by its title (${titled.join(", ")})`);
    await tap(page.locator("[data-journal-entry]", { hasText: "A page of the walk" }).first());
    await page.waitForTimeout(900);
    const reopened = await page.evaluate(() => ({
      title: document.querySelector("[data-journal-title]")?.value ?? "",
      card: document.querySelector("[data-page-verse] figcaption")?.textContent ?? "",
      lines: [...document.querySelectorAll("[data-page-check] input")].map((i) => i.value),
    }));
    must(
      reopened.title === "A page of the walk" && reopened.card === "John 3:16" && reopened.lines.join("|") === "First line|Second line",
      `${w}px: the page opens again as it was (${reopened.title}, ${reopened.card}, ${reopened.lines.join("|")})`,
    );
    await tap(page.locator("[role=dialog] button", { hasText: en["common.close"] }).first());
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(SHOTS, `journal-${w}.png`), fullPage: true });
    must(errors.length === 0, `${w}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 41. The reading room, a Netflix for books (1.7).
// The owner's note 18 of 2026-10-16: a cover for every work, rows to swipe by
// theme and by tradition, keywords and tags, and a book's page with its
// cover, its facts, its chapters, Start reading and More like this.
// lib/reading/__tests__ hold the data and the source; this is how the built
// app draws it. The walk has no network, so the covers the apps ask of the
// website cannot load: each must fall back to its plate, never a broken
// picture, and the icons the app carries must draw.
await section(41, async () => {
  console.log("\n41. The reading room");
  const CARRIED = JSON.parse(fs.readFileSync(path.resolve("lib/media/carriedCovers.json"), "utf8")).covers;
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const GLYPHS = [0x2190, 0x2192, 0x203a, 0x2039, 0x2713, 0x2726, 0x2605, 0x2014].map((c) => String.fromCharCode(c));
  const PASSIONS = ["gluttony", "lust", "avarice", "anger", "sorrow", "acedia", "vainglory", "pride"].map((id) => en[`reading.theme.${id}`]);
  for (const p of ["/reading/", "/saints/john-cassian/institutes/", "/saints/athanasius-the-great/on-the-incarnation/"]) must(inBundle(OUT, p), `${p} is in the bundle`);

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/reading/");
    await page.waitForFunction(() => !!document.querySelector("[data-reading-row='passions'] li"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector("[data-featured]")?.getAttribute("data-featured") !== "pending", null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Every picture on the page asked for: a cover loads as it nears the screen.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    const room = await page.evaluate(({ glyphs, carried }) => {
      const rows = [...document.querySelectorAll("[data-reading-row]")].map((r) => r.getAttribute("data-reading-row"));
      const passions = [...document.querySelectorAll("[data-reading-row='passions'] li")].map((li) => li.querySelector("[data-tile-label]")?.textContent?.trim() ?? "");
      const tiles = document.querySelectorAll("[data-reading-row] li").length;
      const imgs = [...document.querySelectorAll("[data-reading-row] img, [data-featured] img")];
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getClientRects().length > 0).map((i) => i.getAttribute("src"));
      const pictures = imgs.map((i) => i.getAttribute("src") ?? "").filter((src) => !src.startsWith("/saints/icons/"));
      // The covers the apps carry (lib/media/carried.ts): drawn from the bundle, so with no network they load.
      const carriedShown = imgs.filter((i) => carried.includes(i.getAttribute("src") ?? ""));
      const text = (document.querySelector("[data-route-content]") ?? document.body).innerText;
      return {
        rows,
        passions,
        tiles,
        broken,
        pictures,
        carriedShown: carriedShown.length,
        carriedUnloaded: carriedShown.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("src")),
        featured: document.querySelector("[data-featured]")?.getAttribute("data-featured") ?? null,
        h1: document.querySelector("[data-tab-topbar] h1")?.textContent?.trim() ?? null,
        glyphs: glyphs.filter((g) => text.includes(g)),
      };
    }, { glyphs: GLYPHS, carried: CARRIED });
    must(["begin", "passions", "virtues", "life", "tradition-greek", "tradition-latin", "tradition-desert", "short"].every((r) => room.rows.includes(r)), `${size.width}px: the rows are drawn (${room.rows.join(", ")})`);
    must(room.passions.join("|") === PASSIONS.join("|"), `${size.width}px: the passions row is the eight, in Cassian's order (${room.passions.join(", ")})`);
    must(room.tiles >= 60, `${size.width}px: covers to swipe (${room.tiles} on the rows)`);
    must(Boolean(room.featured) && room.featured !== "pending", `${size.width}px: a book stands at the top for the day (${room.featured})`);
    must(room.broken.length === 0, `${size.width}px: no broken picture with no network: a cover the website holds falls back to its plate${room.broken.length ? ": " + room.broken.slice(0, 3).join(", ") : ""}`);
    // A settled picture is an icon the app carries, or a cover the website
    // serves from its covers (public/covers): a saint's own (authors/) and,
    // from 1.9's build 89 note 3, a council's icon on its books (councils/)
    // and a How you feel door's saint (feelings/), which a borrowed cover
    // shares. The website is the build's SITE_URL (lib/site.ts): purifyapp.net
    // where the build is given it, as the store builds are, and Render's own
    // name for the same site where it is not, as in a build made here. From
    // build 90 note 5 the pictures the website cannot serve yet are carried
    // (lib/media/carried.ts): their address is the bundle's own, the file is in
    // the export itself, and one asked of the website is not settled.
    const settled = (src) => {
      if (CARRIED.includes(src)) return fs.existsSync(path.join(OUT, src.slice(1)));
      const file = /^https:\/\/purifyapp\.(?:net|onrender\.com)\/(covers\/(?:authors|councils|feelings)\/[a-z0-9-]+\.v\d+\.jpg)$/.exec(src)?.[1];
      return Boolean(file) && !CARRIED.includes(`/${file}`) && fs.existsSync(path.resolve("public", file));
    };
    const foreign = room.pictures.filter((src) => !settled(src));
    must(foreign.length === 0, `${size.width}px: every picture is a settled one${foreign.length ? ": " + foreign.slice(0, 3).join(", ") : ""}`);
    must(room.carriedShown > 0 && room.carriedUnloaded.length === 0, `${size.width}px: the covers the apps carry load from the bundle with no network (${room.carriedShown} drawn${room.carriedUnloaded.length ? "; not loaded: " + room.carriedUnloaded.slice(0, 3).join(", ") : ""})`);
    must(room.h1 === en["nav.reading"] && room.glyphs.length === 0, `${size.width}px: the tab bar names the room, and no character is set as an icon${room.glyphs.length ? ": " + room.glyphs.join(" ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, `reading-room-${size.width}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `reading-room-${size.width}-full.png`), fullPage: true });

    if (size.width === 390) {
      // The search: words narrow the grid, a filter's sheet narrows it again,
      // and a result opens the work at the part its theme names.
      await tap(page.locator("form[role=search] input"));
      await page.keyboard.type("Cassian");
      await page.waitForTimeout(900);
      const typed = await page.evaluate(() => ({ results: document.querySelectorAll("[data-reading-search] ul li a").length, q: new URL(location.href).searchParams.get("q") }));
      must(typed.results >= 2 && typed.results <= 8 && typed.q === "Cassian", `a search narrows the grid and is kept in the address (${typed.results} works, q=${typed.q})`);
      await tap(page.locator("[data-reading-search] button[aria-haspopup=dialog]", { hasText: en["reading.filter.theme"] }).first());
      await page.waitForTimeout(900);
      const sheet = await page.evaluate((title) => !![...document.querySelectorAll("[role=dialog]")].find((d) => d.getAttribute("aria-label") === title), en["reading.filter.theme"]);
      must(sheet, "the theme chip opens the shared sheet");
      await tap(page.locator("[role=dialog] button", { hasText: en["reading.theme.anger"] }).first());
      await page.waitForTimeout(900);
      const filtered = await page.evaluate(() => ({
        hrefs: [...document.querySelectorAll("[data-reading-search] ul li a")].map((a) => a.getAttribute("href")),
        theme: new URL(location.href).searchParams.get("theme"),
      }));
      must(filtered.theme === "anger" && filtered.hrefs.map(bare).includes("/saints/john-cassian/institutes#s157"), `a theme narrows it again, each work opening at its part (${filtered.hrefs.join(", ")})`);
      await tap(page.locator(`[data-reading-search] ${linkTo("/saints/john-cassian/institutes#s157")}`).first());
      await page.waitForTimeout(2500);
      const landed = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, title: document.querySelector("[data-work-head] h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null }));
      const book8 = en["reading.part.book"].replace("{n}", "8");
      must(landed.path === "/saints/john-cassian/institutes/" && landed.hash === "#s157" && String(landed.title).startsWith(book8), `the result opens Cassian's Institutes at Book 8, on its own page (${landed.path}${landed.hash}, "${landed.title}")`);
      await page.goBack();
      await page.waitForTimeout(1800);
      const back = await page.evaluate(() => ({ search: !!document.querySelector("[data-reading-search]"), theme: new URL(location.href).searchParams.get("theme") }));
      must(back.search && back.theme === "anger", `Back comes home to the same search (${back.search ? "open" : "closed"}, theme=${back.theme})`);
    }
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A book's page: since 1.8's round 6 (r3-29 A) the work opens on its words,
  // as the Bible does, and the book's page is About this book, from •••: the
  // cover and its facts, the theme chips to the room, and more like it.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/saints/athanasius-the-great/on-the-incarnation/");
    await page.waitForFunction(() => !!document.querySelector("[data-work-head] h1"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await tap(page.locator(`[data-plates] button[aria-label="${en["bible.moreActions"]}"]`));
    await page.waitForTimeout(700);
    await tap(page.locator("[role=dialog] button", { hasText: en["bible.aboutThisBook"] }).first());
    await page.waitForFunction(() => !!document.querySelector("[data-about-sheet] [data-book-header]"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1800);
    const book = await page.evaluate(() => {
      const head = document.querySelector("[data-about-sheet] [data-book-header]");
      return {
        h1s: document.querySelectorAll("h1").length,
        title: head?.querySelector("h2")?.textContent?.trim() ?? null,
        byline: head?.querySelector("[data-byline]")?.textContent?.trim() ?? null,
        chips: head ? [...head.querySelectorAll("a:is([href^='/reading?theme='], [href^='/reading/?theme='])")].map((a) => a.getAttribute("href")) : [],
        start: head ? [...head.querySelectorAll("a")].map((a) => a.textContent?.trim()) : [],
        cover: !!head?.querySelector("[data-cover]"),
        like: document.querySelectorAll("[data-more-like-this] li").length,
        text: document.body.innerText.length,
      };
    });
    must(book.h1s === 1 && book.title === "On the Incarnation" && book.cover, `About this book: its cover and its title, under the page's one heading (${book.h1s} h1, "${book.title}")`);
    must(book.byline === "By St. Athanasius the Great", `it is by St Athanasius, as the text is his ("${book.byline}")`);
    must(book.chips.map(bare).includes("/reading?theme=pascha") && book.start.includes(en["reading.work.start"]), `its themes lead to the room, and Start reading is there (${book.chips.join(", ")})`);
    must(book.like >= 4 && book.text > 1500, `More like this follows (${book.like} works; ${book.text} characters on the page)`);
    await page.screenshot({ path: path.join(SHOTS, "book-page-390.png") });
    await tap(page.locator(`[data-book-header] ${linkTo("/reading?theme=pascha")}`));
    await page.waitForTimeout(2500);
    const room = await page.evaluate(() => ({
      path: location.pathname,
      theme: new URL(location.href).searchParams.get("theme"),
      results: document.querySelectorAll("[data-reading-search] ul li").length,
    }));
    must(room.path === "/reading/" && room.theme === "pascha" && room.results >= 3, `a theme on a book's page lands on the room, filtered (${room.path}?theme=${room.theme}, ${room.results} works)`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A tablet: the same room, wider covers, the day's book beside its words.
  {
    const { ctx, page } = await open({ width: 820, height: 1180, phone: true });
    await go(page, "/reading/");
    await page.waitForFunction(() => document.querySelector("[data-featured]")?.getAttribute("data-featured") !== "pending", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const wide = await page.evaluate(() => {
      const hero = document.querySelector("[data-featured]");
      const cover = hero?.querySelector("a")?.getBoundingClientRect();
      const title = hero?.querySelector("h2")?.getBoundingClientRect();
      const tile = document.querySelector("[data-reading-row] li")?.getBoundingClientRect();
      return { side: Boolean(cover && title && title.left > cover.right), tile: tile ? Math.round(tile.width) : 0 };
    });
    const out = await page.evaluate(sticksOut);
    must(wide.side && wide.tile >= 140 && out.length === 0, `820px: the day's book stands beside its words, covers ${wide.tile}px wide, nothing past the edge${out.length ? ": " + out.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, "reading-room-820.png") });
    await ctx.close();
  }
});
// ---- 42. Orthodox History (1.7).
// The owner's note 20 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md): the timeline's coloured era backgrounds "need redoing", it
// "still uses the red dot", every section is "barely written", and it needs
// "better structure and photos". Now: one quiet line with a drawn mark on each
// event, each era's name pinned under the bar, a tap opening the event's peek
// sheet, and each event's page in four parts with its picture at the top. The
// pictures are the website's (lib/history/media.ts): this walk has no
// network, so it is also the app with no signal, where an event page must
// stand without its picture and show no broken one.
// lib/history/__tests__/calmHistory.test.ts reads the source; this is how the
// built app draws it.
await section(42, async () => {
  console.log("\n42. Orthodox History");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  must(!fs.existsSync(path.join(OUT, "history", "media")), "no History picture ships inside the app: they stay on the website");

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/history/");
    await page.waitForFunction(() => !!document.querySelector("h1#history-title") && !!document.querySelector("[data-event-slug]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const top = await page.evaluate(() => {
      const bars = document.querySelectorAll("[data-mobile-topbar]");
      const head = document.querySelector(".history-era-head");
      const marks = document.querySelectorAll("[data-event-slug] [data-timeline-node]").length;
      const rows = document.querySelectorAll("[data-event-slug]").length;
      // Anything painted red on the line: the 1.6 dot was bg-crimson.
      const red = [...document.querySelectorAll("[data-event-slug] *, .history-era-head *")].filter((el) => {
        const c = getComputedStyle(el).backgroundColor.match(/\d+/g)?.map(Number) ?? [0, 0, 0, 0];
        return c.length >= 3 && c[0] > 150 && c[1] < 90 && c[2] < 90 && (c[3] ?? 1) !== 0;
      }).length;
      return {
        bars: bars.length,
        backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
        h1s: document.querySelectorAll("h1").length,
        sticky: head ? getComputedStyle(head).position : null,
        marks,
        rows,
        red,
        fixedRail: [...document.querySelectorAll("body *")].some((el) => getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().width < 60 && el.getBoundingClientRect().height > 200),
      };
    });
    must(top.bars === 1 && !top.backBar && top.h1s === 1, `${size.width}px: one bar, the page's own, and one heading (${top.bars} bar${top.bars === 1 ? "" : "s"}${top.backBar ? ", and the back bar" : ""}, ${top.h1s} h1)`);
    must(top.sticky === "sticky" && top.rows >= 30 && top.marks === top.rows, `${size.width}px: the era's name pins, and every one of ${top.rows} events wears the drawn mark (${top.marks})`);
    must(top.red === 0 && !top.fixedRail, `${size.width}px: no red dot on the line and no second line at the edge (${top.red} red, rail ${top.fixedRail})`);
    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `${size.width}px: nothing past the screen's edge${out.length ? ": " + out.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, `history-top-${size.width}.png`) });

    // Scrolled into the councils: the pinned name is the era being read.
    await page.evaluate(() => document.getElementById("event-first-council-of-nicaea")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(900);
    const pinned = await page.evaluate(() => {
      const bar = document.querySelector("[data-mobile-topbar]")?.getBoundingClientRect().bottom ?? 0;
      const heads = [...document.querySelectorAll(".history-era-head")].filter((h) => Math.abs(h.getBoundingClientRect().top - bar) <= 2);
      return { era: heads[0]?.querySelector("h2")?.id ?? null, current: document.querySelectorAll("[data-event-slug][data-current]").length };
    });
    must(pinned.era === "era-imperial-conciliar" && pinned.current === 1, `${size.width}px: at Nicaea the pinned name is its era, and one row is the reader's place (${pinned.era}, ${pinned.current} current)`);
    await page.screenshot({ path: path.join(SHOTS, `history-pinned-${size.width}.png`) });

    // A tap on a row opens its peek sheet, and the sheet opens the account.
    await tap(page.locator("#event-first-council-of-nicaea a").first());
    await page.waitForFunction(() => !!document.querySelector("[data-event-peek='first-council-of-nicaea']"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    const peek = await page.evaluate((read) => {
      const p = document.querySelector("[data-event-peek='first-council-of-nicaea']");
      if (!p) return null;
      const link = [...p.querySelectorAll("a")].find((a) => (a.textContent ?? "").trim() === read);
      return { path: location.pathname, link: link?.getAttribute("href") ?? null };
    }, en["study.history.readFullAccount"]);
    must(Boolean(peek) && peek.path === "/history/" && bare(peek.link) === "/history/first-council-of-nicaea", `${size.width}px: a tap on a row opens its peek sheet, on the timeline (${peek ? `${peek.path}, ${peek.link}` : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, `history-peek-${size.width}.png`) });
    await tap(page.locator(`[data-event-peek='first-council-of-nicaea'] ${linkTo("/history/first-council-of-nicaea")}`));
    await page.waitForFunction(() => !!document.querySelector("h1#event-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // The event's page: its own bar, one heading, the four parts, no picture without a signal.
    const event = await page.evaluate(() => ({
      path: location.pathname,
      bars: document.querySelectorAll("[data-mobile-topbar]").length,
      h1s: document.querySelectorAll("h1").length,
      parts: ["event-happened", "event-matters", "event-people", "event-sources"].filter((id) => document.getElementById(id)).length,
      pills: document.querySelectorAll("[data-event-parts] a").length,
      people: document.querySelectorAll("#event-people li").length,
      plates: document.querySelectorAll("[data-event-plate]").length,
      broken: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && i.getClientRects().length > 0).length,
      words: (document.getElementById("event-happened")?.textContent ?? "").split(/\s+/).length,
    }));
    must(event.path === "/history/first-council-of-nicaea/" && event.bars === 1 && event.h1s === 1, `${size.width}px: the event's page, with its own bar and its title the one heading (${event.path})`);
    must(event.parts === 4 && event.pills === 4 && event.people >= 3, `${size.width}px: four parts and the row naming them, and its people (${event.parts} parts, ${event.pills} pills, ${event.people} people)`);
    must(event.words >= 450, `${size.width}px: What happened is an account, not a line (${event.words} words)`);
    must(event.plates === 0 && event.broken === 0, `${size.width}px: with no signal the picture is gone and nothing is broken (${event.plates} plates, ${event.broken} broken)`);
    const outEvent = await page.evaluate(sticksOut);
    must(outEvent.length === 0, `${size.width}px: nothing past the event page's edge${outEvent.length ? ": " + outEvent.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, `history-event-${size.width}.png`) });

    // A pill goes to its part, under the row of parts, and back leaves the page.
    await tap(page.locator("[data-event-parts] a[href='#event-sources']"));
    await page.waitForTimeout(900);
    const jumped = await page.evaluate(() => {
      const row = document.querySelector("[data-event-parts]")?.getBoundingClientRect().bottom ?? 0;
      const top = document.getElementById("event-sources")?.getBoundingClientRect().top ?? -999;
      return { gap: Math.round(top - row), hash: location.hash, current: document.querySelector("[data-event-parts] a[aria-current]")?.getAttribute("href") ?? null };
    });
    must(jumped.gap >= 0 && jumped.gap <= 40 && jumped.hash === "" && jumped.current === "#event-sources", `${size.width}px: Sources lands under the row of parts, the address untouched, its pill filled (${jumped.gap}px, "${jumped.hash}", ${jumped.current})`);
    await page.screenshot({ path: path.join(SHOTS, `history-sources-${size.width}.png`) });
    await page.goBack();
    await page.waitForTimeout(2200);
    const back = await page.evaluate(() => {
      const row = document.getElementById("event-first-council-of-nicaea");
      return { path: location.pathname, top: row ? Math.round(row.getBoundingClientRect().top) : null, vh: window.innerHeight };
    });
    must(back.path === "/history/" && back.top !== null && back.top > 0 && back.top < back.vh, `${size.width}px: back is the timeline, Nicaea's row on the screen (${back.path}, ${back.top}px of ${back.vh})`);
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A tablet in the apps: the same line and pinned names, wider.
  {
    const { ctx, page } = await open({ width: 820, height: 1180, phone: true });
    await go(page, "/history/");
    await page.waitForFunction(() => !!document.querySelector("[data-event-slug]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `820px: the timeline fits the tablet${out.length ? ": " + out.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, "history-820.png") });
    await ctx.close();
  }
});

// ---- 43. Every iPad, both ways round (1.7.1).
// The owner's TestFlight of 1.7 on his iPad, 2026-10-17: the Bible's text sat
// toward the left, and on an event of Orthodox History a tap on a part's pill
// threw the page to its foot instead of landing on that part. Walked at the
// four iPad sizes and their landscape forms, in the iPad app's own user agent:
//  - The reader is measured by its words, not by its column's box. The column
//    stood in the middle all along (section 33) while the computer's verse
//    toolbar, unseen at rest, took about 170px beside every verse and held the
//    words to the left 500px of the column, 90px left of the screen's middle.
//  - History is tapped on a long account and two short ones, where a tall
//    screen runs out of page, with the iPad's status bar and home indicator
//    stood in (env(safe-area-inset-*), 24px and 20px), so the pinned row is
//    seen against the bar it pins under. Then a part is tapped before the
//    event's picture has come and the picture let in after, on a page that
//    keeps no place as it grows, as WebKit keeps none (the walk switches
//    Chromium's scroll anchoring off): the part must not move.
//  - From 1.8's second round the words are Large for a reader who has never
//    chosen a size (22px from the md breakpoint, 19px on an iPad mini held
//    upright), and still a reading measure.
// lib/bible/__tests__/readerScreen.test.ts, lib/reader/__tests__/
// textSize.test.ts and lib/history/__tests__/calmHistory.test.ts hold the
// source.
await section(43, async () => {
  console.log("\n43. Every iPad, both ways round");
  const IPADS = [[744, 1133], [820, 1180], [834, 1194], [1024, 1366], [1133, 744], [1180, 820], [1194, 834], [1366, 1024]];
  // The status bar and the home indicator, as the iPad's WebView reports them.
  const insets = async (ctx, page) => {
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 24, topMax: 24, bottom: 20, bottomMax: 20, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
    } catch (e) {
      must(false, `the iPad's status bar stood in: ${firstLine(e)}`);
    }
  };

  // The reader: the words in the middle, filling the column, at a reading measure.
  for (const [width, height] of IPADS) {
    const where = `John 1 at ${width}x${height}`;
    const { ctx, page, errors } = await open({ width, height, phone: true, userAgent: IPAD_UA });
    await go(page, "/bible/john/1/");
    await page.waitForFunction(() => document.querySelectorAll("[data-verse] p [data-word-idx]").length > 100, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    const got = await page.evaluate(() => {
      const box = (n) => n.getBoundingClientRect();
      const title = document.getElementById("chapter-title");
      const column = title?.parentElement;
      if (!column) return null;
      const rows = [...column.querySelectorAll("[data-verse]")].filter((v) => box(v).height > 0);
      const words = rows.flatMap((v) => [...v.querySelectorAll("p [data-word-idx]")]).filter((w) => box(w).width > 0);
      // A verse's text, the first side of its row (the computer's toolbar is the second).
      const texts = rows.map((v) => v.firstElementChild?.firstElementChild).filter(Boolean);
      let chars = 0;
      let lines = 0;
      for (const v of rows) {
        const ws = [...v.querySelectorAll("p [data-word-idx]")];
        if (ws.length < 12) continue;
        chars += ws.reduce((n, w) => n + (w.textContent ?? "").length + 1, 0);
        lines += new Set(ws.map((w) => Math.round(box(w).top))).size;
      }
      const edges = (n) => (n && box(n).width > 0 ? [Math.round(box(n).left), Math.round(box(n).right)] : null);
      const pager = [...column.querySelectorAll("a[href*='/bible/john/2']")].sort((a, b) => box(b).width - box(a).width)[0];
      return {
        vw: document.documentElement.clientWidth,
        column: [box(column).left, box(column).right],
        left: words.length ? Math.min(...words.map((w) => box(w).left)) : -1,
        right: words.length ? Math.max(...words.map((w) => box(w).right)) : -1,
        narrowest: texts.length ? Math.min(...texts.map((t) => box(t).width)) : 0,
        perLine: lines ? Math.round(chars / lines) : 0,
        // Nothing stands above the title in the column since 1.8: the
        // controls are the round buttons over the page.
        above: title.previousElementSibling ? title.previousElementSibling.tagName : null,
        heading: edges(title.firstElementChild),
        pager: edges(pager),
        size: column.querySelector("article") ? getComputedStyle(column.querySelector("article")).fontSize : null,
      };
    });
    if (!got) {
      must(false, `${where}: the chapter opened`);
      await ctx.close();
      continue;
    }
    const [cl, cr] = got.column;
    const middle = (got.left + got.right) / 2;
    must(Math.abs(middle - got.vw / 2) <= 12, `${where}: the words stand in the middle of the screen (${Math.round(got.left)}..${Math.round(got.right)}, middle ${Math.round(middle)} against ${got.vw / 2})`);
    must(Math.abs(got.left - cl) <= 2 && got.right >= cr - 24 && got.narrowest >= cr - cl - 1, `${where}: they fill the text's column, ${Math.round(cl)}..${Math.round(cr)}, every verse its whole width (the narrowest ${Math.round(got.narrowest)} of ${Math.round(cr - cl)})`);
    must(got.perLine >= 45 && got.perLine <= 75 && cr - cl <= 681, `${where}: a reading measure, ${got.perLine} characters a line in a column ${Math.round(cr - cl)}px wide`);
    // Large is 19px under the md breakpoint (the iPad mini upright), 22px from it.
    const large = width >= 768 ? "22px" : "19px";
    must(got.size === large, `${where}: Large for a reader who has never chosen a size, ${large} (${got.size})`);
    const apart = [["title", got.heading], ["pager", got.pager]].filter(([, e]) => !e || Math.abs(e[0] - cl) > 1 || Math.abs(e[1] - cr) > 1);
    must(apart.length === 0 && got.above === null, `${where}: the title opens the column and keeps its edges, as the pager does${apart.length ? ": " + apart.map(([n, e]) => `${n} ${e ? e.join("..") : "missing"}`).join(", ") : ""}${got.above ? `; a ${got.above} stands above the title` : ""}`);
    if (width === 820 || width === 1180) await page.screenshot({ path: path.join(SHOTS, `ipad-reader-${width}x${height}.png`) });
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // History: every pill lands its part on the foot of the row, the row under the bar.
  const events = ["first-council-of-nicaea", "apologies-of-justin-martyr", "martyrdom-of-ignatius"];
  for (const [width, height] of IPADS) {
    const { ctx, page, errors } = await open({ width, height, phone: true, userAgent: IPAD_UA });
    await insets(ctx, page);
    for (const slug of events) {
      const where = `${slug} at ${width}x${height}`;
      await go(page, `/history/${slug}/`);
      await page.waitForFunction((s) => location.pathname === `/history/${s}/` && !!document.querySelector("[data-event-parts]"), slug, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(700);
      const ids = await page.evaluate(() => [...document.querySelectorAll("[data-event-parts] a")].map((a) => (a.getAttribute("href") ?? "").slice(1)));
      const landed = [];
      for (const id of ids) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        if (!(await tap(page.locator(`[data-event-parts] a[href='#${id}']`)))) continue;
        await page.waitForTimeout(450);
        landed.push(
          await page.evaluate((i) => {
            const row = document.querySelector("[data-event-parts]").getBoundingClientRect();
            const bar = document.querySelector("[data-mobile-topbar]")?.getBoundingClientRect();
            return {
              id: i.replace("event-", ""),
              gap: Math.round(document.getElementById(i).getBoundingClientRect().top - row.bottom),
              filled: document.querySelector("[data-event-parts] a[aria-current]")?.getAttribute("href") === `#${i}`,
              hash: location.hash,
              rowTop: Math.round(row.top),
              barFoot: bar ? Math.round(bar.bottom) : null,
            };
          }, id),
        );
      }
      const ok = ids.length >= 3 && landed.length === ids.length && landed.every((l) => Math.abs(l.gap) <= 2 && l.filled && l.hash === "");
      must(ok, `${where}: every pill lands its part on the row's foot, its own pill filled (${landed.map((l) => `${l.id} ${l.gap}px${l.filled ? "" : ", another pill filled"}`).join("; ") || "no pills"})`);
      if (slug === events[0]) {
        const first = landed[0];
        must(Boolean(first) && first.barFoot !== null && Math.abs(first.rowTop - first.barFoot) <= 1, `${width}x${height}: the row pins at the bar's foot, not under it (the row at ${first?.rowTop}px, the bar's foot at ${first?.barFoot}px)`);
      }
    }
    if (width === 1024) await page.screenshot({ path: path.join(SHOTS, `ipad-history-${width}x${height}.png`) });
    must(errors.length === 0, `History at ${width}x${height}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The picture arrives after the tap, on a page that keeps no place as it grows.
  const media = path.resolve("public/history/media");
  for (const [width, height] of [[820, 1180], [1180, 820]]) {
    const where = `Nicaea's picture arriving after the tap at ${width}x${height}`;
    const { ctx, page, errors } = await open({ width, height, phone: true, userAgent: IPAD_UA });
    let letIn = () => {};
    const held = new Promise((resolve) => (letIn = resolve));
    // The website's picture, from the folder the website serves it from, held
    // until the part has been tapped to. Registered after the shell's own
    // answer, so it is asked first; the bundle's addresses pass on to that.
    await ctx.route(/\/history\/media\/[^/?#]+$/, async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === ORIGIN) return route.fallback();
      const file = path.join(media, path.basename(url.pathname));
      if (!fs.existsSync(file)) return route.abort();
      await held;
      return route.fulfill({ path: file, contentType: "image/jpeg" });
    });
    await insets(ctx, page);
    await go(page, "/history/first-council-of-nicaea/");
    await page.waitForFunction(() => !!document.querySelector("[data-event-parts]") && !!document.querySelector("[data-event-plate] img"), null, { timeout: 20000 }).catch(() => {});
    // WebKit has no scroll anchoring. A rule, not the root's own style, which
    // lib/ui/scrollReset.ts hands back to the browser at the first touch.
    await page.addStyleTag({ content: "html { overflow-anchor: none !important; }" });
    await page.waitForTimeout(600);
    const gapNow = () => page.evaluate(() => Math.round(document.getElementById("event-matters").getBoundingClientRect().top - document.querySelector("[data-event-parts]").getBoundingClientRect().bottom));
    await tap(page.locator("[data-event-parts] a[href='#event-matters']"));
    await page.waitForTimeout(450);
    const before = await gapNow();
    letIn();
    const came = await page
      .waitForFunction(() => { const img = document.querySelector("[data-event-plate] img"); return !!img && img.complete && img.naturalWidth > 0; }, null, { timeout: 10000 })
      .then(() => true, () => false);
    await page.waitForTimeout(500);
    const after = await gapNow();
    must(came && Math.abs(before) <= 2 && Math.abs(after) <= 2, `${where}: Why it matters stays on the row's foot as the picture arrives above it (${before}px, then ${after}px${came ? "" : "; the picture never came"})`);
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 44. The one search opens still (build 87, the owner's notes 82 and 83).
// Build 86 on his phone: the Bible's ••• sheet held two searches doing one
// job (note 82), and "when you click search it leads you to this screen but
// buggy" (note 83). Build 86's export, recorded frame by frame: the screen
// drew "Search", Look in and the doors at its foot, held on the field by a
// spacer over the title, and when the keyboard came up a moment after the tap
// they all jumped up by the keyboard's height, leaving the top third of the
// screen empty; on a first opening a place's kinds arrived with the lists and
// pushed the recent searches down too. The screen stands from the top now,
// and only the field rides the keyboard. The keyboard is stood in late, as a
// phone's comes: up 150ms after the field takes the focus, down 150ms after
// it lets go (one there from the first frame would hide a screen that moves
// when it comes). Every frame is recorded from the first one the screen
// draws, and its title, Look in, the doors and the recent searches must stay
// where that frame put them while the keyboard comes and goes, as a chant
// page's controls do (section 34). Each is opened from a place and must open
// on it: Saints from its own field (the first opening, the lists not yet
// in), then the Bible from the ••• sheet over John 2, whose chapters open on
// the one being read at a book's start, middle and end, then Everything from
// Today's bar.
//
// Under the doors each place shows its own day, his pick B of r3-31: the
// Bible today's readings, Saints who is commemorated today, Everything the
// readings, the leading commemoration and the Hour in brief. The day comes
// with the calendar on the first opening, a moment after the screen, so its
// room is held from the first frame: the block must stand where the first
// frame put it, and its rows must hold still once they are in. A reading
// opens in the day's walk, as Today's do.
// lib/search/__tests__/oneField.test.ts, lib/search/__tests__/day.test.ts
// and lib/bible/__tests__/readerScreen.test.ts hold the source.
await section(44, async () => {
  console.log("\n44. The one search opens still");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const TALL = 915;
  const KEYBOARD = 300;
  const lateKeyboard = ({ kb, after }) => {
    const target = new EventTarget();
    let up = 0;
    let timer;
    const vv = {
      get width() { return innerWidth; },
      get height() { return innerHeight - up; },
      offsetTop: 0,
      offsetLeft: 0,
      get pageTop() { return scrollY; },
      get pageLeft() { return scrollX; },
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: (...a) => target.addEventListener(...a),
      removeEventListener: (...a) => target.removeEventListener(...a),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    try {
      Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
      window.__standInKeyboard = true;
    } catch {
      /* the check below says so */
    }
    const set = (px) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (up === px) return;
        up = px;
        target.dispatchEvent(new Event("resize"));
      }, after);
    };
    const typing = (el) => el instanceof HTMLElement && el.matches("textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])");
    document.addEventListener("focusin", (e) => set(typing(e.target) ? kb : 0), true);
    document.addEventListener("focusout", () => set(0), true);
  };
  const { ctx, page, errors } = await open({ width: 412, height: TALL, phone: true, set: { "purify:search:words": JSON.stringify(["pascha", "jesus prayer", "basil"]) } });
  await page.addInitScript(lateKeyboard, { kb: KEYBOARD, after: 150 });

  // Each frame from the first one the search draws: where each part of it is.
  // Each watch keeps its own list and ends the one before.
  const watch = () =>
    page.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map((v) => Math.round(v)).join(",");
      };
      const frames = (window.__searchFrames = []);
      const watching = (window.__searchWatch = (window.__searchWatch ?? 0) + 1);
      let n = 0;
      const tick = () => {
        if (window.__searchWatch !== watching) return;
        const screen = document.querySelector("[data-search-screen]");
        const body = screen?.querySelector("[data-search-body]");
        if (body) {
          const title = body.querySelector("h2");
          const day = body.querySelector("[data-search-day]");
          const dayRows = [...(day?.querySelectorAll("[data-search-day-row]") ?? [])];
          frames.push({
            t: Math.round(performance.now()),
            title: box(title),
            look: box(title?.nextElementSibling),
            doors: box(body.querySelector("[data-search-doors]")),
            recent: box(body.querySelector("[data-search-recent]")),
            day: box(day),
            dayLine: day?.querySelector("span")?.textContent ?? null,
            dayRows: dayRows.map(box).join(" | "),
            dayCount: dayRows.length,
            dayText: dayRows.map((r) => [...r.querySelectorAll("span.block")].map((s) => (s.textContent ?? "").trim()).join(", ")).join(" | "),
            lit: body.querySelector("[data-search-doors] [aria-pressed=true]")?.getAttribute("data-door") ?? null,
            kinds: body.querySelectorAll("[data-search-kinds] [role=tab]").length,
            dock: box(screen.querySelector("[data-search-dock]")),
            visible: Math.round(window.visualViewport.height),
          });
        }
        if (++n < 420) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  // The keyboard comes up after the tap; then the field lets go and it goes.
  const comeAndGo = async () => {
    await page.waitForTimeout(1600);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForTimeout(1200);
    return page.evaluate(() => window.__searchFrames ?? []);
  };
  const PARTS = ["title", "look", "doors", "recent", "day"];
  const still = (label, frames, door) => {
    const first = frames[0];
    const up = frames.filter((f) => f.visible <= TALL - KEYBOARD);
    const foot = (f) => {
      const [, top, , height] = (f?.dock ?? "").split(",").map(Number);
      return top + height;
    };
    must(frames.length > 20 && PARTS.every((k) => Boolean(first?.[k])), `${label}: the search draws its title, Look in, the doors, the recent searches and the day's room in its first frame (${frames.length} frames${first ? `; missing: ${PARTS.filter((k) => !first[k]).join(", ") || "none"}` : ""})`);
    must(frames.length > 0 && frames.every((f) => f.lit === door), `${label}: opened from a place, it opens on that place (${[...new Set(frames.map((f) => f.lit))].join(", ") || "nothing"} lit)`);
    const top = Number((first?.title ?? "").split(",")[1]);
    must(Number.isFinite(top) && top <= 80, `${label}: "Search" stands at the top of the screen, not over the field (${Number.isFinite(top) ? `${top}px down` : "no title"})`);
    must(up.length > 0 && Math.abs(foot(up.at(-1)) - up.at(-1).visible) <= 1 && frames.at(-1)?.visible === TALL, `${label}: the keyboard came up after the screen did, the field on it, and went (${up.length ? `field ends at ${foot(up.at(-1))} on a keyboard from ${up.at(-1).visible}` : "never came"}; ${frames.at(-1)?.visible ?? "?"} at the end)`);
    const moved = frames.flatMap((f) => PARTS.filter((k) => f[k] !== first[k]).map((k) => `${k} ${first[k]} to ${f[k]} at +${f.t - first.t}ms`));
    must(moved.length === 0, `${label}: and nothing on it moves from its first frame while the keyboard comes and goes (${moved.slice(0, 3).join("; ") || `${frames.length} frames, every box held`})`);
  };
  // The place's own day (r3-31 B): under its own line, with rows that hold
  // still once they are in the room kept for them.
  const dayCame = (label, frames, key, least) => {
    const start = frames.findIndex((f) => f.dayCount > 0);
    const last = frames.at(-1);
    const when = start < 0 ? "never" : start === 0 ? "in the first frame" : `at +${frames[start].t - frames[0].t}ms, into the room held for it`;
    must(start >= 0 && last.dayCount >= least && last.dayLine === en[key], `${label}: the day came under "${en[key]}", ${when} (${last ? `${last.dayCount} rows: ${last.dayText || "none"}` : "no frames"})`);
    const moved = start < 0 ? [] : frames.slice(start).filter((f) => f.dayRows !== frames[start].dayRows).map((f) => `+${f.t - frames[0].t}ms`);
    must(start >= 0 && moved.length === 0, `${label}: and its rows hold still once they are in (${moved.slice(0, 3).join(", ") || `${frames.length - Math.max(start, 0)} frames held`})`);
  };
  const closeSearch = async () => {
    await tap(page.locator(`[data-search-dock] button[aria-label="${en["common.close"]}"]`));
    await page.waitForTimeout(600);
  };

  // Saints, from its own field: the first opening, the lists not yet in.
  await go(page, "/saints/");
  await page.waitForFunction(() => !!document.querySelector('[data-route-content] [data-search-door="saints"]'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  must(await page.evaluate(() => window.__standInKeyboard === true && window.visualViewport.height === innerHeight), "the stand-in keyboard is in place, and down");
  await watch();
  await tap(page.locator('[data-route-content] [data-search-door="saints"]').first());
  const saints = await comeAndGo();
  still("Saints", saints, "saints");
  must((saints.at(-1)?.kinds ?? 0) > 0, `Saints: its kinds came with the lists, under the doors (${saints.at(-1)?.kinds ?? 0} tabs)`);
  dayCame("Saints", saints, "prayers.today.commemoratedToday", 1);
  await page.screenshot({ path: path.join(SHOTS, "search-saints-412.png") });
  await closeSearch();

  // The ••• sheet's chapters: on the one being read, at the end, the middle and the start of John.
  const opened = (want) => page.waitForFunction((w) => (document.getElementById("chapter-title")?.querySelector("h1")?.textContent ?? "").replace(/\s+/g, " ").trim() === w, want, { timeout: 20000 }).catch(() => {});
  const moreSheet = async (chapter) => {
    await tap(page.getByRole("button", { name: en["bible.moreActions"] }));
    await page.waitForFunction((label) => [...document.querySelectorAll("[role=dialog]")].some((d) => d.getAttribute("aria-label") === label), `John ${chapter}`, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    return page.evaluate((label) => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === label);
      const row = d?.querySelector("[role=group]");
      const lit = row?.querySelector('a[aria-current="page"]');
      if (!d || !row || !lit) return null;
      const r = row.getBoundingClientRect();
      const c = lit.getBoundingClientRect();
      return {
        doors: [...d.querySelectorAll("[data-search-door]")].map((b) => b.getAttribute("data-search-door")),
        rows: [...d.querySelectorAll("button")].map((b) => (b.innerText ?? "").replace(/\s+/g, " ").trim()).filter(Boolean),
        lit: lit.textContent.trim(),
        inView: c.left >= r.left - 0.5 && c.right <= r.right + 0.5,
        offMiddle: Math.round((c.left + c.right) / 2 - (r.left + r.right) / 2),
        chip: Math.round(c.width),
        at: Math.round(row.scrollLeft),
        end: row.scrollWidth - row.clientWidth,
      };
    }, `John ${chapter}`);
  };
  for (const chapter of [21, 15, 2]) {
    await go(page, `/bible/john/${chapter}/`);
    await opened(`John Chapter ${chapter}`);
    await page.waitForTimeout(1200);
    const s = await moreSheet(chapter);
    const where = chapter === 21 ? "the row at its end" : chapter === 15 ? "in the middle" : "the row at its start";
    const placed = !s ? false : chapter === 21 ? s.at >= s.end - 1 : chapter === 15 ? Math.abs(s.offMiddle) <= s.chip : s.at === 0;
    must(Boolean(s) && s.lit === String(chapter) && s.inView && placed, `John ${chapter}: the ••• sheet's chapters open on ${chapter}, lit and in view, ${where} (${s ? `${s.lit} lit, scrolled ${s.at} of ${s.end}, ${s.offMiddle}px from the middle` : "no strip"})`);
    if (chapter !== 2) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(700);
      continue;
    }
    must(Boolean(s) && s.doors.join(",") === "bible" && !s.rows.some((t) => t.startsWith(en["search.ariaLabel"])), `John 2: the sheet holds one search, the Bible's (${s ? `${s.doors.join(", ") || "none"}; ${s.rows.join(" | ")}` : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, "reader-more-sheet-john2-412.png") });
  }

  // The one search, from the sheet over John 2.
  await watch();
  await tap(page.locator("[role=dialog] [data-bible-search-open] [data-search-door]").first());
  const bible = await comeAndGo();
  still("The Bible's ••• sheet", bible, "bible");
  dayCame("The Bible's ••• sheet", bible, "calendar.todaysReadings", 1);
  await page.screenshot({ path: path.join(SHOTS, "search-bible-412.png") });
  // A reading of the day opens at its verse, in the day's walk, as Today's do.
  const from = await page.evaluate(() => location.pathname + location.hash);
  await tap(page.locator("[data-search-day] [data-search-day-row]").first());
  await page.waitForFunction((was) => location.pathname + location.hash !== was && location.hash.startsWith("#v"), from, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const walked = await page.evaluate(() => {
    let flow = null;
    try {
      flow = JSON.parse(sessionStorage.getItem("purify:readings.flow") ?? "null");
    } catch {
      /* none */
    }
    return { at: location.pathname + location.hash, items: flow?.items?.length ?? 0, step: flow?.at ?? null, open: !!document.querySelector("[data-search-screen]") };
  });
  must(/^\/bible\/[^/]+\/\d+\/?#v\d+$/.test(walked.at) && walked.items > 0 && walked.step === 0 && !walked.open, `a reading of the day opens at its verse, the first step of the day's walk, and the search leaves (${walked.at}, ${walked.items} in the walk, at ${walked.step})`);

  // Everything, from Today's bar: the day in brief, the readings, the leading commemoration and the Hour.
  if (await page.evaluate(() => !!document.querySelector("[data-search-screen]"))) await closeSearch();
  await go(page, "/");
  await page.waitForTimeout(1500);
  await watch();
  await tap(page.locator(`button[aria-label="${en["search.open"]}"]:visible`).first());
  const everything = await comeAndGo();
  still("Everything", everything, "all");
  dayCame("Everything", everything, "prayers.today.eyebrow", 3);
  await page.screenshot({ path: path.join(SHOTS, "search-everything-412.png") });
  await closeSearch();
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});
// ---- 45. Discover's lines are whole, in every language (1.8).
// The owner's build 86 note 76: "on the discovery page ensure screens the
// sections bios isnt too long to the point where it gets cut off". Each door
// of Discover is a band (components/ui/GalleryBand.tsx): its name, then its
// line, which the band holds to two lines and cuts with "..." past them, and
// a name that takes two lines squeezes the line under it to one. Build 86
// had 166 of its 252 lines cut (twelve bands in 21 languages) at 360px or
// 390px, eight of the twelve English ones among them. The lines are written
// to fit now (components/mobile/DiscoverMobile.tsx and the catalogs). This
// opens Discover on a phone set to each language and reads every band's line
// at 360px and 390px: a NO for any line whose words run taller than the box
// that shows them.
//
// Each width is read twice, as this Chromium draws the page and as Android
// does. next/font stands a local Arial or Times New Roman in for each font
// ("DM Sans Fallback"), which Windows and iOS have and Android does not. So
// where a bundled font has no letters for a script (DM Sans has no Cyrillic,
// Greek or Arabic), Android draws the bundled Noto face and this Chromium
// draws Arial, a little narrower. The second reading takes the stand-ins out
// of the bands' fonts. Later in 1.8 the catalogs are machine-translated
// (note 74), so this runs on all 21: one cold start each, a few seconds.
await section(45, async () => {
  console.log("\n45. Discover's lines are whole, in every language");
  // Every language the app carries, one catalog each, so a language added
  // later is walked too: a phone set to it, named as a phone names it, with a
  // country.
  const PHONE = { en: "en-US", es: "es-ES", ro: "ro-RO", el: "el-GR", ru: "ru-RU", fr: "fr-FR", de: "de-DE", sr: "sr-RS", uk: "uk-UA", it: "it-IT", pt: "pt-BR", bg: "bg-BG", ar: "ar-SA", fil: "fil-PH", tr: "tr-TR", ka: "ka-GE", hu: "hu-HU", id: "id-ID", ne: "ne-NP", pl: "pl-PL", ur: "ur-PK" };
  const named = new Intl.DisplayNames(["en"], { type: "language" });
  const LANGS = fs
    .readdirSync(path.resolve("lib/i18n/messages"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .map((code) => [code, PHONE[code] ?? code, named.of(code) ?? code]);
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  // Every band's line, found by its clamp, so a renamed class cannot hide one.
  const lines = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-route-content] li > a[href]")].map((a) => {
        const line = [...a.querySelectorAll("span")].find((s) => !["none", ""].includes(getComputedStyle(s).webkitLineClamp));
        return { href: a.getAttribute("href") ?? "", text: (line?.textContent ?? "").trim(), cut: !line || line.scrollHeight > line.clientHeight };
      }),
    );
  // As Android draws the bands: every stand-in out of their fonts. It answers
  // how many of their words still have one, which must be none.
  const asAndroid = (page) =>
    page.evaluate(() => {
      const words = [...document.querySelectorAll("[data-route-content] li > a[href] :is(h2, h3, span)")];
      for (const el of words) {
        el.style.fontFamily = getComputedStyle(el).fontFamily.split(",").map((f) => f.trim()).filter((f) => !/Fallback"?$/.test(f)).join(", ");
      }
      return words.filter((el) => getComputedStyle(el).fontFamily.includes("Fallback")).length;
    });
  const errors = [];
  for (const [code, locale, name] of LANGS) {
    const { ctx, page, errors: own } = await open({ width: 360, height: 800, phone: true, locale });
    await go(page, "/discover/");
    // In its language: the root says so, and the Saints band wears its word.
    const saints = { ...en, ...words(code) }["discover.tile.saints"];
    const ready = await page
      .waitForFunction(([c, w]) => document.documentElement.lang === c && document.querySelector('[data-route-content] li > a[href="/saints/"] :is(h2, h3)')?.textContent?.trim() === w, [code, saints], { timeout: 20000 })
      .then(() => true, () => false);
    // A script's faces are asked for once its words are drawn.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.fonts.ready);
    const cut = [];
    let bands = 0;
    let stuck = 0;
    for (const android of [false, true]) {
      if (android) {
        stuck = await asAndroid(page);
        await page.waitForTimeout(150);
        await page.evaluate(() => document.fonts.ready);
      }
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(150);
        const got = await lines(page);
        bands = Math.max(bands, got.length);
        for (const l of got) if (l.cut) cut.push(`${bare(l.href)} at ${width}px${android ? " as Android draws it" : ""} ("${l.text}")`);
        if (!android && width === 360 && ["de", "ru", "ka"].includes(code)) await page.screenshot({ path: path.join(SHOTS, `discover-lines-${code}-360.png`), fullPage: true });
      }
    }
    must(
      ready && bands >= 11 && stuck === 0 && cut.length === 0,
      `${name}: every band's line is whole at 360px and 390px, as drawn here and as Android draws it (${bands} bands)${ready ? "" : `; Discover never came up in ${name}`}${stuck ? `; ${stuck} kept a stand-in font` : ""}${cut.length ? `; cut: ${cut.join("; ")}` : ""}`,
    );
    errors.push(...own.map((e) => `${name}: ${e}`));
    await ctx.close();
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
});
// ---- 49. Community's responses: the lit candle opens a tray over the row, and nothing moves.
// The owner on build 86 (note 80): "it moves the whole UI when you click on
// the guy with his hands up". The praying figure opened Amen, Praying and
// Glory to God inside the row itself, so the row grew a line and every post
// under it dropped (r3-30 measured 40px at 390). His pick, r3-30 A with mark
// 1 of r3-30b: the lit candle opens a small tray over the row, fixed to the
// screen and drawn at the top of the page, because a post is
// content-visibility: auto and clips what spills out of it. No figures on
// prayer: no count beside the candle and none in the tray. The like keeps its.
//
// The website is stood in for: a feed of six posts, the first with a reply,
// and a reader signed in, whose answers it keeps. Measured on the built app:
// the row and the next post before the tap, with the tray up, and after a
// choice, 0px moved; where the tray stands (over the row, its caret on the
// candle, whole on the screen, outside the post; under the row when a bar
// covers the room over it); what puts it down (Escape, a tap elsewhere, a
// scroll, a choice); a reply's, one size smaller; its words on the five
// palettes; English and Filipino at 360 and Arabic right to left; and with
// Purify's motion off, no animation.
await section(49, async () => {
  console.log("\n49. Community's responses open over the row, and nothing moves");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const three = (w) => ["amen", "praying", "glory"].map((k) => w[`community.respond.${k}`]);
  const en = words("en");
  const session = JSON.stringify({ access_token: "walk", token_type: "bearer", user: { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", created_at: "2026-01-01T00:00:00Z", identities: [], user_metadata: {} } });
  const at = new Date(Date.now() - 3 * 3600e3).toISOString();
  const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const FIRST = uuid(101);
  const posts = Array.from({ length: 6 }, (_, i) => ({
    id: uuid(101 + i),
    kind: "discussion",
    title: i === 0 ? "A post the walk writes" : `Another post, the ${["second", "third", "fourth", "fifth", "sixth"][i - 1]}`,
    body: "Two short lines of words, so that the row under them stands where a real post's does, and the next post starts where it would.",
    quote_text: null,
    quote_source: null,
    quote_href: null,
    author_name: "Walk",
    author_avatar: null,
    author_handle: null,
    reply_count: i === 0 ? 1 : 0,
    like_count: i === 0 ? 12 : 0,
    dislike_count: 0,
    created_at: at,
    pinned_at: null,
    category: null,
    amen_count: 0,
    praying_count: 0,
    glory_count: i === 0 ? 6 : 0,
  }));
  const reply = { id: uuid(201), post_id: FIRST, body: "A reply, to hold a reply's own row.", author_name: "Walk", author_avatar: null, author_handle: null, like_count: 0, dislike_count: 0, created_at: at, amen_count: 2, praying_count: 0, glory_count: 0 };

  // The website, stood in for. Registered after the shell's own answer, so it
  // is asked first; what it does not know passes on to the shell, which
  // answers nothing from outside the bundle.
  const standIn = async (ctx) => {
    const said = [];
    const held = { posts: {}, replies: {} };
    await ctx.route(/\/api\/community\//, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === ORIGIN) return route.fallback();
      const json = (body) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": ORIGIN, Vary: "Origin" }, body: JSON.stringify(body) });
      if (url.pathname === "/api/community/posts" && req.method() === "GET" && !url.search) return json({ posts });
      if (url.pathname === `/api/community/posts/${FIRST}/replies` && req.method() === "GET") return json({ replies: [reply] });
      if (url.pathname === "/api/community/mine") return json({ postIds: [], replyIds: [], reactions: { posts: {}, replies: {} }, responses: held, moderator: false });
      if (url.pathname === "/api/community/responses" && req.method() === "POST") {
        const ask = JSON.parse(req.postData() ?? "{}");
        said.push(ask);
        const map = ask.replyId ? held.replies : held.posts;
        const key = ask.replyId ?? ask.postId;
        const mine = new Set(map[key] ?? []);
        if (ask.on) mine.add(ask.kind);
        else mine.delete(ask.kind);
        map[key] = ["amen", "praying", "glory"].filter((k) => mine.has(k));
        const counts = ask.replyId ? { amen: 2, praying: 0, glory: 0 } : { amen: 0, praying: 0, glory: 6 };
        for (const k of map[key]) counts[k] += 1;
        return json({ counts, mine: map[key] });
      }
      return route.fallback();
    });
    return said;
  };
  const community = async ({ width, height = 844, locale, set = {} }) => {
    const opened = await open({ width, height, phone: true, locale, set: { "sb-walk-auth-token": session, "purify.motion": "on", ...set } });
    const said = await standIn(opened.ctx);
    await go(opened.page, "/community/");
    const ready = await opened.page
      .waitForFunction(() => document.querySelectorAll('article [data-response-candle="post"]:not([disabled])').length >= 2, null, { timeout: 20000 })
      .then(() => true, () => false);
    await opened.page.evaluate(() => document.fonts.ready);
    await opened.page.waitForTimeout(800);
    return { ...opened, said, ready };
  };

  // The first post's row (or its reply's), and the top of the post after it.
  const rowAndNext = (page, size = "post") =>
    page.evaluate((s) => {
      const feed = [...document.querySelectorAll("article")].filter((a) => a.querySelector('[data-response-candle="post"]'));
      const candle = feed[0]?.querySelector(`[data-response-candle="${s}"]`);
      if (!candle || !feed[1]) return null;
      const row = candle.parentElement.getBoundingClientRect();
      return {
        top: row.top,
        bottom: row.bottom,
        next: feed[1].getBoundingClientRect().top,
        tall: document.documentElement.scrollHeight,
        lit: candle.classList.contains("community-lit"),
        figures: (candle.textContent ?? "").trim(),
        like: (feed[0].querySelector("button[aria-pressed]")?.textContent ?? "").trim(),
      };
    }, size);
  const moved = (a, b) => (a && b ? Math.max(Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom), Math.abs(a.next - b.next), Math.abs(a.tall - b.tall)) : NaN);
  const px = (n) => (Number.isFinite(n) ? `${Math.round(n * 10) / 10}px` : "not measured");
  // Brings a candle to the middle of the screen, so no tap has to scroll to it.
  const centre = async (page, size = "post") => {
    await page.evaluate((s) => document.querySelector(`article [data-response-candle="${s}"]`)?.scrollIntoView({ block: "center" }), size);
    await page.waitForTimeout(400);
  };
  const candle = (page, size = "post") => page.locator(`article [data-response-candle="${size}"]`).first();
  const trayNow = (page) =>
    page.evaluate(() => {
      const tray = document.querySelector("[data-response-tray]");
      if (!tray) return null;
      const opener = document.querySelector('[data-response-candle][aria-expanded="true"]');
      const t = tray.getBoundingClientRect();
      const c = opener?.getBoundingClientRect();
      const after = getComputedStyle(tray, "::after");
      const choices = [...tray.querySelectorAll("button")];
      return {
        size: tray.getAttribute("data-response-tray"),
        portal: tray.parentElement === document.body && !tray.closest("article"),
        role: tray.getAttribute("role"),
        top: t.top,
        bottom: t.bottom,
        left: t.left,
        right: t.right,
        height: t.height,
        vw: document.documentElement.clientWidth,
        vh: window.innerHeight,
        candle: c ? { top: c.top, bottom: c.bottom, middle: c.left + c.width / 2 } : null,
        caret: t.left + parseFloat(getComputedStyle(tray).borderLeftWidth) + parseFloat(after.left) + parseFloat(after.width) / 2,
        below: tray.hasAttribute("data-below"),
        words: choices.map((b) => (b.textContent ?? "").trim()),
        pressed: choices.map((b) => b.getAttribute("aria-pressed")),
        text: tray.textContent ?? "",
        animation: getComputedStyle(tray).animationName,
        motion: document.documentElement.getAttribute("data-motion"),
        ground: getComputedStyle(tray).backgroundColor,
        inks: choices.map((b) => getComputedStyle(b).color),
      };
    });
  // The tray is read once nothing in it moves, never at a set time. It rises
  // in 180ms, and its words ease to a palette's colours over 200ms
  // (.tap-press), but in this headless browser either can sit pending for
  // some 400ms before it runs: on build 87's export the words were still
  // easing 450ms after a switch to Light and to True black, and were read
  // halfway. A colour easing to or from Parchment's passes through Oklab and
  // is reported as oklab() meanwhile, which is no word's colour at rest.
  const settled = (page) =>
    page
      .waitForFunction(() => {
        const tray = document.querySelector("[data-response-tray]");
        return !!tray && tray.hasAttribute("data-placed") && tray.getAnimations({ subtree: true }).length === 0;
      }, null, { timeout: 4000 })
      .then(() => true, () => false);
  // Where it stands: over the row by the gap (under it when `below`), its
  // caret on the candle's middle, whole on the screen.
  const placed = (tr, gap) => {
    if (!tr?.candle) return { ok: false, says: "no tray, or no candle open" };
    const gapNow = tr.below ? tr.top - tr.candle.bottom : tr.candle.top - tr.bottom;
    const caretOff = tr.caret - tr.candle.middle;
    const whole = tr.left >= 13.5 && tr.right <= tr.vw - 13.5 && tr.top >= 0 && tr.bottom <= tr.vh;
    return {
      ok: Math.abs(gapNow - gap) <= 1 && Math.abs(caretOff) <= 1.5 && whole,
      says: `${tr.below ? "under" : "over"} the row by ${px(gapNow)}, the caret ${px(Math.abs(caretOff))} from the candle's middle, ${Math.round(tr.left)}..${Math.round(tr.right)} of ${tr.vw}${whole ? "" : ", NOT whole on the screen"}`,
    };
  };
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rgbOf = (s) => {
    let m = /^rgba?\(([^)]+)\)$/.exec(s ?? "");
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    }
    m = /^color\(srgb ([^)]+)\)$/.exec(s ?? "");
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] ?? 1 };
    }
    // What the browser reports for a colour mixed or eased in Oklab (Tailwind's
    // own text-paper/60 is one): back to sRGB, as it is drawn.
    m = /^okl(ab|ch)\(([^)]+)\)$/.exec(s ?? "");
    if (m) {
      const p = m[2].split(/[\s/]+/).filter(Boolean).map(Number);
      const [L, A, B] = m[1] === "ab" ? p : [p[0], p[1] * Math.cos((p[2] * Math.PI) / 180), p[1] * Math.sin((p[2] * Math.PI) / 180)];
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
      const q = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
      const k = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
      const enc = (v) => 255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
      return {
        r: enc(4.0767416621 * l - 3.3077115913 * q + 0.2309699292 * k),
        g: enc(-1.2684380046 * l + 2.6097574011 * q - 0.3413193965 * k),
        b: enc(-0.0041960863 * l - 0.7034186147 * q + 1.707614701 * k),
        a: p[3] ?? 1,
      };
    }
    return null;
  };
  /**
   * The contrast of a word's ink on the tray's ground, the ink laid over the
   * ground as drawn. NaN, never 0, for a colour it cannot read: the check
   * then names the colour instead of failing the words.
   */
  const ratio = (ink, ground) => {
    const f = rgbOf(ink);
    const g = rgbOf(ground);
    if (!f || !g || [f.r, f.g, f.b, f.a, g.r, g.g, g.b].some((v) => !Number.isFinite(v))) return NaN;
    const flat = { r: f.r * f.a + g.r * (1 - f.a), g: f.g * f.a + g.g * (1 - f.a), b: f.b * f.a + g.b * (1 - f.a) };
    const lum = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    const [x, y] = [lum(flat), lum(g)].sort((p, q) => q - p);
    return Math.round(((x + 0.05) / (y + 0.05)) * 10) / 10;
  };

  // English on a phone 390 wide: the whole of it.
  {
    const { ctx, page, errors, said, ready } = await community({ width: 390 });
    must(ready, "390: the stood-in feed is drawn, a reader signed in");
    await centre(page);
    const before = await rowAndNext(page);
    must(!!before && before.bottom - before.top <= 40, `390: the row is one line, the like, the candle and the replies (${before ? px(before.bottom - before.top) : "no row"} tall)`);
    must(!!before && before.figures === "" && before.like === "12", `390: no figure beside the candle, and the like keeps its count (${before?.like ?? "no like"})`);
    await page.screenshot({ path: path.join(SHOTS, "community-responses-390-closed.png") });

    await tap(candle(page));
    await settled(page);
    const up = await trayNow(page);
    const during = await rowAndNext(page);
    must(!!up && up.portal && up.role === "group" && up.size === "post", "390: the candle opens a tray drawn at the top of the page, not inside the post");
    must(moved(before, during) < 0.5, `390: with the tray up, the row and the next post have not moved (${px(moved(before, during))})`);
    const where = placed(up, 11);
    must(where.ok && !up?.below, `390: the tray stands ${where.says}`);
    must(up?.words.join(" | ") === three(en).join(" | "), `390: it offers Amen, Praying and Glory to God (${up?.words.join(", ")})`);
    must(!!up && !/\d/.test(up.text) && !/\d/.test(during?.figures ?? "0"), "390: no figure in the tray, none beside the candle");
    must(up?.motion === "full" && up?.animation === "community-tray-in", `390: with motion on it rises out of the candle (${up?.animation})`);
    await page.screenshot({ path: path.join(SHOTS, "community-responses-390-open.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    must(!(await trayNow(page)) && moved(before, await rowAndNext(page)) < 0.5, "390: Escape puts it down, and nothing has moved");

    await tap(candle(page));
    await settled(page);
    await tap(page.locator("article h3").first());
    await page.waitForTimeout(300);
    must(!(await trayNow(page)), "390: a tap anywhere else puts it down");

    await tap(candle(page));
    await settled(page);
    await page.evaluate(() => window.scrollBy(0, 24));
    await page.waitForTimeout(400);
    must(!(await trayNow(page)), "390: a scroll puts it down");
    await page.evaluate(() => window.scrollBy(0, -24));
    await page.waitForTimeout(400);

    // A choice: Amen. The tray goes, the candle lights, and still nothing moves.
    const choosing = await rowAndNext(page);
    await tap(candle(page));
    await settled(page);
    await tap(page.locator("[data-response-tray] button").first());
    await page.waitForTimeout(900);
    const answered = await rowAndNext(page);
    const asked = said.at(-1);
    must(!(await trayNow(page)) && !!answered?.lit, `390: choosing Amen puts the tray down and lights the candle${answered?.lit ? "" : " (it is not lit)"}`);
    must(said.length === 1 && asked?.postId === FIRST && asked?.kind === "amen" && asked?.on === true, `390: and asks the website for Amen on the post, once (${JSON.stringify(said)})`);
    must(moved(choosing, answered) < 0.5 && answered?.figures === "" && answered?.like === "12", `390: nothing has moved, and no figure has appeared (${px(moved(choosing, answered))})`);

    // Open again: the reader's own is lit, the others not, on each of the five palettes.
    await tap(candle(page));
    await settled(page);
    const again = await trayNow(page);
    must(again?.pressed.join(" ") === "true false false", `390: open again, Amen is the reader's own and the others are not (${again?.pressed.join(" ")})`);
    for (const [palette, mode] of [["Dark", null], ["Light", "parchment"], ["True black", "black"], ["Candlelight", "candlelight"], ["Monastery", "monastery"]]) {
      await page.evaluate((m) => (m ? document.documentElement.setAttribute("data-reading-mode", m) : document.documentElement.removeAttribute("data-reading-mode")), mode);
      // The words at rest in this palette, once they have finished easing to it.
      const rested = await settled(page);
      const tr = await trayNow(page);
      const held = ratio(tr?.inks[0], tr?.ground);
      const rest = Math.min(ratio(tr?.inks[1], tr?.ground), ratio(tr?.inks[2], tr?.ground));
      const read = Number.isFinite(rest) && Number.isFinite(held);
      must(
        rested && !!tr && read && rest >= 4.5 && held > rest,
        `390, ${palette}: ${read ? `the words read on the tray, ${rest} to 1, and the reader's own stands out, ${held} to 1` : `the words' colours could not be read (${tr?.inks.join(", ")})`} (${tr?.ground}${rested ? "" : "; still moving after 4s"})`,
      );
      if (tr) await page.screenshot({ path: path.join(SHOTS, `community-responses-${mode ?? "dark"}.png`), clip: { x: 0, y: Math.max(0, Math.floor(tr.top) - 24), width: 390, height: 150 } });
    }
    await page.evaluate(() => document.documentElement.removeAttribute("data-reading-mode"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // With the row just under the bar there is no room over it: the tray stands under it.
    const lift = await page.evaluate(() => {
      const c = document.querySelector('article [data-response-candle="post"]');
      if (!c) return null;
      let edge = 0;
      for (const el of document.querySelectorAll('[data-screen-edge="top"]')) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < innerHeight / 2 && getComputedStyle(el).visibility !== "hidden") edge = Math.max(edge, r.bottom);
      }
      return c.parentElement.getBoundingClientRect().top - (edge + 10);
    });
    await page.evaluate((y) => window.scrollBy(0, y ?? 0), lift);
    await page.waitForTimeout(600);
    await tap(candle(page));
    await settled(page);
    const under = await trayNow(page);
    const low = placed(under, 11);
    must(!!under?.below && low.ok, `390: with a bar over the room above the row, the tray stands ${low.says}`);
    await page.screenshot({ path: path.join(SHOTS, "community-responses-390-under.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // A reply's row: the same tray, one size smaller.
    await page.evaluate(() => window.scrollTo(0, 0));
    await centre(page);
    await tap(page.locator('article [data-response-candle="post"] ~ button').first());
    const thread = await page
      .waitForFunction(() => !!document.querySelector('article [data-response-candle="reply"]:not([disabled])'), null, { timeout: 10000 })
      .then(() => true, () => false);
    must(thread, "390: the post's thread opens, and its reply has a candle of its own");
    if (thread) {
      await centre(page, "reply");
      const beforeReply = await rowAndNext(page, "reply");
      await tap(candle(page, "reply"));
      await settled(page);
      const small = await trayNow(page);
      const duringReply = await rowAndNext(page, "reply");
      const spot = placed(small, 9);
      must(small?.size === "reply" && spot.ok && small.height < (up?.height ?? 0), `390: a reply's tray is one size smaller, ${px(small?.height)} against ${px(up?.height)}, ${spot.says}`);
      must(moved(beforeReply, duringReply) < 0.5, `390: with a reply's tray up, its row and the next post have not moved (${px(moved(beforeReply, duringReply))})`);
      await page.screenshot({ path: path.join(SHOTS, "community-responses-390-reply.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    must(errors.length === 0, `390: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A narrow phone, in English, in Filipino (the longest words) and in Arabic,
  // right to left: the tray stands whole over the row, and nothing moves.
  for (const [code, locale] of [["en", undefined], ["fil", "tl-PH"], ["ar", "ar-EG"]]) {
    const where = `${code} at 360`;
    const w = words(code);
    const { ctx, page, errors, ready } = await community({ width: 360, height: 740, locale });
    must(ready, `${where}: the stood-in feed is drawn`);
    await centre(page);
    const before = await rowAndNext(page);
    await tap(candle(page));
    await settled(page);
    const tr = await trayNow(page);
    const after = await rowAndNext(page);
    const spot = placed(tr, 11);
    must(spot.ok && !tr?.below, `${where}: the tray stands ${spot.says}`);
    must(tr?.words.join(" | ") === three(w).join(" | "), `${where}: in the reader's words (${tr?.words.join(", ")})`);
    must(moved(before, after) < 0.5, `${where}: the row and the next post have not moved (${px(moved(before, after))})`);
    await page.screenshot({ path: path.join(SHOTS, `community-responses-360-${code}.png`) });
    await page.keyboard.press("Escape");
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Purify's motion off: the tray is simply there.
  {
    const { ctx, page, ready } = await community({ width: 390, set: { "purify.motion": "off" } });
    must(ready, "motion off: the stood-in feed is drawn");
    await centre(page);
    await tap(candle(page));
    await settled(page);
    const still = await trayNow(page);
    must(still?.motion === "reduce" && still?.animation === "none", `motion off: the tray does not rise, it is there (${still?.motion}, ${still?.animation})`);
    await ctx.close();
  }
});
// ---- 47. Making a post in Community, a page of its own (1.8).
// The owner's pick of r3-24, "B, a page of its own" (his note 69 of build 86,
// "So I want this create a post screen revamped"): the open form left the
// feed for a page over everything, the kind's picture at its head, the kinds
// as a saint's page's doors, who reads it and Post at the thumb, riding the
// keyboard (components/community/ComposePage.tsx). lib/community/compose.ts
// holds what each way in opens on, and its test holds the rules; this is the
// built app opening it all four ways a reader can (the feed, a parish group,
// Start a conversation under a Bible chapter, the Ask a Priest tab), signed
// in as the walk's stand-in reader with no network, so the feed says it
// could not load while the row and the page, which are the device's own,
// are all there.
//
// A headless browser has no keyboard, so one is stood in, raised and lowered
// by hand (window.__keyboard), apart from the focus: a phone gives the field
// its focus at once and then slides its keyboard up over a moment, and while
// it does nothing on the page may move but the foot, which rides up on it.
await section(47, async () => {
  console.log("\n47. Making a post in Community, a page of its own");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  must(inBundle(OUT, "/community/"), "/community/ is in the bundle");
  const session = JSON.stringify({ access_token: "walk", token_type: "bearer", user: { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", created_at: "2026-01-01T00:00:00Z", identities: [], user_metadata: { display_name: "Walk Reader" } } });
  // Two lines in the reader's Florilegium, verbatim (King James), for Share a line.
  const JOHN_3_16 = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
  const GAL_6_2 = "Bear ye one another's burdens, and so fulfil the law of Christ.";
  const florilegia = JSON.stringify([
    {
      id: "walk-gathering",
      title: "Walk",
      createdAt: 1,
      updatedAt: 2,
      items: [
        { id: "walk-john-3-16", addedAt: 2, kind: "scripture", text: JOHN_3_16, reference: "John 3:16", book: "john", chapter: 3, verse: 16 },
        { id: "walk-gal-6-2", addedAt: 1, kind: "scripture", text: GAL_6_2, reference: "Galatians 6:2", book: "galatians", chapter: 6, verse: 2 },
      ],
    },
  ]);
  const KEYBOARD = 300;
  const GROUP = "11111111-2222-4333-8444-555555555555";
  const handKeyboard = () => {
    const target = new EventTarget();
    let up = 0;
    const vv = {
      get width() { return innerWidth; },
      get height() { return innerHeight - up; },
      offsetTop: 0,
      offsetLeft: 0,
      get pageTop() { return scrollY; },
      get pageLeft() { return scrollX; },
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: (...a) => target.addEventListener(...a),
      removeEventListener: (...a) => target.removeEventListener(...a),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    try {
      Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
    } catch {
      return;
    }
    window.__keyboard = (px) => {
      if (up === px) return;
      up = px;
      target.dispatchEvent(new Event("resize"));
    };
  };
  // The page as it stands: what it opened on, and where its parts are.
  const measure = (page) =>
    page.evaluate(() => {
      const root = document.querySelector("[data-compose-page]");
      if (!root) return null;
      const box = (sel) => {
        const el = root.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
      };
      const text = (sel) => (root.querySelector(sel)?.textContent ?? "").replace(/\s+/g, " ").trim();
      const words = root.querySelector("[data-compose-words] textarea");
      const send = root.querySelector("[data-compose-send]");
      return {
        kind: root.getAttribute("data-compose-kind"),
        folded: root.hasAttribute("data-folded"),
        title: text("[data-compose-title]"),
        picture: root.querySelector("[data-compose-picture] img")?.getAttribute("src") ?? "",
        doors: [...root.querySelectorAll("[data-compose-door]")].map((b) => `${b.getAttribute("data-compose-door")}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`).join(" "),
        audience: text("[data-compose-audience]"),
        send: text("[data-compose-send]"),
        sendOn: Boolean(send) && !send.disabled,
        about: text("[data-compose-about]"),
        card: text("[data-compose-card]"),
        note: Boolean(root.querySelector("[data-compose-note]")),
        head: box("[data-compose-title]"),
        doorsBox: box("[data-compose-doors]"),
        field: box("[data-compose-field]"),
        words: box("[data-compose-words]"),
        foot: box("[data-compose-foot]"),
        sendBox: box("[data-compose-send]"),
        strip: box("[data-compose-strip]"),
        writing: Boolean(words) && document.activeElement === words,
        draft: words?.value ?? "",
        visible: Math.round(window.visualViewport.height),
        inner: innerHeight,
        overlay: document.body.dataset.overlayOpen === "1",
        tabBar: (() => {
          const bar = document.querySelector("[data-tab-bar]");
          return !bar ? "none" : bar.getAttribute("aria-hidden") === "true" && getComputedStyle(bar).opacity === "0" ? "aside" : "showing";
        })(),
      };
    });
  const opened = (page) => page.waitForFunction(() => !!document.querySelector("[data-compose-page]"), null, { timeout: 10000 }).then(() => page.waitForTimeout(800), () => {});
  const shut = async (page) => {
    await tap(page.locator("[data-compose-close]"));
    await page.waitForTimeout(500);
    return page.evaluate(() => !document.querySelector("[data-compose-page]") && document.body.dataset.overlayOpen !== "1");
  };
  const row = (page) => page.waitForFunction(() => !!document.querySelector('[data-composer] [data-compose-open="field"]'), null, { timeout: 20000 }).then(
    () => page.evaluate(() => (document.querySelector('[data-compose-open="field"]')?.textContent ?? "").trim()),
    () => null,
  );
  const tops = (m) => ["head", "doorsBox", "field", "words"].map((k) => `${k} ${m?.[k]?.top ?? "?"}`).join(", ");
  const held = (a, b) => ["head", "doorsBox", "field", "words"].every((k) => a?.[k] && b?.[k] && Math.abs(a[k].top - b[k].top) <= 1);

  for (const [width, height] of [[390, 844], [360, 740]]) {
    const where = `${width}x${height}`;
    const { ctx, page, errors } = await open({ width, height, phone: true, set: { "sb-walk-auth-token": session, "purify:florilegia": florilegia } });
    await page.addInitScript(handKeyboard);
    await go(page, "/community/");

    // 1. The feed: the folded row stays, and its field opens the page on a discussion.
    const asks = await row(page);
    must(asks === en["community.composePrompt"], `${where}, the feed: the folded row stays, its field asking "${asks ?? "no row"}"`);
    await tap(page.locator('[data-compose-open="field"]'));
    await opened(page);
    const rest = await measure(page);
    must(
      Boolean(rest) && rest.kind === "discussion" && rest.title === en["community.composeTitle"] && rest.doors === "discussion* question share" && !rest.folded,
      `${where}, the feed: its field opens a page of its own on a discussion, three doors under its head (${rest ? `${rest.kind}, "${rest.title}", ${rest.doors}` : "no page"})`,
    );
    must(rest?.picture === "/discover/tiles/chat.webp", `${where}: Pentecost at its head (${rest?.picture || "none"})`);
    must(
      rest?.audience === en["community.postingPublicly"] && rest.send === en["community.post"] && !rest.sendOn,
      `${where}: who reads it beside Post at the foot, Post waiting for words ("${rest?.audience}", "${rest?.send}")`,
    );
    must(Boolean(rest?.overlay) && rest.tabBar !== "showing", `${where}: over everything, the tab bar stepped aside behind it (${rest?.tabBar})`);
    must(Boolean(rest?.writing), `${where}: the words have the cursor as it opens`);
    if (width === 390) await page.screenshot({ path: path.join(SHOTS, "compose-feed.png") });

    // The keyboard comes: nothing on the page moves, and the foot rides up on it.
    const stood = await page.evaluate(() => typeof window.__keyboard === "function" && window.visualViewport.height === innerHeight);
    must(stood, `${where}: the keyboard is stood in, and down`);
    const down = await measure(page);
    await page.evaluate((px) => window.__keyboard(px), KEYBOARD);
    await page.waitForTimeout(600);
    const up = await measure(page);
    must(held(down, up), `${where}: nothing moves as the keyboard comes, the title, the doors, the title field and the words where they were (${tops(down)}; then ${tops(up)})`);
    must(
      Boolean(down?.foot && up?.foot) && Math.abs(down.foot.bottom - down.inner) <= 1 && up.visible <= up.inner - KEYBOARD + 1 && Math.abs(up.foot.bottom - up.visible) <= 1 && up.sendBox.bottom <= up.visible,
      `${where}: who reads it and Post ride up on the keyboard (the foot's end ${down?.foot?.bottom} of ${down?.inner}, then ${up?.foot?.bottom} on a keyboard from ${up?.visible})`,
    );
    must(Boolean(up?.words) && up.words.top < up.foot.top - 20, `${where}: the words are still in view above it (at ${up?.words?.top}, the foot from ${up?.foot?.top})`);
    if (width === 390) await page.screenshot({ path: path.join(SHOTS, "compose-keyboard.png") });

    // The first words fold the head: the doors pin as a slim row under the bar, the words under it.
    await page.keyboard.type("Reading John 3 tonight.");
    await page.waitForTimeout(1000);
    const typed = await measure(page);
    must(
      Boolean(typed?.folded && typed.strip && typed.words) && typed.words.top >= typed.strip.bottom - 1 && typed.foot.bottom <= typed.visible + 1 && typed.sendOn,
      `${where}: the first words fold the head under the bar, the words below it and Post lit on the keyboard (${typed?.folded ? "folded" : "not folded"}, the row to ${typed?.strip?.bottom}, the words from ${typed?.words?.top})`,
    );
    if (width === 390) await page.screenshot({ path: path.join(SHOTS, "compose-typed.png") });
    await page.evaluate(() => window.__keyboard(0));
    must(await shut(page), `${where}: its close button puts it away, and the feed is back`);
    await tap(page.locator('[data-compose-open="field"]'));
    await opened(page);
    const again = await measure(page);
    must(again?.draft === "Reading John 3 tonight.", `${where}: closing keeps the draft for the next opening ("${again?.draft ?? "no page"}")`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    must(await page.evaluate(() => !document.querySelector("[data-compose-page]")), `${where}: Escape closes it too`);

    if (width === 390) {
      // Share a line: the newest line gathered stands as the card it becomes in the feed.
      await tap(page.locator('[data-compose-open="share"]'));
      await opened(page);
      const share = await measure(page);
      must(
        share?.kind === "share" && share.title === en["community.shareALine"] && share.picture === "/premium/scribe.v1.webp" && share.doors === "discussion question share*",
        `the feed's Share a line opens on Share a line, under St Prochorus writing (${share ? `${share.kind}, ${share.picture}, ${share.doors}` : "no page"})`,
      );
      must(Boolean(share?.card.includes(JOHN_3_16.slice(0, 40)) && share.card.includes("John 3:16")) && share.sendOn, `the newest line stands as its card, Post lit ("${share?.card.slice(0, 50) ?? ""}")`);
      await tap(page.locator('[data-compose-line="walk-gal-6-2"]'));
      await page.waitForTimeout(400);
      const picked = await measure(page);
      must(Boolean(picked?.card.includes(GAL_6_2.slice(0, 30)) && picked.card.includes("Galatians 6:2")), `a tap on another line makes it the card ("${picked?.card.slice(0, 50) ?? ""}")`);
      await page.screenshot({ path: path.join(SHOTS, "compose-share.png") });
      must(await shut(page), "and closing it brings back the feed");

      // The Ask a Priest tab: a question, under the Three Hierarchs, sent as Ask.
      await tap(page.locator('[data-feed-tab="questions"]'));
      await page.waitForTimeout(700);
      const askRow = await row(page);
      must(askRow === en["community.askPrompt"], `the Ask a Priest tab: the row asks "${askRow ?? "no row"}"`);
      await tap(page.locator('[data-compose-open="field"]'));
      await opened(page);
      const ask = await measure(page);
      must(
        ask?.kind === "question" && ask.title === en["community.askAPriest"] && ask.doors === "discussion question* share" && ask.picture === "/icons/prayer/three-hierarchs.v2.jpg",
        `it opens on a question under the Three Hierarchs (${ask ? `${ask.kind}, "${ask.title}", ${ask.picture}` : "no page"})`,
      );
      must(Boolean(ask?.note) && ask.send === en["community.askSend"] && ask.audience === en["community.postingPublicly"], `its note under the seal, Ask at the thumb, and public as before ("${ask?.send}", "${ask?.audience}")`);
      await page.screenshot({ path: path.join(SHOTS, "compose-ask.png") });
      must(await shut(page), "and it closes back to the questions");

      // A parish group: two doors, the group's own words; the post goes to the group alone.
      await go(page, "/");
      await go(page, `/community/#group-${GROUP}`);
      const groupRow = await row(page);
      must(groupRow === en["community.composePromptGroup"], `a parish group: the row asks "${groupRow ?? "no row"}"`);
      await tap(page.locator('[data-compose-open="field"]'));
      await opened(page);
      const group = await measure(page);
      must(
        group?.kind === "discussion" && group.title === en["community.composeTitleGroup"] && group.doors === "discussion* share" && group.audience === en["community.postingToGroup"],
        `it opens with two doors and the group's words ("${group?.title}", ${group?.doors}, "${group?.audience}")`,
      );
      await page.screenshot({ path: path.join(SHOTS, "compose-group.png") });
      must(await shut(page), "and closes back to the group's conversation");

      // Start a conversation under a Bible chapter: the page opens straight from it, about it.
      await go(page, "/bible/john/3/");
      await page.waitForTimeout(1500);
      const start = page.locator('a[href*="about=john"]').first();
      if (await start.count()) {
        await start.scrollIntoViewIfNeeded().catch(() => {});
        await tap(start);
      } else {
        // The chapter shows the way only where the build has Community on.
        say("47, the chapter", "no Start a conversation in this build; its address is opened instead");
        await go(page, "/community/?about=john%2F3#conversations");
      }
      await opened(page);
      const chapter = await measure(page);
      const aboutJohn = en["community.aboutChapter"].replace("{chapter}", "John 3");
      must(
        chapter?.kind === "discussion" && chapter.about === aboutJohn && chapter.title === en["community.composeTitle"],
        `Start a conversation under John 3 opens the page on a discussion about it ("${chapter?.about ?? "no page"}")`,
      );
      must(
        Boolean(chapter?.picture) && (chapter.picture.endsWith("/covers/john.v1.jpg") || chapter.picture === "/sections/bible.jpg"),
        `St John's cover at its head, or with no signal the plate the apps carry (${chapter?.picture || "none"})`,
      );
      await page.screenshot({ path: path.join(SHOTS, "compose-chapter.png") });
      const landed = await shut(page);
      const feed = await page.evaluate(() => location.pathname);
      must(landed && /^\/community\/?$/.test(feed) && (await row(page)) !== null, `closing it lands in the feed (${feed})`);
    }
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 48. Prayers: Practices and the prayer book (1.8, note 72).
// The owner's pick of r3-26 for this part of the Prayers tab, a mix
// (2026-10-31): "A, the icon tiles. C, one prayer book." (Homebase/boards/
// purify-master/variants/r3-26-prayers-practices). Practices are four tiles
// in their icons, two across (four on a tablet in the apps), the Hours
// wearing the icon of the Hour the clock is in, lit and named; Today's tile
// is gone, its door a row of the daily rule, and Personal is Your rule. Under
// them one prayer book: chapters I to IV opening one at a time onto a page of
// prayers run by dotted leaders to their length, a shut chapter naming what
// is in it, the Hours lit in the daily rule. One search on the screen, the
// bar's magnifier, turned to Prayers. Drawn at 9:41 in the morning, as the
// sheet was, so the Hour is the Third; then in the afternoon and at night.
// Measured at 360 and 390, on the five everyday palettes, with motion on and
// off, and on a tablet. lib/prayers/__tests__/prayersHome.test.ts holds the
// source.
await section(48, async () => {
  console.log("\n48. Prayers: Practices and the prayer book");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const min = (n) => en["prayers.approxMin.other"].replace("{count}", String(n));
  const NINE_FORTY_ONE = new Date("2026-10-31T09:41:00");
  const TILES = ["/prayers/hours", "/prayers/akathists", "/prayers/learning", "/prayers/personal"];
  const ICONS = ["/icons/prayer/pentecost.jpg", "/icons/prayer/theotokos-of-vladimir.jpg", "/icons/prayer/three-hierarchs.v2.jpg", "/icons/prayer/christ-pantocrator.v2.jpg"];
  const opened = async (page) => {
    await go(page, "/prayers/");
    // The Hours are lit once the page has read the clock.
    await page.waitForFunction(() => !!document.querySelector("[data-practices] a[data-lit]") && !!document.querySelector("[data-prayer-book] [data-chapter]"), null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
  };
  /** Brings the tiles into view and waits for their pictures, which are asked for as they near the screen. */
  const tilesInView = async (page) => {
    await page.evaluate(() => document.querySelector("[data-practices]")?.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -70));
    await page.waitForFunction(() => [...document.querySelectorAll("[data-practices] a img")].filter((i) => i.hasAttribute("data-arrived")).length === 4, null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  };
  const tiles = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-practices] a")].map((a) => {
        const r = a.getBoundingClientRect();
        const img = a.querySelector("img");
        // How far past its own pixels the picture is drawn on a phone of three
        // pixels to the point: it covers the tile, then is drawn closer.
        let past3x = null;
        if (img?.naturalWidth) {
          const zoom = new DOMMatrixReadOnly(getComputedStyle(img).transform === "none" ? undefined : getComputedStyle(img).transform).a;
          past3x = (Math.max(img.offsetWidth, (img.offsetHeight * img.naturalWidth) / img.naturalHeight) * zoom * 3) / img.naturalWidth;
        }
        return {
          href: a.getAttribute("href"),
          lit: a.hasAttribute("data-lit"),
          name: a.querySelector("h3")?.textContent?.trim() ?? null,
          line: a.querySelector("p")?.textContent?.trim() ?? null,
          left: Math.round(r.left),
          top: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
          src: img?.getAttribute("src") ?? null,
          arrived: !!img?.hasAttribute("data-arrived") && img.naturalWidth > 0,
          past3x,
          shadow: getComputedStyle(a).boxShadow,
        };
      }),
    );
  /** The chapters as they stand: which is open, what a shut one names, its page's height. */
  const chapters = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-prayer-book] [data-chapter]")].map((s) => {
        const b = s.querySelector("button[data-chapter-at]");
        const leaf = document.getElementById(b?.getAttribute("aria-controls") ?? "");
        return {
          id: s.getAttribute("data-chapter"),
          numeral: b?.querySelector("span[aria-hidden]")?.textContent?.trim() ?? null,
          open: b?.getAttribute("aria-expanded") === "true",
          says: (b?.innerText ?? "").replace(/\s+/g, " ").trim(),
          top: Math.round(b?.getBoundingClientRect().top ?? -1),
          height: Math.round(leaf?.getBoundingClientRect().height ?? -1),
          inert: !!leaf?.hasAttribute("inert"),
          rows: leaf ? [...leaf.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.innerText.replace(/\s+/g, " ").trim(), lit: a.hasAttribute("data-lit"), leader: Math.round(a.querySelector(".book-leader")?.getBoundingClientRect().width ?? -1), plate: a.querySelector("img")?.getAttribute("src") ?? null })) : [],
          planned: leaf?.querySelector("p")?.innerText?.replace(/\s+/g, " ").trim() ?? null,
        };
      }),
    );

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const w = `${size.width}px`;
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await page.clock.setFixedTime(NINE_FORTY_ONE);
    await opened(page);
    await tilesInView(page);

    // Practices: four tiles in their icons, two across, the Hours lit. Across
    // the page's own column, as the book under them and every section are:
    // the app's root is 17px, so its gutters (px-5) are 21.25px and the
    // grid's gap (gap-3) 12.75px, where the sheet drew 20 and 12 (build 87's
    // walk measured 167.4 at 390 against the sheet's 169).
    const t = await tiles(page);
    const col = await page.evaluate(() => {
      const grid = document.querySelector("[data-practices] a")?.parentElement;
      const book = document.querySelector("[data-prayer-book]")?.getBoundingClientRect();
      const r = grid?.getBoundingClientRect();
      return grid && r && book ? { left: r.left, width: r.width, gap: parseFloat(getComputedStyle(grid).columnGap), book: [book.left, book.width] } : null;
    });
    const each = col ? (col.width - col.gap) / 2 : -1;
    must(t.length === 4 && t.map((x) => bare(x.href)).join(" ") === TILES.join(" "), `${w}: Practices are the Hours, Akathists, Learn to pray and Your rule, and Today's tile is gone (${t.map((x) => bare(x.href)).join(", ")})`);
    must(
      !!col &&
        Math.abs(col.book[0] - col.left) <= 0.5 &&
        Math.abs(col.book[1] - col.width) <= 0.5 &&
        t.length === 4 &&
        t[0].top === t[1].top &&
        t[2].top === t[3].top &&
        t[2].top >= t[0].top + t[0].height &&
        t[0].left < t[1].left &&
        t.every((x) => Math.abs(x.width - each) <= 1 && x.height >= 146),
      `${w}: two across the page's column, the book's (${col ? `${col.width.toFixed(1)}px from ${col.left.toFixed(2)}, gap ${col.gap}` : "no grid"}), each ${each.toFixed(1)}px wide and at least 146 tall (${t.map((x) => `${x.width}x${x.height} at ${x.left},${x.top}`).join("; ")})`,
    );
    must(
      t.map((x) => x.name).join("|") === [en["ui.theHours"], en["prayers.akathists"], en["ui.learnToPray"], en["prayers.mine.title"]].join("|"),
      `${w}: named as on the sheet, Personal as Your rule (${t.map((x) => x.name).join(", ")})`,
    );
    must(
      t.map((x) => x.line).join("|") === [`${en["prayers.timeline.now"]} · ${en["prayers.rule.third-hour.title"]}`, en["ui.hymnsOfPraise"], en["ui.aBeginnersPath"], en["prayers.mine.youHint"]].join("|"),
      `${w}: at 9:41 the Hours say "${en["prayers.timeline.now"]} · ${en["prayers.rule.third-hour.title"]}", and Your rule has the You tab's line (${t.map((x) => x.line).join(" | ")})`,
    );
    must(t.map((x) => x.lit).join(" ") === "true false false false" && /rgba\(255, 255, 255, 0\.2\)/.test(t[0]?.shadow ?? ""), `${w}: the Hours alone are lit, ringed and glowing white (${t[0]?.shadow ?? "none"})`);
    must(t.every((x, i) => x.src === ICONS[i] && x.arrived), `${w}: each wears its icon, the Hours the Third Hour's Pentecost, every one arrived (${t.map((x) => `${x.src}${x.arrived ? "" : " not arrived"}`).join(", ")})`);
    must(t.every((x) => x.past3x !== null && x.past3x <= 1.4), `${w}: no icon drawn more than 1.4 times past its own pixels on a phone at 3x (${t.map((x) => x.past3x?.toFixed(2)).join(", ")})`);
    if (size.width === 390) await page.screenshot({ path: path.join(SHOTS, "prayers-practices-390.png") });

    // The prayer book: I to IV, the daily rule open, the rest shut and naming what is in them.
    const c = await chapters(page);
    must(c.map((x) => `${x.numeral} ${x.id}`).join(", ") === "I daily, II daily-life, III church-year, IV devotional", `${w}: one book, its chapters I to IV (${c.map((x) => `${x.numeral} ${x.id}`).join(", ")})`);
    must(c.map((x) => x.open).join(" ") === "true false false false" && c.slice(1).every((x) => x.inert && x.height === 0), `${w}: the daily rule open at first, the others shut and out of reach (${c.map((x) => `${x.id} ${x.open ? "open" : "shut"} ${x.height}px${x.inert ? " inert" : ""}`).join(", ")})`);
    const daily = c[0]?.rows ?? [];
    must(
      daily.map((r) => bare(r.href)).join(" ") === "/prayers/morning /prayers/midday /prayers/evening /prayers/creed /prayers/today /prayers/hours",
      `${w}: the daily rule's page: its prayers, then Today's prayer, then the Hours (${daily.map((r) => bare(r.href)).join(", ")})`,
    );
    must(
      daily.slice(0, 5).every((r) => r.leader >= 14) && daily[0]?.text.includes(min(8)) && daily[1]?.text.includes(min(5)) && daily[4]?.text.includes(en["notFound.todaysPrayer"]),
      `${w}: each prayer run by a dotted leader to its length, "${en["prayers.rule.morning.title"]} ... ${min(8)}" (leaders ${daily.map((r) => r.leader).join(", ")})`,
    );
    const hoursRow = daily[5];
    must(
      !!hoursRow && hoursRow.lit && hoursRow.text.includes(`${en["prayers.rule.third-hour.title"]} · ${en["prayers.hoursIndex.nowMark"]}`) && hoursRow.plate === "/icons/prayer/pentecost.jpg",
      `${w}: the Hours lit in the daily rule, "${en["prayers.rule.third-hour.title"]} · ${en["prayers.hoursIndex.nowMark"]}", on its icon (${hoursRow ? `${hoursRow.text}, ${hoursRow.plate}` : "no row"})`,
    );
    must(
      c[1]?.says.includes(en["prayers.rule.upon-waking.title"]) && c[2]?.says.includes(en["prayers.rule.pascha.title"]) && c[3]?.says.includes(en["prayers.akathists"]),
      `${w}: a shut chapter names what is in it ("${c[3]?.says ?? ""}")`,
    );

    // Devotional opened by a tap: the daily rule above it shuts at once and
    // the chapter is not jumped away from the finger; its page folds open
    // under it, and since 1.9 (build 89 note 8) the screen glides with the
    // fold, so the page ends in sight above the tab bar, its title never
    // under the header. Watched a frame at a time from the tap.
    await page.evaluate(() => document.querySelector('[data-prayer-book] button[data-chapter-at="3"]')?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(400);
    const was = (await chapters(page))[3]?.top ?? -1;
    const watching = page.evaluate(
      () =>
        new Promise((done) => {
          const tops = [];
          const t0 = performance.now();
          const step = () => {
            const b = document.querySelector('[data-prayer-book] button[data-chapter-at="3"]');
            if (b) tops.push(Math.round(b.getBoundingClientRect().top));
            if (performance.now() - t0 < 900) requestAnimationFrame(step);
            else done(tops);
          };
          requestAnimationFrame(step);
        }),
    );
    await tap(page.locator('[data-prayer-book] button[data-chapter-at="3"]'));
    const tops = await watching;
    await page.waitForTimeout(200);
    const c2 = await chapters(page);
    const iv = c2[3];
    must(c2.map((x) => x.open).join(" ") === "false false false true" && c2[0].height === 0 && c2[0].inert, `${w}: one chapter at a time: Devotional open, the daily rule shut (${c2.map((x) => `${x.id} ${x.open ? "open" : "shut"}`).join(", ")})`);
    // A glide, not a jump: the chapter only ever goes up, a frame at a time,
    // no faster than the fold it follows opens (its first frame, the fastest,
    // grows 77px), where the jump build 87 found was 278px in one frame.
    const steps = tops.slice(1).map((t, i) => t - tops[i]);
    must(
      Math.abs(tops[0] - was) <= 80 && steps.every((d) => d <= 2) && Math.max(0, ...steps.map((d) => -d)) <= 80,
      `${w}: the tapped chapter never jumps as the page above it shuts and its own opens: it glides up a frame at a time, the largest move ${Math.max(0, ...steps.map((d) => -d))}px (from ${was}px: ${tops.slice(0, 8).join(", ")} ... ${tops[tops.length - 1]}px)`,
    );
    const sight = await page.evaluate(() => {
      const b = document.querySelector('[data-prayer-book] button[data-chapter-at="3"]');
      const leaf = document.getElementById(b?.getAttribute("aria-controls") ?? "");
      const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
      const head = document.querySelector("[data-mobile-topbar]")?.getBoundingClientRect();
      return { title: Math.round(b?.getBoundingClientRect().top ?? -1), end: Math.round(leaf?.getBoundingClientRect().bottom ?? -1), bar: Math.round(bar?.top ?? window.innerHeight), roof: Math.round(head?.bottom ?? 0) };
    });
    must(sight.end <= sight.bar && sight.title >= sight.roof, `${w}: the screen followed the page as it opened: it ends in sight above the tab bar (${sight.end}px, the bar at ${sight.bar}px) and its title is under the header (${sight.title}px, the header's foot at ${sight.roof}px)`);
    must(
      !!iv && iv.height > 150 && iv.rows.some((r) => bare(r.href) === "/prayers/akathists" && r.text.includes(en["prayers.akathist.theotokos.title"]) && r.plate === "/icons/prayer/theotokos-of-vladimir.jpg") && (iv.planned ?? "").startsWith(en["study.planned"]) && (iv.planned ?? "").includes(en["prayers.rule.psalms-needs.title"]),
      `${w}: Devotional's page ends on the akathist and what is planned (${iv?.rows.map((r) => bare(r.href)).join(", ")}; "${iv?.planned ?? ""}")`,
    );
    if (size.width === 390) await page.screenshot({ path: path.join(SHOTS, "prayers-book-devotional-390.png") });

    // Folded, not flicked: a page opening grows over a few frames on the house curve.
    const frames = await page.evaluate(
      () =>
        new Promise((done) => {
          const b = document.querySelector('[data-prayer-book] button[data-chapter-at="1"]');
          const leaf = document.getElementById(b?.getAttribute("aria-controls") ?? "");
          if (!b || !leaf) return done({ heights: [], duration: null });
          const heights = [];
          const t0 = performance.now();
          b.click();
          const step = () => {
            heights.push(Math.round(leaf.getBoundingClientRect().height));
            if (performance.now() - t0 < 500) requestAnimationFrame(step);
            else done({ heights, duration: getComputedStyle(leaf).transitionDuration });
          };
          requestAnimationFrame(step);
        }),
    );
    const last = frames.heights.at(-1) ?? 0;
    must(frames.duration === "0.24s" && last > 100 && frames.heights.some((h) => h > 0 && h < last - 4), `${w}: with motion on a chapter folds open over 240 ms (${frames.duration}; ${frames.heights.length} frames, ${frames.heights.slice(0, 6).join(", ")} ... ${last}px)`);

    // One search: no field on the page, and the bar's magnifier opens turned to Prayers.
    const fields = await page.evaluate(() => [...document.querySelectorAll("[data-search-door], input[type=search]")].filter((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0).length);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await tap(page.locator(`[data-route-content] [data-tab-topbar] button[aria-label="${en["search.open"]}"]`).first());
    await page.waitForFunction(() => !!document.querySelector("[data-search-screen] [data-door][aria-pressed='true']"), null, { timeout: 10000 }).catch(() => {});
    const turned = await page.evaluate(() => document.querySelector("[data-search-screen] [data-door][aria-pressed='true']")?.getAttribute("data-door") ?? null);
    must(fields === 0 && turned === "prayers", `${w}: one search: no field on the page (${fields}), and the bar's magnifier opens turned to Prayers (${turned})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `${w}: nothing past the screen's edge${out.length ? ": " + out.join(" | ") : ""}`);
    must(errors.length === 0, `${w}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // With Purify's motion off, a chapter simply opens.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.motion": "off" } });
    await page.clock.setFixedTime(NINE_FORTY_ONE);
    await opened(page);
    const still = await page.evaluate(
      () =>
        new Promise((done) => {
          const b = document.querySelector('[data-prayer-book] button[data-chapter-at="2"]');
          const leaf = document.getElementById(b?.getAttribute("aria-controls") ?? "");
          if (!b || !leaf) return done(null);
          b.click();
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const first = Math.round(leaf.getBoundingClientRect().height);
              setTimeout(() => done({ motion: document.documentElement.dataset.motion ?? "", first, last: Math.round(leaf.getBoundingClientRect().height), duration: getComputedStyle(leaf).transitionDuration }), 500);
            }),
          );
        }),
    );
    must(!!still && still.motion === "reduce" && still.duration === "0s" && still.first > 40 && still.first === still.last, `with motion off a chapter opens whole at once (${still ? `${still.motion}, ${still.duration}, ${still.first}px then ${still.last}px` : "no chapter"})`);
    must(errors.length === 0, `motion off: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The five everyday palettes: the tiles' words over the picture on the
  // page's own ground, the book's words on its page, the lit tile's glow
  // stepping aside on Parchment, and nothing gold.
  const { default: sharp } = await import("sharp");
  const lumOf = async (page, clip) => {
    const { data, info } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += info.channels) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    return sum / (data.length / info.channels);
  };
  for (const palette of ["default", "parchment", "black", "candlelight", "monastery"]) {
    const free = ["default", "parchment", "black"].includes(palette);
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: free ? { "purify.reader.theme": palette } : {} });
    await page.clock.setFixedTime(NINE_FORTY_ONE);
    await opened(page);
    // Candlelight and Monastery are Plus palettes: worn here as the palette controller wears them.
    if (!free) await page.evaluate((p) => document.documentElement.setAttribute("data-reading-mode", p), palette);
    await tilesInView(page);
    const seen = await page.evaluate(() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const g = cv.getContext("2d", { willReadFrequently: true });
      const rgb = (c) => {
        g.clearRect(0, 0, 1, 1);
        g.fillStyle = "rgba(0, 0, 0, 0)";
        g.fillStyle = c;
        g.fillRect(0, 0, 1, 1);
        return [...g.getImageData(0, 0, 1, 1).data];
      };
      const lum = ([r, gg, b]) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const box = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
      };
      const hours = document.querySelector("[data-practices] a[data-lit]");
      const book = document.querySelector("[data-prayer-book]");
      const name = book?.querySelector("button[aria-expanded='true'] span:not([aria-hidden]) > span");
      const row = book?.querySelector("[data-open] a span.font-serif");
      // Gold, amber or yellow anywhere on the two, pictures aside.
      const gold = [...document.querySelectorAll("[data-practices] *, [data-prayer-book], [data-prayer-book] *")]
        .filter((el) => el.tagName !== "IMG")
        .flatMap((el) => {
          const s = getComputedStyle(el);
          return [s.color, s.backgroundColor, s.borderTopColor].map(rgb).filter(([r, gg, b, a]) => a > 25 && r > 140 && r - b > 70 && gg - b > 35);
        }).length;
      return {
        mode: document.documentElement.dataset.readingMode ?? "default",
        hours: box(hours),
        hoursName: lum(rgb(getComputedStyle(hours?.querySelector("h3") ?? document.body).color)),
        glow: /rgba\(255, 255, 255, 0\.2\)/.test(hours ? getComputedStyle(hours).boxShadow : ""),
        book: box(book),
        bookName: lum(rgb(getComputedStyle(name ?? document.body).color)),
        leaf: box(book?.querySelector("[data-open] .book-leaf")),
        rowName: lum(rgb(getComputedStyle(row ?? document.body).color)),
        gold,
      };
    });
    const where = `${palette}`;
    must(seen.mode === palette, `${where}: the palette is worn (${seen.mode})`);
    if (seen.hours && seen.book && seen.leaf) {
      // Under the Hours' line: the shade over the picture's foot.
      const foot = await lumOf(page, { x: Math.round(seen.hours.x + seen.hours.width * 0.2), y: Math.round(seen.hours.y + seen.hours.height - 8), width: Math.round(seen.hours.width * 0.6), height: 5 });
      must(Math.abs(seen.hoursName - foot) >= 100, `${where}: a tile's name stands clear of the shade under it (words ${Math.round(seen.hoursName)}, ground ${Math.round(foot)})`);
      must(palette === "parchment" ? !seen.glow : seen.glow, `${where}: the lit tile ${palette === "parchment" ? "is ringed in ink, with no white glow on paper" : "glows white"}`);
      await page.evaluate(() => document.querySelector("[data-prayer-book]")?.scrollIntoView({ block: "start" }));
      await page.evaluate(() => window.scrollBy(0, -70));
      await page.waitForTimeout(500);
      const at = await page.evaluate(() => {
        const b = document.querySelector("[data-prayer-book]")?.getBoundingClientRect();
        const l = document.querySelector("[data-prayer-book] [data-open] .book-leaf")?.getBoundingClientRect();
        return b && l ? { book: { x: b.left, y: b.top, width: b.width }, leaf: { x: l.left, y: l.top, width: l.width, height: l.height } } : null;
      });
      if (at) {
        // The card's top margin, and the page's foot under its last row.
        const card = await lumOf(page, { x: Math.round(at.book.x + at.book.width * 0.3), y: Math.round(at.book.y + 1), width: Math.round(at.book.width * 0.4), height: 3 });
        const well = await lumOf(page, { x: Math.round(at.leaf.x + at.leaf.width * 0.3), y: Math.round(at.leaf.y + at.leaf.height - 4), width: Math.round(at.leaf.width * 0.4), height: 3 });
        must(Math.abs(seen.bookName - card) >= 100 && Math.abs(seen.rowName - well) >= 100, `${where}: the book's words stand clear of its card and of the open page (chapter ${Math.round(seen.bookName)} on ${Math.round(card)}, prayer ${Math.round(seen.rowName)} on ${Math.round(well)})`);
      } else must(false, `${where}: the book's open page is on the screen`);
    } else must(false, `${where}: the Hours' tile and the book are on the page`);
    must(seen.gold === 0, `${where}: nothing gold, amber or yellow on Practices or the book (${seen.gold})`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-book-${palette}.png`) });
    await tilesInView(page);
    await page.screenshot({ path: path.join(SHOTS, `prayers-practices-${palette}.png`) });
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The afternoon and the night: the Hours tile and the daily rule's row
  // wear the Hour the clock is in. At night that is Compline, whose icon is
  // the Vladimir Theotokos, the akathists' too (lib/prayers/serviceArt.ts).
  for (const [at, hour, icon] of [["2026-10-31T15:30:00", "ninth-hour", "entombment.v2.jpg"], ["2026-10-31T21:30:00", "compline", "theotokos-of-vladimir.jpg"]]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await page.clock.setFixedTime(new Date(at));
    await opened(page);
    await tilesInView(page);
    const t = await tiles(page);
    const row = (await chapters(page))[0]?.rows.find((r) => r.lit) ?? null;
    const title = en[`prayers.rule.${hour}.title`];
    must(
      t[0]?.src === `/icons/prayer/${icon}` && t[0]?.line === `${en["prayers.timeline.now"]} · ${title}` && row?.plate === `/icons/prayer/${icon}` && row.text.includes(title),
      `at ${at.slice(11, 16)} the Hours wear ${hour}'s icon and name it, on the tile and in the daily rule (${t[0]?.src}, "${t[0]?.line}"; ${row?.plate ?? "no lit row"})`,
    );
    must(t.every((x) => x.past3x !== null && x.past3x <= 1.4), `at ${at.slice(11, 16)}: no icon drawn more than 1.4 times past its own pixels at 3x (${t.map((x) => x.past3x?.toFixed(2)).join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-practices-${hour}.png`) });
    must(errors.length === 0, `at ${at.slice(11, 16)}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A tablet in the apps: four across, each the size it is on a phone.
  {
    const { ctx, page, errors } = await open({ width: 820, height: 1180, phone: true });
    await page.clock.setFixedTime(NINE_FORTY_ONE);
    await opened(page);
    await tilesInView(page);
    const t = await tiles(page);
    const out = await page.evaluate(sticksOut);
    must(t.length === 4 && t.every((x) => x.top === t[0].top) && t.every((x) => x.width >= 150 && x.width <= 220), `820px: four across, ${t.map((x) => x.width).join(", ")}px wide`);
    must(t.every((x) => x.past3x !== null && x.past3x <= 1.4) && out.length === 0, `820px: no icon drawn past 1.4 times its pixels at 3x (${t.map((x) => x.past3x?.toFixed(2)).join(", ")}), nothing past the edge${out.length ? ": " + out.join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, "prayers-practices-820.png") });
    must(errors.length === 0, `820px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 50. A Community profile, free and with Plus (1.8, r3-28 A; notes 75, 81).
// The owner's pick of 2026-10-31: "A, fade and doors. Two for normal users,
// one for plus users." A reader's profile set like a saint's page: a soft
// light at the top where a Plus banner fades in, the picture in the middle in
// its frame, the name in Lora, the status as one quiet line, then the doors,
// About, Badges and Posts. A free reader's profile is black, white and grey;
// a Plus member's may wear the Church's colours and gold. No streak, and the
// streak's badges are prayer rope medals with no number (refinement 4).
// The export has no server, so the walk plays the website: two SAMPLE
// readers answer /api/community/profile and a verse's words /api/bible/verse
// (no one real, nothing from production). Each profile is opened the app's
// way, /community/#@handle, on all five palettes.
await section(50, async () => {
  console.log("\n50. A Community profile, free and with Plus");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const none = { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null, nameColor: null, bannerMotion: null };
  const since = (d) => `2026-${d}T00:00:00Z`;
  const base = {
    avatar: null,
    verified: false,
    tier: null,
    private: false,
    postsHidden: false,
    nameDay: null,
    prayerRequest: null,
    nowReading: null,
    clergy: null,
  };
  // A free reader, as the server serves one: Plus kept off, colours in grey.
  const FREE = {
    ...base,
    handle: "john.sample",
    name: "John",
    joinedAt: since("09-12"),
    bio: "Catechumen. Learning the Hours one at a time.",
    status: "Reading the Psalter this month",
    patronSaint: { slug: "john-chrysostom", name: "St. John Chrysostom" },
    favoriteVerse: { ref: "john/1/5", label: "John 1:5", href: "/bible/john/1#v5" },
    cosmetics: none,
    badges: [
      { id: "psalter", since: since("10-01") },
      { id: "gospels", since: since("10-04") },
      { id: "first_share", since: since("09-20") },
      { id: "streak_7", since: since("10-08") },
      { id: "early_reader", since: since("09-12") },
      { id: "bug_hunter", since: since("10-12") },
    ],
    posts: [{ id: "walk-post", kind: "discussion", title: "Which psalms are read at the Ninth Hour?", excerpt: "", quoteSource: null, createdAt: since("10-30"), likes: 0, replies: 0 }],
    parish: "St. Nicholas, Dallas",
    links: [{ kind: "instagram", label: "@john.sample", href: "https://www.instagram.com/john.sample" }],
  };
  // A Plus member: the Theotokos' blue for the banner and the theme, the
  // candle frame, gold dust, the gilded name, Dome light over the banner.
  const PLUS = {
    ...base,
    handle: "herman.sample",
    name: "Herman",
    tier: "plus",
    joinedAt: since("07-03"),
    bio: "Reader at our parish. Slowly learning Byzantine chant.",
    status: "Learning the Paschal Canon by heart",
    patronSaint: { slug: "herman-of-alaska", name: "St. Herman of Alaska" },
    favoriteVerse: { ref: "matthew/5/8", label: "Matthew 5:8", href: "/bible/matthew/5#v8" },
    cosmetics: { ...none, bannerColor: "#1f3a6b", themePrimary: "#1f3a6b", themeAccent: "#0b1424", decoration: "candle", effect: "gold-dust", nameColor: "gilded", bannerMotion: "rays" },
    badges: [
      { id: "plus", since: null },
      { id: "gospels", since: since("08-02") },
      { id: "lent", since: since("04-12") },
      { id: "streak_40", since: since("09-14") },
      { id: "early_reader", since: since("07-03") },
      { id: "translator", since: since("10-20") },
    ],
    posts: [],
    parish: null,
    links: [],
  };
  const PEOPLE = { [FREE.handle]: FREE, [PLUS.handle]: PLUS };
  const VERSES = {
    "john/1/5": "And the light shineth in darkness; and the darkness comprehended it not.",
    "matthew/5/8": "Blessed are the pure in heart: for they shall see God.",
  };
  const cors = { "Access-Control-Allow-Origin": ORIGIN, Vary: "Origin" };

  async function opened(set = {}) {
    const o = await open({ width: 390, height: 844, phone: true, set });
    // The website, played by the walk. Registered after the shell's own
    // route, so they are asked first.
    await o.ctx.route(/\/api\/community\/profile\?/, (route) => {
      const h = new URL(route.request().url()).searchParams.get("h") ?? "";
      const profile = PEOPLE[h];
      return route.fulfill(profile
        ? { status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ profile }) }
        : { status: 404, contentType: "application/json", headers: cors, body: JSON.stringify({ error: "Profile not found." }) });
    });
    await o.ctx.route(/\/api\/bible\/verse\?/, (route) => {
      const q = new URL(route.request().url()).searchParams;
      const text = VERSES[`${q.get("book")}/${q.get("chapter")}/${q.get("verse")}`];
      return route.fulfill(text
        ? { status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ name: "", verses: [{ n: Number(q.get("verse")), text }] }) }
        : { status: 404, contentType: "application/json", headers: cors, body: "{}" });
    });
    return o;
  }

  // The first time the app's way in; then, on Community already, by the
  // address's #@handle alone, as a shared link does (a pushed address with
  // only a new hash tells the page nothing).
  async function show(page, handle) {
    const where = await page.evaluate(() => location.pathname).catch(() => "");
    if (where.startsWith("/community")) await page.evaluate((h) => { location.hash = `@${h}`; }, handle);
    else await go(page, `/community/#@${handle}`);
    await page
      .waitForFunction(
        (h) => {
          const card = document.querySelector("[data-profile-card]");
          return !!card && card.innerText.includes(`@${h}`) && !!card.querySelector("[data-profile-doors]");
        },
        handle,
        { timeout: 25000 },
      )
      .catch(() => {});
    // The banner fades in over 900ms, the effect joins after the slide.
    await page.waitForTimeout(1600);
  }

  // Every colour the card wears, from every element and its ::before and
  // ::after, read in OKLCH as lib/ui/goldTone.ts reads it.
  const colours = (page) =>
    page.evaluate(() => {
      const card = document.querySelector("[data-profile-card]");
      if (!card) return null;
      const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      const lch = (r, g, b) => {
        const [R, G, B] = [r, g, b].map(lin);
        const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
        const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
        const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
        const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
        const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
        const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
        const h = (Math.atan2(bb, a) * 180) / Math.PI;
        return { L, C: Math.hypot(a, bb), h: h < 0 ? h + 360 : h };
      };
      const found = [];
      // How strongly it is laid on: 1 with no alpha, a fraction with one.
      const alphaOf = (v) => (v === undefined ? 1 : v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v));
      const read = (text, where) => {
        if (!text || text === "none") return;
        for (const m of text.matchAll(/rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\)/g)) {
          const alpha = alphaOf(m[4]);
          if (alpha === 0) continue;
          found.push({ where, value: m[0], alpha, ...lch(+m[1], +m[2], +m[3]) });
        }
        for (const m of text.matchAll(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)/g)) {
          const alpha = alphaOf(m[4]);
          if (alpha === 0) continue;
          found.push({ where, value: m[0], alpha, ...lch(m[1] * 255, m[2] * 255, m[3] * 255) });
        }
        for (const m of text.matchAll(/oklab\(([\d.]+)(%?)\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\)/g)) {
          const alpha = alphaOf(m[5]);
          if (alpha === 0) continue;
          const a = +m[3];
          const b = +m[4];
          const h = (Math.atan2(b, a) * 180) / Math.PI;
          found.push({ where, value: m[0], alpha, L: m[2] ? m[1] / 100 : +m[1], C: Math.hypot(a, b), h: h < 0 ? h + 360 : h });
        }
      };
      const PROPS = ["color", "backgroundColor", "backgroundImage", "borderTopColor", "boxShadow", "fill", "stroke", "stopColor", "textShadow", "filter"];
      for (const el of [card, ...card.querySelectorAll("*")]) {
        for (const pseudo of [null, "::before", "::after"]) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
          const name = `${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").split(" ")[0]}${pseudo ?? ""}`;
          for (const p of PROPS) read(cs[p], `${name} ${p}`);
        }
      }
      return found;
    });
  const gold = (c) => c.h >= 60 && c.h <= 115 && c.C >= 0.06 && c.L >= 0.36;
  // A colour a reader would see as one: a hue (the four greys are 0.012 at
  // most), laid on at a tenth of its strength or more. The house's own
  // shadow, its ink grey at 6% (globals.css --shadow-sm, rgba(73, 66, 78,
  // 0.06), 0.022 for its faint violet cast), is shade, not colour: it marks
  // the card's grab handle on every profile, Plus or not.
  const hued = (c) => c.C >= 0.02 && c.alpha >= 0.1;
  const list = (cs) => [...new Set(cs.map((c) => `${c.where}: ${c.value}`))].slice(0, 4).join("; ");

  const face = (page) =>
    page.evaluate(() => {
      const card = document.querySelector("[data-profile-card]");
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      const name = card?.querySelector("#profile-name");
      const pic = card?.querySelector("[data-community-avatar]");
      const status = name?.parentElement?.querySelector("p.italic");
      const doors = [...(card?.querySelectorAll("[data-profile-doors] [role=tab]") ?? [])];
      const cs = (el) => (el ? getComputedStyle(el) : null);
      return {
        card: r(card) && { left: r(card).left, width: r(card).width },
        island: card?.classList.contains("dark-island") ?? false,
        top: card?.querySelector("[data-profile-top]")?.getAttribute("data-profile-top") ?? null,
        cloth: card?.querySelector(".profile-cloth") ? cs(card.querySelector(".profile-cloth")).backgroundColor : null,
        picX: pic ? r(pic).left + r(pic).width / 2 : null,
        nameX: name ? r(name).left + r(name).width / 2 : null,
        nameFont: cs(name)?.fontFamily ?? "",
        nameWeight: cs(name)?.fontWeight ?? "",
        nameColour: cs(name?.querySelector("span"))?.color ?? "",
        nameClass: name?.querySelector("span")?.className ?? "",
        ground: cs(card)?.backgroundColor ?? "",
        status: status ? { text: status.textContent, bg: cs(status).backgroundColor, border: cs(status).borderTopWidth } : null,
        doors: doors.map((d) => ({ label: d.textContent.trim(), on: d.getAttribute("aria-selected") === "true", h: Math.round(r(d).height) })),
        frame: card?.querySelector("[data-frame]")?.getAttribute("data-frame") ?? null,
        effect: card?.querySelector(".pfx")?.className ?? null,
        motion: card?.querySelector(".banner-motion")?.className ?? null,
        text: card?.innerText ?? "",
      };
    });

  // The luminance contrast of two computed colours, as WCAG reckons it.
  const contrast = (a, b) => {
    const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0);
    const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // ── Dark, the way the owner draws it: every check.
  {
    const { ctx, page, errors } = await opened();
    await show(page, FREE.handle);
    const f = await face(page);
    must(Boolean(f.card), "a free reader's profile opens over Community, from /community/#@handle");
    must(f.top === "light", `a free reader with no banner has the soft light at the top (${f.top})`);
    must(f.picX !== null && f.card && Math.abs(f.picX - (f.card.left + f.card.width / 2)) <= 2 && Math.abs(f.nameX - f.picX) <= 2, `the picture and the name stand in the middle (${Math.round(f.picX)} and ${Math.round(f.nameX)}, the card's middle ${Math.round(f.card.left + f.card.width / 2)})`);
    must(/lora/i.test(f.nameFont) && f.nameWeight === "600", `the name is Lora at 600 (${f.nameFont.split(",")[0]} ${f.nameWeight})`);
    must(Boolean(f.status) && f.status.text.includes(FREE.status) && /^rgba\(0, 0, 0, 0\)$|transparent/.test(f.status.bg) && f.status.border === "0px", `the status is one quiet line, no bubble (${f.status ? `${f.status.bg}, border ${f.status.border}` : "missing"})`);
    must(!/streak/i.test(f.text) && !/\b\d+-day\b/.test(f.text), "no streak on the profile, and no count of days");
    const doorNames = [en["profile.tabAbout"], en["profile.tabBadges"], en["profile.tabPosts"]];
    must(f.doors.map((d) => d.label).join("|") === doorNames.join("|") && f.doors[0].on, `three doors, About open: ${f.doors.map((d) => `${d.label}${d.on ? " (open)" : ""}`).join(", ")}`);
    must(f.doors.every((d) => d.h === 74), `the doors are a saint's page's, 74px tall (${f.doors.map((d) => d.h).join(", ")})`);
    const free = await colours(page);
    must(Array.isArray(free) && free.length > 20 && free.filter(gold).length === 0, `a free profile wears no gold (${free ? list(free.filter(gold)) || `${free.length} colours, none gold` : "no card"})`);
    must(Array.isArray(free) && free.filter(hued).length === 0, `nor any colour but black, white and grey (${free ? list(free.filter(hued)) || "none" : "no card"})`);
    must(f.frame === null && f.effect === null && f.motion === null && !/name-color/.test(f.nameClass), "and none of Plus: no frame, no effect, no moving banner, no name colour");

    // About: the patron, his icon (its rights settled), his name day; the verse whole, Open and Share.
    const about = await page.evaluate(() => {
      const patron = document.querySelector("[data-profile-patron]");
      const img = patron?.querySelector("img");
      const verse = document.querySelector("[data-profile-verse]");
      return {
        patron: patron?.getAttribute("data-profile-patron") ?? null,
        patronText: patron?.textContent ?? "",
        icon: img ? { src: img.getAttribute("src"), ok: img.complete && img.naturalWidth > 0 } : null,
        verse: verse?.textContent ?? "",
        buttons: [...(verse?.querySelectorAll("a, button") ?? [])].map((b) => b.getAttribute("aria-label")),
      };
    });
    must(about.patron === "john-chrysostom" && about.icon?.ok && /\/saints\/icons\/john-chrysostom[^/]*\.jpg$/.test(about.icon.src ?? ""), `the patron saint's card shows his icon from the bundle (${about.icon ? `${about.icon.src}, ${about.icon.ok ? "loaded" : "not loaded"}` : "no icon"})`);
    must(about.patronText.includes(en["profile.patronNameDay"].replace("{date}", "November 13")), `and his name day (${about.patronText.replace(/\s+/g, " ").trim()})`);
    must(about.verse.includes(VERSES["john/1/5"]) && about.verse.includes(en["reading.collection.kjv"]), `the verse is a card, word for word, with its Bible (${about.verse.replace(/\s+/g, " ").slice(0, 90)})`);
    must(about.buttons.includes(en["today.verse.openChapter"]) && about.buttons.includes(en["today.verse.shareAsPicture"]), `that opens and shares (${about.buttons.join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, "profile-free.png") });

    // Share: the picture sheet stands over the profile, and closing it leaves the profile.
    if (await tap(page.getByRole("button", { name: en["today.verse.shareAsPicture"], exact: true }))) {
      await page.waitForFunction((t) => !!document.querySelector(`[role=dialog][aria-label="${t}"] canvas`), en["picture.title"], { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(900);
      const over = await page.evaluate((t) => {
        const sheet = document.querySelector(`[role=dialog][aria-label="${t}"]`);
        const canvas = sheet?.querySelector("canvas");
        if (!canvas) return null;
        const r = canvas.getBoundingClientRect();
        return sheet.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      }, en["picture.title"]);
      must(over === true, `Share opens the verse's picture over the profile (${over === null ? "no picture sheet" : over ? "on top" : "under the profile"})`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(700);
      const after = await page.evaluate((t) => ({ sheet: !!document.querySelector(`[role=dialog][aria-label="${t}"]`), card: !!document.querySelector("[data-profile-card]") }), en["picture.title"]);
      must(!after.sheet && after.card, `Escape closes the picture and leaves the profile open (${after.sheet ? "the picture stayed" : after.card ? "ok" : "the profile closed too"})`);
    }

    // Badges: a case of medals, the tapped one lit with its meaning; the rope with no number.
    // The open door's panel is the profile's own: Community, under the card,
    // has a panel of its own too (Talk together's half), first on the page.
    const OPEN_DOOR = '[data-profile-card] [role=tabpanel]:not([aria-hidden="true"])';
    const card = page.locator("[data-profile-card]");
    if (await tap(card.getByRole("tab", { name: en["profile.tabBadges"] }))) {
      await page.waitForTimeout(500);
      const rope = page.locator(`${OPEN_DOOR} button:has([data-medal="streak_7"])`);
      await tap(rope);
      await page.waitForTimeout(500);
      const badges = await page.evaluate((sel) => {
        const panel = document.querySelector(sel);
        const medal = panel?.querySelector('button [data-medal="streak_7"]');
        return {
          medals: panel?.querySelectorAll("[data-medal]").length ?? 0,
          pressed: panel?.querySelector('button[aria-pressed="true"] [data-medal]')?.getAttribute("data-medal") ?? null,
          knots: medal ? medal.querySelectorAll('circle[r="3.7"]').length : 0,
          words: medal ? medal.textContent : null,
          meaning: panel?.querySelector("[aria-live]")?.textContent ?? "",
        };
      }, OPEN_DOOR);
      must(badges.medals === FREE.badges.length + 1, `the Badges door is a case of ${FREE.badges.length} medals and the lit one's meaning (${badges.medals} medals)`);
      must(badges.pressed === "streak_7" && badges.meaning.includes(en["profile.badgeAbout.streak_7"]), `the medal tapped is lit, and says what it means (${badges.pressed}: ${badges.meaning.slice(0, 60)})`);
      must(badges.knots === 14 && badges.words === "", `Seven Days is a prayer rope of seven knots, with no number (${badges.knots / 2} knots, words "${badges.words}")`);
      await page.screenshot({ path: path.join(SHOTS, "profile-free-badges.png") });
    }
    if (await tap(card.getByRole("tab", { name: en["profile.tabPosts"] }))) {
      await page.waitForTimeout(400);
      const post = await page.evaluate((sel) => document.querySelector(sel)?.textContent ?? "", OPEN_DOOR);
      must(post.includes(FREE.posts[0].title), `the Posts door holds their posts (${post.replace(/\s+/g, " ").trim().slice(0, 60) || "nothing"})`);
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await opened();
    await show(page, PLUS.handle);
    const f = await face(page);
    const plus = await colours(page);
    must(f.top === "banner" && f.cloth === "rgb(31, 58, 107)", `a Plus member's banner fades in at the top, the Theotokos' blue as cloth (${f.top}, ${f.cloth})`);
    must(f.frame === "candle", `in the candle frame (${f.frame})`);
    must(Array.isArray(plus) && plus.some(gold), `and may wear gold (${plus ? list(plus.filter(gold)) : "no card"})`);
    must(/name-color-gilded/.test(f.nameClass) && /pfx-gold-dust/.test(f.effect ?? "") && /pfx-quiet/.test(f.effect ?? "") && /banner-motion-rays/.test(f.motion ?? ""), `the gilded name, gold dust thinning behind the words, Dome light (${f.nameClass}; ${f.effect}; ${f.motion})`);
    const flame = await page.evaluate(() => {
      const el = document.querySelector('[data-frame="candle"] .af-flame');
      return el ? { name: getComputedStyle(el).animationName, fill: getComputedStyle(el).fill } : null;
    });
    must(flame?.name === "af-flame" && flame.fill === "rgb(255, 255, 255)", `the candle's flame is the Lampada's, white, and breathes (${flame ? `${flame.fill}, ${flame.name}` : "no flame"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, "profile-plus.png") });
    await ctx.close();
  }

  // ── The other four palettes, and the motion switch: no gold for the free
  // reader, the words legible, a Plus card dark on every ground.
  for (const theme of ["parchment", "black", "candlelight", "monastery"]) {
    const { ctx, page, errors } = await opened({ "purify.reader.theme": theme, ...(theme === "parchment" ? { "purify.motion": "off" } : {}) });
    await show(page, FREE.handle);
    const f = await face(page);
    const free = await colours(page);
    must(Array.isArray(free) && free.filter(gold).length === 0, `${theme}: a free profile wears no gold (${free ? list(free.filter(gold)) || "none" : "no card"})`);
    must(contrast(f.nameColour, f.ground) >= 4.5 && !f.island, `${theme}: it follows the palette, its name legible on it (${f.nameColour} on ${f.ground}, ${contrast(f.nameColour, f.ground).toFixed(1)}:1)`);
    await show(page, PLUS.handle);
    const p = await face(page);
    const plus = await colours(page);
    const still = await page.evaluate(() => ({
      flame: getComputedStyle(document.querySelector('[data-frame="candle"] .af-flame') ?? document.body).animationName,
      dust: [...document.querySelectorAll(".pfx .pfx-p")].map((s) => getComputedStyle(s).animationName),
      rays: getComputedStyle(document.querySelector(".banner-motion") ?? document.body, "::before").animationName,
    }));
    must(p.island && Array.isArray(plus) && plus.some(gold), `${theme}: a Plus card stays dark, its gold its own (${p.island ? "dark" : "follows the palette"}, ${plus ? plus.filter(gold).length : 0} gold)`);
    if (theme === "parchment") {
      must(still.flame === "none" && still.dust.length === 10 && still.dust.every((n) => n === "none") && still.rays === "none", `with motion off the flame, the dust and the light hold still (${still.flame}; ${[...new Set(still.dust)].join(",")}; ${still.rays})`);
      await page.screenshot({ path: path.join(SHOTS, "profile-plus-parchment.png") });
    }
    must(errors.length === 0, `${theme}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// ---- 51. A Father's work read as the Bible reads (1.8, round 6).
// The owner's note 79, "refine the books readers", and his pick A of r3-29,
// "As the Bible reads" (Homebase/boards/purify-master/variants/
// r3-29-works-reader.html), with the data it needed: every chapter title
// whole, St John Cassian's books On the Incarnation a work of their own, and
// the place kept to the paragraph with no expiry. On St John Cassian's
// Conferences, as the sheet draws them:
//  - Opening: one chapter as its own page, "Conference 1" large where the
//    Bible's book stands, "Chapter 1" under it, the chapter's own title in
//    italic, one heading, no box round the words; the Bible's pill,
//    "Conference 1 · 1", on its fade; the round buttons over the page.
//  - Back where the reader stopped: a place kept in Conference 24, Chapter 26,
//    at its third paragraph, opens that chapter and stands the paragraph at
//    the reading place, the rest of the chapter stepping back for a moment.
//  - The contents: the pill's name opens the conferences as the Bible's books
//    sheet, the one being read opened at its chapters, the chapter lit, its
//    title under the grid, 12 and 22 "Not in this edition"; a chapter chosen
//    turns the page.
//  - An old link into "Conference 24" lands on the same chapter of On the
//    Incarnation.
// lib/saints/__tests__/parts.test.ts, workMoves.test.ts, titlesWhole.test.ts
// and lib/reader/__tests__/position.test.ts hold the source.
await section(51, async () => {
  console.log("\n51. A Father's work read as the Bible reads");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const CONF = "/saints/john-cassian/conferences/";
  const name = (key, n) => en[`reading.part.${key}`].replace("{n}", String(n));
  const head = (page) =>
    page.evaluate(() => {
      const h = document.querySelector("[data-work-head]");
      return {
        h1s: document.querySelectorAll("h1").length,
        name: h?.querySelector("h1 > span")?.textContent?.trim() ?? null,
        sub: h?.querySelector("h1 > span + span")?.textContent?.trim() ?? null,
        caption: h?.querySelector("[data-work-caption]")?.textContent?.trim() ?? null,
        chapter: document.querySelector("[data-chapter]")?.getAttribute("data-chapter") ?? null,
        pill: document.querySelector("[data-work-pill] [data-pill-name]")?.textContent?.trim() ?? null,
        boxes: [...document.querySelectorAll("[data-work-reader] section")].filter((x) => getComputedStyle(x).borderTopWidth !== "0px").length,
        plates: document.querySelectorAll("[data-plates] button, [data-plates] a").length,
        paragraphs: document.querySelectorAll("[data-work-reader] [data-place]").length,
      };
    });

  // Opening, with nothing kept.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, CONF);
    await page.waitForFunction(() => !!document.querySelector("[data-work-head]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const h = await head(page);
    must(h.h1s === 1 && h.name === name("conference", 1) && h.sub === name("chapter", 1), `the chapter opens as the Bible's: "${h.name}" large, "${h.sub}" under it, one heading (${h.h1s} h1)`);
    must(h.caption === "Of our stay in Scete, and that which we proposed to Abbot Moses.", `the chapter's own title in italic ("${h.caption}")`);
    must(h.chapter === "1" && h.boxes === 0 && h.paragraphs >= 1, `one chapter on the page, no box round the words (chapter ${h.chapter}, ${h.boxes} boxed, ${h.paragraphs} paragraphs)`);
    must(h.pill === `${name("conference", 1)} · 1` && h.plates >= 2, `the Bible's pill names it "${h.pill}", the way back and ••• on plates (${h.plates})`);
    await page.screenshot({ path: path.join(SHOTS, "works-a-open-390.png") });

    // The contents, from the pill's name: the conferences as books, the one
    // being read open at its chapters, 12 and 22 not in this edition.
    await tap(page.locator("[data-work-pill] [data-pill-name]"));
    await page.waitForFunction(() => !!document.querySelector("[data-work-contents]"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(900);
    const sheet = await page.evaluate(() => {
      const list = document.querySelector("[data-work-contents]");
      const rows = list ? [...list.querySelectorAll("[data-part]")] : [];
      return {
        title: list?.closest("[role=dialog]")?.getAttribute("aria-label") ?? null,
        rows: rows.length,
        open: list?.querySelector("[data-open-part]")?.getAttribute("data-part") ?? null,
        lit: list?.querySelector("[aria-current=page]")?.textContent?.trim() ?? null,
        caption: list?.querySelector("[data-contents-caption]")?.textContent?.trim() ?? null,
        omitted: list ? [...list.querySelectorAll("[data-omitted]")].map((li) => li.textContent?.trim()) : [],
        about: !!document.querySelector("[data-about-book]"),
      };
    });
    must(sheet.title === "The Conferences" && sheet.rows === 22 && sheet.open === "conference:1", `the contents: "${sheet.title}", ${sheet.rows} conferences, the one being read opened (${sheet.open})`);
    must(sheet.lit === "1" && String(sheet.caption).includes("Of our stay in Scete"), `its chapter lit (${sheet.lit}), its title under the grid ("${sheet.caption}")`);
    const not = en["reading.part.notInEdition"];
    must(
      sheet.omitted.length === 2 && sheet.omitted[0] === `${name("conference", 12)}${not}` && sheet.omitted[1] === `${name("conference", 22)}${not}`,
      `12 and 22 stand where they would, not in this edition (${sheet.omitted.join(" | ")})`,
    );
    must(sheet.about, "About this book at its top");
    await page.screenshot({ path: path.join(SHOTS, "works-a-contents-390.png") });
    // A chapter chosen turns the page: Conference 1, Chapter 2.
    await tap(page.locator("[data-work-contents] [aria-controls] + div button", { hasText: /^2$/ }).first());
    await page.waitForTimeout(1500);
    const two = await head(page);
    must(two.chapter === "2" && two.sub === name("chapter", 2) && String(two.caption).endsWith("the end of the monk."), `a chapter chosen turns the page (chapter ${two.chapter}, "${two.caption}")`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Back where the reader stopped: Conference 24, Chapter 26, its third paragraph.
  {
    const kept = { "purify.reader.position.john-cassian/conferences": JSON.stringify({ sectionN: 492, paragraph: 2, savedAt: Date.now() - 90 * 86_400_000 }) };
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: kept });
    await go(page, CONF);
    await page.waitForFunction(() => document.querySelector("[data-chapter]")?.getAttribute("data-chapter") === "492", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(350);
    const landing = await page.evaluate(() => {
      const p = document.getElementById("p-492-2");
      const r = p?.getBoundingClientRect();
      const other = document.getElementById("p-492-1");
      return {
        dim: document.documentElement.hasAttribute("data-place-focus"),
        focus: p?.getAttribute("data-focus") ?? null,
        otherOpacity: other ? Number(getComputedStyle(other).opacity) : null,
        top: r ? Math.round(r.top) : null,
        bottom: r ? Math.round(r.bottom) : null,
        middle: Math.round(innerHeight / 2),
      };
    });
    const h = await head(page);
    must(h.chapter === "492" && h.name === name("conference", 24) && h.sub === name("chapter", 26), `a place kept three months ago opens its chapter (${h.name}, ${h.sub})`);
    must(landing.dim && landing.focus === "true", `the paragraph kept is lit and the rest steps back for a moment (${landing.dim ? "dimmed" : "not dimmed"}, ${landing.focus})`);
    await page.waitForTimeout(1600);
    const stood = await page.evaluate(() => {
      const r = document.getElementById("p-492-2")?.getBoundingClientRect();
      return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), middle: Math.round(innerHeight / 2) } : null;
    });
    must(Boolean(stood) && stood.top <= stood.middle && stood.bottom >= stood.middle * 0.5, `it stands at the reading place (${stood ? `${stood.top} to ${stood.bottom}, the middle at ${stood.middle}` : "not found"})`);
    await page.screenshot({ path: path.join(SHOTS, "works-a-return-390.png") });
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => document.documentElement.hasAttribute("data-place-focus"));
    must(!after, "and the chapter comes back after two seconds");
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // An old link into "Conference 24": the same chapter of On the Incarnation.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, `${CONF}#s503`);
    await page.waitForFunction(() => location.pathname.includes("on-the-incarnation") && !!document.querySelector("[data-work-head]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const moved = await page.evaluate(() => ({ path: location.pathname, hash: location.hash }));
    const h = await head(page);
    must(moved.path === "/saints/john-cassian/on-the-incarnation/" && moved.hash === "#s12" && h.name === name("book", 2) && h.sub === name("chapter", 5), `an old link to Conference 24, Chapter 5 lands on On the Incarnation, Book 2, Chapter 5 (${moved.path}${moved.hash}, ${h.name}, ${h.sub})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});
// Build 89's notes 9, 13 and 14 (docs/1.9-build/notes/build-89.md), on the
// built pages, reached inside the app as a reader reaches them.
await section(52, async () => {
  console.log("\n52. Your rule's first frame and its rows, and rows that keep their shade (build 89 notes 9, 13, 14)");

  // How much of the shadows inside each sideways row the row cuts, in px.
  const cuts = (page, selector) =>
    page.evaluate((sel) => {
      const parse = (s) =>
        !s || s === "none"
          ? []
          : s
              .split(/,(?![^(]*\))/)
              .filter((part) => !/\binset\b/.test(part) && !/rgba\([^)]*,\s*0\s*\)/.test(part))
              .map((part) => {
                const [x = 0, y = 0, blur = 0, spread = 0] = (part.replace(/rgba?\([^)]*\)|color-mix\([^)]*\)/g, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
                return { x, y, blur, spread };
              });
      return [...document.querySelectorAll(sel)].map((row) => {
        const box = row.getBoundingClientRect();
        let top = 0;
        let bottom = 0;
        for (const el of row.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          for (const sh of parse(getComputedStyle(el).boxShadow)) {
            top = Math.max(top, box.top - (r.top + sh.y - sh.spread - sh.blur));
            bottom = Math.max(bottom, r.bottom + sh.y + sh.spread + sh.blur - box.bottom);
          }
        }
        return { top: Math.round(top), bottom: Math.round(bottom) };
      });
    }, selector);

  // Note 9: the part the hour gives, from the first frame the switch is drawn.
  for (const [hour, want, other] of [
    [20, "evening", "morning"],
    [8, "morning", "evening"],
  ]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.motion": "on" } });
    await page.clock.setFixedTime(new Date(`2026-11-10T${String(hour).padStart(2, "0")}:00:00`));
    await ctx.addInitScript(() => {
      const frames = (window.__ruleFrames = []);
      const tick = () => {
        if (document.getElementById("mine-tab-morning")) {
          const lit = [...document.querySelectorAll('[id^="mine-tab-"][aria-selected="true"]')].map((b) => b.id.slice(9));
          frames.push(lit.join(",") || "none");
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await go(page, "/prayers/");
    await go(page, "/prayers/personal/");
    await page.waitForSelector("#mine-tab-morning", { timeout: 20000 });
    await page.waitForTimeout(900);
    const seen = await page.evaluate(() => ({
      frames: window.__ruleFrames,
      still: document.querySelector(".rule-track")?.hasAttribute("data-still") ?? null,
    }));
    const order = seen.frames.filter((f, i) => f !== seen.frames[i - 1]);
    must(seen.frames.length > 0 && !seen.frames.includes(other) && seen.frames.at(-1) === want, `Your rule at ${hour}:00 opens on ${want}, and ${other} is never lit first (${order.join(" then ")})`);
    must(seen.still === false, "once open, a reader's tap crosses again");

    // Note 14: In which prayers is the same row as Add prayers one by one.
    const rows = await page.evaluate((part) => {
      const add = document.querySelectorAll(`#mine-panel-${part} [data-mine-ways] > button`)[1];
      const where = document.querySelector("[data-remembered-in]");
      const shape = (b) => {
        const r = b.getBoundingClientRect();
        const plate = b.querySelector(".rule-way-plate")?.getBoundingClientRect();
        const label = b.querySelector(".set-label")?.getBoundingClientRect();
        const chev = b.querySelector(".set-chev")?.getBoundingClientRect();
        if (!plate || !label || !chev) return null;
        return {
          plate: `${Math.round(plate.width)}x${Math.round(plate.height)}`,
          beside: plate.right <= label.left && chev.left >= label.right - 1,
          level: Math.abs((chev.top + chev.bottom) / 2 - (r.top + r.bottom) / 2) < 4 && Math.abs((plate.top + plate.bottom) / 2 - (r.top + r.bottom) / 2) < 4,
        };
      };
      return { add: add ? shape(add) : null, where: where ? shape(where) : null };
    }, want);
    must(
      Boolean(rows.add && rows.where) && rows.where.beside && rows.where.level && rows.where.plate === rows.add.plate,
      `In which prayers is drawn as Add prayers one by one: the plate at the start, the arrow at the end, on one line (${JSON.stringify(rows)})`,
    );
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Note 13: the doors of Search, and the reading room's rows, cut no shade.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
    await go(page, "/");
    // The bar's magnifier, as a reader opens it (section 44 does the same).
    await tap(page.locator(`button[aria-label="${en["search.open"]}"]:visible`).first());
    await page.waitForSelector("[data-search-doors] .search-door-pic", { timeout: 20000 });
    await page.waitForTimeout(500);
    // What a row cuts is what reaches past its own edges.
    const doors = await cuts(page, "[data-search-doors]");
    must(doors.length === 1 && doors[0].top <= 1 && doors[0].bottom <= 1, `Search's Look in row cuts none of the doors' glow or shade (${doors[0] ? `${doors[0].top}px above, ${doors[0].bottom}px below` : "no row"})`);
    await page.keyboard.press("Escape");
    await go(page, "/reading/");
    await page.waitForSelector("[data-reading-row] li", { timeout: 20000 });
    await page.waitForTimeout(500);
    const ids = await page.evaluate(() => [...document.querySelectorAll("[data-reading-row] [class*='overflow-x-auto']")].map((t) => t.closest("[data-reading-row]").getAttribute("data-reading-row")));
    const shade = await cuts(page, "[data-reading-row] [class*='overflow-x-auto']");
    const cut = shade.map((c, i) => (c.top > 1 || c.bottom > 1 ? `${ids[i]} (${c.top}px above, ${c.bottom}px below)` : null)).filter(Boolean);
    must(shade.length > 0 && cut.length === 0, `every reading room row keeps its tiles' shade (${shade.length} rows${cut.length ? "; cut in " + cut.join(", ") : ""})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// Build 90 note 9, the owner on build 90: a saved verse of Matthew 1 opened at
// verse 9 of 25 with his Greek on. The chapter is drawn in English first and
// its Greek is read a moment later and set beside every verse, about doubling
// each verse's height, so the page that had landed on the verse stood on one
// about half as far in (Matthew 5:44 at 5:22, John 3:16 at 3:8). Every place
// that opens a verse lands the same way (a link with #v<n>, VerseFocusFlash),
// which now holds the verse while the chapter settles (lib/ui/readingPlace.ts,
// holdAtReadingPlace). Opened here as a tapped link opens one: the router.
await section(53, async () => {
  console.log("\n53. A link to a verse lands on it, with the Greek on and off (build 90 note 9)");
  // The verse standing at the reading place, two fifths down the screen, and
  // how many verses wear their Greek.
  const standing = (page) =>
    page.evaluate(() => {
      const line = innerHeight * 0.4;
      const rows = [...document.querySelectorAll("[id^=v]")].filter((x) => /^v\d+$/.test(x.id));
      const row = rows.find((x) => {
        const b = x.getBoundingClientRect();
        return b.top <= line && b.bottom >= line;
      });
      return { at: row?.id ?? null, greek: document.querySelectorAll("[lang=grc], [lang=el]").length };
    });
  for (const greek of [true, false]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: greek ? { "purify:interlinear": "1" } : {} });
    await go(page, "/");
    const missed = [];
    let drawn = 0;
    const places = greek
      ? ["/bible/matthew/1/#v21", "/bible/matthew/5/#v44", "/bible/john/3/#v16", "/bible/romans/8/#v28", "/bible/genesis/1/#v26", "/bible/matthew/1/#v2"]
      : ["/bible/matthew/5/#v44", "/bible/john/3/#v16"];
    for (const to of places) {
      await go(page, "/");
      await page.waitForTimeout(400);
      await go(page, to);
      await page.waitForTimeout(3000);
      const { at, greek: cols } = await standing(page);
      if (cols > 0) drawn++;
      const want = `v${/#v(\d+)/.exec(to)[1]}`;
      if (at !== want) missed.push(`${to} stood at ${at ?? "nothing"}`);
    }
    must(greek ? drawn === places.length : drawn === 0, greek ? `the Greek is drawn beside every chapter opened (${drawn} of ${places.length})` : "with the Greek off, none is drawn");
    must(missed.length === 0, `with the Greek ${greek ? "on" : "off"}, every verse opened lands at the reading place (${places.length - missed.length} of ${places.length}${missed.length ? "; " + missed.join(", ") : ""})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A reader who scrolls at once, while the Greek is still coming in, is
  // never pulled back to the verse.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify:interlinear": "1" } });
    const cdp = await ctx.newCDPSession(page);
    await go(page, "/");
    await page.waitForTimeout(400);
    await page.evaluate(() => window.next.router.push("/bible/john/3/#v16"));
    await page.waitForFunction(() => location.pathname.startsWith("/bible/john/3"), null, { timeout: 15000 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 600 }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 600 - i * 40 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(500);
    const handY = await page.evaluate(() => Math.round(scrollY));
    await page.waitForTimeout(3000);
    const laterY = await page.evaluate(() => Math.round(scrollY));
    const { at } = await standing(page);
    // A hold that had not let go would stand 3:16 at the reading place; the
    // last few pixels of the hand's own glide are the hand's.
    must(at !== "v16" && Math.abs(laterY - handY) < 60, `a reader who scrolls while the Greek comes in stays where the hand left the page (${handY}px, then ${laterY}px, at ${at ?? "no verse"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// Build 90 note 10, his word: "when you double tap, it automatically
// highlights the last color you picked ... when you hold it down, then that
// window pops up." On build 90 a lone tap opened the verse's window, which lay
// over the verse, so a double tap opened the window and highlighted nothing.
// Real touch on the export (CDP touch events, as section 12 holds a verse).
await section(54, async () => {
  console.log("\n54. A verse: a tap opens nothing, a double tap highlights, a hold opens the window (build 90 note 10)");
  const LAST = "purify:bible:highlight-last";
  for (const greek of [false, true]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { [LAST]: "blue", ...(greek ? { "purify:interlinear": "1" } : {}) } });
    const cdp = await ctx.newCDPSession(page);
    const finger = async (x, y, ms) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await page.waitForTimeout(ms);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    // A point on the verse's English words, brought to the middle of the screen first.
    const wordsOf = async (n) => {
      await page.evaluate((n) => document.getElementById(`v${n}`).scrollIntoView({ block: "center" }), n);
      await page.waitForTimeout(400);
      return page.evaluate((n) => {
        const r = document.querySelector(`#v${n} p[data-own-press]`).getBoundingClientRect();
        return { x: Math.round(r.left + Math.min(60, r.width / 3)), y: Math.round(r.top + Math.min(14, r.height / 2)) };
      }, n);
    };
    const seen = (n) =>
      page.evaluate((n) => {
        const row = document.getElementById(`v${n}`);
        return {
          window: [...document.querySelectorAll("[role=dialog]")].some((d) => /\b1:\d+$/.test(d.getAttribute("aria-label") ?? "") && (d.getAttribute("aria-label") ?? "").endsWith(`1:${n}`)),
          anyWindow: document.querySelectorAll("[role=dialog]").length,
          highlighted: row?.getAttribute("data-hl") === "true",
          color: row?.getAttribute("data-hl-color") ?? null,
          undo: !!document.querySelector("[data-undo-bar]"),
        };
      }, n);
    await go(page, "/");
    await go(page, "/bible/matthew/1/");
    await page.waitForSelector("#v8 p[data-own-press]", { timeout: 20000 });
    await page.waitForTimeout(greek ? 1500 : 800);
    const tag = greek ? " (Greek on)" : "";

    let at = await wordsOf(3);
    await finger(at.x, at.y, 40);
    await page.waitForTimeout(700);
    const tap = await seen(3);
    must(tap.anyWindow === 0 && !tap.highlighted, `a lone tap opens nothing and marks nothing${tag}`);

    at = await wordsOf(4);
    await finger(at.x, at.y, 40);
    await page.waitForTimeout(110);
    await finger(at.x, at.y, 40);
    await page.waitForTimeout(500);
    const dbl = await seen(4);
    must(dbl.highlighted && dbl.color === "blue" && dbl.anyWindow === 0, `a double tap highlights the verse in the colour picked last, with no window${tag} (${dbl.color ?? "no colour"})`);
    must(dbl.undo, `and offers it back with Undo${tag}`);
    await page.waitForTimeout(400);
    await finger(at.x, at.y, 40);
    await page.waitForTimeout(110);
    await finger(at.x, at.y, 40);
    await page.waitForTimeout(500);
    must(!(await seen(4)).highlighted, `a second double tap takes it off${tag}`);

    at = await wordsOf(5);
    await finger(at.x, at.y, 650);
    await page.waitForTimeout(700);
    must((await seen(5)).window, `a hold opens the verse's window${tag}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    if (!greek) {
      // A keyboard (or a screen reader) opens it in one action, by the verse's own door.
      await page.focus("#v8 [data-verse-door]");
      const door = await page.evaluate(() => {
        const b = document.querySelector("#v8 [data-verse-door]");
        const r = b.getBoundingClientRect();
        return { label: b.textContent, h: Math.round(r.height) };
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(800);
      must((await seen(8)).window && door.label === "Verse actions, Matthew 1:8", `the verse's door, "${door.label}", opens its window from a keyboard`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A paragraph of the Fathers takes the same double tap, in the same colour.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { [LAST]: "teal" } });
    const cdp = await ctx.newCDPSession(page);
    await go(page, "/");
    await go(page, "/saints/athanasius-the-great/on-the-incarnation/");
    await page.waitForSelector("[data-paragraph-idx]", { timeout: 20000 });
    await page.waitForTimeout(800);
    const para = await page.evaluate(() => {
      const el = [...document.querySelectorAll("[data-paragraph-idx]")][1] ?? document.querySelector("[data-paragraph-idx]");
      el.scrollIntoView({ block: "center" });
      return el.id;
    });
    await page.waitForTimeout(400);
    const pt = await page.evaluate((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { x: Math.round(r.left + Math.min(60, r.width / 3)), y: Math.round(r.top + Math.min(14, r.height / 2)) };
    }, para);
    for (let i = 0; i < 2; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
      await page.waitForTimeout(40);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      if (i === 0) await page.waitForTimeout(110);
    }
    await page.waitForTimeout(500);
    const got = await page.evaluate((id) => {
      const el = document.getElementById(id);
      return { hl: el.getAttribute("data-hl") === "true", color: el.getAttribute("data-hl-color"), undo: !!document.querySelector("[data-undo-bar]") };
    }, para);
    must(got.hl && got.color === "teal" && got.undo, `a double tap on a paragraph of the Fathers highlights it in the colour picked last, with Undo (${got.color})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// Build 90 note 6, his words: "I noticed myself scrolling to another section
// when I just realistically want to scroll to the next verse or next bar
// within the same section." Measured on build 90's export: a prayer rested
// only at its first line and, when tall, at its end at the foot, which left
// the last two to five verses below the reading place unread; from there a
// flick carried them off the screen. Now every verse rests (useEasyScroll.ts,
// lib/prayers/easyScroll.ts). Real touch with its fling: Input.dispatchTouchEvent
// (the touch kind of synthesizeScrollGesture does not scroll in this Chromium).
await section(55, async () => {
  console.log("\n55. Easy Scroll by the verse: a short swipe brings the next verse, never the next prayer early (build 90 note 6)");
  const settle = async (page) => {
    let last = -1;
    let still = 0;
    for (let i = 0; i < 100 && still < 6; i++) {
      await page.waitForTimeout(100);
      const y = await page.evaluate(() => scrollY);
      if (Math.abs(y - last) < 0.5) still++;
      else still = 0;
      last = y;
    }
    await page.waitForTimeout(250);
  };
  const swipe = async (cdp, page, dist, ms) => {
    const y0 = 560;
    const steps = Math.max(4, Math.round(ms / 16));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: y0 }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: y0 - (dist * i) / steps }] });
      await new Promise((r) => setTimeout(r, ms / steps));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await settle(page);
  };
  // The verse lit, and the prayer it stands in.
  const lit = (page) =>
    page.evaluate(() => {
      const el = document.querySelector("[data-prayer-reader] [data-lit]");
      const step = el?.closest("[data-step]");
      return { step: step?.id ?? null, n: step ? [...step.querySelectorAll("[data-line]")].indexOf(el) + 1 : 0, of: step ? step.querySelectorAll("[data-line]").length : 0, y: Math.round(scrollY) };
    });
  // A prayer's first verse brought to the reading place, as Begin brings it.
  const toFirst = async (page, id) => {
    await page.evaluate((id) => {
      const html = document.documentElement;
      const place = (parseFloat(html.style.getPropertyValue("--easy-place")) || 0) + (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0);
      const line = document.getElementById(id).querySelector("[data-line]");
      window.scrollTo({ top: scrollY + line.getBoundingClientRect().top - place, behavior: "instant" });
    }, id);
    await settle(page);
  };

  // Psalm 89 of the First Hour at Large, as he read it: a gentle flick from each verse.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.reader.size": "lg" } });
    const cdp = await ctx.newCDPSession(page);
    await go(page, "/");
    await go(page, "/prayers/hours/first-hour/");
    await page.waitForSelector("#psalm-89 [data-verse-stop]", { state: "attached", timeout: 20000 });
    await page.waitForTimeout(800);
    must(await page.evaluate(() => document.documentElement.hasAttribute("data-easy-scroll")), "Easy Scroll is on for a finger, with motion on");
    await toFirst(page, "psalm-89");
    const start = await lit(page);
    const path = [`${start.n}`];
    let jumped = null;
    let prev = start;
    for (let k = 0; k < 30; k++) {
      await swipe(cdp, page, 60, 80);
      const now = await lit(page);
      if (now.step !== "psalm-89") {
        path.push(`${now.step}:${now.n}`);
        if (prev.n !== prev.of) jumped = `left Psalm 89 from verse ${prev.n} of ${prev.of}`;
        break;
      }
      path.push(`${now.n}`);
      if (now.n - prev.n > 2) jumped = `from verse ${prev.n} to ${now.n}`;
      prev = now;
    }
    must(start.step === "psalm-89" && start.n === 1, `Psalm 89 opens at its first verse, lit (${start.step}:${start.n})`);
    must(!jumped && path.at(-1) === "psalm-100:1", `a gentle flick walks Psalm 89 verse by verse, its last verse lit before Psalm 100 begins (${path.join(" > ")}${jumped ? "; " + jumped : ""})`);
    // A brisk fling stays in the psalm.
    await toFirst(page, "psalm-89");
    await swipe(cdp, page, 150, 60);
    const brisk = await lit(page);
    must(brisk.step === "psalm-89" && brisk.n > 1, `a brisk fling runs on through the verses and stays in Psalm 89 (verse ${brisk.n})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // The Lord's Prayer at the largest size: one unbroken verse taller than the room.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.reader.size": "xl" } });
    const cdp = await ctx.newCDPSession(page);
    await go(page, "/");
    await go(page, "/prayers/morning/");
    await page.waitForSelector("#our-father [data-verse-stop]", { state: "attached", timeout: 20000 });
    await page.waitForTimeout(800);
    const parts = await page.evaluate(() => [...document.querySelectorAll("#our-father [data-verse-stop]")].map((m) => m.getAttribute("data-verse-stop")));
    await toFirst(page, "our-father");
    const a = await lit(page);
    await swipe(cdp, page, 60, 80);
    const b = await lit(page);
    await swipe(cdp, page, 60, 80);
    const c = await lit(page);
    must(parts.join(",") === "edge,after" && a.step === "our-father" && b.step === "our-father" && b.y > a.y && c.step !== "our-father", `the Lord's Prayer rests at its start, then with its end at the foot, then the next prayer comes (${parts.join(",")}; ${a.step} y${a.y}, ${b.step} y${b.y}, ${c.step})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Morning Prayers walked to the Amen with gentle flicks: every prayer counted once, none early.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    const cdp = await ctx.newCDPSession(page);
    await go(page, "/");
    await go(page, "/prayers/morning/");
    await page.waitForSelector("[data-prayer-reader] [data-verse-stop]", { state: "attached", timeout: 20000 });
    await page.waitForTimeout(800);
    const ids = await page.evaluate(() => [...document.querySelectorAll("[data-prayer-reader] [data-step]")].map((s) => s.id));
    await toFirst(page, ids[0]);
    let early = [];
    let prev = await lit(page);
    for (let k = 0; k < 160; k++) {
      await swipe(cdp, page, 60, 80);
      const now = await lit(page);
      if (now.step !== prev.step && prev.step && prev.n !== prev.of) early.push(`${prev.step} at ${prev.n} of ${prev.of}`);
      if (now.y === prev.y) break;
      prev = now;
    }
    const today = await page.evaluate(() => {
      const d = new Date();
      const key = `purify.prayers.morning.today.${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      try {
        return JSON.parse(localStorage.getItem(key) ?? "[]");
      } catch {
        return [];
      }
    });
    const counted = new Set(today);
    const missed = ids.filter((id) => !counted.has(id));
    must(early.length === 0, `no prayer left before its last verse was lit (${early.length ? early.join(", ") : `${ids.length} prayers`})`);
    must(missed.length <= 1 && today.length === counted.size, `every prayer passed is counted once (${counted.size} of ${ids.length}${missed.length ? "; the last, not passed: " + missed.join(", ") : ""})`);
    // A hold on a verse still offers Save.
    await page.evaluate(() => document.querySelector("#creed [data-line]").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    const at = await page.evaluate(() => {
      const r = document.querySelector("#creed [data-line]").getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
    await page.waitForTimeout(900);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(500);
    const pill = await page.evaluate(() => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === "Actions for this text");
      return d ? [...d.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || (b.innerText || "").trim()).filter(Boolean) : [];
    });
    must(pill.some((b) => /Bookmark this prayer/.test(b)), `a hold on a verse still offers Save (${pill.join(", ") || "no pill"})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // With Purify's motion off, nothing rests: the page scrolls as any page.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify.motion": "off" } });
    await go(page, "/");
    await go(page, "/prayers/morning/");
    await page.waitForSelector("[data-prayer-reader] [data-step]", { timeout: 20000 });
    await page.waitForTimeout(800);
    const off = await page.evaluate(() => ({ easy: document.documentElement.hasAttribute("data-easy-scroll"), marks: document.querySelectorAll("[data-verse-stop]").length, snap: getComputedStyle(document.documentElement).scrollSnapType }));
    must(!off.easy && off.marks === 0 && off.snap === "none", `with motion off nothing rests (${JSON.stringify(off)})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

await section(56, async () => {
  console.log("\n56. Philemon and Philippians wear their English tags, and the timeline link is 44 tall (1.9 quick wins)");
  // Philemon showed no Greek at all until 1.9, its tags having been
  // Philippians'; Philippians had the Greek and no English tags. With the
  // Greek on, each English word of both now carries the number of the Greek
  // it renders, and Philemon's first is Paul, Παῦλος.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "purify:interlinear": "1" } });
    await go(page, "/");
    for (const [to, first] of [["/bible/philemon/1/", { w: "Paul,", s: "3972", greek: "Παῦλος" }], ["/bible/philippians/1/", { w: "Paul", s: "3972", greek: "Παῦλος" }], ["/bible/philippians/4/", null]]) {
      await go(page, "/");
      await page.waitForTimeout(300);
      await go(page, to);
      await page.waitForFunction(() => document.querySelectorAll("[data-word-idx][data-s]").length > 0, null, { timeout: 15000 }).catch(() => {});
      const got = await page.evaluate(() => {
        const tagged = [...document.querySelectorAll("#v1 [data-word-idx][data-s]")];
        return {
          tagged: document.querySelectorAll("[data-word-idx][data-s]").length,
          verses: [...document.querySelectorAll("[id^=v]")].filter((x) => /^v\d+$/.test(x.id) && x.querySelector("[data-word-idx][data-s]")).length,
          all: [...document.querySelectorAll("[id^=v]")].filter((x) => /^v\d+$/.test(x.id)).length,
          first: tagged[0] ? { w: tagged[0].textContent?.trim(), s: tagged[0].getAttribute("data-s") } : null,
          greek: document.querySelector("#v1")?.textContent ?? "",
        };
      });
      must(got.tagged > 0 && got.verses === got.all, `${to}: every verse's English carries its Greek numbers (${got.verses} of ${got.all} verses, ${got.tagged} words)`);
      if (first) must(got.first?.w === first.w && got.first?.s === first.s && got.greek.includes(first.greek), `${to}: its first word is "${first.w}", ${first.greek} (G${first.s}) (${JSON.stringify(got.first)})`);
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // "Explore the interactive timeline" under a saint's events in Orthodox
  // History: 44 tall to the touch, flagged at 20 on every saint page with
  // events (the November saints chat, 2026-11-10).
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/");
    for (const to of ["/saints/john-of-damascus/", "/saints/athanasius-the-great/"]) {
      await go(page, to);
      await page.waitForFunction(() => document.querySelector('section a[href="/history"], section a[href="/history/"]'), null, { timeout: 15000 }).catch(() => {});
      const box = await page.evaluate(() => {
        const a = document.querySelector('section a[href="/history"], section a[href="/history/"]');
        if (!a) return null;
        a.scrollIntoView({ block: "center" });
        const r = a.getBoundingClientRect();
        return { h: Math.round(r.height), w: Math.round(r.width), words: a.textContent?.trim() };
      });
      must(!!box && box.h >= 44 && box.w >= 44, `${to}: "${box?.words}" is ${box?.w}x${box?.h}, 44 or more each way`);
    }
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// St Cyril on Luke stood twice as two sections under one number (F-49, quick
// win 15 of his "everything in 1.9"): Sermon 29 and its fragments, Sermon 96
// and the Catena's Sermon 97. The second halves have numbers of their own,
// 1029 and 97; a highlight kept before the split shows on both halves as it
// did, and a highlight made since is the half's it was made on
// (lib/saints/sharedSections.ts).
await section(57, async () => {
  console.log("\n57. St Cyril on Luke's second halves under numbers of their own, a highlight from before on both (F-49)");
  const KEY = (n, i) => `purify:saint:cyril-of-alexandria:commentary-on-luke:${n}:${i}`;
  const { ctx, page, errors } = await open({
    width: 390,
    height: 844,
    phone: true,
    set: {
      "purify:bible:highlight-last": "teal",
      "purify:saints:sharedSplitAt": String(Date.parse("2026-11-10T12:00:00Z")),
      [KEY(29, 2)]: JSON.stringify({ highlighted: true, color: "blue", at: "2026-10-01T09:00:00.000Z" }),
    },
  });
  const cdp = await ctx.newCDPSession(page);
  const shown = (n) =>
    page.evaluate((n) => {
      const sec = document.getElementById(`s${n}`);
      const p = (i) => document.getElementById(`p-${n}-${i}`);
      return {
        here: !!sec,
        sections: document.querySelectorAll("section[id^=s]").length,
        heading: (sec?.querySelector("[data-work-head]")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        hl2: p(2)?.getAttribute("data-hl") === "true" ? p(2).getAttribute("data-hl-color") : null,
        hl4: p(4)?.getAttribute("data-hl") === "true" ? p(4).getAttribute("data-hl-color") : null,
        nextHref: [...document.querySelectorAll("a[href*='#s']")].map((a) => a.getAttribute("href")).filter((h) => /commentary-on-luke/.test(h ?? "")),
      };
    }, n);
  const openAt = async (n) => {
    await go(page, "/");
    await page.waitForTimeout(300);
    await go(page, `/saints/cyril-of-alexandria/commentary-on-luke/#s${n}`);
    await page.waitForFunction((n) => !!document.getElementById(`p-${n}-2`), n, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    return shown(n);
  };
  await go(page, "/");

  const first = await openAt(29);
  const fragments = await openAt(1029);
  const sermon96 = await openAt(96);
  const catena = await openAt(97);
  must(first.here && fragments.here && sermon96.here && catena.here, `Sermon 29, its fragments, Sermon 96 and the Catena's Sermon 97 each open at their own address (#s29, #s1029, #s96, #s97)`);
  must(/Sermon 29/.test(fragments.heading) && /the fragments/.test(fragments.heading) && /Sermon 97/.test(catena.heading) && /from the Catena/.test(catena.heading), `the second halves are headed Sermon 29, the fragments, and Sermon 97, from the Catena (${fragments.heading} | ${catena.heading})`);
  must(first.hl2 === "blue" && fragments.hl2 === "blue", `a highlight kept on Sermon 29 before the split shows on both halves, as it did (${first.hl2}, ${fragments.hl2})`);

  // A double tap on the fragments' fifth paragraph: the highlight is theirs.
  await openAt(1029);
  const pt = await page.evaluate(() => {
    const el = document.getElementById("p-1029-4");
    el.scrollIntoView({ block: "center" });
    return el.id;
  });
  await page.waitForTimeout(400);
  const xy = await page.evaluate((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return { x: Math.round(r.left + Math.min(60, r.width / 3)), y: Math.round(r.top + Math.min(14, r.height / 2)) };
  }, pt);
  for (let i = 0; i < 2; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [xy] });
    await page.waitForTimeout(40);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    if (i === 0) await page.waitForTimeout(110);
  }
  await page.waitForTimeout(600);
  const kept = await page.evaluate((keys) => keys.map((k) => localStorage.getItem(k) !== null), [KEY(1029, 4), KEY(29, 4)]);
  const back = await openAt(29);
  const again = await openAt(1029);
  must(kept[0] && !kept[1] && again.hl4 === "teal" && back.hl4 === null, `a highlight made on the fragments since is theirs: kept under 1029, and not on Sermon 29 (${JSON.stringify(kept)}, ${again.hl4}, ${back.hl4})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 58. English reads left to right under Arabic (1.9, build 90 note 4).
// The full walk is scripts/rtl-walk.mjs: every route, in Arabic and Urdu.
// These four pages catch a slip between full walks: John 1, the Morning Rule,
// a council and Today. A saint's page joins when the Updates chat's part lands.
await section(58, async () => {
  console.log("\n58. English reads left to right under Arabic: John 1, the Morning Rule, a council, Today (build 90 note 4)");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "CapacitorStorage.purify_locale": "ar" } });
  for (const at of ["/bible/john/1/", "/prayers/morning/", "/councils/first-nicaea/", "/"]) {
    await go(page, at);
    await page.waitForTimeout(1500);
    const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
    const out = await page.evaluate(englishOutOfPlace);
    const shown = out.slice(0, 3).map((o) => `<${o.tag}> ${o.why}: "${o.words.slice(0, 40)}"`).join(" | ");
    must(dir === "rtl" && out.length === 0, `${at} in Arabic: the page right to left, and no English running right to left or announced as Arabic${out.length ? ` (${out.length}: ${shown})` : ""}`);
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// The saints and five pages in the reader's language in the apps (1.9, the
// reader's language sweep, parts 3 and 4: Updates 2's split of 2026-11-10,
// the Updates chat's share). Each page writes the English; a German reader's
// German comes on the device from a file of its own, marked lang="de". Every
// other reader is shown the English page, whose words are mostly the
// catalog's and so their own: About and the FAQ are in all 21 languages that
// way and say nothing about English, and only the lines that are English
// (the FAQ's lead, the Privacy Policy, the patch notes, a saint's life) say
// lang="en" dir="ltr". An English reader sees what was always there.
await section(59, async () => {
  console.log("\n59. About, Privacy, the FAQ, Support, What's New and the saints in the reader's language (the reader's language in the apps)");
  // `fr` and `ar`: a heading the reader is shown in their own language; `note`: whether the page says its body is English; `english`: whether some of it is.
  const PAGES = [
    { to: "/about/", de: "Eine Wohnung für das orthodoxe Leben.", fr: "Un sanctuaire pour la vie orthodoxe", ar: "ملاذ للحياة الأرثوذكسية", note: false, english: false },
    { to: "/faq/", de: "Ehrliche Antworten auf häufige Fragen.", fr: "Questions fréquentes.", ar: "الأسئلة المتكررة.", note: false, english: true },
    { to: "/privacy/", de: "Was wir aufzeichnen und was", fr: "Ce que Purify garde", ar: "ما يحفظه Purify", note: true, english: true },
    { to: "/support/", de: "Das Werk hinter der App.", fr: "L’œuvre derrière l’application.", ar: "العمل القائم خلف التطبيق.", note: false, english: false },
    { to: "/whats-new/", de: "Versionshinweise", fr: null, ar: null, note: true, english: true },
    // A saint's life: its English lines say so with note 4's marks, which its own walk holds.
    { to: "/saints/alexander-of-alexandria/", de: "Patriarch von Alexandrien, der den Presbyter Arius", fr: null, ar: null, note: true, english: null },
  ];
  const NOTE = /Traduction en cours|Translation in progress|Übersetzung in Arbeit|Übersetzung im Werden|الترجمة قيد العمل|الترجمة قيد الإعداد/;
  const GERMAN = /Eine Wohnung für das orthodoxe Leben|Ehrliche Antworten auf häufige Fragen|Was wir aufzeichnen und was|Das Werk hinter der App|Versionshinweise|Patriarch von Alexandrien, der den Presbyter Arius/;
  for (const locale of ["de", "fr", "ar", "en"]) {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "CapacitorStorage.purify_locale": locale } });
    await go(page, "/");
    for (const p of PAGES) {
      await go(page, "/");
      await page.waitForTimeout(300);
      await go(page, p.to);
      // A German reader's words come a moment after the page.
      if (locale === "de") await page.waitForFunction((w) => document.body.innerText.includes(w), p.de, { timeout: 15000 }).catch(() => {});
      else await page.waitForTimeout(1500);
      const got = await page.evaluate(({ own, de, NOTE, GERMAN }) => {
        const text = document.body.innerText;
        const leaf = (w) => w && [...document.querySelectorAll("main *")].find((el) => el.children.length === 0 && (el.textContent ?? "").includes(w));
        const langOf = (el) => (el ? (el.closest("[lang]")?.getAttribute("lang") ?? null) : null);
        // The reader's own words set left to right, or announced in another language.
        const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
        const html = document.documentElement.lang;
        const turned = [...document.querySelectorAll("main *")].filter((el) => {
          const words = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
          if (!words || !el.getClientRects().length) return false;
          // The reader's own words are mostly Arabic letters; an English line that
          // names a language in its own script (a patch note) keeps its English mark.
          if ((words.match(ARABIC) ?? []).length <= (words.match(/[A-Za-z]/g) ?? []).length) return false;
          return getComputedStyle(el).direction !== "rtl" || langOf(el) !== html;
        }).map((el) => `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`);
        return {
          german: text.includes(de),
          germanLang: langOf(leaf(de)),
          ownLang: langOf(leaf(own)),
          englishMarked: !!document.querySelector('main [lang="en"][dir="ltr"]'),
          note: (text.match(new RegExp(NOTE)) ?? [""])[0],
          anyGerman: new RegExp(GERMAN).test(text),
          turned,
        };
      }, { own: p[locale] ?? null, de: p.de, NOTE: NOTE.source, GERMAN: GERMAN.source });
      if (locale === "de") must(got.german && got.germanLang === "de" && !got.note, `German reader, ${p.to}: the German, marked lang="de", and no note about the language (${got.german}, ${got.germanLang}, ${got.note || "no note"})`);
      if (locale === "fr" || locale === "ar") {
        const who = locale === "fr" ? "French" : "Arabic";
        must(!got.anyGerman && (!p[locale] || got.ownLang === locale) && (p.english === null || got.englishMarked === p.english) && !!got.note === p.note, `${who} reader, ${p.to}: ${p[locale] ? `its own words, as the page's own (lang ${got.ownLang}), ` : ""}${p.english ? 'the English lines marked lang="en" dir="ltr"' : p.english === null ? "the English" : "no English"}, ${p.note ? `with the page's note that its body is English (${got.note || "none"})` : `and no note that it is English (${got.note || "none"})`}`);
      }
      if (locale === "ar") {
        must(got.turned.length === 0, `Arabic reader, ${p.to}: no Arabic set left to right or announced in another language${got.turned.length ? `: ${got.turned.slice(0, 3).join(" | ")}` : ""}`);
        // The pages the split mends whole; What's New's notes and a saint's life are note 4's, in its own walk.
        if (!["/whats-new/", "/saints/alexander-of-alexandria/"].includes(p.to)) {
          const out = await page.evaluate(englishOutOfPlace);
          must(out.length === 0, `Arabic reader, ${p.to}: every line of English runs left to right and says it is English (${out.length}${out.length ? `: ${out.slice(0, 2).map((o) => `<${o.tag}> ${o.why} "${o.words.slice(0, 30)}"`).join(" | ")}` : ""})`);
        }
      }
      if (locale === "en") must(!got.anyGerman && !got.note, `English reader, ${p.to}: as before, English, no note`);
    }
    // The Greek line under the saints' heading, for every reader but a Greek one.
    await go(page, "/saints/");
    await page.waitForTimeout(800);
    must(await page.evaluate(() => [...document.querySelectorAll('p[lang="grc"][dir="ltr"]')].some((el) => el.textContent === "Οι Άγιοι")), `${locale} reader, /saints/: the Greek line under the heading, marked lang="grc" dir="ltr"`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  // A Greek reader is not shown it twice.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, set: { "CapacitorStorage.purify_locale": "el" } });
    await go(page, "/saints/");
    await page.waitForTimeout(800);
    must(await page.evaluate(() => !document.querySelector('p[lang="grc"]')), "Greek reader, /saints/: no Greek line, the heading says it already");
    await ctx.close();
  }
});

// ---- 60. English reads left to right under Arabic on the Updates chat's
// families (1.9, build 90 note 4): the saints' index, a saint's page, a work
// of the Fathers, an event and its peek, the dictionary, What's New, the
// parish finder, the calendar and the Terms. The full walk is
// scripts/rtl-walk.mjs; these catch a slip between full walks.
await section(60, async () => {
  console.log("\n60. English reads left to right under Arabic: the saints, history, the dictionary, What's New, parishes, the calendar, the Terms (build 90 note 4)");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, set: { "CapacitorStorage.purify_locale": "ar" } });
  const said = (out) => out.slice(0, 3).map((o) => `<${o.tag}> ${o.why}: "${o.words.slice(0, 40)}"`).join(" | ");
  for (const at of ["/saints/", "/saints/alexander-of-alexandria/", "/saints/augustine-of-hippo/confessions/", "/history/alaska-mission/", "/dictionary/", "/whats-new/", "/parishes/", "/calendar/", "/terms/"]) {
    await go(page, at);
    await page.waitForTimeout(1500);
    const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
    const out = await page.evaluate(englishOutOfPlace);
    must(dir === "rtl" && out.length === 0, `${at} in Arabic: the page right to left, and no English running right to left or announced as Arabic${out.length ? ` (${out.length}: ${said(out)})` : ""}`);
  }
  // An event's peek, opened from the timeline with a tap, as a phone opens it.
  await go(page, "/history/");
  await page.waitForTimeout(1200);
  await page.locator("[data-event-slug] a").first().click();
  await page.waitForSelector("[data-event-peek]", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(700);
  const peek = await page.evaluate(() => document.querySelector("[data-event-peek]")?.getAttribute("data-event-peek") ?? null);
  const inPeek = await page.evaluate(englishOutOfPlace);
  must(peek !== null && inPeek.length === 0, `an event's peek in Arabic (${peek ?? "not opened"}): no English running right to left or announced as Arabic${inPeek.length ? ` (${inPeek.length}: ${said(inPeek)})` : ""}`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

// ---- 61. A heading's long words stay inside a phone's width (1.9, build 90;
// the arbiter's yes of 2026-11-10 to a general rule). At 320px, in each
// language whose own words ran past a heading's box when measured
// (lib/ui/longHeadings.ts: German and Georgian), on the pages with the largest
// headings and the saints' cards: no drawn heading runs past its own box or
// the screen's edge. A heading in a row that scrolls sideways may start past
// the screen by design and is not counted; one cut short on purpose
// (truncate) keeps its ellipsis. The rule is app/globals.css's block of that
// name; lib/ui/__tests__/longHeadings.test.ts holds it.
await section(61, async () => {
  console.log(`\n61. A heading's long words stay inside a phone's width at 320: ${LONG_HEADING_LANGUAGES.join(", ")}`);
  for (const lang of LONG_HEADING_LANGUAGES) {
    const { ctx, page, errors } = await open({ width: 320, height: 720, phone: true, set: { "CapacitorStorage.purify_locale": lang } });
    for (const at of LONG_HEADING_PAGES) {
      await go(page, at);
      await page.waitForTimeout(1200);
      const shown = await page.evaluate(() => document.documentElement.lang);
      const past = await page.evaluate(() => {
        const out = [];
        for (const h of document.querySelectorAll("h1, h2, h3")) {
          const r = h.getBoundingClientRect();
          if (r.width <= 2 || r.height <= 2 || h.classList.contains("sr-only")) continue;
          const st = getComputedStyle(h);
          if (st.visibility === "hidden" || st.textOverflow === "ellipsis") continue;
          if (r.left < -1 || r.left > window.innerWidth - 8) continue;
          const by = Math.max(h.scrollWidth - h.clientWidth, Math.round(r.right - window.innerWidth));
          if (by > 1) out.push(`"${(h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 32)}" +${by}px`);
        }
        return out;
      });
      must(shown === lang && past.length === 0, `${lang} ${at} at 320: no heading past its edge${shown !== lang ? ` (the page said lang="${shown}")` : ""}${past.length ? ` (${past.length}: ${past.slice(0, 3).join(", ")})` : ""}`);
    }
    must(errors.length === 0, `${lang}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
});

// ---- 62. St Cyril on John's sections named by the verse he is on (1.9,
// quick win 14A, F-49). The ingest named each by the first quotation of John
// in it; lib/saints/__tests__/cyrilJohnPlaces.test.ts holds the titles and
// their copies, and this reads them where a reader meets them: the work's
// own headings, the rail's place as the apps are shipped it, a Theology
// page's reference and a heresy page's gloss.
await section(62, async () => {
  console.log("\n62. St Cyril on John: each section named by the verse he is on, on the work, the rail, Theology and a heresy page (F-49)");
  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  const heading = async (n) => {
    await go(page, "/");
    await page.waitForTimeout(300);
    await go(page, `/saints/cyril-of-alexandria/commentary-on-john/#s${n}`);
    // Any paragraph of it: an empty slot (section 453's first four) is not drawn.
    await page.waitForFunction((n) => !!document.querySelector(`[id^="p-${n}-"]`), n, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    return page.evaluate((n) => (document.getElementById(`s${n}`)?.querySelector("[data-work-head]")?.textContent ?? "").replace(/\s+/g, " ").trim(), n);
  };
  const preface = await heading(1);
  const eunomius = await heading(17);
  const book5 = await heading(453);
  // Read while it is here (the work loads in parts); textContent, as a long work lays out only what is near.
  const book5Words = await page.evaluate(() => (document.getElementById("s453")?.textContent ?? "").replace(/\s+/g, " "));
  const cross = await heading(1053);
  must(/Preface/.test(preface) && !/John 12:35/.test(preface), `Book 1's opening is its Preface, not "on John 12:35" (${preface})`);
  must(/John 1:1\b/.test(eunomius) && !/3:35/.test(eunomius), `the answer to Eunomius is under John 1:1, not 3:35 (${eunomius})`);
  must(/John 7:25\b/.test(book5) && !/7:39/.test(book5), `Book 5 opens on John 7:25, not 7:39 (${book5})`);
  must(!/That no work of Jewish might/.test(book5Words) && /Some therefore of them of Jerusalem said/.test(book5Words), `Book 5's table of chapters is not shown as his words; the section opens with its first lemma (${book5Words.slice(0, 90)})`);
  must(/John 19:30\b/.test(cross) && !/20:31/.test(cross), `the section after "It is finished" is still on John 19:30, not 20:31 (${cross})`);

  // The rail's place, as the apps carry it: the note on John 7:39 is from Book 5's opening, on 7:25.
  const rail = await page.evaluate(async () => {
    const r = await fetch("/bible-data/commentary/john/7.json");
    if (!r.ok) return { status: r.status };
    const d = await r.json();
    // Two of its notes are from sections truly on 7:39; the one from section 453 is not.
    const notes = (d["39"] ?? []).filter((n) => n.at?.work === "cyril-of-alexandria/commentary-on-john" && n.at.section === 453);
    return { status: r.status, places: notes.map((n) => n.at.place) };
  });
  must(rail.status === 200 && rail.places?.length === 1 && rail.places[0] === "Book 5, on John 7:25", `the rail's note on John 7:39 from Book 5's opening names its place as Book 5, on John 7:25 (${JSON.stringify(rail)})`);

  await go(page, "/theology/theosis/read/");
  await page.waitForTimeout(1200);
  // textContent: the quotations stand far down a long page, not yet laid out, so innerText skips them.
  const theosis = await page.evaluate(() => document.body.textContent ?? "");
  must(theosis.includes("Book 9, on John 14:20") && !theosis.includes("Book 9, on John 15:15"), `Theosis quotes St Cyril from Book 9, on John 14:20, not 15:15`);

  await go(page, "/heresies/eunomianism/");
  await page.waitForTimeout(1200);
  const heresy = await page.evaluate(() => document.body.innerText);
  must(heresy.includes("On John 1:1: the misconceit of Eunomius") && !heresy.includes("On John 3:35"), `the Eunomianism page cites St Cyril on John 1:1, not 3:35`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
});

await browser.close();
if (!everySection) console.log(`\nOnly the sections chosen were walked: ${walked.join(", ") || "none"}.`);
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
