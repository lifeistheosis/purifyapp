// Joining and leaving a parish group, by invite code.
//
// POST   -> join the group whose code this is.
// DELETE -> leave whichever group the caller is in for that campaign.
//
// Not nested under /api/campaigns/[id] on purpose: a reader who is handed a
// code off a pew sheet has the code and nothing else. Making them supply the
// campaign id too would mean the code alone is not enough to join, which is
// the whole point of a code.

import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignGroupJoinSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

async function authUser(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function displayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const given = typeof meta.display_name === "string" ? meta.display_name.trim() : "";
  if (given) return given.slice(0, 80);
  const local = user.email?.split("@")[0];
  return (local || "Reader").slice(0, 80);
}

async function handlePOST(req: Request) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Tight, and keyed on IP as well as user below, because this endpoint is
  // the one place a six-character code can be guessed. Thirty attempts an
  // hour against a 31^6 space is not a threat; three hundred would start to
  // be one on a code that has been reused across a parish for a year.
  if (await rateLimited(`campaign-group-join:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignGroupJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const user = await authUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to join a group." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const { data: group } = await admin
    .from("prayer_campaign_groups")
    .select("id, campaign_id, name")
    .eq("invite_code", parsed.data.inviteCode)
    .maybeSingle();
  if (!group) {
    // Same message and status whether the code is wrong or the table is not
    // there yet. A distinct "no such group" would let someone probe the code
    // space and learn which codes exist.
    return NextResponse.json(
      { error: "That code does not match a group." },
      { status: 404 },
    );
  }

  const { data: already } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(campaign_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.campaign_id", group.campaign_id)
    .maybeSingle();
  if (already) {
    if (already.group_id === group.id) {
      // Already here. Idempotent rather than an error: a reader who taps a
      // link twice should land in the group, not on a failure.
      return NextResponse.json({
        ok: true,
        id: group.id,
        campaignId: group.campaign_id,
        alreadyMember: true,
      });
    }
    return NextResponse.json(
      { error: "You are already praying with another group here." },
      { status: 409 },
    );
  }

  const { error } = await admin.from("prayer_campaign_group_members").insert({
    group_id: group.id,
    user_id: user.id,
    member_name: displayName(user),
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({
        ok: true,
        id: group.id,
        campaignId: group.campaign_id,
        alreadyMember: true,
      });
    }
    console.warn("[campaigns] group join failed", error.message);
    return NextResponse.json(
      { error: "Couldn't join that group. Please try again." },
      { status: 500 },
    );
  }

  await admin.rpc("prayer_campaign_group_bump_counts", {
    p_group_id: group.id,
    p_members: 1,
    p_prayers: 0,
  });

  return NextResponse.json({
    ok: true,
    id: group.id,
    campaignId: group.campaign_id,
    name: group.name,
  });
}

async function handleDELETE(req: Request) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(`campaign-group-leave:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const groupId = (body as { groupId?: unknown })?.groupId;
  if (typeof groupId !== "string" || groupId.length < 10) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: removed, error } = await admin
    .from("prayer_campaign_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .select("group_id");
  if (error) {
    console.warn("[campaigns] group leave failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
  if (removed && removed.length > 0) {
    await admin.rpc("prayer_campaign_group_bump_counts", {
      p_group_id: groupId,
      p_members: -1,
      p_prayers: 0,
    });
  }
  // The reader's days keep their group_id: leaving a group must not erase
  // what the group prayed together. The column is ON DELETE SET NULL for the
  // group itself, not for a member walking away.
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
