// The Purify email look (docs/brand/kit/email/README.md).
//
// One look, drawn from the app: its palettes (app/globals.css), its type
// (lib/email/theme.ts names the faces a mail client has), its page opening
// (the centred title and the short rule of a chapter's head), its Today card
// (a raised card with a full-width button), and for the Nativity Fast the
// night of its own star card (components/today/NativityStarCard.tsx,
// lib/reading/nativityStar.ts). No colour is typed in here: every one is read
// when this runs, from the design kit's tokens first (docs/brand/kit/tokens.css)
// and, for what the kit does not carry (the rubric, the fasting registers,
// the Night sky look), from the app's own stylesheet. So the look moves with
// the kit and the app.
//
// No parchment (his word, 2026-11-13: "stop using parchment for designs"):
// the dark palettes lead, and where a reader's screen is light the email is
// on a clean white carrying the app's ink, never the app's Light palette's
// aged paper. build.mjs refuses to write an email on that ground.
//
// Phone first (his word, 2026-11-13: "the design must be optimized for
// mobile"): one column, drawn for 360 to 412 and let out to 600; running text
// at 17px; every button and link 44px tall; the inline sizes are the phone's
// and a wide screen's are the exception.
//
//   node docs/brand/kit/email/build.mjs            the emails, the pictures, the page
//   node docs/brand/kit/email/build.mjs --no-shots the emails only (no browser)
//   node docs/brand/kit/email/check.mjs            checkMock on all of it
//
// What it writes, beside itself:
//   reader.html                 the reader email (the Sunday email as its sample)
//   reader-nativity-fast.html   the same email in the Nativity Fast
//   brief.html                  the owner's brief
//   img/                        the pictures the emails show
//   shots/                      each email as a mail client draws it, for the page
//   index.html                  the page that shows them
//
// Each email is one file for a mail client: tables, inline styles, no script.
// Its inline colours are the dark scheme, and one style block in its head
// turns it to the clean light where a client honours prefers-color-scheme. Nothing a
// reader needs is said only by a picture.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ── The app's tokens ────────────────────────────────────────────────────

const kit = read("docs/brand/kit/tokens.css");
const css = read("app/globals.css");

/** Every custom property set in the blocks that open with `selector {`, later blocks over earlier. */
function varsOf(sheet, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = {};
  for (const block of sheet.matchAll(new RegExp(`^${esc} \\{\\n([\\s\\S]*?)\\n\\}`, "gm"))) {
    for (const v of block[1].matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)) out[v[1]] = v[2].trim();
  }
  return out;
}

