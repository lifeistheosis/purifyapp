/**
 * The Monday email: last week in numbers, to the owner alone.
 *
 * Admin item A8 (the arbiter's list of 2026-11-09, started on Edgar's word
 * that day, "let's continue working on version 1.9"). The panel only tells
 * someone who opens it; the morning email (lib/admin/plannerDigest.ts) says
 * what is due. This one says how the week went: visitors, accounts, the shop,
 * Plus, which locks were met and which sold, and what is waiting on him, each
 * against the week before. It goes to the first address in ADMIN_EMAILS on a
 * Monday morning, once a week, and never to a reader.
 *
 * THE WEEK. Monday 00:00 to Sunday 24:00 UTC, the last whole one before the
 * Monday it is sent on, because every day in the admin is a UTC day
 * (lib/admin/dayWindow.ts). The week before it is the comparison.
 *
 * A FIGURE THAT COULD NOT BE READ says so ("not read"), never 0, as everywhere
 * in the admin. The letter is still sent with the rest.
 *
 * NO NUMBER IS IN THIS FILE OR THE REPOSITORY. The figures are read when the
 * letter is made (lib/admin/weeklyLetter.ts) and go only into the email.
 *
 * Pure: the window, the words and the markup. Tested in
 * lib/admin/__tests__/weekly.test.ts.
 */

import { SANS, T } from "@/lib/email/theme";

const DAY_MS = 86_400_000;

/** The same escaping as lib/email/send.ts, kept here so this file stays pure. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type WeekWindow = {
  /** Monday the week began, YYYY-MM-DD (inclusive). */
  start: string;
  /** Sunday the week ended, YYYY-MM-DD (inclusive). */
  end: string;
  /** The Monday after it (exclusive bound), YYYY-MM-DD: the day the letter goes. */
  next: string;
  /** Monday a week before `start`: the week compared against. */
  priorStart: string;
  /** Sunday before `start`. */
  priorEnd: string;
  /** "2 to 8 November". */
  label: string;
};

const key = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The last whole Monday-to-Sunday week (UTC) before `now`, and the one before it. */
export function lastWeek(now: Date): WeekWindow {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // getUTCDay: Sunday 0 ... Saturday 6. Days since this week's Monday.
  const sinceMonday = (new Date(today).getUTCDay() + 6) % 7;
  const thisMonday = today - sinceMonday * DAY_MS;
  const start = thisMonday - 7 * DAY_MS;
  const end = thisMonday - DAY_MS;
  return {
    start: key(start),
    end: key(end),
    next: key(thisMonday),
    priorStart: key(start - 7 * DAY_MS),
    priorEnd: key(start - DAY_MS),
    label: weekLabel(start, end),
  };
}

