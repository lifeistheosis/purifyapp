// A reader's profile, opened the first time (build 97 note 6, Updates 61).
//
// His words: "opening a users profile for the first time is laggy and buggy
// ensure its smooth and if a loading process needs to happen ensure that's
// smooth too". This walk opens a reader's profile from Community the first
// time in a cold run, at 390x844 with the CPU slowed four times (Updates 59's
// way for note 3), from a post's author and from a reply's author, and takes
// every frame from the tap to 2.5s after: the card's edge, each part's box
// against the card, what waits on the network, and the pictures. A jump is a
// number. The main web's answers are real (read in Node, anonymously, GET
// only, never sent anywhere); every answer to an /api address after the tap
// is held to a phone's 700ms at the least, and the viewer's own standing with
// the reader (signed in only, which the walk plays) comes at 900ms.
//
// No reader's name or handle is written anywhere: the walk names the profile
// by where it was opened from.
//
//   node scripts/profile-open-walk.mjs [--out <export>] [--web] [--motion on|reduce]
//     [--signed-out] [--follows-you] [--json <file>] [--frames] [--check]
//
// --web measures purifyapp.net itself instead of an export. --check fails
// (exit 1) on what note 6 forbids: a part that moves inside the card once it
// is drawn, a part that pops in at full strength, the card changing height
// once it stands (in fewer than 3 frames, or by over half in one short frame),
// Follow missing while the profile loads (signed in), and Back or the menu
// not answering while it loads.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { oneFrameJumps } from "../lib/profile/cardSteps.ts";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { motionOptions, pinMotion } from "./lib/motion.mjs";

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.resolve(opt("--out", path.join(ROOT, "out")));
const WEB = argv.includes("--web");
const MOTION = opt("--motion", "on");
const SIGNED_IN = !WEB && !argv.includes("--signed-out");
const CHECK = argv.includes("--check");
const JSON_FILE = opt("--json");
// --frames keeps every frame in the JSON (with the card's inline height and
// transition, the hand-over's own marks), to read a step frame by frame.
const FRAMES = argv.includes("--frames");
const WINDOW = 2500;
const FLOOR = 700;
const RELATION_MS = 900;
const SITE = "https://purifyapp.net";
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"));

/** The export's one Supabase project, and a signed-in phone's session for it (as the word study walk keeps it). */
function standInReader() {
  const dir = path.join(OUT, "_next", "static", "chunks");
  const found = new Set();
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)) found.add(m[0]);
  if (found.size !== 1) throw new Error(`the export should name one Supabase project, it names ${found.size}`);
  const server = [...found][0];
  const user = { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const session = { access_token: "walk", refresh_token: "walk", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365, user };
  return { server, user, jar: JSON.stringify([{ name: `sb-${new URL(server).hostname.split(".")[0]}-auth-token`, value: JSON.stringify(session) }]) };
}

// ── The main web, read anonymously in Node; each address once ────────────
const fetched = new Map();
const clock = { tapAt: Infinity };
async function realAnswer(url, reqHeaders) {
  if (!fetched.has(url)) {
    const headers = Object.fromEntries(Object.entries(reqHeaders).filter(([k]) => !["host", "connection", "authorization", "cookie"].includes(k.toLowerCase())));
    fetched.set(url, (async () => {
      const r = await fetch(url, { headers });
      const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding", "set-cookie"].includes(k.toLowerCase())));
      return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
    })());
  }
  return fetched.get(url);
}
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
// --follows-you plays a reader who follows the viewer: "Follows you" comes
// with the standing, beside the @handle (build 97 note 6, Updates 71).
const RELATION = { mine: false, following: false, followsYou: argv.includes("--follows-you"), mutuals: [], greeted: false, canGift: false, muted: false };

async function mainWeb(route) {
  const req = route.request();
  const url = new URL(req.url());
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  if (req.method() !== "GET") return route.abort();
  const started = Date.now();
  const held = url.pathname.startsWith("/api/") && started >= clock.tapAt;
  if (url.pathname === "/api/community/relation" && SIGNED_IN) {
    await wait(started + RELATION_MS - Date.now());
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ relation: RELATION }) });
  }
  try {
    const answer = await realAnswer(req.url(), req.headers());
    if (held) await wait(started + FLOOR - Date.now());
    return route.fulfill({ ...answer, headers: { ...answer.headers, ...(WEB ? {} : cors) } });
  } catch {
    return route.abort();
  }
}

