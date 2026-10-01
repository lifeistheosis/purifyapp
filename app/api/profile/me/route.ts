import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminEmail } from "@/lib/admin/access";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { getBook } from "@/lib/bible/books";
import { isDecoration, isEffect, normalizeHex, subscriptionTier } from "@/lib/profile/cosmetics";
import { handleChangeAllowed, handleProblem, normalizeHandle } from "@/lib/profile/handle";
import { verseRef } from "@/lib/profile/publicProfile";
import { buildMyProfile, ensureHandle, loadProfileRow } from "@/lib/profile/server";
import { getSaint } from "@/lib/saints/saints";
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

  const patch: Record<string, string | null> = {};

  if (p.handle !== undefined) {
    const handle = normalizeHandle(p.handle);
    if (handle !== row.handle) {
      // The team may take a reserved name (@purify, @support) for an
      // official account; nobody else may.
      const problem = handleProblem(handle);
      if (problem && !(problem === "reserved" && isAdminEmail(user.email))) {
        return NextResponse.json({ error: "That handle cannot be used.", code: `handle_${problem}` }, { status: 400 });
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
  if (p.status !== undefined) patch.status_text = cleanText(p.status, 60)?.replace(/\n/g, " ") ?? null;

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
    plusSets.avatar_decoration = p.decoration;
  }
  if (p.effect !== undefined) {
    if (p.effect !== null && !isEffect(p.effect)) {
      return NextResponse.json({ error: "Unknown effect.", code: "effect" }, { status: 400 });
    }
    plusSets.profile_effect = p.effect;
  }
  if (Object.values(plusSets).some((v) => v !== null)) {
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

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That handle is taken.", code: "handle_taken" }, { status: 409 });
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
