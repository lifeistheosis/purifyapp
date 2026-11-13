import { SANS, SERIF, T } from "@/lib/email/theme";
import { keptCents, type RefundsByOrder } from "@/lib/shop/partialRefunds";

import { columns, esc, legend, ranked, stackedBar, type Column } from "./briefCharts";
import type { PieceView, TodayPart } from "./briefToday";
import { landedAt, type MoneyOrder } from "./money";
import type { MoneyColumn } from "./moneyChart";
import { afterStoreCents, counts, planOf, utcDay, type PlusFact } from "./plusHistory";
import { usd, type WeekFigures } from "./weekly";

/**
 * The owner's brief: one email a day, made for the owner
 * (docs/plans/owner-desk.md section 3; his word, 2026-11-12 about 21:51 UTC:
 * "I want you to show me performance this week, right? How did today's
 * performance go? I want you to reoccurringly send me those emails. So I
 * don't have to always check the admin panel all the time ... I don't just
 * want the same reoccurring spam email that gets sent to me"; and his yes of
 * 2026-11-13, "and yes ok for the owners brief").
 *
 * It replaces the morning board email (lib/admin/plannerDigest.ts) and the
 * Monday letter (lib/admin/weeklyLetter.ts): one email a day at most. Today
 * comes first, because the Hold is the one thing in it with a clock on it:
 * what needs his hand or his word, and what goes out today. Then yesterday on
 * one screen, or on the weekly day the week against the one before, with a
 * chart for each area, what worked and what did not, and the three things
 * worth his attention. After a release, an EIKON Box drop or a sale, it opens
 * with how that went.
 *
 * THE RULES, from the plan:
 *   - no reader's name or address, ever. Nothing here takes one: the reads
 *     (lib/admin/briefFigures.ts) select counts, paths, and the titles and
 *     search words readers made public, and a line that holds an address, a
 *     phone number, a link or a handle is dropped (scrubLine);
 *   - a figure that could not be read says "not read", and one from before
 *     its table kept anything says "not kept yet": never 0;
 *   - figures are read when the email is made and go only into the email,
 *     never into the repository;
 *   - charts are drawn in the email itself (lib/admin/briefCharts.ts).
 *
 * THE DESIGN KIT. The brief is built in two layers so the kit's email template
 * (docs/brand/kit/email/, being designed now) can take it over: briefSections
 * returns the parts as markup on the email theme's tokens, and briefEmail
 * puts them in a shell, emailLayout until the kit lands. Swap the shell (and
 * the tokens in lib/email/theme.ts) and every part follows.
 *
 * Pure: figures in, words and markup out.
 */

// ── Shapes ──────────────────────────────────────────────────────────────

export type Miss = "not read" | "not kept yet";
export type Got<T> = T | Miss;
export const isMiss = (x: unknown): x is Miss => x === "not read" || x === "not kept yet";

/** A figure for the span and for the span it is held against. */
export type Pair = { now: number; before: number };

/** The UTC days the brief reports, as every day in the admin is a UTC day (lib/admin/dayWindow.ts). */
export type BriefSpan = {
  kind: "day" | "week";
  /** First and last day, inclusive, YYYY-MM-DD. */
  start: string;
  end: string;
  /** What it is held against: the same weekday a week before (a day), or the seven days before (a week). */
  priorStart: string;
  priorEnd: string;
  /** Its days, oldest first. */
  days: string[];
  /** "Thursday 12 November"; "6 to 12 November". */
  label: string;
  /** "the same day last week"; "the week before". */
  against: string;
};

const DAY_MS = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", "");
const dayMonth = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const shortWeekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