// ── The frames: recorded in the page from just before the tap ────────────
function recorder({ windowMs, menuLabel, followsYouLabel, keepPost }) {
  const rel = (el, card) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left - card.left), y: Math.round(r.top - card.top), w: Math.round(r.width), h: Math.round(r.height), op: Number(getComputedStyle(el).opacity) };
  };
  const strength = (el, card) => {
    // How strongly a part is painted: the product of its own and its ancestors' opacity up to the card.
    let o = 1;
    for (let n = el; n && n !== card; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return Math.round(o * 100) / 100;
  };
  window.__frames = [];
  window.__long = [];
  // One observer for the page: one made for each case wrote every long task once per case before it.
  if (!window.__longSeen) {
    window.__longSeen = true;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ at: e.startTime, ms: e.duration }); }).observe({ type: "longtask", buffered: false });
    } catch {}
  }
  const t0 = performance.now();
  window.__t0 = t0;
  // Each frame is read as it is painted: in a ResizeObserver made in that
  // frame's requestAnimationFrame, the newest one, so its callback runs after
  // every other observer's (the sheet's hand-over, useDraggableSheet, among
  // them), after the layout and before the paint. Read inside the
  // requestAnimationFrame, a box forces a layout the sheet's observer has not
  // yet held. Read in a task posted from it (the walk's way until Updates 71),
  // a task that ran before it was read too: the profile's commit, a height the
  // sheet held back before the next paint (566, 776, 566px in three frames,
  // 2 runs of 3 in the picture case). With --frames each frame also keeps that
  // later read (`post`) and how long after the frame it came.
  let probe = document.getElementById("walk-frame-probe");
  if (!probe) {
    probe = document.createElement("div");
    probe.id = "walk-frame-probe";
    probe.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
  }
  const step = (now) => {
    const ro = new ResizeObserver(() => {
      ro.disconnect();
      const f = read(now);
      if (!keepPost) return;
      const later = new MessageChannel();
      later.port1.onmessage = () => {
        const c = document.querySelector("[data-profile-card]")?.getBoundingClientRect();
        f.post = c ? { h: Math.round(c.height), lag: Math.round(performance.now() - now) } : null;
      };
      later.port2.postMessage(null);
    });
    ro.observe(probe);
    if (now - t0 < windowMs) requestAnimationFrame(step);
  };
  const read = (now) => {
    const t = now - t0;
    const cardEl = document.querySelector("[data-profile-card]");
    const f = { t: Math.round(t) };
    if (cardEl) {
      const c = cardEl.getBoundingClientRect();
      f.card = { top: Math.round(c.top), h: Math.round(c.height), hold: cardEl.style.height || null, tr: cardEl.style.transition || null };
      const scrim = cardEl.parentElement?.querySelector(":scope > button");
      f.scrim = scrim ? Number(getComputedStyle(scrim).opacity) : null;
      const name = cardEl.querySelector("#profile-name");
      const face = name?.parentElement ?? null;
      const parts = {};
      const add = (key, el) => {
        if (!el) return;
        const r = rel(el, c);
        if (r && r.w > 0 && r.h > 0) parts[key] = { ...r, s: strength(el, cardEl) };
      };
      // The face's rows by what they are, not where they stand (a row arriving shifts the others' places).
      // The status by its mark (ProfileCard.tsx, data-profile-status: the line, its opening row
      // or its held place), or on the main web, which has no mark, by its italic.
      const menuEl = face?.querySelector(`button[aria-haspopup="menu"][aria-label="${menuLabel}"]`) ?? null;
      const isStatus = (el) => el.hasAttribute("data-profile-status") || el.classList.contains("italic");
      if (face)
        [...face.children].forEach((el, i) => {
          const key = i === 0 ? "picture" : el.id === "profile-name" ? "name" : menuEl && el.contains(menuEl) ? "actions" : isStatus(el) ? "status" : "handle";
          // Two rows never share a name: the second is named by its place (a row
          // read as the @handle once made it look as if it moved 153px; Updates 66).
          add(parts[key] ? `${key}#${i}` : key, el);
        });
      // The @handle's own words, and "Follows you" beside them: the row's box
      // can stay put while what stands in it moves.
      const handleRow = face ? [...face.children].find((el) => [...el.children].some((c) => c.textContent?.startsWith("@"))) ?? null : null;
      add("at", handleRow ? [...handleRow.children].find((c) => c.textContent?.startsWith("@")) ?? null : null);
      add("followsYou", handleRow ? [...handleRow.querySelectorAll("*")].find((c) => c.children.length === 0 && c.textContent?.trim() === followsYouLabel) ?? null : null);
      const actionsEl = menuEl?.closest("div") ?? null;
      add("follow", actionsEl?.querySelector("button[aria-pressed], a") ?? null);
      add("menu", menuEl);
      add("loading", cardEl.querySelector("[aria-busy]"));
      add("doors", cardEl.querySelector("[data-profile-doors]"));
      add("tabs", cardEl.querySelector("[role=tablist]"));
      add("panel", cardEl.querySelector('[role=tabpanel]:not([aria-hidden="true"])'));
      add("moment", face?.parentElement?.querySelector(":scope > .mt-4.flex.flex-wrap") ?? null);
      f.parts = parts;
      f.imgs = [...cardEl.querySelectorAll("img")].map((im) => ({ ok: im.complete && im.naturalWidth > 0, s: strength(im, cardEl) }));
    }
    window.__frames.push(f);
    return f;
  };
  requestAnimationFrame(step);
}