const toRgb = (value) => {
  const v = value.trim();
  if (v.startsWith("#")) {
    const h = v.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const parts = v.split(/\s+/).map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) return parts;
  throw new Error(`not a colour this reads: ${value}`);
};
const toHex = (rgb) => `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
/** `share` of `over` laid on `under`, as the app's text-paper/85 is laid on its page. */
const mix = (over, under, share) => toHex(toRgb(over).map((c, i) => c * share + toRgb(under)[i] * (1 - share)));
const lum = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The kit's Dark, which every other palette is laid over. */
const KIT_DARK = varsOf(kit, ":root");
/** What the kit does not carry, from the app: the rubric and the fasting registers of Dark. */
const APP_DARK = { ...varsOf(css, "@theme"), ...varsOf(css, ":root") };
const share = (v) => parseFloat(v) / 100;

/** The lowest share of the ink, from `from` up, whose words hold `floor`:1 on the page and on a raised card. */
function shareThatHolds(paper, ground, raised, from, floor) {
  for (let s = from; s <= 100; s += 2) {
    const c = mix(paper, ground, s / 100);
    if (ratio(c, ground) >= floor && ratio(c, raised) >= floor) return s / 100;
  }
  return 1;
}

/**
 * What an email wears on one palette. `k` is the kit's tokens for it and `app`
 * the app's own block for the same palette. A share of the ink is laid on the
 * page and written as one plain colour, because Outlook reads no transparency.
 */
function wearing(k, app) {
  const v = { ...KIT_DARK, ...k };
  const a = { ...APP_DARK, ...app };
  const ground = toHex(toRgb(v["k-ground"]));
  const raised = toHex(toRgb(v["k-card"]));
  const ink = toHex(toRgb(v["k-ink-base"]));
  return {
    ground, // the page: --k-ground
    raised, // a card: --k-card
    ink, // headings: --k-ink
    body: mix(ink, ground, share(v["k-ink-2-share"])), // running text: --k-ink-2
    quiet: mix(ink, ground, shareThatHolds(ink, ground, raised, parseFloat(v["k-ink-3-share"]), 4.6)), // labels: --k-ink-3, lifted where a palette needs it to hold on a card too
    line: mix(ink, ground, 0.1), // hairlines: --k-line
    rule: mix(ink, ground, 0.2), // a control's edge and the short rule: --k-line-strong
    mark: mix(ink, ground, shareThatHolds(ink, ground, raised, 30, 3.1)), // a chart's quiet marks: the ink at the share that holds 3:1
    button: ink, // the kit's button: the ink
    onButton: ground, // and its words: the ground
    rubric: toHex(toRgb(a["ink-rubric"])), // a feast's mark: the app's --ink-rubric
    fastStrict: toHex(toRgb(a["fast-strict"])), // the calendar's fasting registers: the app's --fast-*
    fastFish: toHex(toRgb(a["fast-fish"])),
    fastWineOil: toHex(toRgb(a["fast-wine-oil"])),
    fastFree: toHex(toRgb(a["fast-free"])),
    shop: v["k-money-shop"], // money's three hues: --k-money-*
    plus: v["k-money-plus"],
    box: v["k-money-box"],
  };
}

const kitOf = (mode) => varsOf(kit, `:root[data-reading-mode="${mode}"]`);
const appOf = (mode) => varsOf(css, `html[data-reading-mode="${mode}"]`);

/** The app's parchment: the ground, the card and the well of its Light palette. No design is set on these. */
const PARCHMENT = ["color-night", "color-night-soft", "color-night-deep"].map((n) => toHex(toRgb(appOf("parchment")[n])));

/**
 * The light an email wears: a clean white carrying the app's ink, never
 * parchment. The kit's own light comes first (tokens.css, "Light: a clean
 * neutral", from ef1bec40). Were the kit's light ever parchment again, it is
 * the app's own pair for a white page (@theme: --color-paper and --color-ink)
 * and a card one step of that ink off the page. Only the rubric and the
 * fasting registers are read from the app's Light palette: they are its inks
 * for a light page, not its paper.
 */
function cleanLight() {
  // The kit writes its light under both selectors, in one block or in two.
  const own = { ...varsOf(kit, ':root[data-theme="light"]'), ...kitOf("parchment") };
  if (own["k-ground"] && !PARCHMENT.includes(toHex(toRgb(own["k-ground"])))) return wearing(own, appOf("parchment"));
  const ground = toHex(toRgb(APP_DARK["color-paper"]));
  const ink = toHex(toRgb(APP_DARK["color-ink"]));
  const shares = kitOf("parchment");
  return wearing(
    { "k-ground": ground, "k-card": mix(ink, ground, 0.04), "k-ink-base": ink, "k-ink-2-share": shares["k-ink-2-share"], "k-ink-3-share": shares["k-ink-3-share"], "k-money-shop": shares["k-money-shop"] },
    appOf("parchment"),
  );
}

/**
 * The palettes an email is held on, by the attribute checkMock wears on
 * <html>. An email has two of its own, Dark and the clean light, and is drawn
 * on the app's three other dark palettes too. Where checkMock wears the
 * app's Light (data-reading-mode="parchment"), the email wears its clean
 * light, since that is what it is sent in on a light screen.
 */
export const PALETTES = {
  Dark: { mode: null, wears: wearing({}, {}) },
  Light: { mode: "parchment", wears: cleanLight() },
  Black: { mode: "black", wears: wearing(kitOf("black"), appOf("black")) },
  Candlelight: { mode: "candlelight", wears: wearing(kitOf("candlelight"), appOf("candlelight")) },
  Monastery: { mode: "monastery", wears: wearing(kitOf("monastery"), appOf("monastery")) },
};
// Night sky is one of the app's looks and not yet in the kit: its ground, its
// card and its ink are the app's (html[data-look="nightsky"]), at Dark's shares.
const SKY = varsOf(css, 'html[data-look="nightsky"]');
export const NIGHT_SKY = wearing({ "k-ground": SKY["color-night"], "k-card": SKY["color-night-soft"], "k-ink-base": SKY["color-paper"] }, SKY);

for (const w of [...Object.values(PALETTES).map((p) => p.wears), NIGHT_SKY]) {
  if (PARCHMENT.includes(w.ground) || PARCHMENT.includes(w.raised)) throw new Error("an email on parchment: no design uses the app's Light palette's paper (CLAUDE.md, \"No parchment in designs\")");
}
export { PARCHMENT };
const SLOTS = Object.keys(PALETTES.Dark.wears);

/** The Nativity card's night is dark on every palette (`dark-island`): Dark's own well and ink. */
const NIGHT = { ground: toHex(toRgb(KIT_DARK["k-well"])), ink: toHex(toRgb(KIT_DARK["k-ink-base"])) };
NIGHT.line = mix(NIGHT.ink, NIGHT.ground, 0.12); // the card's own edge: border-paper/12
NIGHT.words = mix(NIGHT.ink, NIGHT.ground, share(KIT_DARK["k-ink-2-share"]));

// The faces, as lib/email/theme.ts names them: Lora and DM Sans where a reader
// has them, Georgia and Arial everywhere else. Named, never fetched.
const SERIF = "Lora,Georgia,'Times New Roman',serif";
const SANS = "'DM Sans',Arial,Helvetica,sans-serif";

// ── Drawing ─────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The pen an email is drawn with. `how` is "email" (inline colours of `dark`,
 * a style block for Light) or "tokens" (the same marks with every colour a
 * custom property, for checkMock to wear the five palettes on).
 *   c({ bg, fg, bd }, "other:styles")   class and style for one element
 *   bgcolor(slot)                       the attribute Outlook reads
 */
function pen(how, dark) {
  const c = (slots, style = "") => {
    const cls = [];
    let colours = "";
    if (slots.bg) {
      cls.push(`g-${slots.bg}`);
      if (how === "email") colours += `background-color:${dark[slots.bg]};`;
    }
    if (slots.fg) {
      cls.push(`t-${slots.fg}`);
      if (how === "email") colours += `color:${dark[slots.fg]};`;
    }
    if (slots.bd) {
      cls.push(`b-${slots.bd}`);
      if (how === "email") colours += `border-color:${dark[slots.bd]};`;
    }
    if (slots.cls) cls.push(slots.cls);
    return ` class="${cls.join(" ")}" style="${style}${colours}"`;
  };
  const bgcolor = (slot) => (how === "email" ? ` bgcolor="${dark[slot]}"` : "");
  return { c, bgcolor, how, dark };
}

const rules = (wears, important) => {
  const bang = important ? " !important" : "";
  return SLOTS.map((s) => `.g-${s}{background-color:${wears[s]}${bang}}.t-${s}{color:${wears[s]}${bang}}.b-${s}{border-color:${wears[s]}${bang}}`).join("\n");
};

/** The head's style block. */
function sheet(how, { season }) {
  // The inline sizes are a phone's. A wide screen lets the title and the figures out.
  const phone = `@media (min-width:600px){.e-title{font-size:34px !important;line-height:42px !important}.e-fig{font-size:30px !important;line-height:36px !important}}`;
  if (how === "email") {
    // Dark is inline. Where a client says the reader's screen is light, the clean light.
    return `${phone}
@media (prefers-color-scheme: light){
${rules(PALETTES.Light.wears, true)}
.only-dark{display:none !important}
.only-light{display:block !important}
}`;
  }
  const vars = (w) => SLOTS.map((s) => `--e-${s}:${w[s]}`).join(";");
  return `${phone}
:root{${vars(PALETTES.Dark.wears)}}
${Object.values(PALETTES)
  .filter((p) => p.mode)
  .map((p) => `html[data-reading-mode="${p.mode}"]{${vars(p.wears)}}`)
  .join("\n")}
${season ? `html[data-look="nightsky"]{${vars(NIGHT_SKY)}}` : ""}
${SLOTS.map((s) => `.g-${s}{background-color:var(--e-${s})}.t-${s}{color:var(--e-${s})}.b-${s}{border-color:var(--e-${s})}`).join("\n")}
html[data-reading-mode="parchment"] .only-dark{display:none !important}
html[data-reading-mode="parchment"] .only-light{display:block !important}`;
}

/** A gap between two cells. A cell, not a padding, so the row mirrors in a right-to-left language. */
const gap = (w) => `<td width="${w}" style="width:${w}px;min-width:${w}px;font-size:0;line-height:0">&nbsp;</td>`;
const TABLE = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/** The shell: the page, the letter's column, the masthead, and the foot. */
function shell(p, { title, preheader, kind, rows, foot, season = false }) {
  const { c, bgcolor } = p;
  // The cross is the app's own mark (public/purify-cross-mark.png), and the
  // same mark in the page's ink where the page is light. The wordmark beside it
  // is live text, so a letter with every picture blocked still says Purify.
  const cross =
    `<img class="only-dark" src="img/cross.png" width="15" height="26" alt="" style="display:block;border:0;outline:none">` +
    `<img class="only-light" src="img/cross-ink.png" width="15" height="26" alt="" style="display:none;mso-hide:all;border:0;outline:none">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(title)}</title>