/** Yesterday (UTC) for the daily brief; the seven days ending yesterday for the weekly one. */
export function spanFor(now: Date, weekly: boolean): BriefSpan {
  const today = now.toISOString().slice(0, 10);
  const end = addDays(today, -1);
  if (!weekly) {
    return {
      kind: "day",
      start: end,
      end,
      priorStart: addDays(end, -7),
      priorEnd: addDays(end, -7),
      days: [end],
      label: longDay(end),
      against: "the same day last week",
    };
  }
  const start = addDays(end, -6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return {
    kind: "week",
    start,
    end,
    priorStart: addDays(start, -7),
    priorEnd: addDays(start, -1),
    days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    label: sameMonth ? `${Number(start.slice(8, 10))} to ${dayMonth(end)}` : `${dayMonth(start)} to ${dayMonth(end)}`,
    against: "the week before",
  };
}

export type DayReaders = { day: string; visitors: number; views: number; signups: number };
export type Readers = { days: DayReaders[]; visitors: Pair; views: Pair; signups: Pair };

/** Plus as members moved: joined (a paid start, or a trial that turned paid), trials begun, renewals turned off, plans that ended. */
export type PlusMoves = {
  joined: Pair;
  trials: number;
  renewalOff: number;
  left: number;
  cardFailed: number;
  /** Whether events were kept through the span it is held against; if not, no comparison is said. */
  priorKept: boolean;
};

export type MoneyDay = MoneyColumn & { day: string };
export type Money = {
  days: MoneyDay[];
  total: MoneyColumn;
  prior: MoneyColumn;
  /** Paid shop orders in the span and before it. */
  orders: Pair;
  /** Whether subscription money is in it: kept events from `subsFrom` on, or none kept yet, or not readable. */
  subs: "kept" | Miss;
  subsFrom: string | null;
  /** Whether subscriptions were kept through the span it is held against; if not, the money is not compared. */
  priorKept: boolean;
};

export type Ranked = { label: string; count: number };
export type Opened = { saints: Ranked[]; prayers: Ranked[]; chapters: Ranked[] };
export type Community = {
  replies: number;
  answered: Ranked[];
  /** Ask a Priest: how many were asked, how many have no answer yet, and the most answered. */
  questions: { count: number; unanswered: number; top: Ranked[] };
};
export type Misses = { total: number; top: Ranked[] };
export type Errors = { total: number; top: Ranked[] };

/** Something that happened in the span the brief opens with: a release, an EIKON Box drop, a sale. */
export type ContextEvent = { kind: "release" | "eikon" | "sale"; day: string; line: string };

export type Waiting = { messages: number | null; refunds: number | null; toPost: number | null };

export type BriefFigures = {
  span: BriefSpan;
  readers: Got<Readers>;
  plus: Got<PlusMoves>;
  money: Got<Money>;
  opened: Got<Opened>;
  community: Got<Community>;
  misses: Got<Misses>;
  errors: Got<Errors>;
  context: ContextEvent[];
  waiting: Waiting;
  /** On the weekly brief, the Monday letter's own reads (lib/admin/weeklyLetter.ts): Plus from RevenueCat, the locks. */
  week: WeekFigures | null;
};

// ── Money, by the chart's own rules ────────────────────────────────────

const emptyColumn = (): MoneyColumn => ({ shop: 0, plus: 0, box: 0, unnamed: 0, refunds: 0 });

/**
 * Each day's money by source, by Money's chart's own rules
 * (lib/admin/moneyChart.ts): the shop as paid on the day it landed, its
 * refunds on the order's own day; a subscription after the store's cut, Plus
 * or the EIKON Box membership by product, a plan neither names apart, and
 * a subscription refund on the day it was sent. Days not in `days` are left out.
 */
export function moneyDays(opts: {
  orders: readonly MoneyOrder[];
  refunds: RefundsByOrder | null;
  plus: readonly PlusFact[];
  days: readonly string[];
}): MoneyDay[] {
  const at = new Map(opts.days.map((d) => [d, emptyColumn()]));
  for (const o of opts.orders) {
    if (o.payment_status !== "paid" && o.payment_status !== "refunded") continue;
    const col = at.get(utcDay(landedAt(o)));
    if (!col) continue;
    const paid = Math.max(0, o.total_cents ?? 0);
    col.shop += paid;
    col.refunds += paid - keptCents(o, opts.refunds);
  }
  for (const f of opts.plus) {
    if (!counts(f)) continue;
    const cents = afterStoreCents(f);
    if (cents === 0) continue;
    const col = at.get(utcDay(f.event_at));
    if (!col) continue;
    if (cents < 0) col.refunds += -cents;
    else col[planOf(f.product_id) ?? "unnamed"] += cents;
  }
  return opts.days.map((day) => ({ day, ...(at.get(day) as MoneyColumn) }));
}

export function sumColumns(cols: readonly MoneyColumn[]): MoneyColumn {
  return cols.reduce(
    (t, c) => ({ shop: t.shop + c.shop, plus: t.plus + c.plus, box: t.box + c.box, unnamed: t.unnamed + c.unnamed, refunds: t.refunds + c.refunds }),
    emptyColumn(),
  );
}

const cameIn = (c: MoneyColumn) => c.shop + c.plus + c.box + c.unnamed;

/** "$50", "$1.2k": a whole-dollar label short enough to sit over a narrow column. */
export function compactUsd(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (Math.abs(dollars) >= 1000) return `$${(dollars / 1000).toFixed(Math.abs(dollars) >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${dollars}`;
}

// ── Words ──────────────────────────────────────────────────────────────

const n = (v: number) => v.toLocaleString("en-US");

/** "up 12% on the same day last week", "the same as the week before", "none the week before". */
export function against(p: Pair, what: string): string {
  if (p.before === 0) return p.now === 0 ? `none ${what} either` : `none ${what}`;
  if (p.now === p.before) return `the same as ${what}`;
  const pct = Math.round(((p.now - p.before) / p.before) * 100);
  if (pct === 0) return `${p.now > p.before ? "a little up" : "a little down"} on ${what}`;
  return `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% on ${what}`;
}

const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;

/**
 * A line a reader wrote (a thread's title, a search), as the brief may show
 * it: one line, cut to `max`, or null when it holds an address, a phone
 * number, a link or a handle, so that no reader's name or address reaches it.
 */
export function scrubLine(s: string | null | undefined, max = 80): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return null;
  if (/\+?\d[\d\s().-]{6,}\d/.test(t)) return null;
  if (/https?:\/\/|www\.|\.(com|net|org|io)\b/i.test(t)) return null;
  if (/(^|\s)@[\w.]+/.test(t)) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// ── What it says on its own ────────────────────────────────────────────

/** What went up and what went down, each with how much, the largest first. */
export function workedAndNot(f: BriefFigures): { worked: string[]; not: string[] } {
  const rows: { name: string; p: Pair; money?: boolean }[] = [];
  if (!isMiss(f.readers)) {
    rows.push({ name: "Visitors", p: f.readers.visitors }, { name: "New accounts", p: f.readers.signups });
  }
  if (!isMiss(f.money)) {
    rows.push({ name: "Shop orders", p: f.money.orders });
    if (f.money.priorKept) rows.push({ name: "Money in", p: { now: cameIn(f.money.total), before: cameIn(f.money.prior) }, money: true });
    else rows.push({ name: "Shop money", p: { now: f.money.total.shop, before: f.money.prior.shop }, money: true });
  }
  if (!isMiss(f.plus) && f.plus.priorKept) rows.push({ name: "Plus members joined", p: f.plus.joined });
  const worked: { line: string; size: number }[] = [];
  const not: { line: string; size: number }[] = [];
  for (const r of rows) {
    if (r.p.now === r.p.before) continue;
    const size = r.p.before === 0 ? Infinity : Math.abs(r.p.now - r.p.before) / r.p.before;
    const value = r.money ? usd(r.p.now) : n(r.p.now);
    const line = `${r.name}: ${value}, ${against(r.p, f.span.against)}`;
    (r.p.now > r.p.before ? worked : not).push({ line, size });
  }
  const order = (a: { size: number }, b: { size: number }) => b.size - a.size;
  return { worked: worked.sort(order).map((x) => x.line), not: not.sort(order).map((x) => x.line) };
}

/**
 * The three things worth his attention on the weekly brief, the most pressing
 * first. What waits on him in the panel is not repeated here: it is in "Needs
 * you" on every brief. Only what the figures show: a question nobody has
 * answered, what readers could not find, what broke, members leaving faster
 * than they join, the largest fall, and failing those the largest rise.
 */
export function attention(f: BriefFigures): string[] {
  const out: string[] = [];
  if (!isMiss(f.community) && f.community.questions.unanswered > 0) {
    const u = f.community.questions.unanswered;
    out.push(`${u === 1 ? "A question" : `${n(u)} questions`} in Ask a Priest ${u === 1 ? "has" : "have"} no answer yet.`);
  }
  if (!isMiss(f.misses) && f.misses.top[0] && f.misses.top[0].count >= 3) {
    out.push(`Readers searched for "${f.misses.top[0].label}" ${n(f.misses.top[0].count)} times and found nothing.`);
  }
  if (!isMiss(f.errors) && f.errors.total > 0 && f.errors.top[0]) {
    out.push(`${plural(f.errors.total, "error was", "errors were")} reported; the most: ${f.errors.top[0].label} (${n(f.errors.top[0].count)}).`);
  }
  if (!isMiss(f.plus) && f.plus.renewalOff > f.plus.joined.now) {
    out.push(`More members turned renewal off (${n(f.plus.renewalOff)}) than joined (${n(f.plus.joined.now)}).`);
  }
  const { worked, not } = workedAndNot(f);
  if (not[0]) out.push(`${not[0]}.`);
  if (out.length < 3 && worked[0]) out.push(`${worked[0]}.`);
  return out.slice(0, 3);
}

/** A day with nothing to tell: nothing needs him, nothing goes out, and every figure read came back empty. */
export function isQuiet(f: BriefFigures, today: TodayPart): boolean {
  if (f.span.kind !== "day") return false;
  if (today.needs.length || today.pieces.length || today.board || f.context.length) return false;
  if (f.waiting.messages || f.waiting.refunds || f.waiting.toPost) return false;
  if (isMiss(f.money) || cameIn(f.money.total) > 0 || f.money.total.refunds > 0 || f.money.orders.now > 0) return false;
  if (isMiss(f.plus) || f.plus.joined.now || f.plus.trials || f.plus.renewalOff || f.plus.left || f.plus.cardFailed) return false;
  if (isMiss(f.errors) || f.errors.total > 0) return false;
  if (isMiss(f.community) || f.community.replies > 0 || f.community.questions.count > 0) return false;
  return !isMiss(f.readers);
}

// ── The email ──────────────────────────────────────────────────────────

/** The subject: what needs him first, else the day's headline. Never a count of what is late. */
export function briefSubject(f: BriefFigures, today: TodayPart): string {
  const lead = f.span.kind === "week" ? `Your week, ${f.span.label}` : f.span.label.split(" ")[0];
  const facts: string[] = [];
  if (!isMiss(f.readers)) {
    facts.push(plural(f.readers.visitors.now, "visitor", "visitors"));
    facts.push(plural(f.readers.signups.now, "new account", "new accounts"));
  }
  if (!isMiss(f.money) && cameIn(f.money.total) > 0) facts.push(`${usd(cameIn(f.money.total))} in`);
  const quiet = isQuiet(f, today);
  const figures = quiet ? `${lead}: a quiet day` : facts.length ? `${lead}: ${facts.join(", ")}` : lead;
  if (today.needs.length > 0) {
    const first = today.needs[0].text.replace(": ", ", ");
    const named = /^[A-Z][a-z]/.test(first) ? first.charAt(0).toLowerCase() + first.slice(1) : first;
    const more = today.needs.length - 1;
    return `Needs you: ${named}${more ? `, and ${more} more` : ""} · ${figures}`;
  }
  const goes = today.pieces.find((p) => p.state === "goes");
  if (goes) return `${goes.name} goes out at ${goes.at} · ${figures}`;
  return figures;
}

/**
 * A section's heading: sentence case in the serif, with a hairline across
 * above it, as the design kit sets a section (docs/brand/design-kit.md: "a
 * hairline between sections, never down an edge"; labels in sentence case,
 * no capitals spaced out).
 */
function heading(text: string): string {
  return `<p style="margin:26px 0 10px;padding-top:18px;border-top:1px solid ${T.line};font-family:${SERIF};font-size:21px;line-height:1.3;font-weight:400;color:${T.heading}">${esc(text)}</p>`;
}

function sub(text: string): string {
  return `<p style="margin:18px 0 6px;font-family:${SANS};font-size:15px;font-weight:600;color:${T.heading}">${esc(text)}</p>`;
}

function para(html: string, extra = ""): string {
  return `<p style="margin:0 0 12px;font-family:${SERIF};font-size:16px;line-height:1.6;color:${T.body};${extra}">${html}</p>`;
}

function smallNote(text: string): string {
  return `<p style="margin:4px 0 12px;font-family:${SANS};font-size:13px;line-height:1.5;color:${T.muted}">${esc(text)}</p>`;
}

/**
 * A link on a line of its own, 48px tall under a thumb: the design kit's rule
 * that every link is a 44px target and none sits inside a sentence. Not a
 * pill: a list of places is never a row of outlined pills (CLAUDE.md).
 */
function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;padding:12px 0;font-family:${SANS};font-size:16px;line-height:24px;color:${T.link};text-decoration:underline">${esc(label)}</a>`;
}

