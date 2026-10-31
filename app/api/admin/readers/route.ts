import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import {
  filterReaders,
  isWaiting,
  joinedFrom,
  sortReaders,
  type Decision,
  type Joined,
  type MarksFilter,
  type PlanFilter,
  type Provider,
  type Reader,
} from "@/lib/admin/readers";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { signInProvider } from "@/lib/admin/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The readers' directory and a reader's card: Users, the owner's pick C on
 * sheet r3-15 (2026-10-30). lib/admin/readers.ts says what it is for.
 *
 * GET              a page of the directory, filtered (q, joined, provider,
 *                  plan, marks, waiting) and in its order
 * GET ?id=<uuid>   one reader's card: their plan, badges, the blue check
 *                  and clergy seal requests, and their newest orders
 *
 * Nothing is written here. The card's actions go to the routes that already
 * hold them, each behind the same gate and each attributed in the activity
 * log: /api/admin/verification and /api/admin/clergy decide, /api/admin/badges
 * gives a badge, /api/admin/subscriptions/comp comps Plus and /api/admin/gifts
 * sends a gift.
 *
 * THE DIRECTORY IS BUILT ONCE AND KEPT HALF A MINUTE. Every account comes from
 * GoTrue (emails and sign-in methods live there, never in profiles) and is
 * joined in memory with the handles, plans, badges and requests, so a search
 * or a filter while typing reads nothing new. One operator, a list in the low
 * thousands: the same posture as the Users route's own walk.
 *
 * Admin only: 403 to anyone else.
 */

const PAGE = 50;
/** The most rows one export carries. */
const EXPORT_MAX = 20_000;
const TTL_MS = 30_000;
const NO_STORE = { headers: { "Cache-Control": "no-store" } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Directory = {
  at: number;
  readers: Reader[];
  /** When each waiting reader asked, for the oldest-first order. */
  askedAt: Map<string, string>;
  /** Tables that are not on this database yet, said once on the page. */
  missing: string[];
};

let cache: Directory | null = null;

type Admin = ReturnType<typeof createAdminClient>;

async function walkAuth(admin: Admin) {
  const out: { id: string; email: string | null; name: string | null; provider: Provider; created: string; lastSignIn: string | null }[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const u of users) {
      const md = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
      out.push({
        id: u.id,
        email: u.email ?? null,
        name: md.full_name ?? md.name ?? null,
        provider: signInProvider(u),
        created: u.created_at ?? "",
        lastSignIn: u.last_sign_in_at ?? null,
      });
    }
    if (users.length < 200) break;
  }
  return out;
}

