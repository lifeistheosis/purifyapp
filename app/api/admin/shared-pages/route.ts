import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import {
  SHARED_PAGE_COLUMNS,
  sharedState,
  sharedWords,
  type SharedPageIn,
  type SharedState,
} from "@/lib/admin/sharedPages";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shared journal pages, for the admin (1.9, admin item A1;
 * lib/admin/sharedPages.ts says what each state means).
 *
 * GET ?show=unreviewed|reviewed|hidden|withdrawn|reported: the latest shares
 * in that state, with their words as the public page shows them and their
 * reports. The writer is never in it.
 *
 * POST { id, action }: hide (its link then shows nothing), unhide, keep or
 * review (it may stand, and search engines may show it), unreview (out of
 * search engines again). Each is logged with who did it.
 *
 * Until the sharing table exists (supabase/migrations/20261109180246_shared_pages.sql,
 * applied at the 1.9 merge) GET answers { absent: true }
 * and POST 409. Admin only: 403 to anyone else.
 */

const SHOWS = ["unreviewed", "reviewed", "hidden", "withdrawn", "reported"] as const;
type Show = (typeof SHOWS)[number];

export type SharedPageRow = {
  id: string;
  title: string;
  words: string;
  createdAt: string;
  state: SharedState;
  reports: number;
  reasons: string[];
};

export type SharedPagesPayload = { absent: true } | { absent: false; show: Show; pages: SharedPageRow[] } | { unavailable: string };

/** How many shares a list reads before it filters by state. */
const READ = 300;

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = req.nextUrl.searchParams.get("show");
  const show: Show = (SHOWS as readonly string[]).includes(asked ?? "") ? (asked as Show) : "unreviewed";
  const { data, error } = await createAdminClient()
    .from("shared_pages")
    .select(`${SHARED_PAGE_COLUMNS}, reports:shared_page_reports(reason, created_at)`)
    .order("created_at", { ascending: false })
    .limit(READ);
  const headers = { "Cache-Control": "no-store" };
  if (error) {
    const payload: SharedPagesPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
    return NextResponse.json(payload, { headers });
  }

  const pages: SharedPageRow[] = ((data ?? []) as SharedPageIn[])
    .map((p) => ({ ...p, reports: p.reports ?? [] }))
    .filter((p) => sharedState(p) === show)
    .map((p) => ({
      id: p.id,
      title: p.title,
      words: sharedWords(p, 4000),
      createdAt: p.created_at,
      state: sharedState(p),
      reports: p.reports.length,
      reasons: p.reports.map((r) => (r.reason ?? "").trim()).filter(Boolean),
    }));
  return NextResponse.json({ absent: false, show, pages } satisfies SharedPagesPayload, { headers });
}

const Body = z.object({
  id: z.string().uuid(),
  action: z.enum(["hide", "unhide", "keep", "review", "unreview"]),
  reason: z.string().max(300).nullable().optional(),
});

/** What each action writes. */
function change(action: z.infer<typeof Body>["action"], now: string): Record<string, string | null> {
  switch (action) {
    case "hide":
      return { hidden_at: now };
    case "unhide":
      return { hidden_at: null };
    case "keep":
    case "review":
      return { reviewed_at: now };
    case "unreview":
      return { reviewed_at: null };
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-shared-pages:${admin.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many changes in a minute. Wait a moment." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { id, action, reason } = parsed.data;

  // What it was before, read first: the log keeps it, so any of these can be
  // undone by hand (lib/admin/activityLog.ts asks it of every overwrite).
  const db = createAdminClient();
  const before = await db.from("shared_pages").select("hidden_at, reviewed_at").eq("id", id).maybeSingle();
  if (isTableAbsent(before.error)) {
    return NextResponse.json(
      { error: "Shared pages are not there yet: their table comes with the 1.9 merge (supabase/migrations/20261109180246_shared_pages.sql)." },
      { status: 409 },
    );
  }
  if (before.error) return NextResponse.json({ error: "Not changed", detail: before.error.message }, { status: 500 });
  if (!before.data) return NextResponse.json({ error: "No shared page has that id." }, { status: 404 });
  // Copied out now, so nothing written after can change what the log says it was.
  const prior = { hidden_at: before.data.hidden_at ?? null, reviewed_at: before.data.reviewed_at ?? null };

  const { error } = await db.from("shared_pages").update(change(action, new Date().toISOString())).eq("id", id);
  if (error) return NextResponse.json({ error: "Not changed", detail: error.message }, { status: 500 });

  void logActivity({
    actorEmail: admin.email ?? null,
    action: `shared_page.${action}`,
    entityType: "shared_pages",
    entityId: id,
    detail: { before: prior, ...(reason ? { reason } : {}) },
  });
  return NextResponse.json({ ok: true });
}
