import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseHeader } from "@/lib/admin/insights/seriesId";

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

const SeriesIn = z.object({
  id: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  kind: z.enum(["stock", "flow"]),
  sourceHeader: z.string().min(1).max(500),
  points: z
    .array(
      z.object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        // Nullable on the wire, dropped below. The client sends what it parsed;
        // the server decides that an absent measurement is not a row.
        value: z.number().finite().nullable(),
      }),
    )
    // 1,500 days is four years of daily data for one column. A real export is
    // 87. The previous cap of 5,000 across 60 series allowed a 300,000 point
    // body, which is not a limit so much as an invitation.
    .max(1500),
});

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("import"),
    label: z.string().min(1).max(200),
    rowCount: z.number().int().min(0).max(100_000),
    series: z.array(SeriesIn).min(1).max(40),
  }),
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
  const email = admin.email ?? "unknown";

  switch (parsed.action) {
    case "import": {
      // The export's own coverage end. This, not the clock, is what decides a
      // conflict: a file downloaded last week has a newer import time and older
      // coverage, and coverage is the honest measure of which figure is later.
      let observedThrough = "";
      for (const s of parsed.series) {
        for (const p of s.points) {
          if (p.value !== null && p.day > observedThrough) observedThrough = p.day;
        }
      }
      if (!observedThrough) {
        return NextResponse.json(
          { error: "That report contained no measurements." },
          { status: 400 },
        );
      }

      // Series first: points reference them, and the foreign key would reject
      // an orphan. Kind is NOT overwritten on conflict, because flipping stock
      // to flow retroactively reinterprets every point already stored; a
      // disagreement is reported to the caller instead.
      const existing = await supa.from("insight_series").select("id, kind");
      if (existing.error) {
        return NextResponse.json(
          { error: "Could not read the series table. Has the migration run?", detail: existing.error.message },
          { status: 500 },
        );
      }
      const kindById = new Map(
        ((existing.data ?? []) as { id: string; kind: string }[]).map((r) => [r.id, r.kind]),
      );

      const kindConflicts: string[] = [];
      const rows = parsed.series.map((s) => {
        const prior = kindById.get(s.id);
        if (prior && prior !== s.kind) kindConflicts.push(s.label);
        const parts = parseHeader(s.sourceHeader);
        return {
          id: s.id,
          metric: parts.metric,
          qualifiers: parts.qualifiers,
          dimension: parts.dimension,
          label: s.label,
          kind: prior ?? s.kind,
          source_header: s.sourceHeader,
          updated_at: new Date().toISOString(),
        };
      });

      const up = await supa.from("insight_series").upsert(rows, { onConflict: "id" });
      if (up.error) {
        return NextResponse.json(
          { error: "Could not save the series.", detail: up.error.message },
          { status: 500 },
        );
      }

      // Nulls are dropped here, once. A day with no measurement is a day with
      // no row, which is how every reader of this data already behaves.
      const points = parsed.series.flatMap((s) =>
        s.points
          .filter((p) => p.value !== null)
          .map((p) => ({
            series_id: s.id,
            day: p.day,
            value: p.value as number,
            observed_through: observedThrough,
          })),
      );

      const merged = await supa.rpc("merge_insight_points", { p_points: points });
      if (merged.error) {
        return NextResponse.json(
          { error: "Could not merge the measurements.", detail: merged.error.message },
          { status: 500 },
        );
      }

      const result = (Array.isArray(merged.data) ? merged.data[0] : merged.data) as
        | { written: number; skipped: number }
        | undefined;
      const written = result?.written ?? 0;
      const skipped = result?.skipped ?? 0;

      const days = points.map((p) => p.day).sort();
      await supa.from("insight_imports").insert({
        label: parsed.label,
        imported_by: email,
        row_count: parsed.rowCount,
        series_count: parsed.series.length,
        points_written: written,
        points_skipped: skipped,
        first_day: days[0] ?? null,
        last_day: days[days.length - 1] ?? null,
      });

      return NextResponse.json({
        ok: true,
        written,
        skipped,
        observedThrough,
        kindConflicts,
      });
    }

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
