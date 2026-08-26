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
 * loser writes over the winner. Here the write is an UPSERT on the unique
 * index, so concurrent presses collapse into one row and the last one wins
 * cleanly instead of duplicating.
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
  } else {
    // Upsert on the unique index rather than insert-or-update by hand: two
    // presses arriving together collapse into one row instead of racing.
    const { error } = await admin.from("community_reactions").upsert(
      {
        user_id: user.id,
        [column]: targetId,
        value: write.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: `user_id,${column}` },
    );
    if (error) {
      console.warn("[community] reaction upsert failed", error.message);
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
