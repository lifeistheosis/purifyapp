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
// On every tab it also reads Save and Share, which must stand whole inside the screen, each the first
// thing under a finger at its centre, with the line that says the picture was saved under them, and
// stay where they stand when the body is scrolled to its end (at the largest text the old sheet hid 46px
// below its fold, on every tab, and scrolled them with the body; the arbiter's call: held at the sheet's
// foot at its 85% cap, the body above them scrolling, the picture not shrunk), and the Words tab's Text
// size slider, which must be 44px tall to a finger (checkMock found it 36: Updates 51, 18 specs, every
// width, English and Arabic).
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
        await page.evaluate(({ title, names }) => {
          const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.getAttribute("aria-label") === title);
          if (!d) return null;
          const top = (el) => (el ? Math.round(el.getBoundingClientRect().top * 10) / 10 : null);
          const panel = d.querySelector(".will-change-transform");
          const heading = [...d.querySelectorAll("p")].find((e) => e.textContent === title);
          const tab = d.querySelector('[role="tab"][aria-selected="true"]');
          // What the body hides below its fold at rest.
          const body = panel?.querySelector(".overflow-y-auto");
          const hidden = body ? Math.round(body.scrollHeight - body.clientHeight) : null;
          // Save and Share: whole inside the screen, and the first thing under a finger at the centre (so a
          // body that hides them below its fold, or anything over them, fails).
          const reach = (name) => {
            const b = [...d.querySelectorAll("button")].find((e) => e.textContent.trim() === name);
            if (!b) return { bottom: null, seen: false };
            const r = b.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { bottom: Math.round(r.bottom * 10) / 10, seen: r.top >= 0 && r.bottom <= window.innerHeight + 0.5 && !!hit && b.contains(hit) };
          };
          const save = reach(names[0]);
          const share = reach(names[1]);
          // The line that says the picture was saved, under them: in view as they are.
          const said = d.querySelector('p[role="status"][aria-live="polite"]');
          const saidBottom = said ? Math.round(said.getBoundingClientRect().bottom * 10) / 10 : null;
          // Held: with the body scrolled to its end they stand where they stood (the old sheet scrolled them
          // with the body, 46px at the largest text: at 390 by 844 they ended 1.4px inside the screen, and the
          // save line and the sheet's foot under them were below it). Back to the top before the next tab.
          let held = true;
          if (body && body.scrollHeight > body.clientHeight) {
            body.scrollTop = body.scrollHeight;
            held = reach(names[0]).bottom === save.bottom && reach(names[1]).bottom === share.bottom;
            body.scrollTop = 0;
          }
          // The Words tab's slider, laid out on every tab (the layers share one cell), its box to a finger.
          const range = d.querySelector('input[type="range"]');
          const slider = range ? Math.round(range.getBoundingClientRect().height * 10) / 10 : null;
          return { tab: tab?.textContent?.trim(), edge: top(panel), title: top(heading), picture: top(d.querySelector("canvas")), hidden, save, share, said: saidBottom, held, slider, screen: window.innerHeight, font: tab ? getComputedStyle(tab).fontSize : null };
        }, { title: t("picture.title"), names: [t("common.save"), t("common.share")] }),
      );
    }
    const ok = n === 3 && seen.every((s) => s && s.edge !== null && s.edge === seen[0].edge && s.title === seen[0].title && s.picture === seen[0].picture);
    must(ok, `${lang}, ${size.name}: on ${seen.map((s) => `${s?.tab} (edge ${s?.edge}, title ${s?.title}, picture ${s?.picture}, below the fold ${s?.hidden})`).join(", ")}; the tabs' words at ${seen[0]?.font}`);
    const inView = seen.length > 0 && seen.every((s) => s?.save.seen && s?.share.seen && s.said !== null && s.said <= s.screen + 0.5 && s.held);
    must(inView, `${lang}, ${size.name}: Save and Share in view and held on every tab, ${seen.map((s) => `${s?.tab} (Save to ${s?.save.bottom}${s?.save.seen ? "" : " HIDDEN"}, Share to ${s?.share.bottom}${s?.share.seen ? "" : " HIDDEN"}, the save line to ${s?.said}, ${s?.held ? "held" : "SCROLLED WITH THE BODY"})`).join(", ")}, the screen ${seen[0]?.screen} tall`);
    const sliders = seen.map((s) => s?.slider ?? 0);
    must(sliders.length > 0 && Math.min(...sliders) >= 44 - 0.05, `${lang}, ${size.name}: the Text size slider ${Math.min(...sliders)}px tall to a finger, needs 44`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall held");
process.exit(failed ? 1 : 0);
