// Build 97 note 2, the owner: "and it's a jump and a flash for the typing bug". A sheet with a field,
// tapped at 390 by 844, the keyboard stood in as the Android app's is: the web view itself grows shorter
// (no Keyboard plugin; the safe-area plugin pads the window by the keyboard, MainActivity's EdgeToEdge),
// then the WebView's own scroll of the focused field's box into view (scrollIntoViewIfNeeded(true) stands in
// for Chromium's scrollFocusedEditableNodeIntoView, centre if needed). Every frame from the tap to the
// keyboard's rest: the sheet's top edge, the field's top, the body's scroll. The check: the edge never
// moves, and once the keyboard is up the field stands where the sheet's own rule put it
// (lib/ui/sheetKeyboard.ts); on the old code the WebView's scroll moved it 200px more on a page with a cover.
//
//   NATIVE=1 COVER=1 node scripts/keyboard-sheet-walk.mjs http://localhost:3000 journal step 300
//   NATIVE=1 node scripts/keyboard-sheet-walk.mjs http://localhost:3000 journal step 300   (no cover)
//   NATIVE=1 node scripts/keyboard-sheet-walk.mjs http://localhost:3000 living step 300    (For the living:
//     a `keyboard` sheet taller than what the keyboard leaves: its edge stays while the field shows; until
//     build 97 it rose from 110.6 to the cap at 12.8 in one frame. KB_AFTER=900 brings the keyboard after
//     the sheet has risen; the default brings it while it still rises, as autoFocus does)
//
// A dev server needs NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=walk-anon.
// Modes: step (one resize, as Android pads the window), anim (eight), vv (the website's: the visual viewport only).
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const WHICH = process.argv[3] ?? "journal";
const MODE = process.argv[4] ?? "step";
const KB = Number(process.argv[5] ?? 300);
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 PurifyNative";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark", userAgent: UA });
await ctx.addInitScript((mode) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
  if (mode === "vv") {
    // The website's way (Chrome since 108, Safari): the page stays, the visual viewport shrinks.
    const target = new EventTarget();
    let up = 0;
    const vv = {
      get width() { return innerWidth; }, get height() { return innerHeight - up; },
      offsetTop: 0, offsetLeft: 0, get pageTop() { return scrollY; }, get pageLeft() { return scrollX; }, scale: 1,
      onresize: null, onscroll: null,
      addEventListener: (t, f, o) => target.addEventListener(t, f, o),
      removeEventListener: (t, f, o) => target.removeEventListener(t, f, o),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
    window.__kb = (px) => { up = px; target.dispatchEvent(new Event("resize")); };
  }
}, MODE);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

