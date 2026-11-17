// Updates 98s: the Nicaea council document's "The council's page", tapped as a reader taps it.
// Updates 98r's tap walk failed it once ("nothing: the tap changed nothing") and three fresh taps
// landed. Here, at 390x844 in English and in Arabic, on the export served as the phone's shell
// serves it, each tap from a fresh page:
//   walker  x3: brought to the middle as scripts/tap-walk.mjs brings a control (scrollIntoView,
//               then still for two looks 100ms apart), aimed as it aims (aimOf), tapped at once;
//   finger  x3: the page swiped up by touch until the link stands on the screen, then tapped;
//   slow    x3: the walker's way with the CPU slowed 4x, as when the tap walk runs three screens
//               at a time (where it failed, twice, in English).
// Every layout shift after the page opens is kept with what moved (PerformanceObserver), and the
// link's box is looked at again 1.5s after the tap's aim, so a late move under the finger is named.
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

async function open(lang, slow = false) {
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
  await ctx.addInitScript(() => {
    window.__shifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const what = (e.sources ?? []).map((s) => {
            const n = s.node;
            const tag = n?.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}${typeof n.className === "string" && n.className ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}` : n ? "#text" : "?";
            return `${tag} ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)}`;
          });
          window.__shifts.push({ t: Math.round(e.startTime), v: Number(e.value.toFixed(4)), input: e.hadRecentInput, what: what.slice(0, 3) });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await serveLikeTheShell(ctx, OUT);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  if (slow) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
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
  for (const way of ["walker", "finger", "slow"]) {
    for (let n = 1; n <= 3; n++) {
      const { ctx, page, cdp, errors } = await open(lang, way === "slow");
      const link = page.locator("footer a", { hasText: NAMES[lang] }).first();
      let row = { lang, way, n };
      try {
        await link.waitFor({ state: "attached", timeout: 15000 });
        if (way === "walker" || way === "slow") {
          await link.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        } else {
          // Swipes up by touch until the link stands on the screen, as a reader reads down to it.
          let stuck = 0;
          let lastTop = null;
          for (let s = 0; s < 60; s++) {
            const r = await link.evaluate((el) => {
              const b = el.getBoundingClientRect();
              return { top: Math.round(b.top), shown: b.top >= 0 && b.bottom <= innerHeight - 120 };
            });
            stuck = lastTop !== null && Math.abs(r.top - lastTop) < 2 ? stuck + 1 : 0;
            lastTop = r.top;
            if (r.shown || stuck >= 3) break;
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
        const after = await handle.boundingBox().catch(() => null);
        const landed = await page
          .waitForFunction((re) => new RegExp(re).test(location.pathname), WANT.source, { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        const at = await page.evaluate(() => location.pathname);
        const shifts = await page.evaluate(() => window.__shifts ?? []).catch(() => []);
        row = { ...row, y: `${Math.round(box.y)} to ${Math.round(box.y + box.height)}`, yAfterTap: after ? Math.round(after.y) : null, shifts: shifts.filter((x) => x.v >= 0.001).slice(-4), aim: `${Math.round(aim.x)},${Math.round(aim.y)}`, under: under.onLink ? "the link" : under.tag, landed, at };
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
