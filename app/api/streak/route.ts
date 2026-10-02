import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { signedInUser } from "@/lib/community/social";
import { rateLimited } from "@/lib/security/ratelimit";
import { ackSave, refreshStreak } from "@/lib/streak/server";
import { validZone } from "@/lib/streak/zone";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in reader's streak (lib/streak, 20261006).
 *
 * GET ?tz=<IANA zone> walks their ledger, stores the result for their
 * profile, and answers the streak as it stands today in that zone. The saves
 * are never in the answer: only `saved`, true while a save has covered a
 * missed day the reader has not yet been told about.
 *
 * POST { seen: true } records that they were told.
 *
 * Authenticated by cookie or Bearer (the phone apps), with CORS, like every
 * route the apps call.
 */

const NO_STORE = { "Cache-Control": "no-store" };

async function get(req: Request): Promise<NextResponse> {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to keep a streak." }, { status: 401, headers: NO_STORE });
  if (await rateLimited(`streak:${user.id}`, 60, 40)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: NO_STORE });
  }
  const tz = validZone(new URL(req.url).searchParams.get("tz"));
  const answer = await refreshStreak(createAdminClient(), user.id, tz);
  return NextResponse.json(answer, { headers: NO_STORE });
}

const seenSchema = z.object({ seen: z.literal(true) });

async function post(req: Request): Promise<NextResponse> {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to keep a streak." }, { status: 401 });
  if (await rateLimited(`streak-seen:${user.id}`, 60, 20)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const parsed = seenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  await ackSave(createAdminClient(), user.id);
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(get);
export const POST = corsRoute(post);
export const OPTIONS = corsPreflight;
