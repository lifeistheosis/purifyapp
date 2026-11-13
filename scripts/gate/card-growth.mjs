// The re-check's card probe (the arbiter, 2026-11-13 05:19 UTC): on a saint's web, the card's short face
// grows it into the tall card, and the walk allows that by name and reason while the card ends fully in
// view ("the short face grows into the tall card: an opening, not a jump", scripts/tap-walk.mjs). What
// the walk cannot do is the keyboard: Tab to the short face, press Enter, and the focus must land inside
// the tall card (WebCard.tsx hands it over when a key, not a finger, grew the card). Each web is grown
// twice, by a tap and by the keyboard, and asked: does the card end tall and fully in view, between the
// top bar's foot and the tab bar's top, and, by the keyboard, is the focus inside the tall card? As the
// new reader (the Android shell, SELLS_PLUS=1) or the open reader, with no network: the card's height
// is its words'. Run from the repository's root on the export in out/; writes nothing.
//   node scripts/gate/card-growth.mjs [WxH] [slug,slug,...]
import fs from "node:fs";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, readerWords } from "../lib/sells-plus.mjs";

// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const [W, H] = (process.argv[2] ?? "390x844").split("x").map(Number);
// The re-check's six webs at 390, and the two the ruling named (St George's, St Gregory the Theologian's).
const SLUGS = (process.argv[3] ?? "athanasius-the-great,martyrs-of-nicomedia,apostle-john,irenaeus-of-lyons,ambrose-of-milan,anthony-the-great,saint-george,gregory-theologian").split(",").filter(Boolean);
const SHORT = "[data-saint-web-card] > button[aria-controls][aria-expanded='false']";

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
console.log(`${SLUGS.length} webs at ${W} by ${H}, ${readerWords(SELLS_PLUS)}, with no network`);

/** The card, the bars round it, and where the focus stands. */
function geometry() {
  const card = document.querySelector("[data-saint-web-card]");
  const drawn = (x) => {
    const r = x.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && x.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const ceiling = Math.max(0, ...[...document.querySelectorAll('[data-screen-edge="top"]')].filter(drawn).map((x) => x.getBoundingClientRect().bottom));
  const floor = Math.min(innerHeight, ...[...document.querySelectorAll('[data-screen-edge="bottom"]')].filter((x) => drawn(x) && !card?.contains(x)).map((x) => x.getBoundingClientRect().top));
  const r = card?.getBoundingClientRect();
  const a = document.activeElement;
  const words = a ? (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 32) : "";
  return {
    state: card?.getAttribute("data-state") ?? "none",
    top: r ? Math.round(r.top) : null,
    bottom: r ? Math.round(r.bottom) : null,
    ceiling: Math.round(ceiling),
    floor: Math.round(floor),
    inView: r ? r.top >= ceiling - 1 && r.bottom <= floor + 1 : false,
    focus: a ? `${a.tagName.toLowerCase()}${words ? ` "${words}"` : ""}` : "none",
    inTall: Boolean(a && a.closest(".saint-web-card-tall") && !a.closest("[inert]")),
  };
}

let faults = 0;
for (const slug of SLUGS) {
  for (const how of ["tap", "keyboard"]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
      } catch {}
    });
    if (SELLS_PLUS) await asAndroidShell(ctx);
    await serveLikeTheShell(ctx, OUT, {});
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await go(page, `/saints/${slug}/web/`, { timeout: 30000 });
    await page.waitForTimeout(2500);
    let reached = false;
    if (how === "tap") {
      // A finger on the short face, as a reader taps it; no touch on the web first, which tucks the card.
      const box = await page.locator(SHORT).first().boundingBox().catch(() => null);
      if (box) {
        reached = true;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        await page.waitForTimeout(60);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
    } else {
      for (let n = 0; n < 160 && !reached; n++) {
        await page.keyboard.press("Tab");
        reached = await page.evaluate((s) => document.activeElement?.matches(s) ?? false, SHORT);
      }
      if (reached) await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(1600);
    const g = await page.evaluate(geometry);
    const fault = !reached || g.state !== "tall" || !g.inView || (how === "keyboard" && !g.inTall);
    if (fault) faults += 1;
    console.log(
      `${fault ? "FAULT" : "ok   "} ${slug} ${how}: ${reached ? "" : "the short face was not reached; "}card ${g.state}, ${g.top} to ${g.bottom} (top bar's foot ${g.ceiling}, tab bar's top ${g.floor}), ${g.inView ? "fully in view" : "NOT fully in view"}${how === "keyboard" ? `; focus on ${g.focus}, ${g.inTall ? "inside the tall card" : "NOT inside the tall card"}` : ""}`,
    );
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${faults} fault(s)`);
process.exit(faults ? 1 : 0);