/** `fresh` after a write from the card, so the list shows what was just decided. */
async function build(admin: Admin, fresh = false): Promise<Directory> {
  const now = Date.now();
  if (!fresh && cache && now - cache.at < TTL_MS) return cache;

  const missing: string[] = [];
  const [auth, profiles, ents, badges, checks, seals] = await Promise.all([
    walkAuth(admin),
    pageAllSettled((from, to) => admin.from("profiles").select("id, handle, display_name, joined_at").order("id").range(from, to)),
    pageAllSettled((from, to) => admin.from("entitlements").select("user_id, plus_until, pro_until, plus_source").order("user_id").range(from, to)),
    pageAllSettled((from, to) => admin.from("user_badges").select("user_id, badge").order("user_id").order("badge").range(from, to)),
    pageAllSettled((from, to) => admin.from("user_verification").select("user_id, status, requested_at").order("user_id").range(from, to)),
    pageAllSettled((from, to) => admin.from("clergy_verifications").select("user_id, status, requested_at").order("user_id").range(from, to)),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  // Tables a fresh database may not have yet: absent means none, and is said.
  const soft = <T,>(r: { data: T[] | null; error: { message: string; code?: string } | null }, what: string): T[] => {
    if (!r.error) return r.data ?? [];
    if (isTableAbsent(r.error)) {
      missing.push(what);
      return [];
    }
    throw new Error(r.error.message);
  };
  const entRows = soft<{ user_id: string; plus_until: string | null; pro_until: string | null; plus_source: string | null }>(ents, "plans");
  const badgeRows = soft<{ user_id: string; badge: string }>(badges, "badges");
  const checkRows = soft<{ user_id: string; status: Decision; requested_at: string }>(checks, "blue checks");
  const sealRows = soft<{ user_id: string; status: Decision; requested_at: string }>(seals, "clergy seals");

  const profileById = new Map(
    ((profiles.data ?? []) as { id: string; handle: string | null; display_name: string | null; joined_at: string | null }[]).map((p) => [p.id, p]),
  );
  const future = (t: string | null) => Boolean(t) && Date.parse(t!) > now;
  const planById = new Map<string, { plan: "plus" | "pro"; source: string | null }>();
  for (const e of entRows) {
    if (future(e.pro_until)) planById.set(e.user_id, { plan: "pro", source: e.plus_source });
    else if (future(e.plus_until)) planById.set(e.user_id, { plan: "plus", source: e.plus_source });
  }
  const badgesById = new Map<string, string[]>();
  for (const b of badgeRows) badgesById.set(b.user_id, [...(badgesById.get(b.user_id) ?? []), b.badge]);
  const checkById = new Map(checkRows.map((c) => [c.user_id, c]));
  const sealById = new Map(sealRows.map((s) => [s.user_id, s]));

  const askedAt = new Map<string, string>();
  const readers: Reader[] = auth.map((u) => {
    const p = profileById.get(u.id);
    const plan = planById.get(u.id) ?? null;
    const check = checkById.get(u.id) ?? null;
    const seal = sealById.get(u.id) ?? null;
    const asked = [check, seal].filter((x) => x && x.status === "requested").map((x) => x!.requested_at).sort()[0];
    if (asked) askedAt.set(u.id, asked);
    return {
      id: u.id,
      email: u.email,
      name: p?.display_name ?? u.name,
      handle: p?.handle ?? null,
      joinedAt: p?.joined_at ?? u.created,
      provider: u.provider,
      lastSignInAt: u.lastSignIn,
      plan: plan?.plan ?? null,
      planSource: plan?.source ?? null,
      badges: badgesById.get(u.id) ?? [],
      check: check?.status ?? null,
      seal: seal?.status ?? null,
    };
  });
  cache = { at: now, readers, askedAt, missing };
  return cache;
}

const one = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const admin = createAdminClient();

  let dir: Directory;
  try {
    dir = await build(admin, sp.get("fresh") === "1");
  } catch (e) {
    console.warn("[admin/readers] directory read failed", (e as Error).message);
    return NextResponse.json({ error: "The account directory could not be read just now." }, { status: 502 });
  }

  const id = sp.get("id");
  if (id !== null) {
    if (!UUID.test(id)) return NextResponse.json({ error: "Not a reader." }, { status: 400 });
    return card(admin, dir, id);
  }

  const filter = {
    q: (sp.get("q") ?? "").slice(0, 80),
    joined: one<Joined>(sp.get("joined"), ["any", "today", "7d", "30d", "90d"], "any"),
    provider: one<Provider | "all">(sp.get("provider"), ["all", "google", "apple", "email", "other"], "all"),
    plan: one<PlanFilter>(sp.get("plan"), ["all", "plus", "pro", "free"], "all"),
    marks: one<MarksFilter>(sp.get("marks"), ["any", "badge", "check", "seal", "none"], "any"),
    waiting: sp.get("waiting") === "1",
  };
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);
  const now = Date.now();
  const matched = sortReaders(filterReaders(dir.readers, filter, now), filter.waiting, dir.askedAt);
  // The few numbers the old Users view led with, kept beside the list.
  const since = (days: number) => joinedFrom(days === 1 ? "today" : days === 7 ? "7d" : "30d", now) ?? 0;
  const providers = { google: 0, apple: 0, email: 0, other: 0 };
  let joinedToday = 0;
  let joined30 = 0;
  let signedIn7 = 0;
  for (const r of dir.readers) {
    if (r.provider) providers[r.provider] += 1;
    const t = Date.parse(r.joinedAt);
    if (t >= since(1)) joinedToday += 1;
    if (t >= since(30)) joined30 += 1;
    if (r.lastSignInAt && Date.parse(r.lastSignInAt) >= now - 7 * 86_400_000) signedIn7 += 1;
  }
  // Export CSV takes every reader the filters match, not one page of them.
  const exporting = sp.get("export") === "1";

  return NextResponse.json(
    {
      total: dir.readers.length,
      matched: matched.length,
      waiting: dir.readers.filter(isWaiting).length,
      offset: exporting ? 0 : offset,
      pageSize: exporting ? EXPORT_MAX : PAGE,
      rows: exporting ? matched.slice(0, EXPORT_MAX) : matched.slice(offset, offset + PAGE),
      summary: { joinedToday, joined30, signedIn7, providers },
      missing: dir.missing,
    },
    NO_STORE,
  );
}

async function card(admin: Admin, dir: Directory, id: string) {
  const reader = dir.readers.find((r) => r.id === id);
  if (!reader) return NextResponse.json({ error: "No reader with that id." }, { status: 404 });

  const [ent, badges, check, seal, orders] = await Promise.all([
    admin.from("entitlements").select("plus_until, pro_until, plus_source, auto_renew, billing_issue_at").eq("user_id", id).maybeSingle(),
    admin.from("user_badges").select("badge, granted_at, granted_by, note").eq("user_id", id).order("granted_at", { ascending: false }).limit(20),
    admin.from("user_verification").select("status, claim, requested_at, decided_at, decided_by, note").eq("user_id", id).maybeSingle(),
    admin
      .from("clergy_verifications")
      .select("status, rank, jurisdiction, parish, evidence, requested_at, decided_at, decided_by, note")
      .eq("user_id", id)
      .maybeSingle(),
    admin
      .from("shop_orders")
      .select("total_cents, payment_status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const unread: string[] = [];
  const read = <T,>(r: { data: T | null; error: { message: string; code?: string } | null }, what: string): T | null => {
    if (!r.error) return r.data;
    if (!isTableAbsent(r.error)) unread.push(what);
    return null;
  };

  return NextResponse.json(
    {
      reader,
      plan: read(ent, "the plan"),
      badges: read(badges, "the badges") ?? [],
      check: read(check, "the blue check"),
      seal: read(seal, "the clergy seal"),
      orders: read(orders, "the orders") ?? [],
      unread,
    },
    NO_STORE,
  );
}
