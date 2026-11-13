import { SITE_URL } from "@/lib/site";

import { esc, gap, pen, TABLE, type Pen } from "../kit";
import type { EmailContent } from "../templates/build";
import { SIGN_OFF } from "../templates/build";
import { KIT_DARK, KIT_NIGHT, type KitSlot } from "../theme";

import { firstWeekLetter, type LetterDay, type RetentionLetter } from "./letters";
import { FIRST_WEEK, type FirstWeekStep } from "./plan";
import type { Frame } from "./render";

/**
 * The look of the three retention emails, his yes (2026-11-13 about 20:47
 * UTC, "yes to all": the emails' round 3 as drawn, every email Dark). Ported
 * from the kit's own builder (docs/brand/kit/email/build.mjs `retentionLook`,
 * the Fable designer's), piece for piece and mark for mark, as lib/email/kit.ts
 * ported the reader email: lib/email/retention/__tests__/look.test.ts draws
 * the kit's six sample letters with this file and holds each, byte for byte,
 * to what the builder draws, the only difference allowed being where the
 * pictures live (the main web's /email/, here; `img/` beside the kit's files).
 *
 * It draws a letter and its frame exactly as lib/email/retention/ makes them
 * and adds no sentence of its own (the arbiter's word, 2026-11-13). Which
 * picture a letter opens on is chosen here, by `letter.about`, and four calls
 * of the arbiter's brief of 2026-11-13 hold it to what the main web can carry:
 *
 *   - A Bible place or a work shows its heading and its deck only: no picture
 *     (the kit's cover is Romans' alone, and a cover drawn for each book and
 *     work is not made) and no sentence (the kit draws one only for a patron).
 *     A patron saint shows its sentence too, and no picture either.
 *   - Day 7, the verse, sets no verse: no letter quotes Scripture today.
 *   - The fast's one button is the letter's own action, its reading plan.
 *   - A plain fast day and a fast-free day have no mark picture yet: their
 *     name and rule are said in words, as a day with no fast has no mark.
 *
 * Round 2's faces (the kit's `wear(2)`): Georgia, which Apple Mail and
 * Outlook have, with Noto Serif for Android's Gmail; each system's own sans.
 * Named, never fetched.
 */

const SERIF = "Georgia,'Noto Serif','Times New Roman',serif";
const SANS = "'Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";

/** Where the pictures live: the main web's public/email/, which the merge serves. The test passes the kit's own `img/`. */
export type LookPictures = { base: string; site: string };
const ON_THE_WEB: LookPictures = { base: `${SITE_URL.replace(/\/$/, "")}/email/`, site: SITE_URL.replace(/\/$/, "") };

/** The night of the app's own cards (`dark-island`), the same on every palette. */
const NIGHT = KIT_NIGHT;

// ── The shell, round 2 ──────────────────────────────────────────────────

/** The head's style block: a wide screen lets the title out; a right-to-left reader's arrow turns. */
const SHEET = `@media (min-width:600px){.e-title{font-size:34px !important;line-height:42px !important}.e-fig{font-size:30px !important;line-height:36px !important}}
[dir="rtl"] .e-arrow{transform:scaleX(-1)}`;

function shell(p: Pen, at: LookPictures, o: { title: string; preheader: string; kind: string; rows: string[]; foot: string }): string {
  const { c, bgcolor } = p;
  const cross = `<img class="only-dark" src="${esc(`${at.base}cross.png`)}" width="15" height="26" alt="" style="display:block;border:0;outline:none">`;
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(o.title)}</title>
<style>
${SHEET}
</style>
</head>
<body${c({ bg: "ground" }, "margin:0;padding:0;")}>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(o.preheader)}</div>
<table ${TABLE} width="100%"${bgcolor("ground")}${c({ bg: "ground" })}><tr><td style="padding:24px 16px 44px">
<!--[if mso]><table ${TABLE} width="600" align="center"><tr><td><![endif]-->
<table ${TABLE} width="100%" align="center" style="max-width:600px;margin:0 auto">
<tr><td style="padding:0 0 16px">
  <table ${TABLE} width="100%"><tr>
    <td width="15" valign="middle" style="width:15px">${cross}</td>
    ${gap(10)}
    <td width="100%" valign="middle"${c({ fg: "ink" }, `font-family:${SERIF};font-size:19px;line-height:26px;`)}>Purify</td>
    <td valign="middle"${c({ fg: "quiet" }, `white-space:nowrap;font-family:${SANS};font-size:12px;line-height:26px;font-weight:600;`)}>${esc(o.kind)}</td>
  </tr></table>
