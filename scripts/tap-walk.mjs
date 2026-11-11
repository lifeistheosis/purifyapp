// The pre-build gate, part 1: the tap walk (docs/1.9-build/notes/build-93.md,
// "The pre-build gate"; CLAUDE.md, "No test build reaches him until it passes
// the pre-build gate", item 1).
//
// On the native export, on a phone (390 by 844) with real touch (the
// DevTools protocol's touch events, as the export walk's verse gestures use),
// one page of every route the export carries (scripts/lib/screens.mjs),
// reached the app's way (scripts/lib/shell-server.mjs). On each screen every
// control a finger can reach is tapped (up to --max, in reading order; the
// record says how many more there were), each from the screen as it first
// stood: what the device keeps put back, a new document, the app's own way
// in. The walk fails:
//   nothing    a tap that changes nothing: no navigation, no change in the
//              page, no scroll, nothing kept (build 93 notes 3 and 8)
//   covered    the finger meets something else at the control's middle
//              (note 8, a tap that meets something else first)
//   moved      the thing under the finger moves more than 4px on the screen,
//              where the finger is, because what stands above it changed, or
//              because the page grew too short for where it stood and the
//              browser pulled it (note 16, Evening to Morning, 133px on a
//              tablet); a page taken somewhere on purpose (a Begin that
//              scrolls to the prayer, a bar of tabs that stays at the top as
//              its page goes to the part asked for) is no jump
//   back       Back from where a tap went forward does not return the reader
//              to the place they left (note 1, Nicaea after St Alexander):
//              what they tapped stands more than 48px from where it stood on
//              the screen (or, for a control with no address to find it by,
//              the page's scroll is that far off); a step back, or an address
//              changed in place (a tab), is not asked to
//   under      a part a tap opens ends under the bar at the foot, and the
//              page did not move with it (note 15), judged by the rule of
//              Fable Theology's lib/ui/showOpened.ts: it passes when the
//              part's end clears the bottom bar by 12px, or the control has
//              risen as far as it may (to the top bar), or the page is at its
//              end; a page that follows what opened is not a jump, one that
//              carries the control under the top bar is
// and lists, to be looked at by eye, a choice whose check moved while
// nothing else in the page did (note 3's look that changed nothing): many
// a setting is kept and shown nowhere else, so this is a "look" and not a
// fail. It lists too, as "held", a control that what stands above it moved
// by more than 4px while the browser's scroll anchoring kept it under the
// finger: Chrome, and so the Android app, holds it there; a browser that
// does not anchor would let it jump.
//
// A control is measured once it stands still (a picture arriving, a list the
// page draws again once the main web answers), and a control the page drew
// again as it was reached (a new node with the same name in the same place
// in the order) is found again, so neither is mistaken for a cover.
//
// Never a write anywhere: with no network the shell answers nothing outside
// the bundle; with --online the main web is read (GET) and nothing is sent.
// A link out of the app (another site, mail, a download) is not followed.
//
//   npm run build:android, then:
//   NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs [out dir] [--only /path,/path] [--workers 3] [--max 30] [--json file] [--shots dir] [--online]
//
// --shots keeps a still of the screen at each fail, the control ringed, for the
// one who mends it.
//
// The gate walks the export cut the house's way, which sells Plus on Android
// (NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk
// npm run build:android, as scripts/plus-order-walk.mjs and learn-walk.mjs
// ask), twice: with SELLS_PLUS=1 the page says it is the Android shell, where
// that export sells Plus, so the walk is a new reader with no Plus, as he
// walks; without it the same export locks nothing (the arbiter, 2026-11-11:
// one build, two readers).
//
//   node scripts/tap-walk.mjs --self-test
//
// proves the measures on a page of its own that draws one case at each address:
// a bar of tabs that stays at the top as its page goes where it was asked
// (passes), what stands above a control taken away while the browser's scroll
// anchoring holds it (passes, listed as held), the same with no anchoring (a
// jump), a page grown too short at its end (pulled), Back to a page that adds a
// shelf above the reader once it is back (passes) and Back to a page that loses
// the reader's place (fails), and a control the page draws again as it is
// reached (found again, and passes).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

import { screens } from "./lib/screens.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { SELLS_PLUS as SELLS, asAndroidShell, checkSells, readerWords } from "./lib/sells-plus.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const ONLY = flag("--only")?.split(",") ?? null;
const WORKERS = Math.max(1, Number(flag("--workers") ?? 3));
const MAX = Math.max(1, Number(flag("--max") ?? 30));
const JSON_OUT = flag("--json");
const SHOTS = flag("--shots");
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLINE = argv.includes("--online");
if (ONLINE) argv.splice(argv.indexOf("--online"), 1);
const SELF_TEST = argv.includes("--self-test");
if (SELF_TEST) argv.splice(argv.indexOf("--self-test"), 1);
const OUT = SELF_TEST ? selfTestPage() : path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);
const SELLS_PLUS = !SELF_TEST && SELLS;
checkSells(OUT, SELLS_PLUS);

/**
 * A fail allowed by name and reason, the arbiter's to grant: the screens, the control, the
 * verdict it lifts, and why. Printed with its reason on every walk, never silent.
 */
