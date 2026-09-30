import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendMarketingTo, type MarketingReport } from "@/lib/email/marketing";
import { cartDealBody, cartReminderBody } from "@/lib/email/templates/cartBodies";

import { activeDealsForCart, type ActiveDeal } from "./cartDealServer";
import { dealKey, reminderKey, remindersOwed, REMIND_AFTER_MS, REMIND_WITHIN_MS, type OwedReminder, type ReminderCart } from "./cartReminders";
import { formatPrice } from "./format";
import { readShopSettings } from "./settings";

/**
 * The cart notes (./cartReminders.ts), sent from the hourly maintenance
 * (lib/ops/maintenance.ts).
 *
 * ── The switches ────────────────────────────────────────────────────────
 *
 * Two columns on shop_settings, added by
 * supabase/migrations/20260930_cart_reminders.sql, both false by default:
 * `cart_reminders_enabled` for the plain note and `cart_deal_email_enabled`
 * for the deal note. Until that SQL has run, neither column exists, the read
 * below answers "off", and nothing is sent. A missing switch is never read as
 * "on".
 *
 * ── What keeps it honest ────────────────────────────────────────────────
 *
 * sendMarketingTo resolves "New in the shop" itself, so only readers who
 * turned that list on are written to, each with an unsubscribe link and the
 * postal address. Every note goes through the send-once ledger under a key
 * that names the cart's state (or the deal's window), so the hourly run can
 * repeat forever without anyone hearing twice. The deal note reads the same
 * deal checkout charges (activeDealsForCart), margin floor and end time
 * included, so it can never promise a price the till will not honour.
 */

/** Real sends per run, per note: the rest wait for the next hour. */
const PER_RUN = 40;

export type ReminderSwitches = {
  remindersEnabled: boolean;
  dealEmailEnabled: boolean;
  /** False until 20260930_cart_reminders.sql has run. */
  present: boolean;
};

export async function readReminderSwitches(admin: SupabaseClient): Promise<ReminderSwitches> {
  const { data, error } = await admin.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return { remindersEnabled: false, dealEmailEnabled: false, present: false };
  const row = data as Record<string, unknown>;
  return {
    remindersEnabled: row.cart_reminders_enabled === true,
    dealEmailEnabled: row.cart_deal_email_enabled === true,
    present: "cart_reminders_enabled" in row && "cart_deal_email_enabled" in row,
  };
}

export type CartReminderReport = {
  off?: true;
  owed: number;
  reminders?: MarketingReport["counts"] & { refused: string | null };
  deals?: MarketingReport["counts"] & { refused: string | null; carts: number };
  errors: string[];
};

function until(endsAt: number): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(endsAt)) + " Eastern";
}

export async function sendCartReminders(admin: SupabaseClient, now: number = Date.now()): Promise<CartReminderReport> {
  const report: CartReminderReport = { owed: 0, errors: [] };
  const sw = await readReminderSwitches(admin);
  if (!sw.remindersEnabled && !sw.dealEmailEnabled) return { ...report, off: true };

  const [cartsRes, paidRes] = await Promise.all([
    admin
      .from("shop_carts")
      .select("cart_token, user_id, items, updated_at")
      .not("user_id", "is", null)
      .gt("item_count", 0)
      .gte("updated_at", new Date(now - REMIND_WITHIN_MS).toISOString())
      .lte("updated_at", new Date(now - REMIND_AFTER_MS).toISOString())
      .limit(2000),
    admin
      .from("shop_orders")
      .select("user_id, created_at")
      .in("payment_status", ["paid", "refunded"])
      .gte("created_at", new Date(now - REMIND_WITHIN_MS - 86_400_000).toISOString())
      .limit(5000),
  ]);
  if (cartsRes.error) {
    report.errors.push(`shop_carts: ${cartsRes.error.message}`);
    return report;
  }
  const lastPaid = new Map<string, number>();
  for (const o of (paidRes.data ?? []) as { user_id: string | null; created_at: string }[]) {
    if (!o.user_id) continue;
    lastPaid.set(o.user_id, Math.max(lastPaid.get(o.user_id) ?? 0, Date.parse(o.created_at)));
  }
  const owed = remindersOwed((cartsRes.data ?? []) as ReminderCart[], lastPaid, now);
  report.owed = owed.length;
  if (owed.length === 0) return report;
  const byUser = new Map<string, OwedReminder>(owed.map((o) => [o.userId, o]));

  if (sw.remindersEnabled) {
    const r = await sendMarketingTo(admin, {
      list: "shop_offers",
      kind: "cart_reminder",
      only: new Set(byUser.keys()),
      body: (s) => cartReminderBody(byUser.get(s.userId)?.lines ?? []),
      keyFor: (userId) => reminderKey(byUser.get(userId)!),
      limit: PER_RUN,
    });
    report.reminders = { ...r.counts, refused: r.refused };
    report.errors.push(...r.errors);
  }

  if (sw.dealEmailEnabled) {
    const { settings } = await readShopSettings();
    if (settings.cartDeal.enabled) {
      const dealByUser = new Map<string, { slug: string; title: string; deal: ActiveDeal }>();
      for (const o of owed) {
        const deals = await activeDealsForCart(admin, { cartToken: o.cartToken, cfg: settings.cartDeal, now });
        const line = o.lines.find((l) => deals[l.slug]);
        if (line) dealByUser.set(o.userId, { slug: line.slug, title: line.title, deal: deals[line.slug] });
      }
      if (dealByUser.size > 0) {
        const r = await sendMarketingTo(admin, {
          list: "shop_offers",
          kind: "cart_deal",
          only: new Set(dealByUser.keys()),
          body: (s) => {
            const d = dealByUser.get(s.userId)!;
            return cartDealBody({
              title: d.title,
              percent: d.deal.percent,
              price: formatPrice(d.deal.unitCents),
              until: until(d.deal.endsAt),
            });
          },
          keyFor: (userId) => {
            const d = dealByUser.get(userId)!;
            return dealKey(userId, d.slug, d.deal.endsAt);
          },
          limit: PER_RUN,
        });
        report.deals = { ...r.counts, refused: r.refused, carts: dealByUser.size };
        report.errors.push(...r.errors);
      }
    }
  }
  return report;
}
