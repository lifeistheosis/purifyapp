// Probe: Alaska's "People" tap with the gate's sampler; prints what the misplaced check read in a sticky box (scratch).
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { installGate } from "/home/user/purifyapp/scripts/gate/inpage.mjs";
const OUT = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (let run = 1; run <= 3; run++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, "on");
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  await go(page, "/", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await go(page, "/history/alaska-mission/", { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__gate.sample({}));
  await page.getByRole("link", { name: "People", exact: true }).first().tap();
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => window.__gate.stop());
  const sy = r.frames.map((f) => f.sy);
  console.log(`run ${run}: page scrolled ${Math.min(...sy)} to ${Math.max(...sy)}; misplaced ${r.misplaced.length}${r.misplaced.map((m) => ` [${m.name} ${m.from}->${m.to}${m.held ? ` held by ${m.held.name} moved ${m.held.moved}` : ""}]`).join("")}`);
  for (const h of r.held) console.log(`  read in its sticky box: ${h.name} in ${h.in}: the box moved ${h.boxMoved}px on the screen, the label ${h.inBox}px in it`);
  await ctx.close();
}
await browser.close();
