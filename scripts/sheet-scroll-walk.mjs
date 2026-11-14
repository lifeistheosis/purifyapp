// Build 97 note 8: a scroll begun in a window that scrolls inside a sheet stays the window's. The owner
// on the Plus preview's Ambience page: "when you hold down to scroll on the Bible in this context and your
// thumb reaches outside the Bible (because you are scrolling down to read it starts closing the whole
// entire window)". lib/ui/sheetGesture.ts holds the rule; this walks it with real touch (CDP touch events,
// which Chromium scrolls natively) at 390 wide:
//
//   preview  every page of the Plus preview in the upgrade sheet (the Android shell, Plus sold, the reader
//            without it), each window that scrolls: a thumb drawn up from its foot past its top scrolls it
//            and the sheet stands still; then drawn down from its top past its foot, further than the
//            sheet's close line, it scrolls the window back and the sheet stands still and stays open.
//   body     the sheet's own rule kept: a pull down on its body where no window has room still drags the
//            sheet and closes it.
//   journal  the journal's sheet (a reader with nothing locked): its words field filled past its height,
//            when it scrolls inside itself, walked the same way.
//
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
//   node scripts/sheet-scroll-walk.mjs            (the export, served as the shell serves it)
//   node scripts/sheet-scroll-walk.mjs http://localhost:3000   (a dev server with a web key, for the old code)
//
// Exits 1 if a check fails.
import fs from "node:fs";
import { chromium } from "playwright";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { asAndroidShell, checkSells } from "./lib/sells-plus.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../out", import.meta.url).pathname;
const BASE = process.argv[2] ?? null;
if (!BASE) checkSells(OUT, true);
const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));

let failed = 0;
const must = (ok, line) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
  if (!ok) failed++;
};

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

async function open({ shell }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "no-preference", ...(BASE ? {} : { userAgent: NATIVE_UA }) });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  // The export sells Plus only to the Android shell; a dev server with a web key sells it to the page.
  if (shell && !BASE) await asAndroidShell(ctx);
  if (!BASE) await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const to = async (path) => (BASE ? page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 300000 }) : go(page, path, { timeout: 60000 }));
  return { ctx, page, cdp, to };
}

/** A thumb from y0 to y1 at x, at a reader's pace (24 moves, 16ms apart). Returns what fn read under it. */
async function swipe(page, cdp, x, y0, y1, fn) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 24; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 24 }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  const under = fn ? await fn() : null;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
  return under;
}

/** The window's box and scroll, and whether its sheet is still there. `sel` finds the scroller. */
const reading = (page, sel) =>
  page.evaluate((s) => {
    const sc = document.querySelector(s);
    if (!sc) return { open: false };
    const r = sc.getBoundingClientRect();
    return { open: true, top: Math.round(r.top), bottom: Math.round(r.bottom), scroll: Math.round(sc.scrollTop), room: sc.scrollHeight - sc.clientHeight };
  }, sel);

/** The two gestures on one window. Returns false if the sheet was lost (the walk cannot go on). */
async function walkWindow(page, cdp, sel, name) {
  const at = await reading(page, sel);
  if (!at.open) return must(false, `${name}: its window is there`);
  if (at.room < 40) {
    console.log(`     ${name}: its window does not scroll (${at.room}px to scroll), nothing to walk`);
    return true;
  }
  const x = 195;
  const up = await swipe(page, cdp, x, at.bottom - 16, at.top - 120, () => reading(page, sel));
  const afterUp = await reading(page, sel);
  must(up.open && Math.abs(up.top - at.top) <= 2 && afterUp.open && afterUp.scroll > at.scroll, `${name}: a thumb drawn up past the window's top scrolls it (${at.scroll} to ${afterUp.scroll}) and the sheet stands still (moved ${up.open ? up.top - at.top : "away"})`);
  if (!afterUp.open) return false;
  // Past the window's foot by 200px, or to the screen's foot when the window stands low (a panel at the sheet's foot).
  const down = await swipe(page, cdp, x, afterUp.top + 16, Math.min(afterUp.bottom + 200, 838), () => reading(page, sel));
  await page.waitForTimeout(400);
  const afterDown = await reading(page, sel);
  must(
    down.open && Math.abs(down.top - afterUp.top) <= 2 && afterDown.open && afterDown.scroll < afterUp.scroll,
    `${name}: drawn down from the window's top to 200px past its foot, it scrolls the window back (${afterUp.scroll} to ${afterDown.open ? afterDown.scroll : "-"}), the sheet stands still (moved ${down.open ? down.top - afterUp.top : "away"}) and stays open (${afterDown.open ? "open" : "CLOSED"})`,
  );
  return afterDown.open;
}

