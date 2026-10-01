import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getBook } from "@/lib/bible/books";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { getSaint } from "@/lib/saints/saints";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { deriveBadges } from "./badges";
import { subscriptionTier, visibleCosmetics, type Cosmetics } from "./cosmetics";
import { handleBase, handleSeed } from "./handle";
import { excerptOf, verseRef, type MyProfile, type ProfilePost, type PublicProfile } from "./publicProfile";

// Assembles a profile from the tables that hold its parts. Service role only:
// profiles is self-select under RLS, and the badges come from tables nobody
// else may read. Every function returns a fixed projection, never a row, so
// the auth uuid and the email cannot ride out by accident.

export const PROFILE_COLS =
  "id, handle, handle_changed_at, display_name, joined_at, bio, status_text, favorite_verse, banner_color, banner_url, theme_primary, theme_accent, avatar_decoration, profile_effect, patron_saint, show_supporter_mark";

export type ProfileRow = {
  id: string;
  handle: string | null;
  handle_changed_at: string | null;
  display_name: string | null;
  joined_at: string | null;
  bio: string | null;
  status_text: string | null;
  favorite_verse: string | null;
  banner_color: string | null;
  banner_url: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  avatar_decoration: string | null;
  profile_effect: string | null;
  patron_saint: string | null;
  show_supporter_mark: boolean | null;
};

/** "unavailable" when 20261001_profiles_badges.sql has not been applied yet. */
export async function loadProfileRow(
  admin: SupabaseClient,
  by: { handle: string } | { id: string },
): Promise<ProfileRow | null | "unavailable"> {
  const query = admin.from("profiles").select(PROFILE_COLS);
  const { data, error } = await ("handle" in by ? query.eq("handle", by.handle) : query.eq("id", by.id)).maybeSingle();
  if (error) {
    if (isColumnAbsent(error)) return "unavailable";
    console.warn("[profile] read failed", error.message);
    return null;
  }
  return (data as ProfileRow | null) ?? null;
}

export function savedCosmetics(row: ProfileRow): Cosmetics {
  return {
    bannerColor: row.banner_color,
    bannerUrl: row.banner_url,
    themePrimary: row.theme_primary,
    themeAccent: row.theme_accent,
    decoration: row.avatar_decoration,
    effect: row.profile_effect,
  };
}

/** The name and picture a reader posts under: their account metadata, as posts snapshot it. */
/** The name and picture a reader goes by in Community, the same as on their posts. */
export async function identity(
  admin: SupabaseClient,
  row: Pick<ProfileRow, "id" | "display_name">,
): Promise<{ name: string; avatar: string | null }> {
  const { data } = await admin.auth.admin.getUserById(row.id);
  const meta = (data?.user?.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
  const name =
    (meta.display_name ?? "").trim() ||
    (row.display_name ?? "").trim() ||
    (data?.user?.email ? data.user.email.split("@")[0] : "") ||
    "Reader";
  return { name: name.slice(0, 80), avatar: avatarSrc(meta.avatar_url ?? null) };
}

async function recentPosts(admin: SupabaseClient, id: string): Promise<ProfilePost[]> {
  const { data, error } = await admin
    .from("community_posts")
    .select("id, kind, title, body, quote_text, quote_source, created_at, like_count, reply_count")
    .eq("user_id", id)
    .eq("status", "visible")
    // Group threads are for their members, never a public profile.
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    console.warn("[profile] posts read failed", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    kind: r.kind as ProfilePost["kind"],
    title: (r.title as string | null) ?? null,
    excerpt: excerptOf((r.body as string | null) || (r.quote_text as string | null)),
    quoteSource: (r.quote_source as string | null) ?? null,
    createdAt: String(r.created_at),
    likes: typeof r.like_count === "number" ? r.like_count : 0,
    replies: typeof r.reply_count === "number" ? r.reply_count : 0,
  }));
}

/**
 * The whole profile. `subscribed` is the paid state, whatever the reader
 * shows; `profile.tier` is what they show (Settings can hide the mark).
 */
export async function buildProfile(
  admin: SupabaseClient,
  row: ProfileRow,
  opts: { posts: boolean } = { posts: true },
): Promise<{ profile: PublicProfile; saved: Cosmetics; subscribed: boolean }> {
  const [who, ent, verification, ambassador, granted, posts] = await Promise.all([
    identity(admin, row),
    admin.from("entitlements").select("plus_until, pro_until").eq("user_id", row.id).maybeSingle(),
    admin.from("user_verification").select("status").eq("user_id", row.id).maybeSingle(),
    admin.from("ambassadors").select("status").eq("user_id", row.id).maybeSingle(),
    admin.from("user_badges").select("badge, granted_at").eq("user_id", row.id),
    opts.posts ? recentPosts(admin, row.id) : Promise.resolve([] as ProfilePost[]),
  ]);

  const paid = subscriptionTier(ent.data as { plus_until?: string | null; pro_until?: string | null } | null);
  const shown = row.show_supporter_mark === false ? null : paid;
  const verified = (verification.data as { status?: string } | null)?.status === "verified";
  const isAmbassador = (ambassador.data as { status?: string } | null)?.status === "active";
  const saved = savedCosmetics(row);
  const saint = row.patron_saint ? getSaint(row.patron_saint) : null;

  const profile: PublicProfile = {
    handle: row.handle ?? "",
    name: who.name,
    avatar: who.avatar,
    verified,
    tier: shown,
    joinedAt: row.joined_at,
    bio: row.bio,
    status: row.status_text,
    patronSaint: saint ? { slug: saint.slug, name: saint.name } : null,
    favoriteVerse: verseRef(row.favorite_verse, (slug) => getBook(slug)?.name ?? null),
    cosmetics: visibleCosmetics(saved, paid !== null),
    badges: deriveBadges({
      joinedAt: row.joined_at,
      tier: shown,
      verified,
      ambassador: isAmbassador,
      // user_badges arrives with this release's migration; before it, no grants.
      granted: (granted.error ? [] : (granted.data ?? [])) as { badge: string; granted_at: string | null }[],
    }),
    posts,
  };
  return { profile, saved, subscribed: paid !== null };
}

export async function buildMyProfile(admin: SupabaseClient, row: ProfileRow): Promise<MyProfile> {
  const built = await buildProfile(admin, row, { posts: true });
  return {
    ...built.profile,
    saved: built.saved,
    subscribed: built.subscribed,
    handleChangedAt: row.handle_changed_at,
  };
}

/**
 * Give a profile a handle when it has none: the sign-up trigger gives up
 * quietly rather than ever failing a sign-up, so the first read fills the gap.
 */
export async function ensureHandle(
  admin: SupabaseClient,
  row: ProfileRow,
  chosenName: string | null,
  email: string | null,
): Promise<ProfileRow> {
  if (row.handle) return row;
  const base = handleBase(handleSeed(row.display_name, chosenName, email));
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0 && base !== "reader"
        ? base
        : `${base.slice(0, 16)}${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await admin
      .from("profiles")
      .update({ handle: candidate })
      .eq("id", row.id)
      .is("handle", null)
      .select(PROFILE_COLS)
      .maybeSingle();
    if (!error && data) return data as ProfileRow;
    if (error && error.code !== "23505") break;
  }
  const fresh = await loadProfileRow(admin, { id: row.id });
  return fresh && fresh !== "unavailable" ? fresh : row;
}
