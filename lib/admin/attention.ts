/**
 * "Is anything wrong", derived.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 *
 * On 2026-09-01 thirty-one paid orders sat unsettled in the books for weeks
 * and the panel said nothing. It could not: it had four surfaces competing
 * for attention and none of them held a CONDITION. The activity feed is news
 * (a sale pill fades), the rail is numbers, the hero's feature card was one
 * hardcoded action, and the health widget was a probe that fired on mount and
 * was never re-read. Money that Stripe took and the webhook never reported
 * looked like thirty-one people mid-checkout, forever.
 *
 * This module folds readings the shell already polls into a ranked list of
 * findings. Three things render from it and nothing else decides: the
 * AttentionStrip above every tab, the "Waiting on you" card on Overview, and
 * the rail badges. One derivation, so they can never disagree.
 *
 * ── Two classes, ranked, never mixed ───────────────────────────────────
 *
 * A FAULT is broken or unmeasured: the panel cannot read its own data, the
 * rate limiter is failing open, orders are unpaid past Stripe's session
 * lifetime with no webhook since. Faults earn the only status colour on the
 * page. A QUEUE is a person waiting: unpaid orders, open tickets, verification
 * requests, moderation. Queues never tint the strip, because a panel that
 * turns amber every ordinary day with three tickets in it is a panel whose
 * amber means nothing by the day it matters.
 *
 * ── Not measured is not zero, and not clear either ─────────────────────
 *
 * Every source arrives as a SourceState. A failed one produces an
 * "unmeasured" chip with a Retry, never a queue and never a fault it cannot
 * stand behind, and the summary can never say "clear" while any source has
 * failed. /admin/shell-preview, where every route answers 403, must show
 * "Cannot tell" with seven chips and no clear line anywhere. Any zero on that
 * screen is a defect.
 *
 * ── Pure, and in lib/ ──────────────────────────────────────────────────
 *
 * No React, no fetch, no clock read. The clock and the readings come in as
 * arguments, which is what lets lib/admin/__tests__/attention.test.ts replay
 * the 2026-09-01 shape and assert it produces exactly one serious finding.
 */

import type { LimitReading } from "./insights/apiLimits";

export type AttentionLevel = "critical" | "serious" | "warn" | "unmeasured" | "queue";

export type AttentionSourceId =
  | "overview"
  | "internal"
  | "outbound"
  | "apiLimits"
  | "support"
  | "verification"
  | "community";

/** The word that travels with every status hue. Colour is never shipped alone. */
export const LEVEL_WORD: Record<AttentionLevel, string> = {
  critical: "Critical",
  serious: "Serious",
  warn: "Warning",
  unmeasured: "Not answering",
  queue: "Waiting",
};

export const SOURCE_LABEL: Record<AttentionSourceId, string> = {
  overview: "Orders and revenue",
  internal: "Internal services",
  outbound: "Outbound services",
  apiLimits: "API.Bible usage",
  support: "Support",
  verification: "Verification",
  community: "Community",
};

/** What a Retry on an unmeasured chip re-reads. */
export const SOURCE_URL: Record<AttentionSourceId, string> = {
  overview: "/api/admin/overview",
  internal: "/api/admin/health?scope=internal",
  outbound: "/api/admin/health?scope=outbound",
  // The counts-only branches. The full support route ships up to 200 tickets
  // with every message body, the full community route five joined selects,
  // and the full api-limits route two whole tables, all to answer questions
  // this derivation does not ask. Each route keeps its full shape for its
  // tab and answers these with a HEAD count or two.
  apiLimits: "/api/admin/api-limits?scope=limits",
  support: "/api/admin/support?summary=1",
  verification: "/api/admin/verification",
  community: "/api/admin/community?summary=1",
};

/** Fixed order within a level. Never by count, so the strip does not reshuffle on every poll. */
const SOURCE_ORDER: AttentionSourceId[] = [
  "overview",
  "internal",
  "outbound",
  "apiLimits",
  "support",
  "verification",
  "community",
];
const LEVEL_ORDER: AttentionLevel[] = ["critical", "serious", "warn", "unmeasured", "queue"];

