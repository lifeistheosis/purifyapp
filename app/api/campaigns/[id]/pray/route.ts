import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

async function authUser(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** `YYYY-MM-DD`, and nothing else. The client sends its own calendar day. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The reader's day key, taken from the request.
 *
 * The server cannot compute this. It has no idea what day it is where the
 * reader is standing, and getting it wrong by one day is exactly what the
 * old ~20h cooldown did. The client sends the same key
 * lib/rhythm/dayKey.ts produces for every other surface.
 *
 * It is validated but not trusted for anything more than idempotency: the
 * worst a forged key can do is let a reader mark a different day of their
 * OWN campaign row, which changes their own streak and nobody else's. The
 * community counters are bumped once per accepted call regardless, and the
 * primary key on (campaign_id, user_id, day_key) is what stops a replay.
 */
function readDayKey(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { dayKey?: unknown }).dayKey;
  if (typeof raw !== "string" || !DAY_KEY.test(raw)) return null;
  // A key more than two days from the server's own date is either a bad
  // clock or someone reaching for a day they cannot be in. Two days of slack
  // covers every real timezone (UTC-12 to UTC+14) plus a slow request.
  const asDate = Date.parse(`${raw}T12:00:00Z`);
  if (!Number.isFinite(asDate)) return null;
  const drift = Math.abs(asDate - Date.now());
  if (drift > 2 * 24 * 60 * 60 * 1000) return null;
  return raw;
}

/**
 * Mark a campaign prayed for the reader's own calendar day.
 *
 * Joins the reader if they had not joined, writes one row into the day log,
 * and bumps the campaign's counters (and their group's, if they are in one)
 * atomically through the RPCs so concurrent prayers never lose a count.
 *
 * Idempotent by construction: the day log's primary key is
 * (campaign_id, user_id, day_key), so a second call for the same day is a
 * conflict rather than a second count. That replaced a read-then-write on
 * `prayer_days`, where two concurrent taps both read the same value and both
 * wrote value+1, losing one, and two concurrent FIRST prayers both took the
 * insert branch and the loser 500'd on a primary key violation.
 */
async function handlePray(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`campaign-pray:${ipKey(req.headers)}`, 3600, 200)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to pray along." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // A body is optional for backwards compatibility with an installed app
    // that predates the day log; see the fallback below.
  }
  const dayKey =
    readDayKey(body) ??
    // An older client sends no day key. Fall back to the server's UTC date
    // rather than refusing the prayer: being off by a few hours for a reader
    // near the dateline is worse than nothing, but refusing outright would
    // break the pray button for everyone who has not updated.
    new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("prayer_campaigns")
    .select("status, ends_at")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json(
      { error: "This campaign has closed." },
      { status: 400 },
    );
  }
  // The UI hid the button on an expired campaign; the route did not enforce
  // it, so an expired campaign stayed prayable through the API forever.
  // Nothing ever flips `status` when `ends_at` passes, so this is the only
  // place the end date is real.
  if (campaign.ends_at && Date.parse(campaign.ends_at) < Date.now()) {
    return NextResponse.json(
      { error: "This campaign has finished." },
      { status: 400 },
    );
  }

  // Which group the reader prays with, if any. Read before the write so the
  // day row can record it.
  const { data: membership } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(campaign_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.campaign_id", id)
    .maybeSingle();
  const groupId = (membership?.group_id as string | undefined) ?? null;

  // The day log is the source of truth for "already prayed today". Insert
  // first and let the primary key answer, rather than checking then writing.
  const { error: dayError } = await admin
    .from("prayer_campaign_days")
    .insert({
      campaign_id: id,
      user_id: user.id,
      day_key: dayKey,
      group_id: groupId,
    });

  // 23505 is unique_violation: this reader already has this day.
  if (dayError && dayError.code === "23505") {
    return NextResponse.json({ ok: true, prayed: false, alreadyToday: true });
  }
  if (dayError) {
    console.warn("[campaigns] day log insert failed", dayError.message);
    return NextResponse.json({ error: "Couldn't record it." }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Join or refresh the membership row. `upsert` collapses the two branches
  // this used to have, and prayer_days is recomputed from the day log rather
  // than incremented, so it can no longer drift or be lost to a race.
  const { count } = await admin
    .from("prayer_campaign_days")
    .select("day_key", { count: "exact", head: true })
    .eq("campaign_id", id)
    .eq("user_id", user.id);

  const { data: existing } = await admin
    .from("prayer_campaign_prayers")
    .select("campaign_id")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const joined = !existing;

  const { error: upsertError } = await admin
    .from("prayer_campaign_prayers")
    .upsert(
      {
        campaign_id: id,
        user_id: user.id,
        last_prayed_at: now,
        prayer_days: count ?? 1,
      },
      { onConflict: "campaign_id,user_id" },
    );
  if (upsertError) {
    console.warn("[campaigns] pray upsert failed", upsertError.message);
    // The day is already logged, so the reader's streak is correct even
    // though the summary row is behind. Report success rather than asking
    // them to pray again for a day that is recorded.
  }

  await admin.rpc("prayer_campaign_bump_counts", {
    p_id: id,
    p_praying: joined ? 1 : 0,
    p_prayer: 1,
  });
  if (groupId) {
    await admin.rpc("prayer_campaign_group_bump_counts", {
      p_group_id: groupId,
      p_members: 0,
      p_prayers: 1,
    });
  }

  return NextResponse.json({
    ok: true,
    prayed: true,
    joined,
    dayKey,
    totalDays: count ?? 1,
  });
}

/** Leave a campaign: remove it from the user's prayers, decrement the people
 *  count. Prayers already offered stay on the campaign's total, and so does
 *  the day log, so rejoining later restores the reader's history instead of
 *  resetting them to day one. */
async function handleLeave(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  // Every sibling route carries a limit and this one did not, so an
  // authenticated caller could loop join/leave against the counter RPC.
  if (await rateLimited(`campaign-leave:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const admin = createAdminClient();
  const { data: removed, error } = await admin
    .from("prayer_campaign_prayers")
    .delete()
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .select("campaign_id");
  if (error) {
    console.warn("[campaigns] leave failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
  if (removed && removed.length > 0) {
    await admin.rpc("prayer_campaign_bump_counts", {
      p_id: id,
      p_praying: -1,
      p_prayer: 0,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handlePray(req, id), req);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handleLeave(req, id), req);
}

export const OPTIONS = corsPreflight;
