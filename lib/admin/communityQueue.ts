/**
 * Community, his pick A on r3-17 (2026-10-30): one queue.
 *
 * "Everything that waits for a decision in one list, one row per thing
 * (never once per report), oldest first, with its buttons on the row. A
 * removal waits ten seconds with Undo before it is written."
 *
 * Before, a post hidden by readers' reports showed twice (held, then once
 * per report), a reported recipe and its review sat in two cards, and the
 * rail's count left held posts out. Here every source of waiting is folded
 * into rows keyed by the thing itself: a post, a reply, a prayer request's
 * words, a profile, a recipe sent in, a recipe, a Kitchen review, a prayer
 * campaign. The holds the word filter keeps and the reports readers file on
 * the same post are one row.
 *
 * The rail's badge counts the same rows: waitingKeys() is shared by the
 * queue below and by the counts-only read the strip makes
 * (app/api/admin/community/route.ts, ?summary=1), so the number on the rail
 * is the number of rows on the page.
 *
 * Pure: the two routes' payloads in, rows out. Every action names the
 * request it makes; the page makes it (and holds a removal back ten seconds
 * first, lib/admin/undoDelay.ts).
 */

/** How long a removal waits, with Undo, before it is written. */
export const UNDO_MS = 10_000;

// ── What the routes hand over ────────────────────────────────────────────

export type HoldIn = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  reason?: "words" | "spam" | "links" | "new_account" | "reports" | null;
  detail?: string | null;
  original_title: string | null;
  original_body: string | null;
  created_at: string;
  post: { id: string; kind?: string | null; title: string | null; body: string | null; author_name: string; author_handle: string | null; status: string } | null;
  reply: { id: string; post_id: string; body: string; author_name: string; author_handle: string | null; status: string } | null;
  /** A prayer request's words (1.7.1): who asked, and the words as shown now. */
  profile?: { handle: string | null; name: string | null; intention: string | null } | null;
};

export type ReportIn = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  is_profile?: boolean;
  profile?: { handle: string | null; name: string | null; bio: string | null; status: string | null; banner_url: string | null; parish?: string | null } | null;
  reason: string | null;
  created_at: string;
  post: { id: string; kind: string; title: string | null; body: string | null; quote_text: string | null; quote_source: string | null; author_name: string; status: string } | null;
  reply: { id: string; post_id: string; body: string; author_name: string; status: string } | null;
};

export type RecipeIn = {
  id: string;
  title: string;
  fast_level: string;
  season: string;
  tradition: string;
  summary: string | null;
  ingredients: string;
  steps: string;
  created_at: string;
  photo_url?: string | null;
};

export type CampaignReportIn = {
  id: string;
  reason: string | null;
  created_at: string;
  campaign: { id: string; title: string; status: string; intention: string; subject_name: string | null; image_url?: string | null } | null;
};

export type RecipeReportIn = {
  id: string;
  reason: string | null;
  created_at: string;
  recipe: { id: string; title: string; status: string } | null;
};

export type ReviewReportIn = {
  id: string;
  reason: string | null;
  created_at: string;
  review: { id: string; stars: number; body: string | null; photo_urls: string[] | null; author_name: string; status: string } | null;
  recipe: { id: string; title: string } | null;
};

export type QueueSources = {
  holds: HoldIn[];
  reports: ReportIn[];
  pendingRecipes: RecipeIn[];
  campaignReports: CampaignReportIn[];
  recipeReports: RecipeReportIn[];
  reviewReports: ReviewReportIn[];
};

// ── The keys: one per thing ──────────────────────────────────────────────

export const holdKey = (h: { id: string; post_id: string | null; reply_id: string | null }) =>
  h.post_id ? `post:${h.post_id}` : h.reply_id ? `reply:${h.reply_id}` : `request:${h.id}`;