</td></tr>
<tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr>
${o.rows.join("\n")}
<tr><td style="padding:40px 0 0"><table ${TABLE} width="100%"><tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr></table></td></tr>
<tr><td align="center"${c({ fg: "quiet" }, `padding:20px 0 0;text-align:center;font-family:${SANS};font-size:13px;line-height:20px;`)}>
  ${o.foot}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

// ── The pieces ──────────────────────────────────────────────────────────

/** Running text. `html` is already escaped by its caller. */
const para = (p: Pen, html: string, top = 20) =>
  `<tr><td${p.c({ fg: "body" }, `padding:${top}px 0 0;font-family:${SERIF};font-size:17px;line-height:28px;`)}>${html}</td></tr>`;

/** The letter's own line over the week: plain words at a reading size, not a label. */
const leadIn = (p: Pen, text: string) =>
  `<tr><td${p.c({ fg: "body" }, `padding:30px 0 0;font-family:${SANS};font-size:15px;line-height:22px;`)}>${esc(text)}</td></tr>`;

/** A quiet closing line: the calendar's own word on its fasting rules. */
const quietPara = (p: Pen, text: string, top = 14) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:${top}px 0 0;font-family:${SANS};font-size:14px;line-height:21px;`)}>${esc(text)}</td></tr>`;

const signOff = (p: Pen) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:28px 0 0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:24px;`)}>${SIGN_OFF}</td></tr>`;

/**
 * The one button, on the night card: the app's own pill (the Pray now card's
 * "Begin"), in the night's ink, with its arrow, 48 tall, as wide as its words.
 * Outlook on Windows pads no link and rounds no corner, so there it is the
 * same pill drawn as a shape (VML).
 */
function islandButton(at: LookPictures, b: { href: string; text: string }): string {
  const fill = NIGHT.ink;
  const words = NIGHT.ground;
  const arrow = `<img class="e-arrow" src="${esc(`${at.base}arrow.png`)}" width="15" height="15" alt="" style="display:inline-block;vertical-align:-2px;border:0;outline:none;">`;
  const type = `font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;`;
  const wide = Math.round(b.text.length * 8.6 + 56);
  return (
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(b.href)}" style="height:48px;v-text-anchor:middle;width:${wide}px;" arcsize="50%" stroke="f" fillcolor="${fill}"><w:anchorlock/><center style="color:${words};font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(b.text)}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-- --><table ${TABLE} style="border-collapse:separate"><tr><td bgcolor="${fill}" style="border-radius:999px;background-color:${fill};">` +
    `<a href="${esc(b.href)}" style="display:inline-block;padding:14px 22px;${type}text-decoration:none;border-radius:999px;color:${words};">${esc(b.text)}&nbsp;&nbsp;${arrow}</a>` +
    `</td></tr></table><!--<![endif]-->`
  );
}

/** The night card's picture: { src, alt }, and `night` for the Nativity card's own night. */
export type LookPicture = { src: string; alt: string; night?: boolean };

/**
 * The night card an email opens on: Today's own card in the app, a night on
 * every palette. The picture, a small line, the title, a line under it, and
 * the one button. Without a picture the card stands on its words.
 */
function lead(
  at: LookPictures,
  o: { picture?: LookPicture | null; small?: string; title: string; sub?: string; line?: string; action: { href: string; text: string } },
): string {
  const night = o.picture?.night === true;
  const tall = night ? 110 : 64;
  const say = (style: string, colour: string) => ` style="${style}color:${colour};"`;
  const pic = o.picture
    ? `<tr><td height="${tall}" align="center" valign="middle" style="height:${tall}px;text-align:center;font-size:0;line-height:0">
    <img src="${esc(o.picture.src)}" width="598" alt="${esc(o.picture.alt)}" style="display:block;width:100%;height:auto;border:0;outline:none;border-radius:21px 21px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${NIGHT.words}">
  </td></tr>`
    : "";
  return `<tr><td style="padding:24px 0 0">
  <table ${TABLE} width="100%" class="dark-island" bgcolor="${NIGHT.ground}" style="border-collapse:separate;background-color:${NIGHT.ground};border:1px solid ${NIGHT.line};border-radius:22px">
  ${pic}
  <tr><td style="padding:${!o.picture ? 22 : night ? 16 : o.small ? 4 : 8}px 20px 22px">
    ${o.small ? `<p${say(`margin:0;font-family:${SANS};font-size:13px;line-height:18px;font-weight:600;`, NIGHT.quiet)}>${esc(o.small)}</p>` : ""}
    <h1 class="e-title"${say(`margin:${o.small ? 6 : 0}px 0 0;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:700;`, NIGHT.ink)}>${esc(o.title)}</h1>
    ${o.sub ? `<p${say(`margin:10px 0 0;font-family:${SERIF};font-style:italic;font-size:17px;line-height:26px;`, NIGHT.words)}>${esc(o.sub)}</p>` : ""}
    ${o.line ? `<p${say(`margin:10px 0 0;font-family:${SANS};font-size:14px;line-height:21px;`, NIGHT.quiet)}>${esc(o.line)}</p>` : ""}
    ${"" /* the kit's verse, set whole above the button: none is (no letter quotes Scripture today; day 7 sets none) */}
    <table ${TABLE} width="100%"><tr><td height="20" style="height:20px;font-size:0;line-height:0">&nbsp;</td></tr></table>
    ${islandButton(at, o.action)}
  </td></tr>
  </table>
