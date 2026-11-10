import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { isDay, isOver } from "@/lib/campaigns/model";
import { campaignsCaller, reworkAbsent } from "@/lib/campaigns/opening";
import { mayRead, readCampaignRow } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignJoinSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/**
 * A signed-in reader's own choice for a campaign they carry: the prayers it
 * waits in, and their own last day when it is sooner than the campaign's.
 * Kept on their own join row, which only they can read, so the choice
 * follows them to another device.
 *
 * Carrying a campaign needs no account and no request at all: it is kept on
 * the device (lib/campaigns/carried.ts). This route is only for a reader who
 * is signed in. Nothing is counted here, and nothing is written when a
 * campaign is prayed: July's counters and its day log get no new rows.
 */
async function handlePOST(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-join:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignJoinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't add it." }, { status: 500 });
  const row = found.value;
  if (!row || !mayRead(row, who.user.id)) return NOT_FOUND();
  if (row.status !== "active" || isOver(row)) {
    return NextResponse.json({ error: "That campaign is not running.", code: "not_running" }, { status: 409 });
  }

  // The reader's own last day: kept only when it is a real day no later than
  // the campaign's. Anything else is the campaign's own.
  const endsOn = isDay(row.ends_on) ? row.ends_on : null;
  const until = parsed.data.until && isDay(parsed.data.until) && endsOn && parsed.data.until < endsOn ? parsed.data.until : null;

  const { error } = await admin
    .from("prayer_campaign_prayers")
    .upsert({ campaign_id: id, user_id: who.user.id, places: [...new Set(parsed.data.places)], until_on: until }, { onConflict: "campaign_id,user_id" });
  if (error) {
    if (reworkAbsent(error)) return NOT_FOUND();
    console.warn("[campaigns] join failed", error.message);
    return NextResponse.json({ error: "Couldn't add it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** The reader takes it out: their own join row goes. Whatever the campaign's state, since leaving is always allowed. */
async function handleDELETE(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-join:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NOT_FOUND();
  const { error } = await createAdminClient().from("prayer_campaign_prayers").delete().eq("campaign_id", id).eq("user_id", who.user.id);
  if (error) {
    console.warn("[campaigns] leave failed", error.message);
    return NextResponse.json({ error: "Couldn't take it out." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
