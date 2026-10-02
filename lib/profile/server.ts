import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getBook } from "@/lib/bible/books";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { getSaint } from "@/lib/saints/saints";
import { censorName, handleIsBlocked } from "@/lib/moderation/server";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { STANDING_BADGES, deriveBadges, shownBadges } from "./badges";
import { isClergyRank, type MyClergy } from "./clergy";
import { subscriptionTier, visibleCosmetics, type Cosmetics } from "./cosmetics";
import { earnedBadges } from "./earned";
import { handleBase, handleSeed } from "./handle";
import { nameDay } from "./nameDay";
import { shownLinks, storedLinks } from "./socialLinks";
import {
  chapterRef,
  excerptOf,
  verseRef,
  type MyProfile,
  type ProfilePost,
  type ProfileSettings,
  type PublicProfile,
} from "./publicProfile";

// Assembles a profile from the tables that hold its parts. Service role only:
// profiles is self-select under RLS, and the badges come from tables nobody
// else may read. Every function returns a fixed projection, never a row, so
// the auth uuid and the email cannot ride out by accident.

/**
 * The columns 20261001_profiles_badges.sql added, all present in production.
 * The fallback read, so it must never name a column that may be missing:
 * one absent column fails the whole select and every profile with it.
 */
export const PROFILE_COLS =
  "id, handle, handle_changed_at, display_name, joined_at, bio, status_text, favorite_verse, banner_color, banner_url, theme_primary, theme_accent, avatar_decoration, profile_effect, patron_saint, show_supporter_mark";

/**
 * And the ones 20261002_community_social.sql adds, calendar_reckoning among
 * them (20260527 meant to add it and never reached production).
 */
const PROFILE_COLS_SOCIAL = `${PROFILE_COLS}, calendar_reckoning, parish, prayer_request_at, now_reading, now_reading_at, show_now_reading, profile_private, hide_posts, hide_joined`;

/** And the reader's own uploaded picture, 20261003_profile_pictures.sql. */
const PROFILE_COLS_PICTURE = `${PROFILE_COLS_SOCIAL}, avatar_url`;

/** And links, the new Plus cosmetics and the push switch, 20261005_community_three.sql. */
const PROFILE_COLS_THREE = `${PROFILE_COLS_PICTURE}, social_links, name_color, banner_motion, hidden_badges, push_community`;

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
  // 20261002. Absent before it runs, and read as their defaults.
  calendar_reckoning?: string | null;
  parish?: string | null;
  prayer_request_at?: string | null;
  now_reading?: string | null;
  now_reading_at?: string | null;
  show_now_reading?: boolean | null;
  profile_private?: boolean | null;
  hide_posts?: boolean | null;
  hide_joined?: boolean | null;
  // 20261003. The reader's own upload; null means the sign-in's picture.
  avatar_url?: string | null;
  // 20261005.
  social_links?: unknown;
  name_color?: string | null;
  banner_motion?: string | null;
  hidden_badges?: string[] | null;
  push_community?: boolean | null;
};

/** How long "now reading" stays on a profile after the last chapter opened. */
export const NOW_READING_MS = 3 * 60 * 60 * 1000;
/** How long a "pray for me" stays up before it lapses on its own. */
export const PRAYER_REQUEST_MS = 14 * 24 * 60 * 60 * 1000;

/** "unavailable" when 20261001_profiles_badges.sql has not been applied yet. */
export async function loadProfileRow(
  admin: SupabaseClient,
  by: { handle: string } | { id: string },
): Promise<ProfileRow | null | "unavailable"> {
  const read = (cols: string) => {
    const query = admin.from("profiles").select(cols);
    return ("handle" in by ? query.eq("handle", by.handle) : query.eq("id", by.id)).maybeSingle();
  };
  // Newest columns first, each older set the fallback while a migration is
  // not yet applied, so a missing column costs that feature and not the profile.
  let { data, error } = await read(PROFILE_COLS_THREE);
  if (error && isColumnAbsent(error)) ({ data, error } = await read(PROFILE_COLS_PICTURE));
  if (error && isColumnAbsent(error)) ({ data, error } = await read(PROFILE_COLS_SOCIAL));
  if (error && isColumnAbsent(error)) ({ data, error } = await read(PROFILE_COLS));
  if (error) {
    if (isColumnAbsent(error)) return "unavailable";
    console.warn("[profile] read failed", error.message);
    return null;
  }
  return (data as unknown as ProfileRow | null) ?? null;
}

