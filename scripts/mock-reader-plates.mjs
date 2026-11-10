// The Bible reader's top at the owner's phone's width (412px), as build 89
// note 15 asked: the way back and ••• on their plates, the status bar's strip
// and the line along it, the book's name under them. Measures the plates and
// their gaps, holds the plates to checkMock on all five palettes, the row to
// its stepping away and to reduced motion, and takes one still of the top for
// the owner (scale 2). The rest of the screen is checked too and told, not
// held: on 2026-11-10 it had misses of its own below the top (the chapter
// pill's 42.5px arrows, the book links, the commentary marks, one typed red).
//
//   npm run build:android && node scripts/mock-reader-plates.mjs [out.png]
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const shot = process.argv[2] ?? "reader-plates.png";
const { browser, ctx, page } = await openPhone({ scale: 2 });
let ok = false;
try {
  await page.setViewportSize({ width: 412, height: 915 });
  await go(page, "/bible/john/1/");
  await page.waitForSelector("[data-plates-row]", { timeout: 20000 });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const row = document.querySelector("[data-plates-row]").getBoundingClientRect();
    const plates = [...document.querySelectorAll("[data-plates-row] :is(a, button)")].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0);
    const line = document.querySelector(".reader-progress")?.getBoundingClientRect() ?? null;
    const name = document.querySelector(".under-plates h1, .under-plates [data-book-name], main h1")?.getBoundingClientRect() ?? null;
    const verse = document.querySelector("[data-verse], .verse, [id^='v']")?.getBoundingClientRect() ?? null;
    const round = (r) => (r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(innerWidth - r.right) } : null);
    return { width: innerWidth, row: round(row), plates: plates.map(round), line: round(line), name: round(name), verse: round(verse) };
  });
  console.log(JSON.stringify(m, null, 1));
  await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 412, height: 200 } });
  console.log(`Still: ${shot}`);
  ok = printMockCheck(await checkMock(page, "[data-mobile-topbar][data-plates]"), "the reader's plates");
  printMockCheck(await checkMock(page, "body"), "the reader's screen, told and not held");

  // Stepping away (lib/ui/scrollAway.ts): reading on puts the row away, up a
  // little and faded; a scroll up brings it back.
  const rowStyle = () =>
    page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector("[data-plates-row]"));
      return { away: document.body.hasAttribute("data-reader-away"), opacity: cs.opacity, visibility: cs.visibility, transform: cs.transform, duration: cs.transitionDuration };
    });
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);
  const away = await rowStyle();
  await page.mouse.wheel(0, -40);
  await page.waitForTimeout(700);
  const back = await rowStyle();
  console.log("away:", JSON.stringify(away));
  console.log("back:", JSON.stringify(back));
  const awayOk = away.away && away.opacity === "0" && away.visibility === "hidden" && away.transform === "matrix(1, 0, 0, 1, 0, -8)" && !back.away && back.opacity === "1";
  console.log(`${awayOk ? "OK " : "NO "}  steps away while reading on, up 8px and faded, and comes back on a scroll up`);

  // Reduced motion: no travel at all. In the apps the reader's own Motion
  // setting decides, not the system's (lib/ui/motionPrepaint.ts), so turn it off.
  await page.evaluate(() => localStorage.setItem("purify.motion", "off"));
  await page.reload();
  await page.waitForSelector("[data-plates-row]", { timeout: 20000 });
  await page.waitForTimeout(800);
  const still = await page.evaluate(() => ({
    motion: document.documentElement.getAttribute("data-motion"),
    duration: getComputedStyle(document.querySelector("[data-plates-row]")).transitionDuration,
  }));
  console.log("reduced:", JSON.stringify(still));
  const stillOk = still.motion === "reduce" && still.duration.split(",").every((d) => d.trim() === "0s");
  console.log(`${stillOk ? "OK " : "NO "}  reduced motion: the row does not travel`);
  ok = ok && awayOk && stillOk;
} finally {
  await ctx.close();
  await browser.close();
}
process.exit(ok ? 0 : 1);
