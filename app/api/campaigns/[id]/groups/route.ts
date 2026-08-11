// Parish groups inside one campaign.
//
// GET  -> the caller's own group for this campaign, with its roster, or null.
// POST -> start a group and become its first member.
//
// There is deliberately no "list all groups" here. A group is unlisted: the
// invite code is the only way in, because a parish group is not a public
// space and a directory would let anyone enumerate which parishes are
// praying for what. The GET returns only a group the caller already belongs
// to, which is also the only case where the invite code is disclosed.

import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { makeInviteCode } from "@/lib/campaigns/groups";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignGroupCreateSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

async function authUser(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The display name to record on the roster, from the reader's own metadata. */
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

async function handleGET(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await authUser(req);
  if (!user) {
    // Not an error: a signed-out reader simply has no group.
    return NextResponse.json({ group: null, members: [] });
  }

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(campaign_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.campaign_id", id)
    .maybeSingle();

  const groupId = (membership?.group_id as string | undefined) ?? null;
  if (!groupId) {
    return NextResponse.json({ group: null, members: [] });
  }

  const { data: group, error } = await admin
    .from("prayer_campaign_groups")
    .select(
      "id, campaign_id, name, invite_code, member_count, prayer_count, created_at",
    )
    .eq("id", groupId)
    .maybeSingle();

  // Absent table (migration not yet applied) reads as "no group" rather than
  // an error, so the campaign page keeps working before this ships.
  if (error || !group) {
    return NextResponse.json({ group: null, members: [] });
  }

  const { data: members } = await admin
    .from("prayer_campaign_group_members")
    .select("user_id, member_name, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true })
    .limit(500);

  return NextResponse.json({ group, members: members ?? [] });
}

async function handlePOST(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`campaign-group-new:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many groups just now. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignGroupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const user = await authUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to start a group." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("prayer_campaigns")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!campaign || campaign.status === "removed") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // One group per reader per campaign. Belonging to two would make "your
  // group's total" ambiguous and give the pray route no single group to
  // credit.
  const { data: already } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(campaign_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.campaign_id", id)
    .maybeSingle();
  if (already) {
    return NextResponse.json(
      { error: "You are already praying with a group here." },
      { status: 409 },
    );
  }

  // Retry on the unique index rather than pre-checking: a SELECT then INSERT
  // is a race, and the index is the only thing that can actually answer.
  let created: { id: string; invite_code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const inviteCode = makeInviteCode((max) => randomInt(max));
    const { data, error } = await admin
      .from("prayer_campaign_groups")
      .insert({
        campaign_id: id,
        creator_id: user.id,
        name: parsed.data.name.trim(),
        invite_code: inviteCode,
        member_count: 1,
      })
      .select("id, invite_code")
      .single();
    if (data) {
      created = data;
      break;
    }
    if (error && error.code !== "23505") {
      console.warn("[campaigns] group create failed", error.message);
      return NextResponse.json(
        { error: "Couldn't start that group. Please try again." },
        { status: 500 },
      );
    }
  }

  if (!created) {
    return NextResponse.json(
      { error: "Couldn't start that group. Please try again." },
      { status: 500 },
    );
  }

  const { error: memberError } = await admin
    .from("prayer_campaign_group_members")
    .insert({
      group_id: created.id,
      user_id: user.id,
      member_name: displayName(user),
    });
  if (memberError) {
    // The group exists but its creator is not in it, which would leave an
    // orphan nobody can reach. Remove it rather than leaving the wreckage.
    await admin.from("prayer_campaign_groups").delete().eq("id", created.id);
    console.warn("[campaigns] group creator join failed", memberError.message);
    return NextResponse.json(
      { error: "Couldn't start that group. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    inviteCode: created.invite_code,
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handleGET(req, id), req);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export const OPTIONS = corsPreflight;
