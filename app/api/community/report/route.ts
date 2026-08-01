import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report a community post or reply.
 *
 * Conversations shipped without one. Campaigns and Trapeza both have a
 * report path, so a reader who found something wrong in Community had no
 * way to say so, and the owner had no queue to look at. This closes that.
 *
 * Signed-in only, deliberately: an anonymous report cannot be rate-limited
 * meaningfully and cannot be weighed later. The unique index in the
 * migration makes a second tap a no-op rather than a second report.
 */
const schema = z
  .object({
    postId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((r) => Boolean(r.postId) !== Boolean(r.replyId), {
    message: "Report one thing at a time.",
  });

async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-report:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json(
      { error: "Too many reports just now. Please try again shortly." },
      { status: 429 },
    );
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to report something." },
      { status: 401 },
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
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }
  const { postId, replyId, reason } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("community_reports").insert({
    post_id: postId ?? null,
    reply_id: replyId ?? null,
    reporter_id: user.id,
    reason: reason?.trim() || null,
  });

  // 23505 is the unique index: this person already reported this thing.
  // That is a success from the reader's point of view, not an error.
  if (error && error.code !== "23505") {
    console.error("[community] report failed", error.message);
    return NextResponse.json(
      { error: "Could not send that report." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
