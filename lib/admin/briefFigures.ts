import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getBook } from "@/lib/bible/books";
import { SOURCE_WORD, groupErrors, type ErrorRow } from "@/lib/errors/group";
import { screenOf, screenPath } from "@/lib/analytics/screens";
import { getAkathist } from "@/lib/prayers/akathists";
import { getHour } from "@/lib/prayers/hours";
import { RULES } from "@/lib/prayers/rules";
import { getSaint } from "@/lib/saints/saints";
import { groupMisses, type MissRow } from "@/lib/search/missGroups";
import { paidTotals, refundsByOrder } from "@/lib/shop/partialRefunds";
import { pageAllSettled } from "@/lib/supabase/pageAll";

import type { MoneyOrder } from "./money";
import {
  moneyDays,
  scrubLine,
  sumColumns,
  type BriefFigures,
  type BriefSpan,
  type Community,
  type ContextEvent,
  type Errors,
  type Got,
  type Misses,
  type Money,
  type Opened,
  type PlusMoves,
  type Ranked,
  type Readers,
  type Waiting,
} from "./ownerBrief";
import { readPlusFacts, type PlusRead } from "./plusEvents.server";
import { tally, utcDay } from "./plusHistory";
import { isTableAbsent } from "./tableAbsent";
import { withoutOwnTestOrders } from "./testOrders";
import { readWaiting, readWeek } from "./weeklyLetter";
import type { WeekWindow } from "./weekly";

/**
 * The owner's brief's figures (lib/admin/ownerBrief.ts says what it is),
 * read when the email is made and kept nowhere else.
 *
 * Every read stands alone: one that fails says "not read", one whose table
 * this database does not have yet says "not kept yet", and the brief goes
 * with the rest. None of them selects a reader's name, address or account:
 * counts, paths, ids, and the titles and search words readers made public,
 * which pass scrubLine before they are shown.
 */

const DAY_MS = 86_400_000;
const nextDay = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const daysFrom = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS) + 1;
const startIso = (d: string) => `${d}T00:00:00.000Z`;

type DbError = { code?: string; message: string };
const miss = (error: DbError | null | undefined): "not read" | "not kept yet" =>
  error && isTableAbsent(error) ? "not kept yet" : "not read";

// ── Readers ────────────────────────────────────────────────────────────

type DayRow = { day: string; visitors: number | string; views: number | string; signups: number | string };

/** Visitors, page views and new accounts each day, from the function Traffic counts with. */
async function readReaders(admin: SupabaseClient, span: BriefSpan): Promise<Got<Readers>> {
  try {
    const { data, error } = await admin.rpc("analytics_daily_buckets", {
      p_since: startIso(span.priorStart),
      p_days: daysFrom(span.priorStart, span.end),
    });
    if (error || !Array.isArray(data)) return "not read";
    const rows = (data as DayRow[]).map((r) => ({
      day: String(r.day).slice(0, 10),
      visitors: Number(r.visitors) || 0,
      views: Number(r.views) || 0,
      signups: Number(r.signups) || 0,
    }));
    const between = (a: string, b: string) => rows.filter((r) => r.day >= a && r.day <= b);
    const sum = (list: typeof rows, k: "visitors" | "views" | "signups") => list.reduce((t, r) => t + r[k], 0);
    const now = between(span.start, span.end);
    const before = between(span.priorStart, span.priorEnd);
    return {
      days: span.days.map((d) => rows.find((r) => r.day === d) ?? { day: d, visitors: 0, views: 0, signups: 0 }),
      visitors: { now: sum(now, "visitors"), before: sum(before, "visitors") },
      views: { now: sum(now, "views"), before: sum(before, "views") },
      signups: { now: sum(now, "signups"), before: sum(before, "signups") },
    };
  } catch {
    return "not read";
  }
}

// ── Plus and money ─────────────────────────────────────────────────────

function plusMoves(read: PlusRead, span: BriefSpan): Got<PlusMoves> {
  if (read.state === "absent") return "not kept yet";
  if (read.state === "unavailable") return "not read";
  if (!read.since) return "not kept yet";
  const inSpan = read.facts.filter((f) => utcDay(f.event_at) >= span.start && utcDay(f.event_at) <= span.end);
  const inPrior = read.facts.filter((f) => utcDay(f.event_at) >= span.priorStart && utcDay(f.event_at) <= span.priorEnd);
  const t = tally(inSpan);
  const b = tally(inPrior);
  return {
    joined: { now: t.joined, before: b.joined },
    trials: t.trials,
    renewalOff: t.renewalOff,
    left: t.left,
    cardFailed: t.cardFailed,
    priorKept: utcDay(read.since) <= span.priorStart,
  };
}

