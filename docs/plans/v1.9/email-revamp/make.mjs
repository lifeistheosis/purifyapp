#!/usr/bin/env node
// Stage 1 of the email revamp: the 1.9 release email in the new look, for
// the owner's yes or no. It changes nothing under lib/: it is a design.
//
//   node docs/plans/v1.9/email-revamp/make.mjs          writes release-1.9.html
//   node docs/plans/v1.9/email-revamp/make.mjs --check  and holds it to the rules
//
// The words are the email's own words today (lib/email/templates/contentBodies.ts,
// releaseBody, as `node scripts/release.mjs email` writes them); WORDS below
// is that letter, word for word. The pictures are the app's own screens
// (shots.mjs). The colours are the kit's Dark (docs/brand/kit/email/build.mjs,
// SENT), inline, as every email is sent.
//
// make("email") is the file a mail app gets. make("tokens") is the same
// drawing with every colour a custom property, so checkMock can wear the
// five palettes on it, as the kit's own emails are checked.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PALETTES, SENT, browser } from "../../../brand/kit/email/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const SHOTS = JSON.parse(fs.readFileSync(path.join(HERE, "shots.json"), "utf8")).screens;

const SITE = "https://purifyapp.net";
const NEW = `${SITE}/whats-new`;
const SANS = "'DM Sans',Arial,Helvetica,sans-serif";

