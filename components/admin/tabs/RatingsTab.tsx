"use client";

// Ratings, folded into Content by his pick A on r3-17 (2026-10-30): the
// front page's ratings are one card on the editors' desk, and Update and Edit
// open the two editors as sheets. The view keeps its id, so #tab=ratings
// still lands, on that card. The editors are components/admin/content/ratings.tsx.

import { ContentDesk } from "./ContentTab";

export function RatingsTab() {
  return <ContentDesk focus="ratings" />;
}
