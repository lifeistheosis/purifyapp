import type { Metadata } from "next";

import { ModerationClient } from "@/components/community/moderation/ModerationClient";

export const metadata: Metadata = {
  title: "Moderation | Community",
  robots: { index: false, follow: false },
};

// Server shell only: the queue is read and worked client-side, with the
// moderator's own sign-in, so it works in the phone apps' local-first export
// too. The route answers 404 to anyone who does not moderate.
export default function ModeratePage() {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night">
      <ModerationClient />
    </section>
  );
}
