// Walks the native export the way the apps run it. Run after
// scripts/native-build.mjs and before out/ is removed:
//   node scripts/export-walk.mjs [out dir]
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

import { NATIVE_UA, ORIGIN, go, inBundle, payloadBytes, serveLikeTheShell } from "./lib/shell-server.mjs";

const OUT = path.resolve(process.argv[2] ?? "out");
const SHOTS = path.resolve(".release-logs/walk");
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
/** Every document any context asked for, and any page's own .html: section 11 reads them. */
const everyDocument = [];
const everyPageFile = [];
async function open({ width, height, phone, set = {}, locale }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, colorScheme: "dark", ...(locale ? { locale } : {}), ...(phone ? { isMobile: true, hasTouch: true, userAgent: NATIVE_UA } : {}) });
  await ctx.addInitScript((values) => { for (const [k, v] of Object.entries(values)) window.localStorage.setItem(k, v); }, { "purify:onboarded": "3", "purify:whatsNewSeen": "99", ...set });
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

// ---- 1. A phone, the Greek off: the page is its verses and asks for nothing more.
{
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
    await mark.tap();
    await page.waitForTimeout(1800);
    must(data(asked).includes("/bible-data/commentary/john/1.json"), "opening a verse's commentary reads the commentary file");
    const sheet = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); return d ? d.innerText.replace(/\n+/g, " ").slice(0, 160) : ""; });
    must(sheet.length > 40, `the sheet shows the Fathers: "${sheet.slice(0, 110)}"`);
    await page.screenshot({ path: path.join(SHOTS, "john1-commentary-sheet.png") });
  } else must(false, "found a commentary mark to tap");
  say("  missing files", missing.filter((m) => !m.includes("favicon")).slice(0, 5).join(", ") || "none");
  await ctx.close();
}

// ---- 2. A phone, the Greek on: the Greek and the lexicon are read, and a word opens.
{
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
}

// ---- 3. A computer's width: the study rail reads the commentary and draws it.
{
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
}

// ---- 4. An Old Testament chapter with Greek, and a chapter with no commentary.
{
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
}

// ---- 5. A long work of the Fathers: the page is light and the work is read from its file.
{
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  const work = "/saints/gregory-the-dialogist/morals-on-the-book-of-job/";
  await go(page, work);
  await page.waitForTimeout(4000);
  console.log("\n5. St. Gregory's Morals on Job on a phone");
  const payload = payloadBytes(OUT, work);
  must(payload > 0 && payload < 300_000, `the page is light (${Math.round(payload / 1024)} KB of payload; before 1.5.1 it was 4.2 MB)`);
  must(asked.includes("/saints-data/gregory-the-dialogist/morals-on-the-book-of-job.json"), "the work is read from its file");
  const text = await page.evaluate(() => document.body.innerText);
  must(/Morals on the Book of Job/i.test(text) && /Book 35/.test(text), `the reader is drawn, all 35 books listed (${text.length} characters on the page)`);
  // Open the first book: its text is there to read.
  await page.evaluate(() => {
    const shown = [...document.querySelectorAll("button, summary, [role=button]")].filter((e) => e.offsetParent !== null && /Book 1, on Job 1/.test(e.textContent || ""));
    shown[0]?.scrollIntoView({ block: "center" });
    shown[0]?.click();
  });
  await page.waitForTimeout(1500);
  const opened = await page.evaluate(() => document.body.innerText.length);
  must(opened > text.length + 5000, `opening a book shows its text (${opened} characters)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.screenshot({ path: path.join(SHOTS, "morals-phone.png") });
  await ctx.close();
}
{
  const { ctx, page, asked, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/saints/athanasius-the-great/on-the-incarnation/");
  await page.waitForTimeout(3500);
  console.log("\n6. St. Athanasius, On the Incarnation, on a phone");
  must(asked.includes("/saints-data/athanasius-the-great/on-the-incarnation.json"), "the work is read from its file");
  const text = await page.evaluate(() => document.body.innerText);
  must(/Incarnation/i.test(text) && text.length > 1500, `the reader is drawn (${text.length} characters on the page)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}

// ---- 7. The Saints tab: every saint is listed, and the page no longer carries the registry twice.
{
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
}

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
{
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
    await explain.tap();
    await page.waitForTimeout(900);
    const out = await page.evaluate(sticksOut);
    must(out.length === 0, `a saint's explainer, open${out.length ? ": " + out.join(" | ") : ""}`);
    const sheet = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); if (!d) return null; const r = d.lastElementChild.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth }; });
    must(Boolean(sheet) && sheet.left >= 0 && sheet.right <= sheet.vw, `the explainer is a sheet inside the screen (${sheet ? sheet.left + ".." + sheet.right + " of " + sheet.vw : "no dialog"})`);
    await page.screenshot({ path: path.join(SHOTS, "saint-explainer-phone.png") });
  } else must(false, "found the saint's explainer to open");
  await go(page, "/saints/john-chrysostom/on-the-priesthood/");
  await page.waitForTimeout(2500);
  const bar = await page.evaluate(() => { const b = document.querySelector("[data-mobile-topbar]"); if (!b) return null; const r = b.getBoundingClientRect(); const last = b.lastElementChild.getBoundingClientRect(); return { right: Math.round(last.right), vw: innerWidth, bar: Math.round(r.right) }; });
  must(Boolean(bar) && bar.right <= bar.vw, `a work's top bar ends inside the screen (${bar ? bar.right + " of " + bar.vw : "no bar"})`);
  await page.screenshot({ path: path.join(SHOTS, "work-topbar-phone.png") });
  await ctx.close();
}

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
{
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
  await link.tap();
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
}

// ---- 10. The shop's bar marks where the reader is (1.5.2).
// The export writes every address with a closing slash, so the shop's front
// page is "/shop/" here and "/shop" on the website. The bar compared the
// address with "/shop" exactly, so in the apps it stood with no tab marked on
// the one shop screen every reader opens first. The website never showed it.
// Skipped when the export was built with the shop off.
if (inBundle(OUT, "/shop/")) {
  console.log("\n10. The shop's bar marks where the reader is");
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
} else {
  console.log("\n10. The shop's bar marks where the reader is");
  console.log("  ..  /shop/ is not in this export (built with the shop off), so its bar was not looked at");
}

// ---- 12. The apps select nothing by themselves, and a hold copies (1.5.2).
// The owner, of holding the screen in the app and moving: "the screen turns
// blue. I want you to remove that feature so there's a native system built
// into the app. Where when you copy anything, it uses our system." So in the
// shells the system's selection is off (app/globals.css), a verse's own pill
// carries Copy, and a hold on any other text offers Copy for the block under
// the finger (components/native/PressToCopy.tsx). Numbered 12 and run before
// 11, which counts every document the walk opened and so comes last.
{
  console.log("\n12. The apps select nothing by themselves, and a hold copies");
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
  await page.locator('button[aria-label*="earch" i]').first().tap();
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
      await page.locator("[role=dialog] button", { hasText: /^Copy$/ }).tap();
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
    const tools = await page.evaluate(() => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /John 1:/.test(x.getAttribute("aria-label") || ""));
      return d ? [...d.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || "").filter(Boolean) : null;
    });
    must(Boolean(tools) && tools.includes("Copy verse"), `holding a verse raises the verse's pill, with Copy in it (${tools ? tools.length + " buttons" : "no pill"})`);
    must((await pill()) === null, "and not the general one as well");
    must((await selected()) === "", "the system selected nothing there either");
    const fits = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /John 1:/.test(x.getAttribute("aria-label") || "")); if (!d) return null; const rs = [...d.querySelectorAll("button[aria-label]")].filter((b) => b.getBoundingClientRect().width < 100).map((b) => b.getBoundingClientRect()); return { left: Math.round(Math.min(...rs.map((r) => r.left))), right: Math.round(Math.max(...rs.map((r) => r.right))), vw: innerWidth }; });
    must(Boolean(fits) && fits.left >= 0 && fits.right <= fits.vw, `every button of the pill is on the screen (${fits ? fits.left + ".." + fits.right + " of " + fits.vw : "no pill"})`);
    // And they sit in even rows. Seven buttons were first set in a width
    // counted in pixels for a 16px root; the app's is 17px, and they came
    // out three, three and one.
    const rows = await page.evaluate(() => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /John 1:/.test(x.getAttribute("aria-label") || ""));
      if (!d) return null;
      const all = [...d.querySelectorAll("button[aria-label]")].filter((b) => b.getBoundingClientRect().width < 100 && b.getBoundingClientRect().height > 30);
      const tray = all[all.length - 1].parentElement;
      const inTray = all.filter((b) => b.parentElement === tray);
      const tops = [...new Set(inTray.map((b) => Math.round(b.getBoundingClientRect().top)))];
      return tops.map((y) => inTray.filter((b) => Math.round(b.getBoundingClientRect().top) === y).length);
    });
    must(Boolean(rows) && (rows.length === 1 || (rows.length === 2 && rows[0] <= 4 && rows[0] - rows[1] <= 1)), `the pill's buttons sit in even rows (${rows ? rows.join(" and ") : "no pill"})`);
    await page.screenshot({ path: path.join(SHOTS, "hold-verse-phone.png") });
    if (tools && tools.includes("Copy verse")) {
      await page.locator('[role=dialog] button[aria-label="Copy verse"]').tap();
      await page.waitForTimeout(400);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => "could not read: " + e);
      must(/\nJohn 1:\d+$/.test(clip) && clip.length > 30, `Copy puts the verse and where it is from on the clipboard ("${clip.replace(/\n/g, " / ").slice(0, 90)}")`);
    }
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();

  // And outside the shell, a browser keeps what a browser has.
  const web = await open({ width: 1366, height: 900, phone: false });
  await go(web.page, "/prayers/morning/");
  await web.page.waitForTimeout(2000);
  const webCss = await web.page.evaluate(() => getComputedStyle(document.body).userSelect);
  must(webCss !== "none", `outside the shell the page is selectable as any page is (user-select: ${webCss})`);
  await web.ctx.close();
}

// ---- 11. The phones open one document (1.5.2).
// Capacitor answers every address without an extension with the front door's
// index.html, so the bundle carries that one and no other
// (scripts/native-build.mjs, prunePageDocuments: 1,922 files and 219 MB the
// shells never served). Three things hold that up: the bundle really has one,
// nothing in this whole walk asked for another, and the only document any
// context opened was the front door. If a tool or a page ever asks for a
// page's own index.html, it shows here before it ships.
{
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
}

// ---- 13. With no signal (1.6).
// This whole walk answers nothing from outside the bundle, so every check
// above is already the app with no network. What none of them asked is what
// a reader is TOLD. Measured on 2026-10-11: all 34 screens tried drew, and
// the shop said "Failed to fetch", the engine's words, to a reader with no
// signal. Here the phone also says it is offline, the three things a reader
// opens the app for are opened, and the two places that need the network
// have to say so in plain words of ours.
{
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
}

