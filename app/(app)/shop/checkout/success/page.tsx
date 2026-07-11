import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutSuccessClient } from "@/components/shop/CheckoutSuccessClient";

export const metadata: Metadata = { title: "Order confirmed" };

// Server shell; the confirmation reads the ?order id client-side so it works in
// the native local-first export.
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
