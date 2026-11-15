// Updates 94, item 3 (2026-11-15): a post's replies' Try again with no network, frame by frame.
//   node replies94.mjs <out dir> <on|reduce> [--new]
// The export served the shell's way, reading the main web until the feed has drawn its posts; then
// every address outside the bundle is aborted (a phone that lost its signal), a post's replies are
// opened (their read fails: the card "We could not open this thread." with Try again), and Try again
// is tapped twice with a requestAnimationFrame sampler running (the walk's way). Each frame: the
// replies' part's height and how many elements it holds, whether a waiting state is drawn in it
// (aria-busy, a skeleton bone), and whether the card's words stand. Prints the frames that changed.
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const [out, mode = "on", ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await pinMotion(ctx, mode);
if (rest.includes("--new")) await asAndroidShell(ctx);
await serveLikeTheShell(ctx, out, {});
let offline = false;
// Online as the walk reads it (scripts/motion-walk.mjs --online, NODE_USE_ENV_PROXY=1), until the posts are drawn.
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, (r) => (offline ? r.abort() : mainWeb(r)));
await ctx.route((u) => !u.href.startsWith(ORIGIN), (r) => (offline ? r.abort() : r.fallback()));
const page = await ctx.newPage();
await go(page, "/community/", { timeout: 90000 });
const toggle = page.locator('button[aria-controls$="-replies"]').first();
await toggle.waitFor({ state: "visible", timeout: 90000 });
await page.waitForTimeout(2000);
offline = true;
await toggle.evaluate((b) => b.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(400);
await toggle.tap();
const again = page.getByRole("button", { name: "Try again", exact: true }).first();
await again.waitFor({ state: "visible", timeout: 30000 });
await page.waitForTimeout(1500);
const partId = await toggle.getAttribute("aria-controls");
for (const tap of [1, 2]) {
  await page.evaluate((id) => {
    const frames = [];
    window.__r94 = frames;
    const loop = () => {
      const part = document.getElementById(id);
      const r = part?.getBoundingClientRect();
      frames.push({
        t: Math.round(document.timeline.currentTime * 10) / 10,
        part: r ? `${Math.round(r.y)}+${Math.round(r.height)}` : "none",
        n: part ? part.querySelectorAll("*").length : 0,
        waiting: part && part.querySelector("[aria-busy], .sk") ? "WAITING" : "-",
        card: part && [...part.querySelectorAll("p")].some((p) => p.textContent.trim() === "We could not open this thread.") ? "card" : "-",
      });
      if (frames.length < 120) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, partId);
  await page.waitForTimeout(150);
  await again.tap();
  await page.waitForTimeout(1500);
  const frames = await page.evaluate(() => window.__r94);
  const key = (f) => JSON.stringify({ ...f, t: 0 });
  const changed = frames.filter((f, i) => i === 0 || key(f) !== key(frames[i - 1]));
  console.log(`${mode}${rest.includes("--new") ? " new" : " open"} tap ${tap}: ${frames.length} frames, ${changed.length - 1} changed; waiting drawn in ${frames.filter((f) => f.waiting !== "-").length}`);
  for (const f of changed) console.log(`  tl ${f.t}  part ${f.part}  n ${f.n}  ${f.waiting}  ${f.card}`);
}
await ctx.close();
await browser.close();
