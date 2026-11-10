// English reads left to right under Arabic and Urdu (1.9, build 90 note 4).
//
// The app's words are English; only its interface is in 21 languages. Under
// Arabic or Urdu the whole page runs right to left, and English inherits that
// unless it says otherwise, so the rule is that words say their language and
// their direction together (lib/i18n/textDir.ts; the code is read by
// lib/i18n/__tests__/textDirection.test.ts). This reads what the export draws.
//
// One page of every route the export carries, reached the app's way (as
// scripts/stripe-walk.mjs reaches them), in Arabic and in Urdu. A block of
// English is the innermost block whose words hold no Arabic letters and 12 or
// more Latin ones. It fails when it runs right to left, or when the language
// it is announced in is the page's own (no lang nearer than <html>), and the
// walk names the route, the element and its first words. A block the reader
// writes (the journal, a note) says dir="auto" and may be either.
//
//   npm run build:android, then: node scripts/rtl-walk.mjs [out dir] [--only /path,/path] [--lang ar,ur]
//   node scripts/rtl-walk.mjs --self-test   (proves the measure on a page of its own; needs no export)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

/**
 * The blocks of English on the page that run right to left or are announced
 * in the page's language. Runs in the page. Exported for checkMock-style use.
 */
export function englishOutOfPlace() {
  const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const LATIN = /[A-Za-zÀ-ɏ]/g;
  const page = (document.documentElement.getAttribute("lang") || "").toLowerCase();
  const BLOCK = new Set(["block", "list-item", "flex", "grid", "table-cell", "table-caption", "flow-root", "inline-block"]);
  const isBlock = (el) => BLOCK.has(getComputedStyle(el).display);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const english = (text) => !ARABIC.test(text) && (text.match(LATIN) || []).length >= 12;
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!isBlock(el) || !visible(el)) continue;
    if (["SCRIPT", "STYLE", "SVG", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(el.tagName)) continue;
    const text = (el.innerText || "").replace(/\s+/g, " ").trim();
    if (!english(text)) continue;
    // Innermost: no block inside it holds a block of English of its own.
    const inner = [...el.querySelectorAll("*")].some((c) => isBlock(c) && visible(c) && english((c.innerText || "").replace(/\s+/g, " ").trim()));
    if (inner) continue;
    // A reader's own words may be in any language: they say dir="auto" and run as they are written.
    if (el.closest('[dir="auto"]')) continue;
    // Each run of English words where it sits: a row keeps the page's direction (its chevron, its
    // order) while the English inside it says its language and runs left to right.
    const why = new Set();
    let lang = page;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent.match(LATIN) || []).length) continue;
      const at = n.parentElement;
      if (!at || at.closest('[dir="auto"]')) continue;
      const said = at.closest("[lang]");
      const own = ((said && said !== document.documentElement ? said.getAttribute("lang") : page) || page).toLowerCase();
      if (getComputedStyle(at).direction === "rtl") why.add("runs right to left");
      if (own === page) {
        why.add(`is announced as ${page || "the page's language"}`);
        lang = own;
      } else if (lang === page) lang = own;
    }
    if (!why.size) continue;
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    out.push({ tag: el.tagName.toLowerCase(), id: el.closest("[id]")?.id ?? "", cls, lang, why: [...why].join(" and "), words: text.slice(0, 60) });
  }
  return out;
}

