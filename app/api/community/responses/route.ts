import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { RESPONSE_KINDS, countsOf } from "@/lib/community/responses";
import { notYet, signedInUser } from "@/lib/community/social";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Amen, Praying, Glory to God, on a post or a reply
 * (20261005000000_community_three.sql, community_responses).
 *
 * The client sends the end state it wants for one response (`on`), never a
 * toggle, so a reader tapping quickly can never leave the database out of
 * step with the screen, the rule the like button learned the hard way
 * (components/community/ReactionButtons.tsx). Turning one on twice is the
 * same as once: the partial unique index answers the second with 23505, which
 * is the state asked for. user_id comes from the session, never the body.
 */
const schema = z
  .object({
    postId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
    kind: z.enum(RESPONSE_KINDS),
    on: z.boolean(),
  })
  .refine((v) => Boolean(v.postId) !== Boolean(v.replyId), { message: "Give exactly one of postId or replyId." });

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`community-respond:${user.id}`, 3600, 400)) {
    return NextResponse.json({ error: "Too many just now. Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { postId, replyId, kind, on } = parsed.data;

  const admin = createAdminClient();
  const column = postId ? "post_id" : "reply_id";
  const target = (postId ?? replyId) as string;
  const table = postId ? "community_posts" : "community_post_replies";

  // Only something a reader can see may be answered.
  const { data: row } = await admin.from(table).select("id, status").eq("id", target).maybeSingle();
  if (!row || (row as { status: string }).status !== "visible") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = on
    ? await admin.from("community_responses").insert({ user_id: user.id, [column]: target, kind })
    : await admin.from("community_responses").delete().eq("user_id", user.id).eq(column, target).eq("kind", kind);
  if (error && error.code !== "23505") {
    if (notYet(error)) return NextResponse.json({ error: "This opens soon.", code: "unavailable" }, { status: 409 });
    console.warn("[community] response failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  // The totals the trigger just recounted, and what this reader now holds.
  const [{ data: totals }, { data: mine }] = await Promise.all([
    admin.from(table).select("amen_count, praying_count, glory_count").eq("id", target).maybeSingle(),
    admin.from("community_responses").select("kind").eq("user_id", user.id).eq(column, target),
  ]);
  return NextResponse.json({
    ok: true,
    counts: countsOf((totals ?? {}) as { amen_count?: number; praying_count?: number; glory_count?: number }),
    mine: RESPONSE_KINDS.filter((k) => ((mine ?? []) as { kind: string }[]).some((m) => m.kind === k)),
  });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
