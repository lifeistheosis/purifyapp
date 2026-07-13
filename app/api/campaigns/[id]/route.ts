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

export const OPTIONS = corsPreflight;
