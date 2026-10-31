/**
 * Your week: the Audit log's first view, his pick B on r3-17 (2026-10-30).
 *
 * "You asked the admin to learn from your use: this is where it says what it
 * learned and you decide, and the rail moves only when you say yes." So the
 * readout is sentences, not tables: where his time went, what Home was for,
 * what he never opened; and a few suggestions, each answered Do it or Not
 * now. Only his own visits count (app/api/admin/usage/route.ts reads the
 * signed-in admin's rows alone), and the rail moves only on his yes: the shell
 * no longer re-sorts it by itself, and "Do it" is what writes the adm_rail
 * cookie the server draws the rail from (lib/admin/rail.ts).
 *
 * What a suggestion can do is what the cookie can carry: a page moved between
 * Daily, When needed and Tools. Home stays first (rail.ts's first rule), so
 * "open the admin on Money" is said as an observation and not offered as a
 * move.
 *
 * Pure: the usage readout and the rail in, words and a new rail out.
 */

import { ADMIN_PAGE_GROUPS, pageOf, viewLabel, type AdminPageGroup } from "./pages";
import { HOME, MIN_STAYS, RAIL_COOKIE, decodeRail, normalizeRail, railFromUsage, type ViewUse } from "./rail";

export type PageTime = { pageId: string; label: string; ms: number; visits: number; quick: number };

/** Time and visits per page (its views summed), most time first. */
export function timeByPage(views: readonly ViewUse[]): PageTime[] {
  const by = new Map<string, PageTime>();
  for (const v of views) {
    const page = pageOf(v.tab);
    if (!page) continue;
    const t = by.get(page.id) ?? { pageId: page.id, label: page.label, ms: 0, visits: 0, quick: 0 };
    t.ms += Math.max(0, v.totalMs || 0);
    t.visits += Math.max(0, v.opens || 0);
    t.quick += Math.max(0, v.quickExits || 0);
    by.set(page.id, t);
  }
  return [...by.values()].sort((a, b) => b.ms - a.ms || b.visits - a.visits || a.label.localeCompare(b.label));
}

