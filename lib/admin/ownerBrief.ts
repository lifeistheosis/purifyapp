import { bars, columns, esc, figures, label, link, linkRow, money, opening, pairs, para, pen, quietButton, shell, type Assets, type MoneyPart, type Pen } from "@/lib/email/kit";
import { KIT_DARK, SERIF } from "@/lib/email/theme";
import { keptCents, type RefundsByOrder } from "@/lib/shop/partialRefunds";

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
  const first = today.pieces.find((p) => p.state === "first look");
  if (first) return `${first.name} comes to you first at ${first.at} · ${figures}`;
  return figures;
}


// ── The letter, in the design kit's look ───────────────────────────────
//
// His yes to the kit's look (2026-11-13, "yes look"), the owner's brief among
// it: docs/brand/kit/email/brief.html, drawn here with the kit's own pieces
// (lib/email/kit.ts, held to the kit's builder by kit.test.ts). What needs
// him comes first; then the day's figures three across, the week's columns,
// money in as one bar in the money chart's colours, what was opened most,
// and, gathered under "Could not be read", every figure that was not read or
// not kept yet, said so and never as 0.

export type BriefLinks = {
  /** The admin, e.g. "https://purifyapp.net/admin". Each link adds `#tab=`. */
  admin: string;
};

const usDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const letter = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
const missWord = (m: Miss) => (m === "not read" ? "not read" : "not kept yet");
const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const sayCount = (n: number) => words[n] ?? String(n);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "$124.00": an amount in the money piece, always with its cents, so a column of amounts reads as one (the kit's own). */
const cents = (c: number) => `${c < 0 ? "-" : ""}$${(Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The pieces' words for a piece going out today, its link, and its link's words. */
function pieceRow(pc: PieceView, links: BriefLinks): { text: string; href: string | null; action: string | null; hold: boolean } {
  const subject = pc.subject ? ` ("${pc.subject}")` : "";
  switch (pc.state) {
    case "goes":
      return { text: `${pc.name}${subject} goes out at ${pc.at} New York time unless you hold it.`, href: `${links.admin}#tab=calendar`, action: "Hold it", hold: true };
    case "first look":
      return {
        text: `${pc.name}${subject} goes to you alone at ${pc.at} New York time, in the reader emails' new look, so your inbox is the first to see it. Readers get none by itself until you say you have seen it.`,
        href: `${links.admin}#tab=calendar`,
        action: "Hold it, or clear the look",
        hold: true,
      };
    case "waits for your look":
      return {
        text: `${pc.name}${subject} waits for your look. The first email in the new look is in your inbox; once you have seen it, clear it on the desk and the emails go to readers again.`,
        href: `${links.admin}#tab=calendar`,
        action: "Clear the look",
        hold: false,
      };
    case "held":
      return { text: `${pc.name}${subject}: held. It waits for you.`, href: `${links.admin}#tab=email`, action: "Send it", hold: false };
    case "by hand":
      return { text: `${pc.name}${subject}: ready to send by hand (${pc.why ?? ""}).`, href: `${links.admin}#tab=email`, action: "Send it", hold: false };
    case "nothing":
      return { text: `${pc.name}: nothing to send today. ${pc.why ?? ""}`.trim(), href: null, action: null, hold: false };
    case "gone":
      return { text: `${pc.name}${subject}: gone out.`, href: null, action: null, hold: false };
  }
}

/** The opening's line in italics: how the day was, and how many things need him. */
function summaryLine(f: BriefFigures, today: TodayPart, needsCount: number): string {
  const quiet = isQuiet(f, today);
  const need = needsCount === 0 ? "Nothing needs you." : `${cap(sayCount(needsCount))} ${needsCount === 1 ? "thing needs" : "things need"} you.`;
  if (f.span.kind === "week") return `The week against the one before. ${need}`;
  return quiet ? `A quiet day. ${need}` : need;
}

