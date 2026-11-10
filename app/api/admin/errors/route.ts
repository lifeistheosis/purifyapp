import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { groupErrors, type ErrorGroup, type ErrorRow } from "@/lib/errors/group";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Services > Errors readers hit (admin item A10): the last day's or week's
 * error reports, one line per fault (lib/errors/group.ts). Read only.
 *
 * Until the 1.9 release has run supabase/migrations/20261110002922_app_errors.sql the table is not
 * there, and the answer says so ({ absent: true }) rather than reading as a
 * clean week. At most 5,000 reports are read, the newest first; past that
 * the answer says it stopped (truncated), never that it saw everything.
 *
 * Admin only: 403 to anyone else.
 */

export type ErrorsPayload =
  | { absent: true }
  | { absent: false; days: number; total: number; truncated: boolean; groups: ErrorGroup[] }
  | { unavailable: string };

const PAGE = 1000;
const MAX_ROWS = 5000;

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = req.nextUrl.searchParams.get("days") === "7" ? 7 : 1;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supa = createAdminClient();
  const rows: ErrorRow[] = [];
  let truncated = false;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from("app_errors")
      .select("at, source, page, message, route, status, app_version, platform")
      .gte("at", since)
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      const payload: ErrorsPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    rows.push(...((data ?? []) as ErrorRow[]));
    if (!data || data.length < PAGE) break;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const payload: ErrorsPayload = { absent: false, days, total: rows.length, truncated, groups: groupErrors(rows) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
