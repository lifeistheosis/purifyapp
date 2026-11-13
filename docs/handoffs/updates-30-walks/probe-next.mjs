// Probe: a work reader's "Next" (the pill's), recorded and judged by the gate's own recorder and judge, as a new reader at 390.
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { asAndroidShell } from "/home/user/purifyapp/scripts/lib/sells-plus.mjs";
import { installGate } from "/home/user/purifyapp/scripts/gate/inpage.mjs";
import { recordFrames, judgeFrames, stripOf, stripTimes } from "/home/user/purifyapp/scripts/gate/frames.mjs";
const [OUT, AT, SHOT, FRAC] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (let run = 1; run <= (process.env.RUNS ? Number(process.env.RUNS) : 2); run++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await asAndroidShell(ctx);
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(site, mainWeb);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await go(page, "/", { timeout: 60000 });
  await page.waitForTimeout(1200);
  await go(page, AT, { timeout: 60000 });
  await page.waitForTimeout(3000);
  if (FRAC) {
    // From a share of the chapter down, as a reader at its foot: scrolled by a finger's wheel in steps, then still.
    const to = await page.evaluate((f) => Math.round(f * (document.documentElement.scrollHeight - innerHeight)), Number(FRAC));
    for (let y = 0; y < to; y += 600) { await page.mouse.wheel(0, Math.min(600, to - y)); await page.waitForTimeout(60); }
    await page.waitForTimeout(800);
    // A reader brings the pill back with a short pull up, as on a phone.
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(1500);
  }
  const spot = await page.evaluate(() => {
    const all = [...document.querySelectorAll("button, a")].filter((x) => /^Next\b/.test((x.getAttribute("aria-label") || x.textContent || "").trim()) && x.getBoundingClientRect().width > 0);
    window.__nexts = all.map((x) => { const r = x.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const cs = getComputedStyle(x); return `${x.tagName} "${(x.getAttribute("aria-label") || x.textContent).trim().slice(0, 30)}" @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} op ${cs.opacity} pe ${cs.pointerEvents} vis ${cs.visibility}; at centre: ${at ? at.tagName + "." + String(at.className).slice(0, 80) + " " + (at.getAttribute("aria-label") || "") : "none"}`; });
    // One a finger can reach: on the screen, and the thing at its centre.
    const b = all.filter((x) => { const r = x.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) return false; const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return at && (at === x || x.contains(at)); }).pop();
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { name: (b.getAttribute("aria-label") || b.textContent).trim().replace(/\s+/g, " ").slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2, hash: location.hash, sy: scrollY };
  });
  if (!spot) { console.log(`run ${run}: no Next a finger can reach on ${AT}: ${JSON.stringify(await page.evaluate(() => window.__nexts))}`); await ctx.close(); continue; }
  // The running line's words and place, frame by frame, from the tap until it has folded.
  await page.evaluate(() => {
    const out = (window.__line = []);
    const t0 = performance.now();
    const tick = () => {
      const l = document.querySelector("span[data-running-line] > span");
      if (l) { const r = l.getBoundingClientRect(); out.push(`${Math.round(performance.now() - t0)}ms "${l.textContent}" x${Math.round(r.left)} w${Math.round(r.width)} op${getComputedStyle(l.parentElement).opacity.slice(0, 4)}`); }
      if (performance.now() - t0 < 700) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const rec = await recordFrames(page, cdp, async () => { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: spot.x, y: spot.y }] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }, { width: 390, height: 844, minMs: 900, stillMs: 450, maxMs: 2600 });
  const v = await judgeFrames(rec, { motion: "on" });
  const after = await page.evaluate(() => ({ hash: location.hash, sy: Math.round(scrollY) }));
  if (process.env.LINE) { const ln = await page.evaluate(() => window.__line); const seen = [...new Set(ln.map((x) => x.replace(/^\d+ms /, "").replace(/ op.*/, "")))]; console.log(`  running line: ${ln.length} frames, ${seen.length} distinct words+place: ${seen.join(" | ")}`); if (process.env.LINE === "2") console.log(ln.join("\n")); }
  console.log(`run ${run}: tap "${spot.name}" (from ${spot.hash || "no hash"}, scrolled ${Math.round(spot.sy)}) -> ${after.hash}, scrolled ${after.sy}; ${v.fails.length ? v.fails.map((f) => `${f.kind}: ${f.detail}`).join("; ") : "passes"}${v.glides?.length ? ` [glide: ${v.glides.join("; ")}]` : ""}${v.dips.length ? ` [dip: ${v.dips.join("; ")}]` : ""}${v.unsure.length ? ` [unsure: ${v.unsure.join("; ")}]` : ""}; ${v.frames} frames, change ${v.change}, vt ${[...new Set(v.vtNames)].slice(0, 3).join(",")}`);
  if (SHOT && v.fails.length) console.log(`  still: ${await stripOf(rec, v.fails[0].frames, `${SHOT}-run${run}.png`)} (${stripTimes(rec, v.fails[0].frames).join(", ")})`);
  await ctx.close();
}
await browser.close();
