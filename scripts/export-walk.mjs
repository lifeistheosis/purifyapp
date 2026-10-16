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
  const pages = ["/", "/prayers/", "/bible/", "/bible/john/1/", "/discover/", "/saints/", "/saints/john-chrysostom/", "/saints/john-chrysostom/on-the-priesthood/", "/saints/gregory-the-dialogist/morals-on-the-book-of-job/", "/community/", "/shop/", "/calendar/", "/settings/", "/whats-new/"];
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
  const explain = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /request|publish/i }).first();
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

  const reading = await read(page, "/reading/", [
    "reading.subtitle", "reading.popular", "reading.enterDeeper", "reading.topics", "reading.surface.patristic",
    "reading.surface.patristicBlurb", "reading.surface.councils", "reading.surface.councilsBlurb", "reading.surface.topics", "reading.surface.topicsBlurb",
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
    const cta = en["study.exploreTheInteractiveTimeline"].replace(/\s*→\s*$/, "");
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
  // nothing. Seen in this walk's own picture of Settings.
  for (const [to, tab] of [["/shop/", words["nav.discover"]], ["/community/", words["nav.discover"]], ["/account/", words["nav.you"]], ["/saved/", words["nav.you"]], ["/settings/", words["nav.you"]], ["/prayers/", words["nav.prayers"]]]) {
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
    const bars = { you: await backBar("/account/"), bible: await backBar("/bible/"), shop: await backBar("/shop/"), chat: await backBar("/community/"), saint: await backBar("/saints/john-chrysostom/") };
    must(!bars.you && !bars.bible, "a tab's own screen has no back bar: not You, not the Bible");
    must(bars.shop && bars.chat && bars.saint, "the shop and Chat, tapped into from Discover, have one, as a saint's page does");

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
await browser.close();
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
