// The gate walks one export two ways (the arbiter, 2026-11-11): the export cut
// the house's way sells Plus on Android, and sells it only where the page is
// the Android shell. From 2026-11-13 the gate cuts it with the store
// workflow's own switches (node scripts/gate/export.mjs, scripts/lib/
// store-switches.mjs), which carry these two Plus values as stand-ins for the
// store's secrets and every value the workflow writes itself (the shop, Community);
// the recipe before (only NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1
// NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk) left the shop inside the app ungated. So with SELLS_PLUS=1 a walk makes the page say so
// and is a new reader with no Plus, as he walks; without it the same export
// locks nothing, a reader with all of Plus's parts.

import fs from "node:fs";
import path from "node:path";

/** SELLS_PLUS=1 in the environment. */
export const SELLS_PLUS = process.env.SELLS_PLUS === "1";

/** Whether an export sells Plus on Android: the store's key, written in when it was cut. */
export function sellsOnAndroid(out) {
  const chunks = path.join(out, "_next", "static", "chunks");
  if (!fs.existsSync(chunks)) return false;
  return fs.readdirSync(chunks).some((f) => f.endsWith(".js") && /case"android":return"[^"]+"/.test(fs.readFileSync(path.join(chunks, f), "utf8")));
}

/** Throw unless the export can be walked as SELLS_PLUS asks. */
export function checkSells(out, sells = SELLS_PLUS) {
  if (sells && !sellsOnAndroid(out)) {
    throw new Error("SELLS_PLUS=1 needs an export that sells Plus on Android: NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android");
  }
}

/** The Android shell, as far as the app's own check goes (scripts/plus-order-walk.mjs): Plus is sold there. */
export async function asAndroidShell(ctx) {
  await ctx.addInitScript(() => {
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { ...(window.Capacitor ?? {}), getPlatform: () => "android", isNativePlatform: () => true };
  });
}

/** Which reader a walk is, in its own words. */
export const readerWords = (sells = SELLS_PLUS) => (sells ? "as a new reader with no Plus (the page is the Android shell)" : "as a reader for whom nothing is locked");