/** What the frames say: times, and every movement inside the card. */
function readFrames(frames, longTasks, requests) {
  const seen = frames.filter((f) => f.card);
  const first = seen[0];
  const out = { frames: frames.length, firstCardAt: first?.t ?? null };
  if (!first) return out;
  // The card's rest: the first frame from which its foot no longer moves (it is
  // lifted by its own height, so a growing card moves its top, not its foot).
  const last = seen[seen.length - 1];
  const foot = (f) => f.card.top + f.card.h;
  let restAt = last.t;
  for (let i = seen.length - 1; i > 0; i--) {
    if (Math.abs(foot(seen[i]) - foot(seen[i - 1])) > 1) break;
    restAt = seen[i - 1].t;
  }
  out.restAt = restAt;
  // Height: every change once the card stands at rest, and the largest in one frame.
  const atRest = seen.filter((f) => f.t >= restAt);
  out.heightAtRest = atRest[0]?.card.h ?? null;
  out.heightFinal = last.card.h;
  out.heightChanges = 0;
  out.heightStepMax = 0;
  for (let i = 1; i < atRest.length; i++) {
    const d = Math.abs(atRest[i].card.h - atRest[i - 1].card.h);
    if (d > 1) out.heightChanges++;
    out.heightStepMax = Math.max(out.heightStepMax, d);
  }
  // A short frame that carries over half of the change (lib/profile/cardSteps.ts).
  out.jumps = oneFrameJumps(atRest.map((f) => ({ t: f.t, h: f.card.h })));
  // Each part: when it is first drawn, how strongly, and its largest step inside the card.
  const parts = {};
  for (let i = 0; i < seen.length; i++) {
    for (const [key, p] of Object.entries(seen[i].parts ?? {})) {
      const prev = seen[i - 1]?.parts?.[key];
      const rec = (parts[key] ??= { firstAt: seen[i].t, firstStrength: p.s, stepMax: 0, stepAt: null, gone: null });
      if (prev) {
        const d = Math.max(Math.abs(p.y - prev.y), Math.abs(p.x - prev.x), Math.abs(p.h - prev.h));
        if (d > rec.stepMax) Object.assign(rec, { stepMax: d, stepAt: seen[i].t });
      }
    }
    for (const key of Object.keys(parts)) if (parts[key].gone === null && seen[i - 1]?.parts?.[key] && !seen[i].parts?.[key]) parts[key].gone = seen[i].t;
  }
  out.parts = parts;
  const lastLoading = [...seen].reverse().find((f) => f.parts?.loading);
  out.loadedAt = lastLoading ? (seen.find((f) => f.t > lastLoading.t)?.t ?? null) : first.t;
  const imgDone = seen.find((f) => f.imgs.length > 0 && f.imgs.every((im) => im.ok));
  out.picturesAt = imgDone?.t ?? null;
  let gap = 0;
  for (let i = 1; i < frames.length; i++) gap = Math.max(gap, frames[i].t - frames[i - 1].t);
  out.longestFrame = gap;
  out.longTasks = longTasks.length;
  out.longestTask = Math.round(Math.max(0, ...longTasks.map((l) => l.ms)));
  out.requests = requests;
  return out;
}