const ALLOWED = [
  {
    screens: /^\/saints\/[^/]+\/web\/$/,
    control: /^button "[IVXL]+ /,
    verdict: "moved",
    why: "a saint's web lifts the chosen council above the sheet it opens, so the node stays in sight: the page following what opened (the arbiter, 2026-11-11)",
  },
  ...(SELF_TEST ? [{ screens: /^\/allowed\/$/, control: /^button "Add a note"$/, verdict: "moved", why: "the self-test's own allowance" }] : []),
];

/** What each of the self-test's cases must come to. */
const EXPECT = {
  "/sticky/": { verdict: "pass", why: /^took the page/ },
  "/held/": { verdict: "pass", held: true },
  "/jump/": { verdict: "fail", why: /^moved: it moved/ },
  "/pulled/": { verdict: "fail", why: /^moved: the page grew too short/ },
  "/back-held/": { verdict: "pass" },
  "/back-lost/": { verdict: "fail", why: /^back: Back returned with what was tapped/ },
  "/redrawn/": { verdict: "pass" },
  "/allowed/": { verdict: "allowed" },
  "/dead/": { verdict: "fail", why: /^nothing:/ },
  "/grows/": { verdict: "pass" },
  "/sr-only/": { verdict: "pass", why: /^went to \/other\// },
  "/read-more/": { verdict: "pass" },
  "/here/": { verdict: "pass", why: /^names the page it stands on/ },
  "/chosen/": { verdict: "pass", why: /a choice already made/ },
  "/toggle-dead/": { verdict: "fail", why: /^nothing:/ },
  "/wrapped/": { verdict: "pass", why: /^went to \/other\// },
  "/required/": { verdict: "pass" },
};

/** The self-test's page: one front door that draws a case by its address, as the shell answers every address with it. */
function selfTestPage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tap-walk-self-test-"));
  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html{scroll-behavior:auto}body{margin:0;font:16px/1.5 sans-serif;background:#fff;color:#000}button,a{display:block;box-sizing:border-box;min-height:44px;width:220px;margin:0 16px;font:16px sans-serif}.bar{position:sticky;top:0;background:#eee;padding:4px 0}</style>
</head><body><main id="m"></main><script>
window.next = { router: { push: (h) => location.assign(h) } };
const m = document.getElementById("m");
const block = (h, id) => { const d = document.createElement("div"); d.style.height = h + "px"; if (id) d.id = id; d.textContent = "Words to read."; return d; };
const button = (words, onTap) => { const b = document.createElement("button"); b.type = "button"; b.textContent = words; b.onclick = () => onTap(b); return b; };
const at = location.pathname;
if (at === "/sticky/") {
  const bar = document.createElement("div"); bar.className = "bar";
  bar.append(button("Part three", () => document.getElementById("p3").scrollIntoView()));
  m.append(block(300), bar, block(900, "p1"), block(900, "p2"), block(900, "p3"), block(900));
} else if (at === "/held/") {
  m.append(block(700, "top"), block(600), button("Choose", (b) => { document.getElementById("top")?.remove(); b.textContent = "Chosen"; }), block(2000));
} else if (at === "/jump/" || at === "/allowed/") {
  document.documentElement.style.overflowAnchor = "none"; document.body.style.overflowAnchor = "none";
  m.append(block(150), button("Add a note", (b) => b.before(block(60))), block(2000));
} else if (at === "/pulled/") {
  document.documentElement.style.overflowAnchor = "none"; document.body.style.overflowAnchor = "none";
  m.append(block(1500), button("Shorter", () => document.getElementById("tail").remove()), block(900, "tail"));
} else if (at === "/back-held/" || at === "/back-lost/") {
  const a = document.createElement("a"); a.href = "/other/"; a.textContent = "Read on"; a.onclick = () => sessionStorage.setItem("went", "1");
  m.append(block(1000), a, block(2000));
  addEventListener("pageshow", () => {
    if (!sessionStorage.getItem("went") || document.getElementById("shelf")) return;
    setTimeout(() => (at === "/back-held/" ? m.prepend(block(300, "shelf")) : scrollTo(0, 0)), 300);
  });
} else if (at === "/dead/") {
  // As the export does at a first touch: <html>'s style let go, and something put in the head.
  document.documentElement.style.overflowAnchor = "none";
  addEventListener("touchstart", () => { document.documentElement.style.removeProperty("overflow-anchor"); document.head.append(document.createElement("script")); }, { once: true, passive: true });
  const dead = document.createElement("button"); dead.type = "button"; dead.textContent = "Does nothing";
  m.append(block(300), dead, block(1200));
} else if (at === "/grows/") {
  const b = button("More", (x) => { x.style.paddingBottom = "48px"; x.textContent = "Less"; });
  m.append(block(300), b, block(1200));
} else if (at === "/sr-only/") {
  // A screen reader's heading, its link first in the order; then the cover a finger taps.
  const h = document.createElement("h2");
  h.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0";
  const hidden = document.createElement("a"); hidden.href = "/other/"; hidden.textContent = "The First Apology, St Justin Martyr";
  h.append(hidden);
  const cover = document.createElement("a"); cover.href = "/other/"; cover.textContent = "The cover";
  m.append(block(200), h, cover, block(1200));
} else if (at === "/read-more/") {
  // Words that open above their own control, and the page lifting the thumb's place to the top (showOpened's tapped).
  const words = document.createElement("p"); words.id = "more-words"; words.style.margin = "0"; words.textContent = "The first lines of a long post.";
  const more = button("Read more", (b) => {
    const at = b.getBoundingClientRect().top;
    words.style.height = "1400px";
    b.setAttribute("aria-expanded", "true");
    scrollBy(0, at);
  });
  more.setAttribute("aria-expanded", "false"); more.setAttribute("aria-controls", "more-words");
  m.append(block(600), words, more, block(1500));
} else if (at === "/chosen/") {
  // A row of chips where one is chosen: the chosen one, tapped again, has nothing to do.
  const row = document.createElement("div"); row.setAttribute("role", "group");
  for (const [w, on] of [["All", true], ["English", false]]) { const b = document.createElement("button"); b.type = "button"; b.textContent = w; b.setAttribute("aria-pressed", String(on)); row.append(b); }
  m.append(block(300), row, block(1200));
} else if (at === "/toggle-dead/") {
  // A lone toggle that is on, tapped, stays on: dead.
  const t = document.createElement("button"); t.type = "button"; t.textContent = "Keep"; t.setAttribute("aria-pressed", "true");
  m.append(block(300), t, block(1200));
} else if (at === "/required/") {
  // A form whose field is required: the browser asks for it, and focuses it.
  const f = document.createElement("form"); f.onsubmit = (e) => e.preventDefault();
  const i = document.createElement("input"); i.type = "email"; i.required = true; i.name = "email"; i.style.cssText = "display:block;margin:0 16px;height:44px";
  const go = document.createElement("button"); go.type = "submit"; go.textContent = "Sign in";
  f.append(i, go);
  m.append(block(300), f, block(1200));
} else if (at === "/wrapped/") {
  // A link that wraps across two lines in a sentence, its box's middle on the sentence's other words.
  // In a face of one width, "Support" ends the first line (23 + 7 of 30) and "page" starts the second.
  const p = document.createElement("p"); p.style.cssText = "margin:0 16px;width:30ch;font:18px/28px monospace";
  p.append("aaaa aaaa aaaa aaaa aa ");
  const a = document.createElement("a"); a.href = "/other/"; a.textContent = "Support page";
  a.style.cssText = "display:inline;width:auto;min-height:0;margin:0;font:inherit;text-decoration:underline";
  p.append(a, ". The rest of the sentence runs on here.");
  m.append(block(300), p, block(1200));
} else if (at === "/here/") {
  const tab = document.createElement("a"); tab.href = "/here/"; tab.textContent = "You";
  m.append(block(300), tab, block(1200));
} else if (at === "/redrawn/") {
  let b = button("Open", (x) => (x.textContent = "Opened"));
  m.append(block(1500), b, block(1500));
  new IntersectionObserver((seen, io) => {
    if (!seen.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const again = button("Open", (x) => (x.textContent = "Opened"));
    b.replaceWith(again); b = again;
  }).observe(b);
} else {
  m.append(block(400));
}
</script></body></html>`,
  );
  return dir;
}

const list = SELF_TEST ? Object.keys(EXPECT) : (ONLY ?? screens(OUT));
console.log(`${list.length} screens on a phone, up to ${MAX} controls each, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${readerWords(SELLS_PLUS)}`);

const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

// The main web, read as a phone reads it: GET only, each address once.
const fetched = new Map();
async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) {
      fetched.set(
        url,
        (async () => {
          const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
          const r = await fetch(url, { headers });
          const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
          return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
        })(),
      );
    }
    return route.fulfill(await fetched.get(url));
  } catch {
    return route.abort();
  }
}

// ── In the page ─────────────────────────────────────────────────────────

/** Mark the controls a finger can tap on this screen, in reading order, and say what each is. */
function markControls(max) {
  const CONTROL =
    "button, a[href], [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], summary, input[type=checkbox], input[type=radio]";
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // checkVisibility: not inside something shut (a closed details draws nothing, though its
    // links still answer for a place on the page).
    if (!(r.width >= 8 && r.height >= 8 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05 && el.checkVisibility?.() !== false)) return false;
    // A screen reader's own words (a heading kept 1px square, clipped): a link inside one
    // reads 18 by 467 on its own as its words wrap, and no finger meets it (Fable Themes,
    // 2026-11-11, the reading room's featured work).
    for (let q = el; q && q !== document.body; q = q.parentElement) {
      const qs = getComputedStyle(q);
      const b = q.getBoundingClientRect();
      if ((qs.clip && qs.clip !== "auto") || ((qs.overflowX === "hidden" || qs.overflowX === "clip") && (b.width < 8 || b.height < 8))) return false;
    }
    return true;
  };
  const out = [];
  for (const el of document.querySelectorAll("[data-tapwalk]")) el.removeAttribute("data-tapwalk");
  const seen = new Set();
  for (const el of document.querySelectorAll(CONTROL)) {
    if (seen.has(el) || !shown(el)) continue;
    if (el.closest("[inert], [aria-hidden='true']")) continue;
    if (el.matches(":disabled, [aria-disabled='true']")) continue;
    // A control inside another is the outer one's to tap.
    if (el.parentElement?.closest(CONTROL)) continue;
    const href = el.getAttribute("href") || "";
    if (el.tagName === "A") {
      if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) continue;
      if (el.hasAttribute("download")) continue;
      if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) continue;
      if (el.getAttribute("target") === "_blank") continue;
    }
    seen.add(el);
    // innerText is empty for what the browser has not drawn yet (content-visibility: auto), so textContent then.
    const words = (el.getAttribute("aria-label") || el.innerText.trim() || el.textContent || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    out.push({ el, name: `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""}${words ? ` "${words.slice(0, 40)}"` : ""}`, href });
  }
  // Every control is counted, the first `max` in reading order are walked: the record says how many were left.
  const walked = out.slice(0, max);
  walked.forEach((c, i) => c.el.setAttribute("data-tapwalk", String(i)));
  return { found: out.length, controls: walked.map(({ name, href }, i) => ({ i, name, href })) };
}

/** What the page shows and keeps, to tell whether a tap changed anything. */
function snapshot() {
  const h = document.documentElement;
  let kept = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      kept += `${k}=${(localStorage.getItem(k) || "").length};`;
    }
  } catch {}
  return {
    href: location.href,
    y: Math.round(scrollY),
    html: [...h.attributes].map((a) => `${a.name}=${a.value}`).join(" "),
    kept,
    dialogs: document.querySelectorAll("[role=dialog], [aria-modal='true'], dialog[open]").length,
    textLength: (document.body.innerText || "").length,
    nodes: document.getElementsByTagName("*").length,
  };
}

// ── In node ─────────────────────────────────────────────────────────────

async function tapAt(cdp, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/**
 * The screen as it first stands, for every tap: what the device keeps put back as it was
 * when the app first opened, a new document from the front door, and the app's own way to
 * the screen. A soft trip alone left the last tap's sheet or menu open over the next one,
 * which no reader meets: they close it, or it closes as they go.
 */
async function fresh(page, at, kept) {
  await page
    .evaluate((k) => {
      try {
        localStorage.clear();
        for (const [key, value] of k) localStorage.setItem(key, value);
        sessionStorage.clear();
      } catch {}
    }, kept)
    .catch(() => {});
  await page.goto("about:blank");
  await go(page, at, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

/** A still of the screen as the fail left it, the control ringed. */
async function still(page, at, i) {
  const file = path.join(SHOTS, `${at.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home"}-${i}.png`);
  try {
    await page.evaluate((n) => {
      const el = document.querySelector(`[data-tapwalk="${n}"]`);
      if (el) el.style.outline = "3px solid #ff2d55";
    }, i);
    await page.screenshot({ path: file });
    return path.basename(file);
  } catch {
    return null;
  }
}

/** A first touch where no control stands (an edge of the page's own ground), then quiet: no change for 450ms, up to 3s. */
async function firstTouch(page, cdp) {
  const spot = await page.evaluate((controls) => {
    const tries = [[3, 0.5], [387, 0.5], [3, 0.3], [387, 0.3], [3, 0.7], [387, 0.7], [195, 0.5]];
    for (const [x, f] of tries) {
      const y = Math.round(innerHeight * f);
      const hit = document.elementFromPoint(x, y);
      if (hit && !hit.closest(controls) && !hit.closest("input, textarea, select, [contenteditable], [role=dialog], [data-screen-edge]")) return { x, y };
    }
    return null;
  }, "button, a[href], summary, label, [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], [tabindex]:not([tabindex='-1'])");
  if (spot) await tapAt(cdp, spot.x, spot.y);
  await page.evaluate(async () => {
    let n = 0;
    const seen = new MutationObserver((list) => (n += list.length));
    seen.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    const t0 = performance.now();
    let last = -1;
    let quiet = 0;
    while (performance.now() - t0 < 3000 && quiet < 3) {
      await new Promise((r) => setTimeout(r, 150));
      quiet = n === last ? quiet + 1 : 0;
      last = n;
    }
    seen.disconnect();
  });
}

/**
 * Scroll a control into reach and wait until it stands still (two looks 100ms apart within a
 * pixel, up to two seconds). A control whose node the page replaced as it was reached (the same
 * name at the same place in the order, marked again) is found again; "redrawn" when it never
 * stays.
 */
async function reach(page, c) {
  let last = null;
  let still = 0;
  for (let t = 0; t < 20; t++) {
    const now = await page.evaluate((i) => {
      const el = document.querySelector(`[data-tapwalk="${i}"]`);
      if (!el) return null;
      if (!el.dataset.tapwalkReached) {
        el.dataset.tapwalkReached = "1";
        el.scrollIntoView({ block: "center", inline: "center" });
      }
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y };
    }, c.i);
    if (!now) {
      const again = (await page.evaluate(markControls, MAX)).controls;
      if (!again[c.i] || again[c.i].name !== c.name) return "redrawn";
      last = null;
      still = 0;
    } else {
      still = last && Math.abs(now.x - last.x) <= 1 && Math.abs(now.y - last.y) <= 1 ? still + 1 : 0;
      if (still >= 2) return "still";
      last = now;
    }
    await page.waitForTimeout(100);
  }
  return (await page.$(`[data-tapwalk="${c.i}"]`)) ? "moving" : "redrawn";
}

async function walkScreen(ctx, at, kept) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  // A window a tap opens (share, a page in a new window) is a change, and is closed at once.
  page.on("popup", (p) => p.close().catch(() => {}));
  const result = { at, found: 0, controls: [], error: null };
  try {
    await fresh(page, at, kept);
    await page.waitForTimeout(300);
    const marked = await page.evaluate(markControls, MAX);
    const controls = marked.controls;
    result.found = marked.found;
    for (const c of controls) {
      const row = { name: c.name, verdict: "pass", why: [] };
      try {
        await fresh(page, at, kept);
        const again = (await page.evaluate(markControls, MAX)).controls;
        const same = again[c.i];
        if (!same || same.name !== c.name) {
          row.verdict = "skipped";
          row.why.push("the screen drew differently on its second visit");
          result.controls.push(row);
          continue;
        }
        const reached = await reach(page, c);
        if (reached === "redrawn") {
          row.verdict = "skipped";
          row.why.push("the screen kept drawing it again as it was reached");
          result.controls.push(row);
          continue;
        }
        const handle = await page.$(`[data-tapwalk="${c.i}"]`);
        const box = handle && (await handle.boundingBox());
        if (!box) {
          row.verdict = "skipped";
          row.why.push("out of reach");
          result.controls.push(row);
          continue;
        }
        // Where a finger goes: the middle of the control's largest piece. A link that wraps
        // across two lines has a box whose middle lies on the sentence's other words (About's
        // "Support page", 2026-11-11); a reader taps the link's own words.
        const aim = await handle
          .evaluate((el) => {
            const pieces = [...el.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1);
            if (pieces.length < 2) return null;
            const big = pieces.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
            return { x: big.left + big.width / 2, y: big.top + big.height / 2 };
          })
          .catch(() => null);
        const ax = aim ? aim.x : box.x + box.width / 2;
        const ay = aim ? aim.y : box.y + box.height / 2;
        // What the finger meets at the control's middle: the control, or something laid over it
        // (build 93 note 8: a tap that meets something else first). Asked twice, a beat apart,
        // so a page still settling is not mistaken for a cover.
        const meets = () =>
          page.evaluate(
            ({ i, x, y }) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              if (!el) return "redrawn";
              const hit = document.elementFromPoint(x, y);
              if (!hit) return "outside";
              // The control, or something inside it. What holds it (the sentence round a link)
              // is not the control: a finger there is on other words.
              if (el === hit || el.contains(hit)) return null;
              const words = (hit.getAttribute("aria-label") || hit.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
              return `${hit.tagName.toLowerCase()}${words ? ` "${words}"` : ""}`;
            },
            { i: c.i, x: ax, y: ay },
          );
        let cover = await meets();
        if (cover) {
          await page.waitForTimeout(400);
          cover = await meets();
        }
        if (cover === "redrawn" || cover === "outside") {
          // Not a cover: the page drew it again after it stood still, or it stands where no
          // finger reaches once scrolled to.
          row.verdict = "skipped";
          row.why.push(cover === "redrawn" ? "the screen kept drawing it again as it was reached" : "out of reach");
          result.controls.push(row);
          continue;
        }
        if (cover) {
          row.verdict = "fail";
          row.why.push(`covered: the finger meets ${cover} before it`);
          if (SHOTS) row.still = await still(page, at, c.i);
          result.controls.push(row);
          continue;
        }
        // A reader has touched the screen before the control they tap, and a freshly started
        // page does work at its first touch (on the export: <html>'s style let go, its
        // launch mark set again, code loaded into the head). Judged on a first touch, no tap
        // could ever change nothing, which is how the first run's 1,966 taps found no dead
        // control (Fable Theology's find, 2026-11-11). So the page is touched once where no
        // control stands, and let fall quiet, before the tap that is judged.
        await firstTouch(page, cdp);
        const before = await page.evaluate(snapshot);
        // The tab or link for the page it stands on (aria-current, or its own address), read
        // before the tap: a reader at the top of that page taps it and nothing happens, as it should.
        const namesHere = await page
          .evaluate((i) => {
            const el = document.querySelector(`[data-tapwalk="${i}"]`);
            if (!el) return false;
            if (/^(page|true|location)$/.test(el.getAttribute("aria-current") || "")) return true;
            // A choice already made, tapped again: a tab or radio that is chosen, or a chosen chip
            // in a row of chips where only one is chosen (Chants' "All": Fable Themes,
            // 2026-11-11). A lone toggle that is on is not one: tapped, it must go off.
            const role = el.getAttribute("role") || "";
            if (el.getAttribute("aria-selected") === "true" && /^(tab|option|gridcell|row)$/.test(role)) return true;
            if (el.getAttribute("aria-checked") === "true" && /^(radio|menuitemradio)$/.test(role)) return true;
            if (el.matches("input[type=radio]:checked")) return true;
            if (el.getAttribute("aria-pressed") === "true") {
              const group = el.parentElement?.closest("[role=group], [role=radiogroup], [role=toolbar]") ?? el.parentElement?.parentElement ?? el.parentElement;
              if (group && [...group.querySelectorAll("[aria-pressed]")].some((x) => x !== el && x.getAttribute("aria-pressed") === "false")) return true;
            }
            const href = el.getAttribute("href");
            if (!href) return false;
            const u = new URL(href, location.href);
            return u.pathname.replace(/\/$/, "") === location.pathname.replace(/\/$/, "") && !u.hash;
          }, c.i)
          .catch(() => false);
        // Where the reader stands in the history, to tell a step forward from a step back or a
        // changed address (a tab that replaces it), which Back is not asked to undo.
        const step = () => page.evaluate(() => window.navigation?.currentEntry?.index ?? -1).catch(() => -1);
        const stood = await step();
        const wasOpen = await handle.evaluate((el) => el.getAttribute("aria-expanded") === "true" || Boolean(el.closest("details")?.open && el.tagName === "SUMMARY"));
        // Count every change the page makes after the finger lifts.
        await page.evaluate(() => {
          window.__tapwalkChanges = 0;
          // The browser asking for a field left empty (a form's required words) is the tap's answer:
          // its bubble and the field it focuses are no change to the page (Sign in, 2026-11-11).
          window.__tapwalkInvalid = 0;
          if (!window.__tapwalkInvalidHeard) {
            window.__tapwalkInvalidHeard = true;
            document.addEventListener("invalid", () => (window.__tapwalkInvalid += 1), true);
          }
          window.__tapwalkFocusBefore = document.activeElement;
          window.__tapwalkObserver?.disconnect();
          window.__tapwalkObserver = new MutationObserver((list) => {
            window.__tapwalkChanges += list.length;
          });
          window.__tapwalkObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        });
        const x = ax;
        const y = ay;
        // Where the thing under the finger stands: its middle (so a press that shrinks it in
        // place is not a move), on the screen and on the page, and how long the page is.
        const where = () =>
          page
            .evaluate((i) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              if (!el) return null;
              const r = el.getBoundingClientRect();
              let stuck = false;
              for (let q = el; q && q !== document.body && !stuck; q = q.parentElement) stuck = /^(fixed|sticky)$/.test(getComputedStyle(q).position);
              return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, left: r.left, right: r.right, sx: scrollX, sy: scrollY, tall: innerHeight, long: document.documentElement.scrollHeight, stuck };
            }, c.i)
            .catch(() => null);
        const start = await where();
        await tapAt(cdp, x, y);
        // Where it goes while the page stays. Three ways it can move: what stands above it
        // changes (a jump), the page grows too short for where it stood and the browser pulls
        // it up (note 16's 133px on a tablet), or the page is taken somewhere on purpose (a
        // Begin that scrolls to the prayer), which is no jump.
        // The finger feels the screen: a move counts where it is seen there and on the page both
        // (moved on the page alone is a move the browser's scroll anchoring held: "held"; on the
        // screen alone, a scroll). A control that rides something stuck (a bar of tabs) stays at
        // the top while its page goes where it was asked: that is a scroll, not a move.
        let moved = 0;
        let pulled = 0;
        let scrolled = 0;
        let held = 0;
        for (let t = 0; t < 12; t++) {
          await page.waitForTimeout(60);
          const w = await where();
          if (!w || !start || page.url() !== before.href) continue;
          // By its top, middle and foot (and its two sides): one of them still means it grew, or
          // a press scaled it in place, and the finger is on it as before (the prayer book's
          // chapter, whose title grows 48 to 90px as it shuts: Fable Theology, 2026-11-11).
          const least = (a, b, keys) => Math.min(...keys.map((k) => Math.abs(a[k] - b[k])));
          const onScreen = Math.max(least(w, start, ["left", "x", "right"]), least(w, start, ["top", "y", "bottom"]));
          const page_ = (v) => ({ left: v.left + v.sx, x: v.x + v.sx, right: v.right + v.sx, top: v.top + v.sy, y: v.y + v.sy, bottom: v.bottom + v.sy });
          const onPage = Math.max(least(page_(w), page_(start), ["left", "x", "right"]), least(page_(w), page_(start), ["top", "y", "bottom"]));
          const scrolledBy = Math.max(Math.abs(w.sx - start.sx), Math.abs(w.sy - start.sy));
          const atEnd = w.sy + w.tall >= w.long - 2;
          const pulledUp = w.long < start.long && w.sy < start.sy && atEnd;
          if (!(start.stuck && scrolledBy > 4)) {
            moved = Math.max(moved, Math.min(onScreen, onPage));
            if (onScreen <= 4 && scrolledBy > 4) held = Math.max(held, onPage);
          }
          if (pulledUp) pulled = Math.max(pulled, onScreen);
          else scrolled = Math.max(scrolled, onScreen);
        }
        await page.waitForTimeout(700);
        const after = await page.evaluate(snapshot).catch(() => null);
        const changes = await page.evaluate(() => window.__tapwalkChanges ?? 0).catch(() => 0);
        // Focus gone somewhere else (a field opened for words, the browser's own ask): a tap's
        // answer the page's elements do not show. Focus on the tapped control itself is not,
        // since a browser focuses whatever is tapped, the dead control as much as the live one.
        const answered = await page
          .evaluate((i) => {
            const el = document.querySelector(`[data-tapwalk="${i}"]`);
            const now = document.activeElement;
            const moved = now && now !== document.body && now !== document.documentElement && now !== window.__tapwalkFocusBefore && !(el && (el === now || el.contains(now)));
            return Boolean(moved) || (window.__tapwalkInvalid ?? 0) > 0;
          }, c.i)
          .catch(() => false);
        if (!after) {
          row.why.push("the page went away");
          result.controls.push(row);
          continue;
        }
        const navigated = after.href !== before.href;
        const stands = navigated ? await step() : stood;
        if (navigated && stood >= 0 && stands !== stood + 1) {
          // A step back (the app's own Back), or the address changed in place: Back leaves the
          // screen as it should, so it is not held to returning to it.
          row.why.push(`${stands < stood ? "went back" : "changed the address in place"} to ${new URL(after.href).pathname}${new URL(after.href).search}`);
        } else if (navigated) {
          row.why.push(`went to ${new URL(after.href).pathname}`);
          // Back, as a reader takes it, returns to where they were.
          await page.evaluate(() => history.back());
          await page.waitForFunction((h) => location.href === h, before.href, { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(900);
          const back = await page.evaluate(snapshot).catch(() => null);
          // What was tapped, found again by its address: the one nearest where it stood.
          const backAt =
            back && c.href && start
              ? await page
                  .evaluate(
                    ({ href, y }) => {
                      const want = new URL(href, location.href).href;
                      const ys = [...document.querySelectorAll("a[href]")]
                        .filter((a) => a.href === want && a.checkVisibility())
                        .map((a) => {
                          const r = a.getBoundingClientRect();
                          return r.y + r.height / 2;
                        });
                      return ys.length ? Math.round(ys.reduce((best, v) => (Math.abs(v - y) < Math.abs(best - y) ? v : best))) : null;
                    },
                    { href: c.href, y: start.y },
                  )
                  .catch(() => null)
              : null;
          if (!back || back.href !== before.href) {
            row.verdict = "fail";
            row.why.push("back: Back did not return to this screen");
          } else if (backAt !== null && Math.abs(backAt - start.y) > 48) {
            row.verdict = "fail";
            row.why.push(`back: Back returned with what was tapped at ${backAt}px on the screen; it stood at ${Math.round(start.y)}px`);
          } else if (backAt === null && Math.abs(back.y - before.y) > 48) {
            row.verdict = "fail";
            row.why.push(`back: Back returned to ${back.y}px, the reader was at ${before.y}px`);
          }
        } else {
          const opened = await page
            .evaluate((i) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              if (!el) return null;
              const isSummary = el.tagName === "SUMMARY";
              const open = isSummary ? Boolean(el.closest("details")?.open) : el.getAttribute("aria-expanded") === "true";
              if (!open) return { open: false };
              // What opened: the parts it names (the lowest end counts), or a summary's details.
              let parts = isSummary ? [el.closest("details")] : (el.getAttribute("aria-controls") || "").split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean);
              parts = parts.map((p) => p.closest("[data-shown-whole]") || p);
              if (!parts.length) return { open: true, named: false };
              // Left alone on purpose: inside something fixed or stuck, a field, or marked to open in place.
              const still = (n) => {
                for (let q = n; q && q !== document.body; q = q.parentElement) {
                  const pos = getComputedStyle(q).position;
                  if (pos === "fixed" || pos === "sticky") return true;
                  if (q.hasAttribute("data-opens-in-place")) return true;
                }
                return false;
              };
              if (el.matches("[role=combobox], input, textarea") || parts.every(still) || still(el)) return { open: true, leftAlone: true };
              const bars = (edge) =>
                [...document.querySelectorAll(`[data-screen-edge="${edge}"]`)].map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0 && r.bottom > 0 && r.top < innerHeight);
              const floor = Math.min(innerHeight, ...bars("bottom").map((r) => r.top));
              const ceiling = Math.max(0, ...bars("top").map((r) => r.bottom));
              const end = Math.max(...parts.map((p) => p.getBoundingClientRect().bottom));
              const top = el.getBoundingClientRect().top;
              const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
              return { open: true, named: true, end: Math.round(end), floor: Math.round(floor), ceiling: Math.round(ceiling), top: Math.round(top), atEnd, sy: scrollY };
            }, c.i)
            .catch(() => null);
          const turnedOpen = opened?.open && !wasOpen;
          if (turnedOpen && opened.named && !opened.leftAlone) {
            // Words that open above their own control push it down the page, and the place to
            // keep is where the thumb was (lib/ui/showOpened.ts, `tapped`): that place now, the
            // control's top at the tap less how far the page has moved (Fable Themes, 2026-11-11,
            // Community's "Read more").
            const thumb = start ? start.top - (opened.sy - start.sy) : opened.top;
            const shows = opened.end <= opened.floor - 12 + 2 || opened.top <= opened.ceiling + 14 || thumb <= opened.ceiling + 14 || opened.atEnd;
            if (!shows) {
              row.verdict = "fail";
              row.why.push(`under: what it opened ends at ${opened.end}px, under the bar at ${opened.floor}px, and the page did not move with it`);
            }
            if (opened.top < opened.ceiling - 2) {
              row.verdict = "fail";
              row.why.push(`moved: the page carried it under the top bar (${opened.top}px, the bar ends at ${opened.ceiling}px)`);
            }
          } else if (moved > 4) {
            // Not an opening the page follows: the thing under the finger stays put.
            row.verdict = "fail";
            row.why.push(`moved: it moved ${Math.round(moved)}px under the finger, as what stands above it changed`);
          } else if (pulled > 4) {
            row.verdict = "fail";
            row.why.push(`moved: the page grew too short for where it stood, and the browser pulled it ${Math.round(pulled)}px under the finger`);
          } else if (scrolled > 4) {
            row.why.push(`took the page ${Math.round(scrolled)}px, on purpose`);
          }
          if (row.verdict === "pass" && held > 4) {
            row.held = Math.round(held);
            row.why.push(`held: what stands above it moved ${row.held}px, and the browser's scroll anchoring kept it under the finger`);
          }
          const anything = changes > 0 || answered || after.y !== before.y || after.html !== before.html || after.kept !== before.kept || after.dialogs !== before.dialogs;
          if (!anything) {
            if (namesHere) row.why.push("names the page it stands on, or a choice already made: nothing to do");
            else {
              row.verdict = "fail";
              row.why.push("nothing: the tap changed nothing");
            }
          }
          // A check that moved while nothing else did: to look at by eye.
          if (row.verdict === "pass" && after.html === before.html && after.dialogs === before.dialogs && changes > 0 && changes <= 4) {
            const role = await page.evaluate((i) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              return el ? el.getAttribute("role") || el.getAttribute("type") || "" : "";
            }, c.i);
            if (/radio|checkbox|switch/.test(role)) row.look = "its check moved and little else changed: look that the choice took";
          }
        }
      } catch (e) {
        row.verdict = "skipped";
        row.why.push(`the walk could not tap it (${String(e).split("\n")[0].slice(0, 100)})`);
      }
      // A fail allowed by name and reason: every fail line it carries is the allowed kind.
      if (row.verdict === "fail") {
        const fails = row.why.filter((w) => /^(nothing|moved|back|under|covered):/.test(w));
        const grant = ALLOWED.find((a) => a.screens.test(at) && a.control.test(c.name) && fails.every((w) => w.startsWith(`${a.verdict}:`)));
        if (grant) {
          row.verdict = "allowed";
          row.allowed = grant.why;
        }
      }
      if (row.verdict === "fail" && SHOTS) row.still = await still(page, at, c.i);
      result.controls.push(row);
    }
  } catch (e) {
    result.error = String(e).split("\n")[0].slice(0, 160);
  }
  await page.close().catch(() => {});
  return result;
}

