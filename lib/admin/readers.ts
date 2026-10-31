/**
 * The readers' directory: the owner's pick C for Users on sheet r3-15
 * (2026-10-30, "Let's do C for users").
 *
 * One directory of every account: find one by email, @handle or name, filter
 * by when they joined, how they sign in, their plan, their marks, or who is
 * waiting on him; a reader opens their card, where verification, badges and
 * comps are done without a switch. Users, Verification and Badges were three
 * places to find the same reader and a queue seen only from the rail's
 * count; they are this one list now, and the queue is its "Waiting on you"
 * filter.
 *
 * Pure: the rows come in already joined (app/api/admin/readers/route.ts),
 * and the filters, the order and the marks are worked out here.
 */

import type { GrantedBadge } from "@/lib/profile/badges";

export type Provider = "google" | "apple" | "email" | "other";
export type Decision = "requested" | "verified" | "declined";

export type Reader = {
  id: string;
  email: string | null;
  name: string | null;
  handle: string | null;
  /** ISO. When the account was made. */
  joinedAt: string;
  provider: Provider | null;
  lastSignInAt: string | null;
  plan: "plus" | "pro" | null;
  /** Where the plan comes from: apple, google, stripe, comp, gift, legacy. */
  planSource: string | null;
  /** The badges the team gave by hand. */
  badges: string[];
  /** The blue check: asked, given, or declined. */
  check: Decision | null;
  /** The clergy seal, the same. */
  seal: Decision | null;
};

export const BADGE_LABEL: Record<GrantedBadge, string> = {
  team: "Purify Team",
  moderator: "Moderator",
  beta_tester: "Beta Tester",
  bug_hunter: "Bug Hunter",
  translator: "Translator",
  contributor: "Contributor",
};

export const badgeLabel = (b: string): string => (BADGE_LABEL as Record<string, string>)[b] ?? b;

export const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", apple: "Apple", email: "Email", other: "Other" };

export type Joined = "any" | "today" | "7d" | "30d" | "90d";
export type PlanFilter = "all" | "plus" | "pro" | "free";
export type MarksFilter = "any" | "badge" | "check" | "seal" | "none";

export type ReaderFilter = {
  q?: string;
  joined?: Joined;
  provider?: Provider | "all";
  plan?: PlanFilter;
  marks?: MarksFilter;
  /** Only the readers who are waiting on him: a blue check or a clergy seal asked for and not decided. */
  waiting?: boolean;
};

export const JOINED_OPTIONS: readonly (readonly [Joined, string])[] = [
  ["any", "Any time"],
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
];
export const PROVIDER_OPTIONS: readonly (readonly [Provider | "all", string])[] = [
  ["all", "All"],
  ["google", "Google"],
  ["apple", "Apple"],
  ["email", "Email"],
  ["other", "Other"],
];
export const PLAN_OPTIONS: readonly (readonly [PlanFilter, string])[] = [
  ["all", "All plans"],
  ["plus", "Plus"],
  ["pro", "Pro"],
  ["free", "Free"],
];
export const MARK_OPTIONS: readonly (readonly [MarksFilter, string])[] = [
  ["any", "Any"],
  ["badge", "A badge"],
  ["check", "The blue check"],
  ["seal", "The clergy seal"],
  ["none", "None"],
];

/** Waiting on him: a blue check or a clergy seal asked for and not decided yet. */
export const isWaiting = (r: Reader): boolean => r.check === "requested" || r.seal === "requested";

/** Lower case, no accents, no leading @: how a search and a field are compared. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/^@/, "");
}

/** Whether a reader answers to what was typed: their email, @handle or name. */
export function matches(r: Reader, q: string): boolean {
  const needle = fold(q);
  if (!needle) return true;
  return [r.email, r.handle, r.name].some((v) => v !== null && fold(v).includes(needle));
}

const DAY_MS = 86_400_000;

/** The moment a "joined within" filter starts from: midnight UTC for today, else whole days back. */
export function joinedFrom(joined: Joined, now: number): number | null {
  if (joined === "any") return null;
  const midnight = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  const days = joined === "today" ? 1 : joined === "7d" ? 7 : joined === "30d" ? 30 : 90;
  return midnight - (days - 1) * DAY_MS;
}

export function filterReaders(readers: readonly Reader[], f: ReaderFilter, now: number): Reader[] {
  const from = joinedFrom(f.joined ?? "any", now);
  return readers.filter((r) => {
    if (f.waiting && !isWaiting(r)) return false;
    if (f.q && !matches(r, f.q)) return false;
    if (from !== null && !(Date.parse(r.joinedAt) >= from)) return false;
    if (f.provider && f.provider !== "all" && r.provider !== f.provider) return false;
    if (f.plan === "plus" && r.plan !== "plus") return false;
    if (f.plan === "pro" && r.plan !== "pro") return false;
    if (f.plan === "free" && r.plan !== null) return false;
    if (f.marks === "badge" && r.badges.length === 0) return false;
    if (f.marks === "check" && r.check === null) return false;
    if (f.marks === "seal" && r.seal === null) return false;
    if (f.marks === "none" && (r.badges.length > 0 || r.check !== null || r.seal !== null)) return false;
    return true;
  });
}

/**
 * The order the list is read in. Waiting on him: the oldest request first,
 * so nobody is left waiting while newer asks land on top. Otherwise the
 * newest account first.
 */
export function sortReaders(readers: readonly Reader[], waiting: boolean, askedAt?: ReadonlyMap<string, string>): Reader[] {
  const out = [...readers];
  if (waiting && askedAt) {
    return out.sort((a, b) => (askedAt.get(a.id) ?? "").localeCompare(askedAt.get(b.id) ?? "") || a.id.localeCompare(b.id));
  }
  return out.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt) || a.id.localeCompare(b.id));
}

export type Mark = { text: string; kind: "badge" | "waiting" | "given" };

/** A reader's marks for the list: waiting first (a ring), then what was given. */
export function marksOf(r: Reader): Mark[] {
  const out: Mark[] = [];
  if (r.check === "requested") out.push({ text: "asked for the check", kind: "waiting" });
  if (r.seal === "requested") out.push({ text: "asked for the seal", kind: "waiting" });
  if (r.check === "verified") out.push({ text: "Verified", kind: "given" });
  if (r.seal === "verified") out.push({ text: "Clergy", kind: "given" });
  for (const b of r.badges) out.push({ text: badgeLabel(b), kind: "badge" });
  return out;
}

/** "SC" for Sample Reader C, "R" for reader@example.com: the card's avatar. */
export function initialsOf(r: Pick<Reader, "name" | "email" | "handle">): string {
  const source = (r.name ?? r.handle ?? r.email ?? "?").trim();
  const words = source.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
}

/** The plan in the list's words. */
export function planWord(r: Pick<Reader, "plan">): string {
  return r.plan === "pro" ? "Pro" : r.plan === "plus" ? "Plus" : "Free";
}

/** Where a plan comes from, in words: "App Store", "Google Play", "comped". */
export function sourceWord(source: string | null): string {
  switch (source) {
    case "apple":
      return "App Store";
    case "google":
      return "Google Play";
    case "stripe":
      return "the website";
    case "comp":
      return "comped";
    case "gift":
      return "a gift";
    case "legacy":
      return "grandfathered";
    default:
      return source ?? "unknown";
  }
}