// ---- preview: every page of the Plus preview in the upgrade sheet.
{
  const { ctx, page, cdp, to } = await open({ shell: true });
  await to("/plans/john/");
  const begin = page.locator("button", { hasText: en["plans.begin"] ?? "Begin" }).first();
  await begin.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await begin.tap();
  const sheet = page.locator(`[role="dialog"][aria-label="${en["plus.sheet.title"]}"]`).first();
  await sheet.waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
  const ids = await sheet.locator("[data-plus-try-open]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-plus-try-open")))]);
  must(ids.length >= 10, `the upgrade sheet opens on its list, ${ids.length} features to try`);
  const first = sheet.locator(`[data-plus-try-open="${ids[0]}"]`).first();
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await first.tap();
  const seen = [];
  for (let n = 0; n < 20; n++) {
    const id = await page.locator("[data-plus-try]").first().getAttribute("data-plus-try", { timeout: 30000 }).catch(() => null);
    if (!id || seen.includes(id)) break;
    seen.push(id);
    await page.waitForFunction(() => !document.querySelector('[data-plus-try-window][aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const sel = `[data-plus-try="${id}"] [data-plus-try-window] > .overflow-y-auto`;
    const alive = await walkWindow(page, cdp, sel, `the preview's ${id} page (${n + 1})`);
    if (!alive) break;
    const next = page.locator("[data-plus-try-next]").first();
    if (!(await next.count())) break;
    await next.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await next.tap();
    await page.waitForTimeout(600);
  }
  must(seen.length >= 10, `the walk went through ${seen.length} preview pages (${seen.join(", ")})`);
  // ---- body: where no window has room, a pull down on the body still drags the sheet away.
  const last = seen.at(-1);
  const win = await reading(page, `[data-plus-try="${last}"] [data-plus-try-window] > .overflow-y-auto`);
  if (win.open) {
    const y = win.bottom + 24;
    await swipe(page, cdp, 195, y, y + 420);
    await page.waitForTimeout(500);
    must(!(await sheet.count()) || !(await sheet.isVisible()), `a pull down on the sheet's body below the window, with nothing there to scroll, still closes the sheet`);
  }
  await ctx.close();
}

// ---- journal: the journal's sheet, its words field.
{
  const { ctx, page, cdp, to } = await open({ shell: false });
  await to("/journal/");
  const pen = page.locator("[data-journal-today] li button").first();
  await pen.waitFor({ timeout: 60000 }).catch(() => {});
  if (await pen.count()) {
    await page.waitForTimeout(1200);
    await pen.tap();
    await page.waitForFunction(() => !!document.querySelector("[data-journal-composer]"), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    const field = page.locator("[data-journal-composer] textarea").last();
    if (await field.count()) {
      await field.fill(Array.from({ length: 60 }, (_, i) => `Line ${i + 1} of the words.`).join("\n"));
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.waitForTimeout(600);
      const scrolls = await page.evaluate(() => {
        const t = [...document.querySelectorAll("[data-journal-composer] textarea")].at(-1);
        if (!t) return false;
        t.setAttribute("data-walk-field", "");
        return t.scrollHeight - t.clientHeight > 40;
      });
      if (scrolls) await walkWindow(page, cdp, "[data-walk-field]", "the journal's words field");
      else console.log("     the journal's words field grows with its words: no window inside the sheet to walk");
    } else console.log("     the journal's sheet has no words field here");
    // More: the page's long settings panel (notebook, tags, font), a window at the sheet's foot.
    const more = page.locator(`[data-journal-composer] button[aria-label="${en["journal.page.more"]}"], [data-journal-composer] button:has-text("${en["journal.page.more"]}")`).first();
    if (await more.count()) {
      await more.tap();
      await page.waitForTimeout(700);
      await walkWindow(page, cdp, "[data-page-more]", "the journal's More panel");
    } else console.log("     the journal's sheet shows no More here");
  } else must(false, "the journal's day opens a page about a reading");
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall held");
process.exit(failed ? 1 : 0);
