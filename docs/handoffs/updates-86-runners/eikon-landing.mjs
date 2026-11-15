// EIKON's door, as a reader taps it (Updates 86, Gate 3c group 7): does its
// picture land in the room it opens? The motion walk's carry record says only
// that a View Transition wore the name (the door's side is enough for it); on
// the first export of this mend (beb478c8) the room was read only after it
// opened, so it stood in its outline at the switch and the picture faded
// where it stood. This reads the transition itself, as the carry-links walk
// does (scripts/carry-links-walk.mjs).
//
//   node docs/handoffs/updates-86-runners/eikon-landing.mjs <out dir> [--json <file>]
//
// Passes when, on /shop/stores/ and on /shop/ (the door is on both), at 390 by 844 with real touch, reading
// the main web: with motion on, a tap on EIKON's door opens /shop/eikon/ inside a View Transition with
// ::view-transition-old(carried) and ::view-transition-new(carried), and the room's picture that took it is the
// door's first piece (data-carry-into equal to the door's data-carry); with motion reduced, the room opens and
// no View Transition runs. Exits 1 on any failure.
import fs from "node:fs";
import path from "node:path";

const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "scripts");
const { chromium } = await import(path.join(R, "..", "node_modules", "playwright", "index.mjs"));
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);

const argv = process.argv.slice(2);
const at = argv.indexOf("--json");
const JSON_OUT = at >= 0 ? argv.splice(at, 2)[1] : null;
const [base] = argv;
if (!base) throw new Error("usage: node eikon-landing.mjs <out dir> [--json <file>]");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${data ? ` ${JSON.stringify(data)}` : ""}`);
};

for (const mode of ["on", "reduce"]) {
  for (const from of ["/shop/stores/", "/shop/"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
      } catch {}
      window.__vt = [];
      const start = Document.prototype.startViewTransition;
      if (start) {
        Document.prototype.startViewTransition = function (...a) {
          const t = start.apply(this, a);
          const rec = { names: [], taker: null };
          window.__vt.push(rec);
          t.ready
            .then(() => {
              for (const an of document.getAnimations()) {
                const p = an.effect && an.effect.pseudoElement;
                if (p && !rec.names.includes(p)) rec.names.push(p);
              }
              const named = [...document.querySelectorAll("[data-carry-into]")].find((el) => getComputedStyle(el).viewTransitionName === "carried");
              rec.taker = named ? named.getAttribute("data-carry-into") : null;
            })
            .catch((e) => (rec.error = String(e).slice(0, 120)));
          return t;
        };
      }
    });
    await pinMotion(ctx, mode);
    await serveLikeTheShell(ctx, base, {});
    for (const host of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(host, mainWeb);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await go(page, from, { timeout: 60000 });
    const door = page.locator('a[href^="/shop/eikon"]').filter({ has: page.locator("[data-carry]") }).first();
    await door.waitFor({ timeout: 30000 });
    // A reader looks at the door before tapping it; its room is read meanwhile.
    await page.waitForTimeout(2500);
    const aim = await door.evaluate(async (a) => {
      const pic = a.querySelector("[data-carry]");
      pic.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((r) => setTimeout(r, 600));
      const r = pic.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), key: pic.getAttribute("data-carry") };
    });
    await page.evaluate(() => (window.__vt = []));
    await tapAt(cdp, aim.x, aim.y);
    await page.waitForURL(/\/shop\/eikon\/?$/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const vt = await page.evaluate(() => window.__vt);
    const opened = /\/shop\/eikon\/?$/.test(new URL(page.url()).pathname);
    const names = vt.flatMap((t) => t.names);
    const where = `${from} (motion ${mode})`;
    if (mode === "on") {
      const landed = names.includes("::view-transition-old(carried)") && names.includes("::view-transition-new(carried)");
      const taker = vt.map((t) => t.taker).find(Boolean) ?? null;
      say(opened && landed && taker === aim.key, `${where}: EIKON's door opens its room and its first picture lands in it`, { opened, key: aim.key, taker, carried: names.filter((n) => /carried/.test(n)) });
    } else {
      say(opened && vt.length === 0, `${where}: EIKON's door opens its room and nothing moves`, { opened, transitions: vt.length });
    }
    await ctx.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r.ok).length;
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results }, null, 1));
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