<style>
${sheet(p.how, { season })}
</style>
</head>
<body${c({ bg: "ground" }, "margin:0;padding:0;")}>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(preheader)}</div>
<table ${TABLE} width="100%"${bgcolor("ground")}${c({ bg: "ground" })}><tr><td style="padding:24px 16px 44px">
<!--[if mso]><table ${TABLE} width="600" align="center"><tr><td><![endif]-->
<table ${TABLE} width="100%" align="center" style="max-width:600px;margin:0 auto">
<tr><td style="padding:0 0 16px">
  <table ${TABLE} width="100%"><tr>
    <td width="15" valign="middle" style="width:15px">${cross}</td>
    ${gap(10)}
    <td width="100%" valign="middle"${c({ fg: "ink" }, `font-family:${SERIF};font-size:19px;line-height:26px;`)}>Purify</td>
    <td valign="middle"${c({ fg: "quiet" }, `white-space:nowrap;font-family:${SANS};font-size:12px;line-height:26px;font-weight:600;`)}>${esc(kind)}</td>
  </tr></table>
</td></tr>
<tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr>
${rows.join("\n")}
<tr><td style="padding:40px 0 0"><table ${TABLE} width="100%"><tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr></table></td></tr>
<tr><td align="center"${c({ fg: "quiet" }, `padding:20px 0 0;text-align:center;font-family:${SANS};font-size:13px;line-height:20px;`)}>
  ${foot}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

/** The opening, as a chapter opens in the app: a small line, the title, a line under it, the short rule. */
function opening(p, { eyebrow, title, sub, top = 40 }) {
  const { c } = p;
  return `<tr><td align="center" style="padding:${top}px 0 8px;text-align:center">
  ${eyebrow ? `<p${c({ fg: "quiet" }, `margin:0 0 10px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(eyebrow)}</p>` : ""}
  <h1${c({ fg: "ink", cls: "e-title" }, `margin:0;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:400;`)}>${esc(title)}</h1>
  ${sub ? `<p${c({ fg: "quiet" }, `margin:10px 0 0;font-family:${SERIF};font-style:italic;font-size:17px;line-height:25px;`)}>${esc(sub)}</p>` : ""}
  <table ${TABLE} align="center" style="margin:22px auto 0"><tr><td width="28" height="1"${p.bgcolor("rule")}${c({ bg: "rule" }, "width:28px;height:1px;font-size:0;line-height:0;")}>&nbsp;</td></tr></table>
</td></tr>`;
}

/** A section's own small heading. */
const label = (p, text, top = 36) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:${top}px 0 4px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(text)}</td></tr>`;

/** Running text. `html` is already escaped by its caller. */
const para = (p, html, top = 20) =>
  `<tr><td${p.c({ fg: "body" }, `padding:${top}px 0 0;font-family:${SERIF};font-size:17px;line-height:28px;`)}>${html}</td></tr>`;

/**
 * A link: a line of its own, underlined so it is found by its line and not
 * only by a colour, and 44 tall so a thumb finds it too. No link sits inside a
 * sentence, where it would be as small as the words.
 */
const link = (p, href, text) =>
  `<a href="${esc(href)}"${p.c({ fg: "ink" }, `display:inline-block;padding:13px 0;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:underline;`)}>${esc(text)}</a>`;
const linkRow = (p, href, text, top = 0) => `<tr><td style="padding:${top}px 0 0">${link(p, href, text)}</td></tr>`;

/** The one button: the app's own, its ink on its page, 48 tall. A table, because Outlook pads no link. */
const button = (p, { href, text }) =>
  `<table ${TABLE} width="100%" style="border-collapse:separate"><tr><td align="center"${p.bgcolor("button")}${p.c({ bg: "button" }, "border-radius:999px;text-align:center;")}>` +
  `<a href="${esc(href)}"${p.c({ fg: "onButton" }, `display:block;padding:15px 18px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:none;border-radius:999px;`)}>${esc(text)}</a>` +
  `</td></tr></table>`;

/** A quiet button, outlined: Unsubscribe, Hold. 44 tall. */
const quietButton = (p, { href, text }) =>
  `<a href="${esc(href)}"${p.c({ fg: "ink", bd: "rule" }, `display:inline-block;padding:13px 22px;border-width:1px;border-style:solid;border-radius:999px;font-family:${SANS};font-size:13px;line-height:16px;font-weight:600;text-decoration:none;`)}>${esc(text)}</a>`;

const FAST = {
  fish: { slot: "fastFish", words: "Fish allowed" }, // calendar.fast.fish
  strict: { slot: "fastStrict", words: "Strict fast" }, // calendar.fast.strict
  wineOil: { slot: "fastWineOil", words: "Wine and oil" }, // calendar.fast.wineOil
  free: { slot: "fastFree", words: "Fast-free" }, // calendar.fast.fastFree
};

/**
 * The week, as a leaf of the calendar: the day in the margin, the name beside
 * it. A feast is said in words and set heavier, in the rubric's colour where
 * the page has one. In a fast, each day says its fast, in the calendar's own
 * words and register.
 */
function days(p, lines, { fasts = false } = {}) {
  const { c } = p;
  const row = (l, i) => {
    const last = i === lines.length - 1;
    const edge = last ? "" : "border-bottom-width:1px;border-bottom-style:solid;";
    const feast = l.kind === "feast";
    const heavy = feast || l.heavy;
    const mark = l.mark ?? (feast ? "Feast" : null);
    const fast = fasts && l.fast ? FAST[l.fast] : null;
    // A row that is about the fast itself wears the fast's dot before its name.
    const dot = l.dot ? `<span${c({ fg: FAST[l.dot].slot })}>&#9679;</span>&nbsp;` : "";
    const under = [
      mark ? `<span${c({ fg: "rubric" }, "font-weight:600;")}>${esc(mark)}</span>` : "",
      fast ? `<span${c({ fg: fast.slot })}>&#9679;</span>&nbsp;${esc(fast.words)}` : "",
      l.under ? esc(l.under) : "",
    ]
      .filter(Boolean)
      .join(" &nbsp;&middot;&nbsp; ");
    return `<tr>
    <td width="44" valign="middle"${c({ bd: "line" }, `width:44px;padding:15px 0;${edge}`)}>
      <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:16px;`)}>${esc(l.weekday)}</p>
      <p${c({ fg: "ink" }, `margin:0;font-family:${SERIF};font-size:24px;line-height:30px;`)}>${esc(l.date)}</p>
    </td>
    <td width="14"${c({ bd: "line" }, `width:14px;font-size:0;line-height:0;${edge}`)}>&nbsp;</td>
    <td valign="middle"${c({ bd: "line" }, `padding:15px 0;${edge}`)}>
      <p${c({ fg: "ink" }, `margin:0;font-family:${SERIF};font-size:18px;line-height:25px;${heavy ? "font-weight:600;" : ""}`)}>${dot}${esc(l.name)}</p>
      ${under ? `<p${c({ fg: "quiet" }, `margin:3px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${under}</p>` : ""}
    </td>
  </tr>`;
  };
  return `<tr><td style="padding:22px 0 0"><table ${TABLE} width="100%">${lines.map(row).join("\n")}</table></td></tr>`;
}

/**
 * The week's saint, as Today's card stands in the app: a raised card, a small
 * line, the name, and one full-width button. The picture is the saint's own
 * from the library, never one on the heritage list
 * (lib/marketing/heritagePictures.ts).
 */
function saintCard(p, { small, name, epithet, picture, alt, href, action }) {
  const { c, bgcolor } = p;
  return `<tr><td style="padding:30px 0 0">
  <table ${TABLE} width="100%"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:20px;")}>
  <tr><td style="padding:16px">
    <table ${TABLE} width="100%"><tr>
      <td width="72" valign="middle" style="width:72px"><img src="${esc(picture)}" width="72" alt="${esc(alt)}"${c({ fg: "quiet" }, `display:block;width:72px;height:auto;border:0;outline:none;border-radius:14px;font-family:${SANS};font-size:12px;line-height:16px;`)}></td>
      ${gap(16)}
      <td valign="middle">
        <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(small)}</p>
        <p${c({ fg: "ink" }, `margin:4px 0 0;font-family:${SERIF};font-size:21px;line-height:27px;font-weight:600;`)}>${esc(name)}</p>
        <p${c({ fg: "quiet" }, `margin:4px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${esc(epithet)}</p>
      </td>
    </tr></table>
    <table ${TABLE} width="100%"><tr><td height="16" style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr></table>
    ${button(p, { href, text: action })}
  </td></tr>
  </table>
</td></tr>`;
}

const signOff = (p) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:28px 0 0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:24px;`)}>Edgar, the Purify Team</td></tr>`;

/** What a list email ends on (lib/email/consent.ts marketingFooter, lib/email/layout.ts): why it came, who sent it, and the button that stops it. */
const LIBRARY_WHY = "You are getting this because you turned on \u201cWhat is new in the library\u201d in your Purify settings.";
const readerFoot = (p, extra, why = LIBRARY_WHY) => `<p style="margin:0">${extra ? `${esc(extra)} ` : ""}${esc(why)}</p>
  <p style="margin:6px 0 0">The company's name and its postal address stand here.</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: "https://purifyapp.net/unsubscribe", text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, "https://purifyapp.net", "purifyapp.net")}</p>`;

