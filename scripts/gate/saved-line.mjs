// Build 98 note 9 (his word of 2026-11-15, about 21:41 UTC: "optimize the small text that appears here. it
// moves the whole UI and it doesn't move well"): Now Playing's saved line keeps its room. The walk does what
// he did: the Prayer Rope Anthem saved on the phone, playing, Now Playing open on Cover, the check by the
// title tapped (the line comes: saved, with Remove) and tapped again (it goes). Asked each time: did the
// cover's box or the title's move at all, and is the line one line? At 360, 390 and 412, and in Arabic.
// Then every language's words for every state of the line measured in the line's own font against the
// line's width at 360: each must fit on its one line. Run from the repository's root; writes nothing.
//   node scripts/gate/saved-line.mjs [export folder, default out/]
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const SRC = "/audio/chants/prayer-rope-anthem/en.mp3";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN, args: ["--autoplay-policy=no-user-gesture-required"] } : {});
console.log(`Now Playing's saved line, on ${path.relative(ROOT, OUT) || OUT}`);

async function answerWebsite(ctx) {
  await ctx.route(/^https:\/\/purifyapp\.net\/(audio\/chants|chant-timing)\//, async (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = rel === "/audio/chants/live.json" ? path.join(ROOT, "data/chants-live.json") : rel.startsWith("/chant-timing/") ? path.join(ROOT, "public/audio/chants", rel.slice(14)) : path.join(ROOT, "public", rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "", headers: { "Access-Control-Allow-Origin": "*" } });
    const body = fs.readFileSync(file);
    const headers = { "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin", "Accept-Ranges": "bytes", "Content-Type": file.endsWith(".mp3") ? "audio/mpeg" : "application/json" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()["range"] ?? "");
    if (range && range[1]) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      return route.fulfill({ status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
    }
    return route.fulfill({ status: 200, headers, body });
  });
}

/** The cover's box, the title's, and the line's. */
function boxes() {
  const sheet = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.querySelector("h2"));
  if (!sheet) return null;
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const title = sheet.querySelector("h2");
  const cover = sheet.querySelector("#player-view-panel-cover img, #player-view-panel-cover [class*='aspect-square']") ?? null;
  const status = [...sheet.querySelectorAll('[role="status"]')].find((s) => /listen offline|محفوظ|Remove|إزالة|حذف/.test(s.textContent ?? "") || s.hasAttribute("data-saved-line"));
  const p = status?.matches("p") ? status : status?.querySelector("p");
  const span = p?.querySelector("span");
  const tr = r(title), cr = r(cover), pr = r(p);
  return {
    title: tr && Math.round(tr.top * 10) / 10,
    cover: cr && Math.round(cr.top * 10) / 10,
    coverH: cr && Math.round(cr.height * 10) / 10,
    lineH: pr ? Math.round(pr.height) : 0,
    words: (p?.textContent ?? "").trim(),
    shown: p ? getComputedStyle(p).visibility !== "hidden" && Number(getComputedStyle(p).opacity) > 0.5 && (p.textContent ?? "").trim().length > 0 : false,
    cut: span ? span.scrollWidth > span.clientWidth + 1 : false,
  };
}

