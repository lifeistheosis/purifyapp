"use client";

// Ambassadors, folded into Community by his pick A on r3-17 (2026-10-30): the
// last part of the page's switch, kept small, with Pay now asking first. The
// view keeps its id, so #tab=ambassadors still lands, on that part. The part
// itself is components/admin/community/Ambassadors.tsx.

import { CommunityPage } from "./CommunityTab";

export function AmbassadorsTab() {
  return <CommunityPage part="ambassadors" />;
}
