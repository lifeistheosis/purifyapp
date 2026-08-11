// A daily reminder for one campaign the reader has joined.
//
// PUT -> set or clear it. There is no POST/DELETE pair because this is one
// setting with two states, and a reader turning it off must not have to send
// a time back.
//
// Default off, always. Joining a campaign never switches this on, and
// nothing else may either. CONTRIBUTING's bar on reminders is explicit that
// the reader asks or it does not happen, and that it has to be reachable
// from the surface it appears on, which is why this lives on the campaign
// page rather than three levels into settings.
//
// The reminder itself is delivered by the existing hourly cron
// (app/api/cron/push-deliver) using the same local-hour match as the morning
// and evening rules. This route only records the intent.

import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { rateLimited } from "@/lib/security/ratelimit";
import { campaignRemindSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

async function handlePUT(req: Request, id: string) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignRemindSchema.safeParse(body);
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
  if (await rateLimited(`campaign-remind:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();

  // Only for a campaign the reader has actually joined. A reminder for
  // something they are not praying is a notification they never asked for.
  const { data: joined } = await admin
    .from("prayer_campaign_prayers")
    .select("campaign_id")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!joined) {
    return NextResponse.json(
      { error: "Join this campaign first." },
      { status: 409 },
    );
  }

  const enabled = parsed.data.enabled;
  const { error } = await admin
    .from("prayer_campaign_prayers")
    .update({
      remind_enabled: enabled,
      // Clearing the time when the reminder goes off keeps the cron's scan
      // honest: a row with a time but disabled is a trap for the next reader
      // of this code.
      remind_time: enabled ? (parsed.data.time ?? "08:00") : null,
    })
    .eq("campaign_id", id)
    .eq("user_id", user.id);

  if (error) {
    console.warn("[campaigns] reminder update failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handlePUT(req, id), req);
}

export const OPTIONS = corsPreflight;
