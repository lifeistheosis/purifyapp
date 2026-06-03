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

  // Build one authoritative id→provider map by walking the full auth.users
  // set (paginated). Used for BOTH the donut (whole population, not a sample)
  // and the per-row Auth label, so the table and chart can never disagree.
  type Provider = "google" | "apple" | "email" | "other";
  const providerById = new Map<string, Provider>();
  const providerCounts = { google: 0, apple: 0, email: 0, other: 0 };
  try {
    const PER = 200;
    for (let page = 1; page <= 50; page++) {
      const { data: batch } = await supa.auth.admin.listUsers({ page, perPage: PER });
      const users = batch?.users ?? [];
      for (const u of users) {
        const provs = (u.identities ?? []).map((i) => i.provider);
        const p: Provider = provs.includes("google")
          ? "google"
          : provs.includes("apple")
            ? "apple"
            : provs.includes("email")
              ? "email"
              : "other";
        providerById.set(u.id, p);
        providerCounts[p] += 1;
      }
      if (users.length < PER) break; // last page reached
    }
  } catch {
    // ignore — keeps zeros and falls back to has_password in the table.
  }

  // Attach the resolved provider to each profile row in the current page.
  const profileRows = (profiles ?? []).map((p) => ({
    ...p,
    provider: providerById.get(p.id) ?? null,
  }));

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
      profiles: profileRows,
      providers: providerCounts,
      signupsByDay,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
