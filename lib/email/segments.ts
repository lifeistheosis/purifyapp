import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who an email is for, derived at send time and never stored.
 *
 * The funnel doc's five segments. Stored segments go stale the moment a
 * subscription renews or lapses; derived ones cannot. Everything here reads the
 * source rows directly with the service role.
 *
 *   free            an account with no active Plus or Pro
 *   plus_active     plus_until OR pro_until in the future (Pro includes Plus)
 *   plus_lapsed     had Plus or Pro, and both dates are now in the past
 *   shop_customer   at least one PAID shop order
 *   eikon_claimant  at least one EIKON Box claim
 *
 * READ entitlements DIRECTLY. Do not use getEntitlements() or
 * deriveEntitlements() for this: both return "everyone is entitled" while the
 * NEXT_PUBLIC_PLUS_ENFORCED_* flags are off, which they are, so a segment built
 * on them would put every free reader in plus_active.
 *
 * Mirrors lib/push/audience.ts, including its `errors` list: a query that fails
 * must not read as an empty segment, because "0 recipients, sent" is how a
 * broken send gets logged as a working one.
 */

export type Segment = "free" | "plus_active" | "plus_lapsed" | "shop_customer" | "eikon_claimant";

export const SEGMENTS: readonly Segment[] = [
  "free",
  "plus_active",
  "plus_lapsed",
  "shop_customer",
  "eikon_claimant",
];

export type EntitlementDates = {
  user_id: string;
  plus_until: string | null;
  pro_until: string | null;
};

export type PlusState = "active" | "lapsed" | "never";

function time(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Where one entitlement row stands at `now`.
 *
 * Pro counts as Plus, the same superset rule deriveEntitlements applies. A row
 * with no dates at all (a supporter-only row, say) has never had Plus.
 */
export function plusState(row: EntitlementDates, now: Date): PlusState {
  const plus = time(row.plus_until);
  const pro = time(row.pro_until);
  if (plus === null && pro === null) return "never";
  const t = now.getTime();
  if ((plus !== null && plus > t) || (pro !== null && pro > t)) return "active";
  return "lapsed";
}

/**
 * When a lapsed member's access ended: the later of the two dates. Null for a
 * row that is active or never had Plus. The winback email keys off this.
 */
export function lapsedAt(row: EntitlementDates, now: Date): Date | null {
  if (plusState(row, now) !== "lapsed") return null;
  const latest = Math.max(time(row.plus_until) ?? -Infinity, time(row.pro_until) ?? -Infinity);
  return Number.isFinite(latest) ? new Date(latest) : null;
}

export type ResolvedSegment = {
  segment: Segment;
  /** Accounts in the segment. */
  userIds: string[];
  /**
   * Addresses with no account behind them. Only shop_customer can have these:
   * a guest checkout stores an email on the order and no user_id.
   */
  guestEmails: string[];
  errors: string[];
};

const PAGE = 1000;

/** Every row of a select, a page at a time. PostgREST caps a response at 1000. */
async function selectAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
  errors: string[],
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) {
      errors.push(`${label}: ${error.message}`);
      return out;
    }
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function entitlementRows(admin: SupabaseClient, errors: string[]) {
  return selectAll<EntitlementDates>(
    (from, to) =>
      admin.from("entitlements").select("user_id, plus_until, pro_until").range(from, to),
    "entitlements",
    errors,
  );
}

export async function resolveSegment(
  admin: SupabaseClient,
  segment: Segment,
  now: Date = new Date(),
): Promise<ResolvedSegment> {
  const errors: string[] = [];
  const done = (userIds: Iterable<string>, guestEmails: Iterable<string> = []): ResolvedSegment => ({
    segment,
    userIds: [...new Set(userIds)],
    guestEmails: [...new Set(guestEmails)],
    errors,
  });

  switch (segment) {
    case "plus_active":
    case "plus_lapsed": {
      const want: PlusState = segment === "plus_active" ? "active" : "lapsed";
      const rows = await entitlementRows(admin, errors);
      return done(rows.filter((r) => plusState(r, now) === want).map((r) => r.user_id));
    }

    case "free": {
      // Every account, minus anyone active. Profiles is the account list the
      // app writes on sign-up; auth.users would also work but pages slower.
      const [profiles, rows] = await Promise.all([
        selectAll<{ id: string }>(
          (from, to) => admin.from("profiles").select("id").range(from, to),
          "profiles",
          errors,
        ),
        entitlementRows(admin, errors),
      ]);
      const active = new Set(rows.filter((r) => plusState(r, now) === "active").map((r) => r.user_id));
      return done(profiles.map((p) => p.id).filter((id) => !active.has(id)));
    }

    case "shop_customer": {
      const orders = await selectAll<{ user_id: string | null; email: string | null }>(
        (from, to) =>
          admin
            .from("shop_orders")
            .select("user_id, email")
            .eq("payment_status", "paid")
            .range(from, to),
        "shop_orders",
        errors,
      );
      const ids = orders.flatMap((o) => (o.user_id ? [o.user_id] : []));
      const guests = orders.flatMap((o) => (!o.user_id && o.email ? [o.email.toLowerCase()] : []));
      return done(ids, guests);
    }

    case "eikon_claimant": {
      const claims = await selectAll<{ user_id: string }>(
        (from, to) => admin.from("eikon_drop_claims").select("user_id").range(from, to),
        "eikon_drop_claims",
        errors,
      );
      return done(claims.map((c) => c.user_id));
    }
  }
}
