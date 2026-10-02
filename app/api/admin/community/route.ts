import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { MAX_PINNED } from "@/lib/community/pinning";
import { HOUSE_PHOTOS, housePhotoCredit } from "@/lib/trapeza/housePhotos";
import { KITCHEN_BUCKET, kitchenObjectPath } from "@/lib/trapeza/photos";

export const dynamic = "force-dynamic";

/**
 * Owner moderation for the community features: prayer campaigns and the
 * Kitchen (the recipe board once called the Trapeza). Read the queue (pending
 * recipe submissions, reported campaigns, reported recipes and reviews, the
 * latest reviews) and act (publish/remove a recipe, remove a campaign or a
 * review, dismiss a report). Service-role, gated to the admin email
 * allowlist. Web only, like the rest of the admin console.
 */

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * The Kitchen's part of the queue, read so that a migration not yet applied
 * reads as "not switched on" and never as "nothing waiting".
 *
 * Before 20260928_kitchen.sql there are no photo columns, no reviews table and
 * no review_id on reports. Each read below asks for the new shape first and
 * says which parts are live; a real failure is still returned as an error,
 * for the route's own rule about unread queues.
 */
async function loadKitchen(admin: AdminClient) {
  const recipesRead = await admin
    .from("trapeza_recipes")
    .select("id, title, fast_level, photo_url, photo_credit")
    .eq("status", "published")
    .order("title", { ascending: true })
    .limit(300);
  const photos = !isColumnAbsent(recipesRead.error);
  const recipes = photos
    ? recipesRead
    : await admin
        .from("trapeza_recipes")
        .select("id, title, fast_level")
        .eq("status", "published")
        .order("title", { ascending: true })
        .limit(300);

  const reviewsRead = await admin
    .from("trapeza_recipe_reviews")
    .select(
      "id, stars, body, photo_urls, author_name, created_at, status, recipe:trapeza_recipes(id, title)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);
  const reviews = !isTableAbsent(reviewsRead.error);

  const reviewReports = reviews
    ? await admin
        .from("trapeza_recipe_reports")
        .select(
          "id, reason, created_at, review:trapeza_recipe_reviews(id, stars, body, photo_urls, author_name, status), recipe:trapeza_recipes(id, title)",
        )
        .not("review_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };

  // A house recipe with no photo of its own shows its bundled one
  // (lib/trapeza/housePhotos.ts), marked so the card can say an upload here
  // would replace it.
  type Row = { id: string; title: string; fast_level: string; photo_url?: string | null; photo_credit?: string | null };
  const kitchenRecipes = ((recipes.data ?? []) as Row[]).map((r) => {
    const house = HOUSE_PHOTOS[r.id];
    if (r.photo_url || !house) return { ...r, photo_default: false };
    return { ...r, photo_url: house.src, photo_credit: housePhotoCredit(house), photo_default: true };
  });

  return {
    error:
      recipes.error ??
      (reviews ? reviewsRead.error : null) ??
      (isColumnAbsent(reviewReports.error) ? null : reviewReports.error),
    live: { photos, reviews },
    kitchenRecipes,
    recentReviews: reviews ? reviewsRead.data ?? [] : [],
    reviewReports: reviewReports.error ? [] : reviewReports.data ?? [],
  };
}

/** Recipe reports, without the review reports once the column exists. */
async function recipeReportsOnly(admin: AdminClient) {
  const run = (skipReviews: boolean) => {
    const q = admin
      .from("trapeza_recipe_reports")
      .select("id, reason, created_at, recipe:trapeza_recipes(id, title, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    return skipReviews ? q.is("review_id", null) : q;
  };
  const first = await run(true);
  return isColumnAbsent(first.error) ? run(false) : first;
}

/** Recover the object path from a Supabase public storage URL, which looks
 *  like `<project>/storage/v1/object/public/<bucket>/<path...>`. Returns null
 *  if the URL is not a public object in the expected bucket, so a malformed or
 *  foreign URL can never turn into a delete against something else. */
function storagePathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length).split("?")[0];
  if (!path || path.includes("..")) return null;
  return decodeURIComponent(path);
}

/**
 * The reported profile beside each profile report: its handle, name and the
 * reader-written parts a moderator might clear. Read separately rather than
 * embedded, because community_reports.profile_id points at auth.users and
 * PostgREST cannot follow that to public.profiles.
 */
async function withReportedProfiles<T extends { profile_id?: string | null }>(admin: AdminClient, rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.profile_id).filter((v): v is string => Boolean(v)))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, profile: null }));
  const read = (cols: string) => admin.from("profiles").select(cols).in("id", ids);
  // parish arrives with 20261002_community_social.sql; before it, without.
  let { data, error } = await read("id, handle, display_name, bio, status_text, banner_url, parish");
  if (error && isColumnAbsent(error)) ({ data, error } = await read("id, handle, display_name, bio, status_text, banner_url"));
  type P = {
    id: string;
    handle: string | null;
    display_name: string | null;
    bio: string | null;
    status_text: string | null;
    banner_url: string | null;
    parish?: string | null;
  };
  const byId = new Map(((data ?? []) as unknown as P[]).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = r.profile_id ? byId.get(r.profile_id) : undefined;
    return {
      ...r,
      profile: p
        ? {
            handle: p.handle,
            name: p.display_name,
            bio: p.bio,
            status: p.status_text,
            banner_url: p.banner_url,
            parish: p.parish ?? null,
          }
        : null,
    };
  });
}

