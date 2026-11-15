// Updates 51: a quote's picture still opens its own looks on Look, after build 97 note 9 (51e8a8168) moved the
// Look tab into the shared cell. Today's saying card, Share as a picture, real touch, 390 by 844, on the export.
//   node quote51.mjs <out dir> <json out> [en|ar]
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const [base, outFile, lang = "en"] = process.argv.slice(2);
const MSG = Object.fromEntries(["en", lang].map((l) => [l, JSON.parse(fs.readFileSync(`/home/user/purifyapp/lib/i18n/messages/${l}.json`, "utf8"))]));
const t = (k) => MSG[lang]?.[k] ?? MSG.en[k];
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${data ? " " + JSON.stringify(data) : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(lang !== "en" ? { locale: lang } : {}) });
if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
await ctx.addInitScript((l) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("CapacitorStorage.purify_locale", l);
  } catch {}
}, lang);
await serveLikeTheShell(ctx, base, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const cdp = await ctx.newCDPSession(page);
const SHOTS = outFile.replace(/\.json$/, "");
fs.mkdirSync(SHOTS, { recursive: true });
const SHEET = `[role="dialog"][aria-label="${t("picture.title")}"]`;

async function tap(selector) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const b = await loc.boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  await tapAt(cdp, Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
}
// What the reader can see and reach in the panel: the layer not made inert, and what it holds.
const panel = () =>
  page.evaluate((sel) => {
    const sheet = document.querySelector(sel);
    if (!sheet) return { sheet: false };
    const tabs = [...sheet.querySelectorAll('[role="tab"]')].map((b) => ({ name: b.textContent.trim(), on: b.getAttribute("aria-selected") === "true" }));
    const layers = [...sheet.querySelectorAll('[role="tabpanel"] > div')];
    const shown = layers.filter((d) => !d.inert && !d.classList.contains("invisible"));
    const live = shown[0] ?? null;
    const looks = live?.querySelector("[data-quote-looks]") ?? null;
    const groups = looks ? [...looks.querySelectorAll('[role="group"]')] : [];
    const pressed = (g) => g.querySelectorAll('[aria-pressed="true"]').length;
    const box = sheet.getBoundingClientRect();
    return {
      sheet: true,
      tabs,
      layers: layers.length,
      shown: shown.length,
      quoteLooksShown: !!looks,
      quoteLooksAnywhere: sheet.querySelectorAll("[data-quote-looks]").length,
      layout: groups[0] ? { tiles: groups[0].querySelectorAll("button").length, pressed: pressed(groups[0]), label: document.getElementById(groups[0].getAttribute("aria-labelledby"))?.textContent.trim() ?? null } : null,
      look: groups[1] ? { swatches: groups[1].querySelectorAll("button").length, pressed: pressed(groups[1]), label: document.getElementById(groups[1].getAttribute("aria-labelledby"))?.textContent.trim() ?? null } : null,
      sheetTop: Math.round(box.top),
      sheetHeight: Math.round(box.height),
    };
  }, SHEET);

try {
  await go(page, "/", { timeout: 60000 });
  // Updates 76: twice the share control was not found in 45s. When the wait fails, Today is pictured as it
  // stands and its bands are named; then the page is scrolled through (a band may render only once near)
  // and the control is waited for again, so the record says which it was.
  const SHARE = "[data-saying-share], [data-saint-share]";
  try {
    await page.waitForSelector(SHARE, { timeout: 45000 });
  } catch {
    await page.screenshot({ path: `${SHOTS}/today-at-45s.png`, fullPage: true });
    const seen = await page.evaluate(() => ({
      path: location.pathname,
      bands: [...document.querySelectorAll("[data-today-band]")].map((b) => b.getAttribute("data-today-band")),
      main: (document.querySelector("main")?.innerText ?? document.body.innerText).replace(/\s+/g, " ").slice(0, 300),
      height: document.scrollingElement.scrollHeight,
    }));
    for (let y = 0; y < seen.height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(300);
    }
    const late = await page.waitForSelector(SHARE, { timeout: 20000 }).then(() => true, () => false);
    say(late, `share control ${late ? "found only after scrolling Today" : "not found in 45s, nor after scrolling"} (picture at 45s: today-at-45s.png)`, seen);
    if (!late) throw new Error("no share control on Today");
    await page.locator(SHARE).first().scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(2500);
  await tap("[data-saying-share], [data-saint-share]");
  await page.waitForSelector(`${SHEET} [role="tabpanel"]`, { timeout: 20000 });
  await page.waitForTimeout(2500);
  const a = await panel();
  const lookOn = a.tabs?.[0]?.on === true;
  say(a.sheet && lookOn && a.shown === 1 && a.quoteLooksShown, "A. the saying's picture opens on Look, showing the quote's own looks", a);
  say(!!a.layout && a.layout.tiles === 3 && a.layout.pressed === 1 && !!a.look && a.look.swatches > 1 && a.look.pressed === 1, "A. a Layout row of three tiles and one row of swatches, one chosen in each", { layout: a.layout, look: a.look });
  await page.screenshot({ path: `${SHOTS}/a-look.png` });

  // The layout kept when the look changes: the second layout, then another look.
  await tap(`${SHEET} [data-quote-looks] [role="group"]:nth-of-type(1) button:nth-child(2)`);
  await page.waitForTimeout(800);
  const chosen = () =>
    page.evaluate((sel) => {
      const gs = [...document.querySelectorAll(`${sel} [data-quote-looks] [role="group"]`)];
      const at = (g) => [...g.querySelectorAll("button")].findIndex((b) => b.getAttribute("aria-pressed") === "true");
      return { layout: gs[0] ? at(gs[0]) : -1, look: gs[1] ? at(gs[1]) : -1 };
    }, SHEET);
  const before = await chosen();
  const target = before.look === 2 ? 3 : 2;
  await tap(`${SHEET} [data-quote-looks] [role="group"]:nth-of-type(2) button:nth-child(${target + 1})`);
  await page.waitForTimeout(800);
  const after = await chosen();
  say(before.layout === 1 && after.layout === 1 && after.look === target, "B. a look tapped keeps the layout tapped before it", { before, after });

  // Words and back: the quote's looks come back on Look, the sheet standing where it stood.
  const tabSel = (i) => `${SHEET} [role="tab"]:nth-of-type(${i})`;
  await tap(tabSel(2));
  await page.waitForTimeout(800);
  const w = await panel();
  say(w.tabs?.[1]?.on === true && !w.quoteLooksShown && w.quoteLooksAnywhere === 1, "C. on Words the quote's looks are kept but unseen and out of reach", { tabs: w.tabs, shown: w.shown, quoteLooksShown: w.quoteLooksShown });
  await tap(tabSel(1));
  await page.waitForTimeout(800);
  const back = await panel();
  const still = await chosen();
  say(back.tabs?.[0]?.on === true && back.quoteLooksShown && still.layout === 1 && still.look === target, "C. back on Look: the quote's looks again, the layout and look as left", { still });
  say(Math.abs(back.sheetTop - a.sheetTop) <= 1 && Math.abs(w.sheetTop - a.sheetTop) <= 1, "C. the sheet stands still across the tabs", { look: a.sheetTop, words: w.sheetTop, back: back.sheetTop });
  await page.screenshot({ path: `${SHOTS}/c-back-on-look.png` });
} catch (e) {
  say(false, `ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
}
say(errors.length === 0, "no page errors", errors.length ? errors.slice(0, 3) : undefined);
fs.writeFileSync(outFile, JSON.stringify({ lang, results }, null, 2));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
