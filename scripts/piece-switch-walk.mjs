// From one piece to another on the export's page for a piece, as a reader taps it (Updates 46's Open 2, Updates 62).
//
// On the export a piece's page is one page addressed by its query (/shop/icons/detail/?slug=, components/shop/
// ProductDetailFromQuery.tsx), so from one piece to another (a card in "You may also like" or the set, on a piece's
// page) the path does not change, only the query. The route's motion (components/nav/RouteTransition.tsx) listened
// to the path alone, so that switch was a cut. Real touch, 390 by 844, the shell's own server, reading the main web.
// Each switch is filmed from the tap to 1.5s after: every frame the screen paints (CDP screencast, with --shots) and
// each animation frame's state in the page (the address, the heading, whether a View Transition is running).
//
//   node scripts/piece-switch-walk.mjs <out dir> [--json <file>] [--shots <dir>]
//
// Passes when:
//   forward, motion on, both ways (a card on piece A's page to B, then a card on B's page to another): the piece
//     opened, a View Transition ran with the page in it (::view-transition-old(root) and -new(root)), and the card's
//     picture travelled (::view-transition-old(carried) and -new(carried)) into the new page's picture of that piece.
//   back, motion on (the top bar's way back, lib/nav/goBack.ts): the piece before came back inside a View Transition.
//   forward, motion reduced: the piece opened and no View Transition ran (reduced motion stays still).
// Exits 1 on any failure. Needs the browser at /opt/pw-browsers/chromium.
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
const SHOTS = flag("--shots");
const [base] = argv;
if (!base) throw new Error("usage: node scripts/piece-switch-walk.mjs <out dir> [--json <file>] [--shots <dir>]");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what, data) => {
  results.push({ ok, what, ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
const slugOf = (href) => new URLSearchParams(String(href).split("?")[1] ?? "").get("slug");

async function open(route, mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
    // Every View Transition, with the pseudo-elements it ran.
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
    // Each animation frame's state, from the tap on.
    window.__film = (ms) => {
      const frames = [];
      const t0 = performance.now();
      const step = () => {
        const t = performance.now() - t0;
        const moving = document.getAnimations().some((an) => String(an.effect?.pseudoElement ?? "").startsWith("::view-transition"));
        frames.push({ t: Math.round(t), q: location.search, h1: (document.querySelector("main h1, h1")?.textContent ?? "").trim().slice(0, 48), moving });
        if (t < ms) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      window.__frames = frames;
    };
  });
  await pinMotion(ctx, mode);
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  await ctx.route(/\/api\/shop\/(checkout|product-view)/, (r) => r.abort());
  const page = await ctx.newPage();
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(4500);
  return { ctx, page, cdp: await ctx.newCDPSession(page) };
}

/** The links on this page to another piece, each with the picture it carries (routeMotion's pictureOf). */
const otherPieces = (page) =>
  page.evaluate(() => {
    const here = new URLSearchParams(location.search).get("slug");
    return [...document.querySelectorAll('a[href*="/shop/icons/detail"]')]
      .map((a, i) => {
        const picture = a.querySelector("[data-carry]") ?? (a.children.length === 0 ? a.parentElement?.querySelector("[data-carry]") : null);
        return { i, href: a.getAttribute("href"), carry: picture?.getAttribute("data-carry") ?? null, where: (a.closest("section")?.querySelector("h2,h3")?.textContent ?? "").trim().slice(0, 40) };
      })
      .filter((l) => new URLSearchParams(l.href.split("?")[1] ?? "").get("slug") !== here);
  });

/** Where a finger goes on link i: the middle of its picture, scrolled to the middle of the screen. */
const aimAt = (page, i) =>
  page.evaluate(async (n) => {
    const a = [...document.querySelectorAll('a[href*="/shop/icons/detail"]')][n];
    const target = a.querySelector("[data-carry], img") ?? (a.children.length === 0 ? a.parentElement?.querySelector("[data-carry]") : null) ?? a;
    target.scrollIntoView({ block: "center", behavior: "instant" });
    await new Promise((r) => setTimeout(r, 900));
    const r = target.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    return { x, y, onLink: Boolean(hit && hit.closest("a") === a) };
  }, i);

/** Film one switch: `act` taps; returns the address after, the transitions and every frame from the tap to 1.5s after. */
async function film(page, cdp, label, act) {
  const shots = [];
  const onFrame = (p) => {
    shots.push(p.data);
    cdp.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
  };
  if (SHOTS) {
    cdp.on("Page.screencastFrame", onFrame);
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: 390, maxHeight: 844, everyNthFrame: 1 });
  }
  const before = await page.evaluate(() => {
    window.__vt = [];
    window.__film(1500);
    return location.search;
  });
  await act();
  await page.waitForFunction((b) => location.search !== b, before, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1600);
  if (SHOTS) {
    await cdp.send("Page.stopScreencast").catch(() => {});
    cdp.off("Page.screencastFrame", onFrame);
    const dir = path.join(SHOTS, label.replace(/\W+/g, "-"));
    fs.mkdirSync(dir, { recursive: true });
    shots.forEach((d, n) => fs.writeFileSync(path.join(dir, `${String(n).padStart(3, "0")}.jpg`), Buffer.from(d, "base64")));
  }
  const after = await page.evaluate(() => ({ at: location.pathname + location.search, vt: window.__vt, frames: window.__frames }));
  const names = after.vt.flatMap((v) => v.names);
  const turned = after.frames.findIndex((f) => f.q !== before);
  return {
    from: slugOf(before),
    at: after.at,
    vt: after.vt.length,
    names: [...new Set(names)],
    root: names.includes("::view-transition-old(root)") && names.includes("::view-transition-new(root)"),
    carried: names.includes("::view-transition-old(carried)") && names.includes("::view-transition-new(carried)"),
    frames: after.frames.length,
    // What the reader saw change, frame by frame: the address, the heading and whether a transition was running.
    states: after.frames.filter((f, n, all) => n === 0 || ["q", "h1", "moving"].some((k) => f[k] !== all[n - 1][k])),
    // The frame the address turned on, and whether a transition was running there and in the frames around it.
    turn: turned >= 0 ? { frame: turned, t: after.frames[turned].t, moving: after.frames.slice(Math.max(0, turned - 1), turned + 4).map((f) => f.moving) } : null,
    shots: shots.length,
  };
}

