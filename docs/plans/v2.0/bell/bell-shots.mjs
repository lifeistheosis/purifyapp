#!/usr/bin/env node
// The universal bell (2.0), pictured from the native export for his yes. His word,
// 2026-11-28: "make the notification button on the app a universal notification system
// (updates/announcements from purify, updates about their orders, updates to pray,
// updates from community etc)".
//
// A signed-in reader with sample rows: two orders, someone who prayed, a prayer
// campaign's news, a name day, two notes from other readers, one from Purify's
// moderators, and Purify's announcement new since last time. Every request for them is
// answered here (the inbox route, the orders under RLS, the session), so nothing reaches
// the main web's database. Sample names only. Every still is held to checkMock.
//
//   node docs/plans/v2.0/bell/bell-shots.mjs [export]    writes docs/plans/v2.0/bell/img/*.jpg

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
fs.mkdirSync(IMG, { recursive: true });

const REF = "avbqyvjgcrucjwevwixt";
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "reader@example.com", aud: "authenticated", role: "authenticated" };
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const ORDERS = [
  { id: "ord-1", payment_status: "paid", fulfillment_status: "shipped", created_at: ago(60 * 24 * 4), paid_at: ago(60 * 24 * 4), updated_at: ago(120), items: [{ title: "The Theotokos of Kazan" }, { title: "Prayer rope, 50 knots" }] },
  { id: "ord-2", payment_status: "paid", fulfillment_status: "delivered", created_at: ago(60 * 24 * 14), paid_at: ago(60 * 24 * 14), updated_at: ago(60 * 24 * 6), items: [{ title: "Beeswax candles, a dozen" }] },
];
const row = (o) => ({ post_id: null, reply_id: null, actor_handle: null, excerpt: null, read_at: null, target_kind: null, reason: null, campaign_id: null, ...o });
const INBOX = {
  unread: 4,
  notifications: [
    row({ id: "n1", kind: "prayed", actor_name: "Maria", actor_handle: "maria", created_at: ago(35) }),
    row({ id: "n2", kind: "reply", target_kind: "campaign", campaign_id: "camp-1", post_id: "p-camp", actor_name: "Nativity campaign", excerpt: "Day 13: we pray for those who travel.", created_at: ago(90) }),
    row({ id: "n3", kind: "reply", post_id: "p-1", actor_name: "Thomas", actor_handle: "thomas", excerpt: "Thank you, this helped me.", created_at: ago(200) }),
    row({ id: "n4", kind: "follow", actor_name: "Paul", actor_handle: "paul", created_at: ago(60 * 26), read_at: ago(60 * 20) }),
    row({ id: "n5", kind: "approved", post_id: "p-2", actor_name: "Purify", excerpt: "Your question about the Jesus Prayer", created_at: ago(60 * 30), read_at: ago(60 * 29) }),
  ],
};

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;

async function keep(page, name, label) {
  await page.waitForTimeout(900);
  ok = printMockCheck(await checkMock(page, "body"), label) && ok;
  const file = path.join(IMG, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
  console.log(`  still: ${path.relative(ROOT, file)}\n`);
}

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: NATIVE_UA, colorScheme: "dark", reducedMotion: "reduce", locale: "en-US" });
  await ctx.addInitScript(({ REF, USER }) => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("purify:onboarded", "99");
    // Purify's announcement is new since this reader last opened the bell.
    localStorage.setItem("purify:board-seen", "2026-11-01");
    // The orders were seen before the first one shipped.
    localStorage.setItem(`purify:orders-seen:${USER.id}`, JSON.stringify({ "ord-1": "Preparing Your Order", "ord-2": "Delivered" }));
    const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
    localStorage.setItem(`sb-${REF}-auth-token`, JSON.stringify({ access_token: "sample", refresh_token: "sample", token_type: "bearer", expires_in: 86400, expires_at: exp, user: USER }));
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  }, { REF, USER });
  await serveLikeTheShell(ctx, OUT, {});
  const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  // Everything else the signed-in pages ask of the database: an empty answer, never the main web's.
  await ctx.route(/supabase\.co\/(rest|auth|storage|functions)\//, (r) => r.fulfill(json([])));
  await ctx.route(/supabase\.co\/auth\/v1\/user/, (r) => r.fulfill(json(USER)));
  await ctx.route(/supabase\.co\/rest\/v1\/shop_orders/, (r) => r.fulfill(json(ORDERS)));
  await ctx.route(/purifyapp\.net\/api\//, (r) => r.fulfill(json({})));
  await ctx.route(/purifyapp\.net\/api\/community\/notifications/, (r) => r.fulfill(json(r.request().method() === "GET" ? INBOX : { ok: true })));
  const page = await ctx.newPage();
  await go(page, "/");
  await page.waitForTimeout(3500);
  const bell = page.getByRole("button", { name: /notifications/i }).first();
  await bell.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);
  await bell.click();
  const sheet = page.locator('[role="dialog"]').last();
  await sheet.locator('[data-bell="orders"]').waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1800);
  await keep(page, "bell-1", "The bell's sheet, its top");
  // Long content opens at 60% and pulls up to full by its header, as a reader's finger does (components/ui/Sheet.tsx).
  const head = await sheet.getByText("Notifications", { exact: true }).first().boundingBox();
  if (head) {
    const x = head.x + head.width / 2, y = head.y + head.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(x, y - i * 40, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  }
  await sheet.evaluate((el) => el.querySelector('[data-bell="purify"]')?.scrollIntoView({ block: "end" }));
  await keep(page, "bell-2", "The bell's sheet, further down");
  await ctx.close();
} finally {
  await browser.close();
}
if (!ok) {
  console.error("checkMock failed on a still above.");
  process.exit(1);
}
console.log("every still passed checkMock");
