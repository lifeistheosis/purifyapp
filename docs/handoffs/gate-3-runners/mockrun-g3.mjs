// Gate 3's checkMock runner (2026-11-14), from Updates 60's mockrun60.mjs: the same export, served the
// shell's way, reading the main web as the walks do with --online (GET only, nothing sent), a reader signed
// out with no Plus asked of them. Four states, each measured with checkMock { pixels: true }:
//   featured  /reading/'s featured work (Gate 2 fault 8: its line on Candlelight, Arabic, 800 and 1032), all 21
//   buybar    a piece's foot bar after Buy now with the box not ticked, the ask line shown (fault 3's mend), all 21;
//             Buy now's top read before and after the tap (fault 3 was 27px)
//   thread    /community/ with a thread open by its "N replies" (fault 5's mend), the five and the two earned;
//             the replies' end read against the tab bar's top
//   privacy   /privacy/ whole (7b38f18f), the five and the two earned
//   node mockrun-g3.mjs <out dir> <jsonl> <conc> <state@width@lang>...
import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const ALL = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const PIECE = "/shop/icons/byzantine-three-beam-wall-cross/";
const messages = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = messages("en");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const centre = (page, sel) =>
  page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    scrollBy(0, r.top + r.height / 2 - innerHeight / 2);
    return true;
  }, sel);

/** Opens the state and marks what is measured `data-g3`; returns what it read on the way. */
async function open(page, state, t) {
  if (state === "featured") {
    await go(page, "/reading/", { timeout: 60000 });
    await page.waitForSelector("[data-featured]", { timeout: 120000 });
    await page.waitForTimeout(3000);
    await centre(page, "[data-featured]");
    await page.waitForTimeout(1500);
    return page.evaluate(() => {
      const e = document.querySelector("[data-featured]");
      e.setAttribute("data-g3", "");
      return { line: [...e.querySelectorAll("p,span,div")].map((x) => x.textContent.trim()).find((s) => s.includes("·"))?.slice(0, 90) ?? null };
    });
  }
  if (state === "buybar") {
    await go(page, PIECE, { timeout: 60000 });
    const buy = page.locator("[data-foot-bar]").getByRole("button", { name: t("shop.buyNow"), exact: true }).first();
    await buy.waitFor({ timeout: 120000 });
    await page.waitForTimeout(2500);
    const top = () => buy.evaluate((b) => Math.round(b.getBoundingClientRect().top * 10) / 10);
    const before = await top();
    await buy.tap();
    await page.waitForTimeout(400);
    const at400 = await top();
    await page.waitForTimeout(1600);
    const after = await top();
    const ask = t("shop.agreeTermsFirst");
    return page.evaluate(
      ({ ask, before, at400, after }) => {
        const bar = document.querySelector("[data-foot-bar]");
        const line = [...document.querySelectorAll("p,span,div")].filter((e) => e.textContent.trim() === ask).pop() ?? null;
        const shown = !!line && line.getBoundingClientRect().height > 0 && getComputedStyle(line).visibility !== "hidden";
        bar.setAttribute("data-g3", "");
        if (line && !bar.contains(line)) line.setAttribute("data-g3b", "");
        const r = line?.getBoundingClientRect();
        return { before, at400, after, moved: Math.round((after - before) * 10) / 10, shown, inBar: !!line && bar.contains(line), line: r ? [Math.round(r.top), Math.round(r.bottom)] : null };
      },
      { ask, before, at400, after },
    );
  }
  if (state === "thread") {
    await go(page, "/community/", { timeout: 60000 });
    const opener = page.getByRole("button", { name: /^\d+ (replies|reply)\b/i }).first();
    await opener.waitFor({ timeout: 120000 });
    await page.waitForTimeout(2500);
    await opener.evaluate((b) => b.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(800);
    const label = (await opener.textContent())?.trim();
    await opener.tap();
    await page.waitForSelector('[id$="-replies"]', { timeout: 30000 });
    await page.waitForTimeout(3500);
    return page.evaluate((label) => {
      const part = [...document.querySelectorAll('[id$="-replies"]')].pop();
      const card = part.closest("article") ?? part.parentElement;
      card.setAttribute("data-g3", "");
      const bar = document.querySelector("[data-tab-bar]");
      const barTop = bar ? Math.round(bar.getBoundingClientRect().top) : innerHeight;
      const r = part.getBoundingClientRect();
      return { label, repliesTop: Math.round(r.top), repliesEnd: Math.round(r.bottom), barTop, inView: r.top < barTop };
    }, label);
  }
  if (state === "privacy") {
    await go(page, "/privacy/", { timeout: 60000 });
    await page.waitForSelector("main h1, h1", { timeout: 60000 });
    await page.waitForTimeout(2500);
    return page.evaluate(() => {
      const m = document.querySelector("main") ?? document.body;
      m.setAttribute("data-g3", "");
      const text = m.innerText;
      return { h1: document.querySelector("h1")?.textContent.trim().slice(0, 60), arrows: (text.match(/[→←↗↘➜➔⟶]/g) ?? []).length, dashes: (text.match(/—/g) ?? []).length };
    });
  }
  throw new Error(`unknown state ${state}`);
}

async function run(spec) {
  const [state, w, lang] = spec.split("@");
  const width = Number(w);
  const m = messages(lang);
  const t = (k) => m[k] ?? EN[k];
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    const opened = await open(page, state, t);
    if (!opened) throw new Error("nothing to measure");
    const groups = state === "featured" || state === "buybar" ? [0, 1, 2] : [0];
    for (const sel of ["[data-g3]", "[data-g3b]"]) {
      if (!(await page.$(sel))) continue;
      for (const g of groups) {
        const r = await checkMock(page, sel, { pixels: true, palettes: ALL[g] });
        const failures = r.failures.map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 400));
        fs.appendFileSync(jsonl, JSON.stringify({ spec, sel, group: g, opened, ms: Date.now() - t0, failures, unmeasured: r.unmeasured?.length ?? 0, errors }) + "\n");
        console.log(`${spec} ${sel} group ${g}: ${failures.length} failure(s) ${JSON.stringify(opened).slice(0, 160)} (${Math.round((Date.now() - t0) / 1000)}s)`);
      }
    }
  } catch (e) {
    const shot = path.join(path.dirname(jsonl), `fail-${spec.replace(/@/g, "_")}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300), shot, errors }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

const queue = [...specs];
await Promise.all(
  Array.from({ length: Number(conc) }, async () => {
    for (let s = queue.shift(); s; s = queue.shift()) await run(s);
  }),
);
await browser.close();
