import { NextResponse } from "next/server";
import { z } from "zod";

import patches from "@/data/changelog/patches.json";
import { getAdminUser } from "@/lib/admin/access";
import { userIdByEmail } from "@/lib/admin/accountEmails";
import { milestones, type GoalMark } from "@/lib/admin/milestones";
import { readPlusFacts } from "@/lib/admin/plusEvents.server";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { withoutOwnTestOrders } from "@/lib/admin/testOrders";
import { DEVELOPER_EMAILS } from "@/lib/dev/developer";
import { readSavedNow } from "@/lib/marketing/storeRatingsLive";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The Goals page's figures, and his marks (docs/handoffs/admin-milestones.md).
 *
 * GET reads, and lib/admin/milestones.ts counts: the kept events
 * (public.plus_events), his marks, the app's monthly costs (expense_lines),
 * the releases (data/changelog/patches.json), new accounts by day (the same
 * analytics_daily_buckets the Traffic page reads), the store's rating and the
 * shop's sales this month. A source that cannot be read is left out of what
 * it feeds, never guessed: the page says so where it shows.
 *
 * POST keeps his two marks in public.site_settings under one key, as the
 * panel's other settings are kept: the service role, checked input and a rate
 * limit. No migration. The marks are his and live only in the database; the
 * repository is public and never holds them.
 */

const MARKS_KEY = "goals_marks";

const Marks = z.object({
  marks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        weeklyCents: z.number().int().min(100).max(100_000_000),
      }),
    )
    .max(2),
});

function readMarks(value: unknown): GoalMark[] {
  const parsed = Marks.safeParse(value);
  return parsed.success ? parsed.data.marks : [];
}

const DAY_MS = 86_400_000;

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [plus, marksRow, costsRes, rating, ownerIds, orders] = await Promise.all([
    readPlusFacts(admin, "1970-01-01T00:00:00Z"),
    admin.from("site_settings").select("value").eq("key", MARKS_KEY).maybeSingle(),
    admin.from("expense_lines").select("monthly_cents, active"),
    readSavedNow().catch(() => null),
    Promise.all(DEVELOPER_EMAILS.map((e) => userIdByEmail(e).catch(() => null))).then(
      (ids) => new Set(ids.filter((id): id is string => !!id)),
    ),
    admin
      .from("shop_orders")
      .select("email, total_cents, payment_status, paid_at")
      .eq("payment_status", "paid")
      .gte("paid_at", monthStart),
  ]);

  if (plus.state !== "ok") {
    return NextResponse.json(
      {
        error:
          plus.state === "absent"
            ? "The kept events (public.plus_events) are not on this database yet."
            : "The kept events could not be read just now.",
      },
      { status: 503 },
    );
  }

  // New accounts by day, from the first kept event on.
  let signupsByDay: Map<string, number> | null = null;
  if (plus.since) {
    const days = Math.min(800, Math.ceil((now.getTime() - Date.parse(plus.since)) / DAY_MS) + 8);
    const { data, error } = await admin.rpc("analytics_daily_buckets", {
      p_since: new Date(now.getTime() - days * DAY_MS).toISOString(),
      p_days: days,
    });
    if (!error && Array.isArray(data)) {
      signupsByDay = new Map((data as { day: string; signups: number | string }[]).map((r) => [String(r.day).slice(0, 10), Number(r.signups) || 0]));
    }
  }

  const costs = costsRes.error
    ? 0
    : ((costsRes.data ?? []) as { monthly_cents: number | null; active: boolean | null }[])
        .filter((r) => r.active !== false)
        .reduce((n, r) => n + (r.monthly_cents ?? 0), 0);

  const shop = orders.error
    ? null
    : withoutOwnTestOrders((orders.data ?? []) as { email: string | null; total_cents: number | null }[]);

  const data = milestones({
    facts: plus.facts,
    since: plus.since,
    now,
    ownerIds,
    marks: marksRow.error ? [] : readMarks(marksRow.data?.value),
    monthlyCostsCents: costs,
    releases: (patches as { version: string; date: string }[]).map((p) => ({ version: p.version, date: p.date })),
    signupsByDay,
    rating: rating?.ok && rating.value.play ? { stars: rating.value.play.rating, store: "Google Play" } : null,
    extra: shop ? { monthCents: shop.reduce((n, o) => n + (o.total_cents ?? 0), 0), orders: shop.length } : null,
  });

  return NextResponse.json({ data, marksSaved: !marksRow.error && !!marksRow.data, costsRead: !costsRes.error });
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-goals-marks:${adminUser.id}`, 60, 20)) {
    return NextResponse.json({ error: "Too many saves just now. Try again in a minute." }, { status: 429 });
  }

  const parsed = Marks.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Each mark needs a name and an amount of at least $1 a week." }, { status: 400 });
  }
  const [first, second] = parsed.data.marks;
  if (first && second && second.weeklyCents <= first.weeklyCents) {
    return NextResponse.json({ error: "The second mark is higher than the first." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert(
      { key: MARKS_KEY, value: parsed.data, updated_at: new Date().toISOString(), updated_by_email: adminUser.email ?? null },
      { onConflict: "key" },
    );
  if (error) {
    return NextResponse.json(
      { error: isTableAbsent(error) ? "site_settings is not on this database yet." : "The marks could not be saved just now." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
