import type { Metadata } from "next";

import { ApplicationClient } from "@/components/shop/ApplicationClient";

export const metadata: Metadata = { title: "Your merchant application" };

// Server shell; the applicant reads their own application client-side (RLS
// self-select) so it works in the native local-first export.
export default function ApplicationStatusPage() {
  return <ApplicationClient />;
}
