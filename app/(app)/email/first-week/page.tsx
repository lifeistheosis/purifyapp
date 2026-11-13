import type { Metadata } from "next";
import { Suspense } from "react";

import { FirstWeekClient } from "@/components/email/FirstWeekClient";

export const metadata: Metadata = {
  title: "Your first week",
  robots: { index: false, follow: false },
};

// Server shell; the client reads ?u and ?s and asks before acting, because a
// mail scanner opening the link must not turn anything on. Static-exportable,
// the same shape as /email/unsubscribe.
export default function FirstWeekPage() {
  return (
    <Suspense fallback={null}>
      <FirstWeekClient />
    </Suspense>
  );
}
