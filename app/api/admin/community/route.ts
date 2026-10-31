import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { CAMPAIGN_BUCKET, campaignImage } from "@/lib/campaigns/image";
import {
  campaignKey,
  countWaiting,
  holdKey,
  recipeKey,
  recipeNewKey,
  reportKey,
  reviewKey,
} from "@/lib/admin/communityQueue";
import { MAX_PINNED } from "@/lib/community/pinning";
import { logMod, moderatorFor, readOpenReports, runModAction, type ModAction } from "@/lib/community/moderation";
import { forgetUploads, removeOwnedUpload } from "@/lib/security/uploadOwners";
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
 * Before 20260928000000_kitchen.sql there are no photo columns, no reviews table and
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

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // ?summary=1: the queue counted, for the strip and the rail's badge. Since
  // his pick A on r3-17 (one queue, one row per thing) the count is the
  // number of ROWS the page shows: the holds and reports that name the same
  // post are one, and held posts count (the badge used to leave them out).
  // lib/admin/communityQueue.ts keys both, so the two cannot disagree. Thin
  // reads of ids only; any failed read is a 500, because this route's own
  // comment below says why an unread queue must never read as empty.
  if (new URL(req.url).searchParams.get("summary") === "1") {
    const [recipes, campaignReports, recipeReportsFirst, reportsFirst, holdsRead] = await Promise.all([
      admin.from("trapeza_recipes").select("id").eq("status", "pending").limit(1000),
      admin.from("prayer_campaign_reports").select("id, campaign_id").limit(1000),
      admin.from("trapeza_recipe_reports").select("id, recipe_id, review_id").limit(1000),
      admin.from("community_reports").select("id, post_id, reply_id, profile_id").eq("status", "open").limit(1000),
      admin.from("community_text_holds").select("id, post_id, reply_id").eq("status", "pending").limit(1000),
    ]);
    // Older shapes: no review_id before the Kitchen migration, no profile_id
    // before profile reports, no holds table before the filter.
    const recipeReports = isColumnAbsent(recipeReportsFirst.error)
      ? await admin.from("trapeza_recipe_reports").select("id, recipe_id").limit(1000)
      : recipeReportsFirst;
    const reports = isColumnAbsent(reportsFirst.error)
      ? await admin.from("community_reports").select("id, post_id, reply_id").eq("status", "open").limit(1000)
      : reportsFirst;
    const holds = isTableAbsent(holdsRead.error) ? { data: [], error: null } : holdsRead;
    const err = recipes.error ?? campaignReports.error ?? recipeReports.error ?? reports.error ?? holds.error;
    if (err) {
      console.error("[admin/community] moderation count failed", err.message);
      return NextResponse.json({ error: "The moderation queue could not be counted." }, { status: 500 });
    }
    type Id = { id: string };
    const holdRows = (holds.data ?? []) as (Id & { post_id: string | null; reply_id: string | null })[];
    const reportRows = (reports.data ?? []) as (Id & { post_id: string | null; reply_id: string | null; profile_id?: string | null })[];
    const recipeRows = (recipeReports.data ?? []) as (Id & { recipe_id: string | null; review_id?: string | null })[];
    const campaignRows = (campaignReports.data ?? []) as (Id & { campaign_id: string | null })[];
    const keys = [
      ...holdRows.map(holdKey),
      ...reportRows.map((r) => reportKey(r, r.profile_id ?? null)),
      ...((recipes.data ?? []) as Id[]).map((r) => recipeNewKey(r.id)),
      ...recipeRows.map((r) => (r.review_id ? reviewKey(r.review_id, r.id) : recipeKey(r.recipe_id, r.id))),
      ...campaignRows.map((r) => campaignKey(r.campaign_id, r.id)),
    ];
    return NextResponse.json(
      {
        recipes: (recipes.data ?? []).length,
        reports: reportRows.length + recipeRows.length + campaignRows.length,
        held: holdRows.length,
        // The rows the page shows, and the number the rail wears.
        waiting: countWaiting(keys),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Conversations reports (posts, replies and profiles), read the same way
  // the moderators' own queue reads them (lib/community/moderation.ts). They
  // had NO admin surface at all until the reports table landed, so a reported
  // post could only be acted on in the SQL editor.
  const conversationReportsQuery = readOpenReports(admin).then(
    (rows) => ({ data: rows, error: null as { message: string } | null }),
    (e: Error) => ({ data: [] as Record<string, unknown>[], error: { message: e.message } }),
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
  // The submission's photo arrives with 20260928000000_kitchen.sql; before it, ask
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

  const reports = conversationReports.data ?? [];

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
    // Put back what the spam filter or readers' reports hid (20261005).
    "restore_community_post",
    "restore_community_reply",
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

  // Conversations: the same actions the moderators in the app take
  // (lib/community/moderation.ts), so the two can never drift apart, and every
  // one of them lands in the moderation log under the admin's name.
  const shared: Partial<Record<typeof action, ModAction>> = {
    remove_community_post: "remove_post",
    remove_community_reply: "remove_reply",
    restore_community_post: "restore_post",
    restore_community_reply: "restore_reply",
    dismiss_community_report: "dismiss_report",
    clear_community_profile: "clear_profile",
    reset_community_handle: "reset_handle",
  };
  const sharedAction = shared[action];
  if (sharedAction) {
    const actor = await moderatorFor(admin, adminUser);
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const res = await runModAction(admin, actor, sharedAction, id, reason);
    if (!res.ok) {
      console.warn("[admin/community] action failed", res.error);
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  }

  // What the decision was about, read before it is made: a dismissed report
  // is deleted below, so its words have to be kept first. "Dismiss keeps a
  // record" (his pick A for Community, r3-17): these decisions were logged
  // nowhere, so the moderation log, and the audit log's record that reads
  // it, never saw a recipe, a campaign, a review or a pin.
  const summary = await describeTarget(admin, action, id);

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
        .select("image_url, creator_id")
        .eq("id", id)
        .maybeSingle<{ image_url: string | null; creator_id: string | null }>();
      ({ error } = await admin
        .from("prayer_campaigns")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      if (!error && removed?.image_url) {
        // Only a picture that is provably the creator's own upload. The row's
        // URL was once accepted with nothing but a host check, so it could
        // name another campaign's picture, and this would have deleted it.
        // The takedown itself succeeded; a picture left behind is logged for
        // a manual sweep rather than surfaced as a failed removal.
        const outcome = await removeOwnedUpload(
          admin,
          CAMPAIGN_BUCKET,
          campaignImage(removed.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
          removed.creator_id,
        );
        if (outcome !== "removed") {
          console.warn("[admin/community] campaign image not deleted", id, outcome);
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
          } else {
            await forgetUploads(admin, KITCHEN_BUCKET, paths);
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
      const pinnedOthers = (skipFeasts: boolean) => {
        const q = admin
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .not("pinned_at", "is", null)
          .neq("id", id);
        // The day's feast thread pins itself (lib/community/feast.ts) and
        // does not take an announcement's place.
        return skipFeasts ? q.is("feast_day", null) : q;
      };
      let { count, error: countError } = await pinnedOthers(true);
      if (countError && isColumnAbsent(countError)) ({ count, error: countError } = await pinnedOthers(false));
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
    default:
      // Every conversations action returned above.
      break;
  }

  if (error) {
    console.warn("[admin/community] action failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const actor = await moderatorFor(admin, adminUser);
  if (actor) {
    await logMod(admin, actor, {
      action,
      target: action.startsWith("dismiss_") ? "report" : action.endsWith("community_post") ? "post" : null,
      targetId: id,
      summary,
    });
  }
  return NextResponse.json({ ok: true });
}

type Described = { title?: string | null; body?: string | null; author_name?: string | null; reason?: string | null };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** A line naming what a kitchen, campaign or pin decision was about, for the log. Best effort. */
async function describeTarget(admin: AdminClient, action: string, id: string): Promise<string | null> {
  try {
    const read = async (table: string, cols: string) => {
      const { data } = await admin.from(table).select(cols).eq("id", id).maybeSingle();
      return (data ?? null) as (Described & Record<string, unknown>) | null;
    };
    const title = (v: unknown) => one(v as Described | Described[] | null)?.title ?? null;
    switch (action) {
      case "publish_recipe":
      case "remove_recipe":
        return (await read("trapeza_recipes", "title"))?.title ?? null;
      case "remove_campaign":
        return (await read("prayer_campaigns", "title"))?.title ?? null;
      case "dismiss_campaign_report": {
        const r = await read("prayer_campaign_reports", "reason, campaign:prayer_campaigns(title)");
        return r ? `A report on ${title(r.campaign) ?? "a campaign"}${r.reason ? `: ${r.reason}` : ""}` : null;
      }
      case "dismiss_recipe_report": {
        const r = await read("trapeza_recipe_reports", "reason, recipe:trapeza_recipes(title)");
        return r ? `A report on ${title(r.recipe) ?? "a recipe"}${r.reason ? `: ${r.reason}` : ""}` : null;
      }
      case "remove_review": {
        const r = await read("trapeza_recipe_reviews", "author_name, recipe:trapeza_recipes(title)");
        return r ? `${r.author_name ?? "A reader"}'s review of ${title(r.recipe) ?? "a recipe"}` : null;
      }
      case "pin_community_post":
      case "unpin_community_post": {
        const r = await read("community_posts", "title, body, author_name");
        const text = (r?.title || r?.body || "").replace(/\s+/g, " ").trim();
        return r ? `${r.author_name ?? "A reader"}: ${text.length > 80 ? `${text.slice(0, 80)}…` : text}` : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
