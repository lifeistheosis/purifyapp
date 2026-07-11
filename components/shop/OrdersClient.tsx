"use client";

import Link from "next/link";

import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/shop/format";
import {
  BUYER_ORDER_STEPS,
  buyerOrderStatus,
  buyerStepIndex,
} from "@/lib/shop/status";
import type { ShopOrder } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";

type Result = { signedIn: false } | { signedIn: true; orders: ShopOrder[] };

async function load(): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false };
  // RLS self-select: only the caller's orders can come back.
  const { data } = await supabase
    .from("shop_orders")
    .select(
      "id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, created_at, items:shop_order_items(title, unit_price_cents, quantity)",
    )
    .order("created_at", { ascending: false });
  return { signedIn: true, orders: (data ?? []) as unknown as ShopOrder[] };
}

export function OrdersClient() {
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopLoading label="Loading your orders…" />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Your orders"
        body="Sign in to see orders placed with your account. Guest orders are tracked through the email receipt."
        next="/shop/orders"
      />
    );
  }

  const orders = data && data.signedIn ? data.orders : [];

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
              <li key={o.id} className="press-card relative rounded-lg border border-paper/10 bg-night-soft/60 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-sans text-ui font-semibold text-paper">
                    <Link href={`/shop/orders/detail?id=${o.id}`} className="after:absolute after:inset-0">
                      {o.items.map((i) => i.title).join(", ")}
                    </Link>
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
