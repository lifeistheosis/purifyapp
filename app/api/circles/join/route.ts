import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { circlesEnabled } from "@/lib/circles/circles";
import { circleUser, memberName } from "@/lib/circles/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignGroupJoinSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read together (1.8): join a circle by its invite code, the only way in.
 * Circles are unlisted; a code read out after the Liturgy or sent in a chat
 * is the whole of their door. Only a circle that follows a path is joined
 * here (a campaign's group is joined on the campaign).
 */
async function handlePOST(req: Request) {
  if (!circlesEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`circles-join:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignGroupJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const user = await circleUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to join a circle." }, { status: 401 });

  const admin = createAdminClient();
  const { data: circle } = await admin
    .from("prayer_campaign_groups")
    .select("id, name, path_id")
    .eq("invite_code", parsed.data.inviteCode)
    .not("path_id", "is", null)
    .maybeSingle();
  if (!circle) return NextResponse.json({ error: "That code does not match a circle." }, { status: 404 });
  const found = circle as { id: string; name: string; path_id: string };

  const { error } = await admin
    .from("prayer_campaign_group_members")
    .insert({ group_id: found.id, user_id: user.id, member_name: memberName(user) });
  if (error && error.code !== "23505") {
    console.warn("[circles] join failed", error.message);
    return NextResponse.json({ error: "Couldn't join that circle. Please try again." }, { status: 500 });
  }
  if (!error) {
    await admin.rpc("prayer_campaign_group_bump_counts", { p_group_id: found.id, p_members: 1, p_prayers: 0 });
  }
  return NextResponse.json({ ok: true, id: found.id, name: found.name, pathId: found.path_id, alreadyMember: Boolean(error) });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
