import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 50;

// Paginated, searchable profile list + signup-funnel breakdown. Users tab
// reads this. Search matches email substring (case-insensitive).
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);

  const supa = createAdminClient();

  let query = supa
    .from("profiles")
    .select("id, email, display_name, joined_at, has_password", { count: "exact" })
    .order("joined_at", { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: profiles, count: total } = await query;

  // OAuth provider mix — count distinct providers across `auth.users` via
  // a lightweight RPC-free approach: ask Supabase admin for the identities
  // of the most recent batch (small sample). Best-effort, used for the donut.
  const providerCounts = { google: 0, apple: 0, email: 0, other: 0 };
  try {
    const { data: adminUsers } = await supa.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    for (const u of adminUsers?.users ?? []) {
      const provs = (u.identities ?? []).map((i) => i.provider);
      if (provs.includes("google")) providerCounts.google += 1;
      else if (provs.includes("apple")) providerCounts.apple += 1;
      else if (provs.includes("email")) providerCounts.email += 1;
      else providerCounts.other += 1;
    }
  } catch {
    // ignore — keeps zeros.
  }

  // Signup buckets by day across the last 30d for the funnel chart.
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  since30.setUTCHours(0, 0, 0, 0);
  const { data: signupSeries } = await supa
    .from("profiles")
    .select("joined_at")
    .gte("joined_at", since30.toISOString())
    .limit(50_000);

  const dayKey = (iso: string) => iso.slice(0, 10);
  const dayT = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30);
    d.setUTCDate(since30.getUTCDate() + i);
    dayT.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of signupSeries ?? []) {
    const k = dayKey(r.joined_at);
    if (dayT.has(k)) dayT.set(k, (dayT.get(k) ?? 0) + 1);
  }
  const signupsByDay = [...dayT.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json(
    {
      total: total ?? 0,
      offset,
      pageSize: PAGE,
      query: q,
      profiles: profiles ?? [],
      providers: providerCounts,
      signupsByDay,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
