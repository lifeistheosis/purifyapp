// Fault A's tap: the journal's Share where there is no share sheet (a computer). On the export, a
// saved page open in the composer, the share route's two answers stood in (GET: ready, three left;
// POST: a link), navigator.share taken away, the clipboard allowed. Tap Share as a reader taps it,
// then read the button's name and the clipboard.
//   node share-walk.mjs --out <export> [--width 1032]
import fs from "node:fs";

const REPO = "/home/user/purifyapp";
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${REPO}/scripts/lib/shell-server.mjs`);
const { pinMotion, motionOptions } = await import(`${REPO}/scripts/lib/motion.mjs`);
const { mainWeb } = await import(`${REPO}/scripts/lib/main-web.mjs`);
const { chromium } = await import(`${REPO}/node_modules/playwright/index.mjs`);

const argv = process.argv.slice(2);
const flag = (n) => {
  const at = argv.indexOf(n);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const OUT = flag("--out");
const W = Number(flag("--width") ?? 1032);
const LINK = "https://purifyapp.net/p/walk-stand-in";
const now = new Date().toISOString();
const page0 = { id: "walk-page-1", kind: "reflection", body: "<p>Lord, have mercy.</p>", createdAt: now, updatedAt: now };

const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: W < 600, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://localhost" });
await pinMotion(ctx, "on");
await ctx.addInitScript((p) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("purify:journal", JSON.stringify([p]));
  } catch {}
  // A computer's browser with no share sheet.
  try {
    delete Navigator.prototype.share;
    delete Navigator.prototype.canShare;
  } catch {}
}, page0);
await serveLikeTheShell(ctx, OUT, {});
for (const site of ["https://purifyapp.net/**", "https://*.supabase.co/**"]) await ctx.route(site, mainWeb);
const asked = [];
await ctx.route("https://purifyapp.net/api/journal/share**", async (route) => {
  const req = route.request();
  asked.push(req.method());
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "https://localhost", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,DELETE" } });
  const cors = { "access-control-allow-origin": "https://localhost", "content-type": "application/json" };
  if (req.method() === "GET") return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ ready: true, left: 3, shared: 0 }) });
  if (req.method() === "POST") return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ url: LINK, left: 2 }) });
  return route.abort();
});
const page = await ctx.newPage();
await go(page, "/journal/", { timeout: 30000 });
await page.waitForTimeout(2000);
// Open the saved page in the composer, as a reader does: tap its entry.
const entry = page.getByText("Lord, have mercy.").first();
await entry.click({ timeout: 10000 });
const share = page.locator("[data-journal-share]");
await share.waitFor({ timeout: 10000 });
const before = await share.getAttribute("aria-label");
await share.click();
await page.waitForTimeout(500);
const after = await share.getAttribute("aria-label");
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `unread: ${e}`);
await page.waitForTimeout(2000);
const later = await share.getAttribute("aria-label");
console.log(JSON.stringify({ width: W, asked, before, after, clipboard: clip, twoSecondsLater: later }));
const ok = after === "Link copied" && clip === LINK && later === before;
console.log(ok ? "PASS: the link was copied and the button said so, then went back" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
