"use client";

// The sheet that goes in the box, and the only thing on the page when the
// browser prints.
//
// It portals to <body> under a known id, and printing adds a class to <body>
// that hides everything except it (app/admin/admin-theme.css). Printing the
// panel itself would print the rail, the strip, the table and the dialog: the
// slip has to be the whole page or it is not a slip.

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { formatPrice } from "@/lib/shop/format";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import type { ShippingAddress } from "@/lib/eikonBox/types";

export type SlipOrder = {
  id: string;
  created_at: string;
  email: string | null;
  total_cents: number;
  currency?: string;
  items: { title: string; quantity: number; unit_price_cents: number }[];
};

export function PackingSlip({
  order,
  address,
  onDone,
}: {
  order: SlipOrder;
  address: ShippingAddress | null;
  onDone: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("adm-printing");
    const after = () => {
      document.body.classList.remove("adm-printing");
      onDone();
    };
    window.addEventListener("afterprint", after);
    // A frame, so the slip is painted before the print dialog samples the page.
    const id = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", after);
      document.body.classList.remove("adm-printing");
    };
  }, [onDone]);

  const number = orderConfirmationNumber(order.id);

  return createPortal(
    <div id="packing-slip" className="adm-slip" aria-hidden>
      <header>
        <h1>Purify, EIKON</h1>
        <p>
          Order {number} · placed {new Date(order.created_at).toLocaleDateString()}
        </p>
      </header>

      <section>
        <h2>Ship to</h2>
        {address ? (
          <p className="adm-slip-address">
            {address.name}
            <br />
            {address.address.line1}
            {address.address.line2 ? (
              <>
                <br />
                {address.address.line2}
              </>
            ) : null}
            <br />
            {address.address.city}, {address.address.state} {address.address.postal_code}
            <br />
            {address.address.country}
          </p>
        ) : (
          <p>No address on this order.</p>
        )}
      </section>

      <section>
        <h2>In this parcel</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="adm-slip-num">Qty</th>
              <th className="adm-slip-num">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, n) => (
              <tr key={`${i.title}-${n}`}>
                <td>{i.title}</td>
                <td className="adm-slip-num">{i.quantity}</td>
                <td className="adm-slip-num">{formatPrice(i.unit_price_cents * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total paid</td>
              <td className="adm-slip-num" />
              <td className="adm-slip-num">{formatPrice(order.total_cents)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer>
        <p>
          Thank you. Every piece is chosen, checked and packed by hand. Questions about this order:
          support@purifyapp.net, quoting {number}.
        </p>
      </footer>
    </div>,
    document.body,
  );
}
