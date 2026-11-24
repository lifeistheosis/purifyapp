import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import patches from "@/data/changelog/patches.json";
import { userIdByEmail } from "@/lib/admin/accountEmails";
import { milestones, type GoalMark, type GoalsData } from "@/lib/admin/milestones";
import { readPlusFacts } from "@/lib/admin/plusEvents.server";
import { withoutOwnTestOrders } from "@/lib/admin/testOrders";
import { DEVELOPER_EMAILS } from "@/lib/dev/developer";
import { readSavedNow } from "@/lib/marketing/storeRatingsLive";
import { bankRunningCosts } from "@/lib/owner/bank.mjs";
import { mercuryConfigured, readBank } from "@/lib/owner/mercury.server";

/**
 * Everything the Goals page counts, read once for the page's route
 * (app/api/admin/goals) and for the goal email (lib/admin/goalMail.ts): the
 * kept events, his marks and the email switch (site_settings, one key), the
 * app's monthly costs (monthlyCosts: the bank once it holds a whole month, his
 * cost lines until then), the releases, new accounts by day, the store's rating
 * and the shop this month. A source that cannot be read is left out of what it
 * feeds, never guessed.
 */

export const GOALS_KEY = "goals_marks";

export const GoalsSetting = z.object({
  marks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        weeklyCents: z.number().int().min(100).max(100_000_000),
      }),
    )
    .max(2)
    .default([]),
  /** The email when he hits a goal. On unless he turns it off. */
  mail: z.boolean().default(true),
});
export type GoalsSettingValue = z.infer<typeof GoalsSetting>;

export function readSetting(value: unknown): GoalsSettingValue {
  const parsed = GoalsSetting.safeParse(value ?? {});
  return parsed.success ? parsed.data : { marks: [], mail: true };
}

const DAY_MS = 86_400_000;

/** Where the monthly costs came from: the bank's last whole months, or his typed cost lines. */
export type CostsFrom = { source: "bank"; months: string[] } | { source: "lines" };

/**
 * The app's monthly running costs, in cents. His word, 2026-11-24: costs are
 * typed in by hand while some services bill by use, and the bank takes over
 * once bills go through it. So: the average of the bank's last whole months
 * (up to three, transfers and goods left out) as soon as the bank holds one,
 * and his active cost lines (the Costs tab, public.expense_lines) until then.
 * Null when neither could be read.
 */
export async function monthlyCosts(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<{ cents: number; from: CostsFrom } | null> {
  if (mercuryConfigured()) {
    const bank = await readBank().catch(() => null);
    const fromBank = bank ? bankRunningCosts(bank.months, now.toISOString().slice(0, 7)) : null;
    if (fromBank) return { cents: fromBank.cents, from: { source: "bank", months: fromBank.months } };
  }
  const { data, error } = await admin.from("expense_lines").select("monthly_cents, active");
  if (error) return null;
  const cents = ((data ?? []) as { monthly_cents: number | null; active: boolean | null }[])
    .filter((r) => r.active !== false)
    .reduce((n, r) => n + (r.monthly_cents ?? 0), 0);
  return { cents, from: { source: "lines" } };
}

export type GoalsRead =
  | { ok: true; data: GoalsData; setting: GoalsSettingValue; marksSaved: boolean; costsRead: boolean; costsFrom: CostsFrom | null }
  | { ok: false; status: number; error: string };

export async function readGoals(admin: SupabaseClient, now: Date = new Date()): Promise<GoalsRead> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [plus, settingRow, costsRes, rating, ownerIds, orders] = await Promise.all([
    readPlusFacts(admin, "1970-01-01T00:00:00Z"),
    admin.from("site_settings").select("value").eq("key", GOALS_KEY).maybeSingle(),
    monthlyCosts(admin, now),
    readSavedNow().catch(() => null),
    Promise.all(DEVELOPER_EMAILS.map((e) => userIdByEmail(e).catch(() => null))).then(
      (ids) => new Set(ids.filter((id): id is string => !!id)),
    ),
    admin.from("shop_orders").select("email, total_cents, payment_status, paid_at").eq("payment_status", "paid").gte("paid_at", monthStart),
  ]);

  if (plus.state !== "ok") {
    return plus.state === "absent"
      ? { ok: false, status: 503, error: "The kept events (public.plus_events) are not on this database yet." }
      : { ok: false, status: 503, error: "The kept events could not be read just now." };
  }

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

  const costs = costsRes?.cents ?? 0;
  const shop = orders.error ? null : withoutOwnTestOrders((orders.data ?? []) as { email: string | null; total_cents: number | null }[]);
  const setting = settingRow.error ? { marks: [] as GoalMark[], mail: true } : readSetting(settingRow.data?.value);

  const data = milestones({
    facts: plus.facts,
    since: plus.since,
    now,
    ownerIds,
    marks: setting.marks,
    monthlyCostsCents: costs,
    releases: (patches as { version: string; date: string }[]).map((p) => ({ version: p.version, date: p.date })),
    signupsByDay,
    rating: rating?.ok && rating.value.play ? { stars: rating.value.play.rating, store: "Google Play" } : null,
    extra: shop ? { monthCents: shop.reduce((n, o) => n + (o.total_cents ?? 0), 0), orders: shop.length } : null,
  });
  return { ok: true, data: { ...data, mail: setting.mail }, setting, marksSaved: !settingRow.error && !!settingRow.data, costsRead: !!costsRes, costsFrom: costsRes?.from ?? null };
}
