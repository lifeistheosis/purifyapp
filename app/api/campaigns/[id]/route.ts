import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { getCampaign } from "@/lib/campaigns/catalog";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignStatusSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/** Read one campaign (public, RLS-scoped). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!campaignsEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  return withCors(
    NextResponse.json(
      { campaign },
      { headers: { "Cache-Control": "public, max-age=15" } },
    ),
    req,
  );
}

/** Creator closes their own campaign: answered (thanksgiving) or memory
 *  eternal (a departed soul). Only the creator may, and only from active. */
async function handlePATCH(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("prayer_campaigns")
    .select("creator_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (row.creator_id !== user.id) {
    return NextResponse.json(
      { error: "Only the person who started a campaign can close it." },
      { status: 403 },
    );
  }
  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.warn("[campaigns] status update failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handlePATCH(req, id), req);
}

/**
 * Creator takes their own campaign down for good.
 *
 * This is the takedown path, and it matters more than closing does: title,
 * note, subject_name and now an image publish instantly under a public read
 * policy. Without this, someone who typed a full name or a diagnosis, or
 * attached a picture they regret, has no recourse but to report themselves
 * and wait for a moderator.
 *
 * Sets status='removed' (which the public read layer already filters out)
 * rather than deleting the row, so the join rows and their counters cascade
 * predictably, and deletes the storage object so the photo does not stay
 * reachable at its URL.
 */
async function handleDELETE(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`campaign-delete:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("prayer_campaigns")
    .select("creator_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (row.creator_id !== user.id) {
    return NextResponse.json(
      { error: "Only the person who started a campaign can take it down." },
      { status: 403 },
    );
  }

  // Read the image separately so a missing image_url column (migration not yet
  // applied) never blocks a takedown.
  let imageUrl: string | null = null;
  const { data: imageRow } = await admin
    .from("prayer_campaigns")
    .select("image_url")
    .eq("id", id)
    .maybeSingle<{ image_url: string | null }>();
  if (imageRow) imageUrl = imageRow.image_url;

  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.warn("[campaigns] delete failed", error.message);
    return NextResponse.json({ error: "Couldn't take it down." }, { status: 500 });
  }

  if (imageUrl) {
    const marker = "/storage/v1/object/public/campaign-media/";
    const at = imageUrl.indexOf(marker);
    if (at !== -1) {
      const path = decodeURIComponent(imageUrl.slice(at + marker.length).split("?")[0]);
      if (path && !path.includes("..")) {
        const { error: delError } = await admin.storage
          .from("campaign-media")
          .remove([path]);
        if (delError) {
          console.warn("[campaigns] image not deleted", path, delError.message);
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
