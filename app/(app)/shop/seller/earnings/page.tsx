import type { Metadata } from "next";

import {
  earningsSummary,
  monthlyEarnings,
  topProducts,
} from "@/lib/shop/earnings";
import { formatPrice } from "@/lib/shop/format";
import { getSellerContext } from "@/lib/shop/seller";
import { listSellerOrders } from "@/lib/shop/sellerData";

export const metadata: Metadata = { title: "Earnings" };

/**
 * What the store actually made: gross, refunds out, net kept, and the
 * shape of it by month and by product. No projections, no annualized
 * anything — the numbers on this page all happened.
 */
export default async function SellerEarningsPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const orders = await listSellerOrders(ctx.seller.id);
  const summary = earningsSummary(orders);
  const months = monthlyEarnings(orders);
  const top = topProducts(orders);

  const cards = [
    { label: "Net kept", value: formatPrice(summary.netCents) },
    { label: "Gross sales", value: formatPrice(summary.grossCents) },
    {
      label: "Refunded",
      value: formatPrice(summary.refundedCents),
      sub:
        summary.paidOrderCount > 0
          ? `${Math.round(summary.refundRate * 100)}% of orders`
          : undefined,
    },
    {
      label: "Average order",
      value: formatPrice(summary.averageOrderCents),
      sub: `${summary.unitsSold} unit${summary.unitsSold === 1 ? "" : "s"} across ${summary.paidOrderCount} order${summary.paidOrderCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="max-w-[860px] pb-16">
      <h1 className="font-display-serif text-heading text-paper">Earnings</h1>

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <li
            key={c.label}
            className="rounded-lg border border-paper/10 bg-night-soft/60 p-5"
          >
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
              {c.label}
            </p>
            <p className="mt-2 font-display-serif text-heading text-paper">
              {c.value}
            </p>
            {c.sub ? (
              <p className="mt-1 font-sans text-caption text-paper/55">{c.sub}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {orders.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          Nothing sold yet. When paid orders arrive, this page shows what your
          store made, month by month.
        </p>
      ) : (
        <>
          <section aria-label="By month" className="mt-10">
            <h2 className="font-display-serif text-title text-paper">By month</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-paper/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8 bg-night-soft/60 text-left">
                    <Th>Month</Th>
                    <Th align="right">Orders</Th>
                    <Th align="right">Gross</Th>
                    <Th align="right">Refunded</Th>
                    <Th align="right">Net</Th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} className="border-b border-white/5 last:border-0">
                      <Td>
                        {new Date(m.month + "-15").toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })}
                      </Td>
                      <Td align="right">{m.orderCount}</Td>
                      <Td align="right">{formatPrice(m.grossCents)}</Td>
                      <Td align="right">
                        {m.refundedCents > 0 ? `−${formatPrice(m.refundedCents)}` : "None"}
                      </Td>
                      <Td align="right" strong>
                        {formatPrice(m.netCents)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {top.length > 0 ? (
            <section aria-label="Top sellers" className="mt-10">
              <h2 className="font-display-serif text-title text-paper">
                Top sellers
              </h2>
              <ul className="mt-4 space-y-2">
                {top.map((t, i) => (
                  <li
                    key={t.title}
                    className="flex items-center justify-between gap-4 rounded-lg border border-paper/10 bg-night-soft/60 px-4 py-3"
                  >
                    <p className="min-w-0 truncate font-sans text-ui text-paper">
                      <span className="mr-3 font-display-serif text-paper/40">
                        {i + 1}
                      </span>
                      {t.title}
                    </p>
                    <p className="shrink-0 font-sans text-detail text-paper/70">
                      {t.units} sold ·{" "}
                      <span className="font-semibold text-paper">
                        {formatPrice(t.grossCents)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <p className="mt-8 font-sans text-caption text-paper/50">
        Figures are before payment-processor fees. Refunds show in the month
        the order was placed.
      </p>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-4 py-3 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  strong,
}: {
  children: React.ReactNode;
  align?: "right";
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 font-sans text-detail ${align === "right" ? "text-right" : "text-left"} ${strong ? "font-semibold text-paper" : "text-paper/75"}`}
    >
      {children}
    </td>
  );
}
