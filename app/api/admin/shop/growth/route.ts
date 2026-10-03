import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { subscribersOf } from "@/lib/email/preferences";
import { readReminderSwitches } from "@/lib/shop/cartReminderSweep";
import { outcomesOfNotes, type NoteSend } from "@/lib/shop/cartReminders";
import { cohorts, unitEconomics, type Expense, type RetentionOrder, type RetentionRefund } from "@/lib/shop/retention";
import { forgetShopSettings, readShopSettings } from "@/lib/shop/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The growth side of the shop for the Revenue tab (asked for 2026-09-30):
 * revenue retention by the month customers first bought, what a customer is
 * worth against what finding one costs, and the deal and cart-note machinery
 * with what it led to. The sums are lib/shop/retention.ts and
 * lib/shop/cartReminders.ts, so the panel and the tests count the same way.
 *
 * PATCH flips the two cart-note switches, which exist only once
 * supabase/migrations/20260930000100_cart_reminders.sql has run; before that it
 * answers 409 and says so, instead of pretending to save.
 */

type OrderRow = RetentionOrder;

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const now = Date.now();
  const since = new Date(now - 90 * 86_400_000).toISOString();

  const [ordersRes, refundsRes, expensesRes, sendsRes, switches, settings, list] = await Promise.all([
    admin
      .from("shop_orders")
      .select("id, user_id, total_cents, payment_status, created_at, items:shop_order_items(quantity, unit_price_cents, list_price_cents, discount_kind)")
      .in("payment_status", ["paid", "refunded"])
      .order("created_at", { ascending: true })
      .limit(10000),
    admin.from("shop_refund_requests").select("order_id, amount_cents, status").limit(5000),
    admin.from("expense_lines").select("monthly_cents, category, active").limit(1000),
    admin
      .from("email_sends")
      .select("user_id, kind, created_at")
      .in("kind", ["cart_reminder", "cart_deal"])
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(10000),
    readReminderSwitches(admin),
    readShopSettings({ fresh: true }),
    subscribersOf(admin, "shop_offers"),
  ]);

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const retention = cohorts(orders, (refundsRes.data ?? []) as RetentionRefund[]);
  const unit = unitEconomics(orders, (expensesRes.data ?? []) as Expense[], now);

  // Orders the cart deal won, against those that paid full price.
  let savedOrders = 0;
  let savedCents = 0;
  let fullOrders = 0;
  let fullCents = 0;
  for (const o of orders) {
    if (o.payment_status !== "paid") continue;
    if ((o.items ?? []).some((i) => i.discount_kind === "cart_deal")) {
      savedOrders += 1;
      savedCents += o.total_cents;
    } else {
      fullOrders += 1;
      fullCents += o.total_cents;
    }
  }

  const notes = outcomesOfNotes((sendsRes.data ?? []) as NoteSend[], orders);

  return NextResponse.json(
    {
      retention,
      unit,
      deal: {
        settings: settings.settings.cartDeal,
        savedOrders,
        savedCents,
        fullOrders,
        fullCents,
      },
      notes: {
        switches,
        reminder: notes.cart_reminder ?? { sent: 0, recovered: 0 },
        deal: notes.cart_deal ?? { sent: 0, recovered: 0 },
        /** email_sends could not be read: an unmeasured count, not a zero. */
        unmeasured: Boolean(sendsRes.error),
      },
      list: { subscribers: list.error ? null : list.subscribers.length },
      at: new Date(now).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z
  .object({ remindersEnabled: z.boolean().optional(), dealEmailEnabled: z.boolean().optional() })
  .refine((b) => b.remindersEnabled !== undefined || b.dealEmailEnabled !== undefined, "Nothing to change.");

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const switches = await readReminderSwitches(admin);
  if (!switches.present) {
    return NextResponse.json(
      { error: "The switches need supabase/migrations/20260930000100_cart_reminders.sql. Run it in the Supabase SQL editor first." },
      { status: 409 },
    );
  }
  const patch: Record<string, boolean | string> = { updated_at: new Date().toISOString() };
  if (parsed.data.remindersEnabled !== undefined) patch.cart_reminders_enabled = parsed.data.remindersEnabled;
  if (parsed.data.dealEmailEnabled !== undefined) patch.cart_deal_email_enabled = parsed.data.dealEmailEnabled;
  const { error } = await admin.from("shop_settings").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  forgetShopSettings();
  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "shop.cart_notes",
    entityType: "shop_settings",
    entityId: "1",
    detail: { ...parsed.data, before: { remindersEnabled: switches.remindersEnabled, dealEmailEnabled: switches.dealEmailEnabled } },
  });
  return NextResponse.json({ ok: true, switches: await readReminderSwitches(admin) });
}
