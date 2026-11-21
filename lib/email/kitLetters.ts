import { SITE_URL } from "@/lib/site";

import { button, buttonSans, closingLine, days, esc, hero, link, linkRow, night, opening, openingSans, para, paraSans, pen, pointCard, quietButton, saintCard, shell, signOff, signOffSans, wide, type Assets, type KitDay } from "./kit";
import type { EmailDay } from "./templates/build";
import type { MarketingBody } from "./templates/marketingBodies";
import { KIT_DARK } from "./theme";

/**
 * A list email in the design kit's look (his yes, 2026-11-13: "yes look"):
 * the Sunday email, the monthly note, a shop email and a release letter, each
 * from the body its draft already builds (lib/email/campaignDrafts.ts), drawn
 * with the kit's own pieces (lib/email/kit.ts), as the kit's README sets
 * which pieces each letter uses:
 *
 *   The Sunday email  "The week ahead", the week's dates; the week as a leaf
 *                     of the calendar; the week's saint on its card.
 *   In the Nativity   the same default colours (round 3), the night of the
 *   Fast              Nativity card for the day where it is drawn, "Nativity
 *                     Fast · day N of 40", each day's fast, and the path for
 *                     the fast.
 *   The monthly note  the month; its paragraphs; the one button.
 *   A release letter  from look 3 (his yes of 2026-11-21 to the 1.9 design,
 *                     docs/plans/v1.9/email-revamp/), all in the sans: the
 *                     release's name large and its own line under it; the
 *                     app's own screen as the hero; each point in its own
 *                     card, with its screen when it has one; the closing
 *                     line heavier; "See everything that is new". The other
 *                     letters keep look 2 until he says yes to theirs.
 *
 * Every letter ends on why it came, who sent it (the company and its postal
 * address), and the Unsubscribe button with this reader's own link.
 */

const site = (path: string) => `${SITE_URL.replace(/\/$/, "")}${path}`;

/** The letters' pictures, on the main web (public/email/). */
export const KIT_ASSETS: Assets = { cross: site("/email/cross.png") };

/**
 * The days of the Nativity Fast whose night is drawn (public/email/nativity-night-NN.png):
 * all forty, so every Sunday of every year's fast has its own. Each is the
 * Nativity card's night (components/today/NativityStarCard.tsx) held still,
 * by the kit's own drawing (docs/brand/kit/email/build.mjs, nightPicture),
 * the star at starTop(day) (lib/reading/nativityStar.ts); days 1 and 8 are
 * the kit's own files, and the rest were drawn by the same code, which
 * redraws those two byte for byte.
 */
export const NIGHTS_DRAWN: ReadonlySet<number> = new Set(Array.from({ length: 40 }, (_, i) => i + 1));

/** The night's words for a reader who sees no pictures: where the star stands, low on day 1 and near the top on day 40. */
export function nightAlt(day: number): string {
  const where = day <= 13 ? "stands a little above the horizon" : day <= 26 ? "stands halfway up the sky" : "stands high in the sky";
  return `A night sky over a dark hill. The star ${where}: day ${day} of 40.`;
}

/** A screenshot of a point, at a phone's width, centred. */
function shot(p: ReturnType<typeof pen>, img: { src: string; alt: string }): string {
  return `<tr><td align="center" style="padding:14px 0 0;text-align:center"><img src="${esc(img.src)}" width="300" alt="${esc(img.alt)}"${p.c({ fg: "quiet", bd: "line" }, `display:inline-block;width:300px;max-width:100%;height:auto;border-width:1px;border-style:solid;outline:none;border-radius:16px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;`)}></td></tr>`;
}

/** The calendar's fasting kind as the kit's register. A generic fast reads as the strict one, its own colour in the app. */
function fastKey(kind: string | undefined): KitDay["fast"] {
  switch (kind) {
    case "fish":
      return "fish";
    case "wine-oil":
      return "wineOil";
    case "fast-free":
      return "free";
    case "strict":
    case "fast":
      return "strict";
    default:
      return null;
  }
}

/** A day of the body as the kit's margin draws it; a body made before the kit gives its "Sunday, November 15". */
export function kitDay(d: EmailDay): KitDay {
  const m = /^(\w{3})\w*,\s+\w+\s+(\d{1,2})/.exec(d.day);
  return {
    weekday: d.weekday ?? m?.[1] ?? "",
    date: d.date ?? m?.[2] ?? "",
    name: d.name,
    kind: d.kind,
    fast: fastKey(d.fast?.kind),
    ...(d.fast?.label ? { fastWords: d.fast.label } : {}),
  };
}

/**
 * A release letter in look 3: the design he said yes to on 2026-11-21, piece
 * for piece (docs/plans/v1.9/email-revamp/make.mjs). Every word is the
 * body's own; nothing is written here.
 */
