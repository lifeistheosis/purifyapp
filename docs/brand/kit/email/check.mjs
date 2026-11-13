// The email look, held to the app's guardrails (CLAUDE.md, "Mockups").
//
//   node docs/brand/kit/email/check.mjs
//
// 1. checkMock (scripts/mock-check.mjs) on each email, drawn with every
//    colour a custom property so it can wear the five palettes, at three
//    phones' widths (360, 390, 412) and at a wide one (1032). The Nativity Fast's email is held on the Night
//    sky look as well, which is what it wears in the dark.
// 2. The file a mail client gets is the same drawing: with the reader's
//    screen dark, every colour in it is the one the checked drawing wears on
//    Dark (on Night sky, in the fast), and with it light, the clean light
//    (which the drawing wears where checkMock wears the app's Light).
// 3. No parchment: no email and no page here is on the app's Light paper.
// 4. With every picture blocked, each email still says who it is from and
//    everything it has to say. No picture is on the heritage list.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { EMAILS, HEROES, browser, wearFaces } from "./build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const { checkMock, printMockCheck, PALETTES } = await import(path.join(ROOT, "scripts/mock-check.mjs"));

const NIGHT_SKY = ["Night sky", null, "nightsky"];
/** The drawing that wears the palettes, as a file beside the pictures it shows; taken away when the check ends. */
const drawing = (e) => {
  const file = path.join(HERE, `.check-${e.file}`);
  fs.writeFileSync(file, e.make("tokens"));
  return pathToFileURL(file).href;
};
const b = await browser();
let ok = true;

/** Every colour an element is drawn in, in the order of the page. */
const colours = (page) =>
  page.evaluate(() =>
    [...document.body.querySelectorAll("*")].concat(document.body).map((e) => {
      const cs = getComputedStyle(e);
      return [cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderBottomColor, cs.display === "none" ? "hidden" : "shown"].join(" ");
    }),
  );

