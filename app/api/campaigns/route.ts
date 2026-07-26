import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { isIntention, isPrayerKey } from "@/lib/campaigns/campaigns";
import { listCampaigns } from "@/lib/campaigns/catalog";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignCreateSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/** List prayer campaigns (public, RLS-scoped to non-removed). Active only
 *  unless ?closed=1. Optional ?intention= filter. */
export async function GET(req: Request) {
  if (!campaignsEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const url = new URL(req.url);
  const intentionParam = url.searchParams.get("intention");
  const intention = isIntention(intentionParam) ? intentionParam : undefined;
  const includeClosed = url.searchParams.get("closed") === "1";
  const campaigns = await listCampaigns({ intention, includeClosed });
  return withCors(
    NextResponse.json(
      { campaigns },
      { headers: { "Cache-Control": "public, max-age=30" } },
    ),
    req,
  );
}

/**
 * Create a prayer campaign. Signed-in only (the creator owns it). Anonymous is
 * not allowed here, unlike an icon request: a campaign is a lasting, joinable
 * thing tied to a person. The server sets every counter and workflow column;
 * the client only proposes the human fields, validated by zod.
 */
async function handlePOST(req: Request) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`campaign-create:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many campaigns just now. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to start a prayer campaign." },
      { status: 401 },
    );
  }

  // The departed intention always concerns the departed, whatever the toggle said.
  const forWhom = data.intention === "departed" ? "departed" : data.forWhom;
  // An unknown or absent prayer key falls back to the intention default at read.
  const prayerKey = isPrayerKey(data.prayerKey) ? data.prayerKey : null;
  // Ongoing when no duration is chosen; otherwise now + the chosen day-count.
  const endsAt = data.durationDays
    ? new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // A picture on a public page is its own affirmation, so it is gated
  // separately from the blessing clickwrap rather than folded into it.
  const imageUrl = data.imageUrl?.trim() || null;
  if (imageUrl && data.photoConsent !== true) {
    return NextResponse.json(
      { error: "Please confirm you may share this picture." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // Typed loosely on purpose: image_url is only present once
  // 20260725_prayer_campaign_image.sql has been applied, and supabase-js's
  // generated insert type rejects the column until then.
  const row: Record<string, unknown> = {
    creator_id: user.id,
    title: data.title.trim(),
    intention: data.intention,
    for_whom: forWhom,
    subject_name: data.subjectName?.trim() || null,
    note: data.note?.trim() || null,
    prayer_key: prayerKey,
    ends_at: endsAt,
  };
  const insert = (payload: Record<string, unknown>) =>
    admin.from("prayer_campaigns").insert(payload).select("id").single();

  // image_url is dropped when its migration has not been applied, so a
  // campaign still gets created (without the picture) instead of 500ing.
  let { data: created, error } = await insert(
    imageUrl ? { ...row, image_url: imageUrl } : row,
  );
  if (error && imageUrl && /image_url/i.test(error.message)) {
    console.warn("[campaigns] image_url column missing; creating without it");
    ({ data: created, error } = await insert(row));
  }
  if (error || !created) {
    console.warn("[campaigns] create failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't start your campaign. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: created.id });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