let faults = 0;
for (const [w, h, lang] of [[360, 780, "en"], [390, 844, "en"], [412, 915, "en"], [390, 844, "ar"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(([src, lang]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("purify:chants.saved", JSON.stringify({ "prayer-rope-anthem/en": { file: `https://purifyapp.net${src}`, bytes: 3045805, src } }));
      if (lang !== "en") localStorage.setItem("CapacitorStorage.purify_locale", lang);
    } catch {}
    // The recording's file on the "phone": the Filesystem plugin's own store in a browser (its IndexedDB,
    // laid out as @capacitor/filesystem's web.js lays it out), so the app's check of saved files keeps it.
    const open = indexedDB.open("Disc", 1);
    open.onupgradeneeded = () => {
      const store = open.result.createObjectStore("FileStorage", { keyPath: "path" });
      store.createIndex("by_folder", "folder");
    };
    open.onsuccess = () => {
      const folder = "/LIBRARY_NO_CLOUD/audio/chants/prayer-rope-anthem";
      const tx = open.result.transaction("FileStorage", "readwrite");
      for (const [p, type] of [["/LIBRARY_NO_CLOUD", "directory"], ["/LIBRARY_NO_CLOUD/audio", "directory"], ["/LIBRARY_NO_CLOUD/audio/chants", "directory"], [folder, "directory"]]) {
        tx.objectStore("FileStorage").put({ path: p, folder: p.slice(0, p.lastIndexOf("/")), type, size: 0, ctime: Date.now(), mtime: Date.now() });
      }
      tx.objectStore("FileStorage").put({ path: `${folder}/en.mp3`, folder, type: "file", size: 3045805, ctime: Date.now(), mtime: Date.now(), content: "" });
    };
  }, [SRC, lang]);
  await serveLikeTheShell(ctx, OUT, {});
  await answerWebsite(ctx);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (loc) => {
    const b = await loc.boundingBox();
    if (!b) return false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
    await page.waitForTimeout(50);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return true;
  };
  await go(page, "/chants/prayer-rope-anthem/", { timeout: 60000 });
  await page.waitForSelector('[data-chant-control="dock"]', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await tap(page.locator('[data-chant-control="dock"] button[aria-label]').filter({ has: page.locator("svg") }).nth(1));
  await page.waitForTimeout(1500);
  await go(page, "/prayers/", { timeout: 30000 });
  await page.waitForTimeout(1500);
  const opened = await tap(page.locator("[data-mini-player]").first());
  await page.waitForTimeout(1600);
  const mark = page.locator('[role="dialog"] #player-view-panel-cover button[aria-expanded]').first();
  const a = await page.evaluate(boxes);
  const hasMark = await mark.count();
  if (!opened || !a || !hasMark) {
    const seen = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].map((x) => x.getAttribute("aria-label") || x.textContent.trim()).filter(Boolean).slice(0, 14).join(" | "));
    console.log(`FAULT ${w} ${lang}: ${!opened ? "no mini player to open Now Playing; " : ""}${!a ? "Now Playing did not open; " : ""}${!hasMark ? `no saved check by the title (its buttons: ${seen})` : ""}`);
    faults += 1;
    await ctx.close();
    continue;
  }
  await tap(mark);
  await page.waitForTimeout(700);
  const b = await page.evaluate(boxes);
  await tap(mark);
  await page.waitForTimeout(700);
  const c = await page.evaluate(boxes);
  const moved = Math.max(Math.abs(b.title - a.title), Math.abs(b.cover - a.cover), Math.abs(c.title - a.title), Math.abs(c.cover - a.cover), Math.abs(b.coverH - a.coverH));
  const fault = moved > 0.5 || !b.shown || b.lineH > 24 || b.cut || c.shown;
  if (fault) faults += 1;
  console.log(
    `${fault ? "FAULT" : "ok   "} ${w} ${lang}: the line ${b.shown ? `came ("${b.words}", ${b.lineH}px tall${b.cut ? ", CUT SHORT" : ""})` : "DID NOT COME"} and ${c.shown ? "DID NOT GO" : "went"}; ` +
      `title at ${a.title} / ${b.title} / ${c.title}, cover at ${a.cover} / ${b.cover} / ${c.cover} (height ${a.coverH} / ${b.coverH}): ${moved > 0.5 ? `MOVED ${Math.round(moved)}px` : "nothing moved"}`,
  );
  if (w === 360 && lang === "en" && !fault) {
    // Every language, every state, in the line's own font, against the line's width at 360.
    const all = {};
    for (const f of fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).filter((x) => x.endsWith(".json"))) all[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages", f), "utf8"));
    await tap(mark);
    await page.waitForTimeout(700);
    const over = await page.evaluate((all) => {
      const sheet = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.querySelector("h2"));
      const p = sheet.querySelector("[data-saved-line] p");
      const span = p.querySelector("span");
      const button = p.querySelector("button");
      const room = p.clientWidth;
      const ctx2 = document.createElement("canvas").getContext("2d");
      const width = (el, s) => {
        const cs = getComputedStyle(el);
        ctx2.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return ctx2.measureText(s).width;
      };
      const out = [];
      for (const [lang, m] of Object.entries(all)) {
        const states = [
          [m["downloads.savedToListen"], [m["player.offline.remove"]]],
          [m["player.offline.waitWifi"], [m["player.offline.useData"], m["common.cancel"]]],
          [m["player.offline.waitSignal"], [m["common.cancel"]]],
          [m["player.offline.saving"].replace("{done}", "28").replace("{total}", "28"), []],
          [m["downloads.saving"].replace("{percent}", "100"), []],
          [m["player.offline.failedSome"], []],
          [m["player.offline.failedChant"], []],
        ];
        for (const [words, acts] of states) {
          const total = width(span, words) + acts.reduce((n, a) => n + 8 + width(button, a) + 8, 0);
          if (total > room) out.push(`${lang} "${words}${acts.length ? ` + ${acts.join(" + ")}` : ""}" ${Math.round(total)}px of ${room}px`);
        }
      }
      return { room, out };
    }, all);
    if (over.out.length) faults += 1;
    console.log(`${over.out.length ? "FAULT" : "ok   "} every language's words for every state on one line at 360 (${over.room}px): ${over.out.length ? over.out.join("; ") : "all fit"}`);
  }
  await ctx.close();
}
await browser.close();
console.log(faults ? `${faults} FAULT(S)` : "no faults");
process.exit(faults ? 1 : 0);