const results = [];
let done = 0;
const queue = [...list];
async function worker() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**"]) await ctx.route(at, mainWeb);
  // What the device keeps once the app has first opened: every tap starts from it.
  const first = await ctx.newPage();
  await go(first, "/", { timeout: 30000 });
  await first.waitForTimeout(1500);
  const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
  await first.close();
  for (let at = queue.shift(); at; at = queue.shift()) {
    const r = await walkScreen(ctx, at, kept);
    results.push(r);
    // Each screen's fails as it ends, so an owner can have them before the walk is over.
    for (const c of r.controls.filter((x) => x.verdict === "fail")) console.log(`  FAIL ${at} ${c.name}: ${c.why.filter((w) => /^(nothing|moved|back|under|covered):/.test(w)).join("; ")}`);
    done += 1;
    if (done % 5 === 0) console.log(`  ${done} of ${list.length}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();

results.sort((a, b) => a.at.localeCompare(b.at));
if (SELF_TEST) {
  const missed = [];
  for (const [at, want] of Object.entries(EXPECT)) {
    const c = results.find((r) => r.at === at)?.controls[0];
    const why = c?.why ?? [];
    const ok = c && c.verdict === want.verdict && (!want.why || why.some((w) => want.why.test(w))) && (!want.held || c.held > 4);
    console.log(`  ${ok ? "ok    " : "MISSED"} ${at}: ${c ? `${c.verdict}; ${why.join("; ")}` : "not walked"}`);
    if (!ok) missed.push(at);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log(missed.length ? `\nself-test FAILED: ${missed.join(", ")}` : "\nself-test: every case measured as it should be");
  process.exit(missed.length ? 1 : 0);
}
let tapped = 0;
let failed = 0;
const looks = [];
const helds = [];
const allowed = [];
for (const r of results) {
  const fails = r.controls.filter((c) => c.verdict === "fail");
  tapped += r.controls.filter((c) => c.verdict !== "skipped").length;
  failed += fails.length;
  if (r.error) console.log(`\n${r.at}: not walked (${r.error})`);
  if (fails.length) {
    console.log(`\n${r.at}: ${fails.length} of ${r.controls.length} failed`);
    for (const c of fails) console.log(`  ${c.name}: ${c.why.filter((w) => /^(nothing|moved|back|under|covered):/.test(w)).join("; ")}${c.still ? ` [${c.still}]` : ""}`);
  }
  for (const c of r.controls) if (c.look) looks.push(`${r.at} ${c.name}: ${c.look}`);
  for (const c of r.controls) if (c.held) helds.push(`${r.at} ${c.name}: ${c.held}px`);
  for (const c of r.controls) if (c.allowed) allowed.push(`${r.at} ${c.name}: ${c.why.filter((w) => /^(moved|back|under|covered|nothing):/.test(w)).join("; ")}; allowed: ${c.allowed}`);
}
console.log(`\n${results.length} screens, ${tapped} controls tapped, ${failed} failed`);
const capped = results.filter((r) => r.found > r.controls.length);
if (capped.length) console.log(`more controls than the ${MAX} walked on ${capped.length} screens: ${capped.map((r) => `${r.at} (${r.found})`).join(", ")}`);
if (looks.length) {
  console.log(`\nto look at by eye (${looks.length}):`);
  for (const l of looks) console.log(`  ${l}`);
}
if (allowed.length) {
  console.log(`\nallowed by name and reason (${allowed.length}):`);
  for (const l of allowed) console.log(`  ${l}`);
}
if (helds.length) {
  console.log(`\nheld under the finger by the browser's scroll anchoring alone (${helds.length}): Chrome and the Android app hold these; a browser that does not anchor would let them jump`);
  for (const l of helds) console.log(`  ${l}`);
}
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ screens: results.length, tapped, failed, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit(failed || results.some((r) => r.error) ? 1 : 0);