export function savedCosmetics(row: ProfileRow): Cosmetics {
  return {
    bannerColor: row.banner_color,
    bannerUrl: row.banner_url,
    themePrimary: row.theme_primary,
    themeAccent: row.theme_accent,
    decoration: row.avatar_decoration,
    effect: row.profile_effect,
    nameColor: row.name_color ?? null,
    bannerMotion: row.banner_motion ?? null,
  };
}

export function profileSettings(row: ProfileRow, now: number = Date.now()): ProfileSettings {
  return {
    parish: row.parish ?? null,
    private: row.profile_private === true,
    hidePosts: row.hide_posts === true,
    hideJoined: row.hide_joined === true,
    showNowReading: row.show_now_reading === true,
    prayerRequest: activePrayerRequest(row, now) !== null,
    calendar: row.calendar_reckoning === "old" ? "old" : "new",
    pushCommunity: row.push_community !== false,
  };
}

/** The live "pray for me" request's start, or null when none or lapsed. */
export function activePrayerRequest(row: Pick<ProfileRow, "prayer_request_at">, now: number = Date.now()): string | null {
  if (!row.prayer_request_at) return null;
  const at = new Date(row.prayer_request_at).getTime();
  return Number.isFinite(at) && now - at < PRAYER_REQUEST_MS ? row.prayer_request_at : null;
}