/** The rows of the brief, in order, drawn with the kit's pieces. */
export function briefRows(p: Pen, f: BriefFigures, today: TodayPart, links: BriefLinks): string[] {
  const rows: string[] = [];
  const week = f.span.kind === "week";

  // What waits on him in the panel, each with the view it opens.
  const waiting: { text: string; href: string; action: string }[] = [];
  if (f.waiting.refunds) waiting.push({ text: `${plural(f.waiting.refunds, "refund request waits", "refund requests wait")} for your decision.`, href: `${links.admin}#tab=orders`, action: "Open orders" });
  if (f.waiting.messages) waiting.push({ text: `${plural(f.waiting.messages, "message is", "messages are")} open.`, href: `${links.admin}#tab=messages`, action: "Open messages" });
  if (f.waiting.toPost) waiting.push({ text: `${plural(f.waiting.toPost, "paid order is", "paid orders are")} not yet sent.`, href: `${links.admin}#tab=orders`, action: "Open orders" });
  const needsCount = today.needs.length + waiting.length;

  rows.push(opening(p, { eyebrow: usDay(addDays(f.span.end, 1)), title: week ? "Your week" : "Yesterday", sub: summaryLine(f, today, needsCount) }));

  if (f.context.length) {
    rows.push(label(p, "How it went"));
    f.context.forEach((c, i) => rows.push(para(p, esc(c.line), i === 0 ? 2 : 10)));
    const since: string[] = [];
    if (!isMiss(f.readers)) since.push(plural(f.readers.visitors.now, "visitor", "visitors"), plural(f.readers.signups.now, "new account", "new accounts"));
    if (!isMiss(f.money)) since.push(plural(f.money.orders.now, "shop order", "shop orders"), `${usd(cameIn(f.money.total))} in`);
    if (since.length) rows.push(para(p, esc(`${week ? "Over the week" : "That day"}: ${since.join(", ")}.`), 10));
  }

  if (needsCount) {
    rows.push(label(p, "Needs you"));
    let first = true;
    for (const n of today.needs) {
      rows.push(para(p, esc(n.when ? `${n.text} (${n.when}).` : `${n.text}.`), first ? 2 : 6));
      first = false;
    }
    if (today.needs.length) rows.push(linkRow(p, `${links.admin}#tab=calendar`, "Open the board"));
    for (const w of waiting) {
      rows.push(para(p, esc(w.text), first ? 2 : 6), linkRow(p, w.href, w.action));
      first = false;
    }
  }

  if (today.pieces.length || today.board) {
    rows.push(label(p, "Goes out today"));
    today.pieces.forEach((pc, i) => {
      const r = pieceRow(pc, links);
      rows.push(para(p, esc(r.text), i === 0 ? 2 : 10));
      if (r.href && r.action) {
        rows.push(r.hold ? `<tr><td style="padding:14px 0 0">${quietButton(p, { href: r.href, text: r.action })}</td></tr>` : linkRow(p, r.href, r.action));
      }
    });
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
      rows.push(para(p, esc(`The board message is due today. It never posts itself: ${where}`), today.pieces.length ? 10 : 2));
      if (b.text) rows.push(`<tr><td${p.c({ fg: "quiet" }, `padding:10px 0 0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:25px;`)}>${esc(b.text)}</td></tr>`);
      rows.push(linkRow(p, `${links.admin}#tab=patch-notes`, "Open Patch notes"));
    }
  }

  if (week) {
    rows.push(label(p, "Worth your attention"));
    const three = attention(f);
    if (three.length) three.forEach((t, i) => rows.push(para(p, esc(t), i === 0 ? 2 : 8)));
    else rows.push(para(p, esc("Nothing in the figures asks for you this week."), 2));
  }

  // The figures.
  const unread: { words: string; value: string; quiet: true }[] = [];
  if (isQuiet(f, today) && !isMiss(f.readers)) {
    // The opening already says "A quiet day"; the figures say what it held, once.
    rows.push(label(p, "The figures"));
    rows.push(
      para(
        p,
        esc(`${cap(plural(f.readers.visitors.now, "visitor", "visitors"))}, ${plural(f.readers.signups.now, "new account", "new accounts")}, no orders, no change in Plus, nothing new in Community, and no errors.`),
        2,
      ),
    );
  } else {
    rows.push(label(p, "Readers"));
    if (isMiss(f.readers)) unread.push({ words: "Visitors and new accounts", value: missWord(f.readers), quiet: true });
    else {
      const r = f.readers;
      const third = !isMiss(f.plus)
        ? { value: n(f.plus.joined.now), name: "Plus starts", against: f.plus.renewalOff ? plural(f.plus.renewalOff, "renewal turned off", "renewals turned off") : f.plus.priorKept ? against(f.plus.joined, f.span.against) : "kept from the first event" }
        : { value: n(r.views.now), name: "Page views", against: against(r.views, f.span.against) };
      rows.push(
        figures(p, [
          { value: n(r.visitors.now), name: "Visitors", against: against(r.visitors, f.span.against) },
          { value: n(r.signups.now), name: "New accounts", against: against(r.signups, f.span.against) },
          third,
        ]),
      );
      if (week) {
        rows.push(columns(p, { title: "Visitors, the last seven days", days: r.days.map((d) => letter(d.day)), values: r.days.map((d) => d.visitors) }));
        rows.push(columns(p, { title: "New accounts, the last seven days", days: r.days.map((d) => letter(d.day)), values: r.days.map((d) => d.signups) }));
      }
    }

    rows.push(label(p, "Money in"));
    if (isMiss(f.money)) unread.push({ words: "Money in", value: missWord(f.money), quiet: true });
    else {
      const m = f.money;
      const t = m.total;
      const parts: MoneyPart[] = [{ slot: "shop", name: `Shop, ${plural(m.orders.now, "order", "orders")}`, amount: cents(t.shop), cents: t.shop }];
      if (m.subs === "kept") {
        parts.push({ slot: "plus", name: "Purify Plus", amount: cents(t.plus), cents: t.plus }, { slot: "box", name: "EIKON Box", amount: cents(t.box), cents: t.box });
        if (t.unnamed > 0) parts.push({ slot: "ink", name: "A plan not named", amount: cents(t.unnamed), cents: t.unnamed });
      } else unread.push({ words: "Plus and the EIKON Box in money", value: missWord(m.subs), quiet: true });
      const kept = cameIn(t) - t.refunds;
      const compared = m.priorKept ? `, ${against({ now: kept, before: cameIn(m.prior) - m.prior.refunds }, f.span.against)}` : "";
      rows.push(money(p, { total: cents(cameIn(t)), parts, back: `${t.refunds ? `Given back: ${usd(t.refunds)}.` : "Refunds: none."} ${usd(kept)} kept${compared}, after the stores' cut and before Stripe's fees.` }));
      if (week) {
        rows.push(columns(p, { title: "Money in, the last seven days, in dollars", days: m.days.map((d) => letter(d.day)), values: m.days.map((d) => Math.round(cameIn(d) / 100)) }));
      }
    }

    if (isMiss(f.plus)) unread.push({ words: "Plus members", value: missWord(f.plus), quiet: true });
    else {
      const pl = f.plus;
      // One figure to a row, so the values stand in one column.
      const list: { words: string; value: string; quiet?: boolean }[] = [{ words: "Joined", value: n(pl.joined.now) }];
      if (pl.trials) list.push({ words: "Began a free trial", value: n(pl.trials) });
      list.push({ words: "Turned renewal off", value: n(pl.renewalOff) }, { words: "Plans that ended", value: n(pl.left) });
      if (pl.cardFailed) list.push({ words: "A card that failed", value: n(pl.cardFailed) });
      if (week && f.week?.plus) {
        const wp = f.week.plus;
        list.push(wp.paying === null ? { words: "Paying members now", value: "not read", quiet: true } : { words: "Paying members now", value: n(wp.paying) });
        if (wp.paying !== null && wp.trials !== null) list.push({ words: "In a free trial now", value: n(wp.trials) });
        if (wp.mrrCents !== null) list.push({ words: wp.source === "revenuecat" ? "A month of Plus, from RevenueCat" : "A month of Plus, at list price", value: usd(wp.mrrCents) });
      }
      rows.push(label(p, "Plus"), pairs(p, list));
    }

    if (week && f.week) {
      const l = f.week.locks;
      if (!l) unread.push({ words: "What sold Plus", value: "not read", quiet: true });
      else if (l.taps > 0) {
        rows.push(label(p, "What sold Plus"));
        // One figure to a value: how often the lock was met; what was bought after it goes with the name.
        rows.push(pairs(p, l.top.map((x) => ({ words: x.bought ? `${x.name}, ${n(x.bought)} bought` : x.name, value: `${n(x.taps)} met` }))));
      }
    }

    if (isMiss(f.opened)) unread.push({ words: "What was opened", value: missWord(f.opened), quiet: true });
    else {
      const all = [...f.opened.saints, ...f.opened.prayers, ...f.opened.chapters].sort((a, b) => b.count - a.count).slice(0, 5);
      rows.push(label(p, "Opened most"));
      rows.push(all.length ? bars(p, all.map((x) => ({ name: x.label, count: x.count }))) : para(p, esc("No saint, prayer or chapter was opened."), 2));
    }

    if (isMiss(f.community)) unread.push({ words: "Community", value: missWord(f.community), quiet: true });
    else {
      const c = f.community;
      rows.push(label(p, "Community"));
      if (c.replies === 0 && c.questions.count === 0) rows.push(para(p, esc("Nothing new was said."), 2));
      else {
        const said = [
          { words: "Replies", value: n(c.replies) },
          { words: "Questions asked", value: n(c.questions.count) },
        ];
        if (c.questions.unanswered) said.push({ words: "Questions with no answer yet", value: n(c.questions.unanswered) });
        rows.push(pairs(p, said));
        if (c.answered.length) rows.push(bars(p, c.answered.map((x) => ({ name: x.label, count: x.count }))));
      }
    }

    if (isMiss(f.misses)) unread.push({ words: "Searches that found nothing", value: missWord(f.misses), quiet: true });
    else if (f.misses.total > 0) {
      rows.push(label(p, "Searched for and not found"));
      rows.push(pairs(p, f.misses.top.map((x) => ({ words: x.label, value: plural(x.count, "time", "times") }))));
    }

    if (isMiss(f.errors)) unread.push({ words: "Errors", value: missWord(f.errors), quiet: true });
    else {
      rows.push(label(p, "Errors"));
      rows.push(f.errors.total === 0 ? para(p, esc("None reported."), 2) : pairs(p, f.errors.top.map((x) => ({ words: x.label, value: n(x.count) }))));
    }

    if (week) {
      const wn = workedAndNot(f);
      rows.push(label(p, "What worked"));
      if (wn.worked.length) wn.worked.forEach((t, i) => rows.push(para(p, esc(t), i === 0 ? 2 : 6)));
      else rows.push(para(p, esc("Nothing rose on the week before."), 2));
      rows.push(label(p, "What did not"));
      if (wn.not.length) wn.not.forEach((t, i) => rows.push(para(p, esc(t), i === 0 ? 2 : 6)));
      else rows.push(para(p, esc("Nothing fell on the week before."), 2));
    }
  }

  if (unread.length) rows.push(label(p, "Could not be read"), pairs(p, unread));
  return rows;
}

