// One tap recorded frame by frame and judged by the gate's judge (scripts/gate/frames.mjs), on a fresh phone each time.
//   node rec.mjs <out> <route> <selector> <on|reduce> <times> [nth] [--online]
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { judgeFrames, recordFrames } = await import(`${R}/gate/frames.mjs`);
const { installGate } = await import(`${R}/gate/inpage.mjs`);
const { aimOf, firstTouch, fresh, tapAt } = await import(`${R}/lib/tap.mjs`);
const { assertMotion, motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);

const args = process.argv.slice(2);
const ONLINE = args.includes("--online");
const [out, route, selector, mode, timesArg, nthArg] = args.filter((a) => a !== "--online");
const TIMES = Number(timesArg ?? 1);
const NTH = Number(nthArg ?? 0);
const W = 390, H = 844;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
await pinMotion(ctx, mode);
await installGate(ctx);
await serveLikeTheShell(ctx, out, {});
if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const first = await ctx.newPage();
await go(first, "/", { timeout: 60000 });
await first.waitForTimeout(1500);
const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
await first.close();
let passed = 0;
for (let n = 0; n < TIMES; n++) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  try {
    await fresh(page, route, kept);
    const wrong = await assertMotion(page, mode);
    await firstTouch(page, cdp);
    const handle = (await page.$$(selector))[NTH];
    if (!handle) throw new Error(`no ${selector} [${NTH}]`);
    await handle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await handle.boundingBox();
    const aim = await aimOf(handle, box);
    const name = (await handle.evaluate((el) => (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40))) || selector;
    const rec = await recordFrames(page, cdp, () => tapAt(cdp, aim.x, aim.y), { moves: mode === "reduce", width: W, height: H, minMs: 900, stillMs: 450, maxMs: 2600 });
    const v = await judgeFrames(rec, { motion: mode });
    const ok = !v.fails.length;
    if (ok) passed++;
    console.log(`${n + 1}/${TIMES} ${mode} "${name}": ${ok ? "PASS" : "FAIL"}${wrong ? ` (motion: ${wrong})` : ""} frames ${v.frames} change ${JSON.stringify(v.change)?.slice(0, 80)}${v.unsure?.length ? ` unsure ${JSON.stringify(v.unsure).slice(0, 160)}` : ""}${v.fails.map((f) => `\n   ${f.kind}: ${String(f.detail).slice(0, 220)}`).join("")}${(v.vtNames ?? []).length ? ` vt ${[...new Set(v.vtNames)].slice(0, 4).join(",")}` : ""}`);
  } catch (e) {
    console.log(`${n + 1}/${TIMES} ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await page.close();
  }
}
console.log(`${passed} of ${TIMES} passed`);
await browser.close();
