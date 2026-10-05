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
async function open({ width, height, phone, set = {} }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, colorScheme: "dark", ...(phone ? { isMobile: true, hasTouch: true, userAgent: NATIVE_UA } : {}) });
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
  await page.waitForTimeout(3000);
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
  await page.waitForTimeout(3000);
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

await browser.close();
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