export type AttentionItem = {
  id: string;
  source: AttentionSourceId;
  cls: "fault" | "queue";
  level: AttentionLevel;
  /** LEVEL_WORD[level], carried on the item so a renderer cannot forget it. */
  word: string;
  /** The chip text after the word. */
  label: string;
  /** The Waiting-on-you card, when this item is on top. */
  title: string;
  body: string;
  count?: number;
  go: { tab: string; label: string };
  also?: { tab: string; label: string };
  /** Set on unmeasured chips and on the panel-blind fault. */
  retryUrl?: string;
};

export type SourceState<T> = {
  /** loading: never answered yet. failed: the last read did not answer, or answered with a shape this cannot read. */
  status: "loading" | "ok" | "failed";
  data: T | null;
  /** When the data was read, epoch ms. Null unless ok. */
  at: number | null;
};

export type OverviewAlertFields = {
  ordersDegraded: boolean;
  /** null when the pending count could not be taken. Not a queue of zero. */
  ordersPending: number | null;
  /**
   * False when the route did not measure staleness: an older server without
   * the fields, or a pending count that errored. The stale-orders rule is
   * skipped and a chip says so; zero would have read as "nothing stale".
   */
  staleMeasured: boolean;
  ordersPendingStale: number;
  ordersPendingUnchecked: number;
  pendingNewestStaleAt: string | null;
  lastWebhookAt: string | null;
  lastWebhookLogReadable: boolean;
  lastWebhookLogMissing: boolean;
  lastReconcileAt: string | null;
};

export type ProbeSlice = {
  probes: { service: string; status: "ok" | "fail" | "skipped"; detail: string }[];
};

export type AttentionInputs = {
  overview: SourceState<OverviewAlertFields>;
  internal: SourceState<ProbeSlice>;
  outbound: SourceState<ProbeSlice>;
  support: SourceState<{ open: number }>;
  verification: SourceState<{ requested: number }>;
  community: SourceState<{ recipes: number; reports: number }>;
  apiLimits: SourceState<{ calls: LimitReading; mau: LimitReading }>;
  /** Consecutive failed overview polls. Two in a row is "the panel is blind". */
  overviewMisses: number;
  /** A reconcile this browser applied, for when admin_activity_log is absent. */
  localReconcileAt: string | null;
};

export type AttentionSummary = {
  state: "checking" | "clear" | "findings" | "unknown";
  /** faults, then unmeasured, then queues. */
  items: AttentionItem[];
  faults: AttentionItem[];
  unmeasured: AttentionItem[];
  queues: AttentionItem[];
  worst: AttentionLevel | null;
  answered: number;
  unanswered: number;
  /** Sources that have never answered yet. A queue card must not say "nothing is waiting" while one of these is a queue. */
  loading: AttentionSourceId[];
  /** The OLDEST successful read, so "checked 4m ago" is never flattered by the freshest. */
  checkedAt: number | null;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
const has = (n: number) => (n === 1 ? "has" : "have");

/**
 * "just now", "40s ago", "3m ago", "2h ago". Coarse on purpose: the strip
 * needs the order of magnitude, not the second.
 */
export function agoText(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * How serious a failed probe is, by which service failed.
 *
 * The rate limiter is critical because lib/security/ratelimit.ts is fail-open:
 * an RPC error is logged and treated as under budget, so about thirty write
 * routes accept without a limit until it answers again. Supabase is critical
 * because everything reads through it. API.Bible is serious: licensed
 * Scripture stops loading. The rest degrade a feature, not the site.
 */
export function probeLevel(service: string): AttentionLevel {
  const s = service.toLowerCase();
  if (s.includes("rate limiter")) return "critical";
  if (s.includes("supabase")) return "critical";
  if (s.includes("api.bible")) return "serious";
  if (s.includes("buy me a coffee") || s.includes("ipwho") || s.includes("render")) return "warn";
  return "serious";
}

/**
 * The stale-orders rule, in one place.
 *
 * `localReconcileAt` is the fallback for a database without
 * admin_activity_log: the route cannot know a reconcile ran, but this browser
 * can, because it pressed Apply. If that Apply came after the newest stale
 * order, every stale order predates it and none is unchecked.
 */
export function stalePending(
  o: OverviewAlertFields,
  localReconcileAt: string | null,
): { unchecked: number; webhook: "silent" | "alive" | "unreadable" } {
  let unchecked = o.ordersPendingUnchecked;
  if (
    unchecked > 0 &&
    localReconcileAt &&
    o.pendingNewestStaleAt &&
    Date.parse(localReconcileAt) >= Date.parse(o.pendingNewestStaleAt)
  ) {
    unchecked = 0;
  }

  let webhook: "silent" | "alive" | "unreadable";
  if (!o.lastWebhookLogReadable) webhook = "unreadable";
  else if (o.lastWebhookAt === null) webhook = "silent";
  else if (o.pendingNewestStaleAt && Date.parse(o.lastWebhookAt) < Date.parse(o.pendingNewestStaleAt))
    webhook = "silent";
  else webhook = "alive";

  return { unchecked, webhook };
}

export function rankItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const l = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
    if (l !== 0) return l;
    const s = SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source);
    if (s !== 0) return s;
    return a.id.localeCompare(b.id);
  });
}

