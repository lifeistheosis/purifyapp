// The links to a piece off /shop/ that hold its picture, as a reader taps them (Updates 46's Open 1, Updates 64).
//
// Each held its picture in a link to a piece with no name to travel by, so the tapped card's picture stayed behind
// and the piece's page arrived alone. Now EIKON's pieces (/shop/eikon/), the cart's rows, the set it offers and the
// bump carry it (pieceCarry, lib/ui/routeMotion.ts), as the shop's front page does. The cart drawer's pictures stay:
// the drawer slides away on the tap, before the page is pictured; the set the drawer offers now closes it, as its
// rows always did. The saint's rail carries too, on the website only: in the apps it renders nothing.
// Real touch, 390 by 844, the shell's own server, reading the main web.
//
//   node scripts/carry-links-walk.mjs <out dir> [--json <file>]
//
// Passes when:
//   EIKON's first piece, the cart's row, the set and the bump on the cart (whichever the cart shows; the set made
//     whole by its own button to bring the bump): the piece opened, a View Transition ran with the page in it
//     (::view-transition-old(root) and -new(root)), and the picture travelled (::view-transition-old(carried) and
//     -new(carried)) into the new page's picture of that piece ([data-carry-into="piece:<slug>"]).
//   the drawer, opened by the shop's cart button on /shop/: a row's picture, and a piece of the set it offers when it
//     offers one: the piece opened, the drawer closed (inert), and no picture travelled.
//   motion reduced: EIKON's first piece opened and no View Transition ran.
// An offer the cart does not show is said, not failed; so is the saint's rail. Exits 1 on any failure. Needs the
// browser at /opt/pw-browsers/chromium.
import fs from "node:fs";
import path from "node:path";

