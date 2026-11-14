// Updates 73: Today's Saint card tapped on the export, the motion walk's way (its phone, the
// shell's server, the main web read, real touch), with every View Transition's pseudo-elements
// recorded: out to the saint's page, then Back (the top bar's control, else history.back, as the
// phone's own back key does), each with what the band showed and what took it.
//
//   NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-73-runners/carry73.mjs <out> [--mode on|reduce] [--runs 2]
//
// The walk's own carry check fires only where the page shows a picture of the same file name as
// the card's (scripts/motion-walk.mjs, pictureOnPage), and the band's portrait and the page's icon
// differ: so the walk passing the card says nothing either way. This reads the transition itself.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { installGate } from "../../../scripts/gate/inpage.mjs";
import { mainWeb } from "../../../scripts/lib/main-web.mjs";
import { motionOptions, pinMotion } from "../../../scripts/lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../../../scripts/lib/shell-server.mjs";
import { firstTouch, fresh, tapAt } from "../../../scripts/lib/tap.mjs";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : dflt;
};
const MODE = flag("--mode", "on");
const RUNS = Number(flag("--runs", "2"));
const OUT = path.resolve(argv[0] ?? "out");

const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(MODE) });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
  window.__vt = [];
  const start = Document.prototype.startViewTransition;
  if (!start) return;
  Document.prototype.startViewTransition = function (...a) {
    const t = start.apply(this, a);
    const rec = { names: [] };
    window.__vt.push(rec);
    t.ready
      .then(() => {
        for (const an of document.getAnimations()) {
          const p = an.effect && an.effect.pseudoElement;
          if (p && !rec.names.includes(p)) rec.names.push(p);
        }
      })
      .catch((e) => (rec.error = String(e).slice(0, 160)));
    return t;
  };
});
await pinMotion(ctx, MODE);
await installGate(ctx);
await serveLikeTheShell(ctx, OUT, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);

const first = await ctx.newPage();
await go(first, "/", { timeout: 60000 });
await first.waitForTimeout(1500);
const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
await first.close();

const file = (src) => (src ? decodeURIComponent(new URL(src, "https://localhost/").pathname) : null);
const names = (recs) => recs.map((r) => (r.error ? `error: ${r.error}` : [...new Set(r.names.map((n) => n.replace(/^::view-transition-[\w-]+/, "")))].join(" ")));

console.log(`Today's Saint card, motion ${MODE}, ${RUNS} run(s), ${OUT}`);
for (let run = 1; run <= RUNS; run++) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await fresh(page, "/", kept);
  await firstTouch(page, cdp);
  const card = page.locator('a[data-today-band="saint"]').first();
  await card.waitFor({ timeout: 15000 });
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const band = await card.evaluate((a) => {
    const frame = a.querySelector("[data-carry]");
    const img = a.querySelector("img");
    return { href: a.getAttribute("href"), carry: frame ? frame.getAttribute("data-carry") : null, over: a.querySelectorAll("[data-carry-over]").length, shows: img ? img.currentSrc || img.src : null };
  });
  const box = await card.boundingBox();
  await page.evaluate(() => (window.__vt = []));
  await tapAt(cdp, box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1600);
  const out = await page.evaluate(() => {
    const taker = document.querySelector("[data-carry-into]");
    return { at: location.pathname, vt: window.__vt, taker: taker ? { key: taker.getAttribute("data-carry-into"), landed: "landed" in taker.dataset, shows: taker.currentSrc || taker.src } : null };
  });
  await page.evaluate(() => (window.__vt = []));
  const back = page.getByRole("button", { name: /^(Back|Go back)$/ }).first();
  let how = "history.back";
  if (await back.isVisible().catch(() => false)) {
    const b = await back.boundingBox();
    await tapAt(cdp, b.x + b.width / 2, b.y + b.height / 2);
    how = "the top bar's Back";
  } else await page.evaluate(() => history.back());
  await page.waitForTimeout(1600);
  const home = await page.evaluate(() => {
    const frame = document.querySelector('a[data-today-band="saint"] [data-carry]');
    return { at: location.pathname, vt: window.__vt, landedBack: frame ? "landed" in frame.dataset : null };
  });
  console.log(
    JSON.stringify({
      run,
      band: { ...band, shows: file(band.shows) },
      out: { at: out.at, transitions: out.vt.length, names: names(out.vt), taker: out.taker && { ...out.taker, shows: file(out.taker.shows) } },
      back: { how, at: home.at, transitions: home.vt.length, names: names(home.vt), landedBack: home.landedBack },
    }),
  );
  await page.close();
}
await browser.close();
