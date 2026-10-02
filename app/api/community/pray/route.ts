import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { blockedBy, insertNotifications } from "@/lib/community/notify";
import { actorOf, handleFrom, notYet, signedInUser } from "@/lib/community/social";
import { activePrayerRequest, loadProfileRow } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I prayed", in answer to a reader's "pray for me".
 *
 * There is no text on either side: the reader asks with a button and others
 * answer with one, so there is nothing to moderate and nothing private made
 * public. One answer per reader per request (profile_prayers' primary key);
 * the reader asking hears about each new one. Answers with the count.
 */
const schema = z.object({ handle: z.string().max(40) });

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`community-pray:${user.id}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many just now." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  const handle = parsed.success ? handleFrom(parsed.data.handle) : null;
  if (!handle) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { handle });
  if (!row || row === "unavailable" || row.profile_private) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.id === user.id) return NextResponse.json({ error: "That is you." }, { status: 400 });
  const request = activePrayerRequest(row);
  if (!request) return NextResponse.json({ error: "They are not asking just now.", code: "no_request" }, { status: 409 });

  const { error } = await admin
    .from("profile_prayers")
    .insert({ owner_id: row.id, prayer_id: user.id, request_at: request });
  if (error && error.code !== "23505") {
    if (notYet(error)) return NextResponse.json({ error: "This opens soon.", code: "unavailable" }, { status: 409 });
    console.warn("[community] prayer failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  if (!error && !(await blockedBy(admin, [row.id], user.id)).has(row.id)) {
    const actor = await actorOf(admin, user);
    await insertNotifications(admin, [
      { user_id: row.id, kind: "prayed", actor_name: actor.name, actor_handle: actor.handle },
    ]);
  }
  const { count } = await admin
    .from("profile_prayers")
    .select("prayer_id", { count: "exact", head: true })
    .eq("owner_id", row.id)
    .eq("request_at", request);
  return NextResponse.json({ ok: true, count: count ?? 0 });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
