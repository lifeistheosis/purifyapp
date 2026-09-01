import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Writes to the insights store: importing a report, and managing goals.
 *
 * Shaped like app/api/admin/sustainability/actions/route.ts, which is the house
 * template for an admin write route: getAdminUser gate, one zod discriminated
 * union for the body, and a switch that returns a plain ok.
 *
 * THE IMPORT IS A MERGE, NOT A REPLACE, and the rule that makes that safe lives
 * in Postgres. merge_insight_points refuses a point whose export saw less than
 * what is already stored, so re-importing last week's file cannot revert a
 * correction. Nothing here can bypass that by writing insight_points directly,
 * which is exactly why it is a function rather than a client upsert.
 */

// SeriesIn went with the import action it validated.

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("goal-upsert"),
    id: z.string().min(1).max(80),
    seriesId: z.string().min(1).max(200),
    label: z.string().min(1).max(200),
    period: z.enum(["daily", "weekly", "monthly"]),
    target: z.number().finite().min(0),
    paused: z.boolean().default(false),
  }),
  z.object({ action: z.literal("goal-delete"), id: z.string().min(1).max(80) }),
  // Seeding is a batch of goal-upserts with ids minted server side. The client
  // sends the proposals it derived from the dataset it is looking at, so the
  // targets shown before the click are the targets stored after it.
  z.object({
    action: z.literal("seed-goals"),
    goals: z
      .array(
        z.object({
          seriesId: z.string().min(1).max(200),
          label: z.string().min(1).max(200),
          period: z.enum(["daily", "weekly", "monthly"]),
          target: z.number().finite().min(0),
          paused: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(120),
  }),
  z.object({ action: z.literal("clear-dataset") }),
]);

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: String(err) }, { status: 400 });
  }

  const supa = createAdminClient();
  // `email` went with the import action, which was the only thing that
  // recorded who performed it.

  switch (parsed.action) {
    // "import" WAS HERE. The CSV import was removed on 2026-09-01: Play
    // Console exports describe finished days while this panel measures live
    // analytics, so the two disagreed and the stale one looked equally
    // authoritative. With the UI gone this was an unreachable write path into
    // insight_series, which is worse than no path at all.

    case "goal-upsert": {
      const r = await supa.from("insight_goals").upsert(
        {
          id: parsed.id,
          series_id: parsed.seriesId,
          label: parsed.label,
          period: parsed.period,
          target: parsed.target,
          paused: parsed.paused,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (r.error) {
        return NextResponse.json({ error: "Could not save the goal.", detail: r.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case "goal-delete": {
      const r = await supa.from("insight_goals").delete().eq("id", parsed.id);
      if (r.error) {
        return NextResponse.json({ error: "Could not delete the goal.", detail: r.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case "seed-goals": {
      const existing = await supa.from("insight_goals").select("series_id, period, target");
      if (existing.error) {
        return NextResponse.json(
          { error: "Could not read existing goals. Has the migration run?", detail: existing.error.message },
          { status: 500 },
        );
      }
      const have = new Set(
        ((existing.data ?? []) as { series_id: string; period: string; target: number }[]).map(
          (g) => `${g.series_id}|${g.period}|${g.target}`,
        ),
      );

      // Idempotent on (series, period, target) rather than on label, because
      // the label is the part an operator renames. Seeding twice adds nothing;
      // seeding after editing a target adds the original back, which is why the
      // button is offered only when there are no goals at all.
      const fresh = parsed.goals.filter(
        (g) => !have.has(`${g.seriesId}|${g.period}|${g.target}`),
      );
      if (fresh.length === 0) {
        return NextResponse.json({ ok: true, created: 0, skipped: parsed.goals.length });
      }

      const rows = fresh.map((g) => ({
        id: `goal-${crypto.randomUUID()}`,
        series_id: g.seriesId,
        label: g.label,
        period: g.period,
        target: g.target,
        paused: g.paused,
        updated_at: new Date().toISOString(),
      }));

      const ins = await supa.from("insight_goals").insert(rows);
      if (ins.error) {
        return NextResponse.json(
          { error: "Could not create the goals.", detail: ins.error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({
        ok: true,
        created: rows.length,
        skipped: parsed.goals.length - rows.length,
      });
    }

    case "clear-dataset": {
      // Series only. The points cascade, and GOALS DO NOT: a goal outliving the
      // report it measured is the normal case, and deleting targets because a
      // dataset was cleared would destroy the thing the operator actually
      // authored.
      const r = await supa.from("insight_series").delete().neq("id", "");
      if (r.error) {
        return NextResponse.json({ error: "Could not clear.", detail: r.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
  }
}
