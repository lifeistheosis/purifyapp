import { escapeHtml } from "./send";
import { SANS, SERIF, T } from "./theme";

/**
 * The pieces every Purify email is built from.
 *
 * Mail clients still need tables and inline styles, so the choice is between
 * one set of fragments used everywhere and each sender writing its own markup,
 * which is what happened before: four modules, four button styles, four greys.
 * Each helper here takes content and returns one block in the active theme
 * (lib/email/theme.ts).
 *
 * TWO FORMS OF EACH TEXT HELPER. `p` escapes what it is given, for copy that
 * comes from a template or a database row. `pHtml` does not, for the senders
 * that build a sentence with a <strong> in the middle and escape the values
 * themselves. Getting that backwards is how an order title with an ampersand
 * ends up as &amp;amp; in somebody's inbox, so the names say which is which.
 */

/** Running text. */
export function p(text: string, extra = ""): string {
  return pHtml(escapeHtml(text), extra);
}

/** Running text that already contains markup, escaped by the caller. */
export function pHtml(html: string, extra = ""): string {
  return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${T.body};${extra}">${html}</p>`;
}

/**
 * A picture across the letter. Plenty of clients show no image until asked,
 * so a picture is never the only place something is said: the alt text names
 * what it shows, and the words under it carry the rest. `width` is the widest
 * it is drawn, the letter's own measure; the file is twice that for sharp
 * screens. A JPEG or a PNG, because Outlook draws no WebP.
 */
export function picture(opts: { src: string; alt: string; width: number; href?: string }): string {
  const img = `<img src="${escapeHtml(opts.src)}" width="${opts.width}" alt="${escapeHtml(opts.alt)}" style="display:block;width:100%;max-width:${opts.width}px;height:auto;border:0;outline:none;text-decoration:none;border-radius:10px;font-family:${SANS};font-size:13px;line-height:1.5;color:${T.muted}">`;
  const inner = opts.href ? `<a href="${escapeHtml(opts.href)}" style="text-decoration:none">${img}</a>` : img;
  return `<div style="margin:0 0 24px">${inner}</div>`;
}

/**
 * A short list where each line opens with its own mark and name: what a
 * release brings. A table, because a list's bullets and indents are the part
 * of HTML that mail clients agree on least, and a mark in its own cell keeps
 * a second line from running back under it.
 */
export function pointRows(
  rows: readonly {
    emoji: string;
    name: string;
    text: string;
    /** A screenshot of the thing itself, under its line. Twice as wide as it is drawn. */
    picture?: { src: string; alt: string; width: number; height: number };
  }[],
): string {
  const cells = rows
    .map((r) => {
      // A phone's screen, drawn at a phone's shape and no wider than 300px,
      // so it reads as a picture of the app and not as a second banner.
      const shot = r.picture
        ? `<img src="${escapeHtml(r.picture.src)}" width="${Math.min(300, Math.round(r.picture.width / 2))}" alt="${escapeHtml(r.picture.alt)}" style="display:block;margin:14px 0 6px;width:100%;max-width:${Math.min(300, Math.round(r.picture.width / 2))}px;height:auto;border:1px solid ${T.line};border-radius:18px;font-family:${SANS};font-size:13px;line-height:1.5;color:${T.muted}">`
        : "";
      return (
        `<tr><td valign="top" width="34" style="width:34px;padding:0 0 16px;font-size:19px;line-height:28px">${escapeHtml(r.emoji)}</td>` +
        `<td valign="top" style="padding:0 0 16px;font-family:${SERIF};font-size:17px;line-height:28px;color:${T.body}">` +
        `<strong style="font-weight:600;color:${T.heading}">${escapeHtml(r.name)}.</strong> ${escapeHtml(r.text)}${shot}</td></tr>`
      );
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px">${cells}</table>`;
}

/** A quieter line: a caveat, a dispatch estimate, a note under a value. */
export function note(text: string): string {
  return pHtml(escapeHtml(text), `font-size:15px;color:${T.muted};`);
}

/** The small uppercase line that labels the value under it. */
export function microLabel(text: string): string {
  return `<p style="margin:8px 0 4px;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${T.muted}">${escapeHtml(text)}</p>`;
}

/** A tracking number, an order number: the thing the reader came to find. */
export function bigValue(html: string): string {
  return `<p style="margin:0 0 20px;font-family:${SANS};font-size:24px;font-weight:600;letter-spacing:1px;color:${T.heading}">${html}</p>`;
}

/** An inline link inside running text. */
export function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${T.link};text-decoration:none">${label}</a>`;
}

/** The one call to action. A table, because Outlook ignores padding on an <a>. */
export function button(opts: { label: string; href: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr><td bgcolor="${T.accent}" style="border-radius:${T.buttonRadius}px">
      <a href="${escapeHtml(opts.href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:${T.onAccent};text-decoration:none;border-radius:${T.buttonRadius}px">${escapeHtml(opts.label)}</a>
    </td></tr></table>`;
}

/** Somebody else's words, held apart from ours: a support message, a note. */
export function well(text: string): string {
  return `<div style="margin:0 0 16px;padding:14px 18px;background:${T.well};border-radius:8px;border:1px solid ${T.line};white-space:pre-wrap;font-family:${SERIF};font-size:16px;line-height:1.6;color:${T.body}">${escapeHtml(text)}</div>`;
}

/** A table of rows with hairlines, for a receipt or a week of days. */
export function table(rowsHtml: string, extra = ""): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;border-top:1px solid ${T.line};font-family:${SANS};font-size:15px;${extra}">${rowsHtml}</table>`;
}

/** One line of a receipt. `strong` marks the total. */
export function amountRow(label: string, amount: string, opts: { strong?: boolean; rule?: boolean } = {}): string {
  const weight = opts.strong ? "font-weight:600;" : "";
  const colour = opts.strong ? T.heading : T.body;
  const rule = opts.rule === false ? "" : `border-bottom:1px solid ${T.line};`;
  return `<tr><td style="padding:12px 12px 12px 0;${rule}color:${colour};line-height:1.45;${weight}">${escapeHtml(label)}</td><td align="right" style="padding:12px 0;${rule}color:${opts.strong ? T.heading : T.body};white-space:nowrap;${weight}">${escapeHtml(amount)}</td></tr>`;
}

/**
 * A day in the week ahead. The feast is what a reader is looking for, so it is
 * marked in the label rather than left to be spotted in a run of sentences.
 */
export function dayRow(line: { day: string; name: string; kind: "feast" | "saint" }): string {
  const feast = line.kind === "feast";
  return `<tr><td style="padding:14px 0;border-bottom:1px solid ${T.line}">
      <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${feast ? T.mark : T.muted}">${escapeHtml(line.day)}${feast ? " &middot; Feast" : ""}</p>
      <p style="margin:0;font-family:${SERIF};font-size:18px;line-height:1.4;color:${T.heading};${feast ? "font-weight:600;" : ""}">${escapeHtml(line.name)}</p>
    </td></tr>`;
}

/** "Edgar, the Purify Team", in the hand the app signs everything else with. */
export function signOff(text: string): string {
  return `<p style="margin:26px 0 0;font-family:${SERIF};font-style:italic;font-size:16px;color:${T.muted}">${escapeHtml(text)}</p>`;
}
