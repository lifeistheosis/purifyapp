import type { Metadata } from "next";

import { CheckoutSuccessClient } from "@/components/shop/CheckoutSuccessClient";
import { ArrivalBoundary } from "@/components/layout/ArrivalBoundary";

export const metadata: Metadata = { title: "Order confirmed" };

// Server shell; the confirmation reads the ?order id client-side so it works in
// the native local-first export.
export default function CheckoutSuccessPage() {
  return (
    <ArrivalBoundary>
      <CheckoutSuccessClient />
    </ArrivalBoundary>
  );
}