</td></tr>`;
}

/** The first week's three steps, as one strip: each by its letter's own heading, this email's under a heavier rule. It names no day. */
function steps(p: Pen, now: FirstWeekStep, names: Record<FirstWeekStep, string>): string {
  const { c } = p;
  const cell = (step: FirstWeekStep) => {
    const on = step === now;
    return `<td width="30%" valign="top"${c({ bd: on ? "ink" : "line" }, "width:30%;padding:12px 0 0;border-top-width:2px;border-top-style:solid;")}>
      <p${c({ fg: on ? "ink" : "body" }, `margin:0;font-family:${SERIF};font-size:16px;line-height:22px;${on ? "font-weight:700;" : ""}`)}>${esc(names[step])}</p>
    </td>`;
  };
  return `<tr><td style="padding:28px 0 0"><table ${TABLE} width="100%"><tr>${FIRST_WEEK.map((s) => cell(s.step)).join(gap(12))}</tr></table></td></tr>`;
}

type Register = "fish" | "strict" | "wineOil" | "fast" | "free" | "normal";
type Mark = { slot: KitSlot; tint: KitSlot; words: string; file?: string; short?: string };

/**
 * The calendar's registers, in its own words (calendar.fastShort.*), with the
 * mark each has as a picture. A plain fast and a fast-free day have none yet
 * (the arbiter's call, 2026-11-13): the kit draws them, and they go on when
 * their pictures do. A day with no fast has no mark, as in the app.
 */
const FAST: Record<Exclude<Register, "normal">, Mark> & { normal: { words: string } } = {
  fish: { slot: "fastFish", tint: "fastFishTint", words: "Fish allowed", file: "fast-fish", short: "Fish" },
  strict: { slot: "fastStrict", tint: "fastStrictTint", words: "Strict fast", file: "fast-strict", short: "Strict" },
  wineOil: { slot: "fastWineOil", tint: "fastWineOilTint", words: "Wine and oil", file: "fast-wine-oil", short: "Wine" },
  fast: { slot: "fastFast", tint: "fastFastTint", words: "Fast" },
  free: { slot: "fastFree", tint: "fastFreeTint", words: "Fast-free" },
  normal: { words: "No fast" },
};

/** The calendar's register for a day's fast, by its own kind (lib/calendar/orthodox.ts FastKind). */
const REGISTER: Record<string, Register> = { fish: "fish", strict: "strict", fast: "fast", "wine-oil": "wineOil", "fast-free": "free", normal: "normal" };

const markOf = (kind: Register): Mark | null => (kind === "normal" ? null : FAST[kind]);

/** A fast's mark as a picture in its register's own colour; its short word stands in where pictures are blocked. */
function fastMark(p: Pen, at: LookPictures, kind: Register, px = 18): string {
  const f = markOf(kind);
  if (!f?.file) return `<table ${TABLE}><tr><td width="${px}" height="${px}" style="width:${px}px;height:${px}px;font-size:0;line-height:0">&nbsp;</td></tr></table>`;
  const style = `border:0;outline:none;font-family:${SANS};font-size:11px;line-height:${px}px;`;
  return `<img src="${esc(`${at.base}${f.file}.png`)}" width="${px}" height="${px}" alt="${esc(f.short ?? "")}"${p.c({ fg: f.slot, cls: "only-dark" }, `display:block;${style}`)}>`;
}

/** The cross the calendar sets by a feast. Beside words it is an ornament; alone it says "Feast". */
const feastCross = (p: Pen, at: LookPictures, px: number, alone = false) =>
  `<img src="${esc(`${at.base}feast-cross.png`)}" width="${px}" height="${px}" alt="${alone ? "Feast" : ""}"${p.c({ fg: "festal", cls: "only-dark" }, `display:block;border:0;outline:none;font-family:${SANS};font-size:11px;line-height:${px}px;`)}>`;

/**
 * The week of a fast, as the app's own calendar stands on a phone
 * (components/calendar/PhoneCalendar.tsx): the week as one row of the month,
 * what each fast allows (the calendar's FastFact), and the feasts on the
 * calendar's own card. Nothing is told by a colour or a picture alone.
 */
function weekStrip(p: Pen, at: LookPictures, list: readonly LetterDay[]): string {
  const { c, bgcolor } = p;
  const reg = (l: LetterDay): Register => REGISTER[l.fast?.kind] ?? "normal";
  const feastOn = (l: LetterDay) => l.feasts?.length > 0;
  const wide = Math.floor(10000 / list.length) / 100;
  const hairline = `<table ${TABLE} width="100%"><tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr></table>`;

  const day = (l: LetterDay) => `<td width="${Math.floor(wide)}%" align="center" valign="top" style="width:${wide}%;text-align:center">
      <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:16px;`)}>${esc(l.weekday)}</p>
      <p${c({ fg: "ink" }, `margin:6px 0 0;font-family:${SANS};font-size:18px;line-height:24px;${feastOn(l) ? "font-weight:700;" : ""}`)}>${esc(l.date)}</p>
      <table ${TABLE} align="center" style="margin:6px auto 0"><tr><td>${fastMark(p, at, reg(l), 20)}</td>${feastOn(l) ? `${gap(3)}<td>${feastCross(p, at, 14, true)}</td>` : ""}</tr></table>
    </td>`;
  const label = list.map((l) => `${l.day ?? `${l.weekday} ${l.date}`}: ${[...(l.feasts ?? []), l.fast?.label].filter(Boolean).join(". ")}`).join("; ");
  const week = `<table ${TABLE} width="100%" role="img" aria-label="${esc(label)}"><tr>${list.map(day).join("")}</tr></table>`;

  // Each register the week holds, once, in the order the week meets it; under it each of its rules with the days that keep it.
  const fasts: { kind: Register; rules: { text: string; days: string[] }[] }[] = [];
  for (const l of list) {
    if (!l.fast) continue;
    let f = fasts.find((x) => x.kind === reg(l));
    if (!f) fasts.push((f = { kind: reg(l), rules: [] }));
    const text = l.fastRule || l.fast.label;
    const r = f.rules.find((x) => x.text === text);
    if (r) r.days.push(l.weekday);
    else f.rules.push({ text, days: [l.weekday] });
  }
  const disc = (kind: Register) => {
    const f = markOf(kind);
    if (!f?.file) return `<table ${TABLE} width="40" style="width:40px"><tr><td width="40" height="40" style="width:40px;height:40px;font-size:0;line-height:0">&nbsp;</td></tr></table>`;
    return `<table ${TABLE} width="40" style="border-collapse:separate;width:40px"><tr><td width="40" height="40" align="center" valign="middle"${bgcolor(f.tint)}${c({ bg: f.tint }, "width:40px;height:40px;border-radius:999px;text-align:center;font-size:0;line-height:0;")}><table ${TABLE} align="center" style="margin:0 auto"><tr><td>${fastMark(p, at, kind, 20)}</td></tr></table></td></tr></table>`;
  };
  const fast = (f: (typeof fasts)[number], i: number) => `${i === 0 ? "" : `<table ${TABLE} width="100%"><tr><td height="18" style="height:18px;font-size:0;line-height:0">&nbsp;</td></tr></table>${hairline}<table ${TABLE} width="100%"><tr><td height="18" style="height:18px;font-size:0;line-height:0">&nbsp;</td></tr></table>`}
    <table ${TABLE} width="100%"><tr>
      <td width="40" valign="top" style="width:40px">${disc(f.kind)}</td>
      ${gap(14)}
      <td width="100%" valign="top">
        <p${c({ fg: "ink" }, `margin:0;padding:1px 0 0;font-family:${SANS};font-size:16px;line-height:22px;font-weight:600;`)}>${esc(FAST[f.kind].words)}</p>
        ${f.rules
          .map(
            (r, n) => `<p${c({ fg: "quiet" }, `margin:${n === 0 ? 2 : 12}px 0 0;font-family:${SANS};font-size:13px;line-height:19px;font-weight:600;`)}>${esc(r.days.join(", "))}</p>
        <p${c({ fg: "body" }, `margin:1px 0 0;font-family:${SANS};font-size:15px;line-height:22px;`)}>${esc(r.text)}</p>`,
          )
          .join("\n        ")}
      </td>
    </tr></table>`;

  const feasts = list.filter(feastOn);
  const feast = (l: LetterDay, i: number) => {
    const edge = i === feasts.length - 1 ? "" : "border-bottom-width:1px;border-bottom-style:solid;";
    return `<tr>
      <td width="40" valign="top"${c({ bd: "line" }, `width:40px;padding:14px 0;${edge}`)}>
        <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:16px;`)}>${esc(l.weekday)}</p>
        <p${c({ fg: "ink" }, `margin:0;font-family:${SERIF};font-size:24px;line-height:30px;`)}>${esc(l.date)}</p>
      </td>
      <td width="14"${c({ bd: "line" }, `width:14px;min-width:14px;font-size:0;line-height:0;${edge}`)}>&nbsp;</td>
      <td width="100%" valign="middle"${c({ bd: "line" }, `padding:14px 0;${edge}`)}>
        <table ${TABLE}><tr><td valign="middle">${feastCross(p, at, 13)}</td>${gap(6)}<td valign="middle"${c({ fg: "quiet" }, `font-family:${SANS};font-size:12px;line-height:16px;font-weight:600;`)}>Major feast</td></tr></table>
        <p${c({ fg: "ink" }, `margin:3px 0 0;font-family:${SERIF};font-size:18px;line-height:25px;`)}>${esc(l.feasts.join(". "))}</p>
      </td>
    </tr>`;
  };
  const card = feasts.length
    ? `<tr><td style="padding:26px 0 0">
  <table ${TABLE} width="100%"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:20px;")}>
  <tr><td style="padding:2px 16px"><table ${TABLE} width="100%">${feasts.map(feast).join("\n")}</table></td></tr>
  </table>
