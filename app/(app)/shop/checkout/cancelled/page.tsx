import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutCancelledClient } from "@/components/shop/CheckoutCancelledClient";

export const metadata: Metadata = { title: "Checkout cancelled" };

// Server shell; the client reads ?order and cancels the pending order so it
// never lingers as a phantom in "Your orders". Static-exportable for the
// native shell.
export default function CheckoutCancelledPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutCancelledClient />
    </Suspense>
  );
}
