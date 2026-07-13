import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { listRecipes } from "@/lib/trapeza/catalog";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { isFastLevel, isSeason, isTradition } from "@/lib/trapeza/recipes";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { trapezaRecipeSubmitSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/** List published recipes, filtered by ?level= ?season= ?tradition=. */
export async function GET(req: Request) {
  if (!trapezaEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const season = url.searchParams.get("season");
  const tradition = url.searchParams.get("tradition");
  const recipes = await listRecipes({
    fastLevel: isFastLevel(level) ? level : undefined,
    season: isSeason(season) ? season : undefined,
    tradition: isTradition(tradition) ? tradition : undefined,
  });
  return withCors(
    NextResponse.json(
      { recipes },
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

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("trapeza_recipes")
    .insert({
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
    })
    .select("id")
    .single();
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