// ---- 14. One search (1.6).
// The magnifier on every screen opened a search that knew the books, the
// saints and the prayer rules, and nothing else: not a verse, not a work of
// the Fathers, not the journal, not one setting. The owner's test for 1.6 is
// that a reader finds prayers, saints, verses and settings from that one
// box. This opens it the way a thumb does and asks it for each.
{
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
}
// ---- 15. The front door is the app's (1.6).
// The apps load one document, and it is the website's front door. Until 1.6
// it carried the website's whole front page too: the phone was handed it,
// drew it behind the splash, fetched its pictures, and then dropped it for
// Today. The export leaves it out now (app/page.tsx). If it comes back, the
// document grows and the pictures are asked for again, and both show here.
{
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
}
// ---- 16. A phone set to another language (1.6).
// 1.6 is built around Greek, Romanian and Filipino. On first open the app
// takes the phone's language, and the one search answers in it: a book is
// named and found as the reader's own Bible names it, a setting as the
// reader's Settings screen does. The words expected are read from the
// catalogs, so this follows them when a translation is corrected.
{
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
}
// ---- 17. Start here, and a verse as a picture (1.6).
// Two things for the reader who is new, or who wants to send a verse to
// someone. Start here is seven doors to screens the app already has, so the
// check is that there are seven and that the first one opens. The picture is
// drawn on the phone from the verse on the screen: with no share sheet in
// this browser it is saved, and what is saved has to be a real PNG of the
// card's size.
{
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
  must(Boolean(frame.icon) && frame.icon.ok && frame.icon.src === "/sections/prayers.jpg" && frame.icon.w * 2 <= frame.icon.natural + 2, `the Pantocrator stands whole at the top, never enlarged past its pixels (${frame.icon ? `${frame.icon.w}px wide of ${frame.icon.natural}` : "none"})`);
  must(frame.guide && frame.guideAfterSteps, "after the steps, the door to Your first Liturgy");
  await page.screenshot({ path: path.join(SHOTS, "start-phone.png"), fullPage: true });
  await page.locator("ol > li a").first().click();
  await page.waitForFunction(() => location.pathname.startsWith("/prayers/learning/"), null, { timeout: 15000 }).catch(() => {});
  const first = await page.evaluate(() => location.pathname);
  must(first.startsWith("/prayers/learning/what-is-prayer"), `the first step opens the first lesson (${first})`);

  await go(page, "/");
  await page.locator('button[aria-label="More actions"]').first().click();
  const saved = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page.locator("button", { hasText: "Share as a picture" }).first().click(),
  ]).then(([d]) => d).catch(() => null);
  must(!!saved, "the verse card offers Share as a picture, and a picture comes out");
  if (saved) {
    const to = path.join(SHOTS, "verse-picture.png");
    await saved.saveAs(to);
    const png = fs.readFileSync(to);
    // A PNG says its own size in bytes 16 to 23.
    const isPng = png.subarray(1, 4).toString("latin1") === "PNG";
    const width = isPng ? png.readUInt32BE(16) : 0;
    const height = isPng ? png.readUInt32BE(20) : 0;
    must(isPng && width === 1080 && height === 1350, `it is a PNG of the card's size (${width} by ${height}, ${Math.round(png.length / 1024)} KB)`);
    must(/^purify-[a-z0-9-]+\.png$/.test(saved.suggestedFilename()), `named for its verse (${saved.suggestedFilename()})`);
  }
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}
// ---- 18. The start does not read every saint's life (1.6).
// lib/saints/saints.ts is every profile with its life, 484 KB of source, and
// until 1.6 the calendar imported it, so the code a cold open reads carried
// all of it. The calendar reads the saints in brief now (lib/saints/brief.ts).
// The unit test follows the imports. This opens the app and reads the files
// the start asked for, looking for a line that only a life has, and then
// opens the saints screen to be sure the line can be found at all.
{
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
}
// ---- 19. The splash is not lifted onto the wrong language (1.6).
// The apps are built in English and corrected on the device. Until 1.6 the
// splash lifted before that was done, so a phone set to Greek showed Today in
// English for a moment on every cold start. The first screen now waits for its
// language (lib/i18n/launchLanguage.ts) and so does the splash. The bridge
// says when it lifts it, data-launch on <html>, and this reads the screen on
// that frame: what a reader sees the instant the logo goes.
{
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
}
// ---- 20. The screens a server wrote in English follow the phone's language (1.6).
// A server component that looks a phrase up writes a string into the page, and
// in the export the server ran once, in English. Until 1.6 that froze the
// Discover tab, the reading room and a dozen headings in English on every
// phone, though each line was already translated. They are <T> islands now
// (components/i18n/T.tsx). The unit test holds the source; this opens the
// screens on a phone set to Greek and reads them.
{
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
    "search.placeholder", "discover.tile.saints", "discover.tile.reading", "discover.tile.history", "discover.tile.councils",
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
    const lines = ["search.placeholder", "discover.tile.saints", "discover.tile.reading", "discover.tile.calendar", "nav.discoverMenu.walkthroughs", "discover.tile.start", "nav.chat"];
    const there = lines.filter((k) => text.toLowerCase().includes(en[k].toLowerCase()));
    must(there.length === lines.length, `a phone set to English: Discover reads as it should (${there.length} of ${lines.length} lines)`);
    // The History band and the reading room's card left the screen: History
    // and Reading are tiles now.
    const cta = en["study.history.exploreTimeline"];
    must(!text.toLowerCase().includes(cta.toLowerCase()) && !text.includes(en["reading.enterReadingRoom"]), `and the History band and the reading-room card are gone ("${cta}")`);
    await ctx.close();
  }
}
// ---- 21. What every page of the export carries (1.6).
// Whatever a layout, the not-found page or the root metadata writes is
// written into EVERY page's payload, so a kilobyte there is two megabytes of
// the app. Three such things were found in 1.6 and came out: the names of
// thirty-six components (now two frames), the whole "page not found" screen
// (now one reference), and the website's link-preview tags (now a title).
// The unit tests hold the source. This reads the built files, with no
// browser, so the gain cannot quietly go back.
{
  console.log("\n21. What every page carries");
  const at = (file) => fs.readFileSync(path.join(OUT, "bible", "john", "1", file), "utf8");
  // One line of a payload per client component it names.
  const named = (text) => text.split("\n").filter((row) => /^[0-9a-f]+:I\[/.test(row)).map((row) => (row.match(/"([^"]*)"\]$/) ?? [])[1] ?? "");
  const layout = named(at("__next._index.txt"));
  must(layout.includes("RootFrame") && layout.length <= 8, `the root layout's file names ${layout.length} components, the frame among them (it was 26)`);
  const page = at("index.txt");
  const inPage = named(page);
  must(inPage.includes("AppFrame") && !inPage.includes("MobileTabBar") && !inPage.includes("PrayerSyncBridge"), "a chapter names the two frames and not the parts inside them");
  must(inPage.includes("NotFoundScreen") && !page.includes("min-h-screen bg-night flex items-center justify-center"), "and carries a reference to the not-found screen, not the screen");
  const head = at("__next._head.txt");
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
  // the rail, and the phone's bar with the two things it holds.
  const gone = ["ReaderPrefsProvider", "BookSwitcher", "TranslationSwitcher", "ChapterPager", "BibleSearch", "BookChapterSidebar", "ChapterDiscussions"].filter((n) => inPage.includes(n));
  must(inPage.includes("ChapterScreen") && gone.length === 0, `a chapter names its screen and not the parts inside it${gone.length ? " (still named: " + gone.join(", ") + ")" : ""}`);
  must(inPage.length <= 20, `it names ${inPage.length} client components in all (it was 38)`);
  must(page.length < 40 * 1024, `John 1 is ${(page.length / 1024).toFixed(1)} KB to read (it was 68.1 KB at 1.5.2, and 51.1 before the screen)`);
}
// ---- 22. The day's readings, the calendar's date and a saint's feast day, in the reader's language (1.6).
// Three things a screen drew straight from English data, whatever the phone
// was set to: a reading's reference ("Luke 13:31-35"), the long date over the
// calendar's feast panel ("Friday · November 13, 2026") and a saint's feast
// day ("Εορτή August 9": the label from the catalog, the date not). The book
// is named from the catalog now (referenceIn, lib/bible/books.ts) and the
// dates are written by the device (formatLongDateDual, lib/saints/feastDay.ts).
// The unit tests hold the rules. This opens the screens on a phone set to
// Greek, on a fixed day, and reads them.
{
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
}
// ---- 23. The owner's answers of 2026-10-12 (1.6).
// A great feast's readings lead and the day's own go under them, labelled
// (lib/calendar/orthodox.ts, FEAST_LEADS). And the lines whose English he
// approved that day, Start here and Find a parish, are in the reader's
// language, where until then they were English in every language on purpose.
{
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
    // 1.7: the day's verse is a link into its chapter too, so the card is the
    // first list that holds a reading, the Church today.
    const card = await page.evaluate(() => {
      const box = [...document.querySelectorAll('a[href*="/bible/"][href*="#v"]')].map((a) => a.closest("ul.rounded-2xl, div.rounded-2xl")).find(Boolean);
      return box ? (box.textContent ?? "").replace(/\s+/g, " ") : "";
    });
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
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await page.clock.setFixedTime(new Date("2026-11-13T10:30:00"));
    await go(page, "/");
    await page.waitForFunction(() => document.querySelector('a[href*="/bible/"][href*="#v"]'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => document.body.textContent ?? "");
    must(!text.includes(en["bible.readForDay"]), `and on an ordinary day nothing is headed "${en["bible.readForDay"]}"`);
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
}
// ---- 24. Open almost at once (1.6).
// The one document the apps load carries the outline of a screen, with no
// words in it, and a few lines that lift the phone's logo screen once the
// outline is painted (lib/platform/launchFrame.ts). This reads the document,
// then watches a cold start frame by frame: the outline is up before the app
// has drawn anything, the logo screen is asked to go once and by the document
// itself, the outline covers the page until the app says it is ready, and
// then it is gone and the tab bar answers a tap. Last, with the app's code
// held back altogether, the outline still comes up, and still goes.
//
// What this cannot see is the phone's own logo screen going. A browser has
// none. That part needs a real phone.
{
  console.log("\n24. Open almost at once: the outline before the app");
  const doc = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  const at = doc.indexOf("data-launch-frame");
  must(at > 0, "the apps' document carries the outline");
  const scriptAt = doc.indexOf("<script", at);
  const outline = at > 0 ? doc.slice(doc.lastIndexOf("<div", at), scriptAt) : "";
  must(outline.length > 200 && outline.replace(/<[^>]+>/g, "").trim() === "", `and it has no words in it (${outline.length} bytes of boxes)`);
  must(at > 0 && doc.slice(scriptAt, scriptAt + 900).includes("nativePromise"), "the lines that lift the logo screen follow it in the document");

  // Every frame from the first. The shell's own handle is stood in for, so a
  // call to it is seen: only the document's lines use it here, because the
  // app's own call goes through the plugin, which in a browser does nothing.
  const watch = () => {
    const log = { asks: [], first: null, frame: null, ready: null, covered: [], words: [] };
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
        if (up && log.first === null) log.first = now;
        if (state === "frame" && log.frame === null) log.frame = { at: now, today };
        if (state === "ready" && log.ready === null) log.ready = { at: now, today };
        if (up && state !== "ready") {
          // Nine points across the screen: each belongs to the outline.
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

  // A cold start, as it goes.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await ctx.addInitScript(watch);
    await go(page, "/");
    await page.waitForFunction(() => window.__open?.ready, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    const log = await page.evaluate(() => window.__open);
    must(log.first !== null && log.ready && log.first < log.ready.at, `the outline is painted before the app is ready (at ${log.first} ms; the app says ready at ${log.ready?.at} ms)`);
    must(log.asks.length === 1 && log.asks[0][1] === "SplashScreen" && log.asks[0][2] === "hide", `the document asks the phone to lift its logo screen, once (${log.asks.map((a) => `${a[1]}.${a[2]} at ${a[0]} ms`).join(", ") || "never"})`);
    must(log.frame && log.ready && log.frame.at <= log.ready.at && log.asks[0]?.[0] <= log.ready.at, `and it asks before the app is ready (marked at ${log.frame?.at} ms)`);
    must(log.covered.length > 0 && log.covered.every((n) => n === 9), `while it is up it covers the page (${log.covered.length} frames, least ${Math.min(...log.covered, 9)} of 9 points)`);
    must(log.words.length === 0, `and shows no words${log.words.length ? ": " + log.words[0].slice(0, 60) : ""}`);
    must(log.ready?.today === true, "when the app says ready, Today is under it");
    const after = await page.evaluate(outlineNow);
    must(after && after.visibility === "hidden" && after.opacity === 0 && !after.takesTheMiddle, `then the outline is gone (visibility ${after?.visibility}, opacity ${after?.opacity})`);
    await page.locator("[data-tab-label]").nth(1).tap();
    await page.waitForFunction(() => location.pathname !== "/", null, { timeout: 15000 }).catch(() => {});
    must(new URL(page.url()).pathname !== "/", `and the tab bar answers a tap (went to ${new URL(page.url()).pathname})`);
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    say("  outline painted, ms", log.first);
    say("  logo asked to go, ms", log.asks[0]?.[0] ?? "never");
    say("  app ready, ms", log.ready?.at ?? "never");
    say("  the moment a reader gains, ms", log.ready && log.asks[0] ? log.ready.at - log.asks[0][0] : "unknown");
    await ctx.close();
  }

  // The outline's shapes sit where Today's do, so the screen does not jump
  // when Today takes over. Measured on an ordinary day, on a phone set to
  // English. The verse card's height is the day's, so only its top is held.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await page.clock.setFixedTime(new Date("2026-11-13T10:30:00"));
    await go(page, "/");
    await page.waitForFunction(() => (document.querySelector("[data-route-content] .rise-none")?.getBoundingClientRect().height ?? 0) > 100, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const fit = await page.evaluate(() => {
      const box = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) } : null;
      };
      const frame = document.querySelector("[data-launch-frame]");
      const [bar, body, foot] = frame ? frame.children : [];
      return {
        bar: [box(bar), box(document.querySelector("[data-route-content] header"))],
        // 1.7: the streak row (children[3]) stands between the greeting and
        // the verse, so the verse is the outline's fifth shape.
        card: [box(body?.children[4]), box(document.querySelector("[data-route-content] .rise-none"))],
        next: [box(body?.children[5]), box(document.querySelector("[data-route-content] .rise-none + section"))],
        tabs: [box(foot?.firstElementChild), box(document.querySelector("[data-tab-label]")?.closest("div.rounded-3xl"))],
      };
    });
    const near = (a, b, by) => a !== undefined && b !== undefined && Math.abs(a - b) <= by;
    must(near(fit.bar[0]?.bottom, fit.bar[1]?.bottom, 1), `the outline's top bar ends where Today's does (${fit.bar[0]?.bottom} and ${fit.bar[1]?.bottom} px)`);
    must(near(fit.card[0]?.top, fit.card[1]?.top, 4), `its first card starts where the day's verse does (${fit.card[0]?.top} and ${fit.card[1]?.top} px)`);
    must(near(fit.tabs[0]?.top, fit.tabs[1]?.top, 3) && near(fit.tabs[0]?.height, fit.tabs[1]?.height, 3), `and its tab bar sits on Today's (${fit.tabs[0]?.top} and ${fit.tabs[1]?.top} px down, ${fit.tabs[0]?.height} and ${fit.tabs[1]?.height} tall)`);
    say("  second card's top, outline and Today (the verse above it is the day's length), px", `${fit.next[0]?.top} and ${fit.next[1]?.top}`);
    await ctx.close();
  }

  // The app's code held back altogether: what the phone has at first paint.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await ctx.addInitScript(watch);
    await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(`${ORIGIN}/`, { waitUntil: "commit", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.dataset.launch === "frame", null, { timeout: 20000 }).catch(() => {});
    const held = await page.evaluate(outlineNow);
    const log = await page.evaluate(() => window.__open);
    must(held && held.state === "frame" && held.visibility === "visible" && held.takesTheMiddle, "with the app's code held back, the outline is still on the screen");
    must(log.asks.length === 1, `and the logo screen has still been asked to go (${log.asks.length} time${log.asks.length === 1 ? "" : "s"})`);
    await page.screenshot({ path: path.join(SHOTS, "open-outline-phone.png") });
    // And it never stays for good: past its limit the document says ready itself.
    await page.waitForFunction(() => document.documentElement.dataset.launch === "ready", null, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(500);
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
      const log = { asks: [], frame: null, today: null, ready: null };
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
      }, 10);
    });
    // Not go(): it waits on frames, and so does a wait with no polling time.
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__still?.ready, null, { timeout: 20000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(600);
    const log = await page.evaluate(() => window.__still);
    const gone = await page.evaluate(outlineNow);
    must(log.asks.length === 1 && log.frame !== null && log.frame < 2000, `with no frames at all, the document still asks the phone to lift its logo screen, once (${log.asks.length} time${log.asks.length === 1 ? "" : "s"}, marked at ${log.frame} ms)`);
    must(log.today !== null && log.ready !== null && log.ready - log.today < 1500, `and the app still says ready once Today is in the page, not at its 4 second limit (Today at ${log.today} ms, ready at ${log.ready} ms)`);
    must(gone && gone.state === "ready" && gone.visibility === "hidden", `and the outline goes (visibility ${gone?.visibility})`);
    await ctx.close();
  }

  // The same outline on a light palette and on a tablet, for the eye.
  for (const [name, size, set] of [
    ["open-outline-light.png", { width: 390, height: 844 }, { "purify.reader.theme": "parchment" }],
    ["open-outline-tablet.png", { width: 820, height: 1180 }, {}],
  ]) {
    const { ctx, page } = await open({ ...size, phone: true, set });
    await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(`${ORIGIN}/`, { waitUntil: "commit", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.dataset.launch === "frame", null, { timeout: 20000 }).catch(() => {});
    await page.screenshot({ path: path.join(SHOTS, name) });
    await ctx.close();
  }
}
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
{
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
  must(tile("/shop") === words["nav.shop"] && tile("/community") === words["nav.chat"], `Discover has a ${tile("/shop") || "(no)"} tile and a ${tile("/community") || "(no)"} tile`);
  must(!tiles.some(([h]) => h === "/account"), "and no longer ends on a Settings row");
  await page.screenshot({ path: path.join(SHOTS, "discover-tiles-phone.png"), fullPage: true });
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
  await page.locator("[data-tab-label]").last().tap();
  await page.waitForFunction(() => location.pathname.startsWith("/account"), null, { timeout: 15000 }).catch(() => {});
  must(new URL(page.url()).pathname.startsWith("/account"), `the last tab, ${want[4]}, opens the reader's own screen (${new URL(page.url()).pathname})`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}
// ---- 26. The small labels, in the reader's language (1.6).
// Forty-five lines that were written into the screens in English and so were
// English on every phone: the palettes' names and what each one is, the
// saints' groups, the four feasts that move with Pascha, the FAQ's questions,
// two lines of the support screen and the shop's line for no connection. The
// owner approved their translations on 2026-10-13 and they read from the
// catalogs now. The unit test holds the keys; this opens the screens on a
// phone set to Greek and reads them, the support and FAQ pages through their
// islands among them, which only a built app can show.
{
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
}

// ---- 27. The Bible tab: its picture, then an index.
// The owner said of this screen on 2026-10-13: "this design has way too much
// stuff going on here". Under the picture it was an empty card saying a card
// would appear, two tinted pills, a band with a button and a lone half width
// tile, and the first book began 1007 px down a phone 844 tall. He was shown
// it with and without the picture and kept the picture; everything under it
// is now the rows the book list always had. Where the first book lands, and
// what a phone with nothing read is shown, only a built app can say.
{
  console.log("\n27. The Bible tab is its picture, then rows");
  const words = (code) => JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8"));
  const en = words("en");
  const el = { ...en, ...words("el") };
  const squeeze = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const look = (page) =>
    page.evaluate(() => {
      const tablist = document.querySelector("[role=tablist]");
      const body = tablist?.closest(".cascade");
      if (!body) return null;
      const flat = (n) => (n?.textContent ?? "").replace(/\s+/g, " ").trim();
      const bar = document.querySelector("[data-tab-label]")?.closest("nav");
      const firstBook = tablist.parentElement.querySelector("ul li a");
      const cont = body.querySelector("[data-bible-continue] a");
      return {
        kinds: [...body.children].map((n) => n.tagName).join(" "),
        picture: !!body.querySelector("figure img"),
        cont: cont ? { href: cont.getAttribute("href"), start: flat(cont.children[0]), end: flat(cont.children[1]) } : null,
        heading: flat(body.querySelector("[data-bible-readings] p")),
        readings: [...body.querySelectorAll("[data-bible-readings] li a")].map((a) => ({ href: a.getAttribute("href"), start: flat(a.children[0]), end: flat(a.children[1]) })),
        study: [...body.querySelectorAll("[data-bible-study] a")].map((a) => ({ href: a.getAttribute("href"), text: flat(a) })),
        // Anything drawn in another look: the old band, a tinted card or tile, a pill, gold.
        others: body.querySelectorAll(".lm-feature, .lm-card, [class*='premium'], [class*='gold'], [class*='rounded-pill']").length,
        firstBookAt: Math.round(firstBook.getBoundingClientRect().top),
        barTop: Math.round(bar ? bar.getBoundingClientRect().top : innerHeight),
      };
    });
  const openTab = async (page) => {
    await go(page, "/bible/");
    await page.waitForFunction(() => document.querySelector("[data-bible-readings] li a") && document.querySelector("[role=tablist]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
  };
  const READING = /^\/bible\/[a-z0-9-]+\/\d+\/?#v\d+$/;
  {
    // A phone that has read nothing.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await openTab(page);
    const got = await look(page);
    must(!!got && got.kinds === "P FIGURE SECTION NAV DIV", `a phone that has read nothing is shown the picture, the day's readings, the study row and the books, and nothing else (${got?.kinds})`);
    must(!!got && got.picture && got.cont === null, "with no Continue row, and no card saying one will appear");
    must(
      !!got && got.readings.length >= 1 && got.readings.length <= 3 && got.readings.every((r) => READING.test(r.href) && /\d/.test(r.start) && [en["bible.kindGospelLong"], en["bible.kindEpistleLong"], en["bible.kindOtLong"]].includes(r.end)),
      `the day's readings are rows, the reference and which reading it is (${got?.readings.map((r) => `${r.start} / ${r.end}`).join(", ")})`,
    );
    must(!!got && [en["bible.appointedToday"], en["bible.readForCommemoration"]].includes(got.heading), `under the heading the tab always gave them (${got?.heading})`);
    must(!!got && got.study.length === 2 && got.study[0].href.replace(/\/$/, "") === "/plans" && got.study[1].href.replace(/\/$/, "") === "/journal" && got.study[0].text === en["plans.title"] && got.study[1].text === en["journal.title"], "Reading plans and Your journal are one row of two halves");
    must(!!got && got.others === 0, `nothing under the header is drawn in another look: no band, tinted card, pill or gold (${got?.others})`);
    must(!!got && got.firstBookAt < got.barTop - 40, `the first book is on the first screen (its row begins at ${got?.firstBookAt} px, the bar at ${got?.barTop}; it began at 1007)`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  {
    // A phone part way through a chapter.
    const { ctx, page } = await open({ width: 390, height: 844, phone: true, set: { "purify:bible:last": JSON.stringify({ book: "john", bookName: "John", chapter: 3, verse: 16, totalVerses: 36, ts: 1 }) } });
    await openTab(page);
    const got = await look(page);
    must(!!got && got.kinds === "P FIGURE UL SECTION NAV DIV", `a phone part way through a chapter has one more row, over the readings (${got?.kinds})`);
    must(!!got?.cont && /^\/bible\/john\/3\/?#v16$/.test(got.cont.href) && got.cont.start === `${en["bible.books.john"]} 3` && got.cont.end === squeeze(en["bible.continueAtVerseOf"].replace("{verse}", "16").replace("{total}", "36")), `which goes back to the verse (${got?.cont?.start} / ${got?.cont?.end}, to ${got?.cont?.href})`);
    say("  first book's row begins at, px", got?.firstBookAt);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone-continue.png") });
    await ctx.close();
  }
  {
    // A phone set to Greek, at the top of a chapter whose book has a long name.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true, locale: "el-GR", set: { "purify:bible:last": JSON.stringify({ book: "1-thessalonians", bookName: "1 Thessalonians", chapter: 5, verse: 1, totalVerses: 28, ts: 1 }) } });
    await openTab(page);
    const got = await look(page);
    must(!!got?.cont && /^\/bible\/1-thessalonians\/5\/?$/.test(got.cont.href) && got.cont.start === `${el["bible.books.1-thessalonians"]} 5` && got.cont.end === el["bible.continueReading"], `a phone set to Greek names the book and the way back in Greek (${got?.cont?.start} / ${got?.cont?.end})`);
    must(!!got && [el["bible.appointedToday"], el["bible.readForCommemoration"]].includes(got.heading) && got.readings.every((r) => [el["bible.kindGospelLong"], el["bible.kindEpistleLong"], el["bible.kindOtLong"]].includes(r.end)), `and the readings' heading and kinds (${got?.heading}: ${got?.readings.map((r) => r.end).join(", ")})`);
    must(!!got && got.study.length === 2 && got.study[0].text === el["plans.title"] && got.study[1].text === el["journal.title"], `and the study row (${got?.study.map((s) => s.text).join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, "bible-tab-phone-el.png") });
    must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
}

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
{
  console.log("\n28. One Settings");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const bare = (href) => String(href ?? "").replace(/\/(?=$|[?#])/, "");
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
      };
    });
  {
    // Signed out, which is what a built app with no network is.
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/account/");
    await page.waitForFunction(() => document.querySelector("[data-you-rows] li"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const you = await youRows(page);
    const want = ["/signin?next=/account", "/pricing", "/prayers/personal", "/campaigns/mine", "/settings"];
    must(
      you.rows.length >= 4 && you.rows.length <= 5 && you.rows.every((r) => want.includes(bare(r.href))) && bare(you.rows.at(-1).href) === "/settings",
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
    must(ids[0] === "account" && ids.slice(-2).join(" ") === "data about" && ["space", "reading", "calendar", "language"].every((id) => ids.includes(id)), `Settings is the account, then the device's settings, then data and Purify (${ids.join(", ")})`);
    const account = set.groups.find((g) => g.id === "account");
    must(!!account && account.heading === en["settings.account"] && account.rows.length === 1 && bare(account.rows[0].href) === "/signin?next=/settings" && account.rows[0].label === en["common.signIn"], "signed out, the account is one row: Sign in");
    const data = set.groups.find((g) => g.id === "data");
    must(!!data && data.heading === en["account.tabs.data"] && data.rows.map((r) => bare(r.href)).join(" ") === "/account/export", "Data is Export your library, with nothing to delete");
    const about = set.groups.find((g) => g.id === "about");
    must(!!about && about.rows.map((r) => bare(r.href)).join(" ") === "/privacy /support /whats-new /about", `Purify is Privacy, Support Purify, What's new and About (${about?.rows.map((r) => r.label).join(", ")})`);
    must(set.headings.length === 1 && set.headings[0] === en["settings.title"] && bare(set.back) === "/account", `the screen is named once, in its bar, which goes back to You (${set.headings.join(" | ")})`);
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
}

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
{
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
}
// ---- 30. Content packs: what the website sends reaches the app (lib/packs).
// The app asks the website for packs a few seconds after it opens. Here the
// website is played by the walk: one context gets nothing (no signal, as in
// every other section) and shows the build's own verse; one gets a good pack
// and shows the pack's verse on Today and its board message on What's New;
// one gets a pack whose verse leads somewhere it must not and shows the
// build's verse again. Nothing here reaches any real website.
{
  console.log("\n30. Content packs: the website's verse and board message reach the app");
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
  must(good.errors.length === 0, `no page errors${good.errors.length ? ": " + good.errors.slice(0, 2).join(" | ") : ""}`);
  await good.ctx.close();

  const bad = await run(pack({ ...psalm, href: "javascript:alert(1)" }));
  must(bad.asks.length === 1 && !bad.card.includes("my shepherd") && bad.card === none.card, "a pack whose verse leads outside the Bible is thrown away, and the build's verse stays");
  await bad.ctx.close();
}
// ---- 31. Scrolling a work and the shop on Android (2026-10-14).
// The owner's Android phone, and not his iPad, showed the shop and a saint's
// work jumping and stuttering under the thumb. Four causes were found and
// fixed, and this holds each: the work's reading bar moved through React with
// an eased fill restarted on every frame; opening a work fetched font files
// for ‹ › ☆ and laid the whole work out again; a saved place took a reader
// who had already started scrolling somewhere else; and the shop's grid rose
// with the scroll, which only Chromium (Android) runs.
{
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
    const bar = await page.evaluate(async () => {
      let started = 0;
      document.addEventListener("transitionrun", () => started++, true);
      for (let y = 600; y <= 4800; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const fill = document.querySelector(".below-topbar [class*='origin-left']");
      const scale = fill ? Number((getComputedStyle(fill).transform.match(/matrix\(([^,]+)/) || [])[1]) : NaN;
      const want = window.scrollY / (document.documentElement.scrollHeight - innerHeight);
      return { started, scale, want };
    });
    must(bar.started === 0, `the reading bar starts no transition as the work scrolls (${bar.started})`);
    must(Math.abs(bar.scale - bar.want) < 0.01, `and its fill is where the reader is (${bar.scale.toFixed(3)} for ${bar.want.toFixed(3)})`);
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
    await opened.page.waitForFunction(() => document.getElementById("s6"), null, { timeout: 20000 }).catch(() => {});
    await opened.page.waitForTimeout(1500);
    const at = await opened.page.evaluate(() => ({ y: Math.round(window.scrollY), s6: Math.round(document.getElementById("s6")?.getBoundingClientRect().top ?? -1) }));
    await opened.ctx.close();
    return at;
  };
  const resumed = await visit(false);
  // The section stops under the bars, not at the very top: the page keeps
  // 72px clear (scroll-padding-top) and a section keeps six rem more
  // (scroll-mt-24), about 174px on a phone.
  must(resumed.y > 200 && resumed.s6 >= 0 && resumed.s6 < 240, `a reader who has not touched the work is taken to their saved section (y ${resumed.y}, section 6 at ${resumed.s6})`);
  const left = await visit(true);
  must(left.y < 100, `a reader who touched the page before the text arrived is left where they are (y ${left.y})`);
  const css = fs.readdirSync(path.join(OUT, "_next/static/chunks")).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(OUT, "_next/static/chunks", f), "utf8")).join("\n");
  must(!css.includes(".shop-rise"), "the shop's grid carries no scroll-driven rise");
}
// ---- 32. One top bar (1.7).
// The owner, 2026-10-16 (Homebase/boards/purify-master/r17/BRAINSTORM.md,
// notes 10 to 14): the five tabs each drew their top right differently, the
// Premium pill sat on the left of Today and on the right elsewhere, Support
// did nothing useful there, and the pill's star was a vibe-coded symbol. One
// bar now (components/mobile/MobileHeader.tsx): the tab's name, then the
// pill, search and the bell, the same on all five. This opens each tab on the
// narrow Android width and on an iPhone's, in English, Greek and Filipino
// (Filipino has the longest tab name, "Mga Panalangin"), and measures the
// bar: the name whole, the pill and the two buttons where they are on every
// other tab, no Support and no star, and all of it inside the screen. Then
// Today's pill, which left the screen for /pricing until 1.7, opens the
// upgrade sheet as the other four do. lib/nav/__tests__/oneTopBar.test.ts
// holds the source.
{
  console.log("\n32. One top bar");
  const words = (code) => ({ ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8")), ...JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${code}.json`), "utf8")) });
  const TABS = [["/", "nav.today"], ["/bible/", "nav.bible"], ["/discover/", "nav.discover"], ["/prayers/", "nav.prayers"], ["/account/", "nav.you"]];
  const measure = (page) =>
    page.evaluate(() => {
      const bar = document.querySelector("[data-route-content] [data-tab-topbar]");
      const h1 = bar?.querySelector("h1");
      const cluster = h1?.nextElementSibling;
      if (!bar || !h1 || !cluster) return null;
      const box = (n) => {
        const r = n?.getBoundingClientRect();
        return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } : null;
      };
      // The pill's 44px box, then search, then the bell.
      const [wrap, search, bell] = [...cluster.children];
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
        outside,
        vw: innerWidth,
      };
    });
  const near = (a, b, by = 1) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= by;
  for (const size of [{ width: 360, height: 780 }, { width: 390, height: 844 }]) {
    for (const [locale, code] of [["en-US", "en"], ["el-GR", "el"], ["fil-PH", "fil"]]) {
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
      must(seen.every((s) => s.got && s.got.painted && near(s.got.painted.height, seen[0].got.painted?.height, 0.5)), `${where}: the pill is one size on every tab (${seen.map((s) => Math.round(s.got?.painted?.height ?? -1)).join(", ")} px tall)`);
      must(seen.every((s) => s.got && !s.got.support && !s.got.star), `${where}: no Support in the bar and no star in the pill`);
      must(seen.every((s) => s.got && s.got.outside === 0), `${where}: and all of it inside the screen${seen.some((s) => s.got?.outside) ? ` (${seen.filter((s) => s.got?.outside).map((s) => s.to).join(", ")} reach past it)` : ""}`);
      if (size.width === 360 && code === "fil") {
        await go(page, "/prayers/");
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SHOTS, "top-bar-fil-360.png"), clip: { x: 0, y: 0, width: 360, height: 120 } });
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
}
// ---- 33. The reader on a phone and a tablet (1.7).
// The owner's notes 1 to 8 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md) and his picks: one clean row of pills (Translation, Book,
// Interlinear) each opening a sheet, the translation's too; no Reader pill,
// since the top bar's settings icon does its job; the title on one line,
// "John 1", with Listen at its end; a slim chapter strip; on a tablet one
// centred column with the Fathers in the sheet, and focus mode's way out at
// the foot of the screen, out of the top right. This opens John 1 and Genesis
// 1 (the Greek offered) on the narrow Android width and an iPhone's, then
// John 1 on an iPad's two orientations, and walks focus mode on a phone and a
// tablet. lib/bible/__tests__/readerScreen.test.ts holds the source.
{
  console.log("\n33. The reader on a phone and a tablet");
  const looks = () => {
    const title = document.getElementById("chapter-title");
    const h1 = title?.querySelector("h1");
    const column = title?.parentElement;
    const row = title?.previousElementSibling?.firstElementChild;
    const shown = (n) => {
      const b = n.getBoundingClientRect();
      const s = getComputedStyle(n);
      return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const box = (n) => {
      if (!n) return null;
      const b = n.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    const pills = row ? [...row.children].filter((n) => n.tagName === "BUTTON" && shown(n)) : [];
    const listen = h1?.parentElement ? [...h1.parentElement.children].find((n) => n.tagName === "BUTTON") : null;
    const buttons = [...document.querySelectorAll("button")].filter(shown);
    const current = document.querySelector("#chapter-title")?.previousElementSibling?.querySelector('a[aria-current="page"]');
    return {
      h1: (h1?.textContent ?? "").replace(/\s+/g, " ").trim(),
      h1Box: box(h1),
      column: box(column),
      row: row && shown(row) ? box(row) : null,
      pills: pills.map((p) => ({ ...box(p), text: (p.textContent ?? "").trim(), cut: [...p.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 0.5) })),
      listen: listen ? { ...box(listen), text: (listen.textContent ?? "").trim() } : null,
      settings: buttons.filter((b) => (b.getAttribute("aria-label") ?? "") === "Reader settings").length,
      readerPill: buttons.filter((b) => (b.textContent ?? "").trim() === "Reader").length,
      asides: [...document.querySelectorAll("aside")].filter(shown).length,
      toolbar: buttons.filter((b) => (b.getAttribute("aria-label") ?? "") === "Focus reading").length,
      current: current && shown(current) ? box(current) : null,
      vw: innerWidth,
    };
  };
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const opened = (page, want) => page.waitForFunction((w) => document.getElementById("chapter-title")?.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() === w, want, { timeout: 20000 }).catch(() => {});

  // The phones: one row, inside the screen, no Reader pill, one title line.
  for (const size of [{ width: 360, height: 780 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true, set: { "purify:interlinear": "1" } });
    for (const [to, title, greek] of [["/bible/john/1/", "John 1", true], ["/bible/genesis/1/", "Genesis 1", true]]) {
      await go(page, to);
      await opened(page, title);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(900);
      const got = await page.evaluate(looks);
      const where = `${title} at ${size.width}px`;
      must(got.h1 === title, `${where}: the title is one line, "${got.h1}"`);
      must(got.pills.length === (greek ? 3 : 2), `${where}: the row holds Translation, Book${greek ? " and Interlinear" : ""} (${got.pills.map((p) => p.text).join(" | ")})`);
      must(got.pills.length > 0 && spread(got.pills.map((p) => p.top)) <= 1 && spread(got.pills.map((p) => p.height)) <= 0.5, `${where}: the pills stand in one row at one height (tops ${got.pills.map((p) => Math.round(p.top)).join(", ")})`);
      must(got.pills.every((p) => p.left >= -0.5 && p.right <= got.vw + 0.5), `${where}: and every pill is inside the screen (${got.pills.map((p) => `${Math.round(p.left)}..${Math.round(p.right)}`).join(", ")} of ${got.vw})`);
      must(got.pills.every((p) => !p.cut), `${where}: every pill's word is whole in English${got.pills.some((p) => p.cut) ? ": " + got.pills.filter((p) => p.cut).map((p) => p.text).join(", ") : ""}`);
      must(got.settings === 1 && got.readerPill === 0, `${where}: the top bar's settings icon is the one way to the reader settings (${got.settings} named so, ${got.readerPill} Reader pill)`);
      must(Boolean(got.current) && got.current.left >= 0 && got.current.right <= got.vw, `${where}: the chapter strip opens on the chapter being read`);
      if (to === "/bible/john/1/") {
        const l = got.listen;
        const h = got.h1Box;
        must(Boolean(l) && l.text === "Listen" && h && Math.abs((l.top + l.bottom) / 2 - (h.top + h.bottom) / 2) <= 6 && l.left >= h.right - 0.5, `${where}: Listen stands at the end of the title's line (${l ? `${Math.round(l.left)}..${Math.round(l.right)}, middle ${Math.round((l.top + l.bottom) / 2)} against the title's ${h ? Math.round((h.top + h.bottom) / 2) : "?"}` : "no Listen"})`);
        if (size.width === 390) await page.screenshot({ path: path.join(SHOTS, "reader-john1-390.png") });
        // The translation opens in a sheet, as the book and the settings do.
        await page.getByRole("button", { name: /^Switch translation/ }).tap().catch(() => {});
        await page.waitForFunction(() => [...document.querySelectorAll("[role=dialog]")].some((d) => /King James Version/.test(d.textContent ?? "")), null, { timeout: 8000 }).catch(() => {});
        const sheet = await page.evaluate(() => {
          const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /King James Version/.test(x.textContent ?? ""));
          if (!d) return null;
          const panel = d.lastElementChild.getBoundingClientRect();
          return { modal: d.getAttribute("aria-modal"), left: Math.round(panel.left), right: Math.round(panel.right), bottom: Math.round(panel.bottom), vh: innerHeight };
        });
        must(Boolean(sheet) && sheet.modal === "true" && sheet.bottom >= sheet.vh - 1, `${where}: tapping the translation opens a sheet from the foot that holds the KJV (${sheet ? `${sheet.left}..${sheet.right}, foot at ${sheet.bottom} of ${sheet.vh}` : "no sheet"})`);
        if (size.width === 390) await page.screenshot({ path: path.join(SHOTS, "reader-translation-sheet-390.png") });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(600);
      }
      if (to === "/bible/genesis/1/" && size.width === 360) await page.screenshot({ path: path.join(SHOTS, "reader-genesis1-360.png") });
    }
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // An iPad, both ways round: one centred column, the controls on its edge,
  // no rail beside it, the Fathers in the sheet, and each sheet a panel.
  for (const size of [{ width: 1180, height: 820 }, { width: 820, height: 1180 }]) {
    const { ctx, page, asked, errors } = await open({ ...size, phone: true });
    await go(page, "/bible/john/1/");
    await opened(page, "John 1");
    await page.waitForTimeout(1200);
    const got = await page.evaluate(looks);
    const where = `John 1 at ${size.width}x${size.height}`;
    const middle = got.column ? (got.column.left + got.column.right) / 2 : -1;
    must(Math.abs(middle - got.vw / 2) <= 2, `${where}: the text's column stands in the middle (${Math.round(middle)} against ${got.vw / 2})`);
    must(Boolean(got.row) && Math.abs(got.row.left - got.column.left) <= 1, `${where}: the controls start on the column's edge (${got.row ? Math.round(got.row.left) : "no row"} and ${got.column ? Math.round(got.column.left) : "?"})`);
    must(got.asides === 0 && got.toolbar === 0, `${where}: no rail and no computer's toolbar (${got.asides} aside, ${got.toolbar} Focus pill)`);
    must(got.settings === 1 && got.readerPill === 0, `${where}: the top bar's settings icon and no Reader pill`);
    await page.screenshot({ path: path.join(SHOTS, `reader-john1-tablet-${size.width}.png`) });
    const mark = page.locator("button[aria-label*='ommentary']").filter({ visible: true }).first();
    if (await mark.count()) {
      await mark.scrollIntoViewIfNeeded();
      await mark.tap();
      await page.waitForTimeout(1800);
      must(data(asked).includes("/bible-data/commentary/john/1.json"), `${where}: a verse's mark opens the Fathers in the sheet, which reads the commentary file`);
      const panel = await page.evaluate(() => {
        const d = document.querySelector("[role=dialog][aria-labelledby='commentary-sheet-title']");
        if (!d) return null;
        const r = d.lastElementChild.getBoundingClientRect();
        return { width: Math.round(r.width), middle: Math.round((r.left + r.right) / 2), text: (d.textContent ?? "").length };
      });
      must(Boolean(panel) && panel.width <= 681 && Math.abs(panel.middle - got.vw / 2) <= 2 && panel.text > 40, `${where}: the Fathers' sheet takes the column's width, in the middle (${panel ? `${panel.width}px at ${panel.middle}` : "no sheet"})`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(700);
    } else must(false, `${where}: found a commentary mark to tap`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /^Switch translation/ }).tap().catch(() => {});
    await page.waitForTimeout(900);
    const sheet = await page.evaluate(() => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /King James Version/.test(x.textContent ?? ""));
      if (!d) return null;
      const r = d.lastElementChild.getBoundingClientRect();
      return { width: Math.round(r.width), middle: Math.round((r.left + r.right) / 2) };
    });
    must(Boolean(sheet) && sheet.width <= 561 && Math.abs(sheet.middle - got.vw / 2) <= 2, `${where}: the translation sheet is a centred panel, not a bar across the screen (${sheet ? `${sheet.width}px at ${sheet.middle}` : "no sheet"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // Focus mode, from the reader settings, on a phone and an iPad.
  for (const size of [{ width: 390, height: 844 }, { width: 1180, height: 820 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/bible/john/1/");
    await opened(page, "John 1");
    await page.waitForTimeout(900);
    const where = `focus at ${size.width}px`;
    await page.getByRole("button", { name: "Reader settings" }).tap().catch(() => {});
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
      return { focus: document.documentElement.classList.contains("reader-focus"), bar: shown(document.querySelector("[data-mobile-topbar]")), pill: shown(document.querySelector("[aria-label='Chapter switcher']")) };
    });
    must(bars.focus && !bars.bar && !bars.pill, `${where}: the top bar and the chapter pill are put away (focus ${bars.focus}, bar ${bars.bar}, pill ${bars.pill})`);
    const exit = await exitNow();
    must(Boolean(exit) && exit.opacity > 0.95 && exit.top >= exit.vh - 140 && exit.bottom <= exit.vh && Math.abs(exit.middle - exit.vw / 2) <= 2, `${where}: the way out is at the foot, in the middle, in sight as focus begins (${exit ? `${exit.top}..${exit.bottom} of ${exit.vh}, opacity ${exit.opacity}` : "none"})`);
    await page.screenshot({ path: path.join(SHOTS, `reader-focus-${size.width}.png`) });
    await page.waitForTimeout(4200);
    const resting = await exitNow();
    must(Boolean(resting) && resting.opacity < 0.05, `${where}: it fades once the reader is reading (opacity ${resting ? resting.opacity : "none"})`);
    const at = await page.evaluate(() => {
      const r = document.querySelector("#chapter-title h1")?.getBoundingClientRect();
      return r ? { x: Math.round(r.left + 12), y: Math.round(r.top + r.height / 2) } : null;
    });
    if (at) await page.touchscreen.tap(at.x, at.y);
    await page.waitForTimeout(600);
    const woken = await exitNow();
    must(Boolean(woken) && woken.opacity > 0.95, `${where}: and a tap brings it back (opacity ${woken ? woken.opacity : "none"})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ focus: document.documentElement.classList.contains("reader-focus"), bar: !!document.querySelector("[data-mobile-topbar]") && getComputedStyle(document.querySelector("[data-mobile-topbar]")).display !== "none" }));
    must(!after.focus && after.bar, `${where}: Escape leaves focus and the top bar is back`);
    must(errors.length === 0, `${where}: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
}
// ---- 34. Chants, where the Kitchen was (1.7).
// The owner, 2026-10-16 (Homebase/boards/purify-master/r17/BRAINSTORM.md,
// notes 15, 26 and 28): the Kitchen comes off every reader surface and Chants
// takes its tile; every chant has one page (what it is, where it comes from,
// its versions); chant audio streams from the website and never ships inside
// the app. This walk has no network, so it is also the app with no signal:
// the Anthem's three versions must say they play with a connection, never
// offer a button that does nothing. The library opens with one chant, so the
// home must read as finished with it: no row with nothing in it.
{
  console.log("\n34. Chants");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  must(!inBundle(OUT, "/kitchen/") && !inBundle(OUT, "/kitchen/recipe/") && !inBundle(OUT, "/kitchen/new/"), "the Kitchen's screens are not in the bundle");
  must(!fs.existsSync(path.join(OUT, "kitchen-photos")), "nor its photos: they stay on the website");
  must(!fs.existsSync(path.join(OUT, "audio", "chants")), "no chant recording, timing file or takedown list ships inside the app");
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

  // The home: the Anthem at the top with its versions, and nothing empty.
  await go(page, "/chants/");
  await page.waitForFunction((w) => document.body.innerText.includes(w), en["chants.item.prayerRopeAnthem.title"], { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const home = await page.evaluate(() => ({
    text: document.querySelector("[data-route-content]")?.innerText ?? "",
    headings: [...document.querySelectorAll("[data-route-content] [role=heading], [data-route-content] h1, [data-route-content] h2")].map((h) => (h.textContent ?? "").trim()),
  }));
  must(home.text.includes(en["chants.item.prayerRopeAnthem.title"]) && home.text.includes(en["chants.moreComing"]), "the Chants home opens on the Prayer Rope Anthem and says more are coming");
  must(["English", "Français", "العربية"].every((l) => home.text.includes(l)), "with its three versions to play");
  must(home.text.includes(en["chants.needsConnection"]), "and with no signal it says they play with a connection");
  must(![en["chants.row.feast"], en["chants.row.psalms"], en["chants.row.short"], en["chants.row.all"]].some((h) => home.headings.includes(h)), "no row is drawn with nothing in it");
  await page.screenshot({ path: path.join(SHOTS, "chants-home-phone.png"), fullPage: true });

  // The Anthem's page: its name, the switch, the three versions, the words.
  await go(page, "/chants/prayer-rope-anthem/");
  await page.waitForFunction(() => document.querySelectorAll("[data-route-content] [role=tab]").length >= 3, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const anthem = await page.evaluate((play) => ({
    title: document.querySelector("[data-route-content] h1")?.textContent?.trim() ?? "",
    tabs: [...document.querySelectorAll("[data-route-content] [role=tab]")].map((t) => (t.textContent ?? "").trim()),
    versions: [...document.querySelectorAll("[data-route-content] [role=radiogroup] [role=radio]")].map((r) => (r.textContent ?? "").trim()),
    lines: document.querySelectorAll("[data-route-content] [role=tabpanel] ol li").length,
    plays: [...document.querySelectorAll("[data-route-content] button")].filter((b) => (b.textContent ?? "").trim() === play).map((b) => b.disabled),
  }), en["prayers.play"]);
  must(anthem.title === en["chants.item.prayerRopeAnthem.title"], `the Anthem's page is named (${anthem.title})`);
  must(anthem.tabs.join("|") === [en["chants.tab.words"], en["chants.tab.about"], en["chants.tab.versions"]].join("|"), `with Words, About and Versions (${anthem.tabs.join(", ")})`);
  must(anthem.versions.length === 3, `three versions to choose between (${anthem.versions.join(", ")})`);
  must(anthem.lines === 24, `the English words, all 24 lines (${anthem.lines})`);
  must(anthem.plays.length > 0 && anthem.plays.every((d) => d), "and Play waits for a connection instead of failing");
  await page.getByRole("tab", { name: en["chants.tab.about"] }).tap().catch(() => {});
  await page.waitForTimeout(600);
  const about = await page.evaluate(() => document.querySelector("[data-route-content] [role=tabpanel]")?.innerText ?? "");
  must(
    about.includes(en["chants.about.what"]) && about.includes(en["chants.about.history"]) && about.includes(en["chants.about.when"]),
    "About says what it is, where it comes from and when it is sung",
  );
  await page.screenshot({ path: path.join(SHOTS, "chants-anthem-phone.png"), fullPage: true });
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}
// ---- 35. The read-aloud covers and the ambience sheet (1.7).
// The owner's notes 9 and 25 of 2026-10-16 (Homebase/boards/purify-master/
// r17/BRAINSTORM.md): an icon of the book's saint on the read-aloud cover,
// for every book, and ambience out of the reader's settings into a sound
// button by the chapter pager that opens a sheet of its own. The covers stay
// on the website (lib/media/streamed.ts), and this walk has no network, so it
// is also the app with no signal: Now Playing must show the bundled plate in
// the cover's place, never a broken picture. lib/readAloud/__tests__/
// covers.test.ts holds the map and the files.
{
  console.log("\n35. The read-aloud covers and the ambience sheet");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  must(!fs.existsSync(path.join(OUT, "covers")), "no read-aloud cover ships inside the app: they stay on the website");
  must(fs.existsSync(path.join(OUT, "sections", "bible.jpg")), "and the plate a cover falls back to does");

  const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
  await go(page, "/bible/john/1/");
  await page.waitForFunction(() => document.getElementById("chapter-title")?.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() === "John 1", null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);

  // The sound button, at the end of the chapter pill, after the arrows.
  const button = await page.evaluate((name) => {
    const pill = document.querySelector("[aria-label='Chapter switcher']");
    if (!pill) return null;
    const controls = [...pill.querySelectorAll("a, button")];
    const b = controls.find((x) => x.getAttribute("aria-label") === name);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height), last: controls[controls.length - 1] === b, popup: b.getAttribute("aria-haspopup") };
  }, en["ambience.title"]);
  must(Boolean(button) && button.last && button.height >= 40 && button.popup === "dialog", `the chapter pill ends in the sound button (${button ? `${button.width}x${button.height}, last ${button.last}` : "none"})`);

  // It opens the ambience sheet: the three sounds as large tiles.
  await page.locator("[aria-label='Chapter switcher'] button[aria-haspopup='dialog']").last().tap().catch(() => {});
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

  // The reader's settings: one Ambience row, and the sounds no longer there.
  await page.getByRole("button", { name: en["bible.readerSettings"] }).first().tap().catch(() => {});
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
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}

// ---- 36. A saint on a phone (1.7).
// The owner's note 19 of 2026-10-16: a saint's page "reads like the desktop
// page shrunk". Now his icon is at the top (full width where a sharp picture
// of him is on the website; this walk has no network, so the bundled icon
// stands in the same box), his name with one line under it, one row with the
// request as a clear pill, then a switch between his Life, Writings and
// Miracles, and the page's own bar, whose name arrives once his has scrolled
// away. lib/saints/__tests__/saintPage.test.ts reads the source; this is how
// the built app draws it.
{
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
      const tabs = [...document.querySelectorAll("[role=tablist] [role=tab]")].map((t) => (t.textContent ?? "").trim());
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
    }, { ask: en["saints.ask.label"] });
    must(top.bars === 1 && !top.backBar, `${size.width}px: one bar, the page's own (${top.bars} bar${top.bars === 1 ? "" : "s"}${top.backBar ? ", and the back bar" : ""})`);
    must(top.overlay && Boolean(top.hero) && top.hero.kind === "picture" && top.hero.left === 0 && top.hero.right === top.vw && top.hero.top <= 0, `${size.width}px: the picture spans the screen from its top, under the clear bar (${top.hero ? `${top.hero.left}..${top.hero.right} of ${top.vw}, top ${top.hero.top}` : "no picture"})`);
    must(top.h1s === 1 && top.h1 !== null && top.h1 < top.vh && top.pill !== null && top.pill < top.vh, `${size.width}px: the name and the pill are on the first screen, and the name is the one heading (name ends ${top.h1}, pill ends ${top.pill}, of ${top.vh})`);
    must(top.title === "0", `${size.width}px: the bar keeps its name back at the top (opacity ${top.title})`);
    must(top.tabs.length === 2 && top.tabs[0] === en["saints.tab.life"] && top.tabs[1] === en["saints.writings"], `${size.width}px: St John Chrysostom has two parts, Life and Writings (${top.tabs.join(", ") || "no switch"})`);
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
    await page.getByRole("tab", { name: en["saints.writings"] }).tap();
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
    await link.tap();
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

  // A saint with his life alone: no switch, his icon at its own size, the bar solid.
  {
    const { ctx, page } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/saints/sava-of-serbia/");
    await page.waitForFunction(() => !!document.querySelector("h1#saint-name"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const lone = await page.evaluate(() => {
      const img = document.querySelector("[data-saint-hero='plate'] img");
      return {
        tabs: document.querySelectorAll("[role=tablist]").length,
        plate: img ? { h: Math.round(img.getBoundingClientRect().height), natural: img.naturalHeight } : null,
        overlay: document.querySelector("[data-mobile-topbar]")?.hasAttribute("data-overlay") ?? null,
      };
    });
    must(lone.tabs === 0, `a saint with his life alone has no switch (${lone.tabs})`);
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
    const parts = await page.evaluate(() => [...document.querySelectorAll("[role=tablist] [role=tab]")].map((t) => (t.textContent ?? "").trim()));
    must(parts.join(",") === [en["saints.tab.life"], en["saints.writings"], en["saints.miracles"]].join(","), `St Anthony has three parts, his Miracles among them (${parts.join(", ")})`);
    await page.locator("[data-saint-explainer]").first().tap();
    await page.waitForTimeout(900);
    const sheet = await page.evaluate((title) => {
      const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getAttribute("aria-label") === title);
      return d ? (d.textContent ?? "").includes("editorial") : null;
    }, en["saints.bump.whatRequesting"]);
    must(sheet === true, `the round i opens what asking does, in the same sheet (${sheet === null ? "no sheet" : "its words there"})`);
    await ctx.close();
  }
}
// ---- 37. Your first Liturgy (1.7).
// The owner's note 27 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md, with "Added to 27" and his answers): a guide for an inquirer
// going to a first Divine Liturgy, one card at a time. It asks whether they
// are going and what kind of church it is (a pick, never a search), walks
// before, arriving, during and after, then that kind of parish's customs, and
// ends on a checklist the reader keeps. A reminder waits on Today that week.
// Everything is on the device. lib/start/__tests__/firstLiturgy.test.ts holds
// the words; this walks the built app with no network.
{
  console.log("\n37. Your first Liturgy");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const el = { ...en, ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/el.json"), "utf8")) };
  const GLYPHS = [0x2192, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x2014].map((c) => String.fromCharCode(c));
  must(inBundle(OUT, "/start/first-liturgy/"), "the guide is in the bundle");
  const heading = (page) => page.evaluate(() => document.querySelector("#liturgy-step-title")?.textContent?.trim() ?? "");
  // The footer's Next names the card it opens: "Next: Before you go".
  const next = async (page, partKey) => {
    await page.locator("button", { hasText: en["start.liturgy.ui.nextTo"].replace("{part}", en[partKey]) }).first().tap();
    await page.waitForTimeout(700);
  };
  const scale = (t) => Number(/scaleX\(([\d.]+)\)/.exec(t ?? "")?.[1] ?? NaN);

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });
    await go(page, "/start/");
    await page.waitForFunction(() => !!document.querySelector('[data-route-content] a[href^="/start/first-liturgy"]'), null, { timeout: 20000 }).catch(() => {});
    await page.locator('[data-route-content] a[href^="/start/first-liturgy"]').first().tap();
    await page.waitForFunction((w) => document.querySelector("#liturgy-step-title")?.textContent?.trim() === w, en["start.liturgy.intro.title"], { timeout: 20000 }).catch(() => {});
    const intro = await page.evaluate(() => ({
      bars: document.querySelectorAll("[data-mobile-topbar]").length,
      backBar: !!document.querySelector("div.topbar-safe:not([data-mobile-topbar]) > button[aria-label]"),
      title: document.querySelector("[data-mobile-topbar] h1")?.textContent?.trim() ?? "",
    }));
    must((await heading(page)) === en["start.liturgy.intro.title"], `${size.width}px: Start here's door opens the guide on its question`);
    must(intro.bars === 1 && !intro.backBar && intro.title === en["start.liturgy.title"], `${size.width}px: one bar, named ${intro.title || "nothing"}`);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-intro-${size.width}.png`), fullPage: true });

    await page.locator("button", { hasText: en["start.liturgy.intro.yes"] }).first().tap();
    await page.waitForTimeout(700);
    const kinds = await page.evaluate(() => [...document.querySelectorAll("[role=radiogroup] [role=radio]")].map((r) => (r.textContent ?? "").trim()));
    must((await heading(page)) === en["start.liturgy.kind.title"] && kinds.length === 12, `${size.width}px: then which kind of church, from twelve (${kinds.length})`);
    must(!kinds.some((k) => /Assyrian|Coptic|Armenian|Oriental/.test(k)), `${size.width}px: no Church outside the Orthodox communion on the list`);
    const waits = await page.evaluate((label) => [...document.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === label)?.disabled ?? null, en["start.liturgy.ui.nextTo"].replace("{part}", en["start.liturgy.step.when"]));
    must(waits === true, `${size.width}px: Next waits for a choice`);
    await page.getByRole("radio", { name: en["start.liturgy.kind.unsure.name"] }).tap();
    await page.waitForTimeout(500);
    const unsure = await page.evaluate(() => document.querySelector("[data-route-content]")?.textContent ?? "");
    must(unsure.includes(en["start.liturgy.unsure.ask"]) && unsure.includes("Assyrian Church of the East"), `${size.width}px: Not sure gets the gentle note: ask which bishop, compare with the list`);
    await page.getByRole("radio", { name: en["start.liturgy.kind.greek.name"] }).tap();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, `liturgy-kind-${size.width}.png`), fullPage: true });
    await next(page, "start.liturgy.step.when");

    must((await heading(page)) === en["start.liturgy.when.title"], `${size.width}px: then the day`);
    await page.getByRole("radio").first().tap();
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
    await page.locator("button", { hasText: en["start.liturgy.ui.why"] }).nth(1).tap();
    await page.waitForTimeout(900);
    const why = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return {
        title: d?.getAttribute("aria-label") ?? "",
        quote: [...(d?.querySelectorAll("blockquote[lang=en]") ?? [])].map((q) => q.textContent ?? "").join(" "),
        door: !!d?.querySelector('a[href="/councils/second-nicaea/the-decree-on-the-holy-icons"]'),
      };
    });
    must(why.title === en["start.liturgy.arrive.honour.title"] && why.quote.includes("honour which is paid to the image passes on") && why.door, `${size.width}px: why people kiss icons opens the Seventh Council's words, and a door to its decree`);
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
    await boxes.nth(1).tap();
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
    const card = await page.evaluate(() => {
      const c = document.querySelector("#first-liturgy-reminder")?.closest("section");
      const verse = document.querySelector('a[href*="/bible/"]');
      return {
        text: c?.textContent ?? "",
        door: !!c?.querySelector('a[href="/start/first-liturgy"]'),
        afterVerse: !!(c && verse && verse.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    must(card.text.includes(en["start.liturgy.title"]) && card.text.includes(en["start.liturgy.kind.greek.name"]) && card.text.includes("1 of 6 ready") && card.door, `on the Wednesday before, Today holds the reminder: ${card.text.slice(0, 80)}`);
    must(card.afterVerse, "under the day's word, so the verse stays first");
    await page.screenshot({ path: path.join(SHOTS, "liturgy-today-reminder.png") });
    await page.getByRole("button", { name: en["start.liturgy.today.hide"] }).tap();
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
}

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
{
  console.log("\n38. The walkthroughs");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const el = { ...en, ...JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/el.json"), "utf8")) };
  const TITLE = "Walking with Job";
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
        : { picture: false, ok: true, src: "", plate: (box.textContent ?? "").trim() };
    }, scope);
  const coverIsRight = (c) =>
    Boolean(c) && (c.picture ? c.ok && /^https:\/\/.+\/covers\/job\.v1\.jpg$/.test(c.src) : c.plate.includes(TITLE));
  const fill = (page) =>
    page.evaluate(() => Number(/scaleX\(([\d.]+)\)/.exec(document.querySelector("[data-walk-progress] [style*='scaleX']")?.style.transform ?? "")?.[1] ?? NaN));

  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open({ ...size, phone: true });

    // The walkthroughs: their name, one line, the walk as a cover row.
    await go(page, "/walkthroughs/");
    await page.waitForFunction(() => !!document.querySelector("h1#walk-hub-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    clean(`${size.width}px, the walkthroughs`, await screen(page), await page.evaluate(sticksOut));
    const row = await page.evaluate(() => (document.querySelector('[data-route-content] a[href="/walkthroughs/job"]')?.textContent ?? "").trim());
    must(row.includes(TITLE) && row.includes(en["walk.free"]), `${size.width}px: Walking with Job is a row, free and not yet begun (${row.slice(0, 70)})`);
    const hubCover = await cover(page, '[data-route-content] a[href="/walkthroughs/job"] [aria-hidden]');
    must(coverIsRight(hubCover), `${size.width}px: its cover is Job's icon or, with no signal, the plate with its name (${hubCover ? (hubCover.picture ? hubCover.src : `plate: ${hubCover.plate}`) : "no cover"})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-hub-${size.width}.png`), fullPage: true });

    // The book's page: its cover, its name, Begin, and its chapters.
    await page.locator('[data-route-content] a[href="/walkthroughs/job"]').first().tap();
    await page.waitForFunction(() => !!document.querySelector("h1#walk-book-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    clean(`${size.width}px, Walking with Job`, await screen(page), await page.evaluate(sticksOut));
    const book = await page.evaluate(() => ({
      begin: document.querySelector("[data-walk-resume]")?.getAttribute("href") ?? "",
      beginText: (document.querySelector("[data-walk-resume]")?.textContent ?? "").trim(),
      rows: document.querySelectorAll('[data-route-content] ol a[href^="/walkthroughs/job/"]').length,
      tabs: document.querySelectorAll("[role=tablist]").length,
    }));
    must(book.begin === "/walkthroughs/job/1" && book.beginText === en["walk.begin"], `${size.width}px: Begin opens chapter 1 (${book.beginText || "no button"}, ${book.begin})`);
    must(book.rows === 42 && book.tabs === 0, `${size.width}px: all forty-two chapters as rows, and no switch before a sentence is kept (${book.rows} rows, ${book.tabs} switch)`);
    must(coverIsRight(await cover(page, '[aria-labelledby="walk-book-title"] header [aria-hidden]')), `${size.width}px: the book's page wears the same cover`);
    await page.screenshot({ path: path.join(SHOTS, `walk-book-${size.width}.png`), fullPage: true });
    await page.evaluate(() => window.scrollBy(0, document.querySelector("h1#walk-book-title").getBoundingClientRect().bottom + 40));
    await page.waitForTimeout(700);
    must(await page.evaluate(() => document.querySelector("[data-mobile-topbar]")?.hasAttribute("data-revealed") ?? false), `${size.width}px: once its name has scrolled away the bar shows it`);

    // A chapter: the Scripture is the page.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("[data-walk-resume]").tap();
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

    // A note, in the movable sheet, and kept with one tap.
    await page.locator('[data-walk-note="job-1-5"]').scrollIntoViewIfNeeded();
    await page.locator('[data-walk-note="job-1-5"]').tap();
    await page.waitForTimeout(900);
    const note = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return d
        ? { title: d.getAttribute("aria-label") ?? "", text: d.textContent ?? "", lines: d.querySelectorAll("blockquote").length, keep: d.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed") ?? null }
        : null;
    });
    must(Boolean(note) && note.title === "A father's early prayer" && note.text.includes("Job 1:5") && note.text.includes(en["walk.carry"]) && note.lines === 1 && note.keep === "false", `${size.width}px: the note opens in the sheet, with the Father's line and the question to carry (${note ? note.title : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, `walk-note-${size.width}.png`) });
    await page.locator("[role=dialog] button[aria-pressed]").tap();
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
    await page.locator("[data-walk-progress] button").tap();
    await page.waitForTimeout(900);
    const list = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return d ? { title: d.getAttribute("aria-label") ?? "", rows: d.querySelectorAll('a[href^="/walkthroughs/job/"]').length, here: d.querySelector("[aria-current=page]")?.getAttribute("href") ?? "" } : null;
    });
    must(Boolean(list) && list.title === en["walk.chapterNav"] && list.rows === 42 && list.here === "/walkthroughs/job/1", `${size.width}px: Chapters lists the forty-two, chapter 1 marked (${list ? `${list.rows} rows, ${list.here}` : "no sheet"})`);
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
        await page.locator("[data-walk-choice]").nth(i).tap();
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
        await pills.nth(i).tap();
        await page.waitForTimeout(150);
        if ((await pills.nth(i).getAttribute("aria-pressed")) === "true") break;
      }
    }
    await page.waitForFunction(() => !!document.querySelector("[data-walk-step=ledger] textarea"), null, { timeout: 5000 }).catch(() => {});
    must((await page.locator("[data-walk-step=ledger] textarea").count()) === 1, `${size.width}px: who said it, then the ledger (${groups} line${groups === 1 ? "" : "s"} to place)`);
    const sentence = "To give thanks before anything is asked back.";
    await page.locator("[data-walk-step=ledger] textarea").fill(sentence);
    await page.getByRole("button", { name: en["walk.finish"] }).tap();
    await page.waitForTimeout(900);
    const finished = await page.evaluate(() => {
      const s = document.querySelector("[data-walk-finished]");
      return s
        ? { text: s.textContent ?? "", next: s.querySelector('a[href="/walkthroughs/job/2"]')?.textContent?.trim() ?? "", focused: document.activeElement?.id ?? "", stored: JSON.parse(localStorage.getItem("purify:walk:job") ?? "{}") }
        : null;
    });
    must(Boolean(finished) && finished.text.includes(en["walk.chapterWalked"].replace("{n}", "1")) && finished.text.includes(sentence) && finished.focused === "walk-finished", `${size.width}px: the finish is quiet and real: chapter 1 walked, the reader's sentence (${finished ? finished.text.slice(0, 60) : "no finish"})`);
    must(Boolean(finished) && finished.next === en["walk.nextChapter"].replace("{n}", "2") && Boolean(finished.stored?.done?.["1"]), `${size.width}px: and the way on, to chapter 2, with the chapter kept on the device`);
    await page.screenshot({ path: path.join(SHOTS, `walk-finished-${size.width}.png`) });

    // Back on the book's page: the walk in plain words, the sentence kept.
    await go(page, "/walkthroughs/job/");
    await page.waitForFunction(() => !!document.querySelector("h1#walk-book-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => ({
      done: document.querySelector("[data-walk-done]")?.textContent?.trim() ?? "",
      resume: document.querySelector("[data-walk-resume]")?.getAttribute("href") ?? "",
      walked: (document.querySelector('[data-route-content] ol a[href="/walkthroughs/job/1"]')?.textContent ?? "").trim(),
      tabs: [...document.querySelectorAll("[role=tablist] [role=tab]")].map((t) => (t.textContent ?? "").trim()),
    }));
    must(after.done === en["walk.progressOf"].replace("{done}", "1").replace("{total}", "42") && after.resume === "/walkthroughs/job/2", `${size.width}px: the book's page says "${after.done}" and continues with chapter 2`);
    must(after.walked.endsWith(en["walk.walked"]) && after.tabs.join(",") === `${en["walk.chapterNav"]},${en["walk.yourLedger"]}`, `${size.width}px: chapter 1 is marked walked, and the reader's ledger is a part of its own (${after.tabs.join(", ") || "no switch"})`);
    await page.getByRole("tab", { name: en["walk.yourLedger"] }).tap();
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
}
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
// lib/prayers/__tests__/prayerPages.test.ts reads the source; this walks the
// built app with no network.
{
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
    // Chant opens the Chants library's picker.
    await page.locator("[data-prayer-reader] header [role=group] button").first().tap();
    await page.waitForTimeout(900);
    must((await page.evaluate(() => document.querySelector("[role=dialog]")?.getAttribute("aria-label") ?? "")) === en["chant.button"], `${size.width}px: Chant opens Pray with chant`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    // Begin goes to the first prayer, and reading lights one line at a time.
    await page.locator("[data-prayer-reader] header button", { hasText: en["today.prayNow.begin"] }).first().tap();
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
    // Mark prayed, each prayer, as before: Mark all keeps the Hour for today.
    await page.locator("[data-prayer-reader] button", { hasText: en["prayers.reader.markAll"] }).first().tap();
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
    await page.locator("[data-learn-next]").tap();
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
    await go(page, "/prayers/personal/");
    await page.waitForFunction(() => !!document.querySelector("h1#mine-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    clean(`${size.width}px, Your rule`, await screen(page), await page.evaluate(sticksOut));
    await page.locator("#mine-panel-morning button", { hasText: en["prayers.mine.startFromMorning"] }).tap();
    await page.waitForTimeout(700);
    const rows = () => page.evaluate(() => [...document.querySelectorAll("#mine-panel-morning ol > li")].map((li) => li.querySelectorAll("button")[1]?.querySelector("span")?.textContent?.trim() ?? ""));
    const built = await rows();
    must(built.length === 10 && Boolean(await page.evaluate(() => document.querySelector("[data-mine-pray]")?.getAttribute("href"))), `${size.width}px: starting from Morning prayers sets its ten prayers in the rule, and Pray my rule appears (${built.length} rows)`);
    await page.locator("#mine-panel-morning ol > li").first().locator("button").nth(1).tap();
    await page.waitForTimeout(900);
    await page.locator("[role=dialog] button", { hasText: en["prayers.mine.moveDown"] }).tap();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    const moved = await rows();
    must(moved[0] === built[1] && moved[1] === built[0], `${size.width}px: Move down puts the first prayer second (${moved.slice(0, 2).join(", ")})`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-${size.width}.png`), fullPage: true });
    await page.locator("[data-mine-pray]").tap();
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
    await page.locator("[data-prayer-reader] button", { hasText: en["prayers.reader.markAll"] }).first().tap();
    await page.waitForTimeout(700);
    must((await kept(page, "mine-morning")).includes(await today(page)), `${size.width}px: praying it through keeps the day under mine-morning, which the streak reads`);
    await page.screenshot({ path: path.join(SHOTS, `prayers-mine-reader-${size.width}.png`) });

    // Today leads its Pray row with the reader's rule for the part the hour
    // calls for: an evening part too, so either hour finds one.
    await page.evaluate(() => {
      const rule = JSON.parse(localStorage.getItem("purify.prayers.mine") ?? "{}");
      rule.evening = [{ kind: "prayer", rule: "evening", prayer: "trisagion" }];
      localStorage.setItem("purify.prayers.mine", JSON.stringify(rule));
    });
    await go(page, "/");
    await page.waitForFunction(() => !!document.querySelector('section[aria-labelledby="today-pray"] ul > li a'), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const first = await page.evaluate(() => {
      const a = document.querySelector('section[aria-labelledby="today-pray"] ul > li a');
      return { href: a?.getAttribute("href") ?? "", text: a?.textContent ?? "" };
    });
    must(
      first.href.startsWith("/prayers/personal/") && (first.text.includes(en["prayers.mine.morningTitle"]) || first.text.includes(en["prayers.mine.eveningTitle"])),
      `${size.width}px: Today's Pray row leads with the reader's own rule (${first.href})`,
    );
    await page.screenshot({ path: path.join(SHOTS, `prayers-today-mine-${size.width}.png`) });
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
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
}
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
{
  console.log("\n40. Saved, the reading plans and the journal");
  const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
  const guide = JSON.parse(fs.readFileSync(path.resolve("data/plans/guide/en.json"), "utf8"));
  const sayings = JSON.parse(fs.readFileSync(path.resolve("data/plans/sayings.json"), "utf8"));
  const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), s);
  const flat = (s) => s.replace(/\s+/g, " ").trim();
  for (const p of ["/saved/", "/journal/", "/plans/", "/plans/psalter/", "/plans/gospels/", "/plans/proverbs/"]) must(inBundle(OUT, p), `${p} is in the bundle`);

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
  // events, so touch-action and the row's own handlers both see it.
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
      Boolean(lit) && lit.dot.color === "blue" && lit.dot.paint === "rgb(107, 164, 201)" && lit.dot.size <= 12 && lit.text.includes(`${en["saved.kind.highlight"]} · ${en["bible.highlight.blue"]}`),
      `${w}px: a highlight's colour is a small dot by its name (${lit ? `${lit.dot.paint}, ${lit.dot.size}px, "${lit.text.slice(0, 40)}"` : "no dot"})`,
    );
    must(rows.length > 0 && rows.every((r) => r.stripe === 0 && r.plain), `${w}px: no row has a side stripe or a tinted box`);
    const chips = await chipsOn(page);
    const wantChips = ["common.all", "study.saved.verses", "saved.filter.highlights", "study.saved.saints", "study.saved.history"].map((k) => en[k]);
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
    await page.locator("[data-undo-bar] button").tap();
    await page.waitForTimeout(700);
    const back = await savedRows(page);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("purify:bookmarks") ?? "[]").map((b) => b.id));
    must(back.length === 3 && back[0]?.href.startsWith("/bible/john/3") && kept.includes("walk-john-3-16"), `${w}px: Undo brings it back where it was (${back.length} rows)`);

    await page.locator(`[aria-label="${en["saved.filtersLabel"]}"] button`, { hasText: en["saved.filter.highlights"] }).tap();
    await page.waitForTimeout(500);
    const only = await savedRows(page);
    must(only.length === 1 && Boolean(only[0].dot), `${w}px: Highlights shows the highlighted verse alone (${only.length} row${only.length === 1 ? "" : "s"})`);

    // The You tab's Verses opens Saved on its chip.
    await go(page, "/account/");
    await page.waitForTimeout(600);
    await go(page, "/saved/?kind=verses");
    await page.waitForFunction(() => document.querySelectorAll("[data-saved-row]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    const deep = (await chipsOn(page)).filter((c) => c.on).map((c) => c.text);
    must(deep.length === 1 && deep[0] === en["study.saved.verses"], `${w}px: /saved?kind=verses opens on Verses (${deep.join(", ") || "none chosen"})`);
    await page.locator("[data-saved-row]").first().tap();
    await page.waitForFunction(() => location.pathname.startsWith("/bible/john/3"), null, { timeout: 20000 }).catch(() => {});
    must(new URL(page.url()).pathname.startsWith("/bible/john/3"), `${w}px: a tap opens the verse in its chapter (${new URL(page.url()).pathname}${new URL(page.url()).hash})`);

    // Reading plans: the list, a plan's day, Begin, the bar, Done, the finish.
    await go(page, "/plans/");
    await page.waitForFunction(() => document.querySelectorAll("[data-plans-rest] li").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    await clean(`${w}px, Reading plans`, page);
    const listed = await page.evaluate(() => [...document.querySelectorAll("[data-plans-rest] a")].map((a) => (a.getAttribute("href") ?? "").replace(/\/$/, "")));
    must(JSON.stringify(listed) === JSON.stringify(["/plans/psalter", "/plans/gospels", "/plans/proverbs"]), `${w}px: the three plans, none begun (${listed.join(", ")})`);
    await page.locator('[data-plans-rest] a[href^="/plans/gospels"]').tap();
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
      await page.locator("[data-plan-begin]").tap();
      await page.waitForTimeout(900);
      must(await page.evaluate(() => !!document.querySelector("[role=dialog]")), `${w}px: this build locks Plus on the walk's phone, and Begin opens the upgrade sheet`);
      console.log("  ..  so the day's session, its finish and the journal's writing were not walked");
      await ctx.close();
      continue;
    }

    await page.locator("[data-plan-begin]").tap();
    await page.waitForFunction(() => location.pathname.startsWith("/bible/matthew/1") && !!document.querySelector("[data-plan-bar]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const bar = await page.evaluate(() => ({ text: (document.querySelector("[data-plan-bar]")?.innerText ?? "").replace(/\s+/g, " ").trim(), n: document.querySelectorAll("[data-plan-bar]").length }));
    const barAt = await footOf(page, "[data-plan-bar]");
    must(bar.n === 1 && bar.text.startsWith(fill(en["plans.dayOf"], { day: 1, total: 89 })) && bar.text.includes("Matthew 1"), `${w}px: Begin opens Matthew 1 with the plan's bar at its foot ("${bar.text}")`);
    must(Boolean(barAt) && (barAt.tabs === null || barAt.bottom <= barAt.tabs + 1) && barAt.right <= barAt.vw, `${w}px: the bar stands over the tab bar, inside the screen (ends at ${barAt?.bottom ?? "?"}, the tabs at ${barAt?.tabs ?? "none"})`);
    await page.screenshot({ path: path.join(SHOTS, `plan-bar-${w}.png`) });

    await page.locator("[data-plan-done]").tap();
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
    must(
      Boolean(say) && finish.saying.includes(flat(say.text).slice(0, 48)) && finish.saying.includes(say.author) && finish.saying.includes(say.work),
      `${w}px: the day's saying of the Fathers, word for word and cited (${say ? `${say.author}, ${say.work}` : "none in the data"})`,
    );
    must(finish.tomorrow.includes(fill(en["plans.dayOf"], { day: 2, total: 89 })) && finish.tomorrow.includes("Matthew 2"), `${w}px: and tomorrow ("${finish.tomorrow.slice(0, 70)}")`);
    await page.screenshot({ path: path.join(SHOTS, `plan-finish-${w}.png`), fullPage: true });

    const answer = "To keep still, and do what is asked.";
    await page.locator("[data-plan-questions] input").first().fill(answer);
    await page.locator("[data-plan-questions] button", { hasText: en["plans.finish.keep"] }).tap();
    await page.waitForTimeout(700);
    const answered = await page.evaluate(() => ({
      said: document.querySelector("[data-plan-finish] p[role=status]")?.textContent ?? "",
      journal: JSON.parse(localStorage.getItem("purify:journal") ?? "[]"),
    }));
    must(
      answered.said.includes(en["plans.finish.kept"]) && answered.journal.length === 1 && answered.journal[0].body === answer && answered.journal[0].kind === "question" && answered.journal[0].prompt?.key === "gospels.d1.q",
      `${w}px: an answer kept goes to the journal with its question (${answered.journal.length} entr${answered.journal.length === 1 ? "y" : "ies"})`,
    );
    await page.locator("[data-plan-finish] button", { hasText: en["plans.finish.back"] }).tap();
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
    await page.locator("[data-plan-begin]").tap();
    await page.waitForFunction(() => location.pathname.startsWith("/bible/psalms/1") && !!document.querySelector("[data-plan-bar]"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    const barText = () => page.evaluate(() => (document.querySelector("[data-plan-bar]")?.innerText ?? "").replace(/\s+/g, " ").trim());
    const k1 = await barText();
    const many = Number(/· 1 of (\d+)/.exec(k1)?.[1] ?? 0);
    must(k1.startsWith(fill(en["plans.dayOf"], { day: 1, total: 20 })) && many > 1, `${w}px: the Psalter's first day is a kathisma of ${many} psalms ("${k1}")`);
    await page.locator("[data-plan-bar] ~ button").last().tap();
    await page.waitForFunction(() => location.pathname.startsWith("/bible/psalms/2"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const k2 = await barText();
    must(new URL(page.url()).pathname.startsWith("/bible/psalms/2") && k2.includes(`· ${fill(en["readingsFlow.of"], { n: 2, total: many })}`), `${w}px: Next walks on to the second psalm ("${k2}")`);
    await page.locator(`[data-plan-bar] ~ button[aria-label="${en["plans.bar.leave"]}"]`).tap();
    await page.waitForTimeout(600);
    must(!(await page.evaluate(() => !!document.querySelector("[data-plan-bar]"))), `${w}px: and the way out takes the bar away`);

    // The journal: the kept answer, one Write button, the sheet above the keyboard.
    await go(page, "/journal/");
    await page.waitForFunction(() => document.querySelectorAll("[data-journal-entry]").length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    await clean(`${w}px, the journal`, page);
    const first = await page.evaluate(() => (document.querySelector("[data-journal-entry]")?.innerText ?? "").replace(/\s+/g, " "));
    must(first.includes(answer) && first.includes(flat(guide.gospels.days[0].q).slice(0, 30)) && first.includes(en["journal.kind.question"]), `${w}px: the answer is in the journal under its question ("${first.slice(0, 70)}")`);
    const pill = await footOf(page, "[data-journal-write]");
    must(Boolean(pill) && pill.height >= 44 && (pill.tabs === null || pill.bottom <= pill.tabs + 1) && pill.text === en["journal.write"], `${w}px: one Write button in reach at the foot, over the tab bar (${pill ? `"${pill.text}", ends at ${pill.bottom}` : "none"})`);
    must(await page.evaluate(() => window.__standInKeyboard === true && window.visualViewport.height === innerHeight), `${w}px: the stand-in keyboard is in place, and down`);
    const write = page.locator("[data-journal-write]:visible").first();
    await write.tap();
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
    await page.locator("[data-journal-done]").tap();
    await page.waitForTimeout(900);
    const wrote = await page.evaluate(() => ({
      open: !!document.querySelector("[data-journal-composer]"),
      entries: [...document.querySelectorAll("[data-journal-entry]")].map((e) => (e.innerText ?? "").replace(/\s+/g, " ")),
    }));
    must(!wrote.open && wrote.entries.length === 2 && wrote.entries.some((t) => t.includes("Lord, have mercy on the day just read.")), `${w}px: Done keeps the entry in the list (${wrote.entries.length} entries)`);

    // Close keeps what was written, and Write goes on with it.
    await write.tap();
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.keyboard.type("Half a thought");
    await page.locator("[role=dialog] button", { hasText: en["common.close"] }).first().tap();
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
    await page.locator("[data-undo-bar] button").tap();
    await page.waitForTimeout(700);
    must((await page.evaluate(() => document.querySelectorAll("[data-journal-entry]").length)) === before, `${w}px: Undo brings the entry back`);
    await page.screenshot({ path: path.join(SHOTS, `journal-${w}.png`), fullPage: true });
    must(errors.length === 0, `${w}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
}
// ---- 41. The reading room, a Netflix for books (1.7).
// The owner's note 18 of 2026-10-16: a cover for every work, rows to swipe by
// theme and by tradition, keywords and tags, and a book's page with its
// cover, its facts, its chapters, Start reading and More like this.
// lib/reading/__tests__ hold the data and the source; this is how the built
// app draws it. The walk has no network, so the covers the apps ask of the
// website cannot load: each must fall back to its plate, never a broken
// picture, and the icons the app carries must draw.
{
  console.log("\n41. The reading room");
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
    const room = await page.evaluate((glyphs) => {
      const rows = [...document.querySelectorAll("[data-reading-row]")].map((r) => r.getAttribute("data-reading-row"));
      const passions = [...document.querySelectorAll("[data-reading-row='passions'] li")].map((li) => li.querySelector("[data-tile-label]")?.textContent?.trim() ?? "");
      const tiles = document.querySelectorAll("[data-reading-row] li").length;
      const imgs = [...document.querySelectorAll("[data-reading-row] img, [data-featured] img")];
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getClientRects().length > 0).map((i) => i.getAttribute("src"));
      const foreign = imgs.map((i) => i.getAttribute("src") ?? "").filter((src) => !src.startsWith("/saints/icons/") && !/^https:\/\/purifyapp\.net\/covers\/authors\//.test(src));
      const text = (document.querySelector("[data-route-content]") ?? document.body).innerText;
      return {
        rows,
        passions,
        tiles,
        broken,
        foreign,
        featured: document.querySelector("[data-featured]")?.getAttribute("data-featured") ?? null,
        h1: document.querySelector("[data-tab-topbar] h1")?.textContent?.trim() ?? null,
        glyphs: glyphs.filter((g) => text.includes(g)),
      };
    }, GLYPHS);
    must(["begin", "passions", "virtues", "life", "tradition-greek", "tradition-latin", "tradition-desert", "short"].every((r) => room.rows.includes(r)), `${size.width}px: the rows are drawn (${room.rows.join(", ")})`);
    must(room.passions.join("|") === PASSIONS.join("|"), `${size.width}px: the passions row is the eight, in Cassian's order (${room.passions.join(", ")})`);
    must(room.tiles >= 60, `${size.width}px: covers to swipe (${room.tiles} on the rows)`);
    must(Boolean(room.featured) && room.featured !== "pending", `${size.width}px: a book stands at the top for the day (${room.featured})`);
    must(room.broken.length === 0, `${size.width}px: no broken picture with no network: a cover the website holds falls back to its plate${room.broken.length ? ": " + room.broken.slice(0, 3).join(", ") : ""}`);
    must(room.foreign.length === 0, `${size.width}px: every picture is a settled one${room.foreign.length ? ": " + room.foreign.slice(0, 3).join(", ") : ""}`);
    must(room.h1 === en["nav.reading"] && room.glyphs.length === 0, `${size.width}px: the tab bar names the room, and no character is set as an icon${room.glyphs.length ? ": " + room.glyphs.join(" ") : ""}`);
    await page.screenshot({ path: path.join(SHOTS, `reading-room-${size.width}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `reading-room-${size.width}-full.png`), fullPage: true });

    if (size.width === 390) {
      // The search: words narrow the grid, a filter's sheet narrows it again,
      // and a result opens the work at the part its theme names.
      await page.locator("form[role=search] input").tap();
      await page.keyboard.type("Cassian");
      await page.waitForTimeout(900);
      const typed = await page.evaluate(() => ({ results: document.querySelectorAll("[data-reading-search] ul li a").length, q: new URL(location.href).searchParams.get("q") }));
      must(typed.results >= 2 && typed.results <= 8 && typed.q === "Cassian", `a search narrows the grid and is kept in the address (${typed.results} works, q=${typed.q})`);
      await page.locator("[data-reading-search] button[aria-haspopup=dialog]", { hasText: en["reading.filter.theme"] }).first().tap();
      await page.waitForTimeout(900);
      const sheet = await page.evaluate((title) => !![...document.querySelectorAll("[role=dialog]")].find((d) => d.getAttribute("aria-label") === title), en["reading.filter.theme"]);
      must(sheet, "the theme chip opens the shared sheet");
      await page.locator("[role=dialog] button", { hasText: en["reading.theme.anger"] }).first().tap();
      await page.waitForTimeout(900);
      const filtered = await page.evaluate(() => ({
        hrefs: [...document.querySelectorAll("[data-reading-search] ul li a")].map((a) => a.getAttribute("href")),
        theme: new URL(location.href).searchParams.get("theme"),
      }));
      must(filtered.theme === "anger" && filtered.hrefs.includes("/saints/john-cassian/institutes#s157"), `a theme narrows it again, each work opening at its part (${filtered.hrefs.join(", ")})`);
      await page.locator("[data-reading-search] a[href='/saints/john-cassian/institutes#s157']").first().tap();
      await page.waitForTimeout(2500);
      const landed = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, title: document.querySelector("h1#work-title")?.textContent?.trim() ?? null }));
      must(landed.path === "/saints/john-cassian/institutes/" && landed.hash === "#s157" && landed.title === "The Institutes", `the result opens Cassian's Institutes at Book 8 (${landed.path}${landed.hash}, "${landed.title}")`);
      await page.goBack();
      await page.waitForTimeout(1800);
      const back = await page.evaluate(() => ({ search: !!document.querySelector("[data-reading-search]"), theme: new URL(location.href).searchParams.get("theme") }));
      must(back.search && back.theme === "anger", `Back comes home to the same search (${back.search ? "open" : "closed"}, theme=${back.theme})`);
    }
    must(errors.length === 0, `${size.width}px: no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }

  // A book's page: the cover and its facts above the text, the theme chips to
  // the room, and more like it at the foot.
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844, phone: true });
    await go(page, "/saints/athanasius-the-great/on-the-incarnation/");
    await page.waitForFunction(() => !!document.querySelector("h1#work-title"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const book = await page.evaluate(() => {
      const head = document.querySelector("[data-book-header]");
      return {
        h1s: document.querySelectorAll("h1").length,
        title: document.querySelector("h1#work-title")?.textContent?.trim() ?? null,
        byline: head?.querySelector("[data-byline]")?.textContent?.trim() ?? null,
        chips: head ? [...head.querySelectorAll("a[href^='/reading?theme=']")].map((a) => a.getAttribute("href")) : [],
        start: head ? [...head.querySelectorAll("a")].map((a) => a.textContent?.trim()) : [],
        cover: !!head?.querySelector("[data-cover]"),
        like: document.querySelectorAll("[data-more-like-this] li").length,
        text: document.body.innerText.length,
      };
    });
    must(book.h1s === 1 && book.title === "On the Incarnation" && book.cover, `the book's header: its cover and its title, the page's one heading (${book.h1s} h1, "${book.title}")`);
    must(book.byline === "By St. Athanasius the Great", `it is by St Athanasius, as the text is his ("${book.byline}")`);
    must(book.chips.includes("/reading?theme=pascha") && book.start.includes(en["reading.work.start"]), `its themes lead to the room, and Start reading is there (${book.chips.join(", ")})`);
    must(book.like >= 4 && book.text > 1500, `More like this follows the text (${book.like} works; ${book.text} characters on the page)`);
    await page.screenshot({ path: path.join(SHOTS, "book-page-390.png") });
    await page.locator("[data-book-header] a[href='/reading?theme=pascha']").tap();
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
}
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
{
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
    await page.locator("#event-first-council-of-nicaea a").first().tap();
    await page.waitForFunction(() => !!document.querySelector("[data-event-peek='first-council-of-nicaea']"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    const peek = await page.evaluate((read) => {
      const p = document.querySelector("[data-event-peek='first-council-of-nicaea']");
      if (!p) return null;
      const link = [...p.querySelectorAll("a")].find((a) => (a.textContent ?? "").trim() === read);
      return { path: location.pathname, link: link?.getAttribute("href") ?? null };
    }, en["study.history.readFullAccount"]);
    must(Boolean(peek) && peek.path === "/history/" && peek.link === "/history/first-council-of-nicaea", `${size.width}px: a tap on a row opens its peek sheet, on the timeline (${peek ? `${peek.path}, ${peek.link}` : "no sheet"})`);
    await page.screenshot({ path: path.join(SHOTS, `history-peek-${size.width}.png`) });
    await page.locator("[data-event-peek='first-council-of-nicaea'] a[href='/history/first-council-of-nicaea']").tap();
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
    await page.locator("[data-event-parts] a[href='#event-sources']").tap();
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
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
