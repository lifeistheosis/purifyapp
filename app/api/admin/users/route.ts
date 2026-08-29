import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { bucketByDay, windowStart } from "@/lib/admin/dayWindow";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 50;

/**
 * Paginated, searchable user list + signup-funnel breakdown. The Users tab
 * reads this. Search matches email substring, case-insensitive.
 *
 * ── THE WHOLE TAB WAS EMPTY, AND NOTHING SAID SO ────────────────────────
 *
 * This route used to select `id, email, display_name, joined_at, has_password`
 * from public.profiles and filter with `.ilike("email", ...)`. profiles HAS NO
 * EMAIL COLUMN and never has: it was created with four columns in
 * 20260518_profiles_bookmarks_annotations.sql:9 and no migration added one.
 *
 * Postgres answered 42703 for every request. The destructure was
 * `const { data: profiles, count: total } = await query`, with no `error`
 * binding at all, so the failure had nowhere to surface: `profiles` was null,
 * `total` was null, and the tab rendered an empty list above a total of zero,
 * indefinitely, with a 200 response. Search never matched anything either.
 *
 * ── Where the address actually lives ────────────────────────────────────
 *
 * auth.users. This route was ALREADY walking every page of it to build the
 * provider donut, so the email was in hand the whole time and thrown away one
 * line later. The walk now happens FIRST and yields both maps.
 *
 * Searching has to filter across the whole population rather than one page, so
 * with a query the matching ids come from that same walk and the profiles rows
 * are fetched by id. Chunked, because a PostgREST `in.(...)` of 1,300 uuids is
 * a 50KB URL that most servers refuse; sorted and paged in memory afterwards,
 * which is affordable because the ceiling is the user count, not a join.
 *
 * `error` is bound and checked everywhere below. A route that answers 200 with
 * zeros when the database refused the query is worse than one that fails.
 */

type Provider = "google" | "apple" | "email" | "other";

type ProfileRow = {
  id: string;
  display_name: string | null;
  joined_at: string;
  has_password: boolean | null;
};

/** PostgREST `in.(...)` goes in the URL, so the id list has to stay short. */
const ID_CHUNK = 200;

type AuthWalk = {
  providerById: Map<string, Provider>;
  emailById: Map<string, string>;
  providerCounts: Record<Provider, number>;
};

/**
 * The auth walk is CACHED, and this is the only reason the Users tab is
 * usable on a phone.
 *
 * The walk cannot be skipped: every response carries `providers` for the donut,
 * which is the whole population rather than a sample, so it runs even when
 * nothing is being searched. At 1,344 accounts and perPage 200 that is seven
 * SEQUENTIAL GoTrue admin calls, and UsersTab refetches on a 300ms debounce. A
 * thumb typing "edgar" on a phone routinely runs slower than 300ms per
 * character, so the debounce coalesced nothing and that search cost roughly
 * thirty-five round trips.
 *
 * Module scope with a short TTL is the right shape here. This is an admin-only
 * surface with one operator, so the hit rate while typing is effectively total,
 * and a provider map up to 30 seconds stale cannot mislead: it feeds a donut
 * and a per-row auth pill, never a decision and never a write. A new account in
 * that window shows up on the next tick.
 */
const WALK_TTL_MS = 30_000;
let walkCache: { at: number; value: AuthWalk } | null = null;

