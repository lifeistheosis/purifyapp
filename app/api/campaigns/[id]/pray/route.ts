import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { canPrayAgain } from "@/lib/campaigns/campaigns";
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

/**
 * Mark a campaign prayed. Joins the user if they had not joined, then records
 * the prayer once per day (the ~20h gate in canPrayAgain). The campaign's
 * counters are bumped atomically through the RPC so concurrent prayers never
 * lose a count.
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

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("prayer_campaigns")
    .select("status")
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

  const { data: existing } = await admin
    .from("prayer_campaign_prayers")
    .select("last_prayed_at, prayer_days")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await admin.from("prayer_campaign_prayers").insert({
      campaign_id: id,
      user_id: user.id,
      last_prayed_at: now,
      prayer_days: 1,
    });
    if (error) {
      console.warn("[campaigns] join+pray failed", error.message);
      return NextResponse.json({ error: "Couldn't record it." }, { status: 500 });
    }
    await admin.rpc("prayer_campaign_bump_counts", {
      p_id: id,
      p_praying: 1,
      p_prayer: 1,
    });
    return NextResponse.json({ ok: true, prayed: true, joined: true });
  }

  if (!canPrayAgain(existing.last_prayed_at)) {
    return NextResponse.json({ ok: true, prayed: false, alreadyToday: true });
  }

  const { error } = await admin
    .from("prayer_campaign_prayers")
    .update({ last_prayed_at: now, prayer_days: (existing.prayer_days ?? 0) + 1 })
    .eq("campaign_id", id)
    .eq("user_id", user.id);
  if (error) {
    console.warn("[campaigns] pray update failed", error.message);
    return NextResponse.json({ error: "Couldn't record it." }, { status: 500 });
  }
  await admin.rpc("prayer_campaign_bump_counts", {
    p_id: id,
    p_praying: 0,
    p_prayer: 1,
  });
  return NextResponse.json({ ok: true, prayed: true });
}

/** Leave a campaign: remove it from the user's prayers, decrement the people
 *  count. Prayers already offered stay on the campaign's total. */
async function handleLeave(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
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