/** The letter, word for word as it is sent today. `shot` names the app's screen beside a point. */
export const WORDS = {
  subject: "Purify 1.9: Keep a journal by the Church's day, and go deeper into every verse",
  kind: "What is new",
  title: "Purify 1.9",
  deck: "Keep a journal by the Church's day, and go deeper into every verse",
  opening: "1.9 is for keeping what you read. Here is what is new.",
  hero: { shot: "today", alt: "Today in Purify: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the verse of the day." },
  points: [
    { name: "Your journal, by the Church's day", text: "Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.", shot: "journal", alt: "The page of the journal for the day: the saint, the fast, and the Epistle and Gospel, each with a pen." },
    { name: "Every verse, opened", text: "Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.", shot: "verse", alt: "John 1:1 held open: the highlight colours, and Copy, Share, Image, Note and Study." },
    { name: "Seven more Bibles", text: "The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: Arabic, Spanish and Portuguese.", shot: "bibles", alt: "The translations list: the Russian Synodal, the Greek Septuagint and the Serbian Bible, each to download." },
    { name: "Study a verse, in Purify Plus", text: "Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.", shot: "study", alt: "The study sheet for John 1:1: the Greek, and Cross-references and Compare marked Purify Plus." },
    { name: "New reading plans, in Purify Plus", text: "John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.", shot: "plans", alt: "Reading plans in Purify." },
    { name: "The Creed by council", text: "The Symbol of Faith article by article, with the words the Council of Constantinople added lit.", shot: "creed", alt: "The Creed in Purify, article by article." },
    { name: "Church history on Today", text: "On the days an event of Orthodox History fell, it is on Today under the saint of the day." },
  ],
  after: [
    "Missed 1.8? It reads the whole New Testament aloud, verse by verse, and Toward the Nativity walks the forty days of the Nativity Fast with the Fathers, a day at a time.",
    "The Scriptures, the saints, the prayers and the calendar stay free.",
  ],
  action: "See everything that is new",
  signOff: "Edgar, the Purify Team",
  why: "You are getting this because you have a Purify account. We send it a few times a year, when a new version is released, and the button below stops it.",
  company: "Purify Orthodox LLC, (the postal address set on the server).",
  unsubscribe: `${SITE}/email/unsubscribe?t=3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f&l=release_news`,
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The kit's own pen: a class for the check's drawing, and Dark inline for the file that is sent. */
function pen(how) {
  const c = (slots, style = "") => {
    const cls = [];
    let colours = "";
    for (const [k, prefix, prop] of [["bg", "g", "background-color"], ["fg", "t", "color"], ["bd", "b", "border-color"]]) {
      if (!slots[k]) continue;
      cls.push(`${prefix}-${slots[k]}`);
      if (how === "email") colours += `${prop}:${SENT[slots[k]]};`;
    }
    if (slots.cls) cls.push(slots.cls);
    return ` class="${cls.join(" ")}" style="${style}${colours}"`;
  };
  const bgcolor = (slot) => (how === "email" ? ` bgcolor="${SENT[slot]}"` : "");
  return { c, bgcolor };
}

function sheet(how) {
  // The inline sizes are a phone's. A wide screen lets the headings and the cards' room out.
  const wide = `@media (min-width:600px){.e-title{font-size:56px !important;line-height:60px !important}.e-deck{font-size:24px !important;line-height:33px !important}.e-name{font-size:26px !important;line-height:32px !important}.e-words{padding:28px 32px 32px !important}}`;
  if (how === "email") return wide;
  const slots = Object.keys(SENT);
  const vars = (w) => slots.map((s) => `--e-${s}:${w[s]}`).join(";");
  return `${wide}
:root{${vars(PALETTES.Dark.wears)}}
${Object.values(PALETTES).filter((p) => p.mode).map((p) => `html[data-reading-mode="${p.mode}"]{${vars(p.wears)}}`).join("\n")}
${slots.map((s) => `.g-${s}{background-color:var(--e-${s})}.t-${s}{color:var(--e-${s})}.b-${s}{border-color:var(--e-${s})}`).join("\n")}`;
}

/** A screen of the app, the column's whole width. Its words stand in its place when pictures are off. */
function picture(p, shot, alt, { radius, href, pictures }) {
  const s = SHOTS[shot];
  if (!s) throw new Error(`no screen named ${shot}: run shots.mjs`);
  const img = `<img src="${pictures}${shot}.jpg" width="${Math.min(600, s.width)}" alt="${esc(alt)}"${p.c({ fg: "quiet", bg: "raised" }, `display:block;width:100%;max-width:100%;height:auto;border:0;outline:none;border-radius:${radius};font-family:${SANS};font-size:14px;line-height:21px;`)}>`;
  return href ? `<a href="${esc(href)}" style="display:block;text-decoration:none">${img}</a>` : img;
}

/** One new thing in its own card: the app's screen, its name, its words. */
function card(p, pt, pictures) {
  const top = pt.shot ? `<tr><td style="padding:0;font-size:0;line-height:0">${picture(p, pt.shot, pt.alt, { radius: "15px 15px 0 0", pictures })}</td></tr>` : "";
  return `<tr><td style="padding:16px 0 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"${p.bgcolor("raised")}${p.c({ bg: "raised", bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:16px;")}>
  ${top}
  <tr><td class="e-words" style="padding:22px 20px 24px">
    <h2${p.c({ fg: "ink", cls: "e-name" }, `margin:0;font-family:${SANS};font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.2px;`)}>${esc(pt.name)}</h2>
    <p${p.c({ fg: "body" }, `margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:25px;`)}>${esc(pt.text)}</p>
  </td></tr>
  </table>
</td></tr>`;
}

export function make(how, { pictures = "img/" } = {}) {
  const p = pen(how);
  const W = WORDS;
  const rows = [];

  // The masthead: the app's cross and its name as live words, so a letter with every picture blocked still says Purify.
  rows.push(`<tr><td style="padding:0 0 4px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="15" valign="middle" style="width:15px"><img class="only-dark" src="${pictures}cross.png" width="15" height="26" alt="" style="display:block;border:0;outline:none"></td>
    <td width="10" style="width:10px;min-width:10px;font-size:0;line-height:0">&nbsp;</td>
    <td width="100%" valign="middle"${p.c({ fg: "ink" }, `font-family:${SANS};font-size:18px;line-height:26px;font-weight:700;`)}>Purify</td>
    <td valign="middle"${p.c({ fg: "quiet" }, `white-space:nowrap;font-family:${SANS};font-size:13px;line-height:26px;font-weight:600;`)}>${esc(W.kind)}</td>
  </tr></table>
</td></tr>`);

  // The opening: the release's name large, and its own line under it.
  rows.push(`<tr><td style="padding:44px 0 0">
  <h1${p.c({ fg: "ink", cls: "e-title" }, `margin:0;font-family:${SANS};font-size:44px;line-height:48px;font-weight:700;letter-spacing:-1px;`)}>${esc(W.title)}</h1>
  <p${p.c({ fg: "body", cls: "e-deck" }, `margin:14px 0 0;font-family:${SANS};font-size:20px;line-height:28px;font-weight:400;`)}>${esc(W.deck)}</p>
</td></tr>`);

  // The hero: the app itself, as it opens.
  rows.push(`<tr><td style="padding:28px 0 0;font-size:0;line-height:0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"${p.c({ bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:20px;")}><tr><td style="padding:0;font-size:0;line-height:0">${picture(p, W.hero.shot, W.hero.alt, { radius: "19px", href: NEW, pictures })}</td></tr></table>
</td></tr>`);

  rows.push(`<tr><td${p.c({ fg: "body" }, `padding:28px 0 8px;font-family:${SANS};font-size:17px;line-height:27px;`)}>${esc(W.opening)}</td></tr>`);

  for (const pt of W.points) rows.push(card(p, pt, pictures));

  rows.push(`<tr><td${p.c({ fg: "body" }, `padding:32px 0 0;font-family:${SANS};font-size:16px;line-height:26px;`)}>${esc(W.after[0])}</td></tr>`);
  rows.push(`<tr><td${p.c({ fg: "ink" }, `padding:20px 0 0;font-family:${SANS};font-size:18px;line-height:27px;font-weight:700;`)}>${esc(W.after[1])}</td></tr>`);

  // The one button: 52px tall, across the column.
  rows.push(`<tr><td style="padding:28px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate"><tr><td align="center"${p.bgcolor("button")}${p.c({ bg: "button" }, "border-radius:999px;text-align:center;")}><a href="${NEW}"${p.c({ fg: "onButton" }, `display:block;padding:16px 18px;font-family:${SANS};font-size:16px;line-height:20px;font-weight:700;text-decoration:none;border-radius:999px;`)}>${esc(W.action)}</a></td></tr></table></td></tr>`);

  rows.push(`<tr><td${p.c({ fg: "quiet" }, `padding:28px 0 0;font-family:${SANS};font-size:15px;line-height:23px;`)}>${esc(W.signOff)}</td></tr>`);

  // The foot, whole: why it came, who sent it and from where, and the way out.
  rows.push(`<tr><td style="padding:40px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td${p.c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr></table></td></tr>
<tr><td${p.c({ fg: "quiet" }, `padding:20px 0 0;font-family:${SANS};font-size:13px;line-height:20px;`)}>
  <p style="margin:0">${esc(W.why)}</p>
  <p style="margin:6px 0 0">${esc(W.company)}</p>
  <p style="margin:18px 0 0"><a href="${esc(W.unsubscribe)}"${p.c({ fg: "ink", bd: "rule" }, `display:inline-block;padding:13px 22px;border-width:1px;border-style:solid;border-radius:999px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:600;text-decoration:none;`)}>Unsubscribe</a></p>
  <p style="margin:8px 0 0"><a href="${SITE}/"${p.c({ fg: "ink" }, `display:inline-block;padding:13px 0;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:underline;`)}>purifyapp.net</a></p>
</td></tr>`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(W.subject)}</title>
<style>
${sheet(how)}
</style>
</head>
<body${p.c({ bg: "ground" }, "margin:0;padding:0;")}>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(W.deck)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"${p.bgcolor("ground")}${p.c({ bg: "ground" })}><tr><td style="padding:24px 16px 44px">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" align="center" style="max-width:600px;margin:0 auto">
${rows.join("\n")}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

// ── The file, its stills and its check ───────────────────────────────────

const FILE = path.join(HERE, "release-1.9.html");
const args = process.argv.slice(2);
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  fs.copyFileSync(path.join(ROOT, "public/email/cross.png"), path.join(HERE, "img/cross.png"));
  const html = make("email");
  fs.writeFileSync(FILE, html);
  console.log(`release-1.9.html: ${Buffer.byteLength(html)} bytes`);
  const b = await browser();
  let ok = true;
  const fail = (what) => {
    ok = false;
    console.log(`FAIL: ${what}`);
  };

  // The stills: a phone's width for his page, and a wide one to see it widened.
  for (const [name, width, scale] of [["release-1.9-390.png", 390, 2], ["release-1.9-600.png", 680, 1]]) {
    const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: scale, colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(FILE).href, { waitUntil: "load" });
    await page.screenshot({ path: path.join(HERE, name), fullPage: true });
    await ctx.close();
  }

  if (args.includes("--check")) {
    const { checkMock, printMockCheck, PALETTES: WORN } = await import(pathToFileURL(path.join(ROOT, "scripts/mock-check.mjs")).href);
    const drawing = path.join(HERE, ".check-release-1.9.html");
    fs.writeFileSync(drawing, make("tokens"));
    for (const width of [360, 390, 412, 1032]) {
      const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 500, hasTouch: width < 500 });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(drawing).href, { waitUntil: "load" });
      const result = await checkMock(page, "body", { palettes: WORN });
      ok = printMockCheck(result, `the 1.9 release email, ${width} wide`) && ok;
      const wideAs = await page.evaluate(() => document.documentElement.scrollWidth);
      if (wideAs > width) fail(`${width} wide: the page scrolls sideways (${wideAs})`);
      // Every link is a target of 44px or more.
      const small = await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => ({ t: a.textContent.trim() || a.querySelector("img")?.alt, h: Math.round(a.getBoundingClientRect().height) })).filter((a) => a.h < 44));
      if (small.length) fail(`${width} wide: a target under 44px: ${JSON.stringify(small)}`);
      await ctx.close();
    }
    fs.rmSync(drawing);

    // The file a mail app gets: under 100 KB, no em dash, only Dark's own colours, every picture with its words and under 100 KB.
    if (Buffer.byteLength(html) >= 100_000) fail(`the HTML is ${Buffer.byteLength(html)} bytes: Gmail clips at about 102 KB`);
    if (/—/.test(html)) fail("an em dash");
    const dark = new Set(Object.values(SENT).map((v) => v.toLowerCase()));
    const strange = [...new Set(html.match(/#[0-9a-fA-F]{6}\b/g) ?? [])].filter((c) => !dark.has(c.toLowerCase()));
    if (strange.length) fail(`a colour that is not Dark's own: ${strange.join(", ")}`);
    if (/<script|<svg|<link|@import|url\(/i.test(html)) fail("a script, an SVG or something fetched that is not a picture");
    const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
    for (const tag of imgs) {
      const src = /src="([^"]+)"/.exec(tag)[1];
      if (!/alt="/.test(tag)) fail(`${src}: no alt`);
      if (!src.endsWith("cross.png") && !/alt="[^"]{20,}"/.test(tag)) fail(`${src}: its words are missing`);
      const bytes = fs.statSync(path.join(HERE, src)).size;
      if (bytes >= 100_000) fail(`${src} is ${bytes} bytes`);
    }

    // Pictures off: it still says who it is from and everything it has to say.
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
    await ctx.route(/\.(png|jpe?g)$/, (route) => route.abort());
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(FILE).href, { waitUntil: "load" });
    const said = await page.evaluate(() => document.body.innerText);
    for (const t of ["Purify", WORDS.title, WORDS.deck, WORDS.opening, ...WORDS.points.flatMap((pt) => [pt.name, pt.text]), ...WORDS.after, WORDS.action, WORDS.signOff, WORDS.why, WORDS.company, "Unsubscribe"]) {
      if (!said.includes(t)) fail(`with pictures off, missing: ${t}`);
    }
    await page.screenshot({ path: path.join(HERE, "release-1.9-390-pictures-off.png"), fullPage: true });
    await ctx.close();
    console.log(ok ? "\nThe 1.9 release email passes." : "\nThe 1.9 release email FAILS.");
  }
  await b.close();
  process.exit(ok ? 0 : 1);
}