// ── The sample ──────────────────────────────────────────────────────────
// The week of 15 November 2026 as the app's own calendar gives it
// (lib/email/weekly.ts weekAhead, lib/calendar/orthodox.ts commemorationsOn
// and fastingStatus, read on 2026-11-13). No line here was written for the
// picture. The feasts are named by their commemoration; see the README's
// note on the two days the Sunday email now names by the saint alone.

const WEEK = [
  { weekday: "Sun", date: "15", name: "St. Paisius Velichkovsky", kind: "saint", fast: "fish" },
  { weekday: "Mon", date: "16", name: "Holy Apostle and Evangelist Matthew", kind: "feast", fast: "fish" },
  { weekday: "Tue", date: "17", name: "St. Gregory the Wonderworker", kind: "saint", fast: "fish" },
  { weekday: "Fri", date: "20", name: "Forefeast of the Entrance of the Theotokos", kind: "feast", fast: "strict" },
  { weekday: "Sat", date: "21", name: "Entrance of the Most Holy Theotokos into the Temple", kind: "feast", fast: "fish" },
];
const SAINT = {
  small: "This week in the library",
  name: "St. Paisius Velichkovsky",
  epithet: "Elder of Neamț · Reviver of Hesychasm", // data/calendar/profiled-saints.json
  picture: "img/paisius-velichkovsky.jpg",
  alt: "St. Paisius Velichkovsky",
  href: "https://purifyapp.net/saints/paisius-velichkovsky",
  action: "Read about St. Paisius Velichkovsky", // lib/email/templates/contentBodies.ts weeklyBody
};

// ── The reader email ────────────────────────────────────────────────────

export function reader(how) {
  const p = pen(how, PALETTES.Dark.wears);
  return shell(p, {
    title: "The week ahead: Holy Apostle and Evangelist Matthew",
    preheader: "St. Paisius Velichkovsky, the Apostle Matthew, and the Entrance of the Theotokos.",
    kind: "Sunday, November 15",
    rows: [
      opening(p, { title: "The week ahead", sub: "November 15 to 21" }),
      days(p, WEEK),
      saintCard(p, SAINT),
      signOff(p),
    ],
    foot: readerFoot(p, "Dates follow the new calendar."),
  });
}

// ── The reader email in the Nativity Fast ───────────────────────────────

export const FAST_DAY = 1;

export function readerNativityFast(how, day = FAST_DAY) {
  const p = pen(how, NIGHT_SKY);
  const { c } = p;
  const n = String(day).padStart(2, "0");
  // The night of the app's own Nativity card, its star at this day's height.
  // A night on every palette, as the card is (`dark-island`): with pictures
  // blocked the cell is still a night, and its words say what the star does.
  const night = `<tr><td style="padding:24px 0 0">
  <table ${TABLE} width="100%" class="dark-island" bgcolor="${NIGHT.ground}" style="border-collapse:separate;background-color:${NIGHT.ground};border:1px solid ${NIGHT.line};border-radius:22px"><tr><td height="110" align="center" valign="middle" style="height:110px;text-align:center;font-size:0;line-height:0">
    <img src="img/nativity-night-${n}.png" width="558" alt="A night sky over a dark hill. The star stands a little above the horizon: day ${day} of 40." style="display:block;width:100%;height:auto;border:0;outline:none;border-radius:21px;font-family:${SANS};font-size:13px;line-height:20px;color:${NIGHT.words}">
  </td></tr></table>
</td></tr>`;
  return shell(p, {
    season: true,
    title: "The week ahead: the Nativity Fast begins",
    preheader: "The Nativity Fast begins today. St. Paisius Velichkovsky, the Apostle Matthew, and the Entrance of the Theotokos.",
    kind: "Sunday, November 15",
    rows: [
      night,
      // The card's own words (today.nativityStar.eyebrow and .title).
      opening(p, { eyebrow: `Nativity Fast · day ${day} of 40`, title: "The week ahead", sub: "The star rises a little each day", top: 30 }),
      days(p, WEEK, { fasts: true }),
      // today.nativity.invite, and the path it opens (lib/reading/nativity.ts).
      para(p, "A path for the fast: the Fathers, a day at a time.", 26),
      linkRow(p, "https://purifyapp.net/reading/paths/nativity", "Open the path"),
      saintCard(p, SAINT),
      signOff(p),
    ],
    foot: readerFoot(p, "Dates and fasting follow the new calendar."),
  });
}

// ── The owner's brief ───────────────────────────────────────────────────
// Every figure below is a sample, made up for the drawing. The real ones are
// read when the email is made and are never written into the repository
// (docs/plans/owner-desk.md, section 3). No reader is named, ever.