async function authWalk(
  supa: ReturnType<typeof createAdminClient>,
): Promise<AuthWalk> {
  const now = Date.now();
  if (walkCache && now - walkCache.at < WALK_TTL_MS) return walkCache.value;

  const providerById = new Map<string, Provider>();
  const emailById = new Map<string, string>();
  const providerCounts: Record<Provider, number> = {
    google: 0,
    apple: 0,
    email: 0,
    other: 0,
  };
  const PER = 200;
  for (let page = 1; page <= 50; page++) {
    const { data: batch, error } = await supa.auth.admin.listUsers({
      page,
      perPage: PER,
    });
    if (error) throw error;
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
      // Counted once per id. The map was always idempotent while the counter
      // was not, so a user appearing on two pages would have inflated the
      // donut past the row count it sits beside.
      if (!providerById.has(u.id)) providerCounts[p] += 1;
      providerById.set(u.id, p);
      if (u.email) emailById.set(u.id, u.email);
    }
    if (users.length < PER) break; // last page reached
  }

  const value = { providerById, emailById, providerCounts };
  // Only a COMPLETE walk is cached. A throw above leaves the previous entry
  // alone and the caller falls back, rather than pinning a half-built map for
  // the next thirty seconds.
  walkCache = { at: now, value };
  return value;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);

  const supa = createAdminClient();

  // ── One walk of auth.users, two maps out of it ─────────────────────────
  // Authoritative for BOTH the donut (whole population, not a sample) and the
  // per-row Auth label, so the table and the chart can never disagree. The
  // email comes from the same pass; it used to be discarded here and then
  // looked for in a column that does not exist.
  let providerById = new Map<string, Provider>();
  let emailById = new Map<string, string>();
  let providerCounts: Record<Provider, number> = {
    google: 0,
    apple: 0,
    email: 0,
    other: 0,
  };
  let authWalkFailed = false;
  try {
    ({ providerById, emailById, providerCounts } = await authWalk(supa));
  } catch (e) {
    // The donut falls back to zeros and the table to has_password, as before.
    // But a SEARCH cannot be answered without this walk, so the flag below
    // turns that case into an honest error instead of an empty result.
    authWalkFailed = true;
    console.warn("[admin] auth user walk failed", (e as Error).message);
  }

  // ── The page of profiles ───────────────────────────────────────────────
  let profiles: ProfileRow[] = [];
  let total = 0;

  if (q) {
    if (authWalkFailed) {
      return NextResponse.json(
        { error: "Couldn't reach the account directory to search by email." },
        { status: 502 },
      );
    }
    const matching = [...emailById.entries()]
      .filter(([, email]) => email.toLowerCase().includes(q))
      .map(([id]) => id);

    if (matching.length > 0) {
      const collected: ProfileRow[] = [];
      for (let i = 0; i < matching.length; i += ID_CHUNK) {
        const { data, error } = await supa
          .from("profiles")
          .select("id, display_name, joined_at, has_password")
          .in("id", matching.slice(i, i + ID_CHUNK));
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        collected.push(...((data ?? []) as ProfileRow[]));
      }
      // Sorted here rather than by the database, because the rows arrived in
      // chunks. Newest first, matching the unsearched ordering exactly.
      collected.sort((a, b) => (a.joined_at < b.joined_at ? 1 : -1));
      total = collected.length;
      profiles = collected.slice(offset, offset + PAGE);
    }
  } else {
    const { data, count, error } = await supa
      .from("profiles")
      .select("id, display_name, joined_at, has_password", { count: "exact" })
      .order("joined_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      // Bound and checked. The previous version discarded this and answered
      // 200 with an empty table.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profiles = (data ?? []) as ProfileRow[];
    total = count ?? 0;
  }

  // Attach the address and the resolved provider to each row in this page.
  const profileRows = profiles.map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
    provider: providerById.get(p.id) ?? null,
  }));

  // Signup buckets by day, ENDING TODAY.
  //
  // This used to build its own window: midnight of (today - 30), then thirty
  // iterations from there, which lands on YESTERDAY. Today's signups were
  // invisible on the chart until the following morning, and the last bar was
  // always a day stale. lib/admin/dayWindow.ts is the shared, tested version;
  // planting that exact off-by-one back into it fails eight of its tests.
  const { data: signupSeries } = await supa
    .from("profiles")
    .select("joined_at")
    .gte("joined_at", windowStart(30))
    .limit(50_000);

  const signupsByDay = bucketByDay(
    signupSeries ?? [],
    (r) => r.joined_at as string,
    30,
  );

  return NextResponse.json(
    {
      total,
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
