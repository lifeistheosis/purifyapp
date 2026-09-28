import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { isRecipeId } from "@/lib/trapeza/catalog";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { KITCHEN_BUCKET, kitchenObjectPath, ownsKitchenPhoto } from "@/lib/trapeza/photos";
import { listReviews } from "@/lib/trapeza/reviews";
import { rateLimited } from "@/lib/security/ratelimit";
import { trapezaReviewSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Reviews of one Kitchen recipe.
 *
 *   GET     published reviews, each with a `mine` flag, and the summary.
 *           `open: false` until 20260928_kitchen.sql is applied, which the
 *           page reads as "no reviews section", never as "no reviews".
 *   POST    the caller's review, new or edited (one per member per recipe).
 *   DELETE  the caller's own review, and its photos with it.
 *
 * Post-moderated like the community feed: a review shows at once, and a
 * report sends it to the admin Community tab. Photos are uploaded first
 * through /api/trapeza/upload and arrive here as URLs, each checked to be in
 * the caller's own folder of the kitchen bucket.
 */

type Params = { params: Promise<{ id: string }> };

async function viewer(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function removePhotos(urls: string[]) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const paths = urls
    .map((u) => kitchenObjectPath(u, base))
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return Promise.resolve();
  return createAdminClient()
    .storage.from(KITCHEN_BUCKET)
    .remove(paths)
    .then(({ error }) => {
      // The review change itself went through; an object left behind is
      // logged for a sweep rather than failing the request.
      if (error) console.warn("[kitchen] review photos not deleted", paths, error.message);
    });
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  if (!trapezaEnabled() || !isRecipeId(id)) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const user = await viewer(req);
  const read = await listReviews(id, user?.id ?? null);
  // Personal (the `mine` flags), so never shared by a cache.
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" };
  if (!read.open) {
    return withCors(NextResponse.json({ open: false }, { headers }), req);
  }
  if (read.failed) {
    return withCors(
      NextResponse.json({ error: "Reviews could not be read." }, { status: 500, headers }),
      req,
    );
  }
  return withCors(
    NextResponse.json(
      { open: true, reviews: read.reviews, summary: read.summary, signedIn: Boolean(user) },
      { headers },
    ),
    req,
  );
}

async function handlePOST(req: Request, id: string) {
  if (!trapezaEnabled() || !isRecipeId(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await viewer(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
  }
  // Keyed on the member, not the IP: carriers put many phones behind one.
  if (await rateLimited(`kitchen-review:${user.id}`, 3600, 20)) {
    return NextResponse.json(
      { error: "Too many reviews just now. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = trapezaReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review." },
      { status: 400 },
    );
  }
  const photos = [...new Set(parsed.data.photoUrls ?? [])];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (photos.some((u) => !ownsKitchenPhoto(u, base, "r", user.id))) {
    return NextResponse.json({ error: "Those photos could not be attached." }, { status: 400 });
  }
  if (photos.length > 0 && parsed.data.ownPhotos !== true) {
    return NextResponse.json({ error: "Confirm the photos are your own." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: recipe } = await admin
    .from("trapeza_recipes")
    .select("id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!recipe) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: previous, error: previousError } = await admin
    .from("trapeza_recipe_reviews")
    .select("id, photo_urls, status")
    .eq("recipe_id", id)
    .eq("author_id", user.id)
    .maybeSingle<{ id: string; photo_urls: string[] | null; status: string }>();
  if (previousError) {
    if (isTableAbsent(previousError)) {
      return NextResponse.json({ error: "Reviews are not open yet." }, { status: 503 });
    }
    console.warn("[kitchen] review lookup failed", previousError.message);
    return NextResponse.json({ error: "Couldn't save your review." }, { status: 500 });
  }
  // A review a moderator took down stays down. Editing it would put it back
  // in front of everyone without anyone looking at it again.
  if (previous?.status === "removed") {
    return NextResponse.json(
      { error: "This review was taken down by a moderator." },
      { status: 403 },
    );
  }

  // Name and picture copied at write time, as community posts do.
  const meta = (user.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
  const authorName =
    ((meta.display_name ?? "").trim() ||
      (user.email ? user.email.split("@")[0] : "") ||
      "Reader").slice(0, 80);
  const avatar = typeof meta.avatar_url === "string" && meta.avatar_url.length <= 600
    ? meta.avatar_url
    : null;

  const { error } = await admin.from("trapeza_recipe_reviews").upsert(
    {
      recipe_id: id,
      author_id: user.id,
      author_name: authorName,
      author_avatar: avatar,
      stars: parsed.data.stars,
      body: parsed.data.body?.trim() || null,
      photo_urls: photos,
      updated_at: new Date().toISOString(),
      // status is left out: a new row takes the default, 'published'.
    },
    { onConflict: "recipe_id,author_id" },
  );
  if (error) {
    console.warn("[kitchen] review save failed", error.message);
    return NextResponse.json({ error: "Couldn't save your review." }, { status: 500 });
  }

  // Photos the edit dropped are gone from the review, so they go from the
  // public bucket too.
  const dropped = (previous?.photo_urls ?? []).filter((u) => !photos.includes(u));
  await removePhotos(dropped);
  return NextResponse.json({ ok: true });
}

async function handleDELETE(req: Request, id: string) {
  if (!trapezaEnabled() || !isRecipeId(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await viewer(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("trapeza_recipe_reviews")
    .select("id, photo_urls")
    .eq("recipe_id", id)
    .eq("author_id", user.id)
    .maybeSingle<{ id: string; photo_urls: string[] | null }>();
  if (readError) {
    if (isTableAbsent(readError)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Couldn't delete your review." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // The member's own words, so theirs to delete outright: hard deletion is
  // the reader's tool for their own content, as with community posts.
  const { error } = await admin
    .from("trapeza_recipe_reviews")
    .delete()
    .eq("id", existing.id)
    .eq("author_id", user.id);
  if (error) {
    console.warn("[kitchen] review delete failed", error.message);
    return NextResponse.json({ error: "Couldn't delete your review." }, { status: 500 });
  }
  await removePhotos(existing.photo_urls ?? []);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
