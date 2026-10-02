import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { notYet, signedInUser } from "@/lib/community/social";
import { textHasListedWord } from "@/lib/moderation/server";
import { CLERGY_EVIDENCE_MAX, CLERGY_RANKS, CLERGY_TEXT_MAX, isClergyRank, type MyClergy } from "@/lib/profile/clergy";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Asking for the verified clergy seal (clergy_verifications, 20261005).
 *
 * GET   the reader's own request and its state.
 * POST  ask, or ask again after a decline: rank, jurisdiction, parish, and
 *       how the team can check (a parish page, a diocese listing, a phone
 *       number). The team decides in the admin console; nothing here can
 *       grant the seal, and a reader already verified cannot change what the
 *       team verified by asking again.
 */

const schema = z.object({
  rank: z.enum(CLERGY_RANKS),
  jurisdiction: z.string().trim().min(2).max(CLERGY_TEXT_MAX),
  parish: z.string().trim().max(CLERGY_TEXT_MAX).optional().nullable(),
  evidence: z.string().trim().min(10).max(CLERGY_EVIDENCE_MAX),
});

function shape(row: { status: string; rank: string | null; jurisdiction: string | null; parish: string | null; note: string | null } | null): MyClergy {
  if (!row) return { status: "none", rank: null, jurisdiction: null, parish: null, note: null };
  const status = row.status === "verified" || row.status === "declined" || row.status === "requested" ? row.status : "none";
  return {
    status,
    rank: isClergyRank(row.rank) ? row.rank : null,
    jurisdiction: row.jurisdiction,
    parish: row.parish,
    note: status === "declined" ? row.note : null,
  };
}

async function handleGET(req: Request) {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clergy_verifications")
    .select("status, rank, jurisdiction, parish, note")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (notYet(error)) return NextResponse.json({ clergy: shape(null), open: false });
    return NextResponse.json({ error: "Could not read your request." }, { status: 500 });
  }
  return NextResponse.json({ clergy: shape(data as never), open: true }, { headers: { "Cache-Control": "private, no-store" } });
}

async function handlePOST(req: Request) {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`clergy-request:${user.id}`, 86400, 5)) {
    return NextResponse.json({ error: "You have asked a few times today. The team will be in touch." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in your rank, jurisdiction, and how we can check.", code: "invalid" }, { status: 400 });
  }
  const p = parsed.data;
  const admin = createAdminClient();
  if (await textHasListedWord(admin, p.jurisdiction, p.parish, p.evidence)) {
    return NextResponse.json({ error: "Some words here aren't allowed.", code: "filtered" }, { status: 400 });
  }

  const { data: existing, error: readError } = await admin.from("clergy_verifications").select("status").eq("user_id", user.id).maybeSingle();
  if (readError) {
    if (notYet(readError)) return NextResponse.json({ error: "This opens soon.", code: "unavailable" }, { status: 409 });
    return NextResponse.json({ error: "Could not send your request." }, { status: 500 });
  }
  if ((existing as { status?: string } | null)?.status === "verified") {
    return NextResponse.json({ error: "You are already verified. Write to the team to change the details.", code: "verified" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("clergy_verifications")
    .upsert(
      {
        user_id: user.id,
        status: "requested",
        rank: p.rank,
        jurisdiction: p.jurisdiction,
        parish: p.parish?.trim() || null,
        evidence: p.evidence,
        requested_at: now,
        decided_at: null,
        decided_by: null,
        note: null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("status, rank, jurisdiction, parish, note")
    .single();
  if (error) {
    console.warn("[clergy] request failed", error.message);
    return NextResponse.json({ error: "Could not send your request." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clergy: shape(data as never) });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