const BRIEF = {
  needs: [
    { text: "Two shop orders are paid and not yet sent.", href: "https://purifyapp.net/admin#tab=orders", action: "Open orders" },
    { text: "One report in the community waits for a look.", href: "https://purifyapp.net/admin#tab=reports", action: "Open reports" },
  ],
  figures: [
    { value: "1,240", name: "Visitors", against: "86 more than Wednesday" },
    { value: "58", name: "New readers", against: "4 fewer" },
    { value: "4", name: "Plus starts", against: "1 cancellation" },
  ],
  week: { title: "Visitors, the last seven days", days: ["F", "S", "S", "M", "T", "W", "T"], values: [1010, 1180, 1420, 1090, 1130, 1154, 1240] },
  money: {
    total: "$212.40",
    parts: [
      { slot: "shop", name: "Shop", amount: "$124.00", cents: 12400 },
      { slot: "plus", name: "Purify Plus", amount: "$58.40", cents: 5840 },
      { slot: "box", name: "EIKON Box", amount: "$30.00", cents: 3000 },
    ],
    back: "Refunds: none.",
  },
  opened: [
    { name: "Morning prayers", count: 312 },
    { name: "St. Nektarios of Aegina", count: 264 },
    { name: "John 1", count: 198 },
  ],
  missed: [
    { words: "akathist of thanksgiving", count: 6 },
    { words: "prayer before travel", count: 4 },
  ],
  unread: { name: "Errors", value: "not read" },
  out: { text: "The week ahead, the Sunday email, goes out at 9:00 unless you hold it.", href: "https://purifyapp.net/admin#tab=reach", action: "Hold" },
};

/** Three figures across: the number in the page's serif, its name, and the day before in words. */
function figures(p, list) {
  const { c, bgcolor } = p;
  const cell = (f) => `<td width="31%" valign="top"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "width:31%;padding:14px 6px 13px;border-width:1px;border-style:solid;border-radius:16px;text-align:center;")}>
      <p${c({ fg: "ink", cls: "e-fig" }, `margin:0;font-family:${SERIF};font-size:26px;line-height:32px;`)}>${esc(f.value)}</p>
      <p${c({ fg: "ink" }, `margin:2px 0 0;font-family:${SANS};font-size:13px;line-height:18px;font-weight:600;`)}>${esc(f.name)}</p>
      <p${c({ fg: "quiet" }, `margin:2px 0 0;font-family:${SANS};font-size:12px;line-height:17px;`)}>${esc(f.against)}</p>
    </td>`;
  const between = `<td width="3.5%" style="width:3.5%;font-size:0;line-height:0">&nbsp;</td>`;
  return `<tr><td style="padding:10px 0 0"><table ${TABLE} width="100%" style="border-collapse:separate"><tr>${list.map(cell).join(between)}</tr></table></td></tr>`;
}

/**
 * Seven columns, drawn with cells: one series, so no legend; the last day in
 * the page's ink with its number over it, the six before it quieter, each
 * day's letter under its column. A mail client runs no script, so there is
 * nothing to hover: every number a chart needs is said in words beside it.
 */
function columns(p, { title, days: names, values }) {
  const { c, bgcolor } = p;
  const H = 64;
  const top = Math.max(...values);
  const last = values.length - 1;
  const col = (v, i) => {
    const h = Math.max(2, Math.round((v / top) * H));
    const slot = i === last ? "ink" : "mark";
    return `<td width="10%" valign="bottom" align="center" style="width:10%;text-align:center">
      ${i === last ? `<p${c({ fg: "ink" }, `margin:0 0 4px;font-family:${SANS};font-size:12px;line-height:14px;font-weight:600;`)}>${v.toLocaleString("en-US")}</p>` : ""}
      <table ${TABLE} width="100%" style="border-collapse:separate"><tr><td height="${h}"${bgcolor(slot)}${c({ bg: slot }, `height:${h}px;font-size:0;line-height:0;border-radius:4px 4px 0 0;`)}>&nbsp;</td></tr></table>
    </td>`;
  };
  const space = `<td width="5%" style="width:5%;font-size:0;line-height:0">&nbsp;</td>`;
  const name = (d, i) => `<td width="10%" align="center"${c({ fg: i === last ? "ink" : "quiet" }, `width:10%;padding:6px 0 0;text-align:center;font-family:${SANS};font-size:12px;line-height:16px;${i === last ? "font-weight:600;" : ""}`)}>${esc(d)}</td>`;
  return `<tr><td style="padding:18px 0 0">
  <p${c({ fg: "quiet" }, `margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:18px;`)}>${esc(title)}</p>
  <table ${TABLE} width="100%" role="img" aria-label="${esc(title)}: ${values.map((v, i) => `${names[i]} ${v}`).join(", ")}">
    <tr>${values.map(col).join(space)}</tr>
    <tr>${names.map(name).join(space)}</tr>
  </table>
</td></tr>`;
}

/**
 * Money in, by where it came from: one bar in the money chart's own colours
 * (app/admin/admin-theme.css, --adm-money-*), a gap of the page between its
 * parts, and under it each part with its name and its amount in the page's
 * ink, so no part is told by its colour alone.
 */
