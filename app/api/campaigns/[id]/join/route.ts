import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { isDay, isJulyRow, isOver } from "@/lib/campaigns/model";
import { CAMPAIGN_NOTICES } from "@/lib/campaigns/noticesOn";
import { campaignsCaller, reworkAbsent } from "@/lib/campaigns/opening";
import { mayOpen, readCampaignRow } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignJoinSchema, campaignTellSchema } from "@/lib/security/schemas";
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
  if (!row || !(await mayOpen(admin, row, who.user.id))) return NOT_FOUND();
  // One of July's is its creator's to open and to take down, and runs for nobody.
  if (row.status !== "active" || isOver(row) || isJulyRow(row)) {
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

/**
 * A reader who carries a campaign asks to be told of its updates, or stops
 * asking (lib/campaigns/notices.ts). Off until asked: joining never turns it
 * on, and this is the only way it is turned on. It is their own row and
 * their own choice, so it is written only where their account already
 * carries the campaign; a campaign carried on the device alone has no row to
 * ask on, and the screen offers no line for it.
 *
 * Not a request at all while the campaigns' notices are off
 * (lib/campaigns/noticesOn.ts): nobody is kept a promise the app would not
 * keep.
 */
async function handlePATCH(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open || !CAMPAIGN_NOTICES) return NOT_FOUND();
  if (await rateLimited(`campaign-join:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignTellSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NOT_FOUND();

  const { data, error } = await createAdminClient()
    .from("prayer_campaign_prayers")
    .update({ notify_updates: parsed.data.tellMe })
    .eq("campaign_id", id)
    .eq("user_id", who.user.id)
    .select("campaign_id");
  if (error) {
    if (reworkAbsent(error)) return NOT_FOUND();
    console.warn("[campaigns] tell-me failed", error.message);
    return NextResponse.json({ error: "Couldn't keep that." }, { status: 500 });
  }
  // No row of theirs: their account does not carry it, so there is nothing to ask on.
  if (!data || data.length === 0) return NextResponse.json({ error: "Add it to your prayers first.", code: "not_carried" }, { status: 409 });
  return NextResponse.json({ ok: true, tellMe: parsed.data.tellMe });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handlePATCH(req, id), req);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
