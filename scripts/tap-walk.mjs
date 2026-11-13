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
//   sheet      a sheet, a menu or a dialog the tap opened breaks one of the
//              rules checkMock keeps (scripts/mock-check.mjs: contrast and
//              placeholders on the five palettes, 44px to the touch, glyphs,
//              colours that follow the palette, gold, side stripes, mirroring,
//              em dashes, rays, sparkles, empty pictures, dashed boxes, keys,
//              names cut short). What a tap opens is a screen a reader sees,
//              and the guardrail walk, which measures each screen as it loads,
//              never sees it: so each distinct one (its role, its name and the
//              names of the controls in it) is held to the rules once, where
//              it first opens, and what fails is said under the screen and the
//              control that opened it. The gate's part 2 reaches it from its
//              third run (the arbiter, 2026-11-11). A tap that goes to another
//              page is not asked: that page is a screen of its own.
//   hidden     a node of a saint's web, tapped, ends out of sight: not wholly
//              between the top bar's foot and the top of the card it opened
//              (the arbiter, 2026-11-13)
//   cut        a node of a saint's web, tapped, makes its move with an instant
//              cut where the app's motion is on: half its way or more between
//              two frames. The web lifts a node in the house glide (its spring
//              takes a thirtieth of a second of the way at most in a frame, so
//              no frame of a glide carries a fifth of it), and with the app's
//              motion off (<html data-motion="reduce">) it is simply there
// and lists, to be looked at by eye, a choice whose check moved while
// nothing else in the page did (note 3's look that changed nothing): many
// a setting is kept and shown nowhere else, so this is a "look" and not a
// fail. A control that stays under the finger while what stands above it
// moves by more than 4px is tapped again, from the screen as it first stood,
// with the browser's scroll anchoring off on every element, as WebKit has none
// (the arbiter, 2026-11-13): a hold the page makes itself stands then and
// passes ("held by the page itself"); one that leans on the browser moves, and
// fails as "moved". Only one that cannot be tapped again the same way is
// listed as "held": Chrome, and so the Android app, holds it there; a browser
// that does not anchor may let it jump.
//
// A fail the arbiter has allowed by name and reason (ALLOWED below) is listed
// as "allowed" with its reason, never silent. A saint's web lifts the node
// tapped, a saint or a council, above the card it opens, and the walk allows
// that move (the arbiter, 2026-11-11 for a council, 2026-11-13 for every node)
// only while the node, followed frame by frame from the tap until it stands
// still, glides there and ends wholly in sight: "hidden" and "cut" are never
// allowed.
//
// A control is measured once it stands still (a picture arriving, a list the
// page draws again once the main web answers), and a control the page drew
// again as it was reached (a new node with the same name in the same place
// in the order) is found again, so neither is mistaken for a cover.
//
// Never a write anywhere: with no network the shell answers nothing outside
// the bundle; with --online the main web, and the public pictures it keeps in
// its storage (a reader's profile picture), are read (GET) and nothing is sent.
// A link out of the app (another site, mail, a download) is not followed.
//
//   npm run build:android, then:
//   NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs [out dir] [--only /path,/path] [--workers 3] [--max 30] [--json file] [--shots dir] [--online]
//   [--size 800x1280] [--store key=value ...] [--lang ar]: a screen of another size, and what the
//   reader has chosen before the walk (a key the app keeps, the reader's language).
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
// anchoring alone holds it (fails: tapped again with anchoring off, it moves),
// the same with the page scrolling itself back before paint (passes, held by
// the page itself), the same with no anchoring and no hold (a jump), a page
// grown too short at its end (pulled), Back to a page that adds a
// shelf above the reader once it is back (passes) and Back to a page that loses
// the reader's place (fails), a control the page draws again as it is
// reached (found again, and passes), and a sheet that hides a button 24px
// square (fails, where the walk before the sheet measure passed it) beside the
// same sheet with its buttons at 44 (passes), and a node of a saint's web that
// the web lifts above its card: in a glide, ending in sight (allowed); in a
// glide that ends under the card (hidden); in one frame (a cut); and in one
// frame with the app's motion off (allowed). Its page wears no palette of its
// own, so its sheets are held on Dark alone; a screen of the export is held on
// all five.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

import { checkMock } from "./mock-check.mjs";
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
// The screen's size (the arbiter, 2026-11-12): a phone unless --size names another, as a small phone
// (320 wide), a 10-inch Android tablet (800x1280) or the largest iPad (1032x1376); walked as a phone
// is (touch, a mobile viewport).
const SIZE = (flag("--size") ?? "390x844").split("x").map(Number);
if (SIZE.length !== 2 || SIZE.some((n) => !Number.isInteger(n) || n < 300 || n > 3000)) throw new Error("--size takes a width and a height, as 800x1280");
const [WIDTH, HEIGHT] = SIZE;
const ON = WIDTH === 390 && HEIGHT === 844 ? "on a phone" : `at ${WIDTH} by ${HEIGHT}`;
// What the reader has chosen before the walk (the arbiter, 2026-11-12 20:20 UTC: John 1 with the
// interlinear on, Genesis 1's commentary in Arabic). --store key=value sets a key the app keeps, as
// many as named; --lang sets the reader's language as the language row does in the apps: the
// purify_locale cookie, and Capacitor Preferences under the same name, which keeps it in
// localStorage on the web (lib/i18n/switchLocale.ts).
const STORE = [];
for (let at = argv.indexOf("--store"); at >= 0; at = argv.indexOf("--store")) {
  const [k, ...v] = (argv.splice(at, 2)[1] ?? "").split("=");
  if (!k || !v.length) throw new Error("--store takes key=value");
  STORE.push([k, v.join("=")]);
}
const LANG = flag("--lang");
if (LANG) STORE.push(["CapacitorStorage.purify_locale", LANG]);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLINE = argv.includes("--online");
if (ONLINE) argv.splice(argv.indexOf("--online"), 1);
const SELF_TEST = argv.includes("--self-test");
if (SELF_TEST) argv.splice(argv.indexOf("--self-test"), 1);
const OUT = SELF_TEST ? selfTestPage() : path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);
const SELLS_PLUS = !SELF_TEST && SELLS;
checkSells(OUT, SELLS_PLUS);
// How long a part that says it is still filling (aria-busy) is waited for before it is judged: as
// long as lib/ui/showOpened.ts follows one (BUSY_WATCH_MS, held equal by its test), and then up to
// REST_MS for the page to come to rest with what has come.
const BUSY_MS = 12000;
const REST_MS = 4000;

