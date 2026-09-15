import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emailsByUserId } from "@/lib/admin/users";

import { sendEmailOnce } from "./ledger";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";

import {
  planLifecycle,
  type AccountAge,
  type LifecycleRow,
  type OpenDrop,
  type OrderMissingAddress,
  type PlannedEmail,
} from "./lifecyclePlan";
import { WELCOME_WINDOW_MS } from "./newAccount";
import { orderAddressEmail } from "./templates/orders";
import type { SendOnceResult } from "./sendOnce";
import {
  claimClosingEmail,
  plusEndedEmail,
  plusEndingEmail,
  welcomeEmail,
  winbackEmail,
  type BillingStore,
  type EmailContent,
} from "./templates/account";

/**
 * The daily account-email job: read, plan, send, report.
 *
 * Run by /api/cron/lifecycle (a Render cron entry, or anything holding
 * CRON_SECRET) and by Run now in the admin Email tab. Both call this, so there
 * is one code path and a manual run is the real thing, not a rehearsal.
 *
 * Safe to run as often as anyone likes. lifecyclePlan.ts decides what is due
 * inside windows of days, and sendOnce lets each dedupe key through once, so a
 * second run the same day sends nothing and reports duplicates.
 */

export type LifecycleReport = {
  ranAt: string;
  planned: number;
  /** Per email kind, what happened to each planned send. */
  byKind: Record<PlannedEmail["kind"], Record<SendOnceResult["status"] | "no_address", number>>;
  /** Reads that failed. A non-empty list means the plan may be incomplete. */
  errors: string[];
  /** False when auto_renew could not be read, so "ends in three days" was held back. */
  renewalStateKnown: boolean;
};

const CONCURRENCY = 4;

function contentFor(p: PlannedEmail): EmailContent {
  switch (p.kind) {
    case "plus_ending":
      return plusEndingEmail({ endsOn: p.endsOn, store: p.store as BillingStore });
    case "plus_ended":
      return plusEndedEmail();
    case "winback":
      return winbackEmail({ wasPro: p.wasPro });
    case "claim_closing":
      return claimClosingEmail({ dropTitle: p.dropTitle, closesAt: p.closesAt });
    case "welcome":
      return welcomeEmail();
    case "order_address":
      return orderAddressEmail({ orderNumber: orderConfirmationNumber(p.orderId), reminder: p.reminder });
  }
}

/** Paid shop orders that have not shipped and have nowhere to ship to. */
async function readOrdersMissingAddress(admin: SupabaseClient, errors: string[]): Promise<OrderMissingAddress[]> {
  const { data, error } = await admin
    .from("shop_orders")
    .select("id, email, user_id, created_at")
    .eq("payment_status", "paid")
    .is("shipping_address", null)
    .not("fulfillment_status", "in", "(shipped,delivered,cancelled,refunded)")
    .limit(500);
  if (error) {
    errors.push(`shop_orders: ${error.message}`);
    return [];
  }
  return (data ?? []) as OrderMissingAddress[];
}

/**
 * Accounts made inside the welcome window. profiles.joined_at is the account's
 * creation time: the on_auth_user_created trigger inserts the row the moment
 * auth.users gets one (20260518_profiles_bookmarks_annotations.sql).
 */
