// Walks the native export the way the apps run it. Run after
// scripts/native-build.mjs and before out/ is removed:
//   node scripts/export-walk.mjs [out dir]
// Every request to https://localhost is answered from out/ and everything
// else is refused, so this is also the app with no network. No server is
// started. It exits 1 if a check fails. Screenshots go to .release-logs/walk/.
// Add a check here when a page learns to fetch something it used to carry
// (AGENTS.md, "A page carries what it shows").
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const OUT = path.resolve(process.argv[2] ?? "out");
const SHOTS = path.resolve(".release-logs/walk");
fs.mkdirSync(SHOTS, { recursive: true });
const ORIGIN = "https://localhost";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };

function fileFor(pathname) {
  const p = decodeURIComponent(pathname);
  const direct = path.join(OUT, p);
  if (p.endsWith("/")) return path.join(direct, "index.html");
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  if (fs.existsSync(path.join(direct, "index.html"))) return path.join(direct, "index.html");
  return direct;
}

const browser = await chromium.launch();
async function open({ width, height, phone, set = {} }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, colorScheme: "dark", ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript((values) => { for (const [k, v] of Object.entries(values)) window.localStorage.setItem(k, v); }, { "purify:onboarded": "2", ...set });
  const asked = [];
  const missing = [];
  await ctx.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const file = fileFor(url.pathname);
    asked.push(url.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file, contentType: MIME[path.extname(file)] ?? "application/octet-stream" });
    missing.push(url.pathname);
    return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  return { ctx, page, asked, missing, errors };
}
const data = (asked) => asked.filter((p) => p.startsWith("/bible-data/"));
const say = (label, value) => console.log(`${label}: ${value}`);
let failed = 0;
const must = (ok, text) => { if (!ok) failed++; console.log(`${ok ? "  ok  " : "  NO  "}${text}`); };

// ---- 1. A phone, the Greek off: the page is its verses and asks for nothing more.
{
  const { ctx, page, asked, missing, errors } = await open({ width: 390, height: 844, phone: true });
  const t0 = Date.now();
  await page.goto(`${ORIGIN}/bible/john/1/`, { waitUntil: "load" });
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
  say("  html bytes", fs.statSync(path.join(OUT, "bible/john/1/index.html")).size);
  say("  load ms (local files)", Date.now() - t0 - 2500);
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
  await page.goto(`${ORIGIN}/bible/john/1/`, { waitUntil: "load" });
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
  await page.goto(`${ORIGIN}/bible/john/2/`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  must(data(asked).slice(before).includes("/bible-data/interlinear/john/2.json"), "the next chapter reads its own Greek");
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}

// ---- 3. A computer's width: the study rail reads the commentary and draws it.
{
  const { ctx, page, asked, errors } = await open({ width: 1366, height: 900, phone: false });
  await page.goto(`${ORIGIN}/bible/john/1/`, { waitUntil: "load" });
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
  await page.goto(`${ORIGIN}/bible/genesis/1/`, { waitUntil: "load" });
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
  await page.goto(ORIGIN + work, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  console.log("\n5. St. Gregory's Morals on Job on a phone");
  const html = fs.statSync(path.join(OUT, work, "index.html")).size;
  must(html < 300_000, `the page is light (${Math.round(html / 1024)} KB of HTML; it was 4,533 KB)`);
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
  await page.goto(ORIGIN + "/saints/athanasius-the-great/on-the-incarnation/", { waitUntil: "load" });
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
  await page.goto(ORIGIN + "/saints/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  console.log("\n7. The Saints tab on a phone");
  const html = fs.statSync(path.join(OUT, "saints/index.html")).size;
  must(html < 600_000, `the page is lighter (${Math.round(html / 1024)} KB of HTML; it was 940 KB)`);
  const cards = await page.locator("a[href^='/saints/']").count();
  must(cards > 150, `the saints are listed (${cards} links to a saint)`);
  must(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.screenshot({ path: path.join(SHOTS, "saints-phone.png") });
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery check passed.");
process.exit(failed ? 1 : 0);