const SELF_TEST = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body style="width:390px">
<h1>عنوان الصفحة</h1>
<p id="bare">In the beginning was the Word, and the Word was with God.</p>
<p id="lang-only" lang="en">In the beginning was the Word, and the Word was with God.</p>
<p id="both" lang="en" dir="ltr">In the beginning was the Word, and the Word was with God.</p>
<p id="name-inside">قال القديس John Chrysostom في عظته</p>
<p id="own" dir="auto">My own note about this verse, in English.</p>
<a id="row" href="#" style="display:flex"><span lang="en" dir="ltr">St. John Chrysostom, Homilies on Matthew 1</span><span>›</span></a>
<a id="row-bare" href="#" style="display:flex"><span>St. John Chrysostom, Homilies on Matthew 2</span><span>›</span></a>
</body></html>`;

async function selfTest(browser) {
  const page = await browser.newPage();
  await page.setContent(SELF_TEST);
  const found = await page.evaluate(englishOutOfPlace);
  await page.close();
  // The bare paragraph and the one with lang alone fail, each for its reason; lang with dir, an
  // English name inside Arabic and a reader's own note pass.
  const got = Object.fromEntries(found.map((f) => [f.id, f.why]));
  // A row of the page's whose English says its language and runs left to right passes; the same row bare fails.
  const want = { bare: "runs right to left and is announced as ar", "lang-only": "runs right to left", "row-bare": "runs right to left and is announced as ar" };
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(ok ? "self-test: an unmarked block, one with lang alone and a bare row fail; lang with dir, a row whose English says both, an English name inside Arabic and a reader's own note pass" : `self-test FAILED: found ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  return ok;
}

/** Every page in app/ as its route: /saints/[slug] and the rest, groups and private folders left out. */
function patterns(dir = "app", parts = []) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "api" || name.startsWith("_") || name.startsWith("@") || name === "__tests__") continue;
      out.push(...patterns(full, /^\(.*\)$/.test(name) ? parts : [...parts, name]));
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
      out.push(parts);
    }
  }
  return out;
}

/** The export's pages, as the app's addresses: every folder with its payload, and the front door. */
function exported(dir, rel = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isDirectory() || name === "_next") continue;
    const at = `${rel}/${name}`;
    if (fs.existsSync(path.join(full, "index.txt"))) out.push(at);
    out.push(...exported(full, at));
  }
  return out;
}

function screens(OUT) {
  const pages = ["/", ...exported(OUT).sort()];
  const chosen = [];
  for (const parts of patterns()) {
    const re = new RegExp(
      `^${parts.map((p) => `/${/^\[\[?\.\.\./.test(p) ? ".+" : /^\[.*\]$/.test(p) ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("")}$`,
    );
    const found = parts.length === 0 ? "/" : pages.find((p) => re.test(p));
    if (found && !chosen.includes(found)) chosen.push(found);
  }
  return chosen.sort().map((p) => (p === "/" ? p : `${p}/`));
}

async function main() {
  const argv = process.argv.slice(2);
  const OWN = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
  if (argv.includes("--self-test")) {
    const ok = await selfTest(browser);
    await browser.close();
    process.exit(ok ? 0 : 1);
  }
  const take = (flag) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv.splice(at, 2)[1].split(",") : null;
  };
  const ONLY = take("--only");
  const LANGS = take("--lang") ?? ["ar", "ur"];
  const OUT = path.resolve(argv[0] ?? "out");
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);
  if (!(await selfTest(browser))) process.exit(1);

  const list = ONLY ?? screens(OUT);
  console.log(`${list.length} screens, in ${LANGS.join(" and ")}`);
  const failures = [];
  let blocks = 0;
  for (const lang of LANGS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem("purify:onboarded", "3");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("CapacitorStorage.purify_locale", l);
      } catch {}
    }, lang);
    await serveLikeTheShell(ctx, OUT, {});
    const page = await ctx.newPage();
    for (const [i, at] of list.entries()) {
      if (i % 25 === 0) console.log(`  ${lang}: ${i} of ${list.length}`);
      try {
        await go(page, at, { timeout: 15000 });
        await page.waitForTimeout(1500);
        const found = await page.evaluate(englishOutOfPlace);
        blocks += found.length;
        for (const f of found) failures.push(`${lang} ${at}: <${f.tag}${f.cls ? `.${f.cls}` : ""}> ${f.why}: "${f.words}"`);
      } catch (e) {
        failures.push(`${lang} ${at}: the walk could not measure it (${String(e).split("\n")[0].slice(0, 120)})`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures.length ? `\n${blocks} block(s) of English out of place:` : "\nevery block of English reads left to right, and says it is English");
  for (const f of failures) console.log(`  ${f}`);
  process.exit(failures.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
