// Words on a picture, measured by the picture's own pixels (1.9, the Themes
// chat's sweep: docs/1.9-build/notes/themes-fable.md, section 25).
//
// The mock checker measures a word against the colours of the boxes it sits
// in, and paints a gradient to read it under the words (1.9, Fable
// Theology's). It says "not measured, look" when a picture is behind a word:
// the word's own box has one, or one is drawn across it by something that is
// not its parent (a tile's words over its picture). That is right for a
// checker of colours: a picture has no one colour. This answers the question
// for the picture. Each line of the words is
// photographed twice, as it is and with the words' fill hidden (their shadow
// kept: a halo drawn for reading on a picture is part of the ground the
// letters stand on). Where the two differ is where the letters are; the
// ground is the second photograph there, and its least kind hundredth (the
// lightest behind light words, the darkest behind dark ones, the outermost
// one percent left out: a speck is not a ground) is what the words' own
// colour is measured on, on each palette. Words at 18.66px bold or 24px and
// over are large and need 3:1; the rest 4.5:1.
//
// As a module: wordsOnPicture(page, selector, { palettes }) on a page already
// open (scripts/mock-check.mjs, openPhone). On the command line it walks the
// places the sweep named, on the export (npm run build:android first):
//
//   node scripts/words-on-pictures.mjs [place,place]
//
// and prints each place's worst line on each palette, and FAIL where one is
// under its need.
//
// And every word the checker hands over, on every screen (1.9, the arbiter's
// word of 2026-11-11: "measure those ... once by their pixels with
// scripts/words-on-pictures.mjs on all five palettes, and give each that
// fails 4.5:1 (or 3:1 for large words) a mend or an owner"):
//
//   NODE_USE_ENV_PROXY=1 node scripts/words-on-pictures.mjs --said [--only /path,/path] [--workers 3] [--online] [--json file]
//
// One page of every route the export carries, on the gate's walk's own phone
// (scripts/guardrail-walk.mjs; SELLS_PLUS=1 makes it the Android shell, a
// reader with no Plus). On each the checker is asked what it would not vouch
// for, and each of those words is measured here by its pixels on the five
// palettes. It prints every word under its need, by screen, and counts the
// rest. The checker's by-eye list for contrast is then a list of numbers.

import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { contrast, PALETTES } from "./mock-check.mjs";

/**
 * The covers the apps ask the website for (/covers/, set aside from the
 * export), answered from public/covers as purifyapp.net will answer them, so
 * words over a cover or its backdrop are measured on the picture itself.
 */
