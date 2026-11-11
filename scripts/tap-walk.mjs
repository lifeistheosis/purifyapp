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
//   moved      the thing under the finger moves more than 4px while the page
//              stays, because what stands above it changed, or because the
//              page grew too short for where it stood and the browser pulled
//              it (note 16, Evening to Morning, 133px on a tablet); a page
//              taken somewhere on purpose (a Begin that scrolls to the
//              prayer) is no jump
//   back       Back from where a tap went forward does not return the reader
//              to the place they left (note 1, Nicaea after St Alexander); a
//              step back, or an address changed in place (a tab), is not
//              asked to
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
// fail.
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

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { screens } from "./lib/screens.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

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
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

const list = ONLY ?? screens(OUT);
console.log(`${list.length} screens on a phone, up to ${MAX} controls each, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}`);

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
    return r.width >= 8 && r.height >= 8 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05 && el.checkVisibility?.() !== false;
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
        const handle = await page.$(`[data-tapwalk="${c.i}"]`);
        await handle.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        await page.waitForTimeout(250);
        const box = await handle.boundingBox();
        if (!box) {
          row.verdict = "skipped";
          row.why.push("out of reach");
          result.controls.push(row);
          continue;
        }
        // What the finger meets at the control's middle: the control, or something laid over it
        // (build 93 note 8: a tap that meets something else first). Asked twice, a beat apart,
        // so a page still settling is not mistaken for a cover.
        const meets = () =>
          page.evaluate(
            ({ i, x, y }) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              const hit = document.elementFromPoint(x, y);
              if (!el || !hit) return "nothing";
              if (el === hit || el.contains(hit) || hit.contains(el)) return null;
              const words = (hit.getAttribute("aria-label") || hit.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
              return `${hit.tagName.toLowerCase()}${words ? ` "${words}"` : ""}`;
            },
            { i: c.i, x: box.x + box.width / 2, y: box.y + box.height / 2 },
          );
        let cover = await meets();
        if (cover) {
          await page.waitForTimeout(400);
          cover = await meets();
        }
        if (cover) {
          row.verdict = "fail";
          row.why.push(`covered: the finger meets ${cover} before it`);
          if (SHOTS) row.still = await still(page, at, c.i);
          result.controls.push(row);
          continue;
        }
        const before = await page.evaluate(snapshot);
        // Where the reader stands in the history, to tell a step forward from a step back or a
        // changed address (a tab that replaces it), which Back is not asked to undo.
        const step = () => page.evaluate(() => window.navigation?.currentEntry?.index ?? -1).catch(() => -1);
        const stood = await step();
        const wasOpen = await handle.evaluate((el) => el.getAttribute("aria-expanded") === "true" || Boolean(el.closest("details")?.open && el.tagName === "SUMMARY"));
        // Count every change the page makes after the finger lifts.
        await page.evaluate(() => {
          window.__tapwalkChanges = 0;
          window.__tapwalkObserver?.disconnect();
          window.__tapwalkObserver = new MutationObserver((list) => {
            window.__tapwalkChanges += list.length;
          });
          window.__tapwalkObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        });
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        // Where the thing under the finger stands: its middle (so a press that shrinks it in
        // place is not a move), on the screen and on the page, and how long the page is.
        const where = () =>
          page
            .evaluate((i) => {
              const el = document.querySelector(`[data-tapwalk="${i}"]`);
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { x: r.x + r.width / 2, y: r.y + r.height / 2, sx: scrollX, sy: scrollY, tall: innerHeight, long: document.documentElement.scrollHeight };
            }, c.i)
            .catch(() => null);
        const start = await where();
        await tapAt(cdp, x, y);
        // Where it goes while the page stays. Three ways it can move: what stands above it
        // changes (a jump), the page grows too short for where it stood and the browser pulls
        // it up (note 16's 133px on a tablet), or the page is taken somewhere on purpose (a
        // Begin that scrolls to the prayer), which is no jump.
        let moved = 0;
        let pulled = 0;
        let scrolled = 0;
        for (let t = 0; t < 12; t++) {
          await page.waitForTimeout(60);
          const w = await where();
          if (!w || !start || page.url() !== before.href) continue;
          const onScreen = Math.max(Math.abs(w.x - start.x), Math.abs(w.y - start.y));
          moved = Math.max(moved, Math.abs(w.x + w.sx - (start.x + start.sx)), Math.abs(w.y + w.sy - (start.y + start.sy)));
          const atEnd = w.sy + w.tall >= w.long - 2;
          if (w.long < start.long && w.sy < start.sy && atEnd) pulled = Math.max(pulled, onScreen);
          else scrolled = Math.max(scrolled, onScreen);
        }
        await page.waitForTimeout(700);
        const after = await page.evaluate(snapshot).catch(() => null);
        const changes = await page.evaluate(() => window.__tapwalkChanges ?? 0).catch(() => 0);
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
          if (!back || back.href !== before.href) {
            row.verdict = "fail";
            row.why.push("back: Back did not return to this screen");
          } else if (Math.abs(back.y - before.y) > 48) {
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
              return { open: true, named: true, end: Math.round(end), floor: Math.round(floor), ceiling: Math.round(ceiling), top: Math.round(top), atEnd };
            }, c.i)
            .catch(() => null);
          const turnedOpen = opened?.open && !wasOpen;
          if (turnedOpen && opened.named && !opened.leftAlone) {
            const shows = opened.end <= opened.floor - 12 + 2 || opened.top <= opened.ceiling + 14 || opened.atEnd;
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
          const anything = changes > 0 || after.y !== before.y || after.html !== before.html || after.kept !== before.kept || after.dialogs !== before.dialogs;
          if (!anything) {
            row.verdict = "fail";
            row.why.push("nothing: the tap changed nothing");
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
  await serveLikeTheShell(ctx, OUT, {});
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**"]) await ctx.route(at, mainWeb);
  // What the device keeps once the app has first opened: every tap starts from it.
  const first = await ctx.newPage();
  await go(first, "/", { timeout: 30000 });
  await first.waitForTimeout(1500);
  const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
  await first.close();
  for (let at = queue.shift(); at; at = queue.shift()) {
    results.push(await walkScreen(ctx, at, kept));
    done += 1;
    if (done % 5 === 0) console.log(`  ${done} of ${list.length}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();

results.sort((a, b) => a.at.localeCompare(b.at));
let tapped = 0;
let failed = 0;
const looks = [];
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
}
console.log(`\n${results.length} screens, ${tapped} controls tapped, ${failed} failed`);
const capped = results.filter((r) => r.found > r.controls.length);
if (capped.length) console.log(`more controls than the ${MAX} walked on ${capped.length} screens: ${capped.map((r) => `${r.at} (${r.found})`).join(", ")}`);
if (looks.length) {
  console.log(`\nto look at by eye (${looks.length}):`);
  for (const l of looks) console.log(`  ${l}`);
}
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ screens: results.length, tapped, failed, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit(failed || results.some((r) => r.error) ? 1 : 0);