function rows(items: { label: string; value: string; note?: string }[]): string {
  const body = items
    .map(
      (r) =>
        `<tr><td style="width:44%;padding:8px 12px 8px 0;font-family:${SANS};font-size:16px;color:${T.muted};vertical-align:top;border-bottom:1px solid ${T.line}">${esc(r.label)}</td>` +
        `<td style="padding:8px 0;font-family:${SANS};font-size:16px;color:${T.body};border-bottom:1px solid ${T.line}"><strong style="color:${T.heading}">${esc(r.value)}</strong>${
          r.note ? ` <span style="color:${T.muted}">${esc(r.note)}</span>` : ""
        }</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 14px">${body}</table>`;
}

function list(items: string[]): string {
  return `<ul style="margin:0 0 14px;padding-left:20px;font-family:${SERIF};font-size:16px;line-height:1.55;color:${T.body}">${items
    .map((i) => `<li style="margin:0 0 6px">${i}</li>`)
    .join("")}</ul>`;
}

function well(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 10px"><tr><td bgcolor="${T.well}" style="background:${T.well};border-radius:8px;padding:14px 16px;font-family:${SERIF};font-size:15px;line-height:1.6;color:${T.body}">${esc(
    text,
  )}</td></tr></table>`;
}

const missWord = (m: Miss) => (m === "not read" ? "not read" : "not kept yet");

export type BriefLinks = {
  /** The admin, e.g. "https://purifyapp.net/admin". Each link adds `#tab=`. */
  admin: string;
};

