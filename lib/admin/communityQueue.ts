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

import { heldWhy, type HeldWhy, type WaitingCampaign, type WaitingPicture } from "@/lib/campaigns/model";
import type { RemovalReason } from "@/lib/community/removal";

import { openReports, sharedKey, sharedWords, waitsForDecision, type SharedPageIn } from "./sharedPages";

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
  /** Shared journal pages with their reports (1.9, admin A1; lib/admin/sharedPages.ts). Absent before the sharing table. */
  sharedPages?: SharedPageIn[];
  /**
   * Prayer campaigns waiting to be read (1.9, the rework): every campaign
   * once, before it is public, and again when readers' reports hide it
   * (lib/campaigns/moderation.ts). Absent while campaigns are closed.
   */
  waitingCampaigns?: WaitingCampaign[];
  /**
   * A campaign's pictures that wait for a moderator (1.9, "After 1.9: the
   * panel", item 1, moved into 1.9 with pictures): a new one, one hidden by
   * readers' reports, or one still shown that readers have reported
   * (lib/campaigns/pictures.ts, readWaitingPictures). Absent while pictures
   * are switched off (lib/campaigns/parts.ts).
   */
  waitingPictures?: WaitingPicture[];
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
/** A campaign's picture: its own row, apart from its campaign's (a moderator decides each). */
export const pictureKey = (pictureId: string) => `picture:${pictureId}`;

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
  /**
   * The poster is told why (the Terms, "What we may remove";
   * lib/community/removal.ts): the row asks the moderator for a reason from
   * the list, and withReason() puts it on every call.
   */
  notifies?: boolean;
};

/** The action with the moderator's reason on each of its calls, for the poster's notice. */
export function withReason(action: QueueAction, code: RemovalReason): QueueAction {
  if (!action.notifies) return action;
  return { ...action, calls: action.calls.map((c) => ({ ...c, body: { ...c.body, reason_code: code } })) };
}

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
  /** Read before the rest, whatever its age: a campaign whose words may mean its writer is in danger. */
  first?: boolean;
};

const COMMUNITY = "/api/admin/community";
const FILTER = "/api/admin/community/filter";
const SHARED = "/api/admin/shared-pages";

/** What a reader ticked when reporting a picture, in the panel's words (the reader's are lib/campaigns/model.ts PICTURE_REPORT_REASON_LABEL). */
const PICTURE_REASON_WORDS: Record<string, string> = {
  about_me: "shows the reporter or someone in their care, without agreement",
  picture: "should not be here",
  other: "something else",
};

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

