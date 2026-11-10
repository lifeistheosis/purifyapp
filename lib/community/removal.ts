// The notice that tells a reader why something they posted was removed.
//
// His yes of 2026-11-10 to the Terms for what readers post: "When we remove
// something you posted, we tell you why, unless the law or someone's safety
// stops us." Europe's Digital Services Act asks for that reason too. So a
// moderator's removal writes one row into the reader's own inbox
// (community_notifications), with what was removed and a reason from a fixed
// list. The reasons and the words were approved with the Terms
// (docs/1.9-build/drafts/terms-posts.md and the arbiter's relay of his yes).
//
// No push: a removal is said in the inbox, not on a lock screen.
//
// Best effort, like every notice: a removal never waits on its notice. Before
// docs/1.9-build/sql/removal-notices.sql has run, the table refuses the row
// (no such kind, no such columns), and that is logged once and passed over.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Why, in the order the moderator's list offers them. */
export const REMOVAL_REASONS = ["unkind", "consent", "private", "not_theirs", "spam", "unlawful", "rules"] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number];

/** Said when a moderator chose none (the moderators' page before its list). */
export const DEFAULT_REMOVAL_REASON: RemovalReason = "rules";

/** What was removed. */
export const REMOVAL_TARGETS = ["post", "reply", "campaign", "picture", "comment", "shared_page"] as const;
export type RemovalTarget = (typeof REMOVAL_TARGETS)[number];

/** The moderator's list, in the panel's words (the panel is English). */
export const REMOVAL_REASON_WORDS: Readonly<Record<RemovalReason, string>> = {
  unkind: "Unkind or hateful toward a person or a group",
  consent: "Names or shows someone without their agreement",
  private: "Private details about another person",
  not_theirs: "A picture or words not theirs to share",
  spam: "Advertising or spam",
  unlawful: "Unlawful",
  rules: "Against the house rules in another way",
};

/** The reader's notice, in their language (lib/i18n/messages): the line, by what was removed. */
export const REMOVED_YOUR_KEY: Readonly<Record<RemovalTarget, string>> = {
  post: "community.removedYour.post",
  reply: "community.removedYour.reply",
  campaign: "community.removedYour.campaign",
  picture: "community.removedYour.picture",
  comment: "community.removedYour.comment",
  shared_page: "community.removedYour.sharedPage",
};

/** The reason, as the reader's notice says it. */
export const REMOVED_WHY_KEY: Readonly<Record<RemovalReason, string>> = {
  unkind: "community.removedWhy.unkind",
  consent: "community.removedWhy.consent",
  private: "community.removedWhy.private",
  not_theirs: "community.removedWhy.notTheirs",
  spam: "community.removedWhy.spam",
  unlawful: "community.removedWhy.unlawful",
  rules: "community.removedWhy.rules",
};

/** The line under it: where to write if they think we got it wrong. */
export const REMOVED_APPEAL_KEY = "community.removedAppeal";

export function isRemovalReason(v: unknown): v is RemovalReason {
  return typeof v === "string" && (REMOVAL_REASONS as readonly string[]).includes(v);
}

export function isRemovalTarget(v: unknown): v is RemovalTarget {
  return typeof v === "string" && (REMOVAL_TARGETS as readonly string[]).includes(v);
}

/** The row a removal writes. Pure, so the tests can read it. */
export function removalNoticeRow(n: {
  userId: string;
  target: RemovalTarget;
  reason?: RemovalReason | null;
  postId?: string | null;
  replyId?: string | null;
  excerpt?: string | null;
}) {
  const words = (n.excerpt ?? "").replace(/\s+/g, " ").trim();
  return {
    user_id: n.userId,
    kind: "removed" as const,
    target_kind: n.target,
    reason: n.reason && isRemovalReason(n.reason) ? n.reason : DEFAULT_REMOVAL_REASON,
    post_id: n.postId ?? null,
    reply_id: n.replyId ?? null,
    actor_name: "Purify",
    excerpt: words ? (words.length > 140 ? `${words.slice(0, 139).trimEnd()}…` : words) : null,
  };
}

let warned = false;

/** Write the notice. Never throws, and never fails the removal that asked for it. */
export async function writeRemovalNotice(admin: SupabaseClient, n: Parameters<typeof removalNoticeRow>[0]): Promise<void> {
  if (!n.userId) return;
  try {
    const { error } = await admin.from("community_notifications").insert(removalNoticeRow(n));
    if (error && !warned) {
      warned = true;
      console.warn("[community] removal notice not written (is docs/1.9-build/sql/removal-notices.sql applied?)", error.message);
    }
  } catch (e) {
    if (!warned) {
      warned = true;
      console.warn("[community] removal notice not written", e instanceof Error ? e.message : String(e));
    }
  }
}
