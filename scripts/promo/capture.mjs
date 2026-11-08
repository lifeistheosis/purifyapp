// Real screens for the promo (scripts/promo/README.md), from a local-first
// export: `npm run build:android` writes out/, and this opens it as the apps
// do (scripts/lib/shell-server.mjs), at 3x, in the free palettes only (Dark,
// and Light for the psalm). Nothing is drawn: a screen is what the app
// showed. It also copies the house fonts out of the export and the art out of
// public/, so a look draws from nothing else.
//
//   node scripts/promo/capture.mjs [--export out]
import fs from "node:fs";
import path from "node:path";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { REPO, copyArt, copyFonts, dir, launch } from "./lib.mjs";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const EXPORT = path.resolve(REPO, flag("export", "out"));
if (!fs.existsSync(path.join(EXPORT, "index.html"))) throw new Error(`no export in ${EXPORT}: run npm run build:android first`);
copyFonts(EXPORT);
copyArt();
const OUT = dir("screens");

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
// Six mornings kept: Today shows the streak as a reader who prays sees it.
const kept = JSON.stringify([5, 4, 3, 2, 1, 0].map(daysAgo));

const browser = await launch();
async function shot(name, route, { theme, scale = 3, wait = 2500, set = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "3", "purify:whatsNewSeen": "99", ...(theme ? { "purify.reader.theme": theme } : {}), ...set });
  await serveLikeTheShell(ctx, EXPORT, {});
  const page = await ctx.newPage();
  await go(page, route);
  await page.waitForTimeout(wait);
  // No scrollbars, no carets: the screen as a reader sees it.
  await page.addStyleTag({ content: "::-webkit-scrollbar{display:none} *{caret-color:transparent !important}" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await ctx.close();
  console.log("screen", name);
}

await shot("bible-john-1-dark", "/bible/john/1/");
// The close-up look enlarges it about three times: drawn at 6x to stay sharp.
await shot("john-1-dark-6x", "/bible/john/1/", { scale: 6, wait: 3000 });
await shot("bible-psalm-22-light", "/bible/psalms/22/", { theme: "parchment" });
await shot("calendar", "/calendar/");
await shot("saints", "/saints/");
await shot("chrysostom-ephesians", "/saints/john-chrysostom/homilies-on-ephesians/", { wait: 3500 });
await shot("today-kept", "/", { set: { "purify.prayers.morning.dates": kept } });
// The morning prayers ask once, for 15 seconds, whether to chant: the screen is taken after.
await shot("prayers-morning-clean", "/prayers/morning/", { wait: 17500, set: { "purify.prayers.morning.dates": kept } });
await browser.close();

// The day the screens show, for the look that names it.
fs.writeFileSync(path.join(OUT, "meta.json"), `${JSON.stringify({ day: ymd(new Date()), export: path.relative(REPO, EXPORT) }, null, 1)}\n`);
