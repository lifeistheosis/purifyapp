import type { Metadata } from "next";

import { CommunityClient } from "@/components/community/CommunityClient";

export const metadata: Metadata = {
  title: "Community | Pray and study together",
  description:
    "Pray with the faithful in prayer campaigns, share gathered lines from Scripture and the Fathers, and talk together.",
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
