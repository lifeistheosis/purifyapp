// Shared shapes for Community conversations. Pure data, importable from
// route handlers and client components alike (same discipline as
// lib/campaigns/campaigns.ts).

export type CommunityPostKind = "discussion" | "scripture" | "father";

/** Public shape of a community_posts row, snake_case mirroring the columns. */
export type CommunityPost = {
  id: string;
  // No `user_id`. The feed is public and cached, so it must not carry the
  // Supabase auth uuid (also the RevenueCat appUserID and the avatar storage
  // path segment). Ownership comes from GET /api/community/mine instead.
  kind: CommunityPostKind;
  title: string | null;
  body: string | null;
  quote_text: string | null;
  quote_source: string | null;
  quote_href: string | null;
  author_name: string;
  author_avatar: string | null;
  reply_count: number;
  like_count: number;
  dislike_count: number;
  created_at: string;
};

export type CommunityReply = {
  id: string;
  post_id: string;
  body: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
};

/**
 * Message keys for each post kind, not the English words.
 *
 * These used to be literal strings rendered straight into the feed, so the
 * kind label stayed English in all 21 locales while everything around it
 * translated. Keys keep the mapping here and let the caller resolve it
 * through `useTranslate`.
 */
export const POST_KIND_KEYS: Record<CommunityPostKind, string> = {
  discussion: "community.kindDiscussion",
  scripture: "community.kindScripture",
  father: "community.kindFather",
};

/** Short relative timestamp for feed rows ("just now", "3h", "2d"). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}
