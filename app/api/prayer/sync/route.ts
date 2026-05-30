import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two-way sync for prayer state. GET pulls every row the signed-in user
// has across prayer_completions, intentions_living, intentions_departed,
// rope_sessions. POST upserts a batch.
//
// Both routes use the signed-in (SSR) Supabase client — RLS does the gating.

const IntentionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  relationship: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
  nameday: z.string().regex(/^\d{2}-\d{2}$/).optional(),
  repose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags: z.array(z.string().max(50)).optional(),
  addedAt: z.string(),
});

const RopeSessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string(),
  knots: z.number().int().min(0).max(100_000),
  line: z.string().max(500),
});

const PayloadSchema = z.object({
  completions: z
    .array(
      z.object({
        ruleId: z.string().min(1).max(80),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .max(2000),
  intentions: z.object({
    living: z.array(IntentionSchema).max(500),
    departed: z.array(IntentionSchema).max(500),
  }),
  rope: z.object({
    sessions: z.array(RopeSessionSchema).max(2000),
  }),
});

export async function GET() {
  const supa = await createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: completions },
    { data: living },
    { data: departed },
    { data: rope },
  ] = await Promise.all([
    supa
      .from("prayer_completions")
      .select("rule_id, prayed_on")
      .order("prayed_on", { ascending: true })
      .limit(2000),
    supa
      .from("intentions_living")
      .select("id, name, relationship, note, nameday, tags, added_at")
      .order("added_at", { ascending: false })
      .limit(500),
    supa
      .from("intentions_departed")
      .select("id, name, relationship, note, repose, tags, added_at")
      .order("added_at", { ascending: false })
      .limit(500),
    supa
      .from("rope_sessions")
      .select("id, started_at, knots, line")
      .order("started_at", { ascending: false })
      .limit(2000),
  ]);

  return NextResponse.json(
    {
      completions: (completions ?? []).map((r) => ({
        ruleId: r.rule_id as string,
        date: r.prayed_on as string,
      })),
      intentions: {
        living: (living ?? []).map(rowToIntention),
        departed: (departed ?? []).map(rowToIntention),
      },
      rope: {
        sessions: (rope ?? []).map((s) => ({
          id: s.id as string,
          startedAt: s.started_at as string,
          knots: s.knots as number,
          line: (s.line as string) ?? "",
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = PayloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: String(err) },
      { status: 400 },
    );
  }

  // Upsert each segment. RLS confines writes to the signed-in user.
  if (parsed.completions.length > 0) {
    await supa.from("prayer_completions").upsert(
      parsed.completions.map((c) => ({
        user_id: user.id,
        rule_id: c.ruleId,
        prayed_on: c.date,
      })),
      { onConflict: "user_id,rule_id,prayed_on" },
    );
  }

  for (const kind of ["living", "departed"] as const) {
    const table = kind === "living" ? "intentions_living" : "intentions_departed";
    const rows = parsed.intentions[kind].map((i) => ({
      user_id: user.id,
      id: i.id,
      name: i.name,
      relationship: i.relationship ?? null,
      note: i.note ?? null,
      ...(kind === "living"
        ? { nameday: i.nameday ?? null }
        : { repose: i.repose ?? null }),
      tags: i.tags ?? [],
      added_at: i.addedAt,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      await supa.from(table).upsert(rows, { onConflict: "user_id,id" });
    }
  }

  if (parsed.rope.sessions.length > 0) {
    await supa.from("rope_sessions").upsert(
      parsed.rope.sessions.map((s) => ({
        user_id: user.id,
        id: s.id,
        started_at: s.startedAt,
        knots: s.knots,
        line: s.line,
      })),
      { onConflict: "user_id,id" },
    );
  }

  return NextResponse.json({ ok: true });
}

function rowToIntention(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    relationship: (r.relationship as string | null) ?? undefined,
    note: (r.note as string | null) ?? undefined,
    nameday: (r.nameday as string | null) ?? undefined,
    repose: (r.repose as string | null) ?? undefined,
    tags: ((r.tags as string[] | null) ?? []) as string[],
    addedAt: r.added_at as string,
  };
}
