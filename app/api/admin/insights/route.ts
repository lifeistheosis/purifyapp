import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dataset, Goal, Point, Series } from "@/lib/admin/insights/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The whole imported dataset and its goals, from the database.
 *
 * This replaces reading localStorage. The shape returned is exactly the Dataset
 * the engine already consumes, so nothing downstream of the store had to change
 * when the source moved from the browser to the server.
 *
 * DEGRADES HONESTLY. If the tables do not exist yet, because the code shipped
 * before the migration ran, this returns an empty dataset and `available:
 * false`. The panel then says no report has been imported, which is true, and
 * never renders a zero that would read as a measurement.
 */

type SeriesRow = {
  id: string;
  label: string;
  kind: string;
  source_header: string;
};

type PointRow = { series_id: string; day: string; value: number };

type GoalRow = {
  id: string;
  series_id: string;
  label: string;
  period: string;
  target: number;
  paused: boolean;
  created_at: string;
};

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();

  const [seriesRes, pointsRes, goalsRes, importsRes] = await Promise.all([
    supa.from("insight_series").select("id, label, kind, source_header").order("label"),
    // Ordered by day so each series' points arrive sorted and the engine, which
    // assumes oldest first, does not have to sort 400 rows on every read.
    supa.from("insight_points").select("series_id, day, value").order("day", { ascending: true }),
    supa.from("insight_goals").select("id, series_id, label, period, target, paused, created_at"),
    supa
      .from("insight_imports")
      .select("label, imported_at, imported_by, row_count, points_written, points_skipped")
      .order("imported_at", { ascending: false })
      .limit(10),
  ]);

  // A failed read is not an empty dataset. Saying so lets the UI distinguish
  // "nothing imported" from "could not tell", which are different facts.
  if (seriesRes.error || pointsRes.error) {
    return NextResponse.json(
      {
        available: false,
        reason: seriesRes.error?.message ?? pointsRes.error?.message ?? "unavailable",
        dataset: null,
        goals: [],
        imports: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const byId = new Map<string, Point[]>();
  for (const raw of (pointsRes.data ?? []) as PointRow[]) {
    const list = byId.get(raw.series_id) ?? [];
    // The column is a date, so it arrives as YYYY-MM-DD, already the label the
    // engine keys on. No timezone conversion happens here, deliberately.
    list.push({ day: String(raw.day).slice(0, 10), value: Number(raw.value) });
    byId.set(raw.series_id, list);
  }

  const series: Series[] = ((seriesRes.data ?? []) as SeriesRow[]).map((r) => ({
    id: r.id,
    label: r.label,
    kind: r.kind === "stock" ? "stock" : "flow",
    points: byId.get(r.id) ?? [],
    source: r.source_header,
  }));

  const allDays = series.flatMap((s) => s.points.map((p) => p.day)).sort();
  const latestImport = (importsRes.data ?? [])[0] as
    | { label: string; imported_at: string }
    | undefined;

  const dataset: Dataset | null =
    series.length === 0
      ? null
      : {
          id: "server",
          // Named for the accumulation rather than for one file, because it is
          // no longer one file. The import list carries the provenance.
          label: latestImport?.label ?? "Imported reports",
          series,
          importedAt: latestImport?.imported_at ?? new Date().toISOString(),
          rowCount: allDays.length,
          firstDay: allDays[0] ?? null,
          lastDay: allDays[allDays.length - 1] ?? null,
          warnings: [],
        };

  const goals: Goal[] = ((goalsRes.data ?? []) as GoalRow[]).map((g) => ({
    id: g.id,
    seriesId: g.series_id,
    label: g.label,
    period: g.period === "daily" ? "daily" : g.period === "weekly" ? "weekly" : "monthly",
    target: Number(g.target),
    paused: Boolean(g.paused),
    createdAt: g.created_at,
  }));

  return NextResponse.json(
    { available: true, dataset, goals, imports: importsRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
