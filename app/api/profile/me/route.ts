import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminEmail } from "@/lib/admin/access";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { getBook } from "@/lib/bible/books";
import { STANDING_BADGES, isBadgeId } from "@/lib/profile/badges";
import { inSeason, isBannerMotion, isDecoration, isEffect, isNameColor, normalizeHex, subscriptionTier } from "@/lib/profile/cosmetics";
import { cleanSocialLinks } from "@/lib/profile/socialLinks";
import { getBlockedHosts, handleIsBlocked, textHasListedWord } from "@/lib/moderation/server";
import { handleChangeAllowed, handleProblem, normalizeHandle } from "@/lib/profile/handle";
import { verseRef } from "@/lib/profile/publicProfile";
import { activePrayerRequest, buildMyProfile, ensureHandle, loadProfileRow } from "@/lib/profile/server";
import { getSaint } from "@/lib/saints/saints";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in reader's own profile: GET for the editor, PUT to save.
 *
 * Everything is checked here, not in the editor: the handle's shape,
 * reservation, uniqueness and cooldown; the verse and the saint against
 * Purify's own library; and the Plus line. A Plus cosmetic is saved only
 * with an active Plus or Pro subscription, judged from the live dates
 * (lib/profile/cosmetics.ts subscriptionTier), never from the pre-launch
 * open gate, the same rule as Pro's free shipping. Clearing one is always
 * allowed, so a lapsed reader can still tidy up.
 *
 * The banner picture has its own route (../banner), because it is a file.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const schema = z
  .object({
    handle: z.string().max(40).optional(),
    bio: z.string().max(400).nullable().optional(),
    status: z.string().max(120).nullable().optional(),
    favoriteVerse: z.string().max(60).nullable().optional(),
    patronSaint: z.string().max(100).nullable().optional(),
    bannerColor: hex.nullable().optional(),
    // Set by the upload route only; here it can only be cleared.
    bannerUrl: z.null().optional(),
    themePrimary: hex.nullable().optional(),
    themeAccent: hex.nullable().optional(),
    decoration: z.string().max(40).nullable().optional(),
    effect: z.string().max(40).nullable().optional(),
    // 20261002_community_social.sql
    parish: z.string().max(160).nullable().optional(),
    private: z.boolean().optional(),
    hidePosts: z.boolean().optional(),
    hideJoined: z.boolean().optional(),
    showNowReading: z.boolean().optional(),
    prayerRequest: z.boolean().optional(),
    // The device's calendar, synced so a name day falls on the reader's own.
    calendar: z.enum(["new", "old"]).optional(),
    // 20261005_community_three.sql
    socialLinks: z.array(z.object({ k: z.string().max(20), v: z.string().max(220) })).max(8).optional(),
    nameColor: z.string().max(40).nullable().optional(),
    bannerMotion: z.string().max(40).nullable().optional(),
    hiddenBadges: z.array(z.string().max(40)).max(20).optional(),
    pushCommunity: z.boolean().optional(),
    // 20261006_streaks.sql
    showStreak: z.boolean().optional(),
  })
  .strict();

/** Trimmed, blank as null, runs of blank lines kept to one, cut to `max`. */
function cleanText(v: string | null | undefined, max: number): string | null {
  if (v == null) return null;
  const s = v
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s ? s.slice(0, max) : null;
}

/**
 * A verse reference in its stored spelling ("john/3/16"), or null when the
 * book is not in Purify's Bible or the chapter is past its end. The verse is
 * held to 176, the longest psalm, because the verse count of every chapter
 * is not something this route has to hand.
 */
function favoriteVerse(ref: string): string | null {
  const m = /^([a-z0-9-]{1,40})\/(\d{1,3})\/(\d{1,3})$/.exec(ref);
  if (!m) return null;
  const book = getBook(m[1]);
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  if (!book || chapter < 1 || chapter > book.chapters || verse < 1 || verse > 176) return null;
  const stored = `${book.slug}/${chapter}/${verse}`;
  return verseRef(stored, () => book.name) ? stored : null;
}