function releaseLetter(body: MarketingBody, opts: { kind: string; why: string; company: string; unsubscribeHref: string }): string {
  const p = pen(KIT_DARK);
  const rows: string[] = [];
  rows.push(openingSans(p, { title: body.heading, sub: body.deck }));
  if (body.image) rows.push(hero(p, { ...body.image, href: body.action?.href }));
  body.paragraphs.forEach((t, i) => rows.push(paraSans(p, esc(t), { top: i === 0 ? 28 : 12, bottom: i === body.paragraphs.length - 1 ? 8 : 0, size: 17 })));
  for (const pt of body.points ?? []) rows.push(pointCard(p, { name: pt.name.replace(/\.$/, ""), text: pt.text, picture: pt.picture }));
  // The lines after the cards; the last is the letter's closing, set heavier.
  const after = (body.after ?? []).filter((t) => t !== body.footNote);
  after.forEach((t, i) => rows.push(i === after.length - 1 ? closingLine(p, t) : paraSans(p, esc(t), { top: i === 0 ? 32 : 16 })));
  if (body.action) rows.push(buttonSans(p, { href: body.action.href, text: body.action.label }));
  rows.push(signOffSans(p));

  const foot = `<p style="margin:0">${body.footNote ? `${esc(body.footNote)} ` : ""}${esc(opts.why)}</p>
  <p style="margin:6px 0 0">${esc(opts.company)}</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: opts.unsubscribeHref, text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, site("/"), "purifyapp.net")}</p>`;

  const preheader = [body.deck, ...body.paragraphs, ...(body.after ?? [])].find((t) => t && t.trim()) ?? body.subject;
  return shell(p, { title: body.subject, preheader, kind: opts.kind, rows, foot, assets: KIT_ASSETS, sans: true });
}

export function kitLetter(
  body: MarketingBody,
  opts: {
    /** The small line at the masthead's end: the day for the Sunday email, the list for the rest. */
    kind: string;
    /** Why the email came, and who sent it with the postal address (lib/email/consent.ts). */
    why: string;
    company: string;
    /** This reader's own page for this list. */
    unsubscribeHref: string;
  },
): string {
  // A release letter with its points is the sans letter (look 3).
  if (body.points?.length) return releaseLetter(body, opts);
  const season = body.season?.kind === "nativity-fast" ? body.season : null;
  // Dark in a fast and out of it: every email keeps the app's default colours (his word, 2026-11-13).
  const p = pen(KIT_DARK);
  const rows: string[] = [];

  if (season && NIGHTS_DRAWN.has(season.day)) {
    const n = String(season.day).padStart(2, "0");
    rows.push(night(site(`/email/nativity-night-${n}.png`), nightAlt(season.day)));
  }
  rows.push(
    season
      ? opening(p, { eyebrow: `Nativity Fast · day ${season.day} of 40`, title: body.heading, sub: "The star rises a little each day", top: rows.length ? 30 : 40 })
      : opening(p, { title: body.heading, sub: body.deck }),
  );
  if (body.image) rows.push(wide(p, { ...body.image, href: body.action?.href }));
  body.paragraphs.forEach((t, i) => rows.push(para(p, esc(t), i === 0 ? 24 : 16)));
  if (body.lines?.length) rows.push(days(p, body.lines.map(kitDay), { fasts: !!season }));
  if (season) {
    // The card's own invitation, and the path it opens (lib/reading/paths.ts, "nativity").
    rows.push(para(p, esc("A path for the fast: the Fathers, a day at a time."), 26), linkRow(p, site("/reading/paths/nativity"), "Open the path"));
  }
  for (const pt of body.points ?? []) {
    rows.push(para(p, `<strong${p.c({ fg: "ink" })}>${esc(pt.name.replace(/\.$/, ""))}.</strong> ${esc(pt.text)}`, 22));
    // A screenshot under its point, at a phone's width, with its words for a reader who sees no pictures.
    if (pt.picture) rows.push(shot(p, pt.picture));
  }
  // A letter with a card says its closing words with the card and the foot.
  // The foot note ("Dates follow the new calendar.") is said once, in the foot.
  if (!body.card) (body.after ?? []).filter((t) => t !== body.footNote).forEach((t) => rows.push(para(p, esc(t), 16)));
  if (body.card && body.action) {
    rows.push(saintCard(p, { ...body.card, alt: body.card.name, href: body.action.href, action: body.action.label }));
  } else if (body.action) {
    rows.push(`<tr><td style="padding:30px 0 0">${button(p, { href: body.action.href, text: body.action.label })}</td></tr>`);
  }
  rows.push(signOff(p));

  const foot = `<p style="margin:0">${body.footNote ? `${esc(body.footNote)} ` : ""}${esc(opts.why)}</p>
  <p style="margin:6px 0 0">${esc(opts.company)}</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: opts.unsubscribeHref, text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, site("/"), "purifyapp.net")}</p>`;

  const preheader = [body.deck, ...body.paragraphs, ...(body.after ?? [])].find((t) => t && t.trim()) ?? body.subject;
  return shell(p, { title: body.subject, preheader, kind: opts.kind, rows, foot, assets: KIT_ASSETS });
}
