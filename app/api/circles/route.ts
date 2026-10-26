import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { makeInviteCode } from "@/lib/campaigns/groups";
import { circlesEnabled, readByDay, type Circle, type CircleKind } from "@/lib/circles/circles";
import { circleUser, memberName, one } from "@/lib/circles/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { circleCreateSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read together (1.8): the reader's circles on a reading path, and a new
 * circle. Circles are the August parish groups, following a path instead of
 * (or as well as) a campaign (lib/circles/circles.ts). Every read and write
 * runs with the service role, so membership is proved here with the
 * caller's own token, never taken from the request.
 */

const PATH = /^[a-z0-9-]{1,40}$/;
const PRIVATE = { "Cache-Control": "private, no-store" };

type GroupRow = { id: string; name: string; kind: CircleKind; invite_code: string; path_id: string | null };

/** GET ?path=<id>: the circles the reader keeps on that path, with their members and who read each day. */
async function handleGET(req: Request) {
  if (!circlesEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const pathId = new URL(req.url).searchParams.get("path") ?? "";
  if (!PATH.test(pathId)) return NextResponse.json({ error: "Which path?" }, { status: 400 });
  const user = await circleUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to read together." }, { status: 401 });
  if (await rateLimited(`circles-list:${user.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: mine, error } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(id, name, kind, invite_code, path_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.path_id", pathId);
  if (error) {
    console.warn("[circles] list failed", error.message);
    return NextResponse.json({ error: "Couldn't load your circles." }, { status: 500 });
  }
  const groups = (mine ?? [])
    .map((r) => one((r as { prayer_campaign_groups: GroupRow | GroupRow[] }).prayer_campaign_groups))
    .filter((g): g is GroupRow => Boolean(g));
  if (!groups.length) return NextResponse.json({ circles: [] }, { headers: PRIVATE });

  const ids = groups.map((g) => g.id);
  const [{ data: members }, { data: days }] = await Promise.all([
    admin.from("prayer_campaign_group_members").select("group_id, user_id, member_name").in("group_id", ids),
    admin.from("group_path_days").select("group_id, user_id, day").in("group_id", ids),
  ]);
  const memberRows = (members ?? []) as { group_id: string; user_id: string; member_name: string }[];
  const dayRows = (days ?? []) as { group_id: string; user_id: string; day: number }[];

  const circles: Circle[] = groups.map((g) => {
    const inThis = memberRows.filter((m) => m.group_id === g.id);
    return {
      id: g.id,
      name: g.name,
      kind: g.kind,
      inviteCode: g.invite_code,
      members: inThis
        .map((m) => ({ name: m.member_name, you: m.user_id === user.id }))
        .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
      read: readByDay(
        dayRows.filter((d) => d.group_id === g.id),
        inThis,
      ),
    };
  });
  return NextResponse.json({ circles }, { headers: PRIVATE });
}

/** POST { name, kind, pathId }: a new circle on a path, its creator its first member. */
async function handlePOST(req: Request) {
  if (!circlesEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = circleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const user = await circleUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to start a circle." }, { status: 401 });
  if (await rateLimited(`circles-create:${user.id}`, 3600, 10)) {
    return NextResponse.json({ error: "Too many circles at once. Try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  // Retry on the unique index rather than pre-checking: the index is the only
  // thing that can answer whether a code is free (as the campaign groups do).
  let created: { id: string; invite_code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const { data, error } = await admin
      .from("prayer_campaign_groups")
      .insert({
        campaign_id: null,
        creator_id: user.id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        path_id: parsed.data.pathId,
        path_started_on: new Date().toISOString().slice(0, 10),
        invite_code: makeInviteCode((max) => randomInt(max)),
        member_count: 1,
      })
      .select("id, invite_code")
      .single();
    if (data) created = data as { id: string; invite_code: string };
    else if (error && error.code !== "23505") {
      console.warn("[circles] create failed", error.message);
      return NextResponse.json({ error: "Couldn't start that circle. Please try again." }, { status: 500 });
    }
  }
  if (!created) return NextResponse.json({ error: "Couldn't start that circle. Please try again." }, { status: 500 });

  const { error: memberError } = await admin
    .from("prayer_campaign_group_members")
    .insert({ group_id: created.id, user_id: user.id, member_name: memberName(user) });
  if (memberError) {
    // A circle its creator is not in could never be reached: take it away again.
    await admin.from("prayer_campaign_groups").delete().eq("id", created.id);
    console.warn("[circles] creator join failed", memberError.message);
    return NextResponse.json({ error: "Couldn't start that circle. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: created.id, inviteCode: created.invite_code });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