async function readNewAccounts(admin: SupabaseClient, now: Date, errors: string[]): Promise<AccountAge[]> {
  const since = new Date(now.getTime() - WELCOME_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from("profiles")
    .select("id, joined_at")
    .gte("joined_at", since)
    .limit(5000);
  if (error) {
    errors.push(`profiles: ${error.message}`);
    return [];
  }
  return (data ?? []) as AccountAge[];
}

function emptyCounts() {
  return { sent: 0, skipped: 0, failed: 0, duplicate: 0, unavailable: 0, no_address: 0 };
}

async function readRows(
  admin: SupabaseClient,
  errors: string[],
): Promise<{ rows: LifecycleRow[]; renewalStateKnown: boolean }> {
  const FULL = "user_id, plus_until, pro_until, plus_source, auto_renew, billing_issue_at";
  const DATES_ONLY = "user_id, plus_until, pro_until, plus_source";
  const rows: LifecycleRow[] = [];
  let renewalStateKnown = true;

  // `columns` is a plain string on purpose. supabase-js parses a literal column
  // list into a row type, and a list chosen at runtime is not one it can parse.
  const page = async (
    columns: string,
    from: number,
    to: number,
  ): Promise<{ data: unknown[] | null; error: { message: string } | null }> => {
    const { data, error } = await admin.from("entitlements").select(columns).range(from, to);
    return { data: (data as unknown[] | null) ?? null, error };
  };

  for (let from = 0; ; from += 1000) {
    const to = from + 999;
    let result = await page(renewalStateKnown ? FULL : DATES_ONLY, from, to);

    if (result.error && renewalStateKnown && /auto_renew|billing_issue_at/.test(result.error.message)) {
      // 20260914_email_sends.sql not applied: the two columns do not exist.
      // Read the dates alone and hold back the one email that needs renewal
      // state, rather than guess and warn every renewing member.
      renewalStateKnown = false;
      result = await page(DATES_ONLY, from, to);
    }
    if (result.error) {
      errors.push(`entitlements: ${result.error.message}`);
      break;
    }
    const got = (result.data ?? []) as Partial<LifecycleRow>[];
    for (const r of got) {
      rows.push({
        user_id: r.user_id as string,
        plus_until: r.plus_until ?? null,
        pro_until: r.pro_until ?? null,
        plus_source: r.plus_source ?? null,
        auto_renew: r.auto_renew ?? null,
        billing_issue_at: r.billing_issue_at ?? null,
      });
    }
    if (got.length < 1000) break;
  }
  return { rows, renewalStateKnown };
}

async function readDrops(
  admin: SupabaseClient,
  errors: string[],
): Promise<{ openDrops: OpenDrop[]; claimedBy: Map<string, Set<string>> }> {
  const claimedBy = new Map<string, Set<string>>();
  const { data, error } = await admin
    .from("eikon_drops")
    .select("id, title, claims_close_at")
    .eq("status", "open");
  if (error) {
    errors.push(`eikon_drops: ${error.message}`);
    return { openDrops: [], claimedBy };
  }
  const openDrops = (data ?? []) as OpenDrop[];
  if (openDrops.length === 0) return { openDrops, claimedBy };

  const { data: claims, error: claimError } = await admin
    .from("eikon_drop_claims")
    .select("drop_id, user_id")
    .in(
      "drop_id",
      openDrops.map((d) => d.id),
    );
  if (claimError) {
    // Without the claims, "you have not claimed yet" cannot be told apart
    // from "you have". Send no reminders rather than remind people who claimed.
    errors.push(`eikon_drop_claims: ${claimError.message}`);
    return { openDrops: [], claimedBy };
  }
  for (const c of (claims ?? []) as { drop_id: string; user_id: string }[]) {
    (claimedBy.get(c.drop_id) ?? claimedBy.set(c.drop_id, new Set()).get(c.drop_id)!).add(c.user_id);
  }
  return { openDrops, claimedBy };
}

export async function runLifecycle(admin: SupabaseClient, now: Date = new Date()): Promise<LifecycleReport> {
  const errors: string[] = [];
  const [{ rows, renewalStateKnown }, { openDrops, claimedBy }, accounts, ordersMissingAddress] =
    await Promise.all([
      readRows(admin, errors),
      readDrops(admin, errors),
      readNewAccounts(admin, now, errors),
      readOrdersMissingAddress(admin, errors),
    ]);

  const plan = planLifecycle({
    rows,
    openDrops,
    claimedBy,
    now,
    renewalStateKnown,
    accounts,
    ordersMissingAddress,
  });

  const byKind: LifecycleReport["byKind"] = {
    plus_ending: emptyCounts(),
    plus_ended: emptyCounts(),
    winback: emptyCounts(),
    claim_closing: emptyCounts(),
    welcome: emptyCounts(),
    order_address: emptyCounts(),
  };

  // Order emails carry their own address; everything else is looked up.
  const lookups = [
    ...new Set(plan.flatMap((p) => (p.kind === "order_address" || !p.userId ? [] : [p.userId]))),
  ];
  let addresses = new Map<string, string>();
  if (lookups.length > 0) {
    try {
      addresses = await emailsByUserId(admin, lookups);
    } catch (e) {
      errors.push(`auth users: ${(e as Error).message}`);
    }
  }

  const queue = [...plan];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const to = p.kind === "order_address" ? p.to : p.userId ? addresses.get(p.userId) : undefined;
      if (!to) {
        byKind[p.kind].no_address += 1;
        continue;
      }
      const content = contentFor(p);
      const result = await sendEmailOnce(admin, {
        dedupeKey: p.dedupeKey,
        kind: p.kind,
        userId: p.userId,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      byKind[p.kind][result.status] += 1;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return { ranAt: now.toISOString(), planned: plan.length, byKind, errors, renewalStateKnown };
}
