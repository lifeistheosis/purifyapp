// Probe: a work reader's "Next" (the pill's), recorded and judged by the gate's own recorder and judge, as a new reader at 390.
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { asAndroidShell } from "/home/user/purifyapp/scripts/lib/sells-plus.mjs";
import { installGate } from "/home/user/purifyapp/scripts/gate/inpage.mjs";
import { recordFrames, judgeFrames, stripOf, stripTimes } from "/home/user/purifyapp/scripts/gate/frames.mjs";
const [OUT, AT, SHOT] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (let run = 1; run <= 2; run++) {
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
  const spot = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => /^Next\b/.test((x.getAttribute("aria-label") || x.textContent || "").trim()) && x.getBoundingClientRect().width > 0).pop();
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { name: (b.getAttribute("aria-label") || b.textContent).trim().replace(/\s+/g, " ").slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2, hash: location.hash, sy: scrollY };
  });
  if (!spot) { console.log(`run ${run}: no Next on ${AT}`); await ctx.close(); continue; }
  const rec = await recordFrames(page, cdp, async () => { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: spot.x, y: spot.y }] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }, { width: 390, height: 844, minMs: 900, stillMs: 450, maxMs: 2600 });
  const v = await judgeFrames(rec, { motion: "on" });
  const after = await page.evaluate(() => ({ hash: location.hash, sy: Math.round(scrollY) }));
  console.log(`run ${run}: tap "${spot.name}" (from ${spot.hash || "no hash"}, scrolled ${Math.round(spot.sy)}) -> ${after.hash}, scrolled ${after.sy}; ${v.fails.length ? v.fails.map((f) => `${f.kind}: ${f.detail}`).join("; ") : "passes"}${v.glides?.length ? ` [glide: ${v.glides.join("; ")}]` : ""}${v.dips.length ? ` [dip: ${v.dips.join("; ")}]` : ""}${v.unsure.length ? ` [unsure: ${v.unsure.join("; ")}]` : ""}; ${v.frames} frames, change ${v.change}, vt ${[...new Set(v.vtNames)].slice(0, 3).join(",")}`);
  if (SHOT && v.fails.length) console.log(`  still: ${await stripOf(rec, v.fails[0].frames, `${SHOT}-run${run}.png`)} (${stripTimes(rec, v.fails[0].frames).join(", ")})`);
  await ctx.close();
}
await browser.close();