function pieceHtml(p: PieceView, links: BriefLinks): string {
  const name = `<strong style="color:${T.heading}">${esc(p.name)}</strong>`;
  const subject = p.subject ? ` <span style="color:${T.muted}">(${esc(`"${p.subject}"`)})</span>` : "";
  switch (p.state) {
    case "goes":
      return `${name}${subject} goes out at ${esc(p.at ?? "")} New York time unless you hold it.<br>${link(`${links.admin}#tab=calendar`, "Hold it")}`;
    case "held":
      return `${name}${subject}: held. It waits for you.<br>${link(`${links.admin}#tab=email`, "Send it")}`;
    case "by hand":
      return `${name}${subject}: ready to send by hand (${esc(p.why ?? "")}).<br>${link(`${links.admin}#tab=email`, "Send it")}`;
    case "nothing":
      return `${name}: nothing to send today. ${esc(p.why ?? "")}`;
    case "gone":
      return `${name}${subject}: gone out.`;
  }
}

/** The parts of the brief, in order, as markup on the email theme. */
export function briefSections(f: BriefFigures, today: TodayPart, links: BriefLinks): string[] {
  const out: string[] = [];
  const week = f.span.kind === "week";

  // How it went: a release, a drop, a sale.
  if (f.context.length > 0) {
    out.push(heading("How it went"));
    const since: string[] = [];
    if (!isMiss(f.readers)) since.push(plural(f.readers.visitors.now, "visitor", "visitors"), plural(f.readers.signups.now, "new account", "new accounts"));
    if (!isMiss(f.money)) since.push(plural(f.money.orders.now, "shop order", "shop orders"), `${usd(cameIn(f.money.total))} in`);
    out.push(list(f.context.map((c) => esc(c.line))));
    if (since.length) out.push(smallNote(`${week ? "Over the week" : "That day"}: ${since.join(", ")}.`));
  }

  // Today: what needs him, and what goes out.
  const waitingLines: string[] = [];
  if (f.waiting.refunds) waitingLines.push(`${plural(f.waiting.refunds, "refund request", "refund requests")} to decide`);
  if (f.waiting.messages) waitingLines.push(plural(f.waiting.messages, "open message", "open messages"));
  if (f.waiting.toPost) waitingLines.push(`${plural(f.waiting.toPost, "paid order", "paid orders")} to post`);
  if (today.needs.length || waitingLines.length) {
    out.push(heading("Needs you"));
    out.push(
      list([
        ...today.needs.map((l) => `${esc(l.text)}${l.when ? ` <span style="color:${T.muted}">(${esc(l.when)})</span>` : ""}`),
        ...waitingLines.map(esc),
      ]),
    );
    if (today.needs.length) {
      out.push(smallNote("A task you give a day stays out of this email until then: open it in the Calendar and choose Not before."));
    }
  }
  if (today.pieces.length || today.board) {
    out.push(heading("Goes out today"));
    const items = today.pieces.map((p) => pieceHtml(p, links));
    if (today.board) {
      const b = today.board;
      const where =
        b.saved === "saved" || b.saved === "week has a row"
          ? "a draft waits in Patch notes for your tap."
          : b.saved === "preview" && b.text
            ? "the draft below is saved to Patch notes as a draft when this brief goes, for your tap."
            : b.text
              ? "here is a draft from the week to post in Patch notes."
              : "write it in Patch notes.";
      items.push(
        `<strong style="color:${T.heading}">The board message</strong> is due today. It never posts itself: ${esc(where)}<br>${link(
          `${links.admin}#tab=patch-notes`,
          "Open Patch notes",
        )}`,
      );
    }
    out.push(list(items));
    if (today.board?.text) out.push(well(today.board.text));
  }

  if (week) {
    out.push(heading("Worth your attention"));
    const three = attention(f);
    out.push(three.length ? list(three.map(esc)) : para(esc("Nothing in the figures asks for you this week.")));
  }

  // Yesterday, or the week.
  out.push(heading(week ? `The week, ${f.span.label}` : `Yesterday, ${f.span.label}`));
  if (isQuiet(f, today) && !isMiss(f.readers)) {
    out.push(
      para(
        esc(
          `A quiet day: ${plural(f.readers.visitors.now, "visitor", "visitors")}, ${plural(f.readers.signups.now, "new account", "new accounts")}, no orders, no change in Plus, nothing new in Community, and no errors.`,
        ),
      ),
    );
  } else {
    out.push(...figureSections(f));
  }

  out.push(
    smallNote(
      `Days are UTC days, as in the admin, held against ${f.span.against}. Figures are read as this email is made and are kept nowhere else.`,
    ),
    `${link(`${links.admin}#tab=calendar`, "Change the hour or the weekly day")}<br>${link(links.admin, "Open the admin")}`,
  );
  return out;
}

function figureSections(f: BriefFigures): string[] {
  const out: string[] = [];
  const week = f.span.kind === "week";

  // Readers.
  out.push(sub("Readers"));
  if (isMiss(f.readers)) out.push(rows([{ label: "Visitors", value: missWord(f.readers) }]));
  else {
    const r = f.readers;
    out.push(
      rows([
        { label: "Visitors", value: n(r.visitors.now), note: against(r.visitors, f.span.against) },
        { label: "New accounts", value: n(r.signups.now), note: against(r.signups, f.span.against) },
        { label: "Page views", value: n(r.views.now), note: against(r.views, f.span.against) },
      ]),
    );
    if (week) {
      out.push(smallNote("Visitors each day"));
      out.push(columns(r.days.map((d): Column => ({ label: shortWeekday(d.day), top: n(d.visitors), segments: [{ value: d.visitors, color: T.muted }] }))));
      out.push(smallNote("New accounts each day"));
      out.push(columns(r.days.map((d): Column => ({ label: shortWeekday(d.day), top: n(d.signups), segments: [{ value: d.signups, color: T.muted }] })), 48));
    }
  }

  // Money, in the money chart's colours.
  out.push(sub("Money in"));
  if (isMiss(f.money)) out.push(rows([{ label: "Money", value: missWord(f.money) }]));
  else {
    const m = f.money;
    const t = m.total;
    const subsNote = m.subs === "kept" ? undefined : m.subs === "not kept yet" ? "not kept yet" : "not read";
    if (week) {
      out.push(
        columns(
          m.days.map(
            (d): Column => ({
              label: shortWeekday(d.day),
              top: cameIn(d) > 0 ? compactUsd(cameIn(d)) : null,
              segments: [
                { value: d.shop, color: T.chartShop },
                { value: d.plus, color: T.chartPlus },
                { value: d.box, color: T.chartBox },
                { value: d.unnamed, color: T.chartOther },
              ],
              below: d.refunds,
            }),
          ),
        ),
      );
    } else {
      out.push(
        stackedBar([
          { value: t.shop, color: T.chartShop },
          { value: t.plus, color: T.chartPlus },
          { value: t.box, color: T.chartBox },
          { value: t.unnamed, color: T.chartOther },
        ]),
      );
    }
    const items = [
      { color: T.chartShop, label: "The shop", value: usd(t.shop), note: plural(m.orders.now, "order", "orders") },
      { color: T.chartPlus, label: "Plus", value: subsNote ?? usd(t.plus) },
      { color: T.chartBox, label: "EIKON Box (Pro)", value: subsNote ?? usd(t.box) },
    ];
    if (t.unnamed > 0) items.push({ color: T.chartOther, label: "A plan not named", value: usd(t.unnamed) });
    items.push({ color: T.chartBack, label: "Given back", value: usd(t.refunds) });
    out.push(legend(items));
    const kept = cameIn(t) - t.refunds;
    const compared = m.priorKept ? `, ${against({ now: kept, before: cameIn(m.prior) - m.prior.refunds }, f.span.against)}` : "";
    out.push(
      smallNote(
        `${usd(kept)} kept${compared}. After the stores' cut, before Stripe's fees, as Money's chart counts it.${
          m.subs === "kept" && m.subsFrom && m.subsFrom > f.span.priorStart ? ` Subscriptions are kept from ${dayMonth(m.subsFrom)}.` : ""
        }`,
      ),
    );
  }

  // Plus.
  out.push(sub("Plus"));
  if (isMiss(f.plus)) out.push(rows([{ label: "Members", value: missWord(f.plus) }]));
  else {
    const p = f.plus;
    const plusRows = [
      {
        label: "Joined",
        value: n(p.joined.now),
        note: p.trials ? `and ${plural(p.trials, "free trial", "free trials")} began` : p.priorKept ? against(p.joined, f.span.against) : "",
      },
      { label: "Turned renewal off", value: n(p.renewalOff) },
      { label: "Plans that ended", value: n(p.left) },
    ];
    if (p.cardFailed) plusRows.push({ label: "A card that failed", value: n(p.cardFailed) });
    if (week && f.week?.plus) {
      const wp = f.week.plus;
      plusRows.push({ label: "Paying members now", value: wp.paying === null ? "not read" : n(wp.paying), note: wp.trials !== null ? `and ${n(wp.trials)} in a free trial` : "" });
      if (wp.mrrCents !== null) plusRows.push({ label: "A month of Plus", value: usd(wp.mrrCents), note: wp.source === "revenuecat" ? "from RevenueCat" : "estimated at list price" });
    }
    out.push(rows(plusRows.map((r) => ({ ...r, note: r.note || undefined }))));
  }

  if (week && f.week) {
    out.push(sub("What sold Plus"));
    const l = f.week.locks;
    if (!l) out.push(rows([{ label: "Locks", value: "not read" }]));
    else if (l.taps === 0) out.push(para(esc("No lock was met this week.")));
    else {
      out.push(
        ranked(
          l.top.map((x) => ({ label: x.name, value: x.taps, display: `${n(x.taps)} met${x.bought ? `, ${n(x.bought)} bought` : ""}` })),
          T.chartPlus,
        ),
      );
    }
  }

  // What readers opened most.
  out.push(sub("Opened most"));
  if (isMiss(f.opened)) out.push(rows([{ label: "Pages", value: missWord(f.opened) }]));
  else {
    const groups: [string, Ranked[]][] = [
      ["Saints", f.opened.saints],
      ["Prayers", f.opened.prayers],
      ["Chapters", f.opened.chapters],
    ];
    const any = groups.some(([, g]) => g.length > 0);
    if (!any) out.push(para(esc("No saint, prayer or chapter was opened.")));
    for (const [name, g] of groups) {
      if (g.length === 0) continue;
      out.push(smallNote(name));
      out.push(ranked(g.map((x) => ({ label: x.label, value: x.count, display: plural(x.count, "reader", "readers") })), T.muted));
    }
  }

  // Community.
  out.push(sub("Community"));
  if (isMiss(f.community)) out.push(rows([{ label: "Threads", value: missWord(f.community) }]));
  else {
    const c = f.community;
    if (c.replies === 0 && c.questions.count === 0) out.push(para(esc("Nothing new was said.")));
    else {
      out.push(
        rows([
          { label: "Replies", value: n(c.replies) },
          {
            label: "Questions asked",
            value: n(c.questions.count),
            note: c.questions.unanswered ? `${n(c.questions.unanswered)} with no answer yet` : undefined,
          },
        ]),
      );
      if (c.answered.length) {
        out.push(smallNote("Answered most"));
        out.push(ranked(c.answered.map((x) => ({ label: x.label, value: x.count, display: plural(x.count, "reply", "replies") })), T.muted));
      }
      if (c.questions.top.length) {
        out.push(smallNote("Questions asked"));
        out.push(list(c.questions.top.map((q) => `${esc(q.label)}${q.count ? ` <span style="color:${T.muted}">(${esc(plural(q.count, "reply", "replies"))})</span>` : ""}`)));
      }
    }
  }

  // Searched and not found.
  out.push(sub("Searched for and not found"));
  if (isMiss(f.misses)) out.push(rows([{ label: "Searches", value: missWord(f.misses) }]));
  else if (f.misses.total === 0) out.push(para(esc("Every search found something.")));
  else out.push(ranked(f.misses.top.map((x) => ({ label: `"${x.label}"`, value: x.count, display: plural(x.count, "time", "times") })), T.muted));

  // Errors.
  out.push(sub("Errors"));
  if (isMiss(f.errors)) out.push(rows([{ label: "Errors", value: missWord(f.errors) }]));
  else if (f.errors.total === 0) out.push(para(esc("None reported.")));
  else {
    out.push(rows([{ label: "Reported", value: n(f.errors.total) }]));
    out.push(list(f.errors.top.map((e) => `${esc(e.label)} <span style="color:${T.muted}">(${esc(n(e.count))})</span>`)));
  }

  if (week) {
    const wn = workedAndNot(f);
    out.push(sub("What worked"));
    out.push(wn.worked.length ? list(wn.worked.map(esc)) : para(esc("Nothing rose on the week before.")));
    out.push(sub("What did not"));
    out.push(wn.not.length ? list(wn.not.map(esc)) : para(esc("Nothing fell on the week before.")));
  }
  return out;
}

/** The whole email, in a shell: emailLayout today, the design kit's template when it lands. */
export function briefEmail(
  f: BriefFigures,
  today: TodayPart,
  links: BriefLinks,
  shell: (opts: { heading: string; deck?: string; bodyHtml: string; eyebrow?: string; footer?: string }) => string,
): { subject: string; html: string } {
  const week = f.span.kind === "week";
  return {
    subject: briefSubject(f, today),
    html: shell({
      heading: week ? "Your week" : "Your day",
      deck: week ? f.span.label : longDay(addDays(f.span.end, 1)),
      bodyHtml: briefSections(f, today, links).join(""),
      eyebrow: "Purify &middot; The owner&#39;s brief",
      footer: "You are getting this because your address is first in ADMIN_EMAILS. One a day at most; the weekly one replaces that day's.",
    }),
  };
}