/** A fresh, plain handle for a reader whose own was taken down. */
function plainHandle(): string {
  return `reader${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // ?summary=1: the queue as four HEAD counts, for the attention strip. Same
  // filters as the four lists below, so the number here is the number the
  // tab shows, minus the tab's 200-row cap. The full route runs five selects
  // with joins and was load-once from its tab; the strip asks every ten
  // minutes and needs two numbers. Any failed count is a 500: this route's
  // own comment below says why an unread queue must never read as empty.
  if (new URL(req.url).searchParams.get("summary") === "1") {
    const head = (table: string) => admin.from(table).select("id", { count: "exact", head: true });
    const [recipes, campaignReports, recipeReports, conversationReports] = await Promise.all([
      head("trapeza_recipes").eq("status", "pending"),
      head("prayer_campaign_reports"),
      head("trapeza_recipe_reports"),
      head("community_reports").eq("status", "open"),
    ]);
    const err =
      recipes.error ?? campaignReports.error ?? recipeReports.error ?? conversationReports.error;
    if (err) {
      console.error("[admin/community] moderation count failed", err.message);
      return NextResponse.json({ error: "The moderation queue could not be counted." }, { status: 500 });
    }
    return NextResponse.json(
      {
        recipes: recipes.count ?? 0,
        reports:
          (campaignReports.count ?? 0) + (recipeReports.count ?? 0) + (conversationReports.count ?? 0),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Conversations reports. These had NO admin surface at all: the tab named
  // "Community" covered only campaigns and Trapeza, so a reported post or
  // reply could only be acted on by hand in the SQL editor.
  //
  // Profile reports (20261001_profiles_badges.sql) arrive on the same table
  // with profile_id set, so the read asks for that column first and falls
  // back to the older shape until the migration has run.
  const REPORT_COLS =
    "id, post_id, reply_id, reason, created_at, post:community_posts(id, kind, title, body, quote_text, quote_source, author_name, status), reply:community_post_replies(id, post_id, body, author_name, status)";
  const reportsQuery = (cols: string) =>
    admin
      .from("community_reports")
      .select(cols)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
  const conversationReportsQuery = reportsQuery(`${REPORT_COLS}, profile_id`).then((first) =>
    isColumnAbsent(first.error) ? reportsQuery(REPORT_COLS) : first,
  );

  const pendingQuery = (select: string) =>
    admin
      .from("trapeza_recipes")
      .select(select)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200);
  const PENDING = "id, title, fast_level, season, tradition, summary, ingredients, steps, created_at";

  const [pendingFirst, campaignReports, recipeReports, recentPosts, kitchen] = await Promise.all([
    pendingQuery(`${PENDING}, photo_url`),
    admin
      .from("prayer_campaign_reports")
      .select(
        "id, reason, created_at, campaign:prayer_campaigns(id, title, status, intention, subject_name, image_url)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    recipeReportsOnly(admin),
    // Posts the owner might want to announce, and the ones already announced.
    //
    // Same order the public feed uses, so what the panel lists top to bottom
    // is what a reader sees top to bottom. pinned_by IS selected here, unlike
    // in the public feed, because this response never leaves the admin gate
    // and "who pinned that" is the question the column exists to answer.
    admin
      .from("community_posts")
      .select(
        "id, kind, title, body, author_name, created_at, pinned_at, pinned_by, reply_count",
      )
      .eq("status", "visible")
      .is("group_id", null)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30),
    loadKitchen(admin),
  ]);
  // The submission's photo arrives with 20260928_kitchen.sql; before it, ask
  // again without the column.
  const pendingRecipes = isColumnAbsent(pendingFirst.error)
    ? await pendingQuery(PENDING)
    : pendingFirst;

  // Four reads, four discarded errors, and every one of them coalesced to an
  // empty list. The moderation queue then rendered "Nothing waiting." and the
  // Overview widget rendered "Awaiting moderation: 0". Those are the two
  // sentences that make an operator stop looking, and a failed read is exactly
  // when they should keep looking. CommunityTab already carries the right error
  // copy; it was unreachable because this route never answered non-2xx.
  const conversationReports = await conversationReportsQuery;
  const readError =
    pendingRecipes.error ??
    campaignReports.error ??
    recipeReports.error ??
    recentPosts.error ??
    conversationReports.error ??
    kitchen.error;
  if (readError) {
    console.error("[admin/community] moderation read failed", readError.message);
    return NextResponse.json(
      {
        error:
          "The moderation queue could not be read. This is not an empty queue, so nothing here is saying there is nothing waiting.",
      },
      { status: 500 },
    );
  }

  const reports = await withReportedProfiles(
    admin,
    (conversationReports.data ?? []) as unknown as ({ profile_id?: string | null } & Record<string, unknown>)[],
  );

  return NextResponse.json(
    {
      pendingRecipes: pendingRecipes.data ?? [],
      campaignReports: campaignReports.data ?? [],
      recipeReports: recipeReports.data ?? [],
      conversationReports: reports,
      recentPosts: recentPosts.data ?? [],
      maxPinned: MAX_PINNED,
      kitchen: {
        live: kitchen.live,
        recipes: kitchen.kitchenRecipes,
        recentReviews: kitchen.recentReviews,
        reviewReports: kitchen.reviewReports,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const actionSchema = z.object({
  action: z.enum([
    "publish_recipe",
    "remove_recipe",
    "remove_campaign",
    "dismiss_campaign_report",
    "dismiss_recipe_report",
    // The Kitchen's reviews. Removing keeps the row, as with conversations,
    // and deletes its photos from the public bucket, as with campaigns.
    "remove_review",
    // Conversations. `remove_*` soft-remove: the row stays, so the record of
    // what was said survives the decision. Hard deletion is the reader's
    // own tool for their own post, not a moderation tool.
    "remove_community_post",
    "remove_community_reply",
    "dismiss_community_report",
    // Profiles, by the id of the REPORT that named them, so the panel never
    // needs the reader's auth id. Clearing empties what the reader wrote on
    // the profile (bio, status line) and its banner picture; resetting gives
    // the account a plain new @handle. Both answer every open report on that
    // profile.
    "clear_community_profile",
    "reset_community_handle",
    // Announcements. Pinning puts one post above every other on a shared
    // surface, so it is a moderation action and lives behind the same gate as
    // the rest of them rather than in the community API where a reader could
    // reach it.
    "pin_community_post",
    "unpin_community_post",
  ]),
  id: z.string().uuid(),
  reason: z.string().max(300).optional().nullable(),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  const { action, id, reason } = parsed.data;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  let error: { message: string } | null = null;
  switch (action) {
    case "publish_recipe":
      ({ error } = await admin
        .from("trapeza_recipes")
        .update({ status: "published", updated_at: now })
        .eq("id", id));
      break;
    case "remove_recipe":
      ({ error } = await admin
        .from("trapeza_recipes")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      break;
    case "remove_campaign": {
      // Flipping status to 'removed' only hides the row. The campaign image
      // lives in a PUBLIC bucket, so without this the photo stays reachable
      // at its URL forever after a moderator takes the campaign down.
      const { data: removed } = await admin
        .from("prayer_campaigns")
        .select("image_url")
        .eq("id", id)
        .maybeSingle<{ image_url: string | null }>();
      ({ error } = await admin
        .from("prayer_campaigns")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      if (!error && removed?.image_url) {
        const path = storagePathFromPublicUrl(removed.image_url, "campaign-media");
        if (path) {
          const { error: delError } = await admin.storage
            .from("campaign-media")
            .remove([path]);
          // The takedown itself succeeded; a failed object delete is logged
          // for a manual sweep rather than surfaced as a failed removal.
          if (delError) {
            console.warn(
              "[admin/community] campaign image not deleted",
              path,
              delError.message,
            );
          }
        }
      }
      break;
    }
    case "dismiss_campaign_report":
      ({ error } = await admin.from("prayer_campaign_reports").delete().eq("id", id));
      break;
    case "dismiss_recipe_report":
      ({ error } = await admin.from("trapeza_recipe_reports").delete().eq("id", id));
      break;
    case "remove_review": {
      const { data: review } = await admin
        .from("trapeza_recipe_reviews")
        .select("photo_urls")
        .eq("id", id)
        .maybeSingle<{ photo_urls: string[] | null }>();
      ({ error } = await admin
        .from("trapeza_recipe_reviews")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      if (!error) {
        // Its reports are answered by the removal.
        await admin.from("trapeza_recipe_reports").delete().eq("review_id", id);
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const paths = (review?.photo_urls ?? [])
          .map((u) => kitchenObjectPath(u, base))
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          const { error: delError } = await admin.storage.from(KITCHEN_BUCKET).remove(paths);
          if (delError) {
            console.warn("[admin/community] review photos not deleted", paths, delError.message);
          }
        }
      }
      break;
    }

    // ── Conversations ────────────────────────────────────────────────
    // Soft-remove, with who decided and why. The reply policy now reads
    // `status = 'visible'`, so this hides it from every reader while the
    // row survives for the next time the same account does it again.
    case "pin_community_post": {
      // The cap is checked here as well as in the panel, because the panel is
      // a convenience and this is the rule. A client that posts the action
      // directly must not be able to bury the feed under announcements.
      const { count } = await admin
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .not("pinned_at", "is", null)
        .neq("id", id);
      if ((count ?? 0) >= MAX_PINNED) {
        return NextResponse.json(
          {
            error: `${MAX_PINNED} announcements are already pinned. Unpin one first.`,
          },
          { status: 409 },
        );
      }
      ({ error } = await admin
        .from("community_posts")
        .update({ pinned_at: now, pinned_by: adminUser.email ?? "admin" })
        // Only a visible post. Pinning a removed one would put a post nobody
        // can open at the top of the feed.
        .eq("id", id)
        .eq("status", "visible"));
      break;
    }
    case "unpin_community_post":
      ({ error } = await admin
        .from("community_posts")
        // Both cleared. Leaving pinned_by behind would keep an admin address
        // on a row that is no longer an announcement, for no reason.
        .update({ pinned_at: null, pinned_by: null })
        .eq("id", id));
      break;
    case "remove_community_post":
      ({ error } = await admin
        .from("community_posts")
        .update({
          status: "removed",
          removed_reason: reason?.trim() || null,
          removed_by_email: adminUser.email ?? null,
        })
        .eq("id", id));
      if (!error) {
        await admin
          .from("community_reports")
          .update({
            status: "actioned",
            handled_by_email: adminUser.email ?? null,
            handled_at: now,
          })
          .eq("post_id", id)
          .eq("status", "open");
      }
      break;

    case "remove_community_reply": {
      const { data: reply } = await admin
        .from("community_post_replies")
        .select("post_id")
        .eq("id", id)
        .maybeSingle();
      ({ error } = await admin
        .from("community_post_replies")
        .update({
          status: "removed",
          removed_reason: reason?.trim() || null,
          removed_by_email: adminUser.email ?? null,
        })
        .eq("id", id));
      if (!error) {
        // The parent's counter has to follow, or the post advertises a
        // reply the reader cannot see.
        if (reply?.post_id) {
          await admin.rpc("community_bump_reply_count", {
            p_post_id: reply.post_id,
            p_delta: -1,
          });
        }
        await admin
          .from("community_reports")
          .update({
            status: "actioned",
            handled_by_email: adminUser.email ?? null,
            handled_at: now,
          })
          .eq("reply_id", id)
          .eq("status", "open");
      }
      break;
    }

    case "clear_community_profile":
    case "reset_community_handle": {
      const { data: rep } = await admin
        .from("community_reports")
        .select("profile_id")
        .eq("id", id)
        .maybeSingle<{ profile_id: string | null }>();
      const profileId = rep?.profile_id ?? null;
      if (!profileId) {
        return NextResponse.json({ error: "That report is not about a profile." }, { status: 400 });
      }
      if (action === "clear_community_profile") {
        const { data: before } = await admin
          .from("profiles")
          .select("banner_url")
          .eq("id", profileId)
          .maybeSingle<{ banner_url: string | null }>();
        ({ error } = await admin
          .from("profiles")
          .update({ bio: null, status_text: null, banner_url: null, parish: null })
          .eq("id", profileId));
        if (error && isColumnAbsent(error)) {
          ({ error } = await admin
            .from("profiles")
            .update({ bio: null, status_text: null, banner_url: null })
            .eq("id", profileId));
        }
        // Banners live under b/<uuid> in the public avatars bucket
        // (app/api/profile/banner/route.ts); anything else is not ours to delete.
        const path = before?.banner_url ? storagePathFromPublicUrl(before.banner_url, "avatars") : null;
        if (!error && path && /^b\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(path)) {
          const { error: delError } = await admin.storage.from("avatars").remove([path]);
          if (delError) console.warn("[admin/community] banner not deleted", path, delError.message);
        }
      } else {
        // A few tries: a clash on six random digits is unlikely, not impossible.
        for (let i = 0; i < 5; i++) {
          ({ error } = await admin
            .from("profiles")
            .update({ handle: plainHandle(), handle_changed_at: now })
            .eq("id", profileId));
          if (!error || (error as { code?: string }).code !== "23505") break;
        }
      }
      if (!error) {
        await admin
          .from("community_reports")
          .update({ status: "actioned", handled_by_email: adminUser.email ?? null, handled_at: now })
          .eq("profile_id", profileId)
          .eq("status", "open");
      }
      break;
    }

    // Dismissing is recorded, not deleted: a post reported five times and
    // dismissed five times reads very differently from one reported once.
    case "dismiss_community_report":
      ({ error } = await admin
        .from("community_reports")
        .update({
          status: "dismissed",
          handled_by_email: adminUser.email ?? null,
          handled_at: now,
        })
        .eq("id", id));
      break;
  }

  if (error) {
    console.warn("[admin/community] action failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
