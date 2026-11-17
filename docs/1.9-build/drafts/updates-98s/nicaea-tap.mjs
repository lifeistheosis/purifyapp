// Updates 98s: the Nicaea council document's "The council's page", tapped as a reader taps it.
// Updates 98r's tap walk failed it once ("nothing: the tap changed nothing") and three fresh taps
// landed. Here, at 390x844 in English and in Arabic, on the export served as the phone's shell
// serves it, each tap from a fresh page:
//   walker  x3: brought to the middle as scripts/tap-walk.mjs brings a control (scrollIntoView,
//               then still for two looks 100ms apart), aimed as it aims (aimOf), tapped at once;
//   finger  x3: the page swiped up by touch to its end, as a reader reads down, then tapped.
// Before each tap it records what stands under the finger (document.elementFromPoint), so a
// cover that comes and goes (the reader's pill, a fade) is named rather than guessed.
//
//   node docs/1.9-build/drafts/updates-98s/nicaea-tap.mjs <repo>     (after node scripts/gate/export.mjs)
import path from "node:path";
import { chromium } from "playwright";

const repo = path.resolve(process.argv[2] ?? ".");
const { NATIVE_UA, go, serveLikeTheShell } = await import(path.join(repo, "scripts/lib/shell-server.mjs"));
const { tapAt, firstTouch, aimOf } = await import(path.join(repo, "scripts/lib/tap.mjs"));
const OUT = path.join(repo, "out");
const PAGE = "/councils/first-nicaea/the-synodal-letter/";
const WANT = /^\/councils\/first-nicaea\/?$/;
const NAMES = { en: "The council’s page", ar: "صفحة المجمع" };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let fails = 0;
const rows = [];

async function open(lang) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
    colorScheme: "dark",
    locale: lang === "ar" ? "ar" : "en-US",
  });
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      if (l !== "en") localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await serveLikeTheShell(ctx, OUT);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await go(page, PAGE, { timeout: 45000 });
  await page.waitForTimeout(2000);
  await firstTouch(page, cdp);
  return { ctx, page, cdp, errors };
}

/** Two looks 100ms apart within a pixel, up to two seconds. */
async function still(page, handle) {
  let last = null;
  for (let t = 0; t < 20; t++) {
    const b = await handle.boundingBox();
    if (b && last && Math.abs(b.x - last.x) <= 1 && Math.abs(b.y - last.y) <= 1) return b;
    last = b;
    await page.waitForTimeout(100);
  }
  return handle.boundingBox();
}

for (const lang of ["en", "ar"]) {
  for (const way of ["walker", "finger"]) {
    for (let n = 1; n <= 3; n++) {
      const { ctx, page, cdp, errors } = await open(lang);
      const link = page.locator("footer a", { hasText: NAMES[lang] }).first();
      let row = { lang, way, n };
      try {
        await link.waitFor({ state: "attached", timeout: 15000 });
        if (way === "walker") {
          await link.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        } else {
          // Swipes up by touch until the link stands on the screen, as a reader reads down to it.
          for (let s = 0; s < 60; s++) {
            const shown = await link.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return r.top >= 0 && r.bottom <= innerHeight - 120;
            });
            const atEnd = await page.evaluate(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2);
            if (shown || atEnd) break;
            await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 600, yDistance: -500, speed: 1600, gestureSourceType: "touch" });
            await page.waitForTimeout(250);
          }
          await page.waitForTimeout(700);
        }
        const handle = await link.elementHandle();
        const box = await still(page, handle);
        const aim = await aimOf(handle, box);
        const under = await page.evaluate(
          ([x, y, name]) => {
            const hit = document.elementFromPoint(x, y);
            const a = hit?.closest("a");
            const tag = hit ? `${hit.tagName.toLowerCase()}${hit.className && typeof hit.className === "string" ? "." + hit.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}` : "nothing";
            return { onLink: Boolean(a && a.textContent?.includes(name)), tag };
          },
          [aim.x, aim.y, NAMES[lang]],
        );
        await tapAt(cdp, aim.x, aim.y);
        const landed = await page
          .waitForFunction((re) => new RegExp(re).test(location.pathname), WANT.source, { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        const at = await page.evaluate(() => location.pathname);
        row = { ...row, y: `${Math.round(box.y)} to ${Math.round(box.y + box.height)}`, aim: `${Math.round(aim.x)},${Math.round(aim.y)}`, under: under.onLink ? "the link" : under.tag, landed, at };
        if (!landed) fails += 1;
      } catch (e) {
        fails += 1;
        row = { ...row, landed: false, error: String(e).slice(0, 160) };
      }
      if (errors.length) row.errors = errors.slice(0, 2);
      rows.push(row);
      console.log(`${row.landed ? "ok  " : "FAIL"} ${lang} ${way} ${n}: ${JSON.stringify(row)}`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${rows.filter((r) => r.landed).length} of ${rows.length} taps on "The council's page" landed on /councils/first-nicaea/`);
process.exit(fails ? 1 : 0);
