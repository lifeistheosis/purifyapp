import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import base from "@/data/chants-live.json";
import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { REF, type LiveListFile } from "@/lib/chants/pulls";
import { forgetPulls } from "@/lib/chants/pulls.server";
import { allChants } from "@/lib/chants/registry.server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Content > Chant recordings (admin item A7): every recording the live list
 * names, whether it is on or taken down, and the switch.
 *
 * GET lists them; POST { ref, pulled, reason? } moves the switch. Taking one
 * down asks a reason (a rights holder's request, a fault), kept with who and
 * when; the website's list (app/audio/chants/live.json) drops it within
 * minutes. Every move is in the activity log.
 *
 * Until the owner has run docs/1.9-build/sql/chant-pulls.sql the table is not
 * there: GET says so ({ absent: true } beside the recordings) and POST answers
 * 409, so the switch is never shown as moved when it was not.
 *
 * Admin only: 403 to anyone else.
 */

export type ChantRecording = {
  ref: string;
  chant: string;
  variant: string;
  performer: string | null;
  /** On the committed list (data/chants-live.json) as live. */
  listed: boolean;
  /** Taken down from the admin right now. */
  pulled: boolean;
  reason: string | null;
  changedBy: string | null;
  pulledAt: string | null;
  restoredAt: string | null;
};

export type ChantPullsPayload = { absent: boolean; recordings: ChantRecording[]; unavailable?: string };

type PullRow = {
  ref: string;
  pulled: boolean;
  reason: string | null;
  changed_by: string | null;
  pulled_at: string | null;
  restored_at: string | null;
};

const Body = z
  .object({
    ref: z.string().regex(REF),
    pulled: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

/** Every recording the committed list names as live, with its chant's names. */
function recordings(): Omit<ChantRecording, "pulled" | "reason" | "changedBy" | "pulledAt" | "restoredAt">[] {
  const list = base as LiveListFile;
  const chants = allChants();
  return list.live.map((ref) => {
    const [slug, id] = ref.split("/");
    const chant = chants.find((c) => c.slug === slug);
    const variant = chant?.variants.find((v) => v.id === id);
    return {
      ref,
      chant: chant?.title ?? slug,
      variant: variant?.label ?? id,
      performer: variant?.performer ?? null,
      listed: true,
    };
  });
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await createAdminClient()
    .from("chant_pulls")
    .select("ref, pulled, reason, changed_by, pulled_at, restored_at");
  const absent = isTableAbsent(error);
  const rows = new Map(((error ? [] : data) as PullRow[]).map((r) => [r.ref, r]));
  const payload: ChantPullsPayload = {
    absent,
    ...(error && !absent ? { unavailable: error.message } : {}),
    recordings: recordings().map((r) => {
      const row = rows.get(r.ref);
      return {
        ...r,
        pulled: row?.pulled === true,
        reason: row?.reason ?? null,
        changedBy: row?.changed_by ?? null,
        pulledAt: row?.pulled_at ?? null,
        restoredAt: row?.restored_at ?? null,
      };
    }),
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-chant-pulls:${admin.id}`, 60, 20)) {
    return NextResponse.json({ error: "Too many changes in a minute. Wait a moment." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { ref, pulled, reason } = parsed.data;
  if (!recordings().some((r) => r.ref === ref)) {
    return NextResponse.json({ error: `The list has no recording ${ref}.` }, { status: 404 });
  }
  if (pulled && !reason) {
    return NextResponse.json({ error: "Say why it is taken down: a few words are kept with it." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const email = admin.email ?? null;
  // One shape for both, so the upsert's type is one row: taking down sets the
  // reason and when; putting back keeps them, and sets when it came back.
  const row: Record<string, string | boolean | null> = pulled
    ? { ref, pulled: true, reason: reason ?? null, changed_by: email, pulled_at: now, updated_at: now }
    : { ref, pulled: false, changed_by: email, restored_at: now, updated_at: now };
  const { error } = await createAdminClient().from("chant_pulls").upsert(row, { onConflict: "ref" });
  if (isTableAbsent(error)) {
    return NextResponse.json(
      { error: "chant_pulls is not there yet: it waits for docs/1.9-build/sql/chant-pulls.sql, on your OK." },
      { status: 409 },
    );
  }
  if (error) return NextResponse.json({ error: "Not switched", detail: error.message }, { status: 500 });

  // This server's list asks again at once; the others within their minute.
  forgetPulls();
  void logActivity({
    actorEmail: email,
    action: pulled ? "chant_recording.pulled" : "chant_recording.restored",
    entityType: "chant_pulls",
    entityId: ref,
    detail: pulled ? { reason } : undefined,
  });
  return NextResponse.json({ ok: true });
}
