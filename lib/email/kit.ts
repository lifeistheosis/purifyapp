import { KIT_DARK, KIT_LIGHT, KIT_NIGHT, KIT_SLOTS, SANS, SERIF, type KitSlot, type KitWears } from "./theme";

/**
 * The design kit's email look, for the emails Purify sends (his yes,
 * 2026-11-13: "yes look").
 *
 * Ported from the kit's own builder (docs/brand/kit/email/build.mjs, the
 * Fable designer's): the same pieces, the same markup, so a letter sent is
 * the letter he said yes to. lib/email/__tests__/kit.test.ts draws the
 * kit's own samples with these functions and holds them, mark for mark, to
 * what the builder draws; the only difference allowed is where the pictures
 * live (the main web, here).
 *
 * THE LOOK, in the kit's words: the page is the letter (no card on a
 * canvas); it opens as a chapter opens in the app; one column at phone width,
 * let out to 600; running text 17px; every link a line of its own, 44 tall;
 * dark written inline, and one style block turns it to the clean light where
 * a reader's screen is light, never parchment; a feast said in words and set
 * heavier; labels in sentence case.
 *
 * Colours come from the email theme only (lib/email/theme.ts, KIT_*):
 * lib/email/__tests__/theme.test.ts fails on a colour written here.
 */

// ── The pen ─────────────────────────────────────────────────────────────

export const esc = (s: string | number): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Slots = { bg?: KitSlot; fg?: KitSlot; bd?: KitSlot; cls?: string };

export type Pen = {
  /** Class and style for one element: its slots' classes, and their dark colours inline. */
  c: (slots: Slots, style?: string) => string;
  /** The attribute Outlook reads. */
  bgcolor: (slot: KitSlot) => string;
  dark: KitWears;
};

/** The pen a letter is drawn with: `dark` inline (Dark, or Night sky in the fast), the clean light in the head. */
export function pen(dark: KitWears = KIT_DARK): Pen {
  const c = (slots: Slots, style = "") => {
    const cls: string[] = [];
    let colours = "";
    if (slots.bg) {
      cls.push(`g-${slots.bg}`);
      colours += `background-color:${dark[slots.bg]};`;
    }
    if (slots.fg) {
      cls.push(`t-${slots.fg}`);
      colours += `color:${dark[slots.fg]};`;
    }
    if (slots.bd) {
      cls.push(`b-${slots.bd}`);
      colours += `border-color:${dark[slots.bd]};`;
    }
    if (slots.cls) cls.push(slots.cls);
    return ` class="${cls.join(" ")}" style="${style}${colours}"`;
  };
  const bgcolor = (slot: KitSlot) => ` bgcolor="${dark[slot]}"`;
  return { c, bgcolor, dark };
}

const rules = (wears: KitWears, important: boolean) => {
  const bang = important ? " !important" : "";
  return KIT_SLOTS.map((s) => `.g-${s}{background-color:${wears[s]}${bang}}.t-${s}{color:${wears[s]}${bang}}.b-${s}{border-color:${wears[s]}${bang}}`).join("\n");
};

/** The head's style block: a wide screen lets the title and the figures out; a light screen wears the clean light. */
function sheet(): string {
  const phone = `@media (min-width:600px){.e-title{font-size:34px !important;line-height:42px !important}.e-fig{font-size:30px !important;line-height:36px !important}}`;
  return `${phone}
@media (prefers-color-scheme: light){
${rules(KIT_LIGHT, true)}
.only-dark{display:none !important}
.only-light{display:block !important}
}`;
}

/** A gap between two cells. A cell, not a padding, so the row mirrors in a right-to-left language. */
export const gap = (w: number) => `<td width="${w}" style="width:${w}px;min-width:${w}px;font-size:0;line-height:0">&nbsp;</td>`;
export const TABLE = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/** Where the letters' pictures live: the main web (public/email/), or `img/` beside the kit's own files. */
export type Assets = { cross: string; crossInk: string };