function unmeasuredItem(source: AttentionSourceId): AttentionItem {
  return {
    id: `unmeasured:${source}`,
    source,
    cls: "fault",
    level: "unmeasured",
    word: LEVEL_WORD.unmeasured,
    label: SOURCE_LABEL[source],
    title: "Cannot tell what is waiting",
    body: "This source did not answer, so it cannot vouch for anything, and the panel will not vouch for it.",
    go: { tab: "health", label: "Open Services" },
    retryUrl: SOURCE_URL[source],
  };
}

function fault(
  source: AttentionSourceId,
  id: string,
  level: Exclude<AttentionLevel, "unmeasured" | "queue">,
  label: string,
  title: string,
  body: string,
  go: AttentionItem["go"],
  extra: Partial<Pick<AttentionItem, "also" | "retryUrl" | "count">> = {},
): AttentionItem {
  return { id: `${source}:${id}`, source, cls: "fault", level, word: LEVEL_WORD[level], label, title, body, go, ...extra };
}

function queue(
  source: AttentionSourceId,
  id: string,
  count: number,
  label: string,
  title: string,
  body: string,
  go: AttentionItem["go"],
  also?: AttentionItem["also"],
): AttentionItem {
  return { id: `${source}:${id}`, source, cls: "queue", level: "queue", word: LEVEL_WORD.queue, label, title, body, count, go, also };
}

function ordersFinding(o: OverviewAlertFields, localReconcileAt: string | null): AttentionItem | null {
  const { unchecked, webhook } = stalePending(o, localReconcileAt);
  if (unchecked <= 0) return null;
  const n = unchecked;
  const orders = plural(n, "order", "orders");
  const reconcile = { tab: "revenue", label: "Reconcile in Revenue" };
  const openOrders = { tab: "orders", label: "Open Orders" };

  if (webhook === "unreadable") {
    const why = o.lastWebhookLogMissing
      ? "admin_activity_log is not on this database (migration 20260823_admin_activity_log.sql)"
      : "the log could not be read";
    return fault(
      "overview",
      "stale-unreadable",
      "serious",
      `${orders} unpaid over a day, cannot tell whether Stripe called`,
      "Orders unpaid over a day, and the webhook log cannot be read",
      `${orders} ${has(n)} sat pending for more than a day. The panel cannot tell whether Stripe has called because ${why}. Reconcile asks Stripe directly.`,
      reconcile,
      { count: n },
    );
  }
  if (webhook === "silent") {
    // Two different facts wear the same level. No row at all may mean the
    // log is younger than the orders (the day the migration lands), so it
    // is stated as "no record" rather than as Stripe having gone quiet.
    const noRecord = o.lastWebhookAt === null;
    return fault(
      "overview",
      "stale-silent",
      "serious",
      noRecord
        ? `${orders} unpaid over a day, no Stripe webhook on record`
        : `${orders} unpaid over a day, Stripe silent`,
      "Stripe may have taken money the books never saw",
      noRecord
        ? `${orders} ${has(n)} sat pending for more than a day and no Stripe webhook delivery is on record. Either Stripe has never called this site or the log is younger than these orders. Reconcile asks Stripe about each one and settles what it confirms. Applying it is what clears this.`
        : `${orders} ${has(n)} sat pending for more than a day and Stripe has not called this site since the newest of them was placed. Reconcile asks Stripe about each one and settles what it confirms. Applying it is what clears this.`,
      reconcile,
      { also: openOrders, count: n },
    );
  }
  return fault(
    "overview",
    "stale-alive",
    "warn",
    `${orders} unpaid over a day`,
    "Orders still unpaid after a day",
    n === 1
      ? "1 checkout started more than a day ago and never settled. Stripe has been calling, so it is probably abandoned, but reconciling is the only way to be sure."
      : `${n} checkouts started more than a day ago and never settled. Stripe has been calling, so most are abandoned, but reconciling is the only way to be sure.`,
    reconcile,
    { also: openOrders, count: n },
  );
}

