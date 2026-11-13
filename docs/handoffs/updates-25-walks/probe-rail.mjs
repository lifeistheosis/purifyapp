// Probe: checkMock's stripe measure on a Community post with its thread open, mid-move and at rest; and on a post with replies, closed.
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb, standInFor } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { asAndroidShell } from "/home/user/purifyapp/scripts/lib/sells-plus.mjs";
const { stripesOn } = await import(process.env.MOCK ?? "/home/user/purifyapp/scripts/mock-check.mjs");
const [OUT, LOCALE = "en", WIDTH = "390"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: Number(WIDTH), height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript((loc) => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); if (loc !== "en") localStorage.setItem("CapacitorStorage.purify_locale", loc); } catch {} }, LOCALE);
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, OUT, {});
for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(site, mainWeb);
await ctx.route("https://purifyapp.net/api/community/posts**", async (route) => {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  try {
    const r = await fetch(req.url());
    const headers = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
    const answer = { status: r.status, headers, body: Buffer.from(await r.arrayBuffer()) };
    return route.fulfill(standInFor(req.url(), answer) ?? answer);
  } catch { return route.abort(); }
});
const page = await ctx.newPage();
await go(page, "/community/", { timeout: 30000 });
await page.waitForTimeout(3500);
const say = (label, s) => console.log(`${label}: ${s === null ? "nothing answers the selector" : s.length ? s.map((x) => `${x.name ?? x.what ?? "?"} ${x.how ?? x.detail ?? ""}${x.allow ? ` (allowed: ${x.allow})` : ""}`).join("; ") : "no stripe"}`);
// A post with replies, closed: its rail stands at rest.
const withReplies = await page.evaluate(() => {
  const b = [...document.querySelectorAll("article button[aria-expanded]")].find((x) => /^[1-9]\d* repl/.test(x.textContent.trim()) && x.getAttribute("aria-expanded") === "false");
  if (!b) return null;
  const a = b.closest("article");
  a.scrollIntoView({ block: "center" });
  return { id: a.id, label: b.textContent.trim(), rail: Boolean(a.querySelector(".community-rail")) };
});
console.log(`a post with replies, closed: ${JSON.stringify(withReplies)}`);
if (withReplies) say(`  stripe measure on #${withReplies.id}`, await stripesOn(page, `#${withReplies.id}`));
// A post with no replies: open its thread.
const target = await page.evaluate(() => {
  const b = [...document.querySelectorAll("article button[aria-expanded]")].find((x) => /^0 repl/.test(x.textContent.trim()));
  if (!b) return null;
  const a = b.closest("article");
  b.scrollIntoView({ block: "center" });
  b.setAttribute("data-probe-open", "");
  return { id: a.id, rail: Boolean(a.querySelector(".community-rail")) };
});
console.log(`a post with no replies: ${JSON.stringify(target)}`);
if (target) {
  say(`  closed, stripe measure`, await stripesOn(page, `#${target.id}`));
  await page.waitForTimeout(600);
  await page.locator("[data-probe-open]").tap();
  for (const ms of [40, 120, 220]) {
    await page.waitForTimeout(ms === 40 ? 40 : 80);
    const vt = await page.evaluate(() => document.documentElement.hasAttribute("data-in-page"));
    say(`  ${ms}ms after the tap (in-page move ${vt ? "running" : "ended"}), stripe measure`, await stripesOn(page, `#${target.id}`));
  }
  await page.waitForTimeout(1500);
  say(`  at rest, open, stripe measure`, await stripesOn(page, `#${target.id}`));
  const rail = await page.evaluate((id) => { const r = document.querySelector(`#${id} .community-rail`); if (!r) return null; const b = r.getBoundingClientRect(); const a = document.getElementById(id).getBoundingClientRect(); return { x: Math.round(b.left), w: b.width, h: Math.round(b.height), fromCardStart: Math.round(b.left - a.left), cardW: Math.round(a.width) }; }, target.id);
  console.log(`  the rail at rest: ${JSON.stringify(rail)}`);
}
await browser.close();
