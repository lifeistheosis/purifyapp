import type { Metadata } from "next";

import { UnsubscribeClient } from "@/components/email/UnsubscribeClient";
import { ArrivalBoundary } from "@/components/layout/ArrivalBoundary";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

// Server shell; the client reads ?t and ?l and asks before acting, because a
// mail scanner opening the link must not unsubscribe anyone. Static-exportable,
// the same shape as /shop/checkout/cancelled.
export default function UnsubscribePage() {
  return (
    <ArrivalBoundary>
      <UnsubscribeClient />
    </ArrivalBoundary>
  );
}