async function signedIn(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function handleGET(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { id: user.id });
  if (row === "unavailable") {
    return NextResponse.json({ error: "Profiles are not open yet.", code: "unavailable" }, { status: 404 });
  }
  if (!row) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const meta = (user.user_metadata ?? {}) as { display_name?: string };
  const withHandle = await ensureHandle(admin, row, meta.display_name ?? null, user.email ?? null);
  return NextResponse.json(
    { profile: await buildMyProfile(admin, withHandle) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function handlePUT(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`profile-save:${user.id}`, 60, 30)) {
    return NextResponse.json({ error: "Saving quickly. Give it a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Some of that could not be saved.", code: "invalid" }, { status: 400 });
  }
  const p = parsed.data;

  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { id: user.id });
  if (row === "unavailable") {
    return NextResponse.json({ error: "Profiles are not open yet.", code: "unavailable" }, { status: 404 });
  }
  if (!row) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  // Words on the community filter (lib/moderation) have no place on a profile:
  // refused here rather than masked, since nobody reviews a profile line.
  if (await textHasListedWord(admin, p.bio, p.status, p.parish, ...(p.socialLinks ?? []).map((l) => l.v))) {
    return NextResponse.json({ error: "Some words here aren't allowed on a profile.", code: "filtered" }, { status: 400 });
  }

  const patch: Record<string, string | boolean | null | string[] | { k: string; v: string }[]> = {};

  // Links elsewhere: a network and a username, built into an address only
  // here, or a website that is not on the blocked list (lib/profile/socialLinks.ts).
  if (p.socialLinks !== undefined) {
    const checked = cleanSocialLinks(p.socialLinks, await getBlockedHosts(admin));
    if (!checked.ok) {
      return NextResponse.json(
        { error: "One of those links can't be used.", code: `links_${checked.problem}`, index: checked.index },
        { status: 400 },
      );
    }
    patch.social_links = checked.links;
  }
  if (p.pushCommunity !== undefined) patch.push_community = p.pushCommunity;
  if (p.showStreak !== undefined) patch.show_streak = p.showStreak;

  if (p.handle !== undefined) {
    const handle = normalizeHandle(p.handle);
    if (handle !== row.handle) {
      // The team may take a reserved name (@purify, @support) for an
      // official account; nobody else may.
      const problem = handleProblem(handle);
      if (problem && !(problem === "reserved" && isAdminEmail(user.email))) {
        return NextResponse.json({ error: "That handle cannot be used.", code: `handle_${problem}` }, { status: 400 });
      }
      // Slurs and NSFW words, however spelled, are not anyone's handle.
      if (await handleIsBlocked(admin, handle)) {
        return NextResponse.json({ error: "That handle isn't available.", code: "handle_unavailable" }, { status: 400 });
      }
      if (!handleChangeAllowed(row.handle_changed_at)) {
        return NextResponse.json(
          { error: "You changed your handle recently. Try again in an hour.", code: "handle_cooldown" },
          { status: 429 },
        );
      }
      patch.handle = handle;
      patch.handle_changed_at = new Date().toISOString();
    }
  }

  if (p.bio !== undefined) patch.bio = cleanText(p.bio, 190);
  if (p.parish !== undefined) patch.parish = cleanText(p.parish, 80)?.replace(/\n/g, " ") ?? null;
  if (p.private !== undefined) patch.profile_private = p.private;
  if (p.hidePosts !== undefined) patch.hide_posts = p.hidePosts;
  if (p.hideJoined !== undefined) patch.hide_joined = p.hideJoined;
  if (p.showNowReading !== undefined) {
    patch.show_now_reading = p.showNowReading;
    // Turning it off takes the line down at once, not when it lapses.
    if (!p.showNowReading) {
      patch.now_reading = null;
      patch.now_reading_at = null;
    }
  }
  if (p.prayerRequest !== undefined) {
    // Asking again starts a fresh count; leaving it on keeps the one running.
    if (!p.prayerRequest) patch.prayer_request_at = null;
    else if (!activePrayerRequest(row)) patch.prayer_request_at = new Date().toISOString();
  }
  if (p.status !== undefined) patch.status_text = cleanText(p.status, 60)?.replace(/\n/g, " ") ?? null;
  if (p.calendar !== undefined) patch.calendar_reckoning = p.calendar;

  if (p.favoriteVerse !== undefined) {
    if (p.favoriteVerse === null || p.favoriteVerse === "") {
      patch.favorite_verse = null;
    } else {
      const verse = favoriteVerse(p.favoriteVerse);
      if (!verse) {
        return NextResponse.json({ error: "That verse could not be found.", code: "verse" }, { status: 400 });
      }
      patch.favorite_verse = verse;
    }
  }

  if (p.patronSaint !== undefined) {
    if (p.patronSaint === null || p.patronSaint === "") patch.patron_saint = null;
    else if (getSaint(p.patronSaint)) patch.patron_saint = p.patronSaint;
    else return NextResponse.json({ error: "That saint is not in Purify.", code: "saint" }, { status: 400 });
  }

  if (p.bannerColor !== undefined) patch.banner_color = p.bannerColor === null ? null : normalizeHex(p.bannerColor);
  if (p.bannerUrl === null) patch.banner_url = null;

  // The Plus line. Setting needs a live subscription; clearing never does.
  const plusSets: Record<string, string | null> = {};
  if (p.themePrimary !== undefined) plusSets.theme_primary = p.themePrimary === null ? null : normalizeHex(p.themePrimary);
  if (p.themeAccent !== undefined) plusSets.theme_accent = p.themeAccent === null ? null : normalizeHex(p.themeAccent);
  if (p.decoration !== undefined) {
    if (p.decoration !== null && !isDecoration(p.decoration)) {
      return NextResponse.json({ error: "Unknown frame.", code: "decoration" }, { status: 400 });
    }
    // A seasonal frame is put on only in its season; one already on stays.
    if (p.decoration !== row.avatar_decoration && !inSeason(p.decoration)) {
      return NextResponse.json({ error: "That frame comes back in its season.", code: "out_of_season" }, { status: 409 });
    }
    plusSets.avatar_decoration = p.decoration;
  }
  if (p.effect !== undefined) {
    if (p.effect !== null && !isEffect(p.effect)) {
      return NextResponse.json({ error: "Unknown effect.", code: "effect" }, { status: 400 });
    }
    if (p.effect !== row.profile_effect && !inSeason(p.effect)) {
      return NextResponse.json({ error: "That effect comes back in its season.", code: "out_of_season" }, { status: 409 });
    }
    plusSets.profile_effect = p.effect;
  }
  if (p.nameColor !== undefined) {
    if (p.nameColor !== null && !isNameColor(p.nameColor)) {
      return NextResponse.json({ error: "Unknown name colour.", code: "name_color" }, { status: 400 });
    }
    plusSets.name_color = p.nameColor;
  }
  if (p.bannerMotion !== undefined) {
    if (p.bannerMotion !== null && !isBannerMotion(p.bannerMotion)) {
      return NextResponse.json({ error: "Unknown banner.", code: "banner_motion" }, { status: 400 });
    }
    plusSets.banner_motion = p.bannerMotion;
  }
  // Which badges stay off the profile. The standing ones (team, moderator,
  // clergy, verified) are never hidden, so they are dropped from the list
  // rather than refused. An empty list is clearing, which needs no Plus.
  let hidden: string[] | undefined;
  if (p.hiddenBadges !== undefined) {
    hidden = [...new Set(p.hiddenBadges.filter((b) => isBadgeId(b) && !STANDING_BADGES.includes(b)))];
  }
  if (Object.values(plusSets).some((v) => v !== null) || (hidden && hidden.length > 0)) {
    const { data: ent } = await admin
      .from("entitlements")
      .select("plus_until, pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!subscriptionTier(ent as { plus_until?: string | null; pro_until?: string | null } | null)) {
      return NextResponse.json(
        { error: "Frames, effects and themes come with Purify Plus.", code: "plus_required" },
        { status: 403 },
      );
    }
  }
  Object.assign(patch, plusSets);
  if (hidden !== undefined) patch.hidden_badges = hidden;

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      if (isColumnAbsent(error)) {
        return NextResponse.json({ error: "Some of these settings open soon.", code: "unavailable" }, { status: 409 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "That handle is taken.", code: "handle_taken" }, { status: 409 });
      }
      if (error.code === "23514") {
        return NextResponse.json({ error: "Some of that could not be saved.", code: "invalid" }, { status: 400 });
      }
      console.warn("[profile] save failed", error.message);
      return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 500 });
    }
  }

  const fresh = await loadProfileRow(admin, { id: user.id });
  if (!fresh || fresh === "unavailable") {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  return NextResponse.json(
    { profile: await buildMyProfile(admin, fresh) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const GET = corsRoute(handleGET);
export const PUT = corsRoute(handlePUT);
export const OPTIONS = corsPreflight;
