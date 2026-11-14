// Updates 46's taps on the export, as a reader taps them (real touch, 390 by 844), reading the main web.
//   node taps46.mjs <out dir> <json out>
// 1. Fault 7, motion on: every link to a piece on /shop/ (the featured icon, the cards, the feast, the set, the row
//    of pieces looked at before, seeded so it shows), each from a fresh /shop/, its picture tapped. Passes when the
//    page it opens is the piece's, and a View Transition ran with the piece's picture on both sides
//    (::view-transition-old(carried) and ::view-transition-new(carried)), landing in the page's picture of that piece.
// 2. The same with the app's motion reduced: the featured icon and two cards; passes when the piece opened and no
//    View Transition ran (reduced motion stays still).
// 3. The cart drawer's foot (Updates 44's Open 2), Jordan (a look with a foot) and Dark, English and Arabic: a piece
//    opened, Add to cart tapped, the drawer measured as exported and with its foot's mark taken off in the page (the
//    old code), then "View cart and check out" tapped.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const { LOOKS, PALETTES } = await import(`${R}/mock-check.mjs`);
const [base, outFile] = process.argv.slice(2);
const RECENT = ["greek-christ-flag", "orthodox-cross-beanie"];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};

async function open(route, { mode = "on", lang = "en", palette = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode), ...(lang !== "en" ? { locale: lang } : {}) });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript(([l, recent]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (!localStorage.getItem("purify:shop.recent")) localStorage.setItem("purify:shop.recent", recent);
    } catch {}
    // Every View Transition, with the pseudo-elements it ran.
    window.__vt = [];
    const start = Document.prototype.startViewTransition;
    if (start) {
      Document.prototype.startViewTransition = function (...a) {
        const t = start.apply(this, a);
        const rec = { names: [] };
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
  }, [lang, JSON.stringify(RECENT)]);
  await pinMotion(ctx, mode);
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  // Never a real checkout or a write.
  await ctx.route(/\/api\/shop\/checkout/, (r) => r.abort());
  const page = await ctx.newPage();
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(4000);
  if (palette) {
    await page.evaluate(([m, l]) => {
      const h = document.documentElement;
      if (m) h.setAttribute("data-reading-mode", m);
      else h.removeAttribute("data-reading-mode");
      if (l) h.setAttribute("data-look", l);
      else h.removeAttribute("data-look");
    }, [palette[1] ?? null, palette[2] ?? null]);
    await page.waitForTimeout(600);
  }
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp };
}

/** The links to a piece on the page, in reading order, with what each holds. */
const pieceLinks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/shop/icons/"]')].map((a, i) => {
      const inside = a.querySelector("[data-carry]");
      const picture = inside ?? (a.children.length === 0 ? a.parentElement?.querySelector("[data-carry]") : null) ?? a.querySelector("img");
      const where = a.closest("section")?.getAttribute("aria-label") ?? a.closest("section")?.querySelector("h1,h2")?.textContent?.trim() ?? "";
      return { i, href: a.getAttribute("href"), name: a.getAttribute("aria-label") ?? a.textContent.trim().slice(0, 40), where: where.slice(0, 40), stretched: a.children.length === 0, carry: picture?.getAttribute("data-carry") ?? null, img: Boolean((inside ?? a).querySelector?.("img") || (a.children.length === 0 && a.parentElement?.querySelector("img"))) };
    }),
  );

/** Where a finger goes on link i: the middle of its picture, scrolled to the middle of the screen. */
async function aimAt(page, i) {
  return page.evaluate(async (n) => {
    const a = [...document.querySelectorAll('a[href*="/shop/icons/"]')][n];
    const picture = a.querySelector("[data-carry], img") ?? (a.children.length === 0 ? a.parentElement?.querySelector("[data-carry]") : null) ?? a;
    picture.scrollIntoView({ block: "center", behavior: "instant" });
    await new Promise((r) => setTimeout(r, 900));
    const r = picture.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    return { x, y, onLink: Boolean(hit && (hit.closest("a") === a)), hit: hit ? hit.tagName + "." + String(hit.className).split(" ")[0] : null };
  }, i);
}