type OrderRow = MoneyOrder & { id: string; email: string | null };

async function readMoney(admin: SupabaseClient, span: BriefSpan, plus: PlusRead): Promise<Got<Money>> {
  const from = startIso(span.priorStart);
  const to = startIso(nextDay(span.end));
  const res = await pageAllSettled<OrderRow, DbError>((a, b) =>
    admin
      .from("shop_orders")
      .select("id, email, total_cents, payment_status, created_at, paid_at")
      .in("payment_status", ["paid", "refunded"])
      .or(`and(paid_at.gte."${from}",paid_at.lt."${to}"),and(paid_at.is.null,created_at.gte."${from}",created_at.lt."${to}")`)
      .order("id")
      .range(a, b) as unknown as PromiseLike<{ data: OrderRow[] | null; error: DbError | null }>,
  );
  if (res.error) return miss(res.error);
  // His own test orders are no sale (lib/admin/testOrders.ts). The address is read for that and nothing else.
  const orders = withoutOwnTestOrders(res.data);
  const refunds = await refundsByOrder(admin, paidTotals(orders)).catch(() => null);
  const facts = plus.state === "ok" ? plus.facts : [];
  const priorDays = Array.from({ length: daysFrom(span.priorStart, span.priorEnd) }, (_, i) =>
    new Date(Date.parse(startIso(span.priorStart)) + i * DAY_MS).toISOString().slice(0, 10),
  );
  const days = moneyDays({ orders, refunds, plus: facts, days: span.days });
  const prior = sumColumns(moneyDays({ orders, refunds, plus: facts, days: priorDays }));
  const landed = (o: OrderRow) => utcDay(o.paid_at ?? o.created_at);
  const paidIn = (a: string, b: string) => orders.filter((o) => o.payment_status === "paid" && landed(o) >= a && landed(o) <= b).length;
  const subsFrom = plus.state === "ok" && plus.since ? utcDay(plus.since) : null;
  return {
    days,
    total: sumColumns(days),
    prior,
    orders: { now: paidIn(span.start, span.end), before: paidIn(span.priorStart, span.priorEnd) },
    subs: plus.state === "ok" ? (subsFrom ? "kept" : "not kept yet") : plus.state === "absent" ? "not kept yet" : "not read",
    subsFrom,
    priorKept: plus.state === "ok" && !!subsFrom && subsFrom <= span.priorStart,
  };
}

// ── What readers opened ────────────────────────────────────────────────

/** A path as a saint, a prayer or a chapter, with its title; null for anything else. */
export function openedTitle(path: string): { group: keyof Opened; label: string } | null {
  const clean = screenPath(path);
  const segs = clean.split("/").filter(Boolean);
  switch (screenOf(clean)) {
    case "saint": {
      const saint = getSaint(segs[1] ?? "");
      return saint ? { group: "saints", label: saint.name } : null;
    }
    case "bible-chapter": {
      const book = getBook(segs[1] ?? "");
      const chapter = Number(segs[2]);
      return book && Number.isInteger(chapter) && chapter > 0 ? { group: "chapters", label: `${book.name} ${chapter}` } : null;
    }
    case "morning-prayers":
    case "evening-prayers":
    case "prayer": {
      const rule = RULES.find((r) => r.href === clean);
      return rule ? { group: "prayers", label: rule.title } : null;
    }
    case "akathist": {
      const a = getAkathist(segs[2] ?? "");
      return a ? { group: "prayers", label: a.title } : null;
    }
    case "hour": {
      const h = getHour(segs[2] ?? "");
      return h ? { group: "prayers", label: h.title } : null;
    }
    default:
      return null;
  }
}

/**
 * The saints, prayers and chapters opened by the most readers in the span,
 * three of each. A reader is a session (a tab), counted once per page however
 * many times it was opened or pinged; the tracker's pings are page-view rows.
 */
export function topOpened(rows: readonly { session_id: string; path: string }[], each = 3): Opened {
  const readers = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = screenPath(r.path).toLowerCase();
    let set = readers.get(key);
    if (!set) readers.set(key, (set = new Set()));
    set.add(r.session_id);
  }
  const groups: Record<keyof Opened, Map<string, number>> = { saints: new Map(), prayers: new Map(), chapters: new Map() };
  for (const [path, set] of readers) {
    const t = openedTitle(path);
    if (!t) continue;
    groups[t.group].set(t.label, (groups[t.group].get(t.label) ?? 0) + set.size);
  }
  const top = (m: Map<string, number>): Ranked[] =>
    [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1))
      .slice(0, each);
  return { saints: top(groups.saints), prayers: top(groups.prayers), chapters: top(groups.chapters) };
}

