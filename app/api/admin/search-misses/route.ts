import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { groupMisses, type MissGroup, type MissRow } from "@/lib/search/missGroups";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Content > Searched, not found (admin item A11): the words readers searched
 * for in the last 7, 30 or 90 days and found nothing, the most asked first
 * (lib/search/missGroups.ts). Read only; no reader is in any row.
 *
 * Until the 1.9 release has run supabase/migrations/20261110002923_search_misses.sql the answer is
 * { absent: true }, never an empty list. At most 20,000 rows are read.
 *
 * Admin only: 403 to anyone else.
 */

export type SearchMissesPayload =
  | { absent: true }
  | { absent: false; days: number; total: number; truncated: boolean; groups: MissGroup[] }
  | { unavailable: string };

const PAGE = 1000;
const MAX_ROWS = 20_000;

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = Number(req.nextUrl.searchParams.get("days"));
  const days = asked === 7 || asked === 90 ? asked : 30;
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const supa = createAdminClient();
  const rows: MissRow[] = [];
  let truncated = false;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from("search_misses")
      .select("words, day, locale, platform")
      .gte("day", since)
      .order("day", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      const payload: SearchMissesPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    rows.push(...((data ?? []) as MissRow[]));
    if (!data || data.length < PAGE) break;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const payload: SearchMissesPayload = { absent: false, days, total: rows.length, truncated, groups: groupMisses(rows) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
