// checkMock with pixels on the councils' close (Updates 54, from Updates 49's mockrun49.mjs): batch 1's five council
// pages, Sardica, Antioch (268) and Orange (529) with their document pages, their two reading-room shelves, the
// reading room's councils and the Credits page, on the export served as the shell serves it, with the website's
// files asked of purifyapp.net (so the three new pictures answer 404 until the merge: the blurred previews and the plate).
//   node mockrun54.mjs <out dir> <jsonl> <conc> <key@width@lang@group>...
// group: 0 = the five and the two earned, 1 = looks 1-7, 2 = looks 8-14.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const GROUPS = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
export const ROUTE = {
  ephesus: "/councils/ephesus/",
  chalcedon: "/councils/chalcedon/",
  "second-constantinople": "/councils/second-constantinople/",
  "third-constantinople": "/councils/third-constantinople/",
  "second-nicaea": "/councils/second-nicaea/",
  sardica: "/councils/sardica/",
  "antioch-268": "/councils/antioch-268/",
  "orange-529": "/councils/orange-529/",
  "sardica-canons": "/councils/sardica/the-twenty-canons/",
  "antioch-letter": "/councils/antioch-268/the-synodal-letter/",
  "antioch-malchion": "/councils/antioch-268/the-disputation-of-malchion/",
  "orange-canons": "/councils/orange-529/the-canons/",
  "shelf-sardica": "/reading/councils/sardica/",
  "shelf-antioch": "/reading/councils/antioch-268/",
  room: "/reading/councils/",
  credits: "/credits/",
};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(spec) {
  const [key, w, lang, g] = spec.split("@");
  const width = Number(w);
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    await go(page, ROUTE[key], { timeout: 60000 });
    await page.waitForTimeout(4000);
    const r = await checkMock(page, "body", { pixels: true, palettes: GROUPS[Number(g)] });
    fs.appendFileSync(jsonl, JSON.stringify({ spec, ms: Date.now() - t0, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, allowed: r.allowed?.length ?? 0, errors }) + "\n");
    console.log(`${spec}: ${r.failures.length} failure(s), ${errors.length} page error(s) (${Math.round((Date.now() - t0) / 1000)}s)`);
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
