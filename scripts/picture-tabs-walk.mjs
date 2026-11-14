// Build 97 note 9: the verse picture's sheet stands still when its tab changes. The owner, with Words and
// Size side by side: "notice how the words section move the UI up fix that". The panel's floor was 136px
// and Words is taller, so on Words the sheet, its title and the picture stood higher (components/share/
// PictureSheet.tsx now stacks the three tabs in one cell). This opens the sheet from Today's verse card at
// 390 wide and, on each tab, reads the sheet's top edge, its title and the picture: the same to the pixel,
// in every language, at the phone's own text size and at its largest (Android's WebView scales every
// word by the phone's font scale, 1.3 at Largest; here each word in the sheet is set 1.3 times larger).
//
//   npm run build:android && node scripts/picture-tabs-walk.mjs     (the export, served as the shell serves it)
//   node scripts/picture-tabs-walk.mjs http://localhost:3000        (a dev server, for the old code)
//   LANGS=en,de node scripts/picture-tabs-walk.mjs ...              (some languages only)
//
// Exits 1 if a check fails.
import fs from "node:fs";
import { chromium } from "playwright";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../out", import.meta.url).pathname;
const BASE = process.argv[2] ?? null;
const LANGS = process.env.LANGS ? process.env.LANGS.split(",") : fs.readdirSync("lib/i18n/messages").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)));
const SIZES = [
  { name: "the phone's own text size", zoom: 1 },
  { name: "the phone's largest text", zoom: 1.3 },
];

/** Every word in the sheet not yet scaled, scaled by `f` (what a phone's font scale does to a WebView). */
const zoomText = (page, f) =>
  f === 1
    ? null
    : page.evaluate((k) => {
        const els = [...document.querySelectorAll('[role="dialog"] *')].filter((e) => !e.hasAttribute("data-walk-zoomed"));
        const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
        els.forEach((e, i) => {
          e.style.fontSize = `${sizes[i] * k}px`;
          e.setAttribute("data-walk-zoomed", "");
        });
      }, f);

let failed = 0;
const must = (ok, line) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
  if (!ok) failed++;
};

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

for (const lang of LANGS) {
  const m = JSON.parse(fs.readFileSync(`lib/i18n/messages/${lang}.json`, "utf8"));
  const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
  const t = (k) => m[k] ?? en[k];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark", userAgent: NATIVE_UA, ...(lang !== "en" ? { locale: lang } : {}) });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: BASE ?? "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  if (!BASE) await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  for (const size of SIZES) {
    if (BASE) await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 300000 });
    else if (page.url() === "about:blank") await go(page, "/", { timeout: 60000 });
    else await page.reload({ waitUntil: "load" });
    const card = page.locator("article", { hasText: t("today.verseOfDay") }).first();
    const share = card.getByRole("button", { name: t("common.share"), exact: true });
    if (!(await share.waitFor({ timeout: 60000 }).then(() => true).catch(() => false))) {
      must(false, `${lang}, ${size.name}: Today's verse card offers ${t("common.share")}`);
      continue;
    }
    await page.waitForTimeout(800);
    await share.tap();
    const sheet = page.getByRole("dialog", { name: t("picture.title") });
    await sheet.waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    await zoomText(page, size.zoom);
    await page.waitForTimeout(500);
    const tabs = sheet.getByRole("tab");
    const n = await tabs.count();
    const seen = [];
    // Each tab once, then the first again: the sheet must stand where it stood.
    for (const at of [...Array(n).keys(), 0]) {
      await tabs.nth(at).tap();
      await page.waitForTimeout(100);
      await zoomText(page, size.zoom);
      await page.waitForTimeout(700);
      seen.push(
        await page.evaluate((title) => {
          const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.getAttribute("aria-label") === title);
          if (!d) return null;
          const top = (el) => (el ? Math.round(el.getBoundingClientRect().top * 10) / 10 : null);
          const panel = d.querySelector(".will-change-transform");
          const heading = [...d.querySelectorAll("p")].find((e) => e.textContent === title);
          const tab = d.querySelector('[role="tab"][aria-selected="true"]');
          // What the body hides below its fold at rest (Save and Share are the sheet's last line).
          const body = panel?.querySelector(".overflow-y-auto");
          const hidden = body ? Math.round(body.scrollHeight - body.clientHeight) : null;
          return { tab: tab?.textContent?.trim(), edge: top(panel), title: top(heading), picture: top(d.querySelector("canvas")), hidden, font: tab ? getComputedStyle(tab).fontSize : null };
        }, t("picture.title")),
      );
    }
    const ok = n === 3 && seen.every((s) => s && s.edge !== null && s.edge === seen[0].edge && s.title === seen[0].title && s.picture === seen[0].picture);
    must(ok, `${lang}, ${size.name}: on ${seen.map((s) => `${s?.tab} (edge ${s?.edge}, title ${s?.title}, picture ${s?.picture}, below the fold ${s?.hidden})`).join(", ")}; the tabs' words at ${seen[0]?.font}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall held");
process.exit(failed ? 1 : 0);
