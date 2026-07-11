import type { Metadata } from "next";

import { RequestsClient } from "@/components/shop/RequestsClient";

export const metadata: Metadata = { title: "Your icon requests" };

// Server shell; the list reads the caller's own requests client-side (RLS
// self-select) so it works in the native local-first export.
export default function MyRequestsPage() {
  return <RequestsClient />;
}
