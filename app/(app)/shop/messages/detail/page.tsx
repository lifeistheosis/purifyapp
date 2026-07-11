import type { Metadata } from "next";
import { Suspense } from "react";

import { ConversationClient } from "@/components/shop/ConversationClient";

export const metadata: Metadata = { title: "Conversation" };

// Query-param route (?id=): per-user conversation ids can't be enumerated at
// build, so the thread reads its id client-side and stays exportable for the
// native shell.
export default function ConversationPage() {
  return (
    <Suspense fallback={null}>
      <ConversationClient />
    </Suspense>
  );
}