/** The name and picture a reader goes by in Community, the same as on their posts. */
export async function identity(
  admin: SupabaseClient,
  row: Pick<ProfileRow, "id" | "display_name" | "avatar_url">,
): Promise<{ name: string; avatar: string | null }> {
  const { data } = await admin.auth.admin.getUserById(row.id);
  const meta = (data?.user?.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
  const name =
    (meta.display_name ?? "").trim() ||
    (row.display_name ?? "").trim() ||
    (data?.user?.email ? data.user.email.split("@")[0] : "") ||
    "Reader";
  // The reader's own upload first: metadata's avatar_url is rewritten from
  // Google at every Google sign-in, so it is only the fallback. A listed word
  // in a name is masked wherever others see it (lib/moderation).
  return { name: (await censorName(admin, name)).slice(0, 80), avatar: avatarSrc(row.avatar_url || meta.avatar_url || null) };
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

/** How many have answered a count-shaped table, or 0 before it exists. */
async function countOf(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  const { count, error } = await query;
  return error ? 0 : (count ?? 0);
}

/**
 * The whole profile. `subscribed` is the paid state, whatever the reader
 * shows; `profile.tier` is what they show (Settings can hide the mark).
 */
export async function buildProfile(
  admin: SupabaseClient,
  row: ProfileRow,
  opts: { posts: boolean; now?: Date } = { posts: true },
): Promise<{
  profile: PublicProfile;
  saved: Cosmetics;
  subscribed: boolean;
  /** Every badge, before the reader's own choice of which to show. */
  allBadges: ReturnType<typeof deriveBadges>;
  clergyRow: ClergyRow | null;
}> {
  const now = opts.now ?? new Date();
  const saint = row.patron_saint ? getSaint(row.patron_saint) : null;
  const day = saint ? nameDay(saint.feastDays, row.calendar_reckoning, now) : null;
  const request = activePrayerRequest(row, now.getTime());
  const isPrivate = row.profile_private === true;

  const [who, ent, verification, clergyRow, ambassador, granted, posts, earned, greetings, prayers] = await Promise.all([
    identity(admin, row),
    admin.from("entitlements").select("plus_until, pro_until").eq("user_id", row.id).maybeSingle(),
    admin.from("user_verification").select("status").eq("user_id", row.id).maybeSingle(),
    // 20261005. Before it the table is absent and nobody is clergy here.
    admin
      .from("clergy_verifications")
      .select("status, rank, jurisdiction, parish, decided_at, note")
      .eq("user_id", row.id)
      .maybeSingle(),
    admin.from("ambassadors").select("status").eq("user_id", row.id).maybeSingle(),
    admin.from("user_badges").select("badge, granted_at").eq("user_id", row.id),
    opts.posts && !isPrivate && row.hide_posts !== true ? recentPosts(admin, row.id) : Promise.resolve([] as ProfilePost[]),
    earnedBadges(admin, row.id, now).catch(() => []),
    day?.today
      ? countOf(
          admin
            .from("name_day_greetings")
            .select("sender_id", { count: "exact", head: true })
            .eq("recipient_id", row.id)
            .eq("year", day.year),
        )
      : Promise.resolve(0),
    request
      ? countOf(
          admin
            .from("profile_prayers")
            .select("prayer_id", { count: "exact", head: true })
            .eq("owner_id", row.id)
            .eq("request_at", request),
        )
      : Promise.resolve(0),
  ]);

  const paid = subscriptionTier(ent.data as { plus_until?: string | null; pro_until?: string | null } | null);
  const shown = row.show_supporter_mark === false ? null : paid;
  const verified = (verification.data as { status?: string } | null)?.status === "verified";
  const clergyData = (clergyRow.error ? null : clergyRow.data) as ClergyRow | null;
  const isClergy = clergyData?.status === "verified";
  const isAmbassador = (ambassador.data as { status?: string } | null)?.status === "active";
  const saved = savedCosmetics(row);
  const badges = deriveBadges({
    joinedAt: row.joined_at,
    tier: shown,
    verified,
    clergy: isClergy ? { since: clergyData?.decided_at ?? null } : null,
    ambassador: isAmbassador,
    // user_badges arrives with this release's migration; before it, no grants.
    granted: (granted.error ? [] : (granted.data ?? [])) as { badge: string; granted_at: string | null }[],
    earned,
  });
  const reading =
    row.show_now_reading === true && row.now_reading_at && now.getTime() - new Date(row.now_reading_at).getTime() < NOW_READING_MS
      ? chapterRef(row.now_reading, (slug) => getBook(slug)?.name ?? null)
      : null;

  const profile: PublicProfile = {
    handle: row.handle ?? "",
    name: who.name,
    avatar: who.avatar,
    verified,
    tier: shown,
    joinedAt: row.hide_joined === true || isPrivate ? null : row.joined_at,
    bio: isPrivate ? null : row.bio,
    status: isPrivate ? null : row.status_text,
    patronSaint: !isPrivate && saint ? { slug: saint.slug, name: saint.name } : null,
    favoriteVerse: isPrivate ? null : verseRef(row.favorite_verse, (slug) => getBook(slug)?.name ?? null),
    cosmetics: visibleCosmetics(saved, paid !== null),
    // A private profile keeps the badges that say who someone is to the
    // community (team, moderator, clergy, verified), and nothing else. A
    // Plus reader may keep others off it; the standing ones always show.
    badges: isPrivate
      ? badges.filter((b) => STANDING_BADGES.includes(b.id))
      : shownBadges(badges, row.hidden_badges, paid !== null),
    posts,
    parish: isPrivate ? null : (row.parish ?? null),
    private: isPrivate,
    postsHidden: isPrivate || row.hide_posts === true,
    nameDay: !isPrivate && day?.today && saint ? { saint: saint.name, year: day.year, greetings } : null,
    prayerRequest: !isPrivate && request ? { since: request, count: prayers } : null,
    nowReading: !isPrivate && reading && row.now_reading_at ? { ...reading, at: row.now_reading_at } : null,
    // The seal is standing, so a private profile keeps its rank; where they
    // serve is the reader's own business on a private one.
    clergy: isClergy
      ? {
          rank: isClergyRank(clergyData?.rank) ? clergyData.rank : null,
          jurisdiction: isPrivate ? null : (clergyData?.jurisdiction ?? null),
          parish: isPrivate ? null : (clergyData?.parish ?? null),
        }
      : null,
    links: isPrivate ? [] : shownLinks(row.social_links),
  };
  return { profile, saved, subscribed: paid !== null, allBadges: badges, clergyRow: clergyData };
}

type ClergyRow = {
  status: string;
  rank: string | null;
  jurisdiction: string | null;
  parish: string | null;
  decided_at: string | null;
  note: string | null;
};

function myClergy(row: ClergyRow | null): MyClergy {
  if (!row) return { status: "none", rank: null, jurisdiction: null, parish: null, note: null };
  const status = row.status === "verified" || row.status === "declined" || row.status === "requested" ? row.status : "none";
  return {
    status,
    rank: isClergyRank(row.rank) ? row.rank : null,
    jurisdiction: row.jurisdiction,
    parish: row.parish,
    note: status === "declined" ? row.note : null,
  };
}

export async function buildMyProfile(admin: SupabaseClient, row: ProfileRow): Promise<MyProfile> {
  const now = new Date();
  // Your own card, as others see it, except that you see all of it even
  // while it is private: the preview has to show what you are hiding.
  const built = await buildProfile(admin, { ...row, profile_private: false }, { posts: true, now });
  const saint = row.patron_saint ? getSaint(row.patron_saint) : null;
  const next = saint ? nameDay(saint.feastDays, row.calendar_reckoning, now) : null;
  return {
    ...built.profile,
    private: row.profile_private === true,
    saved: built.saved,
    subscribed: built.subscribed,
    handleChangedAt: row.handle_changed_at,
    settings: profileSettings(row, now.getTime()),
    nextNameDay: next && saint ? { date: next.date, saint: saint.name, today: next.today } : null,
    allBadges: built.allBadges,
    hiddenBadges: Array.isArray(row.hidden_badges) ? row.hidden_badges : [],
    socialLinks: storedLinks(row.social_links),
    clergyRequest: myClergy(built.clergyRow),
  };
}

/**
 * Give a profile a handle when it has none: the sign-up trigger gives up
 * quietly rather than ever failing a sign-up, so the first read fills the gap.
 */
/** A plain new handle for a reader whose own carries a word on the filter. */
export async function resetToPlainHandle(admin: SupabaseClient, id: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { error } = await admin
      .from("profiles")
      .update({ handle: `reader${Math.floor(100000 + Math.random() * 900000)}`, handle_changed_at: new Date().toISOString() })
      .eq("id", id);
    if (!error || error.code !== "23505") return;
  }
}

/**
 * A reader's handle, kept off the word filter. A handle made from a display
 * name before the filter existed, or one the team's list has since learned,
 * is swapped for a plain one the next time the reader posts or opens their
 * profile, before anyone else sees it on a new post.
 */
export async function ensureCleanHandle(admin: SupabaseClient, id: string): Promise<void> {
  const { data } = await admin.from("profiles").select("handle").eq("id", id).maybeSingle();
  const handle = (data as { handle?: string | null } | null)?.handle;
  if (handle && (await handleIsBlocked(admin, handle))) await resetToPlainHandle(admin, id);
}

export async function ensureHandle(
  admin: SupabaseClient,
  row: ProfileRow,
  chosenName: string | null,
  email: string | null,
): Promise<ProfileRow> {
  if (row.handle) {
    if (!(await handleIsBlocked(admin, row.handle))) return row;
    await resetToPlainHandle(admin, row.id);
    const cleaned = await loadProfileRow(admin, { id: row.id });
    return cleaned && cleaned !== "unavailable" ? cleaned : row;
  }
  const seeded = handleBase(handleSeed(row.display_name, chosenName, email));
  // A name with a listed word in it seeds nothing: the reader starts plain.
  const base = seeded !== "reader" && (await handleIsBlocked(admin, seeded)) ? "reader" : seeded;
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
      .select("id")
      .maybeSingle();
    if (!error && data) break;
    if (error && error.code !== "23505") break;
  }
  const fresh = await loadProfileRow(admin, { id: row.id });
  return fresh && fresh !== "unavailable" ? fresh : row;
}

/** A profile's id by @handle, for the routes that act on one. */
export async function profileIdByHandle(admin: SupabaseClient, handle: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("id").eq("handle", handle).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