let fieldSel;
if (WHICH === "journal") {
  await page.goto(`${BASE}/journal/`, { waitUntil: "load", timeout: 300000 });
  const write = page.locator("[data-journal-write]:visible").first();
  await write.waitFor({ timeout: 120000 });
  await page.waitForTimeout(1500);
  await write.tap();
  await page.waitForSelector("[data-journal-composer]", { timeout: 30000 });
  fieldSel = process.env.FIELD ?? "[data-journal-composer] [data-page-text] textarea";
  if (process.env.COVER) {
    await page.waitForTimeout(900);
    await page.locator("[data-page-toolbar] button", { hasText: "More" }).first().tap();
    await page.waitForTimeout(400);
    await page.locator("[data-page-more] button", { hasText: "Cover" }).first().tap();
    await page.waitForTimeout(400);
    await page.locator("[data-page-cover-choices] [role=radio]").nth(1).tap();
    await page.waitForTimeout(400);
    await page.locator("[data-page-cover-choices] button", { hasText: "Done" }).first().tap().catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => document.activeElement?.blur?.());
    console.log("cover:", await page.locator("[data-page-cover]").count());
  }
} else {
  await page.goto(`${BASE}/prayers/personal/`, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(2500);
  fieldSel = process.env.FIELD ?? '[role="dialog"] input:not([type=checkbox]):not([type=radio]), [role="dialog"] textarea';
}
await page.waitForTimeout(1200);

// The recorder: every frame, the sheet's top edge, the field's box, the scroller, the foot.
await page.evaluate((sel) => {
  const frames = [];
  window.__frames = frames;
  const t0 = performance.now();
  const r = (x) => Math.round(x * 10) / 10;
  const tick = () => {
    const f = document.querySelector(sel);
    const panel = f?.closest(".will-change-transform");
    const p = panel?.getBoundingClientRect();
    const b = f?.getBoundingClientRect();
    const sc = f?.closest(".overflow-y-auto");
    const scrim = panel?.closest('[role="dialog"]')?.querySelector("button[tabindex='-1']");
    const foot = panel?.lastElementChild?.getBoundingClientRect();
    // The panel's own place, with the opening's slide taken out: where its edge rests.
    const ty = panel ? new DOMMatrixReadOnly(getComputedStyle(panel).transform).m42 : 0;
    frames.push({
      t: Math.round(performance.now() - t0),
      ih: innerHeight, vvh: Math.round(visualViewport.height),
      edge: p ? r(p.top) : null, rest: p ? r(p.top - ty) : null, bottom: p ? r(p.bottom) : null, ph: p ? r(p.height) : null,
      tf: panel?.style.transform ?? "",
      fieldTop: b ? r(b.top) : null, fieldRest: b ? r(b.top - ty) : null, fieldH: b ? r(b.height) : null,
      st: sc ? Math.round(sc.scrollTop) : null, scH: sc ? Math.round(sc.clientHeight) : null,
      footTop: foot ? r(foot.top) : null, footBottom: foot ? r(foot.bottom) : null,
      pad: panel ? getComputedStyle(panel).paddingBottom : null,
      scrimH: scrim?.style.height ?? null, scrimO: scrim?.style.opacity ?? null,
      kbFlag: document.documentElement.getAttribute("data-keyboard"),
      focus: document.activeElement === f,
      docScroll: Math.round(document.scrollingElement.scrollTop),
    });
    if (frames.length < 400) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, fieldSel);

if (WHICH === "journal") {
  const field = page.locator(fieldSel).first();
  const box = await field.boundingBox();
  if (!box) { console.log("no field"); process.exit(2); }
  await page.waitForTimeout(150);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20));
} else {
  const btn = page.getByRole("button", { name: process.env.OPENER ?? "Add: For the living" }).first();
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await btn.tap();
  await page.waitForTimeout(Number(process.env.KB_AFTER ?? 200));
}
// The keyboard comes about a tenth of a second after the tap.
await page.waitForTimeout(120);
if (MODE === "step") await page.setViewportSize({ width: 390, height: 844 - KB });
else if (MODE === "anim") {
  for (let i = 1; i <= 8; i++) {
    await page.setViewportSize({ width: 390, height: Math.round(844 - (KB * i) / 8) });
    await page.waitForTimeout(30);
  }
} else await page.evaluate((kb) => window.__kb(kb), KB);
// Android WebView, once its size has changed for the keyboard, scrolls the focused field's box into
// view (ImeAdapterImpl.updateAfterViewSizeChanged -> scrollFocusedEditableNodeIntoView ->
// WebFrameWidgetImpl::ScrollFocusedEditableElementIntoView: CenterIfNeeded in every scroller).
if (process.env.NATIVE) {
  await page.waitForTimeout(20);
  await page.evaluate(() => document.activeElement?.scrollIntoViewIfNeeded?.(true));
}
// FINGER=1: the reader's own scroll inside the hold (a real touch drag up the body, 100ms after the
// keyboard's rest) is never put back.
let finger = null;
if (process.env.FINGER) {
  await page.waitForTimeout(100);
  const st = () => page.evaluate((sel) => document.querySelector(sel)?.closest(".overflow-y-auto")?.scrollTop ?? null, fieldSel);
  const before = await st();
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 200, y }] });
  await touch("touchStart", 420);
  for (let y = 410; y >= 280; y -= 10) {
    await touch("touchMove", y);
    await page.waitForTimeout(16);
  }
  await touch("touchEnd", 280);
  await page.waitForTimeout(500);
  finger = { before, after: await st() };
}
await page.waitForTimeout(1200);
const frames = await page.evaluate(() => window.__frames);
// Print only frames where something changed.
let last = "";
for (const f of frames) {
  const { t, ...rest } = f;
  const key = JSON.stringify(rest);
  if (key !== last) console.log(t, key);
  last = key;
}
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
// DOWN=1: the keyboard goes again; the edge comes back to where it rested before it.
if (process.env.DOWN) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  console.log("edge after the keyboard went:", await page.evaluate((sel) => Math.round(document.querySelector(sel)?.closest(".will-change-transform")?.getBoundingClientRect().top * 10) / 10, fieldSel));
}
if (errors.length) console.log("page errors:", errors.slice(0, 3));
const end = frames[frames.length - 1];
// The first frame with the keyboard at its full height.
const atKb = frames.find((f) => f.ih === end.ih && f.vvh === end.vvh);
// The edge where it rested before the keyboard (the opening's slide taken out, so a keyboard that comes
// while the sheet still rises counts too), and every frame after: it must not move.
const lastBefore = frames.findLastIndex((f) => f.ih === 844 && f.vvh === 844);
const edgeStill = frames.slice(Math.max(0, lastBefore)).every((f) => f.rest === null || Math.abs(f.rest - end.edge) < 0.5);
const ok = finger ? finger.after - finger.before >= 100 : Boolean(atKb) && edgeStill && end.fieldRest === atKb.fieldRest;
if (finger) console.log(`${ok ? "ok  " : "FAIL"} a finger drawn up the body after the keyboard came: scrolled ${finger.before} -> ${finger.after}`);
console.log(`${ok ? "ok  " : "FAIL"} ${WHICH}${process.env.COVER ? " with a cover" : ""}: field ${frames.find((f) => f.focus)?.fieldTop} at the tap, ${atKb?.fieldTop} as the keyboard comes, ${end.fieldTop} at rest (body scrolled ${end.st}); edge ${frames[lastBefore]?.rest} before the keyboard, ${end.edge} at rest${edgeStill ? "" : ", moved"}`);
await browser.close();
process.exit(ok ? 0 : 1);
