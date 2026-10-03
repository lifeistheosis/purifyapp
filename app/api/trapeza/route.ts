import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { listRecipes, MAX_LIST } from "@/lib/trapeza/catalog";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { ownsKitchenPhoto } from "@/lib/trapeza/photos";
import { isFastLevel, isSeason, isTradition } from "@/lib/trapeza/recipes";
import { withRatings } from "@/lib/trapeza/reviews";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { trapezaRecipeSubmitSchema } from "@/lib/security/schemas";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * List published recipes, filtered by ?level= ?season= ?tradition=, with each
 * recipe's rating. ?limit= up to MAX_LIST; the Kitchen asks for the whole
 * catalogue once and filters on the device. Installed apps from before the
 * Kitchen send no limit and get the thirty newest, as they always did.
 */
export async function GET(req: Request) {
  if (!trapezaEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const season = url.searchParams.get("season");
  const tradition = url.searchParams.get("tradition");
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const recipes = await listRecipes({
    fastLevel: isFastLevel(level) ? level : undefined,
    season: isSeason(season) ? season : undefined,
    tradition: isTradition(tradition) ? tradition : undefined,
    limit: Number.isFinite(limitParam) ? Math.min(limitParam, MAX_LIST) : undefined,
  });
  return withCors(
    NextResponse.json(
      { recipes: await withRatings(recipes) },
      { headers: { "Cache-Control": "public, max-age=60" } },
    ),
    req,
  );
}

/**
 * Submit a recipe. Signed-in only. Lands as 'pending'; a reviewer publishes it
 * (rights and quality are checked before a member's dish goes on the board).
 * The server owns status; the client only proposes the human fields.
 */
async function handlePOST(req: Request) {
  if (!trapezaEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`trapeza-submit:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many submissions just now. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = trapezaRecipeSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to share a recipe." },
      { status: 401 },
    );
  }

  // A photo must be one this member uploaded, and they must say it is theirs:
  // a published recipe's photo is shown to everyone.
  const photoUrl = data.photoUrl?.trim() || null;
  if (photoUrl) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!ownsKitchenPhoto(photoUrl, base, "s", user.id)) {
      return NextResponse.json({ error: "That photo could not be attached." }, { status: 400 });
    }
    if (data.ownPhoto !== true) {
      return NextResponse.json({ error: "Confirm the photo is your own." }, { status: 400 });
    }
  }

  const row = {
    author_id: user.id,
    title: data.title.trim(),
    fast_level: data.fastLevel,
    season: data.season,
    tradition: data.tradition,
    summary: data.summary?.trim() || null,
    ingredients: data.ingredients.trim(),
    steps: data.steps.trim(),
    servings: data.servings?.trim() || null,
    time_minutes: data.timeMinutes ?? null,
    // status defaults to 'pending'; never trust a client for it.
  };

  const admin = createAdminClient();
  const insert = (fields: Record<string, unknown>) =>
    admin.from("trapeza_recipes").insert(fields).select("id").single();
  let { data: created, error } = await insert(
    photoUrl ? { ...row, photo_url: photoUrl } : row,
  );
  // Before 20260928000000_kitchen.sql the photo column is not there. The recipe is
  // still worth keeping: it goes in without the photo, which stays in the
  // bucket where the reviewer can find it.
  if (error && photoUrl && isColumnAbsent(error)) {
    console.warn("[trapeza] photo column absent, submitting without it", photoUrl);
    ({ data: created, error } = await insert(row));
  }
  if (error || !created) {
    console.warn("[trapeza] submit failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't save your recipe. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: created.id });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