try {
  for (const e of EMAILS) {
    // 1. checkMock, on the drawing that wears the palettes.
    for (const width of [360, 390, 412, 1032]) {
      const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 500, hasTouch: width < 500 });
      const page = await ctx.newPage();
      await page.goto(drawing(e), { waitUntil: "load" });
      // Round 2's widths are measured in the faces a mail app has (Georgia is wider than this machine's own serif).
      if (e.round === 2) await wearFaces(page);
      const result = await checkMock(page, "body", { palettes: e.season ? [...PALETTES, NIGHT_SKY] : PALETTES });
      ok = printMockCheck(result, `${e.name}, ${width} wide`) && ok;
      // Phone first: nothing runs past the screen's edge, and no word is cut by its box.
      // Held to the width asked for, not to window.innerWidth: a phone's browser
      // widens its own window to fit what spills, and then nothing seems to spill
      // (found 2026-11-13: a long button's name ran 3px past a 390 screen unseen).
      const spill = await page.evaluate((asked) => {
        const out = [];
        if (document.documentElement.scrollWidth > asked) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth} wide)`);
        for (const el of document.body.querySelectorAll("p, td, a, h1")) {
          const r = el.getBoundingClientRect();
          if (r.width && (r.right > asked + 0.5 || r.left < -0.5)) out.push(`past the edge: ${(el.innerText || "").slice(0, 40)}`);
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") out.push(`cut by its box: ${(el.innerText || "").slice(0, 40)}`);
        }
        return out;
      }, width);
      for (const line of spill) {
        ok = false;
        console.log(`  FAIL  ${e.name} at ${width}: ${line}`);
      }
      await ctx.close();
    }

    // 2. The mail client's file against the checked drawing.
    for (const [scheme, wears] of [["dark", e.season ? NIGHT_SKY : PALETTES[0]], ["light", PALETTES[1]]]) {
      const sent = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
      const a = await sent.newPage();
      await a.goto(pathToFileURL(path.join(HERE, e.file)).href);
      const drawn = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
      const t = await drawn.newPage();
      await t.goto(drawing(e), { waitUntil: "load" });
      await t.evaluate(([mode, look]) => {
        const h = document.documentElement;
        if (mode) h.setAttribute("data-reading-mode", mode);
        if (look) h.setAttribute("data-look", look);
      }, [wears[1], wears[2] ?? null]);
      const [x, y] = [await colours(a), await colours(t)];
      const differ = x.length !== y.length ? -1 : x.findIndex((v, i) => v !== y[i]);
      const same = x.length === y.length && differ === -1;
      console.log(`  ${same ? "ok  " : "FAIL"}  ${e.file}, the reader's screen ${scheme}: ${same ? `all ${x.length} pieces wear ${wears[0] === "Light" ? "the clean light" : wears[0]}` : `differs from ${wears[0]} at piece ${differ}: ${x[differ]} / ${y[differ]}`}`);
      ok = same && ok;
      await sent.close();
      await drawn.close();
    }

    // 3. Pictures blocked: the words are all there, and nothing in the file runs.
    const html = fs.readFileSync(path.join(HERE, e.file), "utf8");
    const plain = !/<script|javascript:|\son[a-z]+=|<link|@import|url\(/i.test(html);
    const alts = [...html.matchAll(/<img[^>]*>/g)].every((m) => /\salt="/.test(m[0]));
    const local = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].every((m) => fs.existsSync(path.join(HERE, m[1])));
    console.log(`  ${plain ? "ok  " : "FAIL"}  ${e.file}: no script, no handler, no stylesheet or font fetched`);
    console.log(`  ${alts && local ? "ok  " : "FAIL"}  ${e.file}: every picture has its words for a client that shows none, and its file is in img/`);
    // Gmail clips an email past 102KB of HTML; held well under it.
    const kb = Math.round(Buffer.byteLength(html) / 102.4) / 10;
    console.log(`  ${kb < 100 ? "ok  " : "FAIL"}  ${e.file}: ${kb}KB of HTML, under the 100KB a mail client shows whole`);
    ok = plain && alts && local && kb < 100 && ok;
  }

  // No parchment: no file here holds the app's Light palette's paper (CLAUDE.md, "No parchment in designs").
  const { PARCHMENT } = await import("./build.mjs");
  const papers = ["index.html", "retention.html", ...EMAILS.map((e) => e.file)].filter((f) => PARCHMENT.some((hex) => fs.readFileSync(path.join(HERE, f), "utf8").toLowerCase().includes(hex)));
  console.log(`  ${papers.length ? "FAIL" : "ok  "}  no parchment (${PARCHMENT.join(", ")}): ${papers.length ? papers.join(", ") : "in none of the emails, nor on the page"}`);
  ok = papers.length === 0 && ok;

  // Pictures compressed: none heavier than 100KB.
  const heavy = fs.readdirSync(path.join(HERE, "img")).map((f) => [f, fs.statSync(path.join(HERE, "img", f)).size]).filter(([, size]) => size > 100 * 1024);
  console.log(`  ${heavy.length ? "FAIL" : "ok  "}  the pictures: ${heavy.length ? heavy.map(([f, n]) => `${f} is ${Math.round(n / 1024)}KB`).join(", ") : "each under 100KB"}`);
  ok = heavy.length === 0 && ok;

  // The heritage list is kept out: no picture here is one of its files.
  const { HERITAGE_PICTURES } = await import(path.join(ROOT, "lib/marketing/heritagePictures.ts"));
  const held = new Set(HERITAGE_PICTURES.flatMap((h) => h.files.map((f) => path.basename(f).replace(/\.v\d+(?=\.)/, ""))));
  const shown = fs.readdirSync(path.join(HERE, "img"));
  const kept = shown.filter((f) => held.has(f));
  console.log(`  ${kept.length ? "FAIL" : "ok  "}  the heritage list (${held.size} files): ${kept.length ? kept.join(", ") : `none of img/'s ${shown.length} pictures is on it`}`);
  ok = kept.length === 0 && ok;
  // A night card's picture is cut from one of the app's files under a new name, so its source is held to the list too.
  const listed = new Set(HERITAGE_PICTURES.flatMap((h) => h.files));
  const cut = Object.values(HEROES).map((h) => h.from).filter((f) => [...listed].some((l) => f.endsWith(l)));
  console.log(`  ${cut.length ? "FAIL" : "ok  "}  the night cards' pictures: ${cut.length ? `${cut.join(", ")} on the heritage list` : `none of their ${Object.keys(HEROES).length} sources is on the heritage list`}`);
  ok = cut.length === 0 && ok;
} finally {
  await b.close();
  for (const e of EMAILS) fs.rmSync(path.join(HERE, `.check-${e.file}`), { force: true });
}

console.log(ok ? "\nThe email look passes." : "\nThe email look FAILS.");
process.exit(ok ? 0 : 1);