async function tapCard(page, cdp, label, mode, want = null) {
  const links = await otherPieces(page);
  const link = (want && links.find((l) => slugOf(l.href) === want)) ?? links.find((l) => l.carry) ?? links[0];
  if (!link) {
    say(false, `${label}: no link to another piece on ${await page.evaluate(() => location.search)}`);
    return null;
  }
  const aim = await aimAt(page, link.i);
  const seen = await film(page, cdp, label, () => tapAt(cdp, aim.x, aim.y));
  const opened = slugOf(seen.at) === slugOf(link.href) && /^\/shop\/icons\/detail\/?$/.test(seen.at.split("?")[0]);
  const taker = link.carry ? await page.evaluate((k) => Boolean(document.querySelector(`[data-carry-into="${k}"]`)), link.carry) : false;
  const data = { link, aim, taker, ...seen };
  if (mode === "on") {
    const ok = Boolean(aim.onLink && opened && seen.root && (!link.carry || (seen.carried && taker)));
    say(ok, `${label} [${link.where}] ${seen.from} -> ${slugOf(seen.at)}: ${seen.vt} View Transition(s)${seen.root ? ", the page pictured" : ", NOT pictured (a cut)"}${link.carry ? (seen.carried ? ", its picture carried" : ", its picture NOT carried") : ", no picture to carry"}`, data);
  } else {
    say(Boolean(aim.onLink && opened && seen.vt === 0), `${label} reduced [${link.where}] ${seen.from} -> ${slugOf(seen.at)}: ${seen.vt} View Transition(s)`, data);
  }
  return opened ? slugOf(seen.at) : null;
}

// The pieces: the first card on /shop/ with a picture, then the walk from its page.
const shop = await open("/shop/", "on");
const firstPiece = await shop.page.evaluate(() => [...document.querySelectorAll('a[href*="/shop/icons/detail"]')].map((a) => a.getAttribute("href")).find(Boolean));
await shop.ctx.close();
const A = slugOf(firstPiece);
if (!A) throw new Error("no piece on /shop/");

// Motion on: A to B, B to another (both ways), then the top bar's way back.
{
  const { ctx, page, cdp } = await open(`/shop/icons/detail/?slug=${encodeURIComponent(A)}`, "on");
  try {
    const B = await tapCard(page, cdp, "1 forward A to B", "on");
    if (B) {
      await page.waitForTimeout(2500);
      await tapCard(page, cdp, "2 forward B to another", "on", A);
      await page.waitForTimeout(2500);
      const back = await page.evaluate(() => {
        const el = [...document.querySelectorAll("button[aria-label], a[aria-label]")].find((e) => /^(back|go back)$/i.test(e.getAttribute("aria-label") ?? "") && e.getBoundingClientRect().height > 0);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      if (back) {
        const seen = await film(page, cdp, "3 back", () => tapAt(cdp, back.x, back.y));
        say(Boolean(slugOf(seen.at) === B && seen.root), `3 back -> ${slugOf(seen.at)} (want ${B}): ${seen.vt} View Transition(s)${seen.root ? ", the page pictured" : ", NOT pictured (a cut)"}${seen.carried ? ", the picture carried back" : ""}`, { back, ...seen });
      } else say(true, "3 back: no top bar way back on a piece's page (nothing to tap)");
    }
  } finally {
    await ctx.close();
  }
}

// Motion reduced: A to B, still.
{
  const { ctx, page, cdp } = await open(`/shop/icons/detail/?slug=${encodeURIComponent(A)}`, "reduce");
  try {
    await tapCard(page, cdp, "4 forward A to B", "reduce");
  } finally {
    await ctx.close();
  }
}

await browser.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