function money(p, m) {
  const { c, bgcolor } = p;
  const all = m.parts.reduce((s, x) => s + x.cents, 0);
  const why = (slot) =>
    slot === "shop" ? "" : ` data-mock-allow="palette" data-mock-why="the money chart's own colour for ${slot === "plus" ? "Purify Plus" : "the EIKON Box"}, one on both of the panel's themes (app/admin/admin-theme.css)"`;
  const part = (x, i) => {
    const w = Math.round((x.cents / all) * 1000) / 10;
    const ends = i === 0 ? "4px 0 0 4px" : i === m.parts.length - 1 ? "0 4px 4px 0" : "0";
    return `<td width="${w}%" height="12"${bgcolor(x.slot)}${why(x.slot)}${c({ bg: x.slot }, `width:${w}%;height:12px;font-size:0;line-height:0;border-radius:${ends};`)}>&nbsp;</td>`;
  };
  const split = `<td width="2" style="width:2px;min-width:2px;font-size:0;line-height:0">&nbsp;</td>`;
  const key = (x) => `<tr>
      <td width="10" valign="middle" style="width:10px;min-width:10px"><table ${TABLE} width="10" style="border-collapse:separate;width:10px"><tr><td width="10" height="10"${bgcolor(x.slot)}${why(x.slot)}${c({ bg: x.slot }, "width:10px;min-width:10px;height:10px;font-size:0;line-height:0;border-radius:3px;")}>&nbsp;</td></tr></table></td>
      ${gap(10)}
      <td width="100%" valign="middle"${c({ fg: "body" }, `padding:6px 0;font-family:${SANS};font-size:16px;line-height:22px;`)}>${esc(x.name)}</td>
      <td valign="middle"${c({ fg: "ink" }, `padding:6px 0;white-space:nowrap;font-family:${SANS};font-size:16px;line-height:22px;font-weight:600;`)}>${esc(x.amount)}</td>
    </tr>`;
  return `<tr><td style="padding:6px 0 0">
  <p${c({ fg: "ink", cls: "e-fig" }, `margin:0 0 12px;font-family:${SERIF};font-size:26px;line-height:32px;`)}>${esc(m.total)}</p>
  <table ${TABLE} width="100%" dir="ltr" role="img" aria-label="Money in by source: ${m.parts.map((x) => `${x.name} ${x.amount}`).join(", ")}" style="border-collapse:separate"><tr>${m.parts.map(part).join(split)}</tr></table>
  <table ${TABLE} width="100%" style="margin:10px 0 0">${m.parts.map(key).join("\n")}</table>
  <p${c({ fg: "quiet" }, `margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${esc(m.back)}</p>
</td></tr>`;
}

/** What was opened most: a name, its count, and a bar to the longest. */
function bars(p, list) {
  const { c, bgcolor } = p;
  const top = Math.max(...list.map((x) => x.count));
  const row = (x) => {
    const w = Math.max(2, Math.round((x.count / top) * 100));
    return `<tr><td style="padding:10px 0 0">
      <table ${TABLE} width="100%"><tr>
        <td width="100%"${c({ fg: "body" }, `font-family:${SERIF};font-size:17px;line-height:24px;`)}>${esc(x.name)}</td>
        <td${c({ fg: "ink" }, `white-space:nowrap;font-family:${SANS};font-size:16px;line-height:24px;font-weight:600;`)}>${x.count.toLocaleString("en-US")}</td>
      </tr></table>
      <table ${TABLE} width="100%" style="border-collapse:separate;margin:5px 0 0"><tr>
        <td width="${w}%" height="6"${bgcolor("mark")}${c({ bg: "mark" }, `width:${w}%;height:6px;font-size:0;line-height:0;border-radius:3px;`)}>&nbsp;</td>
        ${w < 100 ? `<td style="font-size:0;line-height:0">&nbsp;</td>` : ""}
      </tr></table>
    </td></tr>`;
  };
  return `<tr><td><table ${TABLE} width="100%">${list.map(row).join("\n")}</table></td></tr>`;
}

/** Plain rows with a hairline between: words at the start, a value at the end. */
function pairs(p, list) {
  const { c } = p;
  return `<tr><td style="padding:4px 0 0"><table ${TABLE} width="100%">${list
    .map((x, i) => {
      const edge = i === list.length - 1 ? "" : "border-bottom-width:1px;border-bottom-style:solid;";
      return `<tr>
      <td width="100%"${c({ fg: "body", bd: "line" }, `padding:11px 0;font-family:${SERIF};font-size:17px;line-height:24px;${edge}`)}>${esc(x.words)}</td>
      <td${c({ fg: x.quiet ? "quiet" : "ink", bd: "line" }, `padding:11px 0;white-space:nowrap;font-family:${SANS};font-size:16px;line-height:24px;font-weight:600;${edge}`)}>${esc(x.value)}</td>
    </tr>`;
    })
    .join("\n")}</table></td></tr>`;
}

export function brief(how) {
  const p = pen(how, PALETTES.Dark.wears);
  const b = BRIEF;
  return shell(p, {
    title: "The owner's brief: Thursday, November 12",
    preheader: "Yesterday on one screen. Two things need you.",
    kind: "The owner's brief",
    rows: [
      opening(p, { eyebrow: "Friday, November 13", title: "Yesterday", sub: "A steady Thursday. Two things need you." }),
      label(p, "Needs you"),
      ...b.needs.flatMap((n, i) => [para(p, esc(n.text), i === 0 ? 2 : 6), linkRow(p, n.href, n.action)]),
      label(p, "Readers"),
      figures(p, b.figures),
      columns(p, b.week),
      label(p, "Money in"),
      money(p, b.money),
      label(p, "Opened most"),
      bars(p, b.opened),
      label(p, "Searched for and not found"),
      pairs(p, b.missed.map((m) => ({ words: m.words, value: `${m.count} times` }))),
      label(p, "Could not be read"),
      // A figure that could not be read says so, never 0.
      pairs(p, [{ words: b.unread.name, value: b.unread.value, quiet: true }]),
      label(p, "Goes out today"),
      para(p, esc(b.out.text), 2),
      `<tr><td style="padding:14px 0 0">${quietButton(p, { href: b.out.href, text: b.out.action })}</td></tr>`,
    ],
    foot: `<p style="margin:0">Figures were read at 7:30 this morning. This brief is made for the owner and goes to no reader.</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: "https://purifyapp.net/unsubscribe", text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, "https://purifyapp.net/admin", "Open the panel")}</p>`,
  });
}


// ── The retention emails ────────────────────────────────────────────────
// Three kinds, each on the same look and each one thing with one button (his
// word, 2026-11-13: "perfect let's build and I say yes or no to the design").
// The sending is another chat's, behind a switch that stays off until his
// yes. Every new line of words below waits for that yes too; the app's own
// words are named where they are used. No urging, no countdown, no streak:
// the calendar is the only urgency Purify uses (docs/brand/voice.md).

/** A card with no picture: a small line, a name, a line, and the one button. Today's card in the app. */
function stepCard(p, { small, name, line, href, action }) {
  const { c, bgcolor } = p;
  return `<tr><td style="padding:30px 0 0">
  <table ${TABLE} width="100%"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:20px;")}>
  <tr><td style="padding:16px">
    <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(small)}</p>
    <p${c({ fg: "ink" }, `margin:4px 0 0;font-family:${SERIF};font-size:21px;line-height:27px;font-weight:600;`)}>${esc(name)}</p>
    ${line ? `<p${c({ fg: "quiet" }, `margin:4px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${esc(line)}</p>` : ""}
    <table ${TABLE} width="100%"><tr><td height="16" style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr></table>
    ${button(p, { href, text: action })}
  </td></tr>
  </table>
</td></tr>`;
}

// The first week: three emails, on days 1, 3 and 7 of a new account. Each
// names one thing to do and shows where it stands among the three.
const FIRST_WEEK = [
  {
    day: 1,
    title: "Pray your first morning prayers",
    sub: "About eight minutes, whenever your day begins.",
    // today.prayNow.eyebrow, .morningFallback and .begin, and the card's own "8 min".
    card: { small: "Pray now", name: "Morning prayers", line: "8 min", href: "https://purifyapp.net/prayers", action: "Begin" },
  },
  {
    day: 3,
    title: "Choose your calendar",
    sub: "Every feast and fast in Purify follows the one you choose.",
    // calendar.reckoning.new and .old.
    card: { small: "The calendar", name: "New or Old", line: "New (Revised Julian) or Old (Julian), as your parish keeps it.", href: "https://purifyapp.net/calendar", action: "Choose your calendar" },
  },
  {
    day: 7,
    title: "Save your first verse",
    sub: "A verse you save is kept for you to find again.",
    // today.verseOfDay and common.save. The verse is the day's own from the app, word for word (here Luke 9:48, King James).
    card: { small: "Verse of the Day", name: "Luke 9:48", line: "he that is least among you all, the same shall be great.", href: "https://purifyapp.net/", action: "Save" },
  },
];
const FIRST_WEEK_WHY = "You are getting this because you opened a Purify account this week. There are three of these, on days 1, 3 and 7, and then they stop.";