async function tapPiece(mode, i, label) {
  const { ctx, page, cdp } = await open("/shop/", { mode });
  try {
    const links = await pieceLinks(page);
    const link = links[i];
    if (!link) return null;
    const aim = await aimAt(page, i);
    await page.evaluate(() => (window.__vt = []));
    const before = await page.evaluate(() => location.pathname);
    await tapAt(cdp, aim.x, aim.y);
    await page.waitForFunction((b) => location.pathname !== b, before, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1400);
    const after = await page.evaluate((key) => ({
      at: location.pathname + location.search,
      vt: window.__vt,
      taker: key ? Boolean(document.querySelector(`[data-carry-into="${key}"]`)) : null,
    }), link.carry);
    const names = after.vt.flatMap((v) => v.names);
    const slug = new URLSearchParams(after.at.split("?")[1] ?? "").get("slug");
    const opened = /^\/shop\/icons\/detail\/?$/.test(after.at.split("?")[0]) && slug && link.href.includes(encodeURIComponent(slug));
    const carried = names.includes("::view-transition-old(carried)") && names.includes("::view-transition-new(carried)");
    const data = { link, aim, at: after.at, vt: after.vt.length, names: [...new Set(names.map((n) => n.replace(/^::view-transition-\w+(-\w+)*/, "")))], taker: after.taker };
    if (mode === "on") say(Boolean(opened && carried && after.taker && aim.onLink), `${label} [${link.where}] ${link.name}: opened ${after.at}; ${carried ? "its picture carried" : "NOT carried"} (${data.names.join(" ")})`, data);
    else say(Boolean(opened && after.vt.length === 0 && aim.onLink), `${label} reduced [${link.where}] ${link.name}: opened ${after.at}; ${after.vt.length} View Transition(s)`, data);
    return link;
  } finally {
    await ctx.close();
  }
}

// 1 and 2.
const first = await open("/shop/");
const links = await pieceLinks(first.page);
await first.ctx.close();
console.log(`${links.length} links to a piece on /shop/: ${links.map((l) => `${l.where || "?"}:${l.href.split("slug=")[1]}${l.stretched ? "(stretched)" : ""}${l.carry ? "" : "(no name)"}`).join(", ")}`);
for (const l of links) await tapPiece("on", l.i, `#${l.i}`);
for (const i of [0, ...links.filter((l) => l.stretched).slice(0, 2).map((l) => l.i)]) await tapPiece("reduce", i, `#${i}`);

// 3. The cart drawer's foot.
const JORDAN = LOOKS.find(([label]) => label === "Jordan");
const DARK = PALETTES.find(([label]) => label === "Dark");
for (const lang of ["en", "ar"]) {
  for (const palette of [JORDAN, DARK]) {
    const { ctx, page, cdp } = await open("/shop/icons/detail/?slug=byzantine-three-beam-wall-cross", { lang, palette });
    try {
      const add = await page.evaluate(() => {
        const b = [...document.querySelectorAll("[data-foot-bar] button")].find((x) => !x.classList.contains("bg-paper"));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: b.textContent.trim() };
      });
      if (!add) {
        say(false, `drawer ${lang} ${palette[0]}: no Add to cart`);
        continue;
      }
      await tapAt(cdp, add.x, add.y);
      await page.waitForTimeout(1200);
      const measure = (old) =>
        page.evaluate((o) => {
          const panel = document.querySelector("aside.fixed.inset-y-0.end-0.z-50");
          const foot = panel?.querySelector(".safe-pb");
          if (!panel || !foot) return null;
          if (o) foot.removeAttribute("data-foot-bar");
          const go = foot.querySelector('a[href="/shop/cart"], a[href="/shop/cart/"]');
          const p = panel.getBoundingClientRect();
          const g = go.getBoundingClientRect();
          const out = { panel: [Math.round(p.top), Math.round(p.bottom), Math.round(p.width)], pb: getComputedStyle(foot).paddingBottom, go: [Math.round(g.top), Math.round(g.bottom)], under: Math.round(p.bottom - g.bottom), look: document.documentElement.getAttribute("data-look"), tabBar: getComputedStyle(document.querySelector("[data-tab-bar]") ?? document.body).visibility, foot: getComputedStyle(document.body, "::after").content !== "none" };
          if (o) foot.setAttribute("data-foot-bar", "");
          return out;
        }, old);
      const now = await measure(false);
      const old = await measure(true);
      if (!now) {
        say(false, `drawer ${lang} ${palette[0]}: the drawer did not open`);
        continue;
      }
      say(true, `drawer ${lang} ${palette[0]}: open ${now.panel[0]} to ${now.panel[1]} (${now.panel[2]} wide); as exported "View cart" ends at ${now.go[1]}, ${now.under}px under it (padding ${now.pb}); the old code ${old.under}px under it (padding ${old.pb})`, { now, old, add });
      // The drawer's own way on, tapped.
      const go = await page.evaluate(() => {
        const a = document.querySelector('aside.fixed.inset-y-0.end-0.z-50 .safe-pb a[href^="/shop/cart"]');
        const r = a.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: a.textContent.trim() };
      });
      await tapAt(cdp, go.x, go.y);
      await page.waitForFunction(() => location.pathname.startsWith("/shop/cart"), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
      const at = await page.evaluate(() => location.pathname);
      say(at.startsWith("/shop/cart"), `drawer ${lang} ${palette[0]}: "${go.text}" tapped, at ${at}`);
    } finally {
      await ctx.close();
    }
  }
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length} of ${results.length} pass`);
await browser.close();