/**
 * A fail allowed by name and reason, the arbiter's to grant: the screens, the control (by its
 * name, `control`, or by what it is, `node`), the verdict it lifts, and why. Printed with its
 * reason on every walk, never silent. An allowance for a `node` holds only while the node, followed
 * frame by frame from the tap (followNode), glides and ends wholly between the top bar's foot and
 * the top of what it opened (`card`); else the walk says "cut" or "hidden", which it never lifts.
 */
const ALLOWED = [
  {
    screens: /^\/saints\/[^/]+\/web\/$/,
    // Every node of a saint's web, a saint or a council (WebConstellation.tsx marks each one), and the
    // card it opens, or the card's handle where the card is tucked away (WebCard.tsx).
    node: "[data-web-node]",
    card: "[data-saint-web-card], [data-saint-web-handle]",
    verdict: "moved",
    why: "a saint's web lifts the node tapped, a saint or a council, above the card it opens, so it stays in sight: the page following what opened, in the house glide and ending wholly in view (the arbiter, 2026-11-11 for a council, 2026-11-13 for every node)",
  },
  ...(SELF_TEST ? [{ screens: /^\/allowed\/$/, control: /^button "Add a note"$/, verdict: "moved", why: "the self-test's own allowance" }] : []),
];

/** The lines that say why a control fails. */
const FAILS = /^(nothing|moved|back|under|covered|sheet|hidden|cut):/;

/**
 * How long a lifted node is followed after the tap at most, and how long it must stand still to be
 * done (once FOLLOW_MIN_MS have passed, so a move that begins late, as the card turns on a loaded
 * machine, is not missed).
 */
const FOLLOW_MS = 4000;
const FOLLOW_MIN_MS = 1200;
const FOLLOW_STILL_MS = 400;
/** A move in one frame of half the way or more is a cut: no frame of the web's glide carries a fifth. */
const CUT_SHARE = 0.5;

/** A sheet, a menu or a dialog: what a tap opens over the screen it stands on. */
const SHEET = "[role=dialog], [role=alertdialog], [aria-modal='true'], dialog[open], [role=menu], [role=listbox]";

/**
 * Each distinct sheet the taps opened, by its role, its name and the names of the controls in
 * it (numbers read alike, so a count in a name is the same sheet): where it first opened, by
 * which control, and what checkMock said of it. Shared by the workers, so each is measured once.
 */
const SHEETS = new Map();

