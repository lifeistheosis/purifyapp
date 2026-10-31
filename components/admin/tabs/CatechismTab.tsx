"use client";

// Catechism, folded into Content by his pick A on r3-17 (2026-10-30): one
// line until its bank is in. The view keeps its id, so #tab=catechism still
// lands, on that line, opened. The detail is components/admin/content/catechism.tsx.

import { ContentDesk } from "./ContentTab";

export function CatechismTab() {
  return <ContentDesk focus="catechism" />;
}
