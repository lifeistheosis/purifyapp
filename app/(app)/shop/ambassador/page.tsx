import type { Metadata } from "next";
import { Suspense } from "react";

import { AmbassadorDashboard } from "@/components/shop/ambassador/AmbassadorDashboard";

export const metadata: Metadata = {
  title: "Ambassador",
  robots: { index: false, follow: false },
};

// Server shell only: the dashboard reads the signed-in ambassador's own data
// in the browser (/api/ambassador/me), so the page works in the app's static
// export as well as on the website.
export default function AmbassadorPage() {
  return (
    <Suspense fallback={null}>
      <AmbassadorDashboard />
    </Suspense>
  );
}
