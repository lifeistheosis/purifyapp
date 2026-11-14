// checkMock with pixels on Updates 48's touched screens (from Updates 46's mockrun46.mjs).
// States: prayer (/prayers/morning/, Begin tapped, motion on, a line lit), plan0 (/plans/gospels/ begun, none read),
// plan1 (the same with day 1 read), list (/plans/ with the Continue card, day 1 read). The plan states are seeded in
// the plans' own store and read by a stand-in subscriber (stand49.mjs), as the plans are Plus on the gate's export.
//   node mockrun49.mjs <out dir> <jsonl> <conc> <state@width@lang@group>...
// group: 0 = the five and the two earned, 1 = looks 1-7, 2 = looks 8-14.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const S = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { standInSubscriber } = await import(`${S}/stand49.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const GROUPS = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const ROUTE = { prayer: "/prayers/morning/", plan0: "/plans/gospels/", plan1: "/plans/gospels/", list: "/plans/", picture: "/", words: "/" };
const MSG = Object.fromEntries(["en", "ar"].map((l) => [l, JSON.parse(fs.readFileSync(`/home/user/purifyapp/lib/i18n/messages/${l}.json`, "utf8"))]));
const t = (l, k) => MSG[l]?.[k] ?? MSG.en[k];
const BEGIN = { en: t("en", "today.prayNow.begin"), ar: t("ar", "today.prayNow.begin") };
const SHEET = (l) => `[role="dialog"][aria-label="${t(l, "picture.title")}"]`;
const today = new Date();
const DAY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function act(page, state, lang) {
  if (state === "prayer") {
    await page.waitForSelector("[data-prayer-reader] [data-line]", { timeout: 20000 });
    const label = BEGIN[lang] ?? BEGIN.en;
    const b = page.locator("button", { hasText: label }).filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).first();
    await b.click();
    await page.waitForTimeout(2000);
    const lit = await page.evaluate(() => !!document.querySelector("[data-prayer-reader] [data-lit]"));
    if (!lit) throw new Error("Begin tapped, but no line lit");
  } else if (state === "picture" || state === "words") {
    // Updates 47's note 9: the verse picture's sheet, opened from Today's verse card as the picture walk opens it.
    const card = page.locator("article", { hasText: t(lang, "today.verseOfDay") }).first();
    const share = card.getByRole("button", { name: t(lang, "common.share"), exact: true });
    await share.waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    await share.tap();
    await page.locator(SHEET(lang)).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    if (state === "words") {
      await page.locator(SHEET(lang)).first().getByRole("tab", { name: t(lang, "picture.tab.words") }).tap();
      await page.waitForTimeout(1200);
    }
  } else {
    await page.waitForTimeout(800);
  }
}

async function run(spec) {
  const [state, w, lang, g] = spec.split("@");
  const width = Number(w);
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  const plans = state === "prayer" || state === "picture" || state === "words" ? "" : JSON.stringify({ gospels: { startedOn: DAY, done: state === "plan0" ? {} : { 0: DAY }, at: Date.now() } });
  await ctx.addInitScript(([l, p]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (p && !localStorage.getItem("purify:plans")) localStorage.setItem("purify:plans", p);
    } catch {}
  }, [lang, plans]);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const sent = state.startsWith("plan") || state === "list" ? await standInSubscriber(ctx, mainWeb) : [];
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    await go(page, ROUTE[state], { timeout: 60000 });
    await page.waitForTimeout(3500);
    await act(page, state, lang);
    const shape = await page.evaluate(() => ({
      count: document.querySelector("[data-plan-path]") ? [...document.querySelector("[data-plan-path]").firstElementChild.querySelectorAll("p")].filter((p) => p.id !== "plan-path").length : null,
      pathBar: document.querySelector("[data-plan-path]") ? !![...document.querySelector("[data-plan-path]").children].find((el) => el.matches("div.h-1")) : null,
      cardBar: document.querySelector("[data-plans-continue]") ? !!document.querySelector("[data-plans-continue] span.h-1") : null,
      locked: !!document.querySelector("[data-plan-begin] span"),
      lit: !!document.querySelector("[data-prayer-reader] [data-lit]"),
    }));
    const r = await checkMock(page, state === "picture" || state === "words" ? SHEET(lang) : "body", { pixels: true, palettes: GROUPS[Number(g)] });
    fs.appendFileSync(jsonl, JSON.stringify({ spec, ms: Date.now() - t0, shape, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, allowed: r.allowed?.length ?? 0, errors, sent: sent.length }) + "\n");
    const kinds = {};
    for (const f of r.failures) kinds[f.check] = (kinds[f.check] ?? 0) + 1;
    console.log(`${spec}: ${r.failures.length} failure(s) ${JSON.stringify(kinds)} ${JSON.stringify(shape)} (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300) }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

const queue = [...specs];
await Promise.all(Array.from({ length: Number(conc) }, async () => {
  for (let s = queue.shift(); s; s = queue.shift()) await run(s);
}));
await browser.close();