/** The brief's foot: when the figures were read, that it goes to no reader, and the way to change its hour. */
function briefFoot(p: Pen, f: BriefFigures, links: BriefLinks): string {
  return `<p style="margin:0">${esc(`Days are UTC days, as in the admin, held against ${f.span.against}. Figures were read as this email was made and are kept nowhere else. This brief is made for the owner and goes to no reader.`)}</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: `${links.admin}#tab=calendar`, text: "Change the hour or the weekly day" })}</p>
  <p style="margin:8px 0 0">${link(p, links.admin, "Open the panel")}</p>`;
}

/**
 * The whole letter. `assets` are where the masthead's cross lives: the main
 * web (KIT_ASSETS) when it is sent. The brief carries no reader's
 * Unsubscribe: it goes to the owner alone, from ADMIN_EMAILS.
 */
export function briefEmail(f: BriefFigures, today: TodayPart, links: BriefLinks, assets: Assets): { subject: string; html: string } {
  const p = pen(KIT_DARK);
  const subject = briefSubject(f, today);
  const html = shell(p, {
    title: subject,
    preheader: f.span.kind === "week" ? `The week of ${f.span.label}, against the week before.` : `Yesterday, ${f.span.label}, on one screen.`,
    kind: "The owner's brief",
    rows: briefRows(p, f, today, links),
    foot: briefFoot(p, f, links),
    assets,
  });
  return { subject, html };
}