const R = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = await import(path.join(R, "..", "node_modules", "playwright", "index.mjs"));
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const JSON_OUT = flag("--json");
const [base] = argv;
if (!base) throw new Error("usage: node scripts/carry-links-walk.mjs <out dir> [--json <file>]");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok === null ? "SAID" : ok ? "PASS" : "FAIL"} ${what}`);
};
const slugOf = (href) => new URLSearchParams(String(href).split("?")[1] ?? "").get("slug");

async function open(mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
    // Every View Transition, with the pseudo-elements it ran (scripts/piece-switch-walk.mjs's recorder).
    window.__vt = [];
    const start = Document.prototype.startViewTransition;
    if (start) {
      Document.prototype.startViewTransition = function (...a) {
        const t = start.apply(this, a);
        const rec = { at: performance.now(), names: [] };
        window.__vt.push(rec);
        t.ready
          .then(() => {
            for (const an of document.getAnimations()) {
              const p = an.effect && an.effect.pseudoElement;
              if (p && !rec.names.includes(p)) rec.names.push(p);
            }
          })
          .catch((e) => (rec.error = String(e).slice(0, 120)));
        return t;
      };
    }
  });
  await pinMotion(ctx, mode);
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  await ctx.route(/\/api\/shop\/(checkout|product-view)/, (r) => r.abort());
  const page = await ctx.newPage();
  return { ctx, page, cdp: await ctx.newCDPSession(page) };
}

async function visit(page, route, wait = 4500) {
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(wait);
}

/**
 * Every link on the page to a piece, where it stands (the drawer, the set, the bump, a row, a card) and the picture
 * a tap on it carries: routeMotion's pictureOf, the one inside it or, for a link with nothing inside it, its parent's.
 */
const pieceLinks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/shop/icons/detail"]')].map((a, i) => {
      const picture = a.querySelector("[data-carry]") ?? (a.children.length === 0 ? a.parentElement?.querySelector("[data-carry]") : null);
      const aside = a.closest("aside");
      const drawer = Boolean(aside && /cart/i.test(aside.getAttribute("aria-label") ?? ""));
      const set = a.closest('section[aria-labelledby^="set-finish"]');
      const where = drawer
        ? set
          ? "drawer set"
          : "drawer row"
        : set
          ? "set"
          : a.closest("ul.divide-y li")
            ? "row"
            : a.closest("section[aria-label]") && !a.closest("ul")
              ? "bump"
              : "card";
      return { i, href: a.getAttribute("href"), where, holdsPicture: Boolean(a.querySelector("img")), carry: picture?.getAttribute("data-carry") ?? null };
    }),
  );

/** Where a finger goes on link i: the middle of its picture, scrolled into the screen. */
const aimAt = (page, i) =>
  page.evaluate(async (n) => {
    const a = [...document.querySelectorAll('a[href*="/shop/icons/detail"]')][n];
    const target = a.querySelector("img") ?? a;
    target.scrollIntoView({ block: "center", behavior: "instant" });
    await new Promise((r) => setTimeout(r, 900));
    const r = target.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    // What the finger lands on, said when it is not the link (an open drawer over the page, say).
    const drawer = hit?.closest("aside");
    const what = hit ? `${hit.tagName.toLowerCase()}${drawer ? ` in the ${drawer.getAttribute("aria-label") ?? "aside"} drawer` : ""}` : "nothing";
    return { x, y, onLink: Boolean(hit && hit.closest("a") === a), hit: what };
  }, i);

/** Tap the picture of the first link standing `where`; what the tap did. */
async function tapPicture(page, cdp, where) {
  const link = (await pieceLinks(page)).find((l) => l.where === where && l.holdsPicture);
  if (!link) return null;
  const aim = await aimAt(page, link.i);
  const before = await page.evaluate(() => {
    window.__vt = [];
    return location.pathname + location.search;
  });
  await tapAt(cdp, aim.x, aim.y);
  await page.waitForFunction((b) => location.pathname + location.search !== b, before, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1600);
  const after = await page.evaluate(
    (k) => ({
      at: location.pathname + location.search,
      vt: window.__vt,
      taker: k ? Boolean(document.querySelector(`[data-carry-into="${k}"]`)) : false,
      // The cart drawer (components/shop/CartDrawer.tsx): open while it is not inert and stands on the screen.
      drawerOpen: [...document.querySelectorAll("aside")].some(
        (el) => /cart/i.test(el.getAttribute("aria-label") ?? "") && !el.hasAttribute("inert") && el.getBoundingClientRect().left < window.innerWidth - 1,
      ),
    }),
    link.carry,
  );
  const names = [...new Set(after.vt.flatMap((v) => v.names))];
  return {
    link,
    aim,
    from: before,
    at: after.at,
    opened: slugOf(after.at) === slugOf(link.href) && /^\/shop\/icons\/detail\/?$/.test(after.at.split("?")[0]),
    vt: after.vt.length,
    names,
    root: names.includes("::view-transition-old(root)") && names.includes("::view-transition-new(root)"),
    carried: names.includes("::view-transition-old(carried)") && names.includes("::view-transition-new(carried)"),
    taker: after.taker,
    drawerOpen: after.drawerOpen,
  };
}

/** A link that carries: opened, pictured, and its picture taken by the piece's page. */
function carriedTap(label, seen) {
  if (!seen) return say(null, `${label}: not on this page (nothing to tap)`);
  const ok = Boolean(seen.aim.onLink && seen.opened && seen.root && seen.link.carry && seen.carried && seen.taker);
  say(ok, `${label} -> ${slugOf(seen.at) ?? seen.at}: ${seen.aim.onLink ? "" : `the finger landed on ${seen.aim.hit}, not the link; `}${seen.vt} View Transition(s)${seen.root ? ", the page pictured" : ", NOT pictured"}${seen.link.carry ? (seen.carried && seen.taker ? ", its picture carried" : ", its picture NOT carried") : ", its picture has no name to travel by"}`, seen);
}

/** A link in the drawer: opened, the drawer closed, nothing carried. */
function drawerTap(label, seen) {
  if (!seen) return say(null, `${label}: not in the drawer (nothing to tap)`);
  const ok = Boolean(seen.aim.onLink && seen.opened && !seen.drawerOpen && !seen.carried);
  say(ok, `${label} -> ${slugOf(seen.at) ?? seen.at}: ${seen.opened ? "opened" : "NOT opened"}, the drawer ${seen.drawerOpen ? "STILL OPEN over it" : "closed"}, ${seen.carried ? "a picture carried (the drawer's stay)" : "no picture carried"}`, seen);
}

async function tapButton(page, cdp, find) {
  const at = await page.evaluate(find);
  if (!at) return false;
  await tapAt(cdp, at.x, at.y);
  await page.waitForTimeout(2500);
  return true;
}

// 1. EIKON's pieces, motion on.
{
  const { ctx, page, cdp } = await open("on");
  try {
    await visit(page, "/shop/eikon/");
    carriedTap("1 EIKON (/shop/eikon/), its first piece", await tapPicture(page, cdp, "card"));
  } finally {
    await ctx.close();
  }
}

// 2. The cart: a piece put in it the reader's way (Add to cart on its page) and the cart reached the same way (the
// drawer that opens, by its own link), then its row, the set or the bump on the cart page, and the drawer's own links
// from /shop/.
{
  const { ctx, page, cdp } = await open("on");
  try {
    await visit(page, "/shop/");
    const first = (await pieceLinks(page)).find((l) => l.where === "card")?.href;
    if (!first) throw new Error("no piece on /shop/");
    await visit(page, first);
    const added = await tapButton(page, cdp, () => {
      const b = [...document.querySelectorAll("button")].find((e) => /add to cart/i.test(e.textContent ?? "") && !e.disabled && e.getBoundingClientRect().height > 0);
      if (!b) return null;
      b.scrollIntoView({ block: "center", behavior: "instant" });
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (!added) say(false, `2 the cart: no Add to cart on ${first}`);
    else {
      // Add to cart opens the drawer (BuyBar, openCartDrawer), which the shop layout keeps open over whatever page
      // the router brings, so a reader goes on to the cart by the drawer's own link, which closes it. Pushed by the
      // router instead, the cart page came up under the open drawer and every tap on it landed in the drawer
      // (round 4: 2a and 2b stayed on /shop/cart/, 2c opened a piece of the drawer's set; Updates 68).
      const viaDrawer = await tapButton(page, cdp, () => {
        const a = [...document.querySelectorAll('aside a[href^="/shop/cart"]')].find((e) => !e.closest("aside").hasAttribute("inert") && e.getBoundingClientRect().height > 0);
        if (!a) return null;
        a.scrollIntoView({ block: "center", behavior: "instant" });
        const r = a.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      if (!viaDrawer) say(false, "2 the cart: Add to cart opened no drawer with its way on to the cart");
      await visit(page, "/shop/cart/", 2500);
      carriedTap("2a the cart's row", await tapPicture(page, cdp, "row"));
      await visit(page, "/shop/cart/");
      const offers = new Set((await pieceLinks(page)).map((l) => l.where));
      carriedTap("2b the set on the cart", offers.has("set") ? await tapPicture(page, cdp, "set") : null);
      if (offers.has("set")) {
        // The set made whole by its own button, so the cart may offer the bump instead.
        await visit(page, "/shop/cart/");
        await tapButton(page, cdp, () => {
          const s = document.querySelector('section[aria-labelledby="set-finish"]');
          const b = s?.querySelector("button");
          if (!b) return null;
          b.scrollIntoView({ block: "center", behavior: "instant" });
          const r = b.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });
        await visit(page, "/shop/cart/");
      }
      carriedTap("2c the bump on the cart", (await pieceLinks(page)).some((l) => l.where === "bump") ? await tapPicture(page, cdp, "bump") : null);

      // The drawer, opened by the shop's cart button: its row, then the set it offers (a cart of the first piece alone).
      await page.evaluate((p) => {
        const items = JSON.parse(localStorage.getItem("purify:shop.cart") ?? "[]");
        localStorage.setItem("purify:shop.cart", JSON.stringify(items.filter((i) => i.slug === p)));
      }, slugOf(first));
      for (const [label, where] of [
        ["2d the drawer's row", "drawer row"],
        ["2e the set in the drawer", "drawer set"],
      ]) {
        await visit(page, "/shop/");
        const opened = await tapButton(page, cdp, () => {
          const b = [...document.querySelectorAll("button[aria-label]")].find((e) => /cart/i.test(e.getAttribute("aria-label") ?? "") && !e.closest("aside") && e.getBoundingClientRect().height > 0);
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });
        if (!opened) {
          say(false, `${label}: no cart button on /shop/`);
          continue;
        }
        await page.waitForTimeout(2500); // the drawer reads the catalogue the first time it opens
        drawerTap(label, await tapPicture(page, cdp, where));
      }
    }
  } finally {
    await ctx.close();
  }
}

// 3. Motion reduced: EIKON's first piece, still.
{
  const { ctx, page, cdp } = await open("reduce");
  try {
    await visit(page, "/shop/eikon/");
    const seen = await tapPicture(page, cdp, "card");
    if (!seen) say(false, "3 reduced EIKON: no piece on /shop/eikon/");
    else say(Boolean(seen.aim.onLink && seen.opened && seen.vt === 0), `3 reduced EIKON -> ${slugOf(seen.at) ?? seen.at}: ${seen.vt} View Transition(s)`, seen);
  } finally {
    await ctx.close();
  }
}

say(null, "4 the saint's rail (components/shop/SaintIconsRail.tsx): web only, it renders nothing in the apps; held by lib/shop/__tests__/shopHomeCarry.test.ts");
say(null, "5 the thank-you page's bump: needs a paid order; the same OrderBump as 2c");

await browser.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.ok === false).length;
const passed = results.filter((r) => r.ok === true).length;
console.log(`${passed} passed, ${failed} failed, ${results.length - passed - failed} said`);
process.exit(failed ? 1 : 0);