/** The shell: the page, the letter's column, the masthead, and the foot. */
export function shell(
  p: Pen,
  opts: { title: string; preheader: string; kind: string; rows: string[]; foot: string; assets: Assets },
): string {
  const { c, bgcolor } = p;
  // The cross is the app's own mark, and the same mark in the page's ink
  // where the page is light. The wordmark beside it is live text, so a letter
  // with every picture blocked still says Purify.
  const cross =
    `<img class="only-dark" src="${esc(opts.assets.cross)}" width="15" height="26" alt="" style="display:block;border:0;outline:none">` +
    `<img class="only-light" src="${esc(opts.assets.crossInk)}" width="15" height="26" alt="" style="display:none;mso-hide:all;border:0;outline:none">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(opts.title)}</title>
<style>
${sheet()}
</style>
</head>
<body${c({ bg: "ground" }, "margin:0;padding:0;")}>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(opts.preheader)}</div>
<table ${TABLE} width="100%"${bgcolor("ground")}${c({ bg: "ground" })}><tr><td style="padding:24px 16px 44px">
<!--[if mso]><table ${TABLE} width="600" align="center"><tr><td><![endif]-->
<table ${TABLE} width="100%" align="center" style="max-width:600px;margin:0 auto">
<tr><td style="padding:0 0 16px">
  <table ${TABLE} width="100%"><tr>
    <td width="15" valign="middle" style="width:15px">${cross}</td>
    ${gap(10)}
    <td width="100%" valign="middle"${c({ fg: "ink" }, `font-family:${SERIF};font-size:19px;line-height:26px;`)}>Purify</td>
    <td valign="middle"${c({ fg: "quiet" }, `white-space:nowrap;font-family:${SANS};font-size:12px;line-height:26px;font-weight:600;`)}>${esc(opts.kind)}</td>
  </tr></table>
</td></tr>
<tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr>
${opts.rows.join("\n")}
<tr><td style="padding:40px 0 0"><table ${TABLE} width="100%"><tr><td${c({ bd: "line" }, "border-top-width:1px;border-top-style:solid;font-size:0;line-height:0;height:0;")}>&nbsp;</td></tr></table></td></tr>
<tr><td align="center"${c({ fg: "quiet" }, `padding:20px 0 0;text-align:center;font-family:${SANS};font-size:13px;line-height:20px;`)}>
  ${opts.foot}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

// ── The pieces ──────────────────────────────────────────────────────────

/** The opening, as a chapter opens in the app: a small line, the title, a line under it, the short rule. */
export function opening(p: Pen, o: { eyebrow?: string; title: string; sub?: string; top?: number }): string {
  const { c } = p;
  const top = o.top ?? 40;
  return `<tr><td align="center" style="padding:${top}px 0 8px;text-align:center">
  ${o.eyebrow ? `<p${c({ fg: "quiet" }, `margin:0 0 10px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(o.eyebrow)}</p>` : ""}
  <h1${c({ fg: "ink", cls: "e-title" }, `margin:0;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:400;`)}>${esc(o.title)}</h1>
  ${o.sub ? `<p${c({ fg: "quiet" }, `margin:10px 0 0;font-family:${SERIF};font-style:italic;font-size:17px;line-height:25px;`)}>${esc(o.sub)}</p>` : ""}
  <table ${TABLE} align="center" style="margin:22px auto 0"><tr><td width="28" height="1"${p.bgcolor("rule")}${c({ bg: "rule" }, "width:28px;height:1px;font-size:0;line-height:0;")}>&nbsp;</td></tr></table>
</td></tr>`;
}

