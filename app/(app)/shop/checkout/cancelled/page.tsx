import type { Metadata } from "next";

import { CheckoutCancelledClient } from "@/components/shop/CheckoutCancelledClient";
import { ArrivalBoundary } from "@/components/layout/ArrivalBoundary";

export const metadata: Metadata = { title: "Checkout cancelled" };

// Server shell; the client reads ?order and cancels the pending order so it
// never lingers as a phantom in "Your orders". Static-exportable for the
// native shell.
export default function CheckoutCancelledPage() {
  return (
    <ArrivalBoundary>
      <CheckoutCancelledClient />
    </ArrivalBoundary>
  );
}