async function readOpened(admin: SupabaseClient, span: BriefSpan): Promise<Got<Opened>> {
  const res = await pageAllSettled<{ session_id: string; path: string }, DbError>((a, b) =>
    admin
      .from("analytics_pageviews")
      .select("session_id, path")
      .gte("ts", startIso(span.start))
      .lt("ts", startIso(nextDay(span.end)))
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(a, b) as unknown as PromiseLike<{ data: { session_id: string; path: string }[] | null; error: DbError | null }>,
  );
  if (res.error) return miss(res.error);
  return topOpened(res.data);
}

// ── Community ──────────────────────────────────────────────────────────

type PostRow = { id: string; title: string | null; status: string; group_id: string | null; reply_count?: number | null };

/**
 * Replies in the span and the threads that drew the most, and the questions
 * asked (Ask a Priest). Only public, visible threads; never an author column.
 */
async function readCommunity(admin: SupabaseClient, span: BriefSpan): Promise<Got<Community>> {
  const from = startIso(span.start);
  const to = startIso(nextDay(span.end));
  const replies = await pageAllSettled<{ id: string; post_id: string }, DbError>((a, b) =>
    admin
      .from("community_post_replies")
      .select("id, post_id")
      .eq("status", "visible")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("id")
      .range(a, b) as unknown as PromiseLike<{ data: { id: string; post_id: string }[] | null; error: DbError | null }>,
  );
  if (replies.error) return miss(replies.error);
  const perPost = new Map<string, number>();
  for (const r of replies.data) perPost.set(r.post_id, (perPost.get(r.post_id) ?? 0) + 1);
  const topIds = [...perPost.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);

  const [posts, questions] = await Promise.all([
    topIds.length
      ? admin.from("community_posts").select("id, title, status, group_id").in("id", topIds)
      : Promise.resolve({ data: [] as PostRow[], error: null }),
    admin
      .from("community_posts")
      .select("id, title, status, group_id, reply_count")
      .eq("category", "question")
      .gte("created_at", from)
      .lt("created_at", to)
      .limit(500),
  ]);
  if (posts.error) return miss(posts.error as DbError);
  if (questions.error) return miss(questions.error as DbError);

  const shown = (p: PostRow) => p.status === "visible" && !p.group_id;
  const byId = new Map(((posts.data ?? []) as PostRow[]).filter(shown).map((p) => [p.id, p]));
  const answered: Ranked[] = [];
  for (const id of topIds) {
    const title = scrubLine(byId.get(id)?.title);
    if (title) answered.push({ label: title, count: perPost.get(id) ?? 0 });
    if (answered.length === 3) break;
  }
  const asked = ((questions.data ?? []) as PostRow[]).filter(shown);
  const top = asked
    .map((q) => ({ label: scrubLine(q.title), count: q.reply_count ?? 0 }))
    .filter((q): q is Ranked => q.label !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const unanswered = asked.filter((q) => (q.reply_count ?? 0) === 0).length;
  return { replies: replies.data.length, answered, questions: { count: asked.length, unanswered, top } };
}

// ── Searches and errors ────────────────────────────────────────────────

async function readMisses(admin: SupabaseClient, span: BriefSpan): Promise<Got<Misses>> {
  const res = await pageAllSettled<MissRow, DbError>((a, b) =>
    admin
      .from("search_misses")
      .select("words, day, locale, platform")
      .gte("day", span.start)
      .lte("day", span.end)
      .order("id")
      .range(a, b) as unknown as PromiseLike<{ data: MissRow[] | null; error: DbError | null }>,
  );
  if (res.error) return miss(res.error);
  const top: Ranked[] = [];
  for (const g of groupMisses(res.data, 60)) {
    const words = scrubLine(g.words, 60);
    if (words) top.push({ label: words, count: g.count });
    if (top.length === 5) break;
  }
  return { total: res.data.length, top };
}

async function readErrors(admin: SupabaseClient, span: BriefSpan): Promise<Got<Errors>> {
  const res = await pageAllSettled<ErrorRow, DbError>((a, b) =>
    admin
      .from("app_errors")
      .select("at, source, page, message, route, status, app_version, platform")
      .gte("at", startIso(span.start))
      .lt("at", startIso(nextDay(span.end)))
      .order("id")
      .range(a, b) as unknown as PromiseLike<{ data: ErrorRow[] | null; error: DbError | null }>,
  );
  if (res.error) return miss(res.error);
  const top = groupErrors(res.data, 3).map((g) => {
    const where = g.route ?? g.page;
    const message = scrubLine(g.message, 90);
    return {
      label: `${SOURCE_WORD[g.source] ?? g.source}${where ? ` (${where})` : ""}${message ? `: ${message}` : ""}`,
      count: g.count,
    };
  });
  return { total: res.data.length, top };
}

// ── What happened: a release, a drop, a sale ───────────────────────────

const weekdayOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

type Offers = { setDiscount?: { enabled?: boolean; percent?: number }; multiBuy?: { enabled?: boolean; percent?: number }; cartDeal?: { enabled?: boolean; percent?: number } };

/** The sales that began or ended in one change of the shop's settings, in words. */
export function saleLines(prior: Offers | null | undefined, next: Offers | null | undefined, at: string): string[] {
  const out: string[] = [];
  const offers: [keyof Offers, string][] = [
    ["setDiscount", "The set discount"],
    ["multiBuy", "The multi-buy discount"],
    ["cartDeal", "The cart deal"],
  ];
  for (const [key, name] of offers) {
    const was = prior?.[key]?.enabled === true;
    const is = next?.[key]?.enabled === true;
    if (was === is) continue;
    const pct = next?.[key]?.percent ?? prior?.[key]?.percent;
    out.push(`${name}${typeof pct === "number" ? ` (${pct}% off)` : ""} ${is ? "began" : "ended"} on ${weekdayOf(at)}.`);
  }
  return out;
}

async function readContext(admin: SupabaseClient, span: BriefSpan): Promise<ContextEvent[]> {
  const from = startIso(span.start);
  const to = startIso(nextDay(span.end));
  const [notes, drops, settings] = await Promise.all([
    admin.from("patch_notes").select("version, title, published_at").eq("status", "published").gte("published_at", from).lt("published_at", to).limit(5),
    admin.from("eikon_drops").select("title, status, claims_open_at").gte("claims_open_at", from).lt("claims_open_at", to).limit(5),
    admin.from("admin_activity_log").select("detail, created_at").eq("action", "shop.settings").gte("created_at", from).lt("created_at", to).order("created_at").limit(50),
  ]);
  const out: ContextEvent[] = [];
  for (const r of (notes.data ?? []) as { version: string; title: string | null; published_at: string }[]) {
    out.push({ kind: "release", day: utcDay(r.published_at), line: `Purify ${r.version} was published on ${weekdayOf(r.published_at)}${r.title ? `: ${r.title}` : ""}.` });
  }
  for (const r of (drops.data ?? []) as { title: string; status: string; claims_open_at: string }[]) {
    if (r.status === "draft" || r.status === "cancelled") continue;
    out.push({ kind: "eikon", day: utcDay(r.claims_open_at), line: `The ${r.title} EIKON Box drop opened on ${weekdayOf(r.claims_open_at)}.` });
  }
  for (const r of (settings.data ?? []) as { detail: { prior?: Offers; next?: Offers } | null; created_at: string }[]) {
    for (const line of saleLines(r.detail?.prior, r.detail?.next, r.created_at)) out.push({ kind: "sale", day: utcDay(r.created_at), line });
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

// ── All of it ──────────────────────────────────────────────────────────

/** The Monday letter's window for a span (lib/admin/weekly.ts), so its reads can be used as they are. */
function weekWindow(span: BriefSpan): WeekWindow {
  return { start: span.start, end: span.end, next: nextDay(span.end), priorStart: span.priorStart, priorEnd: span.priorEnd, label: span.label };
}

export async function readBriefFigures(admin: SupabaseClient, span: BriefSpan): Promise<BriefFigures> {
  const plus = await readPlusFacts(admin, startIso(span.priorStart)).catch((): PlusRead => ({ state: "unavailable" }));
  const settle = <T>(p: Promise<Got<T>>): Promise<Got<T>> => p.catch((): Got<T> => "not read");
  const [readers, money, opened, community, misses, errors, context, week] = await Promise.all([
    settle(readReaders(admin, span)),
    settle(readMoney(admin, span, plus)),
    settle(readOpened(admin, span)),
    settle(readCommunity(admin, span)),
    settle(readMisses(admin, span)),
    settle(readErrors(admin, span)),
    readContext(admin, span).catch(() => [] as ContextEvent[]),
    span.kind === "week" ? readWeek(admin, weekWindow(span)).catch(() => null) : Promise.resolve(null),
  ]);
  const waiting: Waiting = week ? week.waiting : await readWaiting(admin).catch(() => ({ messages: null, refunds: null, toPost: null }));
  return { span, readers, plus: plusMoves(plus, span), money, opened, community, misses, errors, context, waiting, week };
}