function probeFindings(source: "internal" | "outbound", slice: ProbeSlice): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const p of slice.probes) {
    if (p.status !== "fail") continue; // skipped is a configuration, never a finding
    const level = probeLevel(p.service);
    const s = p.service.toLowerCase();
    const go = { tab: "health", label: "Open Services" };
    if (s.includes("rate limiter")) {
      out.push(
        fault(source, "rate-limiter", "critical", "Rate limiter down, write routes unthrottled", "Write routes are unthrottled",
          "The rate limiter is failing open. Checkout, gift claims and about thirty other write routes are accepting requests without a limit until it answers again.", go),
      );
    } else if (s.includes("supabase")) {
      out.push(
        fault(source, "supabase", "critical", "Supabase probe failed", "Supabase did not answer the probe",
          "The database probe failed. Everything on this panel that reads the database is suspect until it passes.", go),
      );
    } else if (s.includes("api.bible")) {
      out.push(
        fault(source, "api-bible", "serious", "API.Bible probe failed", "Licensed Scripture is not loading",
          "The API.Bible probe failed, so NIV, NKJV and NLT readers are getting errors.", go),
      );
    } else {
      const short = s.includes("buy me a coffee")
        ? "Buy Me a Coffee"
        : s.includes("ipwho")
          ? "ipwho.is"
          : s.includes("render")
            ? "Render"
            : p.service;
      out.push(
        fault(source, `probe:${short.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, level === "warn" ? "warn" : "serious",
          `${short} probe failed`, `${short} did not answer the probe`,
          `${p.detail || "The probe failed."} The feature behind it is degraded until it passes.`, go),
      );
    }
  }
  return out;
}

function limitFindings(r: LimitReading, what: "calls" | "active users"): AttentionItem | null {
  if (r.status === "ok" || r.status === "unmeasured") return null;
  const pct = r.ratio === null ? "" : `${Math.round(r.ratio * 100)}%`;
  const level = r.status === "approaching" ? "warn" : "serious";
  const label = pct
    ? `API.Bible ${what} at ${pct} of the monthly ceiling`
    : `API.Bible ${what} near the monthly ceiling`;
  return fault(
    "apiLimits",
    what === "calls" ? "calls" : "mau",
    level,
    label,
    `API.Bible ${what} are ${r.status === "breached" ? "over" : "close to"} the licence ceiling`,
    `${r.detail} Enterprise terms are the remedy the licence offers, and they take time to arrange.`,
    { tab: "goals", label: "Open Goals" },
  );
}

export function deriveAttention(i: AttentionInputs): AttentionSummary {
  const faults: AttentionItem[] = [];
  const unmeasured: AttentionItem[] = [];
  const queues: AttentionItem[] = [];

  let answered = 0;
  const loading: AttentionSourceId[] = [];
  let checkedAt: number | null = null;
  const seen = (id: AttentionSourceId, s: SourceState<unknown>) => {
    if (s.status === "ok") {
      answered += 1;
      if (s.at !== null) checkedAt = checkedAt === null ? s.at : Math.min(checkedAt, s.at);
    } else if (s.status === "loading") loading.push(id);
  };

  // ── Orders and revenue ─────────────────────────────────────────────
  seen("overview", i.overview);
  if (i.overview.status === "failed") {
    if (i.overviewMisses >= 2) {
      faults.push(
        fault("overview", "blind", "critical", "Panel cannot read its own data", "The panel cannot read its own data",
          `The overview request has failed ${i.overviewMisses} times in a row. Everything on screen is the last good read.`,
          { tab: "health", label: "Open Services" }, { retryUrl: SOURCE_URL.overview }),
      );
    } else {
      unmeasured.push(unmeasuredItem("overview"));
    }
  } else if (i.overview.status === "ok" && i.overview.data) {
    const o = i.overview.data;
    if (o.ordersDegraded) {
      faults.push(
        fault("overview", "degraded", "critical", "Orders table unreadable, money figures unmeasured", "Orders cannot be read",
          "The orders table did not answer, so every money figure on this screen is unmeasured rather than zero.",
          { tab: "health", label: "Open Services" }),
      );
    } else {
      // The route answered, but not about everything. An older server
      // without the stale fields, or a pending count that errored, leaves
      // the stale rule or the queue unmeasured; the rest of the payload is
      // still good, so this is a chip beside the findings, not a failed
      // source.
      if (!o.staleMeasured || o.ordersPending === null) unmeasured.push(unmeasuredItem("overview"));
      if (o.staleMeasured) {
        const stale = ordersFinding(o, i.localReconcileAt);
        if (stale) faults.push(stale);
      }
      if (o.ordersPending !== null && o.ordersPending > 0) {
        const n = o.ordersPending;
        queues.push(
          queue("overview", "pending", n, `${n} awaiting payment`, "Orders awaiting payment",
            `${plural(n, "order is", "orders are")} sitting unpaid. Each one is a person who started a checkout and did not finish it.`,
            { tab: "orders", label: "Open Orders" }, { tab: "revenue", label: "See Revenue" }),
        );
      }
    }
  }

  // ── Probes ─────────────────────────────────────────────────────────
  for (const src of ["internal", "outbound"] as const) {
    const s = i[src];
    seen(src, s);
    if (s.status === "failed") unmeasured.push(unmeasuredItem(src));
    else if (s.status === "ok" && s.data) faults.push(...probeFindings(src, s.data));
  }

  // ── API.Bible licence ──────────────────────────────────────────────
  seen("apiLimits", i.apiLimits);
  if (i.apiLimits.status === "failed") unmeasured.push(unmeasuredItem("apiLimits"));
  else if (i.apiLimits.status === "ok" && i.apiLimits.data) {
    const { calls, mau } = i.apiLimits.data;
    const c = limitFindings(calls, "calls");
    const m = limitFindings(mau, "active users");
    if (c) faults.push(c);
    if (m) faults.push(m);
    // An unmeasured ceiling is not a ceiling you are under.
    if (calls.status === "unmeasured" || mau.status === "unmeasured") unmeasured.push(unmeasuredItem("apiLimits"));
  }

  // ── Queues ─────────────────────────────────────────────────────────
  seen("support", i.support);
  if (i.support.status === "failed") unmeasured.push(unmeasuredItem("support"));
  else if (i.support.status === "ok" && i.support.data && i.support.data.open > 0) {
    const n = i.support.data.open;
    queues.push(
      queue("support", "open", n, plural(n, "open ticket", "open tickets"), "Support tickets waiting",
        n === 1 ? "1 person wrote in and has not had a reply." : `${n} people wrote in and have not had a reply.`,
        { tab: "messages", label: "Open Messages" }),
    );
  }

  seen("verification", i.verification);
  if (i.verification.status === "failed") unmeasured.push(unmeasuredItem("verification"));
  else if (i.verification.status === "ok" && i.verification.data && i.verification.data.requested > 0) {
    const n = i.verification.data.requested;
    queues.push(
      queue("verification", "requested", n, plural(n, "verification request", "verification requests"), "Verification requests waiting",
        n === 1
          ? "1 person asked for the blue check and is waiting on a decision."
          : `${n} people asked for the blue check and are waiting on a decision.`,
        { tab: "verification", label: "Open Verification" }),
    );
  }

  seen("community", i.community);
  if (i.community.status === "failed") unmeasured.push(unmeasuredItem("community"));
  else if (i.community.status === "ok" && i.community.data) {
    const { recipes, reports } = i.community.data;
    const n = recipes + reports;
    if (n > 0) {
      queues.push(
        queue("community", "moderation", n, `${n} awaiting moderation`, "Moderation queue",
          `${plural(recipes, "recipe", "recipes")} and ${plural(reports, "report", "reports")} are waiting for a decision.`,
          { tab: "community", label: "Open Community" }),
      );
    }
  }

  const rankedFaults = rankItems(faults);
  const rankedUnmeasured = rankItems(unmeasured);
  const rankedQueues = rankItems(queues);
  const items = [...rankedFaults, ...rankedUnmeasured, ...rankedQueues];
  const unanswered = rankedUnmeasured.length;

  let state: AttentionSummary["state"];
  if (rankedFaults.length > 0) state = "findings";
  else if (unanswered > 0) state = "unknown";
  else if (loading.length > 0) state = "checking";
  else state = "clear";

  const worst: AttentionLevel | null =
    rankedFaults[0]?.level ?? (unanswered > 0 ? "unmeasured" : null);

  return {
    state,
    items,
    faults: rankedFaults,
    unmeasured: rankedUnmeasured,
    queues: rankedQueues,
    worst,
    answered,
    unanswered,
    loading,
    checkedAt,
  };
}

/** The one line above the chips. */
export function headline(s: AttentionSummary, now: number): { text: string; meta: string | null } {
  const checked = s.checkedAt === null ? null : `checked ${agoText(s.checkedAt, now)}`;
  switch (s.state) {
    case "checking":
      return { text: "Checking", meta: null };
    case "clear":
      // The time is meta, not text, in every state: the text is what a live
      // region announces, and a clock in it would re-announce the band once
      // a minute for as long as the panel is open.
      return {
        text: `Nothing is broken. ${plural(s.answered, "check", "checks")} passed.`,
        meta: checked,
      };
    case "unknown":
      return {
        text: `Cannot tell. ${plural(s.unanswered, "check", "checks")} did not answer.`,
        meta: checked,
      };
    case "findings": {
      const n = s.faults.length;
      const text = n === 1 ? "1 thing needs attention" : `${n} things need attention`;
      const meta = [checked, s.unanswered > 0 ? `${plural(s.unanswered, "check", "checks")} did not answer` : null]
        .filter(Boolean)
        .join(" · ");
      return { text, meta: meta || null };
    }
  }
}

/**
 * The count a rail item wears, and its tooltip. Null for zero, and null for a
 * failed source: a badge is a claim that somebody is waiting, and a source
 * that did not answer cannot make it.
 */
export function badgeFor(s: AttentionSummary, tab: string): { count: number; title: string } | null {
  const q = s.queues.find((x) => x.go.tab === tab && (x.count ?? 0) > 0);
  if (!q) return null;
  const n = q.count ?? 0;
  const title =
    tab === "orders"
      ? `${plural(n, "order", "orders")} awaiting payment`
      : tab === "messages"
        ? plural(n, "open ticket", "open tickets")
        : tab === "verification"
          ? plural(n, "verification request", "verification requests")
          : `${n} awaiting moderation`;
  return { count: n, title };
}

/** Which rail rows carry a live dot: the tabs an item, of either class, points at. */
export function attentionTabs(s: AttentionSummary): Set<string> {
  const out = new Set<string>();
  for (const it of s.items) {
    if (it.level === "unmeasured") continue;
    out.add(it.go.tab);
    if (it.also) out.add(it.also.tab);
  }
  return out;
}
