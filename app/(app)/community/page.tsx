import type { Metadata } from "next";

import { CommunityClient } from "@/components/community/CommunityClient";

export const metadata: Metadata = {
  title: "Community | Pray and study together",
  // Named prayer campaigns until 2026-08-26. They are withdrawn pending a
  // rework (lib/campaigns/flags.ts), and a page description is a promise made
  // in search results and link previews, so it cannot outlive the feature.
  description:
    "Share gathered lines from Scripture and the Fathers, and talk together.",
};

// Server shell only: the community renders and fetches client-side so it
// works in the native local-first export (no server session or data reads).
export default function CommunityPage() {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night">
      <CommunityClient />
    </section>
  );
}
