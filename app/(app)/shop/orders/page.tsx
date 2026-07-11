import type { Metadata } from "next";

import { OrdersClient } from "@/components/shop/OrdersClient";

export const metadata: Metadata = { title: "Your orders" };

// Server shell; the list reads the caller's own orders client-side (RLS
// self-select) so it works in the native local-first export with no re-login.
export default function OrdersPage() {
  return <OrdersClient />;
}
