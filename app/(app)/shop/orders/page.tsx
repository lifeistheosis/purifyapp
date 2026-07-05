import type { Metadata } from "next";
import Link from "next/link";

import { formatPrice } from "@/lib/shop/format";
import { buyerOrderStatus, buyerStepIndex, BUYER_ORDER_STEPS } from "@/lib/shop/status";
import type { ShopOrder } from "@/lib/shop/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
        <h1 className="font-display-serif text-heading text-paper">Your orders</h1>
        <p className="mt-4 font-serif text-body text-paper/70 leading-[1.65]">
          Sign in to see orders placed with your account. Guest orders are
          tracked through the email receipt.
        </p>
        <Link
          href="/signin?next=/shop/orders"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // RLS self-select: only the caller's orders can come back, and only
  // buyer-appropriate columns are requested.
  const { data } = await supabase
    .from("shop_orders")
    .select(
      "id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, created_at, items:shop_order_items(title, unit_price_cents, quantity)",
    )
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as unknown as ShopOrder[];

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">Your orders</h1>
      </header>

      {orders.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          No orders yet. When you buy an icon it appears here with its status,
          from confirmation to delivery.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {orders.map((o) => {
            const status = buyerOrderStatus(o);
            const step = buyerStepIndex(status);
            return (
              <li key={o.id} className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-sans text-ui font-semibold text-paper">
                    {o.items.map((i) => i.title).join(", ")}
                  </p>
                  <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                    {formatPrice(o.total_cents, o.currency)}
                  </p>
                </div>
                <p className="mt-1 font-sans text-caption text-paper/60">
                  Placed{" "}
                  {new Date(o.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {step >= 0 ? (
                  <ol className="mt-4 flex items-center gap-1" aria-label="Order progress">
                    {BUYER_ORDER_STEPS.map((s, i) => (
                      <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 w-full rounded-full",
                            i <= step ? "bg-gold" : "bg-paper/10",
                          )}
                        />
                        <span
                          className={cn(
                            "text-center font-sans text-[10px] leading-tight",
                            i === step ? "font-semibold text-paper" : "text-paper/60",
                          )}
                          aria-current={i === step ? "step" : undefined}
                        >
                          {s}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 inline-flex rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption font-semibold text-paper/70">
                    {status}
                  </p>
                )}

                {o.outbound_tracking ? (
                  <p className="mt-3 font-sans text-detail text-paper/65">
                    Tracking: <span className="text-paper">{o.outbound_tracking}</span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