export async function serveCovers(page) {
  const types = { ".jpg": "image/jpeg", ".avif": "image/avif" };
  await page.route("https://purifyapp.net/covers/**", async (route) => {
    const file = path.join("public", decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(path.join("public", "covers")) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, headers: { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" }, body: fs.readFileSync(file) });
  });
}

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

async function wear(page, mode) {
  await page.evaluate((m) => {
    const h = document.documentElement;
    if (m) h.setAttribute("data-reading-mode", m);
    else h.removeAttribute("data-reading-mode");
    if (!document.querySelector("style[data-words-on-pictures]")) {
      const still = document.createElement("style");
      still.setAttribute("data-words-on-pictures", "");
      // Colours step on transitions; an entrance animation is left to end (a
      // paused one can hold the words at their first, unseen frame).
      still.textContent = "*, *::before, *::after { transition: none !important; }";
      document.head.appendChild(still);
    }
  }, mode);
  await page.waitForTimeout(250);
}

/**
 * Each element answering `selector`, each palette: the worst line of its
 * words, measured on the pixels behind it.
 */
export async function wordsOnPicture(page, selector, { palettes = PALETTES, own = false, every = false } = {}) {
  const out = [];
  for (const [palette, mode] of palettes) {
    await wear(page, mode);
    const count = await page.locator(selector).count();
    for (let i = 0; i < count; i++) {
      const el = page.locator(selector).nth(i);
      // To the middle of the screen, clear of the bars fixed at its top and foot, and to the middle of
      // a sideways shelf, clear of the fade at its edge (Admin's: on Light the reading room's shelf fades to
      // the page's own light colour, and a card left at the edge read 2.77:1 under it; at the middle, 9.5).
      // A box that clips its words (a clamped line, a rounded tile) is scrolled by that too, though no reader
      // can scroll it: its hidden lines come up into it and the lines it showed go. Each such box is put
      // back as it was.
      await el
        .evaluate((node) => {
          const held = [];
          for (let n = node.parentElement; n; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (/hidden|clip/.test(cs.overflowY) || /hidden|clip/.test(cs.overflowX)) held.push([n, n.scrollTop, n.scrollLeft, /hidden|clip/.test(cs.overflowY), /hidden|clip/.test(cs.overflowX)]);
          }
          node.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
          for (const [n, top, left, y, x] of held) {
            if (y) n.scrollTop = top;
            if (x) n.scrollLeft = left;
          }
        })
        .catch(() => {});
      await page.waitForTimeout(250);
      const info = await el.evaluate((node, own) => {
        const cs = getComputedStyle(node);
        // Any colour syntax (color-mix computes to oklab), read back as sRGB
        // through a canvas, as the mock checker reads it; and the opacity of
        // every box it is in.
        const cv = document.createElement("canvas");
        cv.width = cv.height = 1;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.fillStyle = "rgba(0, 0, 0, 0)";
        cx.fillStyle = cs.color;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        let opacity = 1;
        for (let n = node; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
        const range = document.createRange();
        // The element's words, or with `own` only the words that are its own: the checker tells a word by its
        // own text, and an element's children may wear other colours and are told apart.
        const rects = [];
        const said = [];
        for (const part of own ? [...node.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()) : [node]) {
          range.selectNodeContents(part);
          rects.push(...range.getClientRects());
          said.push(part.textContent);
        }
        // Each line, cut to the element's own box and to every box around it that clips: a clamped paragraph
        // still reports the lines it hides, and those lie over whatever is below it. The clamp may be the
        // element's own or a box it stands in.
        const box = node.getBoundingClientRect();
        const seen = { left: Math.max(box.left, 0), top: Math.max(box.top, 0), right: Math.min(box.right, innerWidth), bottom: Math.min(box.bottom, innerHeight) };
        for (let n = node.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const ps = getComputedStyle(n);
          const b = n.getBoundingClientRect();
          if (ps.overflowX !== "visible") {
            seen.left = Math.max(seen.left, b.left);
            seen.right = Math.min(seen.right, b.right);
          }
          if (ps.overflowY !== "visible") {
            seen.top = Math.max(seen.top, b.top);
            seen.bottom = Math.min(seen.bottom, b.bottom);
          }
        }
        const lines = rects
          .map((r) => {
            const left = Math.max(r.left, seen.left);
            const top = Math.max(r.top, seen.top);
            const right = Math.min(r.right, seen.right);
            const bottom = Math.min(r.bottom, seen.bottom);
            return { x: Math.floor(left), y: Math.floor(top), w: Math.ceil(right - left), h: Math.ceil(bottom - top) };
          })
          .filter((r) => r.w > 2 && r.h > 6);
        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight) || 400;
        return {
          text: said.join(" ").replace(/\s+/g, " ").trim().slice(0, 48),
          mark: node.getAttribute("data-said-word") ?? "",
          fg: [d[0], d[1], d[2]],
          alpha: (d[3] / 255) * opacity,
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          lines,
        };
      }, own);
      let worst = null;
      // Whether the ground held still while it was read. A picture that arrives between the two photographs
      // makes every pixel look like a letter and its lightest speck like the ground.
      let still = true;
      // How many of the words' pixels changed when their fill was hidden. None: the letters are not on the
      // screen at all (something is drawn over them, or they are clipped away), and there is nothing to read.
      let drawn = 0;
      const raw = async (clip) => {
        const { data, info: meta } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        return { data, n: meta.width * meta.height };
      };
      try {
        const clips = info.lines.map((line) => ({ x: line.x, y: line.y, width: Math.max(1, line.w), height: Math.max(1, line.h) }));
        // The same photograph twice, a moment apart, must be the same before it is trusted: up to two seconds for
        // a picture to finish arriving.
        let withWords = [];
        for (let tries = 0; tries < 5; tries++) {
          withWords = [];
          for (const clip of clips) withWords.push(await raw(clip));
          await page.waitForTimeout(120);
          let moved = 0;
          let n = 0;
          for (let k = 0; k < clips.length; k++) {
            const again = await raw(clips[k]);
            n += again.n;
            for (let p = 0; p < again.n; p++) {
              if (Math.abs(withWords[k].data[p * 3] - again.data[p * 3]) + Math.abs(withWords[k].data[p * 3 + 1] - again.data[p * 3 + 1]) + Math.abs(withWords[k].data[p * 3 + 2] - again.data[p * 3 + 2]) > 30) moved += 1;
            }
          }
          still = moved <= Math.max(2, n * 0.002);
          if (still) break;
          await page.waitForTimeout(400);
        }
        // Hide the words' fill, keep their shadow, and remember how to put them back.
        await el.evaluate((node) => {
          const touched = [node, ...node.querySelectorAll("*")].map((e) => [e, e.getAttribute("style")]);
          for (const [e] of touched) {
            e.style.setProperty("color", "transparent", "important");
            e.style.setProperty("-webkit-text-fill-color", "transparent", "important");
          }
          window.__wordsBack = touched;
        });
        await page.waitForTimeout(60);
        for (let k = 0; k < clips.length; k++) {
          const a = withWords[k];
          const b = await raw(clips[k]);
          // The letters: where the photograph with the words differs.
          const under = [];
          const all = [];
          for (let p = 0; p < b.n; p++) {
            const c = [b.data[p * 3], b.data[p * 3 + 1], b.data[p * 3 + 2]];
            all.push(c);
            const diff = Math.abs(a.data[p * 3] - c[0]) + Math.abs(a.data[p * 3 + 1] - c[1]) + Math.abs(a.data[p * 3 + 2] - c[2]);
            if (diff > 30) under.push(c);
            if (diff > 6) drawn += 1;
          }
          const px = under.length >= 12 ? under : all;
          if (!px.length) continue;
          const byLum = px.map((c) => [lum(c), c]).sort((x, y) => x[0] - y[0]);
          const median = byLum[Math.floor(byLum.length / 2)][0];
          const light = lum(info.fg) > median;
          // The least kind hundredth, the outermost one percent left out.
          const at = light ? Math.min(byLum.length - 1, Math.floor(byLum.length * 0.99)) : Math.floor(byLum.length * 0.01);
          const ground = byLum[at][1];
          const r = contrast(info.fg, info.alpha, ground);
          if (!worst || r < worst.ratio) worst = { ratio: r, ground };
        }
      } finally {
        await page.evaluate(() => {
          for (const [e, style] of window.__wordsBack ?? []) {
            if (style === null) e.removeAttribute("style");
            else e.setAttribute("style", style);
          }
          window.__wordsBack = null;
        });
      }
      // `at`: the element's place among the selector's matches, so a caller can tell whose line it is
      // when an element gave none (scripts/mock-check.mjs, the pixels pass). `mark`: what it was chosen by
      // (markSaidWords). `seen`: whether its letters are on the screen at all. `still`: whether the ground
      // held still while it was read.
      // A word with no letters on the screen, or on a ground that never held still, has no ratio to give: it
      // is left out, so it stays to be looked at, unless the caller asks for every one (`every`).
      if (worst && (every || (drawn >= 6 && still))) out.push({ palette, at: i, text: info.text, need: info.large ? 3 : 4.5, ratio: worst.ratio, ground: worst.ground, mark: info.mark, seen: drawn >= 6, still });
    }
  }
  return out;
}

export function printWords(label, results) {
  let bad = 0;
  console.log(`\n${label}`);
  for (const r of results) {
    const ok = r.ratio + 1e-9 >= r.need;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${r.palette.padEnd(12)} ${r.ratio.toFixed(2)}:1 (needs ${r.need}) "${r.text}"`);
  }
  return bad === 0;
}

// The places the sweep named, each a page of the export and its words: the
// words that wear the house's halo (.words-halo), the line under the reading
// room's poster, the Plus pill where the bar stands over a picture, First
// focus's names on their pictures and the numerals under Theology's plates.
export const PLACES = {
  prayers: { to: "/prayers/", selector: ".prayers-hero-verse .words-halo", ready: ".prayers-hero-img" },
  you: { to: "/account/", selector: ".you-hero .words-halo", ready: ".you-hero .words-halo" },
  discover: { to: "/discover/", selector: ".words-halo", ready: ".words-halo" },
  reading: { to: "/reading/", selector: '[data-stage-part="words"] > p.text-caption', ready: '[data-stage-part="words"]' },
  "pill-prayers": { to: "/prayers/", selector: "[data-tab-actions] .premium-pill", ready: ".prayers-hero-img" },
  "pill-you": { to: "/account/", selector: "[data-tab-actions] .premium-pill", ready: ".you-hero" },
  focus: { to: "/settings/", selector: ".set-focus-card > span:not([aria-hidden]):not([hidden])", ready: ".set-focus-card img" },
  plates: { to: "/theology/", selector: "[data-path-plates] .text-paper\\/45", ready: "[data-path-plates]" },
};

/**
 * The words on the page the checker would not vouch for because a picture is
 * behind them, each marked for wordsOnPicture to find (`[data-said-word]`).
 * `unmeasured` is the checker's own list for this page, `"words": why`. A
 * word is found again by its text, as the checker reads it: a text's own
 * words, their first 48 letters. Where the same words stand twice on a page,
 * both are marked and both measured.
 */
export async function markSaidWords(page, unmeasured) {
  const said = unmeasured
    .map((u) => /^"(.*)": (.*)$/s.exec(u))
    .filter((m) => m && /picture/.test(m[2]))
    .map((m) => ({ text: m[1], why: m[2] }));
  const marked = await page.evaluate((texts) => {
    document.querySelectorAll("[data-said-word]").forEach((el) => el.removeAttribute("data-said-word"));
    const want = new Map(texts.map((t) => [t.text, t.why]));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0;
    const allowed = {};
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = t.textContent.replace(/\s+/g, " ").trim().slice(0, 48);
      const el = t.parentElement;
      if (!text || !el || !want.has(text) || el.hasAttribute("data-said-word") || el.closest(".sr-only, svg, [hidden]")) continue;
      // Allowed by name and reason for contrast, as the checker allows it (data-mock-allow, data-mock-why): a
      // small picture of a page in one palette's own colours, a reader's own picture. Not measured; its reason said.
      const by = el.closest('[data-mock-allow~="contrast"]');
      if (by) {
        const why = by.getAttribute("data-mock-why") ?? "";
        allowed[why] = (allowed[why] ?? 0) + 1;
        continue;
      }
      el.setAttribute("data-said-word", want.get(text));
      n += 1;
    }
    return { n, allowed };
  }, said);
  return { said: said.length, marked: marked.n, allowed: marked.allowed };
}

/**
 * Every screen of the export, each word the checker hands over measured by
 * its pixels: `[{ at, said, words: [{ text, why, need, by: { Dark: ratio, ... } }] }]`.
 */
export async function saidWordsOnPictures({ out = path.resolve("out"), only = null, workers = 3, online = false, tell = () => {} } = {}) {
  const { chromium } = await import("playwright");
  const { NATIVE_UA, go, serveLikeTheShell } = await import("./lib/shell-server.mjs");
  const { screens } = await import("./lib/screens.mjs");
  const { SELLS_PLUS, asAndroidShell, checkSells } = await import("./lib/sells-plus.mjs");
  const { checkMock } = await import("./mock-check.mjs");
  checkSells(out);
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  // The main web, read as a phone reads it: GET only, each address once (as scripts/guardrail-walk.mjs).
  const fetched = new Map();
  const kinds = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const mainWeb = async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.abort();
    const url = req.url();
    // A picture this checkout holds is answered from it: the main web of today is the release before, and a
    // cover new in this one would come back missing and be measured as the tile's stand-in.
    const held = path.join("public", decodeURIComponent(new URL(url).pathname));
    if (/^https:\/\/purifyapp\.(net|onrender\.com)\//.test(url) && kinds[path.extname(held)] && held.startsWith(`public${path.sep}`) && fs.existsSync(held)) {
      return route.fulfill({ status: 200, headers: { "Content-Type": kinds[path.extname(held)] }, body: fs.readFileSync(held) });
    }
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
  };
  const queue = [...(only ?? screens(out))];
  const total = queue.length;
  const results = [];
  const worker = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("purify.motion", "off");
      } catch {}
    });
    if (SELLS_PLUS) await asAndroidShell(ctx);
    await serveLikeTheShell(ctx, out, {});
    if (online) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
    let page = await ctx.newPage();
    // With no network the covers are answered from this checkout, as the main web answers them.
    if (!online) await serveCovers(page);
    for (let at = queue.shift(); at; at = queue.shift()) {
      const one = { at, said: 0, words: [], allowed: {}, error: null };
      try {
        await go(page, at, { timeout: 15000 });
        await page.waitForTimeout(1800);
        const checked = await checkMock(page, "body");
        const { said, marked, allowed } = await markSaidWords(page, checked.unmeasured);
        one.said = said;
        one.allowed = allowed;
        if (marked) {
          const byWord = new Map();
          for (const row of await wordsOnPicture(page, "[data-said-word]", { own: true, every: true })) {
            const word = byWord.get(row.at) ?? { text: row.text, why: row.mark, need: row.need, by: {}, seen: false, moving: [] };
            word.by[row.palette] = Math.round(row.ratio * 100) / 100;
            if (!row.still) word.moving.push(row.palette);
            // Seen on any palette is seen: a word is drawn or it is not, whatever the colours.
            word.seen ||= row.seen;
            byWord.set(row.at, word);
          }
          one.words = [...byWord.values()];
        }
      } catch (e) {
        one.error = String(e).split("\n")[0].slice(0, 160);
        // A screen that would not settle leaves the next one a fresh page.
        await page.close().catch(() => {});
        page = await ctx.newPage();
        if (!online) await serveCovers(page);
      }
      results.push(one);
      tell(one, results.length, total);
    }
    await ctx.close();
  };
  await Promise.all(Array.from({ length: Math.max(1, workers) }, worker));
  await browser.close();
  return results.sort((a, b) => a.at.localeCompare(b.at));
}

/** The said words' measure, said: every word under its need by screen, and the count of the rest. */
export function printSaidWords(results) {
  let words = 0;
  let under = 0;
  let unseen = 0;
  let restless = 0;
  for (const r of results) {
    // A word whose letters are not on the screen (covered by what is drawn across it, or clipped away) has
    // nothing to read and no ratio: counted apart, and named, since the checker named it.
    const hidden = r.words.filter((w) => !w.seen);
    const moving = r.words.filter((w) => w.seen && w.moving.length);
    restless += moving.length;
    if (moving.length) console.log(`\n${r.at}  the ground would not hold still, so not measured: ${moving.map((w) => `"${w.text}"`).join(", ")}`);
    const failing = r.words.filter((w) => w.seen && !w.moving.length && Object.values(w.by).some((ratio) => ratio + 1e-9 < w.need));
    words += r.words.length - hidden.length - moving.length;
    under += failing.length;
    unseen += hidden.length;
    if (hidden.length) console.log(`\n${r.at}  not on the screen, so not measured: ${hidden.map((w) => `"${w.text}"`).join(", ")}`);
    if (r.error) console.log(`\n${r.at}\n  not measured: ${r.error}`);
    if (!failing.length) continue;
    console.log(`\n${r.at}  (${r.words.length} words handed over, ${failing.length} under their need)`);
    for (const w of failing) {
      const by = Object.entries(w.by)
        .map(([palette, ratio]) => `${palette} ${ratio.toFixed(2)}${ratio + 1e-9 < w.need ? " FAIL" : ""}`)
        .join(", ");
      console.log(`  "${w.text}" needs ${w.need}: ${by}\n      ${w.why}`);
    }
  }
  const screens = results.filter((r) => r.words.length).length;
  const errors = results.filter((r) => r.error).length;
  // Allowed by name and reason: said once per reason, with how many words carry it and where.
  const reasons = new Map();
  for (const r of results) for (const [why, n] of Object.entries(r.allowed ?? {})) reasons.set(why, { n: (reasons.get(why)?.n ?? 0) + n, at: [...(reasons.get(why)?.at ?? []), r.at] });
  if (reasons.size) console.log("\nallowed by name and reason, so not measured:");
  for (const [why, { n, at }] of reasons) console.log(`  ${n} word(s) on ${at.join(", ")}: ${why}`);
  console.log(
    `\n${words} words handed over on ${screens} of ${results.length} screens, each measured by its pixels on five palettes: ${under} under their need, ${words - under} at or over it.${unseen ? ` ${unseen} more are not drawn on the screen at all (above).` : ""}${restless ? ` ${restless} stand on a ground that would not hold still (above).` : ""}${errors ? ` ${errors} screen(s) could not be measured.` : ""}`,
  );
  return under === 0 && errors === 0 && restless === 0;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--said")) {
  const argv = process.argv.slice(2).filter((a) => a !== "--said");
  const flag = (name) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const { SELLS_PLUS, readerWords } = await import("./lib/sells-plus.mjs");
  const online = argv.includes("--online");
  console.log(`Every word the checker hands over, measured by its pixels, ${online ? "reading the main web" : "with no network"}, ${readerWords(SELLS_PLUS)}`);
  const results = await saidWordsOnPictures({
    only: flag("--only")?.split(",") ?? null,
    workers: Number(flag("--workers") ?? 3),
    online,
    tell: (one, done, total) => {
      if (done % 20 === 0) console.log(`  ${done} of ${total}`);
    },
  });
  const ok = printSaidWords(results);
  if (flag("--json")) fs.writeFileSync(flag("--json"), JSON.stringify(results, null, 1));
  console.log(ok ? "\nPASS" : "\nFAIL");
  process.exitCode = ok ? 0 : 1;
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const { go } = await import("./lib/shell-server.mjs");
  const { openPhone } = await import("./mock-check.mjs");
  const only = process.argv[2]?.split(",") ?? Object.keys(PLACES);
  const { page, browser } = await openPhone({ scale: 1, set: { "purify.motion": "off" } });
  await serveCovers(page);
  let all = true;
  for (const name of only) {
    const place = PLACES[name];
    if (!place) throw new Error(`no place ${name}`);
    await go(page, place.to);
    await page.waitForSelector(place.ready, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2200);
    all = printWords(`${name}: ${place.selector}`, await wordsOnPicture(page, place.selector)) && all;
  }
  await browser.close();
  console.log(all ? "\nPASS" : "\nFAIL");
  process.exitCode = all ? 0 : 1;
}
