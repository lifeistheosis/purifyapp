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

  const today = await reads("/", ["Verse of the Day", "Today's Readings"]);
  must(has(today, ["Verse of the Day", "Today's Readings"]), "Today draws its verse and its readings");
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

  const discover = await read(page, "/discover/", [
    "discover.subtitle", "discover.tile.saints", "discover.tile.councils", "discover.tile.theology", "discover.tile.history",
    "discover.tile.calendar", "discover.tile.start", "discover.tile.startBlurb", "discover.tile.parishes", "discover.tile.parishesBlurb",
    "nav.settings", "nav.yourAccount", "reading.eyebrow", "reading.subtitle", "reading.enterReadingRoom", "discover.tile.historyBlurb",
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
    const lines = ["discover.subtitle", "discover.tile.saints", "discover.tile.calendar", "discover.tile.start", "nav.settings"];
    const there = lines.filter((k) => text.toLowerCase().includes(en[k].toLowerCase()));
    must(there.length === lines.length, `a phone set to English: Discover reads as it did (${there.length} of ${lines.length} lines)`);
    // The band's line has lost its arrow, and the card's title its full stop, as before.
    const cta = en["study.exploreTheInteractiveTimeline"].replace(/\s*→\s*$/, "");
    must(text.toLowerCase().includes(cta.toLowerCase()) && !text.includes(en["study.exploreTheInteractiveTimeline"]), `and the history band's line still comes without its arrow ("${cta}")`);
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
  must(page.length < 60 * 1024, `John 1 is ${(page.length / 1024).toFixed(1)} KB to read (it was 68.1 KB)`);
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
  const calendar = sorted(await readingsOn(page, "/calendar/"), el);
  must(calendar.own.length >= 2 && calendar.english.length === 0, `and so are the calendar's (${calendar.own.length})${calendar.english.length ? ", but not: " + calendar.english.join(" | ") : ""}`);

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
    await go(page, "/calendar/");
    must(await screenReads(page, "Friday · November 13, 2026"), 'the calendar\'s date reads "Friday · November 13, 2026"');
    await go(page, "/saints/");
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/saints/"]').length > 50, null, { timeout: 20000 }).catch(() => {});
    const card = await page.evaluate(() => (document.querySelector('a[href="/saints/john-chrysostom/"], a[href="/saints/john-chrysostom"]')?.textContent ?? "").replace(/\s+/g, " "));
    must(card.includes(`${en["saints.feastLabel"]} ${chrysostom.feastDays[0]}`), `and a saint's card reads "${en["saints.feastLabel"]} ${chrysostom.feastDays[0]}"`);
    await ctx.close();
  }
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
