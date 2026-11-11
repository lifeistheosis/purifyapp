import type { Metadata } from "next";
import { Suspense } from "react";

import { EmailChangeStateView } from "@/components/account/security/EmailChangeState";

export const metadata: Metadata = {
  title: "Change email",
  robots: { index: false, follow: false },
};

// Server shell; the client reads ?state (from app/api/auth/callback) or the
// fragment Supabase writes, and says where a change of email stands. No
// sign-in: an email's link can open in another browser. Static-exportable,
// the same shape as /email/unsubscribe.
export default function EmailChangePage() {
  return (
    <Suspense fallback={null}>
      <EmailChangeStateView />
    </Suspense>
  );
}
