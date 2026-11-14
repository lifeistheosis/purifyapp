// Updates 49: batch 1's faces on the export (bb0111a9): the seven Father places and St Irene's letters' cover, at 390.
//   node faces49.mjs <out dir> <shots dir> <json out>
// Each Father's round in the row: its picture loaded (complete, natural width), the file named, the round covered by
// it and shown (not the plate alone); then his round tapped (real touch) and the card's portrait the same. A
// screenshot of the Fathers' part each, at 2x so a 44px round can be judged by eye.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const [base, shots, outFile] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const PLACES = [
  ["ephesus", "St. Juvenal of Jerusalem", "juvenal-of-jerusalem.v2"],
  ["ephesus", "St. Celestine of Rome", "celestine-of-rome.v2"],
  ["chalcedon", "St. Anatolius of Constantinople", "anatolius-of-constantinople.v2"],
  ["chalcedon", "St. Juvenal of Jerusalem", "juvenal-of-jerusalem.v2"],
  ["second-constantinople", "St. Eutychius of Constantinople", "eutychius-of-constantinople.v2"],
  ["third-constantinople", "St. Sophronius of Jerusalem", "sophronius-of-jerusalem.v2"],
  ["second-nicaea", "St. Irene the Empress", "irene-the-empress.v2"],
];
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${data ? " " + JSON.stringify(data) : ""}`);
};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function open(route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", "en");
    } catch {}
  });
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(3500);
  return { ctx, page, errors, cdp: await ctx.newCDPSession(page) };
}

const faceOf = (page, sel) =>
  page.evaluate((sel) => {
    const box = document.querySelector(sel);
    if (!box) return null;
    const img = box.querySelector("img");
    const r = box.getBoundingClientRect();
    if (!img) return { img: false, w: Math.round(r.width) };
    const ir = img.getBoundingClientRect();
    let o = 1;
    for (let el = img; el && el !== box.parentElement; el = el.parentElement) o *= Number(getComputedStyle(el).opacity);
    return {
      img: true,
      src: (img.currentSrc || img.src).split("/").pop(),
      loaded: img.complete && img.naturalWidth > 0,
      natural: img.naturalWidth,
      opacity: Math.round(o * 100) / 100,
      covers: ir.left <= r.left + 1 && ir.top <= r.top + 1 && ir.right >= r.right - 1 && ir.bottom >= r.bottom - 1,
      w: Math.round(r.width),
    };
  }, sel);

const byCouncil = new Map();
for (const p of PLACES) byCouncil.set(p[0], [...(byCouncil.get(p[0]) ?? []), p]);
for (const [council, places] of byCouncil) {
  const { ctx, page, errors, cdp } = await open(`/councils/${council}/`);
  try {
    await page.waitForSelector("[data-council-fathers]", { timeout: 20000 });
    await page.locator("[data-council-fathers]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const all = await page.evaluate(() =>
      [...document.querySelectorAll("[data-council-fathers] ul button")].map((b) => ({ name: b.getAttribute("aria-label"), picture: !!b.querySelector("img") })),
    );
    console.log(`  ${council}: the row ${all.map((x) => `${x.name}${x.picture ? "" : " (plate)"}`).join(", ")}`);
    for (const [, name, stem] of places) {
      const round = `[data-council-fathers] ul button[aria-label="${name}"]`;
      const r = await faceOf(page, `${round} > span > span`);
      say(!!r && r.img && r.loaded && r.src.startsWith(stem) && r.covers && r.opacity >= 0.99, `${council}: ${name}'s round shows his picture (${stem})`, r);
      const b = await page.locator(round).boundingBox();
      if (b) await tapAt(cdp, Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
      await page.waitForTimeout(1400);
      const card = await faceOf(page, "[data-council-fathers] > div > * > span > span[aria-hidden]");
      const shownName = await page.evaluate(() => document.querySelector("[data-council-fathers] > div span.font-serif")?.textContent?.trim() ?? null);
      say(shownName === name && !!card && card.img && card.loaded && card.src.startsWith(stem) && card.covers && card.opacity >= 0.99, `${council}: tapped, the card shows ${name} with his portrait`, { shownName, ...card });
      await page.locator("[data-council-fathers]").screenshot({ path: `${shots}/${council}-${stem}.png` });
    }
    say(errors.length === 0, `${council}: no page errors`, errors.length ? errors.slice(0, 2) : undefined);
  } catch (e) {
    say(false, `${council}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

// St Irene's letters' cover: the work's own page and her page's writings.
for (const [route, tag] of [
  ["/saints/irene-the-empress/letters-for-the-seventh-council/", "work"],
  ["/saints/irene-the-empress/", "saint"],
]) {
  const { ctx, page, errors } = await open(route);
  try {
    await page.waitForTimeout(1500);
    const covers = await page.evaluate(() =>
      [...document.querySelectorAll("[data-cover-picture]")].map((el) => {
        const img = el.tagName === "IMG" ? el : el.querySelector("img");
        const r = el.getBoundingClientRect();
        return { state: el.getAttribute("data-cover-picture"), src: img ? (img.currentSrc || img.src).split("/").pop() : null, loaded: img ? img.complete && img.naturalWidth > 0 : false, top: Math.round(r.top + scrollY), w: Math.round(r.width) };
      }),
    );
    const hers = covers.filter((c) => (c.src ?? "").startsWith("irene-the-empress.v2"));
    say(hers.length > 0 && hers.every((c) => c.state === "shown" && c.loaded), `${tag} page: the letters' cover shows her solidus (irene-the-empress.v2)`, { covers });
    const first = page.locator("[data-cover-picture]").first();
    if (await first.count()) {
      await first.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const target = page.locator("[data-cover-picture]").first().locator("xpath=ancestor::*[@data-cover or @data-cover-box][1]");
      await page.screenshot({ path: `${shots}/irene-letters-${tag}.png` });
    }
    say(errors.length === 0, `${tag} page: no page errors`, errors.length ? errors.slice(0, 2) : undefined);
  } catch (e) {
    say(false, `${tag} page: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
