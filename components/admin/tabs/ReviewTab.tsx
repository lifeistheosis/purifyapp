"use client";

// The clergy review list, folded into Content as Chant words is (1.9): one
// line on the editors' desk, opening the list. The view has its own id, so
// #tab=review lands on that line, opened. The detail is
// components/admin/content/review.tsx.

import { ContentDesk } from "./ContentTab";

export function ReviewTab() {
  return <ContentDesk focus="review" />;
}