</td></tr>`
    : "";

  return `<tr><td style="padding:18px 0 0">${week}</td></tr>
<tr><td style="padding:20px 0 0">${hairline}</td></tr>
${fasts.length ? `<tr><td style="padding:20px 0 0">${fasts.map(fast).join("\n")}</td></tr>` : ""}
${card}`;
}

/** The foot: the frame's own sentence (why the email came, who sent it and from where), then Unsubscribe as a plain link, 44 tall. */
function foot(p: Pen, at: LookPictures, frame: Frame): string {
  const link = (href: string, text: string) =>
    `<a href="${esc(href)}"${p.c({ fg: "quiet" }, `display:inline-block;padding:12px 0;font-family:${SANS};font-size:14px;line-height:20px;text-decoration:underline;`)}>${esc(text)}</a>`;
  const links: [string, string][] = [
    [frame.unsubscribeHref, "Unsubscribe"],
    [at.site, at.site.replace(/^https?:\/\//, "")],
  ];
  return `<p style="margin:0">${esc(frame.footer)}</p>
  <table ${TABLE} align="center" style="margin:8px auto 0"><tr>${links.map(([href, text]) => `<td>${link(href, text)}</td>`).join(gap(28))}</tr></table>`;
}

// ── The pictures ────────────────────────────────────────────────────────

/** Each first-week step's picture: the app's own, cut for the night card by the kit (docs/brand/kit/email/build.mjs HEROES). */
const STEP_PICTURE: Record<FirstWeekStep, { file: string; alt: string }> = {
  morning: { file: "hero-morning-prayers.jpg", alt: "The icon of the Resurrection" },
  calendar: { file: "hero-calendar.jpg", alt: "The Church calendar in Purify" },
  verse: { file: "hero-verse.jpg", alt: "The icon of Christ" },
};

/** The Nativity card's nights, one for each of the fast's forty days (public/email/nativity-night-NN.png). */
const NIGHTS = 40;

/**
 * The picture a letter opens on, by what it is about: a first-week step's
 * own; the Nativity card's night on the reader's day of the fast; none for
 * "where you left off" (a Bible place, a work or a patron saint), whose card
 * stands on its words.
 */
export function pictureFor(letter: RetentionLetter, at: LookPictures = ON_THE_WEB): LookPicture | null {
  const about = letter.about;
  if (about.kind === "first_week") {
    const s = STEP_PICTURE[about.step];
    return { src: `${at.base}${s.file}`, alt: s.alt };
  }
  if (about.kind === "fasting_companion" && about.fast === "nativity" && about.day >= 1 && about.day <= NIGHTS) {
    return { night: true, src: `${at.base}nativity-night-${String(about.day).padStart(2, "0")}.png`, alt: `The night sky, the star above the hill: day ${about.day} of ${about.of}` };
  }
  return null;
}

/** Each first-week step's own heading, for the strip. */
const STEP_NAMES = Object.fromEntries(FIRST_WEEK.map((s) => [s.step, firstWeekLetter(s.step).heading])) as Record<FirstWeekStep, string>;

// ── The look ────────────────────────────────────────────────────────────

/**
 * One letter drawn: the kit's `retentionLook(how, letter, frame, { picture,
 * stepNames })` for a letter a reader gets. `picture` is chosen by
 * `pictureFor` unless given (the test gives the kit's own).
 */
export function drawRetention(
  letter: RetentionLetter,
  frame: Frame,
  o: { picture?: LookPicture | null; at?: LookPictures } = {},
): string {
  const at = o.at ?? ON_THE_WEB;
  const picture = o.picture === undefined ? pictureFor(letter, at) : o.picture;
  const p = pen(KIT_DARK);
  const about = letter.about;
  const [first, ...rest] = letter.paragraphs;
  const action = { href: letter.action.href, text: letter.action.label };
  const rows: string[] = [];
  if (about.kind === "first_week") {
    rows.push(lead(at, { picture, title: letter.heading, sub: first, line: rest.join(" "), action }));
    rows.push(steps(p, about.step, STEP_NAMES));
  } else if (about.kind === "pick_up") {
    // The reader's own place is the title. The letter's one sentence is drawn only for a patron saint, where it says more than the title and its small line.
    rows.push(lead(at, { picture, small: letter.deck, title: letter.heading, sub: about.line === "patron" ? first : undefined, action }));
  } else {
    rows.push(lead(at, { picture, title: letter.heading, sub: letter.deck, action }));
    if (letter.days?.length) rows.push(leadIn(p, first), weekStrip(p, at, letter.days));
    // What follows the days: the fast's plan or prayer in the app's own words, then the calendar's own word on its rules, set quieter.
    const after = letter.after ?? [];
    after.slice(0, -1).forEach((t) => rows.push(para(p, esc(t), 22)));
    if (after.length) rows.push(quietPara(p, after[after.length - 1]));
  }
  rows.push(signOff(p));
  return shell(p, at, { title: letter.subject, preheader: first ?? letter.deck ?? letter.heading, kind: frame.eyebrow, rows, foot: foot(p, at, frame) });
}

/** The letter's plain text, for the part a mail app shows with no HTML: its words in order, the button said in words, the foot. */
function letterText(letter: RetentionLetter, frame: Frame): string {
  return [
    letter.heading,
    ...(letter.deck ? [letter.deck] : []),
    ...letter.paragraphs,
    ...(letter.days ?? []).map((d) => `${d.day}: ${d.name}`),
    ...(letter.after ?? []),
    `${letter.action.label}: ${letter.action.href}`,
    SIGN_OFF,
    "--",
    frame.footer,
    `Unsubscribe: ${frame.unsubscribeHref}`,
  ].join("\n\n");
}

/** The look, as render.ts's LOOKS takes it: one for all three emails. */
export function retentionLook(letter: RetentionLetter, frame: Frame): EmailContent {
  return { subject: letter.subject, html: drawRetention(letter, frame), text: letterText(letter, frame) };
}
