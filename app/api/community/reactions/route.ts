import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { communityEnabled } from "@/lib/community/flags";
import { isReaction, reactionWrite, type ReactionState } from "@/lib/community/reactions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Like and dislike, on a post or a reply.
 *
 * ── The rule is enforced twice, deliberately ────────────────────────────
 *
 * lib/community/reactions.ts decides what a press MEANS, and two partial
 * unique indexes make a second row for the same (user, target) impossible
 * (20260826_community_reactions_and_verification.sql). This route sits between
 * them and does neither job again.
 *
 * That matters because the tempting shape is "read the current reaction,
 * decide, write" and that is a check-then-act with a gap: a double-tap, or the
 * same account on a phone and a laptop, gets two requests interleaved and the
 * loser writes over the winner. The write below closes it by letting the
 * database referee: a losing insert comes back as a unique violation and is
 * retried as an update, so concurrent presses collapse into one row.
 *
 * It used to close it with an UPSERT, which could not work here at all. See
 * the long note at the insert for why a partial unique index cannot back an
 * ON CONFLICT column list, and why that made every press a 500.
 *
 * ── The client never sends its own state ────────────────────────────────
 *
 * It sends which button was pressed. The route reads what the caller actually
 * holds and applies the transition itself, because a client that says "I had
 * nothing, give me a like" after a stale render would otherwise get a like it
 * should have had removed. The button's optimistic guess is corrected by the
 * counts this route returns.
 *
 * user_id comes from the session, never from the body.
 */

const schema = z
  .object({
    postId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
    // 1 like, -1 dislike. Which BUTTON was pressed, not the desired end state.
    value: z.union([z.literal(1), z.literal(-1)]),
  })
  .refine((v) => Boolean(v.postId) !== Boolean(v.replyId), {
    message: "Give exactly one of postId or replyId.",
  });

async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to react." }, { status: 401 });
  }

  // Generous: a reader scrolling a feed and reacting is normal. Tight enough
  // that a script cannot inflate a count by thousands.
  if (await rateLimited(`community-react:${user.id}`, 3600, 300)) {
    return NextResponse.json(
      { error: "Too many reactions. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { postId, replyId, value } = parsed.data;

  const admin = createAdminClient();
  const column = postId ? "post_id" : "reply_id";
  const targetId = (postId ?? replyId) as string;

  // What this reader currently holds. Read with the service role rather than
  // the caller's client purely so one missing RLS policy cannot silently make
  // every press look like a first press.
  const { data: existing, error: readErr } = await admin
    .from("community_reactions")
    .select("id, value")
    .eq("user_id", user.id)
    .eq(column, targetId)
    .maybeSingle();
  if (readErr) {
    console.warn("[community] reaction read failed", readErr.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  const current: ReactionState = isReaction(existing?.value) ? existing.value : null;
  const write = reactionWrite(current, value);

  if (write.action === "remove") {
    const { error } = await admin
      .from("community_reactions")
      .delete()
      .eq("user_id", user.id)
      .eq(column, targetId);
    if (error) {
      console.warn("[community] reaction delete failed", error.message);
      return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
    }
  } else if (existing?.id) {
    // Already holds one: this is a flip, and the row's own primary key is the
    // safest thing to address it by.
    const { error } = await admin
      .from("community_reactions")
      .update({ value: write.value, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.warn("[community] reaction update failed", error.message);
      return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
    }
  } else {
    // ── Why this is not an upsert ──────────────────────────────────────────
    //
    // It was, and it failed EVERY TIME, which is why no like has ever saved.
    // .upsert(..., { onConflict: "user_id,post_id" }) emits
    // ON CONFLICT (user_id, post_id), and the indexes backing that rule are
    // PARTIAL: `where post_id is not null`, in
    // 20260826_community_reactions_and_verification.sql. Postgres will not
    // infer a partial unique index from a bare column list; it wants the
    // index predicate in the ON CONFLICT clause, which PostgREST has no way
    // to express. So every press raised 42P10, "no unique or exclusion
    // constraint matching the ON CONFLICT specification", and the route
    // turned it into a 500 and the button into "Couldn't save that."
    //
    // The partial indexes are correct and stay. Two nullable target columns
    // are what let a real foreign key cascade, and a full index over
    // (user_id, post_id) would treat the NULLs on every reply row as
    // distinct and enforce nothing.
    //
    // So: insert, and treat a unique violation as the race it is. The gap
    // this leaves is two first-presses arriving together, where the loser
    // gets 23505 and updates instead, which is the same end state the upsert
    // was reaching for and reaches it without needing the index inferred.
    const { error } = await admin.from("community_reactions").insert({
      user_id: user.id,
      [column]: targetId,
      value: write.value,
      updated_at: new Date().toISOString(),
    });
    if (error && error.code === "23505") {
      const { error: raced } = await admin
        .from("community_reactions")
        .update({ value: write.value, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq(column, targetId);
      if (raced) {
        console.warn("[community] reaction race update failed", raced.message);
        return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
      }
    } else if (error) {
      console.warn("[community] reaction insert failed", error.message);
      return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
    }
  }

  // The counters the trigger just recomputed. Returned so the button can
  // replace its optimistic guess with the number everyone else will see.
  const table = postId ? "community_posts" : "community_post_replies";
  const { data: counts } = await admin
    .from(table)
    .select("like_count, dislike_count")
    .eq("id", targetId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    mine: write.action === "remove" ? null : write.value,
    likeCount: (counts?.like_count as number | undefined) ?? 0,
    dislikeCount: (counts?.dislike_count as number | undefined) ?? 0,
  });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
