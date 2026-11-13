// The export, as a phone or a tablet opens it (scripts/lib/shell-server.mjs), for stills and checks.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { NATIVE_UA, go, serveLikeTheShell } from "../../../../scripts/lib/shell-server.mjs";
import { asAndroidShell } from "../../../../scripts/lib/sells-plus.mjs";

export { go };
export const OUT = path.resolve(process.env.EXPORT ?? "out");
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const ago = (days, h = 9) => { const d = new Date(Date.now() - days * 864e5); d.setHours(h, 12, 0, 0); return d.toISOString(); };
export const PAGES = [
  { id: "a1111111-1111-4111-8111-111111111111", kind: "reflection", body: "# A day in November\n\nWhat I read this morning, and what stayed with me through the day.\n\n[[verse john 3:16]]", createdAt: ago(0, 7), updatedAt: ago(0, 7) },
  { id: "a2222222-2222-4222-8222-222222222222", kind: "prayer", body: "Lord, have mercy on me and on those I love.", createdAt: ago(0, 8), updatedAt: ago(0, 8) },
  { id: "a3333333-3333-4333-8333-333333333333", kind: "question", body: "What do I notice when I read it aloud?", createdAt: ago(1), updatedAt: ago(1) },
  { id: "a4444444-4444-4444-8444-444444444444", kind: "reflection", body: "# An older page\n\nWords kept last week.", createdAt: ago(6), updatedAt: ago(6) },
  { id: "a5555555-5555-4555-8555-555555555555", kind: "prayer", body: "Another page, kept before.", createdAt: ago(8), updatedAt: ago(8) },
  { id: "a7777777-7777-4777-8777-777777777777", kind: "reflection", body: "A page with no title, a little longer, so that it runs on to a second line and a third on a phone.", createdAt: ago(12), updatedAt: ago(12) },
];
export const EVERY_BLOCK = ["# A day in November", "What I read this morning, and what stayed with me.", "[[verse john 3:16]]", "> Begin again tomorrow.\n> ~ My grandmother", "==yellow== Lord Jesus Christ, Son of God, have mercy on me.", "And the last words of the page."].join("\n\n");

export const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
/** A reader's device on the export. `sells`: a new reader with no Plus, as he walks a test build. */
export async function open({ width = 390, height = 844, scale = 1, set = {}, locale = "en", sells = true } = {}) {
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no export in ${OUT}`);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(locale !== "en" ? { "CapacitorStorage.purify_locale": locale } : {}), ...set });
  if (sells) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { if (!/plugin is not implemented on android/.test(e.message)) errors.push(e.message.slice(0, 160)); });
  return { ctx, page, errors };
}
export const tap = async (page, loc) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error("not on the screen");
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
};
