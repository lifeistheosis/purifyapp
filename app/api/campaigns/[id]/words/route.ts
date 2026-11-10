import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { changeCampaign } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignChangeSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Its creator changes a campaign's title, name and words while it still
 * waits for its first read (lib/campaigns/server.ts, changeCampaign, which
 * says what is held and why a campaign a moderator has read is not changed).
 *
 * Signed-in only, and 404 while campaigns are closed for whoever asks
 * (lib/campaigns/opening.ts). A campaign that is not there and one that is
 * someone else's answer alike.
 */
async function handlePOST(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`campaign-change:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const p = parsed.data;
  const changed = await changeCampaign(createAdminClient(), who.user, id, {
    title: p.title,
    name: p.name,
    words: p.words ?? null,
    confirmFiltered: p.confirmFiltered,
  });
  if (!changed.ok) {
    return NextResponse.json({ error: changed.error, code: changed.code, preview: changed.preview }, { status: changed.status });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export const OPTIONS = corsPreflight;
