import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { CAMPAIGN_BUCKET, campaignImage } from "@/lib/campaigns/image";
import { isJulyRow } from "@/lib/campaigns/model";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { forReader, hiddenFor, mayRead, readCampaignRow } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignStatusSchema } from "@/lib/security/schemas";
import { removeOwnedUpload } from "@/lib/security/uploadOwners";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });
const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };

/**
 * One campaign, for its page. Who may read it is lib/campaigns/server.ts,
 * mayRead: a held one is its creator's alone, a removed one nobody's, and
 * one whose creator this reader has blocked is not there for them. What they
 * are handed is publicCampaign()'s projection, with whether they started it.
 */
async function handleGET(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The campaign could not be read." }, { status: 500 });
  const row = found.value;
  const userId = who.user?.id ?? null;
  if (!row || !mayRead(row, userId)) return NOT_FOUND();
  if (userId && row.creator_id !== userId && (await hiddenFor(admin, userId)).includes(row.creator_id)) return NOT_FOUND();
  return NextResponse.json({ campaign: forReader(row, userId) }, { headers: PRIVATE });
}

/**
 * The creator closes their own campaign early, with one of the two closings
 * July had ("Answered, glory to God" and "Memory eternal"), or chooses
 * whether it stays on their profile once it has ended. Only the creator, and
 * a closing only from a campaign that is running.
 */
async function handlePATCH(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-status:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  const row = found.value;
  if (!row || row.status === "removed") return NOT_FOUND();
  if (row.creator_id !== who.user.id) {
    return NextResponse.json({ error: "Only the person who started a campaign can change it." }, { status: 403 });
  }
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (parsed.data.status) {
    // One of July's is not running, whatever its row says (lib/campaigns/model.ts, isJulyRow).
    if (row.status !== "active" || isJulyRow(row)) return NextResponse.json({ error: "That campaign is not running.", code: "not_running" }, { status: 409 });
    patch.status = parsed.data.status;
    patch.ended_at = now;
  }
  if (parsed.data.keepAfterEnd !== undefined) patch.keep_after_end = parsed.data.keepAfterEnd;
  // Closing comments stops new ones; those already written stay (his yes to item 126).
  if (parsed.data.commentsOpen !== undefined) patch.comments_open = parsed.data.commentsOpen;
  // Its creator can keep it out of "Prayed by many" (his yes to item 118).
  if (parsed.data.listed !== undefined) patch.listed = parsed.data.listed;
  const { error } = await admin.from("prayer_campaigns").update(patch).eq("id", id);
  if (error) {
    console.warn("[campaigns] update failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * The creator takes their own campaign down for good.
 *
 * This is the way out for someone who typed more than they meant to, and it
 * deletes: the row goes, and with it the readers' join rows and its reports
 * (the tables cascade). July marked the row removed and kept it. Those who
 * carry it let go the next time their app is online, when the state route
 * answers "gone" (app/api/campaigns/state).
 *
 * A July campaign's one picture is deleted with it, but only a picture that
 * is provably the creator's own upload: the row's URL was once accepted from
 * the client with nothing but a host check, so it could name another
 * reader's file.
 */
async function handleDELETE(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-delete:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't take it down." }, { status: 500 });
  const row = found.value;
  if (!row) return NOT_FOUND();
  if (row.creator_id !== who.user.id) {
    return NextResponse.json({ error: "Only the person who started a campaign can take it down." }, { status: 403 });
  }

  // Read the picture on its own, so a column that is not there never blocks a takedown.
  let imageUrl: string | null = null;
  const { data: imageRow } = await admin.from("prayer_campaigns").select("image_url").eq("id", id).maybeSingle<{ image_url: string | null }>();
  if (imageRow) imageUrl = imageRow.image_url;

  const { error } = await admin.from("prayer_campaigns").delete().eq("id", id).eq("creator_id", who.user.id);
  if (error) {
    console.warn("[campaigns] delete failed", error.message);
    return NextResponse.json({ error: "Couldn't take it down." }, { status: 500 });
  }
  await removeOwnedUpload(admin, CAMPAIGN_BUCKET, campaignImage(imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""), who.user.id);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handleGET(req, id), req);
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
