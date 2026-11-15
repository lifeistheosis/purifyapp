// Build 98 note 13 (his word of 2026-11-15, about 22:02 UTC: "it should automatically follow the lyrics
// one started"): a chant's words meet the singing once it starts. The walk does what he did: the Prayer
// Rope Anthem's page as the Android shell shows it, Words, the box scrolled by a finger to the middle of
// the song, then Play on the page's player. Asked of every quarter second for eight seconds: is the line
// being sung (or, before any is sung, the first) inside the box's view? Within 1.2 s of Play it must be,
// and from then on it must stay so. Then a seek (a tap on a late line) and the same question. Run with
// motion on and with Purify's motion off. The recording and its timing are the website's, answered from
// public/ as the website answers them. Run from the repository's root; writes nothing.
//   node scripts/gate/chant-follow.mjs [WxH] [export folder, default out/]
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const ROOT = new URL("../..", import.meta.url).pathname;
const [W, H] = (process.argv[2] ?? "390x844").split("x").map(Number);
const OUT = path.resolve(process.argv[3] ?? path.join(ROOT, "out"));
const SLUG = "prayer-rope-anthem";

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN, args: ["--autoplay-policy=no-user-gesture-required"] } : {});
console.log(`The Anthem's words from Play, at ${W} by ${H}, on ${path.relative(ROOT, OUT) || OUT}`);

/** The box, the line being sung (or the first, before any), and whether that line is inside the box's view. */
function where() {
  const box = document.querySelector('[data-sung-look="page"]');
  if (!box) return { box: false };
  const rows = [...box.querySelectorAll("li[data-sung]")];
  const lit = rows.findIndex((r) => r.getAttribute("data-sung") === "lit");
  // The player's own state, as the page's player shows it: Pause while it plays, and where it is.
  const dock = document.querySelector('[data-chant-control="dock"]');
  const playing = Boolean(dock?.querySelector('button[aria-label^="Pause"]'));
  const bar = dock?.querySelector("[aria-valuenow]");
  const target = lit >= 0 ? lit : 0;
  const row = rows[target];
  const b = box.getBoundingClientRect();
  const r = row?.getBoundingClientRect();
  const inView = Boolean(r && r.top >= b.top - 1 && r.bottom <= b.bottom + 1);
  return { box: true, rows: rows.length, lit, target, top: Math.round(box.scrollTop), inView, t: bar ? Number(bar.getAttribute("aria-valuenow")) : null, playing };
}

let faults = 0;
for (const motion of ["on", "reduce"]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(motion) });
  await pinMotion(ctx, motion);
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  await serveLikeTheShell(ctx, OUT, {});
  // The website's recordings and timings, as the website answers the apps (next.config.ts, streamed media).
  await ctx.route(/^https:\/\/purifyapp\.net\/(audio\/chants|chant-timing)\//, async (route) => {
    const url = new URL(route.request().url());
    const rel = decodeURIComponent(url.pathname);
    // The list of recordings the website streams: data/chants-live.json, as the website's route gives it.
    const file = rel === "/audio/chants/live.json" ? path.join(ROOT, "data/chants-live.json") : rel.startsWith("/chant-timing/") ? path.join(ROOT, "public/audio/chants", rel.slice("/chant-timing/".length)) : path.join(ROOT, "public", rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "not found", headers: { "Access-Control-Allow-Origin": "*" } });
    const body = fs.readFileSync(file);
    const range = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()["range"] ?? "");
    const type = file.endsWith(".mp3") ? "audio/mpeg" : "application/json";
    const headers = { "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin", "Accept-Ranges": "bytes", "Content-Type": type };
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
      const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      return route.fulfill({ status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
    }
    return route.fulfill({ status: 200, headers, body });
  });
  const page = await ctx.newPage();
  await go(page, `/chants/${SLUG}/`, { timeout: 60000 });
  await page.waitForSelector('[data-sung-look="page"] li[data-sung]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  // A finger scrolls the words to the middle of the song.
  const box = await page.locator('[data-sung-look="page"]').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const x = box.x + box.width / 2;
  for (let n = 0; n < 3; n++) {
    let y = box.y + box.height * 0.8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let s = 0; s < 12; s++) {
      y -= (box.height * 0.6) / 12;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  const before = await page.evaluate(where);

  // Play, on the page's player, as a finger taps it.
  const play = page.locator('[data-chant-control="dock"] button[aria-label^="Play"]').first();
  const pb = await play.boundingBox();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pb.x + pb.width / 2, y: pb.y + pb.height / 2 }] });
  await page.waitForTimeout(60);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const t0 = Date.now();
  const samples = [];
  while (Date.now() - t0 < 8000) {
    await page.waitForTimeout(250);
    samples.push({ ms: Date.now() - t0, ...(await page.evaluate(where)) });
  }
  const late = samples.filter((s) => s.ms > 1200);
  const missed = late.filter((s) => !s.inView);
  const started = samples.some((s) => s.playing);
  let fault = before.top < 40 || !started || missed.length > 0;
  console.log(
    `${fault ? "FAULT" : "ok   "} motion ${motion}, from Play: scrolled to ${before.top} first; ${started ? "playing" : "NEVER PLAYED"}; ` +
      `${missed.length ? `the line being sung OUT of view in ${missed.length} of ${late.length} looks after 1.2 s (first at ${missed[0].ms} ms: line ${missed[0].target + 1}, t ${missed[0].t} s, box at ${missed[0].top})` : `the line being sung in view in all ${late.length} looks after 1.2 s`}`,
  );
  if (fault) faults += 1;

  // A seek: the reader's finger scrolls the words back to the top, then taps the page's player's line
  // near its end, as a reader moves on in the song. The words go at once to the line being sung.
  if (started) {
    const n = await page.locator('[data-sung-look="page"] li[data-sung]').count();
    for (let k = 0; k < 4; k++) {
      let y = box.y + box.height * 0.2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let s2 = 0; s2 < 12; s2++) {
        y += (box.height * 0.6) / 12;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(100);
    }
    const bar = await page.locator('[data-chant-control="dock"] [aria-valuenow]').first().boundingBox().catch(() => null);
    if (!bar) {
      console.log("FAULT the page's player has no position bar to tap");
      faults += 1;
    } else {
      const sx = bar.x + bar.width * 0.8;
      const sy = bar.y + bar.height / 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sx, y: sy }] });
      await page.waitForTimeout(60);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const t1 = Date.now();
      const after = [];
      while (Date.now() - t1 < 3000) {
        await page.waitForTimeout(250);
        after.push({ ms: Date.now() - t1, ...(await page.evaluate(where)) });
      }
      const moved = after.some((sm) => sm.t !== null && sm.t > 60);
      const out = after.filter((sm) => sm.ms > 1200 && !sm.inView);
      const f2 = !moved || out.length > 0;
      console.log(`${f2 ? "FAULT" : "ok   "} motion ${motion}, after a seek near the end (${n} lines, at ${after.at(-1)?.t} s): ${!moved ? "the seek did not take; " : ""}${out.length ? `the line being sung OUT of view (line ${out[0].target + 1}, box at ${out[0].top})` : "the line being sung in view"}`);
      if (f2) faults += 1;
    }
  }
  await ctx.close();
}
await browser.close();
console.log(faults ? `${faults} FAULT(S)` : "no faults");
process.exit(faults ? 1 : 0);