function weekLabel(start: number, end: number): string {
  const a = new Date(start);
  const b = new Date(end);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} to ${b.getUTCDate()} ${month(b)}`
    : `${a.getUTCDate()} ${month(a)} to ${b.getUTCDate()} ${month(b)}`;
}

/** Monday, in UTC: the one day the letter goes. */
export function isLetterDay(now: Date): boolean {
  return now.getUTCDay() === 1;
}

/** A count this week and the week before. */
export type Pair = { now: number; before: number };

export type WeekFigures = {
  /** Visitors a day, added up over the week (a reader who came on three days counts three times). */
  visitors: Pair | null;
  views: Pair | null;
  signups: Pair | null;
  /** The shop: what paid orders kept after refunds, and how many. */
  shop: { cents: Pair; orders: Pair } | null;
  plus: {
    /** What members paid in the week, from RevenueCat, before the stores' cut; null without it. */
    paidCents: Pair | null;
    /** Members paying now. */
    paying: number | null;
    /** In a free trial now, from RevenueCat; null without it. */
    trials: number | null;
    mrrCents: number | null;
    source: "revenuecat" | "estimate";
  } | null;
  /** Locks met in the week, the most met first, and purchases that followed in the sheet. */
  locks: { top: { name: string; taps: number; bought: number }[]; taps: number; bought: number } | null;
  /** What waits on him now; null for a count that could not be taken. */
  waiting: { messages: number | null; refunds: number | null; toPost: number | null };
};

const n = (v: number) => v.toLocaleString("en-US");

/** "$1,234" for whole dollars, "$12.50" otherwise. */
export function usd(cents: number): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `${cents < 0 ? "-" : ""}$${Math.abs(dollars).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "up 12% on the week before", "the same as the week before", "none the week before". */
export function change(p: Pair): string {
  if (p.before === 0) return p.now === 0 ? "none the week before either" : "none the week before";
  if (p.now === p.before) return "the same as the week before";
  const pct = Math.round(((p.now - p.before) / p.before) * 100);
  if (pct === 0) return p.now > p.before ? "a little up on the week before" : "a little down on the week before";
  return `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% on the week before`;
}

const NOT_READ = "not read";

function line(label: string, value: string, note?: string): string {
  return `<tr><td style="width:38%;padding:6px 14px 6px 0;font-family:${SANS};font-size:15px;color:${T.muted};vertical-align:top;border-bottom:1px solid ${T.line}">${escapeHtml(
    label,
  )}</td><td style="padding:6px 0;font-family:${SANS};font-size:15px;color:${T.body};border-bottom:1px solid ${T.line}"><strong style="color:${T.heading}">${escapeHtml(value)}</strong>${
    note ? ` <span style="color:${T.muted}">${escapeHtml(note)}</span>` : ""
  }</td></tr>`;
}

function table(rows: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 18px">${rows.join("")}</table>`;
}

/**
 * A section's small line, as the kit sets one (round 1's small-line rule, his
 * yes of 2026-11-13 20:47; the account and order emails took it at 71473017c):
 * 12px semibold in sentence case, as written. It was spaced capitals
 * (uppercase, 0.08em).
 */
function heading(text: string): string {
  return `<p style="margin:22px 0 8px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:600;color:${T.label}">${escapeHtml(text)}</p>`;
}

/** The subject line: the week, and the one figure he opens it for. */
export function letterSubject(w: WeekWindow, f: WeekFigures): string {
  const parts: string[] = [];
  if (f.visitors) parts.push(`${n(f.visitors.now)} visits`);
  if (f.signups) parts.push(`${n(f.signups.now)} new accounts`);
  return parts.length ? `Your week, ${w.label}: ${parts.join(", ")}` : `Your week, ${w.label}`;
}

/** The letter's body, for emailLayout: every value escaped here. */
export function letterHtml(w: WeekWindow, f: WeekFigures, adminUrl: string): string {
  const out: string[] = [];

  out.push(heading("Readers"));
  out.push(
    table([
      line("Visits", f.visitors ? n(f.visitors.now) : NOT_READ, f.visitors ? change(f.visitors) : undefined),
      line("Page views", f.views ? n(f.views.now) : NOT_READ, f.views ? change(f.views) : undefined),
      line("New accounts", f.signups ? n(f.signups.now) : NOT_READ, f.signups ? change(f.signups) : undefined),
    ]),
  );

  out.push(heading("Money"));
  const money: string[] = [];
  money.push(
    f.shop
      ? line(
          "The shop",
          usd(f.shop.cents.now),
          `${f.shop.orders.now === 1 ? "1 order" : `${n(f.shop.orders.now)} orders`}, ${change(f.shop.cents)}`,
        )
      : line("The shop", NOT_READ),
  );
  if (!f.plus) money.push(line("Plus", NOT_READ));
  else {
    money.push(
      f.plus.paidCents
        ? line("Plus, paid", usd(f.plus.paidCents.now), `before the stores' cut, ${change(f.plus.paidCents)}`)
        : line("Plus, paid", "not counted", "RevenueCat is not connected"),
    );
    money.push(
      line(
        "Paying members",
        f.plus.paying === null ? NOT_READ : n(f.plus.paying),
        f.plus.trials !== null ? `and ${n(f.plus.trials)} in a free trial` : undefined,
      ),
    );
    if (f.plus.mrrCents !== null) {
      money.push(line("A month of Plus", usd(f.plus.mrrCents), f.plus.source === "revenuecat" ? "from RevenueCat" : "estimated at list price"));
    }
  }
  out.push(table(money));

  out.push(heading("What sold Plus"));
  if (!f.locks) out.push(table([line("Locks", NOT_READ)]));
  else if (f.locks.taps === 0) out.push(table([line("Locks", "none met this week")]));
  else {
    out.push(
      table([
        line(
          "Locks met",
          n(f.locks.taps),
          f.locks.bought === 1 ? "1 purchase followed" : `${n(f.locks.bought)} purchases followed`,
        ),
        ...f.locks.top.map((l) =>
          line(l.name, `${n(l.taps)} met`, l.bought > 0 ? (l.bought === 1 ? "1 bought" : `${n(l.bought)} bought`) : undefined),
        ),
      ]),
    );
  }

  out.push(heading("Waiting on you"));
  const wait = (count: number | null, one: string, many: string) =>
    count === null ? NOT_READ : count === 0 ? "none" : count === 1 ? `1 ${one}` : `${n(count)} ${many}`;
  out.push(
    table([
      line("Messages", wait(f.waiting.messages, "open message", "open messages")),
      line("Refunds", wait(f.waiting.refunds, "request to decide", "requests to decide")),
      line("Orders", wait(f.waiting.toPost, "to post", "to post")),
    ]),
  );

  out.push(
    `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px"><a href="${escapeHtml(adminUrl)}" style="color:${T.link}">Open the admin</a></p>`,
    `<p style="margin:14px 0 0;font-family:${SANS};font-size:13px;color:${T.muted}">${escapeHtml(
      `The week of ${w.label}, Monday to Sunday in UTC, against the week before. Visits are each day's visitors added up.`,
    )}</p>`,
  );
  return out.join("");
}
