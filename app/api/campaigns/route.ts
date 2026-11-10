import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { listBoard, startCampaign } from "@/lib/campaigns/server";
import { requestStanding } from "@/lib/community/adminStanding";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignCreateSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/**
 * The board, "Newly asked": the campaigns running now, newest first
 * (lib/campaigns/server.ts, listBoard). Each as publicCampaign() projects it:
 * never the creator's account id, never a count of anyone.
 *
 * 404 while campaigns are closed for whoever asks (lib/campaigns/opening.ts).
 */
async function handleGET(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  const board = await listBoard(createAdminClient(), { userId: who.user?.id ?? null });
  if (!board.ok) {
    return board.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The campaigns could not be read." }, { status: 500 });
  }
  return NextResponse.json(
    { campaigns: board.value.campaigns },
    {
      headers: {
        // It says which are the reader's own and leaves out those they
        // blocked, so it is one reader's list and never a shared cache's.
        "Cache-Control": "private, no-store",
        Vary: "Origin, Authorization",
      },
    },
  );
}

/**
 * Start a prayer campaign. Signed-in only: a campaign is a lasting, public
 * thing tied to a person. It is written held, and shows to everyone once a
 * moderator has read it (lib/campaigns/server.ts, startCampaign).
 */
async function handlePOST(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-create:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json({ error: "Too many campaigns just now. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const user = who.user;
  if (!user) return NextResponse.json({ error: "Sign in to start a prayer campaign." }, { status: 401 });

  const p = parsed.data;
  const started = await startCampaign(
    createAdminClient(),
    { ...user, standing: await requestStanding(req, user) },
    {
      forWhom: p.forWhom,
      kind: p.kind,
      title: p.title,
      name: p.name,
      words: p.words ?? null,
      days: p.days,
      startsOn: p.startsOn,
      prayer: p.prayer ?? null,
      consent: p.consent,
      confirmFiltered: p.confirmFiltered,
      circleId: p.circleId ?? null,
      place: p.place ? { country: p.place.country, town: p.place.town ?? null } : null,
    },
  );
  if (!started.ok) {
    return NextResponse.json(
      { error: started.error, code: started.code, preview: started.preview, limit: started.limit },
      { status: started.status },
    );
  }
  return NextResponse.json({ ok: true, id: started.id, held: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