/** "9 min", "40 s", "1 h 5 min": the time a person reads, rounded. */
export function durationWords(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

const span = (days: number) => (days === 7 ? "This week" : `These ${days} days`);

const andList = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** Home is a doorway when most of its visits leave within five seconds. */
export function homeWasDoorway(home: PageTime | undefined): boolean {
  return Boolean(home && home.visits >= 5 && home.quick / home.visits >= 0.6);
}

/** The week in one sentence: "This week you read Traffic and Money. Home was a doorway." */
export function weekSentence(pages: readonly PageTime[], days: number): string {
  if (pages.length === 0) return `${span(days)} the log holds no visits of yours.`;
  const read = pages.filter((p) => p.pageId !== HOME && p.ms >= 60_000).slice(0, 2);
  const home = pages.find((p) => p.pageId === HOME);
  const lead = read.length > 0 ? `${span(days)} you read ${andList(read.map((p) => p.label))}.` : `${span(days)} you looked in, but stayed nowhere a minute.`;
  return homeWasDoorway(home) ? `${lead} Home was a doorway.` : lead;
}

/**
 * Home in a line: "Home: 33 visits, 30 of them left within five seconds, most
 * for Money." `paths` is the readout's from and to pairs.
 */
export function homeLine(pages: readonly PageTime[], paths: readonly { from: string; to: string; count: number }[]): string | null {
  const home = pages.find((p) => p.pageId === HOME);
  if (!home || home.visits === 0) return null;
  const onward = new Map<string, number>();
  for (const p of paths) {
    if (pageOf(p.from)?.id !== HOME) continue;
    const to = pageOf(p.to);
    if (!to || to.id === HOME) continue;
    onward.set(to.label, (onward.get(to.label) ?? 0) + p.count);
  }
  const most = [...onward.entries()].sort((a, b) => b[1] - a[1])[0];
  const quick = home.quick > 0 ? `, ${home.quick} of them left within five seconds` : "";
  return `Home: ${home.visits} ${home.visits === 1 ? "visit" : "visits"}${quick}${most ? `, most for ${most[0]}` : ""}.`;
}

/** The views never opened in the window, by name. Owner views are left out: they are not in the readout. */
export function neverOpened(never: readonly string[]): string[] {
  return never.map((t) => viewLabel(t));
}

// ── Suggestions ──────────────────────────────────────────────────────────

const GROUPS = ["Daily", "When needed", "Tools"] as const;

export type RailSuggestion = {
  /** Stable for a page and where it would go, so Not now can remember it. */
  id: string;
  pageId: string;
  to: 0 | 1 | 2;
  title: string;
  why: string;
};

function groupIndex(groups: readonly AdminPageGroup[], pageId: string): number {
  return groups.findIndex((g) => g.pages.some((p) => p.id === pageId));
}

function usageWords(t: PageTime | undefined, days: number): string {
  if (!t || t.visits === 0) return days === 7 ? "Not opened this week." : `Not opened in ${days} days.`;
  const times = t.visits === 1 ? "once" : `${t.visits} times`;
  return `You opened it ${times}${days === 7 ? " this week" : ` in ${days} days`}, ${durationWords(t.ms)} in all.`;
}

/**
 * What his use says the rail should be, as moves he can say yes to. Each
 * page whose place differs between the rail he has and the rail his use
 * makes (lib/admin/rail.ts, railFromUsage) is one suggestion, except a page
 * that only drops out of Daily because another comes in: that is said by the
 * one coming in. At most three, the ones into Daily first.
 */
export function railSuggestions(current: readonly AdminPageGroup[], views: readonly ViewUse[], days: number): RailSuggestion[] {
  // Too few visits that stayed to say anything: no suggestion, rather than a
  // move back to the picked rail argued from nothing.
  const stayed = views.reduce((n, v) => n + Math.max(0, (v.opens || 0) - (v.quickExits || 0)), 0);
  if (stayed < MIN_STAYS) return [];
  const target = railFromUsage(views);
  const use = new Map(timeByPage(views).map((t) => [t.pageId, t]));
  const out: RailSuggestion[] = [];
  for (const g of target) {
    for (const p of g.pages) {
      if (p.id === HOME) continue;
      const from = groupIndex(current, p.id);
      const to = groupIndex(target, p.id) as 0 | 1 | 2;
      if (from < 0 || from === to) continue;
      if (from === 0 && to === 1) continue; // displaced from Daily: said by the page coming in
      const t = use.get(p.id);
      const title =
        to === 0
          ? `Put ${p.label} in Daily.`
          : to === 1
            ? `Bring ${p.label} out of Tools.`
            : `Fold ${p.label} into Tools.`;
      out.push({ id: `${p.id}>${GROUPS[to]}`, pageId: p.id, to, title, why: usageWords(t, days) });
    }
  }
  return out.sort((a, b) => a.to - b.to).slice(0, 3);
}

/**
 * The rail with one suggestion taken: the page moved, and when it goes into
 * Daily, the Daily page he uses least is the one that steps down (Daily
 * holds four; normalizeRail moves the fifth to the head of When needed).
 */
export function applySuggestion(current: readonly AdminPageGroup[], s: RailSuggestion, views: readonly ViewUse[]): AdminPageGroup[] {
  const lists = current.map((g) => g.pages.map((p) => p.id).filter((id) => id !== s.pageId));
  if (s.to === 0) {
    const use = new Map(timeByPage(views).map((t) => [t.pageId, t]));
    const stays = (id: string) => {
      const t = use.get(id);
      return t ? t.visits - t.quick : 0;
    };
    const ms = (id: string) => use.get(id)?.ms ?? 0;
    const rest = [...lists[0].filter((id) => id !== HOME), s.pageId].sort((a, b) => stays(b) - stays(a) || ms(b) - ms(a));
    lists[0] = [HOME, ...rest];
  } else {
    lists[s.to].push(s.pageId);
  }
  return normalizeRail(lists);
}

/** The rail the server drew, read back from document.cookie. */
export function railFromCookies(cookies: string): AdminPageGroup[] {
  const raw = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${RAIL_COOKIE}=`));
  return decodeRail(raw ? raw.slice(RAIL_COOKIE.length + 1) : null).groups;
}

/** The operations groups as the rail draws them, for a sentence: "Releases is in Tools". */
export function groupName(i: number): string {
  return GROUPS[i] ?? ADMIN_PAGE_GROUPS[i]?.group ?? "";
}

// ── Not now ─────────────────────────────────────────────────────────────

/** How long Not now keeps a suggestion away. */
export const NOT_NOW_DAYS = 7;

/** The suggestions not answered with Not now in the last week. */
export function stillAsked(list: readonly RailSuggestion[], notNow: Record<string, string>, now: number): RailSuggestion[] {
  return list.filter((s) => {
    const at = notNow[s.id];
    return !at || now - Date.parse(at) > NOT_NOW_DAYS * 86_400_000;
  });
}
