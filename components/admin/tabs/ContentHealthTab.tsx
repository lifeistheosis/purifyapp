"use client";

// Library files, folded into Services by his pick A on r3-17 (2026-10-30):
// "Library files is a line, its list one tap away". The view keeps its id, so
// #tab=content-health still lands, on the Services page with the list open.
// The list itself is components/admin/services/LibraryList.tsx.

import { ServicesPage } from "./HealthTab";

export function ContentHealthTab() {
  return <ServicesPage libraryOpen />;
}
