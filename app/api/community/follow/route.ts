import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { blockedBy, insertNotifications } from "@/lib/community/notify";
import { actorOf, handleFrom, notYet, signedInUser } from "@/lib/community/social";
import { profileIdByHandle } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Follow or unfollow a reader, by @handle.
 *
 * Follows live in community_follows behind the service role
 * (20261002000000_community_social.sql): no reader can list anyone's follows.
 * Following is quiet for the person followed only when they have blocked
 * you; otherwise they hear about it once, on the follow itself.
 */
const schema = z.object({
  handle: z.string().max(40),
  follow: z.boolean(),
});

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to follow readers." }, { status: 401 });
  if (await rateLimited(`community-follow:${user.id}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many changes just now. Please try again shortly." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  const handle = parsed.success ? handleFrom(parsed.data.handle) : null;
  if (!parsed.success || !handle) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const target = await profileIdByHandle(admin, handle);
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (target === user.id) return NextResponse.json({ error: "That is you." }, { status: 400 });

  if (!parsed.data.follow) {
    const { error } = await admin
      .from("community_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", target);
    if (error) {
      if (notYet(error)) return NextResponse.json({ error: "Following opens soon.", code: "unavailable" }, { status: 409 });
      return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, following: false });
  }

  const { error } = await admin.from("community_follows").insert({ follower_id: user.id, followee_id: target });
  if (error && error.code !== "23505") {
    if (notYet(error)) return NextResponse.json({ error: "Following opens soon.", code: "unavailable" }, { status: 409 });
    console.warn("[community] follow failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  // A new follow, not a repeat: tell them, unless they have blocked you.
  if (!error && !(await blockedBy(admin, [target], user.id)).has(target)) {
    const actor = await actorOf(admin, user);
    await insertNotifications(admin, [
      { user_id: target, kind: "follow", actor_name: actor.name, actor_handle: actor.handle },
    ]);
  }
  return NextResponse.json({ ok: true, following: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