/** What each of the self-test's cases must come to. */
const EXPECT = {
  "/sticky/": { verdict: "pass", why: /^took the page/ },
  "/held/": { verdict: "fail", why: /^moved: tapped again with the browser's scroll anchoring off, as WebKit has none, it moved \d+px/ },
  "/held-self/": { verdict: "pass", why: /^held by the page itself: what stands above it moved \d+px/ },
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
  "/no-snap/": { verdict: "pass" },
  "/aim-after/": { verdict: "pass" },
  "/far-below/": { verdict: "pass" },
  "/wrapped/": { verdict: "pass", why: /^went to \/other\// },
  "/required/": { verdict: "pass" },
  "/sheet-small/": { verdict: "fail", why: /^sheet: dialog "Share": target: button "Close": 24 by 24px/ },
  "/sheet-fine/": { verdict: "pass", why: /^opened dialog "Keep", held to checkMock's rules: nothing failed/ },
  "/sheet-plays/": { verdict: "pass", why: /^dialog "Atlas" plays itself: paused by its own Pause/ },
  "/late-follow/": { verdict: "pass" },
  "/slow-reply/": { verdict: "pass" },
  "/not-followed/": { verdict: "fail", why: /^under: what it opened ends at/ },
  "/saints/glide/web/": { verdict: "allowed", why: /^kept in sight: glided/ },
  "/saints/hidden/web/": { verdict: "fail", why: /^hidden: it ends at/ },
  "/saints/cut/web/": { verdict: "fail", why: /^cut: \d+ of its \d+px in one frame/ },
  "/saints/motion-off/web/": { verdict: "allowed", why: /^kept in sight: moved at once, the app's motion off/ },
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
} else if (at === "/held-self/") {
  // As the prayer book's chapters: what stands above the control is taken away as it is tapped, and
  // the page scrolls itself back before paint, so the control stays under the finger with no help
  // from the browser's scroll anchoring.
  m.append(block(700, "top"), block(600), button("Choose", (b) => {
    const was = b.getBoundingClientRect().top;
    document.getElementById("top")?.remove();
    b.textContent = "Chosen";
    scrollBy(0, b.getBoundingClientRect().top - was);
  }), block(2000));
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
} else if (at === "/no-snap/") {
  // As on Sign up: an agreement box with a 44px reach round it (a span inside its label, drawn
  // out past the box by a negative margin) that ends 7px in from the screen's edge, halfway
  // down. A touch at that edge is carried onto the reach by the browser's touch adjustment and
  // ticks the box; the reminder above it then has nothing left to remind.
  const y = Math.round(innerHeight * 0.5);
  const remind = button("Remind me", () => { if (!document.getElementById("agree").checked) document.body.append(Object.assign(document.createElement("div"), { role: "dialog", textContent: "Tick the box to agree" })); });
  const row = document.createElement("label");
  row.style.cssText = "position:absolute;left:23px;top:" + (y - 25) + "px;width:346px;height:21px;display:flex;align-items:flex-start;gap:10px";
  const reach = document.createElement("span");
  reach.style.cssText = "margin:-13px;display:inline-flex;width:44px;height:44px;flex-shrink:0;align-items:center;justify-content:center";
  const box = document.createElement("input"); box.type = "checkbox"; box.id = "agree"; box.style.cssText = "width:18px;height:18px;margin:0";
  reach.append(box);
  row.append(reach, Object.assign(document.createElement("span"), { textContent: "I agree" }));
  m.append(block(120), remind, block(1800));
  document.body.append(row);
} else if (at === "/aim-after/") {
  // As on Sign up: a link near the foot of a page whose height does not change, under a line
  // the page takes away at the reader's first touch (Sign up's "agree first" hint), with scroll
  // anchoring held off until that touch, as the app holds it. Aimed before the first touch,
  // the tap falls where the link was, 40px under where it is.
  document.documentElement.style.overflowAnchor = "none";
  addEventListener("touchstart", () => { document.getElementById("hint")?.remove(); document.documentElement.style.removeProperty("overflow-anchor"); }, { once: true, passive: true });
  const sheet = document.createElement("div"); sheet.style.height = "1100px";
  // The link opens its page in a sheet, as Sign up's legal links do.
  const a = document.createElement("a"); a.href = "/terms/"; a.textContent = "terms of service"; a.style.cssText = "display:inline;width:auto;min-height:0;margin:0;font:16px sans-serif";
  a.onclick = (e) => { e.preventDefault(); document.body.append(Object.assign(document.createElement("div"), { role: "dialog", textContent: "The terms" })); };
  const line = document.createElement("p"); line.style.margin = "0 16px"; line.append("I agree to the ", a, ".");
  sheet.append(block(900), block(40, "hint"), line);
  m.append(sheet);
} else if (at === "/far-below/") {
  // As Community's feed: rows drawn only as they come into sight, each standing at a guessed
  // height until then (content-visibility), under a bar that stays at the top; the place is held
  // by the browser only from the reader's first touch, as the app holds it.
  document.documentElement.style.overflowAnchor = "none";
  addEventListener("touchstart", () => document.documentElement.style.removeProperty("overflow-anchor"), { once: true, passive: true });
  const bar = document.createElement("div"); bar.className = "bar"; bar.style.height = "52px"; bar.style.zIndex = "30";
  m.append(bar);
  for (let n = 0; n < 60; n++) {
    // Its own height comes from what is in it, so the guess stands until it is drawn.
    const row = document.createElement("div"); row.style.contentVisibility = "auto"; row.style.containIntrinsicSize = "auto 600px";
    row.append(block(150));
    if (n === 50) row.append(button("Post options", () => document.body.append(Object.assign(document.createElement("div"), { role: "dialog", textContent: "Options" }))));
    m.append(row);
  }
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
} else if (at === "/sheet-small/" || at === "/sheet-fine/") {
  // A sheet that rises from the foot over the screen, as Share and the post menus do: on
  // /sheet-small/ its Close is 24px square, which no finger is sure of; on /sheet-fine/ it is 44.
  const small = at === "/sheet-small/";
  const open = button(small ? "Share" : "Keep", () => {
    const sheet = document.createElement("div");
    sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", small ? "Share" : "Keep");
    sheet.style.cssText = "position:fixed;left:0;right:0;bottom:0;padding:16px 0;background:#fff;color:#000";
    const close = document.createElement("button"); close.type = "button"; close.setAttribute("aria-label", "Close");
    close.style.cssText = small ? "width:24px;height:24px;min-height:0;margin:0 16px;padding:0" : "width:44px;height:44px;margin:0 16px;padding:0";
    close.onclick = () => sheet.remove();
    sheet.append(close, button(small ? "Copy the link" : "Keep it", () => sheet.remove()));
    document.body.append(sheet);
  });
  m.append(block(300), open, block(1200));
} else if (at === "/sheet-plays/") {
  // A sheet that plays itself, as the councils' atlas runs through the years, with its own Pause.
  m.append(block(300), button("Atlas", () => {
    const sheet = document.createElement("div");
    sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Atlas");
    sheet.style.cssText = "position:fixed;left:0;right:0;bottom:0;padding:16px 0;background:#fff;color:#000";
    const year = document.createElement("p"); year.style.margin = "0 16px"; year.textContent = "325";
    let y = 325;
    const run = setInterval(() => (year.textContent = String((y += 1))), 150);
    sheet.append(year, button("Pause", () => clearInterval(run)));
    document.body.append(sheet);
  }), block(1200));
} else if (at === "/late-follow/" || at === "/slow-reply/" || at === "/not-followed/") {
  // As Community's "1 reply": the thread opens on a row that waits (aria-busy), the reply lands
  // over a second later and takes the thread's end far under the bar at the foot, and the page
  // follows it a little each frame until the end stands 12px clear of the bar, as
  // lib/ui/showOpened.ts does with a long reply (a walk that judges at a fixed moment reads it half
  // way); or, in the other case, it does not follow at all. The slow reply lands nearly five seconds
  // on, as one from the website did on a loaded machine, and is followed as the late one is: the
  // walk's 1.4 to 3s of looks after the tap and a flat 4s wait read it half way through its glide.
  const bar = document.createElement("div"); bar.setAttribute("data-screen-edge", "bottom");
  bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:84px;background:#eee";
  document.body.append(bar);
  const thread = document.createElement("div"); thread.id = "thread";
  const open = button("1 reply", (b) => {
    if (b.getAttribute("aria-expanded") === "true") { b.setAttribute("aria-expanded", "false"); thread.replaceChildren(); return; }
    b.setAttribute("aria-expanded", "true");
    const wait = document.createElement("div"); wait.setAttribute("aria-busy", "true"); wait.style.height = "60px";
    thread.replaceChildren(wait);
    setTimeout(() => {
      thread.replaceChildren(block(700));
      if (at === "/not-followed/") return;
      const step = () => {
        const owed = thread.getBoundingClientRect().bottom - (bar.getBoundingClientRect().top - 12);
        if (owed <= 0.5) return;
        scrollBy(0, Math.min(owed, 3));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, at === "/slow-reply/" ? 4800 : 1300);
  });
  open.setAttribute("aria-expanded", "false"); open.setAttribute("aria-controls", "thread");
  m.append(block(300), open, thread, block(1500));
} else if (/^\\/saints\\/(glide|hidden|cut|motion-off)\\/web\\/$/.test(at)) {
  // As a saint's web: a bar at the top, the card at the foot (its top at 584px on the phone), and a
  // node the web lifts when it is tapped. Glide and hidden move it on the web's own spring
  // (lib/saints/webMotion.ts: MOTION.middle, a 240th of a second a step, a thirtieth at most in a
  // frame), 150px up to stand in sight, or 190px down to end with its foot under the card; cut puts
  // it 150px up between two frames; motion-off does the same with the app's motion off, as the
  // web does then (settleFrame).
  const how = at.split("/")[2];
  if (how === "motion-off") document.documentElement.dataset.motion = "reduce";
  const top = document.createElement("div"); top.setAttribute("data-screen-edge", "top");
  top.style.cssText = "position:fixed;left:0;right:0;top:0;height:56px;background:#eee;z-index:2";
  const card = document.createElement("section"); card.setAttribute("data-saint-web-card", ""); card.setAttribute("aria-label", "St Ignatius");
  card.style.cssText = "position:fixed;left:12px;right:12px;bottom:0;height:260px;background:#ddd;z-index:2";
  const node = button("St Ignatius, Antioch, 107", (b) => {
    b.setAttribute("aria-pressed", "true");
    const from = parseFloat(b.style.top);
    const dy = how === "hidden" ? 190 : -150;
    if (how === "cut" || how === "motion-off") return requestAnimationFrame(() => (b.style.top = from + dy + "px"));
    const k = 200, c = 2 * 0.95 * Math.sqrt(k), STEP = 1 / 240;
    let p = 0, v = 0, last = performance.now();
    const frame = (now) => {
      const steps = Math.max(1, Math.min(8, Math.round(Math.min((now - last) / 1000, 1 / 30) / STEP)));
      last = now;
      for (let s = 0; s < steps; s++) { v += (k * (1 - p) - c * v) * STEP; p += v * STEP; }
      const done = Math.abs(1 - p) < 0.002 && Math.abs(v) < 0.02;
      b.style.top = from + dy * (done ? 1 : p) + "px";
      if (!done) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  node.setAttribute("data-web-node", "0"); node.setAttribute("aria-pressed", "false");
  node.style.cssText = "position:absolute;left:0;top:400px";
  document.body.append(top, card, node);
  m.append(block(1200));
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
console.log(`${list.length} screens ${ON}, up to ${MAX} controls each, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${readerWords(SELLS_PLUS)}${STORE.length ? `, the reader having chosen ${STORE.map(([k, v]) => `${k}=${v}`).join(", ")}` : ""}`);

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

/**
 * The sheets, menus and dialogs on the screen: before the tap (`before`), each is marked
 * data-tapwalk-pre; after it, those not so marked are what the tap opened: the outermost of
 * each, marked data-tapwalk-sheet with its number, which is returned. On the screen: drawn, not
 * see-through, and some of it in the window.
 */
function newSheets({ sheet, before }) {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width >= 8 && r.height >= 8 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  if (before) {
    for (const el of document.querySelectorAll(sheet)) if (shown(el)) el.setAttribute("data-tapwalk-pre", "");
    return [];
  }
  const open = [...document.querySelectorAll(sheet)].filter((el) => !el.hasAttribute("data-tapwalk-pre") && shown(el));
  const outer = open.filter((el) => !open.some((o) => o !== el && o.contains(el)));
  outer.forEach((el, n) => el.setAttribute("data-tapwalk-sheet", String(n)));
  return outer.map((_, n) => n);
}

/**
 * A sheet the tap opened, once it has settled: its role, its name, and what makes it the same
 * sheet wherever it opens.
 */
function describeSheet(n) {
  const el = document.querySelector(`[data-tapwalk-sheet="${n}"]`);
  if (!el) return null;
  const words = (x) => (x.getAttribute("aria-label") || x.innerText || x.textContent || "").replace(/\s+/g, " ").trim();
  const by = (el.getAttribute("aria-labelledby") || "")
    .split(/\s+/)
    .map((id) => (id ? document.getElementById(id)?.innerText || "" : ""))
    .join(" ")
    .trim();
  const heading = el.querySelector("h1, h2, h3, [role=heading]");
  const name = (el.getAttribute("aria-label") || by || (heading ? words(heading) : "") || words(el)).replace(/\s+/g, " ").trim().slice(0, 40);
  const role = el.getAttribute("role") || "dialog";
  // Its frame: the first eight controls in it. What a sheet suggests below them changes with
  // the screen it opened from (Search offers the prayer book's parts on Prayers and the day's
  // readings on Settings), and that is still the one sheet.
  const controls = [...el.querySelectorAll("button, a[href], [role=button], [role=link], [role=menuitem], [role=option], [role=tab], [role=radio], [role=checkbox], [role=switch], input, select, textarea")]
    .slice(0, 8)
    // Which of them is chosen, too: the Search sheet opened from Saints, with Saints chosen and the
    // kinds counted, draws itself otherwise than the one from a page that searches everything (the
    // arbiter, 2026-11-12), and was measured only as that one.
    .map((x) => words(x).slice(0, 24) + (["aria-pressed", "aria-selected", "aria-checked"].some((a) => x.getAttribute(a) === "true") || (x.getAttribute("aria-current") ?? "false") !== "false" ? "*" : ""));
  return { n, role, name, controls, key: `${role}\u0000${name}\u0000${controls.join("|")}`.replace(/\d+/g, "#") };
}

/**
 * A node of a saint's web, about to be tapped, followed on every frame from now until it has stood
 * still for `stillMs` once `minMs` have passed, or for `ms` in all: where its middle stood on the
 * screen at each frame (what the finger and the eye follow), and whether the app's motion was off
 * as the tap came (the attribute the app keeps on <html> from the same answer its motion reads,
 * lib/ui/motion.ts; a page with no such attribute, by the browser's own setting). Nothing is
 * written into the page: the walk counts every change to its elements after the tap.
 */
function followNode({ i, ms, minMs, stillMs }) {
  const el = document.querySelector(`[data-tapwalk="${i}"]`);
  if (!el) return false;
  const at = () => {
    const r = el.getBoundingClientRect();
    return { t: performance.now(), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const first = at();
  const said = document.documentElement.getAttribute("data-motion");
  const follow = { frames: [first], done: false, off: said ? said === "reduce" : matchMedia("(prefers-reduced-motion: reduce)").matches };
  window.__tapwalkFollow = follow;
  let moved = first.t;
  const look = () => {
    if (window.__tapwalkFollow !== follow) return;
    const now = at();
    const last = follow.frames[follow.frames.length - 1];
    if (Math.hypot(now.x - last.x, now.y - last.y) > 0.5) moved = now.t;
    follow.frames.push(now);
    if ((now.t - first.t >= minMs && now.t - moved >= stillMs) || now.t - first.t >= ms) follow.done = true;
    else requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
  return true;
}

/**
 * Where a node tapped on a saint's web ends, once it and what stands round it are still (three looks
 * 60ms apart within half a pixel, up to 2s): its top and foot on the screen, the top bar's foot (the
 * lowest foot of what stands at the screen's top edge, as lib/ui/readingPlace.ts reads the band the
 * web lifts a node into), and the top of the card it opened (`card`: whichever is drawn, the card
 * or, tucked away, its handle) or of what stands at the screen's foot, or the screen's own foot.
 */
async function nodeEnds({ i, card }) {
  const el = document.querySelector(`[data-tapwalk="${i}"]`);
  if (!el) return null;
  const drawn = (x) => {
    const r = x.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && !x.closest("[inert]") && x.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const read = () => {
    const r = el.getBoundingClientRect();
    const feet = [...document.querySelectorAll('[data-screen-edge="top"]')].filter(drawn).map((x) => x.getBoundingClientRect().bottom);
    const tops = [...document.querySelectorAll(`${card}, [data-screen-edge="bottom"]`)].filter(drawn).map((x) => x.getBoundingClientRect().top);
    return { top: r.top, bottom: r.bottom, ceiling: Math.max(0, ...feet), floor: Math.min(innerHeight, ...tops) };
  };
  let last = read();
  let same = 0;
  const t0 = performance.now();
  while (same < 3 && performance.now() - t0 < 2000) {
    await new Promise((r) => setTimeout(r, 60));
    const now = read();
    same = Object.keys(now).every((k) => Math.abs(now[k] - last[k]) <= 0.5) ? same + 1 : 0;
    last = now;
  }
  return last;
}

// ── In node ─────────────────────────────────────────────────────────────

/**
 * A lifted node's move, from the frames followNode kept: how far it went from where the finger
 * found it, its largest step between two frames, in how many frames it moved and over how long.
 */
function liftOf(follow) {
  const f = follow.frames;
  let far = 0;
  let step = 0;
  let moving = 0;
  let from = null;
  let to = null;
  for (let k = 1; k < f.length; k++) {
    const d = Math.hypot(f[k].x - f[k - 1].x, f[k].y - f[k - 1].y);
    if (d > 0.5) {
      moving += 1;
      from ??= f[k - 1].t;
      to = f[k].t;
    }
    step = Math.max(step, d);
    far = Math.max(far, Math.hypot(f[k].x - f[0].x, f[k].y - f[0].y));
  }
  return { far, step, moving, ms: from === null ? 0 : to - from, off: follow.off, done: follow.done };
}

async function tapAt(cdp, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/**
 * Where a finger goes on a control: the middle of its largest piece. A link that wraps across two
 * lines has a box whose middle lies on the sentence's other words (About's "Support page",
 * 2026-11-11); a reader taps the link's own words.
 */
async function aimOf(handle, box) {
  const aim = await handle
    .evaluate((el) => {
      const pieces = [...el.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1);
      if (pieces.length < 2) return null;
      const big = pieces.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
      return { x: big.left + big.width / 2, y: big.top + big.height / 2 };
    })
    .catch(() => null);
  return aim ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Where the thing under the finger stands: its middle (so a press that shrinks it in place is not
 * a move), on the screen and on the page, how long the page is, and whether it rides something
 * fixed or stuck.
 */
function whereIs(page, i) {
  return page
    .evaluate((i) => {
      const el = document.querySelector(`[data-tapwalk="${i}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      let stuck = false;
      for (let q = el; q && q !== document.body && !stuck; q = q.parentElement) stuck = /^(fixed|sticky)$/.test(getComputedStyle(q).position);
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, left: r.left, right: r.right, sx: scrollX, sy: scrollY, tall: innerHeight, long: document.documentElement.scrollHeight, stuck };
    }, i)
    .catch(() => null);
}

/**
 * Where the thing under the finger goes after the tap, in twelve looks 60ms apart while the page
 * stays at `href`. Three ways it can move: what stands above it changes (a jump), the page grows too
 * short for where it stood and the browser pulls it up (note 16's 133px on a tablet), or the page is
 * taken somewhere on purpose (a Begin that scrolls to the prayer), which is no jump.
 * The finger feels the screen: a move counts where it is seen there and on the page both (moved on
 * the page alone is a move something held: "held"; on the screen alone, a scroll). A control that
 * rides something stuck (a bar of tabs) stays at the top while its page goes where it was asked:
 * that is a scroll, not a move.
 */
async function followMove(page, href, start, i) {
  let moved = 0;
  let pulled = 0;
  let scrolled = 0;
  let held = 0;
  for (let t = 0; t < 12; t++) {
    await page.waitForTimeout(60);
    const w = await whereIs(page, i);
    if (!w || !start || page.url() !== href) continue;
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
  return { moved, pulled, scrolled, held };
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

/**
 * A first touch, then quiet: no change for 450ms, up to 3s. The touch goes where no control,
 * label or field stands within 48px: a browser carries a touch beside a control onto it (its
 * touch adjustment), and the first walk's edge touch ticked Sign up's agreement box that way.
 * Where no such place is on the screen, the page is told of a touch without one (the events a
 * first touch sends), which is all its first-touch work listens for.
 */
async function firstTouch(page, cdp) {
  const spot = await page.evaluate((controls) => {
    const near = [...document.querySelectorAll(controls)]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && r.bottom > -48 && r.top < innerHeight + 48);
    const clear = (x, y) => near.every((r) => x < r.left - 48 || x > r.right + 48 || y < r.top - 48 || y > r.bottom + 48);
    for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      for (const x of [3, innerWidth - 3, Math.round(innerWidth / 2)]) {
        const y = Math.round(innerHeight * f);
        const hit = document.elementFromPoint(x, y);
        if (hit && !hit.closest(controls) && !hit.closest("[role=dialog], [data-screen-edge]") && clear(x, y)) return { x, y };
      }
    }
    return null;
  }, "button, a[href], summary, label, input, textarea, select, [contenteditable], [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], [tabindex]:not([tabindex='-1'])");
  if (spot) await tapAt(cdp, spot.x, spot.y);
  else {
    await page.evaluate(() => {
      const at = document.body;
      for (const type of ["pointerdown", "pointerup"]) at.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "touch", isPrimary: true }));
      try {
        const t = new Touch({ identifier: 1, target: at, clientX: 1, clientY: 1 });
        at.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [t], changedTouches: [t] }));
        at.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t] }));
      } catch {}
    });
  }
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

/**
 * A control that stayed under the finger while what stands above it moved, tapped again from the
 * screen as it first stood, with the browser's scroll anchoring off on every element, as WebKit has
 * none (the arbiter, 2026-11-13: the prayer book scrolls itself back before paint, and the walk had
 * counted that as the browser's hold, fail 6 of the final check): how it moves then. Null where it
 * cannot be tapped again the same way.
 */
async function anchorless(page, cdp, at, kept, c) {
  await fresh(page, at, kept);
  const off = await page
    .evaluate(() => {
      const s = document.createElement("style");
      s.textContent = "*, *::before, *::after { overflow-anchor: none !important; }";
      document.head.append(s);
      return [document.documentElement, document.body].every((el) => getComputedStyle(el).overflowAnchor === "none");
    })
    .catch(() => false);
  if (!off) return null;
  const again = (await page.evaluate(markControls, MAX)).controls;
  if (!again[c.i] || again[c.i].name !== c.name) return null;
  await firstTouch(page, cdp);
  if ((await reach(page, c)) === "redrawn") return null;
  const handle = await page.$(`[data-tapwalk="${c.i}"]`);
  const box = handle && (await handle.boundingBox());
  if (!box) return null;
  const { x, y } = await aimOf(handle, box);
  const href = page.url();
  const start = await whereIs(page, c.i);
  await tapAt(cdp, x, y);
  return followMove(page, href, start, c.i);
}

/**
 * What the tap opened (a sheet, a menu, a dialog), held to checkMock's rules: each distinct one
 * once, where it first opens, its fails said on the row of the control that opened it. Each is
 * let settle first, and the page is put back where it stood after, for the measures that follow.
 */
async function measureSheets(page, row, at, c) {
  const opened = await page.evaluate(newSheets, { sheet: SHEET, before: false }).catch(() => []);
  for (const n of opened) {
    // Settled first: a sheet that fetches what it shows (a reader's profile) is named and measured
    // once it has it, not as it arrives (no change in it for 450ms, up to 4s), and its entrance
    // played out (a sheet measured as it rises reads fainter than it ends). A sheet that plays
    // itself (the councils' atlas runs through the years) never falls quiet: it is paused by its
    // own Pause, as a reader who stops to read it would, and let settle again, so each palette is
    // measured on the same frame.
    const settle = (k) =>
      page
        .evaluate(async (k) => {
          const el = document.querySelector(`[data-tapwalk-sheet="${k}"]`);
          if (!el) return true;
          let changes = 0;
          const seen = new MutationObserver((list) => (changes += list.length));
          seen.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
          const t0 = performance.now();
          let last = -1;
          let quiet = 0;
          while (performance.now() - t0 < 4000 && quiet < 3) {
            await new Promise((r) => setTimeout(r, 150));
            quiet = changes === last ? quiet + 1 : 0;
            last = changes;
          }
          seen.disconnect();
          const ends = el
            .getAnimations({ subtree: true })
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {}));
          await Promise.race([Promise.all(ends), new Promise((r) => setTimeout(r, 2500))]);
          return quiet >= 3;
        }, k)
        .catch(() => true);
    let paused = false;
    if (!(await settle(n))) {
      paused = await page
        .evaluate((k) => {
          const el = document.querySelector(`[data-tapwalk-sheet="${k}"]`);
          const pause = [...(el?.querySelectorAll("button, [role=button]") ?? [])].find((b) => /^pause\b/i.test((b.getAttribute("aria-label") || b.textContent || "").trim()));
          if (!pause) return false;
          pause.click();
          return true;
        }, n)
        .catch(() => false);
      if (paused) await settle(n);
    }
    const s = await page.evaluate(describeSheet, n).catch(() => null);
    if (!s) continue;
    const said = `${s.role} "${s.name}"`;
    if (paused) row.why.push(`${said} plays itself: paused by its own Pause to be measured`);
    const first = SHEETS.get(s.key);
    if (first) {
      row.why.push(`opened ${said}, held to checkMock's rules where it first opened (${first.at} ${first.opener})`);
      continue;
    }
    const sheet = { at, opener: c.name, said, controls: s.controls, lines: [], unmeasured: [], allowed: [], looks: [] };
    SHEETS.set(s.key, sheet);
    const stood = await page.evaluate(() => [scrollX, scrollY]).catch(() => null);
    try {
      // The self-test's page wears no palette of its own, so it is held on Dark alone. Words over a
      // picture are measured on the pixels under their letters (checkMock's pixels pass).
      const r = await checkMock(page, `[data-tapwalk-sheet="${s.n}"]`, { pixels: true, ...(SELF_TEST ? { palettes: [["Dark", null]] } : {}) });
      // One line per piece and rule: contrast with its palettes together, at its worst.
      const ratio = (d) => Number(/^([\d.]+):1/.exec(d)?.[1] ?? Infinity);
      const lines = new Map();
      for (const f of r.failures) {
        const measured = f.check === "contrast" || f.check === "placeholder";
        const key = `${f.check}\u0000${f.what}\u0000${measured ? "" : f.detail}`;
        const line = lines.get(key) ?? { ...f, palettes: [] };
        if (measured && ratio(f.detail) < ratio(line.detail)) line.detail = f.detail;
        if (f.palette && !line.palettes.includes(f.palette)) line.palettes.push(f.palette);
        lines.set(key, line);
      }
      sheet.lines = [...lines.values()].map((f) => `${f.check}${f.palettes.length ? ` [${f.palettes.join(", ")}]` : ""}: ${f.what}: ${f.detail}`);
      sheet.unmeasured = r.unmeasured;
      sheet.allowed = r.allowed;
      sheet.looks = r.looks;
      // A word over a picture with no pixels to read is left for the eye: its still, beside the fails'.
      if (SHOTS) {
        for (const l of r.looks.filter((x) => x.left)) {
          const file = path.join(SHOTS, `look-${at.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home"}-${c.i}-${l.at}.png`);
          const el = page.locator(`[data-mock-look="${l.at}"]`).first();
          l.still = (await el.screenshot({ path: file }).then(() => path.basename(file)).catch(() => null)) ?? undefined;
        }
      }
    } catch (e) {
      sheet.unmeasured.push(`not measured: ${String(e).split("\n")[0].slice(0, 120)}`);
    }
    if (stood) await page.evaluate(([x, y]) => scrollTo(x, y), stood).catch(() => {});
    if (sheet.lines.length) {
      row.verdict = "fail";
      for (const l of sheet.lines) row.why.push(`sheet: ${said}: ${l}`);
    } else if (sheet.unmeasured.some((u) => u.startsWith("not measured:"))) row.why.push(`opened ${said}, which could not be held to checkMock's rules (${sheet.unmeasured[0]})`);
    else row.why.push(`opened ${said}, held to checkMock's rules: nothing failed`);
  }
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
        // The page's first touch, before the control is reached, measured or aimed at, as a reader's
        // finger is on the screen before it scrolls anywhere. It can move the page (on Sign up the
        // walk's old aim, taken before it, fell on the sentence round a link), and the app keeps
        // the browser from holding a reader's place until it comes (lib/ui/scrollReset.ts): reached
        // before it, a control far down Community's feed rose under the top bar as the posts on
        // the way drew at their own height, which no reader scrolling there meets.
        await firstTouch(page, cdp);
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
        const { x: ax, y: ay } = await aimOf(handle, box);
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
        // The sheets already on the screen, so what the tap opens is told from them.
        await page.evaluate(newSheets, { sheet: SHEET, before: true });
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
          // A box or a choice ticked by the tap changes its own state, not the page's elements.
          window.__tapwalkCheckedBefore = [...document.querySelectorAll("input[type=checkbox], input[type=radio]")].map((i) => i.checked).join("");
          window.__tapwalkObserver?.disconnect();
          window.__tapwalkObserver = new MutationObserver((list) => {
            window.__tapwalkChanges += list.length;
          });
          window.__tapwalkObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        });
        // A node of a saint's web, by the allowance that names it (the arbiter, 2026-11-13): followed
        // frame by frame from just before the tap until it stands still, to tell the house glide from
        // a cut and to find where it ends.
        const lift = ALLOWED.find((a) => a.node && a.screens.test(at));
        if (lift && (await handle.evaluate((el, sel) => el.matches(sel), lift.node).catch(() => false))) row.node = true;
        const start = await whereIs(page, c.i);
        if (row.node) await page.evaluate(followNode, { i: c.i, ms: FOLLOW_MS, minMs: FOLLOW_MIN_MS, stillMs: FOLLOW_STILL_MS });
        await tapAt(cdp, ax, ay);
        const { moved, pulled, scrolled, held } = await followMove(page, before.href, start, c.i);
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
            // Read only on the page the tap began on: a page the tap loaded anew has no "before".
            const ticked = window.__tapwalkCheckedBefore !== undefined && [...document.querySelectorAll("input[type=checkbox], input[type=radio]")].map((i) => i.checked).join("") !== window.__tapwalkCheckedBefore;
            return Boolean(moved) || ticked || (window.__tapwalkInvalid ?? 0) > 0;
          }, c.i)
          .catch(() => false);
        if (!after) {
          row.why.push("the page went away");
          result.controls.push(row);
          continue;
        }
        const navigated = after.href !== before.href;
        const stands = navigated ? await step() : stood;
        // A sheet the address carries (the same page, a new query or mark) is the tap's to say;
        // a tap that went to another page, or back, opened a screen of its own.
        const samePage = new URL(after.href).pathname === new URL(before.href).pathname;
        if (navigated && stood >= 0 && stands !== stood + 1) {
          // A step back (the app's own Back), or the address changed in place: Back leaves the
          // screen as it should, so it is not held to returning to it.
          row.why.push(`${stands < stood ? "went back" : "changed the address in place"} to ${new URL(after.href).pathname}${new URL(after.href).search}`);
          if (samePage && stands >= stood) await measureSheets(page, row, at, c);
        } else if (navigated) {
          row.why.push(`went to ${new URL(after.href).pathname}`);
          // Measured before Back, which shuts what the address opened.
          if (samePage) await measureSheets(page, row, at, c);
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
          // What opened is judged once it has arrived and the page has come to rest with it. A part
          // still filling (aria-busy) is waited for, and a page still gliding after what opened is
          // not judged half way: lib/ui/showOpened.ts follows what lands late, a reply from the
          // website a second after the tap, in a glide of about a fifth of a second. Read at a fixed
          // moment, Community's "1 reply" was caught at 752px, a frame of the glide that ends at
          // 748 with the bar at 761, and failed (the gate's final check, 2026-11-12). A filling part
          // is waited for as long as the page follows one (BUSY_MS), then up to REST_MS for rest: a
          // flat 4s read "4 replies", which came from the website after 4s on a loaded machine, at
          // 1377px, a frame of the glide that brings its control to 63px (2026-11-12, 23:24 UTC;
          // the replies held back 4.2s show the same frame at 1380).
          await page
            .evaluate(() => {
              const now = performance.now();
              window.__tapwalkRest = { at: null, n: 0, start: now, since: now };
            })
            .catch(() => {});
          await page
            .waitForFunction(
              ({ i, busyMs, restMs }) => {
                const rest = window.__tapwalkRest;
                const el = document.querySelector(`[data-tapwalk="${i}"]`);
                if (!el || !rest) return true;
                const now = performance.now();
                const parts = el.tagName === "SUMMARY" ? [el.closest("details")].filter(Boolean) : (el.getAttribute("aria-controls") || "").split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean);
                if (parts.some((p) => p.matches('[aria-busy="true"]') || p.querySelector('[aria-busy="true"]'))) {
                  rest.at = null;
                  rest.n = 0;
                  rest.since = now;
                  // The page stops following it then, and the walk judges what that leaves.
                  return now - rest.start >= busyMs;
                }
                const at = `${Math.round(scrollY)} ${parts.map((p) => Math.round(p.getBoundingClientRect().bottom)).join(" ")}`;
                rest.n = rest.at === at ? rest.n + 1 : 0;
                rest.at = at;
                return rest.n >= 3 || now - rest.since >= restMs;
              },
              { i: c.i, busyMs: BUSY_MS, restMs: REST_MS },
              { polling: 60, timeout: BUSY_MS + REST_MS + 1000 },
            )
            .catch(() => {});
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
          // Held under the finger while what stands above it moved: by the page itself, or by the
          // browser's scroll anchoring alone, which WebKit does not have. Told apart by a second tap
          // with anchoring off, once every measure of this one is taken (below).
          const heldFirst = row.verdict === "pass" && held > 4 ? Math.round(held) : 0;
          // A node of a saint's web (the arbiter, 2026-11-13), moved or not: it ends wholly in sight,
          // between the top bar's foot and the top of the card it opened, and where the app's motion
          // is on it gets there in a glide, never a cut. Measured before what it opened is worn in
          // each palette, which moves the page.
          if (row.node) {
            await page.waitForFunction(() => window.__tapwalkFollow?.done === true, null, { polling: 60, timeout: FOLLOW_MS + 2000 }).catch(() => {});
            const follow = await page.evaluate(() => (window.__tapwalkFollow ? { frames: window.__tapwalkFollow.frames, off: window.__tapwalkFollow.off, done: window.__tapwalkFollow.done } : null)).catch(() => null);
            const ends = await page.evaluate(nodeEnds, { i: c.i, card: lift.card }).catch(() => null);
            if (!follow || !ends) {
              row.verdict = "fail";
              row.why.push("hidden: the node tapped is gone once the page is still");
            } else {
              const m = liftOf(follow);
              const n = (v) => Math.round(v);
              row.lift = { far: n(m.far), step: n(m.step), frames: m.moving, ms: n(m.ms), motionOff: m.off, followed: m.done, top: n(ends.top), bottom: n(ends.bottom), ceiling: n(ends.ceiling), floor: n(ends.floor) };
              const between = `between the top bar's foot at ${n(ends.ceiling)}px and the top of the card it opened at ${n(ends.floor)}px`;
              const inSight = ends.top >= ends.ceiling - 1 && ends.bottom <= ends.floor + 1;
              const cut = !m.off && m.far > 4 && m.step >= CUT_SHARE * m.far;
              if (!inSight) {
                row.verdict = "fail";
                row.why.push(`hidden: it ends at ${n(ends.top)} to ${n(ends.bottom)}px, not wholly ${between}`);
              }
              if (cut) {
                row.verdict = "fail";
                row.why.push(`cut: ${n(m.step)} of its ${n(m.far)}px in one frame, outside reduced motion: an instant cut, not the house glide`);
              }
              if (inSight && !cut) {
                const how = m.far <= 4 ? "it stays where it stood" : m.off ? "moved at once, the app's motion off" : `glided ${n(m.far)}px over ${m.moving} frames in ${n(m.ms)}ms, at most ${n(m.step)}px a frame`;
                row.why.push(`kept in sight: ${how}, and ends at ${n(ends.top)} to ${n(ends.bottom)}px, wholly ${between}`);
              }
            }
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
          // Last, once every measure of the tap is taken: checkMock wears each palette and turns
          // the page round for Arabic before it puts the page back.
          await measureSheets(page, row, at, c);
          // A hold, told apart (the arbiter, 2026-11-13): the same control tapped again from the
          // screen as it first stood, with the browser's scroll anchoring off on every element. A
          // hold the page makes itself stands then and passes; one that leans on the browser moves,
          // as it would in WebKit, and fails.
          if (heldFirst) {
            const alone = await anchorless(page, cdp, at, kept, c).catch(() => null);
            if (!alone) {
              row.held = heldFirst;
              row.why.push(`held: what stands above it moved ${heldFirst}px, and the browser's scroll anchoring kept it under the finger; it could not be tapped again with anchoring off`);
            } else if (Math.max(alone.moved, alone.pulled) > 4) {
              row.verdict = "fail";
              row.why.push(`moved: tapped again with the browser's scroll anchoring off, as WebKit has none, it moved ${Math.round(Math.max(alone.moved, alone.pulled))}px under the finger: only the browser held it (${heldFirst}px)`);
            } else {
              row.heldBySelf = heldFirst;
              row.why.push(`held by the page itself: what stands above it moved ${heldFirst}px, and tapped again with the browser's scroll anchoring off it stood within ${Math.round(alone.moved)}px`);
            }
          }
        }
      } catch (e) {
        row.verdict = "skipped";
        row.why.push(`the walk could not tap it (${String(e).split("\n")[0].slice(0, 100)})`);
      }
      // A fail allowed by name and reason: every fail line it carries is the allowed kind.
      if (row.verdict === "fail") {
        const fails = row.why.filter((w) => FAILS.test(w));
        const grant = ALLOWED.find((a) => a.screens.test(at) && (!a.control || a.control.test(c.name)) && (!a.node || row.node) && fails.every((w) => w.startsWith(`${a.verdict}:`)));
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
  // With --lang the phone's own language is that language too. The Android shell's stand-in has no
  // Capacitor Preferences (no native plugin answers it), so the app's launch reads no remembered choice
  // and opens in the device's language (components/i18n/LocaleBootstrap.tsx, lib/i18n/launchLanguage.ts):
  // without it, the new reader's Arabic walks ran in English (the final check, 2026-11-13).
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(LANG ? { locale: LANG } : {}) });
  await ctx.addInitScript((store) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      for (const [k, v] of store) localStorage.setItem(k, v);
    } catch {}
  }, STORE);
  if (LANG) await ctx.addCookies([{ name: "purify_locale", value: LANG, url: "https://localhost" }]);
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  // The main web, and the public pictures it keeps in its storage (a reader's profile picture),
  // as a phone with a signal loads them: read, never written.
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
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
    for (const c of r.controls.filter((x) => x.verdict === "fail")) console.log(`  FAIL ${at} ${c.name}: ${c.why.filter((w) => FAILS.test(w)).join("; ")}`);
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
const heldBySelf = [];
const allowed = [];
for (const r of results) {
  const fails = r.controls.filter((c) => c.verdict === "fail");
  tapped += r.controls.filter((c) => c.verdict !== "skipped").length;
  failed += fails.length;
  if (r.error) console.log(`\n${r.at}: not walked (${r.error})`);
  if (fails.length) {
    console.log(`\n${r.at}: ${fails.length} of ${r.controls.length} failed`);
    for (const c of fails) console.log(`  ${c.name}: ${c.why.filter((w) => FAILS.test(w)).join("; ")}${c.still ? ` [${c.still}]` : ""}`);
  }
  for (const c of r.controls) if (c.look) looks.push(`${r.at} ${c.name}: ${c.look}`);
  for (const c of r.controls) if (c.held) helds.push(`${r.at} ${c.name}: ${c.held}px`);
  for (const c of r.controls) if (c.heldBySelf) heldBySelf.push(`${r.at} ${c.name}: ${c.heldBySelf}px`);
  for (const c of r.controls) if (c.allowed) allowed.push(`${r.at} ${c.name}: ${c.why.filter((w) => FAILS.test(w) || w.startsWith("kept in sight:")).join("; ")}; allowed: ${c.allowed}`);
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
if (heldBySelf.length) {
  console.log(`\nheld under the finger by the page itself (${heldBySelf.length}): tapped again with the browser's scroll anchoring off, as WebKit has none, each still stood`);
  for (const l of heldBySelf) console.log(`  ${l}`);
}
if (helds.length) {
  console.log(`\nheld under the finger by the browser's scroll anchoring, and not tapped again with it off (${helds.length}): Chrome and the Android app hold these; a browser that does not anchor may let them jump`);
  for (const l of helds) console.log(`  ${l}`);
}
// What the taps opened, each held once to checkMock's rules (its fails are said above, under
// the screen and the control that opened it).
const sheets = [...SHEETS.values()].sort((a, b) => a.at.localeCompare(b.at));
const sheetsFailed = sheets.filter((s) => s.lines.length);
console.log(`\nsheets, menus and dialogs the taps opened: ${sheets.length} distinct, each held to checkMock's rules once; ${sheetsFailed.length} failed`);
for (const s of sheetsFailed) console.log(`  ${s.at} ${s.opener} opened ${s.said}: ${s.lines.length} fail(s)`);
// Words over a picture in the sheets: answered by their pixels, or left for the eye with a still.
const sheetLooks = sheets.flatMap((sh) => sh.looks.map((l) => ({ ...l, sheet: `${sh.at} ${sh.said}` })));
const sheetLookLeft = sheetLooks.filter((l) => l.left);
console.log(`words over a picture in them ("look"): ${sheetLooks.length}; answered by their pixels on every palette: ${sheetLooks.length - sheetLookLeft.length}; left for the eye: ${sheetLookLeft.length}`);
for (const l of sheetLookLeft) console.log(`  ${l.sheet} "${l.text}": ${l.why}${l.still ? ` [${l.still}]` : ""}`);
// A sheet the measure could not hold (it shut as it was measured): named, to look at by eye. The
// words checkMock could not read the ground of are in the record (--json), as the guardrail
// walk keeps them.
const sheetsUnmeasured = sheets.filter((s) => s.unmeasured.some((u) => u.startsWith("not measured:")));
if (sheetsUnmeasured.length) {
  console.log(`\nnot measured, to look at by eye (${sheetsUnmeasured.length}):`);
  for (const s of sheetsUnmeasured) console.log(`  ${s.at} ${s.opener} opened ${s.said}: ${s.unmeasured.find((u) => u.startsWith("not measured:"))}`);
}
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ screens: results.length, tapped, failed, sheets, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit(failed || results.some((r) => r.error) ? 1 : 0);
