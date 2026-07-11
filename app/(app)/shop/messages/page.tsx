import type { Metadata } from "next";

import { MessagesClient } from "@/components/shop/MessagesClient";

export const metadata: Metadata = { title: "Messages" };

// Server shell; the buyer's inbox reads their own threads client-side (RLS
// self-select) so it works in the native local-first export.
export default function BuyerMessagesPage() {
  return <MessagesClient />;
}