// ── A run ────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const reader = WEB ? null : standInReader();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true,
  ...(WEB ? {} : { userAgent: NATIVE_UA }), ...motionOptions(MOTION),
});
await ctx.addInitScript(({ jar }) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    if (jar) localStorage.setItem("purify.supabase.auth", jar);
  } catch {}
}, { jar: SIGNED_IN ? reader.jar : null });
await pinMotion(ctx, MOTION);
if (!WEB) await serveLikeTheShell(ctx, OUT, {});
for (const at of [`${SITE}/**`, "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
if (reader) {
  await ctx.route(`${reader.server}/**`, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/storage/v1/object/public/")) return route.fallback();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (SIGNED_IN && url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(reader.user) });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
  });
}

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
const requests = [];
page.on("request", (r) => {
  if (!Number.isFinite(clock.tapAt)) return;
  const u = new URL(r.url());
  if (!u.pathname.startsWith("/api/") && r.resourceType() !== "image" && r.resourceType() !== "script") return;
  const rec = { path: u.pathname.replace(/[^/]{24,}/g, "…"), kind: r.resourceType(), at: Date.now() - clock.tapAt, ms: null };
  requests.push(rec);
  r.response().then(() => { rec.ms = Date.now() - clock.tapAt - rec.at; }).catch(() => {});
});

if (WEB) await page.goto(`${SITE}/community`, { waitUntil: "load", timeout: 120000 });
else await go(page, "/community/", { timeout: 120000 });
const cdp = await ctx.newCDPSession(page);
await page.waitForSelector("article", { timeout: 120000 });
await page.waitForTimeout(3000);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.waitForTimeout(1500);

const menuLabel = EN["profile.moreActions"];
const results = [];
const failures = [];

/** Taps `target` as a finger does and reads the next 2.5s; then Close. `probe` taps during the loading. */
async function measure(label, target, probe = null) {
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  requests.length = 0;
  await page.evaluate(recorder, { windowMs: WINDOW, menuLabel, followsYouLabel: EN["profile.followsYou"], keepPost: FRAMES });
  clock.tapAt = Date.now();
  await target.tap();
  let probed = null;
  if (probe) probed = await probe();
  await page.waitForTimeout(WINDOW + 300);
  const { frames, t0 } = await page.evaluate(() => ({ frames: window.__frames, t0: window.__t0 }));
  const long = await page.evaluate(() => window.__long);
  const read = readFrames(frames, long, requests.slice());
  read.probe = probed;
  if (FRAMES) Object.assign(read, { frameLog: frames, longLog: long.map((l) => ({ at: Math.round(l.at - t0), ms: Math.round(l.ms) })) });
  clock.tapAt = Infinity;
  results.push({ from: label, ...read });
  // Close it as a reader does, and let it go.
  const close = page.locator(`[data-profile-card] button[aria-label="${EN["common.close"]}"]`).first();
  if (await close.count()) await close.tap().catch(() => {});
  await page.waitForTimeout(1200);
  return read;
}

const articles = page.locator("article");
const count = await articles.count();
// 1. A post's author, by the name beside the post.
for (let i = 0; i < count; i++) {
  const target = articles.nth(i).locator("p button").first();
  if (!(await target.count())) continue;
  await measure("a post's author", target);
  break;
}
// 2. A reply's author: open a post's replies, then the first reply's name.
for (let i = 0; i < count; i++) {
  const toggle = articles.nth(i).locator("button[aria-expanded][aria-controls$='-replies']").first();
  if (!(await toggle.count())) continue;
  const words = (await toggle.innerText().catch(() => "")).trim();
  if (!/[1-9]/.test(words)) continue;
  await toggle.scrollIntoViewIfNeeded();
  await toggle.tap();
  const replyName = articles.nth(i).locator("[id$='-replies'] p button").first();
  try {
    await replyName.waitFor({ timeout: 20000 });
  } catch {
    continue;
  }
  await measure("a reply's author", replyName);
  break;
}
// 3. The loading answers: Back (the card's Close) and the menu, tapped 150ms after the tap, on a post's picture.
for (let i = count - 1; i >= 0; i--) {
  const pic = articles.nth(i).locator("button[aria-hidden=true]").first();
  if (!(await pic.count())) continue;
  await measure("a post's picture, the menu tapped while it loads", pic, async () => {
    await page.waitForTimeout(150);
    const menu = page.locator(`[data-profile-card] button[aria-haspopup="menu"][aria-label="${menuLabel}"]`).first();
    const t = Date.now();
    const there = (await menu.count()) > 0;
    if (there) await menu.tap({ timeout: 2000 }).catch(() => {});
    const opened = await page.waitForSelector("[role=menu]", { timeout: 1500 }).then(() => Date.now() - t).catch(() => null);
    if (opened !== null) await page.keyboard.press("Escape");
    const follow = await page.locator("[data-profile-card] button[aria-pressed]").count();
    return { menuThere: there, menuOpenedIn: opened, followThere: follow > 0 };
  });
  break;
}
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await browser.close();

// ── The report ───────────────────────────────────────────────────────────
const where = WEB ? "purifyapp.net" : `the export at ${path.relative(ROOT, OUT) || OUT}`;
console.log(`profile-open-walk: ${where}, 390x844, CPU 4x, motion ${MOTION}, ${SIGNED_IN ? `signed in (stand-in${RELATION.followsYou ? ", follows you" : ""})` : "signed out"}`);
for (const r of results) {
  console.log(`\n${r.from}: card drawn ${r.firstCardAt}ms, at rest ${r.restAt}ms, loaded ${r.loadedAt}ms, pictures ${r.picturesAt ?? "none"}ms`);
  console.log(`  height at rest ${r.heightAtRest}px, final ${r.heightFinal}px, ${r.heightChanges} frames changing, largest step ${r.heightStepMax}px`);
  console.log(`  longest frame ${r.longestFrame}ms, long tasks ${r.longTasks} (longest ${r.longestTask}ms)`);
  for (const [k, p] of Object.entries(r.parts ?? {})) console.log(`  ${k.padEnd(8)} first ${String(p.firstAt).padStart(5)}ms at ${p.firstStrength}, largest step ${p.stepMax}px${p.stepAt !== null ? ` at ${p.stepAt}ms` : ""}${p.gone !== null ? `, gone ${p.gone}ms` : ""}`);
  for (const q of r.requests) console.log(`  ${q.kind.padEnd(6)} ${q.path} at ${q.at}ms, ${q.ms ?? "?"}ms`);
  if (r.probe) console.log(`  while loading: menu there ${r.probe.menuThere}, opened in ${r.probe.menuOpenedIn ?? "never"}ms, Follow there ${r.probe.followThere}`);
}
if (errors.length) console.log(`\npage errors: ${errors.length}`);
if (JSON_FILE) fs.writeFileSync(JSON_FILE, JSON.stringify({ where, motion: MOTION, signedIn: SIGNED_IN, results, errors }, null, 2));

if (CHECK) {
  const MOVE = 2;
  for (const r of results) {
    if (r.firstCardAt === null) { failures.push(`${r.from}: the card never opened`); continue; }
    if (r.heightChanges > 0 && MOTION === "reduce") failures.push(`${r.from}: with motion reduced the card changed height in ${r.heightChanges} frames`);
    // The card's height follows what arrives on the house curve (useDraggableSheet, smoothHeight): eased over frames, never in one.
    if (MOTION !== "reduce" && Math.abs(r.heightFinal - r.heightAtRest) > 100 && r.heightChanges < 3) failures.push(`${r.from}: the card went from ${r.heightAtRest}px to ${r.heightFinal}px in ${r.heightChanges} frames`);
    // Nor one frame carrying most of it among eased ones (566, 776, 566px, then up: Updates 66, 71).
    if (MOTION !== "reduce") for (const j of r.jumps ?? []) failures.push(`${r.from}: the card's height moved ${j.step}px in one frame at ${j.at}ms, over half of its ${j.growth}px change`);
    for (const [k, p] of Object.entries(r.parts ?? {})) {
      if (["loading", "panel", "doors", "tabs"].includes(k) && p.gone !== null) continue;
      if (p.stepMax > MOVE && k !== "loading") failures.push(`${r.from}: ${k} moved ${p.stepMax}px in one frame at ${p.stepAt}ms`);
      if (p.firstAt > r.firstCardAt + 50 && p.firstStrength > 0.5 && MOTION !== "reduce") failures.push(`${r.from}: ${k} appeared at ${p.firstAt}ms at ${p.firstStrength} of its strength`);
    }
    if (SIGNED_IN && r.parts?.follow && r.parts.follow.firstAt > r.firstCardAt + 50) failures.push(`${r.from}: Follow came ${r.parts.follow.firstAt - r.firstCardAt}ms after the card`);
    if (r.probe && (!r.probe.menuThere || r.probe.menuOpenedIn === null)) failures.push(`${r.from}: the menu did not answer while the profile loaded`);
    if (r.probe && SIGNED_IN && !r.probe.followThere) failures.push(`${r.from}: Follow was not there while the profile loaded`);
  }
  if (errors.length) failures.push(`page errors: ${errors.join(" | ")}`);
  console.log(failures.length ? `\nFAIL (${failures.length})\n  ${failures.join("\n  ")}` : "\nPASS");
  process.exit(failures.length ? 1 : 0);
}