/** Why a campaign waits beyond being new, as the filters saw it (lib/campaigns/model.ts, heldWhy). */
const CAMPAIGN_WHY: Record<HeldWhy, string> = {
  crisis: "the writer may be in danger",
  words: "masked words",
  asks: "asks for money or contact",
  address: "a street address",
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
      { id: "remove", label: "Remove", tone: "danger", removal: true, notifies: true, calls: [{ url: FILTER, body: { action: "remove_hold", id: hold.id } }], done: "Removed." },
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
        { id: "remove", label: isReply ? "Remove reply" : "Remove post", tone: "danger", removal: true, notifies: true, calls: [removeCall], done: "Removed." },
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

  // Prayer campaigns waiting to be read (1.9): one row a campaign, the
  // reports on it folded in, so one hidden by reports is not a second row.
  const waiting = new Set((src.waitingCampaigns ?? []).map((c) => c.id));
  for (const c of src.waitingCampaigns ?? []) {
    const reps = src.campaignReports.filter((r) => r.campaign?.id === c.id);
    const why = heldWhy(c.held_reason);
    const hidden = why.includes("reports");
    const urgent = why.includes("crisis");
    rows.push({
      key: campaignKey(c.id, c.id),
      what: [
        ...(urgent ? ["Read first: the writer may be in danger"] : []),
        hidden ? `Hidden by reports · ${plural(reps.length, "report", "reports")}` : "Waiting to be read",
        "a prayer campaign",
        ...why.filter((w) => w !== "reports" && w !== "crisis").map((w) => CAMPAIGN_WHY[w]),
      ].join(" · "),
      at: oldest([c.created_at, ...reps.map((r) => r.created_at)]),
      who: { name: c.creator_name, handle: c.creator_handle },
      text: [c.title, flat(c.details)].filter(Boolean).join(": "),
      written: null,
      reasons: tallyReasons(reps.map((r) => r.reason)),
      note:
        [
          c.subject_name ? `For ${c.subject_name}` : null,
          c.for_whom === "departed" ? "for the reposed" : c.intention,
          c.days ? `${plural(c.days, "day", "days")}${c.ends_on ? `, to ${c.ends_on}` : ""}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      more: null,
      picture: null,
      first: urgent,
      actions: [
        {
          id: "approve",
          label: hidden ? "Show again" : "Approve",
          tone: "primary",
          removal: false,
          calls: [{ url: COMMUNITY, body: { action: "approve_campaign", id: c.id } }],
          done: hidden ? "Shown again. Reports no longer hide it." : "Approved. It is on the board.",
        },
        { id: "remove", label: "Remove campaign", tone: "danger", removal: true, notifies: true, calls: [{ url: COMMUNITY, body: { action: "remove_campaign", id: c.id } }], done: "Removed." },
      ],
    });
  }

  for (const [key, reps] of grouped(src.campaignReports, (r) => campaignKey(r.campaign?.id, r.id))) {
    const c = reps[0].campaign;
    // One that waits has its row above, with these reports in it.
    if (c && waiting.has(c.id)) continue;
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
        ...(!c || gone ? [] : [{ id: "remove", label: "Remove campaign", tone: "danger" as const, removal: true, notifies: true, calls: [{ url: COMMUNITY, body: { action: "remove_campaign", id: c.id } }], done: "Removed." }]),
        { id: "dismiss", label: "Dismiss", tone: "default", removal: false, calls: dismissAll("dismiss_campaign_report", reps.map((r) => r.id)), done: "Dismissed. A record is kept in the moderation log." },
      ],
    });
  }

  // A campaign's pictures (1.9): one row a picture, the reports on it folded
  // in. Its two decisions are the campaigns chat's (lib/campaigns/pictures.ts):
  // clear (approvePicture) and take down (removePictureAsModerator), the
  // second held back ten seconds with Undo like every removal.
  for (const pic of src.waitingPictures ?? []) {
    const n = pic.reports.length;
    // What readers ticked, in the panel's words, or what they wrote.
    const said = pic.reports.map((r) => (r.reason_code ? (PICTURE_REASON_WORDS[r.reason_code] ?? r.reason_code) : r.reason));
    rows.push({
      key: pictureKey(pic.id),
      what: [
        pic.shown ? `Reported · ${plural(n, "report", "reports")}` : n > 0 ? `Hidden by reports · ${plural(n, "report", "reports")}` : "New picture",
        pic.shown ? "a picture readers can see" : "a picture waiting to be cleared",
      ].join(" · "),
      at: pic.created_at,
      who: pic.campaign.creator_name ? { name: pic.campaign.creator_name, handle: null } : null,
      text: `On the campaign "${flat(pic.campaign.title)}"`,
      written: null,
      reasons: tallyReasons(said),
      note:
        [pic.alt ? `Its creator says it shows: ${flat(pic.alt)}` : null, pic.check_result && pic.check_result !== "clear" ? `The check said: ${flat(pic.check_result)}` : null]
          .filter(Boolean)
          .join(" · ") || null,
      more: null,
      picture: pic.url,
      actions: [
        {
          id: "approve",
          label: pic.shown ? "Keep it" : "Clear it",
          tone: "primary",
          removal: false,
          calls: [{ url: COMMUNITY, body: { action: "approve_picture", id: pic.id } }],
          done: pic.shown ? "Kept. Reports no longer hide it." : "Cleared. Readers can see it.",
        },
        {
          id: "remove",
          label: "Take it down",
          tone: "danger",
          removal: true,
          notifies: true,
          calls: [{ url: COMMUNITY, body: { action: "remove_picture", id: pic.id, reason: topReason(said) } }],
          done: "Taken down. Its file is deleted.",
        },
      ],
    });
  }

  // Shared journal pages (1.9, admin A1): one row a page, the reports filed
  // since it was last kept. Its writer is not shown: the public page names
  // nobody (lib/admin/sharedPages.ts).
  for (const p of src.sharedPages ?? []) {
    if (!waitsForDecision(p)) continue;
    const open = openReports(p);
    const reasons = open.map((r) => r.reason);
    rows.push({
      key: sharedKey(p.id),
      what: `Reported · ${plural(open.length, "report", "reports")} · a shared journal page${p.reviewed_at ? " · kept before" : ""}`,
      at: oldest(open.map((r) => r.created_at)),
      who: null,
      text: sharedWords(p),
      written: null,
      reasons: tallyReasons(reasons),
      note: `Shared ${p.created_at.slice(0, 10)}. ${p.reviewed_at ? "Search engines may show it." : "Kept out of search engines until reviewed."}`,
      more: null,
      picture: null,
      actions: [
        {
          id: "hide",
          label: "Hide the page",
          tone: "danger",
          removal: true,
          notifies: true,
          calls: [{ url: SHARED, body: { action: "hide", id: p.id, reason: topReason(reasons) } }],
          done: "Hidden. Its link shows nothing now.",
        },
        {
          id: "keep",
          label: "Keep it",
          tone: "default",
          removal: false,
          calls: [{ url: SHARED, body: { action: "keep", id: p.id } }],
          done: "Kept, and marked reviewed.",
        },
      ],
    });
  }

  // Oldest first, but for what must be read before the rest.
  return rows.sort((a, b) => Number(Boolean(b.first)) - Number(Boolean(a.first)) || (a.at < b.at ? -1 : a.at > b.at ? 1 : a.key.localeCompare(b.key)));
}

/** The keys the queue would make, for the count beside the page's name and on the rail. */
export function waitingKeys(src: QueueSources): string[] {
  return buildQueue(src).map((r) => r.key);
}

/** Seconds left on a removal held for Undo, never below zero. */
export function secondsLeft(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}