/** A report's thing. A profile is told apart by whatever names it stably: its handle in the page, its id in the count. */
export const reportKey = (r: { id: string; post_id: string | null; reply_id: string | null }, profile?: string | null) =>
  r.post_id ? `post:${r.post_id}` : r.reply_id ? `reply:${r.reply_id}` : `profile:${profile ?? r.id}`;

export const recipeNewKey = (id: string) => `recipe-new:${id}`;
export const recipeKey = (recipeId: string | null | undefined, reportId: string) => (recipeId ? `recipe:${recipeId}` : `recipe-report:${reportId}`);
export const reviewKey = (reviewId: string | null | undefined, reportId: string) => (reviewId ? `review:${reviewId}` : `review-report:${reportId}`);
export const campaignKey = (campaignId: string | null | undefined, reportId: string) =>
  campaignId ? `campaign:${campaignId}` : `campaign-report:${reportId}`;

/** How many rows wait: the distinct things, whatever number of holds and reports name them. */
export function countWaiting(keys: Iterable<string>): number {
  return new Set(keys).size;
}

// ── The rows ─────────────────────────────────────────────────────────────

export type QueueCall = { url: string; body: Record<string, unknown> };

export type QueueAction = {
  id: string;
  label: string;
  tone: "primary" | "default" | "danger";
  /** Held back ten seconds with Undo before it is written. */
  removal: boolean;
  /** The requests it makes, in order. Several when one row answers several reports. */
  calls: QueueCall[];
  /** What the row says once it is written. */
  done: string;
};

export type QueueRow = {
  key: string;
  /** The first thing said: "Held for review · masked words · a reply". */
  what: string;
  /** The oldest moment any part of it began waiting. */
  at: string;
  who: { name: string | null; handle: string | null } | null;
  /** As readers see it now. */
  text: string;
  /** As its writer wrote it, when the filter masked words. */
  written: string | null;
  /** "Off topic 2 · Rude 1", when readers gave reasons. */
  reasons: string | null;
  /** A line under the text: a quote's source, a recipe's fast, a profile's parts. */
  note: string | null;
  /** A recipe's ingredients and method, folded. */
  more: string | null;
  /** A picture that came with it, to see what was flagged. */
  picture: string | null;
  actions: QueueAction[];
};

const COMMUNITY = "/api/admin/community";
const FILTER = "/api/admin/community/filter";

const KIND_WORDS: Record<string, string> = {
  discussion: "a post in Discussion",
  scripture: "a Scripture post",
  father: "a post quoting the Fathers",
};
const postWords = (kind: string | null | undefined) => (kind ? (KIND_WORDS[kind] ?? `a post in ${kind}`) : "a post");

const HOLD_WORDS: Record<string, string> = {
  words: "masked words",
  spam: "spam",
  links: "a short link",
  new_account: "a new account's link",
  reports: "hidden by reports",
};

function flat(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** "Off topic 2 · Rude 1": each reason once, most given first. */
export function tallyReasons(reasons: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const r of reasons) {
    const k = flat(r);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, n]) => (n > 1 ? `${k} ${n}` : k))
    .join(" · ");
}