export function firstWeek(how, day = 1) {
  const p = pen(how, PALETTES.Dark.wears);
  const step = FIRST_WEEK.find((s) => s.day === day);
  return shell(p, {
    title: `Your first week: ${step.title.charAt(0).toLowerCase()}${step.title.slice(1)}`,
    preheader: step.sub,
    kind: `Day ${day} of 7`,
    rows: [
      opening(p, { eyebrow: "Your first week", title: step.title, sub: step.sub }),
      stepCard(p, step.card),
      label(p, "The three steps", 34),
      days(p, FIRST_WEEK.map((s) => ({ weekday: "Day", date: String(s.day), name: s.title, heavy: s.day === day, mark: s.day === day ? "Today" : null }))).replace("padding:22px 0 0", "padding:2px 0 0"),
      signOff(p),
    ],
    foot: readerFoot(p, "", FIRST_WEEK_WHY),
  });
}

// Pick up where you left off: one personal line, and the way back to it. The
// line is the reader's own last place ("You were reading Romans 8") or a
// saint they saved whose feast is near ("St. Nicholas, whom you saved, is
// kept on December 6"). Nothing else about the reader is said.
const PICK_UP = {
  title: "You were reading Romans 8",
  sub: "It is where you left it.",
  card: { small: "The Bible", name: "Romans 8", line: "Chapter 8 of 16", href: "https://purifyapp.net/bible/romans/8", action: "Continue reading" },
};
const PICK_UP_WHY = "You are getting this because you have not opened Purify in two weeks. It comes once now and once more after a month, and then stops.";

export function pickUp(how) {
  const p = pen(how, PALETTES.Dark.wears);
  return shell(p, {
    title: PICK_UP.title,
    preheader: PICK_UP.sub,
    kind: "Friday, November 13",
    rows: [opening(p, { eyebrow: "Where you left off", title: PICK_UP.title, sub: PICK_UP.sub }), stepCard(p, PICK_UP.card), signOff(p)],
    foot: readerFoot(p, "", PICK_UP_WHY),
  });
}

// The fasting companion, the Nativity Fast first: an opening email on the
// fast's first day and a check-in each week. The week's fast, day by day, in
// the calendar's own words (lib/calendar/orthodox.ts fastingStatus, read on
// 2026-11-13 for 15 to 28 November 2026). No counsel is given: what a reader
// eats and how they keep the fast is their priest's to say, not an email's.
const FISH = "Fish, wine, and oil allowed."; // calendar.fast.nativityWeekend.rule, for Saturday and Sunday
const STRICT = "No meat, dairy, fish, wine, or oil."; // calendar.fast.nativityWedFri.rule
const fastWeek = (first) =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday, i) => {
    const strict = weekday === "Wed" || weekday === "Fri";
    const weekend = weekday === "Sat" || weekday === "Sun";
    // A weekday's rule in the calendar says fish and no more, so its name says it all.
    return { weekday, date: String(first + i), name: strict ? "Strict fast" : "Fish allowed", dot: strict ? "strict" : "fish", under: strict ? STRICT : weekend ? FISH : "" };
  });
const FAST_WHY = "You are getting this because you asked for the fasting companion. It comes on a fast's first day and once a week while the fast lasts.";
const FASTS = {
  opening: { day: 1, first: 15, title: "The fast begins", sub: "Forty days to the Nativity of Christ, from 15 November to 24 December.", week: "This week's fast" },
  week: { day: 8, first: 22, title: "The second week", sub: "Seven days in. Thirty-three to the feast.", week: "This week's fast" },
};

export function fastingCompanion(how, which = "opening") {
  const p = pen(how, NIGHT_SKY);
  const f = FASTS[which];
  const n = String(f.day).padStart(2, "0");
  const night = `<tr><td style="padding:24px 0 0">
  <table ${TABLE} width="100%" class="dark-island" bgcolor="${NIGHT.ground}" style="border-collapse:separate;background-color:${NIGHT.ground};border:1px solid ${NIGHT.line};border-radius:22px"><tr><td height="110" align="center" valign="middle" style="height:110px;text-align:center;font-size:0;line-height:0">
    <img src="img/nativity-night-${n}.png" width="558" alt="A night sky over a dark hill. The star stands above the horizon: day ${f.day} of 40." style="display:block;width:100%;height:auto;border:0;outline:none;border-radius:21px;font-family:${SANS};font-size:13px;line-height:20px;color:${NIGHT.words}">
  </td></tr></table>
</td></tr>`;
  return shell(p, {
    season: true,
    title: `The Nativity Fast: ${f.title.charAt(0).toLowerCase()}${f.title.slice(1)}`,
    preheader: f.sub,
    kind: `Sunday, November ${f.first}`,
    rows: [
      night,
      opening(p, { eyebrow: `Nativity Fast · day ${f.day} of 40`, title: f.title, sub: f.sub, top: 30 }),
      label(p, f.week, 30),
      days(p, fastWeek(f.first)).replace("padding:22px 0 0", "padding:2px 0 0"),
      para(p, "A path for the fast: the Fathers, a day at a time.", 26),
      linkRow(p, "https://purifyapp.net/reading/paths/nativity", "Open the path"),
      stepCard(p, { small: "The calendar", name: "Every day of the fast", line: "Each day's fast, its feast and its saints.", href: "https://purifyapp.net/calendar", action: "Open the calendar" }),
      signOff(p),
    ],
    foot: readerFoot(p, "Dates and fasting follow the new calendar.", FAST_WHY),
  });
}

export const EMAILS = [
  { file: "reader.html", name: "The reader email", make: reader, season: false },
  { file: "reader-nativity-fast.html", name: "The reader email in the Nativity Fast", make: readerNativityFast, season: true },
  { file: "brief.html", name: "The owner's brief", make: brief, season: false },
  // The retention emails. `light: false`: no light still is kept for it (its light is checked all the same).
  { file: "first-week-1.html", name: "The first week, day 1", make: (how) => firstWeek(how, 1), season: false },
  { file: "first-week-3.html", name: "The first week, day 3", make: (how) => firstWeek(how, 3), season: false, light: false },
  { file: "first-week-7.html", name: "The first week, day 7", make: (how) => firstWeek(how, 7), season: false, light: false },
  { file: "pick-up.html", name: "Pick up where you left off", make: pickUp, season: false },
  { file: "fast-opening.html", name: "The fasting companion, its opening", make: (how) => fastingCompanion(how, "opening"), season: true },
  { file: "fast-week.html", name: "The fasting companion, a week in", make: (how) => fastingCompanion(how, "week"), season: true, light: false },
];

// ── The pictures ────────────────────────────────────────────────────────

export async function browser() {
  const { createRequire } = await import("node:module");
  const { chromium } = createRequire(path.join(ROOT, "package.json"))("playwright");
  const own = "/opt/pw-browsers/chromium";
  return chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
}