/** A section's own small heading. */
export const label = (p: Pen, text: string, top = 36) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:${top}px 0 4px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(text)}</td></tr>`;

/** Running text. `html` is already escaped by its caller. */
export const para = (p: Pen, html: string, top = 20) =>
  `<tr><td${p.c({ fg: "body" }, `padding:${top}px 0 0;font-family:${SERIF};font-size:17px;line-height:28px;`)}>${html}</td></tr>`;

/** A link: a line of its own, underlined, 44 tall. No link sits inside a sentence. */
export const link = (p: Pen, href: string, text: string) =>
  `<a href="${esc(href)}"${p.c({ fg: "ink" }, `display:inline-block;padding:13px 0;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:underline;`)}>${esc(text)}</a>`;
export const linkRow = (p: Pen, href: string, text: string, top = 0) => `<tr><td style="padding:${top}px 0 0">${link(p, href, text)}</td></tr>`;

/** The one button: the app's own, its ink on its page, 48 tall. A table, because Outlook pads no link. */
export const button = (p: Pen, b: { href: string; text: string }) =>
  `<table ${TABLE} width="100%" style="border-collapse:separate"><tr><td align="center"${p.bgcolor("button")}${p.c({ bg: "button" }, "border-radius:999px;text-align:center;")}>` +
  `<a href="${esc(b.href)}"${p.c({ fg: "onButton" }, `display:block;padding:15px 18px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:none;border-radius:999px;`)}>${esc(b.text)}</a>` +
  `</td></tr></table>`;

/** A quiet button, outlined: Unsubscribe, Hold. 44 tall. */
export const quietButton = (p: Pen, b: { href: string; text: string }) =>
  `<a href="${esc(b.href)}"${p.c({ fg: "ink", bd: "rule" }, `display:inline-block;padding:13px 22px;border-width:1px;border-style:solid;border-radius:999px;font-family:${SANS};font-size:13px;line-height:16px;font-weight:600;text-decoration:none;`)}>${esc(b.text)}</a>`;

/** The calendar's fasting registers, in its own words (calendar.fast.*). */
export const FAST: Record<"fish" | "strict" | "wineOil" | "free", { slot: KitSlot; words: string }> = {
  fish: { slot: "fastFish", words: "Fish allowed" },
  strict: { slot: "fastStrict", words: "Strict fast" },
  wineOil: { slot: "fastWineOil", words: "Wine and oil" },
  free: { slot: "fastFree", words: "Fast-free" },
};

export type KitDay = {
  /** "Sun". */
  weekday: string;
  /** "15". */
  date: string;
  name: string;
  kind: "feast" | "saint";
  /** The day's fast, when the letter says the fasts. */
  fast?: keyof typeof FAST | null;
  /** The fast in the calendar's own words for that day ("Fish allowed"); the register's own words when absent. */
  fastWords?: string;
  heavy?: boolean;
  mark?: string | null;
  dot?: keyof typeof FAST;
  under?: string;
};

/**
 * The week, as a leaf of the calendar: the day in the margin, the name beside
 * it. A feast is said in words and set heavier, in the rubric's colour where
 * the page has one. With `fasts`, each day says its fast, in the calendar's
 * own words and register.
 */
export function days(p: Pen, lines: readonly KitDay[], opts: { fasts?: boolean } = {}): string {
  const { c } = p;
  const fasts = opts.fasts ?? false;
  const row = (l: KitDay, i: number) => {
    const last = i === lines.length - 1;
    const edge = last ? "" : "border-bottom-width:1px;border-bottom-style:solid;";
    const feast = l.kind === "feast";
    const heavy = feast || l.heavy;
    const mark = l.mark ?? (feast ? "Feast" : null);
    const fast = fasts && l.fast ? FAST[l.fast] : null;
    const dot = l.dot ? `<span${c({ fg: FAST[l.dot].slot })}>&#9679;</span>&nbsp;` : "";
    const under = [
      mark ? `<span${c({ fg: "rubric" }, "font-weight:600;")}>${esc(mark)}</span>` : "",
      fast ? `<span${c({ fg: fast.slot })}>&#9679;</span>&nbsp;${esc(l.fastWords ?? fast.words)}` : "",
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
 * from the library, never one on the heritage list; without one the card
 * stands on its words (the kit's README, "For the build", 5).
 */
export function saintCard(
  p: Pen,
  s: { small: string; name: string; epithet?: string | null; picture?: string | null; alt?: string; href: string; action: string },
): string {
  const { c, bgcolor } = p;
  const words = `<td valign="middle">
        <p${c({ fg: "quiet" }, `margin:0;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;`)}>${esc(s.small)}</p>
        <p${c({ fg: "ink" }, `margin:4px 0 0;font-family:${SERIF};font-size:21px;line-height:27px;font-weight:600;`)}>${esc(s.name)}</p>
        ${s.epithet ? `<p${c({ fg: "quiet" }, `margin:4px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${esc(s.epithet)}</p>` : ""}
      </td>`;
  const picture = s.picture
    ? `<td width="72" valign="middle" style="width:72px"><img src="${esc(s.picture)}" width="72" alt="${esc(s.alt ?? s.name)}"${c({ fg: "quiet" }, `display:block;width:72px;height:auto;border:0;outline:none;border-radius:14px;font-family:${SANS};font-size:12px;line-height:16px;`)}></td>
      ${gap(16)}
      `
    : "";
  return `<tr><td style="padding:30px 0 0">
  <table ${TABLE} width="100%"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "border-collapse:separate;border-width:1px;border-style:solid;border-radius:20px;")}>
  <tr><td style="padding:16px">
    <table ${TABLE} width="100%"><tr>
      ${picture}${words}
    </tr></table>
    <table ${TABLE} width="100%"><tr><td height="16" style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr></table>
    ${button(p, { href: s.href, text: s.action })}
  </td></tr>
  </table>
</td></tr>`;
}

export const signOff = (p: Pen) =>
  `<tr><td${p.c({ fg: "quiet" }, `padding:28px 0 0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:24px;`)}>Edgar, the Purify Team</td></tr>`;

/** A picture across the letter (a release's), its words for a reader who sees only those. */
export function wide(p: Pen, img: { src: string; alt: string; width: number; height: number; href?: string }, top = 24): string {
  const pic = `<img src="${esc(img.src)}" width="568" alt="${esc(img.alt)}"${p.c({ fg: "quiet" }, `display:block;width:100%;max-width:568px;height:auto;border:0;outline:none;border-radius:16px;font-family:${SANS};font-size:13px;line-height:20px;`)}>`;
  return `<tr><td style="padding:${top}px 0 0">${img.href ? `<a href="${esc(img.href)}" style="text-decoration:none">${pic}</a>` : pic}</td></tr>`;
}

/** The night of the Nativity card, the star at the day's height: a night on every palette (`dark-island`). */
export function night(src: string, alt: string): string {
  return `<tr><td style="padding:24px 0 0">
  <table ${TABLE} width="100%" class="dark-island" bgcolor="${KIT_NIGHT.ground}" style="border-collapse:separate;background-color:${KIT_NIGHT.ground};border:1px solid ${KIT_NIGHT.line};border-radius:22px"><tr><td height="110" align="center" valign="middle" style="height:110px;text-align:center;font-size:0;line-height:0">
    <img src="${esc(src)}" width="558" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border:0;outline:none;border-radius:21px;font-family:${SANS};font-size:13px;line-height:20px;color:${KIT_NIGHT.words}">
  </td></tr></table>
</td></tr>`;
}

// ── The brief's pieces ──────────────────────────────────────────────────

/** Three figures across: the number in the page's serif, its name, and what it is held against in words. */
export function figures(p: Pen, list: readonly { value: string; name: string; against: string }[]): string {
  const { c, bgcolor } = p;
  const cell = (f: { value: string; name: string; against: string }) => `<td width="31%" valign="top"${bgcolor("raised")}${c({ bg: "raised", bd: "line" }, "width:31%;padding:14px 6px 13px;border-width:1px;border-style:solid;border-radius:16px;text-align:center;")}>
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
 * day's letter under its column. Every number is in the label for a screen
 * reader, as nothing can be hovered in a letter.
 */
export function columns(p: Pen, ch: { title: string; days: readonly string[]; values: readonly number[] }): string {
  const { c, bgcolor } = p;
  const H = 64;
  const top = Math.max(1, ...ch.values);
  const last = ch.values.length - 1;
  const col = (v: number, i: number) => {
    const h = Math.max(2, Math.round((v / top) * H));
    const slot: KitSlot = i === last ? "ink" : "mark";
    return `<td width="10%" valign="bottom" align="center" style="width:10%;text-align:center">
      ${i === last ? `<p${c({ fg: "ink" }, `margin:0 0 4px;font-family:${SANS};font-size:12px;line-height:14px;font-weight:600;`)}>${v.toLocaleString("en-US")}</p>` : ""}
      <table ${TABLE} width="100%" style="border-collapse:separate"><tr><td height="${h}"${bgcolor(slot)}${c({ bg: slot }, `height:${h}px;font-size:0;line-height:0;border-radius:4px 4px 0 0;`)}>&nbsp;</td></tr></table>
    </td>`;
  };
  const space = `<td width="5%" style="width:5%;font-size:0;line-height:0">&nbsp;</td>`;
  const name = (d: string, i: number) =>
    `<td width="10%" align="center"${c({ fg: i === last ? "ink" : "quiet" }, `width:10%;padding:6px 0 0;text-align:center;font-family:${SANS};font-size:12px;line-height:16px;${i === last ? "font-weight:600;" : ""}`)}>${esc(d)}</td>`;
  return `<tr><td style="padding:18px 0 0">
  <p${c({ fg: "quiet" }, `margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:18px;`)}>${esc(ch.title)}</p>
  <table ${TABLE} width="100%" role="img" aria-label="${esc(ch.title)}: ${ch.values.map((v, i) => `${ch.days[i]} ${v}`).join(", ")}">
    <tr>${ch.values.map(col).join(space)}</tr>
    <tr>${ch.days.map(name).join(space)}</tr>
  </table>
</td></tr>`;
}

export type MoneyPart = { slot: "shop" | "plus" | "box" | "ink"; name: string; amount: string; cents: number };

/**
 * Money in, by where it came from: one bar in the money chart's own colours,
 * a gap of the page between its parts, and under it each part with its name
 * and its amount in the page's ink, so no part is told by its colour alone.
 */
export function money(p: Pen, m: { total: string; parts: readonly MoneyPart[]; back: string }): string {
  const { c, bgcolor } = p;
  const shown = m.parts.filter((x) => x.cents > 0);
  const all = shown.reduce((s, x) => s + x.cents, 0);
  const why = (slot: string) =>
    slot === "shop" || slot === "ink"
      ? ""
      : ` data-mock-allow="palette" data-mock-why="the money chart's own colour for ${slot === "plus" ? "Purify Plus" : "the EIKON Box"}, one on both of the panel's themes (app/admin/admin-theme.css)"`;
  const part = (x: MoneyPart, i: number) => {
    const w = Math.round((x.cents / all) * 1000) / 10;
    const ends = shown.length === 1 ? "4px" : i === 0 ? "4px 0 0 4px" : i === shown.length - 1 ? "0 4px 4px 0" : "0";
    return `<td width="${w}%" height="12"${bgcolor(x.slot)}${why(x.slot)}${c({ bg: x.slot }, `width:${w}%;height:12px;font-size:0;line-height:0;border-radius:${ends};`)}>&nbsp;</td>`;
  };
  const split = `<td width="2" style="width:2px;min-width:2px;font-size:0;line-height:0">&nbsp;</td>`;
  const key = (x: MoneyPart) => `<tr>
      <td width="10" valign="middle" style="width:10px;min-width:10px"><table ${TABLE} width="10" style="border-collapse:separate;width:10px"><tr><td width="10" height="10"${bgcolor(x.slot)}${why(x.slot)}${c({ bg: x.slot }, "width:10px;min-width:10px;height:10px;font-size:0;line-height:0;border-radius:3px;")}>&nbsp;</td></tr></table></td>
      ${gap(10)}
      <td width="100%" valign="middle"${c({ fg: "body" }, `padding:6px 0;font-family:${SANS};font-size:16px;line-height:22px;`)}>${esc(x.name)}</td>
      <td valign="middle"${c({ fg: "ink" }, `padding:6px 0;white-space:nowrap;font-family:${SANS};font-size:16px;line-height:22px;font-weight:600;`)}>${esc(x.amount)}</td>
    </tr>`;
  const bar = all > 0
    ? `<table ${TABLE} width="100%" dir="ltr" role="img" aria-label="Money in by source: ${m.parts.map((x) => `${x.name} ${x.amount}`).join(", ")}" style="border-collapse:separate"><tr>${shown.map(part).join(split)}</tr></table>`
    : "";
  return `<tr><td style="padding:6px 0 0">
  <p${c({ fg: "ink", cls: "e-fig" }, `margin:0 0 12px;font-family:${SERIF};font-size:26px;line-height:32px;`)}>${esc(m.total)}</p>
  ${bar}
  <table ${TABLE} width="100%" style="margin:10px 0 0">${m.parts.map(key).join("\n")}</table>
  <p${c({ fg: "quiet" }, `margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:20px;`)}>${esc(m.back)}</p>
</td></tr>`;
}

/** What was opened most: a name, its count, and a bar to the longest. */
export function bars(p: Pen, list: readonly { name: string; count: number }[]): string {
  const { c, bgcolor } = p;
  const top = Math.max(1, ...list.map((x) => x.count));
  const row = (x: { name: string; count: number }) => {
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

/**
 * Plain rows with a hairline between: words at the start, a value at the end.
 * The value is set to the end of its column, so a short one lines up under a
 * long one ("right" for a mail app that knows no "end", then "end", which
 * mirrors in a right-to-left language).
 */
export function pairs(p: Pen, list: readonly { words: string; value: string; quiet?: boolean }[]): string {
  const { c } = p;
  return `<tr><td style="padding:4px 0 0"><table ${TABLE} width="100%">${list
    .map((x, i) => {
      const edge = i === list.length - 1 ? "" : "border-bottom-width:1px;border-bottom-style:solid;";
      return `<tr>
      <td width="100%"${c({ fg: "body", bd: "line" }, `padding:11px 0;font-family:${SERIF};font-size:17px;line-height:24px;${edge}`)}>${esc(x.words)}</td>
      <td${c({ fg: x.quiet ? "quiet" : "ink", bd: "line" }, `padding:11px 0;white-space:nowrap;text-align:right;text-align:end;font-family:${SANS};font-size:16px;line-height:24px;font-weight:600;${edge}`)}>${esc(x.value)}</td>
    </tr>`;
    })
    .join("\n")}</table></td></tr>`;
}