/** The reason given most, to keep beside a removal. */
function topReason(reasons: readonly (string | null)[]): string | null {
  const t = tallyReasons(reasons);
  return t ? t.split(" · ")[0].replace(/ \d+$/, "") : null;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
const oldest = (xs: readonly string[]) => [...xs].sort()[0];
const dismissAll = (action: string, ids: readonly string[]): QueueCall[] => ids.map((id) => ({ url: COMMUNITY, body: { action, id } }));

type Parts = { holds: HoldIn[]; reports: ReportIn[] };

function conversationRow(key: string, part: Parts): QueueRow {
  const hold = part.holds[0] ?? null;
  const reports = part.reports;
  const reportIds = reports.map((r) => r.id);
  const at = oldest([...part.holds.map((h) => h.created_at), ...reports.map((r) => r.created_at)]);
  const reasons = tallyReasons(reports.map((r) => r.reason));
  const n = reports.length;

  // A profile reported: its parts are the text.
  if (key.startsWith("profile:")) {
    const p = reports[0].profile ?? null;
    const parts = [p?.status ? `Status: ${p.status}` : null, p?.bio, p?.parish ? `Parish: ${p.parish}` : null].filter(Boolean).join("\n");
    const empty = !p?.bio && !p?.status && !p?.banner_url && !p?.parish;
    const actions: QueueAction[] = [{ id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_community_report", reportIds), done: "Dismissed. The reports are kept as dismissed." }];
    if (p && !empty) {
      actions.unshift({ id: "clear", label: "Clear profile", tone: "danger", removal: true, calls: [{ url: COMMUNITY, body: { action: "clear_community_profile", id: reportIds[0] } }], done: "Profile cleared." });
    }
    if (p) {
      actions.unshift({ id: "reset", label: "Reset handle", tone: "danger", removal: true, calls: [{ url: COMMUNITY, body: { action: "reset_community_handle", id: reportIds[0] } }], done: "Handle reset." });
    }
    return {
      key,
      what: `Reported · ${plural(n, "report", "reports")} · a profile`,
      at,
      who: p ? { name: p.name, handle: p.handle } : null,
      text: parts || (p ? "Nothing written on it." : "The profile is gone."),
      written: null,
      reasons,
      note: p?.banner_url ? "It carries a banner picture." : null,
      more: null,
      picture: p?.banner_url ?? null,
      actions,
    };
  }

  // A prayer request's words, held by the word filter.
  if (hold?.profile) {
    const req = hold.profile;
    return {
      key,
      what: "Held for review · masked words · a prayer request",
      at,
      who: { name: req.name, handle: req.handle },
      text: flat(req.intention),
      written: [hold.original_title, hold.original_body].filter(Boolean).join("\n") || null,
      reasons,
      note: hold.detail ?? null,
      more: null,
      picture: null,
      actions: [
        { id: "remove", label: "Remove the words", tone: "danger", removal: true, calls: [{ url: FILTER, body: { action: "remove_hold", id: hold.id } }], done: "Removed. The request stays up." },
        { id: "keep", label: "Keep hidden", tone: "default", removal: false, calls: [{ url: FILTER, body: { action: "keep_hold", id: hold.id } }], done: "Kept masked." },
        { id: "approve", label: "Approve as written", tone: "primary", removal: false, calls: [{ url: FILTER, body: { action: "approve_hold", id: hold.id } }], done: "Approved as written." },
      ],
    };
  }

  const isReply = key.startsWith("reply:");
  const post = hold?.post ?? null;
  const reply = hold?.reply ?? null;
  const rPost = reports[0]?.post ?? null;
  const rReply = reports[0]?.reply ?? null;
  const authorName = (isReply ? (reply?.author_name ?? rReply?.author_name) : (post?.author_name ?? rPost?.author_name)) ?? null;
  const authorHandle = (isReply ? reply?.author_handle : post?.author_handle) ?? null;
  const status = (isReply ? (reply?.status ?? rReply?.status) : (post?.status ?? rPost?.status)) ?? null;
  const shown = isReply
    ? flat(reply?.body ?? rReply?.body)
    : flat([post?.title ?? rPost?.title, post?.body ?? rPost?.body ?? rPost?.quote_text].filter(Boolean).join(" "));
  const thing = isReply ? "a reply" : postWords(post?.kind ?? rPost?.kind);
  const targetId = key.slice(key.indexOf(":") + 1);
  const removeCall: QueueCall = {
    url: COMMUNITY,
    body: { action: isReply ? "remove_community_reply" : "remove_community_post", id: targetId, reason: topReason(reports.map((r) => r.reason)) },
  };

  if (hold) {
    const reason = hold.reason ?? "words";
    const words = reason === "words";
    const reportPart = n > 0 ? ` · ${plural(n, "report", "reports")}` : "";
    const actions: QueueAction[] = [
      { id: "remove", label: "Remove", tone: "danger", removal: true, calls: [{ url: FILTER, body: { action: "remove_hold", id: hold.id } }], done: "Removed." },
    ];
    if (words) actions.push({ id: "keep", label: "Keep hidden", tone: "default", removal: false, calls: [{ url: FILTER, body: { action: "keep_hold", id: hold.id } }], done: "Kept masked." });
    actions.push({
      id: "approve",
      label: words ? "Approve as written" : "Approve and show",
      tone: "primary",
      removal: false,
      calls: [{ url: FILTER, body: { action: "approve_hold", id: hold.id } }],
      done: words ? "Approved as written." : "Shown to readers again.",
    });
    return {
      key,
      what: `${words ? "Held for review" : "Held"} · ${HOLD_WORDS[reason] ?? reason}${reportPart} · ${thing}`,
      at,
      who: { name: authorName, handle: authorHandle },
      text: shown,
      written: words ? [hold.original_title, hold.original_body].filter(Boolean).join("\n") || null : null,
      reasons,
      note: [hold.detail ?? null, status === "held" ? "Hidden from readers until you decide." : null].filter(Boolean).join(" ") || null,
      more: null,
      picture: null,
      actions,
    };
  }

  const gone = status === "removed";
  const actions: QueueAction[] = gone
    ? [{ id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_community_report", reportIds), done: "Dismissed. The reports are kept as dismissed." }]
    : [
        { id: "keep-up", label: "Keep it up", tone: "default", removal: false, calls: dismissAll("dismiss_community_report", reportIds), done: "Kept up. The reports are kept as dismissed." },
        { id: "remove", label: isReply ? "Remove reply" : "Remove post", tone: "danger", removal: true, calls: [removeCall], done: "Removed." },
      ];
  return {
    key,
    what: `Reported · ${plural(n, "report", "reports")} · ${thing}${gone ? " · already removed" : ""}`,
    at,
    who: { name: authorName, handle: authorHandle },
    text: shown,
    written: null,
    reasons,
    note: !isReply && rPost?.quote_source ? rPost.quote_source : null,
    more: null,
    picture: null,
    actions,
  };
}

/** Every row that waits, oldest first. */
export function buildQueue(src: QueueSources): QueueRow[] {
  const convo = new Map<string, Parts>();
  const add = (key: string) => {
    let p = convo.get(key);
    if (!p) {
      p = { holds: [], reports: [] };
      convo.set(key, p);
    }
    return p;
  };
  for (const h of src.holds) add(holdKey(h)).holds.push(h);
  for (const r of src.reports) add(reportKey(r, r.is_profile ? (r.profile?.handle ?? null) : null)).reports.push(r);

  const rows: QueueRow[] = [...convo.entries()].map(([key, part]) => conversationRow(key, part));

  for (const r of src.pendingRecipes) {
    rows.push({
      key: recipeNewKey(r.id),
      what: "Kitchen · a recipe waiting",
      at: r.created_at,
      who: null,
      text: r.title,
      written: null,
      reasons: null,
      note: [r.fast_level, r.season !== "any" ? r.season : null, r.tradition !== "any" ? r.tradition : null, flat(r.summary) || null]
        .filter(Boolean)
        .join(" · "),
      more: `${r.ingredients}\n\n${r.steps}`,
      picture: r.photo_url ?? null,
      actions: [
        { id: "remove", label: "Remove", tone: "danger", removal: true, calls: [{ url: COMMUNITY, body: { action: "remove_recipe", id: r.id } }], done: "Removed." },
        { id: "publish", label: "Publish", tone: "primary", removal: false, calls: [{ url: COMMUNITY, body: { action: "publish_recipe", id: r.id } }], done: "Published to the Kitchen." },
      ],
    });
  }

  const grouped = <T extends { id: string; created_at: string; reason: string | null }>(xs: readonly T[], keyOf: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(keyOf(x), [...(m.get(keyOf(x)) ?? []), x]);
    return [...m.entries()];
  };

  for (const [key, reps] of grouped(src.recipeReports, (r) => recipeKey(r.recipe?.id, r.id))) {
    const recipe = reps[0].recipe;
    const gone = !recipe || recipe.status === "removed";
    rows.push({
      key,
      what: `Reported · ${plural(reps.length, "report", "reports")} · a recipe${gone ? " · already removed" : ""}`,
      at: oldest(reps.map((r) => r.created_at)),
      who: null,
      text: recipe?.title ?? "A recipe since deleted",
      written: null,
      reasons: tallyReasons(reps.map((r) => r.reason)),
      note: null,
      more: null,
      picture: null,
      actions: [
        ...(!recipe || gone ? [] : [{ id: "remove", label: "Remove recipe", tone: "danger" as const, removal: true, calls: [{ url: COMMUNITY, body: { action: "remove_recipe", id: recipe.id } }], done: "Removed." }]),
        { id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_recipe_report", reps.map((r) => r.id)), done: "Dismissed. A record is kept in the moderation log." },
      ],
    });
  }

  for (const [key, reps] of grouped(src.reviewReports, (r) => reviewKey(r.review?.id, r.id))) {
    const review = reps[0].review;
    const gone = !review || review.status === "removed";
    rows.push({
      key,
      what: `Reported · ${plural(reps.length, "report", "reports")} · a Kitchen review${gone ? " · already removed" : ""}`,
      at: oldest(reps.map((r) => r.created_at)),
      who: review ? { name: review.author_name, handle: null } : null,
      text: flat(review?.body) || (review ? `${review.stars} of 5, no words` : "A review since deleted"),
      written: null,
      reasons: tallyReasons(reps.map((r) => r.reason)),
      note: reps[0].recipe?.title ? `On ${reps[0].recipe.title}${review ? `, ${review.stars} of 5` : ""}` : null,
      more: null,
      picture: review?.photo_urls?.[0] ?? null,
      actions: [
        ...(!review || gone ? [] : [{ id: "remove", label: "Remove review", tone: "danger" as const, removal: true, calls: [{ url: COMMUNITY, body: { action: "remove_review", id: review.id } }], done: "Removed, with its photos." }]),
        { id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_recipe_report", reps.map((r) => r.id)), done: "Dismissed. A record is kept in the moderation log." },
      ],
    });
  }

  for (const [key, reps] of grouped(src.campaignReports, (r) => campaignKey(r.campaign?.id, r.id))) {
    const c = reps[0].campaign;
    const gone = !c || c.status === "removed";
    rows.push({
      key,
      what: `Reported · ${plural(reps.length, "report", "reports")} · a prayer campaign${gone ? " · already removed" : ""}`,
      at: oldest(reps.map((r) => r.created_at)),
      who: null,
      text: c ? [c.title, flat(c.intention)].filter(Boolean).join(": ") : "A campaign since deleted",
      written: null,
      reasons: tallyReasons(reps.map((r) => r.reason)),
      note: c?.subject_name ? `For ${c.subject_name}` : null,
      more: null,
      picture: c?.image_url ?? null,
      actions: [
        ...(!c || gone ? [] : [{ id: "remove", label: "Remove campaign", tone: "danger" as const, removal: true, calls: [{ url: COMMUNITY, body: { action: "remove_campaign", id: c.id } }], done: "Removed." }]),
        { id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_campaign_report", reps.map((r) => r.id)), done: "Dismissed. A record is kept in the moderation log." },
      ],
    });
  }

  return rows.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.key.localeCompare(b.key)));
}

/** The keys the queue would make, for the count beside the page's name and on the rail. */
export function waitingKeys(src: QueueSources): string[] {
  return buildQueue(src).map((r) => r.key);
}

/** Seconds left on a removal held for Undo, never below zero. */
export function secondsLeft(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}