/**
 * The night of the Nativity card on day `day`, at the letter's width: the
 * card's own drawing (components/today/NativityStarCard.tsx) by its own
 * numbers (lib/reading/nativityStar.ts), held still. Nothing here is drawn
 * anew: the small stars, the hill, its lit edge, the glow and the star of
 * eight points are the component's, and the star's height is starTop(day).
 */
async function nightPicture(b, day, to) {
  const { NIGHT_H, NIGHT_STARS, STAR_PX, STAR_X, starTop } = await import(path.join(ROOT, "lib/reading/nativityStar.ts"));
  const W = 558;
  const FIELD_W = 350;
  const stars = NIGHT_STARS.map((s) => `<span style="position:absolute;border-radius:50%;background:#fff;left:${(s.x / FIELD_W) * 100}%;top:${s.y - s.r}px;width:${s.r * 2}px;height:${s.r * 2}px;opacity:${s.o}"></span>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:${NIGHT.ground}">
<div style="position:relative;width:${W}px;height:${NIGHT_H}px;overflow:hidden;background:${NIGHT.ground}">
  ${stars}
  <span style="position:absolute;left:20%;width:103%;top:136px;height:84px;background:radial-gradient(closest-side, rgb(255 255 255 / 0.15), rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0))"></span>
  <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 ${FIELD_W} ${NIGHT_H}" preserveAspectRatio="none"><path d="M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H} Z" fill="${NIGHT.ground}"/></svg>
  <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 ${FIELD_W} ${NIGHT_H}" preserveAspectRatio="none">
    <defs><linearGradient id="edge" x1="0" x2="${FIELD_W}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.2"/></linearGradient></defs>
    <path d="M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H}" fill="none" stroke="url(#edge)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  </svg>
  <span style="position:absolute;display:block;left:calc(${STAR_X * 100}% - ${STAR_PX / 2}px);top:${starTop(day)}px;width:${STAR_PX}px;height:${STAR_PX}px">
    <span style="position:absolute;border-radius:50%;left:-19px;top:-19px;width:60px;height:60px;opacity:0.75;background:radial-gradient(circle, rgb(255 255 255 / 0.55) 0%, rgb(255 255 255 / 0.16) 35%, rgb(255 255 255 / 0) 70%)"></span>
    <svg width="${STAR_PX}" height="${STAR_PX}" viewBox="0 0 24 24" style="position:relative;filter:drop-shadow(0 0 4px rgb(255 255 255 / 0.9))"><rect x="5.6" y="5.6" width="12.8" height="12.8" fill="#fff"/><polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="#fff"/></svg>
  </span>
</div></body></html>`;
  const page = await b.newPage({ viewport: { width: W, height: NIGHT_H }, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.screenshot({ path: to, clip: { x: 0, y: 0, width: W, height: NIGHT_H } });
  await page.close();
}

/** The app's cross in the light page's ink: the same mark, its off-white taken for the ink. */
async function crossInInk(b, to) {
  const mark = fs.readFileSync(path.join(ROOT, "public/purify-cross-mark.png")).toString("base64");
  const page = await b.newPage({ viewport: { width: 177, height: 311 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0"><div style="width:177px;height:311px;background:${PALETTES.Light.wears.ink};-webkit-mask:url(data:image/png;base64,${mark}) center / 100% 100% no-repeat;mask:url(data:image/png;base64,${mark}) center / 100% 100% no-repeat"></div></body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: to, omitBackground: true });
  await page.close();
}

async function pictures(b) {
  const img = path.join(HERE, "img");
  fs.mkdirSync(img, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "public/purify-cross-mark.png"), path.join(img, "cross.png"));
  fs.copyFileSync(path.join(ROOT, "public/saints/icons/paisius-velichkovsky.v3.jpg"), path.join(img, "paisius-velichkovsky.jpg"));
  await crossInInk(b, path.join(img, "cross-ink.png"));
  // The night on the days an email here shows: the fast's first day, and a week in.
  for (const day of [FAST_DAY, FASTS.week.day]) await nightPicture(b, day, path.join(img, `nativity-night-${String(day).padStart(2, "0")}.png`));
}

/** Each email as a mail client that honours the reader's scheme draws it, at a phone's width. */
async function shots(b) {
  const dir = path.join(HERE, "shots");
  fs.mkdirSync(dir, { recursive: true });
  const take = async (file, scheme, name, { blocked = false } = {}) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    if (blocked) await page.route(/\.(png|jpg)$/, (r) => r.abort());
    await page.goto(`file://${path.join(HERE, file)}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, name), fullPage: true });
    await ctx.close();
  };
  for (const e of EMAILS) {
    const stem = e.file.replace(".html", "");
    await take(e.file, "dark", `${stem}.dark.png`);
    if (e.light !== false) await take(e.file, "light", `${stem}.light.png`);
  }
  await take("reader-nativity-fast.html", "dark", "reader-nativity-fast.no-pictures.png", { blocked: true });
}

// ── The run ─────────────────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const e of EMAILS) fs.writeFileSync(path.join(HERE, e.file), e.make("email"));
  console.log(`wrote ${EMAILS.map((e) => e.file).join(", ")}`);
  if (!process.argv.includes("--no-shots")) {
    const b = await browser();
    try {
      await pictures(b);
      await shots(b);
    } finally {
      await b.close();
    }
    console.log("wrote img/ and shots/");
  }
  const { page } = await import("./page.mjs");
  // The reasons for each choice, from the README's own table.
  const readme = fs.readFileSync(path.join(HERE, "README.md"), "utf8");
  const reasons = readme.slice(readme.indexOf("## Why the emails look as they do"), readme.indexOf("## The Nativity Fast"));
  const why = reasons.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| The choice") && !l.startsWith("|---")).map((l) => l.slice(1, -1).split("|").map((c) => c.trim()));
  fs.writeFileSync(path.join(HERE, "index.html"), page({ standalone: true, palettes: PALETTES, why }));
  // The page alone, as an Artifact takes it, when a place for it is named.
  const to = process.argv.find((a) => a.startsWith("--artifact="));
  if (to) fs.writeFileSync(to.slice("--artifact=".length), page({ standalone: false, palettes: PALETTES, why }));
  // The retention emails' own page, with their own reasons.
  const { retentionPage } = await import("./page.mjs");
  const kept = readme.slice(readme.indexOf("### Why the retention emails look as they do"));
  const whyKept = kept.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| The choice") && !l.startsWith("|---")).map((l) => l.slice(1, -1).split("|").map((c) => c.trim()));
  fs.writeFileSync(path.join(HERE, "retention.html"), retentionPage({ standalone: true, palettes: PALETTES, why: whyKept }));
  const toKept = process.argv.find((a) => a.startsWith("--artifact-retention="));
  if (toKept) fs.writeFileSync(toKept.slice("--artifact-retention=".length), retentionPage({ standalone: false, palettes: PALETTES, why: whyKept }));
  console.log("wrote retention.html");
  console.log("wrote index.html");
}
