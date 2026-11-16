// Gate 6, part 4: round 3's five lines of the 1.9 note read against the applied screens, on the gate's export,
// as the Android shell serves it to a new reader with no Plus, with no network, at 390 by 844 with touch.
// For each screen it writes what a reader can read on it (the visible words, top to bottom, and the controls'
// names) and a still, so each line's claims can be checked against what is drawn.
//   node docs/handoffs/gate-6-walks/round3-probe.mjs <out> <dir for stills and words>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { NATIVE_UA, serveLikeTheShell, go } from "../../../scripts/lib/shell-server.mjs";
import { asAndroidShell } from "../../../scripts/lib/sells-plus.mjs";

const [OUT = "out", DIR = "/tmp/round3"] = process.argv.slice(2);
fs.mkdirSync(DIR, { recursive: true });
const NEW = { "purify:secondchance.done": "1", "purify:onboarded": "99", "purify:whatsNewSeen": "99" };
const day = { "purify:plans": JSON.stringify({ gospels: { startedOn: "2026-11-14", done: { 0: "2026-11-14" }, at: Date.now() } }) };
const screens = [
  { name: "journal-write", to: "/journal/write/", line: 8 },
  { name: "prayers-door", to: "/prayers/", line: 10, scrollTo: "[data-chants-door]" },
  { name: "you", to: "/account/", line: 11 },
  { name: "profile", to: "/account/profile/", line: 11 },
  { name: "plan-new", to: "/plans/gospels/", line: 12 },
  { name: "plan-day-read", to: "/plans/gospels/", line: 12, set: day },
  { name: "pricing", to: "/pricing/", line: 37, full: true },
];
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const report = [];
for (const s of screens) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
  await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT);
  const seed = { ...NEW, ...(s.set ?? {}) };
  await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, seed);
  const page = await ctx.newPage();
  try {
    await go(page, s.to);
    await page.waitForTimeout(3000);
    if (s.scrollTo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), s.scrollTo);
    await page.waitForTimeout(800);
    const seen = await page.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0"; };
      const words = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent.replace(/\s+/g, " ").trim();
        if (t && n.parentElement && vis(n.parentElement)) words.push(t);
      }
      const controls = [...document.querySelectorAll("button, a[href], [role=button], [role=tab], input, textarea, [contenteditable=true]")]
        .filter(vis).map((e) => `${e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 60)}`);
      const imgs = [...document.querySelectorAll("img")].filter(vis).map((i) => `${i.alt || "(no alt)"} ${i.naturalWidth > 0 ? "drawn" : "EMPTY"}`);
      return { words: [...new Set(words)].slice(0, 120), controls: [...new Set(controls)].slice(0, 80), imgs: imgs.slice(0, 30), url: location.pathname };
    });
    await page.screenshot({ path: path.join(DIR, `${s.name}.png`), fullPage: !!s.full });
    report.push({ ...s, set: undefined, ...seen });
    console.log(`${s.name} (note line ${s.line}) at ${seen.url}: ${seen.words.length} words, ${seen.controls.length} controls, ${seen.imgs.length} pictures (${seen.imgs.filter((i) => i.endsWith("EMPTY")).length} empty)`);
  } catch (e) {
    report.push({ name: s.name, error: String(e).slice(0, 300) });
    console.log(`${s.name}: ERROR ${String(e).slice(0, 200)}`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(DIR, "round3-words.json"), JSON.stringify(report, null, 1));
