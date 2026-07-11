import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetailClient } from "@/components/shop/OrderDetailClient";

export const metadata: Metadata = { title: "Order" };

// Query-param route (?id=): per-user order ids can't be enumerated at build, so
// the detail lives on a static route that reads the id client-side. This keeps
// it exportable for the native shell (a dynamic [id] segment could not be).
export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailClient />
    </Suspense>
  );
}
