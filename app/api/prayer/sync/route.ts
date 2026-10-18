import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { WALL_DAYS, WALL_TAG, cleanWallNames, isWallRow, wallFromRow, wallToRow, type WallName } from "@/lib/prayers/wallNames";
import { refreshStreak } from "@/lib/streak/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two-way sync for prayer state. GET pulls every row the signed-in user
// has across prayer_completions, intentions_living, intentions_departed,
// rope_sessions. POST upserts a batch.
//
// Auth is `createClientFromRequest`, NOT the cookie-only `createClient`, and
// every response goes through `withCors`. Both are required, not stylistic:
// the Android app is a static export served from https://localhost with
// app/api stashed out of the tree, so it reaches this route cross-origin at
// purifyapp.net with a Bearer token and no cookies. A cookie-only client
// answers 401 to every native reader, and without the CORS headers (plus the
// OPTIONS preflight, which a JSON body + Authorization header makes
// mandatory) the WebView drops the response before the app sees it.
//
// This was silently broken: the client swallows every error, so prayer
// history simply never left the phone. See lib/prayers/sync.ts.
//
// RLS still does the actual gating.
//
// From 1.7.1 the names a reader carries from the prayer wall
// (lib/prayers/wallNames.ts) ride in their own intentions_living rows,
// tagged WALL_TAG. Those rows are never handed out as diptychs, so no app,
// older ones included, ever shows them among the reader's own names: they
// travel on their own, as `wall`, the later change winning, and go once
// their days are out. No new table and no migration.

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

const WallNameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  intention: z.string().max(400).nullable(),
  // WALL_FOR, written out for zod.
  for: z.enum(["today", "morning", "midday", "evening"]),
  addedAt: z.string().max(40),
  until: z.string().max(40),
  doneAt: z.string().max(40).nullable(),
  changedAt: z.string().max(40),
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
  // Optional: apps before 1.7.1 send no names from the wall.
  wall: z.array(WallNameSchema).max(100).optional(),
});

/** Long enough past a name's last day that every device has let it go. */
const WALL_KEEP_MS = (WALL_DAYS + 1) * 86_400_000;

/** A wall row's last change, read from its tags. */
function changedOf(tags: unknown): number {
  const t = Array.isArray(tags) ? tags.find((x): x is string => typeof x === "string" && x.startsWith("changed:")) : undefined;
  const at = t ? Date.parse(t.slice("changed:".length)) : NaN;
  return Number.isFinite(at) ? at : 0;
}

export async function GET(req: NextRequest) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      req,
    );
  }

  // The marks and the rope sessions are read in pages. Both asked for 2,000
  // rows in one request, and the API returns at most 1,000 whatever .limit()
  // says, without an error. The marks are read oldest first, so what was cut
  // was the newest: a reader with more than a thousand marks who signed in on
  // a new phone would have been handed their first thousand and none of this
  // month's. A handful of marks a day reaches that inside a year.
  const [
    { data: completions },
    { data: living },
    { data: departed },
    { data: rope },
    { data: wallRows },
  ] = await Promise.all([
    pageAllSettled((from, to) =>
      supa
        .from("prayer_completions")
        .select("rule_id, prayed_on")
        .order("prayed_on", { ascending: true })
        .order("rule_id", { ascending: true })
        .range(from, to),
    ),
    // The diptychs: never the names from the prayer wall, which ride in the
    // same table (see the header) and are handed over below on their own.
    supa
      .from("intentions_living")
      .select("id, name, relationship, note, nameday, tags, added_at")
      .not("tags", "cs", `{${WALL_TAG}}`)
      .order("added_at", { ascending: false })
      .limit(500),
    supa
      .from("intentions_departed")
      .select("id, name, relationship, note, repose, tags, added_at")
      .order("added_at", { ascending: false })
      .limit(500),
    pageAllSettled((from, to) =>
      supa
        .from("rope_sessions")
        .select("id, started_at, knots, line")
        .order("started_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supa
      .from("intentions_living")
      .select("id, name, note, tags, added_at")
      .contains("tags", [WALL_TAG])
      .order("added_at", { ascending: false })
      .limit(100),
  ]);

  return withCors(
    NextResponse.json(
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
        wall: cleanWallNames(
          ((wallRows ?? []) as Record<string, unknown>[])
            .map((r) => wallFromRow(r))
            .filter((n): n is WallName => n !== null),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    ),
    req,
  );
}

export async function POST(req: NextRequest) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      req,
    );
  }

  let parsed;
  try {
    parsed = PayloadSchema.parse(await req.json());
  } catch (err) {
    return withCors(
      NextResponse.json(
        { error: "Invalid body", detail: String(err) },
        { status: 400 },
      ),
      req,
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
    // The streak on the reader's profile follows the ledger, so a reader who
    // keeps the day but never opens Today still shows it to others.
    const userId = user.id;
    after(async () => {
      try {
        await refreshStreak(createAdminClient(), userId);
      } catch (e) {
        console.warn("[streak] refresh after sync failed", (e as Error).message);
      }
    });
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

  // The names from the prayer wall: each as a tagged row of the reader's own
  // list of the living, the later change winning over what the account has,
  // and those whose days are past let go.
  const wall = cleanWallNames(parsed.wall ?? []);
  if (wall.length > 0) {
    const { data: held } = await supa
      .from("intentions_living")
      .select("id, tags")
      .in(
        "id",
        wall.map((n) => n.id),
      );
    const kept = new Map(((held ?? []) as { id: string; tags: unknown }[]).map((r) => [r.id, r.tags]));
    const rows = wall
      // A row of the reader's own diptychs with the same id is never touched,
      // and an older change never overwrites a newer one.
      .filter((n) => {
        if (!kept.has(n.id)) return true;
        const tags = kept.get(n.id);
        return isWallRow(tags) && changedOf(tags) < Date.parse(n.changedAt);
      })
      .map((n) => {
        const row = wallToRow(n);
        return {
          user_id: user.id,
          id: row.id,
          name: row.name,
          relationship: null,
          note: row.note,
          nameday: null,
          tags: row.tags,
          added_at: row.addedAt,
          updated_at: new Date().toISOString(),
        };
      });
    if (rows.length > 0) {
      await supa.from("intentions_living").upsert(rows, { onConflict: "user_id,id" });
    }
  }
  if (parsed.wall !== undefined) {
    await supa
      .from("intentions_living")
      .delete()
      .contains("tags", [WALL_TAG])
      .lt("added_at", new Date(Date.now() - WALL_KEEP_MS).toISOString());
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

  return withCors(NextResponse.json({ ok: true }), req);
}

// A JSON body plus an Authorization header is a "non-simple" request, so the
// WebView sends OPTIONS first and never reaches POST without this.
export const OPTIONS = corsPreflight;

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
